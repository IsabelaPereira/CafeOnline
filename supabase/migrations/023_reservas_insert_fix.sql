-- Garante que qualquer pessoa pode inserir reservas (público)
-- e recria a policy de insert que pode ter sido sobrescrita

drop policy if exists "reservas_insert" on public.reservas;

create policy "reservas_insert" on public.reservas
  for insert with check (true);
