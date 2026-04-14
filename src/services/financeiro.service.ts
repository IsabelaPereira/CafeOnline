import { supabase } from '../lib/supabase';
import type { ContaReceber, ContaPagar, CategoriaFinanceira } from '../types';

function mapCR(r: any): ContaReceber {
  return {
    id: r.id, descricao: r.descricao, clienteId: r.cliente_id ?? undefined,
    cliente: r.cliente?.profile?.name ?? undefined,
    valor: r.valor, dataVencimento: r.data_vencimento,
    dataRecebimento: r.data_recebimento ?? undefined,
    status: r.status as ContaReceber['status'],
    categoria: r.categoria, subcategoria: r.subcategoria ?? undefined,
    centroCusto: r.centro_custo ?? undefined, formaPagamento: r.forma_pagamento ?? undefined,
    competencia: r.competencia, pedidoId: r.pedido_id ?? undefined,
    assinaturaId: r.assinatura_id ?? undefined, observacoes: r.observacoes ?? undefined,
  };
}

function mapCP(r: any): ContaPagar {
  return {
    id: r.id, descricao: r.descricao, fornecedor: r.fornecedor ?? undefined,
    valor: r.valor, dataVencimento: r.data_vencimento,
    dataPagamento: r.data_pagamento ?? undefined,
    status: r.status as ContaPagar['status'],
    categoria: r.categoria, subcategoria: r.subcategoria ?? undefined,
    centroCusto: r.centro_custo ?? undefined, formaPagamento: r.forma_pagamento ?? undefined,
    competencia: r.competencia, observacoes: r.observacoes ?? undefined, anexo: r.anexo_url ?? undefined,
  };
}

export async function getContasReceber(competencia?: string): Promise<ContaReceber[]> {
  let q = supabase.from('contas_receber')
    .select('*, cliente:clientes(profile:profiles(name))')
    .order('data_vencimento');
  if (competencia) q = q.eq('competencia', competencia);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(mapCR);
}

export async function getContasPagar(competencia?: string): Promise<ContaPagar[]> {
  let q = supabase.from('contas_pagar').select('*').order('data_vencimento');
  if (competencia) q = q.eq('competencia', competencia);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(mapCP);
}

export async function getCategorias(): Promise<CategoriaFinanceira[]> {
  const { data, error } = await supabase.from('categorias_financeiras').select('*').order('tipo').order('nome');
  if (error) throw error;
  return (data ?? []).map(r => ({ id: r.id, nome: r.nome, tipo: r.tipo as CategoriaFinanceira['tipo'], subcategorias: r.subcategorias ?? [] }));
}

export async function createContaReceber(c: Omit<ContaReceber, 'id'>): Promise<ContaReceber> {
  const { data, error } = await supabase.from('contas_receber').insert({
    descricao: c.descricao, cliente_id: c.clienteId, valor: c.valor,
    data_vencimento: c.dataVencimento, status: c.status ?? 'pendente',
    categoria: c.categoria, subcategoria: c.subcategoria,
    forma_pagamento: c.formaPagamento, competencia: c.competencia, observacoes: c.observacoes,
  }).select().single();
  if (error) throw error;
  return mapCR(data);
}

export async function createContaPagar(c: Omit<ContaPagar, 'id'>): Promise<ContaPagar> {
  const { data, error } = await supabase.from('contas_pagar').insert({
    descricao: c.descricao, fornecedor: c.fornecedor, valor: c.valor,
    data_vencimento: c.dataVencimento, status: c.status ?? 'pendente',
    categoria: c.categoria, subcategoria: c.subcategoria,
    forma_pagamento: c.formaPagamento, competencia: c.competencia, observacoes: c.observacoes,
  }).select().single();
  if (error) throw error;
  return mapCP(data);
}

export async function baixarContaReceber(id: string, dataRecebimento: string): Promise<void> {
  const { error } = await supabase.from('contas_receber').update({ status: 'recebido', data_recebimento: dataRecebimento }).eq('id', id);
  if (error) throw error;
}

export async function baixarContaPagar(id: string, dataPagamento: string): Promise<void> {
  const { error } = await supabase.from('contas_pagar').update({ status: 'pago', data_pagamento: dataPagamento }).eq('id', id);
  if (error) throw error;
}

// Dados consolidados para Dashboard financeiro
export async function getDashboardFinanceiro() {
  const hoje = new Date();
  const competencia = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;

  const [{ data: cr }, { data: cp }, { data: assinAtivas }] = await Promise.all([
    supabase.from('contas_receber').select('valor, status, competencia'),
    supabase.from('contas_pagar').select('valor, status, competencia'),
    supabase.from('assinaturas').select('total_mensal').eq('status', 'ativa'),
  ]);

  const receitaTotal = (cr ?? []).filter(c => c.competencia === competencia).reduce((s, c) => s + c.valor, 0);
  const receitaRecebida = (cr ?? []).filter(c => c.competencia === competencia && c.status === 'recebido').reduce((s, c) => s + c.valor, 0);
  const despesaTotal = (cp ?? []).filter(c => c.competencia === competencia).reduce((s, c) => s + c.valor, 0);
  const despesaPaga = (cp ?? []).filter(c => c.competencia === competencia && c.status === 'pago').reduce((s, c) => s + c.valor, 0);
  const mrr = (assinAtivas ?? []).reduce((s, a) => s + a.total_mensal, 0);

  return { receitaTotal, receitaRecebida, despesaTotal, despesaPaga, lucroLiquido: receitaRecebida - despesaPaga, mrr };
}
