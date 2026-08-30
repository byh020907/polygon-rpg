# Complete-Work Executor Mode

One fresh `codex exec` session owns one INBOX entry from current evidence to clean main integration and live-INBOX cleanup. Phase boundaries are checkpoints inside the run, not normal exit points.

## Preflight

1. Read `loop/PROMPT.md`, DESIGN, STATUS, the full INBOX and exact entry.
2. Fetch origin and inspect main, executor refs/worktree, commit ancestry and `loop/lock.mjs status` before broad context loading.
3. Acquire the exact clean main HEAD lease. Renew before mutations and at least every 10 minutes; release in `finally`.
4. Recover any existing branch, dirty owned paths, checkpoint, final, partial main merge or leftover done block before new implementation.

## Complete One Entry

1. Preserve the raw block unchanged and derive title, completion, non-scope, quality axes and owned paths on main when missing.
2. Create/reuse `codex/loop/<lowercase-in-id>` worktree and push its baseline.
3. Implement the complete request. Iterate internally as needed; do not stop after one bottleneck.
4. Run affected checks and push a runnable checkpoint before visual inspection.
5. For visual work, invoke `loop/visual-qa.ps1` with an entry-appropriate `GAME_START` and fixed `GAME_FRAME`. Read the PNG directly. Repair and repeat in this same session until all applicable axes are 2+.
6. Create/push a clean final, merge latest main into the branch when needed, and recheck the owned diff.
7. On main, non-rewriting merge final with terminal INBOX result and STATUS evidence. Run `loop/inbox.mjs remove-done` and record the actual merge hash in a cleanup commit. Push both.
8. Confirm entry absent from live INBOX, clean main equals origin, worktree/branch evidence is pushed, then release and exit.

Only a concrete Product Decision, credential or external system can end normally with `blocked`. Tool failure or incomplete implementation exits nonzero so the Windows task restart policy can recover it in a new fresh session.

## Safety

- INBOX and STATUS are main-owned; executor branches never edit them.
- No force push, rebase shared history, broad reset, guessed cleanup or replacement task.
- Do not continue to another entry in the same session.
- `loop/STOP` is checked by the outer PowerShell loop after this entry is complete.
