import { useEffect, useState } from "react";

export type Segment = "residential" | "business";

export type Fraction = {
  id: string;
  pattern: string;
  color: string; // hex
  label?: string;
};

export type Recurrence = "1w" | "2w" | "4w";

export type Rule = {
  id: string;
  segment: Segment;
  name: string;
  mode: "recurring" | "manual";
  /** Optional per-rule color override (hex). Falls back to fraction color. */
  color?: string;
  // recurring
  dayOfWeek?: 1 | 2 | 3 | 4 | 5 | 6;
  /** Optional multi-day support; if set, takes precedence over dayOfWeek. */
  daysOfWeek?: (1 | 2 | 3 | 4 | 5 | 6)[];
  recurrence?: Recurrence;
  startDate?: string; // ISO yyyy-MM-dd
  // manual
  dates?: string[];
};

export type Override = {
  id: string;
  ruleId: string;
  segment: Segment;
  originalDate?: string; // when moving an existing occurrence
  date: string; // new date
  deleted?: boolean;
};

export type Holiday = {
  date: string;
  label?: string;
  segment: Segment | "both";
};

const KEYS = {
  fractions: "ekolog.fractions",
  rules: "ekolog.rules",
  overrides: "ekolog.overrides",
  holidays: "ekolog.holidays",
} as const;

export const DEFAULT_FRACTIONS: Fraction[] = [
  { id: "f-bio", pattern: "bio", color: "#7CB342", label: "BIO" },
  { id: "f-zmie", pattern: "zmieszane,zm,zmie", color: "#212121", label: "Zmieszane" },
  { id: "f-plast", pattern: "plastik,plast,pl,metal,tworzywa", color: "#FFC107", label: "Plastik / Metal" },
  { id: "f-pap", pattern: "papier,pap", color: "#1976D2", label: "Papier" },
  { id: "f-szk", pattern: "szkło,szklo,szk", color: "#43A047", label: "Szkło" },
  { id: "f-popiol", pattern: "popiół,popiol,pop", color: "#6D4C41", label: "Popiół" },
  { id: "f-gabar", pattern: "gabaryt,gab", color: "#8E24AA", label: "Gabaryty" },
];

type RemoteState = {
  fractions: Fraction[];
  rules: Rule[];
  overrides: Override[];
  holidays: Holiday[];
};

type RemoteKey = keyof RemoteState;

let remoteLoadPromise: Promise<RemoteState | null> | undefined;
const latestRemoteState: Partial<RemoteState> = {};
let remoteFlushTimer: ReturnType<typeof setTimeout> | undefined;
let remoteFlushPromise: Promise<void> | undefined;

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function loadRemoteOnce(): Promise<RemoteState | null> {
  if (typeof window === "undefined") return null;
  if (!remoteLoadPromise) {
    remoteLoadPromise = import("./supabase-state")
      .then((m) => m.loadRemoteState())
      .then((state) => {
        if (state) {
          latestRemoteState.fractions = state.fractions;
          latestRemoteState.rules = state.rules;
          latestRemoteState.overrides = state.overrides;
          latestRemoteState.holidays = state.holidays;
        }
        return state;
      })
      .catch(() => null);
  }
  return remoteLoadPromise;
}

function buildRemoteState(): RemoteState {
  return {
    fractions: latestRemoteState.fractions ?? DEFAULT_FRACTIONS,
    rules: latestRemoteState.rules ?? [],
    overrides: latestRemoteState.overrides ?? [],
    holidays: latestRemoteState.holidays ?? [],
  };
}

function queueRemoteFlush() {
  if (typeof window === "undefined") return;
  if (remoteFlushTimer) clearTimeout(remoteFlushTimer);
  remoteFlushTimer = setTimeout(() => {
    remoteFlushTimer = undefined;
    const payload = buildRemoteState();
    remoteFlushPromise = (remoteFlushPromise ?? Promise.resolve())
      .then(() => import("./supabase-state").then((m) => m.saveRemoteState(payload)))
      .catch(() => undefined);
  }, 600);
}

function useSyncedStore<T>(key: string, remoteKey: RemoteKey, fallback: T) {
  const [value, setValue] = useState<T>(fallback);
  const [hydrated, setHydrated] = useState(false);
  const [remoteReady, setRemoteReady] = useState(false);
  const [seed, setSeed] = useState<string | null>(null);

  useEffect(() => {
    setValue(read<T>(key, fallback));
    setHydrated(true);

    let cancelled = false;
    void (async () => {
      const remote = await loadRemoteOnce();
      if (cancelled) return;
      if (remote && remoteKey in remote) {
        const next = remote[remoteKey] as unknown as T;
        latestRemoteState[remoteKey] = remote[remoteKey] as RemoteState[typeof remoteKey];
        setValue(next);
        try {
          setSeed(JSON.stringify(next));
        } catch {
          setSeed(null);
        }
        try {
          window.localStorage.setItem(key, JSON.stringify(next));
        } catch {
          /* noop */
        }
      }
      setRemoteReady(true);
    })();

    return () => {
      cancelled = true;
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, remoteKey]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* noop */
    }
  }, [key, value, hydrated]);

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === key && e.newValue) {
        try {
          setValue(JSON.parse(e.newValue));
        } catch {
          /* noop */
        }
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [key]);

  useEffect(() => {
    if (!hydrated || !remoteReady) return;
    if (seed != null) {
      try {
        if (JSON.stringify(value) === seed) return;
      } catch {
        /* noop */
      }
    }
    latestRemoteState[remoteKey] = value as unknown as RemoteState[typeof remoteKey];
    queueRemoteFlush();
  }, [hydrated, remoteReady, remoteKey, seed, value]);

  return [value, setValue, hydrated] as const;
}

export function useLocalStore<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(fallback);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setValue(read<T>(key, fallback));
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* noop */
    }
  }, [key, value, hydrated]);

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === key && e.newValue) {
        try {
          setValue(JSON.parse(e.newValue));
        } catch { /* noop */ }
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [key]);

  return [value, setValue, hydrated] as const;
}

export const STORE_KEYS = KEYS;

export function useFractions() {
  return useSyncedStore<Fraction[]>(KEYS.fractions, "fractions", DEFAULT_FRACTIONS);
}
export function useRules() {
  return useSyncedStore<Rule[]>(KEYS.rules, "rules", []);
}
export function useOverrides() {
  return useSyncedStore<Override[]>(KEYS.overrides, "overrides", []);
}
export function useHolidays() {
  return useSyncedStore<Holiday[]>(KEYS.holidays, "holidays", []);
}

export function uid(prefix = "id") {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}-${Date.now().toString(36)}`;
}
