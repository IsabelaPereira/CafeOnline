import React, { useEffect, useState } from 'react';
import { Plus, Eye, Edit, Trash2 } from 'lucide-react';
import {
  Card, Badge, Button, Modal, Input, Textarea, Select,
  SectionHeader, SearchBar, Tabs
} from '../../components/ui';
import { getPosts, createPost, updatePost, deletePost } from '../../services/blog.service';
import { useAuth } from '../../contexts/AuthContext';
import type { PostBlog } from '../../types';

const statusVariant: Record<string, 'active' | 'pending' | 'inactive'> = {
  publicado: 'active', rascunho: 'inactive', agendado: 'pending',
};

export function AdminBlog() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<PostBlog[]>([]);
  const [tab, setTab] = useState('posts');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [editPost, setEditPost] = useState<PostBlog | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Form state
  const [formTitulo, setFormTitulo] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formResumo, setFormResumo] = useState('');
  const [formConteudo, setFormConteudo] = useState('');
  const [formStatus, setFormStatus] = useState<PostBlog['status']>('rascunho');
  const [formPublicadoEm, setFormPublicadoEm] = useState('');
  const [formMetaTitle, setFormMetaTitle] = useState('');
  const [formMetaDescription, setFormMetaDescription] = useState('');

  useEffect(() => {
    getPosts().then(setPosts).catch(console.error);
  }, []);

  const filtered = posts.filter(p =>
    search === '' ||
    p.titulo.toLowerCase().includes(search.toLowerCase())
  );

  function openModal(post: PostBlog | null) {
    setEditPost(post);
    setFormTitulo(post?.titulo ?? '');
    setFormSlug(post?.slug ?? '');
    setFormResumo(post?.resumo ?? '');
    setFormConteudo(post?.conteudo ?? '');
    setFormStatus(post?.status ?? 'rascunho');
    setFormPublicadoEm(post?.publicadoEm ? post.publicadoEm.slice(0, 10) : '');
    setFormMetaTitle(post?.metaTitle ?? '');
    setFormMetaDescription(post?.metaDescription ?? '');
    setSaveError('');
    setModal(true);
  }

  async function handleSalvar() {
    if (!formTitulo.trim()) { setSaveError('O título é obrigatório.'); return; }
    setSaving(true); setSaveError('');
    try {
      if (editPost) {
        await updatePost(editPost.id, {
          titulo: formTitulo, resumo: formResumo, conteudo: formConteudo,
          status: formStatus, publicadoEm: formPublicadoEm || undefined,
          metaTitle: formMetaTitle || undefined, metaDescription: formMetaDescription || undefined,
        });
      } else {
        await createPost({
          titulo: formTitulo, resumo: formResumo, conteudo: formConteudo,
          status: formStatus, autorId: user?.id ?? '',
        });
      }
      const updated = await getPosts();
      setPosts(updated);
      setModal(false);
    } catch (e: any) {
      setSaveError(e?.message ?? 'Erro ao salvar post.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir este post?')) return;
    await deletePost(id);
    setPosts(prev => prev.filter(p => p.id !== id));
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <SectionHeader
        title="Blog"
        subtitle="Gerencie o conteúdo do blog"
        action={
          <Button variant="primary" size="sm" onClick={() => openModal(null)}>
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
                          <button className="p-1.5 text-charcoal-400 hover:text-forest-500 hover:bg-forest-50 rounded-sm" onClick={() => openModal(post)}>
                            <Edit size={14} />
                          </button>
                          <button className="p-1.5 text-charcoal-400 hover:text-blue-500 hover:bg-blue-50 rounded-sm">
                            <Eye size={14} />
                          </button>
                          <button className="p-1.5 text-charcoal-400 hover:text-red-500 hover:bg-red-50 rounded-sm" onClick={() => handleDelete(post.id)}>
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
            value={formTitulo}
            onChange={e => setFormTitulo(e.target.value)}
            placeholder="Título do post"
          />
          <Input
            label="Slug (URL amigável)"
            value={formSlug}
            onChange={e => setFormSlug(e.target.value)}
            placeholder="titulo-do-post"
          />
          <Textarea
            label="Resumo"
            value={formResumo}
            onChange={e => setFormResumo(e.target.value)}
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
                value={formConteudo}
                onChange={e => setFormConteudo(e.target.value)}
                placeholder="Escreva o conteúdo do post em HTML ou texto..."
                rows={12}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Status"
              value={formStatus}
              onChange={e => setFormStatus(e.target.value as PostBlog['status'])}
              options={[
                { value: 'rascunho', label: 'Rascunho' },
                { value: 'publicado', label: 'Publicado' },
                { value: 'agendado', label: 'Agendado' },
              ]}
            />
            <Input
              label="Data de publicação"
              type="date"
              value={formPublicadoEm}
              onChange={e => setFormPublicadoEm(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Meta Title (SEO)"
              value={formMetaTitle}
              onChange={e => setFormMetaTitle(e.target.value)}
              placeholder="Título para mecanismos de busca"
            />
            <Input
              label="Meta Description (SEO)"
              value={formMetaDescription}
              onChange={e => setFormMetaDescription(e.target.value)}
              placeholder="Descrição para mecanismos de busca"
            />
          </div>

          {saveError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-sm px-3 py-2">{saveError}</p>
          )}

          <div className="flex gap-3 justify-end pt-2 border-t border-cream-200">
            <Button variant="ghost" onClick={() => setModal(false)}>Cancelar</Button>
            <Button variant="primary" onClick={handleSalvar} disabled={saving}>
              {saving ? 'Salvando...' : editPost ? 'Salvar alterações' : 'Publicar post'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
