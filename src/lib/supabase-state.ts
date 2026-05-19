import { supabase } from "@/integrations/supabase/client";
import type { Fraction, Holiday, Override, Rule } from "./store";

export type RemoteState = {
  fractions: Fraction[];
  rules: Rule[];
  overrides: Override[];
  holidays: Holiday[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function normalizeRemoteState(value: unknown): RemoteState | null {
  if (!isRecord(value)) return null;
  const fractions = Array.isArray(value.fractions) ? (value.fractions as Fraction[]) : undefined;
  const rules = Array.isArray(value.rules) ? (value.rules as Rule[]) : undefined;
  const overrides = Array.isArray(value.overrides) ? (value.overrides as Override[]) : undefined;
  const holidays = Array.isArray(value.holidays) ? (value.holidays as Holiday[]) : undefined;

  if (!fractions || !rules || !overrides || !holidays) return null;
  return { fractions, rules, overrides, holidays };
}

export async function loadRemoteState(): Promise<RemoteState | null> {
  const { data, error } = await supabase
    .from("ekolog_state")
    .select("state")
    .eq("id", "global")
    .maybeSingle();

  if (error) throw error;
  return normalizeRemoteState(data?.state);
}

export async function saveRemoteState(state: RemoteState): Promise<void> {
  const { error } = await supabase
    .from("ekolog_state")
    .upsert({ id: "global", state }, { onConflict: "id" });

  if (error) throw error;
}

