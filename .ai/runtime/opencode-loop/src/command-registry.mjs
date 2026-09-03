export const CLI_NAME = "pgl-opencode";
export const CLI_VERSION = "0.1.0";

export const EXIT_CODES = Object.freeze({
  SUCCESS: 0,
  USAGE: 2,
  PREREQUISITE: 3,
  ACTION_REQUIRED: 4,
  RETRYABLE_CONFLICT: 5,
  PARTIAL_SIDE_EFFECT: 6,
  INTERNAL: 70,
});

export const STATUS_MODEL = Object.freeze([
  "idle",
  "running",
  "paused",
  "waiting_for_human",
  "externally_blocked",
  "recoverable_failure",
  "implementation_complete",
]);

export const COMMAND_OUTCOMES = Object.freeze([
  "succeeded", "failed", "idle", "running", "paused", "busy", "planned", "configured",
  "ready", "needs_setup", "opened", "queued", "aborted", "published", "duplicate",
  "goal_complete", "cleanup_complete", "waiting_for_human", "externally_blocked",
  "recoverable_failure", "implementation_complete", "uninstalled", "already_running",
]);

export const ENVIRONMENT = Object.freeze([
  { name: "OPENCODE_BIN", description: "Absolute native OpenCode executable override. Windows shell shims are never executed." },
  { name: "PGL_OPENCODE_DATA_DIR", description: "Optional base directory override for adapter-owned candidate worktrees." },
  { name: "PGL_OPENCODE_POWERSHELL", description: "Optional native PowerShell executable override for Scheduled Task and TUI launchers." },
  { name: "LOCALAPPDATA", description: "Base directory for Windows candidate worktrees." },
  { name: "NO_COLOR", description: "Accepted for interoperability; the CLI never emits ANSI in JSON mode." },
]);

export const CONFIGURATION = Object.freeze({
  path: ".ai/runtime/opencode-loop/config.json",
  schemaVersion: 1,
  defaults: {
    remote: "origin",
    branch: "main",
    scheduleMinutes: 10,
    staleLeaseMinutes: 120,
    minimumOpenCodeVersion: "1.18.18",
    autoPush: true,
    models: { worker: null, verifier: null, reconciliation: null },
    server: { hostname: "127.0.0.1", port: 0, username: "opencode" },
  },
  note: "setup owns the file. Null model values inherit the project's OpenCode model; release tags and deployment are never automated.",
});

const globalOptions = [
  {
    name: "repo",
    flag: "--repo",
    value: "<path>",
    type: "path",
    default: ".",
    description: "Product repository. Git discovery starts at this path.",
  },
  {
    name: "output",
    flag: "--output",
    value: "<format>",
    type: "enum",
    choices: ["text", "json"],
    description: "Output format. Default: text on a TTY, JSON when piped.",
  },
  {
    name: "json",
    flag: "--json",
    type: "boolean",
    description: "Shortcut for --output json; conflicts with --output text.",
  },
  { name: "help", flag: "--help", aliases: ["-h"], type: "boolean", description: "Show root or command help." },
  { name: "version", flag: "--version", type: "boolean", description: "Print the CLI version." },
];

const repoRead = ["Git repository discovery", "Git common-directory runtime metadata"];
const basePrerequisites = ["Windows", "Node.js 20 or newer", "A Git repository containing the Product Goal Loop project sources"];

function flag(name, value, type, description, extra = {}) {
  return { name, flag: `--${name.replaceAll(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`, value, type, description, ...extra };
}

function command(spec) {
  return Object.freeze({
    args: [],
    options: [],
    prerequisites: basePrerequisites,
    reads: repoRead,
    changes: [],
    sideEffects: ["none"],
    concurrency: "Read-only; safe to run concurrently.",
    outcomes: ["succeeded: the requested operation completed", "failed: no unreported side effect is assumed"],
    exitCodes: [0, 2, 3, 4, 5, 6, 70],
    examples: [],
    recovery: `${CLI_NAME} status --output json`,
    outputExample: { status: "succeeded", data: {} },
    mutating: false,
    runtime: true,
    ...spec,
  });
}

const dryRun = flag("dryRun", undefined, "boolean", "Describe intended targets and side effects without changing state.", { default: false });

export const COMMANDS = Object.freeze({
  help: command({
    summary: "Inspect the complete CLI contract or one command without running the adapter.",
    usage: `${CLI_NAME} help [command] [--json]`,
    args: [{ name: "command", required: false, description: "Command whose contract should be shown." }],
    prerequisites: ["Node.js 20 or newer"],
    reads: ["The in-process command registry"],
    concurrency: "Pure and side-effect free.",
    outcomes: ["succeeded: help was emitted", "usage_error: the requested command does not exist"],
    exitCodes: [0, 2],
    examples: [`${CLI_NAME} --help`, `${CLI_NAME} help --json`, `${CLI_NAME} help feedback --json`],
    recovery: `${CLI_NAME} help --json`,
    outputExample: { status: "succeeded", data: { command: "feedback" } },
    runtime: false,
  }),
  setup: command({
    summary: "Install or reconcile the repository-local adapter, localhost backend, scheduler, and manager session.",
    usage: `${CLI_NAME} setup [--schedule-minutes <minutes>] [--remote <name>] [--branch <name>] [--yes] [--dry-run]`,
    options: [
      flag("scheduleMinutes", "<minutes>", "integer", "Scheduled tick interval.", { default: 10, minimum: 1 }),
      flag("remote", "<name>", "string", "Integration Git remote.", { default: "origin" }),
      flag("branch", "<name>", "string", "Integration branch.", { default: "main" }),
      flag("yes", undefined, "boolean", "Confirm installation when not using --dry-run.", { default: false }),
      dryRun,
    ],
    prerequisites: [...basePrerequisites, "OpenCode 1.18.18 or newer", "Full-access permission preflight succeeds", "Push-capable integration remote"],
    changes: ["Repository-local adapter files", "Git common-directory runtime metadata", "Windows Scheduled Tasks", "Persistent OpenCode manager session"],
    sideEffects: ["Creates or updates Scheduled Tasks", "Starts a localhost-only backend", "Creates an OpenCode manager session"],
    concurrency: "Idempotent reconciliation; setup serializes against setup/uninstall for the same repository.",
    outcomes: ["succeeded: installed state matches options", "no_op: configuration already matches", "partial_failure: inspect status before retrying"],
    examples: [`${CLI_NAME} setup --dry-run`, `${CLI_NAME} setup --schedule-minutes 10 --yes --output json`],
    recovery: `${CLI_NAME} doctor --output json`,
    outputExample: { status: "succeeded", data: { scheduleMinutes: 10, backend: "running" } },
    mutating: true,
  }),
  backend: command({
    summary: "Keep the repository's localhost OpenCode serve process alive for manager and worker sessions.",
    usage: `${CLI_NAME} backend [--dry-run]`,
    options: [dryRun],
    prerequisites: [...basePrerequisites, "OpenCode 1.18.18 or newer"],
    reads: [...repoRead, "Backend PID, URL, port, and authentication metadata"],
    changes: ["Backend PID and health metadata in the Git common directory"],
    sideEffects: ["May start an opencode serve child process", "Binds a listener to 127.0.0.1 only", "Updates local runtime metadata"],
    concurrency: "A repository-local guard makes concurrent invocations converge on one healthy backend.",
    outcomes: ["succeeded: backend is healthy", "no_op: an existing backend is healthy", "partial_failure: process state may require doctor"],
    examples: [`${CLI_NAME} backend --dry-run`, `${CLI_NAME} backend --output json`],
    recovery: `${CLI_NAME} doctor --output json`,
    outputExample: { status: "running", data: { host: "127.0.0.1", healthy: true } },
    mutating: true,
  }),
  manager: command({
    summary: "Open the persistent Product Goal Loop management conversation in a live OpenCode TUI.",
    usage: `${CLI_NAME} manager [--dry-run]`,
    options: [dryRun],
    prerequisites: [...basePrerequisites, "Healthy localhost backend", "Configured manager session", "Full-access permission preflight succeeds"],
    reads: [...repoRead, "Backend and manager session metadata"],
    sideEffects: ["Attaches an interactive TUI to the persistent manager session"],
    concurrency: "Does not acquire the development lease; multiple viewers may attach if OpenCode permits it.",
    outcomes: ["succeeded: a visible TUI process was opened", "externally_blocked: backend, permission, or terminal is unavailable"],
    examples: [`${CLI_NAME} manager --dry-run`, `${CLI_NAME} manager`],
    recovery: `${CLI_NAME} backend --output json`,
    outputExample: { status: "succeeded", data: { sessionId: "ses_manager" } },
    mutating: true,
  }),
  tick: command({
    summary: "Run at most one Execution Goal in a fresh, observable worker session.",
    usage: `${CLI_NAME} tick [--dry-run]`,
    options: [dryRun],
    prerequisites: [...basePrerequisites, "Healthy backend", "Full-access permission preflight succeeds", "Push-capable integration remote"],
    reads: [...repoRead, "Product Goal Loop project sources", "Current lease and recovery manifest", "Latest integration remote"],
    changes: ["Candidate branch and worktree", "Project files for one Execution Goal", "Runtime evidence", "Integration branch after verification"],
    sideEffects: ["Starts worker/verifier sessions", "May commit and fast-forward push verified changes", "May export and delete ordinary completed sessions"],
    concurrency: "Atomic lease permits one development writer; an active lease returns busy with exit 0.",
    outcomes: ["succeeded: one verified goal was integrated", "busy/no_op: no action was required", "blocked: candidate and session are preserved", "partial_failure: recovery evidence is retained"],
    examples: [`${CLI_NAME} tick --dry-run --output json`, `${CLI_NAME} tick`],
    recovery: `${CLI_NAME} status --output json`,
    outputExample: { status: "busy", data: { leaseOwner: "execution-id" } },
    mutating: true,
  }),
  status: command({
    summary: "Report backend, scheduler, lease, active session, candidate, blocker, and verification state.",
    usage: `${CLI_NAME} status`,
    prerequisites: ["Node.js 20 or newer", "A Git repository or previously initialized runtime metadata"],
    reads: [...repoRead, "Backend health", "Execution and verification manifests"],
    outcomes: ["succeeded: current state was read", "prerequisite_error: repository/runtime could not be located"],
    examples: [`${CLI_NAME} status`, `${CLI_NAME} status --output json`],
    recovery: `${CLI_NAME} doctor --output json`,
    outputExample: { status: "idle", data: { paused: false, worker: null } },
  }),
  "open-worker": command({
    summary: "Open the active worker conversation in a separate live OpenCode TUI.",
    usage: `${CLI_NAME} open-worker [--dry-run]`,
    options: [dryRun],
    prerequisites: [...basePrerequisites, "Healthy backend", "An active or preserved worker session", "Full-access permission preflight succeeds"],
    reads: [...repoRead, "Active execution and backend metadata"],
    changes: [],
    sideEffects: ["Attaches an interactive TUI to the worker session", "Human input causes the session to be retained"],
    concurrency: "Does not acquire or interrupt the development lease.",
    outcomes: ["succeeded: TUI exited normally", "no_op: no worker session exists", "externally_blocked: backend or terminal is unavailable"],
    examples: [`${CLI_NAME} open-worker --dry-run`, `${CLI_NAME} open-worker`],
    recovery: `${CLI_NAME} status --output json`,
    outputExample: { status: "succeeded", data: { sessionId: "ses_worker" } },
    mutating: true,
  }),
  pause: command({
    summary: "Pause future scheduled ticks without terminating the active worker.",
    usage: `${CLI_NAME} pause [--dry-run]`,
    options: [dryRun],
    changes: ["Repository-local scheduler pause state"],
    sideEffects: ["Prevents later scheduled ticks from starting work"],
    concurrency: "Idempotent; an active worker continues and keeps its lease.",
    outcomes: ["succeeded: scheduling is paused", "no_op: scheduling was already paused"],
    examples: [`${CLI_NAME} pause --dry-run`, `${CLI_NAME} pause --output json`],
    recovery: `${CLI_NAME} resume --output json`,
    outputExample: { status: "succeeded", data: { paused: true } },
    mutating: true,
  }),
  resume: command({
    summary: "Enable future scheduled ticks, optionally requesting one immediate tick.",
    usage: `${CLI_NAME} resume [--run-now] [--dry-run]`,
    options: [
      flag("runNow", undefined, "boolean", "Also request one immediate tick after resuming.", { default: false }),
      dryRun,
    ],
    changes: ["Repository-local scheduler pause state"],
    sideEffects: ["Allows later scheduled ticks to start work"],
    concurrency: "Idempotent; does not acquire the development lease.",
    outcomes: ["succeeded: scheduling is enabled", "no_op: scheduling was already enabled"],
    examples: [`${CLI_NAME} resume --dry-run`, `${CLI_NAME} resume --output json`],
    recovery: `${CLI_NAME} status --output json`,
    outputExample: { status: "succeeded", data: { paused: false } },
    mutating: true,
  }),
  "run-now": command({
    summary: "Request one immediate scheduler tick if the development lease is available.",
    usage: `${CLI_NAME} run-now [--dry-run]`,
    options: [dryRun],
    changes: ["Immediate-run request and scheduler metadata"],
    sideEffects: ["May launch the scheduled tick task", "Does not interrupt an active worker"],
    concurrency: "Returns busy with exit 0 when a worker owns the lease; duplicate requests coalesce.",
    outcomes: ["succeeded: a tick was requested", "busy: an active worker was left untouched", "no_op: an equivalent request is pending"],
    examples: [`${CLI_NAME} run-now --dry-run`, `${CLI_NAME} run-now --output json`],
    recovery: `${CLI_NAME} status --output json`,
    outputExample: { status: "succeeded", data: { requested: true } },
    mutating: true,
  }),
  abort: command({
    summary: "Terminate only the recorded active worker process and preserve its candidate for recovery.",
    usage: `${CLI_NAME} abort [--execution-id <id>] [--yes] [--dry-run]`,
    options: [
      flag("executionId", "<id>", "string", "Expected execution ID; mismatch fails safely."),
      flag("yes", undefined, "boolean", "Confirm process termination when not using --dry-run.", { default: false }),
      dryRun,
    ],
    reads: [...repoRead, "Active lease token, PID, execution, session, and candidate metadata"],
    changes: ["Execution recovery manifest and lease state"],
    sideEffects: ["Terminates the recorded worker process", "Preserves candidate worktree, branch, session, and evidence"],
    concurrency: "Token and optional execution-ID checks prevent terminating an unrelated process.",
    outcomes: ["succeeded: recorded worker was terminated and preserved", "no_op: no active worker exists", "partial_failure: inspect preserved state before retrying"],
    examples: [`${CLI_NAME} abort --dry-run`, `${CLI_NAME} abort --execution-id exec-123 --yes --output json`],
    recovery: `${CLI_NAME} status --output json`,
    outputExample: { status: "recoverable_failure", data: { candidatePreserved: true } },
    mutating: true,
  }),
  doctor: command({
    summary: "Diagnose Node, Git, OpenCode, remote, backend, Full access, agents, tools, and scheduler configuration.",
    usage: `${CLI_NAME} doctor`,
    prerequisites: ["Node.js 20 or newer"],
    reads: ["Tool versions and effective OpenCode agent permissions", "Repository, remote, runtime, backend, and Scheduled Task configuration"],
    outcomes: ["succeeded: all required checks passed", "prerequisite_error: one or more checks failed with remediation in nextActions"],
    examples: [`${CLI_NAME} doctor`, `${CLI_NAME} doctor --output json`],
    recovery: `${CLI_NAME} help setup`,
    outputExample: { status: "succeeded", data: { checks: [] } },
  }),
  feedback: command({
    summary: "Append Human wording to INBOX.md in a feedback-only commit based on latest integration state.",
    usage: `${CLI_NAME} feedback (--stdin | --file <path> | --text <text>) [--idempotency-key <key>] [--dry-run]`,
    options: [
      flag("stdin", undefined, "boolean", "Read feedback verbatim from standard input.", { default: false, exclusiveGroup: "input" }),
      flag("file", "<path>", "path", "Read feedback verbatim from a file.", { exclusiveGroup: "input" }),
      flag("text", "<text>", "string", "Use literal feedback; prefer --stdin or --file for arbitrary text.", { exclusiveGroup: "input" }),
      flag("idempotencyKey", "<key>", "string", "Deduplicate safe retries of the same feedback operation."),
      dryRun,
    ],
    prerequisites: [...basePrerequisites, "Push-capable integration remote"],
    reads: [...repoRead, "Latest integration branch", "INBOX.md", "Feedback idempotency records"],
    changes: ["INBOX.md only", "Feedback-only Git commit and integration remote", "Local idempotency record"],
    sideEffects: ["Fetches and may push the integration branch", "Creates and removes a temporary feedback worktree"],
    concurrency: "Independent of the development lease; retries non-fast-forward races and deduplicates by idempotency key.",
    outcomes: ["succeeded: exact Human wording was pushed", "no_op: idempotency key was already applied", "retryable_conflict: wording was preserved for retry", "partial_failure: inspect nextActions"],
    examples: [
      `Get-Content .\\feedback.txt -Raw | ${CLI_NAME} feedback --stdin --idempotency-key feedback-001`,
      `${CLI_NAME} feedback --file .\\feedback.txt --dry-run --output json`,
    ],
    recovery: `${CLI_NAME} status --output json`,
    outputExample: { status: "succeeded", data: { commit: "abc123", duplicate: false } },
    mutating: true,
  }),
  uninstall: command({
    summary: "Remove Scheduled Tasks and local runtime services while preserving all Git work and evidence.",
    usage: `${CLI_NAME} uninstall [--yes] [--dry-run]`,
    options: [
      flag("yes", undefined, "boolean", "Confirm runtime removal when not using --dry-run.", { default: false }),
      dryRun,
    ],
    reads: [...repoRead, "Scheduled Task, backend process, session, and candidate metadata"],
    changes: ["Windows Scheduled Tasks and local runtime service metadata"],
    sideEffects: ["Stops the adapter-owned backend", "Deletes adapter-owned Scheduled Tasks", "Preserves Git branches, worktrees, candidates, and evidence"],
    concurrency: "Serializes against setup; refuses unsafe cleanup while ownership cannot be proven.",
    outcomes: ["succeeded: local runtime was removed", "no_op: no installed runtime exists", "partial_failure: Git work remains preserved and nextActions identify cleanup"],
    examples: [`${CLI_NAME} uninstall --dry-run`, `${CLI_NAME} uninstall --yes --output json`],
    recovery: `${CLI_NAME} doctor --output json`,
    outputExample: { status: "succeeded", data: { gitWorkPreserved: true } },
    mutating: true,
  }),
});

export const GLOBAL_OPTIONS = Object.freeze(globalOptions);

export const OUTPUT_ENVELOPE_SCHEMA = Object.freeze({
  schemaVersion: 1,
  required: ["ok", "command", "status", "data", "error", "warnings", "nextActions", "meta"],
  commandOutcomes: COMMAND_OUTCOMES,
  lifecycleStatuses: STATUS_MODEL,
  description: "JSON stdout contains exactly one envelope; progress and diagnostics go to stderr.",
  nextActionShape: { command: "string", reason: "string" },
  example: {
    ok: true,
    command: "tick",
    status: "busy",
    data: {},
    error: null,
    warnings: [],
    nextActions: [],
    meta: { schemaVersion: 1, retryable: false, sideEffects: "none" },
  },
});

export class CliUsageError extends Error {
  constructor(message, { code = "USAGE_ERROR", nextActions = [], details = {} } = {}) {
    super(message);
    this.name = "CliUsageError";
    this.code = code;
    this.exitCode = EXIT_CODES.USAGE;
    this.nextActions = nextActions;
    this.details = details;
    this.retryable = false;
    this.sideEffects = "none";
  }
}

function optionLabel(option) {
  return [option.flag, ...(option.aliases ?? [])].join(", ") + (option.value ? ` ${option.value}` : "");
}

function defaultText(option) {
  const details = [];
  if (option.default !== undefined) details.push(`default: ${String(option.default)}`);
  if (option.choices) details.push(`one of: ${option.choices.join(", ")}`);
  if (option.exclusiveGroup) details.push(`exclusive group: ${option.exclusiveGroup}`);
  return details.length ? ` (${details.join("; ")})` : "";
}

function renderOptions(options) {
  if (options.length === 0) return "  (none)";
  return options.map((option) => `  ${optionLabel(option)}\n      ${option.description}${defaultText(option)}`).join("\n");
}

function renderItems(items) {
  if (!items?.length) return "  (none)";
  return items.map((item) => `  - ${item}`).join("\n");
}

export function renderRootHelp() {
  const tree = Object.entries(COMMANDS)
    .map(([name, spec]) => `  ${name.padEnd(13)} ${spec.summary}`)
    .join("\n");
  const exits = [
    [0, "success, normal no-op, or busy"],
    [2, "invalid arguments or usage"],
    [3, "configuration or prerequisite failure"],
    [4, "Human or external action required"],
    [5, "retryable Git or concurrency conflict"],
    [6, "partial side effect; inspect status/recovery evidence"],
    [70, "unexpected internal error"],
  ].map(([code, meaning]) => `  ${String(code).padEnd(3)} ${meaning}`).join("\n");
  const env = ENVIRONMENT.map((entry) => `  ${entry.name.padEnd(14)} ${entry.description}`).join("\n");
  const config = Object.entries(CONFIGURATION.defaults).map(([name, value]) => `  ${name.padEnd(28)} ${value === null ? "inherit OpenCode default" : typeof value === "object" ? JSON.stringify(value) : String(value)}`).join("\n");

  return `${CLI_NAME} ${CLI_VERSION} — OpenCode Product Goal Loop runtime adapter

PURPOSE
  Run and observe one autonomous Product Goal Loop safely while keeping Human feedback independent.
  The executable help is the canonical CLI contract; no separate usage rules are required.

QUICK START
  ${CLI_NAME} setup --dry-run
  ${CLI_NAME} setup --yes
  ${CLI_NAME} manager
  ${CLI_NAME} status --output json

USAGE
  ${CLI_NAME} [global options] <command> [command options]
  ${CLI_NAME} help [command] [--json]

COMMANDS
${tree}

GLOBAL OPTIONS
${renderOptions(globalOptions)}

RUNTIME LOCATIONS
  Durable lease, execution, backend, and evidence metadata live below the repository Git common directory.
  Candidate worktrees live below %LOCALAPPDATA% in a repository-specific directory.
  Product repositories receive the adapter at .ai/runtime/opencode-loop/.

LOOP LIFECYCLE STATUS
  ${STATUS_MODEL.join(" | ")}

COMMAND OUTCOMES
  ${COMMAND_OUTCOMES.join(" | ")}

CONFIGURATION
  ${CONFIGURATION.path} (schemaVersion ${CONFIGURATION.schemaVersion})
${config}
  ${CONFIGURATION.note}

ENVIRONMENT
${env}

EXIT CODES
${exits}

OUTPUT
  TTY defaults to text; piped commands default to one JSON envelope on stdout.
  Use --json or --output json for stable machine output. Diagnostics use stderr.

DISCOVERY
  ${CLI_NAME} <command> --help
  ${CLI_NAME} help --json
`;
}

export function renderCommandHelp(name) {
  const spec = COMMANDS[name];
  if (!spec) throw unknownCommand(name);
  const args = spec.args.length
    ? spec.args.map((arg) => `  ${arg.required ? "<" : "["}${arg.name}${arg.required ? ">" : "]"}  ${arg.description}`).join("\n")
    : "  (none)";
  const exits = spec.exitCodes.map((code) => `  ${code}  ${Object.entries(EXIT_CODES).find(([, value]) => value === code)?.[0]?.toLowerCase() ?? "runtime result"}`).join("\n");
  const examples = spec.examples.map((example) => `  ${example}`).join("\n");

  return `${CLI_NAME} ${name} — ${spec.summary}

WHEN TO USE
  ${spec.summary}

USAGE
  ${spec.usage}

ARGUMENTS
${args}

OPTIONS
${renderOptions([...globalOptions.filter((option) => !["help", "version"].includes(option.name)), ...spec.options])}
  --help, -h
      Show this command contract without executing it.

PREREQUISITES
${renderItems(spec.prerequisites)}

READS
${renderItems(spec.reads)}

CHANGES
${renderItems(spec.changes)}

SIDE EFFECTS
${renderItems(spec.sideEffects)}

IDEMPOTENCY AND CONCURRENCY
  ${spec.concurrency}

OUTCOMES
${renderItems(spec.outcomes)}

EXIT CODES
${exits}

WINDOWS EXAMPLES
${examples}

RECOVERY
  ${spec.recovery}

TEXT OUTPUT EXAMPLE
  OK ${name}: ${spec.outputExample.status}

JSON OUTPUT EXAMPLE
${JSON.stringify({ ok: true, command: name, status: spec.outputExample.status, data: spec.outputExample.data, error: null, warnings: [], nextActions: [], meta: { schemaVersion: 1, retryable: false, sideEffects: "none" } }, null, 2).split("\n").map((line) => `  ${line}`).join("\n")}
`;
}

function registryCommand(name, spec) {
  return {
    name,
    summary: spec.summary,
    usage: spec.usage,
    arguments: spec.args,
    options: [...globalOptions.filter((option) => !["help", "version"].includes(option.name)), ...spec.options],
    prerequisites: spec.prerequisites,
    reads: spec.reads,
    changes: spec.changes,
    sideEffects: spec.sideEffects,
    idempotencyAndConcurrency: spec.concurrency,
    outcomes: spec.outcomes,
    exitCodes: spec.exitCodes,
    examples: spec.examples,
    recoveryCommand: spec.recovery,
    outputExample: spec.outputExample,
    mutating: spec.mutating,
  };
}

export function buildHelpDocument(target) {
  if (target) {
    const spec = COMMANDS[target];
    if (!spec) throw unknownCommand(target);
    return {
      cli: CLI_NAME,
      version: CLI_VERSION,
      command: registryCommand(target, spec),
      outputEnvelope: OUTPUT_ENVELOPE_SCHEMA,
    };
  }

  return {
    cli: CLI_NAME,
    version: CLI_VERSION,
    purpose: "OpenCode runtime adapter for Product Goal Loop Engineering",
    quickStart: [`${CLI_NAME} setup --dry-run`, `${CLI_NAME} setup --yes`, `${CLI_NAME} manager`],
    globalOptions,
    commands: Object.entries(COMMANDS).map(([name, spec]) => registryCommand(name, spec)),
    environment: ENVIRONMENT,
    configuration: CONFIGURATION,
    runtimeLocations: {
      durableState: "Git common directory",
      candidateWorktrees: "%LOCALAPPDATA% repository-specific directory",
      vendoredAdapter: ".ai/runtime/opencode-loop/",
    },
    lifecycleStatuses: STATUS_MODEL,
    commandOutcomes: COMMAND_OUTCOMES,
    exitCodes: Object.fromEntries(Object.entries(EXIT_CODES).map(([name, code]) => [code, name.toLowerCase()])),
    outputEnvelope: OUTPUT_ENVELOPE_SCHEMA,
  };
}

function levenshtein(a, b) {
  const row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const old = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
      previous = old;
    }
  }
  return row[b.length];
}

export function suggestCommand(input) {
  return Object.keys(COMMANDS)
    .map((name) => ({ name, distance: levenshtein(input, name) }))
    .sort((a, b) => a.distance - b.distance || a.name.localeCompare(b.name))[0]?.name;
}

function unknownCommand(name) {
  const suggestion = suggestCommand(name);
  return new CliUsageError(`Unknown command: ${name}`, {
    code: "UNKNOWN_COMMAND",
    details: { input: name, suggestion },
    nextActions: [`${CLI_NAME} ${suggestion} --help`],
  });
}

function splitOptionToken(token) {
  const index = token.indexOf("=");
  return index === -1 ? [token, undefined] : [token.slice(0, index), token.slice(index + 1)];
}

function findOption(flagName, commandSpec) {
  return [...globalOptions, ...commandSpec.options].find((option) => option.flag === flagName || option.aliases?.includes(flagName));
}

function coerceOption(option, raw) {
  if (option.type === "boolean") {
    if (raw !== undefined) throw new CliUsageError(`${option.flag} does not accept a value.`, { nextActions: [`${CLI_NAME} help --json`] });
    return true;
  }
  if (raw === undefined) throw new CliUsageError(`${option.flag} requires ${option.value}.`, { nextActions: [`${CLI_NAME} help --json`] });
  if (option.type === "integer") {
    const parsed = Number(raw);
    if (!Number.isSafeInteger(parsed) || (option.minimum !== undefined && parsed < option.minimum)) {
      throw new CliUsageError(`${option.flag} must be an integer${option.minimum !== undefined ? ` >= ${option.minimum}` : ""}.`);
    }
    return parsed;
  }
  if (option.choices && !option.choices.includes(raw)) {
    throw new CliUsageError(`${option.flag} must be one of: ${option.choices.join(", ")}.`);
  }
  return raw;
}

function locateCommand(argv) {
  for (let index = 0; index < argv.length; index += 1) {
    const [token] = splitOptionToken(argv[index]);
    const global = globalOptions.find((option) => option.flag === token || option.aliases?.includes(token));
    if (global) {
      if (global.type !== "boolean" && argv[index].indexOf("=") === -1) index += 1;
      continue;
    }
    if (!argv[index].startsWith("-")) return { name: argv[index], index };
    throw new CliUsageError(`Unknown global option: ${argv[index]}`, { nextActions: [`${CLI_NAME} --help`] });
  }
  return null;
}

export function parseArgv(argv = []) {
  const located = locateCommand(argv);
  const commandName = located?.name;
  const spec = commandName ? COMMANDS[commandName] : COMMANDS.help;
  if (commandName && !spec) throw unknownCommand(commandName);

  const options = {};
  for (const option of [...globalOptions, ...(spec?.options ?? [])]) {
    if (option.default !== undefined) options[option.name] = option.default;
  }
  const positionals = [];

  for (let index = 0; index < argv.length; index += 1) {
    if (located && index === located.index) continue;
    const token = argv[index];
    if (token === "--") {
      positionals.push(...argv.slice(index + 1));
      break;
    }
    if (!token.startsWith("-")) {
      positionals.push(token);
      continue;
    }

    const [flagName, inlineValue] = splitOptionToken(token);
    const option = findOption(flagName, spec);
    if (!option) {
      throw new CliUsageError(`Unknown option for ${commandName ?? "root"}: ${flagName}`, {
        code: "UNKNOWN_OPTION",
        nextActions: [`${CLI_NAME}${commandName ? ` ${commandName}` : ""} --help`],
      });
    }
    let raw = inlineValue;
    if (option.type !== "boolean" && raw === undefined) {
      index += 1;
      raw = argv[index];
      if (raw === undefined || raw.startsWith("-")) {
        throw new CliUsageError(`${option.flag} requires ${option.value}.`, {
          nextActions: [`${CLI_NAME}${commandName ? ` ${commandName}` : ""} --help`],
        });
      }
    }
    options[option.name] = coerceOption(option, raw);
  }

  if (options.json && options.output && options.output !== "json") {
    throw new CliUsageError("--json conflicts with --output text.", { nextActions: [`${CLI_NAME}${commandName ? ` ${commandName}` : ""} --help`] });
  }
  if (options.json) options.output = "json";
  delete options.json;
  delete options.help;
  delete options.version;

  const requestedHelp = argv.includes("--help") || argv.includes("-h");
  const requestedVersion = argv.includes("--version");
  if (requestedVersion && commandName) throw new CliUsageError("--version is only valid without a command.");
  if (requestedVersion) return { kind: "version", options, positionals: [] };

  if (!commandName) return { kind: "help", command: undefined, options, positionals: [] };
  if (requestedHelp) return { kind: "help", command: commandName, options, positionals: [] };

  if (commandName === "help") {
    if (positionals.length > 1) throw new CliUsageError("help accepts at most one command name.", { nextActions: [`${CLI_NAME} help --json`] });
    if (positionals[0] && !COMMANDS[positionals[0]]) throw unknownCommand(positionals[0]);
    return { kind: "help", command: positionals[0], options, positionals: [] };
  }

  if (positionals.length > spec.args.length) {
    throw new CliUsageError(`${commandName} does not accept positional arguments.`, { nextActions: [`${CLI_NAME} ${commandName} --help`] });
  }

  const groups = new Map();
  for (const option of spec.options.filter((item) => item.exclusiveGroup && options[item.name] !== undefined && options[item.name] !== false)) {
    groups.set(option.exclusiveGroup, [...(groups.get(option.exclusiveGroup) ?? []), option.flag]);
  }
  for (const [group, selected] of groups) {
    if (selected.length > 1) throw new CliUsageError(`Options ${selected.join(", ")} are mutually exclusive (${group}).`, { nextActions: [`${CLI_NAME} ${commandName} --help`] });
  }
  if (commandName === "feedback" && (groups.get("input")?.length ?? 0) !== 1) {
    throw new CliUsageError("feedback requires exactly one of --stdin, --file, or --text.", { nextActions: [`${CLI_NAME} feedback --help`] });
  }

  return { kind: "command", command: commandName, options, positionals };
}
