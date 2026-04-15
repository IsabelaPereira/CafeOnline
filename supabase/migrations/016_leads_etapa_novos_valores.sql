-- ============================================================
-- Atualiza o check constraint da coluna etapa em leads para
-- incluir os novos valores do funil de checkout.
-- ============================================================

alter table public.leads
  drop constraint if exists leads_etapa_check;

alter table public.leads
  add constraint leads_etapa_check check (etapa in (
    'novo',
    'interesse_assinatura',
    'checkout_plano',
    'checkout_contato',
    'checkout_preferencias',
    'checkout_endereco',
    'checkout_pagamento',
    'checkout_iniciado',
    'pagamento_iniciado',
    'pagamento_invalido',
    'pagamento_pendente',
    'assinatura_concluida',
    'interesse_reserva',
    'cliente_ativo',
    'inadimplente',
    'recuperacao',
    'perdido'
  ));
