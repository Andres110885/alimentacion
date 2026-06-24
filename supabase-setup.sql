-- Mi Cocina · tabla para la copia en la nube (cópialo en Supabase → SQL Editor → Run)

create table if not exists user_backups (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb,
  updated_at timestamptz default now()
);

alter table user_backups enable row level security;

create policy "cada usuario gestiona su copia"
  on user_backups for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
