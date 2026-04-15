-- ============================================================
-- Controle server-side de carrinho abandonado (15 min após Stripe)
-- ------------------------------------------------------------
-- - Tabela `lead_abandonment_checks` registra cada verificação
--   pendente (lead + assinatura + quando processar).
-- - Uma Edge Function (process-abandonment-checks) consome as
--   linhas vencidas, verifica o status da assinatura e atualiza
--   o lead.
-- - A Edge Function é invocada periodicamente por pg_cron
--   (ver migração 028).
-- ============================================================

-- Adiciona 'carrinho-abandonado' ao check constraint de leads.etapa
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
    'carrinho-abandonado',
    'interesse_reserva',
    'cliente_ativo',
    'inadimplente',
    'recuperacao',
    'perdido'
  ));

-- Tabela de checks
create table if not exists public.lead_abandonment_checks (
  id             uuid primary key default gen_random_uuid(),
  lead_id        uuid not null references public.leads(id) on delete cascade,
  assinatura_id  uuid references public.assinaturas(id) on delete set null,
  scheduled_at   timestamptz not null,
  processed_at   timestamptz,
  result         text,
  created_at     timestamptz not null default now()
);

-- Index para varrer rapidamente os pendentes vencidos
create index if not exists lead_abandonment_checks_due_idx
  on public.lead_abandonment_checks (scheduled_at)
  where processed_at is null;

-- RLS
alter table public.lead_abandonment_checks enable row level security;

-- Usuários autenticados podem agendar uma check (inserção mínima).
-- Leitura/atualização fica restrita ao service_role (Edge Function).
drop policy if exists lead_abandonment_insert_authenticated
  on public.lead_abandonment_checks;

create policy lead_abandonment_insert_authenticated
  on public.lead_abandonment_checks
  for insert to authenticated
  with check (true);
