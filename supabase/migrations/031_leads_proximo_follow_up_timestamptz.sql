-- ============================================================
-- Migra leads.proximo_follow_up de `date` para `timestamptz` para
-- suportar follow-ups com precisão de minutos (ex: 20 min depois
-- de um check de carrinho abandonado).
-- Valores existentes (YYYY-MM-DD) são interpretados como meia-noite.
-- ============================================================

alter table public.leads
  alter column proximo_follow_up
  type timestamptz
  using case
    when proximo_follow_up is null then null
    else proximo_follow_up::timestamptz
  end;
