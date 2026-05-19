import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trash2, Palette, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useFractions, uid, DEFAULT_FRACTIONS, type Fraction } from "@/lib/store";
import { toast } from "sonner";

export const Route = createFileRoute("/fractions")({
  head: () => ({
    meta: [
      { title: "Słownik Frakcji — EKO-LOG" },
      { name: "description", content: "Definiuj wzorce nazw i kolory frakcji odpadów." },
    ],
  }),
  component: FractionsPage,
});

function FractionsPage() {
  const [fractions, setFractions] = useFractions();
  const [draft, setDraft] = useState<Fraction>({ id: "", pattern: "", color: "#7CB342", label: "" });

  function add() {
    const pattern = draft.pattern.trim().toLowerCase();
    if (!pattern) {
      toast.error("Podaj wzorzec (np. 'bio')");
      return;
    }
    if (fractions.some((f) => f.pattern.toLowerCase() === pattern)) {
      toast.error("Wzorzec już istnieje");
      return;
    }
    setFractions([...fractions, { ...draft, id: uid("f"), pattern }]);
    setDraft({ id: "", pattern: "", color: "#7CB342", label: "" });
    toast.success("Dodano frakcję");
  }

  function remove(id: string) {
    setFractions(fractions.filter((f) => f.id !== id));
    toast.success("Usunięto frakcję");
  }

  function update(id: string, patch: Partial<Fraction>) {
    setFractions(fractions.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <header className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center bg-primary text-primary-foreground brutal-shadow">
          <Palette className="h-6 w-6" strokeWidth={3} />
        </div>
        <div>
          <h1 className="font-display text-3xl font-black uppercase tracking-tight">Słownik Frakcji</h1>
          <p className="text-sm text-muted-foreground">
            Reguły kolorów oparte na nazwach tras. Wzorzec może zawierać kilka aliasów rozdzielonych
            przecinkiem (np. <code>zmieszane,zm</code>) — dopasuje też skróty typu „FMS – zm".
          </p>
        </div>
      </header>

      <Card className="brutal-border brutal-shadow rounded-md p-4">
        <h2 className="mb-3 font-display text-sm font-black uppercase tracking-widest">Dodaj wzorzec</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_120px_auto]">
          <div>
            <label className="mb-1 block text-xs font-bold uppercase">Wzorzec</label>
            <Input
              placeholder="np. bio"
              value={draft.pattern}
              onChange={(e) => setDraft({ ...draft, pattern: e.target.value })}
              className="brutal-border"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase">Etykieta</label>
            <Input
              placeholder="np. BIO odpady"
              value={draft.label ?? ""}
              onChange={(e) => setDraft({ ...draft, label: e.target.value })}
              className="brutal-border"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase">Kolor</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={draft.color}
                onChange={(e) => setDraft({ ...draft, color: e.target.value })}
                className="h-9 w-12 cursor-pointer brutal-border"
              />
              <Input
                value={draft.color}
                onChange={(e) => setDraft({ ...draft, color: e.target.value })}
                className="brutal-border font-mono"
              />
            </div>
          </div>
          <div className="flex items-end">
            <Button
              onClick={add}
              className="brutal-border brutal-shadow bg-primary font-bold uppercase text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="mr-1 h-4 w-4" /> Dodaj
            </Button>
          </div>
        </div>
      </Card>

      <Card className="brutal-border brutal-shadow rounded-md p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/40">
              <TableHead className="font-display uppercase">Kolor</TableHead>
              <TableHead className="font-display uppercase">Wzorzec</TableHead>
              <TableHead className="font-display uppercase">Etykieta</TableHead>
              <TableHead className="text-right font-display uppercase">Akcje</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fractions.length === 0 && (
              <TableRow><TableCell colSpan={4} className="py-8 text-center text-muted-foreground">Brak frakcji</TableCell></TableRow>
            )}
            {fractions.map((f) => (
              <TableRow key={f.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={f.color}
                      onChange={(e) => update(f.id, { color: e.target.value })}
                      className="h-8 w-10 cursor-pointer brutal-border"
                    />
                    <span className="font-mono text-xs">{f.color}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Input
                    value={f.pattern}
                    onChange={(e) => update(f.id, { pattern: e.target.value.toLowerCase() })}
                    className="brutal-border"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={f.label ?? ""}
                    onChange={(e) => update(f.id, { label: e.target.value })}
                    className="brutal-border"
                  />
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => remove(f.id)}
                    className="brutal-border brutal-shadow-sm"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
