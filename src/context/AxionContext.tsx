import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { config } from "@/config";
import { PERSONAS } from "@/domain/catalogs";
import type { PersonaId, Session } from "@/domain/types";

const TENANT_KEY = "axion.tenantId";
const INITIATIVE_KEY = "axion.initiativeId";
const PERSONA_KEY = "axion.persona";

interface AxionContextValue {
  readonly session: Session | null;
  readonly userId: string | null;
  /** Roles the signed-in user actually holds on the server. */
  readonly roles: readonly PersonaId[];
  /** False until the stored auth session has been resolved. */
  readonly authReady: boolean;
  readonly persona: PersonaId;
  readonly activeTenantId: string;
  /** Active client workspace (alias of the tenant id). */
  readonly activeClientId: string;
  readonly activeInitiativeId: string | null;
  setActiveInitiativeId: (initiativeId: string | null) => void;
  signIn: (input: { email: string; password: string }) => Promise<void>;
  signUp: (input: { email: string; password: string; persona: PersonaId }) => Promise<void>;
  signOut: () => Promise<void>;
  setPersona: (persona: PersonaId) => void;
  setActiveTenantId: (tenantId: string) => void;
  hasRole: (persona: PersonaId) => boolean;
}

const AxionContext = createContext<AxionContextValue | undefined>(undefined);

const PERSONA_IDS = PERSONAS.map((p) => p.id);

const isPersonaId = (value: string): value is PersonaId => PERSONA_IDS.includes(value as PersonaId);

const readTenantId = (): string => {
  if (typeof window === "undefined") return config.defaultTenantId;
  return window.localStorage.getItem(TENANT_KEY) ?? config.defaultTenantId;
};

const readInitiativeId = (): string | null => {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(INITIATIVE_KEY);
};

const readPersona = (): PersonaId => {
  if (typeof window === "undefined") return PERSONAS[0].id;
  const stored = window.localStorage.getItem(PERSONA_KEY);
  return stored && isPersonaId(stored) ? stored : PERSONAS[0].id;
};

const displayNameFromEmail = (email: string): string =>
  email
    .split("@")[0]
    .split(/[._-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

export const assertAllowedEmail = (email: string) => {
  const normalized = email.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalized)) {
    throw new Error("Enter a valid work email address.");
  }
  if (!normalized.endsWith(`@${config.emailDomain}`)) {
    throw new Error(`Access is restricted to @${config.emailDomain} accounts.`);
  }
  return normalized;
};

export const AxionProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [roles, setRoles] = useState<readonly PersonaId[]>([]);
  const [authReady, setAuthReady] = useState(false);
  const [persona, setPersonaState] = useState<PersonaId>(() => readPersona());
  const [activeTenantId, setActiveTenantIdState] = useState<string>(() => readTenantId());
  const [activeInitiativeId, setActiveInitiativeIdState] = useState<string | null>(() => readInitiativeId());

  /** Provision the profile + demo personas, then read back the granted roles. */
  const hydrate = useCallback(async (email: string, signedInAt: string, uid: string, defaultPersona?: PersonaId) => {
    const displayName = displayNameFromEmail(email);
    await supabase.rpc("ensure_axion_access", {
      _display_name: displayName,
      _persona: defaultPersona ?? readPersona(),
    });
    const { data } = await supabase.from("axion_user_roles").select("role").eq("user_id", uid);
    const granted = (data ?? []).map((row) => row.role).filter(isPersonaId);
    setRoles(granted);
    setUserId(uid);
    setSession({
      email,
      displayName,
      persona: readPersona(),
      signedInAt,
    });
  }, []);

  useEffect(() => {
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, authSession) => {
      if (!authSession?.user?.email) {
        setSession(null);
        setUserId(null);
        setRoles([]);
        return;
      }
      const email = authSession.user.email;
      const uid = authSession.user.id;
      void hydrate(email, new Date().toISOString(), uid);
    });

    void supabase.auth.getSession().then(async ({ data }) => {
      const authSession = data.session;
      if (authSession?.user?.email) {
        await hydrate(authSession.user.email, new Date().toISOString(), authSession.user.id);
      }
      setAuthReady(true);
    });

    return () => subscription.subscription.unsubscribe();
  }, [hydrate]);

  useEffect(() => {
    window.localStorage.setItem(TENANT_KEY, activeTenantId);
  }, [activeTenantId]);

  useEffect(() => {
    window.localStorage.setItem(PERSONA_KEY, persona);
  }, [persona]);

  useEffect(() => {
    if (activeInitiativeId) window.localStorage.setItem(INITIATIVE_KEY, activeInitiativeId);
    else window.localStorage.removeItem(INITIATIVE_KEY);
  }, [activeInitiativeId]);

  const signIn = useCallback(async ({ email, password }: { email: string; password: string }) => {
    const normalized = assertAllowedEmail(email);
    const { error } = await supabase.auth.signInWithPassword({ email: normalized, password });
    if (error) throw new Error(error.message);
  }, []);

  const signUp = useCallback(
    async ({ email, password, persona: chosen }: { email: string; password: string; persona: PersonaId }) => {
      const normalized = assertAllowedEmail(email);
      window.localStorage.setItem(PERSONA_KEY, chosen);
      setPersonaState(chosen);
      const { error } = await supabase.auth.signUp({
        email: normalized,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) throw new Error(error.message);
    },
    [],
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUserId(null);
    setRoles([]);
  }, []);

  const setPersona = useCallback((next: PersonaId) => {
    setPersonaState(next);
    setSession((current) => (current ? { ...current, persona: next } : current));
  }, []);

  const setActiveTenantId = useCallback((tenantId: string) => {
    setActiveTenantIdState(tenantId);
    setActiveInitiativeIdState(null);
  }, []);

  const setActiveInitiativeId = useCallback((initiativeId: string | null) => {
    setActiveInitiativeIdState(initiativeId);
  }, []);

  const hasRole = useCallback((candidate: PersonaId) => roles.includes(candidate), [roles]);

  const value = useMemo<AxionContextValue>(
    () => ({
      session,
      userId,
      roles,
      authReady,
      persona: session?.persona ?? persona,
      activeTenantId,
      activeClientId: activeTenantId,
      activeInitiativeId,
      setActiveInitiativeId,
      signIn,
      signUp,
      signOut,
      setPersona,
      setActiveTenantId,
      hasRole,
    }),
    [
      session,
      userId,
      roles,
      authReady,
      persona,
      activeTenantId,
      activeInitiativeId,
      setActiveInitiativeId,
      signIn,
      signUp,
      signOut,
      setPersona,
      setActiveTenantId,
      hasRole,
    ],
  );

  return <AxionContext.Provider value={value}>{children}</AxionContext.Provider>;
};

export const useAxion = (): AxionContextValue => {
  const context = useContext(AxionContext);
  if (!context) throw new Error("useAxion must be used within AxionProvider.");
  return context;
};
