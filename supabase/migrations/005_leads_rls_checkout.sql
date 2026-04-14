-- Permite que usuários autenticados vejam e atualizem o próprio lead pelo e-mail.
-- Necessário para o fluxo de checkout (upsertLeadByEmail, updateLeadEtapa).

create policy "leads_select_own" on public.leads
  for select
  using (email = auth.email());

create policy "leads_update_own" on public.leads
  for update
  using (email = auth.email())
  with check (email = auth.email());
