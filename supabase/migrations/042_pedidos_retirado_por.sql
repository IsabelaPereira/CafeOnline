-- ============================================================
-- Registra o nome completo de quem retirou o pedido na loja —
-- pedido pelo usuário: ao marcar um pedido como "retirado", o
-- admin precisa informar quem de fato retirou (pode não ser o
-- titular da conta, ex.: um familiar buscando por ele).
-- ============================================================

alter table public.pedidos add column if not exists retirado_por text;
