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
  // recurring
  dayOfWeek?: 1 | 2 | 3 | 4 | 5 | 6;
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
  { id: "f-zmie", pattern: "zmieszane", color: "#212121", label: "Zmieszane" },
  { id: "f-plast", pattern: "plastik", color: "#FFC107", label: "Plastik / Metal" },
  { id: "f-pap", pattern: "papier", color: "#1976D2", label: "Papier" },
  { id: "f-szk", pattern: "szkło", color: "#43A047", label: "Szkło" },
];

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
  return useLocalStore<Fraction[]>(KEYS.fractions, DEFAULT_FRACTIONS);
}
export function useRules() {
  return useLocalStore<Rule[]>(KEYS.rules, []);
}
export function useOverrides() {
  return useLocalStore<Override[]>(KEYS.overrides, []);
}
export function useHolidays() {
  return useLocalStore<Holiday[]>(KEYS.holidays, []);
}

export function uid(prefix = "id") {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}-${Date.now().toString(36)}`;
}
