-- ============================================================
-- 1. Novas etapas de funil para leads de assinatura
-- ============================================================
alter table public.leads
  drop constraint if exists leads_etapa_check;

alter table public.leads
  add constraint leads_etapa_check check (
    etapa in (
      'novo',
      'interesse_assinatura',
      'checkout_iniciado',
      'pagamento_iniciado',
      'pagamento_invalido',
      'pagamento_pendente',
      'assinatura_concluida',
      'interesse_reserva',
      'cliente_ativo',
      'inadimplente',
      'recuperacao',
      'perdido'
    )
  );

-- ============================================================
-- 2. Permite que o cliente atualize sua própria assinatura
--    (necessário para SuccessPage ativar status 'ativa')
-- ============================================================
create policy "assinaturas_update_cliente"
  on public.assinaturas
  for update
  using (
    cliente_id in (select id from public.clientes where user_id = auth.uid())
  )
  with check (
    cliente_id in (select id from public.clientes where user_id = auth.uid())
  );
