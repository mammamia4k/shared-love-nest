import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { isCoupleEmail } from "@/lib/couple";
import { LoginCard } from "@/components/LoginCard";
import { Memories } from "@/components/Memories";
import { Plans } from "@/components/Plans";
import { Gallery } from "@/components/Gallery";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Heart } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Bizim Köşemiz — Anılar, Fotoğraflar, Planlar" },
      { name: "description", content: "Sadece ikimize özel anı defteri, fotoğraf albümü ve plan listesi." },
      { property: "og:title", content: "Bizim Köşemiz" },
      { property: "og:description", content: "Sadece ikimize özel anı defteri." },
    ],
  }),
  component: Index,
});

function Index() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  if (!ready) return null;

  if (!session) return <LoginCard />;

  if (!isCoupleEmail(session.user.email)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-3xl">Burası özel bir yer</h1>
        <p className="text-muted-foreground">Bu hesabın erişimi yok.</p>
        <Button variant="outline" onClick={() => supabase.auth.signOut()}>Çıkış yap</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-3xl md:text-4xl">
          <Heart className="h-7 w-7 fill-primary text-primary" /> Bizim Köşemiz
        </h1>
        <Button variant="ghost" size="sm" onClick={() => supabase.auth.signOut()}>Çıkış</Button>
      </header>
      <Tabs defaultValue="memories">
        <TabsList className="mb-6 grid w-full grid-cols-3">
          <TabsTrigger value="memories">Anılar</TabsTrigger>
          <TabsTrigger value="gallery">Fotoğraflar</TabsTrigger>
          <TabsTrigger value="plans">Planlar</TabsTrigger>
        </TabsList>
        <TabsContent value="memories"><Memories /></TabsContent>
        <TabsContent value="gallery"><Gallery /></TabsContent>
        <TabsContent value="plans"><Plans /></TabsContent>
      </Tabs>
    </div>
  );
}
