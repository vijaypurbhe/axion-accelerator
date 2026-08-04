import { NavLink, useLocation } from "react-router-dom";
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
import { LEGACY_LINKS, NAV_GROUPS, NAV_ITEMS, type NavItem } from "@/app/navigation";

export const AppSidebar = () => {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();

  const renderGroup = (label: string, items: readonly NavItem[]) => (
    <SidebarGroup key={label}>
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

        {NAV_GROUPS.map((group) =>
          renderGroup(
            group,
            NAV_ITEMS.filter((item) => item.group === group),
          ),
        )}
        {renderGroup("Reference", LEGACY_LINKS)}
      </SidebarContent>
    </Sidebar>
  );
};

export default AppSidebar;
