import { supabase } from '../lib/supabase';
import type { EdicaoClube, CafeEdicao } from '../types';

function mapCafe(r: any): CafeEdicao {
  return {
    id: r.id, nome: r.nome, descricao: r.descricao ?? '',
    produtor: r.produtor ?? '', regiao: r.regiao ?? '', estado: r.estado ?? '',
    variedade: r.variedade ?? '', processo: r.processo ?? '',
    altitude: r.altitude ?? '', torra: r.torra ?? '',
    notasSensoriais: r.notas_sensoriais ?? [],
    sugestoesPreparo: r.sugestoes_preparo ?? [],
    foto: r.foto ?? undefined, curiosidades: r.curiosidades ?? undefined,
  };
}

function mapEdicao(r: any): EdicaoClube {
  return {
    id: r.id, titulo: r.titulo, mes: r.mes, ano: r.ano,
    descricao: r.descricao ?? '', foto: r.foto ?? undefined,
    videoYoutube: r.video_youtube ?? undefined, textoExclusivo: r.texto_exclusivo ?? undefined,
    publicada: r.publicada,
    cafes: (r.cafes ?? []).map(mapCafe),
    createdAt: r.created_at,
  };
}

export async function getEdicoes(apenasPublicadas = false): Promise<EdicaoClube[]> {
  let q = supabase.from('edicoes_clube').select('*, cafes:cafes_edicao(*)').order('ano', { ascending: false }).order('mes', { ascending: false });
  if (apenasPublicadas) q = q.eq('publicada', true);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(mapEdicao);
}

export async function getEdicao(id: string): Promise<EdicaoClube | null> {
  const { data, error } = await supabase.from('edicoes_clube').select('*, cafes:cafes_edicao(*)').eq('id', id).single();
  if (error) return null;
  return mapEdicao(data);
}

export async function createEdicao(e: { titulo: string; mes: number; ano: number; descricao?: string }): Promise<EdicaoClube> {
  const { data, error } = await supabase.from('edicoes_clube').insert({
    titulo: e.titulo, mes: e.mes, ano: e.ano, descricao: e.descricao, publicada: false,
  }).select().single();
  if (error) throw error;
  return mapEdicao({ ...data, cafes: [] });
}

export async function updateEdicao(id: string, patch: Partial<Pick<EdicaoClube, 'titulo' | 'descricao' | 'videoYoutube' | 'textoExclusivo' | 'publicada'>>): Promise<void> {
  const p: Record<string, unknown> = {};
  if (patch.titulo !== undefined)         p.titulo = patch.titulo;
  if (patch.descricao !== undefined)      p.descricao = patch.descricao;
  if (patch.videoYoutube !== undefined)   p.video_youtube = patch.videoYoutube;
  if (patch.textoExclusivo !== undefined) p.texto_exclusivo = patch.textoExclusivo;
  if (patch.publicada !== undefined)      p.publicada = patch.publicada;
  const { error } = await supabase.from('edicoes_clube').update(p).eq('id', id);
  if (error) throw error;
}

export async function addCafeEdicao(edicaoId: string, cafe: Omit<CafeEdicao, 'id'>): Promise<CafeEdicao> {
  const { data, error } = await supabase.from('cafes_edicao').insert({
    edicao_id: edicaoId, nome: cafe.nome, descricao: cafe.descricao, produtor: cafe.produtor,
    regiao: cafe.regiao, estado: cafe.estado, variedade: cafe.variedade, processo: cafe.processo,
    altitude: cafe.altitude, torra: cafe.torra, notas_sensoriais: cafe.notasSensoriais,
    sugestoes_preparo: cafe.sugestoesPreparo, curiosidades: cafe.curiosidades,
  }).select().single();
  if (error) throw error;
  return mapCafe(data);
}

export async function removeCafeEdicao(cafeId: string): Promise<void> {
  const { error } = await supabase.from('cafes_edicao').delete().eq('id', cafeId);
  if (error) throw error;
}
