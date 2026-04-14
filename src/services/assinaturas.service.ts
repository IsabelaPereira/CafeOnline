import { supabase } from '../lib/supabase';
import type { Assinatura, PlanoAssinatura, Endereco, CicloAssinatura, CobrancaAssinatura, AlteracaoAssinatura } from '../types';

function mapPlano(r: any): PlanoAssinatura {
  return { id: r.id, nome: r.nome, descricao: r.descricao ?? '', preco: r.preco, beneficios: r.beneficios ?? [], destaque: r.destaque, ativo: r.ativo, ordem: r.ordem, stripePriceId: r.stripe_price_id ?? undefined };
}

function mapEndereco(r: any): Endereco {
  if (!r) return { id: '', cep: '', logradouro: '', numero: '', bairro: '', cidade: '', estado: '', padrao: false };
  return { id: r.id, apelido: r.apelido ?? undefined, cep: r.cep, logradouro: r.logradouro, numero: r.numero, complemento: r.complemento ?? undefined, bairro: r.bairro, cidade: r.cidade, estado: r.estado, padrao: r.padrao };
}

function mapAssinatura(r: any, clienteInfo?: { nome?: string; email?: string; phone?: string }): Assinatura {
  return {
    id: r.id, clienteId: r.cliente_id, planoId: r.plano_id,
    clienteNome:     clienteInfo?.nome  ?? undefined,
    clienteEmail:    clienteInfo?.email ?? undefined,
    clienteTelefone: clienteInfo?.phone ?? undefined,
    plano: mapPlano(r.plano),
    status: r.status as Assinatura['status'],
    preferenciaCafe: r.preferencia_cafe as 'grao' | 'moido',
    tipoMoagem: r.tipo_moagem ?? undefined,
    enderecoId: r.endereco_id ?? '',
    endereco: mapEndereco(r.endereco),
    frete: r.frete, totalMensal: r.total_mensal,
    proximaCobranca: r.proxima_cobranca ?? '', proximoEnvio: r.proximo_envio ?? '',
    dataInicio: r.data_inicio, dataFim: r.data_fim ?? undefined,
    motivoCancelamento: r.motivo_cancelamento ?? undefined,
    stripeSubscriptionId:       r.stripe_subscription_id ?? undefined,
    stripePriceId:              r.stripe_price_id ?? undefined,
    cancelamentoAgendado:       r.cancelamento_agendado ?? false,
    dataCancelamentoAgendado:   r.data_cancelamento_agendado ?? undefined,
    historicoCobrancas: (r.cobrancas ?? []).map((c: any): CobrancaAssinatura => ({
      id: c.id, data: c.data, valor: c.valor, status: c.status as CobrancaAssinatura['status'], tentativas: c.tentativas, transacaoId: c.transacao_id ?? undefined, stripeInvoiceId: c.stripe_invoice_id ?? undefined,
    })),
    historicoAlteracoes: (r.alteracoes ?? []).map((a: any): AlteracaoAssinatura => ({
      id: a.id, tipo: a.tipo, de: a.de ?? undefined, para: a.para ?? undefined, data: a.data, usuario: a.usuario ?? '',
    })),
    ciclos: (r.ciclos ?? []).map((c: any): CicloAssinatura => ({
      id: c.id, mes: c.mes, ano: c.ano, edicaoId: c.edicao_id ?? undefined,
      status: c.status as CicloAssinatura['status'],
      codigoRastreio: c.codigo_rastreio ?? undefined, dataEnvio: c.data_envio ?? undefined, dataEntrega: c.data_entrega ?? undefined,
      pedidoId: c.pedido_id ?? undefined, cobrancaId: c.cobranca_id ?? undefined,
    })),
    createdAt: r.created_at,
  };
}

// Select completo — para admin (tem acesso a cobrancas e alteracoes)
const BASE_SELECT = `*, plano:planos(*), endereco:enderecos(*), cobrancas:cobrancas_assinatura(*), alteracoes:alteracoes_assinatura(*), ciclos:ciclos_assinatura(*)`;

// Select para cliente — sem '*' para evitar bug do Supabase JS (stripping do primeiro item).
// cobrancas_assinatura: SELECT liberado pela policy "cob_own" (migration 006)
// cobrancas INSERT: liberado pela policy "cobrancas_insert_proprio" (migration 010)
const CLIENT_SELECT = [
  'status, id, cliente_id, plano_id, preferencia_cafe, tipo_moagem',
  'endereco_id, frete, total_mensal, proxima_cobranca, proximo_envio',
  'data_inicio, data_fim, motivo_cancelamento, stripe_subscription_id, stripe_price_id, created_at, cancelamento_agendado, data_cancelamento_agendado',
  'plano:planos(id, nome, descricao, preco, beneficios, destaque, ativo, ordem, stripe_price_id)',
  'endereco:enderecos(id, apelido, cep, logradouro, numero, complemento, bairro, cidade, estado, padrao)',
  'cobrancas:cobrancas_assinatura(id, data, valor, status, tentativas, transacao_id, stripe_invoice_id)',
  'ciclos:ciclos_assinatura(id, mes, ano, status, codigo_rastreio, data_envio, data_entrega, edicao_id, pedido_id, cobranca_id)',
].join(', ');

/** Busca nome/email/telefone dos clientes em queries simples (sem joins aninhados). */
async function resolverClienteInfo(clienteIds: string[]): Promise<Map<string, { nome?: string; email?: string; phone?: string }>> {
  const mapa = new Map<string, { nome?: string; email?: string; phone?: string }>();
  if (clienteIds.length === 0) return mapa;

  const { data: clientes } = await supabase
    .from('clientes')
    .select('id, user_id, phone')
    .in('id', clienteIds);
  if (!clientes?.length) return mapa;

  const userIds = clientes.map((c: any) => c.user_id).filter(Boolean);

  // Tenta buscar name + email de profiles (email existe após migration 008)
  // Fallback para apenas name caso a coluna email ainda não exista
  let profiles: any[] = [];
  const { data: pFull, error: pErr } = await supabase
    .from('profiles')
    .select('id, name, email')
    .in('id', userIds);
  if (!pErr && pFull?.length) {
    profiles = pFull;
  } else {
    const { data: pName } = await supabase
      .from('profiles')
      .select('id, name')
      .in('id', userIds);
    profiles = pName ?? [];
  }

  const profileMap = new Map(profiles.map((p: any) => [p.id, p]));

  clientes.forEach((c: any) => {
    const p = profileMap.get(c.user_id);
    mapa.set(c.id, { nome: p?.name, email: p?.email, phone: c.phone });
  });

  return mapa;
}

export async function getAssinaturas(): Promise<Assinatura[]> {
  const { data, error } = await supabase.from('assinaturas').select(BASE_SELECT).order('created_at', { ascending: false });
  if (error) throw error;
  const rows = data ?? [];
  const clienteMap = await resolverClienteInfo([...new Set(rows.map((r: any) => r.cliente_id))]);
  return rows.map((r: any) => mapAssinatura(r, clienteMap.get(r.cliente_id)));
}

export async function getAssinaturasCliente(clienteId: string): Promise<Assinatura[]> {
  // Usa CLIENT_SELECT para evitar erro RLS em cobrancas/alteracoes (ver migration 006)
  const { data, error } = await supabase.from('assinaturas').select(CLIENT_SELECT).eq('cliente_id', clienteId).order('created_at', { ascending: false });
  if (error) throw error;
  const rows = data ?? [];
  const clienteMap = await resolverClienteInfo([clienteId]);
  return rows.map((r: any) => mapAssinatura(r, clienteMap.get(r.cliente_id)));
}

export async function getAssinatura(id: string): Promise<Assinatura | null> {
  const { data, error } = await supabase.from('assinaturas').select(BASE_SELECT).eq('id', id).single();
  if (error) return null;
  const clienteMap = await resolverClienteInfo([data.cliente_id]);
  return mapAssinatura(data, clienteMap.get(data.cliente_id));
}

export async function createAssinatura(a: {
  clienteId: string; planoId: string; preferenciaCafe: 'grao' | 'moido'; tipoMoagem?: string;
  enderecoId: string; frete: number; totalMensal: number; proximaCobranca: string; proximoEnvio: string;
}): Promise<Assinatura> {
  const { data, error } = await supabase.from('assinaturas').insert({
    cliente_id: a.clienteId, plano_id: a.planoId, preferencia_cafe: a.preferenciaCafe,
    tipo_moagem: a.tipoMoagem, endereco_id: a.enderecoId, frete: a.frete,
    total_mensal: a.totalMensal, proxima_cobranca: a.proximaCobranca, proximo_envio: a.proximoEnvio,
    status: 'pendente', data_inicio: new Date().toISOString().split('T')[0],
  }).select().single();
  if (error) throw error;
  return getAssinatura(data.id) as Promise<Assinatura>;
}

export async function updateAssinaturaStatus(id: string, status: Assinatura['status'], motivo?: string): Promise<void> {
  const { error } = await supabase.from('assinaturas').update({
    status, motivo_cancelamento: motivo ?? null,
    data_fim: status === 'cancelada' ? new Date().toISOString().split('T')[0] : null,
  }).eq('id', id);
  if (error) throw error;
}

/** Registra a cobrança inicial após pagamento — fallback quando Edge Function não está deployada. */
export async function registrarCobrancaInicial(assinaturaId: string): Promise<void> {
  const { data } = await supabase.from('assinaturas').select('total_mensal').eq('id', assinaturaId).single();
  if (!data) return;
  await supabase.from('cobrancas_assinatura').insert({
    assinatura_id: assinaturaId,
    data:          new Date().toISOString().split('T')[0],
    valor:         data.total_mensal,
    status:        'pago',
    tentativas:    1,
  });
}

export async function trocarPlano(id: string, novoPlanoId: string, novoTotal: number): Promise<void> {
  const { error } = await supabase.from('assinaturas').update({ plano_id: novoPlanoId, total_mensal: novoTotal }).eq('id', id);
  if (error) throw error;
}

export async function getPlanos(): Promise<PlanoAssinatura[]> {
  const { data, error } = await supabase.from('planos').select('*').order('ordem');
  if (error) throw error;
  return (data ?? []).map(mapPlano);
}

export async function updatePlano(id: string, patch: Partial<Pick<PlanoAssinatura, 'nome' | 'descricao' | 'preco' | 'beneficios' | 'destaque' | 'ativo' | 'ordem' | 'stripePriceId'>>): Promise<void> {
  const dbPatch: Record<string, unknown> = { ...patch };
  if ('stripePriceId' in patch) {
    dbPatch.stripe_price_id = patch.stripePriceId ?? null;
    delete dbPatch.stripePriceId;
  }
  const { error } = await supabase.from('planos').update(dbPatch).eq('id', id);
  if (error) throw error;
}

export type ManageAction =
  | 'pause'
  | 'resume'
  | 'cancel_at_period_end'
  | 'cancel_now'
  | 'reactivate'
  | 'retry_invoice'
  | 'billing_portal';

/** Chama a edge function manage-subscription e retorna o resultado. */
export async function manageAssinatura(
  assinaturaId: string,
  action: ManageAction,
  motivo?: string,
): Promise<{ success?: boolean; url?: string; cancelDate?: string; invoiceStatus?: string; error?: string }> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token ?? supabaseKey;

  const res = await fetch(`${supabaseUrl}/functions/v1/manage-subscription`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      apikey: supabaseKey,
    },
    body: JSON.stringify({ assinatura_id: assinaturaId, action, motivo }),
  });
  return res.json();
}

export async function createPlano(p: Pick<PlanoAssinatura, 'nome' | 'descricao' | 'preco' | 'beneficios' | 'destaque' | 'ativo' | 'ordem'>): Promise<PlanoAssinatura> {
  const { data, error } = await supabase.from('planos').insert(p).select().single();
  if (error) throw error;
  return mapPlano(data);
}
