import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, Tag, Package, AlertCircle, X, Check, Loader2, ChevronDown, ChevronRight, Eye, EyeOff } from 'lucide-react';
import {
  getCategoriasProduto,
  createCategoria,
  updateCategoria,
  deleteCategoria,
  getContagemProdutosPorCategoria,
  getProdutosByCategoria,
} from '../../services/produtos.service';
import type { CategoriaProduto, Produto } from '../../types';

// ---- helpers ----
function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ---- Modal ----
interface ModalProps {
  categoria: CategoriaProduto | null; // null = new
  onClose: () => void;
  onSave: (c: CategoriaProduto) => void;
}

function CategoriaModal({ categoria, onClose, onSave }: ModalProps) {
  const isNew = !categoria;
  const [nome, setNome] = useState(categoria?.nome ?? '');
  const [slug, setSlug] = useState(categoria?.slug ?? '');
  const [descricao, setDescricao] = useState(categoria?.descricao ?? '');
  const [slugManual, setSlugManual] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleNomeChange = (v: string) => {
    setNome(v);
    if (!slugManual) setSlug(slugify(v));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !slug.trim()) return;
    setSaving(true);
    setError('');
    try {
      if (isNew) {
        const created = await createCategoria({ nome: nome.trim(), slug: slug.trim(), descricao: descricao.trim() || undefined });
        onSave(created);
      } else {
        await updateCategoria(categoria!.id, { nome: nome.trim(), slug: slug.trim(), descricao: descricao.trim() || undefined });
        onSave({ ...categoria!, nome: nome.trim(), slug: slug.trim(), descricao: descricao.trim() || undefined });
      }
    } catch (err: any) {
      setError(err?.message ?? 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-charcoal-700/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-sm shadow-2xl w-full max-w-md border border-cream-200 overflow-hidden">
        {/* header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-cream-200 bg-cream-50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-forest-100 flex items-center justify-center">
              <Tag size={14} className="text-forest-600" />
            </div>
            <div>
              <p className="font-mono text-[9px] tracking-[0.3em] uppercase text-charcoal-400">
                {isNew ? 'Nova' : 'Editar'}
              </p>
              <h2 className="font-editorial text-lg text-charcoal-700 leading-none mt-0.5">
                {isNew ? 'Categoria' : nome}
              </h2>
            </div>
          </div>
          <button onClick={onClose} className="text-charcoal-400 hover:text-charcoal-700 transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Nome */}
          <div>
            <label className="block font-mono text-[10px] tracking-[0.3em] uppercase text-charcoal-500 mb-2">
              Nome *
            </label>
            <input
              type="text"
              required
              value={nome}
              onChange={e => handleNomeChange(e.target.value)}
              placeholder="Ex: Cafés de Origem Única"
              className="w-full px-4 py-2.5 border border-cream-300 rounded-sm text-sm text-charcoal-700 placeholder:text-charcoal-300 focus:outline-none focus:ring-1 focus:ring-forest-400 focus:border-forest-400 transition-colors"
            />
          </div>

          {/* Slug */}
          <div>
            <label className="block font-mono text-[10px] tracking-[0.3em] uppercase text-charcoal-500 mb-2">
              Slug (URL) *
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                required
                value={slug}
                onChange={e => { setSlug(e.target.value); setSlugManual(true); }}
                placeholder="cafes-de-origem-unica"
                className="flex-1 px-4 py-2.5 border border-cream-300 rounded-sm text-sm text-charcoal-600 font-mono placeholder:text-charcoal-300 focus:outline-none focus:ring-1 focus:ring-forest-400 focus:border-forest-400 transition-colors"
              />
              {slugManual && (
                <button
                  type="button"
                  onClick={() => { setSlug(slugify(nome)); setSlugManual(false); }}
                  title="Regenerar a partir do nome"
                  className="px-3 py-2.5 border border-cream-300 rounded-sm text-charcoal-400 hover:text-forest-600 hover:border-forest-400 transition-colors text-xs font-mono"
                >
                  ↺
                </button>
              )}
            </div>
            <p className="mt-1 text-[11px] text-charcoal-400">
              /loja?categoria=<span className="text-forest-600">{slug || '…'}</span>
            </p>
          </div>

          {/* Descrição */}
          <div>
            <label className="block font-mono text-[10px] tracking-[0.3em] uppercase text-charcoal-500 mb-2">
              Descrição <span className="normal-case font-sans tracking-normal text-charcoal-400">(opcional)</span>
            </label>
            <textarea
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              rows={3}
              placeholder="Breve descrição da categoria..."
              className="w-full px-4 py-2.5 border border-cream-300 rounded-sm text-sm text-charcoal-700 placeholder:text-charcoal-300 focus:outline-none focus:ring-1 focus:ring-forest-400 focus:border-forest-400 transition-colors resize-none"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-sm text-red-700 text-sm">
              <AlertCircle size={14} className="shrink-0" />
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 border border-cream-300 rounded-sm text-sm text-charcoal-600 hover:bg-cream-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !nome.trim() || !slug.trim()}
              className="flex items-center gap-2 px-5 py-2.5 bg-forest-600 hover:bg-forest-700 text-cream-100 text-sm font-medium rounded-sm disabled:opacity-50 transition-colors"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {isNew ? 'Criar categoria' : 'Salvar alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---- Delete Confirm Modal ----
interface DeleteProps {
  categoria: CategoriaProduto;
  contagem: number;
  onClose: () => void;
  onConfirm: () => void;
}

function DeleteModal({ categoria, contagem, onClose, onConfirm }: DeleteProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleConfirm = async () => {
    setLoading(true);
    setError('');
    try {
      await deleteCategoria(categoria.id);
      onConfirm();
    } catch (err: any) {
      setError(err?.message ?? 'Erro ao excluir');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-charcoal-700/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-sm shadow-2xl w-full max-w-sm border border-cream-200 p-6">
        <div className="flex items-start gap-4 mb-5">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <Trash2 size={16} className="text-red-600" />
          </div>
          <div>
            <h3 className="font-editorial text-lg text-charcoal-700">Excluir categoria?</h3>
            <p className="text-sm text-charcoal-500 mt-1">
              <strong className="text-charcoal-700">{categoria.nome}</strong> será removida permanentemente.
            </p>
            {contagem > 0 && (
              <div className="mt-3 flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-sm text-amber-700 text-sm">
                <AlertCircle size={14} className="shrink-0" />
                Esta categoria tem <strong>{contagem} produto{contagem > 1 ? 's' : ''}</strong> associado{contagem > 1 ? 's' : ''}. Eles ficarão sem categoria.
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-sm text-red-700 text-sm">
            <AlertCircle size={14} className="shrink-0" />
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-cream-300 rounded-sm text-sm text-charcoal-600 hover:bg-cream-100 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-sm disabled:opacity-50 transition-colors"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            Excluir
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Expandable Category Row ----
function CategoriaRow({ cat, count, onEdit, onDelete }: {
  cat: CategoriaProduto;
  count: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loadingProds, setLoadingProds] = useState(false);

  async function handleExpand() {
    if (!expanded && produtos.length === 0 && count > 0) {
      setLoadingProds(true);
      try {
        const data = await getProdutosByCategoria(cat.id);
        setProdutos(data);
      } catch { /* silent */ }
      finally { setLoadingProds(false); }
    }
    setExpanded(e => !e);
  }

  return (
    <div className="group">
      {/* Main row */}
      <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 items-center px-6 py-4 hover:bg-cream-50/70 transition-colors">
        {/* Expand toggle */}
        <button
          onClick={handleExpand}
          disabled={count === 0}
          className={`p-1 rounded-sm transition-colors ${count > 0 ? 'text-charcoal-400 hover:text-forest-600 hover:bg-forest-50' : 'text-charcoal-200 cursor-default'}`}
        >
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>

        {/* Name + description */}
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-forest-100 flex items-center justify-center shrink-0">
              <Tag size={12} className="text-forest-600" />
            </div>
            <div className="min-w-0">
              <button onClick={handleExpand} className="font-medium text-sm text-charcoal-700 truncate hover:text-forest-600 transition-colors text-left">
                {cat.nome}
              </button>
              {cat.descricao && (
                <p className="text-xs text-charcoal-400 truncate mt-0.5">{cat.descricao}</p>
              )}
            </div>
          </div>
        </div>

        {/* Count badge */}
        <div className="flex items-center justify-center">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
            count > 0 ? 'bg-forest-100 text-forest-700' : 'bg-cream-200 text-charcoal-400'
          }`}>
            <Package size={11} />
            {count}
          </span>
        </div>

        {/* Slug */}
        <div className="hidden sm:block">
          <span className="font-mono text-xs text-charcoal-400 bg-cream-100 px-2 py-1 rounded-sm">{cat.slug}</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onEdit} className="p-2 text-charcoal-400 hover:text-forest-600 hover:bg-forest-50 rounded-sm transition-colors" title="Editar">
            <Pencil size={14} />
          </button>
          <button onClick={onDelete} className="p-2 text-charcoal-400 hover:text-red-600 hover:bg-red-50 rounded-sm transition-colors" title="Excluir">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Expanded: product list */}
      {expanded && (
        <div className="border-t border-cream-100 bg-cream-50/50 pl-12 pr-6 py-3">
          {loadingProds ? (
            <div className="flex items-center gap-2 py-3 text-sm text-charcoal-400">
              <Loader2 size={14} className="animate-spin" /> Carregando produtos…
            </div>
          ) : produtos.length === 0 ? (
            <p className="text-sm text-charcoal-400 py-2">Nenhum produto nesta categoria.</p>
          ) : (
            <div className="space-y-1.5">
              <p className="font-mono text-[9px] tracking-[0.3em] uppercase text-charcoal-400 mb-2">
                {produtos.length} produto{produtos.length !== 1 ? 's' : ''}
              </p>
              {produtos.map(p => (
                <div key={p.id} className="flex items-center gap-3 py-2 px-3 bg-white rounded-sm border border-cream-200 hover:border-forest-200 transition-colors">
                  <div className="w-6 h-6 rounded-full bg-earth-100 flex items-center justify-center shrink-0">
                    <Package size={11} className="text-earth-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-charcoal-700 truncate">{p.nome}</p>
                    <p className="text-xs text-charcoal-400 font-mono">{p.sku}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 text-right">
                    <div>
                      <p className="text-xs font-medium text-charcoal-700">R$ {p.preco.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className={`text-xs font-medium ${p.estoque <= p.estoqueMinimo ? 'text-red-600' : 'text-charcoal-600'}`}>
                        {p.estoque} un
                      </p>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
                      p.ativo ? 'bg-forest-100 text-forest-700' : 'bg-cream-200 text-charcoal-400'
                    }`}>
                      {p.ativo ? <Eye size={10} /> : <EyeOff size={10} />}
                      {p.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---- Main Page ----
export function AdminCategorias() {
  const [categorias, setCategorias] = useState<CategoriaProduto[]>([]);
  const [contagens, setContagens] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CategoriaProduto | null>(null); // null = new
  const [toDelete, setToDelete] = useState<CategoriaProduto | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [cats, counts] = await Promise.all([
        getCategoriasProduto(),
        getContagemProdutosPorCategoria(),
      ]);
      setCategorias(cats);
      setContagens(counts);
    } catch {
      setError('Não foi possível carregar as categorias.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = (saved: CategoriaProduto) => {
    setCategorias(prev => {
      const idx = prev.findIndex(c => c.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [saved, ...prev];
    });
    setModalOpen(false);
    setEditing(null);
  };

  const handleDeleted = () => {
    if (!toDelete) return;
    setCategorias(prev => prev.filter(c => c.id !== toDelete.id));
    const next = { ...contagens };
    delete next[toDelete.id];
    setContagens(next);
    setToDelete(null);
  };

  const totalProdutos = Object.values(contagens).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 font-mono text-[10px] tracking-[0.3em] uppercase text-charcoal-400 mb-1">
            <span className="w-4 h-px bg-earth-400" />
            Produtos
          </div>
          <h1 className="font-editorial text-3xl text-charcoal-700 tracking-tight">Categorias</h1>
          <p className="text-sm text-charcoal-500 mt-1">
            {categorias.length} categoria{categorias.length !== 1 ? 's' : ''} · {totalProdutos} produto{totalProdutos !== 1 ? 's' : ''} catalogado{totalProdutos !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => { setEditing(null); setModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-forest-600 hover:bg-forest-700 text-cream-100 text-sm font-medium rounded-sm transition-colors"
        >
          <Plus size={15} />
          Nova categoria
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-sm text-red-700 text-sm">
          <AlertCircle size={16} className="shrink-0" />
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={28} className="animate-spin text-forest-500" />
        </div>
      )}

      {/* Empty */}
      {!loading && !error && categorias.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-cream-200 flex items-center justify-center mb-4">
            <Tag size={24} className="text-charcoal-400" />
          </div>
          <p className="font-editorial text-xl text-charcoal-600 mb-1">Nenhuma categoria ainda</p>
          <p className="text-sm text-charcoal-400 mb-6">Crie categorias para organizar seu catálogo de produtos.</p>
          <button
            onClick={() => { setEditing(null); setModalOpen(true); }}
            className="flex items-center gap-2 px-5 py-2.5 bg-forest-600 hover:bg-forest-700 text-cream-100 text-sm font-medium rounded-sm transition-colors"
          >
            <Plus size={15} />
            Criar primeira categoria
          </button>
        </div>
      )}

      {/* Table */}
      {!loading && categorias.length > 0 && (
        <div className="bg-white border border-cream-200 rounded-sm overflow-hidden shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06)]">
          {/* table header */}
          <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 px-6 py-3 bg-cream-50 border-b border-cream-200">
            <span />
            <span className="font-mono text-[10px] tracking-[0.3em] uppercase text-charcoal-400">Nome</span>
            <span className="font-mono text-[10px] tracking-[0.3em] uppercase text-charcoal-400 text-center">Produtos</span>
            <span className="font-mono text-[10px] tracking-[0.3em] uppercase text-charcoal-400">Slug</span>
            <span className="font-mono text-[10px] tracking-[0.3em] uppercase text-charcoal-400 text-right">Ações</span>
          </div>

          <div className="divide-y divide-cream-100">
            {categorias.map(cat => (
              <CategoriaRow
                key={cat.id}
                cat={cat}
                count={contagens[cat.id] ?? 0}
                onEdit={() => { setEditing(cat); setModalOpen(true); }}
                onDelete={() => setToDelete(cat)}
              />
            ))}
          </div>

          {/* Footer summary */}
          <div className="px-6 py-3 bg-cream-50 border-t border-cream-200">
            <p className="text-xs text-charcoal-400 font-mono">
              {categorias.length} categorias · {totalProdutos} produtos no total
            </p>
          </div>
        </div>
      )}

      {/* Modals */}
      {modalOpen && (
        <CategoriaModal
          categoria={editing}
          onClose={() => { setModalOpen(false); setEditing(null); }}
          onSave={handleSave}
        />
      )}

      {toDelete && (
        <DeleteModal
          categoria={toDelete}
          contagem={contagens[toDelete.id] ?? 0}
          onClose={() => setToDelete(null)}
          onConfirm={handleDeleted}
        />
      )}
    </div>
  );
}
