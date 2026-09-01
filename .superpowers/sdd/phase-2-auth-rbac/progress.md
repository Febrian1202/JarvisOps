# SDD ledger — plan: docs/tasks/phase-2/2c-auth-rbac.md

Plan executed manually (not subagents): the 5 tasks are tightly coupled — Task 1 builds the AbilityMatrix that Tasks 2/4/5 consume, Task 2 registers gates using it, Tasks 4/5 depend on the same routes. The SDD decision tree routes tightly-coupled tasks to manual execution. Per-task commits + final whole-branch self-review instead.

Ruling: R1 — `auth.login` is included in ROLE_ABILITIES (all 4 roles) for faithful PERMISSION-MATRIX §3.1 translation; it is never gate-checked (login is unauthenticated) but registering a gate is harmless and keeps the matrix complete.
Ruling: R2 — user.deactivate / user.delete are target-aware gates (actor must be Admin AND target must not be actor), satisfying D-16 #1 self-protection; they are in the Gate::before blacklist so Admin bypass does not override the self-protection check.
Ruling: R3 — notification abilities are registered as gates keyed on matrix names (notification.viewAny etc.) that delegate to NotificationPolicy methods; NotificationPolicy lives at app/Policies/NotificationPolicy.php and enforces D-16 #3 ownership isolation.

## Final review (whole-branch, independent reviewer)

Verdict: SPEC ✅ all 5 tasks' checkboxes confirmed. Quality approved with 1 Important + minors.

Ruling R4: Important — EnsurePasswordChanged ALLOWED_ROUTES includes me.show while DECISIONS D-11 (older text) listed only password update + logout. Plan Task 3 Step 3 explicitly mandates me.show; frontend needs GET /me to render the forced-change screen. RESOLVED: kept me.show and updated DECISIONS D-11 to include GET /api/me (me.show). Cost if wrong: a doc edit that re-locks D-11 — but it now matches the approved plan.

Ruling R5: Minor — RoleName::from() without null check. role_id is a non-null FK with restrictOnDelete so no real null path. RESOLVED defensively anyway with tryFrom + empty-permissions fallback. Cost if wrong: negligible.

Deferred minor (not fixed): login response uses hardcoded makeHidden list; if User::$hidden grows, login won't auto-respect it. No Resource layer exists yet (matches repo convention), acceptable for now.

Deferred minor (not fixed): API-CONTRACT §5 PUT /me example message says "Profile retrieved successfully." (GET copy-paste). Code returns "Profile updated successfully." — doc is the artifact needing a future fix (Phase 10 audit), not code.

Carry-forward (out of scope, Phase 2d/2e): D-16 #2 — when TicketPolicy lands, the admin CLOSED-ticket restriction will not fire unless the affected ticket abilities (ticket.view/update) are added to ADMIN_GATE_EXCEPTIONS, because Gate::before returning true for admin short-circuits policies. The blacklist mechanism supports this — add ticket abilities to the exceptions when TicketPolicy is implemented.

## Task completion log

Task 1: complete (commits 6de6b4c..6de6b4c, review clean)
Task 2: complete (commits e3d185d..e3d185d, review clean)
Task 3: complete (commits 6788699..6788699, review clean)
Task 4: complete (commits 6df6810..6df6810, review clean)
Task 5: complete (commits 2720360..6fa710b, review clean + spec-shape refinement)
Final: whole-branch review SPEC ✅; fixes committed 91496b2 (D-11 alignment + defensive guard)
