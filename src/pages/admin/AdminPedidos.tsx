import React, { useEffect, useState } from 'react';
import { Eye, Package, Truck, Check, X } from 'lucide-react';
import {
  Card, Badge, SearchBar, FilterBar, Select, Pagination,
  Modal, Button, Table, SectionHeader
} from '../../components/ui';
import { getPedidos } from '../../services/pedidos.service';
import type { Pedido } from '../../types';

const statusOptions = [
  { value: '', label: 'Todos os status' },
  { value: 'pendente', label: 'Pendente' },
  { value: 'pago', label: 'Pago' },
  { value: 'em_separacao', label: 'Em separação' },
  { value: 'enviado', label: 'Enviado' },
  { value: 'entregue', label: 'Entregue' },
  { value: 'cancelado', label: 'Cancelado' },
];

const statusVariant: Record<string, 'active' | 'pending' | 'cancelled' | 'inactive' | 'gold'> = {
  pendente: 'pending', pago: 'pending', em_separacao: 'gold',
  enviado: 'gold', entregue: 'active', cancelado: 'cancelled', reembolsado: 'inactive',
};

export function AdminPedidos() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Pedido | null>(null);
  const perPage = 10;

  useEffect(() => {
    getPedidos().then(setPedidos).catch(console.error);
  }, []);

  const filtered = pedidos.filter(p =>
    (search === '' || p.numero.toLowerCase().includes(search.toLowerCase()) ||
     p.cliente?.name.toLowerCase().includes(search.toLowerCase())) &&
    (statusFilter === '' || p.status === statusFilter)
  );

  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  return (
    <div className="space-y-6 animate-fade-in">
      <SectionHeader
        title="Pedidos"
        subtitle={`${filtered.length} pedidos encontrados`}
        action={
          <Button variant="primary" size="sm">
            <Package size={14} />
            Novo pedido
          </Button>
        }
      />

      <Card padding={false}>
        <FilterBar onExport={() => alert('Exportando CSV...')}>
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Buscar por número ou cliente..."
            className="w-64"
          />
          <Select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            options={statusOptions}
            className="w-40"
          />
        </FilterBar>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-th">Pedido</th>
                <th className="table-th">Cliente</th>
                <th className="table-th">Itens</th>
                <th className="table-th">Total</th>
                <th className="table-th">Pagamento</th>
                <th className="table-th">Data</th>
                <th className="table-th">Status</th>
                <th className="table-th">Ações</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-charcoal-400">
                    Nenhum pedido encontrado
                  </td>
                </tr>
              ) : paginated.map(p => (
                <tr key={p.id} className="border-t border-cream-100 hover:bg-cream-50 transition-colors">
                  <td className="table-td font-medium text-charcoal-700">{p.numero}</td>
                  <td className="table-td">
                    <div>
                      <p className="text-sm text-charcoal-700">{p.cliente?.name}</p>
                      <p className="text-xs text-charcoal-400">{p.cliente?.email}</p>
                    </div>
                  </td>
                  <td className="table-td text-charcoal-500">{p.itens.length}</td>
                  <td className="table-td font-medium text-charcoal-700">R$ {p.total.toFixed(2)}</td>
                  <td className="table-td text-charcoal-500">{p.formaPagamento}</td>
                  <td className="table-td text-charcoal-500">
                    {new Date(p.createdAt).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="table-td">
                    <Badge variant={statusVariant[p.status] ?? 'inactive'}>{p.status}</Badge>
                  </td>
                  <td className="table-td">
                    <button
                      onClick={() => setSelected(p)}
                      className="p-1.5 text-charcoal-400 hover:text-forest-500 hover:bg-forest-50 rounded-sm transition-colors"
                    >
                      <Eye size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Pagination page={page} total={filtered.length} perPage={perPage} onChange={setPage} />
      </Card>

      {/* Detail Modal */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={`Pedido ${selected?.numero}`}
        size="xl"
      >
        {selected && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Cliente', value: selected.cliente?.name ?? '—' },
                { label: 'Data', value: new Date(selected.createdAt).toLocaleDateString('pt-BR') },
                { label: 'Pagamento', value: selected.formaPagamento },
                { label: 'Status', value: <Badge variant={statusVariant[selected.status] ?? 'inactive'}>{selected.status}</Badge> },
              ].map(info => (
                <div key={info.label} className="bg-cream-50 rounded-sm p-3">
                  <p className="text-xs text-charcoal-400 mb-1">{info.label}</p>
                  <div className="text-sm font-medium text-charcoal-700">{info.value}</div>
                </div>
              ))}
            </div>

            {/* Itens */}
            <div>
              <p className="text-xs font-medium text-charcoal-400 uppercase tracking-wider mb-3">Itens do pedido</p>
              <div className="space-y-2">
                {selected.itens.map(item => (
                  <div key={item.id} className="flex items-center justify-between py-2 border-b border-cream-100">
                    <div className="flex items-center gap-3">
                      <Package size={16} className="text-earth-400" />
                      <div>
                        <p className="text-sm text-charcoal-700">{item.produto.nome}</p>
                        <p className="text-xs text-charcoal-400">SKU: {item.produto.sku}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-charcoal-600">x{item.quantidade}</p>
                      <p className="text-sm font-medium text-charcoal-700">R$ {item.subtotal.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="bg-cream-50 rounded-sm p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-charcoal-500">Subtotal</span>
                <span>R$ {selected.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-charcoal-500">Frete</span>
                <span>R$ {selected.frete.toFixed(2)}</span>
              </div>
              {selected.desconto > 0 && (
                <div className="flex justify-between text-sm text-forest-500">
                  <span>Desconto {selected.cupom && `(${selected.cupom})`}</span>
                  <span>- R$ {selected.desconto.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-medium border-t border-cream-200 pt-2">
                <span className="text-charcoal-700">Total</span>
                <span className="font-serif text-lg">R$ {selected.total.toFixed(2)}</span>
              </div>
            </div>

            {/* Endereço */}
            <div>
              <p className="text-xs font-medium text-charcoal-400 uppercase tracking-wider mb-2">Endereço de entrega</p>
              <p className="text-sm text-charcoal-600">
                {selected.enderecoEntrega.logradouro}, {selected.enderecoEntrega.numero}
                {selected.enderecoEntrega.complemento && `, ${selected.enderecoEntrega.complemento}`}
              </p>
              <p className="text-sm text-charcoal-600">
                {selected.enderecoEntrega.bairro} — {selected.enderecoEntrega.cidade}/{selected.enderecoEntrega.estado} · CEP {selected.enderecoEntrega.cep}
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3 pt-2 border-t border-cream-200">
              <Button variant="primary" size="sm">
                <Truck size={14} />
                Gerar etiqueta
              </Button>
              <Button variant="secondary" size="sm">
                <Check size={14} />
                Marcar como enviado
              </Button>
              {selected.status !== 'cancelado' && (
                <Button variant="danger" size="sm">
                  <X size={14} />
                  Cancelar pedido
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
