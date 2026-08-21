import { Fragment, useEffect, useMemo, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { setAgentTenantContext } from "@/services/phase6";
import { Bell, ChevronRight, GraduationCap, HelpCircle, LogOut, Settings, UserCog } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import AppSidebar from "./AppSidebar";
import { SearchInput } from "@/components/enterprise/FilterBar";
import { Drawer } from "@/components/enterprise/Overlays";
import { useAxion } from "@/context/AxionContext";
import { useClients, useInitiatives, useNotifications } from "@/hooks/useWorkspace";
import { ROLES } from "@/domain/rbac";
import { labelForPath } from "@/app/navigation";
import { config } from "@/config";
import { relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { RoleId } from "@/domain/models";
import FirstRunWizard from "@/features/onboarding/FirstRunWizard";
import { useOnboardingState } from "@/features/onboarding/useOnboarding";


const Breadcrumbs = () => {
  const { pathname } = useLocation();
  const label = labelForPath(pathname);
  const segments = pathname.split("/").filter(Boolean);

  return (
    <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-1.5 text-xs text-muted-foreground lg:flex">
      <Link to="/portfolio" className="hover:text-foreground">
        Axion
      </Link>
      {label ? (
        <Fragment>
          <ChevronRight className="h-3 w-3" aria-hidden />
          <span className="truncate font-medium text-foreground">{label}</span>
        </Fragment>
      ) : null}
      {segments.length > 1 && label ? (
        <Fragment>
          <ChevronRight className="h-3 w-3" aria-hidden />
          <span className="truncate">{segments[segments.length - 1]}</span>
        </Fragment>
      ) : null}
    </nav>
  );
};

const NotificationBell = () => {
  const { activeClientId } = useAxion();
  const { data: notifications = [] } = useNotifications(activeClientId);
  const [open, setOpen] = useState(false);
  const unread = notifications.filter((item) => !item.read).length;

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
        className="relative"
        onClick={() => setOpen(true)}
      >
        <Bell className="h-4 w-4" aria-hidden />
        {unread > 0 ? (
          <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
            {unread}
          </span>
        ) : null}
      </Button>
      <Drawer open={open} onOpenChange={setOpen} title="Notifications" description="Workspace alerts and approvals.">
        {notifications.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing to review.</p>
        ) : (
          <ul className="space-y-3">
            {notifications.map((item) => (
              <li
                key={item.id}
                className={cn(
                  "rounded-lg border border-border bg-card p-3",
                  !item.read && "border-primary/30 bg-primary/5",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-foreground">{item.title}</p>
                  <Badge
                    variant="outline"
                    className={cn(
                      "shrink-0 text-[10px]",
                      item.severity === "critical" && "border-destructive/40 bg-destructive/10 text-destructive",
                      item.severity === "warning" && "border-warning/40 bg-warning/10 text-warning-foreground",
                    )}
                  >
                    {item.severity}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{item.body}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{relativeTime(item.createdAt)}</p>
              </li>
            ))}
          </ul>
        )}
      </Drawer>
    </>
  );
};

const TopBar = () => {
  const navigate = useNavigate();
  const {
    session,
    persona,
    roles,
    accessibleClientIds,
    activeClientId,
    activeInitiativeId,
    setActiveTenantId,
    setActiveInitiativeId,
    setPersona,
    signOut,
  } = useAxion();
  const { data: allClients = [] } = useClients();
  const { data: initiatives = [] } = useInitiatives(activeClientId);
  const [search, setSearch] = useState("");

  /** Only workspaces the signed-in user is a member of are selectable. */
  const clients = useMemo(
    () => allClients.filter((client) => accessibleClientIds.includes(client.id)),
    [allClients, accessibleClientIds],
  );

  const initiativeValue = useMemo(
    () => (activeInitiativeId && initiatives.some((i) => i.id === activeInitiativeId) ? activeInitiativeId : "none"),
    [activeInitiativeId, initiatives],
  );

  /** Only roles actually granted on the server for this workspace can be assumed. */
  const availableRoles = useMemo(() => ROLES.filter((role) => roles.includes(role.id as RoleId)), [roles]);

  useEffect(() => {
    setAgentTenantContext(activeClientId);
  }, [activeClientId]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };


  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
      <div className="flex h-14 items-center gap-3 px-4">
        <SidebarTrigger aria-label="Toggle navigation" />
        <Link to="/portfolio" className="hidden items-baseline gap-2 md:flex">
          <span className="whitespace-nowrap text-sm font-semibold tracking-tight text-foreground">
            Tech Mahindra <span className="text-primary">Axion</span>
          </span>
        </Link>

        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search clients, initiatives, data products"
          className="ml-2 hidden w-[280px] xl:block"
        />

        <div className="ml-auto flex items-center gap-2">
          <Badge variant="outline" className="hidden border-border text-muted-foreground 2xl:inline-flex">
            {config.environmentLabel} · {config.dataMode === "mock" ? "Demo data" : "Live data"}
          </Badge>

          <Select value={activeClientId} onValueChange={setActiveTenantId}>
            <SelectTrigger className="h-9 w-[200px]" aria-label="Active client">
              <SelectValue placeholder="Select client" />
            </SelectTrigger>
            <SelectContent>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name}
                  {client.isSimulation ? " · Training" : ""}
                </SelectItem>
              ))}
            </SelectContent>

          </Select>

          <Select
            value={initiativeValue}
            onValueChange={(value) => setActiveInitiativeId(value === "none" ? null : value)}
          >
            <SelectTrigger className="h-9 w-[220px]" aria-label="Active initiative">
              <SelectValue placeholder="Select initiative" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No initiative in context</SelectItem>
              {initiatives.map((initiative) => (
                <SelectItem key={initiative.id} value={initiative.id}>
                  {initiative.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <NotificationBell />

          <Button variant="ghost" size="icon" aria-label="Help" asChild>
            <Link to="/catalog">
              <HelpCircle className="h-4 w-4" aria-hidden />
            </Link>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Settings and account">
                <Settings className="h-4 w-4" aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>
                <p className="text-sm font-medium text-foreground">{session?.displayName}</p>
                <p className="text-xs font-normal text-muted-foreground">{session?.email}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                <UserCog className="h-3.5 w-3.5" aria-hidden /> Your roles
              </DropdownMenuLabel>
              {(availableRoles.length > 0 ? availableRoles : ROLES).map((role) => (
                <DropdownMenuItem
                  key={role.id}
                  onClick={() => setPersona(role.id as RoleId)}
                  className={cn(role.id === persona && "font-semibold text-primary")}
                >
                  {role.name}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/administration">Administration</Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" aria-hidden /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex h-8 items-center gap-3 border-t border-border px-4">
        <Breadcrumbs />
        <span className="ml-auto text-xs text-muted-foreground">
          Acting as <span className="font-medium text-foreground">{ROLES.find((r) => r.id === persona)?.name}</span>
        </span>
      </div>
    </header>
  );
};

/** Makes it unmistakable when the user is working inside training content. */
const SimulationBanner = () => {
  const { activeClientId } = useAxion();
  const { data: clients = [] } = useClients();
  const active = clients.find((client) => client.id === activeClientId);
  if (!active?.isSimulation) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-brand-blue/30 bg-brand-blue/5 px-4 py-2.5 text-sm">
      <GraduationCap className="h-4 w-4 shrink-0 text-brand-blue" aria-hidden />
      <span className="font-semibold text-foreground">Simulation workspace</span>
      <span className="text-muted-foreground">
        {active.name} carries demonstration data for training. Delivery workspaces are unaffected.
      </span>
      <Link
        to="/simulation"
        className="ml-auto text-xs font-semibold text-brand-blue underline-offset-4 hover:underline"
      >
        Simulation &amp; Training
      </Link>
    </div>
  );
};

/** First-run orientation: shown once until the user completes or skips it. */
const FirstRunGate = () => {
  const { data: onboarding, isLoading } = useOnboardingState();
  const [dismissed, setDismissed] = useState(false);
  if (isLoading || dismissed || !onboarding || onboarding.wizardComplete) return null;
  return <FirstRunWizard open onOpenChange={(open) => setDismissed(!open)} />;
};

export const AppShell = () => {
  useSimulationScopeSync();
  return (

  <SidebarProvider>
    <div className="flex min-h-screen w-full bg-background">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="flex-1 px-6 py-6">
          <div className="mx-auto w-full max-w-[1600px] space-y-6">
            <SimulationBanner />
            <Outlet />
          </div>
        </main>
      </div>
    </div>
    <FirstRunGate />
  </SidebarProvider>
);

export default AppShell;

