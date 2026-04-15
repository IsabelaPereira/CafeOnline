-- ============================================================
-- RPC pública para captura de leads (newsletter, landing forms).
-- Usa SECURITY DEFINER para ignorar RLS, mas mantém segurança
-- limitando o que pode ser inserido via função controlada.
--
-- Motivo: o erro 42501 persiste mesmo com policy leads_insert_public
-- presente — possivelmente devido a interação com outras policies
-- ou comportamento de get_my_role() para usuários anônimos.
-- ============================================================

create or replace function public.subscribe_lead(
  p_nome              text,
  p_email             text,
  p_telefone          text default null,
  p_origem            text default 'landing',
  p_etapa             text default 'novo',
  p_interesse         text default null,
  p_plano_desejado    text default null,
  p_tags              text[] default '{}',
  p_observacoes       text default null,
  p_ultimo_contato    date default null,
  p_proximo_follow_up date default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  -- Se já existe lead com este email, retorna o id existente
  select id into v_id from public.leads where email = p_email limit 1;
  if v_id is not null then
    return v_id;
  end if;

  insert into public.leads (
    nome, email, telefone, origem, etapa, interesse, plano_desejado,
    tags, observacoes, ultimo_contato, proximo_follow_up
  ) values (
    p_nome, p_email, p_telefone, p_origem, p_etapa, p_interesse, p_plano_desejado,
    coalesce(p_tags, '{}'), p_observacoes, p_ultimo_contato, p_proximo_follow_up
  )
  returning id into v_id;

  return v_id;
end;
$$;

-- Permite que qualquer um (anônimo/autenticado) chame a RPC
grant execute on function public.subscribe_lead(
  text, text, text, text, text, text, text, text[], text, date, date
) to anon, authenticated;
