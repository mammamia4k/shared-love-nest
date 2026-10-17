import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isCoupleEmail } from "@/lib/couple";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Heart } from "lucide-react";
import { toast } from "sonner";

export function LoginCard() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!isCoupleEmail(email)) {
      toast.error("Bu e-posta ile giriş yapılamaz.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: true, emailRedirectTo: window.location.origin },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    setSent(true);
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: code.trim(),
      type: "email",
    });
    setBusy(false);
    if (error) toast.error("Kod hatalı ya da süresi dolmuş.");
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-3xl border bg-card p-8 text-center shadow-soft">
        <Heart className="mx-auto mb-4 h-10 w-10 fill-primary text-primary" />
        <h1 className="mb-1 text-3xl">Bizim Köşemiz</h1>
        <p className="mb-6 text-sm text-muted-foreground">Sadece ikimiz için.</p>
        {!sent ? (
          <form onSubmit={send} className="space-y-3">
            <Input type="email" required placeholder="E-posta adresin" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Button className="w-full" disabled={busy}>Giriş kodu gönder</Button>
          </form>
        ) : (
          <form onSubmit={verify} className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {email} adresine bir e-posta gönderdik. İçindeki bağlantıya tıkla ya da kodu yaz.
            </p>
            <Input inputMode="numeric" placeholder="Kod" value={code} onChange={(e) => setCode(e.target.value)} className="text-center tracking-widest" />
            <Button className="w-full" disabled={busy || code.length < 4}>Giriş yap</Button>
            <button type="button" className="text-xs text-muted-foreground underline" onClick={() => setSent(false)}>Farklı e-posta</button>
          </form>
        )}
      </div>
    </div>
  );
}
