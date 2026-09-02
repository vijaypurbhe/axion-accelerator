import { useMemo } from "react";
import { useAxion } from "@/context/AxionContext";
import { useClients } from "@/hooks/useWorkspace";
import { DEFAULT_INDUSTRY, getIndustryPack, type IndustryPack } from "@/domain/industries";
import type { Industry } from "@/domain/types";

/**
 * Active vertical for the current client workspace. Industry is an attribute of the client,
 * so every module reads its content pack from here instead of hardcoding BFSI.
 */
export const useActiveIndustry = (): { industry: Industry; pack: IndustryPack; clientName?: string } => {
  const { activeClientId } = useAxion();
  const { data: clients = [] } = useClients();

  return useMemo(() => {
    const client = clients.find((entry) => entry.id === activeClientId);
    const industry = (client?.industry ?? DEFAULT_INDUSTRY) as Industry;
    return { industry, pack: getIndustryPack(industry), clientName: client?.name };
  }, [clients, activeClientId]);
};
