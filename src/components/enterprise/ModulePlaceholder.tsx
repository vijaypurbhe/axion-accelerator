import type { ReactNode } from "react";
import { Construction } from "lucide-react";
import { PageHeader, SectionCard } from "./Layout";
import { WorkspaceContextBanner } from "./WorkspaceContextBanner";
import { useAxion } from "@/context/AxionContext";
import { useClient, useInitiative } from "@/hooks/useWorkspace";

/**
 * Placeholder shell for modules whose accelerator engines land in later phases.
 * It still renders live workspace context so navigation and role awareness are demonstrable.
 */
export const ModulePlaceholder = ({
  eyebrow,
  title,
  description,
  capabilities,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  capabilities: readonly string[];
  children?: ReactNode;
}) => {
  const { activeClientId, activeInitiativeId, persona } = useAxion();
  const { data: client } = useClient(activeClientId);
  const { data: initiative } = useInitiative(activeInitiativeId ?? undefined);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={eyebrow} title={title} description={description} />
      <WorkspaceContextBanner client={client} initiative={initiative} role={persona} />
      {children}
      <SectionCard title="Planned capabilities" description="Delivered by the accelerator engines in later phases.">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-muted-foreground">
            <Construction className="h-4 w-4" aria-hidden />
          </span>
          <ul className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
            {capabilities.map((capability) => (
              <li key={capability} className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                {capability}
              </li>
            ))}
          </ul>
        </div>
      </SectionCard>
    </div>
  );
};

export default ModulePlaceholder;
