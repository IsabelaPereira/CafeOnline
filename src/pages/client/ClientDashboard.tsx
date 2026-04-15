import React from 'react';
import { Link } from 'react-router-dom';
import { Package, Star, ShoppingBag, BookOpen, Calendar, ArrowRight, Truck, Lock } from 'lucide-react';
import { Card, Badge, StatCard } from '../../components/ui';
import { useAuth } from '../../contexts/AuthContext';
import { useClienteAssinaturas, useClientePedidos } from '../../hooks/useCliente';
import { useEdicoes } from '../../hooks/useEdicoes';

export function ClientDashboard() {
  const { user } = useAuth();
  const { assinaturas, loading: aLoading } = useClienteAssinaturas();
  const { pedidos, loading: pLoading } = useClientePedidos();
  const { data: edicoes, loading: eLoading } = useEdicoes(true);

  const assinatura   = assinaturas[0] ?? null;
  const assinaAtiva  = assinatura?.status === 'ativa';
  const ultimoPedido = pedidos[0] ?? null;
  const ultimaEdicao = edicoes[0] ?? null;

  const loading = aLoading || pLoading || eLoading;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 border-2 border-forest-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome */}
      <div>
        <h1 className="font-serif text-3xl text-charcoal-700 mb-1">
          Olá, {user?.name?.split(' ')[0]}!
        </h1>
        <p className="text-charcoal-400 text-sm">
          Bem-vindo à sua área de membro Das Matas.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Plano atual"
          value={assinatura ? assinatura.plano.nome : '—'}
          subtitle={assinatura ? 'Assinatura ativa' : 'Sem assinatura'}
          color="forest"
          icon={<Star size={18} />}
        />
        <StatCard
          title="Próximo envio"
          value={assinatura ? new Date(assinatura.proximoEnvio).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '—'}
          subtitle={assinatura ? '2 cafés especiais' : 'Assine o clube'}
          color="gold"
          icon={<Package size={18} />}
        />
        <StatCard
          title="Edições recebidas"
          value={assinatura ? assinatura.ciclos.filter(c => c.status === 'entregue').length : 0}
          subtitle="No clube Das Matas"
          color="earth"
          icon={<BookOpen size={18} />}
        />
        <StatCard
          title="Pedidos"
          value={pedidos.length}
          subtitle="Total de compras"
          color="forest"
          icon={<Star size={18} />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assinatura atual */}
        {assinatura ? (
          <Card>
            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 className="font-serif text-xl text-charcoal-700">Minha Assinatura</h2>
                <p className="text-sm text-charcoal-400 mt-0.5">{assinatura.plano.nome}</p>
              </div>
              <Badge variant={assinatura.status === 'ativa' ? 'active' : assinatura.status === 'pendente' ? 'pending' : 'cancelled'}>
                {assinatura.status === 'ativa' ? 'Ativa' : assinatura.status === 'pendente' ? 'Pendente' : assinatura.status}
              </Badge>
            </div>

            <div className="space-y-3 mb-5">
              <div className="flex justify-between text-sm">
                <span className="text-charcoal-400">Valor do plano</span>
                <span className="text-charcoal-700 font-medium">R$ {assinatura.plano.preco.toFixed(2)}/mês</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-charcoal-400">Frete</span>
                <span className="text-charcoal-700">R$ {assinatura.frete.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm border-t border-cream-200 pt-3">
                <span className="font-medium text-charcoal-700">Total mensal</span>
                <span className="font-serif text-lg text-charcoal-700">R$ {assinatura.totalMensal.toFixed(2)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="bg-cream-50 rounded-sm p-3">
                <p className="text-xs text-charcoal-400 mb-1">Próxima cobrança</p>
                <p className="text-sm font-medium text-charcoal-700">
                  {assinatura.proximaCobranca ? new Date(assinatura.proximaCobranca).toLocaleDateString('pt-BR') : '—'}
                </p>
              </div>
              <div className="bg-cream-50 rounded-sm p-3">
                <p className="text-xs text-charcoal-400 mb-1">Próximo envio</p>
                <p className="text-sm font-medium text-charcoal-700">
                  {assinatura.proximoEnvio ? new Date(assinatura.proximoEnvio).toLocaleDateString('pt-BR') : '—'}
                </p>
              </div>
            </div>

            <Link
              to="/cliente/assinaturas"
              className="flex items-center gap-1.5 text-sm text-forest-500 font-medium hover:text-forest-600 group"
            >
              Gerenciar assinatura
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </Card>
        ) : (
          <Card className="flex flex-col items-center justify-center py-10 text-center">
            <Star size={40} className="text-charcoal-200 mb-3" />
            <p className="font-serif text-lg text-charcoal-600 mb-1">Você ainda não assina o clube</p>
            <p className="text-sm text-charcoal-400 mb-4">Receba cafés especiais todo mês na sua porta.</p>
            <Link
              to="/assinar"
              className="px-6 py-2.5 bg-forest-500 text-cream-100 text-sm font-medium rounded-sm hover:bg-forest-600 transition-colors"
            >
              Assinar agora
            </Link>
          </Card>
        )}

        {/* Edição atual */}
        {ultimaEdicao ? (
          <div className="relative">
            <Card className={assinaAtiva ? '' : 'overflow-hidden'}>
              <div className={assinaAtiva ? '' : 'blur-sm pointer-events-none select-none'}>
                <div className="flex items-start justify-between mb-5">
                  <div>
                    <h2 className="font-serif text-xl text-charcoal-700">Edição do Mês</h2>
                    <p className="text-sm text-charcoal-400 mt-0.5">{ultimaEdicao.titulo}</p>
                  </div>
                  <Badge variant="active">Nova</Badge>
                </div>

                <div className="space-y-4 mb-5">
                  {ultimaEdicao.cafes.map((cafe, i) => (
                    <div key={cafe.id} className="flex gap-3 p-3 bg-cream-50 rounded-sm">
                      <div className="w-10 h-10 bg-earth-200 rounded-sm flex items-center justify-center shrink-0">
                        <span className="text-earth-600 font-serif text-sm">{i + 1}</span>
                      </div>
                      <div>
                        <p className="font-medium text-sm text-charcoal-700">{cafe.nome}</p>
                        <p className="text-xs text-charcoal-400">{cafe.regiao} · {cafe.processo}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {cafe.notasSensoriais.slice(0, 3).map(n => (
                            <span key={n} className="text-xs text-charcoal-500">#{n}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <Link
                  to="/cliente/conteudo"
                  className="flex items-center gap-1.5 text-sm text-forest-500 font-medium hover:text-forest-600 group"
                >
                  Ver conteúdo exclusivo
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </Card>

            {/* Overlay para não-assinantes */}
            {!assinaAtiva && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 bg-cream-50/70 rounded-sm backdrop-blur-[1px]">
                <div className="w-12 h-12 bg-forest-100 rounded-full flex items-center justify-center mb-3">
                  <Lock size={20} className="text-forest-600" />
                </div>
                <h3 className="font-serif text-lg text-charcoal-700 mb-1">Conteúdo exclusivo</h3>
                <p className="text-sm text-charcoal-500 mb-4 max-w-xs">
                  Assine o clube Das Matas para receber as edições mensais e ter acesso a este conteúdo exclusivo.
                </p>
                <Link
                  to="/assinar"
                  className="px-5 py-2.5 bg-forest-500 text-cream-100 text-sm font-medium rounded-sm hover:bg-forest-600 transition-colors"
                >
                  Assinar agora
                </Link>
              </div>
            )}
          </div>
        ) : (
          <Card className="flex flex-col items-center justify-center py-10 text-center">
            <BookOpen size={40} className="text-charcoal-200 mb-3" />
            <p className="font-serif text-lg text-charcoal-600 mb-1">Nenhuma edição disponível</p>
            <p className="text-sm text-charcoal-400">As edições publicadas aparecem aqui.</p>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Último pedido */}
        {ultimoPedido ? (
          <Card>
            <div className="flex items-start justify-between mb-5">
              <h2 className="font-serif text-xl text-charcoal-700">Último Pedido</h2>
              <Badge variant={ultimoPedido.status === 'entregue' ? 'active' : ultimoPedido.status === 'enviado' ? 'gold' : 'pending'}>
                {ultimoPedido.status}
              </Badge>
            </div>

            <p className="text-sm font-medium text-charcoal-400 mb-1">{ultimoPedido.numero}</p>
            <div className="space-y-2 mb-4">
              {ultimoPedido.itens.map(item => (
                <div key={item.id} className="flex items-center justify-between text-sm">
                  <span className="text-charcoal-600">{item.produto.nome}</span>
                  <span className="text-charcoal-500">x{item.quantidade}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between text-sm border-t border-cream-200 pt-3">
              <span className="text-charcoal-500">Total</span>
              <span className="font-serif text-lg text-charcoal-700">R$ {ultimoPedido.total.toFixed(2)}</span>
            </div>

            <Link
              to="/cliente/pedidos"
              className="flex items-center gap-1.5 mt-4 text-sm text-forest-500 font-medium hover:text-forest-600 group"
            >
              Ver todos os pedidos
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </Card>
        ) : (
          <Card className="flex flex-col items-center justify-center py-10 text-center">
            <Package size={40} className="text-charcoal-200 mb-3" />
            <p className="font-serif text-lg text-charcoal-600 mb-1">Nenhum pedido ainda</p>
            <p className="text-sm text-charcoal-400 mb-4">Visite nossa loja e faça seu primeiro pedido.</p>
            <Link
              to="/loja"
              className="px-6 py-2.5 bg-forest-500 text-cream-100 text-sm font-medium rounded-sm hover:bg-forest-600 transition-colors"
            >
              Ir à loja
            </Link>
          </Card>
        )}

        {/* Ações rápidas */}
        <Card>
          <h2 className="font-serif text-xl text-charcoal-700 mb-5">Ações rápidas</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: <Package size={20} />, label: 'Nova compra', to: '/loja', color: 'bg-earth-100 text-earth-500' },
              { icon: <Star size={20} />, label: 'Avaliar café', to: '/cliente/avaliacoes', color: 'bg-gold-100 text-gold-500' },
              { icon: <Truck size={20} />, label: 'Rastrear envio', to: '/cliente/rastreamentos', color: 'bg-blue-100 text-blue-500' },
              { icon: <Calendar size={20} />, label: 'Reservar mesa', to: '/reservas', color: 'bg-forest-100 text-forest-500' },
              { icon: <BookOpen size={20} />, label: 'Conteúdo', to: '/cliente/conteudo', color: 'bg-earth-100 text-earth-500' },
              { icon: <ShoppingBag size={20} />, label: 'Meus pedidos', to: '/cliente/pedidos', color: 'bg-gold-100 text-gold-500' },
            ].map(action => (
              <Link
                key={action.to}
                to={action.to}
                className="flex flex-col items-center gap-2 p-4 rounded-sm border border-cream-200 hover:bg-cream-50 hover:border-cream-300 transition-all group"
              >
                <div className={`w-10 h-10 rounded-sm flex items-center justify-center ${action.color}`}>
                  {action.icon}
                </div>
                <span className="text-xs font-medium text-charcoal-600 text-center">{action.label}</span>
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
