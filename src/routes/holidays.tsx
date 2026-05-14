import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { format, parseISO } from "date-fns";
import { pl } from "date-fns/locale";
import { PartyPopper, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useHolidays, type Holiday } from "@/lib/store";
import { fmtISO } from "@/lib/schedule";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/holidays")({
  head: () => ({
    meta: [
      { title: "Dni wolne — EKO-LOG" },
      { name: "description", content: "Oznaczaj święta i dni wolne wpływające na harmonogram." },
    ],
  }),
  component: HolidaysPage,
});

function HolidaysPage() {
  const [holidays, setHolidays] = useHolidays();
  const [picked, setPicked] = useState<Date | undefined>();
  const [label, setLabel] = useState("");
  const [segment, setSegment] = useState<Holiday["segment"]>("both");

  const selected = holidays.map((h) => parseISO(h.date));

  function add() {
    if (!picked) return toast.error("Wybierz datę");
    const date = fmtISO(picked);
    if (holidays.some((h) => h.date === date && h.segment === segment)) {
      return toast.error("Już istnieje");
    }
    setHolidays([...holidays, { date, label: label.trim() || undefined, segment }]);
    setPicked(undefined); setLabel("");
    toast.success("Oznaczono jako dzień wolny");
  }

  function remove(date: string, seg: Holiday["segment"]) {
    setHolidays(holidays.filter((h) => !(h.date === date && h.segment === seg)));
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <header className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center bg-primary text-primary-foreground brutal-shadow">
          <PartyPopper className="h-6 w-6" strokeWidth={3} />
        </div>
        <div>
          <h1 className="font-display text-3xl font-black uppercase tracking-tight">Dni wolne</h1>
          <p className="text-sm text-muted-foreground">
            Trasy zaplanowane na te dni będą oznaczone ostrzeżeniem.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-[auto_1fr]">
        <Card className="brutal-border brutal-shadow rounded-md p-3">
          <Calendar
            mode="single"
            selected={picked}
            onSelect={setPicked}
            modifiers={{ marked: selected }}
            modifiersClassNames={{ marked: "bg-accent/30 text-accent-foreground font-bold" }}
            locale={pl}
            className={cn("p-1 pointer-events-auto")}
          />
          <div className="mt-3 space-y-2">
            <Input placeholder="Etykieta (opcjonalnie)" value={label} onChange={(e) => setLabel(e.target.value)} className="brutal-border" />
            <Select value={segment} onValueChange={(v) => setSegment(v as Holiday["segment"])}>
              <SelectTrigger className="brutal-border"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="both">Oba segmenty</SelectItem>
                <SelectItem value="residential">Tylko Mieszkańcy</SelectItem>
                <SelectItem value="business">Tylko Firmy</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={add} className="w-full brutal-border brutal-shadow bg-primary font-bold uppercase text-primary-foreground hover:bg-primary/90">
              Oznacz jako dzień wolny
            </Button>
          </div>
        </Card>

        <Card className="brutal-border brutal-shadow rounded-md p-4">
          <h2 className="mb-3 font-display text-sm font-black uppercase tracking-widest">Lista dni wolnych</h2>
          <div className="space-y-2">
            {holidays.length === 0 && (
              <p className="text-sm text-muted-foreground">Brak dni wolnych.</p>
            )}
            {holidays
              .slice()
              .sort((a, b) => a.date.localeCompare(b.date))
              .map((h, i) => (
                <div key={`${h.date}-${h.segment}-${i}`} className="flex items-center justify-between brutal-border rounded-sm bg-secondary/40 p-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm">{format(parseISO(h.date), "EEE, d MMM yyyy", { locale: pl })}</span>
                    {h.label && <span className="text-sm">— {h.label}</span>}
                    <Badge variant="outline" className="brutal-border">
                      {h.segment === "both" ? "Oba" : h.segment === "residential" ? "Mieszkańcy" : "Firmy"}
                    </Badge>
                  </div>
                  <Button size="sm" variant="destructive" className="brutal-border brutal-shadow-sm" onClick={() => remove(h.date, h.segment)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
