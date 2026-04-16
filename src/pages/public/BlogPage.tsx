import React, { useState, useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowUpRight, Eye, Search, X, Calendar, Tag } from 'lucide-react';
import { usePosts } from '../../hooks/useBlog';
import { getPost } from '../../services/blog.service';
import type { PostBlog } from '../../types';

// ── Helpers ────────────────────────────────────────────────────────────────
function fmtDate(iso?: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' });
}
function padNum(n: number) { return String(n).padStart(2, '0'); }
function readTime(content: string) {
  const words = content.replace(/<[^>]+>/g, '').split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

// ── Scroll progress bar ────────────────────────────────────────────────────
function ProgressBar() {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    const fn = () => {
      const el = document.documentElement;
      setPct((el.scrollTop / (el.scrollHeight - el.clientHeight)) * 100);
    };
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);
  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-[2px] bg-transparent pointer-events-none">
      <div
        className="h-full transition-none"
        style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #C9A84C, #D4B96A)' }}
      />
    </div>
  );
}

// ── useReveal: IntersectionObserver para scroll reveal ─────────────────────
function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('[data-reveal]');
    const io = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('is-visible'); }),
      { threshold: 0.12 }
    );
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  });
}

// ── ImagePlaceholder ───────────────────────────────────────────────────────
const PALETTES = [
  'from-forest-700 via-forest-600 to-earth-600',
  'from-earth-600 via-earth-500 to-gold-500',
  'from-charcoal-600 via-charcoal-700 to-forest-700',
  'from-gold-600 via-earth-400 to-forest-600',
  'from-forest-500 via-earth-500 to-charcoal-600',
];
function ImageBlock({ src, idx, className = '' }: { src?: string; idx: number; className?: string }) {
  if (src) return <img src={src} alt="" className={`w-full h-full object-cover ${className}`} />;
  return (
    <div className={`w-full h-full bg-gradient-to-br ${PALETTES[idx % PALETTES.length]} ${className} flex items-end p-4`}>
      <span className="font-mono text-[9px] tracking-[0.3em] uppercase text-white/30">imagem em breve</span>
    </div>
  );
}

// ── Grain overlay ──────────────────────────────────────────────────────────
const Grain = ({ opacity = 0.08 }: { opacity?: number }) => (
  <div
    className="absolute inset-0 pointer-events-none grain-layer"
    style={{ opacity }}
    aria-hidden
  />
);

// ── ArticleCard: card padrão com hover overlay ─────────────────────────────
function ArticleCard({ post, index, size = 'md' }: { post: PostBlog; index: number; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const imgHeight = size === 'xl' ? 'h-80' : size === 'lg' ? 'h-64' : size === 'sm' ? 'h-40' : 'h-52';
  return (
    <Link
      to={`/blog/${post.slug}`}
      data-reveal
      className="reveal group block"
      style={{ animationDelay: `${(index % 4) * 80}ms` }}
    >
      {/* Image */}
      <div className={`relative overflow-hidden ${imgHeight} bg-charcoal-700`}>
        <ImageBlock src={post.imagemDestacada} idx={index} className="transition-transform duration-700 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] group-hover:scale-105" />
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-charcoal-700/0 group-hover:bg-charcoal-700/70 transition-all duration-500 flex items-center justify-center">
          <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100 flex items-center gap-2 border border-cream-100/70 text-cream-100 text-xs tracking-[0.25em] uppercase px-4 py-2">
            Ler artigo <ArrowUpRight size={12} />
          </span>
        </div>
        {/* Number badge */}
        <div className="absolute top-3 left-3 font-mono text-[9px] tracking-[0.3em] text-cream-100/60 bg-charcoal-700/60 backdrop-blur-sm px-2 py-1">
          №{padNum(index + 1)}
        </div>
        {post.categorias[0] && (
          <div className="absolute top-3 right-3 font-mono text-[9px] tracking-[0.25em] uppercase text-cream-100/80 bg-charcoal-700/60 backdrop-blur-sm px-2 py-1">
            {post.categorias[0]}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="pt-4 pb-6 border-b border-charcoal-700/10 group-hover:border-gold-400/40 transition-colors duration-300">
        <h3 className="font-editorial text-xl md:text-2xl leading-tight text-charcoal-700 mb-2 group-hover:text-forest-600 transition-colors duration-300">
          {post.titulo}
        </h3>
        {size !== 'sm' && (
          <p className="text-sm text-charcoal-400 leading-relaxed line-clamp-2 mb-3">{post.resumo}</p>
        )}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 font-mono text-[10px] tracking-[0.2em] uppercase text-charcoal-400">
            <span>{fmtDate(post.publicadoEm)}</span>
            {post.conteudo && (
              <>
                <span className="text-charcoal-300">·</span>
                <span>{readTime(post.conteudo)} min</span>
              </>
            )}
          </div>
          <Eye size={11} className="text-charcoal-300" />
        </div>
      </div>
    </Link>
  );
}

// ── FeaturedCard: post destaque em full-width ──────────────────────────────
function FeaturedCard({ post }: { post: PostBlog }) {
  return (
    <Link
      to={`/blog/${post.slug}`}
      data-reveal
      className="reveal group block relative overflow-hidden bg-charcoal-700"
    >
      {/* Background image */}
      <div className="absolute inset-0">
        <ImageBlock src={post.imagemDestacada} idx={0} className="opacity-50 group-hover:opacity-60 transition-opacity duration-700 group-hover:scale-105" />
        <Grain opacity={0.12} />
        {/* gradient bottom */}
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal-700 via-charcoal-700/60 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-[480px] md:min-h-[560px] flex flex-col justify-end p-8 md:p-14">
        {/* Top row */}
        <div className="flex items-start justify-between mb-auto pt-2">
          <span className="font-mono text-[9px] tracking-[0.4em] uppercase text-gold-300/80">
            Destaque
          </span>
          <span className="font-mono text-[9px] tracking-[0.4em] uppercase text-cream-100/40">
            №01
          </span>
        </div>

        {/* Categories */}
        <div className="flex flex-wrap gap-2 mb-4">
          {post.categorias.map(cat => (
            <span key={cat} className="font-mono text-[9px] tracking-[0.3em] uppercase text-gold-300 border border-gold-400/30 px-2 py-1">
              {cat}
            </span>
          ))}
        </div>

        {/* Title */}
        <h2 className="font-editorial italic text-4xl md:text-6xl lg:text-7xl text-cream-50 leading-[0.95] mb-5 max-w-4xl">
          {post.titulo}
        </h2>

        {/* Resumo */}
        <p className="text-cream-100/70 text-sm md:text-base leading-relaxed max-w-2xl mb-6 line-clamp-2">
          {post.resumo}
        </p>

        {/* CTA row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 font-mono text-[10px] tracking-[0.25em] uppercase text-cream-100/50">
            {post.autor && <span>{post.autor}</span>}
            <span className="text-cream-100/30">·</span>
            <span>{fmtDate(post.publicadoEm)}</span>
            {post.conteudo && (
              <>
                <span className="text-cream-100/30">·</span>
                <span>{readTime(post.conteudo)} min de leitura</span>
              </>
            )}
          </div>
          <span className="hidden md:flex items-center gap-2 font-mono text-xs tracking-[0.25em] uppercase text-gold-300 border-b border-gold-300/0 group-hover:border-gold-300 pb-px transition-all duration-300">
            Ler artigo <ArrowUpRight size={13} />
          </span>
        </div>
      </div>
    </Link>
  );
}

// ── HorizontalCard: card horizontal para variação ──────────────────────────
function HorizontalCard({ post, index }: { post: PostBlog; index: number }) {
  return (
    <Link
      to={`/blog/${post.slug}`}
      data-reveal
      className="reveal group flex gap-0 overflow-hidden border-b border-charcoal-700/10 hover:border-gold-400/30 transition-colors duration-300"
      style={{ animationDelay: `${(index % 3) * 60}ms` }}
    >
      {/* Number */}
      <div className="hidden md:flex w-16 shrink-0 items-start pt-6 pl-2">
        <span className="font-editorial italic text-4xl text-charcoal-200 group-hover:text-gold-300/50 transition-colors duration-300">
          {padNum(index + 1)}
        </span>
      </div>

      {/* Image */}
      <div className="relative w-32 md:w-48 shrink-0 overflow-hidden bg-charcoal-700">
        <div className="absolute inset-0">
          <ImageBlock src={post.imagemDestacada} idx={index} className="transition-transform duration-700 group-hover:scale-105" />
        </div>
        <div className="relative pt-[75%]" /> {/* aspect ratio */}
      </div>

      {/* Text */}
      <div className="flex-1 p-5 md:p-6 flex flex-col justify-center">
        {post.categorias[0] && (
          <span className="font-mono text-[9px] tracking-[0.3em] uppercase text-gold-500 mb-2 block">
            {post.categorias[0]}
          </span>
        )}
        <h3 className="font-editorial text-lg md:text-xl leading-tight text-charcoal-700 group-hover:text-forest-600 transition-colors duration-300 mb-2">
          {post.titulo}
        </h3>
        <p className="text-xs text-charcoal-400 leading-relaxed line-clamp-2 hidden md:block mb-3">
          {post.resumo}
        </p>
        <div className="font-mono text-[9px] tracking-[0.2em] uppercase text-charcoal-400 flex items-center gap-2">
          <span>{fmtDate(post.publicadoEm)}</span>
          {post.conteudo && <><span className="text-charcoal-300">·</span><span>{readTime(post.conteudo)} min</span></>}
        </div>
      </div>

      {/* Arrow */}
      <div className="hidden md:flex items-center pr-6">
        <ArrowUpRight size={16} className="text-charcoal-300 group-hover:text-gold-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-300" />
      </div>
    </Link>
  );
}

// ── SearchOverlay ──────────────────────────────────────────────────────────
function SearchOverlay({
  open, onClose, query, onChange,
}: { open: boolean; onClose: () => void; query: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (open) setTimeout(() => ref.current?.focus(), 50); }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex flex-col" onClick={onClose}>
      <div className="absolute inset-0 bg-charcoal-700/95 backdrop-blur-md" />
      <div className="relative z-10 flex flex-col items-center justify-center flex-1 px-6" onClick={e => e.stopPropagation()}>
        <p className="font-mono text-[10px] tracking-[0.4em] uppercase text-cream-100/40 mb-6">Buscar artigos</p>
        <div className="w-full max-w-2xl border-b-2 border-gold-400/60 flex items-center gap-4 pb-4">
          <Search size={20} className="text-cream-100/40 shrink-0" />
          <input
            ref={ref}
            type="text"
            value={query}
            onChange={e => onChange(e.target.value)}
            placeholder="Digite para buscar…"
            className="flex-1 bg-transparent text-cream-100 placeholder-cream-100/30 text-2xl md:text-4xl font-editorial italic outline-none"
          />
          {query && (
            <button onClick={() => onChange('')} className="text-cream-100/40 hover:text-cream-100 transition-colors">
              <X size={18} />
            </button>
          )}
        </div>
        <p className="mt-4 font-mono text-[10px] tracking-[0.3em] uppercase text-cream-100/30">
          Enter para buscar · Esc para fechar
        </p>
      </div>
      <button
        onClick={onClose}
        className="absolute top-6 right-6 text-cream-100/50 hover:text-cream-100 transition-colors font-mono text-[10px] tracking-[0.3em] uppercase"
      >
        Fechar ×
      </button>
    </div>
  );
}

// ── BlogPage ───────────────────────────────────────────────────────────────
export function BlogPage() {
  const { data: posts } = usePosts(true);
  const [query, setQuery]         = useState('');
  const [categoria, setCategoria] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [headerScrolled, setHeaderScrolled] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  // Teclado: / abre busca, Esc fecha
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === '/' && !searchOpen) { e.preventDefault(); setSearchOpen(true); }
      if (e.key === 'Escape') setSearchOpen(false);
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [searchOpen]);

  // Observer para sticky filter bar
  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setHeaderScrolled(!entry.isIntersecting),
      { threshold: 0 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useReveal();

  const categorias = Array.from(new Set(posts.flatMap(p => p.categorias)));

  const filtered = posts.filter(p =>
    p.status === 'publicado' &&
    (query === '' ||
      p.titulo.toLowerCase().includes(query.toLowerCase()) ||
      p.resumo.toLowerCase().includes(query.toLowerCase())) &&
    (categoria === '' || p.categorias.includes(categoria))
  );

  const featured   = filtered[0] ?? null;
  const rest       = filtered.slice(1);

  // Grupos: 2 cards, depois 3, depois horizontais
  const gridA      = rest.slice(0, 2);
  const gridB      = rest.slice(2, 5);
  const listRest   = rest.slice(5);

  return (
    <>
      <ProgressBar />
      <SearchOverlay
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        query={query}
        onChange={setQuery}
      />

      <div className="min-h-screen bg-cream-50">
        {/* ── HERO ──────────────────────────────────────────── */}
        <section
          ref={heroRef}
          className="relative bg-charcoal-700 pt-24 pb-0 overflow-hidden"
        >
          <Grain opacity={0.1} />

          {/* Decorative vertical lines */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute left-1/4 top-0 bottom-0 w-px bg-cream-100/[0.04]" />
            <div className="absolute left-2/4 top-0 bottom-0 w-px bg-cream-100/[0.04]" />
            <div className="absolute left-3/4 top-0 bottom-0 w-px bg-cream-100/[0.04]" />
          </div>

          <div className="max-w-7xl mx-auto px-5 sm:px-8 relative z-10">
            {/* Top label row */}
            <div className="flex items-center justify-between mb-10 md:mb-16">
              <div className="flex items-center gap-4">
                <span className="h-px w-8 bg-gold-400/60" />
                <span className="font-mono text-[9px] tracking-[0.4em] uppercase text-cream-100/40">
                  Conhecimento & Café
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-[9px] tracking-[0.4em] uppercase text-cream-100/30">
                  {filtered.length} artigos
                </span>
                <button
                  onClick={() => setSearchOpen(true)}
                  className="flex items-center gap-2 px-3 py-1.5 border border-cream-100/20 hover:border-gold-400/60 transition-colors font-mono text-[9px] tracking-[0.3em] uppercase text-cream-100/40 hover:text-gold-300"
                >
                  <Search size={10} /> Buscar <span className="opacity-50">/</span>
                </button>
              </div>
            </div>

            {/* Main title */}
            <div className="pb-12 md:pb-16">
              <h1 className="font-editorial italic leading-[0.88] text-cream-50 select-none">
                <span className="block text-[clamp(3.5rem,12vw,10rem)]">Blog</span>
                <span className="block text-[clamp(3.5rem,12vw,10rem)] pl-[15%] text-gold-300/90">Das Matas</span>
              </h1>
              <p className="mt-6 md:mt-8 ml-0 md:ml-[30%] max-w-md text-cream-100/50 text-sm leading-relaxed font-light">
                Conteúdo editorial sobre cafés especiais, produtores, técnicas de preparo e o universo da cafeicultura brasileira.
              </p>
            </div>
          </div>

          {/* Category scrolling marquee */}
          <div className="border-t border-cream-100/[0.07] overflow-hidden">
            <div className="flex py-3 overflow-hidden">
              <div className="flex gap-0 animate-[marquee_30s_linear_infinite] whitespace-nowrap">
                {[...categorias, ...categorias, ...categorias].map((cat, i) => (
                  <span key={i} className="flex items-center gap-3 px-5 font-mono text-[9px] tracking-[0.35em] uppercase text-cream-100/25">
                    <span className="text-gold-400/50">◆</span>
                    {cat}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── FILTER BAR ───────────────────────────────────── */}
        <div className={`sticky top-0 z-30 transition-all duration-300 ${
          headerScrolled
            ? 'bg-cream-50/95 backdrop-blur-sm border-b border-charcoal-700/8 shadow-sm'
            : 'bg-charcoal-700 border-b border-cream-100/[0.07]'
        }`}>
          <div className="max-w-7xl mx-auto px-5 sm:px-8">
            <div className="flex items-center gap-0 overflow-x-auto scrollbar-none py-0.5">
              {/* All button */}
              <button
                onClick={() => setCategoria('')}
                className={`shrink-0 px-4 py-3.5 font-mono text-[9px] tracking-[0.3em] uppercase transition-all duration-200 border-b-2 ${
                  categoria === ''
                    ? headerScrolled
                      ? 'border-forest-500 text-forest-600'
                      : 'border-gold-400 text-gold-300'
                    : headerScrolled
                      ? 'border-transparent text-charcoal-400 hover:text-charcoal-700'
                      : 'border-transparent text-cream-100/40 hover:text-cream-100/80'
                }`}
              >
                Todos
              </button>
              {categorias.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoria(cat === categoria ? '' : cat)}
                  className={`shrink-0 px-4 py-3.5 font-mono text-[9px] tracking-[0.3em] uppercase transition-all duration-200 border-b-2 ${
                    categoria === cat
                      ? headerScrolled
                        ? 'border-forest-500 text-forest-600'
                        : 'border-gold-400 text-gold-300'
                      : headerScrolled
                        ? 'border-transparent text-charcoal-400 hover:text-charcoal-700'
                        : 'border-transparent text-cream-100/40 hover:text-cream-100/80'
                  }`}
                >
                  {cat}
                </button>
              ))}
              {/* Search shortcut on the right */}
              <button
                onClick={() => setSearchOpen(true)}
                className={`ml-auto shrink-0 flex items-center gap-2 px-4 py-3.5 font-mono text-[9px] tracking-[0.3em] uppercase transition-colors ${
                  headerScrolled ? 'text-charcoal-400 hover:text-charcoal-700' : 'text-cream-100/30 hover:text-cream-100/70'
                }`}
              >
                <Search size={11} />
                <span className="hidden sm:inline">Buscar</span>
                <span className={`hidden md:inline border px-1.5 py-0.5 ${headerScrolled ? 'border-charcoal-200 text-charcoal-300' : 'border-cream-100/20 text-cream-100/20'}`}>/</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── CONTEÚDO ─────────────────────────────────────── */}
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-12 md:py-16">

          {filtered.length === 0 ? (
            <div className="py-32 text-center">
              <p className="font-editorial italic text-5xl text-charcoal-200 mb-4">Nada por aqui.</p>
              <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-charcoal-400 mb-6">
                Nenhum artigo encontrado para "{query || categoria}"
              </p>
              <button
                onClick={() => { setQuery(''); setCategoria(''); }}
                className="font-mono text-[10px] tracking-[0.3em] uppercase text-forest-500 hover:text-forest-600 transition-colors underline underline-offset-4"
              >
                Limpar filtros
              </button>
            </div>
          ) : (
            <div className="space-y-16 md:space-y-20">

              {/* ── Featured ── */}
              {featured && !query && !categoria && <FeaturedCard post={featured} />}

              {/* Se estiver filtrando, mostra o 1º como card normal no grid */}
              {featured && (query || categoria) && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
                  <ArticleCard post={featured} index={0} size="lg" />
                  {gridA.map((p, i) => <ArticleCard key={p.id} post={p} index={i + 1} size="md" />)}
                  {gridB.map((p, i) => <ArticleCard key={p.id} post={p} index={i + 3} size="md" />)}
                  {listRest.map((p, i) => <ArticleCard key={p.id} post={p} index={i + 6} size="sm" />)}
                </div>
              )}

              {/* ── Grid A: 2 colunas assimétricas ── */}
              {!query && !categoria && gridA.length > 0 && (
                <div>
                  <div className="flex items-center gap-4 mb-8">
                    <span className="h-px flex-1 bg-charcoal-700/10" />
                    <span className="font-mono text-[9px] tracking-[0.4em] uppercase text-charcoal-400">Artigos Recentes</span>
                    <span className="h-px w-8 bg-charcoal-700/10" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-10">
                    {gridA.map((p, i) => (
                      <ArticleCard key={p.id} post={p} index={i + 1} size={i === 0 ? 'lg' : 'md'} />
                    ))}
                  </div>
                </div>
              )}

              {/* ── Grid B: 3 colunas ── */}
              {!query && !categoria && gridB.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-10">
                  {gridB.map((p, i) => (
                    <ArticleCard key={p.id} post={p} index={i + 3} size="md" />
                  ))}
                </div>
              )}

              {/* ── Lista horizontal (restantes) ── */}
              {!query && !categoria && listRest.length > 0 && (
                <div>
                  <div className="flex items-center gap-4 mb-8">
                    <span className="h-px flex-1 bg-charcoal-700/10" />
                    <span className="font-mono text-[9px] tracking-[0.4em] uppercase text-charcoal-400">Mais artigos</span>
                    <span className="h-px w-8 bg-charcoal-700/10" />
                  </div>
                  <div className="space-y-0">
                    {listRest.map((p, i) => (
                      <HorizontalCard key={p.id} post={p} index={i + 6} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── CTA BANNER ─────────────────────────────────── */}
        <section className="relative bg-forest-700 overflow-hidden mt-8">
          <Grain opacity={0.1} />
          {/* Decorative large italic text */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
            <span
              className="font-editorial italic text-[clamp(6rem,22vw,18rem)] text-cream-100/[0.03] leading-none whitespace-nowrap select-none"
            >
              Clube
            </span>
          </div>
          <div className="relative z-10 max-w-4xl mx-auto px-5 sm:px-8 py-20 md:py-28 text-center">
            <p className="font-mono text-[9px] tracking-[0.4em] uppercase text-gold-300/70 mb-5">
              Das Matas · Clube de Assinatura
            </p>
            <h3 className="font-editorial italic text-4xl md:text-6xl text-cream-50 leading-tight mb-5">
              Café especial todo mês,<br />direto na sua porta.
            </h3>
            <p className="text-cream-100/50 text-sm leading-relaxed max-w-md mx-auto mb-10">
              Dois pacotes de 250g de cafés selecionados com história e origem, com conteúdo exclusivo para assinantes.
            </p>
            <Link
              to="/assinar"
              className="inline-flex items-center gap-3 px-8 py-4 bg-gold-400 text-charcoal-700 font-mono text-[10px] tracking-[0.35em] uppercase hover:bg-gold-300 transition-colors duration-300"
            >
              Assinar o Clube <ArrowUpRight size={13} />
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}

// ── BlogPostPage ───────────────────────────────────────────────────────────
export function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<PostBlog | null>(null);
  const [loading, setLoading] = useState(true);
  const { data: allPosts } = usePosts(true);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    getPost(slug).then(p => { setPost(p); setLoading(false); });
  }, [slug]);

  const related = allPosts
    .filter(p => p.slug !== slug && p.status === 'publicado')
    .slice(0, 3);

  if (loading) {
    return (
      <div className="min-h-screen bg-cream-50 flex items-center justify-center">
        <div className="font-editorial italic text-3xl text-charcoal-300 animate-pulse">Carregando…</div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-cream-50 flex items-center justify-center">
        <div className="text-center">
          <p className="font-editorial italic text-5xl text-charcoal-200 mb-4">Artigo não encontrado.</p>
          <Link to="/blog" className="font-mono text-[10px] tracking-[0.3em] uppercase text-forest-500 hover:text-forest-600 underline underline-offset-4">
            ← Voltar ao blog
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <ProgressBar />
      <div className="min-h-screen bg-cream-50">
        {/* Hero do post */}
        <div className="relative bg-charcoal-700 pt-24 pb-0 overflow-hidden">
          <Grain opacity={0.1} />
          {post.imagemDestacada && (
            <div className="absolute inset-0">
              <img src={post.imagemDestacada} alt="" className="w-full h-full object-cover opacity-30" />
              <div className="absolute inset-0 bg-gradient-to-b from-charcoal-700/50 to-charcoal-700" />
            </div>
          )}
          <div className="relative z-10 max-w-4xl mx-auto px-5 sm:px-8 pb-14 md:pb-20">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 font-mono text-[9px] tracking-[0.3em] uppercase text-cream-100/40 mb-10">
              <Link to="/blog" className="hover:text-gold-300 transition-colors">Blog</Link>
              <span>/</span>
              {post.categorias[0] && <span className="text-gold-300/60">{post.categorias[0]}</span>}
            </div>

            {/* Categories */}
            <div className="flex flex-wrap gap-2 mb-5">
              {post.categorias.map(cat => (
                <span key={cat} className="font-mono text-[9px] tracking-[0.3em] uppercase text-gold-300 border border-gold-400/30 px-2 py-1">
                  {cat}
                </span>
              ))}
            </div>

            {/* Title */}
            <h1 className="font-editorial italic text-4xl md:text-6xl text-cream-50 leading-[0.95] mb-6">
              {post.titulo}
            </h1>

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-4 font-mono text-[9px] tracking-[0.25em] uppercase text-cream-100/40">
              {post.autor && <span>{post.autor}</span>}
              <span className="text-cream-100/20">·</span>
              <span className="flex items-center gap-1">
                <Calendar size={10} />
                {fmtDate(post.publicadoEm)}
              </span>
              {post.conteudo && (
                <>
                  <span className="text-cream-100/20">·</span>
                  <span>{readTime(post.conteudo)} min de leitura</span>
                </>
              )}
              <span className="text-cream-100/20">·</span>
              <span className="flex items-center gap-1">
                <Eye size={10} />
                {post.visualizacoes.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Conteúdo */}
        <article className="max-w-3xl mx-auto px-5 sm:px-8 py-14 md:py-20">
          <div
            className="prose prose-lg max-w-none
              prose-headings:font-editorial prose-headings:italic prose-headings:text-charcoal-700
              prose-p:text-charcoal-500 prose-p:leading-relaxed prose-p:font-light
              prose-a:text-forest-500 prose-a:no-underline hover:prose-a:underline
              prose-strong:text-charcoal-700 prose-strong:font-semibold
              prose-blockquote:border-l-gold-400 prose-blockquote:text-charcoal-400 prose-blockquote:italic
              prose-code:font-mono prose-code:text-sm prose-code:text-earth-600"
            dangerouslySetInnerHTML={{ __html: post.conteudo }}
          />

          {/* Tags */}
          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-12 pt-8 border-t border-charcoal-700/10">
              {post.tags.map(tag => (
                <span key={tag} className="flex items-center gap-1 font-mono text-[9px] tracking-[0.25em] uppercase px-3 py-1.5 bg-cream-200 text-charcoal-500">
                  <Tag size={8} />{tag}
                </span>
              ))}
            </div>
          )}

          {/* Back */}
          <div className="mt-10">
            <Link
              to="/blog"
              className="font-mono text-[9px] tracking-[0.3em] uppercase text-forest-500 hover:text-forest-600 transition-colors flex items-center gap-2"
            >
              ← Todos os artigos
            </Link>
          </div>
        </article>

        {/* Posts relacionados */}
        {related.length > 0 && (
          <section className="border-t border-charcoal-700/8 py-14 md:py-20">
            <div className="max-w-7xl mx-auto px-5 sm:px-8">
              <div className="flex items-center gap-4 mb-10">
                <span className="h-px flex-1 bg-charcoal-700/10" />
                <span className="font-mono text-[9px] tracking-[0.4em] uppercase text-charcoal-400">Continue lendo</span>
                <span className="h-px w-8 bg-charcoal-700/10" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-10">
                {related.map((p, i) => (
                  <ArticleCard key={p.id} post={p} index={i} size="md" />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* CTA */}
        <section className="relative bg-forest-700 overflow-hidden">
          <Grain opacity={0.1} />
          <div className="relative z-10 max-w-xl mx-auto px-5 sm:px-8 py-16 md:py-20 text-center">
            <p className="font-mono text-[9px] tracking-[0.4em] uppercase text-gold-300/70 mb-4">
              Gostou do conteúdo?
            </p>
            <h3 className="font-editorial italic text-3xl md:text-4xl text-cream-50 mb-4 leading-tight">
              Receba cafés especiais<br />todo mês.
            </h3>
            <p className="text-cream-100/50 text-sm mb-8">
              Assine o clube e receba conteúdo exclusivo junto com seus cafés.
            </p>
            <Link
              to="/assinar"
              className="inline-flex items-center gap-3 px-8 py-3.5 bg-gold-400 text-charcoal-700 font-mono text-[10px] tracking-[0.35em] uppercase hover:bg-gold-300 transition-colors"
            >
              Assinar o Clube <ArrowUpRight size={13} />
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
