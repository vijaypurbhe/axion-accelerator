import { useMutation, useQuery } from "@tanstack/react-query";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { agentDesignService } from "@/services/phase6";
import { downloadTextFile } from "@/services/phase6Exports";
import { toast } from "@/hooks/use-toast";

/**
 * Server-generated exports. The edge function builds the artifact, records a
 * content hash and job row, then returns the payload for download.
 */
export const useExportJobs = (agentId: string | undefined) =>
  useQuery({
    queryKey: ["agent-export-jobs", agentId],
    queryFn: () => agentDesignService.listExportJobs(agentId as string),
    enabled: Boolean(agentId),
  });

export const useGenerateExport = (onDone?: () => void) =>
  useMutation({
    mutationFn: async (input: { agentId: string; format: "markdown" | "csv" }) => {
      const { data, error } = await supabase.functions.invoke("agent-export", { body: input });
      if (error) {
        const details = error instanceof FunctionsHttpError ? await error.context.text() : error.message;
        throw new Error(details);
      }
      const payload = data as { filename: string; content: string; contentHash: string; byteSize: number };
      downloadTextFile(
        payload.filename,
        payload.content,
        input.format === "markdown" ? "text/markdown" : "text/csv",
      );
      return payload;
    },
    onSuccess: (payload) => {
      toast({
        title: "Export ready",
        description: `${payload.filename} · ${payload.byteSize} bytes · hash ${payload.contentHash.slice(0, 12)}…`,
      });
      onDone?.();
    },
    onError: (error: Error) =>
      toast({ title: "Export failed", description: error.message, variant: "destructive" }),
  });
