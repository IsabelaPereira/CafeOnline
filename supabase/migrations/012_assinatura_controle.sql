-- ============================================================
-- 012 — CONTROLE COMPLETO DE CICLO DE VIDA DA ASSINATURA
-- ============================================================
-- Adiciona colunas para rastrear cancelamento agendado
-- e atualiza o campo status de cobrancas para incluir 'estornado'.
-- ============================================================

-- Assinaturas: suporte a cancelamento agendado no fim do período
alter table public.assinaturas
  add column if not exists cancelamento_agendado      boolean not null default false,
  add column if not exists data_cancelamento_agendado date;
