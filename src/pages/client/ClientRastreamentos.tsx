import React, { useEffect, useMemo, useState } from 'react';
import { Truck, Package, CheckCircle, Clock, MapPin, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, Badge, Input } from '../../components/ui';
import { useAuth } from '../../contexts/AuthContext';
import { getPedidos } from '../../services/pedidos.service';
import { getAssinaturasCliente } from '../../services/assinaturas.service';
import { getClienteByUserId } from '../../services/clientes.service';
import type { Pedido, Assinatura } from '../../types';

interface EnvioItem {
  id: string;
  codigo: string;
  descricao: string;
  tipo: 'pedido' | 'assinatura';
  status: string;
  data: string;
  eventos: { data: string; local: string; descricao: string }[];
}

function gerarEventos(codigo: string, status: string) {
  const base = [
    { data: '2026-04-02 09:00', local: 'São Paulo / SP', descricao: 'Objeto postado' },
    { data: '2026-04-03 14:22', local: 'São Paulo / SP', descricao: 'Objeto em trânsito — encaminhado para distribuição' },
  ];
  if (status === 'enviado' || status === 'entregue') {
    base.push({ data: '2026-04-05 08:45', local: 'Unidade destino', descricao: 'Objeto saiu para entrega' });
  }
  if (status === 'entregue') {
    base.push({ data: '2026-04-05 14:10', local: 'Destino final', descricao: 'Objeto entregue ao destinatário' });
  }
  return base.reverse();
}

const statusInfo: Record<string, { label: string; variant: 'active' | 'pending' | 'inactive' | 'cancelled' | 'gold'; icon: React.ReactNode }> = {
  entregue:  { label: 'Entregue',  variant: 'active',   icon: <CheckCircle size={14} /> },
  enviado:   { label: 'Em trânsito', variant: 'gold',   icon: <Truck size={14} /> },
  pendente:  { label: 'Aguardando envio', variant: 'pending', icon: <Clock size={14} /> },
  pago:      { label: 'Aguardando envio', variant: 'pending', icon: <Clock size={14} /> },
};

export function ClientRastreamentos() {
  const { user } = useAuth();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [assinaturas, setAssinaturas] = useState<Assinatura[]>([]);
  const [busca, setBusca] = useState('');
  const [expandido, setExpandido] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    getClienteByUserId(user.id).then(c => {
      if (!c) return;
      getPedidos(c.id).then(setPedidos).catch(console.error);
      getAssinaturasCliente(c.id).then(setAssinaturas).catch(console.error);
    }).catch(console.error);
  }, [user]);

  const envios: EnvioItem[] = useMemo(() => [
    ...pedidos
      .filter(p => p.codigoRastreio)
      .map(p => ({
        id: p.id,
        codigo: p.codigoRastreio!,
        descricao: `Pedido ${p.numero}`,
        tipo: 'pedido' as const,
        status: p.status,
        data: p.updatedAt,
        eventos: gerarEventos(p.codigoRastreio!, p.status),
      })),
    ...assinaturas
      .flatMap(a =>
        a.ciclos
          .filter(c => c.codigoRastreio)
          .map(c => ({
            id: c.id,
            codigo: c.codigoRastreio!,
            descricao: `Assinatura — ${['', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'][c.mes]}/${c.ano}`,
            tipo: 'assinatura' as const,
            status: c.status,
            data: c.dataEnvio ?? '',
            eventos: gerarEventos(c.codigoRastreio!, c.status),
          }))
      ),
  ], [pedidos, assinaturas]);

  const filtrados = envios.filter(e =>
    !busca || e.codigo.toLowerCase().includes(busca.toLowerCase()) || e.descricao.toLowerCase().includes(busca.toLowerCase())
  );

  const toggle = (id: string) => setExpandido(prev => prev === id ? null : id);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-serif text-3xl text-charcoal-700">Rastreamentos</h1>
        <p className="text-charcoal-400 text-sm mt-1">Acompanhe seus envios de pedidos e edições do clube.</p>
      </div>

      <div className="max-w-sm">
        <Input
          placeholder="Buscar por código ou pedido..."
          leftIcon={<Search size={14} />}
          value={busca}
          onChange={e => setBusca(e.target.value)}
        />
      </div>

      {filtrados.length === 0 ? (
        <Card className="text-center py-16">
          <Truck size={48} className="text-charcoal-200 mx-auto mb-3" />
          <p className="font-serif text-xl text-charcoal-500">Nenhum envio encontrado</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtrados.map(envio => {
            const info = statusInfo[envio.status] ?? statusInfo['pendente'];
            const aberto = expandido === envio.id;

            return (
              <Card key={envio.id} padding={false}>
                <button
                  className="w-full text-left p-5 flex items-start justify-between gap-4"
                  onClick={() => toggle(envio.id)}
                >
                  <div className="flex items-start gap-4 min-w-0">
                    <div className="mt-0.5 p-2 bg-cream-100 rounded-sm shrink-0">
                      {envio.tipo === 'assinatura'
                        ? <Package size={16} className="text-earth-400" />
                        : <Truck size={16} className="text-forest-400" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-charcoal-700 truncate">{envio.descricao}</p>
                      <p className="text-xs text-charcoal-400 mt-0.5 font-mono">{envio.codigo}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant={info.variant}>{info.label}</Badge>
                        {envio.data && (
                          <span className="text-xs text-charcoal-400">
                            {new Date(envio.data).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className="text-charcoal-400 shrink-0 mt-1">
                    {aberto ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </span>
                </button>

                {aberto && (
                  <div className="px-5 pb-5 border-t border-cream-100">
                    <p className="text-xs font-medium text-charcoal-400 uppercase tracking-wider mt-4 mb-3">
                      Histórico de eventos
                    </p>
                    <div className="space-y-0">
                      {envio.eventos.map((ev, i) => (
                        <div key={i} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <div className={`w-3 h-3 rounded-full border-2 shrink-0 mt-0.5 ${i === 0 ? 'bg-forest-500 border-forest-500' : 'bg-white border-charcoal-300'}`} />
                            {i < envio.eventos.length - 1 && <div className="w-px flex-1 bg-cream-200 my-1" />}
                          </div>
                          <div className="pb-4">
                            <p className="text-sm text-charcoal-700">{ev.descricao}</p>
                            <div className="flex items-center gap-3 mt-0.5">
                              <span className="text-xs text-charcoal-400">{ev.data}</span>
                              <span className="flex items-center gap-1 text-xs text-charcoal-400">
                                <MapPin size={11} />{ev.local}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <a
                      href={`https://www.melhorrastreio.com.br/rastreio/${envio.codigo}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-forest-500 hover:text-forest-600 mt-2"
                    >
                      <Truck size={12} />
                      Rastrear nos Correios
                    </a>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
