# Axion Multi-Vertical Expansion: Manufacturing & Automotive

Axion today is a single-vertical accelerator: BFSI content is hardcoded across seeds, catalogs, question banks and templates, while HLS/RCPG exist only as disabled placeholders. This plan turns the vertical into a first-class, data-driven dimension and ships two new industry packs — **Manufacturing (MFG)** and **Automotive (AUTO)** — at full parity with BFSI.

Confirmed decisions: two separate verticals; industry is set per client workspace and every engine/catalog filters to it; full content parity with BFSI in this release.

## How vertical selection works

- Industry stays an attribute of the **client workspace**, chosen in the New Client wizard (already wired to the industry catalog). AUTO clients also pick a sub-segment (OEM, Tier-1/2 supplier, dealer group, captive finance, mobility services); MFG clients pick discrete, process, industrial equipment or aftermarket.
- Every downstream module reads the active client's industry from workspace context and filters content: assessment questions, data product templates, source/connector catalogs, identity templates, trust controls, governance profiles, architecture components, agent patterns and simulation scenarios.
- A read-only **industry badge** appears in the app shell next to the client selector so users always know which pack is active. Reference pages (Platform catalog, Data Product Library, Agent patterns) get an industry filter chip so users can browse other packs without changing workspace.
- Portfolio filters, currently hardcoded to a single BFSI option, become driven by the industry registry so mixed portfolios work side by side.
- Cross-industry content stays visible in every vertical; only vertical-specific items are gated.

## What gets built, module by module

**1. Industry foundation**
- Extend the industry type to `BFSI | HLS | RCPG | MFG | AUTO`, enable MFG and AUTO in the registry with sub-segment lists, and replace ad-hoc applicability strings with the shared industry keys.
- Add an `industryPacks` registry that declares, per vertical: display name, sub-segments, default regulatory jurisdictions, canonical domains, priority use-case themes and accent copy.
- Fix the two places that hardcode BFSI regardless of context (metadata import synthesising data products; governance applicability seeding) so they inherit the active client's industry.

**2. Discover & Assess**
- Add MFG and AUTO question sets to the assessment bank (shop-floor/MES data readiness, PLM and BOM governance, supplier master quality, IoT/telematics ingest volume, dealer network data ownership, warranty/claims data lineage, connected-vehicle consent), each tagged to its vertical with cross-industry questions retained.
- Extend maturity dimensions with vertical weightings so scoring reflects industry-specific priorities (e.g. asset/telemetry readiness for MFG, consent and dealer data sharing for AUTO).

**3. Design — architecture & data products**
- Add source platforms and catalog components: MES/SCADA, PLM (Teamcenter/Windchill class), ERP shop-floor modules, CMMS/EAM, IoT platforms, telematics/connected-car platforms, DMS (dealer management), warranty systems, parts catalogs, supplier portals — each with supported ingestion patterns (streaming for telemetry, zero-copy for lakehouse asset history).
- Tag Salesforce products by vertical: Manufacturing Cloud, Automotive Cloud, Field Service, Revenue Cloud, Sales/Service/Marketing Cloud, Data 360, Agentforce, Tableau, Shield.
- Author MFG and AUTO data product template packs mirroring the BFSI depth: Account/Customer 360, Vehicle 360 (VIN-keyed), Asset & Equipment 360, Supplier 360, Dealer 360, Sales Agreement & Order Book, Parts & Inventory, Production & Quality, Warranty & Claims, Service Visit History, Telematics Event Stream, Aftermarket Propensity.
- Extend the architecture recommender with vertical-aware rules: telemetry volume favours streaming plus zero-copy over the lakehouse; dealer data sharing introduces partner-scoped activation and residency routing.

**4. Configure — connectivity & identity**
- Add connectivity decision criteria for high-volume time-series telemetry, plant-network egress constraints and batch windows tied to production schedules.
- Add identity template packs: VIN as primary vehicle key with household/fleet rollup, dealer-to-owner relationship resolution, supplier/site hierarchy matching, asset serial-to-installed-base matching, plus B2B2C reconciliation between OEM, dealer and end customer.

**5. Validate, Trust & Governance**
- Extend the trust control library triggers so existing controls apply to MFG/AUTO and add vertical controls: connected-vehicle telemetry consent, export-control and ITAR-sensitive engineering data, product safety/recall traceability, supplier confidentiality, GDPR/CCPA vehicle-data handling, dealer data-sharing agreements.
- Add MFG/AUTO governance profiles, RACI patterns (Quality, Manufacturing IT/OT, Dealer Operations, Product Safety roles) and vertical risk-register entries.
- Extend data quality rule packs for BOM completeness, VIN validity, serial uniqueness and warranty-claim referential integrity.

**6. Agentforce Studio**
- Add MFG agent patterns: Order Promise & Fulfilment agent, Supplier Quality Triage agent, Field Service Dispatch agent, Aftermarket Parts Advisor.
- Add AUTO agent patterns: Vehicle Owner Service agent, Dealer Sales Assistant, Warranty & Recall agent, Connected-Vehicle Support agent — each with topics, actions, grounding on the new data products, guardrails, escalation paths and test suites at BFSI parity.

**7. Simulation & Training**
- Add two demo client workspaces (a global automotive OEM with dealer network, and an industrial equipment manufacturer) with initiatives, tasks, decisions, risks, approvals, data products and agents, all flagged as demo so delivery workspaces stay empty.
- Add per-vertical guided paths and role checklists so onboarding reflects the chosen industry.

**8. Cross-cutting UI**
- Industry badge in the shell; industry filters on Portfolio, Platform Catalog, Data Product Library and Agent Portfolio; empty states and wizard defaults that adapt to the active vertical.

## Technical notes

- Industry stays a plain text column on the client record, so no destructive schema change is needed; a lightweight migration adds a check-free default and seeds the two demo clients with their industry values.
- New content lands as sibling data packs (`manufacturingSeed`, `automotiveSeed`, plus MFG/AUTO spec arrays in the existing library files) rather than edits to BFSI content — no existing feature or seed is removed or simplified.
- Engines that already filter on data (trust engine, template library) need only data additions; the recommender, connectivity and identity engines get additive vertical rule branches.
- The `applicability` union used by the assessment bank is replaced by an industry-keyed field shared with the industry registry, keeping one source of truth.
- Vitest coverage: registry completeness per vertical, assessment filtering, template filtering, trust-control applicability, and recommender output for a telemetry-heavy AUTO input.

## Sequencing

1. Industry foundation, registry, badge, filters and BFSI-hardcode fixes (no behaviour change for existing BFSI clients).
2. Assess + Design packs (questions, sources, architecture, data products).
3. Configure packs (connectivity criteria, identity templates).
4. Trust, governance and data quality packs.
5. Agentforce patterns.
6. Simulation workspaces, guided paths and tests.
