-- Armazena o Stripe Customer ID no cliente para mostrar cartões salvos nos próximos pagamentos
alter table public.clientes
  add column if not exists stripe_customer_id text;
