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
import axionLogo from "@/assets/axion-logo.png.asset.json";
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
          <img
            src={axionLogo.url}
            alt="Axion Data Accelerator by Tech Mahindra"
            className={cn("w-auto", collapsed ? "h-7" : "h-9")}
            style={collapsed ? { objectFit: "cover", objectPosition: "left", width: "1.75rem" } : undefined}
          />
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
