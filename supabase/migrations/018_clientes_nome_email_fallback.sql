-- ============================================================
-- Adiciona colunas de fallback para clientes criados manualmente
-- pelo admin (sem conta de autenticação vinculada).
-- Quando user_id é null, nome e email são lidos dessas colunas.
-- ============================================================

alter table public.clientes
  add column if not exists nome  text,
  add column if not exists email text;

-- Permite ao admin inserir/atualizar clientes sem user_id
create policy "clientes_admin_insert" on public.clientes
  for insert to authenticated
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','atendimento'))
  );

-- Permite ao admin atualizar clientes
create policy "clientes_admin_update" on public.clientes
  for update to authenticated
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','atendimento'))
  );
