import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { PERSONAS, personaById } from "@/data/personas";
import { initialNotifications } from "@/data/recommendations";
import type { Notification, Persona, PersonaId } from "@/types";

export interface AssistantSeed {
  prompt: string;
  contextLabel: string;
}

export interface ActivityEntry {
  id: string;
  at: string;
  actor: string;
  action: string;
  object: string;
}

interface PhoenixValue {
  persona: Persona;
  personaId: PersonaId;
  personas: Persona[];
  setPersona: (id: PersonaId) => void;
  signedIn: boolean;
  signIn: (id: PersonaId) => void;
  signOut: () => void;
  notifications: Notification[];
  unreadCount: number;
  markAllRead: () => void;
  markRead: (id: string) => void;
  assistantOpen: boolean;
  setAssistantOpen: (open: boolean) => void;
  assistantSeed: AssistantSeed | null;
  askAssistant: (seed: AssistantSeed) => void;
  clearAssistantSeed: () => void;
  activity: ActivityEntry[];
  logActivity: (entry: Omit<ActivityEntry, "id" | "at" | "actor"> & { actor?: string }) => void;
  acceptedRecommendations: string[];
  dismissedRecommendations: string[];
  acceptRecommendation: (id: string) => void;
  dismissRecommendation: (id: string) => void;
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  theme: "light" | "dark";
  toggleTheme: () => void;
}

const PhoenixContext = createContext<PhoenixValue | null>(null);
const STORAGE_KEY = "phoenix360.session.v1";

interface Persisted {
  personaId: PersonaId;
  signedIn: boolean;
  theme: "light" | "dark";
}

const readPersisted = (): Persisted | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Persisted) : null;
  } catch {
    return null;
  }
};

export function PhoenixProvider({ children }: { children: ReactNode }) {
  const initial = readPersisted();
  const [personaId, setPersonaId] = useState<PersonaId>(initial?.personaId ?? "investment_officer");
  const [signedIn, setSignedIn] = useState(initial?.signedIn ?? false);
  const [theme, setTheme] = useState<"light" | "dark">(initial?.theme ?? "light");
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantSeed, setAssistantSeed] = useState<AssistantSeed | null>(null);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [acceptedRecommendations, setAccepted] = useState<string[]>([]);
  const [dismissedRecommendations, setDismissed] = useState<string[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);

  const persona = useMemo(() => personaById(personaId), [personaId]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ personaId, signedIn, theme } satisfies Persisted));
  }, [personaId, signedIn, theme]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const logActivity = useCallback<PhoenixValue["logActivity"]>(
    (entry) => {
      setActivity((prev) => [
        {
          id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          at: new Date().toISOString(),
          actor: entry.actor ?? persona.name,
          action: entry.action,
          object: entry.object,
        },
        ...prev,
      ].slice(0, 60));
    },
    [persona.name],
  );

  const value: PhoenixValue = {
    persona,
    personaId,
    personas: PERSONAS,
    setPersona: (id) => setPersonaId(id),
    signedIn,
    signIn: (id) => {
      setPersonaId(id);
      setSignedIn(true);
    },
    signOut: () => setSignedIn(false),
    notifications,
    unreadCount: notifications.filter((n) => !n.read).length,
    markAllRead: () => setNotifications((prev) => prev.map((n) => ({ ...n, read: true }))),
    markRead: (id) => setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n))),
    assistantOpen,
    setAssistantOpen,
    assistantSeed,
    askAssistant: (seed) => {
      setAssistantSeed(seed);
      setAssistantOpen(true);
    },
    clearAssistantSeed: () => setAssistantSeed(null),
    activity,
    logActivity,
    acceptedRecommendations,
    dismissedRecommendations,
    acceptRecommendation: (id) => {
      setAccepted((prev) => (prev.includes(id) ? prev : [...prev, id]));
      logActivity({ action: "Recommendation accepted", object: id });
    },
    dismissRecommendation: (id) => {
      setDismissed((prev) => (prev.includes(id) ? prev : [...prev, id]));
      logActivity({ action: "Recommendation dismissed", object: id });
    },
    searchOpen,
    setSearchOpen,
    theme,
    toggleTheme: () => setTheme((t) => (t === "light" ? "dark" : "light")),
  };

  return <PhoenixContext.Provider value={value}>{children}</PhoenixContext.Provider>;
}

export function usePhoenix() {
  const ctx = useContext(PhoenixContext);
  if (!ctx) throw new Error("usePhoenix must be used inside PhoenixProvider");
  return ctx;
}
