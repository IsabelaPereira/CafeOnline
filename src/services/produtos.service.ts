import { supabase } from '../lib/supabase';
import type { Produto, CategoriaProduto, MovimentacaoEstoque, TipoMovimentacao } from '../types';

// ---- Mappers ----
function mapProduto(r: any): Produto {
  return {
    id: r.id, sku: r.sku, nome: r.nome,
    descricao: r.descricao ?? '', descricaoCurta: r.descricao_curta ?? '',
    preco: r.preco, precoPromocional: r.preco_promocional ?? undefined,
    estoque: r.estoque, estoqueMinimo: r.estoque_minimo,
    peso: r.peso ?? 0, fotos: r.fotos ?? [], videos: r.videos ?? [],
    categoriaId: r.categoria_id ?? '',
    categoriaIds: r.categoria_ids ?? (r.categoria_id ? [r.categoria_id] : []),
    notasSensoriais: r.notas_sensoriais ?? [],
    regiao: r.regiao ?? undefined, produtor: r.produtor ?? undefined,
    variedade: r.variedade ?? undefined, processo: r.processo ?? undefined,
    altitude: r.altitude ?? undefined, torra: r.torra ?? undefined,
    ativo: r.ativo, destaque: r.destaque, produtoAssinatura: r.produto_assinatura,
    createdAt: r.created_at,
  };
}

function mapMovimentacao(r: any): MovimentacaoEstoque {
  return {
    id: r.id,
    produtoId: r.produto_id,
    tipo: r.tipo,
    quantidade: r.quantidade,
    estoqueAntes: r.estoque_antes,
    estoqueDepois: r.estoque_depois,
    observacao: r.observacao ?? undefined,
    usuarioId: r.usuario_id ?? undefined,
    createdAt: r.created_at,
  };
}

// ---- Queries ----
export async function getProdutos(apenasAtivos = false): Promise<Produto[]> {
  let q = supabase.from('produtos').select('*').order('created_at', { ascending: false });
  if (apenasAtivos) q = q.eq('ativo', true);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(mapProduto);
}

export async function getProduto(id: string): Promise<Produto | null> {
  const { data, error } = await supabase.from('produtos').select('*').eq('id', id).single();
  if (error) return null;
  return mapProduto(data);
}

export async function getProdutosByCategoria(categoriaId: string): Promise<Produto[]> {
  const { data, error } = await supabase
    .from('produtos')
    .select('*')
    .or(`categoria_id.eq.${categoriaId},categoria_ids.cs.{${categoriaId}}`)
    .order('nome');
  if (error) throw error;
  return (data ?? []).map(mapProduto);
}

export async function getCategoriasProduto(): Promise<CategoriaProduto[]> {
  const { data, error } = await supabase.from('categorias_produto').select('*').order('nome');
  if (error) throw error;
  return (data ?? []).map(r => ({ id: r.id, nome: r.nome, slug: r.slug, descricao: r.descricao ?? undefined }));
}

// ---- Mutations ----
export async function createProduto(p: Omit<Produto, 'id' | 'createdAt'>): Promise<Produto> {
  const { data, error } = await supabase.from('produtos').insert({
    sku: p.sku, nome: p.nome, descricao: p.descricao, descricao_curta: p.descricaoCurta,
    preco: p.preco, preco_promocional: p.precoPromocional, estoque: p.estoque,
    estoque_minimo: p.estoqueMinimo, peso: p.peso, fotos: p.fotos, videos: p.videos ?? [],
    categoria_id: p.categoriaId || null, categoria_ids: p.categoriaIds ?? [],
    notas_sensoriais: p.notasSensoriais, regiao: p.regiao, produtor: p.produtor,
    variedade: p.variedade, processo: p.processo, altitude: p.altitude, torra: p.torra,
    ativo: p.ativo, destaque: p.destaque, produto_assinatura: p.produtoAssinatura,
  }).select().single();
  if (error) throw error;
  return mapProduto(data);
}

export async function updateProduto(id: string, p: Partial<Omit<Produto, 'id' | 'createdAt'>>): Promise<void> {
  const patch: Record<string, unknown> = {};
  if (p.nome !== undefined)            patch.nome = p.nome;
  if (p.descricao !== undefined)       patch.descricao = p.descricao;
  if (p.descricaoCurta !== undefined)  patch.descricao_curta = p.descricaoCurta;
  if (p.preco !== undefined)           patch.preco = p.preco;
  if (p.precoPromocional !== undefined) patch.preco_promocional = p.precoPromocional;
  if (p.estoque !== undefined)         patch.estoque = p.estoque;
  if (p.estoqueMinimo !== undefined)   patch.estoque_minimo = p.estoqueMinimo;
  if (p.ativo !== undefined)           patch.ativo = p.ativo;
  if (p.destaque !== undefined)        patch.destaque = p.destaque;
  if (p.produtoAssinatura !== undefined) patch.produto_assinatura = p.produtoAssinatura;
  if (p.notasSensoriais !== undefined) patch.notas_sensoriais = p.notasSensoriais;
  if (p.categoriaId !== undefined)     patch.categoria_id = p.categoriaId || null;
  if (p.categoriaIds !== undefined)    patch.categoria_ids = p.categoriaIds;
  if (p.regiao !== undefined)          patch.regiao = p.regiao;
  if (p.produtor !== undefined)        patch.produtor = p.produtor;
  if (p.variedade !== undefined)       patch.variedade = p.variedade;
  if (p.processo !== undefined)        patch.processo = p.processo;
  if (p.altitude !== undefined)        patch.altitude = p.altitude;
  if (p.torra !== undefined)           patch.torra = p.torra;
  if (p.peso !== undefined)            patch.peso = p.peso;
  if (p.fotos !== undefined)           patch.fotos = p.fotos;
  if (p.videos !== undefined)          patch.videos = p.videos;
  const { error } = await supabase.from('produtos').update(patch).eq('id', id);
  if (error) throw error;
}

/** Atualiza estoque e registra movimentação */
export async function updateEstoque(
  id: string,
  novoEstoque: number,
  estoqueAtual: number,
  tipo: TipoMovimentacao = 'ajuste',
  observacao?: string,
): Promise<void> {
  const { error } = await supabase.from('produtos').update({ estoque: novoEstoque }).eq('id', id);
  if (error) throw error;

  const quantidade = Math.abs(novoEstoque - estoqueAtual);
  if (quantidade > 0) {
    await supabase.from('movimentacoes_estoque').insert({
      produto_id: id,
      tipo,
      quantidade,
      estoque_antes: estoqueAtual,
      estoque_depois: novoEstoque,
      observacao: observacao ?? null,
    });
  }
}

export async function duplicarProduto(id: string): Promise<Produto> {
  const original = await getProduto(id);
  if (!original) throw new Error('Produto não encontrado');
  const { data, error } = await supabase.from('produtos').insert({
    sku: `${original.sku}-COPY`, nome: `Cópia de ${original.nome}`,
    descricao: original.descricao, descricao_curta: original.descricaoCurta,
    preco: original.preco, preco_promocional: original.precoPromocional ?? null,
    estoque: 0, estoque_minimo: original.estoqueMinimo,
    peso: original.peso, fotos: original.fotos, videos: original.videos ?? [],
    categoria_id: original.categoriaId || null, categoria_ids: original.categoriaIds ?? [],
    notas_sensoriais: original.notasSensoriais,
    regiao: original.regiao ?? null, produtor: original.produtor ?? null,
    variedade: original.variedade ?? null, processo: original.processo ?? null,
    altitude: original.altitude ?? null, torra: original.torra ?? null,
    ativo: false, destaque: false, produto_assinatura: original.produtoAssinatura,
  }).select().single();
  if (error) throw error;
  return mapProduto(data);
}

export async function deleteProduto(id: string): Promise<void> {
  const { error } = await supabase.from('produtos').update({ ativo: false }).eq('id', id);
  if (error) throw error;
}

// ---- Velocidade de vendas ----
/** Unidades vendidas por produto nos últimos N dias */
export async function getVelocidadeVendas(dias = 30): Promise<Record<string, number>> {
  const desde = new Date();
  desde.setDate(desde.getDate() - dias);

  const { data: pedidos } = await supabase
    .from('pedidos')
    .select('id')
    .in('status', ['pago', 'em_separacao', 'enviado', 'entregue'])
    .gte('created_at', desde.toISOString());

  if (!pedidos?.length) return {};

  const { data: itens } = await supabase
    .from('itens_pedido')
    .select('produto_id, quantidade')
    .in('pedido_id', pedidos.map(p => p.id));

  return (itens ?? []).reduce<Record<string, number>>((acc, item) => {
    acc[item.produto_id] = (acc[item.produto_id] ?? 0) + item.quantidade;
    return acc;
  }, {});
}

// ---- Estatísticas de vendas por produto ----
export interface EstatisticasProduto {
  totalVendas: number;      // unidades vendidas total
  receitaTotal: number;     // R$ total
  totalPedidos: number;     // pedidos que incluíam este produto
  mediaUnidadesPorPedido: number;
  vendasPorMes: { mes: string; unidades: number; receita: number }[];
  ultimaVenda: string | null;
}

export async function getEstatisticasProduto(produtoId: string, meses = 6): Promise<EstatisticasProduto> {
  const desde = new Date();
  desde.setMonth(desde.getMonth() - meses);

  const { data: pedidos } = await supabase
    .from('pedidos')
    .select('id, created_at')
    .in('status', ['pago', 'em_separacao', 'enviado', 'entregue'])
    .gte('created_at', desde.toISOString());

  if (!pedidos?.length) {
    return { totalVendas: 0, receitaTotal: 0, totalPedidos: 0, mediaUnidadesPorPedido: 0, vendasPorMes: [], ultimaVenda: null };
  }

  const { data: itens } = await supabase
    .from('itens_pedido')
    .select('produto_id, quantidade, preco_unitario, pedido_id')
    .eq('produto_id', produtoId)
    .in('pedido_id', pedidos.map(p => p.id));

  if (!itens?.length) {
    return { totalVendas: 0, receitaTotal: 0, totalPedidos: 0, mediaUnidadesPorPedido: 0, vendasPorMes: [], ultimaVenda: null };
  }

  const totalVendas = itens.reduce((a, i) => a + i.quantidade, 0);
  const receitaTotal = itens.reduce((a, i) => a + i.quantidade * (i.preco_unitario ?? 0), 0);
  const totalPedidos = new Set(itens.map(i => i.pedido_id)).size;

  // Agrupa por mês
  const porMes: Record<string, { unidades: number; receita: number }> = {};
  for (const item of itens) {
    const ped = pedidos.find(p => p.id === item.pedido_id);
    if (!ped) continue;
    const mes = ped.created_at.slice(0, 7); // "2025-04"
    if (!porMes[mes]) porMes[mes] = { unidades: 0, receita: 0 };
    porMes[mes].unidades += item.quantidade;
    porMes[mes].receita += item.quantidade * (item.preco_unitario ?? 0);
  }

  const vendasPorMes = Object.entries(porMes)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mes, v]) => ({ mes, ...v }));

  // Última venda
  const pedidosComProduto = itens.map(i => pedidos.find(p => p.id === i.pedido_id)?.created_at).filter(Boolean) as string[];
  const ultimaVenda = pedidosComProduto.length ? pedidosComProduto.sort().at(-1)! : null;

  return {
    totalVendas,
    receitaTotal,
    totalPedidos,
    mediaUnidadesPorPedido: totalPedidos > 0 ? totalVendas / totalPedidos : 0,
    vendasPorMes,
    ultimaVenda,
  };
}

// ---- Movimentações de estoque ----
export async function getMovimentacoes(produtoId: string, limit = 50): Promise<MovimentacaoEstoque[]> {
  const { data, error } = await supabase
    .from('movimentacoes_estoque')
    .select('*')
    .eq('produto_id', produtoId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map(mapMovimentacao);
}

export async function getMovimentacoesGeral(
  inicio?: string,
  fim?: string,
  tipo?: TipoMovimentacao,
  limit = 200,
): Promise<(MovimentacaoEstoque & { produtoNome?: string; produtoSku?: string })[]> {
  let q = supabase
    .from('movimentacoes_estoque')
    .select('*, produtos(nome, sku)')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (inicio) q = q.gte('created_at', inicio);
  if (fim)    q = q.lte('created_at', fim + 'T23:59:59Z');
  if (tipo)   q = q.eq('tipo', tipo);

  const { data, error } = await q;
  if (error) throw error;

  return (data ?? []).map(r => ({
    ...mapMovimentacao(r),
    produtoNome: (r as any).produtos?.nome,
    produtoSku:  (r as any).produtos?.sku,
  }));
}

// ---- Categorias ----
export async function createCategoria(c: Omit<CategoriaProduto, 'id'>): Promise<CategoriaProduto> {
  const { data, error } = await supabase
    .from('categorias_produto')
    .insert({ nome: c.nome, slug: c.slug, descricao: c.descricao ?? null })
    .select()
    .single();
  if (error) throw error;
  return { id: data.id, nome: data.nome, slug: data.slug, descricao: data.descricao ?? undefined };
}

export async function updateCategoria(id: string, c: Partial<Omit<CategoriaProduto, 'id'>>): Promise<void> {
  const patch: Record<string, unknown> = {};
  if (c.nome !== undefined)      patch.nome = c.nome;
  if (c.slug !== undefined)      patch.slug = c.slug;
  if (c.descricao !== undefined) patch.descricao = c.descricao;
  const { error } = await supabase.from('categorias_produto').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteCategoria(id: string): Promise<void> {
  const { error } = await supabase.from('categorias_produto').delete().eq('id', id);
  if (error) throw error;
}

export async function getContagemProdutosPorCategoria(): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from('produtos')
    .select('categoria_id, categoria_ids')
    .eq('ativo', true);
  if (error) return {};

  const acc: Record<string, number> = {};
  for (const r of data ?? []) {
    // conta via categoria_ids (inclui categoria_id pelo backfill da migration)
    const ids: string[] = r.categoria_ids?.length ? r.categoria_ids : (r.categoria_id ? [r.categoria_id] : []);
    for (const id of ids) {
      acc[id] = (acc[id] ?? 0) + 1;
    }
  }
  return acc;
}
