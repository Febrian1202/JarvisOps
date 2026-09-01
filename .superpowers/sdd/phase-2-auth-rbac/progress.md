# SDD ledger — plan: docs/tasks/phase-2/2c-auth-rbac.md

Plan executed manually (not subagents): the 5 tasks are tightly coupled — Task 1 builds the AbilityMatrix that Tasks 2/4/5 consume, Task 2 registers gates using it, Tasks 4/5 depend on the same routes. The SDD decision tree routes tightly-coupled tasks to manual execution. Per-task commits + final whole-branch self-review instead.

Ruling: R1 — `auth.login` is included in ROLE_ABILITIES (all 4 roles) for faithful PERMISSION-MATRIX §3.1 translation; it is never gate-checked (login is unauthenticated) but registering a gate is harmless and keeps the matrix complete.
Ruling: R2 — user.deactivate / user.delete are target-aware gates (actor must be Admin AND target must not be actor), satisfying D-16 #1 self-protection; they are in the Gate::before blacklist so Admin bypass does not override the self-protection check.
Ruling: R3 — notification abilities are registered as gates keyed on matrix names (notification.viewAny etc.) that delegate to NotificationPolicy methods; NotificationPolicy lives at app/Policies/NotificationPolicy.php and enforces D-16 #3 ownership isolation.
