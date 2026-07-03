-- ============================================================
-- Forma de entrega (retirada na loja vs. envio) e fluxo de
-- retirada para pedidos.
--
-- Até aqui só o valor do frete era salvo (0 para retirada, mas
-- também poderia ser 0 numa promoção de frete grátis) — não havia
-- como distinguir com certeza. Adiciona um campo explícito em
-- assinaturas e pedidos, e dois novos status para o fluxo de
-- retirada (paralelo a enviado/entregue, sem gerar etiqueta
-- MelhorEnvio): disponivel_retirada -> retirado.
-- ============================================================

alter table public.pedidos add column if not exists forma_entrega text not null default 'entrega'
  check (forma_entrega in ('entrega','retirada'));

alter table public.assinaturas add column if not exists forma_entrega text not null default 'entrega'
  check (forma_entrega in ('entrega','retirada'));

do $$
begin
  if exists (select 1 from pg_constraint where conname = 'pedidos_status_check') then
    alter table public.pedidos drop constraint pedidos_status_check;
  end if;
  alter table public.pedidos add constraint pedidos_status_check
    check (status in (
      'pendente','pago','em_separacao','enviado','entregue',
      'disponivel_retirada','retirado',
      'cancelado','reembolsado'
    ));
end $$;
