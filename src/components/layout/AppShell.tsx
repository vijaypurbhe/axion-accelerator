import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Bell, LogOut, Moon, Search, Sparkles, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePhoenix } from "@/context/PhoenixContext";
import AssistantPanel from "./AssistantPanel";
import PersonaSwitcher from "./PersonaSwitcher";
import { cn } from "@/lib/utils";
import { navForPersona, type NavItem } from "@/lib/navigation";

export default function AppShell() {
  const { persona, personas, setPersona, signOut, unreadCount, setAssistantOpen, assistantOpen, theme, toggleTheme } = usePhoenix();
  const navigate = useNavigate();
  const { core, focus } = navForPersona(persona);

  const renderItem = (item: NavItem) => (
    <li key={item.key}>
      <NavLink
        to={item.to}
        end
        className={({ isActive }) =>
          cn(
            "group relative flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
            isActive
              ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-card"
              : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
          )
        }
      >
        {({ isActive }) => (
          <>
            <span
              className={cn(
                "absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r bg-sidebar-primary transition-opacity",
                isActive ? "opacity-100" : "opacity-0",
              )}
            />
            <item.icon className="h-4 w-4" />
            {item.label}
          </>
        )}
      </NavLink>
    </li>
  );

  return (
    <div className="flex min-h-screen w-full bg-background">
      <nav className="flex w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
        <div className="border-b border-sidebar-border/70 px-5 py-5">
          <p className="text-sm font-semibold tracking-[0.14em] text-sidebar-primary">PHOENIX 360</p>
          <p className="mt-1 text-xs text-sidebar-foreground/70">Client, Project & Relationship Platform</p>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3">
          <ul className="space-y-1">{core.map(renderItem)}</ul>
          {focus.length > 0 && (
            <div className="mt-5">
              <p className="px-3 pb-2 text-[0.6875rem] uppercase tracking-[0.09em] text-sidebar-foreground/55">
                {persona.title} focus
              </p>
              <ul className="space-y-1">{focus.map(renderItem)}</ul>
            </div>
          )}
        </div>

        <div className="border-t border-sidebar-border px-4 py-4">
          <p className="text-[0.6875rem] uppercase tracking-[0.09em] text-sidebar-foreground/60">Persona</p>
          <PersonaSwitcher variant="sidebar" className="mt-2" />
        </div>
      </nav>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-card/85 px-6 py-3 backdrop-blur-md">
          <Button variant="outline" size="sm" onClick={() => navigate("/search")}>
            <Search className="h-4 w-4" />
            Search
          </Button>
          <PersonaSwitcher />

          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="icon" aria-label="Toggle theme" onClick={toggleTheme}>
              {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-destructive" />
              )}
            </Button>
            <Button variant={assistantOpen ? "default" : "outline"} size="sm" onClick={() => setAssistantOpen(!assistantOpen)}>
              <Sparkles className="h-4 w-4" />
              Phoenix AI
            </Button>
            <Button variant="ghost" size="icon" aria-label="Sign out" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <div className="flex min-h-0 flex-1">
          <main className="app-canvas min-w-0 flex-1 overflow-y-auto px-8 py-7">
            <div className="mx-auto w-full max-w-[1600px] animate-fade-in">
              <Outlet />
            </div>
          </main>
          <AssistantPanel />
        </div>
      </div>
    </div>
  );
}
