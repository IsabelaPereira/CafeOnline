-- ============================================================
-- Módulo de Reservas — Extensões
-- ============================================================

-- 1. Dias fechados (feriados, eventos especiais etc.)
create table if not exists public.dias_fechados (
  id         uuid primary key default uuid_generate_v4(),
  data       date not null unique,
  motivo     text,
  created_at timestamptz default now()
);

alter table public.dias_fechados enable row level security;
create policy "dias_fechados_read"   on public.dias_fechados for select using (true);
create policy "dias_fechados_manage" on public.dias_fechados for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role != 'cliente'));

-- 2. Adiciona campos às reservas
alter table public.reservas
  add column if not exists duracao_mins   integer default 90,
  add column if not exists mesas_alocadas uuid[]  default '{}';

-- 3. Adiciona nome descritivo às mesas
alter table public.mesas
  add column if not exists nome text;

-- 4. Novos campos de configuração da cafeteria (JSONB — sem ALTER TABLE necessário)
--    Os campos abaixo são gravados via UPDATE na coluna cafeteria (JSONB merge no service).
--    aprovacao_automatica_ate  integer  (0 = nunca automático; N = aprova até N pessoas)
--    tempo_antecedencia_min    integer  (mínimo de minutos de antecedência p/ reserva)
--    Os campos antigos aprovacaoAutomatica e tempoReservaMins foram substituídos.
