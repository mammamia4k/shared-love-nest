import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { buildMonthGrid, groupByDate, monthLabel, WEEKDAYS } from "@/lib/plan-calendar";

type Plan = { id: string; title: string; plan_date: string | null; done: boolean };

export function Plans() {
  const [items, setItems] = useState<Plan[]>([]);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const now = new Date();
  const [view, setView] = useState({ year: now.getFullYear(), month: now.getMonth() });

  async function load() {
    const { data } = await supabase.from("plans").select("*").order("done").order("plan_date", { nullsFirst: false });
    setItems((data ?? []) as Plan[]);
  }
  useEffect(() => { load(); }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("plans").insert({ title, plan_date: date || null });
    if (error) { toast.error(error.message); return; }
    setTitle(""); setDate(""); load();
  }

  async function toggle(p: Plan) {
    await supabase.from("plans").update({ done: !p.done }).eq("id", p.id);
    load();
  }

  async function remove(id: string) {
    await supabase.from("plans").delete().eq("id", id);
    load();
  }

  const days = useMemo(() => buildMonthGrid(view.year, view.month), [view]);
  const byDate = useMemo(() => groupByDate(items), [items]);
  const undated = items.filter((p) => !p.plan_date);

  function shiftMonth(delta: number) {
    setView((v) => {
      const next = new Date(v.year, v.month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  }

  return (
    <div className="space-y-6">
      <form onSubmit={add} className="flex flex-wrap gap-2 rounded-3xl border bg-card p-4 shadow-soft">
        <Input required className="min-w-48 flex-1" placeholder="Birlikte ne yapalım?" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Input type="date" className="w-auto" value={date} onChange={(e) => setDate(e.target.value)} />
        <Button>Ekle</Button>
      </form>

      <section className="rounded-3xl border bg-card p-4 shadow-soft">
        <header className="mb-3 flex items-center justify-between">
          <Button variant="ghost" size="icon" aria-label="Önceki ay" onClick={() => shiftMonth(-1)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h2 className="text-xl capitalize">{monthLabel(view.year, view.month)}</h2>
          <Button variant="ghost" size="icon" aria-label="Sonraki ay" onClick={() => shiftMonth(1)}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </header>

        <div className="grid grid-cols-7 gap-px overflow-hidden rounded-2xl border bg-border text-center text-xs text-muted-foreground">
          {WEEKDAYS.map((d) => (
            <div key={d} className="bg-muted px-1 py-2 font-medium">{d}</div>
          ))}
          {days.map((cell) => {
            const plans = byDate.get(cell.iso) ?? [];
            return (
              <div
                key={cell.iso}
                className={`min-h-16 bg-card p-1 text-left align-top md:min-h-24 ${cell.inMonth ? "" : "opacity-40"}`}
              >
                <span
                  className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                    cell.isToday ? "bg-primary font-semibold text-primary-foreground" : ""
                  }`}
                >
                  {cell.day}
                </span>
                <ul className="mt-1 space-y-1">
                  {plans.map((p) => (
                    <li key={p.id} className="group flex items-center gap-1 rounded-md bg-accent px-1.5 py-1">
                      <Checkbox
                        checked={p.done}
                        onCheckedChange={() => toggle(p)}
                        className="h-3.5 w-3.5 shrink-0"
                        aria-label={`${p.title} tamamlandı`}
                      />
                      <span
                        className={`flex-1 truncate text-[11px] leading-tight md:text-xs ${
                          p.done ? "text-muted-foreground line-through" : ""
                        }`}
                        title={p.title}
                      >
                        {p.title}
                      </span>
                      <button
                        onClick={() => remove(p.id)}
                        className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                        aria-label={`${p.title} sil`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      {undated.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">Tarihsiz planlar</h3>
          <ul className="space-y-2">
            {undated.map((p) => (
              <li key={p.id} className="flex items-center gap-3 rounded-2xl border bg-card px-4 py-3">
                <Checkbox checked={p.done} onCheckedChange={() => toggle(p)} />
                <span className={p.done ? "flex-1 text-muted-foreground line-through" : "flex-1"}>{p.title}</span>
                <button onClick={() => remove(p.id)} className="text-muted-foreground hover:text-destructive" aria-label="Sil">
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!items.length && <p className="text-muted-foreground">Henüz plan yok.</p>}
    </div>
  );
}
