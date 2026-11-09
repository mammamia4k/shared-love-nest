import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarDays, ChevronLeft, ChevronRight, Clock, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { buildMonthGrid, groupByDate, monthLabel, planTimeLabel, toISODate, WEEKDAYS } from "@/lib/plan-calendar";

type Plan = Tables<"plans">;

export function Plans() {
  const [items, setItems] = useState<Plan[]>([]);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const now = new Date();
  const [selected, setSelected] = useState(() => toISODate(new Date()));
  const [view, setView] = useState({ year: now.getFullYear(), month: now.getMonth() });

  const load = useCallback(async () => {
    const { data, error } = await supabase.from("plans").select("*").order("plan_date", { nullsFirst: false }).order("plan_time", { nullsFirst: false });
    setLoadError(Boolean(error));
    if (!error) setItems(data ?? []);
    setLoading(false);
  }, []);
  useEffect(() => {
    void load();
    const refresh = () => { if (document.visibilityState === "visible") void load(); };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    const timer = window.setInterval(refresh, 15000);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
      window.clearInterval(timer);
    };
  }, [load]);

  function reset() { setTitle(""); setDate(""); setTime(""); setEditing(null); }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || saving) return;
    setSaving(true);
    const values = { title: title.trim(), plan_date: date || null, plan_time: date && time ? time : null };
    const { error } = editing
      ? await supabase.from("plans").update(values).eq("id", editing)
      : await supabase.from("plans").insert(values);
    setSaving(false);
    if (error) { toast.error("Plan kaydedilemedi. Tekrar deneyin."); return; }
    if (date) {
      setSelected(date);
      const [year, month] = date.split("-").map(Number);
      setView({ year, month: month - 1 });
    }
    reset();
    await load();
  }
  async function toggle(p: Plan) {
    const { error } = await supabase.from("plans").update({ done: !p.done }).eq("id", p.id);
    if (error) { toast.error("Plan güncellenemedi."); return; }
    await load();
  }
  async function remove(id: string) {
    const { error } = await supabase.from("plans").delete().eq("id", id);
    if (error) { toast.error("Plan silinemedi."); return; }
    if (editing === id) reset();
    await load();
  }
  function edit(p: Plan) {
    setEditing(p.id); setTitle(p.title); setDate(p.plan_date ?? ""); setTime(p.plan_time?.slice(0, 5) ?? "");
  }
  const days = useMemo(() => buildMonthGrid(view.year, view.month), [view]);
  const byDate = useMemo(() => groupByDate(items), [items]);
  const undated = items.filter(p => !p.plan_date);
  const dayPlans = byDate.get(selected) ?? [];
  function shiftMonth(delta: number) {
    const next = new Date(view.year, view.month + delta, 1);
    setView({ year: next.getFullYear(), month: next.getMonth() });
    setSelected(toISODate(next));
  }
  function renderPlan(p: Plan) {
    return <li key={p.id} className="flex items-center gap-3 rounded-lg border bg-card px-3 py-3">
      <Checkbox checked={p.done} onCheckedChange={() => void toggle(p)} aria-label={`${p.title} tamamlandı`} />
      <div className="min-w-0 flex-1">
        <p className={`break-words text-sm ${p.done ? "text-muted-foreground line-through" : "font-semibold"}`}>{p.title}</p>
        {p.plan_date && <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3 w-3" />{planTimeLabel(p.plan_time)}</p>}
      </div>
      <Button type="button" variant="ghost" size="icon" onClick={() => edit(p)} aria-label={`${p.title} düzenle`} title="Düzenle"><Pencil className="h-4 w-4" /></Button>
      <Button type="button" variant="ghost" size="icon" onClick={() => void remove(p.id)} aria-label={`${p.title} sil`} title="Sil"><Trash2 className="h-4 w-4" /></Button>
    </li>;
  }

  return <div className="space-y-6 pb-8">
    <header className="flex items-center gap-3 border-b pb-4">
      <CalendarDays className="h-7 w-7 text-primary" />
      <h2 className="text-2xl">Ortak takvimimiz</h2>
    </header>
    <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
      <label className="space-y-1 text-sm sm:col-span-2">Plan<Input required placeholder="Birlikte ne yapalım?" value={title} onChange={e => setTitle(e.target.value)} /></label>
      <label className="min-w-0 space-y-1 text-sm">Tarih<Input type="date" className="w-full min-w-0" value={date} onChange={e => { setDate(e.target.value); if (!e.target.value) setTime(""); }} /></label>
      <label className="min-w-0 space-y-1 text-sm">Saat<Input type="time" className="w-full min-w-0" disabled={!date} value={time} onChange={e => setTime(e.target.value)} /></label>
      <div className="flex gap-2 sm:col-span-2">
        <Button disabled={saving}><Plus className="h-4 w-4" />{saving ? "Kaydediliyor…" : editing ? "Değişiklikleri kaydet" : "Plan ekle"}</Button>
        {editing && <Button type="button" variant="outline" onClick={reset}><X className="h-4 w-4" />Vazgeç</Button>}
      </div>
    </form>
    <section aria-label="Aylık takvim" className="space-y-3">
      <header className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="icon" aria-label="Önceki ay" onClick={() => shiftMonth(-1)}><ChevronLeft className="h-5 w-5" /></Button>
        <h3 className="text-xl capitalize">{monthLabel(view.year, view.month)}</h3>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={() => { const today = new Date(); setView({ year: today.getFullYear(), month: today.getMonth() }); setSelected(toISODate(today)); }}>Bugün</Button>
          <Button variant="ghost" size="icon" aria-label="Sonraki ay" onClick={() => shiftMonth(1)}><ChevronRight className="h-5 w-5" /></Button>
        </div>
      </header>
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border bg-border">
        {WEEKDAYS.map(d => <div key={d} className="bg-secondary py-2 text-center text-xs font-semibold text-secondary-foreground">{d}</div>)}
        {days.map(cell => {
          const plans = byDate.get(cell.iso) ?? [];
          return <Button key={cell.iso} variant="ghost" aria-label={`${cell.iso}, ${plans.length} plan`} aria-pressed={selected === cell.iso} onClick={() => { setSelected(cell.iso); }}
            className={`h-auto min-h-20 min-w-0 flex-col items-stretch justify-start gap-1 overflow-hidden whitespace-normal rounded-none bg-card p-1 sm:min-h-28 sm:p-2 ${selected === cell.iso ? "ring-2 ring-inset ring-primary bg-secondary" : ""} ${cell.inMonth ? "" : "text-muted-foreground"}`}>
            <span className={`flex h-6 w-6 shrink-0 items-center justify-center self-start rounded-full text-xs ${cell.isToday ? "bg-primary text-primary-foreground" : ""}`}>{cell.day}</span>
            {plans.slice(0, 2).map(p => <span key={p.id} className={`block w-full min-w-0 rounded-sm bg-accent px-1 py-1 text-left text-[10px] leading-tight text-accent-foreground ${p.done ? "opacity-60 line-through" : ""}`}>
              <span className="block truncate font-semibold">{p.plan_time ? planTimeLabel(p.plan_time) : "—"}</span><span className="block truncate">{p.title}</span>
            </span>)}
            {plans.length > 2 && <span className="text-[10px] text-muted-foreground">+{plans.length - 2}</span>}
          </Button>;
        })}
      </div>
    </section>
    {loadError && <div role="alert" className="flex items-center gap-3 text-sm text-destructive">Planlar yüklenemedi.<Button variant="outline" onClick={() => void load()}>Tekrar dene</Button></div>}
    <section className="space-y-3" aria-label="Seçilen günün planları">
      <h3 className="text-lg">{new Date(`${selected}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}</h3>
      {loading ? <p className="text-sm text-muted-foreground">Planlar yükleniyor…</p> : <ul className="space-y-2">{dayPlans.map(renderPlan)}</ul>}
      {!loading && !loadError && !dayPlans.length && <p className="text-sm text-muted-foreground">Bu gün için plan yok.</p>}
    </section>
    {undated.length > 0 && <section className="space-y-3"><h3 className="text-lg">Tarihsiz planlar</h3><ul className="space-y-2">{undated.map(renderPlan)}</ul></section>}
  </div>;
}
