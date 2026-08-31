---
name: dev-team-loop
description: "Control Polygon RPG's persistent Windows background loop: turn it on, turn it off after the current entry, or show controller status. Use for `$dev-team-loop`, loop on/off/start/stop/pause/resume, or controller questions. Do not register or implement development work."
---

# Dev Team Loop Trigger

Read [`loop/PROMPT.md`](../../../loop/PROMPT.md) completely and execute only its `CONTROL` mode with the user's requested action. This skill owns no lifecycle or executor procedure of its own.

With no action, use the canonical safe default `status`. Return as soon as the controller command finishes; do not run or wait for an INBOX job.
