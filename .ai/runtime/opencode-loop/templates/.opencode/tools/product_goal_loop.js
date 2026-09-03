import { tool } from "@opencode-ai/plugin"
import { invokeProductGoalLoopTool } from "../../.ai/runtime/opencode-loop/src/tool-api.mjs"

// Runtime contract:
// invokeProductGoalLoopTool({ command, args, context }) returns either a string
// or the same JSON-serializable result envelope used by the vendored CLI.
function invocationContext(context) {
  return {
    agent: context.agent,
    sessionId: context.sessionID,
    messageId: context.messageID,
    directory: context.directory,
    worktree: context.worktree,
  }
}

async function invoke(command, args, context) {
  const result = await invokeProductGoalLoopTool({
    command,
    args,
    context: invocationContext(context),
  })

  return typeof result === "string" ? result : JSON.stringify(result, null, 2)
}

export const feedback = tool({
  description:
    "Queue Human product, UX, quality, Persona, Project Direction, or desired-behavior feedback without waiting for the active worker. Preserve the Human's wording exactly; never pass a task rewrite. This changes only INBOX.md through the runtime's feedback-only Git flow and is idempotent per key/message.",
  args: {
    text: tool.schema
      .string()
      .min(1)
      .describe("The Human's original feedback, copied exactly without paraphrase or task conversion."),
    clarifications: tool.schema
      .array(tool.schema.string().min(1))
      .optional()
      .describe("Exact subsequent Human replies that resolve ambiguity, in conversation order."),
    idempotencyKey: tool.schema
      .string()
      .min(1)
      .optional()
      .describe("Stable retry key. Omit to let the runtime derive one from this OpenCode message."),
  },
  async execute(args, context) {
    return invoke("feedback", args, context)
  },
})

export const status = tool({
  description:
    "Read the current Product Goal Loop runtime status, active Execution Goal, phase, lease, visible session, candidate, blockers, and verification evidence. This is read-only and conversation history is not used as runtime state.",
  args: {},
  async execute(args, context) {
    return invoke("status", args, context)
  },
})

export const pause = tool({
  description:
    "Pause future scheduled Product Goal Loop ticks. This does not terminate or interrupt an already running worker.",
  args: {
    reason: tool.schema
      .string()
      .min(1)
      .optional()
      .describe("Optional Human-provided reason, preserved for operational visibility."),
  },
  async execute(args, context) {
    return invoke("pause", args, context)
  },
})

export const resume = tool({
  description:
    "Resume future scheduled Product Goal Loop ticks. Optionally request one immediate tick in the same idempotent operation.",
  args: {
    runNow: tool.schema
      .boolean()
      .optional()
      .describe("When true, resume and request an immediate tick; defaults to false."),
  },
  async execute(args, context) {
    return invoke("resume", { runNow: false, ...args }, context)
  },
})

export const run_now = tool({
  description:
    "Request one immediate Product Goal Loop tick without changing the configured paused state. A busy runtime returns a normal no-op/busy result.",
  args: {},
  async execute(args, context) {
    return invoke("run-now", args, context)
  },
})

export const abort = tool({
  description:
    "Terminate only the runtime-recorded active worker process and preserve its candidate for recovery. Use status first and pass the exact execution ID; this does not delete the worktree or branch.",
  args: {
    executionId: tool.schema
      .string()
      .min(1)
      .describe("Exact active execution ID returned by product_goal_loop_status."),
    reason: tool.schema
      .string()
      .min(1)
      .optional()
      .describe("Optional Human-provided abort reason for recovery evidence."),
  },
  async execute(args, context) {
    return invoke("abort", args, context)
  },
})

export const open_worker = tool({
  description:
    "Open or locate the named, Human-visible Live TUI conversation for the active worker. This does not start a worker and returns a normal no-op when none is active.",
  args: {},
  async execute(args, context) {
    return invoke("open-worker", args, context)
  },
})
