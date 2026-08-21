/**
 * Simulation scope gate.
 *
 * Seeded BFSI demonstration content must only ever appear inside simulation /
 * training workspaces. Every browser-persisted phase store keys its data by
 * scope and only instantiates seed data when the active workspace is a
 * simulation workspace. Delivery (live) workspaces always start empty.
 */

let simulation = false;
const listeners = new Set<() => void>();

export const isSimulationScope = (): boolean => simulation;

export const setSimulationScope = (value: boolean) => {
  if (simulation === value) return;
  simulation = value;
  for (const listener of listeners) listener();
};

export const onSimulationScopeChange = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** Storage key namespaced by scope so training data never bleeds into delivery. */
export const scopedKey = (baseKey: string): string => `${baseKey}.${simulation ? "sim" : "live"}`;

/** Returns seeded content in simulation scope, otherwise the empty shape. */
export const seedOrEmpty = <T>(seed: () => T, empty: () => T): T => (simulation ? seed() : empty());

/**
 * Wraps a lazily-loaded, scope-aware store in a proxy so existing
 * `store.collection` reads/writes keep working while the underlying snapshot is
 * swapped whenever the simulation scope changes.
 */
export const createScopedStore = <T extends object>(load: (simulationScope: boolean) => T): T => {
  let snapshot: T | null = null;
  let snapshotScope: boolean | null = null;

  const resolve = (): T => {
    if (snapshot && snapshotScope === simulation) return snapshot;
    snapshotScope = simulation;
    snapshot = load(simulation);
    return snapshot;
  };

  return new Proxy({} as T, {
    get: (_target, prop) => resolve()[prop as keyof T],
    set: (_target, prop, value) => {
      resolve()[prop as keyof T] = value as T[keyof T];
      return true;
    },
    has: (_target, prop) => prop in (resolve() as object),
    ownKeys: () => Reflect.ownKeys(resolve() as object),
    getOwnPropertyDescriptor: (_target, prop) =>
      Reflect.getOwnPropertyDescriptor(resolve() as object, prop),
  });
};

/** Snapshot for serialisation — the proxy itself is not JSON friendly. */
export const plain = <T extends object>(store: T): T => ({ ...store });
