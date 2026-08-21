import { seedAgents } from "@/data/agentforceSeed";
import type { RoleId } from "@/domain/models";
import type { AgentDesignRecord, AgentReview, AgentSuggestion } from "@/domain/phase6";

/** Phase 6 mock persistence. Mirrors the Phase 2-5 store pattern so a live adapter can replace it. */

import { isSimulationScope, scopedKey } from "./simulationScope";
const STORE_KEY = "axion.phase6.v1";
const LATENCY = 110;

const delay = <T,>(value: T): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(structuredClone(value)), LATENCY));

const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const now = () => new Date().toISOString();

export interface ActorLike {
  readonly actor: string;
  readonly role: RoleId;
}

interface Phase6Store {
  agents: AgentDesignRecord[];
  acceptedSuggestions: { id: string; agentId: string; kind: string; title: string; decision: string; decidedBy: string; decidedAt: string }[];
}

const seed = (): Phase6Store => ({ agents: seedAgents(), acceptedSuggestions: [] });
const empty = (): Phase6Store => ({ agents: [], acceptedSuggestions: [] });
const baseStore = (): Phase6Store => (isSimulationScope() ? seed() : empty());

let cache: Phase6Store | null = null;
let cacheScope: boolean | null = null;

const read = (): Phase6Store => {
  const simulation = isSimulationScope();
  if (cache && cacheScope === simulation) return cache;
  cacheScope = simulation;
  if (typeof window === "undefined") {
    cache = baseStore();
    return cache;
  }
  try {
    const raw = window.localStorage.getItem(scopedKey(STORE_KEY));
    cache = raw ? (JSON.parse(raw) as Phase6Store) : baseStore();
  } catch {
    cache = baseStore();
  }
  if (!cache.agents) cache = baseStore();
  if (simulation && cache.agents.length === 0) cache = seed();
  return cache;
};

const persist = () => {
  if (typeof window === "undefined" || !cache) return;
  window.localStorage.setItem(scopedKey(STORE_KEY), JSON.stringify(cache));
};

const touch = (agent: AgentDesignRecord, actor: ActorLike): AgentDesignRecord => ({
  ...agent,
  updatedAt: now(),
  updatedBy: actor.actor,
});

export const resetPhase6Store = () => {
  cacheScope = isSimulationScope();
  cache = baseStore();
  persist();
};


export const phase6Agents = {
  list: (initiativeId: string) => delay(read().agents.filter((a) => a.initiativeId === initiativeId)),

  get: (id: string) => delay(read().agents.find((a) => a.id === id) ?? null),

  create: (input: Omit<AgentDesignRecord, "id" | "reference" | "createdAt" | "createdBy" | "updatedAt" | "updatedBy">, actor: ActorLike) => {
    const db = read();
    const agent: AgentDesignRecord = {
      ...input,
      id: uid("agt"),
      reference: `AGT-${String(db.agents.length + 1).padStart(3, "0")}`,
      createdAt: now(),
      createdBy: actor.actor,
      updatedAt: now(),
      updatedBy: actor.actor,
    };
    db.agents.push(agent);
    persist();
    return delay(agent);
  },

  update: (id: string, patch: Partial<AgentDesignRecord>, actor: ActorLike) => {
    const db = read();
    const index = db.agents.findIndex((a) => a.id === id);
    if (index < 0) return Promise.reject(new Error(`Agent ${id} not found`));
    db.agents[index] = touch({ ...db.agents[index], ...patch }, actor);
    persist();
    return delay(db.agents[index]);
  },

  snapshotVersion: (id: string, version: string, summary: string, actor: ActorLike) => {
    const db = read();
    const index = db.agents.findIndex((a) => a.id === id);
    if (index < 0) return Promise.reject(new Error(`Agent ${id} not found`));
    const agent = db.agents[index];
    db.agents[index] = touch(
      {
        ...agent,
        version,
        versions: [
          ...agent.versions,
          {
            id: uid("vs"),
            version,
            createdAt: now(),
            createdBy: actor.actor,
            status: agent.status,
            summary,
            counts: {
              topics: agent.topics.length,
              actions: agent.actions.length,
              grounding: agent.grounding.length,
              guardrails: agent.guardrails.length,
              escalations: agent.escalations.length,
            },
          },
        ],
      },
      actor,
    );
    persist();
    return delay(db.agents[index]);
  },

  recordReview: (id: string, review: AgentReview, actor: ActorLike) => {
    const db = read();
    const index = db.agents.findIndex((a) => a.id === id);
    if (index < 0) return Promise.reject(new Error(`Agent ${id} not found`));
    const agent = db.agents[index];
    const existing = agent.reviews.findIndex((r) => r.stage === review.stage);
    const reviews = existing >= 0 ? agent.reviews.map((r, i) => (i === existing ? review : r)) : [...agent.reviews, review];
    db.agents[index] = touch({ ...agent, reviews }, actor);
    persist();
    return delay(db.agents[index]);
  },

  decideSuggestion: (
    agentId: string,
    suggestion: AgentSuggestion,
    decision: "accepted" | "edited" | "rejected",
    actor: ActorLike,
  ) => {
    const db = read();
    db.acceptedSuggestions.push({
      id: uid("sd"),
      agentId,
      kind: suggestion.kind,
      title: suggestion.title,
      decision,
      decidedBy: actor.actor,
      decidedAt: now(),
    });
    persist();
    return delay(db.acceptedSuggestions[db.acceptedSuggestions.length - 1]);
  },

  suggestionDecisions: (agentId: string) => delay(read().acceptedSuggestions.filter((s) => s.agentId === agentId)),
};
