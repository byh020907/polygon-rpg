import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { prerequisite, blocked, conflict, partial, RuntimeError, EXIT } from "./errors.mjs"
import { exists, localDataRoot, nowIso, readJson, runChecked, sha256, shortId, writeJsonAtomic, removeOwnedPath } from "./system.mjs"

export const DEFAULT_CONFIG = Object.freeze({
  schemaVersion: 1,
  remote: "origin",
  branch: "main",
  scheduleMinutes: 10,
  staleLeaseMinutes: 120,
  minimumOpenCodeVersion: "1.18.18",
  autoPush: true,
  agents: {
    manager: "product-goal-loop-manager",
    worker: "product-goal-loop-worker",
    verifier: "product-goal-loop-verifier",
    reconciliation: "product-goal-loop-reconciliation",
  },
  models: {
    worker: null,
    verifier: null,
    reconciliation: null,
  },
  server: { hostname: "127.0.0.1", port: 0, username: "opencode" },
  sessionRetention: { sanitizeExports: true, retainFinalCompletion: true, retainHumanInteracted: true },
})

export async function git(repo, args, options = {}) {
  return runChecked("git", ["-C", repo, ...args], {
    cwd: repo,
    errorCode: options.errorCode ?? "GIT_FAILED",
    exitCode: options.exitCode ?? EXIT.PREREQUISITE,
    retryable: options.retryable,
    sideEffects: options.sideEffects,
    nextActions: options.nextActions,
    env: {
      ...process.env,
      GIT_TERMINAL_PROMPT: "0",
      GCM_INTERACTIVE: "Never",
      ...options.env,
    },
    input: options.input,
    timeoutMs: options.timeoutMs ?? 120_000,
  })
}

export async function resolveProject(repoOption) {
  const requested = path.resolve(repoOption || process.cwd())
  const rootResult = await git(requested, ["rev-parse", "--show-toplevel"], {
    errorCode: "NOT_A_GIT_REPOSITORY",
  })
  const root = path.resolve(rootResult.stdout.trim())
  const commonResult = await git(root, ["rev-parse", "--git-common-dir"])
  const commonRaw = commonResult.stdout.trim()
  const gitCommonDir = path.resolve(root, commonRaw)
  const identityResult = await git(root, ["config", "--get", "remote.origin.url"]).catch(() => ({ stdout: root }))
  const repoKey = sha256(`${path.normalize(root).toLowerCase()}\n${identityResult.stdout.trim()}`).slice(0, 16)
  const runtimeDir = path.join(gitCommonDir, "product-goal-loop", "opencode")
  const worktreeRoot = path.join(localDataRoot(), repoKey, "worktrees")
  return { root, gitCommonDir, repoKey, runtimeDir, worktreeRoot }
}

function deepMerge(base, value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value === undefined ? base : value
  const merged = { ...(base && typeof base === "object" ? base : {}) }
  for (const [key, child] of Object.entries(value)) merged[key] = deepMerge(merged[key], child)
  return merged
}

export async function loadConfig(project) {
  const target = path.join(project.root, ".ai", "runtime", "opencode-loop", "config.json")
  const user = await readJson(target, {})
  const config = deepMerge(DEFAULT_CONFIG, user)
  validateConfig(config, target)
  return { config, path: target }
}

export function validateConfig(config, target = "config.json") {
  if (config.schemaVersion !== 1) throw prerequisite("UNSUPPORTED_CONFIG", `Unsupported config schema in ${target}`, "pgl-opencode setup --dry-run")
  if (!config.remote || !config.branch) throw prerequisite("INVALID_CONFIG", "remote and branch are required", "pgl-opencode setup --dry-run")
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(config.remote)) throw prerequisite("INVALID_CONFIG", "remote must be a Git remote name without option-like or control characters", "pgl-opencode setup --dry-run")
  if (config.branch.startsWith("-") || config.branch.startsWith("/") || config.branch.endsWith("/") || config.branch === "@" || config.branch.includes("@{") || /[\x00-\x20~^:?*\[\\]/.test(config.branch) || config.branch.includes("..") || config.branch.endsWith(".") || config.branch.endsWith(".lock") || config.branch.includes("//")) {
    throw prerequisite("INVALID_CONFIG", "branch must be a safe Git branch name", "pgl-opencode setup --dry-run")
  }
  if (!Number.isInteger(config.scheduleMinutes) || config.scheduleMinutes < 1) throw prerequisite("INVALID_CONFIG", "scheduleMinutes must be a positive integer", "pgl-opencode setup --dry-run")
  if (!Number.isInteger(config.staleLeaseMinutes) || config.staleLeaseMinutes < 1) throw prerequisite("INVALID_CONFIG", "staleLeaseMinutes must be a positive integer", "pgl-opencode setup --dry-run")
  if (typeof config.autoPush !== "boolean") throw prerequisite("INVALID_CONFIG", "autoPush must be boolean", "pgl-opencode setup --dry-run")
  if (!/^\d+\.\d+\.\d+$/.test(config.minimumOpenCodeVersion)) throw prerequisite("INVALID_CONFIG", "minimumOpenCodeVersion must be an x.y.z version", "pgl-opencode setup --dry-run")
  for (const [role, name] of Object.entries(config.agents ?? {})) {
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(name)) throw prerequisite("INVALID_CONFIG", `agents.${role} must be a safe OpenCode agent name`, "pgl-opencode setup --dry-run")
  }
  for (const [role, model] of Object.entries(config.models ?? {})) {
    if (model !== null && (typeof model !== "string" || !model.trim() || /[\x00-\x1f]/.test(model))) throw prerequisite("INVALID_CONFIG", `models.${role} must be null or a provider/model string`, "pgl-opencode setup --dry-run")
  }
  if (config.server.hostname !== "127.0.0.1" && config.server.hostname !== "localhost") {
    throw prerequisite("UNSAFE_SERVER_HOST", "OpenCode backend must bind to localhost", "pgl-opencode setup --dry-run", { hostname: config.server.hostname })
  }
  if (!Number.isInteger(config.server.port) || config.server.port < 0 || config.server.port > 65535) throw prerequisite("INVALID_CONFIG", "server.port must be an integer from 0 to 65535", "pgl-opencode setup --dry-run")
  if (!/^[A-Za-z0-9._-]+$/.test(config.server.username)) throw prerequisite("INVALID_CONFIG", "server.username must be a safe HTTP Basic username", "pgl-opencode setup --dry-run")
}

export async function saveConfig(project, config, dryRun) {
  const target = path.join(project.root, ".ai", "runtime", "opencode-loop", "config.json")
  validateConfig(config, target)
  if (!dryRun) await writeJsonAtomic(target, config)
  return target
}

export async function ensureRemote(project, config, fetch = true) {
  const remoteResult = await git(project.root, ["remote", "get-url", config.remote], {
    errorCode: "REMOTE_NOT_FOUND",
    nextActions: [{ command: `git remote add ${config.remote} <url>`, reason: "Configure the integration remote." }],
  })
  if (fetch) {
    await git(project.root, ["fetch", "--prune", config.remote, config.branch], {
      errorCode: "REMOTE_FETCH_FAILED",
      exitCode: EXIT.BLOCKED,
      retryable: true,
      nextActions: [{ command: "pgl-opencode doctor", reason: "Check network credentials and remote access." }],
    })
  }
  await git(project.root, ["rev-parse", "--verify", `${config.remote}/${config.branch}^{commit}`], {
    errorCode: "INTEGRATION_BRANCH_NOT_FOUND",
  })
  return remoteResult.stdout.trim()
}

export async function readRemoteFile(project, config, relativePath) {
  try {
    const result = await git(project.root, ["show", `${config.remote}/${config.branch}:${relativePath.replaceAll("\\", "/")}`])
    return result.stdout
  } catch (error) {
    throw prerequisite("PROJECT_SOURCE_MISSING", `${relativePath} is missing on ${config.remote}/${config.branch}`, "pgl-opencode doctor", { relativePath })
  }
}

export function parseRuntimeStatus(markdown) {
  const section = markdown.match(/## Runtime Status\s+([\s\S]*?)(?=\n## |$)/i)?.[1] ?? ""
  const value = section.match(/`?([A-Z][A-Z_]+)`?/i)?.[1]?.toUpperCase()
  return value ?? "UNKNOWN"
}

export function hasPendingFeedback(markdown) {
  const section = markdown.match(/## Pending\s+([\s\S]*?)(?=\n## |$)/i)?.[1] ?? ""
  const meaningful = section
    .replace(/<!--[\s\S]*?-->/g, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  return meaningful.some((line) => /^[-*+]\s+/.test(line))
}

export function activeExecutionGoal(markdown) {
  const section = markdown.match(/## Active Execution Goal\s+([\s\S]*?)(?=\n## |$)/i)?.[1] ?? ""
  const normalized = section.replace(/<!--[\s\S]*?-->/g, "").trim()
  if (!normalized || /^(없음|none)(?:[.。]|$)/i.test(normalized)) return null
  return normalized
}

export async function createCandidate(project, config, executionId) {
  await mkdir(project.worktreeRoot, { recursive: true })
  const branch = `opencode/product-goal-loop/${executionId}`
  const worktree = path.join(project.worktreeRoot, executionId)
  if (await exists(worktree)) throw partial("CANDIDATE_PATH_EXISTS", "Candidate worktree path already exists.", [{ command: "pgl-opencode status", reason: "Inspect the preserved execution before retrying." }], { worktree, branch })
  await git(project.root, ["worktree", "add", "-b", branch, worktree, `${config.remote}/${config.branch}`], {
    errorCode: "WORKTREE_CREATE_FAILED",
    exitCode: EXIT.PARTIAL,
    sideEffects: "partial",
  })
  return { branch, worktree }
}

export async function isWorktreeClean(worktree) {
  const result = await git(worktree, ["status", "--porcelain=v1", "--untracked-files=all"])
  return { clean: result.stdout.trim() === "", status: result.stdout.trim().split(/\r?\n/).filter(Boolean) }
}

export async function reconcileAndPush(project, config, execution, options = {}) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    await ensureRemote(project, config, true)
    const latest = (await git(project.root, ["rev-parse", `${config.remote}/${config.branch}`])).stdout.trim()
    const ancestor = await runChecked("git", ["-C", execution.worktree, "merge-base", "--is-ancestor", latest, "HEAD"], {
      exitCode: EXIT.CONFLICT,
      errorCode: "REMOTE_DIVERGED",
      retryable: true,
      timeoutMs: 60_000,
      nextActions: [{ command: "pgl-opencode status", reason: "Inspect the candidate before reconciliation." }],
    }).then(() => true).catch(() => false)
    if (!ancestor) {
      await git(execution.worktree, ["merge", "--no-edit", `${config.remote}/${config.branch}`], {
        errorCode: "RECONCILIATION_CONFLICT",
        exitCode: EXIT.CONFLICT,
        retryable: true,
        sideEffects: "partial",
        nextActions: [{ command: "pgl-opencode status", reason: "Resolve the preserved candidate in a fresh reconciliation session." }],
      })
      await options.reverify?.({ attempt, latest })
    }
    await options.beforePush?.({ attempt, latest })
    const cleanliness = await isWorktreeClean(execution.worktree)
    if (!cleanliness.clean) throw partial("DIRTY_CANDIDATE", "Candidate must be committed before publication.", [{ command: "pgl-opencode status", reason: "Inspect and resume the preserved candidate." }], { worktree: execution.worktree, status: cleanliness.status })
    if (!config.autoPush) return { pushed: false, attempt, latest }
    const push = await git(execution.worktree, ["push", config.remote, `HEAD:refs/heads/${config.branch}`], {
      errorCode: "PUSH_FAILED",
      exitCode: EXIT.BLOCKED,
      retryable: false,
      sideEffects: "none",
    }).catch((error) => ({ error }))
    if (!push.error) return { pushed: true, attempt, latest, commit: (await git(execution.worktree, ["rev-parse", "HEAD"])).stdout.trim() }
    await ensureRemote(project, config, true)
    const afterFailure = (await git(project.root, ["rev-parse", `${config.remote}/${config.branch}`])).stdout.trim()
    if (afterFailure === latest) {
      throw blocked("PUSH_REJECTED", `Push to ${config.remote}/${config.branch} was rejected without a concurrent remote advance.`, [{ command: "pgl-opencode doctor --json", reason: "Check credentials, branch protection and remote hooks." }, { command: "pgl-opencode status --json", reason: "Inspect the preserved verified candidate." }], { branch: execution.branch, worktree: execution.worktree, remoteTip: latest, pushError: push.error.details ?? push.error.message })
    }
    if (attempt === 3) throw conflict("PUSH_RACE", `${config.remote}/${config.branch} advanced repeatedly during publication.`, [{ command: "pgl-opencode run-now", reason: "Retry reconciliation with the preserved candidate." }], { branch: execution.branch, worktree: execution.worktree })
  }
  throw conflict("PUSH_RACE", `Could not publish candidate to ${config.remote}/${config.branch}.`)
}

export async function cleanupCandidate(project, execution, expectedCommit) {
  const worktree = path.resolve(execution.worktree)
  const allowedRoot = path.resolve(project.worktreeRoot)
  if (!worktree.startsWith(`${allowedRoot}${path.sep}`)) throw partial("UNSAFE_WORKTREE_CLEANUP", "Candidate worktree is outside the managed root.", [], { worktree, allowedRoot })
  if (!(await exists(worktree))) {
    const ref = await runChecked("git", ["-C", project.root, "rev-parse", "--verify", `refs/heads/${execution.branch}`], {
      errorCode: "CANDIDATE_REF_MISSING",
      exitCode: EXIT.PARTIAL,
      timeoutMs: 60_000,
    }).then((result) => result.stdout.trim()).catch(() => null)
    if (!ref) return { worktreeRemoved: true, refRemoved: true, alreadyClean: true }
    if (expectedCommit && ref !== expectedCommit) throw partial("CANDIDATE_REF_CHANGED", "Candidate worktree is gone but its branch ref no longer matches the published commit; ref deletion was refused.", [{ command: `git show-ref --verify refs/heads/${execution.branch}`, reason: "Inspect the changed ref before any manual cleanup." }], { branch: execution.branch, expectedCommit, actualCommit: ref })
    await git(project.root, ["update-ref", "-d", `refs/heads/${execution.branch}`, ref], {
      errorCode: "CANDIDATE_REF_CLEANUP_FAILED",
      exitCode: EXIT.PARTIAL,
      sideEffects: "none",
    })
    return { worktreeRemoved: true, refRemoved: true, recovered: true }
  }
  const cleanliness = await isWorktreeClean(worktree)
  const head = (await git(worktree, ["rev-parse", "HEAD"])).stdout.trim()
  if (!cleanliness.clean || (expectedCommit && head !== expectedCommit)) {
    throw partial("CANDIDATE_CHANGED_BEFORE_CLEANUP", "Candidate changed after publication; cleanup was refused and all files were preserved.", [{ command: "pgl-opencode status --json", reason: "Inspect the preserved candidate and any Human interaction." }], { worktree, expectedCommit, actualCommit: head, status: cleanliness.status })
  }
  try {
    await git(project.root, ["worktree", "remove", worktree], {
      errorCode: "WORKTREE_CLEANUP_FAILED",
      exitCode: EXIT.PARTIAL,
      sideEffects: "none",
    })
  } catch (error) {
    throw partial("WORKTREE_CLEANUP_FAILED", "Git refused to remove the candidate worktree; no force removal was attempted.", [{ command: "pgl-opencode status --json", reason: "Inspect locks or Human changes before retrying cleanup." }], { worktree, branch: execution.branch, cause: error.message })
  }
  await git(project.root, ["update-ref", "-d", `refs/heads/${execution.branch}`, head], {
    errorCode: "CANDIDATE_REF_CLEANUP_FAILED",
    exitCode: EXIT.PARTIAL,
    sideEffects: "partial",
  }).catch((error) => {
    throw partial("CANDIDATE_REF_CLEANUP_FAILED", "The worktree was removed but the owned candidate ref could not be deleted safely.", [{ command: `git show-ref --verify refs/heads/${execution.branch}`, reason: "Inspect the remaining adapter-owned branch ref." }], { branch: execution.branch, expectedCommit: head, cause: error.message })
  })
  return { worktreeRemoved: true, refRemoved: true }
}

export function appendFeedback(markdown, text, idempotencyKey) {
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(idempotencyKey)) {
    throw new RuntimeError("INVALID_IDEMPOTENCY_KEY", "Feedback idempotency key must be 1-128 safe ASCII identifier characters.", { exitCode: EXIT.USAGE })
  }
  if (text.includes("\0")) throw new RuntimeError("INVALID_FEEDBACK", "Feedback cannot contain a NUL character.", { exitCode: EXIT.USAGE })
  const marker = `<!-- pgl-feedback-id:${idempotencyKey} -->`
  if (markdown.includes(marker)) return { markdown, added: false }
  const heading = /(^|\n)## Pending\s*\r?\n/i
  const match = heading.exec(markdown)
  if (!match) throw prerequisite("INBOX_FORMAT_UNSUPPORTED", "INBOX.md does not contain a ## Pending section.", "pgl-opencode doctor")
  const lines = text.replaceAll("\r\n", "\n").trim().split("\n")
  if (!lines[0]) throw new RuntimeError("EMPTY_FEEDBACK", "Feedback text is empty.", { exitCode: EXIT.USAGE })
  const item = [`- ${lines[0]}`, ...lines.slice(1).map((line) => `    ${line}`), `  ${marker}`, ""].join("\n")
  const insertAt = match.index + match[0].length
  return { markdown: `${markdown.slice(0, insertAt)}\n${item}${markdown.slice(insertAt)}`, added: true }
}

export async function publishFeedback(project, config, text, idempotencyKey, dryRun = false) {
  const ledgerPath = path.join(project.runtimeDir, "feedback", `${sha256(idempotencyKey)}.json`)
  const ledger = await readJson(ledgerPath, null)
  if (ledger?.status === "published") return { status: "duplicate", idempotencyKey, pushed: false }
  if (ledger?.status === "pending" && typeof ledger.text === "string") text = ledger.text
  if (!dryRun && !ledger) await writeJsonAtomic(ledgerPath, { schemaVersion: 1, idempotencyKey, status: "pending", text, recordedAtUtc: nowIso() })
  await ensureRemote(project, config, !dryRun)
  const remoteInbox = await readRemoteFile(project, config, "INBOX.md")
  const preview = appendFeedback(remoteInbox, text, idempotencyKey)
  if (!preview.added) {
    if (!dryRun) await writeJsonAtomic(ledgerPath, { schemaVersion: 1, idempotencyKey, status: "published", recoveredFromRemoteMarker: true, recordedAtUtc: nowIso() })
    return { status: "duplicate", idempotencyKey, pushed: false }
  }
  if (dryRun) return { status: "planned", idempotencyKey, remote: config.remote, branch: config.branch, changedPaths: ["INBOX.md"] }

  await mkdir(project.worktreeRoot, { recursive: true })
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    await ensureRemote(project, config, true)
    const executionId = `feedback-${shortId()}`
    const worktree = path.join(project.worktreeRoot, executionId)
    try {
      await git(project.root, ["worktree", "add", "--detach", worktree, `${config.remote}/${config.branch}`], {
        errorCode: "FEEDBACK_WORKTREE_FAILED",
        exitCode: EXIT.PARTIAL,
        sideEffects: "partial",
      })
      const inboxPath = path.join(worktree, "INBOX.md")
      const current = await readFile(inboxPath, "utf8")
      const changed = appendFeedback(current, text, idempotencyKey)
      if (!changed.added) {
        await writeJsonAtomic(ledgerPath, { schemaVersion: 1, idempotencyKey, status: "published", recoveredFromRemoteMarker: true, recordedAtUtc: nowIso() })
        return { status: "duplicate", idempotencyKey, pushed: false }
      }
      await writeFile(inboxPath, changed.markdown, "utf8")
      await git(worktree, ["add", "--", "INBOX.md"])
      const staged = (await git(worktree, ["diff", "--cached", "--name-only"])).stdout.trim().split(/\r?\n/).filter(Boolean)
      if (staged.length !== 1 || staged[0] !== "INBOX.md") throw partial("FEEDBACK_SCOPE_VIOLATION", "Feedback publication staged files other than INBOX.md.", [], { staged, worktree })
      await git(worktree, ["diff", "--cached", "--check"])
      await git(worktree, ["commit", "-m", `feedback: INBOX 요청 등록 (${idempotencyKey.slice(0, 12)})`])
      await ensureRemote(project, config, true)
      const parent = (await git(worktree, ["rev-parse", "HEAD^"])).stdout.trim()
      const latest = (await git(project.root, ["rev-parse", `${config.remote}/${config.branch}`])).stdout.trim()
      if (parent !== latest) continue
      const push = await git(worktree, ["push", config.remote, `HEAD:refs/heads/${config.branch}`], {
        errorCode: "FEEDBACK_PUSH_FAILED",
        exitCode: EXIT.BLOCKED,
        retryable: false,
      }).then((value) => ({ value })).catch((error) => ({ error }))
      if (!push.error) {
        const commit = (await git(worktree, ["rev-parse", "HEAD"])).stdout.trim()
        await writeJsonAtomic(ledgerPath, { schemaVersion: 1, idempotencyKey, status: "published", commit, recordedAtUtc: nowIso() })
        return { status: "published", idempotencyKey, pushed: true, attempt, commit }
      }
      await ensureRemote(project, config, true)
      const afterFailure = (await git(project.root, ["rev-parse", `${config.remote}/${config.branch}`])).stdout.trim()
      if (afterFailure === latest) {
        throw blocked("FEEDBACK_PUSH_REJECTED", `Feedback push to ${config.remote}/${config.branch} was rejected without a concurrent remote advance.`, [{ command: "pgl-opencode doctor --json", reason: "Check credentials, branch protection and remote hooks; the Human wording remains in the preserved operation context." }, { command: `pgl-opencode feedback --idempotency-key ${idempotencyKey} --stdin`, reason: "Retry with the same key after repairing the remote." }], { idempotencyKey, remoteTip: latest, pushError: push.error.details ?? push.error.message })
      }
    } finally {
      if (await exists(worktree)) {
        await git(project.root, ["worktree", "remove", "--force", worktree]).catch(async () => {
          await removeOwnedPath(worktree, project.worktreeRoot)
          await git(project.root, ["worktree", "prune"]).catch(() => {})
        })
      }
    }
  }
  throw conflict("FEEDBACK_PUSH_RACE", `${config.remote}/${config.branch} advanced repeatedly while publishing feedback.`, [{ command: `pgl-opencode feedback --idempotency-key ${idempotencyKey} --stdin`, reason: "Retry safely with the same idempotency key." }])
}

export async function recordExecution(project, execution) {
  const target = path.join(project.runtimeDir, "executions", `${execution.id}.json`)
  await writeJsonAtomic(target, execution)
  await writeJsonAtomic(path.join(project.runtimeDir, "current.json"), { executionId: execution.id })
  return target
}

export async function currentExecution(project) {
  const pointer = await readJson(path.join(project.runtimeDir, "current.json"), null)
  if (!pointer?.executionId) return null
  return readJson(path.join(project.runtimeDir, "executions", `${pointer.executionId}.json`), null)
}

export async function clearCurrentExecution(project, execution) {
  const pointer = await readJson(path.join(project.runtimeDir, "current.json"), null)
  if (pointer?.executionId === execution.id) await writeJsonAtomic(path.join(project.runtimeDir, "current.json"), { executionId: null, clearedAtUtc: nowIso() })
}
