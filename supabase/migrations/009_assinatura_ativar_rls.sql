-- Migration 009: permite que o próprio cliente ative sua assinatura pendente após pagamento
-- (fallback para quando a Edge Function save-payment-method não estiver disponível)
-- Executar no SQL Editor do Supabase

create policy "assinaturas_ativar_propria" on public.assinaturas
  for update
  using (
    cliente_id in (select id from public.clientes where user_id = auth.uid())
    and status = 'pendente'
  )
  with check (status = 'ativa');

-- Permite também que clientes cancelem a própria assinatura
create policy "assinaturas_cancelar_propria" on public.assinaturas
  for update
  using (
    cliente_id in (select id from public.clientes where user_id = auth.uid())
    and status in ('ativa', 'pausada')
  )
  with check (status = 'cancelada');
