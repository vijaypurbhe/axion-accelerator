import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import axionLogo from "@/assets/axion-logo.png.asset.json";
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


  return (
    <div className="grid min-h-screen w-full lg:grid-cols-[1.1fr_1fr]">
      <section className="hidden flex-col justify-between border-r border-border bg-surface px-12 py-12 lg:flex">
        <div className="flex items-center">
          <img src={axionLogo.url} alt="Axion Data Accelerator by Tech Mahindra" className="h-11 w-auto" />
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
          {config.environmentLabel} environment · Server-backed Agentforce Studio
        </p>
      </section>

      <section className="flex items-center justify-center px-6 py-12">
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-6">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
              Restricted to @{config.emailDomain}
            </span>
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
