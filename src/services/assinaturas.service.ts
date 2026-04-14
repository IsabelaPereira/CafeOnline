import { supabase } from '../lib/supabase';
import type { Assinatura, PlanoAssinatura, Endereco, CicloAssinatura, CobrancaAssinatura, AlteracaoAssinatura } from '../types';

function mapPlano(r: any): PlanoAssinatura {
  return { id: r.id, nome: r.nome, descricao: r.descricao ?? '', preco: r.preco, beneficios: r.beneficios ?? [], destaque: r.destaque, ativo: r.ativo, ordem: r.ordem };
}

function mapEndereco(r: any): Endereco {
  if (!r) return { id: '', cep: '', logradouro: '', numero: '', bairro: '', cidade: '', estado: '', padrao: false };
  return { id: r.id, apelido: r.apelido ?? undefined, cep: r.cep, logradouro: r.logradouro, numero: r.numero, complemento: r.complemento ?? undefined, bairro: r.bairro, cidade: r.cidade, estado: r.estado, padrao: r.padrao };
}

function mapAssinatura(r: any): Assinatura {
  return {
    id: r.id, clienteId: r.cliente_id, planoId: r.plano_id,
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
    historicoCobrancas: (r.cobrancas ?? []).map((c: any): CobrancaAssinatura => ({
      id: c.id, data: c.data, valor: c.valor, status: c.status as CobrancaAssinatura['status'], tentativas: c.tentativas, transacaoId: c.transacao_id ?? undefined,
    })),
    historicoAlteracoes: (r.alteracoes ?? []).map((a: any): AlteracaoAssinatura => ({
      id: a.id, tipo: a.tipo, de: a.de ?? undefined, para: a.para ?? undefined, data: a.data, usuario: a.usuario ?? '',
    })),
    ciclos: (r.ciclos ?? []).map((c: any): CicloAssinatura => ({
      id: c.id, mes: c.mes, ano: c.ano, edicaoId: c.edicao_id ?? undefined,
      status: c.status as CicloAssinatura['status'],
      codigoRastreio: c.codigo_rastreio ?? undefined, dataEnvio: c.data_envio ?? undefined, dataEntrega: c.data_entrega ?? undefined,
    })),
    createdAt: r.created_at,
  };
}

const BASE_SELECT = `*, plano:planos(*), endereco:enderecos(*), cobrancas:cobrancas_assinatura(*), alteracoes:alteracoes_assinatura(*), ciclos:ciclos_assinatura(*)`;

export async function getAssinaturas(): Promise<Assinatura[]> {
  const { data, error } = await supabase.from('assinaturas').select(BASE_SELECT).order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapAssinatura);
}

export async function getAssinaturasCliente(clienteId: string): Promise<Assinatura[]> {
  const { data, error } = await supabase.from('assinaturas').select(BASE_SELECT).eq('cliente_id', clienteId).order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapAssinatura);
}

export async function getAssinatura(id: string): Promise<Assinatura | null> {
  const { data, error } = await supabase.from('assinaturas').select(BASE_SELECT).eq('id', id).single();
  if (error) return null;
  return mapAssinatura(data);
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

export async function trocarPlano(id: string, novoPlanoId: string, novoTotal: number): Promise<void> {
  const { error } = await supabase.from('assinaturas').update({ plano_id: novoPlanoId, total_mensal: novoTotal }).eq('id', id);
  if (error) throw error;
}

export async function getPlanos(): Promise<PlanoAssinatura[]> {
  const { data, error } = await supabase.from('planos').select('*').eq('ativo', true).order('ordem');
  if (error) throw error;
  return (data ?? []).map(mapPlano);
}
