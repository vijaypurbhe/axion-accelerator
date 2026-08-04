# Tech Mahindra Axion — Phase 0: Hollow Out + Platform Foundation

This phase removes the inherited demo application and replaces it with the Axion shell: branding, tenant hierarchy, lifecycle navigation, persona model, service/repository abstractions, and the AI-suggestion + audit primitives every later phase plugs into. No use-case functionality is built yet — Phase 0 is the skeleton all later phases extend without rework.

## What gets removed

The existing project is a World Bank-style client/project demo (`Home`, `ClientsPage`, `ClientDetailPage`, `ProjectsPage`, `ProjectDetailPage`, `AnalyticsPage`, `ExposureCompliancePage`, `DocumentReviewPage`, `SearchPage`, `PhoenixContext`, its analytics components, mock data and services). All of it is deleted. The shadcn UI primitives in `src/components/ui`, Tailwind setup, router, and query client are kept and rebranded.

The existing `agent-chat` backend function is left in place, untouched and unused, so a later phase can repurpose it for AI recommendations.

## Axion foundation delivered in Phase 0

**Branding and design system**
- White background, Tech Mahindra red as the single accent, charcoal/slate typography, restrained blue-grey architectural accents, all as semantic tokens in `index.css` + Tailwind config. No hardcoded colors in components.
- Desktop-first layout: fixed top bar (product mark, tenant switcher, persona switcher, environment badge), collapsible left navigation, content canvas with page header + breadcrumb.

**Tenant hierarchy and context**
- Typed model for Tenant/Client → Program/Initiative → Domain/Workstream → Use Case → Release/Version.
- A single app context provides the active tenant, program, persona and industry (BFSI now, HLS/RCPG declared but disabled). Logical isolation: every repository read/write is scoped by tenant id, no cross-tenant reads.
- Selection persists in the URL where it affects the page (`/t/:tenantId/...`) so links and reloads are stable.

**Lifecycle navigation**
- Discover → Assess → Design → Configure → Validate → Approve → Deploy → Monitor → Improve rendered as a reusable lifecycle stepper and as the primary nav.
- Each stage gets a placeholder route with a proper "not yet configured" empty state naming which phase will deliver it. No fake data pretending to be a feature.

**Catalogs (typed, seeded reference data)**
- Personas: Executive Sponsor, Enterprise Architect, Data 360 Architect, Data Steward, Data Engineer, Agentforce Architect.
- Salesforce products in scope: Data 360/Data Cloud, Agentforce, Sales, Service, Marketing, Financial Services Cloud, Health Cloud, Consumer Goods Cloud, Loyalty Management, Tableau, Shield. Explicitly excluded (MuleSoft, Data Mask, Privacy Center, DevOps Center) are recorded as out-of-scope so nothing later surfaces them.
- Source platforms: Salesforce, Snowflake, Databricks, AWS, Azure, SAP, Oracle, core banking, commerce, loyalty.
- Platform concepts (blueprinting, canonical modeling, mapping, DLO/DMO alignment, ingestion, zero-copy, cached acceleration, identity resolution, unified profiles, activation, Agentforce, trust layer, governance, testing, artifacts, monitoring) as a typed registry later phases reference instead of restating strings.

**Data access abstraction**
- `Repository` interfaces per aggregate, with a `MockAdapter` (JSON seed) and a `LiveAdapter` stub selected by environment config. UI and feature code only ever touch service functions, never an adapter directly — so swapping to a real backend or another cloud is a config change.
- React Query wrappers with real loading, error and empty states.

**AI suggestion + audit primitives**
- An `AiSuggestion<T>` type carrying value, rationale, confidence and status, plus a shared `AiSuggestionCard` that always shows the "AI Suggested" label, rationale, confidence, and Accept / Edit / Reject actions.
- Every accept/edit/reject writes an audit entry (actor, persona, tenant, entity, before/after, timestamp) through an audit service, surfaced in a reusable audit trail panel. Later phases reuse these instead of inventing their own.

**Auth**
- Simple persona/email sign-in gate retained so the shell is protected and the persona switcher has a source of truth. No new backend auth in this phase.

## Technical notes

- Vite + React + TypeScript SPA, React Router, Tailwind, strict typing (no `any` in domain models).
- Feature-oriented structure: `src/features/<capability>/{components,hooks,services,types}`, shared enterprise components in `src/components/enterprise`, domain types in `src/domain`, adapters in `src/adapters`, config in `src/config`.
- Configuration models are structured JSON with typed parsers, so blueprints/mappings authored in later phases are serializable and portable.
- No cloud-vendor-specific SDK calls in UI code.

## Phase exit checks

Run the build, fix all TypeScript and runtime errors, click through every route and the tenant/persona switchers in the preview, then report: files and components added, and the list of mocked functions and deferred backend capabilities (recommendation generation, artifact export, real deployment/monitoring telemetry, persistence).

Later phases (Discover/Assess questionnaires and scoring, Design blueprinting and canonical modeling, Configure mapping and Data 360 alignment, Validate/Approve, Deploy, Monitor/Improve) extend this foundation additively — nothing delivered here is rebuilt.
