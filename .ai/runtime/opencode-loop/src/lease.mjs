import { mkdir, readFile, rm } from "node:fs/promises"
import path from "node:path"
import os from "node:os"
import { blocked, partial } from "./errors.mjs"
import { isPidAlive, nowIso, readJson, shortId, writeJsonAtomic } from "./system.mjs"

const updateChains = new Map()

export async function inspectLease(project) {
  const directory = path.join(project.runtimeDir, "lease")
  const lease = await readJson(path.join(directory, "lease.json"), null)
  if (!lease) return { state: "free", directory, lease: null }
  const heartbeatAt = Date.parse(lease.heartbeatAtUtc ?? lease.acquiredAtUtc ?? 0)
  const ageMs = Number.isFinite(heartbeatAt) ? Date.now() - heartbeatAt : Number.POSITIVE_INFINITY
  return {
    state: isPidAlive(lease.ownerPid) ? "busy" : "orphaned",
    directory,
    lease,
    heartbeatAgeSeconds: Math.max(0, Math.round(ageMs / 1000)),
  }
}

export async function acquireLease(project, staleMinutes) {
  const directory = path.join(project.runtimeDir, "lease")
  const target = path.join(directory, "lease.json")
  await mkdir(project.runtimeDir, { recursive: true })
  try {
    await mkdir(directory, { recursive: false })
  } catch (error) {
    if (error?.code !== "EEXIST") throw error
    const observed = await inspectLease(project)
    const staleSeconds = staleMinutes * 60
    if (observed.state === "orphaned" && observed.heartbeatAgeSeconds >= staleSeconds) {
      await rm(directory, { recursive: true, force: true })
      try {
        await mkdir(directory, { recursive: false })
      } catch (retryError) {
        if (retryError?.code === "EEXIST") return { acquired: false, ...await inspectLease(project) }
        throw retryError
      }
    } else {
      return { acquired: false, ...observed }
    }
  }

  const token = shortId()
  const lease = {
    schemaVersion: 1,
    token,
    host: os.hostname(),
    ownerPid: process.pid,
    acquiredAtUtc: nowIso(),
    heartbeatAtUtc: nowIso(),
    executionId: null,
    sessionId: null,
  }
  await writeJsonAtomic(target, lease)
  return { acquired: true, directory, lease }
}

export async function updateLease(project, token, patch) {
  const target = path.join(project.runtimeDir, "lease", "lease.json")
  const previous = updateChains.get(target) ?? Promise.resolve()
  const operation = previous.catch(() => {}).then(async () => {
    const lease = await readJson(target, null)
    if (!lease || lease.token !== token) throw blocked("LEASE_TOKEN_MISMATCH", "The execution no longer owns the Product Goal Loop lease.", [{ command: "pgl-opencode status", reason: "Inspect the active owner." }])
    const next = { ...lease, ...patch, heartbeatAtUtc: nowIso() }
    await writeJsonAtomic(target, next)
    return next
  })
  updateChains.set(target, operation)
  try {
    return await operation
  } finally {
    if (updateChains.get(target) === operation) updateChains.delete(target)
  }
}

export function startHeartbeat(project, token, intervalMs = 30_000) {
  const timer = setInterval(() => {
    updateLease(project, token, {}).catch(() => {})
  }, intervalMs)
  timer.unref()
  return () => clearInterval(timer)
}

export async function releaseLease(project, token) {
  const directory = path.join(project.runtimeDir, "lease")
  const target = path.join(directory, "lease.json")
  const previous = updateChains.get(target) ?? Promise.resolve()
  const operation = previous.catch(() => {}).then(async () => {
    const lease = await readJson(target, null)
    if (!lease) return { released: false, alreadyFree: true }
    if (lease.token !== token) throw partial("LEASE_TOKEN_MISMATCH", "Refusing to release a lease owned by another process.", [{ command: "pgl-opencode status", reason: "Inspect the active owner." }], { ownerPid: lease.ownerPid })
    await rm(directory, { recursive: true, force: true })
    return { released: true, alreadyFree: false }
  })
  updateChains.set(target, operation)
  try {
    return await operation
  } finally {
    if (updateChains.get(target) === operation) updateChains.delete(target)
  }
}
