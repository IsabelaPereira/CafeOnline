-- Permite que clientes vejam suas próprias cobranças e alterações de assinatura.
-- Sem esta policy, a query de assinaturas do cliente falha com erro RLS.

create policy "cob_own" on public.cobrancas_assinatura
  for select using (
    assinatura_id in (
      select id from public.assinaturas
      where cliente_id in (
        select id from public.clientes where user_id = auth.uid()
      )
    )
    or public.get_my_role() != 'cliente'
  );

create policy "alt_own" on public.alteracoes_assinatura
  for select using (
    assinatura_id in (
      select id from public.assinaturas
      where cliente_id in (
        select id from public.clientes where user_id = auth.uid()
      )
    )
    or public.get_my_role() != 'cliente'
  );
