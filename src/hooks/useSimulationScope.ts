import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAxion } from "@/context/AxionContext";
import { useClients } from "@/hooks/useWorkspace";
import { setActiveIndustry, setSimulationScope } from "@/repositories/mock/simulationScope";

/**
 * Keeps the browser-persisted phase stores aligned with the active workspace.
 * Seeded demonstration content is only ever materialised for simulation /
 * training workspaces; delivery workspaces read from an empty scope.
 */
export const useSimulationScopeSync = () => {
  const { activeClientId } = useAxion();
  const { data: clients = [] } = useClients();
  const queryClient = useQueryClient();

  const activeClient = clients.find((client) => client.id === activeClientId);
  const isSimulation = activeClient?.isSimulation ?? false;
  const industry = activeClient?.industry ?? "BFSI";

  useEffect(() => {
    setActiveIndustry(industry);
    setSimulationScope(isSimulation);
    void queryClient.invalidateQueries();
  }, [isSimulation, industry, activeClientId, queryClient]);

  return isSimulation;
};
