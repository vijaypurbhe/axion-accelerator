import {
  Activity,
  Bot,
  Boxes,
  Building2,
  ClipboardCheck,
  Database,
  FileStack,
  Gauge,
  LayoutDashboard,
  Library,
  Network,
  Rocket,
  ScrollText,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  readonly title: string;
  readonly url: string;
  readonly icon: LucideIcon;
  readonly group: "Workspace" | "Design & Build" | "Assurance" | "Operate" | "Platform";
}

export const NAV_ITEMS: readonly NavItem[] = [
  { title: "Portfolio", url: "/portfolio", icon: LayoutDashboard, group: "Workspace" },
  { title: "Initiatives", url: "/initiatives", icon: Boxes, group: "Workspace" },
  { title: "Assessments", url: "/assessments", icon: Gauge, group: "Workspace" },
  { title: "Architecture", url: "/architecture", icon: Network, group: "Design & Build" },
  { title: "Data Products", url: "/data-products", icon: Database, group: "Design & Build" },
  { title: "Connectivity", url: "/connectivity", icon: Building2, group: "Design & Build" },
  { title: "Identity", url: "/identity", icon: Users, group: "Design & Build" },
  { title: "Trust & Compliance", url: "/trust-compliance", icon: ShieldCheck, group: "Assurance" },
  { title: "Governance & Risk", url: "/governance-risk", icon: ClipboardCheck, group: "Assurance" },
  { title: "Agentforce Studio", url: "/agentforce-studio", icon: Bot, group: "Design & Build" },
  { title: "Validation", url: "/validation", icon: ClipboardCheck, group: "Assurance" },
  { title: "Deployment & Outputs", url: "/deployment", icon: Rocket, group: "Operate" },
  { title: "Monitoring", url: "/monitoring", icon: Activity, group: "Operate" },
  { title: "Templates", url: "/templates", icon: FileStack, group: "Platform" },
  { title: "Administration", url: "/administration", icon: Settings, group: "Platform" },
  { title: "Audit Trail", url: "/audit", icon: ScrollText, group: "Platform" },
];

export const NAV_GROUPS: readonly NavItem["group"][] = [
  "Workspace",
  "Design & Build",
  "Assurance",
  "Operate",
  "Platform",
];

export const LEGACY_LINKS: readonly NavItem[] = [
  { title: "Lifecycle workbench", url: "/lifecycle/discover", icon: Library, group: "Platform" },
  { title: "AI Recommendations", url: "/ai-recommendations", icon: Library, group: "Platform" },
  { title: "Platform Catalog", url: "/catalog", icon: Library, group: "Platform" },
];

/** Breadcrumb label lookup for the current path. */
export const labelForPath = (pathname: string): string | undefined =>
  [...NAV_ITEMS, ...LEGACY_LINKS].find((item) => pathname === item.url || pathname.startsWith(`${item.url}/`))?.title;
