# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

CareVault (`gxd_app`) — a multi-tenant EHR/hospital management system built on Next.js (App Router). Modules include patients, appointments, admission, laboratory, radiology, pharmacy, inventory/products, orders, finance, payments, roles/permissions, and a patient-facing portal (my-history, my-appointments). There is an ongoing compliance effort aligning the app with the Nigeria Digital Health Architecture (NDHA) spec plus HIPAA/GDPR-style requirements (audit logging, consent, data-subject requests) — see `app/(authenticated)/data-requests` and `lib/audit.ts`.

## Commands

```bash
npm run dev              # start dev server (Next.js)
npm run build            # production build
npm run lint             # eslint
```

Database (Drizzle ORM + PostgreSQL):

```bash
npm run db:push          # push schema.ts changes directly to the DB (dev)
npm run db:generate      # generate SQL migration files from schema.ts
npm run db:migrate       # apply generated migrations
npm run db:studio        # open Drizzle Studio at https://local.drizzle.studio
npm run db:seed          # seed base data
npm run db:recreate      # drop and recreate schema from scratch
```

There is no configured test runner (no `test` script, no test framework installed) — do not assume Jest/Vitest exist unless you add them.

One-off data migrations live as standalone scripts in `lib/db/` (e.g. `add-payments.ts`, `add-admission-module.ts`, `add-result-viewed.ts`) and are wired into `package.json` as `db:migrate-*` scripts. When adding a schema change that needs backfilling or can't be expressed as a plain `db:push`, follow this pattern: write a new `lib/db/add-<feature>.ts` script and a matching `db:migrate-<feature>` npm script rather than editing an old migration script.

## Architecture

**Multi-tenancy.** Nearly every table has a required `organisationId` (see `lib/db/schema.ts`). Every query that touches tenant data must filter by org. `lib/org.ts#getOrgId()` reads `organisationId` off the session. `isPlatformAdmin` (on the user/session) is the one cross-org escape hatch — it bypasses org scoping and permission checks (see `hasAnyPermission` in `lib/authz.ts`).

**Auth.** NextAuth v5 (beta), JWT sessions, Credentials provider only (`auth.ts`). `auth.config.ts` holds the shared config (used by `middleware.ts` at the edge, without the DB-touching provider) plus the `authorized()` callback, which is the single choke point for route access:
- `/api/*` denies by default; only `/api/auth/*`, `/api/contact`, and `/api/payments/webhook` are public. Everything else needs a session, and handlers still do their own permission checks on top.
- Non-API routes redirect logged-in users away from `/login`/`/signup` to a role-based landing page (patient → `/my-history`, lab → `/laboratory`, radiology → `/radiology`, finance → `/finance`, doctor → `/my-appointments`, else `/dashboard`).
- Session lifetime is a fixed 8-hour "shift" (`maxAge`), refreshed hourly on activity. Session/login friction (2FA, idle auto-logoff) was intentionally removed — don't reintroduce it without being asked.
- Failed logins are rate-limited via `auditLogs` lookups in `auth.ts` (5 failures / 15 min lockout per email), and every login attempt (success/failure/lockout) is audit-logged.

**Authorization (RBAC).** Permissions are stored per-role as JSON on `roles.permissions` and checked via `lib/authz.ts`:
- `getAuthContext()` loads the session + role + permissions from the DB (not just the JWT) so deactivated users lose access immediately.
- `permissionGranted()` supports two historical permission-JSON shapes: array style (`{ patients: ["add","view"] }`) from seed data and object style (`{ patients: { add: true } }`) from the Roles UI — keep supporting both when touching this code.
- Route handlers call `requirePermission([["module","action"]])` or `requireAuth()` and check `authz.error` before proceeding. Module/action keys come from `APP_MODULES`/`APP_PERMISSIONS` in `lib/constants.ts`.

**API route pattern** (see `app/api/patients/route.ts` for a representative example): resolve `orgId` via `getOrgId()` (or `ctx.orgId` from `requirePermission`/`requireAuth`), scope every Drizzle query with `eq(table.organisationId, orgId)`, filter soft-deleted rows with `isNull(table.deletedAt)`, and call `logAudit()` for state-changing actions.

**Database layer** (`lib/db/`):
- `schema.ts` is the single source of truth for all tables (Drizzle).
- `index.ts` exports the singleton `db` client, pooled via `globalThis` to survive dev hot-reload.
- Soft deletes (`deletedAt`) are used throughout instead of hard deletes — always filter them out in reads.

**Payments** (`lib/payments/`): gateway-agnostic via the `PaymentGateway` interface (`gateway.ts`) — `initialize`, `verify`, `verifyWebhookSignature`. `mock.ts` is the default dev gateway (no `PAYMENT_GATEWAY` env var needed); `paystack.ts` is the live implementation, selected by setting `PAYMENT_GATEWAY=paystack` + `PAYSTACK_SECRET_KEY`. Keep new gateways behind this same interface so routes/UI don't need to change.

**Route groups**: `app/(authenticated)/*` holds all logged-in UI pages (one subfolder per module, mirrors `app/api/*`); `app/login`, `app/signup`, and the landing page live outside the group.

## Environment

Config is via `.env.local` (see `env-template.txt` for the full list). Key vars: `DATABASE_URL` (Postgres), `NEXTAUTH_SECRET`/`NEXTAUTH_URL`, `SMTP_*` (contact form), `PAYMENT_GATEWAY`/`PAYSTACK_SECRET_KEY` (patient payments), `NEXT_PUBLIC_APP_URL`.
