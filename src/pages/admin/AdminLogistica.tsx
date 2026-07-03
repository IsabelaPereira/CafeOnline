import { useEffect, useState } from 'react';
import { Truck, Package, Search, ExternalLink, Eye, CheckCircle, Clock } from 'lucide-react';
import { Card, Badge, Input } from '../../components/ui';
import { PedidoDetalheModal } from '../../components/admin/PedidoDetalheModal';
import { getPedidos } from '../../services/pedidos.service';
import { getAssinaturas } from '../../services/assinaturas.service';
import { PEDIDO_STATUS_LABEL, PEDIDO_STATUS_VARIANT } from '../../constants/pedidoStatus';
import type { Pedido, Assinatura } from '../../types';

type FiltroStatus = 'todos' | 'pago' | 'em_separacao' | 'enviado' | 'entregue' | 'retirada';

export function AdminLogistica() {
  const [pedidosState, setPedidosState] = useState<Pedido[]>([]);
  const [assinaturas, setAssinaturas] = useState<Assinatura[]>([]);
  const [filtro, setFiltro] = useState<FiltroStatus>('todos');
  const [busca, setBusca] = useState('');
  const [pedidoDetalheId, setPedidoDetalheId] = useState<string | null>(null);

  useEffect(() => {
    getPedidos().then(setPedidosState).catch(console.error);
    getAssinaturas().then(setAssinaturas).catch(console.error);
  }, []);

  const pedidoDetalhe = pedidosState.find(p => p.id === pedidoDetalheId) ?? null;

  const filtrados = pedidosState.filter(p => {
    if (filtro === 'retirada') {
      if (p.formaEntrega !== 'retirada' || p.status !== 'disponivel_retirada') return false;
    } else if (filtro !== 'todos' && p.status !== filtro) {
      return false;
    }
    if (busca && !p.numero.toLowerCase().includes(busca.toLowerCase()) &&
        !p.cliente?.name.toLowerCase().includes(busca.toLowerCase())) return false;
    return true;
  });

  // Estatísticas logísticas
  const stats = [
    { label: 'Aguardando separação', count: pedidosState.filter(p => p.status === 'pago' || p.status === 'em_separacao').length, icon: <Package size={20} />, color: 'text-yellow-600 bg-yellow-50' },
    { label: 'Em trânsito', count: pedidosState.filter(p => p.status === 'enviado').length, icon: <Truck size={20} />, color: 'text-blue-600 bg-blue-50' },
    { label: 'Entregues (mês)', count: pedidosState.filter(p => p.status === 'entregue').length, icon: <CheckCircle size={20} />, color: 'text-forest-600 bg-forest-50' },
    { label: 'Retiradas pendentes', count: pedidosState.filter(p => p.formaEntrega === 'retirada' && p.status === 'disponivel_retirada').length, icon: <Package size={20} />, color: 'text-earth-600 bg-earth-50' },
    { label: 'Pendentes clube', count: assinaturas.flatMap(a => a.ciclos).filter(c => c.status === 'pendente').length, icon: <Clock size={20} />, color: 'text-earth-600 bg-earth-50' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl text-charcoal-700">Logística</h1>
          <p className="text-charcoal-400 text-sm mt-1">Gerencie envios, rastreamentos e status de entrega.</p>
        </div>
        <a
          href="https://melhorenvio.com.br"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 text-sm border border-cream-300 text-charcoal-600 rounded-sm hover:bg-cream-50 transition-colors"
        >
          <ExternalLink size={14} />
          Melhor Envio
        </a>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map(s => (
          <Card key={s.label} className="flex items-center gap-4">
            <div className={`p-3 rounded-sm shrink-0 ${s.color}`}>{s.icon}</div>
            <div>
              <p className="text-2xl font-serif text-charcoal-700">{s.count}</p>
              <p className="text-xs text-charcoal-400">{s.label}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Pedidos */}
      <Card padding={false}>
        <div className="p-5 border-b border-cream-100 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <h2 className="font-serif text-lg text-charcoal-700">Pedidos</h2>
          <div className="flex flex-wrap gap-2">
            <div className="w-56">
              <Input
                placeholder="Buscar pedido ou cliente..."
                leftIcon={<Search size={13} />}
                value={busca}
                onChange={e => setBusca(e.target.value)}
              />
            </div>
            {(['todos', 'pago', 'em_separacao', 'enviado', 'entregue', 'retirada'] as FiltroStatus[]).map(f => (
              <button
                key={f}
                onClick={() => setFiltro(f)}
                className={`px-3 py-1.5 text-xs rounded-sm transition-colors ${filtro === f ? 'bg-charcoal-700 text-cream-100' : 'border border-cream-200 text-charcoal-500 hover:bg-cream-50'}`}
              >
                {f === 'todos' ? 'Todos' : f === 'retirada' ? 'Retiradas' : PEDIDO_STATUS_LABEL[f]}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-cream-100">
                <th className="text-left text-xs font-medium text-charcoal-400 uppercase tracking-wider px-5 py-3">Pedido</th>
                <th className="text-left text-xs font-medium text-charcoal-400 uppercase tracking-wider px-5 py-3">Cliente</th>
                <th className="text-left text-xs font-medium text-charcoal-400 uppercase tracking-wider px-5 py-3">Destino</th>
                <th className="text-left text-xs font-medium text-charcoal-400 uppercase tracking-wider px-5 py-3">Status</th>
                <th className="text-left text-xs font-medium text-charcoal-400 uppercase tracking-wider px-5 py-3">Rastreio</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-charcoal-400">
                    Nenhum pedido encontrado.
                  </td>
                </tr>
              ) : filtrados.map(p => (
                <tr key={p.id} className="border-b border-cream-50 hover:bg-cream-50 transition-colors cursor-pointer" onClick={() => setPedidoDetalheId(p.id)}>
                  <td className="px-5 py-4">
                    <p className="text-sm font-medium text-charcoal-700">{p.numero}</p>
                    <p className="text-xs text-charcoal-400">{new Date(p.createdAt).toLocaleDateString('pt-BR')}</p>
                  </td>
                  <td className="px-5 py-4 text-sm text-charcoal-600">{p.cliente?.name ?? '—'}</td>
                  <td className="px-5 py-4">
                    {p.formaEntrega === 'retirada' ? (
                      <p className="text-sm font-medium text-earth-600">Retirada na loja</p>
                    ) : (
                      <>
                        <p className="text-sm text-charcoal-600">{p.enderecoEntrega.cidade}/{p.enderecoEntrega.estado}</p>
                        <p className="text-xs text-charcoal-400">CEP {p.enderecoEntrega.cep}</p>
                      </>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <Badge variant={PEDIDO_STATUS_VARIANT[p.status] ?? 'inactive'}>{PEDIDO_STATUS_LABEL[p.status] ?? p.status}</Badge>
                  </td>
                  <td className="px-5 py-4">
                    {p.codigoRastreio
                      ? <span className="text-xs font-mono text-charcoal-600">{p.codigoRastreio}</span>
                      : <span className="text-xs text-charcoal-300">—</span>}
                  </td>
                  <td className="px-5 py-4">
                    <button
                      onClick={e => { e.stopPropagation(); setPedidoDetalheId(p.id); }}
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
      </Card>

      {/* Envios da assinatura */}
      <Card>
        <h2 className="font-serif text-lg text-charcoal-700 mb-4">Envios do Clube — Ciclo Atual</h2>
        <div className="space-y-3">
          {assinaturas.map(assin => {
            const cicloAtual = [...assin.ciclos].sort((a, b) => b.ano - a.ano || b.mes - a.mes)[0];
            if (!cicloAtual) return null;
            return (
              <div key={assin.id} className="flex items-center justify-between py-3 border-b border-cream-100 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-cream-100 rounded-sm">
                    <Package size={16} className="text-earth-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-charcoal-700">{assin.plano.nome}</p>
                    <p className="text-xs text-charcoal-400">
                      {assin.endereco.cidade}/{assin.endereco.estado} — CEP {assin.endereco.cep}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {cicloAtual.codigoRastreio && (
                    <span className="text-xs font-mono text-charcoal-500">{cicloAtual.codigoRastreio}</span>
                  )}
                  <Badge variant={cicloAtual.status === 'entregue' ? 'active' : cicloAtual.status === 'enviado' ? 'gold' : 'pending'}>
                    {cicloAtual.status === 'entregue' ? 'Entregue' : cicloAtual.status === 'enviado' ? 'Em trânsito' : 'Pendente'}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <PedidoDetalheModal
        pedido={pedidoDetalhe}
        onClose={() => setPedidoDetalheId(null)}
        onUpdated={u => setPedidosState(prev => prev.map(p => p.id === u.id ? u : p))}
      />
    </div>
  );
}
