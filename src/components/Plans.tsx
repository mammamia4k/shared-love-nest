import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

type Plan = { id: string; title: string; plan_date: string | null; done: boolean };

export function Plans() {
  const [items, setItems] = useState<Plan[]>([]);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");

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

  return (
    <div className="space-y-6">
      <form onSubmit={add} className="flex flex-wrap gap-2 rounded-3xl border bg-card p-4 shadow-soft">
        <Input required className="min-w-48 flex-1" placeholder="Birlikte ne yapalım?" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Input type="date" className="w-auto" value={date} onChange={(e) => setDate(e.target.value)} />
        <Button>Ekle</Button>
      </form>
      <ul className="space-y-2">
        {items.map((p) => (
          <li key={p.id} className="flex items-center gap-3 rounded-2xl border bg-card px-4 py-3">
            <Checkbox checked={p.done} onCheckedChange={() => toggle(p)} />
            <span className={p.done ? "flex-1 text-muted-foreground line-through" : "flex-1"}>{p.title}</span>
            {p.plan_date && <span className="text-xs text-muted-foreground">{new Date(p.plan_date).toLocaleDateString("tr-TR")}</span>}
            <button onClick={() => remove(p.id)} className="text-muted-foreground hover:text-destructive" aria-label="Sil">
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
        {!items.length && <p className="text-muted-foreground">Henüz plan yok.</p>}
      </ul>
    </div>
  );
}
