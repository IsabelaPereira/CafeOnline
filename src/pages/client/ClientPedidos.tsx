import React, { useEffect, useState } from 'react';
import { Package, Truck, Eye } from 'lucide-react';
import { Card, Badge, Modal, Button } from '../../components/ui';
import { getPedidos } from '../../services/pedidos.service';
import { useAuth } from '../../contexts/AuthContext';
import { getClienteByUserId } from '../../services/clientes.service';
import type { Pedido } from '../../types';

const statusLabel: Record<string, string> = {
  pendente: 'Pendente', pago: 'Pago', em_separacao: 'Em separação',
  enviado: 'Enviado', entregue: 'Entregue',
  disponivel_retirada: 'Disponível para retirada', retirado: 'Retirado',
  cancelado: 'Cancelado', reembolsado: 'Reembolsado',
};
const statusVariant: Record<string, 'active' | 'pending' | 'cancelled' | 'inactive' | 'gold'> = {
  pendente: 'pending', pago: 'pending', em_separacao: 'pending',
  enviado: 'gold', entregue: 'active',
  disponivel_retirada: 'gold', retirado: 'active',
  cancelado: 'cancelled', reembolsado: 'inactive',
};

/** Mensagem de retirada varia por status — só instrui o cliente a ir buscar
 *  quando o pedido REALMENTE está disponível na loja (não antes). */
function mensagemRetirada(status: Pedido['status']): string {
  switch (status) {
    case 'retirado':
      return 'Pedido retirado na loja Das Matas.';
    case 'disponivel_retirada':
      return 'Disponível para retirada — Loja Das Matas, R. Bernardo Monteiro, 150, Loja 1, Centro, Contagem/MG.';
    default:
      return 'Retirada na loja — seu pedido está sendo preparado. Avisaremos quando estiver disponível.';
  }
}

export function ClientPedidos() {
  const { user } = useAuth();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [selected, setSelected] = useState<Pedido | null>(null);

  useEffect(() => {
    if (!user) return;
    getClienteByUserId(user.id).then(cliente => {
      if (cliente) getPedidos(cliente.id).then(setPedidos).catch(console.error);
    }).catch(console.error);
  }, [user]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-serif text-3xl text-charcoal-700">Meus Pedidos</h1>
        <p className="text-charcoal-400 text-sm mt-1">Histórico de compras e status de entrega.</p>
      </div>

      {pedidos.length === 0 ? (
        <Card className="text-center py-16">
          <Package size={48} className="text-charcoal-200 mx-auto mb-3" />
          <p className="font-serif text-xl text-charcoal-500">Nenhum pedido ainda</p>
          <p className="text-sm text-charcoal-400 mt-1 mb-4">Visite nossa loja e faça seu primeiro pedido.</p>
          <Button variant="primary" onClick={() => {}}>Ir à loja</Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {pedidos.map(pedido => (
            <Card key={pedido.id} padding={false}>
              <div className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-xs text-charcoal-400 mb-1">{pedido.numero}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant={statusVariant[pedido.status] ?? 'inactive'}>
                        {statusLabel[pedido.status]}
                      </Badge>
                      <span className="text-xs text-charcoal-400">
                        {new Date(pedido.createdAt).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelected(pedido)}
                    className="flex items-center gap-1.5 text-xs text-forest-500 hover:text-forest-600"
                  >
                    <Eye size={14} />
                    Detalhes
                  </button>
                </div>

                <div className="space-y-2 mb-4">
                  {pedido.itens.map(item => (
                    <div key={item.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-cream-100 rounded-sm flex items-center justify-center">
                          <Package size={14} className="text-earth-400" />
                        </div>
                        <div>
                          <p className="text-sm text-charcoal-700">{item.produto.nome}</p>
                          <p className="text-xs text-charcoal-400">x{item.quantidade}</p>
                        </div>
                      </div>
                      <span className="text-sm text-charcoal-600">R$ {item.subtotal.toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                {pedido.formaEntrega === 'retirada' ? (
                  <div className="flex items-center gap-2 mb-4 p-3 bg-earth-50 rounded-sm text-sm">
                    <Package size={14} className="text-earth-500 shrink-0" />
                    <span className="text-earth-700">{mensagemRetirada(pedido.status)}</span>
                  </div>
                ) : pedido.codigoRastreio && (
                  <div className="flex items-center gap-2 mb-4 p-3 bg-blue-50 rounded-sm text-sm">
                    <Truck size={14} className="text-blue-500 shrink-0" />
                    <span className="text-blue-600">Rastreio: {pedido.codigoRastreio}</span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-cream-100">
                  <span className="text-xs text-charcoal-400">{pedido.formaPagamento}</span>
                  <span className="font-serif text-lg text-charcoal-700">R$ {pedido.total.toFixed(2)}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={`Pedido ${selected?.numero}`}
        size="lg"
      >
        {selected && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <Badge variant={statusVariant[selected.status] ?? 'inactive'}>
                {statusLabel[selected.status]}
              </Badge>
              <span className="text-sm text-charcoal-400">
                {new Date(selected.createdAt).toLocaleDateString('pt-BR')}
              </span>
            </div>

            {/* Items */}
            <div>
              <p className="text-xs font-medium text-charcoal-400 uppercase tracking-wider mb-3">Itens</p>
              <div className="space-y-3">
                {selected.itens.map(item => (
                  <div key={item.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-cream-100 rounded-sm flex items-center justify-center">
                        <Package size={18} className="text-earth-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-charcoal-700">{item.produto.nome}</p>
                        <p className="text-xs text-charcoal-400">SKU: {item.produto.sku} · x{item.quantidade}</p>
                      </div>
                    </div>
                    <span className="text-sm text-charcoal-600">R$ {item.subtotal.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="bg-cream-50 rounded-sm p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-charcoal-500">Subtotal</span>
                <span className="text-charcoal-700">R$ {selected.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-charcoal-500">Frete</span>
                <span className="text-charcoal-700">R$ {selected.frete.toFixed(2)}</span>
              </div>
              {selected.desconto > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-charcoal-500">Desconto</span>
                  <span className="text-forest-500">- R$ {selected.desconto.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-medium border-t border-cream-200 pt-2">
                <span className="text-charcoal-700">Total</span>
                <span className="font-serif text-lg text-charcoal-700">R$ {selected.total.toFixed(2)}</span>
              </div>
            </div>

            {/* Entrega */}
            <div>
              <p className="text-xs font-medium text-charcoal-400 uppercase tracking-wider mb-2">Entrega</p>
              {selected.formaEntrega === 'retirada' ? (
                <div className="flex items-center gap-2 p-3 bg-earth-50 rounded-sm text-sm text-earth-700">
                  <Package size={16} className="shrink-0" />
                  <span>{mensagemRetirada(selected.status)}</span>
                </div>
              ) : (
                <>
                  <p className="text-sm text-charcoal-600">
                    {selected.enderecoEntrega.logradouro}, {selected.enderecoEntrega.numero}
                    {selected.enderecoEntrega.complemento && `, ${selected.enderecoEntrega.complemento}`}
                  </p>
                  <p className="text-sm text-charcoal-600">
                    {selected.enderecoEntrega.bairro} — {selected.enderecoEntrega.cidade}/{selected.enderecoEntrega.estado}
                  </p>
                  <p className="text-sm text-charcoal-600">CEP: {selected.enderecoEntrega.cep}</p>
                </>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
