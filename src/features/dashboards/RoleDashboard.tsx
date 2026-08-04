import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { SectionCard } from "@/components/enterprise/Layout";
import { MetaPill } from "@/components/enterprise/Badges";
import { getRole, PERMISSION_LABELS } from "@/domain/rbac";
import type { PersonaId } from "@/domain/types";

interface RolePanel {
  readonly headline: string;
  readonly focus: readonly string[];
  readonly nextBestActions: readonly { readonly label: string; readonly to: string }[];
}

const PANELS: Record<PersonaId, RolePanel> = {
  "executive-sponsor": {
    headline: "Value, funding and stage-gate posture across the portfolio.",
    focus: ["Business case and benefit tracking", "Stage-gate approvals", "Risk and regulatory exposure"],
    nextBestActions: [
      { label: "Review approval queue", to: "/approvals" },
      { label: "Open portfolio risks", to: "/risks" },
    ],
  },
  "enterprise-architect": {
    headline: "Target architecture coherence and platform decisions.",
    focus: ["Architecture decision records", "Source platform landscape", "Integration patterns"],
    nextBestActions: [
      { label: "Open decision log", to: "/decisions" },
      { label: "Review platform catalog", to: "/catalog" },
    ],
  },
  "data360-architect": {
    headline: "Data 360 blueprint, DLO/DMO alignment and identity strategy.",
    focus: ["Canonical domain model", "Source-to-target mapping", "Identity resolution rulesets"],
    nextBestActions: [
      { label: "Open data products", to: "/data-products" },
      { label: "Continue Design stage", to: "/lifecycle/design" },
    ],
  },
  "data-steward": {
    headline: "Data quality, ownership and regulatory control evidence.",
    focus: ["Data quality states", "Retention and consent controls", "Glossary stewardship"],
    nextBestActions: [
      { label: "Review governance controls", to: "/governance" },
      { label: "Open Validate stage", to: "/lifecycle/validate" },
    ],
  },
  "data-engineer": {
    headline: "Ingestion, pipelines and cached acceleration workloads.",
    focus: ["Connection health", "Physical vs zero-copy patterns", "Transformation build queue"],
    nextBestActions: [
      { label: "Open connections", to: "/connections" },
      { label: "Open Configure stage", to: "/lifecycle/configure" },
    ],
  },
  "agentforce-architect": {
    headline: "Agent design, grounding and trust-layer readiness.",
    focus: ["Agent topics and actions", "Grounding data coverage", "Trust layer guardrails"],
    nextBestActions: [
      { label: "Open agent designs", to: "/agents" },
      { label: "Open Deploy stage", to: "/lifecycle/deploy" },
    ],
  },
};

export const RoleDashboard = ({ role, children }: { role: PersonaId; children?: ReactNode }) => {
  const panel = PANELS[role];
  const roleDefinition = getRole(role);

  return (
    <SectionCard
      title={`${roleDefinition?.name ?? "Role"} view`}
      description={panel.headline}
      actions={<MetaPill>Role-aware</MetaPill>}
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Focus areas</p>
          <ul className="mt-2 space-y-1.5 text-sm text-foreground">
            {panel.focus.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Next best actions</p>
          <ul className="mt-2 space-y-1.5 text-sm">
            {panel.nextBestActions.map((action) => (
              <li key={action.to}>
                <Link to={action.to} className="text-primary underline-offset-4 hover:underline">
                  {action.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Permissions</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {(roleDefinition?.permissions ?? []).map((permission) => (
              <MetaPill key={permission}>{PERMISSION_LABELS[permission]}</MetaPill>
            ))}
          </div>
        </div>
      </div>
      {children}
    </SectionCard>
  );
};

export default RoleDashboard;
