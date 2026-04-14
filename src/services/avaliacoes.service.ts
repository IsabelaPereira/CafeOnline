import { supabase } from '../lib/supabase';
import type { AvaliacaoBox, AvaliacaoCafe } from '../types';

export async function getAvaliacoesBox(clienteId?: string, edicaoId?: string): Promise<AvaliacaoBox[]> {
  let q = supabase.from('avaliacoes_box').select('*').order('created_at', { ascending: false });
  if (clienteId) q = q.eq('cliente_id', clienteId);
  if (edicaoId)  q = q.eq('edicao_id', edicaoId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(r => ({ id: r.id, clienteId: r.cliente_id, edicaoId: r.edicao_id, notaGeral: r.nota_geral ?? 0, comentario: r.comentario ?? undefined, createdAt: r.created_at }));
}

export async function getAvaliacoesCafe(clienteId?: string, edicaoId?: string): Promise<AvaliacaoCafe[]> {
  let q = supabase.from('avaliacoes_cafe').select('*').order('created_at', { ascending: false });
  if (clienteId) q = q.eq('cliente_id', clienteId);
  if (edicaoId)  q = q.eq('edicao_id', edicaoId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(r => ({ id: r.id, clienteId: r.cliente_id, cafeId: r.cafe_id, edicaoId: r.edicao_id, notaGeral: r.nota_geral ?? 0, aroma: r.aroma ?? 0, docura: r.docura ?? 0, acidez: r.acidez ?? 0, corpo: r.corpo ?? 0, finalizacao: r.finalizacao ?? 0, comentario: r.comentario ?? undefined, createdAt: r.created_at }));
}

export async function upsertAvaliacaoBox(av: Omit<AvaliacaoBox, 'id' | 'createdAt'>): Promise<void> {
  const { error } = await supabase.from('avaliacoes_box').upsert({ cliente_id: av.clienteId, edicao_id: av.edicaoId, nota_geral: av.notaGeral, comentario: av.comentario }, { onConflict: 'cliente_id,edicao_id' });
  if (error) throw error;
}

export async function upsertAvaliacaoCafe(av: Omit<AvaliacaoCafe, 'id' | 'createdAt'>): Promise<void> {
  const { error } = await supabase.from('avaliacoes_cafe').upsert({ cliente_id: av.clienteId, cafe_id: av.cafeId, edicao_id: av.edicaoId, nota_geral: av.notaGeral, aroma: av.aroma, docura: av.docura, acidez: av.acidez, corpo: av.corpo, finalizacao: av.finalizacao, comentario: av.comentario }, { onConflict: 'cliente_id,cafe_id' });
  if (error) throw error;
}
