import React, { useEffect, useState } from 'react';
import { Plus, Eye, Edit, Trash2, Calendar } from 'lucide-react';
import {
  Card, Badge, Button, Modal, Input, Textarea, Select,
  SectionHeader, SearchBar, Tabs
} from '../../components/ui';
import { getPosts } from '../../services/blog.service';
import type { PostBlog } from '../../types';

const statusVariant: Record<string, 'active' | 'pending' | 'inactive'> = {
  publicado: 'active', rascunho: 'inactive', agendado: 'pending',
};

export function AdminBlog() {
  const [posts, setPosts] = useState<PostBlog[]>([]);
  const [tab, setTab] = useState('posts');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [editPost, setEditPost] = useState<PostBlog | null>(null);

  useEffect(() => {
    getPosts().then(setPosts).catch(console.error);
  }, []);

  const filtered = posts.filter(p =>
    search === '' ||
    p.titulo.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <SectionHeader
        title="Blog"
        subtitle="Gerencie o conteúdo do blog"
        action={
          <Button variant="primary" size="sm" onClick={() => { setEditPost(null); setModal(true); }}>
            <Plus size={14} />
            Novo post
          </Button>
        }
      />

      <Tabs
        tabs={[
          { id: 'posts', label: 'Posts', count: posts.length },
          { id: 'categorias', label: 'Categorias' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'posts' && (
        <>
          <div className="flex gap-3">
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="Buscar posts..."
              className="flex-1 max-w-md"
            />
          </div>

          <Card padding={false}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="table-th">Título</th>
                    <th className="table-th">Categorias</th>
                    <th className="table-th">Autor</th>
                    <th className="table-th">Publicação</th>
                    <th className="table-th">Visualizações</th>
                    <th className="table-th">Status</th>
                    <th className="table-th">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(post => (
                    <tr key={post.id} className="border-t border-cream-100 hover:bg-cream-50">
                      <td className="table-td">
                        <p className="font-medium text-charcoal-700">{post.titulo}</p>
                        <p className="text-xs text-charcoal-400 mt-0.5 max-w-xs truncate">{post.resumo}</p>
                      </td>
                      <td className="table-td">
                        <div className="flex flex-wrap gap-1">
                          {post.categorias.map(cat => (
                            <span key={cat} className="px-1.5 py-0.5 bg-cream-100 text-charcoal-500 text-xs rounded border border-cream-200">
                              {cat}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="table-td text-charcoal-500">{post.autor}</td>
                      <td className="table-td text-charcoal-500">
                        {post.publicadoEm ? new Date(post.publicadoEm).toLocaleDateString('pt-BR') : '—'}
                      </td>
                      <td className="table-td text-charcoal-500">{post.visualizacoes.toLocaleString()}</td>
                      <td className="table-td">
                        <Badge variant={statusVariant[post.status]}>{post.status}</Badge>
                      </td>
                      <td className="table-td">
                        <div className="flex gap-1">
                          <button className="p-1.5 text-charcoal-400 hover:text-forest-500 hover:bg-forest-50 rounded-sm" onClick={() => { setEditPost(post); setModal(true); }}>
                            <Edit size={14} />
                          </button>
                          <button className="p-1.5 text-charcoal-400 hover:text-blue-500 hover:bg-blue-50 rounded-sm">
                            <Eye size={14} />
                          </button>
                          <button className="p-1.5 text-charcoal-400 hover:text-red-500 hover:bg-red-50 rounded-sm">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {tab === 'categorias' && (
        <Card>
          <div className="space-y-3">
            {['Educação', 'Sensorial', 'Preparo', 'Dicas', 'Origem', 'Produtores'].map(cat => (
              <div key={cat} className="flex items-center justify-between py-2 border-b border-cream-100">
                <span className="text-sm text-charcoal-700">{cat}</span>
                <div className="flex gap-2">
                  <button className="text-charcoal-400 hover:text-forest-500 transition-colors p-1">
                    <Edit size={14} />
                  </button>
                  <button className="text-charcoal-400 hover:text-red-500 transition-colors p-1">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <Button variant="secondary" size="sm" className="mt-4">
            <Plus size={14} />
            Nova categoria
          </Button>
        </Card>
      )}

      {/* Post Editor Modal */}
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={editPost ? 'Editar Post' : 'Novo Post'}
        size="xl"
      >
        <div className="space-y-5">
          <Input
            label="Título"
            required
            defaultValue={editPost?.titulo}
            placeholder="Título do post"
          />
          <Input
            label="Slug (URL amigável)"
            defaultValue={editPost?.slug}
            placeholder="titulo-do-post"
          />
          <Textarea
            label="Resumo"
            defaultValue={editPost?.resumo}
            placeholder="Breve descrição do post..."
            rows={2}
          />
          <div>
            <p className="text-xs font-medium text-charcoal-500 uppercase tracking-wider mb-2">Conteúdo *</p>
            <div className="border border-cream-300 rounded-sm">
              <div className="flex flex-wrap gap-1 p-2 border-b border-cream-200 bg-cream-50">
                {['B', 'I', 'H2', 'H3', '"', '🔗', '📷'].map(btn => (
                  <button key={btn} className="px-2 py-1 text-xs border border-cream-300 rounded-sm hover:bg-white transition-colors text-charcoal-600">
                    {btn}
                  </button>
                ))}
              </div>
              <Textarea
                defaultValue={editPost?.conteudo}
                placeholder="Escreva o conteúdo do post em HTML ou texto..."
                rows={12}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Status"
              defaultValue={editPost?.status ?? 'rascunho'}
              options={[
                { value: 'rascunho', label: 'Rascunho' },
                { value: 'publicado', label: 'Publicado' },
                { value: 'agendado', label: 'Agendado' },
              ]}
            />
            {editPost?.status === 'agendado' ? (
              <Input label="Agendar para" type="datetime-local" />
            ) : (
              <Input label="Data de publicação" type="date" defaultValue={editPost?.publicadoEm} />
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Meta Title (SEO)" defaultValue={editPost?.metaTitle} placeholder="Título para mecanismos de busca" />
            <Input label="Meta Description (SEO)" defaultValue={editPost?.metaDescription} placeholder="Descrição para mecanismos de busca" />
          </div>

          <div className="flex gap-3 justify-end pt-2 border-t border-cream-200">
            <Button variant="ghost" onClick={() => setModal(false)}>Cancelar</Button>
            <Button variant="secondary">Pré-visualizar</Button>
            <Button variant="primary">
              {editPost ? 'Salvar alterações' : 'Publicar post'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
