-- Migration 007: salva informações do cartão Stripe no perfil do cliente
-- Executar no SQL Editor do Supabase

alter table public.clientes
  add column if not exists stripe_card_brand  text,
  add column if not exists stripe_card_last4  text,
  add column if not exists stripe_card_expiry text; -- formato 'MM/YYYY'
