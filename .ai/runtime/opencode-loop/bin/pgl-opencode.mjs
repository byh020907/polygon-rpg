#!/usr/bin/env node
import { pathToFileURL } from "node:url";
import {
  CLI_NAME,
  CLI_VERSION,
  EXIT_CODES,
  CliUsageError,
  buildHelpDocument,
  parseArgv,
  renderCommandHelp,
  renderRootHelp,
} from "../src/command-registry.mjs";
import {
  createErrorEnvelope,
  createSuccessEnvelope,
  renderTextEnvelope,
  stringifyEnvelope,
} from "../src/output.mjs";

function writer(target) {
  if (typeof target === "function") return target;
  if (target && typeof target.write === "function") return (text) => target.write(text);
  return () => {};
}

function chooseOutput(parsed, isTTY) {
  if (parsed.options.output) return parsed.options.output;
  if (parsed.kind === "help" || parsed.kind === "version") return "text";
  return isTTY ? "text" : "json";
}

async function loadRuntime(deps) {
  if (deps.runtime) return deps.runtime;
  if (deps.loadRuntime) return deps.loadRuntime();
  return import("../src/runtime.mjs");
}

function runtimeFunction(runtime) {
  const run = runtime?.runCommand ?? runtime?.executeCommand;
  if (typeof run !== "function") {
    const error = new Error("Runtime module must export runCommand(request) or executeCommand(request).");
    error.code = "RUNTIME_INTERFACE_INVALID";
    error.exitCode = EXIT_CODES.PREREQUISITE;
    error.nextActions = [`${CLI_NAME} doctor --output json`];
    throw error;
  }
  return run.bind(runtime);
}

export async function runCli(argv = process.argv.slice(2), deps = {}) {
  const writeOut = writer(deps.stdout ?? process.stdout);
  const writeErr = writer(deps.stderr ?? process.stderr);
  let parsed;

  try {
    parsed = parseArgv(argv);
  } catch (error) {
    const jsonRequested = argv.includes("--json") || argv.some((token) => token === "--output=json" || (token === "--output" && argv[argv.indexOf(token) + 1] === "json"));
    const envelope = createErrorEnvelope("cli", error);
    envelope.error.exitCode = error.exitCode ?? EXIT_CODES.USAGE;
    if (jsonRequested) writeOut(stringifyEnvelope(envelope));
    else writeErr(renderTextEnvelope(envelope));
    return error.exitCode ?? EXIT_CODES.USAGE;
  }

  const format = chooseOutput(parsed, deps.isTTY ?? process.stdout.isTTY === true);

  try {
    if (parsed.kind === "version") {
      if (format === "json") {
        writeOut(stringifyEnvelope(createSuccessEnvelope("version", { data: { name: CLI_NAME, version: CLI_VERSION } })));
      } else {
        writeOut(`${CLI_NAME} ${CLI_VERSION}\n`);
      }
      return EXIT_CODES.SUCCESS;
    }

    if (parsed.kind === "help") {
      if (format === "json") {
        writeOut(stringifyEnvelope(createSuccessEnvelope("help", { data: buildHelpDocument(parsed.command) })));
      } else {
        writeOut(parsed.command ? renderCommandHelp(parsed.command) : renderRootHelp());
      }
      return EXIT_CODES.SUCCESS;
    }

    const runtime = await loadRuntime(deps);
    const execute = runtimeFunction(runtime);
    const result = await execute({ command: parsed.command, options: parsed.options, positionals: parsed.positionals });
    const envelope = createSuccessEnvelope(parsed.command, result);
    const declaredExit = result?.exitCode;
    if (!envelope.ok && Number.isInteger(declaredExit)) envelope.error.exitCode = declaredExit;

    if (format === "json") writeOut(stringifyEnvelope(envelope));
    else if (envelope.ok) writeOut(renderTextEnvelope(envelope));
    else writeErr(renderTextEnvelope(envelope));
    return envelope.ok ? EXIT_CODES.SUCCESS : (declaredExit ?? EXIT_CODES.INTERNAL);
  } catch (error) {
    if (!(error instanceof Error)) error = new Error(String(error));
    const command = parsed.command ?? "cli";
    const envelope = createErrorEnvelope(command, error);
    envelope.error.exitCode = error.exitCode ?? (error instanceof CliUsageError ? EXIT_CODES.USAGE : EXIT_CODES.INTERNAL);
    if (format === "json") writeOut(stringifyEnvelope(envelope));
    else writeErr(renderTextEnvelope(envelope));
    return envelope.error.exitCode;
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : undefined;
if (invokedPath === import.meta.url) {
  process.exitCode = await runCli();
}
