import { copyFile, cp, mkdir, readFile, rm } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { RuntimeError, EXIT, blocked, partial, prerequisite } from "./errors.mjs"
import {
  DEFAULT_CONFIG,
  activeExecutionGoal,
  cleanupCandidate,
  clearCurrentExecution,
  createCandidate,
  currentExecution,
  ensureRemote,
  git,
  hasPendingFeedback,
  isWorktreeClean,
  loadConfig,
  parseRuntimeStatus,
  publishFeedback,
  readRemoteFile,
  reconcileAndPush,
  recordExecution,
  resolveProject,
  saveConfig,
} from "./project.mjs"
import { acquireLease, inspectLease, releaseLease, startHeartbeat, updateLease } from "./lease.mjs"
import {
  abortSession,
  deleteSession,
  exportSession,
  getSession,
  getSessionActivity,
  inspectOpenCode,
  openTui,
  readServer,
  requireServer,
  runBackend,
  runSession,
  sessionHasFullAccess,
  serverHealth,
} from "./opencode.mjs"
import { exists, isPidAlive, nowIso, processIdentityMatches, readJson, runChecked, sha256, shortId, sleep, writeJsonAtomic } from "./system.mjs"

const adapterRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const REQUIRED_SOURCES = [
  "AGENTS.md",
  ".ai/methods/product-goal-loop/METHOD.md",
  "PRODUCT_GOAL.html",
  "ARCHITECTURE.md",
  "INBOX.md",
  "STATE.md",
]

function success(status, data = {}, options = {}) {
  return {
    status,
    data,
    warnings: options.warnings ?? [],
    nextActions: options.nextActions ?? [],
    retryable: options.retryable ?? false,
    sideEffects: options.sideEffects ?? "none",
  }
}

function option(request, name, fallback = undefined) {
  return request.options?.[name] ?? fallback
}

async function contextFor(request) {
  const project = await resolveProject(option(request, "repo"))
  const loaded = await loadConfig(project)
  return { project, config: loaded.config, configPath: loaded.path }
}

function vendoredRoot(project) {
  return path.join(project.root, ".ai", "runtime", "opencode-loop")
}

function taskScript(project) {
  const vendored = path.join(vendoredRoot(project), "scripts", "windows-tasks.ps1")
  return vendored
}

function taskCli(project) {
  return path.join(vendoredRoot(project), "bin", "pgl-opencode.mjs")
}

async function runTaskControl(action, project, config, dryRun = false) {
  if (process.platform !== "win32") throw prerequisite("WINDOWS_REQUIRED", "Windows Scheduled Task integration is only supported on Windows.", "pgl-opencode --help")
  const script = taskScript(project)
  if (!(await exists(script))) throw prerequisite("ADAPTER_NOT_VENDORED", `Missing vendored scheduler script at ${script}.`, `pwsh -File "${path.join(adapterRoot, "install.ps1")}" -ProjectPath "${project.root}"`)
  const args = [
    "-NoProfile",
    "-ExecutionPolicy", "Bypass",
    "-File", script,
    "-Action", action,
    "-RepoPath", project.root,
    "-NodePath", process.execPath,
    "-CliPath", taskCli(project),
    "-RepoKey", project.repoKey,
    "-IntervalMinutes", String(config.scheduleMinutes),
  ]
  if (dryRun) args.push("-DryRun")
  const powershell = process.env.PGL_OPENCODE_POWERSHELL || "powershell.exe"
  const result = await runChecked(powershell, args, {
    cwd: project.root,
    errorCode: "SCHEDULED_TASK_FAILED",
    exitCode: dryRun ? EXIT.PREREQUISITE : EXIT.PARTIAL,
    sideEffects: dryRun ? "none" : "partial",
    nextActions: [{ command: "pgl-opencode doctor --json", reason: "Inspect Scheduled Task and runtime configuration." }],
    timeoutMs: 60_000,
  })
  try {
    return JSON.parse(result.stdout)
  } catch {
    return { action, output: result.stdout.trim() }
  }
}

async function copyTemplates(project, dryRun) {
  const source = path.join(adapterRoot, "templates", ".opencode")
  const target = path.join(project.root, ".opencode")
  const managed = [
    ["agents/product-goal-loop-manager.md", "agents/product-goal-loop-manager.md"],
    ["agents/product-goal-loop-worker.md", "agents/product-goal-loop-worker.md"],
    ["agents/product-goal-loop-verifier.md", "agents/product-goal-loop-verifier.md"],
    ["agents/product-goal-loop-reconciliation.md", "agents/product-goal-loop-reconciliation.md"],
    ["tools/product_goal_loop.js", "tools/product_goal_loop.js"],
  ]
  if (!dryRun) {
    for (const [from, to] of managed) {
      const destination = path.join(target, to)
      await mkdir(path.dirname(destination), { recursive: true })
      await copyFile(path.join(source, from), destination)
    }
  }
  return managed.map(([, to]) => path.join(".opencode", to).replaceAll("\\", "/"))
}

async function syncAdapterToCandidate(project, execution) {
  const sourceRuntime = vendoredRoot(project)
  const targetRuntime = path.join(execution.worktree, ".ai", "runtime", "opencode-loop")
  if (!(await exists(sourceRuntime))) throw prerequisite("ADAPTER_NOT_VENDORED", "The repository-local adapter source is missing.", "pgl-opencode setup --dry-run")
  await mkdir(path.dirname(targetRuntime), { recursive: true })
  await cp(sourceRuntime, targetRuntime, { recursive: true, force: true })
  const installedFiles = await copyTemplates({ ...project, root: execution.worktree }, false)
  return { runtime: path.relative(execution.worktree, targetRuntime).replaceAll("\\", "/"), installedFiles }
}

async function requireProjectSources(project, base = project.root) {
  const checks = []
  for (const relativePath of REQUIRED_SOURCES) {
    const target = path.join(base, relativePath)
    const present = await exists(target)
    checks.push({ path: relativePath, present })
  }
  const missing = checks.filter((item) => !item.present)
  if (missing.length) throw prerequisite("PROJECT_SOURCES_MISSING", "Required Product Goal Loop project sources are missing.", "pgl-opencode doctor --json", { missing: missing.map((item) => item.path) })
  return checks
}

async function requireGitIdentity(project) {
  const [name, email] = await Promise.all([
    git(project.root, ["config", "user.name"]),
    git(project.root, ["config", "user.email"]),
  ])
  if (!name.stdout.trim() || !email.stdout.trim()) {
    throw prerequisite("GIT_IDENTITY_MISSING", "Git user.name and user.email are required for autonomous commits.", "pgl-opencode doctor --json")
  }
  return { name: name.stdout.trim(), email: email.stdout.trim() }
}

async function readPause(project) {
  return readJson(path.join(project.runtimeDir, "pause.json"), { paused: false })
}

async function setPaused(project, config, paused, reason, dryRun = false) {
  const taskAction = paused ? "disable" : "enable"
  const state = { paused, reason: reason ?? null, changedAtUtc: nowIso() }
  if (!dryRun) await writeJsonAtomic(path.join(project.runtimeDir, "pause.json"), state)
  let scheduledTask
  try {
    scheduledTask = await runTaskControl(taskAction, project, config, dryRun)
  } catch (error) {
    throw partial("SCHEDULER_STATE_PARTIAL", `Runtime pause state changed but the Windows tick task could not be ${taskAction}d.`, [{ command: "pgl-opencode doctor --json", reason: "Inspect and repair the Scheduled Task before retrying." }], { pauseState: state, taskAction, cause: error.message, causeCode: error.code })
  }
  return { ...state, scheduledTask }
}

async function taskStatus(project, config) {
  return runTaskControl("status", project, config, false).catch((error) => ({ available: false, error: error.message, code: error.code }))
}

async function waitForServer(project, config, timeoutMs = 45_000) {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    const health = await serverHealth(project, config.minimumOpenCodeVersion)
    if (health.healthy) return requireServer(project, config)
    await sleep(500)
  }
  throw partial("BACKEND_START_TIMEOUT", "Scheduled OpenCode backend did not become healthy.", [{ command: "pgl-opencode backend", reason: "Run the backend interactively to inspect its diagnostic output." }, { command: "pgl-opencode doctor --json", reason: "Inspect the saved server state." }])
}

async function managerRecord(project) {
  return readJson(path.join(project.runtimeDir, "manager.json"), null)
}

async function ensureManagerSession(project, config, server) {
  const current = await managerRecord(project)
  if (current?.sessionId) {
    const existing = await getSession(server, current.sessionId, project.root).catch(() => null)
    if (existing?.id === current.sessionId && existing.agent === config.agents.manager && sessionHasFullAccess(existing)) return current
  }
  const title = "개발 loop 관리 대화"
  const result = await runSession(project, config, server, {
    directory: project.root,
    agent: config.agents.manager,
    title,
    prompt: "이 세션은 이 프로젝트의 지속되는 Product Goal Loop 관리 대화다. 저장소를 변경하지 말고 관리 도구의 사용 가능 여부와 현재 상태만 짧게 확인해라.",
  })
  if (result.code !== 0 || !result.sessionId) throw partial("MANAGER_SESSION_CREATE_FAILED", "Could not create the persistent management session.", [{ command: "pgl-opencode manager", reason: "Retry after checking the backend and provider." }], { exitCode: result.code, stderr: result.stderr.slice(-1000) })
  const record = { sessionId: result.sessionId, title, createdAtUtc: nowIso() }
  await writeJsonAtomic(path.join(project.runtimeDir, "manager.json"), record)
  return record
}

async function setupCommand(request) {
  const project = await resolveProject(option(request, "repo"))
  const dryRun = Boolean(option(request, "dryRun", false))
  if (!dryRun && !option(request, "yes", false)) {
    throw new RuntimeError("CONFIRMATION_REQUIRED", "setup changes project files and Windows Scheduled Tasks; pass --yes after reviewing --dry-run.", {
      exitCode: EXIT.USAGE,
      nextActions: [{ command: `pgl-opencode setup --repo "${project.root}" --dry-run`, reason: "Preview every managed target." }],
    })
  }
  await requireProjectSources(project)
  const existing = await loadConfig(project)
  const config = structuredClone(existing.config)
  config.scheduleMinutes = Number(option(request, "scheduleMinutes", config.scheduleMinutes))
  config.remote = option(request, "remote", config.remote)
  config.branch = option(request, "branch", config.branch)
  const targetRoot = vendoredRoot(project)
  if (!(await exists(path.join(targetRoot, "bin", "pgl-opencode.mjs")))) {
    throw prerequisite("ADAPTER_NOT_VENDORED", "Run install.ps1 first so the executable and its help are stored in the product repository.", `pwsh -File "${path.join(adapterRoot, "install.ps1")}" -ProjectPath "${project.root}"${dryRun ? " -DryRun" : ""}`)
  }
  await ensureRemote(project, config, !dryRun)
  const installedFiles = await copyTemplates(project, dryRun)
  const configPath = await saveConfig(project, config, dryRun)
  const taskPlan = dryRun ? await runTaskControl("install", project, config, true) : null
  if (dryRun) return success("planned", { project: project.root, configPath, installedFiles, scheduledTasks: taskPlan }, { nextActions: [{ command: `pgl-opencode setup --repo "${project.root}" --yes`, reason: "Apply this plan." }] })

  const changedTargets = [
    ...installedFiles,
    path.relative(project.root, configPath).replaceAll("\\", "/"),
    ".opencode/package.json",
    ".opencode/package-lock.json",
    ".opencode/bun.lock",
    ".opencode/.gitignore",
  ]
  let installedTasks = null
  try {
    const opencode = await inspectOpenCode(project, config)
    await writeJsonAtomic(path.join(project.runtimeDir, "pause.json"), { paused: true, reason: "setup-in-progress", changedAtUtc: nowIso() })
    installedTasks = await runTaskControl("install", project, config, false)
    const server = await waitForServer(project, config)
    const manager = await ensureManagerSession(project, config, server)
    const scheduler = await setPaused(project, config, false, "setup-complete", false)
    await writeJsonAtomic(path.join(project.runtimeDir, "installation.json"), {
      schemaVersion: 1,
      installedAtUtc: nowIso(),
      adapterRoot: targetRoot,
      configPath,
      version: opencode.version,
    })
    return success("configured", { project: project.root, configPath, installedFiles, scheduledTasks: installedTasks, scheduler, manager: { sessionId: manager.sessionId, title: manager.title }, backend: { url: server.url } }, {
      sideEffects: "complete",
      nextActions: [{ command: `pgl-opencode manager --repo "${project.root}"`, reason: "Open the persistent management conversation." }],
    })
  } catch (error) {
    if (installedTasks) await runTaskControl("disable", project, config, false).catch(() => {})
    if (error?.exitCode === EXIT.PARTIAL) throw error
    throw partial("SETUP_PARTIAL", "Setup could not finish after writing repository-local adapter configuration; inspect the exact changed targets before retrying.", [{ command: "pgl-opencode doctor --json", reason: "Diagnose Full access, backend, remote and Scheduled Task state." }, { command: "pgl-opencode setup --dry-run", reason: "Review the idempotent reconciliation plan." }], { changedTargets, causeCode: error?.code ?? "UNKNOWN", cause: error?.message ?? String(error) })
  }
}

async function doctorCommand(request) {
  const { project, config, configPath } = await contextFor(request)
  const checks = []
  async function check(name, action) {
    try {
      const data = await action()
      checks.push({ name, ok: true, data })
      return data
    } catch (error) {
      checks.push({ name, ok: false, error: { code: error?.code ?? "CHECK_FAILED", message: error?.message ?? String(error), details: error?.details ?? null } })
      return null
    }
  }

  await check("node-version", async () => {
    const major = Number(process.versions.node.split(".")[0])
    if (major < 20) throw prerequisite("NODE_VERSION_UNSUPPORTED", `Node 20 or newer is required; found ${process.versions.node}.`, "Install Node.js 20 or newer.")
    return { version: process.versions.node, executable: process.execPath }
  })
  await check("git-version", async () => ({ version: (await runChecked("git", ["--version"], { cwd: project.root, errorCode: "GIT_NOT_FOUND", timeoutMs: 30_000 })).stdout.trim() }))
  await check("project-sources", async () => requireProjectSources(project))
  await check("config", async () => {
    if (!(await exists(configPath))) throw prerequisite("CONFIG_MISSING", `Missing ${configPath}.`, "pgl-opencode setup --dry-run")
    return { path: configPath, schemaVersion: config.schemaVersion }
  })
  await check("git-identity", async () => {
    return requireGitIdentity(project)
  })
  const remoteUrl = await check("integration-remote", async () => ensureRemote(project, config, true))
  await check("push-readiness", async () => {
    const source = `refs/remotes/${config.remote}/${config.branch}`
    const target = `refs/heads/${config.branch}`
    const result = await git(project.root, ["push", "--dry-run", config.remote, `${source}:${target}`], {
      errorCode: "REMOTE_PUSH_PREFLIGHT_FAILED",
      exitCode: EXIT.PREREQUISITE,
      nextActions: [{ command: `git push --dry-run ${config.remote} ${source}:${target}`, reason: "Repair credentials or branch policy without changing the remote." }],
    })
    return { dryRun: true, output: result.stderr.trim() || result.stdout.trim() }
  })
  const opencode = await check("opencode-full-access", async () => inspectOpenCode(project, config))
  const backend = await check("backend", async () => {
    const health = await serverHealth(project, config.minimumOpenCodeVersion)
    if (!health.healthy) throw prerequisite("BACKEND_UNAVAILABLE", "OpenCode backend is not healthy at the required version.", "pgl-opencode backend", health)
    return health
  })
  const tasks = await check("scheduled-tasks", async () => {
    if (process.platform !== "win32") throw prerequisite("WINDOWS_REQUIRED", "Windows Scheduled Tasks are required by this adapter.", "pgl-opencode --help")
    const status = await taskStatus(project, config)
    const expectedCli = taskCli(project).toLowerCase()
    const invalid = !Array.isArray(status) || status.some((task) => {
      const actionsValid = task.actions?.length && task.actions.every((action) => String(action.arguments ?? "").toLowerCase().includes(expectedCli) && path.resolve(action.workingDirectory ?? "") === project.root)
      const triggersValid = task.triggers?.length && task.triggers.every((trigger) => trigger.enabled !== false)
      return !task.exists || !actionsValid || !triggersValid
    })
    if (status.available === false || invalid) {
      throw prerequisite("SCHEDULED_TASK_INVALID", "Backend and tick Scheduled Tasks must exist with the expected CLI path, working directory and enabled triggers.", "pgl-opencode setup --dry-run", status)
    }
    return status
  })
  const failed = checks.filter((item) => !item.ok)
  if (failed.length) {
    throw new RuntimeError("DOCTOR_FAILED", `${failed.length} readiness check(s) failed.`, {
      exitCode: EXIT.PREREQUISITE,
      details: { project: project.root, configPath, checks },
      nextActions: [{ command: "pgl-opencode setup --dry-run", reason: "Review the idempotent repair plan after addressing the failed checks." }],
    })
  }
  return success("ready", { project: project.root, configPath, checks, remote: { name: config.remote, branch: config.branch, url: remoteUrl }, opencode, backend, scheduledTasks: tasks })
}

async function statusCommand(request) {
  const { project, config } = await contextFor(request)
  const [lease, execution, backend, pause, manager, tasks] = await Promise.all([
    inspectLease(project),
    currentExecution(project),
    serverHealth(project, config.minimumOpenCodeVersion),
    readPause(project),
    managerRecord(project),
    process.platform === "win32" ? taskStatus(project, config) : Promise.resolve({ available: false }),
  ])
  const sourceSnapshot = await Promise.all([
    readRemoteFile(project, config, "STATE.md"),
    readRemoteFile(project, config, "INBOX.md"),
  ]).then(([state, inbox]) => ({ runtimeStatus: parseRuntimeStatus(state), activeExecutionGoal: activeExecutionGoal(state), pendingFeedback: hasPendingFeedback(inbox) })).catch((error) => ({ unavailable: true, error: error.message, code: error.code }))
  const executionLifecycle = {
    starting: "running",
    recovering: "running",
    reconciling: "running",
    recoverable_failure: "recoverable_failure",
    externally_blocked: "externally_blocked",
    waiting_for_human: "waiting_for_human",
    verified_not_published: "waiting_for_human",
    published_cleanup_pending: "recoverable_failure",
  }[execution?.status] ?? "idle"
  const blockedLifecycle = ["waiting_for_human", "externally_blocked", "recoverable_failure"].includes(executionLifecycle)
  const lifecycleStatus = blockedLifecycle
    ? executionLifecycle
    : pause.paused
      ? "paused"
      : lease.state === "busy"
        ? "running"
        : executionLifecycle
  return success(lifecycleStatus, {
    project: project.root,
    lifecycleStatus,
    sourceSnapshot,
    paused: pause,
    backend,
    lease: { state: lease.state, heartbeatAgeSeconds: lease.heartbeatAgeSeconds ?? null, ownerPid: lease.lease?.ownerPid ?? null },
    execution,
    manager,
    scheduledTasks: tasks,
  }, {
    nextActions: execution?.sessionId ? [{ command: "pgl-opencode open-worker", reason: "Observe the active or preserved worker conversation." }] : [],
  })
}

function executionTitle(project, kind = "worker") {
  const stamp = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul", dateStyle: "short", timeStyle: "short", hour12: false }).format(new Date()).replace(",", "")
  return `Product Goal Loop · ${path.basename(project.root)} · ${stamp}${kind === "reconciliation" ? " · reconcile" : ""}`
}

function workerPrompt(execution, resumed) {
  return [
    `This is a ${resumed ? "recovery" : "fresh"} Product Goal Loop tick for execution ${execution.id}.`,
    "Full access has been verified by the runtime. It is capability, not authorization.",
    "Read AGENTS.md, the selected Product Goal Loop METHOD.md, PRODUCT_GOAL.html, ARCHITECTURE.md, INBOX.md and STATE.md completely.",
    resumed ? `Inspect the preserved candidate, execution evidence and latest ${execution.baseRef} before changing anything. Preserve verified work and safely incorporate new feedback.` : "Compare both Desired States with the real product, then select exactly one complete evidence-based Execution Goal.",
    "Implement and run focused tests. The runtime will launch the configured product-goal-loop-verifier in a separate fresh Full access session after you exit.",
    "Do not push, force, rebase, tag, release or deploy; the external adapter owns final integration.",
    "The runtime synchronized its own vendored adapter and OpenCode agent/tool files into this candidate. Preserve and commit those managed files together with the candidate when they are changed.",
    "On success update STATE.md, remove the completed Active Execution Goal, commit all intended changes and leave the worktree clean.",
    "If Human input or an external condition is required, preserve the candidate, record the blocker in STATE.md and do not claim completion.",
  ].join("\n")
}

function reconciliationPrompt(execution) {
  const latestVerification = execution.verifications?.at(-1)
  return [
    `Reconcile Product Goal Loop execution ${execution.id} after latest ${execution.baseRef} was merged without rewriting history.`,
    "Re-read all Product Goal Loop sources, preserve every newly arrived pending INBOX item and remove only feedback this execution actually incorporated.",
    "Do not start a new Execution Goal. Re-run the tests and independent verification affected by the merge.",
    "Do not push, rebase, force, tag, release or deploy.",
    "If the completed Goal remains valid, update STATE.md as needed, commit and leave the worktree clean. Otherwise preserve evidence and record the blocker.",
    latestVerification ? `Previous independent-verifier verdict and report:\n${latestVerification.verdict}\n${latestVerification.report}` : "No previous verifier report is available; treat that as missing evidence.",
  ].join("\n")
}

function verifierPrompt(execution, phase) {
  const workerReport = execution.reports?.filter((report) => report.kind === "worker" || report.kind === "reconciliation").at(-1)?.text
  return [
    `Independently verify Product Goal Loop execution ${execution.id} during the ${phase} phase.`,
    "Full access is verified capability only. Do not edit, commit, push, tag, release or deploy.",
    "Reconstruct the current Execution Goal and acceptance criteria from AGENTS.md, the selected Method, Product Goal, Architecture, INBOX, STATE, the candidate diff and real runtime evidence.",
    "Run the strongest relevant tests and controllable non-disruptive visual checks. Treat missing visual evidence as BLOCKED, never as PASS.",
    workerReport ? `The worker reported the following scope and evidence. Treat it as a claim to verify, not as proof:\n${workerReport}` : "The worker emitted no usable report; reconstruct the Goal solely from durable repository evidence.",
    "Report criterion-to-evidence mappings and finish with exactly one line: VERDICT: PASS, VERDICT: FAIL, or VERDICT: BLOCKED.",
  ].join("\n")
}

async function readCandidateState(worktree) {
  const markdown = await readFile(path.join(worktree, "STATE.md"), "utf8")
  const inbox = await readFile(path.join(worktree, "INBOX.md"), "utf8")
  return { markdown, inbox, runtimeStatus: parseRuntimeStatus(markdown), activeGoal: activeExecutionGoal(markdown), pendingFeedback: hasPendingFeedback(inbox) }
}

async function runExecutionSession(project, config, server, execution, kind, resumed = false) {
  const isReconciliation = kind === "reconciliation"
  const agent = isReconciliation ? config.agents.reconciliation : config.agents.worker
  const model = isReconciliation ? config.models.reconciliation : config.models.worker
  const title = executionTitle(project, kind)
  const session = await runSession(project, config, server, {
    directory: execution.worktree,
    agent,
    model,
    title,
    prompt: isReconciliation ? reconciliationPrompt(execution) : workerPrompt(execution, resumed),
    onStarted: async ({ childPid, processIdentity }) => {
      execution.childPid = childPid
      execution.childIdentity = processIdentity
      execution.updatedAtUtc = nowIso()
      await recordExecution(project, execution)
      await updateLease(project, execution.leaseToken, { executionId: execution.id, childPid })
    },
    onSession: async ({ sessionId, childPid }) => {
      execution.sessionId = sessionId
      execution.childPid = childPid
      execution.sessions.push({ id: sessionId, kind, title, startedAtUtc: nowIso() })
      await recordExecution(project, execution)
      await updateLease(project, execution.leaseToken, { executionId: execution.id, sessionId, childPid })
    },
  })
  if (session.sessionId && !execution.sessions.some((item) => item.id === session.sessionId)) {
    execution.sessionId = session.sessionId
    execution.sessions.push({ id: session.sessionId, kind, title, startedAtUtc: nowIso() })
  }
  execution.lastProcessExitCode = session.code
  execution.reports = [...(execution.reports ?? []), { kind, sessionId: session.sessionId, recordedAtUtc: nowIso(), text: String(session.assistantText ?? "").slice(-12_000) }]
  execution.updatedAtUtc = nowIso()
  await recordExecution(project, execution)
  return session
}

async function runVerifierSession(project, config, server, execution, phase) {
  const kind = "verifier"
  const title = `${executionTitle(project)} · verify`
  const session = await runSession(project, config, server, {
    directory: execution.worktree,
    agent: config.agents.verifier,
    model: config.models.verifier,
    title,
    prompt: verifierPrompt(execution, phase),
    onStarted: async ({ childPid, processIdentity }) => {
      execution.childPid = childPid
      execution.childIdentity = processIdentity
      execution.updatedAtUtc = nowIso()
      await recordExecution(project, execution)
      await updateLease(project, execution.leaseToken, { executionId: execution.id, childPid })
    },
    onSession: async ({ sessionId, childPid }) => {
      execution.sessionId = sessionId
      execution.childPid = childPid
      execution.sessions.push({ id: sessionId, kind, title, phase, startedAtUtc: nowIso() })
      await recordExecution(project, execution)
      await updateLease(project, execution.leaseToken, { executionId: execution.id, sessionId, childPid })
    },
  })
  const verdicts = [...String(session.assistantText ?? "").matchAll(/^VERDICT:\s*(PASS|FAIL|BLOCKED)\s*$/gim)]
  const verdict = verdicts.at(-1)?.[1]?.toUpperCase() ?? "UNKNOWN"
  const verification = {
    phase,
    verdict,
    sessionId: session.sessionId,
    processExitCode: session.code,
    recordedAtUtc: nowIso(),
    report: String(session.assistantText ?? "").slice(-12_000),
  }
  execution.verifications = [...(execution.verifications ?? []), verification]
  execution.updatedAtUtc = nowIso()
  await recordExecution(project, execution)
  return { session, verification }
}

async function requireVerifierPass(project, config, server, execution, phase) {
  const { session, verification } = await runVerifierSession(project, config, server, execution, phase)
  if (session.code !== 0 || session.eventErrors?.length) {
    execution.status = "recoverable_failure"
    execution.blocker = { code: "VERIFIER_PROCESS_FAILED", verification, eventErrors: session.eventErrors ?? [] }
    await recordExecution(project, execution)
    throw partial("VERIFIER_PROCESS_FAILED", "Independent verifier process failed; candidate preserved.", [{ command: "pgl-opencode run-now", reason: "Retry the same candidate with a fresh verifier." }, { command: "pgl-opencode open-worker", reason: "Inspect the retained verifier conversation." }], { executionId: execution.id, verification })
  }
  if (verification.verdict === "PASS") return verification
  if (verification.verdict === "BLOCKED") {
    execution.status = "externally_blocked"
    execution.blocker = { code: "VERIFICATION_BLOCKED", verification }
    await recordExecution(project, execution)
    await setPaused(project, config, true, "verification-blocked", false)
    throw blocked("VERIFICATION_BLOCKED", "Independent verification requires a Human decision or external capability; candidate and session were preserved.", [{ command: "pgl-opencode open-worker", reason: "Review the verifier's exact blocked criteria." }, { command: "pgl-opencode manager", reason: "Resolve the blocker through the management conversation." }], { executionId: execution.id, verification })
  }
  execution.status = "recoverable_failure"
  execution.blocker = { code: verification.verdict === "FAIL" ? "VERIFICATION_FAILED" : "VERIFIER_RESULT_INVALID", verification }
  await recordExecution(project, execution)
  throw partial(execution.blocker.code, verification.verdict === "FAIL" ? "Independent verification failed; candidate preserved for repair." : "Independent verifier did not emit the required verdict; candidate preserved.", [{ command: "pgl-opencode open-worker", reason: "Inspect the retained verifier conversation." }, { command: "pgl-opencode run-now", reason: "Repair or retry the same Execution Goal in a fresh session." }], { executionId: execution.id, verification })
}

async function ensureSessionsSettledWithoutHumanInput(project, config, server, execution) {
  let activities = []
  for (let attempt = 0; attempt < 60; attempt += 1) {
    activities = []
    for (const session of execution.sessions) {
      const priorOutcome = execution.sessionOutcomes?.find((outcome) => outcome.sessionId === session.id)
      if (priorOutcome?.deleted) continue
      const activity = await getSessionActivity(server, session.id, execution.worktree)
      const acknowledgedUserMessages = execution.acknowledgedUserMessages?.[session.id] ?? 1
      activities.push({ ...activity, acknowledgedUserMessages, unacknowledgedHumanInput: activity.userMessages > acknowledgedUserMessages })
    }
    if (activities.every((activity) => activity.status === "idle")) break
    await sleep(500)
  }
  const human = activities.filter((activity) => activity.unacknowledgedHumanInput)
  const active = activities.filter((activity) => activity.status !== "idle")
  if (human.length || active.length) {
    execution.humanInteracted = execution.humanInteracted || human.length > 0
    execution.status = human.length ? "waiting_for_human" : "externally_blocked"
    execution.blocker = {
      code: human.length ? "HUMAN_INTERACTED_WITH_WORKER" : "SESSION_NOT_IDLE",
      activities,
      recordedAtUtc: nowIso(),
    }
    await recordExecution(project, execution)
    await setPaused(project, config, true, human.length ? "human-interacted-with-worker" : "session-not-idle", false)
    throw blocked(execution.blocker.code, human.length ? "A Human added input to an execution session; publication and cleanup were stopped." : "An execution session did not reach an idle boundary; publication and cleanup were stopped.", [{ command: "pgl-opencode open-worker", reason: "Review the retained live session before resuming." }, { command: "pgl-opencode manager", reason: "Coordinate the next action through the management conversation." }], { executionId: execution.id, activities, worktree: execution.worktree })
  }
  return activities
}

function candidateCanPublish(state, cleanliness) {
  const completionConsistent = state.runtimeStatus !== "IMPLEMENTATION_COMPLETE" || !state.pendingFeedback
  return cleanliness.clean && !state.activeGoal && completionConsistent && ["RUNNING", "IMPLEMENTATION_COMPLETE"].includes(state.runtimeStatus)
}

function recursivelyCountUserMessages(value) {
  if (Array.isArray(value)) return value.reduce((total, item) => total + recursivelyCountUserMessages(item), 0)
  if (!value || typeof value !== "object") return 0
  let count = value.role === "user" ? 1 : 0
  for (const child of Object.values(value)) count += recursivelyCountUserMessages(child)
  return count
}

async function archiveSessions(project, config, server, execution, finalCompletion) {
  const evidenceRoot = path.join(project.runtimeDir, "evidence", execution.id)
  const outcomes = []
  const finalExecutionSessionIndex = execution.sessions.findLastIndex((session) => session.kind === "worker" || session.kind === "reconciliation")
  for (let index = 0; index < execution.sessions.length; index += 1) {
    const session = execution.sessions[index]
    try {
      const exported = await exportSession(project, config, session.id, path.join(evidenceRoot, session.id))
      let humanInteracted = false
      if (exported.exported) {
        try {
          humanInteracted = recursivelyCountUserMessages(JSON.parse(await readFile(exported.path, "utf8"))) > 1
        } catch {}
      }
      const activity = await getSessionActivity(server, session.id, execution.worktree).catch(() => null)
      humanInteracted ||= activity?.humanInteracted === true
      const acknowledgedUserMessages = execution.acknowledgedUserMessages?.[session.id] ?? 1
      const unacknowledgedHumanInput = activity ? activity.userMessages > acknowledgedUserMessages : false
      const inspectionFailed = activity === null
      const retain = humanInteracted || (finalCompletion && index === finalExecutionSessionIndex && config.sessionRetention.retainFinalCompletion)
      const sessionActive = activity && activity.status !== "idle"
      const deleted = retain || sessionActive || inspectionFailed ? { deleted: false, reason: humanInteracted ? "human-interacted" : sessionActive ? "session-active" : inspectionFailed ? "inspection-failed" : "final-completion" } : await deleteSession(project, server, session.id, execution.worktree)
      outcomes.push({ sessionId: session.id, exported, humanInteracted, acknowledgedUserMessages, unacknowledgedHumanInput, inspectionFailed, activity, retained: !deleted.deleted, deleted: deleted.deleted })
    } catch (error) {
      outcomes.push({ sessionId: session.id, exported: false, retained: true, warning: error.message })
    }
  }
  execution.sessionOutcomes = outcomes
  await recordExecution(project, execution)
  return outcomes
}

function unsafeSessionOutcome(outcomes) {
  return outcomes?.find((outcome) => outcome.warning || outcome.inspectionFailed || outcome.unacknowledgedHumanInput || outcome.activity?.status && outcome.activity.status !== "idle") ?? null
}

async function tickCommand(request) {
  const { project, config } = await contextFor(request)
  const dryRun = Boolean(option(request, "dryRun", false))
  const pause = await readPause(project)
  if (pause.paused) return success("paused", { reason: pause.reason }, { nextActions: [{ command: "pgl-opencode resume", reason: "Enable scheduled ticks." }, { command: "pgl-opencode run-now", reason: "Request a tick after resuming." }] })
  const leaseResult = await acquireLease(project, config.staleLeaseMinutes)
  if (!leaseResult.acquired) return success("busy", { ownerPid: leaseResult.lease?.ownerPid ?? null, heartbeatAgeSeconds: leaseResult.heartbeatAgeSeconds ?? null }, { nextActions: [{ command: "pgl-opencode status", reason: "Observe the active execution." }] })
  const leaseToken = leaseResult.lease.token
  const stopHeartbeat = startHeartbeat(project, leaseToken)
  let execution = null
  try {
    await ensureRemote(project, config, !dryRun)
    const [remoteState, remoteInbox] = await Promise.all([
      readRemoteFile(project, config, "STATE.md"),
      readRemoteFile(project, config, "INBOX.md"),
    ])
    const remoteStatus = parseRuntimeStatus(remoteState)
    const pending = hasPendingFeedback(remoteInbox)
    const resumeOncePath = path.join(project.runtimeDir, "resume-once.json")
    const resumeOnce = await readJson(resumeOncePath, null)
    if (remoteStatus === "IMPLEMENTATION_COMPLETE" && !pending) {
      const paused = dryRun ? { paused: true, dryRun: true } : await setPaused(project, config, true, "implementation-complete", false)
      return success("implementation_complete", { remoteStatus, pendingFeedback: false, scheduler: paused })
    }
    if (["WAITING_FOR_HUMAN", "EXTERNALLY_BLOCKED"].includes(remoteStatus) && !pending && !resumeOnce) {
      const reason = remoteStatus.toLowerCase()
      const paused = dryRun ? { paused: true, dryRun: true } : await setPaused(project, config, true, reason, false)
      return success(reason, { remoteStatus, pendingFeedback: false, scheduler: paused }, { nextActions: [{ command: "pgl-opencode manager", reason: "Resolve the current blocker through the management conversation." }] })
    }
    if (resumeOnce && !dryRun) await rm(resumeOncePath, { force: true })
    if (dryRun) return success("planned", { remoteStatus, pendingFeedback: pending, branch: `${config.remote}/${config.branch}`, action: "start-or-resume-one-execution-goal" })

    await requireProjectSources(project)
    await requireGitIdentity(project)
    await inspectOpenCode(project, config)
    const server = await requireServer(project, config)
    execution = await currentExecution(project)
    if (execution?.status === "published_cleanup_pending") {
      const remoteCommit = (await git(project.root, ["rev-parse", `${config.remote}/${config.branch}`])).stdout.trim()
      const publishedCommit = execution.publication?.commit
      const containsPublished = publishedCommit
        ? await runChecked("git", ["-C", project.root, "merge-base", "--is-ancestor", publishedCommit, remoteCommit], { errorCode: "PUBLISHED_COMMIT_NOT_FOUND", exitCode: EXIT.PARTIAL, timeoutMs: 60_000 }).then(() => true).catch(() => false)
        : false
      if (!containsPublished) throw partial("PUBLISHED_COMMIT_NOT_FOUND", "Cleanup cannot continue because the recorded published commit is not reachable from the integration branch.", [{ command: "pgl-opencode status --json", reason: "Inspect the preserved execution before any cleanup." }], { executionId: execution.id, publishedCommit, remoteCommit })
      if (await exists(execution.worktree)) {
        await ensureSessionsSettledWithoutHumanInput(project, config, server, execution)
        if (!execution.sessionOutcomes) {
          await archiveSessions(project, config, server, execution, execution.runtimeStatus === "IMPLEMENTATION_COMPLETE")
        }
      }
      const unsafeOutcome = unsafeSessionOutcome(execution.sessionOutcomes)
      if (unsafeOutcome) throw partial("SESSION_EVIDENCE_UNSAFE_FOR_CLEANUP", "Session evidence or activity could not be verified during cleanup recovery; candidate was preserved.", [{ command: "pgl-opencode status --json", reason: "Inspect the retained session and evidence before retrying." }], { executionId: execution.id, outcome: unsafeOutcome })
      await cleanupCandidate(project, execution, publishedCommit)
      execution.status = "integrated"
      execution.cleanupCompletedAtUtc = nowIso()
      await recordExecution(project, execution)
      await clearCurrentExecution(project, execution)
      return success("cleanup_complete", { executionId: execution.id, commit: publishedCommit })
    }
    const resumed = Boolean(execution && execution.status !== "integrated")
    if (resumed) {
      if (!(await exists(execution.worktree))) throw partial("RECOVERY_WORKTREE_MISSING", "The execution record exists but its candidate worktree is missing.", [{ command: "pgl-opencode status", reason: "Inspect the preserved branch before manual recovery." }], { executionId: execution.id, branch: execution.branch })
      execution.leaseToken = leaseToken
      execution.status = "recovering"
      execution.attempt = (execution.attempt ?? 1) + 1
    } else {
      const id = `${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}-${shortId()}`
      const candidate = await createCandidate(project, config, id)
      execution = {
        schemaVersion: 1,
        id,
        status: "starting",
        attempt: 1,
        leaseToken,
        branch: candidate.branch,
        worktree: candidate.worktree,
        baseRef: `${config.remote}/${config.branch}`,
        sessions: [],
        startedAtUtc: nowIso(),
        updatedAtUtc: nowIso(),
      }
      execution.adapterSync = await syncAdapterToCandidate(project, execution)
    }
    try {
      await inspectOpenCode(project, config, execution.worktree)
    } catch (error) {
      execution.status = "externally_blocked"
      execution.blocker = { code: "CANDIDATE_PERMISSION_PREFLIGHT_FAILED", causeCode: error?.code, cause: error?.message, recordedAtUtc: nowIso() }
      await recordExecution(project, execution)
      await setPaused(project, config, true, "candidate-permission-preflight-failed", false)
      throw partial("CANDIDATE_PERMISSION_PREFLIGHT_FAILED", "The root Full access preflight passed, but the candidate's effective OpenCode configuration did not; candidate files were preserved.", [{ command: `opencode debug agent ${config.agents.worker}`, reason: "Run from the preserved candidate worktree and repair its effective Full access configuration." }, { command: "pgl-opencode doctor --json", reason: "Inspect the repository-local installation." }], { executionId: execution.id, branch: execution.branch, worktree: execution.worktree, causeCode: error?.code, cause: error?.message })
    }
    await recordExecution(project, execution)
    await updateLease(project, leaseToken, { executionId: execution.id })
    const session = await runExecutionSession(project, config, server, execution, "worker", resumed)
    if (session.code !== 0 || session.eventErrors?.length) {
      execution.status = "recoverable_failure"
      execution.blocker = { code: "OPENCODE_RUN_FAILED", processExitCode: session.code, stderr: session.stderr.slice(-2000), eventErrors: session.eventErrors ?? [] }
      await recordExecution(project, execution)
      throw partial("OPENCODE_RUN_FAILED", "OpenCode worker exited without completing the tick; the candidate was preserved.", [{ command: "pgl-opencode run-now", reason: "Resume in a fresh session from durable evidence." }, { command: "pgl-opencode open-worker", reason: "Inspect the retained worker conversation." }], { executionId: execution.id, sessionId: session.sessionId, worktree: execution.worktree })
    }
    await ensureSessionsSettledWithoutHumanInput(project, config, server, execution)
    let state = await readCandidateState(execution.worktree)
    let cleanliness = await isWorktreeClean(execution.worktree)
    if (["WAITING_FOR_HUMAN", "EXTERNALLY_BLOCKED"].includes(state.runtimeStatus)) {
      execution.status = state.runtimeStatus.toLowerCase()
      execution.blocker = { code: state.runtimeStatus, activeGoal: state.activeGoal }
      await recordExecution(project, execution)
      await setPaused(project, config, true, state.runtimeStatus.toLowerCase(), false)
      return success(execution.status, { executionId: execution.id, sessionId: execution.sessionId, worktree: execution.worktree, activeGoal: state.activeGoal }, { nextActions: [{ command: "pgl-opencode open-worker", reason: "Review the retained conversation and blocker." }, { command: "pgl-opencode manager", reason: "Provide the required decision through the management conversation." }] })
    }
    if (!candidateCanPublish(state, cleanliness)) {
      execution.status = "recoverable_failure"
      execution.blocker = { code: "CANDIDATE_NOT_PUBLISHABLE", runtimeStatus: state.runtimeStatus, activeGoal: state.activeGoal, dirty: !cleanliness.clean, worktreeStatus: cleanliness.status }
      await recordExecution(project, execution)
      throw partial("CANDIDATE_NOT_PUBLISHABLE", "Worker finished but the candidate is not cleanly publishable; it was preserved.", [{ command: "pgl-opencode status", reason: "Inspect durable recovery evidence." }, { command: "pgl-opencode run-now", reason: "Resume and finish the same Execution Goal." }], { executionId: execution.id, ...execution.blocker })
    }

    await requireVerifierPass(project, config, server, execution, "candidate")
    await ensureSessionsSettledWithoutHumanInput(project, config, server, execution)

    execution.status = "reconciling"
    await recordExecution(project, execution)
    const publication = await reconcileAndPush(project, config, execution, {
      reverify: async () => {
        const reconcileSession = await runExecutionSession(project, config, server, execution, "reconciliation", true)
        if (reconcileSession.code !== 0 || reconcileSession.eventErrors?.length) throw partial("RECONCILIATION_FAILED", "Fresh reconciliation session failed; candidate preserved.", [{ command: "pgl-opencode run-now", reason: "Retry reconciliation from the preserved candidate." }], { executionId: execution.id, sessionId: reconcileSession.sessionId, eventErrors: reconcileSession.eventErrors ?? [] })
        state = await readCandidateState(execution.worktree)
        cleanliness = await isWorktreeClean(execution.worktree)
        if (!candidateCanPublish(state, cleanliness)) throw partial("RECONCILIATION_NOT_PUBLISHABLE", "Reconciliation did not leave a verified clean candidate.", [{ command: "pgl-opencode status", reason: "Inspect the preserved reconciliation evidence." }], { runtimeStatus: state.runtimeStatus, activeGoal: state.activeGoal, dirty: !cleanliness.clean })
        await requireVerifierPass(project, config, server, execution, "reconciliation")
      },
      beforePush: async () => ensureSessionsSettledWithoutHumanInput(project, config, server, execution),
    })
    if (!publication.pushed) {
      execution.status = "verified_not_published"
      execution.publication = publication
      execution.runtimeStatus = state.runtimeStatus
      await recordExecution(project, execution)
      const scheduler = await setPaused(project, config, true, "auto-push-disabled", false)
      return success("waiting_for_human", {
        executionId: execution.id,
        branch: execution.branch,
        worktree: execution.worktree,
        commit: (await git(execution.worktree, ["rev-parse", "HEAD"])).stdout.trim(),
        pushed: false,
        candidatePreserved: true,
        scheduler,
      }, { nextActions: [{ command: `git -C "${execution.worktree}" push ${config.remote} HEAD:refs/heads/${config.branch}`, reason: "Publish the verified candidate manually, or enable autoPush and resume." }] })
    }
    execution.status = "published_cleanup_pending"
    execution.integratedAtUtc = nowIso()
    execution.publication = publication
    execution.runtimeStatus = state.runtimeStatus
    await recordExecution(project, execution)
    await ensureSessionsSettledWithoutHumanInput(project, config, server, execution)
    const finalCompletion = state.runtimeStatus === "IMPLEMENTATION_COMPLETE"
    const sessionOutcomes = await archiveSessions(project, config, server, execution, finalCompletion)
    const unsafeOutcome = unsafeSessionOutcome(sessionOutcomes)
    if (unsafeOutcome) {
      execution.status = unsafeOutcome.unacknowledgedHumanInput ? "waiting_for_human" : "externally_blocked"
      execution.blocker = { code: unsafeOutcome.unacknowledgedHumanInput ? "HUMAN_INTERACTED_DURING_ARCHIVE" : unsafeOutcome.activity?.status && unsafeOutcome.activity.status !== "idle" ? "SESSION_ACTIVE_DURING_ARCHIVE" : "SESSION_EVIDENCE_UNAVAILABLE", outcome: unsafeOutcome, recordedAtUtc: nowIso() }
      await recordExecution(project, execution)
      await setPaused(project, config, true, execution.blocker.code.toLowerCase(), false)
      throw blocked(execution.blocker.code, "Session activity or evidence changed during export; candidate cleanup was stopped.", [{ command: "pgl-opencode open-worker", reason: "Review the retained session before resuming." }], { executionId: execution.id, outcome: unsafeOutcome })
    }
    await ensureSessionsSettledWithoutHumanInput(project, config, server, execution)
    await cleanupCandidate(project, execution, publication.commit)
    execution.status = "integrated"
    execution.cleanupCompletedAtUtc = nowIso()
    await recordExecution(project, execution)
    await clearCurrentExecution(project, execution)
    const scheduler = finalCompletion ? await setPaused(project, config, true, "implementation-complete", false) : await readPause(project)
    return success(finalCompletion ? "implementation_complete" : "goal_complete", {
      executionId: execution.id,
      commit: publication.commit ?? null,
      pushed: publication.pushed,
      sessionOutcomes,
      scheduler,
    }, { sideEffects: "complete", nextActions: finalCompletion ? [{ command: "pgl-opencode manager", reason: "Review the completed product and create a release tag when satisfied." }] : [] })
  } catch (error) {
    if (execution && execution.status !== "integrated") {
      const externallyBlocked = error?.exitCode === EXIT.BLOCKED
      if (!execution.status || ["starting", "recovering", "reconciling"].includes(execution.status)) {
        execution.status = externallyBlocked ? "externally_blocked" : "recoverable_failure"
      }
      execution.blocker = execution.blocker ?? {
        code: error?.code ?? "UNEXPECTED_EXECUTION_FAILURE",
        message: error?.message ?? String(error),
        recordedAtUtc: nowIso(),
      }
      execution.updatedAtUtc = nowIso()
      await recordExecution(project, execution).catch(() => {})
      if (externallyBlocked) await setPaused(project, config, true, String(error?.code ?? "externally-blocked").toLowerCase(), false).catch(() => {})
      if (error && typeof error === "object") {
        error.sideEffects = "partial"
        error.details = { ...(error.details ?? {}), executionId: execution.id, branch: execution.branch, worktree: execution.worktree, candidatePreserved: true }
      }
    }
    throw error
  } finally {
    stopHeartbeat()
    await releaseLease(project, leaseToken).catch(() => {})
  }
}

async function feedbackText(request) {
  if (option(request, "text") !== undefined) return String(option(request, "text"))
  if (option(request, "file")) return readFile(path.resolve(option(request, "file")), "utf8")
  if (option(request, "stdin")) return readFile(0, "utf8")
  throw new RuntimeError("FEEDBACK_INPUT_REQUIRED", "Provide exactly one of --stdin, --file or --text.", {
    exitCode: EXIT.USAGE,
    nextActions: [{ command: "pgl-opencode feedback --help", reason: "Review safe arbitrary-text input examples." }],
  })
}

async function feedbackCommand(request) {
  const { project, config } = await contextFor(request)
  const text = await feedbackText(request)
  const idempotencyKey = option(request, "idempotencyKey") || sha256(text).slice(0, 24)
  const dryRun = Boolean(option(request, "dryRun", false))
  const result = await publishFeedback(project, config, text, idempotencyKey, dryRun)
  if (!dryRun && result.status === "published") {
    try {
      await setPaused(project, config, false, "feedback-published", false)
      const lease = await inspectLease(project)
      if (lease.state !== "busy") await runTaskControl("run", project, config, false)
    } catch (error) {
      throw partial("FEEDBACK_PUBLISHED_SCHEDULER_FAILED", "Feedback reached the integration branch, but the scheduled loop could not be resumed.", [{ command: "pgl-opencode doctor --json", reason: "Repair the Scheduled Task; do not republish the same feedback." }, { command: "pgl-opencode resume", reason: "Retry only the scheduler transition." }], { feedback: result, cause: error.message, causeCode: error.code })
    }
  }
  return success(result.status, result, { sideEffects: dryRun || result.status === "duplicate" ? "none" : "complete", nextActions: dryRun ? [{ command: `pgl-opencode feedback --idempotency-key ${idempotencyKey} --stdin`, reason: "Publish the previewed feedback." }] : [] })
}

async function managerCommand(request) {
  const { project, config } = await contextFor(request)
  const dryRun = Boolean(option(request, "dryRun", false))
  await inspectOpenCode(project, config)
  const server = await requireServer(project, config)
  const manager = dryRun ? await managerRecord(project) : await ensureManagerSession(project, config, server)
  if (!manager?.sessionId && dryRun) return success("planned", { action: "create-and-open-manager-session", backend: server.url })
  const opened = await openTui(project, server, { directory: project.root, sessionId: manager.sessionId }, dryRun)
  return success(opened.status, { manager, tui: opened }, { sideEffects: dryRun ? "none" : "complete" })
}

async function openWorkerCommand(request) {
  const { project, config } = await contextFor(request)
  const dryRun = Boolean(option(request, "dryRun", false))
  const execution = await currentExecution(project)
  const sessionId = execution?.sessionId ?? execution?.sessions?.at(-1)?.id
  if (!execution || !sessionId) throw blocked("NO_WORKER_SESSION", "No active or preserved worker session is available.", [{ command: "pgl-opencode status", reason: "Inspect loop state." }])
  const server = await requireServer(project, config)
  const opened = await openTui(project, server, { directory: execution.worktree, sessionId }, dryRun)
  return success(opened.status, { executionId: execution.id, sessionId, tui: opened }, { sideEffects: dryRun ? "none" : "complete" })
}

async function pauseCommand(request) {
  const { project, config } = await contextFor(request)
  const state = await setPaused(project, config, true, option(request, "reason", "human-request"), Boolean(option(request, "dryRun", false)))
  return success(state.paused ? "paused" : "planned", state, { sideEffects: option(request, "dryRun", false) ? "none" : "complete", nextActions: [{ command: "pgl-opencode resume", reason: "Allow future ticks again." }] })
}

async function resumeCommand(request) {
  const { project, config } = await contextFor(request)
  const dryRun = Boolean(option(request, "dryRun", false))
  const execution = await currentExecution(project)
  let acknowledgedUserMessages = execution?.acknowledgedUserMessages ?? {}
  if (!dryRun && execution?.sessions?.length) {
    const server = await requireServer(project, config)
    acknowledgedUserMessages = { ...acknowledgedUserMessages }
    for (const session of execution.sessions) {
      const priorOutcome = execution.sessionOutcomes?.find((outcome) => outcome.sessionId === session.id)
      if (priorOutcome?.deleted) continue
      const activity = await getSessionActivity(server, session.id, execution.worktree).catch(() => null)
      if (activity) acknowledgedUserMessages[session.id] = activity.userMessages
    }
    execution.acknowledgedUserMessages = acknowledgedUserMessages
    execution.humanInteractionAcknowledgedAtUtc = nowIso()
    if (execution.status !== "published_cleanup_pending") execution.status = "recovering"
    execution.blocker = null
    await recordExecution(project, execution)
  }
  const state = await setPaused(project, config, false, "human-request", dryRun)
  if (!dryRun) await writeJsonAtomic(path.join(project.runtimeDir, "resume-once.json"), { requestedAtUtc: nowIso(), reason: "human-request" })
  if (!dryRun && option(request, "runNow", false)) await runTaskControl("run", project, config, false)
  return success(dryRun ? "planned" : "running", { ...state, runNow: Boolean(option(request, "runNow", false)), acknowledgedUserMessages }, { sideEffects: dryRun ? "none" : "complete" })
}

async function runNowCommand(request) {
  const { project, config } = await contextFor(request)
  const dryRun = Boolean(option(request, "dryRun", false))
  const pause = await readPause(project)
  if (pause.paused) return success("paused", { reason: pause.reason }, { nextActions: [{ command: "pgl-opencode resume", reason: "Enable scheduled ticks before requesting an immediate run." }] })
  const lease = await inspectLease(project)
  if (lease.state === "busy") return success("busy", { ownerPid: lease.lease?.ownerPid, executionId: lease.lease?.executionId }, { nextActions: [{ command: "pgl-opencode open-worker", reason: "Observe the current worker." }] })
  const result = await runTaskControl("run", project, config, dryRun)
  return success(dryRun ? "planned" : "queued", { scheduledTask: result }, { sideEffects: dryRun ? "none" : "complete" })
}

async function abortCommand(request) {
  const { project, config } = await contextFor(request)
  const dryRun = Boolean(option(request, "dryRun", false))
  if (!dryRun && !option(request, "yes", false)) throw new RuntimeError("CONFIRMATION_REQUIRED", "abort terminates the recorded OpenCode worker; pass --yes after reviewing --dry-run.", { exitCode: EXIT.USAGE, nextActions: [{ command: "pgl-opencode abort --dry-run", reason: "Preview the exact execution and process." }] })
  const execution = await currentExecution(project)
  if (!execution) return success("idle", { aborted: false })
  const requested = option(request, "executionId")
  if (requested && requested !== execution.id) throw blocked("EXECUTION_MISMATCH", "The requested execution is not current; refusing to terminate another process.", [{ command: "pgl-opencode status", reason: "Read the current execution ID." }], { requested, current: execution.id })
  if (dryRun) return success("planned", { executionId: execution.id, sessionId: execution.sessionId, childPid: execution.childPid, candidatePreserved: true })
  const server = await requireServer(project, config)
  const session = execution.sessionId ? await abortSession(project, server, execution.sessionId, execution.worktree).catch((error) => ({ aborted: false, warning: error.message })) : { aborted: false, reason: "no-session" }
  const lease = await inspectLease(project)
  const ownershipMatched = lease.state === "busy" && lease.lease?.executionId === execution.id && lease.lease?.token === execution.leaseToken
  const processMatched = ownershipMatched && await processIdentityMatches(execution.childIdentity)
  if (processMatched) process.kill(execution.childPid, "SIGTERM")
  execution.status = "recoverable_failure"
  execution.blocker = { code: "HUMAN_ABORT", atUtc: nowIso() }
  await recordExecution(project, execution)
  return success("aborted", { executionId: execution.id, session, ownershipMatched, processIdentityMatched: processMatched, processTerminated: !isPidAlive(execution.childPid), candidatePreserved: true }, { sideEffects: "partial", retryable: true, nextActions: [{ command: "pgl-opencode run-now", reason: "Resume the preserved candidate in a fresh session." }] })
}

async function uninstallCommand(request) {
  const { project, config } = await contextFor(request)
  const dryRun = Boolean(option(request, "dryRun", false))
  if (!dryRun && !option(request, "yes", false)) throw new RuntimeError("CONFIRMATION_REQUIRED", "uninstall stops the backend and removes Scheduled Tasks; pass --yes after reviewing --dry-run.", { exitCode: EXIT.USAGE, nextActions: [{ command: "pgl-opencode uninstall --dry-run", reason: "Preview the exact processes and task names." }] })
  const server = await readServer(project)
  const taskResult = await runTaskControl("remove", project, config, dryRun)
  const backendMatched = !dryRun && server?.processIdentity ? await processIdentityMatches(server.processIdentity) : false
  if (backendMatched) process.kill(server.pid, "SIGTERM")
  if (!dryRun) {
    await rm(path.join(project.runtimeDir, "server.json"), { force: true })
    await rm(path.join(project.runtimeDir, "server-credentials.json"), { force: true })
  }
  return success(dryRun ? "planned" : "uninstalled", { scheduledTasks: taskResult, backendPid: server?.pid ?? null, backendIdentityMatched: backendMatched, preserved: [path.join(project.runtimeDir, "executions"), path.join(project.runtimeDir, "evidence")] }, { sideEffects: dryRun ? "none" : "complete" })
}

async function backendCommand(request) {
  const { project, config } = await contextFor(request)
  const result = await runBackend(project, config, { dryRun: Boolean(option(request, "dryRun", false)) })
  return success(result.status, result, { sideEffects: option(request, "dryRun", false) ? "none" : "complete" })
}

export async function runCommand(request) {
  switch (request.command) {
    case "setup": return setupCommand(request)
    case "backend": return backendCommand(request)
    case "manager": return managerCommand(request)
    case "tick": return tickCommand(request)
    case "status": return statusCommand(request)
    case "open-worker": return openWorkerCommand(request)
    case "pause": return pauseCommand(request)
    case "resume": return resumeCommand(request)
    case "run-now": return runNowCommand(request)
    case "abort": return abortCommand(request)
    case "doctor": return doctorCommand(request)
    case "feedback": return feedbackCommand(request)
    case "uninstall": return uninstallCommand(request)
    default:
      throw new RuntimeError("UNKNOWN_COMMAND", `Runtime does not implement command ${request.command}`, { exitCode: EXIT.USAGE })
  }
}

export const executeCommand = runCommand
