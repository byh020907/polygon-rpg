---
name: dev-loop-recover
description: "Recover Polygon RPG's persistent background loop when it stopped, crashed, left stale supervisor state or needs a safe restart. Use for `$dev-loop-recover` or an explicit loop recovery request. Do not implement the INBOX item in this skill."
---

# Dev Loop Recover Trigger

Read [`loop/PROMPT.md`](../../../loop/PROMPT.md) completely and execute only its `RECOVER` mode. This skill owns no diagnosis, cleanup or restart procedure of its own.

Return after the canonical safe repair or supervisor restart; do not wait for job completion.
