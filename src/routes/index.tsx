import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { addDays, format, isSameDay, parseISO } from "date-fns";
import { pl } from "date-fns/locale";
import {
  AlertTriangle, ChevronLeft, ChevronRight, Printer, Users, Building2, CalendarDays, CalendarRange,
} from "lucide-react";
import { DndContext, useDroppable, type DragEndEvent } from "@dnd-kit/core";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  useFractions, useHolidays, useOverrides, useRules, uid, type Segment,
} from "@/lib/store";
import {
  fmtISO, getOccurrencesInRange, isHolidayFor, PL_DAY_LABELS, weekDays, weekStart, addWeeksISO,
  type Occurrence,
} from "@/lib/schedule";
import { RouteCard } from "@/components/route-card";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pulpit tygodniowy — EKO-LOG" },
      { name: "description", content: "Tygodniowy harmonogram wywozu odpadów dla mieszkańców i firm." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const [rules] = useRules();
  const [overrides, setOverrides] = useOverrides();
  const [holidays, setHolidays] = useHolidays();
  const [fractions] = useFractions();

  const [segment, setSegment] = useState<Segment>("residential");
  const [anchor, setAnchor] = useState<Date>(new Date());
  const start = weekStart(anchor);
  const days = weekDays(start);
  const end = days[days.length - 1];

  const occurrences = useMemo(
    () => getOccurrencesInRange(start, end, segment, rules, overrides, fractions, holidays),
    [start, end, segment, rules, overrides, fractions, holidays],
  );

  const byDay = useMemo(() => {
    const map = new Map<string, Occurrence[]>();
    for (const d of days) map.set(fmtISO(d), []);
    for (const o of occurrences) map.get(o.date)?.push(o);
    return map;
  }, [occurrences, days]);

  const [editing, setEditing] = useState<Occurrence | null>(null);

  function toggleHoliday(date: Date) {
    const iso = fmtISO(date);
    const existing = holidays.find((h) => h.date === iso && (h.segment === segment || h.segment === "both"));
    if (existing) {
      setHolidays(holidays.filter((h) => h !== existing));
      toast.success("Usunięto dzień wolny");
    } else {
      setHolidays([...holidays, { date: iso, segment }]);
      toast.success("Oznaczono jako dzień wolny");
    }
  }

  function moveOccurrence(occ: Occurrence, newDateISO: string) {
    if (occ.date === newDateISO) return;
    const existing = overrides.find(
      (o) => o.ruleId === occ.ruleId && o.originalDate === (occ.movedFrom ?? occ.date),
    );
    if (existing) {
      setOverrides(overrides.map((o) => (o === existing ? { ...o, date: newDateISO } : o)));
    } else {
      setOverrides([
        ...overrides,
        {
          id: uid("ov"),
          ruleId: occ.ruleId,
          segment: occ.segment,
          originalDate: occ.movedFrom ?? occ.date,
          date: newDateISO,
        },
      ]);
    }
    toast.success(`Przeniesiono "${occ.ruleName}"`);
  }

  function onDragEnd(e: DragEndEvent) {
    if (!e.over) return;
    const occ = e.active.data.current?.occurrence as Occurrence | undefined;
    const targetDate = e.over.id as string;
    if (!occ) return;
    moveOccurrence(occ, targetDate);
  }

  return (
    <div className="p-4 md:p-6">
      <header data-print-hide className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center bg-primary text-primary-foreground brutal-shadow">
          <CalendarDays className="h-6 w-6" strokeWidth={3} />
        </div>
        <div className="mr-auto">
          <h1 className="font-display text-2xl md:text-3xl font-black uppercase tracking-tight leading-none">
            Tydzień {format(start, "w", { locale: pl })}
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground font-mono">
            {format(start, "d MMM", { locale: pl })} — {format(end, "d MMM yyyy", { locale: pl })}
          </p>
        </div>

        <Tabs value={segment} onValueChange={(v) => setSegment(v as Segment)}>
          <TabsList className="brutal-border bg-secondary">
            <TabsTrigger value="residential" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Users className="mr-1 h-4 w-4" /> Mieszkańcy
            </TabsTrigger>
            <TabsTrigger value="business" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Building2 className="mr-1 h-4 w-4" /> Firmy
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="brutal-border brutal-shadow-sm" onClick={() => setAnchor(addWeeksISO(anchor, -1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" className="brutal-border brutal-shadow-sm font-bold uppercase" onClick={() => setAnchor(new Date())}>
            Dziś
          </Button>
          <Button variant="outline" size="icon" className="brutal-border brutal-shadow-sm" onClick={() => setAnchor(addWeeksISO(anchor, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <Button onClick={() => window.print()} className="brutal-border brutal-shadow bg-primary font-bold uppercase text-primary-foreground hover:bg-primary/90">
          <Printer className="mr-1 h-4 w-4" /> Drukuj tydzień
        </Button>
      </header>

      <div className="hidden print:block mb-3">
        <h1 className="font-display text-2xl font-black uppercase">
          EKO-LOG — Harmonogram {segment === "residential" ? "Mieszkańcy" : "Firmy"}
        </h1>
        <p className="text-sm">{format(start, "d MMMM yyyy", { locale: pl })} — {format(end, "d MMMM yyyy", { locale: pl })}</p>
      </div>

      <div data-print-area>
        <DndContext onDragEnd={onDragEnd}>
          <div className="print-grid grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {days.map((d) => {
              const iso = fmtISO(d);
              const items = byDay.get(iso) ?? [];
              const holiday = isHolidayFor(iso, segment, holidays);
              const today = isSameDay(d, new Date());
              return (
                <DayColumn
                  key={iso}
                  date={d}
                  iso={iso}
                  label={PL_DAY_LABELS[d.getDay() === 0 ? 6 : d.getDay() - 1]}
                  items={items}
                  isHoliday={holiday}
                  isToday={today}
                  onToggleHoliday={() => toggleHoliday(d)}
                  onCardClick={setEditing}
                />
              );
            })}
          </div>
        </DndContext>
      </div>

      {editing && (
        <EditOccurrenceDialog
          occ={editing}
          onClose={() => setEditing(null)}
          onMove={(date) => {
            moveOccurrence(editing, date);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function DayColumn({
  date, iso, label, items, isHoliday, isToday, onToggleHoliday, onCardClick,
}: {
  date: Date;
  iso: string;
  label: string;
  items: Occurrence[];
  isHoliday: boolean;
  isToday: boolean;
  onToggleHoliday: () => void;
  onCardClick: (o: Occurrence) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: iso });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "relative flex min-h-[260px] flex-col rounded-md border-2 border-border bg-card brutal-shadow-sm overflow-hidden",
        isOver && "ring-4 ring-primary",
      )}
    >
      {isHoliday && (
        <>
          <div className="pointer-events-none absolute inset-0 holiday-stripes opacity-30" />
          <div className="absolute right-1 top-9 z-10 brutal-border bg-accent px-1.5 py-0.5 text-[9px] font-black uppercase text-accent-foreground">
            Dzień wolny
          </div>
        </>
      )}
      <button
        onClick={onToggleHoliday}
        title="Kliknij, aby oznaczyć jako dzień wolny"
        className={cn(
          "print-day-header relative flex items-center justify-between border-b-2 border-border px-2 py-1.5 text-left transition-colors",
          isToday ? "bg-primary text-primary-foreground" : "bg-secondary",
          "hover:bg-accent hover:text-accent-foreground",
        )}
      >
        <div>
          <div className="font-display text-xs font-black uppercase leading-none">{label}</div>
          <div className="font-mono text-lg font-black leading-none">{format(date, "d MMM", { locale: pl })}</div>
        </div>
        {isHoliday && <AlertTriangle className="h-4 w-4" strokeWidth={3} />}
      </button>
      <div className="relative z-[1] flex flex-1 flex-col gap-1.5 p-1.5">
        {items.length === 0 && (
          <div className="my-auto text-center text-[10px] uppercase text-muted-foreground">— brak —</div>
        )}
        {items.map((o) => (
          <RouteCard key={`${o.ruleId}-${o.date}`} occ={o} onClick={() => onCardClick(o)} />
        ))}
      </div>
    </div>
  );
}

function EditOccurrenceDialog({
  occ, onClose, onMove,
}: { occ: Occurrence; onClose: () => void; onMove: (date: string) => void }) {
  const [picked, setPicked] = useState<Date | undefined>(parseISO(occ.date));

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="brutal-border brutal-shadow">
        <DialogHeader>
          <DialogTitle className="font-display uppercase">{occ.ruleName}</DialogTitle>
          <DialogDescription>
            Zmień datę tego konkretnego wystąpienia (zmiana nie wpłynie na regułę cykliczną).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="text-sm">
            <span className="font-bold">Aktualnie:</span>{" "}
            <span className="font-mono">{format(parseISO(occ.date), "EEEE, d MMMM yyyy", { locale: pl })}</span>
            {occ.movedFrom && (
              <div className="text-xs text-muted-foreground">Pierwotnie: {format(parseISO(occ.movedFrom), "d MMM yyyy", { locale: pl })}</div>
            )}
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start brutal-border">
                {picked ? format(picked, "d MMM yyyy", { locale: pl }) : "Wybierz nową datę"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 brutal-border" align="start">
              <Calendar mode="single" selected={picked} onSelect={setPicked} initialFocus className={cn("p-3 pointer-events-auto")} locale={pl} />
            </PopoverContent>
          </Popover>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="brutal-border">Anuluj</Button>
          <Button
            disabled={!picked}
            onClick={() => picked && onMove(fmtISO(picked))}
            className="brutal-border brutal-shadow bg-primary font-bold uppercase text-primary-foreground"
          >
            Zapisz zmianę
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
