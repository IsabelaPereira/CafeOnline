-- Migration 008: adiciona coluna email à tabela profiles e sincroniza com auth.users
-- Executar no SQL Editor do Supabase

-- 1. Adiciona coluna email (sem NOT NULL para não quebrar rows existentes ainda)
alter table public.profiles
  add column if not exists email text;

-- 2. Preenche retroativamente a partir de auth.users
update public.profiles p
set    email = u.email
from   auth.users u
where  u.id = p.id
  and  p.email is null;

-- 3. Atualiza o trigger para também salvar email em novos cadastros
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, name, role, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.email),
    coalesce(new.raw_user_meta_data->>'role', 'cliente'),
    new.email
  )
  on conflict (id) do update
    set email = excluded.email;
  return new;
end;
$$;
