import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAxion } from "@/context/AxionContext";
import {
  activityService,
  aiRecommendationService,
  architectureRepository,
  assessmentRepository,
  dataProductRepository,
  exportService,
  initiativeRepository,
  notificationRepository,
  templateRepository,
  workspaceRepository,
} from "@/services/workspace";
import type { ActorContext } from "@/repositories/contracts";
import type { ApprovalState, NewClientInput, NewInitiativeInput } from "@/domain/models";

export const useActor = (): ActorContext => {
  const { session, persona } = useAxion();
  return { userId: session?.email ?? "demo", actor: session?.email ?? "demo@techmahindra.com", role: persona };
};

export const useClients = () => useQuery({ queryKey: ["clients"], queryFn: workspaceRepository.listClients });

export const useClient = (clientId: string) =>
  useQuery({
    queryKey: ["client", clientId],
    queryFn: () => workspaceRepository.getClient(clientId),
    enabled: Boolean(clientId),
  });

export const useClientUsers = (clientId: string) =>
  useQuery({
    queryKey: ["client-users", clientId],
    queryFn: () => workspaceRepository.listUsers(clientId),
    enabled: Boolean(clientId),
  });

export const useAllInitiatives = () =>
  useQuery({ queryKey: ["initiatives", "all"], queryFn: initiativeRepository.listAll });

export const useInitiatives = (clientId: string) =>
  useQuery({
    queryKey: ["initiatives", clientId],
    queryFn: () => initiativeRepository.listByClient(clientId),
    enabled: Boolean(clientId),
  });

export const useInitiative = (initiativeId: string | undefined) =>
  useQuery({
    queryKey: ["initiative", initiativeId],
    queryFn: () => initiativeRepository.get(initiativeId as string),
    enabled: Boolean(initiativeId),
  });

export const useStageTasks = (initiativeId: string | undefined) =>
  useQuery({
    queryKey: ["tasks", initiativeId],
    queryFn: () => initiativeRepository.listTasks(initiativeId as string),
    enabled: Boolean(initiativeId),
  });

export const useMilestones = (initiativeId: string | undefined) =>
  useQuery({
    queryKey: ["milestones", initiativeId],
    queryFn: () => initiativeRepository.listMilestones(initiativeId as string),
    enabled: Boolean(initiativeId),
  });

export const useRisks = (initiativeId?: string) =>
  useQuery({ queryKey: ["risks", initiativeId ?? "all"], queryFn: () => initiativeRepository.listRisks(initiativeId) });

export const useApprovals = (initiativeId?: string) =>
  useQuery({
    queryKey: ["approvals", initiativeId ?? "all"],
    queryFn: () => initiativeRepository.listApprovals(initiativeId),
  });

export const useComments = (initiativeId: string | undefined) =>
  useQuery({
    queryKey: ["comments", initiativeId],
    queryFn: () => initiativeRepository.listComments(initiativeId as string),
    enabled: Boolean(initiativeId),
  });

export const useAssessmentScores = (initiativeId: string | undefined) =>
  useQuery({
    queryKey: ["assessment-scores", initiativeId],
    queryFn: () => assessmentRepository.listScores(initiativeId as string),
    enabled: Boolean(initiativeId),
  });

export const useDataProducts = (initiativeId: string | undefined) =>
  useQuery({
    queryKey: ["data-products", initiativeId],
    queryFn: () => dataProductRepository.listByInitiative(initiativeId as string),
    enabled: Boolean(initiativeId),
  });

export const useConnections = (initiativeId: string | undefined) =>
  useQuery({
    queryKey: ["connections", initiativeId],
    queryFn: () => dataProductRepository.listConnections(initiativeId as string),
    enabled: Boolean(initiativeId),
  });

export const useDecisions = (initiativeId: string | undefined) =>
  useQuery({
    queryKey: ["decisions", initiativeId],
    queryFn: () => architectureRepository.listDecisions(initiativeId as string),
    enabled: Boolean(initiativeId),
  });

export const useAgentDesigns = (initiativeId: string | undefined) =>
  useQuery({
    queryKey: ["agent-designs", initiativeId],
    queryFn: () => architectureRepository.listAgentDesigns(initiativeId as string),
    enabled: Boolean(initiativeId),
  });

export const useArtifacts = (initiativeId: string | undefined) =>
  useQuery({
    queryKey: ["artifacts", initiativeId],
    queryFn: () => exportService.listArtifacts(initiativeId as string),
    enabled: Boolean(initiativeId),
  });

export const useTemplates = () => useQuery({ queryKey: ["templates"], queryFn: templateRepository.list });

export const useNotifications = (clientId: string) =>
  useQuery({
    queryKey: ["notifications", clientId],
    queryFn: () => notificationRepository.list(clientId),
    enabled: Boolean(clientId),
  });

export const useRecommendations = (clientId: string) =>
  useQuery({
    queryKey: ["recommendations", clientId],
    queryFn: () => aiRecommendationService.listPending(clientId),
    enabled: Boolean(clientId),
  });

export const useActivity = (filter: { clientId?: string; initiativeId?: string; limit?: number }) =>
  useQuery({
    queryKey: ["activity", filter.clientId ?? "all", filter.initiativeId ?? "all", filter.limit ?? 50],
    queryFn: () => activityService.list(filter),
  });

/* --------------------------------- mutations -------------------------------- */

const useInvalidate = () => {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["clients"] });
    void queryClient.invalidateQueries({ queryKey: ["initiatives"] });
    void queryClient.invalidateQueries({ queryKey: ["initiative"] });
    void queryClient.invalidateQueries({ queryKey: ["approvals"] });
    void queryClient.invalidateQueries({ queryKey: ["activity"] });
    void queryClient.invalidateQueries({ queryKey: ["artifacts"] });
    void queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };
};

export const useCreateClient = () => {
  const actor = useActor();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: NewClientInput) => workspaceRepository.createClient(input, actor),
    onSuccess: invalidate,
  });
};

export const useCreateInitiative = () => {
  const actor = useActor();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: NewInitiativeInput) =>
      input.templateId
        ? initiativeRepository.cloneFromTemplate(input.templateId, input, actor)
        : initiativeRepository.create(input, actor),
    onSuccess: invalidate,
  });
};

export const useArchiveInitiative = () => {
  const actor = useActor();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (initiativeId: string) => initiativeRepository.archive(initiativeId, actor),
    onSuccess: invalidate,
  });
};

export const useSetInitiativeStage = () => {
  const actor = useActor();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: { initiativeId: string; stage: Parameters<typeof initiativeRepository.setStage>[1] }) =>
      initiativeRepository.setStage(input.initiativeId, input.stage, actor),
    onSuccess: invalidate,
  });
};

export const useDecideApproval = () => {
  const actor = useActor();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: { approvalId: string; state: ApprovalState; notes?: string }) =>
      initiativeRepository.decideApproval(input.approvalId, input.state, actor, input.notes),
    onSuccess: invalidate,
  });
};

export const useGenerateArtifact = () => {
  const actor = useActor();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: {
      initiativeId: string;
      artifact: Parameters<typeof exportService.generate>[1];
    }) => exportService.generate(input.initiativeId, input.artifact, actor),
    onSuccess: invalidate,
  });
};
