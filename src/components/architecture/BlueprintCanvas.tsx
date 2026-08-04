import { Sparkles } from "lucide-react";
import { BLUEPRINT_LAYERS } from "@/data/architectureCatalog";
import type { ArchitectureView, BlueprintComponent, BlueprintConnection, ComponentStatus } from "@/domain/phase2";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { roleLabelFor } from "@/services/workspace";

const STATUS_CLASS: Record<ComponentStatus, string> = {
  proposed: "border-brand/40 bg-brand/5",
  approved: "border-accent/50 bg-accent/10",
  "in-build": "border-warning/50 bg-warning/10",
  live: "border-success/40 bg-success/10",
  rejected: "border-destructive/40 bg-destructive/5 opacity-70",
};

export interface BlueprintCanvasProps {
  components: readonly BlueprintComponent[];
  connections: readonly BlueprintConnection[];
  view: ArchitectureView;
  physicalOnly: boolean;
  showControls: boolean;
  selectedId?: string;
  onSelect: (component: BlueprintComponent) => void;
}

/** Layered architecture canvas: five stacked layers with component cards and outbound flows. */
export const BlueprintCanvas = ({
  components,
  connections,
  view,
  physicalOnly,
  showControls,
  selectedId,
  onSelect,
}: BlueprintCanvasProps) => {
  const visible = components.filter((component) => {
    const viewMatch = view === "both" || component.view === "both" || component.view === view;
    const physicalMatch = !physicalOnly || component.physical;
    return viewMatch && physicalMatch;
  });

  const nameFor = (id: string) => components.find((component) => component.id === id)?.name ?? "unknown";

  return (
    <div className="space-y-3">
      {BLUEPRINT_LAYERS.map((layer) => {
        const layerComponents = visible.filter((component) => component.layer === layer.id);
        return (
          <section key={layer.id} className="rounded-xl border border-border bg-surface/60 p-3">
            <header className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">
                Layer {layer.order} — {layer.name}
              </h3>
              <p className="max-w-2xl text-[11px] text-muted-foreground">{layer.purpose}</p>
            </header>

            {layerComponents.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border px-3 py-4 text-xs text-muted-foreground">
                No components assigned to this layer in the current view.
              </p>
            ) : (
              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {layerComponents.map((component) => {
                  const outbound = connections.filter((connection) => connection.fromId === component.id);
                  return (
                    <button
                      key={component.id}
                      type="button"
                      onClick={() => onSelect(component)}
                      className={cn(
                        "rounded-lg border bg-card p-3 text-left transition-shadow hover:shadow-card",
                        STATUS_CLASS[component.status],
                        selectedId === component.id && "ring-2 ring-brand/50",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold leading-tight text-foreground">{component.name}</p>
                        {component.aiSuggested ? (
                          <Badge variant="outline" className="shrink-0 border-brand/40 bg-brand/5 text-[10px] text-brand">
                            <Sparkles className="mr-1 h-2.5 w-2.5" aria-hidden /> AI
                          </Badge>
                        ) : null}
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {component.platform} · {component.dataDomain}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1 text-[10px]">
                        <span className="rounded border border-border bg-surface px-1.5 py-0.5 capitalize text-muted-foreground">
                          {component.status}
                        </span>
                        {component.integrationPattern !== "none" ? (
                          <span className="rounded border border-border bg-surface px-1.5 py-0.5 text-muted-foreground">
                            {component.integrationPattern}
                          </span>
                        ) : null}
                        <span className="rounded border border-border bg-surface px-1.5 py-0.5 capitalize text-muted-foreground">
                          {roleLabelFor(component.owner)}
                        </span>
                        {component.physical ? null : (
                          <span className="rounded border border-border bg-surface px-1.5 py-0.5 text-muted-foreground">
                            logical
                          </span>
                        )}
                      </div>
                      {showControls && component.controls.length > 0 ? (
                        <p className="mt-2 rounded border border-accent/30 bg-accent/5 px-1.5 py-1 text-[10px] text-accent-foreground">
                          Controls: {component.controls.join(", ")}
                        </p>
                      ) : null}
                      {component.risks.length > 0 ? (
                        <p className="mt-1.5 text-[10px] text-destructive">Risk: {component.risks[0]}</p>
                      ) : null}
                      {outbound.length > 0 ? (
                        <p className="mt-1.5 text-[10px] text-muted-foreground">
                          → {outbound.map((connection) => `${connection.label} ${nameFor(connection.toId)}`).join(" · ")}
                        </p>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
};

export default BlueprintCanvas;
