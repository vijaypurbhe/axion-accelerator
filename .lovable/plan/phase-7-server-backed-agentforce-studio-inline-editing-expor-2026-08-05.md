# Phase 7 — Server-Backed Agentforce Studio, Inline Editing, Export Jobs, Approval Workflow

Moves Agentforce Studio (Phase 6) off browser-only storage onto the Lovable Cloud backend, adds real editing of design objects, server-generated export artifacts, and an enforced approval/authorization workflow.

## 1. Real sign-in (prerequisite)

Server persistence needs a real identity, but today the app stores a fake session in the browser (any `@techmahindra.com` email, persona chosen from a dropdown).

- Replace the demo sign-in with real email/password auth against Lovable Cloud, keeping the `@techmahindra.com` restriction and the same login screen layout.
- Add a `profiles` table (display name, email, default persona) plus an `app_role` roles table so persona/RACI checks are server-enforced instead of client-chosen.
- Persona switching stays available, but only across roles the signed-in user actually holds; a demo "all personas" role is granted to anyone in the domain so existing walkthroughs still work.

## 2. Server-backed persistence

New tables, all tenant/initiative scoped with row-level security:

- `agents` — the full agent design record (overview, instructions, consumption, status, version, risk, release).
- `agent_topics`, `agent_actions`, `agent_grounding`, `agent_guardrails`, `agent_escalations`, `agent_boundaries` — one row per design object so inline edits are atomic.
- `agent_versions` — immutable version snapshots (version label, summary, object counts, full JSON payload, content hash).
- `agent_reviews` — approval history: stage, reviewer, role, outcome, comments, decided-at.
- `agent_suggestion_decisions` — AI suggestion accept/edit/reject records with rationale and confidence.
- `activity_log` — queryable audit trail (tenant, initiative, object type/id, action, old/new summary, actor, role, timestamp).

Behaviour:

- `phase6Store` is replaced by a Supabase-backed repository behind the existing service boundary, so pages and hooks keep their current imports.
- Seeded BFSI agents (Banker Assist, Customer Service, KYC Support, Next-Best-Action) are inserted server-side once per initiative so the demo still opens with data.
- Audit page gains server-side filters: object type, action, actor, role, date range, plus text search and pagination.

## 3. Inline editing with validation

Topics, actions, grounding sources and guardrails become editable in the workbench:

- Each tab gets a row-level edit drawer with typed fields (selects for enums, multi-entry lists for utterances/instructions/parameters, control pickers sourced from the Trust Control Library).
- Create, edit, duplicate and delete for each object type, with optimistic UI and rollback on failure.
- Zod schemas validate on the client and again in the edge function that writes; blocked saves show field-level errors.
- Cross-object referential checks: a topic cannot reference a deleted action, an action cannot be marked critical without a mapped control, grounding classified `regulated` requires an identity requirement.
- Readiness score, topic diagnostics, traceability matrix and consumption scenarios recompute immediately after every successful save, and each save writes an audit entry with before/after summaries.
- Editing is blocked once an agent reaches `approved` or later; changes then require a new version (change-impact analysis is shown before the snapshot).

## 4. Server-generated exports

- New `agent-export` edge function renders the design specification (Markdown), traceability matrix (CSV) and optional PDF from the same server-side data.
- `export_jobs` table tracks each request: requested-by, format, status (`queued` → `running` → `complete`/`failed`), content hash, byte size, storage path, error text.
- Artifacts are written to a private storage bucket; downloads use short-lived signed URLs.
- Content hash is a SHA-256 of the canonical JSON payload, so re-exporting unchanged data returns the same hash and the existing artifact is reused.
- Workbench gains an Exports panel: request an export, watch job status, download or re-run, and see the hash next to each artifact for evidence purposes.

## 5. Approval workflow, authorization and stage gates

- `approval_requests` table: agent, stage, requested-by, required roles, current state, due-by.
- Required approvers per stage are derived from the existing RACI model in the governance seed (for example Design review → Enterprise Architect + Data Steward; Deploy → Executive Sponsor).
- Only users holding the required role can record an outcome; the action is hidden and additionally rejected server-side for everyone else.
- Agent action authorization: each `agent_actions` row carries an authorization state (`unauthorized`, `pending`, `authorized`) — high/critical-risk actions cannot be authorized without a mapped Trust Control and a passing test.
- Stage-gate enforcement before an agent can advance status: readiness threshold met, zero blockers, all critical actions authorized, required approvals recorded. Failed checks are listed with the specific reason and a link to the offending object.
- Every approval, rejection and authorization change is written to the audit trail.

## Technical notes

- Database access goes through Supabase with RLS on every table; policies scope reads and writes to the signed-in user's tenant and, for approvals, to the required role via a `has_role` security-definer function.
- Writes that carry enforcement rules (approvals, authorization, status advance, exports) go through edge functions with Zod validation and JWT verification in code, so the rules cannot be bypassed from the browser.
- Existing engines (`agentforceEngine`, `trustEngine`, `lifecycleGate`, `scoring`) are reused unchanged; they stay pure functions fed by server data.
- Phases 1–5 modules keep their current mock repositories; only Phase 6 plus the audit trail moves to the server in this phase.
- No PDF library is currently in the project; PDF rendering is added in the edge function and is optional per export request.

## Out of scope

- Migrating Phases 1–5 data (assessments, data products, connectivity, identity, trust, governance) to the server.
- Real Salesforce or Agentforce deployment.
- Email notifications for pending approvals.
