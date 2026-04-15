import React, { useEffect, useState } from 'react';
import {
  TrendingUp, Users, ShoppingBag, Star, Calendar, Package,
  AlertTriangle, DollarSign, ArrowUpRight, ArrowDownRight,
  ArrowRight,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Link } from 'react-router-dom';
import { getDashboardData } from '../../services/dashboard.service';
import { getPedidos } from '../../services/pedidos.service';
import { getReservas } from '../../services/reservas.service';
import { useAuth } from '../../contexts/AuthContext';
import type { DashboardData } from '../../services/dashboard.service';
import type { Pedido, Reserva } from '../../types';

const PIE_COLORS = ['#2D4A3E', '#C9A84C', '#8B5E3C', '#C4956A'];

type EditorialKPI = {
  tag: string;
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: number;
  trendLabel?: string;
  accent: 'forest' | 'gold' | 'earth' | 'red';
  icon: React.ReactNode;
};

function EditorialKPI({ kpi, index }: { kpi: EditorialKPI; index: number }) {
  const accentClass = {
    forest: 'text-forest-500',
    gold: 'text-gold-500',
    earth: 'text-earth-500',
    red: 'text-red-500',
  }[kpi.accent];
  const ruleClass = {
    forest: 'bg-forest-500',
    gold: 'bg-gold-400',
    earth: 'bg-earth-400',
    red: 'bg-red-400',
  }[kpi.accent];

  const trendPositive = (kpi.trend ?? 0) >= 0;

  return (
    <div
      className="group relative bg-white border border-cream-200 rounded-sm p-6 flex flex-col gap-4 overflow-hidden hover:border-charcoal-300 transition-colors"
      style={{ animation: `slideUp 0.7s ${0.05 + index * 0.06}s both` }}
    >
      {/* top marker row */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className={`h-px w-5 ${ruleClass}`} />
          <span className="font-mono text-[9px] tracking-[0.35em] uppercase text-charcoal-400">
            {kpi.tag}
          </span>
        </div>
        <div className={`${accentClass} opacity-80`}>{kpi.icon}</div>
      </div>

      {/* title */}
      <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-charcoal-500">
        {kpi.title}
      </p>

      {/* big editorial number */}
      <div className="flex items-baseline gap-1 -mt-1">
        <span className="font-editorial text-[44px] leading-[1] tracking-tight text-charcoal-700">
          {kpi.value}
        </span>
      </div>

      {/* trend + subtitle */}
      <div className="flex items-center justify-between pt-3 border-t border-cream-200">
        {kpi.trend !== undefined ? (
          <div
            className={`flex items-center gap-1 text-[11px] font-mono tracking-[0.15em] uppercase ${
              trendPositive ? 'text-forest-500' : 'text-red-500'
            }`}
          >
            {trendPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            <span>
              {Math.abs(kpi.trend)}% {kpi.trendLabel ?? ''}
            </span>
          </div>
        ) : (
          <span />
        )}
        {kpi.subtitle && (
          <span className="font-display italic text-xs text-charcoal-400">
            {kpi.subtitle}
          </span>
        )}
      </div>
    </div>
  );
}

function SectionHead({
  number,
  eyebrow,
  title,
  action,
}: {
  number: string;
  eyebrow: string;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between mb-5">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <span className="font-mono text-[10px] tracking-[0.35em] uppercase text-earth-500">
            Nº {number}
          </span>
          <span className="h-px w-8 bg-earth-400/70" />
          <span className="font-mono text-[10px] tracking-[0.35em] uppercase text-charcoal-400">
            {eyebrow}
          </span>
        </div>
        <h2 className="font-editorial text-[26px] md:text-[30px] leading-[1.05] tracking-tight text-charcoal-700">
          {title}
        </h2>
      </div>
      {action}
    </div>
  );
}

export function AdminDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const { user } = useAuth();
  const firstName = user?.name?.split(' ')[0] ?? 'casa';

  useEffect(() => {
    getDashboardData().then(setDashboardData).catch(console.error);
    getPedidos().then(setPedidos).catch(console.error);
    getReservas().then(setReservas).catch(console.error);
  }, []);

  const now = new Date();
  const dateLong = now.toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  const dateShort = now.toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long',
  });
  const weekday = now.toLocaleDateString('pt-BR', { weekday: 'long' });

  const primaryKPIs: EditorialKPI[] = [
    {
      tag: '01',
      title: 'Receita do mês',
      value: `R$ ${((dashboardData?.receitaMensal ?? 0) / 1000).toFixed(1)}k`,
      subtitle: 'Abril · 26',
      trend: 14,
      trendLabel: 'mês anterior',
      accent: 'forest',
      icon: <DollarSign size={16} />,
    },
    {
      tag: '02',
      title: 'Assinaturas ativas',
      value: dashboardData?.assinaturasAtivas ?? 0,
      subtitle: 'Clube Das Matas',
      trend: 5.8,
      trendLabel: 'mês anterior',
      accent: 'gold',
      icon: <Star size={16} />,
    },
    {
      tag: '03',
      title: 'Inadimplentes',
      value: dashboardData?.inadimplentes ?? 0,
      subtitle: 'Atenção',
      trend: -2,
      trendLabel: 'mês anterior',
      accent: 'red',
      icon: <AlertTriangle size={16} />,
    },
    {
      tag: '04',
      title: 'Despesas do mês',
      value: `R$ ${((dashboardData?.despesasMensais ?? 0) / 1000).toFixed(1)}k`,
      subtitle: 'Abril · 26',
      trend: 9.3,
      trendLabel: 'mês anterior',
      accent: 'earth',
      icon: <TrendingUp size={16} />,
    },
  ];

  const secondary = [
    { title: 'Pedidos pendentes', value: dashboardData?.pedidosPendentes ?? 0, icon: <ShoppingBag size={14} />, tone: 'gold' },
    { title: 'Reservas hoje', value: dashboardData?.reservasHoje ?? 0, icon: <Calendar size={14} />, tone: 'forest' },
    { title: 'Leads novos', value: dashboardData?.leadsNovos ?? 0, icon: <Users size={14} />, tone: 'earth' },
    { title: 'Estoque baixo', value: 0, icon: <Package size={14} />, tone: 'red' },
  ] as const;

  const toneClasses = {
    gold: 'text-gold-500',
    forest: 'text-forest-500',
    earth: 'text-earth-500',
    red: 'text-red-500',
  };

  return (
    <div className="space-y-10 animate-fade-in">
      {/* ========== HERO ========== */}
      <header className="relative flex flex-col md:flex-row md:items-end md:justify-between gap-6 pb-6 border-b border-cream-300/70">
        <div className="max-w-3xl">
          <div className="flex items-center gap-3 mb-3">
            <span className="font-mono text-[10px] tracking-[0.35em] uppercase text-earth-500">
              Painel geral
            </span>
            <span className="h-px w-10 bg-gold-400" />
            <span className="font-mono text-[10px] tracking-[0.35em] uppercase text-charcoal-400">
              {dateShort} · {weekday}
            </span>
          </div>
          <h1 className="font-editorial text-[54px] md:text-[68px] leading-[0.95] tracking-tight text-charcoal-700">
            Bom dia,
            <span className="font-display italic text-earth-500"> {firstName}</span>.
          </h1>
          <p className="font-display italic text-lg text-charcoal-400 mt-3">
            Uma visão calma sobre o movimento de hoje — {dateLong}.
          </p>
        </div>

        <div className="flex flex-col items-start md:items-end gap-3">
          <Link
            to="/admin/relatorios"
            className="group inline-flex items-center gap-2 px-4 py-2.5 bg-forest-700 hover:bg-forest-600 text-cream-100 rounded-sm font-mono text-[11px] tracking-[0.3em] uppercase transition-colors"
          >
            Relatório completo
            <ArrowRight
              size={13}
              className="transition-transform duration-300 group-hover:translate-x-0.5"
            />
          </Link>
          <div className="flex items-center gap-4 font-mono text-[10px] tracking-[0.25em] uppercase text-charcoal-400">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-forest-400 animate-pulse" />
              Sistema online
            </div>
            <span>v2.6</span>
          </div>
        </div>
      </header>

      {/* ========== PRIMARY KPIS ========== */}
      <section>
        <SectionHead
          number="01"
          eyebrow="Indicadores"
          title="Principais métricas do mês"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {primaryKPIs.map((kpi, i) => (
            <EditorialKPI key={kpi.tag} kpi={kpi} index={i} />
          ))}
        </div>
      </section>

      {/* ========== SECONDARY RIBBON ========== */}
      <section>
        <div className="bg-white border border-cream-200 rounded-sm overflow-hidden">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-cream-200">
            {secondary.map(s => (
              <div
                key={s.title}
                className="group flex items-center justify-between gap-4 px-5 py-5 hover:bg-cream-50 transition-colors"
              >
                <div className="min-w-0">
                  <p className="font-mono text-[9px] tracking-[0.3em] uppercase text-charcoal-400 mb-1.5">
                    {s.title}
                  </p>
                  <p className="font-editorial text-[32px] leading-none text-charcoal-700 tracking-tight">
                    {s.value}
                  </p>
                </div>
                <div className={`${toneClasses[s.tone]} opacity-70 group-hover:opacity-100 transition-opacity shrink-0`}>
                  {s.icon}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== CHARTS ROW 1 ========== */}
      <section>
        <SectionHead
          number="02"
          eyebrow="Performance"
          title="Receita × Despesas e composição dos planos"
        />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* area chart */}
          <div className="lg:col-span-2 bg-white border border-cream-200 rounded-sm overflow-hidden">
            <div className="flex items-start justify-between px-6 py-5 border-b border-cream-200">
              <div>
                <p className="font-mono text-[9px] tracking-[0.3em] uppercase text-charcoal-400">
                  Últimos 7 meses
                </p>
                <h3 className="font-editorial text-[22px] leading-tight text-charcoal-700 mt-1">
                  Receita <span className="font-display italic text-earth-500">×</span> Despesas
                </h3>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-forest-500" />
                  <span className="font-mono text-[10px] tracking-wider uppercase text-charcoal-500">
                    Receita
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-earth-400" />
                  <span className="font-mono text-[10px] tracking-wider uppercase text-charcoal-500">
                    Despesas
                  </span>
                </div>
              </div>
            </div>
            <div className="p-4">
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={dashboardData?.receitaPorMes ?? []} margin={{ left: -10, right: 10 }}>
                  <defs>
                    <linearGradient id="gradReceita" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2D4A3E" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#2D4A3E" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradDespesa" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#C4956A" stopOpacity={0.32} />
                      <stop offset="95%" stopColor="#C4956A" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="2 4" stroke="#EDE8E0" vertical={false} />
                  <XAxis dataKey="mes" tick={{ fontSize: 10, fill: '#A0A0A0' }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#A0A0A0' }}
                    tickFormatter={v => `${(v / 1000).toFixed(0)}k`}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: '#FEFCF9',
                      border: '1px solid #EDE8E0',
                      borderRadius: '2px',
                      fontSize: '12px',
                    }}
                    formatter={(v: unknown) => [`R$ ${Number(v ?? 0).toLocaleString('pt-BR')}`, '']}
                  />
                  <Area type="monotone" dataKey="receita" name="Receita" stroke="#2D4A3E" fill="url(#gradReceita)" strokeWidth={2} />
                  <Area type="monotone" dataKey="despesas" name="Despesas" stroke="#C4956A" fill="url(#gradDespesa)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* pie */}
          <div className="bg-white border border-cream-200 rounded-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-cream-200">
              <p className="font-mono text-[9px] tracking-[0.3em] uppercase text-charcoal-400">
                Distribuição · Abril
              </p>
              <h3 className="font-editorial text-[22px] leading-tight text-charcoal-700 mt-1">
                Planos
              </h3>
            </div>
            <div className="p-4">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={dashboardData?.planoDistribuicao ?? []}
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={78}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {(dashboardData?.planoDistribuicao ?? []).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: '#FEFCF9',
                      border: '1px solid #EDE8E0',
                      borderRadius: '2px',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {(dashboardData?.planoDistribuicao ?? []).map((item, i) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between py-1.5 border-b border-cream-100 last:border-0"
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                      />
                      <span className="font-display italic text-sm text-charcoal-600">
                        {item.name}
                      </span>
                    </div>
                    <span className="font-editorial text-base text-charcoal-700">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========== CHARTS ROW 2 ========== */}
      <section>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white border border-cream-200 rounded-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-cream-200">
              <p className="font-mono text-[9px] tracking-[0.3em] uppercase text-charcoal-400">
                Crescimento
              </p>
              <h3 className="font-editorial text-[22px] leading-tight text-charcoal-700 mt-1">
                Evolução das <span className="font-display italic text-earth-500">assinaturas</span>
              </h3>
            </div>
            <div className="p-4">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={dashboardData?.evolucaoAssinaturas ?? []} margin={{ left: -10, right: 10 }}>
                  <CartesianGrid strokeDasharray="2 4" stroke="#EDE8E0" vertical={false} />
                  <XAxis dataKey="mes" tick={{ fontSize: 10, fill: '#A0A0A0' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#A0A0A0' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: '#FEFCF9',
                      border: '1px solid #EDE8E0',
                      borderRadius: '2px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="total" name="Assinantes" fill="#2D4A3E" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white border border-cream-200 rounded-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-cream-200">
              <p className="font-mono text-[9px] tracking-[0.3em] uppercase text-charcoal-400">
                Semanas · Abril 26
              </p>
              <h3 className="font-editorial text-[22px] leading-tight text-charcoal-700 mt-1">
                Fluxo de caixa
              </h3>
            </div>
            <div className="p-4">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={[]} margin={{ left: -10, right: 10 }}>
                  <CartesianGrid strokeDasharray="2 4" stroke="#EDE8E0" vertical={false} />
                  <XAxis dataKey="semana" tick={{ fontSize: 10, fill: '#A0A0A0' }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#A0A0A0' }}
                    tickFormatter={v => `${(v / 1000).toFixed(0)}k`}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: '#FEFCF9',
                      border: '1px solid #EDE8E0',
                      borderRadius: '2px',
                      fontSize: '12px',
                    }}
                  />
                  <Legend iconType="square" wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="entradas" name="Entradas" fill="#2D4A3E" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="saidas" name="Saídas" fill="#C4956A" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </section>

      {/* ========== TABLES ========== */}
      <section>
        <SectionHead
          number="03"
          eyebrow="Atividade"
          title="Últimos movimentos da casa"
        />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* pedidos */}
          <div className="bg-white border border-cream-200 rounded-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-cream-200">
              <div>
                <p className="font-mono text-[9px] tracking-[0.3em] uppercase text-charcoal-400">
                  Últimos 4
                </p>
                <h3 className="font-editorial text-lg text-charcoal-700 mt-0.5">
                  Pedidos recentes
                </h3>
              </div>
              <Link
                to="/admin/pedidos"
                className="group inline-flex items-center gap-1 font-mono text-[10px] tracking-[0.25em] uppercase text-earth-500 hover:text-earth-700 transition-colors"
              >
                Ver todos
                <ArrowRight size={12} className="transition-transform duration-300 group-hover:translate-x-0.5" />
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left font-mono text-[9px] tracking-[0.3em] uppercase text-charcoal-400 border-b border-cream-200">
                      Pedido
                    </th>
                    <th className="px-6 py-3 text-left font-mono text-[9px] tracking-[0.3em] uppercase text-charcoal-400 border-b border-cream-200">
                      Cliente
                    </th>
                    <th className="px-6 py-3 text-right font-mono text-[9px] tracking-[0.3em] uppercase text-charcoal-400 border-b border-cream-200">
                      Total
                    </th>
                    <th className="px-6 py-3 text-right font-mono text-[9px] tracking-[0.3em] uppercase text-charcoal-400 border-b border-cream-200">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pedidos.slice(0, 4).map(p => (
                    <tr
                      key={p.id}
                      className="border-b border-cream-100 last:border-0 hover:bg-cream-50/60 transition-colors"
                    >
                      <td className="px-6 py-3.5 font-mono text-[11px] tracking-wider text-charcoal-500">
                        {p.numero}
                      </td>
                      <td className="px-6 py-3.5 font-display italic text-[15px] text-charcoal-700">
                        {p.cliente?.name}
                      </td>
                      <td className="px-6 py-3.5 text-right font-editorial text-[17px] text-charcoal-700">
                        R$ {p.total.toFixed(2)}
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-mono text-[9px] tracking-[0.2em] uppercase ${
                            p.status === 'entregue'
                              ? 'bg-forest-100 text-forest-600'
                              : p.status === 'enviado'
                              ? 'bg-gold-100 text-gold-600'
                              : 'bg-blue-100 text-blue-600'
                          }`}
                        >
                          <span className="w-1 h-1 rounded-full bg-current" />
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* reservas */}
          <div className="bg-white border border-cream-200 rounded-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-cream-200">
              <div>
                <p className="font-mono text-[9px] tracking-[0.3em] uppercase text-charcoal-400">
                  Próximas
                </p>
                <h3 className="font-editorial text-lg text-charcoal-700 mt-0.5">
                  Reservas da casa
                </h3>
              </div>
              <Link
                to="/admin/reservas"
                className="group inline-flex items-center gap-1 font-mono text-[10px] tracking-[0.25em] uppercase text-earth-500 hover:text-earth-700 transition-colors"
              >
                Ver todas
                <ArrowRight size={12} className="transition-transform duration-300 group-hover:translate-x-0.5" />
              </Link>
            </div>
            <div className="divide-y divide-cream-100">
              {reservas.slice(0, 4).map(r => {
                const d = new Date(r.data);
                const dia = d.getDate().toString().padStart(2, '0');
                const mes = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
                return (
                  <div
                    key={r.id}
                    className="flex items-center gap-5 px-6 py-4 hover:bg-cream-50/60 transition-colors"
                  >
                    {/* date block */}
                    <div className="shrink-0 w-14 text-center border border-cream-300 rounded-sm py-1">
                      <div className="font-editorial text-[22px] leading-none text-charcoal-700">
                        {dia}
                      </div>
                      <div className="font-mono text-[8px] tracking-[0.3em] uppercase text-earth-500 mt-0.5">
                        {mes}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-display italic text-[15px] text-charcoal-700 truncate">
                        {r.nome}
                      </p>
                      <p className="font-mono text-[10px] tracking-[0.15em] uppercase text-charcoal-400 mt-0.5">
                        {r.horario} · {r.pessoas} pessoas
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-mono text-[9px] tracking-[0.2em] uppercase ${
                        r.status === 'confirmada'
                          ? 'bg-forest-100 text-forest-600'
                          : r.status === 'solicitada'
                          ? 'bg-gold-100 text-gold-600'
                          : 'bg-charcoal-100 text-charcoal-500'
                      }`}
                    >
                      <span className="w-1 h-1 rounded-full bg-current" />
                      {r.status}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ========== FOOTER SIGNATURE ========== */}
      <footer className="pt-6 border-t border-cream-300/70 flex flex-col md:flex-row md:items-center md:justify-between gap-3 font-mono text-[10px] tracking-[0.25em] uppercase text-charcoal-400">
        <span>© Das Matas · Painel administrativo</span>
        <span className="flex items-center gap-2">
          <span className="w-1 h-1 rounded-full bg-gold-400" />
          Mantiqueira · MG · Brasil
        </span>
      </footer>
    </div>
  );
}
