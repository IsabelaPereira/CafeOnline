import { supabase } from '../lib/supabase';
import type { Produto, CategoriaProduto } from '../types';

// ---- Mappers ----
function mapProduto(r: any): Produto {
  return {
    id: r.id, sku: r.sku, nome: r.nome,
    descricao: r.descricao ?? '', descricaoCurta: r.descricao_curta ?? '',
    preco: r.preco, precoPromocional: r.preco_promocional ?? undefined,
    estoque: r.estoque, estoqueMinimo: r.estoque_minimo,
    peso: r.peso ?? 0, fotos: r.fotos ?? [],
    categoriaId: r.categoria_id ?? '',
    notasSensoriais: r.notas_sensoriais ?? [],
    regiao: r.regiao ?? undefined, produtor: r.produtor ?? undefined,
    variedade: r.variedade ?? undefined, processo: r.processo ?? undefined,
    altitude: r.altitude ?? undefined, torra: r.torra ?? undefined,
    ativo: r.ativo, destaque: r.destaque, produtoAssinatura: r.produto_assinatura,
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
    estoque_minimo: p.estoqueMinimo, peso: p.peso, fotos: p.fotos, categoria_id: p.categoriaId,
    notas_sensoriais: p.notasSensoriais, regiao: p.regiao, produtor: p.produtor,
    variedade: p.variedade, processo: p.processo, altitude: p.altitude, torra: p.torra,
    ativo: p.ativo, destaque: p.destaque, produto_assinatura: p.produtoAssinatura,
  }).select().single();
  if (error) throw error;
  return mapProduto(data);
}

export async function updateProduto(id: string, p: Partial<Omit<Produto, 'id' | 'createdAt'>>): Promise<void> {
  const patch: Record<string, unknown> = {};
  if (p.nome !== undefined)           patch.nome = p.nome;
  if (p.descricao !== undefined)      patch.descricao = p.descricao;
  if (p.descricaoCurta !== undefined) patch.descricao_curta = p.descricaoCurta;
  if (p.preco !== undefined)          patch.preco = p.preco;
  if (p.precoPromocional !== undefined) patch.preco_promocional = p.precoPromocional;
  if (p.estoque !== undefined)        patch.estoque = p.estoque;
  if (p.estoqueMinimo !== undefined)  patch.estoque_minimo = p.estoqueMinimo;
  if (p.ativo !== undefined)          patch.ativo = p.ativo;
  if (p.destaque !== undefined)       patch.destaque = p.destaque;
  if (p.notasSensoriais !== undefined) patch.notas_sensoriais = p.notasSensoriais;
  const { error } = await supabase.from('produtos').update(patch).eq('id', id);
  if (error) throw error;
}

export async function updateEstoque(id: string, estoque: number): Promise<void> {
  const { error } = await supabase.from('produtos').update({ estoque }).eq('id', id);
  if (error) throw error;
}

export async function deleteProduto(id: string): Promise<void> {
  const { error } = await supabase.from('produtos').update({ ativo: false }).eq('id', id);
  if (error) throw error;
}
