import React, { useEffect, useState, useCallback } from 'react';
import { BarChart3, Download, Filter, Loader2, UserCheck, UserX, Users, CalendarDays,
  TrendingUp, TrendingDown, Minus, Clock, Calendar } from 'lucide-react';
import {
  Card, Button, SectionHeader, Select,
} from '../../components/ui';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { getDashboardData } from '../../services/dashboard.service';
import type { DashboardData } from '../../services/dashboard.service';
import { getReservasPorPeriodo } from '../../services/reservas.service';
import type { Reserva } from '../../types';

const relatorios = [
  { id: 'vendas',        label: 'Vendas' },
  { id: 'assinaturas',   label: 'Assinaturas' },
  { id: 'inadimplencia', label: 'Inadimplência' },
  { id: 'leads',         label: 'Leads / CRM' },
  { id: 'reservas',      label: 'Reservas' },
  { id: 'financeiro',    label: 'Financeiro' },
  { id: 'produtos',      label: 'Produtos' },
  { id: 'avaliacoes',    label: 'Avaliações' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function hoje(): string { return new Date().toISOString().split('T')[0]; }
function primeiroDiaMes(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}
function fmtDate(s: string) {
  return new Date(s + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}
function fmtDateFull(s: string) {
  return new Date(s + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
}

const STATUS_LABEL: Record<string, string> = {
  solicitada: 'Solicitada', confirmada: 'Confirmada', recusada: 'Recusada',
  cancelada: 'Cancelada', concluida: 'Concluída', no_show: 'No-show',
};
const STATUS_COLOR_CLASS: Record<string, string> = {
  solicitada: 'bg-gold-100 text-gold-700', confirmada: 'bg-forest-100 text-forest-700',
  recusada: 'bg-red-100 text-red-600', cancelada: 'bg-charcoal-100 text-charcoal-500',
  concluida: 'bg-blue-100 text-blue-700', no_show: 'bg-red-100 text-red-500',
};

function exportCSV(reservas: Reserva[]) {
  const header = ['Nome', 'E-mail', 'Telefone', 'Data', 'Horário', 'Pessoas', 'Duração (min)', 'Status', 'Observações'];
  const rows = reservas.map(r => [
    r.nome, r.email, r.telefone,
    fmtDateFull(r.data), r.horario, r.pessoas, r.duracaoMins,
    STATUS_LABEL[r.status] ?? r.status,
    r.observacoes ?? '',
  ]);
  const csv = [header, ...rows].map(row =>
    row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
  ).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `reservas_${hoje()}.csv`; a.click();
  URL.revokeObjectURL(url);
}

const DIAS_SEMANA_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function periodoAnterior(inicio: string, fim: string) {
  const d1 = new Date(inicio + 'T12:00:00');
  const d2 = new Date(fim   + 'T12:00:00');
  const dias = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const antFim = new Date(d1); antFim.setDate(antFim.getDate() - 1);
  const antInicio = new Date(antFim); antInicio.setDate(antInicio.getDate() - dias + 1);
  return { inicio: antInicio.toISOString().split('T')[0], fim: antFim.toISOString().split('T')[0] };
}

function variacao(atual: number, anterior: number): { pct: number | null; sinal: 'up' | 'down' | 'neutral' } {
  if (anterior === 0 && atual === 0) return { pct: null, sinal: 'neutral' };
  if (anterior === 0) return { pct: null, sinal: 'up' };
  const p = Math.round(((atual - anterior) / anterior) * 100);
  return { pct: p, sinal: p > 0 ? 'up' : p < 0 ? 'down' : 'neutral' };
}

function pct(parte: number, total: number): number {
  return total === 0 ? 0 : Math.round((parte / total) * 100);
}

// ── Componente de Relatórios de Reservas ──────────────────────────────────────

function RelatorioReservas() {
  const [dataInicio, setDataInicio] = useState(primeiroDiaMes);
  const [dataFim, setDataFim]       = useState(hoje);
  const [reservas, setReservas]     = useState<Reserva[]>([]);
  const [reservasAnt, setReservasAnt] = useState<Reserva[]>([]);
  const [loading, setLoading]       = useState(false);
  const [gerado, setGerado]         = useState(false);

  const gerar = useCallback(async () => {
    if (!dataInicio || !dataFim) return;
    setLoading(true);
    try {
      const ant = periodoAnterior(dataInicio, dataFim);
      const [atual, anterior] = await Promise.all([
        getReservasPorPeriodo(dataInicio, dataFim),
        getReservasPorPeriodo(ant.inicio, ant.fim),
      ]);
      setReservas(atual);
      setReservasAnt(anterior);
      setGerado(true);
    } catch { alert('Erro ao carregar reservas.'); }
    finally { setLoading(false); }
  }, [dataInicio, dataFim]);

  // ── Dados derivados ────────────────────────────────────────────────────────

  // Relatório 1: count por dia
  const porDia = (() => {
    const map: Record<string, number> = {};
    reservas.forEach(r => { map[r.data] = (map[r.data] ?? 0) + 1; });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([data, total]) => ({
      data: fmtDate(data), total,
    }));
  })();

  const totalReservas    = reservas.length;
  const confirmadas      = reservas.filter(r => r.status === 'confirmada').length;
  const solicitadas      = reservas.filter(r => r.status === 'solicitada').length;
  const canceladas       = reservas.filter(r => r.status === 'cancelada' || r.status === 'recusada').length;

  // Relatório 2: presença por dia
  const comPresenca = reservas.filter(r => r.status === 'concluida' || r.status === 'no_show');
  const concluidas  = reservas.filter(r => r.status === 'concluida').length;
  const noShows     = reservas.filter(r => r.status === 'no_show').length;
  const taxaPresenca = comPresenca.length > 0
    ? Math.round((concluidas / comPresenca.length) * 100)
    : null;

  const presencaPorDia = (() => {
    const map: Record<string, { data: string; presente: number; no_show: number }> = {};
    reservas.filter(r => r.status === 'concluida' || r.status === 'no_show').forEach(r => {
      if (!map[r.data]) map[r.data] = { data: fmtDate(r.data), presente: 0, no_show: 0 };
      if (r.status === 'concluida') map[r.data].presente++;
      else map[r.data].no_show++;
    });
    return Object.values(map).sort((a, b) => a.data.localeCompare(b.data));
  })();

  const pieData = [
    { name: 'Presente', value: concluidas,  color: '#2D4A3E' },
    { name: 'No-show',  value: noShows,     color: '#DC2626' },
  ].filter(d => d.value > 0);

  // ── Indicadores (comparação com período anterior) ──────────────────────────
  const antTotal      = reservasAnt.length;
  const antPresencas  = reservasAnt.filter(r => r.status === 'concluida').length;
  const antLeads      = reservasAnt.filter(r => r.leadId).length;

  const totalLeads    = reservas.filter(r => r.leadId).length;
  const totalNovos    = reservas.filter(r => !r.leadId && !r.clienteId).length;

  const vTotal    = variacao(totalReservas, antTotal);
  const vPresenca = variacao(concluidas,    antPresencas);
  const vLeads    = variacao(totalLeads,    antLeads);

  const antPeriodo = periodoAnterior(dataInicio, dataFim);

  // ── Padrões ────────────────────────────────────────────────────────────────
  const porDiaSemana = (() => {
    const map: Record<number, number> = { 0:0, 1:0, 2:0, 3:0, 4:0, 5:0, 6:0 };
    reservas.forEach(r => {
      const dow = new Date(r.data + 'T12:00:00').getDay();
      map[dow] = (map[dow] ?? 0) + 1;
    });
    return DIAS_SEMANA_SHORT.map((dia, i) => ({ dia, total: map[i] ?? 0 }));
  })();

  const porDiaMes = (() => {
    const map: Record<number, number> = {};
    reservas.forEach(r => {
      const day = parseInt(r.data.split('-')[2]);
      map[day] = (map[day] ?? 0) + 1;
    });
    return Object.entries(map)
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .map(([dia, total]) => ({ dia: `Dia ${dia}`, total }));
  })();

  const porHorario = (() => {
    const map: Record<string, number> = {};
    reservas.forEach(r => {
      const hora = r.horario.substring(0, 5);
      map[hora] = (map[hora] ?? 0) + 1;
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([horario, total]) => ({ horario, total }));
  })();

  return (
    <div className="space-y-6">
      {/* Filtro de período */}
      <Card>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-medium text-charcoal-400 uppercase tracking-wider mb-1.5">De</label>
            <input
              type="date" value={dataInicio}
              onChange={e => { setDataInicio(e.target.value); setGerado(false); }}
              className="px-3 py-2 text-sm border border-cream-200 rounded-sm bg-white text-charcoal-700 focus:outline-none focus:ring-2 focus:ring-forest-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-charcoal-400 uppercase tracking-wider mb-1.5">Até</label>
            <input
              type="date" value={dataFim}
              onChange={e => { setDataFim(e.target.value); setGerado(false); }}
              className="px-3 py-2 text-sm border border-cream-200 rounded-sm bg-white text-charcoal-700 focus:outline-none focus:ring-2 focus:ring-forest-400"
            />
          </div>
          <Button variant="primary" onClick={gerar} disabled={loading || !dataInicio || !dataFim}>
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Filter size={14} />}
            Gerar relatório
          </Button>
          {gerado && reservas.length > 0 && (
            <Button variant="secondary" onClick={() => exportCSV(reservas)}>
              <Download size={14} /> Exportar CSV
            </Button>
          )}
        </div>
      </Card>

      {!gerado && !loading && (
        <Card className="text-center py-12">
          <CalendarDays size={40} className="text-charcoal-200 mx-auto mb-3" />
          <p className="text-sm text-charcoal-400">Selecione o período e clique em <strong>Gerar relatório</strong>.</p>
        </Card>
      )}

      {loading && (
        <Card className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-forest-500" />
        </Card>
      )}

      {gerado && !loading && (
        <>
          {/* ── RELATÓRIO 1: Quantidade por período ─────────────────────── */}
          <Card padding={false}>
            <div className="px-6 py-4 border-b border-cream-200">
              <h3 className="font-serif text-lg text-charcoal-700">Quantidade de reservas por período</h3>
              <p className="text-xs text-charcoal-400 mt-0.5">
                {new Date(dataInicio + 'T12:00:00').toLocaleDateString('pt-BR')} até{' '}
                {new Date(dataFim + 'T12:00:00').toLocaleDateString('pt-BR')}
              </p>
            </div>
            <div className="p-6 space-y-5">
              {/* KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Total',       value: totalReservas, icon: <Users size={16} />,     color: 'text-charcoal-700' },
                  { label: 'Confirmadas', value: confirmadas,   icon: <UserCheck size={16} />, color: 'text-forest-600' },
                  { label: 'Pendentes',   value: solicitadas,   icon: <Filter size={16} />,    color: 'text-gold-600' },
                  { label: 'Canceladas',  value: canceladas,    icon: <UserX size={16} />,     color: 'text-red-500' },
                ].map(k => (
                  <div key={k.label} className="bg-cream-50 rounded-sm p-4 flex items-center gap-3">
                    <span className={`${k.color} shrink-0`}>{k.icon}</span>
                    <div>
                      <p className={`font-serif text-2xl font-medium ${k.color}`}>{k.value}</p>
                      <p className="text-xs text-charcoal-400">{k.label}</p>
                    </div>
                  </div>
                ))}
              </div>

              {porDia.length === 0 ? (
                <p className="text-sm text-charcoal-400 text-center py-6">Nenhuma reserva neste período.</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={porDia} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EDE8E0" />
                    <XAxis dataKey="data" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: any) => [`${v}`, 'Reservas']} />
                    <Bar dataKey="total" name="Reservas" fill="#2D4A3E" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>

          {/* ── RELATÓRIO 2: Presença por período ───────────────────────── */}
          <Card padding={false}>
            <div className="px-6 py-4 border-b border-cream-200">
              <h3 className="font-serif text-lg text-charcoal-700">Presença confirmada / No-show</h3>
              <p className="text-xs text-charcoal-400 mt-0.5">Reservas com registro de comparecimento</p>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Com registro',   value: comPresenca.length, color: 'text-charcoal-700' },
                  { label: 'Presentes',      value: concluidas,         color: 'text-forest-600' },
                  { label: 'No-shows',       value: noShows,            color: 'text-red-500' },
                  { label: 'Taxa presença',  value: taxaPresenca !== null ? `${taxaPresenca}%` : '—', color: 'text-blue-600' },
                ].map(k => (
                  <div key={k.label} className="bg-cream-50 rounded-sm p-4">
                    <p className={`font-serif text-2xl font-medium ${k.color}`}>{k.value}</p>
                    <p className="text-xs text-charcoal-400 mt-0.5">{k.label}</p>
                  </div>
                ))}
              </div>

              {comPresenca.length === 0 ? (
                <p className="text-sm text-charcoal-400 text-center py-6">
                  Nenhuma reserva com registro de presença neste período.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
                  {/* Gráfico de pizza */}
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={pieData} cx="50%" cy="50%"
                        innerRadius={55} outerRadius={80}
                        paddingAngle={3} dataKey="value"
                        label={({ name, percent }) => `${name} ${Math.round((percent ?? 0) * 100)}%`}
                        labelLine={false}
                      >
                        {pieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: any) => [`${v}`, '']} />
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Gráfico de barras por dia */}
                  {presencaPorDia.length > 1 && (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={presencaPorDia} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#EDE8E0" />
                        <XAxis dataKey="data" tick={{ fontSize: 10 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                        <Bar dataKey="presente" name="Presente" fill="#2D4A3E" radius={[2, 2, 0, 0]} stackId="a" />
                        <Bar dataKey="no_show"  name="No-show"  fill="#DC2626" radius={[2, 2, 0, 0]} stackId="a" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              )}
            </div>
          </Card>

          {/* ── RELATÓRIO 3: Indicadores de tendência ───────────────────── */}
          <Card padding={false}>
            <div className="px-6 py-4 border-b border-cream-200">
              <h3 className="font-serif text-lg text-charcoal-700">Indicadores de tendência</h3>
              <p className="text-xs text-charcoal-400 mt-0.5">
                Comparando com período anterior ({new Date(antPeriodo.inicio + 'T12:00:00').toLocaleDateString('pt-BR')} a {new Date(antPeriodo.fim + 'T12:00:00').toLocaleDateString('pt-BR')})
              </p>
            </div>
            <div className="p-6 space-y-4">
              {/* Variações vs período anterior */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { label: 'Total de reservas',          atual: totalReservas, anterior: antTotal,     v: vTotal,    suffix: '' },
                  { label: 'Presenças confirmadas',      atual: concluidas,    anterior: antPresencas, v: vPresenca, suffix: '' },
                  { label: 'Reservas de leads',          atual: totalLeads,    anterior: antLeads,     v: vLeads,    suffix: '' },
                ].map(item => (
                  <div key={item.label} className="bg-cream-50 rounded-sm p-4">
                    <p className="text-xs text-charcoal-400 mb-2">{item.label}</p>
                    <div className="flex items-end gap-2">
                      <span className="font-serif text-2xl font-medium text-charcoal-700">{item.atual}</span>
                      {item.v.pct !== null ? (
                        <span className={`flex items-center gap-0.5 text-xs font-medium mb-0.5 ${item.v.sinal === 'up' ? 'text-forest-600' : item.v.sinal === 'down' ? 'text-red-500' : 'text-charcoal-400'}`}>
                          {item.v.sinal === 'up' ? <TrendingUp size={13} /> : item.v.sinal === 'down' ? <TrendingDown size={13} /> : <Minus size={13} />}
                          {item.v.pct > 0 ? '+' : ''}{item.v.pct}%
                        </span>
                      ) : item.v.sinal === 'up' ? (
                        <span className="flex items-center gap-0.5 text-xs font-medium mb-0.5 text-forest-600"><TrendingUp size={13} /> novo</span>
                      ) : null}
                    </div>
                    <p className="text-xs text-charcoal-400 mt-1">Anterior: {item.anterior}</p>
                  </div>
                ))}
              </div>

              {/* Perfil de clientes */}
              <div className="border-t border-cream-100 pt-4">
                <p className="text-xs font-medium text-charcoal-400 uppercase tracking-wider mb-3">Perfil dos clientes no período</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    {
                      label: 'Novos clientes',
                      valor: totalNovos,
                      pct: pct(totalNovos, totalReservas),
                      cor: 'text-blue-600',
                      bg: 'bg-blue-50',
                      desc: 'Sem cadastro e sem lead vinculado',
                    },
                    {
                      label: 'Clientes que são leads',
                      valor: totalLeads,
                      pct: pct(totalLeads, totalReservas),
                      cor: 'text-forest-600',
                      bg: 'bg-forest-50',
                      desc: 'Reservas com lead vinculado no CRM',
                    },
                    {
                      label: 'Clientes cadastrados',
                      valor: reservas.filter(r => r.clienteId && !r.leadId).length,
                      pct: pct(reservas.filter(r => r.clienteId && !r.leadId).length, totalReservas),
                      cor: 'text-gold-600',
                      bg: 'bg-gold-50',
                      desc: 'Com conta cadastrada no sistema',
                    },
                  ].map(item => (
                    <div key={item.label} className={`${item.bg} rounded-sm p-4`}>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs text-charcoal-500">{item.label}</p>
                        <span className={`font-serif text-lg font-semibold ${item.cor}`}>{item.pct}%</span>
                      </div>
                      <div className="w-full bg-white/60 rounded-full h-1.5 mb-2">
                        <div className={`h-1.5 rounded-full ${item.cor.replace('text-', 'bg-')}`} style={{ width: `${item.pct}%` }} />
                      </div>
                      <p className="text-xs text-charcoal-500">{item.valor} reserva{item.valor !== 1 ? 's' : ''}</p>
                      <p className="text-[10px] text-charcoal-400 mt-0.5">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          {/* ── RELATÓRIO 4: Padrões por dia/horário ─────────────────────── */}
          <Card padding={false}>
            <div className="px-6 py-4 border-b border-cream-200">
              <h3 className="font-serif text-lg text-charcoal-700">Padrões de reservas</h3>
              <p className="text-xs text-charcoal-400 mt-0.5">Dias da semana, dias do mês e horários com mais reservas</p>
            </div>
            <div className="p-6 space-y-8">

              {reservas.length === 0 ? (
                <p className="text-sm text-charcoal-400 text-center py-4">Nenhuma reserva neste período.</p>
              ) : (
                <>
                  {/* Por dia da semana */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Calendar size={15} className="text-charcoal-400" />
                      <p className="text-sm font-medium text-charcoal-600">Por dia da semana</p>
                    </div>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={porDiaSemana} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#EDE8E0" />
                        <XAxis dataKey="dia" tick={{ fontSize: 11 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(v: any) => [`${v}`, 'Reservas']} />
                        <Bar dataKey="total" name="Reservas" fill="#5C7A5A" radius={[3, 3, 0, 0]}>
                          {porDiaSemana.map((entry, i) => {
                            const max = Math.max(...porDiaSemana.map(d => d.total));
                            return <Cell key={i} fill={entry.total === max && max > 0 ? '#2D4A3E' : '#A8C5A0'} />;
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    {(() => {
                      const max = Math.max(...porDiaSemana.map(d => d.total));
                      const pico = porDiaSemana.filter(d => d.total === max && max > 0);
                      return max > 0 ? (
                        <p className="text-xs text-charcoal-400 mt-1">
                          Pico: <strong className="text-charcoal-600">{pico.map(d => d.dia).join(', ')}</strong> ({max} reserva{max !== 1 ? 's' : ''})
                        </p>
                      ) : null;
                    })()}
                  </div>

                  {/* Por dia do mês */}
                  {porDiaMes.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <CalendarDays size={15} className="text-charcoal-400" />
                        <p className="text-sm font-medium text-charcoal-600">Por dia do mês</p>
                      </div>
                      <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={porDiaMes} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#EDE8E0" />
                          <XAxis dataKey="dia" tick={{ fontSize: 10 }} interval={0} angle={-45} textAnchor="end" height={40} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                          <Tooltip formatter={(v: any) => [`${v}`, 'Reservas']} />
                          <Bar dataKey="total" name="Reservas" fill="#A8C5A0" radius={[3, 3, 0, 0]}>
                            {porDiaMes.map((entry, i) => {
                              const max = Math.max(...porDiaMes.map(d => d.total));
                              return <Cell key={i} fill={entry.total === max && max > 0 ? '#2D4A3E' : '#A8C5A0'} />;
                            })}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Por horário */}
                  {porHorario.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Clock size={15} className="text-charcoal-400" />
                        <p className="text-sm font-medium text-charcoal-600">Por horário</p>
                      </div>
                      <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={porHorario} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#EDE8E0" />
                          <XAxis dataKey="horario" tick={{ fontSize: 10 }} interval={0} angle={-45} textAnchor="end" height={40} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                          <Tooltip formatter={(v: any) => [`${v}`, 'Reservas']} />
                          <Bar dataKey="total" name="Reservas" fill="#C4A882" radius={[3, 3, 0, 0]}>
                            {porHorario.map((entry, i) => {
                              const max = Math.max(...porHorario.map(d => d.total));
                              return <Cell key={i} fill={entry.total === max && max > 0 ? '#8B6914' : '#C4A882'} />;
                            })}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                      {(() => {
                        const max = Math.max(...porHorario.map(d => d.total));
                        const pico = porHorario.filter(d => d.total === max && max > 0);
                        return max > 0 ? (
                          <p className="text-xs text-charcoal-400 mt-1">
                            Horário(s) de pico: <strong className="text-charcoal-600">{pico.map(d => d.horario).join(', ')}</strong> ({max} reserva{max !== 1 ? 's' : ''})
                          </p>
                        ) : null;
                      })()}
                    </div>
                  )}
                </>
              )}
            </div>
          </Card>

          {/* ── RELATÓRIO 5: Dados completos por período ─────────────────── */}
          <Card padding={false}>
            <div className="px-6 py-4 border-b border-cream-200 flex items-center justify-between">
              <div>
                <h3 className="font-serif text-lg text-charcoal-700">Dados de todas as reservas</h3>
                <p className="text-xs text-charcoal-400 mt-0.5">{totalReservas} registro{totalReservas !== 1 ? 's' : ''} encontrado{totalReservas !== 1 ? 's' : ''}</p>
              </div>
              {reservas.length > 0 && (
                <Button variant="secondary" size="sm" onClick={() => exportCSV(reservas)}>
                  <Download size={13} /> CSV
                </Button>
              )}
            </div>

            {reservas.length === 0 ? (
              <p className="text-sm text-charcoal-400 text-center py-10">Nenhuma reserva neste período.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-cream-200 bg-cream-50">
                      {['Nome', 'E-mail', 'Telefone', 'Data', 'Horário', 'Pessoas', 'Duração', 'Status', 'Observações'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-medium text-charcoal-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reservas.map((r, i) => (
                      <tr key={r.id} className={`border-b border-cream-100 ${i % 2 === 0 ? 'bg-white' : 'bg-cream-50/40'}`}>
                        <td className="px-4 py-3 font-medium text-charcoal-700 whitespace-nowrap">{r.nome}</td>
                        <td className="px-4 py-3 text-charcoal-500">{r.email || '—'}</td>
                        <td className="px-4 py-3 text-charcoal-500 whitespace-nowrap">{r.telefone || '—'}</td>
                        <td className="px-4 py-3 text-charcoal-600 whitespace-nowrap">{fmtDateFull(r.data)}</td>
                        <td className="px-4 py-3 text-charcoal-600 whitespace-nowrap">{r.horario}</td>
                        <td className="px-4 py-3 text-charcoal-600 text-center">{r.pessoas}</td>
                        <td className="px-4 py-3 text-charcoal-500 whitespace-nowrap">{r.duracaoMins} min</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR_CLASS[r.status] ?? 'bg-cream-100 text-charcoal-600'}`}>
                            {STATUS_LABEL[r.status] ?? r.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-charcoal-400 max-w-xs truncate">{r.observacoes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export function AdminRelatorios() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [selectedRelatorio, setSelectedRelatorio] = useState('vendas');
  const [periodo, setPeriodo] = useState('abril_2026');

  useEffect(() => {
    getDashboardData().then(setDashboardData).catch(console.error);
  }, []);

  const isOutro = selectedRelatorio !== 'vendas' && selectedRelatorio !== 'assinaturas' && selectedRelatorio !== 'reservas';

  return (
    <div className="space-y-6 animate-fade-in">
      <SectionHeader title="Relatórios" subtitle="Central de relatórios do sistema" />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <Card padding={false}>
            <div className="p-4 border-b border-cream-200">
              <p className="text-xs font-medium text-charcoal-400 uppercase tracking-wider">Relatórios</p>
            </div>
            <div className="py-2">
              {relatorios.map(r => (
                <button
                  key={r.id}
                  onClick={() => setSelectedRelatorio(r.id)}
                  className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-colors ${
                    selectedRelatorio === r.id
                      ? 'bg-forest-50 text-forest-600 font-medium'
                      : 'text-charcoal-500 hover:bg-cream-50'
                  }`}
                >
                  <BarChart3 size={14} />
                  {r.label}
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* Content */}
        <div className="lg:col-span-3 space-y-5">

          {/* ── VENDAS ───────────────────────────────────────────────────── */}
          {selectedRelatorio === 'vendas' && (
            <>
              <Card className="flex flex-wrap items-center gap-3">
                <Filter size={16} className="text-charcoal-400" />
                <Select
                  value={periodo}
                  onChange={e => setPeriodo(e.target.value)}
                  options={[
                    { value: 'abril_2026', label: 'Abril 2026' },
                    { value: 'marco_2026', label: 'Março 2026' },
                    { value: 'q1_2026', label: 'Q1 2026' },
                    { value: 'anual_2026', label: 'Anual 2026' },
                  ]}
                  className="w-40"
                />
                <Button variant="secondary" size="sm"><Download size={14} /> Exportar CSV</Button>
              </Card>
              <div className="space-y-5">
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'Total de pedidos', value: '23' },
                    { label: 'Receita de vendas', value: 'R$ 2.847' },
                    { label: 'Ticket médio', value: 'R$ 123,78' },
                  ].map(s => (
                    <Card key={s.label} className="text-center">
                      <p className="font-serif text-2xl text-charcoal-700">{s.value}</p>
                      <p className="text-xs text-charcoal-400 mt-1">{s.label}</p>
                    </Card>
                  ))}
                </div>
                <Card padding={false}>
                  <div className="px-6 py-4 border-b border-cream-200">
                    <h3 className="font-serif text-lg text-charcoal-700">Vendas por mês</h3>
                  </div>
                  <div className="p-4">
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={dashboardData?.receitaPorMes ?? []}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#EDE8E0" />
                        <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                        <Tooltip formatter={(v: any) => [`R$ ${Number(v ?? 0).toLocaleString('pt-BR')}`, '']} />
                        <Bar dataKey="receita" name="Receita" fill="#2D4A3E" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </div>
            </>
          )}

          {/* ── ASSINATURAS ──────────────────────────────────────────────── */}
          {selectedRelatorio === 'assinaturas' && (
            <>
              <Card className="flex flex-wrap items-center gap-3">
                <Filter size={16} className="text-charcoal-400" />
                <Select
                  value={periodo}
                  onChange={e => setPeriodo(e.target.value)}
                  options={[
                    { value: 'abril_2026', label: 'Abril 2026' },
                    { value: 'marco_2026', label: 'Março 2026' },
                    { value: 'q1_2026', label: 'Q1 2026' },
                    { value: 'anual_2026', label: 'Anual 2026' },
                  ]}
                  className="w-40"
                />
              </Card>
              <div className="space-y-5">
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'Assinantes ativos', value: '127' },
                    { label: 'Churn rate', value: '2.3%' },
                    { label: 'MRR', value: 'R$ 16.891' },
                  ].map(s => (
                    <Card key={s.label} className="text-center">
                      <p className="font-serif text-2xl text-charcoal-700">{s.value}</p>
                      <p className="text-xs text-charcoal-400 mt-1">{s.label}</p>
                    </Card>
                  ))}
                </div>
                <Card padding={false}>
                  <div className="px-6 py-4 border-b border-cream-200">
                    <h3 className="font-serif text-lg text-charcoal-700">Evolução das assinaturas</h3>
                  </div>
                  <div className="p-4">
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={dashboardData?.evolucaoAssinaturas ?? []}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#EDE8E0" />
                        <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Line type="monotone" dataKey="total" name="Assinantes" stroke="#2D4A3E" strokeWidth={2} dot={{ fill: '#2D4A3E' }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </div>
            </>
          )}

          {/* ── RESERVAS ─────────────────────────────────────────────────── */}
          {selectedRelatorio === 'reservas' && <RelatorioReservas />}

          {/* ── PLACEHOLDER outros ───────────────────────────────────────── */}
          {isOutro && (
            <Card className="text-center py-16">
              <BarChart3 size={48} className="text-charcoal-200 mx-auto mb-4" />
              <p className="font-serif text-xl text-charcoal-500 mb-2">
                Relatório: {relatorios.find(r => r.id === selectedRelatorio)?.label}
              </p>
              <p className="text-sm text-charcoal-400 mb-4">
                Selecione um período e clique em gerar relatório.
              </p>
              <Button variant="primary">Gerar relatório</Button>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
