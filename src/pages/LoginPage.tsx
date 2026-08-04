import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAxion } from "@/context/AxionContext";
import { PERSONAS } from "@/domain/catalogs";
import { config } from "@/config";
import type { PersonaId } from "@/domain/types";

const LoginPage = () => {
  const navigate = useNavigate();
  const { signIn } = useAxion();
  const [email, setEmail] = useState("");
  const [persona, setPersona] = useState<PersonaId>("enterprise-architect");
  const [error, setError] = useState<string | null>(null);

  const selectedPersona = useMemo(() => PERSONAS.find((p) => p.id === persona), [persona]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const normalized = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalized)) {
      setError("Enter a valid work email address.");
      return;
    }
    if (!normalized.endsWith(`@${config.emailDomain}`)) {
      setError(`Access is restricted to @${config.emailDomain} accounts.`);
      return;
    }
    setError(null);
    signIn({ email: normalized, persona });
    navigate("/overview", { replace: true });
  };

  return (
    <div className="grid min-h-screen w-full lg:grid-cols-[1.1fr_1fr]">
      <section className="hidden flex-col justify-between border-r border-border bg-surface px-12 py-12 lg:flex">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
            AX
          </span>
          <span className="text-sm font-semibold tracking-tight text-foreground">Tech Mahindra Axion</span>
        </div>

        <div className="max-w-xl space-y-5">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-foreground">
            A trusted, governed, agent-ready data foundation.
          </h1>
          <p className="text-base leading-relaxed text-muted-foreground">
            Axion combines advisory readiness assessment, an architecture and configuration workbench, and a
            deployment accelerator for Salesforce Data 360 and Agentforce — starting with BFSI.
          </p>
          <ul className="grid gap-2 text-sm text-muted-foreground">
            {[
              "Discover → Assess → Design → Configure → Validate → Approve → Deploy → Monitor → Improve",
              "Data product blueprinting, canonical modeling and source-to-target mapping",
              "Identity resolution, unified profiles, activation and Agentforce trust controls",
              "Every AI recommendation is reviewed, decided and audited",
            ].map((item) => (
              <li key={item} className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-muted-foreground">
          {config.environmentLabel} environment · {config.dataMode === "mock" ? "Mock data adapter" : "Live data adapter"}
        </p>
      </section>

      <section className="flex items-center justify-center px-6 py-12">
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-6" noValidate>
          <div className="space-y-1.5">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">Sign in to Axion</h2>
            <p className="text-sm text-muted-foreground">
              Use your Tech Mahindra account and select the persona you are working as.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Work email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder={`name@${config.emailDomain}`}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-invalid={Boolean(error)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="persona">Persona</Label>
            <Select value={persona} onValueChange={(value) => setPersona(value as PersonaId)}>
              <SelectTrigger id="persona">
                <SelectValue placeholder="Select persona" />
              </SelectTrigger>
              <SelectContent>
                {PERSONAS.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedPersona ? (
              <p className="text-xs text-muted-foreground">{selectedPersona.summary}</p>
            ) : null}
          </div>

          {error ? (
            <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <Button type="submit" className="w-full">
            Continue
          </Button>

          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            Session and persona selection are stored locally for this accelerator. Enterprise SSO is a deferred
            backend capability.
          </p>
        </form>
      </section>
    </div>
  );
};

export default LoginPage;
