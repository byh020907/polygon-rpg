# Direct Execution

## Claim Before Work

1. Fetch origin and confirm clean `main == origin/main`, no partial merge and no conflicting active/direct entry.
2. Acquire `loop/lock.mjs` on the exact main HEAD.
3. Run:

   ```text
   node loop/inbox.mjs claim-direct --repo <repo> --entry <IN-ID> --expected-head <HEAD> --lease-token <TOKEN> --claimed-at <ISO-8601> --claimed-by dev-inbox-direct
   ```

4. Verify only metadata outside `원문 — 불변` changed. Commit/push the claim on main and renew the lease at the new HEAD.
5. Create or recover `codex/loop/<lowercase-in-id>` from the claimed main commit and push its baseline.

The claim command rejects a non-`new` target, any background active item, a second direct item, dirty/non-main checkout or changed HEAD. Do not emulate a claim by loosely editing Markdown.

## Execute In This Conversation

- Derive title, completion conditions, non-scope, quality axes and owned paths without rewriting the raw block.
- Keep INBOX and STATUS changes on main; keep implementation/canonical documents on the executor branch.
- Update main to `direct-verifying` after a pushed runnable checkpoint.
- For visual work, capture and directly read stable-screen PNGs. Repair in this conversation and re-capture until every applicable axis is 2+.
- Merge latest main into the branch, re-run the final gate and push the clean final.
- On main, use `--no-ff --no-commit`; set `direct-integrating`, then preserve `status: done`, raw/result and STATUS in the merge commit.
- Remove only the exact done block, record the actual merge hash, push cleanup, release the lease and verify `loop/completion.mjs` reports `complete: true`.

If the current task stops unexpectedly, do not downgrade to `new` or allow the background loop to guess ownership. Leave evidence for an explicit direct resume or authorized recovery.
