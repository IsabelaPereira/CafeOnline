import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Calendar, Eye, Tag, ArrowRight } from 'lucide-react';
import { usePosts } from '../../hooks/useBlog';

export function BlogPage() {
  const [query, setQuery] = useState('');
  const [categoria, setCategoria] = useState('');
  const { data: posts } = usePosts(true);

  const categorias = Array.from(new Set(posts.flatMap(p => p.categorias)));

  const filtered = posts.filter(p =>
    p.status === 'publicado' &&
    (query === '' || p.titulo.toLowerCase().includes(query.toLowerCase()) || p.resumo.toLowerCase().includes(query.toLowerCase())) &&
    (categoria === '' || p.categorias.includes(categoria))
  );

  return (
    <div className="pt-20">
      {/* Hero */}
      <section className="py-20 bg-charcoal-700 text-center">
        <p className="font-display italic text-earth-300 text-lg mb-3">Conhecimento e café</p>
        <h1 className="font-serif text-5xl text-cream-100 mb-4">Blog Das Matas</h1>
        <p className="text-charcoal-300 max-w-lg mx-auto">
          Conteúdo educativo, dicas de preparo, histórias de produtores e tudo sobre o universo dos cafés especiais.
        </p>
      </section>

      {/* Content */}
      <section className="py-16 bg-cream-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-10">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-400" />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Buscar artigos..."
                className="w-full pl-9 pr-4 py-3 border border-cream-300 rounded-sm bg-white text-sm focus:outline-none focus:ring-1 focus:ring-forest-400"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setCategoria('')}
                className={`px-4 py-2 rounded-sm text-sm transition-colors ${
                  categoria === ''
                    ? 'bg-forest-500 text-cream-100'
                    : 'bg-white border border-cream-300 text-charcoal-600 hover:bg-cream-50'
                }`}
              >
                Todos
              </button>
              {categorias.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoria(cat === categoria ? '' : cat)}
                  className={`px-4 py-2 rounded-sm text-sm transition-colors ${
                    categoria === cat
                      ? 'bg-forest-500 text-cream-100'
                      : 'bg-white border border-cream-300 text-charcoal-600 hover:bg-cream-50'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Posts Grid */}
          {filtered.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-charcoal-400">Nenhum artigo encontrado.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
              {/* Featured post */}
              {filtered[0] && (
                <div className="md:col-span-2 bg-white rounded-sm border border-cream-200 overflow-hidden hover:shadow-md transition-shadow">
                  <div className="grid grid-cols-1 md:grid-cols-2">
                    <div className="aspect-video md:aspect-auto bg-gradient-to-br from-earth-200 to-forest-200 flex items-center justify-center min-h-48">
                      <span className="text-charcoal-400 text-sm">Imagem em breve</span>
                    </div>
                    <div className="p-8">
                      <div className="flex flex-wrap gap-2 mb-4">
                        {filtered[0].categorias.map(cat => (
                          <span key={cat} className="px-2.5 py-0.5 bg-forest-100 text-forest-600 text-xs rounded-full">
                            {cat}
                          </span>
                        ))}
                      </div>
                      <h2 className="font-serif text-2xl text-charcoal-700 mb-3 leading-tight">
                        {filtered[0].titulo}
                      </h2>
                      <p className="text-charcoal-500 text-sm leading-relaxed mb-6">{filtered[0].resumo}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-xs text-charcoal-400">
                          <span className="flex items-center gap-1">
                            <Calendar size={12} />
                            {filtered[0].publicadoEm ? new Date(filtered[0].publicadoEm).toLocaleDateString('pt-BR') : ''}
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye size={12} />
                            {filtered[0].visualizacoes.toLocaleString()} leituras
                          </span>
                        </div>
                        <Link
                          to={`/blog/${filtered[0].slug}`}
                          className="flex items-center gap-1 text-sm font-medium text-forest-500 hover:text-forest-600 group"
                        >
                          Ler artigo
                          <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Other posts */}
              {filtered.slice(1).map(post => (
                <div
                  key={post.id}
                  className="bg-white rounded-sm border border-cream-200 overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="aspect-video bg-gradient-to-br from-cream-200 to-earth-100 flex items-center justify-center">
                    <span className="text-charcoal-300 text-sm">Imagem em breve</span>
                  </div>
                  <div className="p-6">
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {post.categorias.map(cat => (
                        <span key={cat} className="px-2 py-0.5 bg-cream-200 text-charcoal-500 text-xs rounded-full">
                          {cat}
                        </span>
                      ))}
                    </div>
                    <h3 className="font-serif text-xl text-charcoal-700 mb-2 leading-tight">
                      {post.titulo}
                    </h3>
                    <p className="text-sm text-charcoal-500 mb-4 leading-relaxed line-clamp-2">{post.resumo}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-charcoal-400">
                        {post.publicadoEm ? new Date(post.publicadoEm).toLocaleDateString('pt-BR') : ''}
                      </span>
                      <Link
                        to={`/blog/${post.slug}`}
                        className="text-sm font-medium text-forest-500 hover:text-forest-600"
                      >
                        Ler mais →
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export function BlogPostPage() {
  const { data: posts } = usePosts(true);
  const post = posts[0]; // normalmente obtido via slug na URL

  return (
    <div className="pt-20">
      <article className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        {/* Categories */}
        <div className="flex flex-wrap gap-2 mb-6">
          {post.categorias.map(cat => (
            <span key={cat} className="px-3 py-1 bg-forest-100 text-forest-600 text-xs rounded-full">
              {cat}
            </span>
          ))}
        </div>

        {/* Title */}
        <h1 className="font-serif text-4xl md:text-5xl text-charcoal-700 leading-tight mb-4">
          {post.titulo}
        </h1>

        {/* Meta */}
        <div className="flex items-center gap-4 text-sm text-charcoal-400 mb-8 pb-8 border-b border-cream-200">
          <span>Por {post.autor}</span>
          <span>·</span>
          <span className="flex items-center gap-1">
            <Calendar size={14} />
            {post.publicadoEm ? new Date(post.publicadoEm).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
          </span>
          <span>·</span>
          <span className="flex items-center gap-1">
            <Eye size={14} />
            {post.visualizacoes.toLocaleString()} leituras
          </span>
        </div>

        {/* Content */}
        <div
          className="prose prose-lg max-w-none prose-headings:font-serif prose-headings:text-charcoal-700 prose-p:text-charcoal-500 prose-p:leading-relaxed"
          dangerouslySetInnerHTML={{ __html: post.conteudo }}
        />

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mt-10 pt-8 border-t border-cream-200">
          {post.tags.map(tag => (
            <span key={tag} className="flex items-center gap-1 px-3 py-1 bg-cream-200 text-charcoal-500 text-xs rounded-full">
              <Tag size={10} />
              {tag}
            </span>
          ))}
        </div>

        {/* Back */}
        <div className="mt-8">
          <Link to="/blog" className="text-sm text-forest-500 hover:text-forest-600">
            ← Voltar para o Blog
          </Link>
        </div>
      </article>

      {/* CTA */}
      <section className="py-16 bg-cream-100 text-center">
        <div className="max-w-xl mx-auto px-4">
          <h3 className="font-serif text-2xl text-charcoal-700 mb-3">Gostou do conteúdo?</h3>
          <p className="text-charcoal-500 mb-6">
            Assine o clube e receba cafés especiais todos os meses com conteúdo exclusivo.
          </p>
          <Link
            to="/assinar"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-forest-500 text-cream-100 text-sm font-medium tracking-wider uppercase rounded-sm hover:bg-forest-600 transition-colors"
          >
            Assinar o Clube
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
}
