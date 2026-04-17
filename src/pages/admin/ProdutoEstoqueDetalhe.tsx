/**
 * ProdutoEstoqueDetalhe
 * Painel lateral (drawer) exibido ao clicar em um produto na aba de estoque.
 * Mostra: indicadores, histórico de movimentações, alertas, previsão de uso,
 * data/quantidade sugerida para próxima compra e ações rápidas de ajuste.
 */
import React, { useEffect, useState } from 'react';
import {
  X, Package, AlertTriangle, TrendingUp, TrendingDown, ArrowDown, ArrowUp,
  Clock, ShoppingCart, BarChart2, Minus, RefreshCw, Calendar, Layers,
} from 'lucide-react';
import { getMovimentacoes, getEstatisticasProduto } from '../../services/produtos.service';
import type { EstatisticasProduto } from '../../services/produtos.service';
import type { Produto, ProdutoMetricas, MovimentacaoEstoque } from '../../types';

// ---- helper formatters ----
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}
function fmtDateShort(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}
function fmtMes(yyyymm: string) {
  const [y, m] = yyyymm.split('-');
  const names = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${names[parseInt(m) - 1]}/${y.slice(2)}`;
}
function addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const TIPO_CONFIG: Record<string, { label: string; cor: string; icone: React.ReactNode }> = {
  entrada:    { label: 'Entrada',    cor: 'text-forest-600 bg-forest-50',  icone: <ArrowDown size={11} /> },
  saida:      { label: 'Saída',      cor: 'text-red-600 bg-red-50',        icone: <ArrowUp   size={11} /> },
  ajuste:     { label: 'Ajuste',     cor: 'text-blue-600 bg-blue-50',      icone: <RefreshCw size={11} /> },
  inventario: { label: 'Inventário', cor: 'text-purple-600 bg-purple-50',  icone: <Layers    size={11} /> },
  perda:      { label: 'Perda',      cor: 'text-amber-600 bg-amber-50',    icone: <TrendingDown size={11} /> },
  venda:      { label: 'Venda',      cor: 'text-charcoal-600 bg-cream-100', icone: <ShoppingCart size={11} /> },
};

interface Props {
  metricas: ProdutoMetricas;
  onClose: () => void;
  onAjustar: (p: Produto) => void;
}

export function ProdutoEstoqueDetalhe({ metricas: m, onClose, onAjustar }: Props) {
  const [movs, setMovs] = useState<MovimentacaoEstoque[]>([]);
  const [stats, setStats] = useState<EstatisticasProduto | null>(null);
  const [loadingMovs, setLoadingMovs] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [tabDetalhe, setTabDetalhe] = useState<'historico' | 'vendas' | 'previsao'>('historico');

  useEffect(() => {
    setLoadingMovs(true);
    getMovimentacoes(m.id, 60)
      .then(setMovs)
      .finally(() => setLoadingMovs(false));

    setLoadingStats(true);
    getEstatisticasProduto(m.id, 6)
      .then(setStats)
      .finally(() => setLoadingStats(false));
  }, [m.id]);

  // ─── Indicadores ────────────────────────────────────────────────────────────
  const statusColors = {
    critico: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', bar: 'bg-red-500' },
    baixo:   { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200', bar: 'bg-amber-400' },
    ok:      { bg: 'bg-forest-100', text: 'text-forest-700', border: 'border-forest-200', bar: 'bg-forest-500' },
    acima:   { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', bar: 'bg-blue-400' },
  };
  const sc = statusColors[m.status];
  const pct = Math.min((m.estoque / Math.max(m.estoqueMinimo * 5, 1)) * 100, 100);

  // ─── Previsão ────────────────────────────────────────────────────────────────
  // Data estimada de esgotamento com estoque atual
  const dataEsgotamento = m.diasRestantes !== null ? addDays(m.diasRestantes) : null;
  // Data sugerida de próxima compra: 7 dias antes do esgotamento (lead time padrão)
  const diasParaCompra = m.diasRestantes !== null ? Math.max(0, m.diasRestantes - 7) : null;
  const dataProximaCompra = diasParaCompra !== null ? addDays(diasParaCompra) : null;
  // Quantidade sugerida para 45 dias de cobertura
  const qtdSugerida = m.sugestao;

  // ─── Resumo movimentações ───────────────────────────────────────────────────
  const entradasTotal = movs.filter(v => v.tipo === 'entrada').reduce((a, v) => a + v.quantidade, 0);
  const saidasTotal   = movs.filter(v => ['saida', 'venda', 'perda'].includes(v.tipo)).reduce((a, v) => a + v.quantidade, 0);
  const ajustesTotal  = movs.filter(v => ['ajuste', 'inventario'].includes(v.tipo)).length;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-charcoal-700/50 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <div className="relative w-full max-w-2xl h-full bg-white shadow-2xl flex flex-col overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-cream-200 bg-cream-50 shrink-0">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-earth-100 flex items-center justify-center shrink-0 mt-0.5">
              <Package size={16} className="text-earth-500" />
            </div>
            <div className="min-w-0">
              <p className="font-mono text-[9px] tracking-[0.3em] uppercase text-charcoal-400">Detalhe de Estoque</p>
              <h2 className="font-editorial text-xl text-charcoal-700 truncate">{m.nome}</h2>
              <p className="font-mono text-xs text-charcoal-400 mt-0.5">{m.sku}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-4">
            <button
              onClick={() => onAjustar(m)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-forest-700 bg-forest-100 hover:bg-forest-200 rounded-sm transition-colors"
            >
              <BarChart2 size={12} /> Ajustar
            </button>
            <button onClick={onClose} className="text-charcoal-400 hover:text-charcoal-700 transition-colors p-1">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">

          {/* ── KPI Cards ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-6 pb-0">
            {/* Estoque */}
            <div className={`rounded-sm border p-4 ${sc.bg} ${sc.border}`}>
              <p className="font-mono text-[9px] tracking-[0.3em] uppercase text-charcoal-500 mb-1">Estoque</p>
              <p className={`text-3xl font-light ${sc.text}`}>{m.estoque}</p>
              <p className="text-xs text-charcoal-400 mt-1">unidades</p>
              <div className="w-full h-1 bg-white/60 rounded-full mt-2 overflow-hidden">
                <div className={`h-full rounded-full ${sc.bar}`} style={{ width: `${pct}%` }} />
              </div>
            </div>
            {/* Mínimo */}
            <div className="rounded-sm border border-cream-200 p-4 bg-white">
              <p className="font-mono text-[9px] tracking-[0.3em] uppercase text-charcoal-400 mb-1">Mínimo</p>
              <p className="text-3xl font-light text-charcoal-700">{m.estoqueMinimo}</p>
              <p className="text-xs text-charcoal-400 mt-1">unidades</p>
            </div>
            {/* Dias restantes */}
            <div className={`rounded-sm border border-cream-200 p-4 ${m.diasRestantes !== null && m.diasRestantes < 14 ? 'bg-red-50 border-red-200' : 'bg-white'}`}>
              <p className="font-mono text-[9px] tracking-[0.3em] uppercase text-charcoal-400 mb-1">Cobertura</p>
              <p className={`text-3xl font-light ${m.diasRestantes !== null && m.diasRestantes < 14 ? 'text-red-600' : 'text-charcoal-700'}`}>
                {m.diasRestantes ?? '∞'}
              </p>
              <p className="text-xs text-charcoal-400 mt-1">dias restantes</p>
            </div>
            {/* Vendas/mês */}
            <div className="rounded-sm border border-cream-200 p-4 bg-white">
              <p className="font-mono text-[9px] tracking-[0.3em] uppercase text-charcoal-400 mb-1">Vendas/mês</p>
              <p className="text-3xl font-light text-charcoal-700">{m.vendas30d}</p>
              <p className="text-xs text-charcoal-400 mt-1">
                {m.velocidadeDia > 0 ? `≈ ${m.velocidadeDia.toFixed(1)} un/dia` : 'sem histórico'}
              </p>
            </div>
          </div>

          {/* ── Alertas ── */}
          {(m.status === 'critico' || m.status === 'baixo' || (m.diasRestantes !== null && m.diasRestantes < 21)) && (
            <div className="px-6 mt-4">
              <div className={`flex items-start gap-3 p-4 rounded-sm border ${
                m.status === 'critico'
                  ? 'bg-red-50 border-red-200 text-red-700'
                  : 'bg-amber-50 border-amber-200 text-amber-700'
              }`}>
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <div className="text-sm">
                  {m.status === 'critico' && (
                    <><strong>Estoque crítico!</strong> O estoque está abaixo do mínimo ({m.estoqueMinimo} un). Faça uma compra urgente.</>
                  )}
                  {m.status === 'baixo' && (
                    <><strong>Estoque baixo.</strong> Menos de 1,5× o mínimo. Planeje uma reposição em breve.</>
                  )}
                  {m.status !== 'critico' && m.status !== 'baixo' && m.diasRestantes !== null && m.diasRestantes < 21 && (
                    <><strong>Cobertura curta.</strong> Com o ritmo atual, o estoque dura {m.diasRestantes} dias.</>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Tabs ── */}
          <div className="px-6 mt-6">
            <div className="flex items-center gap-1 border-b border-cream-200">
              {(['historico', 'vendas', 'previsao'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTabDetalhe(t)}
                  className={`px-4 py-2.5 text-xs font-mono tracking-[0.2em] uppercase transition-colors border-b-2 -mb-px ${
                    tabDetalhe === t
                      ? 'border-forest-500 text-forest-700'
                      : 'border-transparent text-charcoal-400 hover:text-charcoal-600'
                  }`}
                >
                  {t === 'historico' ? 'Histórico' : t === 'vendas' ? 'Vendas' : 'Previsão'}
                </button>
              ))}
            </div>
          </div>

          {/* ── Tab: Histórico de movimentações ── */}
          {tabDetalhe === 'historico' && (
            <div className="px-6 py-4">
              {/* Resumo rápido */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="p-3 bg-forest-50 rounded-sm text-center">
                  <p className="text-xs font-mono text-charcoal-400 uppercase tracking-wider mb-1">Entradas</p>
                  <p className="text-xl font-semibold text-forest-700">+{entradasTotal}</p>
                </div>
                <div className="p-3 bg-red-50 rounded-sm text-center">
                  <p className="text-xs font-mono text-charcoal-400 uppercase tracking-wider mb-1">Saídas</p>
                  <p className="text-xl font-semibold text-red-700">-{saidasTotal}</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-sm text-center">
                  <p className="text-xs font-mono text-charcoal-400 uppercase tracking-wider mb-1">Ajustes</p>
                  <p className="text-xl font-semibold text-blue-700">{ajustesTotal}</p>
                </div>
              </div>

              {loadingMovs ? (
                <div className="flex justify-center py-8">
                  <RefreshCw size={20} className="animate-spin text-charcoal-400" />
                </div>
              ) : movs.length === 0 ? (
                <div className="text-center py-10">
                  <Clock size={28} className="text-charcoal-300 mx-auto mb-2" />
                  <p className="text-sm text-charcoal-400">Nenhuma movimentação registrada ainda.</p>
                  <p className="text-xs text-charcoal-300 mt-1">As próximas entradas e saídas aparecerão aqui.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {movs.map(mov => {
                    const cfg = TIPO_CONFIG[mov.tipo] ?? TIPO_CONFIG.ajuste;
                    const diff = mov.estoqueDepois - mov.estoqueAntes;
                    return (
                      <div key={mov.id} className="flex items-start gap-3 p-3 border border-cream-200 rounded-sm bg-white hover:bg-cream-50 transition-colors">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium shrink-0 ${cfg.cor}`}>
                          {cfg.icone} {cfg.label}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium text-charcoal-700">
                              {diff > 0 ? '+' : ''}{diff} un
                              <span className="text-xs text-charcoal-400 font-normal ml-2">
                                {mov.estoqueAntes} → {mov.estoqueDepois}
                              </span>
                            </span>
                            <span className="text-xs text-charcoal-400 shrink-0">{fmtDate(mov.createdAt)}</span>
                          </div>
                          {mov.observacao && (
                            <p className="text-xs text-charcoal-500 mt-0.5 truncate">{mov.observacao}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Tab: Estatísticas de Vendas ── */}
          {tabDetalhe === 'vendas' && (
            <div className="px-6 py-4">
              {loadingStats ? (
                <div className="flex justify-center py-8">
                  <RefreshCw size={20} className="animate-spin text-charcoal-400" />
                </div>
              ) : !stats ? (
                <p className="text-sm text-charcoal-400 text-center py-8">Erro ao carregar estatísticas.</p>
              ) : (
                <div className="space-y-5">
                  {/* KPIs */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 border border-cream-200 rounded-sm bg-white">
                      <p className="font-mono text-[9px] tracking-[0.3em] uppercase text-charcoal-400 mb-1">Unidades vendidas</p>
                      <p className="text-2xl font-semibold text-charcoal-700">{stats.totalVendas}</p>
                      <p className="text-xs text-charcoal-400 mt-0.5">últimos 6 meses</p>
                    </div>
                    <div className="p-4 border border-cream-200 rounded-sm bg-white">
                      <p className="font-mono text-[9px] tracking-[0.3em] uppercase text-charcoal-400 mb-1">Receita gerada</p>
                      <p className="text-2xl font-semibold text-charcoal-700">
                        R$ {stats.receitaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-charcoal-400 mt-0.5">últimos 6 meses</p>
                    </div>
                    <div className="p-4 border border-cream-200 rounded-sm bg-white">
                      <p className="font-mono text-[9px] tracking-[0.3em] uppercase text-charcoal-400 mb-1">Pedidos</p>
                      <p className="text-2xl font-semibold text-charcoal-700">{stats.totalPedidos}</p>
                      <p className="text-xs text-charcoal-400 mt-0.5">pedidos incluindo este item</p>
                    </div>
                    <div className="p-4 border border-cream-200 rounded-sm bg-white">
                      <p className="font-mono text-[9px] tracking-[0.3em] uppercase text-charcoal-400 mb-1">Média por pedido</p>
                      <p className="text-2xl font-semibold text-charcoal-700">{stats.mediaUnidadesPorPedido.toFixed(1)}</p>
                      <p className="text-xs text-charcoal-400 mt-0.5">unidades/pedido</p>
                    </div>
                  </div>

                  {/* Gráfico de barras por mês */}
                  {stats.vendasPorMes.length > 0 && (
                    <div>
                      <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-charcoal-400 mb-3">Vendas por mês</p>
                      <div className="space-y-2">
                        {(() => {
                          const maxUn = Math.max(...stats.vendasPorMes.map(v => v.unidades), 1);
                          return stats.vendasPorMes.map(v => (
                            <div key={v.mes} className="flex items-center gap-3">
                              <span className="font-mono text-xs text-charcoal-400 w-14 shrink-0">{fmtMes(v.mes)}</span>
                              <div className="flex-1 bg-cream-100 rounded-full h-5 overflow-hidden">
                                <div
                                  className="h-full bg-forest-400 rounded-full flex items-center px-2 transition-all duration-500"
                                  style={{ width: `${(v.unidades / maxUn) * 100}%` }}
                                >
                                  {v.unidades > 0 && (
                                    <span className="text-xs text-white font-medium whitespace-nowrap">{v.unidades} un</span>
                                  )}
                                </div>
                              </div>
                              <span className="font-mono text-xs text-charcoal-500 w-20 text-right shrink-0">
                                R$ {v.receita.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                              </span>
                            </div>
                          ));
                        })()}
                      </div>
                    </div>
                  )}

                  {stats.ultimaVenda && (
                    <p className="text-xs text-charcoal-400 flex items-center gap-1.5">
                      <Clock size={12} />
                      Última venda: {fmtDateShort(stats.ultimaVenda)}
                    </p>
                  )}

                  {stats.totalVendas === 0 && (
                    <div className="text-center py-6">
                      <TrendingDown size={24} className="text-charcoal-300 mx-auto mb-2" />
                      <p className="text-sm text-charcoal-400">Nenhuma venda registrada nos últimos 6 meses.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Tab: Previsão ── */}
          {tabDetalhe === 'previsao' && (
            <div className="px-6 py-4 space-y-5">
              {m.velocidadeDia === 0 ? (
                <div className="text-center py-8">
                  <BarChart2 size={28} className="text-charcoal-300 mx-auto mb-2" />
                  <p className="text-sm text-charcoal-400">Sem dados de venda suficientes para calcular previsão.</p>
                  <p className="text-xs text-charcoal-300 mt-1">Registre vendas para ativar as previsões automáticas.</p>
                </div>
              ) : (
                <>
                  {/* Timeline de previsão */}
                  <div className="space-y-3">
                    <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-charcoal-400">Projeção de uso</p>

                    {[7, 14, 30, 45, 60].map(dias => {
                      const estoqueEmDias = Math.max(0, m.estoque - Math.round(m.velocidadeDia * dias));
                      const pctRestante = Math.min((estoqueEmDias / Math.max(m.estoque, 1)) * 100, 100);
                      const status = estoqueEmDias <= 0 ? 'esgotado' : estoqueEmDias <= m.estoqueMinimo ? 'critico' : 'ok';
                      return (
                        <div key={dias} className="flex items-center gap-3">
                          <div className="w-16 shrink-0 text-right">
                            <span className="text-xs font-mono text-charcoal-500">+{dias}d</span>
                          </div>
                          <div className="flex-1 bg-cream-100 h-6 rounded-sm overflow-hidden">
                            {status !== 'esgotado' ? (
                              <div
                                className={`h-full flex items-center px-2 transition-all duration-500 ${
                                  status === 'critico' ? 'bg-red-400' : 'bg-forest-400'
                                }`}
                                style={{ width: `${pctRestante}%` }}
                              >
                                <span className="text-xs text-white font-medium">{estoqueEmDias} un</span>
                              </div>
                            ) : (
                              <div className="h-full w-full flex items-center px-2 bg-red-100">
                                <span className="text-xs text-red-600 font-medium">Esgotado</span>
                              </div>
                            )}
                          </div>
                          <div className="w-20 shrink-0">
                            <span className="text-xs text-charcoal-400">{addDays(dias)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Recomendação de compra */}
                  <div className="p-4 bg-cream-50 border border-cream-200 rounded-sm space-y-3">
                    <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-charcoal-400">Recomendação de compra</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-charcoal-500 mb-0.5">Data sugerida</p>
                        <div className="flex items-center gap-1.5">
                          <Calendar size={14} className="text-earth-500" />
                          <span className="font-medium text-charcoal-700 text-sm">
                            {dataProximaCompra ?? '—'}
                          </span>
                        </div>
                        {diasParaCompra !== null && (
                          <p className="text-xs text-charcoal-400 mt-0.5">
                            {diasParaCompra === 0 ? 'Comprar hoje!' : `em ${diasParaCompra} dias`}
                          </p>
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-charcoal-500 mb-0.5">Quantidade sugerida</p>
                        <div className="flex items-center gap-1.5">
                          <ShoppingCart size={14} className="text-earth-500" />
                          <span className="font-medium text-charcoal-700 text-sm">
                            {qtdSugerida > 0 ? `${qtdSugerida} unidades` : 'Sem necessidade'}
                          </span>
                        </div>
                        <p className="text-xs text-charcoal-400 mt-0.5">para 45 dias de cobertura</p>
                      </div>
                    </div>
                    {dataEsgotamento && (
                      <p className="text-xs text-charcoal-500 border-t border-cream-200 pt-3 flex items-center gap-1.5">
                        <AlertTriangle size={11} className={m.diasRestantes! < 14 ? 'text-red-500' : 'text-amber-500'} />
                        Estoque atual dura até <strong>{dataEsgotamento}</strong>
                        {m.diasRestantes! < 14 && (
                          <span className="ml-1 px-1.5 py-0.5 bg-red-100 text-red-600 text-xs rounded-full">Urgente</span>
                        )}
                      </p>
                    )}
                  </div>

                  {/* Velocidade */}
                  <div className="p-3 bg-white border border-cream-200 rounded-sm flex items-center gap-3">
                    <TrendingUp size={16} className="text-forest-500 shrink-0" />
                    <div className="text-sm">
                      <span className="text-charcoal-600">Velocidade de consumo: </span>
                      <strong className="text-charcoal-700">{m.velocidadeDia.toFixed(2)} un/dia</strong>
                      <span className="text-charcoal-400"> · </span>
                      <strong className="text-charcoal-700">{m.vendas30d} un</strong>
                      <span className="text-charcoal-400"> nos últimos 30 dias</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Espaço final */}
          <div className="h-6" />
        </div>
      </div>
    </div>
  );
}
