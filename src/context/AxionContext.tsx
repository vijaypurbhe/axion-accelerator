import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { config } from "@/config";
import { PERSONAS } from "@/domain/catalogs";
import type { PersonaId, Session } from "@/domain/types";

const SESSION_KEY = "axion.session";
const TENANT_KEY = "axion.tenantId";

interface AxionContextValue {
  readonly session: Session | null;
  readonly persona: PersonaId;
  readonly activeTenantId: string;
  signIn: (input: { email: string; persona: PersonaId }) => Session;
  signOut: () => void;
  setPersona: (persona: PersonaId) => void;
  setActiveTenantId: (tenantId: string) => void;
}

const AxionContext = createContext<AxionContextValue | undefined>(undefined);

const readSession = (): Session | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Session;
    if (!parsed.email || !parsed.persona) return null;
    return parsed;
  } catch {
    return null;
  }
};

const readTenantId = (): string => {
  if (typeof window === "undefined") return config.defaultTenantId;
  return window.localStorage.getItem(TENANT_KEY) ?? config.defaultTenantId;
};

const displayNameFromEmail = (email: string): string =>
  email
    .split("@")[0]
    .split(/[._-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

export const AxionProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(() => readSession());
  const [activeTenantId, setActiveTenantIdState] = useState<string>(() => readTenantId());

  useEffect(() => {
    if (session) window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else window.localStorage.removeItem(SESSION_KEY);
  }, [session]);

  useEffect(() => {
    window.localStorage.setItem(TENANT_KEY, activeTenantId);
  }, [activeTenantId]);

  const signIn = useCallback(({ email, persona }: { email: string; persona: PersonaId }) => {
    const next: Session = {
      email,
      displayName: displayNameFromEmail(email),
      persona,
      signedInAt: new Date().toISOString(),
    };
    setSession(next);
    return next;
  }, []);

  const signOut = useCallback(() => setSession(null), []);

  const setPersona = useCallback((persona: PersonaId) => {
    setSession((current) => (current ? { ...current, persona } : current));
  }, []);

  const setActiveTenantId = useCallback((tenantId: string) => setActiveTenantIdState(tenantId), []);

  const value = useMemo<AxionContextValue>(
    () => ({
      session,
      persona: session?.persona ?? PERSONAS[0].id,
      activeTenantId,
      signIn,
      signOut,
      setPersona,
      setActiveTenantId,
    }),
    [session, activeTenantId, signIn, signOut, setPersona, setActiveTenantId],
  );

  return <AxionContext.Provider value={value}>{children}</AxionContext.Provider>;
};

export const useAxion = (): AxionContextValue => {
  const context = useContext(AxionContext);
  if (!context) throw new Error("useAxion must be used within AxionProvider.");
  return context;
};
