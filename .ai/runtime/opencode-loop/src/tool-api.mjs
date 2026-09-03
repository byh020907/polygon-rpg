import { runCommand } from "./runtime.mjs"
import { createErrorEnvelope, createSuccessEnvelope } from "./output.mjs"

function asText(value) {
  return typeof value === "string" ? value : JSON.stringify(value, null, 2)
}

function feedbackValue(args) {
  const parts = [String(args.text ?? "").trim()]
  for (const clarification of args.clarifications ?? []) {
    if (String(clarification).trim()) parts.push(`Clarification: ${String(clarification).trim()}`)
  }
  return parts.filter(Boolean).join("\n")
}

export async function invokeProductGoalLoopTool({ command, args = {}, context = {} }) {
  const repo = context.worktree || context.directory || process.cwd()
  const options = { repo, output: "json" }
  switch (command) {
    case "feedback":
      Object.assign(options, { text: feedbackValue(args), idempotencyKey: args.idempotencyKey ?? context.messageId })
      break
    case "pause":
      Object.assign(options, { reason: args.reason })
      break
    case "resume":
      Object.assign(options, { runNow: Boolean(args.runNow) })
      break
    case "abort":
      Object.assign(options, { executionId: args.executionId, yes: true, reason: args.reason })
      break
    default:
      break
  }
  try {
    const result = await runCommand({ command, options, positionals: [] })
    return asText(createSuccessEnvelope(command, result))
  } catch (error) {
    return asText(createErrorEnvelope(command, error))
  }
}
