import { spawn } from "node:child_process"
import { createHash, randomBytes, randomUUID } from "node:crypto"
import { constants as fsConstants } from "node:fs"
import { access, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { RuntimeError, EXIT } from "./errors.mjs"

export const isWindows = process.platform === "win32"

export function nowIso() {
  return new Date().toISOString()
}

export function shortId() {
  return randomUUID().replaceAll("-", "").slice(0, 12)
}

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex")
}

export function secret() {
  return randomBytes(32).toString("base64url")
}

export async function exists(target) {
  try {
    await access(target, fsConstants.F_OK)
    return true
  } catch {
    return false
  }
}

export async function readJson(target, fallback = null) {
  try {
    return JSON.parse(await readFile(target, "utf8"))
  } catch (error) {
    if (error?.code === "ENOENT") return fallback
    throw new RuntimeError("INVALID_JSON", `Invalid JSON at ${target}`, {
      exitCode: EXIT.PREREQUISITE,
      cause: error,
      details: { path: target },
    })
  }
}

export async function writeJsonAtomic(target, value) {
  await mkdir(path.dirname(target), { recursive: true })
  const temporary = `${target}.${process.pid}.${shortId()}.tmp`
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8")
  await rename(temporary, target)
}

export async function removeOwnedPath(target, allowedRoot, options = {}) {
  const resolvedTarget = path.resolve(target)
  const resolvedRoot = `${path.resolve(allowedRoot)}${path.sep}`
  if (!resolvedTarget.startsWith(resolvedRoot) || resolvedTarget === path.resolve(allowedRoot)) {
    throw new RuntimeError("UNSAFE_DELETE_TARGET", `Refusing to remove path outside the managed root: ${resolvedTarget}`, {
      exitCode: EXIT.PARTIAL,
      details: { target: resolvedTarget, allowedRoot: path.resolve(allowedRoot) },
    })
  }
  await rm(resolvedTarget, { recursive: options.recursive ?? true, force: options.force ?? true })
}

export function localDataRoot() {
  if (process.env.PGL_OPENCODE_DATA_DIR) return path.resolve(process.env.PGL_OPENCODE_DATA_DIR)
  if (isWindows && process.env.LOCALAPPDATA) return path.join(process.env.LOCALAPPDATA, "ProductGoalLoop", "OpenCode")
  return path.join(os.homedir(), ".local", "share", "product-goal-loop", "opencode")
}

export function isPidAlive(pid) {
  if (!Number.isInteger(Number(pid)) || Number(pid) <= 0) return false
  try {
    process.kill(Number(pid), 0)
    return true
  } catch (error) {
    return error?.code === "EPERM"
  }
}

export async function getProcessIdentity(pid) {
  const numericPid = Number(pid)
  if (!Number.isInteger(numericPid) || numericPid <= 0 || !isPidAlive(numericPid)) return null
  if (isWindows) {
    const command = `$p=Get-Process -Id ${numericPid} -ErrorAction Stop; [pscustomobject]@{pid=$p.Id;executable=$p.Path;startedAtUtc=$p.StartTime.ToUniversalTime().ToString('o')} | ConvertTo-Json -Compress`
    const result = await runProcess(process.env.PGL_OPENCODE_POWERSHELL || "powershell.exe", ["-NoProfile", "-Command", command], { windowsHide: true, timeoutMs: 10_000 })
    if (result.code !== 0 || !result.stdout.trim()) return null
    try {
      const value = JSON.parse(result.stdout)
      return { pid: Number(value.pid), executable: path.resolve(value.executable), startedAtUtc: value.startedAtUtc }
    } catch {
      return null
    }
  }
  try {
    const executable = await import("node:fs/promises").then(({ readlink }) => readlink(`/proc/${numericPid}/exe`))
    return { pid: numericPid, executable: path.resolve(executable), startedAtUtc: null }
  } catch {
    return null
  }
}

export async function processIdentityMatches(expected) {
  if (!expected?.pid || !expected?.executable) return false
  const actual = await getProcessIdentity(expected.pid)
  if (!actual) return false
  const sameExecutable = path.resolve(actual.executable).toLowerCase() === path.resolve(expected.executable).toLowerCase()
  if (!sameExecutable) return false
  if (!expected.startedAtUtc || !actual.startedAtUtc) return !isWindows
  const delta = Math.abs(Date.parse(actual.startedAtUtc) - Date.parse(expected.startedAtUtc))
  return Number.isFinite(delta) && delta <= 2_000
}

export function runProcess(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env ?? process.env,
      windowsHide: options.windowsHide ?? true,
      shell: false,
      stdio: [options.input === undefined ? "ignore" : "pipe", "pipe", "pipe"],
    })
    let stdout = ""
    let stderr = ""
    let timedOut = false
    const timeout = options.timeoutMs
      ? setTimeout(() => {
          timedOut = true
          child.kill("SIGTERM")
        }, options.timeoutMs)
      : null

    child.stdout.setEncoding("utf8")
    child.stderr.setEncoding("utf8")
    child.stdout.on("data", (chunk) => {
      stdout += chunk
      options.onStdout?.(chunk, child)
    })
    child.stderr.on("data", (chunk) => {
      stderr += chunk
      options.onStderr?.(chunk, child)
    })
    child.on("error", (error) => {
      if (timeout) clearTimeout(timeout)
      reject(new RuntimeError("PROCESS_START_FAILED", `Failed to start ${command}: ${error.message}`, {
        exitCode: EXIT.PREREQUISITE,
        cause: error,
        details: { command, args },
      }))
    })
    child.on("close", (code, signal) => {
      if (timeout) clearTimeout(timeout)
      resolve({ command, args, code: code ?? (timedOut ? 124 : 1), signal, stdout, stderr, timedOut, pid: child.pid })
    })
    Promise.resolve(options.onSpawn?.(child)).then(() => {
      if (options.input !== undefined && !child.stdin.destroyed) child.stdin.end(options.input)
    }).catch((error) => {
      child.kill("SIGTERM")
      reject(new RuntimeError("PROCESS_PREFLIGHT_FAILED", `Pre-execution process recording failed for ${command}: ${error.message}`, {
        exitCode: EXIT.PARTIAL,
        cause: error,
        sideEffects: "partial",
        details: { command, args, pid: child.pid },
      }))
    })
  })
}

export async function runChecked(command, args = [], options = {}) {
  const result = await runProcess(command, args, options)
  if (result.code !== 0) {
    const timedOut = result.timedOut === true
    throw new RuntimeError(options.errorCode ?? "COMMAND_FAILED", timedOut && options.timeoutMs ? `${command} timed out after ${options.timeoutMs}ms (exit code ${result.code})` : `${command} exited with code ${result.code}`, {
      exitCode: options.exitCode ?? EXIT.PREREQUISITE,
      retryable: options.retryable ?? false,
      sideEffects: options.sideEffects ?? "none",
      details: {
        command,
        args,
        exitCode: result.code,
        stderr: result.stderr.trim(),
        stdout: result.stdout.trim(),
        timedOut,
        timeoutMs: options.timeoutMs ?? null,
      },
      nextActions: options.nextActions ?? [],
    })
  }
  return result
}

export function isProcessTimeout(error) {
  if (error?.details?.timedOut === true) return true
  return typeof error?.message === "string" && /timed out after \d+ms/.test(error.message)
}

export function spawnInherited(command, args = [], options = {}) {
  const child = spawn(command, args, {
    cwd: options.cwd,
    env: options.env ?? process.env,
    detached: options.detached ?? false,
    windowsHide: options.windowsHide ?? false,
    shell: false,
    stdio: options.stdio ?? "inherit",
  })
  child.on("error", options.onError ?? (() => {}))
  return child
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
