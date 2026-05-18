import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { pl } from "date-fns/locale";
import { CalendarIcon, Layers3, Plus, Repeat, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useOverrides, useRules, uid, type Recurrence, type Rule, type Segment } from "@/lib/store";
import { countOccurrencesThisYear, fmtISO } from "@/lib/schedule";
import { toast } from "sonner";

export const Route = createFileRoute("/rules")({
  head: () => ({
    meta: [
      { title: "Reguły harmonogramu — EKO-LOG" },
      { name: "description", content: "Silnik reguł cyklicznych i ręcznych dat dla rejonów odbioru." },
    ],
  }),
  component: RulesPage,
});

const DAYS: { value: Rule["dayOfWeek"]; label: string }[] = [
  { value: 1, label: "Poniedziałek" },
  { value: 2, label: "Wtorek" },
  { value: 3, label: "Środa" },
  { value: 4, label: "Czwartek" },
  { value: 5, label: "Piątek" },
  { value: 6, label: "Sobota" },
];

function RulesPage() {
  const [rules, setRules] = useRules();
  const [overrides, setOverrides] = useOverrides();
  const [filter, setFilter] = useState<Segment | "all">("all");

  const filtered = useMemo(
    () => rules.filter((r) => filter === "all" || r.segment === filter),
    [rules, filter],
  );

  function addRule(rule: Rule) {
    setRules([...rules, rule]);
    toast.success("Dodano regułę");
  }
  function deleteRule(id: string) {
    setRules(rules.filter((r) => r.id !== id));
    setOverrides(overrides.filter((o) => o.ruleId !== id));
    toast.success("Usunięto regułę");
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <header className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center bg-primary text-primary-foreground brutal-shadow">
          <Layers3 className="h-6 w-6" strokeWidth={3} />
        </div>
        <div>
          <h1 className="font-display text-3xl font-black uppercase tracking-tight">Silnik Reguł</h1>
          <p className="text-sm text-muted-foreground">
            Definiuj rejony cykliczne lub wskaż ręcznie dni odbioru w roku.
          </p>
        </div>
      </header>

      <RuleForm onAdd={addRule} />

      <Card className="brutal-border brutal-shadow rounded-md p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-sm font-black uppercase tracking-widest">Lista reguł</h2>
          <Tabs value={filter} onValueChange={(v) => setFilter(v as Segment | "all")}>
            <TabsList className="brutal-border bg-secondary">
              <TabsTrigger value="all">Wszystkie</TabsTrigger>
              <TabsTrigger value="residential">Mieszkańcy</TabsTrigger>
              <TabsTrigger value="business">Firmy</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/40">
                <TableHead className="font-display uppercase">Rejon</TableHead>
                <TableHead className="font-display uppercase">Segment</TableHead>
                <TableHead className="font-display uppercase">Tryb</TableHead>
                <TableHead className="font-display uppercase">Szczegóły</TableHead>
                <TableHead className="font-display uppercase">W tym roku</TableHead>
                <TableHead className="text-right font-display uppercase">Akcje</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  Brak reguł — dodaj pierwszą powyżej.
                </TableCell></TableRow>
              )}
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-bold">
                    <span className="inline-flex items-center gap-2">
                      {r.color && (
                        <span
                          className="inline-block h-4 w-4 rounded-sm brutal-border"
                          style={{ backgroundColor: r.color }}
                          aria-hidden
                        />
                      )}
                      {r.name}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="brutal-border">
                      {r.segment === "residential" ? "Mieszkańcy" : "Firmy"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {r.mode === "recurring"
                      ? <span className="inline-flex items-center gap-1"><Repeat className="h-3 w-3" />Cykliczna</span>
                      : <span className="inline-flex items-center gap-1"><CalendarIcon className="h-3 w-3" />Ręczna</span>}
                  </TableCell>
                  <TableCell className="text-sm">
                    {r.mode === "recurring"
                      ? `${DAYS.find((d) => d.value === r.dayOfWeek)?.label ?? "?"} • co ${r.recurrence?.replace("w", " tyg.")} • od ${r.startDate ? format(parseISO(r.startDate), "d MMM yyyy", { locale: pl }) : "?"}`
                      : `${r.dates?.length ?? 0} dat`}
                  </TableCell>
                  <TableCell className="font-mono">{countOccurrencesThisYear(r, overrides)}</TableCell>
                  <TableCell className="text-right">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="destructive" className="brutal-border brutal-shadow-sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="brutal-border brutal-shadow">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Usunąć regułę „{r.name}"?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Wraz z regułą usunięte zostaną jej zmiany jednorazowe (overrides).
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Anuluj</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteRule(r.id)}>Usuń</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}

function RuleForm({ onAdd }: { onAdd: (rule: Rule) => void }) {
  const [name, setName] = useState("");
  const [segment, setSegment] = useState<Segment>("residential");
  const [mode, setMode] = useState<Rule["mode"]>("recurring");
  const [daysOfWeek, setDaysOfWeek] = useState<NonNullable<Rule["daysOfWeek"]>>([1]);
  const [recurrence, setRecurrence] = useState<Recurrence>("1w");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [manualDates, setManualDates] = useState<Date[]>([]);
  const [useCustomColor, setUseCustomColor] = useState(false);
  const [color, setColor] = useState<string>("#FBBF24");

  function reset() {
    setName(""); setStartDate(undefined); setManualDates([]);
    setUseCustomColor(false); setColor("#FBBF24");
  }

  function submit() {
    if (!name.trim()) return toast.error("Podaj nazwę rejonu");
    const baseRule = {
      id: uid("r"),
      segment,
      name: name.trim(),
      color: useCustomColor ? color : undefined,
    };
    if (mode === "recurring") {
      if (!startDate) return toast.error("Wybierz datę startową");
      const sd = new Date(startDate);
      const desired = dayOfWeek!;
      const current = sd.getDay() === 0 ? 7 : sd.getDay();
      if (current !== desired) {
        toast.warning("Data startowa nie pasuje do wybranego dnia tygodnia — będzie wyrównana.");
      }
      onAdd({
        ...baseRule,
        mode: "recurring",
        dayOfWeek, recurrence, startDate: fmtISO(sd),
      });
    } else {
      if (manualDates.length === 0) return toast.error("Zaznacz co najmniej jedną datę");
      onAdd({
        ...baseRule,
        mode: "manual",
        dates: manualDates.map((d) => fmtISO(d)).sort(),
      });
    }
    reset();
  }

  return (
    <Card className="brutal-border brutal-shadow rounded-md p-4">
      <h2 className="mb-3 font-display text-sm font-black uppercase tracking-widest">Nowa reguła</h2>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-bold uppercase">Nazwa rejonu</label>
          <Input placeholder="np. Rejon 3 — BIO" value={name} onChange={(e) => setName(e.target.value)} className="brutal-border" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold uppercase">Segment</label>
          <Select value={segment} onValueChange={(v) => setSegment(v as Segment)}>
            <SelectTrigger className="brutal-border"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="residential">Mieszkańcy</SelectItem>
              <SelectItem value="business">Firmy</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-3 brutal-border rounded-md bg-secondary/40 p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <label className="block text-xs font-bold uppercase">Kolor rejonu</label>
            <p className="text-[11px] text-muted-foreground">
              Domyślnie dopasowany ze słownika frakcji wg nazwy. Włącz, aby nadpisać.
            </p>
          </div>
          <label className="flex items-center gap-2 text-xs font-bold uppercase">
            <input
              type="checkbox"
              checked={useCustomColor}
              onChange={(e) => setUseCustomColor(e.target.checked)}
              className="h-4 w-4 brutal-border accent-primary"
            />
            Własny kolor
          </label>
        </div>
        {useCustomColor && (
          <div className="mt-3 flex items-center gap-3">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-10 w-14 cursor-pointer brutal-border rounded-md bg-transparent p-0"
              aria-label="Wybierz kolor"
            />
            <Input
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="brutal-border font-mono uppercase w-32"
              maxLength={7}
            />
            <div
              className="h-10 flex-1 rounded-md brutal-border"
              style={{ backgroundColor: color }}
              aria-hidden
            />
          </div>
        )}
      </div>

      <div className="mt-4">
        <Tabs value={mode} onValueChange={(v) => setMode(v as Rule["mode"])}>
          <TabsList className="brutal-border bg-secondary">
            <TabsTrigger value="recurring"><Repeat className="mr-1 h-4 w-4" />Cykliczna</TabsTrigger>
            <TabsTrigger value="manual"><CalendarIcon className="mr-1 h-4 w-4" />Ręczne daty</TabsTrigger>
          </TabsList>

          <TabsContent value="recurring" className="mt-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase">Dzień tygodnia</label>
                <Select value={String(dayOfWeek)} onValueChange={(v) => setDayOfWeek(Number(v) as Rule["dayOfWeek"])}>
                  <SelectTrigger className="brutal-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DAYS.map((d) => <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase">Powtarzalność</label>
                <Select value={recurrence} onValueChange={(v) => setRecurrence(v as Recurrence)}>
                  <SelectTrigger className="brutal-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1w">Co tydzień</SelectItem>
                    <SelectItem value="2w">Co 2 tygodnie</SelectItem>
                    <SelectItem value="4w">Co 4 tygodnie</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase">Data startowa</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start brutal-border", !startDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "d MMM yyyy", { locale: pl }) : "Wybierz datę"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 brutal-border" align="start">
                    <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus className={cn("p-3 pointer-events-auto")} locale={pl} />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="manual" className="mt-3">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-[auto_1fr]">
              <div className="brutal-border rounded-md bg-card p-2">
                <Calendar
                  mode="multiple"
                  selected={manualDates}
                  onSelect={(d) => setManualDates(d ?? [])}
                  numberOfMonths={2}
                  className={cn("p-1 pointer-events-auto")}
                  locale={pl}
                />
              </div>
              <div>
                <p className="mb-2 text-sm">
                  <span className="font-display text-2xl font-black">{manualDates.length}</span>{" "}
                  <span className="text-muted-foreground">wybranych dat</span>
                </p>
                <div className="max-h-64 overflow-y-auto space-y-1 pr-2">
                  {manualDates
                    .slice()
                    .sort((a, b) => a.getTime() - b.getTime())
                    .map((d) => (
                      <div key={d.toISOString()} className="flex items-center justify-between brutal-border rounded-sm bg-secondary/40 px-2 py-1 text-xs">
                        <span className="font-mono">{format(d, "EEE, d MMM yyyy", { locale: pl })}</span>
                        <button
                          onClick={() => setManualDates(manualDates.filter((x) => x.getTime() !== d.getTime()))}
                          className="text-destructive hover:underline"
                        >Usuń</button>
                      </div>
                    ))}
                  {manualDates.length === 0 && (
                    <div className="text-xs text-muted-foreground">Kliknij dni w kalendarzu obok.</div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <div className="mt-4 flex justify-end">
        <Button onClick={submit} className="brutal-border brutal-shadow bg-primary font-bold uppercase text-primary-foreground hover:bg-primary/90">
          <Plus className="mr-1 h-4 w-4" /> Dodaj regułę
        </Button>
      </div>
    </Card>
  );
}
