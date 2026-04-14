import React, { useEffect, useState } from 'react';
import {
  TrendingUp, Users, ShoppingBag, Star, Calendar, Package,
  AlertTriangle, DollarSign, BarChart3, Coffee
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { StatCard, Card } from '../../components/ui';
import { getDashboardData } from '../../services/dashboard.service';
import { getPedidos } from '../../services/pedidos.service';
import { getReservas } from '../../services/reservas.service';
import type { DashboardData } from '../../services/dashboard.service';
import type { Pedido, Reserva } from '../../types';

const COLORS = ['#2D4A3E', '#C9A84C', '#8B5E3C', '#C4956A'];

export function AdminDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [reservas, setReservas] = useState<Reserva[]>([]);

  useEffect(() => {
    getDashboardData().then(setDashboardData).catch(console.error);
    getPedidos().then(setPedidos).catch(console.error);
    getReservas().then(setReservas).catch(console.error);
  }, []);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl text-charcoal-700">Dashboard</h1>
          <p className="text-charcoal-400 text-sm mt-1">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-forest-50 border border-forest-200 rounded-sm">
          <Coffee size={16} className="text-forest-500" />
          <span className="text-sm text-forest-600 font-medium">Das Matas</span>
        </div>
      </div>

      {/* Primary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Receita do Mês"
          value={`R$ ${((dashboardData?.receitaMensal ?? 0) / 1000).toFixed(1)}k`}
          subtitle="Abril 2026"
          icon={<DollarSign size={18} />}
          color="forest"
          trend={{ value: 14, label: 'vs mês anterior' }}
        />
        <StatCard
          title="Assinaturas Ativas"
          value={dashboardData?.assinaturasAtivas ?? 0}
          subtitle="Clube Das Matas"
          icon={<Star size={18} />}
          color="gold"
          trend={{ value: 5.8, label: 'vs mês anterior' }}
        />
        <StatCard
          title="Inadimplentes"
          value={dashboardData?.inadimplentes ?? 0}
          subtitle="Necessitam atenção"
          icon={<AlertTriangle size={18} />}
          color="red"
          trend={{ value: -2, label: 'vs mês anterior' }}
        />
        <StatCard
          title="Despesas"
          value={`R$ ${((dashboardData?.despesasMensais ?? 0) / 1000).toFixed(1)}k`}
          subtitle="Abril 2026"
          icon={<TrendingUp size={18} />}
          color="earth"
          trend={{ value: 9.3, label: 'vs mês anterior' }}
        />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { title: 'Pedidos Pendentes', value: dashboardData?.pedidosPendentes ?? 0, icon: <ShoppingBag size={16} />, color: 'text-gold-500 bg-gold-100' },
          { title: 'Reservas Hoje', value: dashboardData?.reservasHoje ?? 0, icon: <Calendar size={16} />, color: 'text-blue-500 bg-blue-100' },
          { title: 'Leads Novos', value: dashboardData?.leadsNovos ?? 0, icon: <Users size={16} />, color: 'text-forest-500 bg-forest-100' },
          { title: 'Estoque Baixo', value: 0, icon: <Package size={16} />, color: 'text-red-500 bg-red-100' },
        ].map(kpi => (
          <div key={kpi.title} className="bg-white rounded-sm border border-cream-200 p-4 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-sm flex items-center justify-center shrink-0 ${kpi.color}`}>
              {kpi.icon}
            </div>
            <div>
              <p className="text-2xl font-serif text-charcoal-700">{kpi.value}</p>
              <p className="text-xs text-charcoal-400">{kpi.title}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Receita x Despesa */}
        <Card className="lg:col-span-2" padding={false}>
          <div className="px-6 py-4 border-b border-cream-200">
            <h3 className="font-serif text-lg text-charcoal-700">Receita × Despesas</h3>
            <p className="text-xs text-charcoal-400 mt-0.5">Últimos 7 meses</p>
          </div>
          <div className="p-4">
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={dashboardData?.receitaPorMes ?? []}>
                <defs>
                  <linearGradient id="gradReceita" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2D4A3E" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2D4A3E" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradDespesa" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#C4956A" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#C4956A" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#EDE8E0" />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#A0A0A0' }} />
                <YAxis tick={{ fontSize: 11, fill: '#A0A0A0' }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => [`R$ ${v.toLocaleString('pt-BR')}`, '']} />
                <Legend />
                <Area type="monotone" dataKey="receita" name="Receita" stroke="#2D4A3E" fill="url(#gradReceita)" strokeWidth={2} />
                <Area type="monotone" dataKey="despesas" name="Despesas" stroke="#C4956A" fill="url(#gradDespesa)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Distribuição de planos */}
        <Card padding={false}>
          <div className="px-6 py-4 border-b border-cream-200">
            <h3 className="font-serif text-lg text-charcoal-700">Planos</h3>
            <p className="text-xs text-charcoal-400 mt-0.5">Distribuição de assinantes</p>
          </div>
          <div className="p-4">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={dashboardData?.planoDistribuicao ?? []}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  dataKey="value"
                >
                  {(dashboardData?.planoDistribuicao ?? []).map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 mt-2">
              {(dashboardData?.planoDistribuicao ?? []).map((item, i) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ background: COLORS[i] }} />
                    <span className="text-xs text-charcoal-600">{item.name}</span>
                  </div>
                  <span className="text-xs font-medium text-charcoal-700">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Evolução assinaturas */}
        <Card padding={false}>
          <div className="px-6 py-4 border-b border-cream-200">
            <h3 className="font-serif text-lg text-charcoal-700">Evolução das Assinaturas</h3>
          </div>
          <div className="p-4">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={dashboardData?.evolucaoAssinaturas ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EDE8E0" />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#A0A0A0' }} />
                <YAxis tick={{ fontSize: 11, fill: '#A0A0A0' }} />
                <Tooltip />
                <Bar dataKey="total" name="Assinantes" fill="#2D4A3E" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Fluxo de caixa */}
        <Card padding={false}>
          <div className="px-6 py-4 border-b border-cream-200">
            <h3 className="font-serif text-lg text-charcoal-700">Fluxo de Caixa</h3>
            <p className="text-xs text-charcoal-400 mt-0.5">Semanas de Abril/2026</p>
          </div>
          <div className="p-4">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={[]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EDE8E0" />
                <XAxis dataKey="semana" tick={{ fontSize: 11, fill: '#A0A0A0' }} />
                <YAxis tick={{ fontSize: 11, fill: '#A0A0A0' }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => [`R$ ${v.toLocaleString('pt-BR')}`, '']} />
                <Legend />
                <Bar dataKey="entradas" name="Entradas" fill="#2D4A3E" radius={[2, 2, 0, 0]} />
                <Bar dataKey="saidas" name="Saídas" fill="#C4956A" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pedidos recentes */}
        <Card padding={false}>
          <div className="px-6 py-4 border-b border-cream-200 flex items-center justify-between">
            <h3 className="font-serif text-lg text-charcoal-700">Pedidos recentes</h3>
            <a href="/admin/pedidos" className="text-xs text-forest-500 hover:text-forest-600">Ver todos →</a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-cream-50">
                  <th className="px-5 py-2.5 text-left text-xs text-charcoal-400 uppercase tracking-wider">Pedido</th>
                  <th className="px-5 py-2.5 text-left text-xs text-charcoal-400 uppercase tracking-wider">Cliente</th>
                  <th className="px-5 py-2.5 text-left text-xs text-charcoal-400 uppercase tracking-wider">Total</th>
                  <th className="px-5 py-2.5 text-left text-xs text-charcoal-400 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody>
                {pedidos.slice(0, 4).map(p => (
                  <tr key={p.id} className="border-t border-cream-100 hover:bg-cream-50 transition-colors">
                    <td className="px-5 py-3 text-xs text-charcoal-600">{p.numero}</td>
                    <td className="px-5 py-3 text-sm text-charcoal-700">{p.cliente?.name}</td>
                    <td className="px-5 py-3 text-sm font-medium text-charcoal-700">R$ {p.total.toFixed(2)}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        p.status === 'entregue' ? 'bg-forest-100 text-forest-600' :
                        p.status === 'enviado' ? 'bg-gold-100 text-gold-600' :
                        'bg-blue-100 text-blue-600'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Reservas do dia */}
        <Card padding={false}>
          <div className="px-6 py-4 border-b border-cream-200 flex items-center justify-between">
            <h3 className="font-serif text-lg text-charcoal-700">Reservas próximas</h3>
            <a href="/admin/reservas" className="text-xs text-forest-500 hover:text-forest-600">Ver todas →</a>
          </div>
          <div className="divide-y divide-cream-100">
            {reservas.slice(0, 4).map(r => (
              <div key={r.id} className="flex items-center justify-between px-5 py-3 hover:bg-cream-50 transition-colors">
                <div>
                  <p className="text-sm font-medium text-charcoal-700">{r.nome}</p>
                  <p className="text-xs text-charcoal-400">
                    {new Date(r.data).toLocaleDateString('pt-BR')} às {r.horario} · {r.pessoas} pessoas
                  </p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  r.status === 'confirmada' ? 'bg-forest-100 text-forest-600' :
                  r.status === 'solicitada' ? 'bg-gold-100 text-gold-600' :
                  'bg-charcoal-100 text-charcoal-500'
                }`}>
                  {r.status}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
