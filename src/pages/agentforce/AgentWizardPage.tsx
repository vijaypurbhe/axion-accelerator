import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader, SectionCard, KeyValue } from "@/components/enterprise/Layout";
import { MetaPill } from "@/components/enterprise/Badges";
import { useToast } from "@/hooks/use-toast";
import { AGENT_PATTERNS } from "@/data/agentforceSeed";
import { useAgentPatterns } from "@/hooks/usePhase6";
import { PERSONAS } from "@/domain/catalogs";
import {
  AGENT_CHANNELS,
  AUTOMATION_LEVELS,
  type AgentChannel,
  type AgentEnvironment,
  type AutomationLevel,
} from "@/domain/phase6";
import type { RoleId } from "@/domain/models";
import { useCreateAgent, type NewAgentInput } from "@/hooks/usePhase6";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: "pattern", label: "Pattern" },
  { id: "context", label: "Business context" },
  { id: "experience", label: "Channels & automation" },
  { id: "volumetrics", label: "Volume & impact" },
  { id: "review", label: "Review & create" },
] as const;

const AgentWizardPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const createAgent = useCreateAgent();
  const [step, setStep] = useState(0);

  const [form, setForm] = useState<NewAgentInput>({
    name: "",
    description: "",
    businessObjective: "",
    businessOutcome: "",
    targetPersona: "",
    targetUsers: "",
    domain: "",
    useCase: "",
    patternId: AGENT_PATTERNS[0]?.id ?? "customer-service",
    channels: ["web-chat"],
    automationLevel: "assistive",
    environment: "sandbox",
    expectedVolume: "",
    expectedBusinessImpact: "",
    owner: "agentforce-architect",
  });

  const patterns = useAgentPatterns();
  const pattern = AGENT_PATTERNS.find((p) => p.id === form.patternId);

  // Keep the selected pattern valid when the workspace vertical narrows the list.
  useEffect(() => {
    if (patterns.length && !patterns.some((item) => item.id === form.patternId)) {
      setForm((prev) => ({ ...prev, patternId: patterns[0].id }));
    }
  }, [patterns, form.patternId]);
  const set = <K extends keyof NewAgentInput>(key: K, value: NewAgentInput[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const toggleChannel = (channel: AgentChannel) =>
    setForm((prev) => ({
      ...prev,
      channels: prev.channels.includes(channel)
        ? prev.channels.filter((c) => c !== channel)
        : [...prev.channels, channel],
    }));

  const canAdvance = () => {
    if (step === 0) return Boolean(form.patternId);
    if (step === 1) return form.name.trim().length > 2 && form.domain.trim().length > 1 && form.useCase.trim().length > 1;
    if (step === 2) return form.channels.length > 0;
    return true;
  };

  const submit = async () => {
    const created = await createAgent.mutateAsync(form);
    toast({ title: "Agent created", description: `${created.overview.name} is ready for topic design.` });
    navigate(`/agentforce-studio/${created.id}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Agentforce Studio"
        title="New agent"
        description="Guided design flow: pick a BFSI pattern, define business context, then refine topics, actions and guardrails in the workbench."
        actions={
          <Button variant="outline" onClick={() => navigate("/agentforce-studio")}>
            Cancel
          </Button>
        }
      />

      <ol className="flex flex-wrap items-center gap-2">
        {STEPS.map((item, index) => (
          <li key={item.id} className="flex items-center gap-2">
            <span
              className={cn(
                "flex h-7 items-center gap-2 rounded-full border px-3 text-xs font-medium",
                index === step
                  ? "border-brand bg-brand/10 text-brand"
                  : index < step
                    ? "border-success/40 bg-success/10 text-success"
                    : "border-border bg-surface text-muted-foreground",
              )}
            >
              {index < step ? <Check className="h-3 w-3" aria-hidden /> : <span className="tabular-nums">{index + 1}</span>}
              {item.label}
            </span>
            {index < STEPS.length - 1 ? <span className="text-muted-foreground">/</span> : null}
          </li>
        ))}
      </ol>

      {step === 0 ? (
        <SectionCard title="Implementation pattern" description="Patterns pre-seed suggested topics, actions and guardrail categories.">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {patterns.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => set("patternId", item.id)}
                className={cn(
                  "rounded-xl border p-4 text-left transition",
                  form.patternId === item.id ? "border-brand bg-brand/5" : "border-border bg-card hover:border-brand/40",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground">{item.name}</p>
                  {item.custom ? <Badge variant="outline">Custom</Badge> : null}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{item.summary}</p>
                <div className="mt-3 flex flex-wrap gap-1">
                  <MetaPill>{item.primaryChannel.replace(/-/g, " ")}</MetaPill>
                  <MetaPill>{item.automationLevel}</MetaPill>
                  <MetaPill>{item.suggestedTopics.length} topics</MetaPill>
                </div>
              </button>
            ))}
          </div>
        </SectionCard>
      ) : null}

      {step === 1 ? (
        <SectionCard title="Business context" description="Traced into the initiative use-case register and the design specification output.">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Agent name</Label>
              <Input id="name" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Collections Assist Agent" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="domain">Business domain</Label>
              <Input id="domain" value={form.domain} onChange={(e) => set("domain", e.target.value)} placeholder="Retail lending" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={form.description} onChange={(e) => set("description", e.target.value)} rows={3} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="useCase">Use case</Label>
              <Input id="useCase" value={form.useCase} onChange={(e) => set("useCase", e.target.value)} placeholder="Hardship intake and triage" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="owner">Design owner</Label>
              <Select value={form.owner} onValueChange={(value) => set("owner", value as RoleId)}>
                <SelectTrigger id="owner">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERSONAS.map((persona) => (
                    <SelectItem key={persona.id} value={persona.id}>
                      {persona.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="objective">Business objective</Label>
              <Textarea id="objective" value={form.businessObjective} onChange={(e) => set("businessObjective", e.target.value)} rows={2} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="outcome">Target outcome</Label>
              <Textarea id="outcome" value={form.businessOutcome} onChange={(e) => set("businessOutcome", e.target.value)} rows={2} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="persona">Target persona</Label>
              <Input id="persona" value={form.targetPersona} onChange={(e) => set("targetPersona", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="users">Target users</Label>
              <Input id="users" value={form.targetUsers} onChange={(e) => set("targetUsers", e.target.value)} placeholder="800 collections specialists" />
            </div>
          </div>
        </SectionCard>
      ) : null}

      {step === 2 ? (
        <SectionCard title="Channels and automation boundary" description="Automation level drives guardrail and approval expectations.">
          <div className="space-y-5">
            <div className="space-y-2">
              <Label>Channels</Label>
              <div className="flex flex-wrap gap-2">
                {AGENT_CHANNELS.map((channel) => (
                  <button
                    key={channel}
                    type="button"
                    onClick={() => toggleChannel(channel)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs capitalize transition",
                      form.channels.includes(channel)
                        ? "border-brand bg-brand/10 text-brand"
                        : "border-border bg-surface text-muted-foreground hover:border-brand/40",
                    )}
                  >
                    {channel.replace(/-/g, " ")}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="automation">Automation level</Label>
                <Select value={form.automationLevel} onValueChange={(value) => set("automationLevel", value as AutomationLevel)}>
                  <SelectTrigger id="automation">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AUTOMATION_LEVELS.map((level) => (
                      <SelectItem key={level} value={level} className="capitalize">
                        {level.replace(/-/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="environment">Target environment</Label>
                <Select value={form.environment} onValueChange={(value) => set("environment", value as AgentEnvironment)}>
                  <SelectTrigger id="environment">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(["sandbox", "dev", "uat", "prod"] as AgentEnvironment[]).map((env) => (
                      <SelectItem key={env} value={env} className="uppercase">
                        {env}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {form.automationLevel !== "assistive" ? (
              <p className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs text-foreground">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden />
                Automation above assistive requires an authorisation guardrail and human-review boundary. The workbench will
                raise this as an AI Suggested item for explicit acceptance.
              </p>
            ) : null}
          </div>
        </SectionCard>
      ) : null}

      {step === 3 ? (
        <SectionCard title="Volume and business impact" description="Feeds the consumption and cost model in the workbench.">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="volume">Expected volume</Label>
              <Input id="volume" value={form.expectedVolume} onChange={(e) => set("expectedVolume", e.target.value)} placeholder="~18,000 conversations per month" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="impact">Expected business impact</Label>
              <Input id="impact" value={form.expectedBusinessImpact} onChange={(e) => set("expectedBusinessImpact", e.target.value)} placeholder="USD 2.1M annualised" />
            </div>
          </div>
        </SectionCard>
      ) : null}

      {step === 4 ? (
        <SectionCard title="Review" description="The agent is created in Draft status and recorded in the audit trail.">
          <dl className="grid gap-4 md:grid-cols-3">
            <KeyValue label="Name" value={form.name || "—"} />
            <KeyValue label="Pattern" value={pattern?.name ?? form.patternId} />
            <KeyValue label="Domain / use case" value={`${form.domain || "—"} · ${form.useCase || "—"}`} />
            <KeyValue label="Channels" value={form.channels.join(", ")} />
            <KeyValue label="Automation" value={form.automationLevel} />
            <KeyValue label="Environment" value={form.environment} />
            <KeyValue label="Owner" value={form.owner} />
            <KeyValue label="Volume" value={form.expectedVolume || "—"} />
            <KeyValue label="Impact" value={form.expectedBusinessImpact || "—"} />
          </dl>
        </SectionCard>
      ) : null}

      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep((s) => s + 1)} disabled={!canAdvance()}>
            Continue
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={() => void submit()} disabled={createAgent.isPending || !form.name.trim()}>
            {createAgent.isPending ? "Creating…" : "Create agent"}
          </Button>
        )}
      </div>
    </div>
  );
};

export default AgentWizardPage;
