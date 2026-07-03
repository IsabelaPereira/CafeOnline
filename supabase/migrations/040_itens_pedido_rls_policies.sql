-- ============================================================
-- itens_pedido está com RLS habilitada (migration 001) mas nunca
-- recebeu nenhuma policy — por padrão isso bloqueia toda leitura
-- e escrita client-side (não-service-role) na tabela, mesmo para
-- a equipe administrativa. Explica pedidos aparecendo com "0 itens"
-- em várias telas, e inserts silenciosamente ignorados (sem erro
-- lançado) em fluxos que não checam o retorno.
--
-- Espelha o padrão já usado em "pedidos" (migration 001).
-- ============================================================

create policy "itens_pedido_own" on public.itens_pedido
  for select using (
    pedido_id in (
      select id from public.pedidos where cliente_id in (
        select id from public.clientes where user_id = auth.uid()
      )
    ) or public.get_my_role() != 'cliente'
  );

create policy "itens_pedido_insert" on public.itens_pedido
  for insert with check (true);

create policy "itens_pedido_update" on public.itens_pedido
  for update using (public.get_my_role() != 'cliente');

create policy "itens_pedido_delete" on public.itens_pedido
  for delete using (public.get_my_role() != 'cliente');
