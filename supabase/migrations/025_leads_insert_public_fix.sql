-- ============================================================
-- Garante que a policy de INSERT público na tabela leads existe
-- e permite inserções de usuários anônimos (newsletter, captura
-- de leads em páginas públicas) e autenticados.
--
-- Erro observado: 42501 "new row violates row-level security
-- policy for table leads" ao tentar cadastrar newsletter na home.
-- ============================================================

drop policy if exists "leads_insert_public" on public.leads;

create policy "leads_insert_public" on public.leads
  for insert
  to anon, authenticated
  with check (true);
