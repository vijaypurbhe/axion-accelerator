# Clean Product + Simulation & Training Module

Today every client workspace is auto-filled with the BFSI walkthrough content (NorthStar Bank, Meridian Assurance, seeded initiatives, assessments, agents, risks) because `ensureSeeded` runs for all workspaces. This plan moves that content behind a dedicated Simulation & Training area, leaves real workspaces genuinely empty, and gives each role a guided first-run path plus a persistent checklist.

## 1. Simulation & Training module

- New sidebar entry **Simulation & Training** (Platform group) with a landing page listing the available BFSI scenarios: what each demonstrates, personas involved, lifecycle stages covered.
- The two demo clients become simulation workspaces: clearly badged "Simulation", excluded from the normal workspace selector, and enterable only from this module.
- Inside a simulation workspace, a persistent banner states "Simulation workspace — content is training data, not client deliverables" and every export is watermarked as training material.
- Per-scenario actions: **Enter**, **Reset scenario** (restore seed content to pristine state), and a guided "walk this scenario" list of steps that deep-link into the relevant modules in lifecycle order.
- Role-based training tracks: pick a persona and get the ordered set of screens and tasks that role owns, so a new joiner can rehearse the full path in a safe workspace.

## 2. Keep the real product clean

- Seeding no longer runs for non-simulation workspaces. New clients start with zero initiatives, assessments, data products, agents, risks and audit noise.
- Reference catalogs stay available everywhere (they are product content, not demo data): assessment question bank, canonical data product templates, source/connector catalog, trust control library, architecture patterns, identity rule templates, lifecycle definitions.
- Every module gets a real empty state: what the artefact is, what it needs first, a primary "Create" action, a "Start from template" action where a catalog exists, and a secondary link to see it in Simulation.
- Downstream modules are lifecycle-gated: when prerequisites are missing they render a locked state naming exactly what is required (for example Identity requires at least one data product with mapped sources; Agentforce Studio requires an approved architecture blueprint and grounding data product). Locks are advisory for admins with an override that is recorded in the activity log.

## 3. First-run path per role

**Sign-in wizard** (once per user, resumable):
1. Confirm identity and choose primary role from the six personas.
2. Choose a path: join an existing client workspace, create a new client workspace, or start in Simulation & Training.
3. If creating: capture client name, industry (BFSI first), geography, then the first initiative with target release.
4. Land on the Portfolio page with the role checklist open.

**Persistent role checklist** on Portfolio, progress-tracked and auto-ticking as real records appear:

- Executive Sponsor: review portfolio posture, confirm business case, set stage-gate approvers, approve Discover exit.
- Enterprise Architect: register source platforms, run readiness assessment, create target blueprint, log first architecture decision.
- Data 360 Architect: pick canonical domains, create first data product, map sources, choose connectivity pattern, define identity ruleset.
- Data Steward: assign ownership, define quality rules, map regulatory controls, attach evidence.
- Data Engineer: connect sources, run metadata import, configure ingestion pattern, validate refresh.
- Agentforce Architect: define agent topics and actions, attach grounding, apply guardrails, submit for approval.

Each step shows status (not started / in progress / done), links to the exact screen, and offers "See this done in Simulation".

## Technical notes

- Database: add a `is_simulation` marker on client workspaces (reuse the existing `is_demo` flag on `clients`), plus a `user_onboarding` table (user id, chosen role, wizard step, completed steps array, dismissed flag) with RLS scoped to `auth.uid()` and the required GRANTs.
- `src/repositories/supabase/workspaceStore.ts`: gate `ensureSeeded` on the client's simulation flag; add `resetSimulationWorkspace(clientId)` that deletes `is_seed` records for that client and re-seeds. Same gating in `src/repositories/supabase/agentDesignStore.ts`.
- `src/context/AxionContext.tsx`: split available workspaces into delivery vs simulation, expose `isSimulationWorkspace`, and load onboarding state.
- New: `src/features/onboarding/FirstRunWizard.tsx`, `src/features/onboarding/RoleChecklist.tsx`, `src/features/onboarding/checklists.ts` (role step definitions with prerequisite predicates), `src/pages/simulation/SimulationHubPage.tsx`, `src/pages/simulation/ScenarioDetailPage.tsx`, `src/services/lifecycleLocks.ts` (prerequisite evaluation shared by module locks and checklist progress).
- Extend `src/components/enterprise/States.tsx` with the standard empty and locked state components used by every module page; add the simulation banner to `AppShell`.
- Routes added under `/simulation` and `/simulation/:scenarioId`; nav entry in `src/app/navigation.ts`.
- Existing seed files stay where they are and are re-labelled as simulation scenario sources; no content is deleted.
