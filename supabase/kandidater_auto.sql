-- Nye kolonner til den ugentlige, automatiske kandidatliste.
-- Kør i Supabase > SQL Editor. Kan køres igen uden problemer.

alter table public.bil_kandidater
  add column if not exists auto boolean not null default false,  -- true = hentet af den ugentlige opgave
  add column if not exists salgsplacering integer,               -- 1 = mest solgte elbil
  add column if not exists kilde_url text,                       -- hvor pris/data kommer fra
  add column if not exists opdateret timestamptz;                -- hvornår rækken blev hentet
