# Santa Clara Permit Review Assistant

A student prototype for AI-assisted permit intake, database-backed application records, and human County review workflows.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/permit-review-assistant run dev` — run the web app through its managed workflow
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- Web app: `artifacts/permit-review-assistant`
- API routes: `artifacts/api-server/src/routes`
- API contract: `lib/api-spec/openapi.yaml`
- Database schema: `lib/db/src/schema`

## Architecture decisions

- Seeded classroom demo records remain browser-local; applications submitted through the intake form are also saved to PostgreSQL and appear on Application Records.
- Screening rules are shared by the UI and server, but only the server's recalculated result is authoritative. Never trust caller-provided priority, verification, screening flags, ownership, or review histories.
- Real sign-in uses managed Clerk with cookie-based API authentication. New accounts are applicants; staff roles are assigned administratively, not through the portal chooser.
- Permit ownership is by authenticated user ID, not an email filter. Legacy records without an owner remain staff-only.
- Document contents are persisted privately in App Storage. A document marked received requires a completed, owned upload.
- Final approval remains an explicit staff action; AI never approves or denies a permit.

## Product

- Applicant permit intake with document completeness checks and rule-based pre-screening
- County staff dashboard, filters, review details, routing, notes, and human decisions
- Persistent Application Records page, newest first
- Workload analytics and classroom demo reset for local seed data

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Re-run API code generation after every OpenAPI change.
- Demo reset does not delete persistent Application Records.
- Unit regression checks: `pnpm --filter @workspace/api-server test`.
- To provision a staff account after it signs in, run `pnpm --filter @workspace/api-server exec tsx src/scripts/set-portal-role.ts <Clerk user ID> worker` from an authorized administrative shell. Use `fire_marshal` for Fire Marshal staff or `applicant` to revoke staff access. The worker-access screen shows the current account ID.
- Underserved area configuration is editable by staff under Help & guidance. Initial values are clearly labelled placeholders and never automatically verify claims.
- The two authentic City of San José housing-construction permit records (apartments and an ADU) appear only in the City Worker Portal's Application Records, separately from County environmental-health data and privately owned applicant submissions. Applicant Overview, Applications, and Records display only the signed-in user's own applications; don't invent applicant ownership, documents, or screening results for public records.
- To import/refresh the two housing examples from the official City API: `pnpm --filter @workspace/api-server exec tsx src/scripts/import-housing-showcase.ts`. The import rejects non-housing records and preserves the original source dates and unit counts.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
