CREATE TABLE public.magazine_cover (
  id text PRIMARY KEY DEFAULT 'shared' CHECK (id = 'shared'),
  photo_id uuid REFERENCES public.memories(id) ON DELETE SET NULL,
  x double precision NOT NULL DEFAULT 50 CHECK (x >= 0 AND x <= 100),
  y double precision NOT NULL DEFAULT 50 CHECK (y >= 0 AND y <= 100),
  zoom double precision NOT NULL DEFAULT 1 CHECK (zoom >= 1 AND zoom <= 3)
);
GRANT SELECT, INSERT, UPDATE ON public.magazine_cover TO authenticated;
GRANT ALL ON public.magazine_cover TO service_role;
ALTER TABLE public.magazine_cover ENABLE ROW LEVEL SECURITY;
CREATE POLICY "couple reads shared cover" ON public.magazine_cover FOR SELECT TO authenticated USING (public.is_couple());
CREATE POLICY "couple creates shared cover" ON public.magazine_cover FOR INSERT TO authenticated WITH CHECK (public.is_couple());
CREATE POLICY "couple updates shared cover" ON public.magazine_cover FOR UPDATE TO authenticated USING (public.is_couple()) WITH CHECK (public.is_couple());