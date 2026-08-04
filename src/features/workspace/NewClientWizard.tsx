import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Modal } from "@/components/enterprise/Overlays";
import { INDUSTRIES } from "@/domain/catalogs";
import { useCreateClient } from "@/hooks/useWorkspace";
import { useToast } from "@/hooks/use-toast";
import type { Industry } from "@/domain/types";

const STEPS = ["Client profile", "Regulatory context", "Ownership"] as const;

export const NewClientWizard = ({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) => {
  const { toast } = useToast();
  const createClient = useCreateClient();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name: "",
    industry: "BFSI" as Industry,
    subsegments: "Retail Banking",
    geography: "North America",
    jurisdictions: "US — GLBA",
    accountOwner: "",
    executiveSponsor: "",
    description: "",
  });

  const set = (key: keyof typeof form, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const reset = () => {
    setStep(0);
    setForm({
      name: "",
      industry: "BFSI",
      subsegments: "Retail Banking",
      geography: "North America",
      jurisdictions: "US — GLBA",
      accountOwner: "",
      executiveSponsor: "",
      description: "",
    });
  };

  const submit = async () => {
    if (!form.name.trim()) {
      toast({ title: "Client name is required", variant: "destructive" });
      setStep(0);
      return;
    }
    await createClient.mutateAsync({
      name: form.name.trim(),
      industry: form.industry,
      subsegments: form.subsegments.split(",").map((s) => s.trim()).filter(Boolean),
      geography: form.geography,
      jurisdictions: form.jurisdictions.split(",").map((s) => s.trim()).filter(Boolean),
      accountOwner: form.accountOwner,
      executiveSponsor: form.executiveSponsor,
      description: form.description,
    });
    toast({ title: "Client workspace created", description: `${form.name} is now available in the portfolio.` });
    reset();
    onOpenChange(false);
  };

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
      title="New client workspace"
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
            <Button onClick={submit} disabled={createClient.isPending}>
              {createClient.isPending ? "Creating…" : "Create workspace"}
            </Button>
          )}
        </div>
      }
    >
      {step === 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="client-name">Client name</Label>
            <Input id="client-name" value={form.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="client-industry">Industry</Label>
            <Select value={form.industry} onValueChange={(value) => set("industry", value)}>
              <SelectTrigger id="client-industry">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INDUSTRIES.map((industry) => (
                  <SelectItem key={industry.id} value={industry.id} disabled={!industry.enabled}>
                    {industry.name}
                    {industry.enabled ? "" : " (planned)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="client-subsegments">Subsegments (comma separated)</Label>
            <Input id="client-subsegments" value={form.subsegments} onChange={(e) => set("subsegments", e.target.value)} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="client-description">Description</Label>
            <Textarea id="client-description" value={form.description} onChange={(e) => set("description", e.target.value)} />
          </div>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="client-geography">Geography</Label>
            <Input id="client-geography" value={form.geography} onChange={(e) => set("geography", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="client-jurisdictions">Regulatory jurisdictions (comma separated)</Label>
            <Input
              id="client-jurisdictions"
              value={form.jurisdictions}
              onChange={(e) => set("jurisdictions", e.target.value)}
            />
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="client-owner">Account owner</Label>
            <Input id="client-owner" value={form.accountOwner} onChange={(e) => set("accountOwner", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="client-sponsor">Executive sponsor</Label>
            <Input
              id="client-sponsor"
              value={form.executiveSponsor}
              onChange={(e) => set("executiveSponsor", e.target.value)}
            />
          </div>
        </div>
      ) : null}
    </Modal>
  );
};

export default NewClientWizard;
