export const SCHEMA_VERSION = 1;

function asArray(value) {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function normalizeNextActions(value) {
  return asArray(value).map((action) => typeof action === "string"
    ? { command: action, reason: "Run the documented recovery command." }
    : action)
}

export function createEnvelope({
  ok,
  command,
  status,
  data = {},
  error = null,
  warnings = [],
  nextActions = [],
  retryable = false,
  sideEffects = "none",
}) {
  return {
    ok: Boolean(ok),
    command,
    status,
    data: data ?? {},
    error,
    warnings: asArray(warnings),
    nextActions: normalizeNextActions(nextActions),
    meta: {
      schemaVersion: SCHEMA_VERSION,
      retryable: Boolean(retryable),
      sideEffects: sideEffects ?? "none",
    },
  };
}

export function createSuccessEnvelope(command, result = {}) {
  if (result?.ok === false) {
    return createEnvelope({
      ok: false,
      command,
      status: result.status ?? "failed",
      data: result.data,
      error: result.error ?? {
        code: "RUNTIME_ERROR",
        message: "The runtime reported a failure without error details.",
      },
      warnings: result.warnings,
      nextActions: result.nextActions,
      retryable: result.retryable,
      sideEffects: result.sideEffects,
    });
  }

  return createEnvelope({
    ok: true,
    command,
    status: result?.status ?? "succeeded",
    data: result?.data ?? {},
    warnings: result?.warnings,
    nextActions: result?.nextActions,
    retryable: result?.retryable,
    sideEffects: result?.sideEffects,
  });
}

export function createErrorEnvelope(command, error) {
  const details = error?.details ?? {};
  return createEnvelope({
    ok: false,
    command,
    status: error?.status ?? "failed",
    data: details,
    error: {
      code: error?.code ?? "INTERNAL_ERROR",
      message: error?.message ?? "Unexpected internal error.",
      exitCode: error?.exitCode ?? 70,
      ...(error?.causeMessage ? { cause: error.causeMessage } : {}),
    },
    warnings: error?.warnings,
    nextActions: error?.nextActions,
    retryable: error?.retryable,
    sideEffects: error?.sideEffects,
  });
}

export function stringifyEnvelope(envelope) {
  return `${JSON.stringify(envelope, null, 2)}\n`;
}

function stringifyTextValue(value) {
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
}

export function renderTextEnvelope(envelope) {
  const lines = [`${envelope.ok ? "OK" : "ERROR"} ${envelope.command}: ${envelope.status}`];

  if (envelope.error) {
    lines.push(`${envelope.error.code}: ${envelope.error.message}`);
    if (envelope.error.cause) lines.push(`Cause: ${envelope.error.cause}`);
  }

  if (envelope.data && Object.keys(envelope.data).length > 0) {
    for (const [key, value] of Object.entries(envelope.data)) {
      lines.push(`${key}: ${stringifyTextValue(value)}`);
    }
  }

  for (const warning of envelope.warnings) lines.push(`Warning: ${stringifyTextValue(warning)}`);
  for (const action of envelope.nextActions) {
    lines.push(`Next: ${typeof action === "string" ? action : `${action.command}${action.reason ? ` — ${action.reason}` : ""}`}`);
  }
  if (envelope.meta.sideEffects !== "none") {
    lines.push(`Side effects: ${stringifyTextValue(envelope.meta.sideEffects)}`);
  }

  return `${lines.join("\n")}\n`;
}
