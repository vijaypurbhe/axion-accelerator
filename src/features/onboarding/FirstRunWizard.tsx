import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Building2, GraduationCap, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { PERSONAS } from "@/domain/catalogs";
import type { PersonaId } from "@/domain/types";
import { useAxion } from "@/context/AxionContext";
import { trackFor } from "./checklists";
import { useSaveOnboardingState } from "./useOnboarding";

/**
 * First-run orientation. Establishes the persona, explains the execution path for
 * that persona and routes the user either into a delivery workspace or the
 * simulation module for a guided rehearsal.
 */
export const FirstRunWizard = ({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) => {
  const { persona, setPersona } = useAxion();
  const navigate = useNavigate();
  const save = useSaveOnboardingState();
  const [step, setStep] = useState(0);
  const [role, setRole] = useState<PersonaId>(persona);

  const track = trackFor(role);

  const finish = async (destination: string) => {
    setPersona(role);
    await save.mutateAsync({ chosenRole: role, wizardComplete: true, wizardStep: 2 });
    onOpenChange(false);
    navigate(destination);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {step === 0 ? "Welcome to Tech Mahindra Axion" : step === 1 ? "Your execution path" : "Where do you want to start?"}
          </DialogTitle>
          <DialogDescription>
            {step === 0
              ? "Axion guides a governed Data 360 and Agentforce implementation from Discover through to Improve. Tell us how you will be working so the workspace can prioritise the right screens."
              : step === 1
                ? track.headline
                : "Delivery workspaces start empty and hold real client content. The simulation module carries the BFSI walkthrough for training and demonstrations."}
          </DialogDescription>
        </DialogHeader>

        {step === 0 ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {PERSONAS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setRole(option.id)}
                className={cn(
                  "rounded-xl border border-border bg-surface p-3 text-left transition hover:border-primary/60",
                  role === option.id && "border-primary ring-1 ring-primary/30",
                )}
              >
                <span className="block text-sm font-semibold text-foreground">{option.name}</span>
                <span className="mt-1 block text-xs text-muted-foreground">{option.summary}</span>
              </button>
            ))}
          </div>
        ) : null}

        {step === 1 ? (
          <ol className="space-y-2">
            {track.steps.map((item, index) => (
              <li key={item.id} className="flex gap-3 rounded-xl border border-border bg-surface p-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {index + 1}
                </span>
                <span>
                  <span className="block text-sm font-semibold text-foreground">{item.label}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{item.detail}</span>
                </span>
              </li>
            ))}
          </ol>
        ) : null}

        {step === 2 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => void finish("/initiatives")}
              className="rounded-xl border border-border bg-surface p-4 text-left transition hover:border-primary/60"
            >
              <Building2 className="h-5 w-5 text-primary" aria-hidden />
              <span className="mt-2 block text-sm font-semibold text-foreground">Start a delivery initiative</span>
              <span className="mt-1 block text-xs text-muted-foreground">
                Create a client workspace and initiative, then work the lifecycle with real content.
              </span>
            </button>
            <button
              type="button"
              onClick={() => void finish("/simulation")}
              className="rounded-xl border border-border bg-surface p-4 text-left transition hover:border-primary/60"
            >
              <GraduationCap className="h-5 w-5 text-brand-blue" aria-hidden />
              <span className="mt-2 block text-sm font-semibold text-foreground">Explore simulation & training</span>
              <span className="mt-1 block text-xs text-muted-foreground">
                Rehearse the full lifecycle on the BFSI reference scenarios before touching client data.
              </span>
            </button>
          </div>
        ) : null}

        <DialogFooter className="justify-between sm:justify-between">
          <Button
            variant="ghost"
            onClick={() => (step === 0 ? onOpenChange(false) : setStep(step - 1))}
          >
            {step === 0 ? "Skip for now" : "Back"}
          </Button>
          {step < 2 ? (
            <Button onClick={() => setStep(step + 1)}>
              Continue
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
            </Button>
          ) : (
            <span className="flex items-center gap-2 text-xs text-muted-foreground">
              <Rocket className="h-3.5 w-3.5" aria-hidden />
              Pick a starting point
            </span>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FirstRunWizard;
