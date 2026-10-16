-- Mi Cocina · tabla para sincronizar las FOTOS entre dispositivos
-- Pégalo en Supabase → SQL Editor → RUN (una sola vez)

create table if not exists user_photos (
  user_id uuid references auth.users(id) on delete cascade,
  recipe_id text not null,
  data text,
  pmt bigint default 0,
  updated_at timestamptz default now(),
  primary key (user_id, recipe_id)
);

alter table user_photos enable row level security;

create policy "cada usuario gestiona sus fotos"
  on user_photos for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
