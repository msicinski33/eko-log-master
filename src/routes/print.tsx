import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { addDays, eachDayOfInterval, format, isSameDay, parseISO, startOfWeek } from "date-fns";
import { pl } from "date-fns/locale";
import { ArrowLeft, Printer } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { useFractions, useHolidays, useOverrides, useRules, type Segment } from "@/lib/store";
import {
  fmtISO, getOccurrencesInRange, isHolidayFor, PL_DAY_LABELS,
  type Occurrence,
} from "@/lib/schedule";

const searchSchema = z.object({
  from: z.string(),
  to: z.string(),
  segment: z.enum(["residential", "business"]).default("residential"),
});

export const Route = createFileRoute("/print")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Wydruk harmonogramu — EKO-LOG" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PrintView,
});

function PrintView() {
  const { from, to, segment } = Route.useSearch();
  const [rules] = useRules();
  const [overrides] = useOverrides();
  const [holidays] = useHolidays();
  const [fractions] = useFractions();

  const fromD = parseISO(from);
  const toD = parseISO(to);

  // Wyrównanie do tygodni: zaczynamy od poniedziałku tygodnia "fromD"
  const gridStart = startOfWeek(fromD, { weekStartsOn: 1 });
  // Liczba pełnych tygodni do pokrycia zakresu
  const dayCount = Math.ceil((toD.getTime() - gridStart.getTime()) / 86400000) + 1;
  const weeksCount = Math.ceil(dayCount / 7);
  const gridEnd = addDays(gridStart, weeksCount * 7 - 1);

  const occurrences = useMemo(
    () => getOccurrencesInRange(gridStart, gridEnd, segment as Segment, rules, overrides, fractions, holidays),
    [gridStart, gridEnd, segment, rules, overrides, fractions, holidays],
  );

  const byDay = useMemo(() => {
    const map = new Map<string, Occurrence[]>();
    for (const o of occurrences) {
      const arr = map.get(o.date) ?? [];
      arr.push(o);
      map.set(o.date, arr);
    }
    return map;
  }, [occurrences]);

  const weeks = useMemo(() => {
    const out: Date[][] = [];
    for (let w = 0; w < weeksCount; w++) {
      const start = addDays(gridStart, w * 7);
      out.push(eachDayOfInterval({ start, end: addDays(start, 5) })); // pn..sob
    }
    return out;
  }, [gridStart, weeksCount]);

  useEffect(() => {
    const t = setTimeout(() => window.print(), 400);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="bg-white text-black">
      <header data-print-hide className="mx-auto flex max-w-[280mm] items-center gap-3 p-4">
        <Button asChild variant="outline" className="brutal-border brutal-shadow-sm font-bold uppercase">
          <Link to="/">
            <ArrowLeft className="mr-1 h-4 w-4" /> Powrót
          </Link>
        </Button>
        <div className="mr-auto">
          <h1 className="font-display text-xl font-black uppercase">Podgląd wydruku</h1>
          <p className="text-xs text-muted-foreground">
            {format(fromD, "d MMM yyyy", { locale: pl })} — {format(toD, "d MMM yyyy", { locale: pl })} • {" "}
            {segment === "residential" ? "Mieszkańcy" : "Firmy"}
          </p>
        </div>
        <Button onClick={() => window.print()} className="brutal-border brutal-shadow bg-primary font-bold uppercase text-primary-foreground">
          <Printer className="mr-1 h-4 w-4" /> Drukuj
        </Button>
      </header>

      <main className="mx-auto max-w-[280mm] space-y-4 p-4 print:p-0">
        <div className="mb-2 hidden border-b-2 border-black pb-1 print:block">
          <h1 className="font-display text-xl font-black uppercase">
            EKO-LOG — {segment === "residential" ? "Mieszkańcy" : "Firmy"}
          </h1>
          <p className="text-xs">
            {format(fromD, "d MMMM yyyy", { locale: pl })} — {format(toD, "d MMMM yyyy", { locale: pl })}
          </p>
        </div>

        {weeks.map((days, wi) => (
          <section key={wi} className="break-inside-avoid">
            <h2 className="mb-1 font-display text-xs font-black uppercase">
              Tydzień {format(days[0], "w", { locale: pl })} • {format(days[0], "d MMM", { locale: pl })} — {format(days[5], "d MMM yyyy", { locale: pl })}
            </h2>
            <div className="grid grid-cols-6 gap-1 border-2 border-black">
              {days.map((d) => {
                const iso = fmtISO(d);
                const items = (byDay.get(iso) ?? []).filter((o) => {
                  const t = parseISO(o.date);
                  return t >= fromD && t <= toD;
                });
                const holiday = isHolidayFor(iso, segment as Segment, holidays);
                const outOfRange = d < fromD || d > toD;
                return (
                  <div
                    key={iso}
                    className={
                      "min-h-[28mm] border-r border-black p-1 last:border-r-0 " +
                      (outOfRange ? "bg-gray-100 opacity-50" : "")
                    }
                  >
                    <div className={"mb-1 border-b border-black pb-0.5 " + (holiday ? "bg-yellow-300" : "")}>
                      <div className="font-display text-[9px] font-black uppercase leading-none">
                        {PL_DAY_LABELS[d.getDay() === 0 ? 6 : d.getDay() - 1]}
                      </div>
                      <div className="font-mono text-sm font-black leading-none">
                        {format(d, "d MMM", { locale: pl })}
                        {isSameDay(d, new Date()) && " •"}
                      </div>
                      {holiday && (
                        <div className="text-[8px] font-black uppercase">Wolne</div>
                      )}
                    </div>
                    <div className="space-y-0.5">
                      {items.length === 0 && !holiday && (
                        <div className="text-[8px] uppercase text-gray-500">—</div>
                      )}
                      {items.map((o) => {
                        const color = o.color ?? o.fraction?.color ?? "#6B7280";
                        return (
                          <div
                            key={`${o.ruleId}-${o.date}`}
                            className="route-card flex items-center gap-1 rounded-sm border px-1 py-px text-[9px] font-bold leading-tight"
                            style={{ borderColor: color, backgroundColor: color + "33" }}
                          >
                            <span
                              className="inline-block h-1.5 w-1.5 shrink-0 rounded-[1px] border border-black"
                              style={{ backgroundColor: color }}
                            />
                            <span className="truncate font-display uppercase">{o.ruleName}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}
