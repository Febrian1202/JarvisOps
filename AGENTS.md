# AGENTS.md — JARVIS OPS

IT Service Management monorepo. **Design phase is complete; implementation has barely started.** `docs/` is dense and authoritative (~6.3k lines, Indonesian); the code is still near-scaffold. Expect to write net-new code, not modify existing features.

## Repo layout

```
apps/api/    Laravel 13.17 + Sanctum 4 (PHP ^8.3, local runtime is 8.5)
apps/web/    Next.js 16.3 + React 19 + Tailwind v4 (App Router, src/app)
docs/        approved design docs — the spec
PRODUCT.md   product truth for the impeccable design skill
```

One `.git` at the root (`origin` = github.com/Febrian1202/JarvisOps, branch `main`). Root manifest `compose.yaml`, `Makefile`, and `docker/` dev environment are active.

## Docs are the spec — read before coding

These docs contain locked decisions, not drafts. Do not re-litigate them.

| Before you touch | Read |
| --- | --- |
| anything | `docs/adr/DECISIONS.md` — D-01..D-24, closes ~50 decisions that would otherwise be made silently and inconsistently |
| migrations / models | `docs/architecture/ERD.md`, `docs/schema.sql` (18 tables), DECISIONS §A (esp. D-14 column+index checklist, D-15 pinned seeder IDs) |
| controllers / routes | `docs/api/API-CONTRACT.md` (envelope, §13 server-set fields), DECISIONS §C |
| ticket status logic | `docs/product/STATUS-TRANSITION.md` |
| policies / gates | `docs/product/PERMISSION-MATRIX.md` (incl. when to return 404 instead of 403), DECISIONS §B |
| what to build next | `docs/product/ROADMAP.md` (10 phases; §2 = locked technical decisions) |

**Authority order when docs conflict** (DECISIONS §2): `DECISIONS.md` > `STATUS-TRANSITION.md` / `PERMISSION-MATRIX.md` > `API-CONTRACT.md` > `ERD.md` / `schema.sql` > `ROADMAP.md` > `PRD.md`. PRD is last because it was written first.

For code: migrations are the schema source of truth. `docs/schema.sql` is a report attachment, synced in Phase 10 — not executable. `docs/api/openapi.yaml` only covers 8 paths / 20 operations, so it is a partial export — `API-CONTRACT.md` and `PERMISSION-MATRIX.md` (65 route rows) are the real inventory.

`docs/design/wireframe.pen` is an encrypted design file: access it only through the `pencil` MCP tools. Never `read`/`grep` it.

## Hard conventions that differ from framework defaults

- **Every API response uses one envelope**: `{ success, message, data, meta? }` / `{ success, message, errors }`. Never return a bare Eloquent Resource or a raw 422 body. No `links` in `meta`. `204` is never used — always return a body.
- **Frontend never calls Laravel directly.** Next.js Route Handlers act as a BFF; the Sanctum token lives in an httpOnly cookie and is attached server-side. A client component hitting `http://localhost:8000` is a bug.
- **Authorization is core Laravel Gate/Policy only.** One role per user via `users.role_id`. Admin passes `Gate::before` with two hard exceptions (D-16). Do not add `spatie/laravel-permission`.
- **SLA is snapshotted onto each ticket** (`sla_duration_minutes`, `sla_deadline`) at creation — never joined live from the priority table. Flat 24/7 calendar (D-01), exactly 5 statuses with no pause (D-02). Breach state is also recomputed defensively at query time, not trusted from the scheduler.
- Every create returns **201** (D-22). Status/assign transitions accept optional `expected_status_id` and return **409** on mismatch (D-21).
- All durations are integer **minutes**; timestamps ISO 8601 UTC (server and DB are UTC, frontend converts to Asia/Jakarta); fields `snake_case`; routes `kebab-case` plural.
- **Message language is split** (D-24): API envelope + validation messages in English (Laravel default), in-app notification bodies and audit descriptions in Indonesian.
- Attachments go to a private disk, served only through a controller that runs the parent ticket's policy. 5 MB max; JPG/JPEG/PNG/PDF only; validate MIME **and** extension server-side.
- Notifications are DB rows + 30s frontend polling. No WebSocket, no broadcasting, no email/SMTP.
- The SLA scheduler is its own process (`php artisan schedule:work`, separate container in prod) — FrankenPHP classic mode only serves HTTP, so without it SLA checks never run.
- Frontend stack is pre-chosen (ROADMAP §2): shadcn/ui, TanStack Query, Recharts, react-hook-form, zod. Don't introduce alternatives.
- Docs and user-facing prose are **Indonesian**. Match it when editing `docs/`, `README.md`, or `PRODUCT.md`.
- Branch strategy (ROADMAP Phase 0): work on `feat/<phase>-<topic>`, merge to `main` via PR even when solo.

## Backend commands (`apps/api`)

```bash
php artisan test --filter=SomeTest       # narrowest run; prefer this
vendor/bin/pest --filter=SomeTest        # Pest runner directly
vendor/bin/pint --dirty --format agent   # required after editing any PHP
composer dev                             # php artisan dev (concurrent dev processes)
```

`laravel/pao` is installed, so `pint` and tests emit single-line JSON instead of the usual TAP-ish output. That is expected, not a misconfiguration.

Pest 5 is installed with `pest-plugin-laravel` and PHPUnit 13.3. Tests run against **SQLite in-memory** (`phpunit.xml`) while `apps/api/.env` points at **MySQL** (`DB_DATABASE=JarvisOps`, jarvisops/secret in Docker, root/root local).

Health endpoint today is `/up` (`bootstrap/app.php`); the `/api/health` in ROADMAP/PERMISSION-MATRIX does not exist yet. API exceptions already render as JSON for `api/*`.

## Frontend commands (`apps/web`)

```bash
npm run dev     # next dev
npm run build
npm run lint    # eslint flat config; no typecheck or test script wired yet
```

`apps/web/.env.example` exists and contains the internal BFF URL.

## Instruction files and tooling

- `apps/api/AGENTS.md` is **generated by Laravel Boost** and `apps/web/AGENTS.md` is **regenerated by `next dev`**. Don't hand-edit expecting it to survive; commit the regenerated block rather than reverting it.
- `apps/api/CLAUDE.md` is the stale pre-Boost bootstrap stub telling you to install Boost. Boost 2.7 is already installed — ignore it.
- Boost's `.ai/rules` mechanism is referenced by `apps/api/AGENTS.md` but the directory does not exist. Skip that step until it does.
- `apps/api/opencode.json` registers the `laravel-boost` MCP server, and config resolution walks up from cwd — so Boost tools (`database-schema`, `search-docs`, `record-rule`) are **unavailable in a root-level session**. Start opencode in `apps/api` for backend work.
- Skills live in `.opencode/skills/`: `laravel-best-practices`, `testing-best-practices`, `tailwindcss-development`, `infer-conventions`, `impeccable`. `.opencode/` is gitignored, so these are local-only.
- UI work goes through the `impeccable` skill. Its product truth is the tracked root `PRODUCT.md`; its settings are `.impeccable/config.json` (`buildPath: comp` — new surfaces start from a generated comp). There is no `DESIGN.md` yet.

## Current state, concretely

- `apps/api`: Laravel's default migrations plus `personal_access_tokens`. One model (`User`), `app/Http/Controllers` holds only the base `Controller`, `routes/api.php` is the stock `/user` closure. Tests have been migrated to Pest with a single `HealthCheckTest`. Pint is clean.
- `apps/web`: unmodified `create-next-app` output — `src/app/{page,layout,globals.css}`.
- Phase 0 (Repo, Docker, Toolchain, Pest 5 migration) is **complete**. Phase 2 (Backend Foundation & Walking Skeleton) is the next work.
