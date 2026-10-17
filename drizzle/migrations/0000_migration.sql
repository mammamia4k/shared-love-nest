create or replace function public.is_couple() returns boolean
language sql stable security definer set search_path = public as $$
  select lower(coalesce(auth.jwt()->>'email','')) in ('mami4k@outlook.com','mami2160p@gmail.com')
$$;
grant execute on function public.is_couple() to authenticated;

create table public.memories (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null default '',
  memory_date date not null default current_date,
  author_id uuid not null default auth.uid(),
  author_email text not null default (auth.jwt()->>'email'),
  photo_path text,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.memories to authenticated;
grant all on public.memories to service_role;
alter table public.memories enable row level security;
create policy "couple only" on public.memories for all to authenticated using (public.is_couple()) with check (public.is_couple());

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  plan_date date,
  done boolean not null default false,
  author_email text not null default (auth.jwt()->>'email'),
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.plans to authenticated;
grant all on public.plans to service_role;
alter table public.plans enable row level security;
create policy "couple only" on public.plans for all to authenticated using (public.is_couple()) with check (public.is_couple());

create policy "couple photos read" on storage.objects for select to authenticated using (bucket_id='photos' and public.is_couple());
create policy "couple photos insert" on storage.objects for insert to authenticated with check (bucket_id='photos' and public.is_couple());
create policy "couple photos delete" on storage.objects for delete to authenticated using (bucket_id='photos' and public.is_couple());