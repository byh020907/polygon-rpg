# Start Or Continue Mode

Bare `$dev-team-loop` or `loop/control.ps1 run-once` starts one fresh complete-work execution. It does not create an entry.

1. Select the active entry, otherwise highest-priority oldest `new` entry.
2. Read Complete-Work Executor mode and finish that entry through visible QA, integration and cleanup in this session.
3. Return only after the entry is absent from live INBOX or has a concrete `blocked` record.

An incomplete phase is an abnormal failure, not a successful manual run.
