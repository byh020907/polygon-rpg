# Start Or Continue Mode

Bare `$dev-team-loop` or an explicit start/resume request authorizes one manual inbox coordinator transition. It creates neither a new inbox entry nor a supervisor/task.

1. Read [`manage.md`](manage.md), [`inbox-schema.md`](inbox-schema.md) and the canonical inbox.
2. Reconstruct state from nonterminal entries, executor refs/worktrees, commit graph, automation and lease.
3. Perform exactly one accept/provision, implementation checkpoint, fresh verification/finalize, integration, recovery or completion transition.
4. Release the lease and return. Recurring automation owns later transitions.

A run ending is not a DESIGN stop. Do not ask approval for normal execution or merge.
