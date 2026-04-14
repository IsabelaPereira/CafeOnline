import { supabase } from '../lib/supabase';
import type { PostBlog, CategoriaBlog } from '../types';

function mapPost(r: any): PostBlog {
  return {
    id: r.id, titulo: r.titulo, slug: r.slug, resumo: r.resumo ?? '',
    conteudo: r.conteudo ?? '', imagemDestacada: r.imagem_destacada ?? undefined,
    categorias: (r.categorias ?? []).map((c: any) => c.categoria?.nome ?? c),
    tags: (r.tags ?? []).map((t: any) => t.tag ?? t),
    autorId: r.autor_id ?? '', autor: r.autor?.name ?? 'Equipe Das Matas',
    status: r.status as PostBlog['status'],
    metaTitle: r.meta_title ?? undefined, metaDescription: r.meta_description ?? undefined,
    publicadoEm: r.publicado_em ?? undefined, agendadoPara: r.agendado_para ?? undefined,
    visualizacoes: r.visualizacoes ?? 0, createdAt: r.created_at,
  };
}

const BASE_SELECT = `*, autor:profiles(name), categorias:post_categorias(categoria:categorias_blog(nome)), tags:post_tags(tag)`;

export async function getPosts(apenasPublicados = false): Promise<PostBlog[]> {
  let q = supabase.from('posts_blog').select(BASE_SELECT).order('created_at', { ascending: false });
  if (apenasPublicados) q = q.eq('status', 'publicado');
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(mapPost);
}

export async function getPost(slug: string): Promise<PostBlog | null> {
  const { data, error } = await supabase.from('posts_blog').select(BASE_SELECT).eq('slug', slug).single();
  if (error) return null;
  // Incrementar visualizações (fire and forget)
  supabase.from('posts_blog').update({ visualizacoes: (data.visualizacoes ?? 0) + 1 }).eq('id', data.id).then(() => {});
  return mapPost(data);
}

export async function createPost(p: { titulo: string; resumo?: string; conteudo?: string; status?: PostBlog['status']; autorId: string }): Promise<PostBlog> {
  const slug = p.titulo.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const { data, error } = await supabase.from('posts_blog').insert({
    titulo: p.titulo, slug, resumo: p.resumo, conteudo: p.conteudo,
    autor_id: p.autorId, status: p.status ?? 'rascunho',
  }).select(BASE_SELECT).single();
  if (error) throw error;
  return mapPost(data);
}

export async function updatePost(id: string, patch: Partial<Omit<PostBlog, 'id' | 'createdAt' | 'slug'>>): Promise<void> {
  const p: Record<string, unknown> = {};
  if (patch.titulo !== undefined)          p.titulo = patch.titulo;
  if (patch.resumo !== undefined)          p.resumo = patch.resumo;
  if (patch.conteudo !== undefined)        p.conteudo = patch.conteudo;
  if (patch.status !== undefined)          p.status = patch.status;
  if (patch.metaTitle !== undefined)       p.meta_title = patch.metaTitle;
  if (patch.metaDescription !== undefined) p.meta_description = patch.metaDescription;
  if (patch.imagemDestacada !== undefined) p.imagem_destacada = patch.imagemDestacada;
  if (patch.publicadoEm !== undefined)     p.publicado_em = patch.publicadoEm;
  const { error } = await supabase.from('posts_blog').update(p).eq('id', id);
  if (error) throw error;
}

export async function deletePost(id: string): Promise<void> {
  const { error } = await supabase.from('posts_blog').delete().eq('id', id);
  if (error) throw error;
}

export async function getCategoriasBlog(): Promise<CategoriaBlog[]> {
  const { data, error } = await supabase.from('categorias_blog').select('*').order('nome');
  if (error) throw error;
  return (data ?? []).map(r => ({ id: r.id, nome: r.nome, slug: r.slug }));
}
