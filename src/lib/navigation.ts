import {
  Building2,
  FileText,
  FolderKanban,
  Gauge,
  Handshake,
  LayoutDashboard,
  LifeBuoy,
  Layers,
  Network,
  ScrollText,
  ShieldCheck,
  SlidersHorizontal,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import type { Persona } from "@/types";

export type NavItem = { key: string; to: string; label: string; icon: LucideIcon };

/** Core destinations that every persona keeps. */
export const CORE_NAV: NavItem[] = [
  { key: "/home", to: "/home", label: "Command Center", icon: LayoutDashboard },
  { key: "/clients", to: "/clients", label: "Clients", icon: Building2 },
  { key: "/projects", to: "/projects", label: "Projects", icon: FolderKanban },
  { key: "/analytics", to: "/analytics", label: "Analytics", icon: Gauge },
];

/**
 * Persona focus modules. Each maps to a built page with a view parameter so the
 * left pane reflects the persona's day-to-day workspace.
 */
const FOCUS: Record<string, NavItem> = {
  "/relationships": { key: "/relationships", to: "/clients?view=relationships", label: "Relationships", icon: Handshake },
  "/pipeline": { key: "/pipeline", to: "/projects?view=pipeline", label: "Pipeline", icon: TrendingUp },
  "/due-diligence": { key: "/due-diligence", to: "/projects?view=diligence", label: "Due Diligence", icon: ScrollText },
  "/approvals": { key: "/approvals", to: "/projects?view=approvals", label: "Approvals", icon: ShieldCheck },
  "/documents": { key: "/documents", to: "/projects?view=documents", label: "Documents", icon: FileText },
  "/exposure": { key: "/exposure", to: "/exposure", label: "Exposure & Compliance", icon: Layers },
  "/portfolio": { key: "/portfolio", to: "/analytics?view=portfolio", label: "Portfolio", icon: Gauge },
  "/governance": { key: "/governance", to: "/analytics?view=governance", label: "Governance", icon: ShieldCheck },
  "/service": { key: "/service", to: "/clients?view=service", label: "Service & Cases", icon: LifeBuoy },
  "/integration": { key: "/integration", to: "/analytics?view=integration", label: "Integration Health", icon: Network },
  "/migration": { key: "/migration", to: "/analytics?view=migration", label: "Migration Readiness", icon: SlidersHorizontal },
};

export function navForPersona(persona: Persona): { core: NavItem[]; focus: NavItem[] } {
  const emphasis = persona.navEmphasis ?? [];
  const rank = (key: string) => {
    const i = emphasis.indexOf(key);
    return i === -1 ? 99 : i;
  };
  const core = [...CORE_NAV].sort((a, b) => {
    if (a.key === "/home") return -1;
    if (b.key === "/home") return 1;
    return rank(a.key) - rank(b.key);
  });
  const focus = emphasis.map((key) => FOCUS[key]).filter(Boolean) as NavItem[];
  return { core, focus };
}
