import React, { useEffect, useState } from 'react';
import { Plus, Edit, Package, AlertTriangle, Trash2, CheckSquare, EyeOff, Eye } from 'lucide-react';
import {
  Card, Badge, Button, Modal, Input, Select, Textarea,
  SectionHeader, SearchBar, FilterBar, StatCard, Tabs
} from '../../components/ui';
import { getProdutos, deleteProduto, updateProduto } from '../../services/produtos.service';
import type { Produto } from '../../types';

export function AdminProdutos() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [tab, setTab] = useState('catalogo');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [selectedProd, setSelectedProd] = useState<Produto | null>(null);

  // Seleção múltipla
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleteModal, setDeleteModal] = useState<{ ids: string[]; names: string[] } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    getProdutos().then(setProdutos).catch(console.error);
  }, []);

  const filtered = produtos.filter(p =>
    search === '' ||
    p.nome.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase())
  );

  const baixoEstoque = produtos.filter(p => p.estoque <= p.estoqueMinimo);

  // Seleção
  const allFilteredIds = filtered.map(p => p.id);
  const allSelected = allFilteredIds.length > 0 && allFilteredIds.every(id => selected.has(id));
  const someSelected = allFilteredIds.some(id => selected.has(id));

  function toggleOne(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (allSelected) {
      setSelected(prev => {
        const next = new Set(prev);
        allFilteredIds.forEach(id => next.delete(id));
        return next;
      });
    } else {
      setSelected(prev => new Set([...prev, ...allFilteredIds]));
    }
  }

  function clearSelection() {
    setSelected(new Set());
  }

  // Confirmar exclusão
  function confirmDelete(ids: string[]) {
    const names = ids.map(id => produtos.find(p => p.id === id)?.nome ?? id);
    setDeleteModal({ ids, names });
  }

  async function handleDelete() {
    if (!deleteModal) return;
    setDeleting(true);
    try {
      await Promise.all(deleteModal.ids.map(id => deleteProduto(id)));
      setProdutos(prev => prev.filter(p => !deleteModal.ids.includes(p.id)));
      setSelected(prev => {
        const next = new Set(prev);
        deleteModal.ids.forEach(id => next.delete(id));
        return next;
      });
      setDeleteModal(null);
    } catch (e) {
      console.error(e);
    } finally {
      setDeleting(false);
    }
  }

  // Toggle ativo/inativo — individual ou em lote
  async function handleToggleAtivo(ids: string[], ativo: boolean) {
    setTogglingId(ids[0]);
    try {
      await Promise.all(ids.map(id => updateProduto(id, { ativo })));
      setProdutos(prev => prev.map(p => ids.includes(p.id) ? { ...p, ativo } : p));
      clearSelection();
    } catch (e) {
      console.error(e);
    } finally {
      setTogglingId(null);
    }
  }

  const selectedInView = allFilteredIds.filter(id => selected.has(id));

  return (
    <div className="space-y-6 animate-fade-in">
      <SectionHeader
        title="Produtos"
        subtitle="Catálogo e controle de estoque"
        action={
          <Button variant="primary" size="sm" onClick={() => { setSelectedProd(null); setModal(true); }}>
            <Plus size={14} />
            Novo produto
          </Button>
        }
      />

      {baixoEstoque.length > 0 && (
        <div className="bg-gold-50 border border-gold-200 rounded-sm p-4 flex items-center gap-3">
          <AlertTriangle size={18} className="text-gold-500 shrink-0" />
          <div>
            <p className="text-sm font-medium text-charcoal-700">
              {baixoEstoque.length} produto(s) com estoque abaixo do mínimo
            </p>
            <p className="text-xs text-charcoal-500">
              {baixoEstoque.map(p => p.nome).join(', ')}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard title="Total de produtos" value={produtos.filter(p => p.ativo).length} color="forest" icon={<Package size={18} />} />
        <StatCard title="Estoque baixo" value={baixoEstoque.length} color="red" icon={<AlertTriangle size={18} />} />
        <StatCard title="Destaques" value={produtos.filter(p => p.destaque).length} color="gold" icon={<></>} />
        <StatCard title="Assinatura" value={produtos.filter(p => p.produtoAssinatura).length} color="earth" icon={<></>} subtitle="Disponíveis para clube" />
      </div>

      <Tabs
        tabs={[
          { id: 'catalogo', label: 'Catálogo', count: produtos.length },
          { id: 'estoque', label: 'Estoque' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'catalogo' && (
        <Card padding={false}>
          <FilterBar>
            <SearchBar value={search} onChange={setSearch} placeholder="Buscar produto ou SKU..." className="w-64" />
          </FilterBar>

          {/* Barra de ações em lote */}
          {someSelected && selectedInView.length > 0 && (
            <div className="flex items-center gap-3 px-4 py-2.5 bg-forest-50 border-b border-forest-100">
              <CheckSquare size={15} className="text-forest-600" />
              <span className="text-sm font-medium text-forest-700">
                {selectedInView.length} selecionado{selectedInView.length > 1 ? 's' : ''}
              </span>
              <div className="flex items-center gap-2 ml-2">
                <button
                  onClick={() => handleToggleAtivo(selectedInView, false)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-charcoal-600 bg-white hover:bg-cream-100 border border-charcoal-200 rounded-sm transition-colors"
                >
                  <EyeOff size={12} />
                  Desabilitar
                </button>
                <button
                  onClick={() => handleToggleAtivo(selectedInView, true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-forest-600 bg-forest-50 hover:bg-forest-100 rounded-sm transition-colors"
                >
                  <Eye size={12} />
                  Habilitar
                </button>
                <button
                  onClick={() => confirmDelete(selectedInView)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-sm transition-colors"
                >
                  <Trash2 size={12} />
                  Excluir
                </button>
              </div>
              <button
                onClick={clearSelection}
                className="ml-auto text-xs text-charcoal-400 hover:text-charcoal-600 transition-colors"
              >
                Limpar seleção
              </button>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-th w-10">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={el => { if (el) el.indeterminate = someSelected && !allSelected; }}
                      onChange={toggleAll}
                      className="rounded-sm border-charcoal-300 text-forest-500 focus:ring-forest-400"
                    />
                  </th>
                  <th className="table-th">SKU</th>
                  <th className="table-th">Produto</th>
                  <th className="table-th">Categoria</th>
                  <th className="table-th">Preço</th>
                  <th className="table-th">Estoque</th>
                  <th className="table-th">Torra</th>
                  <th className="table-th">Status</th>
                  <th className="table-th">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr
                    key={p.id}
                    className={`border-t border-cream-100 hover:bg-cream-50 transition-colors ${selected.has(p.id) ? 'bg-forest-50/40' : ''}`}
                  >
                    <td className="table-td w-10">
                      <input
                        type="checkbox"
                        checked={selected.has(p.id)}
                        onChange={() => toggleOne(p.id)}
                        className="rounded-sm border-charcoal-300 text-forest-500 focus:ring-forest-400"
                      />
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
                    <td className="table-td text-charcoal-500">
                      {p.produtoAssinatura && (
                        <span className="px-1.5 py-0.5 bg-forest-100 text-forest-600 text-xs rounded-full">Clube</span>
                      )}
                    </td>
                    <td className="table-td">
                      {p.precoPromocional ? (
                        <>
                          <p className="text-xs text-charcoal-400 line-through">R$ {p.preco.toFixed(2)}</p>
                          <p className="font-medium text-charcoal-700">R$ {p.precoPromocional.toFixed(2)}</p>
                        </>
                      ) : (
                        <p className="font-medium text-charcoal-700">R$ {p.preco.toFixed(2)}</p>
                      )}
                    </td>
                    <td className="table-td">
                      <span className={`font-medium ${p.estoque <= p.estoqueMinimo ? 'text-red-500' : 'text-charcoal-700'}`}>
                        {p.estoque}
                      </span>
                      <span className="text-xs text-charcoal-400"> un</span>
                    </td>
                    <td className="table-td text-charcoal-500">{p.torra}</td>
                    <td className="table-td">
                      <Badge variant={p.ativo ? 'active' : 'inactive'}>
                        {p.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </td>
                    <td className="table-td">
                      <div className="flex gap-1">
                        <button
                          onClick={() => { setSelectedProd(p); setModal(true); }}
                          className="p-1.5 text-charcoal-400 hover:text-forest-500 hover:bg-forest-50 rounded-sm transition-colors"
                          title="Editar"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => handleToggleAtivo([p.id], !p.ativo)}
                          disabled={togglingId === p.id}
                          className={`p-1.5 rounded-sm transition-colors ${
                            p.ativo
                              ? 'text-charcoal-400 hover:text-amber-500 hover:bg-amber-50'
                              : 'text-charcoal-400 hover:text-forest-500 hover:bg-forest-50'
                          }`}
                          title={p.ativo ? 'Desabilitar' : 'Habilitar'}
                        >
                          {p.ativo ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                        <button
                          onClick={() => confirmDelete([p.id])}
                          className="p-1.5 text-charcoal-400 hover:text-red-500 hover:bg-red-50 rounded-sm transition-colors"
                          title="Excluir"
                        >
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

      {tab === 'estoque' && (
        <Card>
          <h3 className="font-serif text-xl text-charcoal-700 mb-5">Controle de Estoque</h3>
          <div className="space-y-3">
            {produtos.map(p => (
              <div key={p.id} className="flex items-center gap-4 py-3 border-b border-cream-100">
                <div className="flex-1">
                  <p className="text-sm font-medium text-charcoal-700">{p.nome}</p>
                  <p className="text-xs text-charcoal-400">{p.sku}</p>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className={`text-sm font-medium ${p.estoque <= p.estoqueMinimo ? 'text-red-500' : 'text-charcoal-700'}`}>
                      {p.estoque} un
                    </p>
                    <p className="text-xs text-charcoal-400">Mín: {p.estoqueMinimo}</p>
                  </div>
                  <div className="w-24">
                    <div className="w-full bg-cream-200 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full ${p.estoque <= p.estoqueMinimo ? 'bg-red-400' : 'bg-forest-500'}`}
                        style={{ width: `${Math.min((p.estoque / (p.estoqueMinimo * 5)) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                  {p.estoque <= p.estoqueMinimo && (
                    <AlertTriangle size={16} className="text-red-400" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Modal de edição/criação */}
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={selectedProd ? 'Editar Produto' : 'Novo Produto'}
        size="xl"
      >
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Nome do produto" required defaultValue={selectedProd?.nome} />
            <Input label="SKU" required defaultValue={selectedProd?.sku} />
          </div>
          <Textarea label="Descrição" defaultValue={selectedProd?.descricao} rows={3} />
          <div className="grid grid-cols-3 gap-4">
            <Input label="Preço (R$)" type="number" defaultValue={selectedProd?.preco?.toString()} />
            <Input label="Preço promocional" type="number" defaultValue={selectedProd?.precoPromocional?.toString() ?? ''} />
            <Input label="Estoque" type="number" defaultValue={selectedProd?.estoque?.toString()} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Input label="Região" defaultValue={selectedProd?.regiao} />
            <Input label="Produtor" defaultValue={selectedProd?.produtor} />
            <Input label="Variedade" defaultValue={selectedProd?.variedade} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Input label="Processo" defaultValue={selectedProd?.processo} />
            <Input label="Altitude" defaultValue={selectedProd?.altitude} />
            <Input label="Torra" defaultValue={selectedProd?.torra} />
          </div>
          <Input label="Notas sensoriais (separadas por vírgula)" defaultValue={selectedProd?.notasSensoriais?.join(', ')} />
          <div className="flex gap-3 justify-end pt-2 border-t border-cream-200">
            <Button variant="ghost" onClick={() => setModal(false)}>Cancelar</Button>
            <Button variant="primary">
              {selectedProd ? 'Salvar alterações' : 'Criar produto'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal de confirmação de exclusão */}
      <Modal
        open={!!deleteModal}
        onClose={() => !deleting && setDeleteModal(null)}
        title="Confirmar exclusão"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-red-50 rounded-sm">
            <Trash2 size={16} className="text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-charcoal-700">
                {deleteModal?.ids.length === 1
                  ? 'Excluir este produto permanentemente?'
                  : `Excluir ${deleteModal?.ids.length} produtos permanentemente?`}
              </p>
              <p className="text-xs text-charcoal-500 mt-1">
                {deleteModal?.names.join(', ')}
              </p>
            </div>
          </div>
          <p className="text-sm text-charcoal-500">Esta ação não pode ser desfeita.</p>
          <div className="flex gap-3 justify-end pt-2 border-t border-cream-200">
            <Button variant="ghost" onClick={() => setDeleteModal(null)} disabled={deleting}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={deleting}>
              <Trash2 size={14} />
              {deleting ? 'Excluindo...' : 'Excluir'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
