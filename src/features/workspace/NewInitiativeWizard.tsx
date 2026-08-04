import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Modal } from "@/components/enterprise/Overlays";
import { useAxion } from "@/context/AxionContext";
import { useClients, useCreateInitiative, useTemplates } from "@/hooks/useWorkspace";
import { useToast } from "@/hooks/use-toast";
import type { RiskLevel } from "@/domain/models";

const USE_CASE_LIBRARY = [
  "Customer 360",
  "Household 360",
  "KYC onboarding",
  "Service request and complaint management",
  "Banker assist",
  "Next-best action",
] as const;

const STEPS = ["Basics", "Scope", "Delivery"] as const;

export const NewInitiativeWizard = ({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { activeClientId, setActiveInitiativeId } = useAxion();
  const { data: clients = [] } = useClients();
  const { data: templates = [] } = useTemplates();
  const createInitiative = useCreateInitiative();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    clientId: activeClientId,
    name: "",
    description: "",
    businessObjective: "",
    primaryDomain: "Party & Household",
    useCases: ["Customer 360"] as string[],
    targetDate: "2027-06-30",
    riskLevel: "medium" as RiskLevel,
    templateId: "none",
  });

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const toggleUseCase = (useCase: string) =>
    setForm((prev) => ({
      ...prev,
      useCases: prev.useCases.includes(useCase)
        ? prev.useCases.filter((item) => item !== useCase)
        : [...prev.useCases, useCase],
    }));

  const submit = async () => {
    if (!form.name.trim()) {
      toast({ title: "Initiative name is required", variant: "destructive" });
      setStep(0);
      return;
    }
    const created = await createInitiative.mutateAsync({
      clientId: form.clientId || activeClientId,
      name: form.name.trim(),
      description: form.description,
      businessObjective: form.businessObjective,
      primaryDomain: form.primaryDomain,
      useCases: form.useCases,
      targetDate: new Date(form.targetDate).toISOString(),
      riskLevel: form.riskLevel,
      templateId: form.templateId === "none" ? undefined : form.templateId,
    });
    setActiveInitiativeId(created.id);
    toast({ title: "Initiative created", description: `${created.name} is now in Discover.` });
    onOpenChange(false);
    setStep(0);
    navigate(`/initiatives/${created.id}`);
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="New initiative"
      description={`Step ${step + 1} of ${STEPS.length} — ${STEPS[step]}`}
      wide
      footer={
        <div className="flex w-full items-center justify-between">
          <Button variant="ghost" onClick={() => (step === 0 ? onOpenChange(false) : setStep(step - 1))}>
            {step === 0 ? "Cancel" : "Back"}
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep(step + 1)}>Continue</Button>
          ) : (
            <Button onClick={submit} disabled={createInitiative.isPending}>
              {createInitiative.isPending ? "Creating…" : "Create initiative"}
            </Button>
          )}
        </div>
      }
    >
      {step === 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="ini-client">Client</Label>
            <Select value={form.clientId} onValueChange={(value) => set("clientId", value)}>
              <SelectTrigger id="ini-client">
                <SelectValue placeholder="Select client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ini-template">Clone from template</Label>
            <Select value={form.templateId} onValueChange={(value) => set("templateId", value)}>
              <SelectTrigger id="ini-template">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Start from blank</SelectItem>
                {templates
                  .filter((template) => template.scope === "initiative")
                  .map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="ini-name">Initiative name</Label>
            <Input id="ini-name" value={form.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="ini-description">Description</Label>
            <Textarea id="ini-description" value={form.description} onChange={(e) => set("description", e.target.value)} />
          </div>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ini-objective">Business objective</Label>
            <Textarea
              id="ini-objective"
              value={form.businessObjective}
              onChange={(e) => set("businessObjective", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ini-domain">Primary domain</Label>
            <Input id="ini-domain" value={form.primaryDomain} onChange={(e) => set("primaryDomain", e.target.value)} />
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-foreground">Use cases</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {USE_CASE_LIBRARY.map((useCase) => (
                <label key={useCase} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Checkbox checked={form.useCases.includes(useCase)} onCheckedChange={() => toggleUseCase(useCase)} />
                  {useCase}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="ini-target">Target date</Label>
            <Input
              id="ini-target"
              type="date"
              value={form.targetDate}
              onChange={(e) => set("targetDate", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ini-risk">Initial risk level</Label>
            <Select value={form.riskLevel} onValueChange={(value) => set("riskLevel", value as RiskLevel)}>
              <SelectTrigger id="ini-risk">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(["low", "medium", "high", "critical"] as RiskLevel[]).map((level) => (
                  <SelectItem key={level} value={level}>
                    {level}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      ) : null}
    </Modal>
  );
};

export default NewInitiativeWizard;
