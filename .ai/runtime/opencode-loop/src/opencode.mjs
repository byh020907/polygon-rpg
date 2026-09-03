import { spawnSync } from "node:child_process"
import { existsSync } from "node:fs"
import { mkdir, rm, writeFile } from "node:fs/promises"
import path from "node:path"
import { blocked, partial, prerequisite, RuntimeError, EXIT } from "./errors.mjs"
import { exists, getProcessIdentity, isPidAlive, nowIso, processIdentityMatches, readJson, runChecked, runProcess, secret, sleep, spawnInherited, writeJsonAtomic } from "./system.mjs"

let resolvedOpenCodeBin
const FULL_ACCESS_TOOLS = ["bash", "read", "edit", "write", "task"]
const MANAGER_TOOLS = [
  "product_goal_loop_abort",
  "product_goal_loop_feedback",
  "product_goal_loop_open_worker",
  "product_goal_loop_pause",
  "product_goal_loop_resume",
  "product_goal_loop_run_now",
  "product_goal_loop_status",
]

function requiredToolsFor(name, manager = name === "product-goal-loop-manager") {
  return manager ? [...FULL_ACCESS_TOOLS, ...MANAGER_TOOLS] : FULL_ACCESS_TOOLS
}

function opencodeBin() {
  if (resolvedOpenCodeBin) return resolvedOpenCodeBin
  if (process.env.OPENCODE_BIN) {
    resolvedOpenCodeBin = path.resolve(process.env.OPENCODE_BIN)
    return resolvedOpenCodeBin
  }
  if (process.platform !== "win32") {
    resolvedOpenCodeBin = "opencode"
    return resolvedOpenCodeBin
  }
  const candidates = []
  if (process.env.APPDATA) candidates.push(path.join(process.env.APPDATA, "npm", "node_modules", "opencode-ai", "bin", "opencode.exe"))
  const located = spawnSync("where.exe", ["opencode"], { encoding: "utf8", windowsHide: true })
  for (const entry of String(located.stdout ?? "").split(/\r?\n/).filter(Boolean)) {
    if (entry.toLowerCase().endsWith(".exe")) candidates.push(entry)
    candidates.push(path.join(path.dirname(entry), "node_modules", "opencode-ai", "bin", "opencode.exe"))
  }
  resolvedOpenCodeBin = candidates.find((candidate) => existsSync(candidate))
  if (!resolvedOpenCodeBin) {
    throw prerequisite(
      "OPENCODE_NATIVE_BINARY_NOT_FOUND",
      "Could not resolve the native OpenCode executable on Windows; npm .cmd/.ps1 shims are not launched through a shell for safety.",
      "pgl-opencode doctor --json",
      { candidates },
    )
  }
  return resolvedOpenCodeBin
}

function parseSemver(value) {
  const match = String(value).trim().match(/(\d+)\.(\d+)\.(\d+)/)
  return match ? match.slice(1).map(Number) : null
}

function semverAtLeast(actual, minimum) {
  const left = parseSemver(actual)
  const right = parseSemver(minimum)
  if (!left || !right) return false
  for (let index = 0; index < 3; index += 1) {
    if (left[index] > right[index]) return true
    if (left[index] < right[index]) return false
  }
  return true
}

export async function inspectOpenCode(project, config, directory = project.root) {
  const versionResult = await runChecked(opencodeBin(), ["--version"], {
    cwd: directory,
    errorCode: "OPENCODE_NOT_FOUND",
    nextActions: [{ command: "npm install -g opencode-ai", reason: "Install OpenCode on PATH." }],
    timeoutMs: 120_000,
  })
  const version = versionResult.stdout.trim() || versionResult.stderr.trim()
  if (!semverAtLeast(version, config.minimumOpenCodeVersion)) {
    throw prerequisite("OPENCODE_VERSION_UNSUPPORTED", `OpenCode ${config.minimumOpenCodeVersion} or newer is required; found ${version}.`, "opencode upgrade")
  }
  const agents = {}
  for (const [role, name] of Object.entries(config.agents)) agents[name] = await inspectAgent(directory, name, { manager: role === "manager" })
  return { version, agents }
}

export async function inspectAgent(repo, name, options = {}) {
  const result = await runChecked(opencodeBin(), ["debug", "agent", name], {
    cwd: repo,
    errorCode: "OPENCODE_AGENT_MISSING",
    nextActions: [{ command: "pgl-opencode setup --dry-run", reason: `Install the ${name} agent template.` }],
    timeoutMs: 120_000,
  })
  let agent
  try {
    agent = JSON.parse(result.stdout)
  } catch (error) {
    throw prerequisite("OPENCODE_AGENT_UNREADABLE", `Could not parse effective configuration for ${name}.`, "pgl-opencode doctor --json", { output: result.stdout.slice(0, 500) })
  }
  const rules = Array.isArray(agent.permission) ? agent.permission : []
  const wildcardIndex = rules.findLastIndex((rule) => rule?.permission === "*" && rule?.pattern === "*")
  const access = hasEffectiveFullAccess(agent)
  const { fullAccess, wildcard, laterNonAllow: laterDeny } = access
  const disabledTools = Object.entries(agent.tools ?? {}).filter(([, enabled]) => enabled === false).map(([tool]) => tool)
  const missingTools = requiredToolsFor(name, options.manager).filter((tool) => agent.tools?.[tool] !== true)
  const primary = agent.mode === "primary"
  if (!fullAccess || !primary || disabledTools.length || missingTools.length) {
    throw blocked("PERMISSION_BLOCKED", `${name} is not running with verified Full access.`, [{ command: `opencode debug agent ${name}`, reason: "The effective wildcard permission must allow every required tool, with no later ask or deny rule." }, { command: "pgl-opencode setup", reason: "Install or refresh the Full access primary-agent templates." }], { agent: name, mode: agent.mode ?? null, disabledTools, missingTools, wildcardRule: wildcard, laterNonAllowRule: laterDeny ?? null })
  }
  return { name, mode: agent.mode, fullAccess, disabledTools, missingTools, wildcardRule: wildcard, trailingRules: rules.slice(wildcardIndex + 1) }
}

function authHeader(server) {
  return `Basic ${Buffer.from(`${server.username}:${server.password}`).toString("base64")}`
}

function hasEffectiveFullAccess(agent) {
  const rules = Array.isArray(agent?.permission) ? agent.permission : []
  const wildcardIndex = rules.findLastIndex((rule) => rule?.permission === "*" && rule?.pattern === "*")
  const wildcard = wildcardIndex >= 0 ? rules[wildcardIndex] : null
  const laterNonAllow = wildcardIndex >= 0 ? rules.slice(wildcardIndex + 1).find((rule) => rule?.action !== "allow") : null
  return { fullAccess: wildcard?.action === "allow" && !laterNonAllow, wildcard, laterNonAllow }
}

export function sessionHasFullAccess(session) {
  return hasEffectiveFullAccess({ permission: session?.permission }).fullAccess
}

export async function serverRequest(server, pathname, options = {}) {
  let response
  try {
    response = await fetch(new URL(pathname, server.url), {
      method: options.method ?? "GET",
      headers: {
        Authorization: authHeader(server),
        ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
        ...options.headers,
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal ?? AbortSignal.timeout(options.timeoutMs ?? 30_000),
    })
  } catch (error) {
    throw new RuntimeError("OPENCODE_SERVER_UNREACHABLE", `${options.method ?? "GET"} ${pathname} could not reach the OpenCode backend: ${error.message}`, {
      exitCode: EXIT.CONFLICT,
      retryable: true,
      cause: error,
      details: { pathname, method: options.method ?? "GET" },
      nextActions: [{ command: "pgl-opencode doctor --json", reason: "Inspect backend health and authentication." }],
    })
  }
  if (!response.ok) {
    const body = await response.text()
    throw new RuntimeError("OPENCODE_SERVER_REQUEST_FAILED", `${options.method ?? "GET"} ${pathname} returned ${response.status}`, {
      exitCode: response.status >= 500 ? EXIT.CONFLICT : EXIT.PREREQUISITE,
      retryable: response.status >= 500,
      details: { status: response.status, body: body.slice(0, 1000), pathname },
    })
  }
  if (response.status === 204) return null
  const text = await response.text()
  return text ? JSON.parse(text) : null
}

export async function createFullAccessSession(server, input) {
  await requireServerAgent(server, input.directory, input.agent, { manager: input.manager })
  const query = `?directory=${encodeURIComponent(input.directory)}`
  const created = await serverRequest(server, `/session${query}`, {
    method: "POST",
    body: {
      title: input.title,
      agent: input.agent,
      permission: [{ permission: "*", pattern: "*", action: "allow" }],
    },
  })
  const session = created?.data ?? created
  if (!session?.id) {
    throw new RuntimeError("FULL_ACCESS_SESSION_CREATE_FAILED", "OpenCode did not return a session ID for the explicit Full access session.", {
      exitCode: EXIT.BLOCKED,
      details: { response: created ?? null, directory: input.directory, agent: input.agent },
      nextActions: [{ command: "pgl-opencode doctor --json", reason: "Verify the backend API and OpenCode version." }],
    })
  }
  const confirmed = await getSession(server, session.id, input.directory).catch(() => null)
  const sameAgent = confirmed?.agent === input.agent
  const sameDirectory = confirmed?.directory && path.resolve(confirmed.directory).toLowerCase() === path.resolve(input.directory).toLowerCase()
  if (!confirmed || !sameAgent || !sameDirectory || !sessionHasFullAccess(confirmed)) {
    await serverRequest(server, `/session/${encodeURIComponent(session.id)}?directory=${encodeURIComponent(input.directory)}`, { method: "DELETE" }).catch(() => null)
    throw blocked("PERMISSION_BLOCKED", "OpenCode did not persist the requested Full access session contract; no prompt was sent.", [{ command: "pgl-opencode doctor --json", reason: "Verify the server version, agent and session permission behavior." }], { sessionId: session.id, requestedAgent: input.agent, actualAgent: confirmed?.agent ?? null, requestedDirectory: input.directory, actualDirectory: confirmed?.directory ?? null, permission: confirmed?.permission ?? null })
  }
  return confirmed
}

export async function listServerAgents(server, directory) {
  const response = await serverRequest(server, `/agent?directory=${encodeURIComponent(directory)}`)
  return response?.data ?? response ?? []
}

export async function requireServerAgent(server, directory, name, options = {}) {
  let agents = await listServerAgents(server, directory)
  let agent = agents.find((candidate) => candidate?.name === name)
  function validity(candidate) {
    const access = hasEffectiveFullAccess(candidate)
    const disabledTools = Object.entries(candidate?.tools ?? {}).filter(([, enabled]) => enabled === false).map(([tool]) => tool)
    const missingTools = requiredToolsFor(name, options.manager).filter((tool) => candidate?.tools?.[tool] !== true)
    return { access, disabledTools, missingTools, valid: candidate?.mode === "primary" && access.fullAccess && !disabledTools.length && !missingTools.length }
  }
  let state = validity(agent)
  if (!agent || !state.valid) {
    await serverRequest(server, `/instance/dispose?directory=${encodeURIComponent(directory)}`, { method: "POST" }).catch(() => null)
    agents = await listServerAgents(server, directory)
    agent = agents.find((candidate) => candidate?.name === name)
    state = validity(agent)
  }
  if (agent && !state.valid && agent?.tools == null && agent?.mode === "primary" && state.access.fullAccess && !state.disabledTools.length) {
    // Compatibility: observed OpenCode servers omit per-agent `tools` from the
    // /agent list (native agents included), so required tools can never read as
    // present even though mode and Full access are valid. Fall back to the CLI
    // effective-configuration inspection that doctor uses; it throws unless the
    // agent is verified Full access with every required tool enabled.
    await inspectAgent(directory, name, { manager: options.manager })
    state = { ...state, missingTools: [], valid: true }
  }
  if (!agent || !state.valid) {
    throw blocked("PERMISSION_BLOCKED", `${name} is not available as a Full access primary agent in the running OpenCode backend.`, [{ command: `opencode debug agent ${name}`, reason: "Verify the installed agent, then restart the backend." }, { command: "pgl-opencode doctor --json", reason: "Inspect backend and agent state." }], { agent: name, directory, mode: agent?.mode ?? null, disabledTools: state.disabledTools, missingTools: state.missingTools, availableAgents: agents.map((candidate) => candidate?.name).filter(Boolean), wildcardRule: state.access.wildcard, laterNonAllowRule: state.access.laterNonAllow ?? null })
  }
  return agent
}

export async function getSessionMessages(server, sessionId, directory) {
  const query = directory ? `?directory=${encodeURIComponent(directory)}` : ""
  const response = await serverRequest(server, `/session/${encodeURIComponent(sessionId)}/message${query}`)
  return response?.data ?? response ?? []
}

export async function getSession(server, sessionId, directory) {
  const query = directory ? `?directory=${encodeURIComponent(directory)}` : ""
  const response = await serverRequest(server, `/session/${encodeURIComponent(sessionId)}${query}`)
  return response?.data ?? response
}

export async function getSessionActivity(server, sessionId, directory) {
  const query = directory ? `?directory=${encodeURIComponent(directory)}` : ""
  const [messages, statusResponse] = await Promise.all([
    getSessionMessages(server, sessionId, directory),
    serverRequest(server, `/session/status${query}`),
  ])
  const statuses = statusResponse?.data ?? statusResponse ?? {}
  const status = statuses[sessionId]?.type ?? statuses[sessionId]?.status ?? "idle"
  const userMessages = (Array.isArray(messages) ? messages : []).filter((message) => (message?.info?.role ?? message?.role) === "user").length
  return { sessionId, status, userMessages, humanInteracted: userMessages > 1 }
}

function assistantTextFromMessages(messages) {
  const chunks = []
  for (const message of Array.isArray(messages) ? messages : []) {
    const role = message?.info?.role ?? message?.role
    if (role !== "assistant") continue
    for (const part of message?.parts ?? []) {
      if (part?.type === "text" && typeof part.text === "string") chunks.push(part.text)
    }
  }
  return chunks.join("\n")
}

export async function readServer(project) {
  const info = await readJson(path.join(project.runtimeDir, "server.json"), null)
  const credentials = await readJson(path.join(project.runtimeDir, "server-credentials.json"), null)
  if (!info || !credentials) return null
  return { ...info, ...credentials }
}

export async function serverHealth(project, minimumVersion = null) {
  const server = await readServer(project)
  if (!server) return { healthy: false, reason: "not-configured", server: null }
  if (!isPidAlive(server.pid)) return { healthy: false, reason: "process-not-running", server: { ...server, password: undefined } }
  try {
    const health = await serverRequest(server, "/global/health", { timeoutMs: 3_000 })
    const versionSupported = !minimumVersion || semverAtLeast(health?.version, minimumVersion)
    return {
      healthy: health?.healthy === true && versionSupported,
      version: health?.version,
      reason: versionSupported ? undefined : "server-version-unsupported",
      requiredVersion: minimumVersion,
      server: { ...server, password: undefined },
    }
  } catch (error) {
    return { healthy: false, reason: error.code ?? "health-request-failed", server: { ...server, password: undefined } }
  }
}

async function ensureServerCredentials(project, config) {
  const target = path.join(project.runtimeDir, "server-credentials.json")
  const current = await readJson(target, null)
  if (current?.password) return current
  const credentials = { username: config.server.username || "opencode", password: secret(), createdAtUtc: nowIso() }
  await writeJsonAtomic(target, credentials)
  return credentials
}

export async function runBackend(project, config, options = {}) {
  const current = await serverHealth(project, config.minimumOpenCodeVersion)
  if (current.healthy) return { status: "already_running", server: current.server }
  if (options.dryRun) return { status: "planned", hostname: config.server.hostname, port: config.server.port }

  await mkdir(project.runtimeDir, { recursive: true })
  const startGuard = path.join(project.runtimeDir, "backend-start")
  try {
    await mkdir(startGuard, { recursive: false })
    await writeJsonAtomic(path.join(startGuard, "owner.json"), { ownerPid: process.pid, processIdentity: await getProcessIdentity(process.pid), acquiredAtUtc: nowIso() })
  } catch (error) {
    if (error?.code !== "EEXIST") throw error
    const owner = await readJson(path.join(startGuard, "owner.json"), null)
    const ageMs = Date.now() - Date.parse(owner?.acquiredAtUtc ?? 0)
    const ownerStillMatches = owner?.processIdentity ? await processIdentityMatches(owner.processIdentity) : false
    if (!ownerStillMatches && Number.isFinite(ageMs) && ageMs >= 120_000) {
      await rm(startGuard, { recursive: true, force: true })
      return runBackend(project, config, options)
    }
    for (let attempt = 0; attempt < 60; attempt += 1) {
      const observed = await serverHealth(project, config.minimumOpenCodeVersion)
      if (observed.healthy) return { status: "already_running", server: observed.server }
      await sleep(500)
    }
    throw prerequisite("BACKEND_START_BUSY", "Another backend startup owns the repository startup guard but did not become healthy.", "pgl-opencode doctor --json")
  }

  if (current.server?.processIdentity && await processIdentityMatches(current.server.processIdentity)) {
    process.kill(current.server.pid, "SIGTERM")
    await sleep(250)
  }

  const credentials = await ensureServerCredentials(project, config)
  const env = {
    ...process.env,
    OPENCODE_SERVER_USERNAME: credentials.username,
    OPENCODE_SERVER_PASSWORD: credentials.password,
  }
  let buffer = ""
  let resolved = false
  let child
  const started = new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      if (!resolved) {
        if (child && child.exitCode === null) child.kill("SIGTERM")
        rm(startGuard, { recursive: true, force: true }).finally(() => reject(prerequisite("BACKEND_START_TIMEOUT", "OpenCode backend did not publish a listening URL.", "pgl-opencode backend")))
      }
    }, 30_000)
    const onData = async (chunk) => {
      buffer += chunk
      process.stderr.write(chunk)
      const match = buffer.match(/https?:\/\/(?:127\.0\.0\.1|localhost):\d+/i)
      if (!match || resolved) return
      resolved = true
      clearTimeout(timer)
      const server = {
        schemaVersion: 1,
        url: match[0].replace("localhost", "127.0.0.1"),
        hostname: config.server.hostname,
        pid: child.pid,
        processIdentity: await getProcessIdentity(child.pid),
        startedAtUtc: nowIso(),
      }
      await writeJsonAtomic(path.join(project.runtimeDir, "server.json"), server)
      await rm(startGuard, { recursive: true, force: true })
      resolve({ ...server, ...credentials })
    }
    child = spawnInherited(opencodeBin(), ["serve", "--hostname", config.server.hostname, "--port", String(config.server.port)], {
      cwd: project.root,
      env,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
      onError: (error) => {
        if (!resolved) {
          clearTimeout(timer)
          rm(startGuard, { recursive: true, force: true }).finally(() => reject(prerequisite("BACKEND_START_FAILED", `Failed to start OpenCode backend: ${error.message}`, "pgl-opencode doctor")))
        }
      },
    })
    child.stdout.setEncoding("utf8")
    child.stderr.setEncoding("utf8")
    child.stdout.on("data", onData)
    child.stderr.on("data", onData)
    child.once("exit", (code) => {
      if (!resolved) {
        clearTimeout(timer)
        rm(startGuard, { recursive: true, force: true }).finally(() => reject(prerequisite("BACKEND_EXITED", `OpenCode backend exited before becoming ready (${code}).`, "pgl-opencode doctor", { output: buffer.slice(-2000) })))
      }
    })
  })
  const server = await started
  let healthy = false
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      const health = await serverRequest(server, "/global/health")
      if (health?.healthy) {
        healthy = true
        break
      }
    } catch {}
    await sleep(250)
  }
  if (!healthy) {
    if (await processIdentityMatches(server.processIdentity)) process.kill(server.pid, "SIGTERM")
    throw partial("BACKEND_HEALTH_FAILED", "OpenCode published a URL but did not pass authenticated health checks.", [{ command: "pgl-opencode doctor --json", reason: "Inspect credentials, version and backend diagnostics." }], { pid: server.pid, url: server.url })
  }
  const exit = child.exitCode !== null
    ? { code: child.exitCode, signal: child.signalCode }
    : await new Promise((resolve) => child.once("exit", (code, signal) => resolve({ code, signal })))
  await writeJsonAtomic(path.join(project.runtimeDir, "server.json"), { ...server, stoppedAtUtc: nowIso(), exitObserved: true, exit })
  throw partial("BACKEND_EXITED", "OpenCode backend exited unexpectedly; Scheduled Task should restart it.", [{ command: "pgl-opencode doctor --json", reason: "Inspect the backend exit and current process state." }, { command: "pgl-opencode backend", reason: "Restart the backend interactively." }], { pid: server.pid, url: server.url, exit })
}

export async function requireServer(project, config) {
  const health = await serverHealth(project, config?.minimumOpenCodeVersion)
  if (!health.healthy) throw prerequisite("BACKEND_UNAVAILABLE", "OpenCode backend is not healthy.", "pgl-opencode backend", health)
  const server = await readServer(project)
  return server
}

function extractSessionId(stdout) {
  for (const line of stdout.split(/\r?\n/)) {
    try {
      const event = JSON.parse(line)
      if (event.sessionID) return event.sessionID
      if (event.sessionId) return event.sessionId
    } catch {}
  }
  return null
}

export async function findSessionByTitle(project, title) {
  const result = await runChecked(opencodeBin(), ["session", "list", "--format", "json"], {
    cwd: project.root,
    errorCode: "SESSION_LIST_FAILED",
    timeoutMs: 60_000,
  })
  const sessions = JSON.parse(result.stdout)
  return sessions.filter((session) => session.title === title).sort((a, b) => b.created - a.created)[0] ?? null
}

export async function runSession(project, config, server, input) {
  const created = await createFullAccessSession(server, { ...input, manager: input.agent === config.agents.manager })
  let sessionId = created.id
  await input.onSession?.({ sessionId, childPid: null })
  const args = [
    "run",
    "--attach", server.url,
    "--dir", input.directory,
    "--session", sessionId,
    "--agent", input.agent,
    "--format", "json",
    "--auto",
  ]
  if (input.model) args.push("--model", input.model)
  let childPid = null
  let sessionIdMismatch = null
  let identityPromise = Promise.resolve(null)
  const env = {
    ...process.env,
    OPENCODE_SERVER_USERNAME: server.username,
    OPENCODE_SERVER_PASSWORD: server.password,
  }
  let outputBuffer = ""
  const result = await runProcess(opencodeBin(), args, {
    cwd: input.directory,
    env,
    input: input.prompt,
    windowsHide: true,
    onSpawn: (child) => {
      childPid = child.pid
      identityPromise = getProcessIdentity(childPid).then(async (processIdentity) => {
        await input.onStarted?.({ childPid, processIdentity })
        return processIdentity
      })
      return identityPromise
    },
    onStdout: (chunk) => {
      process.stderr.write(chunk)
      outputBuffer += chunk
      const emittedSession = extractSessionId(outputBuffer)
      if (emittedSession && emittedSession !== sessionId) {
        sessionIdMismatch = emittedSession
      }
    },
    onStderr: (chunk) => process.stderr.write(chunk),
  })
  const processIdentity = await identityPromise
  if (sessionIdMismatch) {
    throw new RuntimeError("SESSION_ID_CHANGED", "OpenCode emitted a different session ID than the explicitly created Full access session.", {
      exitCode: EXIT.BLOCKED,
      details: { expected: sessionId, actual: sessionIdMismatch },
    })
  }
  const eventErrors = []
  for (const line of outputBuffer.split(/\r?\n/)) {
    try {
      const event = JSON.parse(line)
      if (event?.type === "error") eventErrors.push(event)
    } catch {}
  }
  const messages = await getSessionMessages(server, sessionId, input.directory).catch(() => [])
  return { ...result, sessionId, childPid, processIdentity, title: input.title, assistantText: assistantTextFromMessages(messages), messages, eventErrors }
}

export async function openTui(project, server, input, dryRun = false) {
  const args = ["attach", server.url, "--dir", input.directory]
  if (input.sessionId) args.push("--session", input.sessionId)
  if (input.sessionId) {
    const session = await getSession(server, input.sessionId, input.directory).catch((error) => {
      throw blocked("SESSION_NOT_FOUND", `OpenCode session ${input.sessionId} is not available in the requested directory.`, [{ command: "pgl-opencode status", reason: "Refresh the recorded session state." }], { sessionId: input.sessionId, directory: input.directory, cause: error.message })
    })
    const sessionAccess = hasEffectiveFullAccess({ permission: session.permission })
    if (!sessionAccess.fullAccess) throw blocked("PERMISSION_BLOCKED", `Session ${input.sessionId} no longer has explicit Full access.`, [{ command: "pgl-opencode manager", reason: "Create or recover a verified Full access session." }], { sessionId: input.sessionId, permission: session.permission ?? null })
  }
  if (dryRun) return { status: "planned", command: opencodeBin(), args }
  const env = {
    ...process.env,
    OPENCODE_SERVER_USERNAME: server.username,
    OPENCODE_SERVER_PASSWORD: server.password,
  }
  let child
  if (process.platform === "win32") {
    const script = path.join(project.root, ".ai", "runtime", "opencode-loop", "scripts", "open-tui.ps1")
    if (!(await exists(script))) throw prerequisite("TUI_LAUNCHER_MISSING", `Missing vendored TUI launcher at ${script}.`, "pgl-opencode setup --dry-run")
    child = spawnInherited(process.env.PGL_OPENCODE_POWERSHELL || "powershell.exe", [
      "-NoLogo", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", script,
      "-OpenCodePath", opencodeBin(), "-ServerUrl", server.url, "-Directory", input.directory,
      ...(input.sessionId ? ["-SessionId", input.sessionId] : []),
    ], { cwd: input.directory, windowsHide: false, detached: true, stdio: "ignore", env })
  } else {
    child = spawnInherited(opencodeBin(), args, { cwd: input.directory, windowsHide: false, detached: true, stdio: "ignore", env })
  }
  await new Promise((resolve, reject) => {
    let settled = false
    const finish = (callback) => {
      if (settled) return
      settled = true
      callback()
    }
    child.once("error", (error) => finish(() => reject(prerequisite("TUI_LAUNCH_FAILED", `Could not launch the OpenCode TUI: ${error.message}`, "pgl-opencode doctor --json"))))
    child.once("spawn", () => {
      const timer = setTimeout(() => finish(resolve), 750)
      child.once("exit", (code) => {
        clearTimeout(timer)
        if (code === 0) finish(resolve)
        else finish(() => reject(prerequisite("TUI_EXITED_EARLY", `OpenCode TUI launcher exited immediately with code ${code}.`, "pgl-opencode doctor --json")))
      })
    })
  })
  child.unref()
  return { status: "opened", pid: child.pid, sessionId: input.sessionId ?? null }
}

export async function exportSession(project, config, sessionId, evidenceDir) {
  if (!sessionId) return { exported: false, reason: "session-id-missing" }
  await mkdir(evidenceDir, { recursive: true })
  const args = ["export", ...(config.sessionRetention.sanitizeExports ? ["--sanitize"] : []), sessionId]
  const result = await runChecked(opencodeBin(), args, { cwd: project.root, errorCode: "SESSION_EXPORT_FAILED", exitCode: EXIT.PARTIAL, timeoutMs: 120_000 })
  const target = path.join(evidenceDir, "session.json")
  await writeFile(target, result.stdout, "utf8")
  return { exported: true, path: target }
}

export async function deleteSession(project, server, sessionId, directory) {
  if (!sessionId) return { deleted: false, reason: "session-id-missing" }
  const query = directory ? `?directory=${encodeURIComponent(directory)}` : ""
  const deleted = await serverRequest(server, `/session/${encodeURIComponent(sessionId)}${query}`, { method: "DELETE" })
  return { deleted: Boolean(deleted) }
}

export async function abortSession(project, server, sessionId, directory) {
  if (!sessionId) throw blocked("SESSION_ID_MISSING", "No active OpenCode session is recorded.", [{ command: "pgl-opencode status", reason: "Inspect the current execution." }])
  const query = directory ? `?directory=${encodeURIComponent(directory)}` : ""
  const result = await serverRequest(server, `/session/${encodeURIComponent(sessionId)}/abort${query}`, { method: "POST" })
  return { aborted: Boolean(result), sessionId }
}
