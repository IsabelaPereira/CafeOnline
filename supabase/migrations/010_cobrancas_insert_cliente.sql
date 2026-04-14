-- Migration 010: permite que o cliente registre a cobrança inicial após pagamento confirmado
-- (fallback quando a Edge Function save-payment-method não está deployada)

create policy "cobrancas_insert_proprio" on public.cobrancas_assinatura
  for insert
  with check (
    assinatura_id in (
      select id from public.assinaturas
      where cliente_id in (
        select id from public.clientes where user_id = auth.uid()
      )
    )
  );
