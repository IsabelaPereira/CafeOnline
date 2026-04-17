import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Plus, Edit, Package, AlertTriangle, Trash2, CheckSquare,
  EyeOff, Eye, TrendingDown, TrendingUp, ShoppingCart,
  ArrowDown, ArrowUp, BarChart2, RefreshCw, Printer,
  Minus, Tag, FileEdit, Copy, Upload, X, Star, Video, Image, Link,
} from 'lucide-react';
import {
  Card, Badge, Button, Modal, Input,
  SectionHeader, SearchBar, FilterBar, StatCard, Tabs,
} from '../../components/ui';
import {
  getProdutos, deleteProduto, updateProduto, updateEstoque,
  getVelocidadeVendas, getCategoriasProduto, duplicarProduto,
} from '../../services/produtos.service';
import { uploadProdutoMidia, deleteProdutoMidia, normalizeVideoUrl, videoType } from '../../services/storage.service';
import type { Produto, CategoriaProduto, ProdutoMetricas, StatusEstoque } from '../../types';
import { ProdutoEstoqueDetalhe } from './ProdutoEstoqueDetalhe';

// ─── Helpers ────────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<StatusEstoque, { label: string; color: string; bg: string; bar: string }> = {
  critico: { label: 'Crítico',  color: 'text-red-600',    bg: 'bg-red-50',    bar: 'bg-red-500' },
  baixo:   { label: 'Baixo',    color: 'text-amber-600',  bg: 'bg-amber-50',  bar: 'bg-amber-400' },
  ok:      { label: 'OK',       color: 'text-forest-600', bg: 'bg-forest-50', bar: 'bg-forest-500' },
  acima:   { label: 'Acima',    color: 'text-blue-600',   bg: 'bg-blue-50',   bar: 'bg-blue-400' },
};

function calcStatus(p: Produto): StatusEstoque {
  if (p.estoque <= p.estoqueMinimo)        return 'critico';
  if (p.estoque <= p.estoqueMinimo * 1.5)  return 'baixo';
  if (p.estoque >= p.estoqueMinimo * 5)    return 'acima';
  return 'ok';
}

function calcMetricas(p: Produto, velocidade: Record<string, number>): ProdutoMetricas {
  const vendas30d = velocidade[p.id] ?? 0;
  const velocidadeDia = vendas30d / 30;
  const diasRestantes = velocidadeDia > 0 ? Math.floor(p.estoque / velocidadeDia) : null;
  const alvo = Math.ceil(velocidadeDia * 45) + p.estoqueMinimo;
  const sugestao = Math.max(0, alvo - p.estoque);
  return { ...p, vendas30d, velocidadeDia, diasRestantes, coberturaDias: diasRestantes, sugestao, status: calcStatus(p) };
}

function diasCor(dias: number | null) {
  if (dias === null) return 'text-charcoal-400';
  if (dias < 14)  return 'text-red-600 font-semibold';
  if (dias < 30)  return 'text-amber-600 font-medium';
  return 'text-forest-600';
}

// ─── Campos editáveis em massa ──────────────────────────────────────────────
const CAMPOS_BULK: { key: keyof Produto; label: string; tipo: 'text' | 'number' | 'boolean' | 'select' }[] = [
  { key: 'torra',           label: 'Torra',           tipo: 'text' },
  { key: 'processo',        label: 'Processo',        tipo: 'text' },
  { key: 'regiao',          label: 'Região',          tipo: 'text' },
  { key: 'produtor',        label: 'Produtor',        tipo: 'text' },
  { key: 'variedade',       label: 'Variedade',       tipo: 'text' },
  { key: 'preco',           label: 'Preço (R$)',      tipo: 'number' },
  { key: 'estoqueMinimo',   label: 'Estoque mínimo',  tipo: 'number' },
  { key: 'destaque',        label: 'Destaque',        tipo: 'boolean' },
  { key: 'produtoAssinatura', label: 'Produto do clube', tipo: 'boolean' },
];

// ─── Componente principal ────────────────────────────────────────────────────
export function AdminProdutos() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [categorias, setCategorias] = useState<CategoriaProduto[]>([]);
  const [velocidade, setVelocidade] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('catalogo');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [selectedProd, setSelectedProd] = useState<Produto | null>(null);

  // Seleção múltipla
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleteModal, setDeleteModal] = useState<{ ids: string[]; names: string[] } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [duplicandoId, setDuplicandoId] = useState<string | null>(null);

  // Bulk edit
  const [bulkEditModal, setBulkEditModal] = useState(false);

  // Modais de estoque
  const [ajusteModal, setAjusteModal] = useState<Produto | null>(null);
  const [entradaModal, setEntradaModal] = useState(false);
  const [planejamentoModal, setPlanejamentoModal] = useState(false);
  const [estoqueFilter, setEstoqueFilter] = useState<StatusEstoque | 'todos'>('todos');
  const [detalheModal, setDetalheModal] = useState<ProdutoMetricas | null>(null);

  // Relatórios de estoque
  const [relatorioTab, setRelatorioTab] = useState<'movimentacoes' | 'gestao'>('movimentacoes');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, v, cats] = await Promise.all([
        getProdutos(),
        getVelocidadeVendas(30),
        getCategoriasProduto(),
      ]);
      setProdutos(p);
      setVelocidade(v);
      setCategorias(cats);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const metricas = produtos.map(p => calcMetricas(p, velocidade));
  const catMap = Object.fromEntries(categorias.map(c => [c.id, c.nome]));

  const filtered = metricas.filter(p =>
    search === '' || p.nome.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase())
  );

  const baixoEstoque = produtos.filter(p => p.estoque <= p.estoqueMinimo);

  // Seleção
  const allFilteredIds = filtered.map(p => p.id);
  const allSelected = allFilteredIds.length > 0 && allFilteredIds.every(id => selected.has(id));
  const someSelected = allFilteredIds.some(id => selected.has(id));
  const selectedInView = allFilteredIds.filter(id => selected.has(id));

  function toggleOne(id: string) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleAll() {
    if (allSelected) setSelected(prev => { const n = new Set(prev); allFilteredIds.forEach(id => n.delete(id)); return n; });
    else setSelected(prev => new Set([...prev, ...allFilteredIds]));
  }
  function clearSelection() { setSelected(new Set()); }

  function confirmDelete(ids: string[]) {
    setDeleteModal({ ids, names: ids.map(id => produtos.find(p => p.id === id)?.nome ?? id) });
  }

  async function handleDelete() {
    if (!deleteModal) return;
    setDeleting(true);
    try {
      await Promise.all(deleteModal.ids.map(id => deleteProduto(id)));
      setProdutos(prev => prev.filter(p => !deleteModal.ids.includes(p.id)));
      setSelected(prev => { const n = new Set(prev); deleteModal.ids.forEach(id => n.delete(id)); return n; });
      setDeleteModal(null);
    } finally { setDeleting(false); }
  }

  async function handleToggleAtivo(ids: string[], ativo: boolean) {
    setTogglingId(ids[0]);
    try {
      await Promise.all(ids.map(id => updateProduto(id, { ativo })));
      setProdutos(prev => prev.map(p => ids.includes(p.id) ? { ...p, ativo } : p));
      clearSelection();
    } finally { setTogglingId(null); }
  }

  async function handleDuplicar(id: string) {
    setDuplicandoId(id);
    try {
      const copia = await duplicarProduto(id);
      setProdutos(prev => [copia, ...prev]);
    } catch (e) { console.error(e); }
    finally { setDuplicandoId(null); }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <SectionHeader
        title="Produtos"
        subtitle="Catálogo e controle de estoque"
        action={
          <Button variant="primary" size="sm" onClick={() => { setSelectedProd(null); setModal(true); }}>
            <Plus size={14} /> Novo produto
          </Button>
        }
      />

      {baixoEstoque.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-sm p-4 flex items-center gap-3">
          <AlertTriangle size={18} className="text-red-500 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-charcoal-700">{baixoEstoque.length} produto(s) com estoque crítico</p>
            <p className="text-xs text-charcoal-500">{baixoEstoque.map(p => p.nome).join(', ')}</p>
          </div>
          <button onClick={() => { setTab('estoque'); setEstoqueFilter('critico'); }}
            className="text-xs text-red-600 font-medium hover:underline shrink-0">
            Ver no estoque →
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard title="Total de produtos"  value={produtos.filter(p => p.ativo).length}   color="forest" icon={<Package size={18} />} />
        <StatCard title="Estoque baixo"      value={baixoEstoque.length}                    color="red"    icon={<AlertTriangle size={18} />} />
        <StatCard title="Destaques"          value={produtos.filter(p => p.destaque).length} color="gold"  icon={<></>} />
        <StatCard title="Assinatura"         value={produtos.filter(p => p.produtoAssinatura).length} color="earth" icon={<></>} subtitle="Disponíveis para clube" />
      </div>

      <Tabs
        tabs={[
          { id: 'catalogo',   label: 'Catálogo',   count: produtos.length },
          { id: 'estoque',    label: 'Estoque' },
          { id: 'relatorios', label: 'Relatórios' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {/* ── TAB: CATÁLOGO ── */}
      {tab === 'catalogo' && (
        <Card padding={false}>
          <FilterBar>
            <SearchBar value={search} onChange={setSearch} placeholder="Buscar produto ou SKU..." className="w-64" />
          </FilterBar>

          {someSelected && selectedInView.length > 0 && (
            <div className="flex items-center gap-3 px-4 py-2.5 bg-forest-50 border-b border-forest-100 flex-wrap">
              <CheckSquare size={15} className="text-forest-600" />
              <span className="text-sm font-medium text-forest-700">{selectedInView.length} selecionado(s)</span>
              <div className="flex items-center gap-2 flex-wrap">
                <button onClick={() => setBulkEditModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-charcoal-600 bg-white hover:bg-cream-100 border border-charcoal-200 rounded-sm transition-colors">
                  <FileEdit size={12} /> Editar campos
                </button>
                <button onClick={() => handleToggleAtivo(selectedInView, false)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-charcoal-600 bg-white hover:bg-cream-100 border border-charcoal-200 rounded-sm transition-colors">
                  <EyeOff size={12} /> Desabilitar
                </button>
                <button onClick={() => handleToggleAtivo(selectedInView, true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-forest-600 bg-forest-50 hover:bg-forest-100 rounded-sm transition-colors">
                  <Eye size={12} /> Habilitar
                </button>
                <button onClick={() => confirmDelete(selectedInView)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-sm transition-colors">
                  <Trash2 size={12} /> Excluir
                </button>
              </div>
              <button onClick={clearSelection} className="ml-auto text-xs text-charcoal-400 hover:text-charcoal-600">Limpar</button>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-th w-10">
                    <input type="checkbox" checked={allSelected}
                      ref={el => { if (el) el.indeterminate = someSelected && !allSelected; }}
                      onChange={toggleAll} className="rounded-sm border-charcoal-300 text-forest-500" />
                  </th>
                  <th className="table-th">SKU</th>
                  <th className="table-th">Produto</th>
                  <th className="table-th">Categorias</th>
                  <th className="table-th">Preço</th>
                  <th className="table-th">Estoque</th>
                  <th className="table-th">Torra</th>
                  <th className="table-th">Status</th>
                  <th className="table-th">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id} className={`border-t border-cream-100 hover:bg-cream-50 transition-colors ${selected.has(p.id) ? 'bg-forest-50/40' : ''}`}>
                    <td className="table-td w-10">
                      <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleOne(p.id)}
                        className="rounded-sm border-charcoal-300 text-forest-500" />
                    </td>
                    <td className="table-td text-xs text-charcoal-500 font-mono">{p.sku}</td>
                    <td className="table-td">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-earth-100 rounded-sm flex items-center justify-center shrink-0">
                          <Package size={16} className="text-earth-400" />
                        </div>
                        <div>
                          <p className="font-medium text-charcoal-700 text-sm">{p.nome}</p>
                          <p className="text-xs text-charcoal-400">{p.regiao} · {p.processo}</p>
                        </div>
                      </div>
                    </td>
                    <td className="table-td">
                      <div className="flex flex-wrap gap-1">
                        {(p.categoriaIds?.length ? p.categoriaIds : p.categoriaId ? [p.categoriaId] : []).map(cid => (
                          <span key={cid} className="px-1.5 py-0.5 bg-cream-200 text-charcoal-600 text-xs rounded-full">
                            {catMap[cid] ?? cid.slice(0, 6)}
                          </span>
                        ))}
                        {p.produtoAssinatura && (
                          <span className="px-1.5 py-0.5 bg-forest-100 text-forest-600 text-xs rounded-full">Clube</span>
                        )}
                      </div>
                    </td>
                    <td className="table-td">
                      {p.precoPromocional ? (
                        <><p className="text-xs text-charcoal-400 line-through">R$ {p.preco.toFixed(2)}</p>
                        <p className="font-medium text-charcoal-700">R$ {p.precoPromocional.toFixed(2)}</p></>
                      ) : (
                        <p className="font-medium text-charcoal-700">R$ {p.preco.toFixed(2)}</p>
                      )}
                    </td>
                    <td className="table-td">
                      <span className={`font-medium ${p.estoque <= p.estoqueMinimo ? 'text-red-500' : 'text-charcoal-700'}`}>{p.estoque}</span>
                      <span className="text-xs text-charcoal-400"> un</span>
                    </td>
                    <td className="table-td text-charcoal-500">{p.torra}</td>
                    <td className="table-td">
                      <Badge variant={p.ativo ? 'active' : 'inactive'}>{p.ativo ? 'Ativo' : 'Inativo'}</Badge>
                    </td>
                    <td className="table-td">
                      <div className="flex gap-1">
                        <button onClick={() => { setSelectedProd(p); setModal(true); }}
                          className="p-1.5 text-charcoal-400 hover:text-forest-500 hover:bg-forest-50 rounded-sm transition-colors" title="Editar">
                          <Edit size={14} />
                        </button>
                        <button onClick={() => handleToggleAtivo([p.id], !p.ativo)} disabled={togglingId === p.id}
                          className={`p-1.5 rounded-sm transition-colors ${p.ativo ? 'text-charcoal-400 hover:text-amber-500 hover:bg-amber-50' : 'text-charcoal-400 hover:text-forest-500 hover:bg-forest-50'}`}
                          title={p.ativo ? 'Desabilitar' : 'Habilitar'}>
                          {p.ativo ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                        <button onClick={() => handleDuplicar(p.id)} disabled={duplicandoId === p.id}
                          className="p-1.5 text-charcoal-400 hover:text-blue-500 hover:bg-blue-50 rounded-sm transition-colors" title="Duplicar">
                          {duplicandoId === p.id ? <RefreshCw size={14} className="animate-spin" /> : <Copy size={14} />}
                        </button>
                        <button onClick={() => confirmDelete([p.id])}
                          className="p-1.5 text-charcoal-400 hover:text-red-500 hover:bg-red-50 rounded-sm transition-colors" title="Excluir">
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
      )}

      {/* ── TAB: ESTOQUE ── */}
      {tab === 'estoque' && (
        <EstoqueTab
          metricas={metricas}
          onReload={load}
          onAjustar={setAjusteModal}
          onRegistrarEntrada={() => setEntradaModal(true)}
          onPlanejamento={() => setPlanejamentoModal(true)}
          onVerDetalhe={setDetalheModal}
          filter={estoqueFilter}
          onFilterChange={setEstoqueFilter}
          onUpdateEstoque={(id, est) => setProdutos(prev => prev.map(p => p.id === id ? { ...p, estoque: est } : p))}
          onUpdateMinimo={(id, min) => setProdutos(prev => prev.map(p => p.id === id ? { ...p, estoqueMinimo: min } : p))}
        />
      )}

      {/* ── TAB: RELATÓRIOS ── */}
      {tab === 'relatorios' && (
        <RelatoriosTab
          metricas={metricas}
          relatorioTab={relatorioTab}
          onTabChange={setRelatorioTab}
        />
      )}

      {/* ─── Modal: Novo/Editar produto ─── */}
      <Modal open={modal} onClose={() => setModal(false)} title={selectedProd ? 'Editar Produto' : 'Novo Produto'} size="xl">
        <ProdutoForm
          produto={selectedProd}
          categorias={categorias}
          onClose={() => setModal(false)}
          onSave={async (patch) => {
            if (selectedProd) {
              await updateProduto(selectedProd.id, patch);
              setProdutos(prev => prev.map(p => p.id === selectedProd.id ? { ...p, ...patch } : p));
            } else {
              // criar — simplificado; em produção chamar createProduto
            }
            setModal(false);
          }}
        />
      </Modal>

      {/* Modal bulk edit */}
      {bulkEditModal && (
        <BulkEditModal
          ids={selectedInView}
          produtos={produtos}
          categorias={categorias}
          onClose={() => setBulkEditModal(false)}
          onSave={async (ids, patch) => {
            await Promise.all(ids.map(id => updateProduto(id, patch)));
            setProdutos(prev => prev.map(p => ids.includes(p.id) ? { ...p, ...patch } : p));
            setBulkEditModal(false);
            clearSelection();
          }}
        />
      )}

      {/* Modal confirmação exclusão */}
      <Modal open={!!deleteModal} onClose={() => !deleting && setDeleteModal(null)} title="Confirmar exclusão" size="sm">
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-red-50 rounded-sm">
            <Trash2 size={16} className="text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-charcoal-700">
                {deleteModal?.ids.length === 1 ? 'Excluir este produto?' : `Excluir ${deleteModal?.ids.length} produtos?`}
              </p>
              <p className="text-xs text-charcoal-500 mt-1">{deleteModal?.names.join(', ')}</p>
            </div>
          </div>
          <p className="text-sm text-charcoal-500">Esta ação não pode ser desfeita.</p>
          <div className="flex gap-3 justify-end pt-2 border-t border-cream-200">
            <Button variant="ghost" onClick={() => setDeleteModal(null)} disabled={deleting}>Cancelar</Button>
            <Button variant="danger" onClick={handleDelete} disabled={deleting}>
              <Trash2 size={14} />{deleting ? 'Excluindo...' : 'Excluir'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal ajuste individual */}
      {ajusteModal && (
        <AjusteModal
          produto={ajusteModal}
          onClose={() => setAjusteModal(null)}
          onSave={async (id, novoEstoque, estoqueAtual, tipo, obs) => {
            await updateEstoque(id, novoEstoque, estoqueAtual, tipo, obs);
            setProdutos(prev => prev.map(p => p.id === id ? { ...p, estoque: novoEstoque } : p));
            setAjusteModal(null);
          }}
        />
      )}

      {/* Modal entrada de estoque */}
      <EntradaModal
        open={entradaModal}
        produtos={produtos}
        onClose={() => setEntradaModal(false)}
        onSave={async (entradas) => {
          await Promise.all(entradas.map(({ id, qty, obs }) => {
            const atual = produtos.find(p => p.id === id)?.estoque ?? 0;
            return updateEstoque(id, atual + qty, atual, 'entrada', obs);
          }));
          setProdutos(prev => prev.map(p => {
            const e = entradas.find(x => x.id === p.id);
            return e ? { ...p, estoque: p.estoque + e.qty } : p;
          }));
          setEntradaModal(false);
        }}
      />

      {/* Modal planejamento de compras */}
      <PlanejamentoModal
        open={planejamentoModal}
        metricas={metricas}
        onClose={() => setPlanejamentoModal(false)}
      />

      {/* Drawer detalhe de estoque */}
      {detalheModal && (
        <ProdutoEstoqueDetalhe
          metricas={detalheModal}
          onClose={() => setDetalheModal(null)}
          onAjustar={(p) => { setDetalheModal(null); setAjusteModal(p); }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FORM: PRODUTO (novo / editar)
// ─────────────────────────────────────────────────────────────────────────────
function ProdutoForm({ produto, categorias, onClose, onSave }: {
  produto: Produto | null;
  categorias: CategoriaProduto[];
  onClose: () => void;
  onSave: (patch: Partial<Produto>) => Promise<void>;
}) {
  const [form, setForm] = useState({
    nome: produto?.nome ?? '',
    sku: produto?.sku ?? '',
    preco: produto?.preco?.toString() ?? '',
    precoPromocional: produto?.precoPromocional?.toString() ?? '',
    estoque: produto?.estoque?.toString() ?? '',
    estoqueMinimo: produto?.estoqueMinimo?.toString() ?? '5',
    peso: produto?.peso?.toString() ?? '',
    regiao: produto?.regiao ?? '',
    produtor: produto?.produtor ?? '',
    variedade: produto?.variedade ?? '',
    processo: produto?.processo ?? '',
    altitude: produto?.altitude ?? '',
    torra: produto?.torra ?? '',
    descricaoCurta: produto?.descricaoCurta ?? '',
    descricao: produto?.descricao ?? '',
    ativo: produto?.ativo ?? true,
    destaque: produto?.destaque ?? false,
    produtoAssinatura: produto?.produtoAssinatura ?? false,
    categoriaIds: produto?.categoriaIds ?? (produto?.categoriaId ? [produto.categoriaId] : []) as string[],
  });
  const [fotos, setFotos] = useState<string[]>(produto?.fotos ?? []);
  const [videos, setVideos] = useState<string[]>(produto?.videos ?? []);
  const [videoInput, setVideoInput] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [tabForm, setTabForm] = useState<'basico' | 'estoque' | 'ficha' | 'midia'>('basico');

  function toggle(field: keyof typeof form, val?: boolean) {
    setForm(prev => ({ ...prev, [field]: val !== undefined ? val : !prev[field as keyof typeof form] }));
  }

  function toggleCategoria(id: string) {
    setForm(prev => {
      const ids = prev.categoriaIds.includes(id)
        ? prev.categoriaIds.filter(c => c !== id)
        : [...prev.categoriaIds, id];
      return { ...prev, categoriaIds: ids };
    });
  }

  async function handleSave() {
    setSaving(true);
    try {
      await onSave({
        nome: form.nome,
        sku: form.sku,
        preco: parseFloat(form.preco) || 0,
        precoPromocional: form.precoPromocional ? parseFloat(form.precoPromocional) : undefined,
        estoque: parseInt(form.estoque) || 0,
        estoqueMinimo: parseInt(form.estoqueMinimo) || 5,
        peso: parseFloat(form.peso) || 0,
        regiao: form.regiao || undefined,
        produtor: form.produtor || undefined,
        variedade: form.variedade || undefined,
        processo: form.processo || undefined,
        altitude: form.altitude || undefined,
        torra: form.torra || undefined,
        descricaoCurta: form.descricaoCurta,
        descricao: form.descricao,
        ativo: form.ativo,
        destaque: form.destaque,
        produtoAssinatura: form.produtoAssinatura,
        categoriaIds: form.categoriaIds,
        categoriaId: form.categoriaIds[0] ?? '',
        fotos,
        videos,
      });
    } finally { setSaving(false); }
  }

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex gap-1 border-b border-cream-200 -mt-2">
        {(['basico', 'estoque', 'ficha', 'midia'] as const).map(t => (
          <button key={t} onClick={() => setTabForm(t)}
            className={`px-4 py-2 text-xs font-mono tracking-wider uppercase border-b-2 -mb-px transition-colors ${
              tabForm === t ? 'border-forest-500 text-forest-700' : 'border-transparent text-charcoal-400 hover:text-charcoal-600'
            }`}>
            {t === 'basico' ? 'Dados básicos' : t === 'estoque' ? 'Estoque & Preço' : t === 'ficha' ? 'Ficha técnica' : 'Mídia'}
          </button>
        ))}
      </div>

      {tabForm === 'basico' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Nome do produto *" value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} />
            <Input label="SKU *" value={form.sku} onChange={e => setForm(p => ({ ...p, sku: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-charcoal-500 uppercase tracking-wider mb-2">Categorias</label>
            <div className="flex flex-wrap gap-2">
              {categorias.map(c => (
                <button key={c.id} type="button" onClick={() => toggleCategoria(c.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-medium border transition-colors ${
                    form.categoriaIds.includes(c.id)
                      ? 'bg-forest-600 text-cream-100 border-forest-600'
                      : 'bg-white text-charcoal-600 border-cream-300 hover:border-forest-400'
                  }`}>
                  <Tag size={10} /> {c.nome}
                </button>
              ))}
            </div>
          </div>
          <Input label="Descrição curta" value={form.descricaoCurta} onChange={e => setForm(p => ({ ...p, descricaoCurta: e.target.value }))} />
          <div>
            <label className="block text-xs font-medium text-charcoal-500 uppercase tracking-wider mb-1.5">Descrição completa</label>
            <textarea rows={3} value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))}
              className="w-full px-3 py-2 border border-cream-300 rounded-sm text-sm resize-none focus:outline-none focus:ring-1 focus:ring-forest-400" />
          </div>
          <div className="flex flex-wrap gap-4">
            {([
              { key: 'ativo',             label: 'Produto ativo' },
              { key: 'destaque',          label: 'Destaque na loja' },
              { key: 'produtoAssinatura', label: 'Produto do clube' },
            ] as const).map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={form[key] as boolean} onChange={() => toggle(key)}
                  className="w-4 h-4 rounded-sm border-charcoal-300 text-forest-500 accent-forest-500" />
                <span className="text-sm text-charcoal-600">{label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {tabForm === 'estoque' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Input label="Preço (R$) *" type="number" value={form.preco} onChange={e => setForm(p => ({ ...p, preco: e.target.value }))} />
            <Input label="Preço promocional" type="number" value={form.precoPromocional} onChange={e => setForm(p => ({ ...p, precoPromocional: e.target.value }))} />
            <Input label="Peso (g)" type="number" value={form.peso} onChange={e => setForm(p => ({ ...p, peso: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Estoque inicial" type="number" value={form.estoque} onChange={e => setForm(p => ({ ...p, estoque: e.target.value }))} />
            <Input label="Estoque mínimo" type="number" value={form.estoqueMinimo} onChange={e => setForm(p => ({ ...p, estoqueMinimo: e.target.value }))} />
          </div>
        </div>
      )}

      {tabForm === 'ficha' && (
        <div className="grid grid-cols-2 gap-4">
          <Input label="Região" value={form.regiao} onChange={e => setForm(p => ({ ...p, regiao: e.target.value }))} />
          <Input label="Produtor" value={form.produtor} onChange={e => setForm(p => ({ ...p, produtor: e.target.value }))} />
          <Input label="Variedade" value={form.variedade} onChange={e => setForm(p => ({ ...p, variedade: e.target.value }))} />
          <Input label="Processo" value={form.processo} onChange={e => setForm(p => ({ ...p, processo: e.target.value }))} />
          <Input label="Altitude" value={form.altitude} onChange={e => setForm(p => ({ ...p, altitude: e.target.value }))} />
          <Input label="Torra" value={form.torra} onChange={e => setForm(p => ({ ...p, torra: e.target.value }))} />
        </div>
      )}

      {tabForm === 'midia' && (
        <div className="space-y-6">
          {/* ── Fotos ── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-mono tracking-wider uppercase text-charcoal-500 flex items-center gap-1.5">
                  <Image size={12} /> Fotos
                </p>
                <p className="text-xs text-charcoal-400 mt-0.5">A primeira foto é a capa. Clique na estrela para definir como capa.</p>
              </div>
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingPhoto}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-forest-600 text-white hover:bg-forest-700 rounded-sm transition-colors disabled:opacity-50">
                {uploadingPhoto ? <RefreshCw size={12} className="animate-spin" /> : <Upload size={12} />}
                {uploadingPhoto ? 'Enviando...' : 'Adicionar foto'}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
                onChange={async e => {
                  const files = Array.from(e.target.files ?? []);
                  if (!files.length) return;
                  setUploadingPhoto(true);
                  const prodId = produto?.id ?? `temp-${Date.now()}`;
                  try {
                    const urls = await Promise.all(files.map(f => uploadProdutoMidia(f, prodId)));
                    setFotos(prev => [...prev, ...urls]);
                  } catch (err) { console.error(err); }
                  finally { setUploadingPhoto(false); e.target.value = ''; }
                }} />
            </div>

            {fotos.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-cream-300 rounded-sm text-charcoal-400 text-xs gap-1">
                <Image size={20} className="opacity-40" />
                Nenhuma foto adicionada
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {fotos.map((url, i) => (
                  <div key={url} className="relative group aspect-square rounded-sm overflow-hidden border border-cream-200">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    {/* Overlay actions */}
                    <div className="absolute inset-0 bg-charcoal-800/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                      {i !== 0 && (
                        <button type="button" title="Definir como capa"
                          onClick={() => setFotos(prev => [prev[i], ...prev.filter((_, idx) => idx !== i)])}
                          className="p-1 bg-amber-400 rounded-sm text-white hover:bg-amber-500">
                          <Star size={12} />
                        </button>
                      )}
                      <button type="button" title="Remover"
                        onClick={async () => {
                          setFotos(prev => prev.filter((_, idx) => idx !== i));
                          try { await deleteProdutoMidia(url); } catch {}
                        }}
                        className="p-1 bg-red-500 rounded-sm text-white hover:bg-red-600">
                        <X size={12} />
                      </button>
                    </div>
                    {/* Cover badge */}
                    {i === 0 && (
                      <div className="absolute top-1 left-1 bg-amber-400 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-sm flex items-center gap-0.5">
                        <Star size={8} /> CAPA
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Vídeos ── */}
          <div>
            <p className="text-xs font-mono tracking-wider uppercase text-charcoal-500 flex items-center gap-1.5 mb-3">
              <Video size={12} /> Vídeos
            </p>

            {/* Add video URL */}
            <div className="flex gap-2 mb-3">
              <div className="flex-1 relative">
                <Link size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-400" />
                <input
                  type="url"
                  value={videoInput}
                  onChange={e => setVideoInput(e.target.value)}
                  placeholder="URL do YouTube, Vimeo ou vídeo direto..."
                  className="w-full pl-8 pr-3 py-2 border border-cream-300 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-forest-400"
                />
              </div>
              <button type="button"
                onClick={() => {
                  const url = videoInput.trim();
                  if (!url) return;
                  setVideos(prev => [...prev, url]);
                  setVideoInput('');
                }}
                className="px-3 py-2 text-xs font-medium bg-forest-600 text-white hover:bg-forest-700 rounded-sm transition-colors">
                Adicionar
              </button>
            </div>

            {videos.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-16 border-2 border-dashed border-cream-300 rounded-sm text-charcoal-400 text-xs gap-1">
                Nenhum vídeo adicionado
              </div>
            ) : (
              <div className="space-y-2">
                {videos.map((url, i) => {
                  const type = videoType(url);
                  return (
                    <div key={i} className="flex items-center gap-2 p-2.5 bg-cream-50 border border-cream-200 rounded-sm">
                      <Video size={14} className="text-charcoal-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-charcoal-600 truncate">{url}</p>
                        <p className="text-[10px] text-charcoal-400 capitalize">{type}</p>
                      </div>
                      <button type="button" onClick={() => setVideos(prev => prev.filter((_, idx) => idx !== i))}
                        className="p-1 text-charcoal-400 hover:text-red-500 rounded-sm transition-colors flex-shrink-0">
                        <X size={12} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex gap-3 justify-end pt-3 border-t border-cream-200">
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button variant="primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Salvando...' : (produto ? 'Salvar alterações' : 'Criar produto')}
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MODAL: BULK EDIT
// ─────────────────────────────────────────────────────────────────────────────
function BulkEditModal({ ids, produtos, categorias, onClose, onSave }: {
  ids: string[];
  produtos: Produto[];
  categorias: CategoriaProduto[];
  onClose: () => void;
  onSave: (ids: string[], patch: Partial<Produto>) => Promise<void>;
}) {
  const [campo, setCampo] = useState<string>(CAMPOS_BULK[0].key as string);
  const [valor, setValor] = useState('');
  const [saving, setSaving] = useState(false);

  const campoCfg = CAMPOS_BULK.find(c => c.key === campo)!;
  const nomes = ids.map(id => produtos.find(p => p.id === id)?.nome).filter(Boolean);

  async function handleSave() {
    if (!valor && campoCfg.tipo !== 'boolean') return;
    setSaving(true);
    let patch: Partial<Produto> = {};
    if (campoCfg.tipo === 'number') patch = { [campo]: parseFloat(valor) || 0 } as any;
    else if (campoCfg.tipo === 'boolean') patch = { [campo]: valor === 'true' } as any;
    else patch = { [campo]: valor } as any;
    try { await onSave(ids, patch); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-charcoal-700/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-sm shadow-2xl w-full max-w-md border border-cream-200">
        <div className="flex items-center justify-between px-6 py-5 border-b border-cream-200 bg-cream-50">
          <div>
            <p className="font-mono text-[9px] tracking-[0.3em] uppercase text-charcoal-400">Edição em massa</p>
            <h2 className="font-editorial text-lg text-charcoal-700">{ids.length} produto(s) selecionado(s)</h2>
          </div>
          <button onClick={onClose} className="text-charcoal-400 hover:text-charcoal-700 text-lg leading-none">×</button>
        </div>

        <div className="p-6 space-y-5">
          {/* Lista resumida */}
          <div className="p-3 bg-cream-50 rounded-sm text-xs text-charcoal-500 max-h-20 overflow-y-auto">
            {nomes.join(', ')}
          </div>

          {/* Campo a editar */}
          <div>
            <label className="block text-xs font-medium text-charcoal-500 uppercase tracking-wider mb-1.5">Campo a alterar</label>
            <select value={campo} onChange={e => { setCampo(e.target.value); setValor(''); }}
              className="w-full px-3 py-2.5 border border-cream-300 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-forest-400">
              {CAMPOS_BULK.map(c => (
                <option key={c.key as string} value={c.key as string}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Valor */}
          <div>
            <label className="block text-xs font-medium text-charcoal-500 uppercase tracking-wider mb-1.5">Novo valor</label>
            {campoCfg.tipo === 'boolean' ? (
              <select value={valor} onChange={e => setValor(e.target.value)}
                className="w-full px-3 py-2.5 border border-cream-300 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-forest-400">
                <option value="">Selecione…</option>
                <option value="true">Sim</option>
                <option value="false">Não</option>
              </select>
            ) : (
              <input type={campoCfg.tipo === 'number' ? 'number' : 'text'}
                value={valor} onChange={e => setValor(e.target.value)}
                placeholder={`Novo valor para ${campoCfg.label}…`}
                className="w-full px-3 py-2.5 border border-cream-300 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-forest-400" />
            )}
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-sm text-xs text-amber-700">
            <strong>Atenção:</strong> Este valor será aplicado a todos os {ids.length} produtos selecionados.
          </div>

          <div className="flex gap-3 justify-end pt-2 border-t border-cream-200">
            <Button variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button variant="primary" onClick={handleSave} disabled={saving || (!valor && campoCfg.tipo !== 'boolean')}>
              {saving ? 'Aplicando...' : `Aplicar em ${ids.length} produto(s)`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ESTOQUE TAB
// ─────────────────────────────────────────────────────────────────────────────
interface EstoqueTabProps {
  metricas: ProdutoMetricas[];
  onReload: () => void;
  onAjustar: (p: Produto) => void;
  onRegistrarEntrada: () => void;
  onPlanejamento: () => void;
  onVerDetalhe: (m: ProdutoMetricas) => void;
  filter: StatusEstoque | 'todos';
  onFilterChange: (f: StatusEstoque | 'todos') => void;
  onUpdateEstoque: (id: string, est: number) => void;
  onUpdateMinimo: (id: string, min: number) => void;
}

function EstoqueTab({
  metricas, onReload, onAjustar, onRegistrarEntrada, onPlanejamento, onVerDetalhe,
  filter, onFilterChange, onUpdateEstoque, onUpdateMinimo,
}: EstoqueTabProps) {
  const [editingMinimo, setEditingMinimo] = useState<string | null>(null);
  const [minimoVal, setMinimoVal] = useState('');
  const [savingMinimo, setSavingMinimo] = useState(false);

  // Seleção bulk no estoque
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkAjusteModal, setBulkAjusteModal] = useState(false);

  const visible = filter === 'todos' ? metricas : metricas.filter(p => p.status === filter);
  const allSelected = visible.length > 0 && visible.every(p => selected.has(p.id));
  const someSelected = visible.some(p => selected.has(p.id));
  const selectedInView = visible.filter(p => selected.has(p.id));

  function toggleOne(id: string) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleAll() {
    if (allSelected) setSelected(prev => { const n = new Set(prev); visible.forEach(p => n.delete(p.id)); return n; });
    else setSelected(prev => new Set([...prev, ...visible.map(p => p.id)]));
  }

  const counts = {
    critico: metricas.filter(p => p.status === 'critico').length,
    baixo:   metricas.filter(p => p.status === 'baixo').length,
    ok:      metricas.filter(p => p.status === 'ok').length,
    acima:   metricas.filter(p => p.status === 'acima').length,
  };

  const precisamRepor = metricas.filter(p => p.sugestao > 0);
  const coberturaMedia = metricas.filter(p => p.diasRestantes !== null);
  const mediaDias = coberturaMedia.length
    ? Math.round(coberturaMedia.reduce((a, p) => a + (p.diasRestantes ?? 0), 0) / coberturaMedia.length)
    : null;

  async function saveMinimo(id: string) {
    const val = parseInt(minimoVal);
    if (isNaN(val) || val < 0) return;
    setSavingMinimo(true);
    try {
      await updateProduto(id, { estoqueMinimo: val });
      onUpdateMinimo(id, val);
      setEditingMinimo(null);
    } finally { setSavingMinimo(false); }
  }

  return (
    <div className="space-y-4">
      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {([
          ['critico', 'Crítico',         counts.critico, 'bg-red-50 border-red-100 hover:border-red-300',    'text-red-600',    'Abaixo do mínimo'],
          ['baixo',   'Baixo',           counts.baixo,   'bg-amber-50 border-amber-100 hover:border-amber-300', 'text-amber-600', 'Perto do mínimo'],
          ['ok',      'Saudável',        counts.ok,      'bg-forest-50 border-forest-100 hover:border-forest-300', 'text-forest-600', 'Dentro do ideal'],
          ['acima',   'Acima',           counts.acima,   'bg-blue-50 border-blue-100 hover:border-blue-300',  'text-blue-600',   'Estoque alto'],
        ] as const).map(([st, label, count, cls, textCls, sub]) => (
          <div key={st} className={`border rounded-sm p-4 cursor-pointer transition-colors ${cls} ${filter === st ? 'ring-2 ring-offset-1 ring-charcoal-400' : ''}`}
            onClick={() => onFilterChange(filter === st ? 'todos' : st)}>
            <p className={`text-xs font-mono uppercase tracking-wider mb-1 ${textCls}`}>{label}</p>
            <p className={`text-3xl font-light ${textCls}`}>{count}</p>
            <p className={`text-xs mt-1 opacity-70 ${textCls}`}>{sub}</p>
          </div>
        ))}
        <div className="bg-white border border-charcoal-100 rounded-sm p-4">
          <p className="text-xs font-mono text-charcoal-400 uppercase tracking-wider mb-1">Cobertura Média</p>
          <p className="text-3xl font-light text-charcoal-700">{mediaDias ?? '—'}</p>
          <p className="text-xs text-charcoal-400 mt-1">dias de estoque</p>
        </div>
      </div>

      {/* Alerta de reposição */}
      {precisamRepor.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ShoppingCart size={16} className="text-amber-600" />
              <p className="text-sm font-medium text-charcoal-700">{precisamRepor.length} produto(s) precisam de reposição</p>
            </div>
            <button onClick={onPlanejamento} className="flex items-center gap-1.5 text-xs font-medium text-amber-700 hover:text-amber-800 border border-amber-300 bg-white px-3 py-1.5 rounded-sm transition-colors">
              <Printer size={12} /> Planejar compras
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {precisamRepor.slice(0, 5).map(p => (
              <span key={p.id} className="flex items-center gap-1 px-2 py-1 bg-white border border-amber-200 rounded-sm text-xs text-charcoal-600">
                <span className="font-mono text-amber-600">{p.sku}</span>
                <span>+{p.sugestao} un</span>
              </span>
            ))}
            {precisamRepor.length > 5 && <span className="px-2 py-1 text-xs text-charcoal-400">+{precisamRepor.length - 5} mais</span>}
          </div>
        </div>
      )}

      {/* Tabela */}
      <Card padding={false}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-cream-100 flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            {(['todos', 'critico', 'baixo', 'ok', 'acima'] as const).map(f => (
              <button key={f} onClick={() => onFilterChange(f)}
                className={`px-3 py-1.5 text-xs font-medium rounded-sm transition-colors capitalize ${filter === f ? 'bg-charcoal-700 text-cream-100' : 'text-charcoal-500 hover:bg-cream-100'}`}>
                {f === 'todos' ? `Todos (${metricas.length})` : `${STATUS_CONFIG[f].label} (${counts[f]})`}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onReload} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-charcoal-500 hover:text-charcoal-700 hover:bg-cream-100 rounded-sm transition-colors">
              <RefreshCw size={12} /> Atualizar
            </button>
            <button onClick={onRegistrarEntrada} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-forest-600 bg-forest-50 hover:bg-forest-100 rounded-sm transition-colors">
              <ArrowDown size={12} /> Registrar Entrada
            </button>
          </div>
        </div>

        {/* Barra de bulk estoque */}
        {someSelected && selectedInView.length > 0 && (
          <div className="flex items-center gap-3 px-4 py-2.5 bg-blue-50 border-b border-blue-100 flex-wrap">
            <CheckSquare size={15} className="text-blue-600" />
            <span className="text-sm font-medium text-blue-700">{selectedInView.length} selecionado(s)</span>
            <button onClick={() => setBulkAjusteModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-white border border-blue-200 hover:bg-blue-50 rounded-sm transition-colors">
              <BarChart2 size={12} /> Ajuste em massa
            </button>
            <button onClick={() => setSelected(new Set())} className="ml-auto text-xs text-charcoal-400 hover:text-charcoal-600">Limpar</button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-cream-100">
                <th className="table-th w-10">
                  <input type="checkbox" checked={allSelected}
                    ref={el => { if (el) el.indeterminate = someSelected && !allSelected; }}
                    onChange={toggleAll} className="rounded-sm border-charcoal-300 text-forest-500" />
                </th>
                <th className="table-th">Produto</th>
                <th className="table-th text-center">Status</th>
                <th className="table-th">Estoque atual</th>
                <th className="table-th">Mínimo</th>
                <th className="table-th text-center">Vendas/mês</th>
                <th className="table-th text-center">Dias restantes</th>
                <th className="table-th text-center">Repor</th>
                <th className="table-th">Ações</th>
              </tr>
            </thead>
            <tbody>
              {visible.map(p => {
                const sc = STATUS_CONFIG[p.status];
                const pct = Math.min((p.estoque / Math.max(p.estoqueMinimo * 5, 1)) * 100, 100);
                const isEditingMin = editingMinimo === p.id;
                return (
                  <tr key={p.id} className={`border-t border-cream-100 hover:bg-cream-50/50 transition-colors cursor-pointer ${selected.has(p.id) ? 'bg-blue-50/30' : ''}`}
                    onClick={() => onVerDetalhe(p)}>
                    <td className="table-td w-10" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleOne(p.id)}
                        className="rounded-sm border-charcoal-300 text-forest-500" />
                    </td>
                    <td className="table-td">
                      <div>
                        <p className="font-medium text-charcoal-700 text-sm">{p.nome}</p>
                        <p className="text-xs font-mono text-charcoal-400">{p.sku}</p>
                      </div>
                    </td>
                    <td className="table-td text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${sc.bg} ${sc.color}`}>
                        {p.status === 'critico' && <AlertTriangle size={10} />}
                        {p.status === 'baixo' && <TrendingDown size={10} />}
                        {p.status === 'ok' && <TrendingUp size={10} />}
                        {sc.label}
                      </span>
                    </td>
                    <td className="table-td">
                      <div className="space-y-1.5">
                        <div className="flex items-baseline gap-1">
                          <span className={`text-lg font-semibold ${p.estoque <= p.estoqueMinimo ? 'text-red-600' : 'text-charcoal-700'}`}>{p.estoque}</span>
                          <span className="text-xs text-charcoal-400">un</span>
                        </div>
                        <div className="w-28 h-1.5 bg-cream-200 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${sc.bar}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="table-td" onClick={e => e.stopPropagation()}>
                      {isEditingMin ? (
                        <div className="flex items-center gap-1">
                          <input type="number" min="0" value={minimoVal}
                            onChange={e => setMinimoVal(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') saveMinimo(p.id); if (e.key === 'Escape') setEditingMinimo(null); }}
                            className="w-16 px-2 py-1 text-xs border border-forest-300 rounded-sm focus:outline-none" autoFocus />
                          <button onClick={() => saveMinimo(p.id)} disabled={savingMinimo} className="p-1 text-forest-600 hover:bg-forest-50 rounded-sm text-xs">✓</button>
                          <button onClick={() => setEditingMinimo(null)} className="p-1 text-charcoal-400 text-xs">✕</button>
                        </div>
                      ) : (
                        <button onClick={() => { setEditingMinimo(p.id); setMinimoVal(String(p.estoqueMinimo)); }}
                          className="flex items-center gap-1 text-sm text-charcoal-600 hover:text-forest-600 group">
                          {p.estoqueMinimo}
                          <span className="text-[10px] text-charcoal-300 group-hover:text-forest-400 opacity-0 group-hover:opacity-100 transition-opacity">editar</span>
                        </button>
                      )}
                    </td>
                    <td className="table-td text-center">
                      {p.vendas30d > 0 ? (
                        <div><p className="text-sm font-medium text-charcoal-700">{p.vendas30d}</p><p className="text-xs text-charcoal-400">un/mês</p></div>
                      ) : <span className="text-xs text-charcoal-300">—</span>}
                    </td>
                    <td className="table-td text-center">
                      {p.diasRestantes !== null ? (
                        <div><p className={`text-sm font-medium ${diasCor(p.diasRestantes)}`}>{p.diasRestantes}</p><p className="text-xs text-charcoal-400">dias</p></div>
                      ) : <span className="text-xs text-charcoal-300">sem dados</span>}
                    </td>
                    <td className="table-td text-center">
                      {p.sugestao > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 text-xs font-medium rounded-sm">
                          <ArrowUp size={10} /> +{p.sugestao} un
                        </span>
                      ) : <span className="text-xs text-charcoal-300">—</span>}
                    </td>
                    <td className="table-td" onClick={e => e.stopPropagation()}>
                      <button onClick={() => onAjustar(p)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-charcoal-600 bg-cream-100 hover:bg-cream-200 rounded-sm transition-colors">
                        <BarChart2 size={11} /> Ajustar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Bulk ajuste estoque */}
      {bulkAjusteModal && (
        <BulkAjusteEstoqueModal
          produtos={selectedInView}
          onClose={() => setBulkAjusteModal(false)}
          onSave={async (ajustes) => {
            await Promise.all(ajustes.map(({ id, novoEstoque, atual, tipo, obs }) =>
              updateEstoque(id, novoEstoque, atual, tipo, obs)
            ));
            ajustes.forEach(({ id, novoEstoque }) => onUpdateEstoque(id, novoEstoque));
            setSelected(new Set());
            setBulkAjusteModal(false);
          }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MODAL: BULK AJUSTE DE ESTOQUE
// ─────────────────────────────────────────────────────────────────────────────
function BulkAjusteEstoqueModal({ produtos, onClose, onSave }: {
  produtos: ProdutoMetricas[];
  onClose: () => void;
  onSave: (ajustes: { id: string; novoEstoque: number; atual: number; tipo: 'entrada' | 'saida' | 'ajuste'; obs?: string }[]) => Promise<void>;
}) {
  type TipoAjuste = 'entrada' | 'saida' | 'ajuste';
  const [modo, setModo] = useState<TipoAjuste>('entrada');
  const [qtys, setQtys] = useState<Record<string, string>>({});
  const [obs, setObs] = useState('');
  const [saving, setSaving] = useState(false);

  const ajustes = produtos.map(p => {
    const qty = parseInt(qtys[p.id] ?? '0') || 0;
    const novoEstoque = modo === 'entrada' ? p.estoque + qty
      : modo === 'saida' ? Math.max(0, p.estoque - qty)
      : qty;
    return { id: p.id, atual: p.estoque, novoEstoque, tipo: modo, obs: obs || undefined };
  }).filter(a => a.novoEstoque !== a.atual || modo === 'ajuste');

  async function handleSave() {
    setSaving(true);
    try { await onSave(ajustes); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-charcoal-700/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-sm shadow-2xl w-full max-w-lg border border-cream-200">
        <div className="flex items-center justify-between px-6 py-5 border-b border-cream-200 bg-cream-50">
          <div>
            <p className="font-mono text-[9px] tracking-[0.3em] uppercase text-charcoal-400">Ajuste de estoque</p>
            <h2 className="font-editorial text-lg text-charcoal-700">{produtos.length} produto(s) selecionado(s)</h2>
          </div>
          <button onClick={onClose} className="text-charcoal-400 hover:text-charcoal-700 text-lg">×</button>
        </div>

        <div className="p-6 space-y-4">
          {/* Tipo de ajuste */}
          <div>
            <p className="text-xs font-medium text-charcoal-500 mb-2">Tipo de ajuste</p>
            <div className="grid grid-cols-3 gap-2">
              {([['entrada', 'Entrada', '+'], ['saida', 'Saída', '−'], ['ajuste', 'Definir', '=']] as const).map(([m, label, icon]) => (
                <button key={m} onClick={() => setModo(m)}
                  className={`py-2 text-xs font-medium rounded-sm border transition-colors ${modo === m ? 'bg-charcoal-700 text-cream-100 border-charcoal-700' : 'border-charcoal-200 text-charcoal-600 hover:bg-cream-100'}`}>
                  <span className="text-sm mr-1">{icon}</span>{label}
                </button>
              ))}
            </div>
          </div>

          {/* Qtds por produto */}
          <div className="max-h-56 overflow-y-auto space-y-2 border border-cream-200 rounded-sm p-3">
            {produtos.map(p => (
              <div key={p.id} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-charcoal-700 truncate">{p.nome}</p>
                  <p className="text-xs text-charcoal-400 font-mono">atual: {p.estoque} un</p>
                </div>
                <input type="number" min="0" placeholder="0" value={qtys[p.id] ?? ''}
                  onChange={e => setQtys(prev => ({ ...prev, [p.id]: e.target.value }))}
                  className="w-20 px-2 py-1.5 text-sm text-center border border-charcoal-200 rounded-sm focus:outline-none focus:ring-1 focus:ring-forest-400" />
                <span className="text-xs text-charcoal-400 w-6">un</span>
              </div>
            ))}
          </div>

          <div>
            <label className="block text-xs font-medium text-charcoal-500 uppercase tracking-wider mb-1.5">Observação</label>
            <input type="text" value={obs} onChange={e => setObs(e.target.value)}
              placeholder="Motivo do ajuste (opcional)"
              className="w-full px-3 py-2 border border-cream-300 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-forest-400" />
          </div>

          <div className="flex gap-3 justify-end pt-2 border-t border-cream-200">
            <Button variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button variant="primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Aplicando...' : 'Confirmar ajuste'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: RELATÓRIOS DE ESTOQUE
// ─────────────────────────────────────────────────────────────────────────────
function RelatoriosTab({ metricas, relatorioTab, onTabChange }: {
  metricas: ProdutoMetricas[];
  relatorioTab: 'movimentacoes' | 'gestao';
  onTabChange: (t: 'movimentacoes' | 'gestao') => void;
}) {
  const [movs, setMovs] = useState<any[]>([]);
  const [loadingMovs, setLoadingMovs] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroInicio, setFiltroInicio] = useState('');
  const [filtroFim, setFiltroFim] = useState('');

  const carregarMovs = useCallback(async () => {
    setLoadingMovs(true);
    try {
      const { getMovimentacoesGeral } = await import('../../services/produtos.service');
      const data = await getMovimentacoesGeral(
        filtroInicio || undefined,
        filtroFim || undefined,
        filtroTipo as any || undefined,
        300,
      );
      setMovs(data);
    } catch { setMovs([]); }
    finally { setLoadingMovs(false); }
  }, [filtroInicio, filtroFim, filtroTipo]);

  useEffect(() => {
    if (relatorioTab === 'movimentacoes') carregarMovs();
  }, [relatorioTab, carregarMovs]);

  // Gestão: indicadores gerenciais
  const totalEstoque = metricas.reduce((a, p) => a + p.estoque, 0);
  const valorEstoque = metricas.reduce((a, p) => a + p.estoque * p.preco, 0);
  const produtosSemVenda = metricas.filter(p => p.vendas30d === 0).length;
  const giroMedio = metricas.filter(p => p.velocidadeDia > 0).reduce((a, p, _, arr) => a + p.velocidadeDia / arr.length, 0);

  const TIPO_COR: Record<string, string> = {
    entrada: 'text-forest-600', saida: 'text-red-600', ajuste: 'text-blue-600',
    inventario: 'text-purple-600', perda: 'text-amber-600', venda: 'text-charcoal-500',
  };

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex gap-1 border-b border-cream-200">
        {(['movimentacoes', 'gestao'] as const).map(t => (
          <button key={t} onClick={() => onTabChange(t)}
            className={`px-5 py-3 text-xs font-mono tracking-[0.25em] uppercase border-b-2 -mb-px transition-colors ${
              relatorioTab === t ? 'border-forest-500 text-forest-700' : 'border-transparent text-charcoal-400 hover:text-charcoal-600'
            }`}>
            {t === 'movimentacoes' ? 'Histórico de movimentações' : 'Relatório gerencial'}
          </button>
        ))}
      </div>

      {relatorioTab === 'movimentacoes' && (
        <Card padding={false}>
          {/* Filtros */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-cream-100 flex-wrap">
            <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
              className="px-3 py-1.5 border border-cream-300 rounded-sm text-xs text-charcoal-600 focus:outline-none">
              <option value="">Todos os tipos</option>
              {['entrada', 'saida', 'ajuste', 'inventario', 'perda', 'venda'].map(t => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
            <input type="date" value={filtroInicio} onChange={e => setFiltroInicio(e.target.value)}
              className="px-3 py-1.5 border border-cream-300 rounded-sm text-xs text-charcoal-600 focus:outline-none" />
            <span className="text-xs text-charcoal-400">até</span>
            <input type="date" value={filtroFim} onChange={e => setFiltroFim(e.target.value)}
              className="px-3 py-1.5 border border-cream-300 rounded-sm text-xs text-charcoal-600 focus:outline-none" />
            <button onClick={carregarMovs} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-forest-600 bg-forest-50 hover:bg-forest-100 rounded-sm transition-colors">
              <RefreshCw size={11} /> Filtrar
            </button>
            <span className="ml-auto text-xs text-charcoal-400">{movs.length} registro(s)</span>
          </div>

          {loadingMovs ? (
            <div className="flex justify-center py-10"><RefreshCw size={20} className="animate-spin text-charcoal-400" /></div>
          ) : movs.length === 0 ? (
            <div className="text-center py-10 text-charcoal-400 text-sm">Nenhuma movimentação no período.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-cream-50 border-b border-cream-100">
                  <tr>
                    <th className="table-th">Data</th>
                    <th className="table-th">Produto</th>
                    <th className="table-th">SKU</th>
                    <th className="table-th text-center">Tipo</th>
                    <th className="table-th text-center">Qtd</th>
                    <th className="table-th text-center">Antes</th>
                    <th className="table-th text-center">Depois</th>
                    <th className="table-th">Observação</th>
                  </tr>
                </thead>
                <tbody>
                  {movs.map(m => (
                    <tr key={m.id} className="border-t border-cream-100 hover:bg-cream-50 transition-colors">
                      <td className="table-td text-xs text-charcoal-500 font-mono whitespace-nowrap">
                        {new Date(m.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="table-td font-medium text-charcoal-700">{m.produtoNome ?? '—'}</td>
                      <td className="table-td text-xs text-charcoal-400 font-mono">{m.produtoSku ?? '—'}</td>
                      <td className="table-td text-center">
                        <span className={`text-xs font-medium capitalize ${TIPO_COR[m.tipo] ?? 'text-charcoal-500'}`}>{m.tipo}</span>
                      </td>
                      <td className="table-td text-center font-medium text-charcoal-700">{m.quantidade}</td>
                      <td className="table-td text-center text-charcoal-500">{m.estoqueAntes}</td>
                      <td className="table-td text-center">
                        <span className={m.estoqueDepois > m.estoqueAntes ? 'text-forest-600 font-medium' : m.estoqueDepois < m.estoqueAntes ? 'text-red-600 font-medium' : 'text-charcoal-500'}>
                          {m.estoqueDepois}
                        </span>
                      </td>
                      <td className="table-td text-xs text-charcoal-400">{m.observacao ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {relatorioTab === 'gestao' && (
        <div className="space-y-5">
          {/* KPIs gerenciais */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white border border-cream-200 rounded-sm p-5">
              <p className="font-mono text-[9px] tracking-[0.3em] uppercase text-charcoal-400 mb-2">Total em estoque</p>
              <p className="text-3xl font-light text-charcoal-700">{totalEstoque.toLocaleString('pt-BR')}</p>
              <p className="text-xs text-charcoal-400 mt-1">unidades</p>
            </div>
            <div className="bg-white border border-cream-200 rounded-sm p-5">
              <p className="font-mono text-[9px] tracking-[0.3em] uppercase text-charcoal-400 mb-2">Valor do estoque</p>
              <p className="text-2xl font-light text-charcoal-700">
                R$ {valorEstoque.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </p>
              <p className="text-xs text-charcoal-400 mt-1">preço de venda</p>
            </div>
            <div className="bg-white border border-cream-200 rounded-sm p-5">
              <p className="font-mono text-[9px] tracking-[0.3em] uppercase text-charcoal-400 mb-2">Sem venda (30d)</p>
              <p className="text-3xl font-light text-amber-600">{produtosSemVenda}</p>
              <p className="text-xs text-charcoal-400 mt-1">produtos parados</p>
            </div>
            <div className="bg-white border border-cream-200 rounded-sm p-5">
              <p className="font-mono text-[9px] tracking-[0.3em] uppercase text-charcoal-400 mb-2">Giro médio</p>
              <p className="text-3xl font-light text-charcoal-700">{giroMedio.toFixed(2)}</p>
              <p className="text-xs text-charcoal-400 mt-1">un/dia por produto</p>
            </div>
          </div>

          {/* Ranking de velocidade */}
          <Card padding={false}>
            <div className="px-5 py-4 border-b border-cream-100">
              <h3 className="font-editorial text-base text-charcoal-700">Ranking de velocidade de venda</h3>
              <p className="text-xs text-charcoal-400 mt-0.5">Últimos 30 dias · ordenado por unidades vendidas</p>
            </div>
            <div className="divide-y divide-cream-100">
              {[...metricas].sort((a, b) => b.vendas30d - a.vendas30d).map((p, i) => {
                const maxVendas = metricas.reduce((a, m) => Math.max(a, m.vendas30d), 1);
                return (
                  <div key={p.id} className="flex items-center gap-4 px-5 py-3">
                    <span className="w-6 text-xs font-mono text-charcoal-400">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-charcoal-700 truncate">{p.nome}</p>
                      <div className="w-full h-1.5 bg-cream-100 rounded-full mt-1">
                        <div className="h-full rounded-full bg-forest-400 transition-all"
                          style={{ width: `${(p.vendas30d / maxVendas) * 100}%` }} />
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-charcoal-700">{p.vendas30d} un</p>
                      <p className="text-xs text-charcoal-400">{p.velocidadeDia.toFixed(1)}/dia</p>
                    </div>
                    <div className="text-right shrink-0 w-20">
                      <p className={`text-xs font-medium ${diasCor(p.diasRestantes)}`}>
                        {p.diasRestantes !== null ? `${p.diasRestantes}d` : '∞'}
                      </p>
                      <p className="text-xs text-charcoal-400">restantes</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MODAL: AJUSTE DE ESTOQUE INDIVIDUAL
// ─────────────────────────────────────────────────────────────────────────────
type TipoAjuste = 'entrada' | 'saida' | 'ajuste' | 'inventario' | 'perda';

function AjusteModal({ produto, onClose, onSave }: {
  produto: Produto;
  onClose: () => void;
  onSave: (id: string, novoEstoque: number, estoqueAtual: number, tipo: TipoAjuste, obs?: string) => Promise<void>;
}) {
  const [modo, setModo] = useState<'set' | 'add' | 'remove'>('add');
  const [tipo, setTipo] = useState<TipoAjuste>('entrada');
  const [valor, setValor] = useState('');
  const [obs, setObs] = useState('');
  const [saving, setSaving] = useState(false);

  const novoEstoque = () => {
    const v = parseInt(valor) || 0;
    if (modo === 'set') return Math.max(0, v);
    if (modo === 'add') return produto.estoque + v;
    return Math.max(0, produto.estoque - v);
  };

  // Auto-selecionar tipo baseado no modo
  useEffect(() => {
    if (modo === 'add') setTipo('entrada');
    else if (modo === 'remove') setTipo('saida');
    else setTipo('inventario');
  }, [modo]);

  async function handleSave() {
    if (!valor) return;
    setSaving(true);
    try { await onSave(produto.id, novoEstoque(), produto.estoque, tipo, obs || undefined); }
    finally { setSaving(false); }
  }

  const preview = novoEstoque();
  const diff = preview - produto.estoque;

  return (
    <Modal open onClose={onClose} title="Ajustar Estoque" size="sm">
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-3 bg-cream-50 rounded-sm">
          <Package size={16} className="text-earth-400 shrink-0" />
          <div>
            <p className="text-sm font-medium text-charcoal-700">{produto.nome}</p>
            <p className="text-xs font-mono text-charcoal-400">{produto.sku} · Estoque atual: <strong className="text-charcoal-700">{produto.estoque} un</strong></p>
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-charcoal-500 mb-2">Operação</p>
          <div className="grid grid-cols-3 gap-2">
            {([['add', 'Adicionar', '+'], ['remove', 'Remover', '−'], ['set', 'Definir', '=']] as const).map(([m, label, icon]) => (
              <button key={m} onClick={() => setModo(m)}
                className={`py-2 text-xs font-medium rounded-sm border transition-colors ${modo === m ? 'bg-charcoal-700 text-cream-100 border-charcoal-700' : 'border-charcoal-200 text-charcoal-600 hover:bg-cream-100'}`}>
                <span className="text-sm mr-1">{icon}</span>{label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-charcoal-500 mb-2">Tipo de movimentação</p>
          <div className="grid grid-cols-3 gap-2">
            {(modo === 'add'
              ? [['entrada', 'Entrada'], ['inventario', 'Inventário']] as const
              : modo === 'remove'
              ? [['saida', 'Saída'], ['perda', 'Perda'], ['inventario', 'Inventário']] as const
              : [['inventario', 'Inventário'], ['ajuste', 'Ajuste']] as const
            ).map(([t, label]) => (
              <button key={t} onClick={() => setTipo(t as TipoAjuste)}
                className={`py-1.5 text-xs rounded-sm border transition-colors ${tipo === t ? 'bg-earth-100 text-earth-700 border-earth-300' : 'border-charcoal-200 text-charcoal-500 hover:bg-cream-100'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-charcoal-500 mb-1 block">
            {modo === 'set' ? 'Novo valor total' : modo === 'add' ? 'Quantidade a adicionar' : 'Quantidade a remover'}
          </label>
          <input type="number" min="0" value={valor} onChange={e => setValor(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            placeholder="0" autoFocus
            className="w-full px-3 py-2 border border-charcoal-200 rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-forest-400" />
        </div>

        <div>
          <label className="text-xs font-medium text-charcoal-500 mb-1 block">Observação</label>
          <input type="text" value={obs} onChange={e => setObs(e.target.value)}
            placeholder="Motivo, NF, fornecedor…"
            className="w-full px-3 py-2 border border-charcoal-200 rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-forest-400" />
        </div>

        {valor !== '' && (
          <div className={`flex items-center gap-2 p-3 rounded-sm text-sm ${diff > 0 ? 'bg-forest-50 text-forest-700' : diff < 0 ? 'bg-red-50 text-red-700' : 'bg-cream-50 text-charcoal-600'}`}>
            {diff > 0 ? <ArrowUp size={14} /> : diff < 0 ? <ArrowDown size={14} /> : <Minus size={14} />}
            <span>Estoque ficará em <strong>{preview} unidades</strong> ({diff > 0 ? '+' : ''}{diff})</span>
          </div>
        )}

        <div className="flex gap-3 justify-end pt-2 border-t border-cream-200">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={handleSave} disabled={!valor || saving}>
            {saving ? 'Salvando...' : 'Confirmar ajuste'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MODAL: REGISTRAR ENTRADA DE ESTOQUE
// ─────────────────────────────────────────────────────────────────────────────
function EntradaModal({ open, produtos, onClose, onSave }: {
  open: boolean;
  produtos: Produto[];
  onClose: () => void;
  onSave: (entradas: { id: string; qty: number; obs?: string }[]) => Promise<void>;
}) {
  const [qtys, setQtys] = useState<Record<string, string>>({});
  const [obs, setObs] = useState('');
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const filtered = produtos.filter(p => p.ativo && (
    search === '' || p.nome.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase())
  ));

  const entradas = Object.entries(qtys)
    .map(([id, q]) => ({ id, qty: parseInt(q) || 0 }))
    .filter(e => e.qty > 0)
    .map(e => ({ ...e, obs: obs || undefined }));

  async function handleSave() {
    if (!entradas.length) return;
    setSaving(true);
    try { await onSave(entradas); setQtys({}); setSearch(''); setObs(''); }
    finally { setSaving(false); }
  }

  return (
    <Modal open={open} onClose={onClose} title="Registrar Entrada de Estoque" size="lg">
      <div className="space-y-4">
        <p className="text-sm text-charcoal-500">Informe a quantidade recebida para cada produto.</p>

        <div className="flex gap-3">
          <input type="text" placeholder="Filtrar produto..." value={search} onChange={e => setSearch(e.target.value)}
            className="flex-1 px-3 py-2 border border-charcoal-200 rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-forest-400" />
          <input type="text" placeholder="NF / Fornecedor / Obs..." value={obs} onChange={e => setObs(e.target.value)}
            className="flex-1 px-3 py-2 border border-charcoal-200 rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-forest-400" />
        </div>

        <div className="max-h-72 overflow-y-auto divide-y divide-cream-100 border border-cream-200 rounded-sm">
          {filtered.map(p => (
            <div key={p.id} className="flex items-center gap-3 px-4 py-3 hover:bg-cream-50 transition-colors">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-charcoal-700 truncate">{p.nome}</p>
                <p className="text-xs text-charcoal-400 font-mono">{p.sku} · atual: {p.estoque} un</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-charcoal-400">+</span>
                <input type="number" min="0" placeholder="0" value={qtys[p.id] ?? ''}
                  onChange={e => setQtys(prev => ({ ...prev, [p.id]: e.target.value }))}
                  className={`w-20 px-2 py-1.5 text-sm text-center border rounded-sm focus:outline-none focus:ring-2 focus:ring-forest-400 transition-colors ${
                    qtys[p.id] && parseInt(qtys[p.id]) > 0 ? 'border-forest-400 bg-forest-50' : 'border-charcoal-200'
                  }`} />
                <span className="text-xs text-charcoal-400">un</span>
              </div>
            </div>
          ))}
        </div>

        {entradas.length > 0 && (
          <div className="p-3 bg-forest-50 border border-forest-100 rounded-sm">
            <p className="text-xs font-medium text-forest-700 mb-1">Resumo:</p>
            <div className="flex flex-wrap gap-2">
              {entradas.map(e => {
                const p = produtos.find(x => x.id === e.id);
                return <span key={e.id} className="text-xs px-2 py-0.5 bg-white border border-forest-200 rounded-sm text-charcoal-600">
                  <span className="font-mono text-forest-600">{p?.sku}</span> +{e.qty} un
                </span>;
              })}
            </div>
          </div>
        )}

        <div className="flex gap-3 justify-end pt-2 border-t border-cream-200">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={handleSave} disabled={!entradas.length || saving}>
            <ArrowDown size={14} />
            {saving ? 'Salvando...' : `Confirmar (${entradas.length} produto${entradas.length > 1 ? 's' : ''})`}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MODAL: PLANEJAMENTO DE COMPRAS
// ─────────────────────────────────────────────────────────────────────────────
function PlanejamentoModal({ open, metricas, onClose }: {
  open: boolean;
  metricas: ProdutoMetricas[];
  onClose: () => void;
}) {
  const [qtys, setQtys] = useState<Record<string, string>>({});
  const precisam = metricas.filter(p => p.status === 'critico' || p.status === 'baixo' || p.sugestao > 0);

  function getQty(id: string, sugestao: number) {
    return qtys[id] !== undefined ? parseInt(qtys[id]) || 0 : sugestao;
  }

  function handlePrint() {
    const linhas = precisam.map(p => {
      const qty = getQty(p.id, p.sugestao);
      return `${p.sku.padEnd(12)} ${p.nome.padEnd(32)} ${String(p.estoque).padStart(5)} un → pedir ${qty} un`;
    }).join('\n');
    const janela = window.open('', '_blank');
    janela?.document.write(`<pre style="font-family:monospace;padding:24px;font-size:13px">
PLANEJAMENTO DE COMPRAS — ${new Date().toLocaleDateString('pt-BR')}
${'─'.repeat(72)}
SKU          PRODUTO                           ESTOQUE   PEDIDO
${'─'.repeat(72)}
${linhas}
${'─'.repeat(72)}
TOTAL: ${precisam.reduce((a, p) => a + getQty(p.id, p.sugestao), 0)} unidades
</pre>`);
    janela?.print();
  }

  return (
    <Modal open={open} onClose={onClose} title="Planejamento de Compras" size="lg">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-charcoal-500">{precisam.length} produto(s) precisam de reposição.</p>
          <button onClick={handlePrint} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-charcoal-600 border border-charcoal-200 hover:bg-cream-100 rounded-sm transition-colors">
            <Printer size={12} /> Imprimir lista
          </button>
        </div>

        <div className="border border-cream-200 rounded-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-cream-50 border-b border-cream-200">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-mono text-charcoal-400 uppercase tracking-wider">Produto</th>
                <th className="px-4 py-2.5 text-center text-xs font-mono text-charcoal-400 uppercase tracking-wider">Atual</th>
                <th className="px-4 py-2.5 text-center text-xs font-mono text-charcoal-400 uppercase tracking-wider">Mín</th>
                <th className="px-4 py-2.5 text-center text-xs font-mono text-charcoal-400 uppercase tracking-wider">Vendas/mês</th>
                <th className="px-4 py-2.5 text-center text-xs font-mono text-charcoal-400 uppercase tracking-wider">Dias rest.</th>
                <th className="px-4 py-2.5 text-center text-xs font-mono text-charcoal-400 uppercase tracking-wider w-28">Pedir</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-100">
              {precisam.map(p => {
                const sc = STATUS_CONFIG[p.status];
                return (
                  <tr key={p.id} className="hover:bg-cream-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-charcoal-700">{p.nome}</p>
                      <p className="text-xs font-mono text-charcoal-400">{p.sku}</p>
                    </td>
                    <td className="px-4 py-3 text-center"><span className={`font-medium ${sc.color}`}>{p.estoque}</span></td>
                    <td className="px-4 py-3 text-center text-charcoal-500">{p.estoqueMinimo}</td>
                    <td className="px-4 py-3 text-center text-charcoal-500">{p.vendas30d || '—'}</td>
                    <td className={`px-4 py-3 text-center ${diasCor(p.diasRestantes)}`}>{p.diasRestantes ?? '—'}</td>
                    <td className="px-4 py-3">
                      <input type="number" min="0"
                        value={qtys[p.id] ?? p.sugestao}
                        onChange={e => setQtys(prev => ({ ...prev, [p.id]: e.target.value }))}
                        className="w-full px-2 py-1.5 text-sm text-center border border-charcoal-200 rounded-sm focus:outline-none focus:ring-2 focus:ring-forest-400" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-cream-50 border-t border-cream-200">
              <tr>
                <td colSpan={5} className="px-4 py-2.5 text-xs font-medium text-charcoal-500 text-right">Total a pedir:</td>
                <td className="px-4 py-2.5 text-center text-sm font-semibold text-charcoal-700">
                  {precisam.reduce((a, p) => a + getQty(p.id, p.sugestao), 0)} un
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="flex gap-3 justify-end pt-2 border-t border-cream-200">
          <Button variant="ghost" onClick={onClose}>Fechar</Button>
          <Button variant="primary" onClick={handlePrint}><Printer size={14} /> Imprimir / Exportar</Button>
        </div>
      </div>
    </Modal>
  );
}
