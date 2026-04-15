-- ============================================================
-- Permite também o role `anon` inserir linhas em
-- lead_abandonment_checks. O checkout agendada check mesmo quando
-- o Supabase ainda não emitiu sessão autenticada (por exemplo, em
-- projetos com confirmação de e-mail ativa). A Edge Function
-- valida cada linha lendo o status real da assinatura, então
-- entradas espúrias não causam efeito colateral relevante.
-- ============================================================

drop policy if exists lead_abandonment_insert_authenticated
  on public.lead_abandonment_checks;

drop policy if exists lead_abandonment_insert_public
  on public.lead_abandonment_checks;

create policy lead_abandonment_insert_public
  on public.lead_abandonment_checks
  for insert to anon, authenticated
  with check (true);
