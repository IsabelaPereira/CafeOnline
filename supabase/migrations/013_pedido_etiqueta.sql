-- ============================================================
-- 013 — ETIQUETA DE ENVIO (MelhorEnvio)
-- ============================================================
alter table public.pedidos
  add column if not exists melhorenvio_cart_id text,
  add column if not exists etiqueta_url        text;
