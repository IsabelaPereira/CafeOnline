import React, { useEffect, useState } from 'react';
import { Truck, Package, Search, ExternalLink, Edit2, CheckCircle, Clock, AlertTriangle, BarChart2 } from 'lucide-react';
import { Card, Badge, Button, Input, Modal, Alert } from '../../components/ui';
import { getPedidos, updatePedidoRastreio } from '../../services/pedidos.service';
import { getAssinaturas } from '../../services/assinaturas.service';
import type { Pedido, Assinatura } from '../../types';

const statusLabel: Record<string, string> = {
  pendente: 'Pendente', pago: 'Pago', em_separacao: 'Em separação',
  enviado: 'Enviado', entregue: 'Entregue', cancelado: 'Cancelado',
};
const statusVariant: Record<string, 'active' | 'pending' | 'cancelled' | 'inactive' | 'gold'> = {
  pendente: 'pending', pago: 'pending', em_separacao: 'pending',
  enviado: 'gold', entregue: 'active', cancelado: 'cancelled',
};

type FiltroStatus = 'todos' | 'pago' | 'em_separacao' | 'enviado' | 'entregue';

export function AdminLogistica() {
  const [pedidosState, setPedidosState] = useState<Pedido[]>([]);
  const [assinaturas, setAssinaturas] = useState<Assinatura[]>([]);
  const [filtro, setFiltro] = useState<FiltroStatus>('todos');
  const [busca, setBusca] = useState('');
  const [pedidoSel, setPedidoSel] = useState<Pedido | null>(null);
  const [novoRastreio, setNovoRastreio] = useState('');
  const [novoStatus, setNovoStatus] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [sucesso, setSucesso] = useState('');

  useEffect(() => {
    getPedidos().then(setPedidosState).catch(console.error);
    getAssinaturas().then(setAssinaturas).catch(console.error);
  }, []);

  const filtrados = pedidosState.filter(p => {
    if (filtro !== 'todos' && p.status !== filtro) return false;
    if (busca && !p.numero.toLowerCase().includes(busca.toLowerCase()) &&
        !p.cliente?.name.toLowerCase().includes(busca.toLowerCase())) return false;
    return true;
  });

  // Estatísticas logísticas
  const stats = [
    { label: 'Aguardando separação', count: pedidosState.filter(p => p.status === 'pago' || p.status === 'em_separacao').length, icon: <Package size={20} />, color: 'text-yellow-600 bg-yellow-50' },
    { label: 'Em trânsito', count: pedidosState.filter(p => p.status === 'enviado').length, icon: <Truck size={20} />, color: 'text-blue-600 bg-blue-50' },
    { label: 'Entregues (mês)', count: pedidosState.filter(p => p.status === 'entregue').length, icon: <CheckCircle size={20} />, color: 'text-forest-600 bg-forest-50' },
    { label: 'Pendentes clube', count: assinaturas.flatMap(a => a.ciclos).filter(c => c.status === 'pendente').length, icon: <Clock size={20} />, color: 'text-earth-600 bg-earth-50' },
  ];

  function abrirEditar(pedido: Pedido) {
    setPedidoSel(pedido);
    setNovoRastreio(pedido.codigoRastreio ?? '');
    setNovoStatus(pedido.status);
  }

  async function handleSalvarRastreio() {
    if (!pedidoSel) return;
    setSalvando(true);
    await updatePedidoRastreio(pedidoSel.id, novoRastreio, novoStatus as Pedido['status']).catch(console.error);
    setPedidosState(prev =>
      prev.map(p => p.id === pedidoSel.id
        ? { ...p, status: novoStatus as Pedido['status'], codigoRastreio: novoRastreio || undefined }
        : p
      )
    );
    setSalvando(false);
    setPedidoSel(null);
    setSucesso(`Pedido ${pedidoSel.numero} atualizado.`);
    setTimeout(() => setSucesso(''), 4000);
  }

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

      {sucesso && <Alert type="success" message={sucesso} />}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
            {(['todos', 'pago', 'em_separacao', 'enviado', 'entregue'] as FiltroStatus[]).map(f => (
              <button
                key={f}
                onClick={() => setFiltro(f)}
                className={`px-3 py-1.5 text-xs rounded-sm transition-colors ${filtro === f ? 'bg-charcoal-700 text-cream-100' : 'border border-cream-200 text-charcoal-500 hover:bg-cream-50'}`}
              >
                {f === 'todos' ? 'Todos' : statusLabel[f]}
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
                <tr key={p.id} className="border-b border-cream-50 hover:bg-cream-50 transition-colors">
                  <td className="px-5 py-4">
                    <p className="text-sm font-medium text-charcoal-700">{p.numero}</p>
                    <p className="text-xs text-charcoal-400">{new Date(p.createdAt).toLocaleDateString('pt-BR')}</p>
                  </td>
                  <td className="px-5 py-4 text-sm text-charcoal-600">{p.cliente?.name ?? '—'}</td>
                  <td className="px-5 py-4">
                    <p className="text-sm text-charcoal-600">{p.enderecoEntrega.cidade}/{p.enderecoEntrega.estado}</p>
                    <p className="text-xs text-charcoal-400">CEP {p.enderecoEntrega.cep}</p>
                  </td>
                  <td className="px-5 py-4">
                    <Badge variant={statusVariant[p.status] ?? 'inactive'}>{statusLabel[p.status]}</Badge>
                  </td>
                  <td className="px-5 py-4">
                    {p.codigoRastreio
                      ? <span className="text-xs font-mono text-charcoal-600">{p.codigoRastreio}</span>
                      : <span className="text-xs text-charcoal-300">—</span>}
                  </td>
                  <td className="px-5 py-4">
                    <button
                      onClick={() => abrirEditar(p)}
                      className="flex items-center gap-1.5 text-xs text-forest-500 hover:text-forest-600"
                    >
                      <Edit2 size={13} /> Editar
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

      {/* Modal editar rastreio */}
      <Modal open={!!pedidoSel} onClose={() => setPedidoSel(null)} title={`Atualizar — ${pedidoSel?.numero}`}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-charcoal-500 uppercase tracking-wider mb-1.5">Status</label>
            <select
              value={novoStatus}
              onChange={e => setNovoStatus(e.target.value)}
              className="w-full border border-cream-200 rounded-sm px-3 py-2.5 text-sm text-charcoal-700 focus:outline-none focus:ring-2 focus:ring-forest-400"
            >
              {Object.entries(statusLabel).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>
          <Input
            label="Código de rastreio"
            value={novoRastreio}
            onChange={e => setNovoRastreio(e.target.value.toUpperCase())}
            placeholder="BR000000000BR"
          />
          <div className="flex justify-end gap-3 pt-2 border-t border-cream-100">
            <Button variant="ghost" onClick={() => setPedidoSel(null)}>Cancelar</Button>
            <Button variant="primary" loading={salvando} onClick={handleSalvarRastreio}>
              Salvar alterações
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
