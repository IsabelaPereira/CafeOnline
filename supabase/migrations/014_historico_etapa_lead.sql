-- ============================================================
-- Histórico de alterações de etapa do funil de vendas (leads)
-- ============================================================

create table public.historico_etapa_lead (
  id             uuid primary key default uuid_generate_v4(),
  lead_id        uuid not null references public.leads(id) on delete cascade,
  etapa_anterior text,
  etapa_nova     text not null,
  alterado_por   text,           -- nome/email do admin que fez a alteração
  alterado_em    timestamptz not null default now()
);

create index historico_etapa_lead_lead_idx on public.historico_etapa_lead(lead_id);
create index historico_etapa_lead_em_idx   on public.historico_etapa_lead(alterado_em desc);

-- RLS
alter table public.historico_etapa_lead enable row level security;

-- Admin pode tudo
create policy "historico_etapa_manage" on public.historico_etapa_lead
  using (
    (select role from public.profiles where id = auth.uid())
    in ('admin','marketing','atendimento')
  );

-- Admin pode inserir
create policy "historico_etapa_insert" on public.historico_etapa_lead
  for insert
  with check (
    (select role from public.profiles where id = auth.uid())
    in ('admin','marketing','atendimento')
  );

-- Admin pode deletar
create policy "historico_etapa_delete" on public.historico_etapa_lead
  for delete
  using (
    (select role from public.profiles where id = auth.uid())
    in ('admin','marketing','atendimento')
  );
