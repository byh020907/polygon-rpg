export const EXIT = Object.freeze({
  OK: 0,
  USAGE: 2,
  PREREQUISITE: 3,
  BLOCKED: 4,
  CONFLICT: 5,
  PARTIAL: 6,
  INTERNAL: 70,
})

export class RuntimeError extends Error {
  constructor(code, message, options = {}) {
    super(message, options.cause ? { cause: options.cause } : undefined)
    this.name = "RuntimeError"
    this.code = code
    this.exitCode = options.exitCode ?? EXIT.INTERNAL
    this.retryable = options.retryable ?? false
    this.sideEffects = options.sideEffects ?? "none"
    this.details = options.details ?? null
    this.nextActions = options.nextActions ?? []
  }
}

export function prerequisite(code, message, nextCommand, details = null) {
  return new RuntimeError(code, message, {
    exitCode: EXIT.PREREQUISITE,
    details,
    nextActions: nextCommand ? [{ command: nextCommand, reason: message }] : [],
  })
}

export function blocked(code, message, nextActions = [], details = null) {
  return new RuntimeError(code, message, {
    exitCode: EXIT.BLOCKED,
    details,
    nextActions,
  })
}

export function conflict(code, message, nextActions = [], details = null) {
  return new RuntimeError(code, message, {
    exitCode: EXIT.CONFLICT,
    retryable: true,
    details,
    nextActions,
  })
}

export function partial(code, message, nextActions = [], details = null) {
  return new RuntimeError(code, message, {
    exitCode: EXIT.PARTIAL,
    retryable: true,
    sideEffects: "partial",
    details,
    nextActions,
  })
}
