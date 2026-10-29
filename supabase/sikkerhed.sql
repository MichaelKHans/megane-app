-- Sikkerhedsregler (RLS) for MeganeDB
-- Kør hele filen i Supabase > SQL Editor. Den kan køres igen uden problemer.
--
-- Resultat:
--   km_historik       alle kan LÆSE (MacroDroid/Wear OS), kun ejeren kan skrive
--   bil_finansiering  kun ejeren
--   laen_afdragsplan  kun ejeren
--   bil_kandidater    kun ejeren
--   renault_token     ingen via appen (kun robotten med secret key)
-- Robotten bruger secret key og går uden om reglerne.

-- 1) Hvem er "ejeren"? Ret mailen, hvis du logger ind i appen med en anden.
create or replace function public.er_ejer()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((select auth.jwt() ->> 'email') in ('mh@mh-t.dk'), false);
$$;

-- 2) Slå RLS til og fjern alle gamle regler (bl.a. den "always true" på km_historik)
do $$
declare
  t text;
  p record;
begin
  foreach t in array array['km_historik', 'bil_finansiering', 'laen_afdragsplan', 'bil_kandidater', 'renault_token'] loop
    execute format('alter table public.%I enable row level security', t);
    for p in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
      execute format('drop policy %I on public.%I', p.policyname, t);
    end loop;
  end loop;
end $$;

-- 3) km_historik: læs for alle, skriv kun ejeren
create policy "Alle kan læse km" on public.km_historik
  for select to anon, authenticated using (true);
create policy "Ejer kan tilføje km" on public.km_historik
  for insert to authenticated with check ((select public.er_ejer()));
create policy "Ejer kan rette km" on public.km_historik
  for update to authenticated using ((select public.er_ejer())) with check ((select public.er_ejer()));
create policy "Ejer kan slette km" on public.km_historik
  for delete to authenticated using ((select public.er_ejer()));

-- 4) Økonomi-tabeller: kun ejeren kan læse og skrive
create policy "Kun ejer" on public.bil_finansiering
  for all to authenticated using ((select public.er_ejer())) with check ((select public.er_ejer()));
create policy "Kun ejer" on public.laen_afdragsplan
  for all to authenticated using ((select public.er_ejer())) with check ((select public.er_ejer()));
create policy "Kun ejer" on public.bil_kandidater
  for all to authenticated using ((select public.er_ejer())) with check ((select public.er_ejer()));

-- renault_token får bevidst ingen regler = ingen adgang udefra.
