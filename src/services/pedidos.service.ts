import { supabase } from '../lib/supabase';
import type { Pedido, Endereco } from '../types';

function mapEndereco(e: Record<string, string>): Endereco {
  return {
    id: e.id ?? '', apelido: e.apelido, cep: e.cep, logradouro: e.logradouro,
    numero: e.numero, complemento: e.complemento, bairro: e.bairro,
    cidade: e.cidade, estado: e.estado, padrao: false,
  };
}

async function resolverClienteNomes(
  clienteIds: string[],
): Promise<Map<string, { name: string; email: string }>> {
  if (!clienteIds.length) return new Map();
  const { data: clientes } = await supabase
    .from('clientes').select('id, user_id').in('id', clienteIds);
  if (!clientes?.length) return new Map();
  const userIds = (clientes as any[]).map(c => c.user_id).filter(Boolean);
  const { data: profiles } = await supabase
    .from('profiles').select('id, name, email').in('id', userIds);
  const pMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));
  const result = new Map<string, { name: string; email: string }>();
  for (const c of clientes as any[]) {
    const p = pMap.get(c.user_id);
    if (p) result.set(c.id, { name: p.name ?? '', email: p.email ?? '' });
  }
  return result;
}

export async function buscarClientePorEmail(
  email: string,
): Promise<{ clienteId: string; nome: string } | null> {
  const { data: profile } = await supabase
    .from('profiles').select('id, name').ilike('email', email).maybeSingle();
  if (!profile) return null;
  const { data: cliente } = await supabase
    .from('clientes').select('id').eq('user_id', (profile as any).id).maybeSingle();
  if (!cliente) return null;
  return { clienteId: (cliente as any).id, nome: (profile as any).name ?? email };
}

function mapPedido(r: any, clienteInfo?: { name: string; email: string }): Pedido {
  return {
    id: r.id, numero: r.numero, clienteId: r.cliente_id ?? '',
    cliente: clienteInfo ?? (r.profile ? { name: r.profile.name, email: r.profile.email } : undefined),
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
    assinaturaId:       r.assinatura_id ?? undefined,
    cicloId:            r.ciclo_id ?? undefined,
    melhorenvioCartId:  r.melhorenvio_cart_id ?? undefined,
    etiquetaUrl:        r.etiqueta_url ?? undefined,
    createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

// Sem '*' e sem joins aninhados — evita bug do Supabase JS de stripping e erros de join
const PEDIDO_SELECT = [
  'status, id, numero, cliente_id, subtotal, frete, desconto, total',
  'endereco_entrega, forma_pagamento, cupom, codigo_rastreio, observacoes',
  'tipo, assinatura_id, ciclo_id, melhorenvio_cart_id, etiqueta_url, created_at, updated_at',
  'itens:itens_pedido(id, produto_id, nome_produto, sku_produto, quantidade, preco_unitario, subtotal)',
].join(', ');

export async function getPedidos(clienteId?: string): Promise<Pedido[]> {
  let q = supabase.from('pedidos').select(PEDIDO_SELECT).order('created_at', { ascending: false });
  if (clienteId) q = q.eq('cliente_id', clienteId);
  const { data, error } = await q;
  if (error) throw error;
  const rows = data ?? [];
  const ids = [...new Set(rows.map((r: any) => r.cliente_id).filter(Boolean))] as string[];
  const clienteMap = await resolverClienteNomes(ids);
  return rows.map((r: any) => mapPedido(r, clienteMap.get(r.cliente_id)));
}

export async function getPedido(id: string): Promise<Pedido | null> {
  const { data, error } = await supabase.from('pedidos').select(PEDIDO_SELECT).eq('id', id).single();
  if (error) return null;
  const clienteMap = await resolverClienteNomes([data.cliente_id].filter(Boolean));
  return mapPedido(data, clienteMap.get(data.cliente_id));
}

export async function createPedido(pedido: {
  clienteId?: string;
  itens: { produtoId?: string; nomeProduto: string; skuProduto: string; quantidade: number; precoUnitario: number }[];
  subtotal: number; frete: number; desconto: number; total: number;
  enderecoEntrega: Endereco; formaPagamento: string; cupom?: string;
  status?: Pedido['status'];
  observacoes?: string;
}): Promise<Pedido> {
  const numero = `DM-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
  const { data: ped, error: pedErr } = await supabase.from('pedidos').insert({
    numero, cliente_id: pedido.clienteId ?? null,
    subtotal: pedido.subtotal, frete: pedido.frete, desconto: pedido.desconto, total: pedido.total,
    status: pedido.status ?? 'pendente',
    endereco_entrega: pedido.enderecoEntrega,
    forma_pagamento: pedido.formaPagamento, cupom: pedido.cupom ?? null,
    observacoes: pedido.observacoes ?? null,
  }).select().single();
  if (pedErr) throw pedErr;

  const itens = pedido.itens.map(i => ({
    pedido_id: ped.id, produto_id: i.produtoId ?? null, nome_produto: i.nomeProduto,
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

export async function cancelarEtiqueta(
  pedidoId: string,
): Promise<{ success?: boolean; message?: string; error?: string }> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token ?? supabaseKey;

  const res = await fetch(`${supabaseUrl}/functions/v1/cancel-shipping-label`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization:  `Bearer ${token}`,
      apikey:         supabaseKey,
    },
    body: JSON.stringify({ pedido_id: pedidoId }),
  });
  return res.json();
}

export async function gerarEtiqueta(
  pedidoId: string,
): Promise<{ success: boolean; cart_id?: string; label_url?: string; tracking_code?: string; error?: string }> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token ?? supabaseKey;

  const res = await fetch(`${supabaseUrl}/functions/v1/generate-shipping-label`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization:  `Bearer ${token}`,
      apikey:         supabaseKey,
    },
    body: JSON.stringify({ pedido_id: pedidoId }),
  });
  return res.json();
}

export async function updatePedidoRastreio(id: string, codigoRastreio: string, status?: Pedido['status']): Promise<void> {
  const patch: Record<string, unknown> = { codigo_rastreio: codigoRastreio };
  if (status) patch.status = status;
  const { error } = await supabase.from('pedidos').update(patch).eq('id', id);
  if (error) throw error;
}
