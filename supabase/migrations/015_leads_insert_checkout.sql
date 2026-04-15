-- ============================================================
-- Permite que usuários autenticados criem/atualizem o próprio
-- lead durante o checkout.
-- Problema: 005_leads_rls_checkout.sql criou SELECT e UPDATE
-- mas esqueceu o INSERT, impedindo a criação de leads no fluxo
-- de assinatura.
-- ============================================================

-- INSERT na tabela leads para usuário autenticado com o próprio e-mail
create policy "leads_insert_own" on public.leads
  for insert to authenticated
  with check (email = auth.email());

-- INSERT no histórico de etapa para qualquer usuário autenticado
-- (inclui usuários comuns que passam pelo checkout)
create policy "historico_etapa_insert_checkout" on public.historico_etapa_lead
  for insert to authenticated
  with check (true);
