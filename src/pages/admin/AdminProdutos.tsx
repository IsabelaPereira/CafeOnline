import React, { useEffect, useState } from 'react';
import { Plus, Edit, Eye, Package, AlertTriangle } from 'lucide-react';
import {
  Card, Badge, Button, Modal, Input, Select, Textarea,
  SectionHeader, SearchBar, FilterBar, StatCard, Tabs
} from '../../components/ui';
import { getProdutos } from '../../services/produtos.service';
import type { Produto } from '../../types';

export function AdminProdutos() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [tab, setTab] = useState('catalogo');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [selectedProd, setSelectedProd] = useState<Produto | null>(null);

  useEffect(() => {
    getProdutos().then(setProdutos).catch(console.error);
  }, []);

  const filtered = produtos.filter(p =>
    search === '' ||
    p.nome.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase())
  );

  const baixoEstoque = produtos.filter(p => p.estoque <= p.estoqueMinimo);

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
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
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
                  <tr key={p.id} className="border-t border-cream-100 hover:bg-cream-50">
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
                      <div>
                        {p.precoPromocional ? (
                          <>
                            <p className="text-xs text-charcoal-400 line-through">R$ {p.preco.toFixed(2)}</p>
                            <p className="font-medium text-charcoal-700">R$ {p.precoPromocional.toFixed(2)}</p>
                          </>
                        ) : (
                          <p className="font-medium text-charcoal-700">R$ {p.preco.toFixed(2)}</p>
                        )}
                      </div>
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
                          className="p-1.5 text-charcoal-400 hover:text-forest-500 hover:bg-forest-50 rounded-sm"
                        >
                          <Edit size={14} />
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

      {/* Product Modal */}
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
    </div>
  );
}
