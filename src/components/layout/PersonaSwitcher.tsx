import { Check, ChevronDown, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePhoenix } from "@/context/PhoenixContext";
import { cn } from "@/lib/utils";
import type { PersonaId } from "@/types";

interface Props {
  variant?: "header" | "sidebar";
  className?: string;
}

export default function PersonaSwitcher({ variant = "header", className }: Props) {
  const { persona, personas, setPersona, logActivity } = usePhoenix();

  const choose = (id: PersonaId, name: string) => {
    if (id === persona.id) return;
    setPersona(id);
    logActivity({ action: "Persona switched", object: name });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "gap-2",
            variant === "sidebar" &&
              "w-full justify-start border-sidebar-border bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground",
            className,
          )}
          aria-label="Change persona"
        >
          <span
            className={cn(
              "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[0.625rem] font-semibold",
              variant === "sidebar" ? "bg-sidebar-primary text-sidebar" : "bg-primary text-primary-foreground",
            )}
          >
            {persona.initials}
          </span>
          <span className="min-w-0 truncate text-left">
            <span className="font-medium">{persona.name}</span>
            <span className="hidden text-muted-foreground lg:inline"> · {persona.title}</span>
          </span>
          <ChevronDown className="ml-auto h-4 w-4 shrink-0 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 bg-popover">
        <DropdownMenuLabel className="flex items-center gap-2">
          <UserRound className="h-4 w-4" />
          Switch persona
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {personas.map((p) => (
          <DropdownMenuItem
            key={p.id}
            onSelect={() => choose(p.id, p.name)}
            className="items-start gap-2.5 py-2"
          >
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-[0.625rem] font-semibold text-foreground">
              {p.initials}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                {p.name}
                {p.id === persona.id && <Check className="h-3.5 w-3.5 text-brand" />}
              </span>
              <span className="block text-xs text-muted-foreground">{p.title}</span>
              <span className="block text-xs text-muted-foreground/80">{p.unit}</span>
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
