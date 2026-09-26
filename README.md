# Nexlev — MLM Management Platform

A production-grade **Multi-Level Marketing management platform**: configurable unilevel compensation engine, immutable financial ledger, genealogy, wallet, withdrawals, KYC, ranks, notifications, full admin panel — built with **Next.js (App Router) + TypeScript + Tailwind CSS + PostgreSQL + Prisma + Auth.js**.

> **Earnings disclaimer:** Nexlev is a management tool, not a financial product. It makes no income guarantees anywhere in the UI or API, and it is built to help you *show your members the truth* about how commissions work.

---

## Feature overview

| Area | Highlights |
|---|---|
| **Public site** | Landing, About, How It Works, Packages (live from DB), Compensation Plan (generated from live admin config), FAQ, Contact, Terms, Privacy, SEO (sitemap/robots/OG) |
| **Auth** | Auth.js v5 (credentials + JWT), bcrypt(12) password hashing, email-verification & password-reset token flows, role-based guards (MEMBER/ADMIN), rate-limited login/register |
| **Referrals** | Unique referral code per member, `/register?ref=CODE` links, sponsor preview on the register page, permanent sponsor relationship, immutable `Referral` records |
| **Genealogy** | Materialized-path sponsor tree, expand/collapse tree UI, member search, per-level team stats, admin-wide genealogy search |
| **Commission engine** | Unilevel, **100% server-side, DB-configured** (levels + percentages in `CommissionRule`, plan toggles in `MlmSettings`), qualification rules (active status, KYC, package, volume thresholds), duplicate-proof (DB unique + processed-at stamp), PENDING→APPROVED→PAID lifecycle, reversals, admin simulator (preview only) |
| **Wallet & ledger** | Every balance change is an **immutable `WalletLedger` event** (prev/new balance, type, bucket, reference, idempotency key). `SELECT … FOR UPDATE` row locking inside DB transactions. Negative balances impossible. Available vs pending buckets |
| **Withdrawals** | Configurable min/max/fee/KYC-gate, funds held at request, approve → processing → complete (or reject/cancel with automatic refund) |
| **Payments** | Gateway-agnostic `PaymentProvider` interface; built-in **manual** provider (admin confirms), Stripe placeholder that fails loudly until connected. No fake confirmations |
| **KYC** | Document upload (5 MB, image/PDF), private object storage (local dev / **S3 in production**), owner-or-admin-only document access via authorized API, approve/reject with reason |
| **Ranks** | DB-configured ladder (direct/team/volume minimums, one-time bonus), automatic promotion, never downgraded |
| **Notifications** | Referrals, commissions, withdrawals, KYC, ranks, system announcements + broadcast tool |
| **Admin** | Dashboard with charts, user management (search/filter/suspend/adjust wallet), package CRUD, commission rule editor, commission approval queue, withdrawal/deposit processing, KYC review, rank editor, MLM settings, reports with **CSV export**, audit log (write-once), system settings |
| **Audit** | Every sensitive admin action (status changes, wallet adjustments, commission/withdrawal/KYC decisions, settings changes) is recorded with admin, before/after values, IP, timestamp — and cannot be edited in the UI |

## Tech stack

- **Next.js 15** (App Router, Server Components, Server Actions, Turbopack)
- **TypeScript** (strict)
- **Tailwind CSS 4**
- **PostgreSQL** + **Prisma ORM** (migrations committed)
- **Auth.js v5** (credentials, JWT sessions, Prisma adapter)
- **Zod** validation, **bcryptjs** hashing, **recharts** charts, **lucide-react** icons
- **Vitest** for business-logic tests (53 tests)

## Repository layout

```
prisma/
  schema.prisma          # 25 models, enums, indexes, ledger design
  migrations/            # committed SQL migrations
  seed.ts                # demo environment (labeled demo data, real services)
  seed-settings.ts       # plan config used by the seed
  seed-flows.ts          # seed drives the real purchase→commission pipeline
src/
  auth.ts                # Auth.js configuration (JWT, DB-backed role/status)
  app/
    (public)/            # marketing + auth pages
    (member)/            # member dashboard area (guarded)
    (admin)/admin/       # admin panel (guarded, admin-only)
    api/
      auth/[...nextauth] # Auth.js handlers
      documents/...      # authorized KYC document delivery (owner/admin only)
      reports/[type]     # admin-only CSV export
  components/
    ui/                  # design system (button, card, table, dialog, toast, …)
    charts/              # recharts wrappers
    layout/              # app shell (sidebar + mobile drawer)
    members/             # referral card, genealogy tree, share button
  lib/                   # prisma singleton, errors, rate limit, csv, format, ids
  server/                # ALL business logic (never in UI components)
    auth/  mlm/  commission/  wallet/  genealogy/  withdrawal/  payment/
    kyc/  rank/  notifications/  users/  deposit/  reports/  audit/  settings/  members/
  types/next-auth.d.ts   # session/JWT augmentation
tests/                   # vitest suites (commission engine, wallet, withdrawal,
                         # referral/genealogy, ranks) against an isolated DB
```

## Getting started (local)

### 1 · Clone

```bash
git clone https://github.com/<you>/nexlev.git
cd nexlev
```

### 2 · Install dependencies

```bash
npm install
```

### 3 · Configure environment

```bash
cp .env.example .env
```

Set at minimum:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public"
AUTH_SECRET="<output of: openssl rand -base64 32>"
AUTH_URL="http://localhost:3000"
```

Production extras (see `.env.example` for the full list): `STORAGE_DRIVER=s3` + `S3_*` keys for KYC document storage, `STRIPE_*` when connecting a gateway. **Never commit `.env`.**

### 4 · PostgreSQL

Create a database (any Postgres 14+ works: local, Docker, Neon, Supabase, RDS):

```sql
CREATE DATABASE nexlev;
```

### 5 · Migrate the database

```bash
npm run db:migrate     # development (creates + applies migrations)
# production deployments:
npm run db:deploy      # applies committed migrations only (safe)
```

### 6 · Seed demo data

```bash
npm run db:seed        # or: npm run db:reset  (drop + migrate + seed)
```

The seed is **clearly labeled** (all users are `Demo …`) and drives the real services (registration, payment confirmation, commission engine, KYC review, withdrawals, deposits, ranks). Demo credentials:

| Role | Email | Password |
|---|---|---|
| Admin | `admin@nexlev.test` | `Password123` |
| Member (top of demo tree) | `alice@nexlev.test` | `Password123` |
| Other members | `bob@nexlev.test`, `carol@nexlev.test`, … | `Password123` |

Demo hierarchy:

```
Alice ── Bob ── Dana ── Ivan
       │       └─ Erin  └─ Jack
       ├─ Carol ─┬─ Frank └─ Kim
       │         └─ Grace
       └─ Henry
```

> The seed is for development/demo only. Do not point a production database at demo data.

### 7 · Run the app

```bash
npm run dev            # development (http://localhost:3000)
npm run build && npm start   # production
```

### 8 · Tests

```bash
npm test               # vitest — 53 business-logic tests
```

Tests run against an **isolated database** (`nexlev_test` by default; override with `TEST_DATABASE_URL`). They cover the commission engine extensively (multi-level payout math, idempotency/duplicate prevention, missing sponsor, inactive/unqualified beneficiaries, reversed transactions, suspension), wallet invariants (no negative balance, idempotent retries, pending vs available), withdrawal validation (min/max/balance/KC/suspended member, refunds), referral/genealogy integrity, and rank rules.

## Deploying to Vercel

1. **Push to GitHub** and import the repo in Vercel (framework preset: Next.js).
2. **Add a Postgres database** (e.g. Neon / Supabase / RDS) and set environment variables in the Vercel project:
   - `DATABASE_URL`
   - `AUTH_SECRET` (long random string)
   - `AUTH_URL` (your production URL, e.g. `https://nexlev.vercel.app`)
   - `STORAGE_DRIVER=s3` + `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` (and `S3_ENDPOINT` for compatible providers) — Vercel has **no persistent filesystem**, so KYC documents must live in object storage.
   - Optional payment keys (`STRIPE_SECRET_KEY`, …)
3. **Run migrations** before/at deploy. Recommended: a Vercel build command `prisma migrate deploy` (builds run on a container with a persistent filesystem for the build step only — this is the standard Vercel+Prisma pattern):
   - Build command: `prisma migrate deploy && npm run build`
4. **Seed an admin** in production: the first admin should be created through a controlled script (the seed script can be adapted — it skips seeding when an admin already exists). Never ship demo data to production.
5. Done — the app makes no local-filesystem assumptions at runtime (dev-only KYC storage and dev-only email outbox are explicitly marked as development features).

### Current production setup (as of 2026-09-26)

| Resource | Value |
| --- | --- |
| GitHub repo | `github.com/borshon-404/Next-Lev` (branch `main`, auto-deploys to production) |
| Vercel project | `next-lev` (team `borshon-404`) |
| Production URL | **https://nexlev-app.vercel.app** |
| Database | Neon Postgres (Vercel Marketplace integration `neon`, region `iad1`), store `nexlev-db-iad1`. Migrations are applied to the DB directly (see below), so the Vercel build command stays `npm run build` |
| Env vars on Vercel | `DATABASE_URL` + Neon companion vars (injected by the integration), `AUTH_SECRET`, `AUTH_URL=https://nexlev-app.vercel.app`, `STORAGE_DRIVER=local` |

**Applying migrations & reseeding:** from a machine that can reach the DB,
`npx vercel env pull .env.prod --environment production`, then
`DATABASE_URL="$(grep '^DATABASE_URL_UNPOOLED=' .env.prod | cut -d'"' -f2)" npx prisma migrate deploy`
(the **unpooled** URL is required for Prisma migrations) and, if needed,
`DATABASE_URL="$(grep '^DATABASE_URL=' .env.prod | cut -d'"' -f2)" npm run db:seed`.
After changing env vars or the schema, push (even an empty commit) so Vercel rebuilds.

**Known limitations of the current deploy:**
- `STORAGE_DRIVER=local` → KYC document **uploads fail** on Vercel (read-only filesystem). Set `STORAGE_DRIVER=s3` + `S3_*` vars for full KYC functionality; everything else works.
- Stripe is not configured → card payments are disabled by design (no fake success); manual payment confirmation by admin works.
- The DB currently contains the **demo seed** (admin + demo members/transactions, all labeled "Demo …"). To start clean: drop the database in the Neon dashboard, re-run `prisma migrate deploy`, then reseed (or seed only the settings).

**Demo credentials (seeded):** admin `admin@nexlev.test` / `Password123`; members `alice@nexlev.test` … `kim@nexlev.test` / `Password123`.

## Business model: configurable Unilevel plan

Nothing about the compensation plan is hard-coded. The admin panel (Commission Rules + MLM Settings) stores in the database:

- number of levels and the percentage per level,
- engine on/off and commission auto-approval,
- qualification rules (active membership, KYC, package ownership, min direct referrals / personal volume / team volume / monthly sales),
- registration requirements (referral required, email/phone verification, KYC for activation, auto-activation),
- withdrawal limits, fee (percent + fixed) and the KYC gate.

The engine reads these settings at execution time. The public **Compensation Plan** page renders the same data, so members always see the plan that is actually in force. The upline-walk step is isolated so Binary/Matrix plans can be added later without touching payout, ledger or UI code.

## Financial safety

- **Immutable ledger**: balances on `Wallet` are cached aggregates; every change creates `WalletLedger` rows with previous/new balance, type, bucket, description, reference and idempotency key. There is no code path that mutates a balance without a ledger entry.
- **Atomicity**: all financial operations run inside Prisma database transactions with row-level locking (`SELECT … FOR UPDATE` on the wallet); any failure rolls everything back.
- **No duplicates**: `Commission` is unique per `(sourceTransaction, beneficiary)` and purchases carry a `commissionsProcessedAt` stamp; idempotency keys make wallet operations retry-safe.
- **No over-withdrawal**: debits are validated against the locked balance; withdrawal holds happen at request time and refunds are automatic on reject/cancel.
- **Authorization**: every sensitive operation re-checks the session server-side (role + account status read from the DB on each request, so suspensions apply immediately). Admin actions are audit-logged with before/after values.
- **KYC documents** are only ever served through an authenticated, owner-or-admin API route from private object storage.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / serve |
| `npm test` | Run business-logic test suite (Vitest) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:migrate` | Create + apply migrations (dev) |
| `npm run db:deploy` | Apply committed migrations (prod) |
| `npm run db:seed` | Seed demo data |
| `npm run db:reset` | Drop + migrate + seed |
| `npm run db:studio` | Prisma Studio |

## Security notes

- Passwords hashed with bcrypt (cost 12); sessions are Auth.js JWTs with server-side role/status re-validation per request.
- All input validated with Zod at the service boundary; errors are mapped to user-safe messages (no stack traces or DB errors leak).
- In-memory rate limiting on login/register/password-reset (swap the storage backend for a distributed store in multi-instance deployments — the call sites don't change).
- CSRF is handled by Auth.js on all auth mutations; Server Actions carry the session server-side.
- `.env` is git-ignored; `.env.example` documents every required variable with placeholders.

## License

Proprietary — all rights reserved. (Replace with your license of choice.)
