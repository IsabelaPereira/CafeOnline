import { supabase } from '../lib/supabase';

const BUCKET = 'produtos';

/** Faz upload de um arquivo e retorna a URL pública. */
export async function uploadProdutoMidia(
  file: File,
  produtoId: string,
): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin';
  const path = `${produtoId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/** Remove um arquivo do Storage pelo path (extraído da URL pública). */
export async function deleteProdutoMidia(publicUrl: string): Promise<void> {
  // Extrai o path após "/<bucket>/"
  const marker = `/${BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return;
  const path = publicUrl.slice(idx + marker.length);
  await supabase.storage.from(BUCKET).remove([path]);
}

/** Cria o bucket "produtos" se ainda não existir (chame uma vez no setup). */
export async function ensureProdutosBucket(): Promise<void> {
  const { data: buckets } = await supabase.storage.listBuckets();
  if (buckets?.some(b => b.id === BUCKET)) return;
  await supabase.storage.createBucket(BUCKET, { public: true });
}

/** Converte um link do YouTube (watch, youtu.be, shorts) para URL de embed. */
export function toYoutubeEmbed(url: string): string | null {
  try {
    const u = new URL(url);
    let videoId: string | null = null;
    if (u.hostname.includes('youtube.com')) {
      videoId = u.searchParams.get('v') ?? u.pathname.split('/').at(-1) ?? null;
    } else if (u.hostname === 'youtu.be') {
      videoId = u.pathname.slice(1);
    }
    if (!videoId) return null;
    return `https://www.youtube.com/embed/${videoId}`;
  } catch {
    return null;
  }
}

/** Converte um link do Vimeo para URL de embed. */
export function toVimeoEmbed(url: string): string | null {
  try {
    const u = new URL(url);
    if (!u.hostname.includes('vimeo.com')) return null;
    const id = u.pathname.split('/').filter(Boolean).at(-1);
    if (!id) return null;
    return `https://player.vimeo.com/video/${id}`;
  } catch {
    return null;
  }
}

/** Normaliza qualquer URL de vídeo para um embed iframe src. */
export function normalizeVideoUrl(url: string): string {
  return toYoutubeEmbed(url) ?? toVimeoEmbed(url) ?? url;
}

/** Detecta o tipo de vídeo para renderização */
export function videoType(url: string): 'youtube' | 'vimeo' | 'direct' {
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('vimeo.com')) return 'vimeo';
  return 'direct';
}
