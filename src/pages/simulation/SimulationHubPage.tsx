import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, GraduationCap, RotateCcw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, SectionCard } from "@/components/enterprise/Layout";
import { MetaPill } from "@/components/enterprise/Badges";
import { LoadingState, ErrorState, EmptyState } from "@/components/enterprise/States";
import { useAxion } from "@/context/AxionContext";
import { useClients, useAllInitiatives } from "@/hooks/useWorkspace";
import { resetSimulationWorkspace } from "@/repositories/supabase/workspaceStore";
import { SIMULATION_SCENARIOS } from "@/data/simulationScenarios";
import { useToast } from "@/hooks/use-toast";

/**
 * Simulation & Training module. All demonstration content lives inside workspaces
 * flagged as simulation, keeping delivery workspaces free of sample data.
 */
const SimulationHubPage = () => {
  const clients = useClients();
  const initiatives = useAllInitiatives();
  const { setActiveTenantId, setActiveInitiativeId } = useAxion();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [resetting, setResetting] = useState<string | null>(null);

  const reset = useMutation({
    mutationFn: async (clientId: string) => {
      setResetting(clientId);
      await resetSimulationWorkspace(clientId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries();
      toast({ title: "Simulation reset", description: "The training scenario is back to its original state." });
    },
    onError: (error: Error) =>
      toast({ title: "Reset failed", description: error.message, variant: "destructive" }),
    onSettled: () => setResetting(null),
  });

  if (clients.isLoading) return <LoadingState label="Loading simulation workspaces" />;
  if (clients.isError) return <ErrorState description="Simulation workspaces could not be loaded." />;

  const simulations = (clients.data ?? []).filter((client) => client.isSimulation);

  const enter = (clientId: string) => {
    setActiveTenantId(clientId);
    const first = (initiatives.data ?? []).find((initiative) => initiative.clientId === clientId);
    if (first) setActiveInitiativeId(first.id);
    navigate("/portfolio");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Platform"
        title="Simulation & Training"
        description="Rehearse the full Axion lifecycle on BFSI reference scenarios. Nothing here affects delivery workspaces."
      />

      <div className="flex items-start gap-3 rounded-xl border border-brand-blue/30 bg-brand-blue/5 px-4 py-3 text-sm text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-blue" aria-hidden />
        <p>
          Simulation workspaces are seeded with demonstration data and are clearly labelled everywhere in the product.
          Delivery workspaces you create start completely empty and follow the guided build-out path for your role.
        </p>
      </div>

      <SectionCard
        title="Training workspaces"
        description="Switch into a scenario to explore the lifecycle, or reset it to its pristine state before a demo."
      >
        {simulations.length === 0 ? (
          <EmptyState
            title="No simulation workspaces available"
            description="Ask an administrator to enable the BFSI training scenarios for your account."
          />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {simulations.map((client) => {
              const count = (initiatives.data ?? []).filter((i) => i.clientId === client.id).length;
              return (
                <div key={client.id} className="rounded-xl border border-border bg-surface p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{client.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{client.description}</p>
                    </div>
                    <GraduationCap className="h-5 w-5 shrink-0 text-brand-blue" aria-hidden />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <MetaPill>{client.industry}</MetaPill>
                    <MetaPill>{client.geography}</MetaPill>
                    <MetaPill>
                      {count} initiative{count === 1 ? "" : "s"}
                    </MetaPill>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => enter(client.id)}>
                      Enter scenario
                      <ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={resetting === client.id}
                      onClick={() => reset.mutate(client.id)}
                    >
                      <RotateCcw className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                      {resetting === client.id ? "Resetting…" : "Reset data"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Guided walkthroughs"
        description="Each walkthrough follows one persona through the lifecycle stages it owns."
      >
        <div className="grid gap-3 lg:grid-cols-2">
          {SIMULATION_SCENARIOS.map((scenario) => (
            <div key={scenario.id} className="rounded-xl border border-border bg-surface p-4">
              <p className="text-sm font-semibold text-foreground">{scenario.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{scenario.summary}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <MetaPill>{scenario.persona}</MetaPill>
                <MetaPill>{scenario.duration}</MetaPill>
                <MetaPill>{scenario.stages.join(" → ")}</MetaPill>
              </div>
              <ol className="mt-3 space-y-1.5">
                {scenario.steps.map((step, index) => (
                  <li key={step} className="flex gap-2 text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">{index + 1}.</span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
};

export default SimulationHubPage;
