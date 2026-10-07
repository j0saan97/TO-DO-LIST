-- Esquema de la base de datos (Supabase / Postgres).
-- Ejecutar en SQL Editor para recrear el proyecto desde cero.

-- Tablas

create table public.blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  class_name text not null,
  color text,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table public.tasks (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  block_id uuid not null references public.blocks (id) on delete cascade,
  text text not null check (length(trim(text)) > 0),
  importance integer not null,
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

create index tasks_block_id_idx on public.tasks (block_id);
create index tasks_user_id_idx on public.tasks (user_id);

-- Seguridad por filas: cada usuario solo accede a sus propios datos

alter table public.blocks enable row level security;
alter table public.tasks enable row level security;

create policy "Cada usuario gestiona sus bloques"
  on public.blocks for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Cada usuario gestiona sus tareas"
  on public.tasks for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Bloques iniciales para cada usuario nuevo

create or replace function public.create_initial_blocks()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.blocks (user_id, name, class_name) values
    (new.id, 'Casa', 'block-poker'),
    (new.id, 'Trabajo', 'block-programacion'),
    (new.id, 'Estudios', 'block-tareas-varias');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.create_initial_blocks();
