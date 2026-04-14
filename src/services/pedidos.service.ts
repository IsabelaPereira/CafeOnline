import { supabase } from '../lib/supabase';
import type { Pedido, Endereco } from '../types';

function mapEndereco(e: Record<string, string>): Endereco {
  return {
    id: e.id ?? '', apelido: e.apelido, cep: e.cep, logradouro: e.logradouro,
    numero: e.numero, complemento: e.complemento, bairro: e.bairro,
    cidade: e.cidade, estado: e.estado, padrao: false,
  };
}

function mapPedido(r: any): Pedido {
  return {
    id: r.id, numero: r.numero, clienteId: r.cliente_id ?? '',
    cliente: r.profile ? { name: r.profile.name, email: r.profile.email } : undefined,
    itens: (r.itens ?? []).map((item: any) => ({
      id: item.id, produtoId: item.produto_id ?? '',
      produto: { nome: item.nome_produto, sku: item.sku_produto ?? '' },
      quantidade: item.quantidade, precoUnitario: item.preco_unitario, subtotal: item.subtotal,
    })),
    subtotal: r.subtotal, frete: r.frete, desconto: r.desconto, total: r.total,
    status: r.status as Pedido['status'],
    enderecoEntrega: mapEndereco(r.endereco_entrega as Record<string, string>),
    formaPagamento: r.forma_pagamento ?? '', cupom: r.cupom ?? undefined,
    codigoRastreio: r.codigo_rastreio ?? undefined, observacoes: r.observacoes ?? undefined,
    tipo: (r.tipo ?? 'loja') as 'loja' | 'assinatura',
    assinaturaId: r.assinatura_id ?? undefined,
    cicloId: r.ciclo_id ?? undefined,
    createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

// Sem '*' e sem joins aninhados — evita bug do Supabase JS de stripping e erros de join
const PEDIDO_SELECT = [
  'status, id, numero, cliente_id, subtotal, frete, desconto, total',
  'endereco_entrega, forma_pagamento, cupom, codigo_rastreio, observacoes',
  'tipo, assinatura_id, ciclo_id, created_at, updated_at',
  'itens:itens_pedido(id, produto_id, nome_produto, sku_produto, quantidade, preco_unitario, subtotal)',
].join(', ');

export async function getPedidos(clienteId?: string): Promise<Pedido[]> {
  let q = supabase.from('pedidos').select(PEDIDO_SELECT).order('created_at', { ascending: false });
  if (clienteId) q = q.eq('cliente_id', clienteId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(r => mapPedido(r));
}

export async function getPedido(id: string): Promise<Pedido | null> {
  const { data, error } = await supabase.from('pedidos').select(PEDIDO_SELECT).eq('id', id).single();
  if (error) return null;
  return mapPedido(data);
}

export async function createPedido(pedido: {
  clienteId?: string; itens: { produtoId: string; nomeProduto: string; skuProduto: string; quantidade: number; precoUnitario: number }[];
  subtotal: number; frete: number; desconto: number; total: number;
  enderecoEntrega: Endereco; formaPagamento: string; cupom?: string;
}): Promise<Pedido> {
  const numero = `DM-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
  const { data: ped, error: pedErr } = await supabase.from('pedidos').insert({
    numero, cliente_id: pedido.clienteId, subtotal: pedido.subtotal,
    frete: pedido.frete, desconto: pedido.desconto, total: pedido.total,
    status: 'pendente', endereco_entrega: pedido.enderecoEntrega,
    forma_pagamento: pedido.formaPagamento, cupom: pedido.cupom,
  }).select().single();
  if (pedErr) throw pedErr;

  const itens = pedido.itens.map(i => ({
    pedido_id: ped.id, produto_id: i.produtoId, nome_produto: i.nomeProduto,
    sku_produto: i.skuProduto, quantidade: i.quantidade,
    preco_unitario: i.precoUnitario, subtotal: i.quantidade * i.precoUnitario,
  }));
  const { error: itemErr } = await supabase.from('itens_pedido').insert(itens);
  if (itemErr) throw itemErr;

  return getPedido(ped.id) as Promise<Pedido>;
}

export async function updatePedidoStatus(id: string, status: Pedido['status']): Promise<void> {
  const { error } = await supabase.from('pedidos').update({ status }).eq('id', id);
  if (error) throw error;
}

export async function updatePedidoRastreio(id: string, codigoRastreio: string, status?: Pedido['status']): Promise<void> {
  const patch: Record<string, unknown> = { codigo_rastreio: codigoRastreio };
  if (status) patch.status = status;
  const { error } = await supabase.from('pedidos').update(patch).eq('id', id);
  if (error) throw error;
}
