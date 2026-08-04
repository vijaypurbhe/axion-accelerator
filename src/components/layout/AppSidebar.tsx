import { NavLink, useLocation } from "react-router-dom";
import {
  Activity,
  Boxes,
  CheckCircle2,
  ClipboardCheck,
  Compass,
  Gauge,
  LayoutDashboard,
  Library,
  Rocket,
  Settings2,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Workflow,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

interface NavItem {
  readonly title: string;
  readonly url: string;
  readonly icon: LucideIcon;
}

const PROGRAM_ITEMS: readonly NavItem[] = [
  { title: "Command Overview", url: "/overview", icon: LayoutDashboard },
  { title: "Clients & Programs", url: "/programs", icon: Boxes },
];

const LIFECYCLE_ITEMS: readonly NavItem[] = [
  { title: "Discover", url: "/lifecycle/discover", icon: Compass },
  { title: "Assess", url: "/lifecycle/assess", icon: Gauge },
  { title: "Design", url: "/lifecycle/design", icon: Workflow },
  { title: "Configure", url: "/lifecycle/configure", icon: Settings2 },
  { title: "Validate", url: "/lifecycle/validate", icon: ClipboardCheck },
  { title: "Approve", url: "/lifecycle/approve", icon: CheckCircle2 },
  { title: "Deploy", url: "/lifecycle/deploy", icon: Rocket },
  { title: "Monitor", url: "/lifecycle/monitor", icon: Activity },
  { title: "Improve", url: "/lifecycle/improve", icon: TrendingUp },
];

const GOVERNANCE_ITEMS: readonly NavItem[] = [
  { title: "AI Recommendations", url: "/ai-recommendations", icon: Sparkles },
  { title: "Audit Trail", url: "/audit", icon: ShieldCheck },
  { title: "Platform Catalog", url: "/catalog", icon: Library },
];

export const AppSidebar = () => {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();

  const renderGroup = (label: string, items: readonly NavItem[]) => (
    <SidebarGroup>
      <SidebarGroupLabel className="text-[11px] uppercase tracking-[0.14em] text-sidebar-foreground/70">
        {label}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const active = pathname === item.url || pathname.startsWith(`${item.url}/`);
            return (
              <SidebarMenuItem key={item.url}>
                <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                  <NavLink to={item.url} className="flex items-center gap-2">
                    <item.icon className="h-4 w-4 shrink-0" aria-hidden />
                    {!collapsed && <span className="truncate">{item.title}</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarContent className="pt-3">
        <div className={cn("px-3 pb-2", collapsed && "px-2")}>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
              AX
            </span>
            {!collapsed && (
              <span className="text-sm font-semibold leading-tight text-sidebar-foreground">
                Axion
                <span className="block text-[10px] font-normal uppercase tracking-widest text-sidebar-foreground/60">
                  Tech Mahindra
                </span>
              </span>
            )}
          </div>
        </div>
        {renderGroup("Program", PROGRAM_ITEMS)}
        {renderGroup("Lifecycle", LIFECYCLE_ITEMS)}
        {renderGroup("Governance", GOVERNANCE_ITEMS)}
      </SidebarContent>
    </Sidebar>
  );
};

export default AppSidebar;
