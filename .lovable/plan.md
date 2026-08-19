# Axion — Production Hardening Plan

## Where the product stands today (verified)

- Server-backed: Agentforce Studio only (`agents` + child tables, versions, reviews, approvals, export jobs, `activity_log`), plus auth (`profiles`, `axion_user_roles`, domain-restricted RLS).
- Still browser-only (localStorage): Phase 1 workspace (clients, initiatives, tasks, milestones, risks, approvals, comments, notifications, templates), Phase 2 assessments/ADRs, Phase 3 data products + mappings, Phase 4 connectivity + identity, Phase 5 trust controls/evidence/governance. Files: `src/repositories/mock/phase2Store.ts` … `phase5Store.ts`, `mockRepositories.ts`.
- Edge functions deployed: `agent-chat`, `agent-export` only.
- No connectors of any kind exist yet — the source catalog (`src/data/sourceCatalog.ts`) is static seed metadata, not live schemas.
- No automated tests exist anywhere in `src/` (only `src/test/setup.ts`).
- Tenancy is a string `tenant_id` with a domain-wide RLS predicate (`is_techmahindra_user()`) — every signed-in Tech Mahindra user can read every tenant's rows. This is the single biggest production gap.

## Gap list for production readiness

**Security and tenancy**
1. Per-client isolation instead of domain-wide access; tenant membership table; RLS scoped to membership.
2. Real role model per client (RACI roles are currently granted to everyone via `ensure_axion_access`).
3. Server-side enforcement of stage gates, approvals and action authorization (today mostly client-side).
4. Secret handling for connector credentials; no credentials in browser code.
5. Security scan clean, dependency scan clean, audit log immutable and complete.

**Data platform**
6. Migrate all Phase 1–5 modules to server tables with grants, RLS, triggers and audit.
7. Version/approval history for data products, mappings, ADRs, identity policies and controls (currently agents only).
8. Referential integrity between modules (agent → data product → mapping → source object → control).

**Connectors (metadata ingestion)**
9. Offline metadata import (GA): SQL DDL, Snowflake/Oracle `INFORMATION_SCHEMA` exports, Salesforce describe JSON, SAP table/field dictionary exports, generic CSV/JSON schema files.
10. Live read-only metadata pull (flagged per connector): Salesforce, Snowflake, Databricks via Lovable connector gateway; Oracle and SAP via customer-supplied service credentials stored as secrets.
11. Canonical metadata model (`source_systems`, `source_objects`, `source_fields`, `source_relationships`, `metadata_snapshots`) with drift detection between snapshots.
12. Auto-suggested source-to-canonical mappings from ingested metadata, labelled "AI Suggested" with rationale, confidence and accept/edit/reject → audit.

**Operations**
13. Test suite: unit tests for engines (`scoring`, `trustEngine`, `agentforceEngine`, `connectivityEngine`, `identityEngine`, `lifecycleGate`), integration tests for RLS, smoke E2E for the main flows.
14. Observability: error boundary + client error reporting, edge function structured logging, connector run history.
15. Performance: pagination and server-side filtering on portfolio, audit, catalog and mapping tables.
16. Accessibility and responsive audit; loading/empty/error states verified on every route.
17. Onboarding: client provisioning wizard, seed-data toggle so demo content is opt-in per client.
18. Docs: admin guide, connector setup runbook, data retention and audit policy.

## Implementation plan

### Stage 1 — Tenancy and access control (foundation, blocks everything else)
- `clients` and `client_members` tables (client, user, role, status). Replace `is_techmahindra_user()` in every policy with a `has_client_access(client_id)` / `has_client_role(client_id, role)` security-definer pair.
- Retire blanket role grants; roles assigned per client by a client admin.
- Add Google sign-in alongside domain-restricted email/password; keep the existing login layout.
- Backfill existing agent rows to a default client. Run the security linter and scan; fix all findings.

**Isolation note:** true schema-per-client provisioning is not available on this managed backend. Stage 1 delivers logical isolation that is enforceable and testable (membership-scoped RLS + per-client keys on every table), and every table is namespaced by `client_id` so a later physical split per client stays possible. If hard physical separation is a contractual requirement, that becomes a separate infrastructure track.

### Stage 2 — Migrate Phase 1 workspace to the server
- Tables: `initiatives`, `stage_tasks`, `milestones`, `risks`, `approvals`, `comments`, `notifications`, `templates`, `artifacts`.
- Swap `mockRepositories.ts` for a Supabase implementation behind the existing `IntegrationAdapter` contract, so pages and hooks keep their imports.
- Server-side stage transitions and approval decisions in an `initiative-workflow` edge function with Zod validation and role checks.
- Audit every mutation through the existing `activity_log`.

### Stage 3 — Migrate Phases 2–5
- Assessments and ADRs; data products, quality rules and mappings; connectivity decisions and identity policies; trust controls, evidence, tests, governance and the risk register.
- Add version snapshot + approval history to data products, mappings, ADRs, identity policies and controls, reusing the agent versioning pattern.
- Keep the engines pure; they continue to receive data as arguments.

### Stage 4 — Metadata connector framework
- Canonical metadata tables plus `connector_configs` and `connector_runs` (status, counts, duration, error, snapshot hash).
- `metadata-import` edge function: parsers for Oracle/Snowflake DDL, Snowflake and Oracle `INFORMATION_SCHEMA` CSV/JSON, Salesforce `describe` JSON, SAP DD03L/DD02L-style dictionary exports, and generic JSON schema. Upload via a private storage bucket.
- Connector UI: source system registry, import wizard with preview and diff, run history, drift report against the previous snapshot.

### Stage 5 — Live connectors (feature-flagged per connector)
- Salesforce, Snowflake and Databricks through the Lovable connector gateway (read-only metadata endpoints: `sobjects/describe`, `INFORMATION_SCHEMA`, Unity Catalog).
- Oracle and SAP via customer-supplied read-only service accounts held as backend secrets, called from `metadata-pull` with a strict allowlist of read-only statements — no user-supplied SQL.
- Scheduled refresh, per-run audit entries, and automatic mapping suggestions fed into the Phase 3 mapping workbench.

### Stage 6 — Quality, observability and rollout
- Vitest unit tests for all engines; RLS integration tests proving cross-tenant reads fail; Playwright smoke run covering login → initiative → data product → agent → export → approval.
- Global error boundary, client error reporting, structured edge function logs, connector run alerting.
- Server-side pagination and filtering on the heavy tables; index review and slow-query check.
- Provisioning wizard, opt-in demo seed, admin/runbook documentation, then publish.

## Technical notes

- Every new `public` table ships with GRANTs, RLS enabled and membership-scoped policies in the same migration.
- All enforcement (approvals, gates, authorization, connector runs, imports) lives in edge functions with Zod validation and in-code JWT verification, so the browser cannot bypass rules.
- Connector credentials are backend-only secrets or gateway connection keys; nothing provider-related is read in browser code.
- Existing engine modules and UI components are extended, not rebuilt; the repository/service boundary stays the seam for each migration.

## Sequencing and effort

Stages 1 → 2 → 3 are strictly sequential (RLS shape must land before data moves). Stage 4 can start in parallel with Stage 3. Stage 5 needs Stage 4's canonical model. Stage 6 runs continuously and closes the rollout. Suggested split into shippable increments: Stage 1 alone, then Stage 2+3, then Stage 4+5, then Stage 6 as the go-live gate.
