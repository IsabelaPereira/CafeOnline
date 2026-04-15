-- ============================================================
-- Adiciona snapshot de campos ao histórico de etapa do lead.
-- Cada registro passa a guardar o estado dos campos principais
-- no momento em que a etapa foi alterada.
-- ============================================================

alter table public.historico_etapa_lead
  add column if not exists observacoes     text,
  add column if not exists origem          text,
  add column if not exists interesse       text,
  add column if not exists plano_desejado  text,
  add column if not exists tags            text[],
  add column if not exists ultimo_contato  date,
  add column if not exists proximo_follow_up date;
