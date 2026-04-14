-- ============================================================
-- Permite que o próprio cliente insira sua assinatura
-- (necessário para o fluxo de cadastro via AssinarPage)
-- ============================================================

-- Clientes podem inserir assinatura vinculada ao seu próprio clienteId
create policy "assinaturas_insert_cliente"
  on public.assinaturas
  for insert
  with check (
    cliente_id in (
      select id from public.clientes where user_id = auth.uid()
    )
  );
