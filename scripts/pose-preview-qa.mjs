// Reuse the normal-input capture runner. Each actor PNG rerenders the same
// immutable frame with the production renderer's transparent option.
process.argv.push('--actor', '1');
await import('./motion-play-qa.mjs');
