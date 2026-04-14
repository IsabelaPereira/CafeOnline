-- ============================================================
-- 011 — SUPORTE A ASSINATURAS RECORRENTES VIA STRIPE
-- ============================================================
-- Adiciona colunas necessárias para cobranças recorrentes,
-- geração automática de pedidos via webhook e linkagem de
-- ciclos às edições do clube.
-- ============================================================

-- Planos: Stripe Price ID para cobrar de forma recorrente
alter table public.planos
  add column if not exists stripe_price_id text;

-- Assinaturas: IDs do Stripe para rastrear a assinatura recorrente
alter table public.assinaturas
  add column if not exists stripe_subscription_id text unique,
  add column if not exists stripe_price_id text;

-- Cobranças: ID da invoice do Stripe (garante idempotência no webhook)
alter table public.cobrancas_assinatura
  add column if not exists stripe_invoice_id text unique;

-- Ciclos: links para o pedido e cobrança correspondentes
alter table public.ciclos_assinatura
  add column if not exists pedido_id   uuid references public.pedidos(id),
  add column if not exists cobranca_id uuid references public.cobrancas_assinatura(id);

-- Unicidade: apenas um ciclo por assinatura/mês/ano (idempotência no webhook)
-- Antes de criar o constraint, remove duplicatas mantendo o registro mais recente (maior id).
do $$
begin
  -- 1. Remover duplicatas (manter apenas uma linha por grupo via ctid)
  delete from public.ciclos_assinatura c
  where c.ctid not in (
    select min(c2.ctid)
    from public.ciclos_assinatura c2
    group by c2.assinatura_id, c2.mes, c2.ano
  );

  -- 2. Criar constraint apenas se ainda não existir
  if not exists (
    select 1 from pg_constraint
    where conname = 'ciclos_assinatura_unique_mes_ano'
  ) then
    alter table public.ciclos_assinatura
      add constraint ciclos_assinatura_unique_mes_ano
      unique (assinatura_id, mes, ano);
  end if;
end $$;

-- Pedidos: tipo (loja vs assinatura) + links para rastreabilidade
alter table public.pedidos
  add column if not exists tipo          text not null default 'loja'
                                           check (tipo in ('loja', 'assinatura')),
  add column if not exists assinatura_id uuid references public.assinaturas(id),
  add column if not exists ciclo_id      uuid references public.ciclos_assinatura(id);

-- Index para buscar pedidos de assinatura rapidamente
create index if not exists pedidos_assinatura_idx on public.pedidos(assinatura_id);
create index if not exists assinaturas_stripe_sub_idx on public.assinaturas(stripe_subscription_id);
