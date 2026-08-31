# Start Or Continue Mode

Bare `$dev-team-loop` or `loop/control.ps1 run-once` starts one fresh complete-work execution. It does not create an entry.

1. If a `direct-*` claim exists, do not start work; report that `$dev-inbox-direct` owns it. Otherwise select the background active entry or highest-priority oldest `new` entry.
2. Read Complete-Work Executor mode and finish that entry through visible QA, integration and cleanup in this session.
3. Return only after the entry is absent from live INBOX or has a concrete `blocked` record.

An incomplete phase is an abnormal failure, not a successful manual run.
