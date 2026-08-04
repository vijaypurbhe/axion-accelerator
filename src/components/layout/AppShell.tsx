import { Outlet, useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import AppSidebar from "./AppSidebar";
import { useAxion } from "@/context/AxionContext";
import { useTenants } from "@/hooks/useAxionData";
import { PERSONAS } from "@/domain/catalogs";
import { config } from "@/config";
import type { PersonaId } from "@/domain/types";

const TopBar = () => {
  const navigate = useNavigate();
  const { session, persona, activeTenantId, setActiveTenantId, setPersona, signOut } = useAxion();
  const { data: tenants = [] } = useTenants();

  const handleSignOut = () => {
    signOut();
    navigate("/login", { replace: true });
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur">
      <SidebarTrigger aria-label="Toggle navigation" />
      <div className="hidden items-baseline gap-2 md:flex">
        <span className="text-sm font-semibold tracking-tight text-foreground">Tech Mahindra Axion</span>
        <span className="text-xs text-muted-foreground">Agent-ready data foundation accelerator</span>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Badge variant="outline" className="hidden border-border text-muted-foreground sm:inline-flex">
          {config.environmentLabel} · {config.dataMode === "mock" ? "Mock data" : "Live data"}
        </Badge>

        <Select value={activeTenantId} onValueChange={setActiveTenantId}>
          <SelectTrigger className="h-9 w-[220px]" aria-label="Active client">
            <SelectValue placeholder="Select client" />
          </SelectTrigger>
          <SelectContent>
            {tenants.map((tenant) => (
              <SelectItem key={tenant.id} value={tenant.id}>
                {tenant.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={persona} onValueChange={(value) => setPersona(value as PersonaId)}>
          <SelectTrigger className="h-9 w-[200px]" aria-label="Active persona">
            <SelectValue placeholder="Select persona" />
          </SelectTrigger>
          <SelectContent>
            {PERSONAS.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="hidden text-right lg:block">
          <p className="text-xs font-medium text-foreground">{session?.displayName}</p>
          <p className="text-[11px] text-muted-foreground">{session?.email}</p>
        </div>

        <Button variant="ghost" size="icon" aria-label="Sign out" onClick={handleSignOut}>
          <LogOut className="h-4 w-4" aria-hidden />
        </Button>
      </div>
    </header>
  );
};

export const AppShell = () => (
  <SidebarProvider>
    <div className="flex min-h-screen w-full bg-background">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="flex-1 px-6 py-6">
          <div className="mx-auto w-full max-w-[1600px] space-y-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  </SidebarProvider>
);

export default AppShell;
