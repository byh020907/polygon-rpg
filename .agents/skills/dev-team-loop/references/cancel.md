# Cancel, Pause And Reopen

Lifecycle commands update the exact `IN-*` entry on main and never rewrite its raw request.

- **Pause:** set `paused`, commit/push main and preserve branch/worktree/checkpoints. Resume returns the same entry to its evidence-backed phase.
- **Cancel:** record last branch/checkpoint, dirty paths, validation and impact; set `cancelled` on main. Do not merge partial code or delete executor evidence.
- **Reopen:** append a new `IN-*` entry containing the user's new registration wording exactly and link `supersedes` to the old terminal entry. Do not edit the old raw block.
- **Already integrated:** register the revert request as a new inbox entry. Never rewrite shared history.

Report what stopped, what remains recoverable and the real blocker. Unknown paths remain preserved as conflict.
