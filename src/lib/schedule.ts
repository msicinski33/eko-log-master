import { addDays, addWeeks, format, isAfter, isBefore, isSameDay, parseISO, startOfWeek } from "date-fns";
import type { Fraction, Holiday, Override, Rule, Segment } from "./store";

export function fmtISO(d: Date) {
  return format(d, "yyyy-MM-dd");
}

export function parseISODate(s: string) {
  return parseISO(s);
}

export function weekStart(d: Date) {
  // Monday
  return startOfWeek(d, { weekStartsOn: 1 });
}

export function weekDays(start: Date) {
  // Mon..Sat (6 columns)
  return Array.from({ length: 6 }, (_, i) => addDays(start, i));
}

export type Occurrence = {
  ruleId: string;
  ruleName: string;
  segment: Segment;
  date: string; // ISO
  fraction?: Fraction;
  color?: string;
  isHoliday?: boolean;
  movedFrom?: string;
  ruleMode: Rule["mode"];
};

/**
 * Dopasowanie frakcji do nazwy trasy.
 * - Pattern może zawierać kilka aliasów rozdzielonych przecinkiem lub `|`,
 *   np. "zmieszane,zm" — dopasuje też "FMS – zm".
 * - Najpierw szukamy dopasowania tokenowego (rozbicie nazwy po znakach
 *   nie-literowych), z dopasowaniem skrótów w obie strony (token startsWith
 *   alias lub odwrotnie, min. 2 znaki). Potem fallback do prostego includes.
 */
export function resolveFraction(name: string, fractions: Fraction[]): Fraction | undefined {
  const lower = name.toLowerCase();
  const tokens = lower.split(/[^\p{L}\p{N}]+/u).filter(Boolean);

  const aliasesOf = (f: Fraction) =>
    (f.pattern ?? "")
      .toLowerCase()
      .split(/[,|]/)
      .map((a) => a.trim())
      .filter(Boolean);

  // 1) dopasowanie tokenowe ze skrótami
  for (const f of fractions) {
    for (const a of aliasesOf(f)) {
      if (a.length < 2) continue;
      for (const t of tokens) {
        if (t === a) return f;
        if (t.length >= 2 && (a.startsWith(t) || t.startsWith(a))) return f;
      }
    }
  }
  // 2) fallback: substring
  for (const f of fractions) {
    for (const a of aliasesOf(f)) {
      if (a && lower.includes(a)) return f;
    }
  }
  return undefined;
}

function recurrenceWeeks(r: Rule["recurrence"]): number {
  if (r === "2w") return 2;
  if (r === "4w") return 4;
  return 1;
}

export function expandRule(rule: Rule, from: Date, to: Date): string[] {
  const out: string[] = [];
  if (rule.mode === "manual") {
    for (const d of rule.dates ?? []) {
      const dt = parseISO(d);
      if (!isBefore(dt, from) && !isAfter(dt, to)) out.push(d);
    }
    return out;
  }
  if (!rule.startDate || !rule.recurrence) return out;
  const days = (rule.daysOfWeek && rule.daysOfWeek.length > 0)
    ? rule.daysOfWeek
    : (rule.dayOfWeek ? [rule.dayOfWeek] : []);
  if (days.length === 0) return out;

  const stepDays = recurrenceWeeks(rule.recurrence) * 7;
  // Anchor on the Monday of the startDate's week so multi-day rules emit
  // every selected weekday in each active week.
  const start = parseISO(rule.startDate);
  let weekAnchor = weekStart(start);
  while (!isAfter(weekAnchor, to)) {
    for (const dow of days) {
      const occ = addDays(weekAnchor, dow - 1);
      if (isBefore(occ, start)) continue;
      if (isBefore(occ, from) || isAfter(occ, to)) continue;
      out.push(fmtISO(occ));
    }
    weekAnchor = addDays(weekAnchor, stepDays);
  }
  out.sort();
  return out;
}

export function isHolidayFor(date: string, segment: Segment, holidays: Holiday[]) {
  return holidays.some(
    (h) => h.date === date && (h.segment === "both" || h.segment === segment),
  );
}

export function getOccurrencesInRange(
  from: Date,
  to: Date,
  segment: Segment,
  rules: Rule[],
  overrides: Override[],
  fractions: Fraction[],
  holidays: Holiday[],
): Occurrence[] {
  const result: Occurrence[] = [];
  const segRules = rules.filter((r) => r.segment === segment);

  for (const rule of segRules) {
    const dates = expandRule(rule, from, to);
    const ruleOverrides = overrides.filter((o) => o.ruleId === rule.id);

    for (const d of dates) {
      const removed = ruleOverrides.find((o) => o.originalDate === d && (o.deleted || o.date !== d));
      if (removed) continue; // moved or deleted — handled below
      pushOcc(result, rule, d, fractions, holidays, segment);
    }

    // moved/added overrides for this rule (date not in original expansion)
    for (const o of ruleOverrides) {
      if (o.deleted) continue;
      const dt = parseISO(o.date);
      if (isBefore(dt, from) || isAfter(dt, to)) continue;
      // only push if not already from the original expansion
      if (dates.includes(o.date) && !o.originalDate) continue;
      pushOcc(result, rule, o.date, fractions, holidays, segment, o.originalDate);
    }
  }

  result.sort((a, b) => a.date.localeCompare(b.date));
  return result;
}

function pushOcc(
  arr: Occurrence[],
  rule: Rule,
  date: string,
  fractions: Fraction[],
  holidays: Holiday[],
  segment: Segment,
  movedFrom?: string,
) {
  arr.push({
    ruleId: rule.id,
    ruleName: rule.name,
    segment,
    date,
    fraction: resolveFraction(rule.name, fractions),
    color: rule.color,
    isHoliday: isHolidayFor(date, segment, holidays),
    movedFrom,
    ruleMode: rule.mode,
  });
}

export function countOccurrencesThisYear(
  rule: Rule,
  overrides: Override[],
): number {
  const y = new Date().getFullYear();
  const from = new Date(y, 0, 1);
  const to = new Date(y, 11, 31);
  const base = expandRule(rule, from, to);
  const ruleOverrides = overrides.filter((o) => o.ruleId === rule.id);
  const removed = new Set(
    ruleOverrides
      .filter((o) => o.originalDate && (o.deleted || o.date !== o.originalDate))
      .map((o) => o.originalDate!),
  );
  const added = ruleOverrides
    .filter((o) => !o.deleted && !o.originalDate)
    .map((o) => o.date)
    .filter((d) => {
      const dt = parseISO(d);
      return !isBefore(dt, from) && !isAfter(dt, to);
    });
  const moved = ruleOverrides
    .filter((o) => !o.deleted && o.originalDate)
    .map((o) => o.date)
    .filter((d) => {
      const dt = parseISO(d);
      return !isBefore(dt, from) && !isAfter(dt, to);
    });
  const kept = base.filter((d) => !removed.has(d));
  return kept.length + added.length + moved.length;
}

export function sameDayISO(a: string, b: string) {
  return isSameDay(parseISO(a), parseISO(b));
}

export const PL_DAY_LABELS = ["Pon", "Wt", "Śr", "Czw", "Pt", "Sob"];
export const PL_DAY_LONG = ["Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota"];

export function addWeeksISO(d: Date, n: number) {
  return addWeeks(d, n);
}
