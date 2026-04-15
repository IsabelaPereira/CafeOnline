import React, { useEffect, useState, useCallback } from 'react';
import {
  ClipboardList, ChevronDown, ChevronRight, Search,
  Filter, RefreshCw, Download, User, Calendar, Database,
  Plus, Edit, Trash2, AlertCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Card, SectionHeader, Button, SearchBar } from '../../components/ui';

// ── Tipos ────────────────────────────────────────────────────
interface AuditLog {
  id: string;
  usuario_id: string | null;
  usuario_nome: string | null;
  usuario_email: string | null;
  operacao: 'INSERT' | 'UPDATE' | 'DELETE';
  tabela: string;
  registro_id: string | null;
  dados_antes: Record<string, unknown> | null;
  dados_depois: Record<string, unknown> | null;
  criado_em: string;
}

// ── Mapeamento de tabelas → label legível ─────────────────────
const TABELA_LABEL: Record<string, string> = {
  leads:                'CRM · Leads',
  clientes:             'CRM · Clientes',
  enderecos:            'Endereços',
  pedidos:              'Pedidos',
  itens_pedido:         'Itens de Pedido',
  assinaturas:          'Assinaturas',
  cobrancas_assinatura: 'Cobranças',
  ciclos_assinatura:    'Ciclos',
  planos:               'Planos',
  produtos:             'Produtos',
  categorias_produto:   'Categorias de Produto',
  posts_blog:           'Blog',
  reservas:             'Reservas',
  mesas:                'Mesas',
  edicoes_clube:        'Edições do Clube',
  cafes_edicao:         'Cafés da Edição',
  configuracoes:        'Configurações',
  contas_receber:       'Contas a Receber',
  contas_pagar:         'Contas a Pagar',
  profiles:             'Perfis de Usuário',
  interacoes_crm:       'Interações CRM',
};

const OP_CONFIG = {
  INSERT: { label: 'Criação',  icon: <Plus   size={11} />, bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  UPDATE: { label: 'Edição',   icon: <Edit   size={11} />, bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200'    },
  DELETE: { label: 'Exclusão', icon: <Trash2 size={11} />, bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200'     },
} as const;

const TABELAS_FILTER = Object.entries(TABELA_LABEL).map(([v, l]) => ({ value: v, label: l }));

// ── Helpers ───────────────────────────────────────────────────
function formatDate(iso: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).format(new Date(iso));
}

function shortId(id: string | null) {
  if (!id) return '—';
  return id.length > 8 ? id.slice(0, 8) + '…' : id;
}

/** Converte um valor JSON para string legível */
function renderValue(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'boolean') return v ? 'sim' : 'não';
  if (Array.isArray(v)) return v.length ? v.join(', ') : '[]';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

/** Campos que normalmente não têm interesse visual no diff */
const SKIP_FIELDS = new Set(['updated_at', 'created_at', 'id']);

// ── Componente de diff ────────────────────────────────────────
function DiffView({ log }: { log: AuditLog }) {
  if (log.operacao === 'INSERT' && log.dados_depois) {
    const entries = Object.entries(log.dados_depois).filter(([k]) => !SKIP_FIELDS.has(k));
    if (!entries.length) return <p className="text-xs text-charcoal-400 italic">Sem campos para exibir.</p>;
    return (
      <div className="space-y-1">
        {entries.map(([k, v]) => (
          <div key={k} className="flex gap-2 text-xs">
            <span className="w-40 shrink-0 font-mono text-charcoal-400 truncate">{k}</span>
            <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded break-all">{renderValue(v)}</span>
          </div>
        ))}
      </div>
    );
  }

  if (log.operacao === 'DELETE' && log.dados_antes) {
    const entries = Object.entries(log.dados_antes).filter(([k]) => !SKIP_FIELDS.has(k));
    if (!entries.length) return <p className="text-xs text-charcoal-400 italic">Sem campos para exibir.</p>;
    return (
      <div className="space-y-1">
        {entries.map(([k, v]) => (
          <div key={k} className="flex gap-2 text-xs">
            <span className="w-40 shrink-0 font-mono text-charcoal-400 truncate">{k}</span>
            <span className="text-red-700 bg-red-50 px-1.5 py-0.5 rounded line-through break-all">{renderValue(v)}</span>
          </div>
        ))}
      </div>
    );
  }

  if (log.operacao === 'UPDATE' && log.dados_antes && log.dados_depois) {
    const keys = Array.from(
      new Set([...Object.keys(log.dados_antes), ...Object.keys(log.dados_depois)])
    ).filter(k => !SKIP_FIELDS.has(k));
    if (!keys.length) return <p className="text-xs text-charcoal-400 italic">Nenhuma alteração relevante.</p>;
    return (
      <div className="space-y-1.5">
        {keys.map(k => (
          <div key={k} className="text-xs">
            <span className="font-mono text-charcoal-500 mr-2">{k}</span>
            <div className="flex flex-wrap gap-1 mt-0.5">
              <span className="text-red-700 bg-red-50 px-1.5 py-0.5 rounded line-through break-all">
                {renderValue(log.dados_antes![k])}
              </span>
              <span className="text-charcoal-400">→</span>
              <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded break-all">
                {renderValue(log.dados_depois![k])}
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return <p className="text-xs text-charcoal-400 italic">Sem dados registrados.</p>;
}

// ── Linha de log ──────────────────────────────────────────────
function LogRow({ log }: { log: AuditLog }) {
  const [expanded, setExpanded] = useState(false);
  const op = OP_CONFIG[log.operacao];
  const tabelaLabel = TABELA_LABEL[log.tabela] ?? log.tabela;

  const changedCount = log.operacao === 'UPDATE' && log.dados_depois
    ? Object.keys(log.dados_depois).filter(k => !SKIP_FIELDS.has(k)).length
    : log.operacao === 'INSERT' && log.dados_depois
      ? Object.keys(log.dados_depois).filter(k => !SKIP_FIELDS.has(k)).length
      : log.dados_antes
        ? Object.keys(log.dados_antes).filter(k => !SKIP_FIELDS.has(k)).length
        : 0;

  return (
    <>
      <tr
        className={`border-b border-cream-100 hover:bg-cream-50 cursor-pointer transition-colors ${expanded ? 'bg-cream-50' : ''}`}
        onClick={() => setExpanded(e => !e)}
      >
        {/* Expandir */}
        <td className="py-3 pl-4 pr-2 w-8 text-charcoal-400">
          {expanded
            ? <ChevronDown size={14} />
            : <ChevronRight size={14} />
          }
        </td>

        {/* Data/hora */}
        <td className="py-3 px-3 whitespace-nowrap">
          <span className="font-mono text-xs text-charcoal-600">{formatDate(log.criado_em)}</span>
        </td>

        {/* Usuário */}
        <td className="py-3 px-3">
          {log.usuario_nome ? (
            <div>
              <p className="text-sm text-charcoal-700 font-medium leading-none">{log.usuario_nome}</p>
              <p className="text-xs text-charcoal-400 mt-0.5">{log.usuario_email ?? ''}</p>
            </div>
          ) : (
            <span className="text-xs text-charcoal-400 italic">Sistema</span>
          )}
        </td>

        {/* Operação */}
        <td className="py-3 px-3">
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border ${op.bg} ${op.text} ${op.border}`}>
            {op.icon}
            {op.label}
          </span>
        </td>

        {/* Módulo */}
        <td className="py-3 px-3">
          <span className="text-sm text-charcoal-700">{tabelaLabel}</span>
        </td>

        {/* Registro */}
        <td className="py-3 px-3">
          <span className="font-mono text-xs text-charcoal-400" title={log.registro_id ?? ''}>
            {shortId(log.registro_id)}
          </span>
        </td>

        {/* Resumo */}
        <td className="py-3 px-3 pr-4">
          <span className="text-xs text-charcoal-500">
            {changedCount > 0 ? `${changedCount} campo${changedCount !== 1 ? 's' : ''}` : '—'}
          </span>
        </td>
      </tr>

      {/* Linha expandida com diff */}
      {expanded && (
        <tr className="bg-cream-50 border-b border-cream-200">
          <td colSpan={7} className="px-8 py-4">
            <div className="max-w-3xl">
              <p className="font-mono text-[10px] tracking-[0.25em] uppercase text-charcoal-400 mb-3">
                Detalhes da alteração
              </p>
              <DiffView log={log} />
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ── Página principal ──────────────────────────────────────────
const PAGE_SIZE = 50;

export function AdminLogs() {
  const [logs, setLogs]         = useState<AuditLog[]>([]);
  const [loading, setLoading]   = useState(true);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(0);

  // Filtros
  const [search, setSearch]         = useState('');
  const [filtroOp, setFiltroOp]     = useState('');
  const [filtroTabela, setFiltroTabela] = useState('');
  const [filtroUser, setFiltroUser] = useState('');
  const [filtroDataDe, setFiltroDataDe] = useState('');
  const [filtroDataAte, setFiltroDataAte] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const fetchLogs = useCallback(async (resetPage = false) => {
    setLoading(true);
    const p = resetPage ? 0 : page;
    if (resetPage) setPage(0);

    let q = supabase
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .order('criado_em', { ascending: false })
      .range(p * PAGE_SIZE, p * PAGE_SIZE + PAGE_SIZE - 1);

    if (filtroOp)     q = q.eq('operacao', filtroOp);
    if (filtroTabela) q = q.eq('tabela', filtroTabela);
    if (filtroUser)   q = q.ilike('usuario_nome', `%${filtroUser}%`);
    if (filtroDataDe) q = q.gte('criado_em', filtroDataDe);
    if (filtroDataAte) q = q.lte('criado_em', filtroDataAte + 'T23:59:59');

    const { data, error, count } = await q;
    if (!error && data) {
      setLogs(data as AuditLog[]);
      setTotal(count ?? 0);
    }
    setLoading(false);
  }, [page, filtroOp, filtroTabela, filtroUser, filtroDataDe, filtroDataAte]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  function handleFilterChange(fn: () => void) {
    fn();
    setPage(0);
  }

  function exportCSV() {
    const headers = ['Data/Hora','Usuário','Email','Operação','Tabela','Registro ID'];
    const rows = logs.map(l => [
      formatDate(l.criado_em),
      l.usuario_nome ?? 'Sistema',
      l.usuario_email ?? '',
      l.operacao,
      TABELA_LABEL[l.tabela] ?? l.tabela,
      l.registro_id ?? '',
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_logs_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const activeFilters = [filtroOp, filtroTabela, filtroUser, filtroDataDe, filtroDataAte].filter(Boolean).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <SectionHeader
        title="Logs de Auditoria"
        subtitle={`${total.toLocaleString('pt-BR')} registro${total !== 1 ? 's' : ''} encontrado${total !== 1 ? 's' : ''}`}
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchLogs(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm border border-cream-200 rounded-sm text-charcoal-500 hover:border-forest-300 hover:text-forest-600 transition-colors"
              title="Atualizar"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={exportCSV}
              className="flex items-center gap-1.5 px-3 py-2 text-sm border border-cream-200 rounded-sm text-charcoal-500 hover:border-forest-300 hover:text-forest-600 transition-colors"
            >
              <Download size={14} />
              Exportar CSV
            </button>
          </div>
        }
      />

      {/* Barra de filtros */}
      <Card padding={false}>
        <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-cream-100">
          {/* Busca por usuário */}
          <div className="relative">
            <User size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-charcoal-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Usuário…"
              value={filtroUser}
              onChange={e => handleFilterChange(() => setFiltroUser(e.target.value))}
              className="pl-7 pr-3 py-1.5 text-sm border border-cream-200 rounded-sm bg-white text-charcoal-700 focus:outline-none focus:ring-1 focus:ring-forest-400 w-44"
            />
          </div>

          {/* Operação */}
          <select
            value={filtroOp}
            onChange={e => handleFilterChange(() => setFiltroOp(e.target.value))}
            className="px-2 py-1.5 text-sm border border-cream-200 rounded-sm bg-white text-charcoal-700 focus:outline-none focus:ring-1 focus:ring-forest-400"
          >
            <option value="">Todas as operações</option>
            <option value="INSERT">Criação</option>
            <option value="UPDATE">Edição</option>
            <option value="DELETE">Exclusão</option>
          </select>

          {/* Módulo */}
          <select
            value={filtroTabela}
            onChange={e => handleFilterChange(() => setFiltroTabela(e.target.value))}
            className="px-2 py-1.5 text-sm border border-cream-200 rounded-sm bg-white text-charcoal-700 focus:outline-none focus:ring-1 focus:ring-forest-400"
          >
            <option value="">Todos os módulos</option>
            {TABELAS_FILTER.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>

          {/* Data de */}
          <div className="flex items-center gap-1.5">
            <Calendar size={13} className="text-charcoal-400" />
            <input
              type="date"
              value={filtroDataDe}
              onChange={e => handleFilterChange(() => setFiltroDataDe(e.target.value))}
              className="px-2 py-1.5 text-sm border border-cream-200 rounded-sm bg-white text-charcoal-700 focus:outline-none focus:ring-1 focus:ring-forest-400"
            />
            <span className="text-xs text-charcoal-400">até</span>
            <input
              type="date"
              value={filtroDataAte}
              onChange={e => handleFilterChange(() => setFiltroDataAte(e.target.value))}
              className="px-2 py-1.5 text-sm border border-cream-200 rounded-sm bg-white text-charcoal-700 focus:outline-none focus:ring-1 focus:ring-forest-400"
            />
          </div>

          {/* Limpar filtros */}
          {activeFilters > 0 && (
            <button
              onClick={() => {
                setFiltroOp('');
                setFiltroTabela('');
                setFiltroUser('');
                setFiltroDataDe('');
                setFiltroDataAte('');
                setPage(0);
              }}
              className="text-xs text-charcoal-400 hover:text-red-500 transition-colors underline underline-offset-2"
            >
              Limpar filtros ({activeFilters})
            </button>
          )}
        </div>

        {/* Tabela */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-cream-200 bg-cream-50">
                <th className="py-2.5 pl-4 pr-2 w-8" />
                <th className="py-2.5 px-3 text-left text-xs font-mono tracking-[0.2em] uppercase text-charcoal-400 whitespace-nowrap">
                  Data / Hora
                </th>
                <th className="py-2.5 px-3 text-left text-xs font-mono tracking-[0.2em] uppercase text-charcoal-400">
                  Usuário
                </th>
                <th className="py-2.5 px-3 text-left text-xs font-mono tracking-[0.2em] uppercase text-charcoal-400">
                  Operação
                </th>
                <th className="py-2.5 px-3 text-left text-xs font-mono tracking-[0.2em] uppercase text-charcoal-400">
                  Módulo
                </th>
                <th className="py-2.5 px-3 text-left text-xs font-mono tracking-[0.2em] uppercase text-charcoal-400">
                  Registro
                </th>
                <th className="py-2.5 px-3 pr-4 text-left text-xs font-mono tracking-[0.2em] uppercase text-charcoal-400">
                  Alterações
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3 text-charcoal-400">
                      <RefreshCw size={20} className="animate-spin" />
                      <span className="text-sm">Carregando logs…</span>
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3 text-charcoal-400">
                      <ClipboardList size={28} className="opacity-40" />
                      <p className="text-sm">Nenhum log encontrado.</p>
                      {activeFilters > 0 && (
                        <p className="text-xs text-charcoal-400">Tente remover os filtros aplicados.</p>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map(log => <LogRow key={log.id} log={log} />)
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-cream-100">
            <span className="text-xs text-charcoal-400">
              Página {page + 1} de {totalPages} · {total.toLocaleString('pt-BR')} registros
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={page === 0}
                onClick={() => setPage(p => p - 1)}
                className="px-3 py-1.5 text-xs border border-cream-200 rounded-sm text-charcoal-500 hover:border-forest-300 hover:text-forest-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                const pg = totalPages <= 7
                  ? i
                  : page < 4
                    ? i
                    : page > totalPages - 5
                      ? totalPages - 7 + i
                      : page - 3 + i;
                return (
                  <button
                    key={pg}
                    onClick={() => setPage(pg)}
                    className={`w-8 h-7 text-xs rounded-sm border transition-colors ${
                      pg === page
                        ? 'bg-forest-500 border-forest-600 text-white'
                        : 'border-cream-200 text-charcoal-500 hover:border-forest-300'
                    }`}
                  >
                    {pg + 1}
                  </button>
                );
              })}
              <button
                disabled={page >= totalPages - 1}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1.5 text-xs border border-cream-200 rounded-sm text-charcoal-500 hover:border-forest-300 hover:text-forest-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Legenda */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-charcoal-400">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          Criação — novo registro inserido
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-400" />
          Edição — campos alterados (mostra apenas o que mudou)
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-400" />
          Exclusão — registro removido permanentemente
        </div>
        <span className="text-charcoal-300">· Clique em qualquer linha para ver o detalhe</span>
      </div>
    </div>
  );
}
