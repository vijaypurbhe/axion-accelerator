import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axionLogo from "@/assets/axion-logo.png";
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
import { ENABLED_INDUSTRY_PACKS } from "@/domain/industries";
import { config } from "@/config";
import type { PersonaId } from "@/domain/types";

type Mode = "sign-in" | "sign-up" | "forgot";

const LoginPage = () => {
  const navigate = useNavigate();
  const { signIn, signUp, signInWithGoogle, requestPasswordReset } = useAxion();
  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [persona, setPersona] = useState<PersonaId>("enterprise-architect");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const selectedPersona = useMemo(() => PERSONAS.find((p) => p.id === persona), [persona]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      if (mode === "forgot") {
        await requestPasswordReset(email);
        setNotice("Reset link sent. Check your inbox and follow the link to set a new password.");
      } else if (mode === "sign-up") {
        await signUp({ email, password, persona });
        setNotice("Account created. You can sign in now.");
        setMode("sign-in");
      } else {
        await signIn({ email, password });
        navigate("/portfolio", { replace: true });
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  };


  const lifecycle = [
    "Discover",
    "Assess",
    "Design",
    "Configure",
    "Validate",
    "Approve",
    "Deploy",
    "Monitor",
    "Improve",
  ];

  return (
    <div className="grid min-h-screen w-full lg:grid-cols-[1.15fr_1fr]">
      <section className="relative hidden flex-col justify-between overflow-hidden border-r border-border bg-surface px-12 py-12 lg:flex">
        {/* decorative background */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -bottom-32 right-0 h-[28rem] w-[28rem] rounded-full bg-brand/10 blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.35]"
            style={{
              backgroundImage:
                "linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)",
              backgroundSize: "56px 56px",
              maskImage: "radial-gradient(ellipse at 30% 30%, black, transparent 75%)",
              WebkitMaskImage: "radial-gradient(ellipse at 30% 30%, black, transparent 75%)",
            }}
          />
        </div>

        <div className="relative flex items-center">
          <img
            src={axionLogo}
            alt="Axion Data Accelerator by Tech Mahindra"
            className="h-24 w-auto drop-shadow-sm"
          />
        </div>

        <div className="relative max-w-xl space-y-6">
          <h1 className="text-[2.75rem] font-semibold leading-[1.08] tracking-tight text-foreground">
            A trusted, governed,{" "}
            <span className="bg-gradient-to-r from-primary to-brand bg-clip-text text-transparent">
              agent-ready
            </span>{" "}
            data foundation.
          </h1>
          <p className="text-base leading-relaxed text-muted-foreground">
            Axion combines advisory readiness assessment, an architecture and configuration workbench, and a
            deployment accelerator for Salesforce Data 360 and Agentforce — across BFSI, Manufacturing, Automotive, and beyond.
          </p>

          <div className="flex flex-wrap gap-1.5">
            {lifecycle.map((step, index) => (
              <span
                key={step}
                className="rounded-full border border-border bg-background/70 px-2.5 py-1 text-[11px] font-medium text-muted-foreground backdrop-blur"
              >
                <span className="mr-1 text-primary">{index + 1}</span>
                {step}
              </span>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { value: "30+", label: "Industry canonical data products" },
              { value: "24", label: "Trust layer controls" },
              { value: "10+", label: "Source platform connectors" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-border bg-background/70 p-4 backdrop-blur"
              >
                <p className="text-2xl font-semibold tracking-tight text-foreground">{stat.value}</p>
                <p className="mt-1 text-xs leading-snug text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {ENABLED_INDUSTRY_PACKS.map((pack) => (
              <span
                key={pack.id}
                className="rounded-full border border-border bg-background/70 px-3 py-1.5 text-xs font-medium text-foreground backdrop-blur"
              >
                {pack.shortName}
              </span>
            ))}
            <span className="rounded-full border border-dashed border-border bg-background/50 px-3 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur">
              HLS · RCPG
            </span>
          </div>

          <ul className="grid gap-2 text-sm text-muted-foreground">
            {[
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

        <p className="relative text-xs text-muted-foreground">
          {config.environmentLabel} environment · Server-backed Agentforce Studio
        </p>
      </section>

      <section className="flex items-center justify-center px-6 py-12">
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-6">
          <div className="space-y-2">
            <img
              src={axionLogo}
              alt="Axion Data Accelerator by Tech Mahindra"
              className="mb-4 h-14 w-auto lg:hidden"
            />

            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              {mode === "sign-in"
                ? "Sign in to Axion"
                : mode === "sign-up"
                  ? "Create your Axion account"
                  : "Reset your password"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {mode === "sign-in"
                ? "Use your work email and password."
                : mode === "sign-up"
                  ? "Register with your work email, then sign in."
                  : "We'll email you a secure link to set a new password."}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Work email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder={`you@${config.emailDomain}`}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          {mode !== "forgot" ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                {mode === "sign-in" ? (
                  <button
                    type="button"
                    className="text-xs text-muted-foreground underline-offset-4 hover:underline"
                    onClick={() => {
                      setMode("forgot");
                      setError(null);
                      setNotice(null);
                    }}
                  >
                    Forgot password?
                  </button>
                ) : null}
              </div>
              <Input
                id="password"
                type="password"
                autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={8}
                required
              />
            </div>
          ) : null}

          {mode === "sign-up" ? (
            <div className="space-y-2">
              <Label htmlFor="persona">Default persona</Label>
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
          ) : null}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {notice ? <p className="text-sm text-brand">{notice}</p> : null}

          <Button type="submit" className="w-full" disabled={busy}>
            {busy
              ? "Please wait…"
              : mode === "sign-in"
                ? "Sign in"
                : mode === "sign-up"
                  ? "Create account"
                  : "Send reset link"}
          </Button>

          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs uppercase tracking-wider text-muted-foreground">or</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={busy}
            onClick={async () => {
              setError(null);
              setNotice(null);
              setBusy(true);
              try {
                await signInWithGoogle();
              } catch (cause) {
                setError(cause instanceof Error ? cause.message : "Google sign-in failed.");
                setBusy(false);
              }
            }}
          >
            Continue with Google
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Only @{config.emailDomain} accounts are permitted, whichever method you use.
          </p>

          <button
            type="button"
            className="w-full text-center text-xs text-muted-foreground underline-offset-4 hover:underline"
            onClick={() => {
              setMode(mode === "sign-in" ? "sign-up" : "sign-in");
              setError(null);
              setNotice(null);
            }}
          >
            {mode === "sign-in" ? "Need an account? Register" : "Already registered? Sign in"}
          </button>

        </form>
      </section>
    </div>
  );
};

export default LoginPage;
