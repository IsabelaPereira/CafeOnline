import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Package, Truck, Check, X, Plus, Trash2, Tag, ExternalLink, AlertCircle, RefreshCw, Link2, Pencil, History, MapPin } from 'lucide-react';
import { Badge, Modal, Button, Input } from '../ui';
import {
  getPedido, updatePedidoStatus, updatePedidoRastreio, updatePedidoItens,
  gerarEtiqueta, cancelarEtiqueta, limparEtiquetaLocal, marcarComoRetirado, getPedidoHistorico,
} from '../../services/pedidos.service';
import { getAssinatura } from '../../services/assinaturas.service';
import { PEDIDO_STATUS_LABEL, PEDIDO_STATUS_VARIANT } from '../../constants/pedidoStatus';
import type { Pedido, Assinatura, StatusPedido } from '../../types';
import type { PedidoAuditLog } from '../../services/pedidos.service';

// itemId: id real em itens_pedido (undefined = item novo, ainda não salvo)
type EditItemForm = { key: string; itemId?: string; nome: string; sku: string; quantidade: string; precoUnitario: string };
const emptyEditItem = (): EditItemForm => ({ key: crypto.randomUUID(), nome: '', sku: '', quantidade: '1', precoUnitario: '' });

// ── Histórico (auditoria) ────────────────────────────────────────────────────

const FIELD_LABEL: Record<string, string> = {
  status: 'Status', frete: 'Frete', desconto: 'Desconto', subtotal: 'Subtotal', total: 'Total',
  forma_entrega: 'Forma de entrega', forma_pagamento: 'Forma de pagamento',
  codigo_rastreio: 'Código de rastreio', retirado_por: 'Retirado por',
  observacoes: 'Observações', etiqueta_url: 'Etiqueta', melhorenvio_cart_id: 'Carrinho MelhorEnvio',
  quantidade: 'Quantidade', preco_unitario: 'Preço unitário', nome_produto: 'Produto',
};
const SKIP_FIELDS = new Set(['updated_at', 'created_at', 'id', 'subtotal_calc']);

const STATUS_STEP_TITULO: Record<string, string> = {
  pendente: 'Reaberto (pendente)',
  pago: 'Pagamento confirmado',
  em_separacao: 'Marcado como em separação',
  enviado: 'Marcado como enviado',
  entregue: 'Marcado como entregue',
  disponivel_retirada: 'Disponível para retirada',
  retirado: 'Retirado',
  cancelado: 'Pedido cancelado',
  reembolsado: 'Pedido reembolsado',
};

type HistoricoTipo = 'criacao' | 'status' | 'edicao' | 'item_add' | 'item_remove' | 'item_edit' | 'exclusao';

interface HistoricoStep {
  id: string;
  tipo: HistoricoTipo;
  titulo: string;
  detalhe?: string;
  usuario: string;
  origem: string;
  criadoEm: string;
}

const TIPO_CONFIG: Record<HistoricoTipo, { icon: ReactNode; color: string }> = {
  criacao:     { icon: <Package size={13} />, color: 'bg-forest-100 text-forest-600 border-forest-200' },
  status:      { icon: <Check size={13} />,   color: 'bg-blue-100 text-blue-600 border-blue-200' },
  edicao:      { icon: <Pencil size={13} />,  color: 'bg-gold-100 text-gold-700 border-gold-200' },
  item_add:    { icon: <Plus size={13} />,    color: 'bg-forest-100 text-forest-600 border-forest-200' },
  item_remove: { icon: <Trash2 size={13} />,  color: 'bg-red-100 text-red-500 border-red-200' },
  item_edit:   { icon: <Pencil size={13} />,  color: 'bg-gold-100 text-gold-700 border-gold-200' },
  exclusao:    { icon: <Trash2 size={13} />,  color: 'bg-red-100 text-red-500 border-red-200' },
};

function formatDateHora(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso));
}

function formatFieldValue(field: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (field === 'status') return PEDIDO_STATUS_LABEL[value as StatusPedido] ?? String(value);
  if (field === 'forma_entrega') return value === 'retirada' ? 'Retirada na loja' : 'Entrega';
  if (['frete', 'desconto', 'subtotal', 'total', 'preco_unitario'].includes(field) && typeof value === 'number') {
    return `R$ ${value.toFixed(2)}`;
  }
  if (typeof value === 'boolean') return value ? 'sim' : 'não';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function buildPedidoHistoricoSteps(logs: PedidoAuditLog[]): HistoricoStep[] {
  return logs
    .map((log): HistoricoStep | null => {
      const usuario = log.usuarioNome ?? (log.operacao === 'INSERT' ? 'Cliente' : 'Sistema');
      const base = { id: log.id, usuario, criadoEm: log.criadoEm };

      // ── Itens do pedido ──────────────────────────────────────────────────
      if (log.tabela === 'itens_pedido') {
        const origem = log.usuarioId ? 'Painel administrativo' : 'Sistema/automação';
        if (log.operacao === 'INSERT') {
          const d = log.dadosDepois ?? {};
          return {
            ...base, origem, tipo: 'item_add', titulo: 'Item adicionado',
            detalhe: `${d.nome_produto ?? '—'} · x${d.quantidade ?? '?'} · ${formatFieldValue('preco_unitario', d.preco_unitario)}`,
          };
        }
        if (log.operacao === 'DELETE') {
          const d = log.dadosAntes ?? {};
          return { ...base, origem, tipo: 'item_remove', titulo: 'Item removido', detalhe: `${d.nome_produto ?? '—'}` };
        }
        const antes = log.dadosAntes ?? {};
        const depois = log.dadosDepois ?? {};
        const nome = (depois.nome_produto ?? antes.nome_produto ?? '—') as string;
        const campos = Object.keys(depois).filter(k => !SKIP_FIELDS.has(k) && k !== 'nome_produto');
        if (campos.length === 0) return null;
        const detalhe = campos.map(k => `${FIELD_LABEL[k] ?? k}: ${formatFieldValue(k, antes[k])} → ${formatFieldValue(k, depois[k])}`).join(' · ');
        return { ...base, origem, tipo: 'item_edit', titulo: `Item alterado — ${nome}`, detalhe };
      }

      // ── Pedido ───────────────────────────────────────────────────────────
      const origem = log.usuarioId
        ? 'Painel administrativo'
        : (log.operacao === 'INSERT'
            ? (log.dadosDepois?.tipo === 'assinatura' ? 'Sistema (cobrança da assinatura)' : 'Site (checkout do cliente)')
            : 'Sistema/automação');

      if (log.operacao === 'INSERT') {
        const d = log.dadosDepois ?? {};
        const detalhe = [d.numero, formatFieldValue('total', d.total), formatFieldValue('forma_entrega', d.forma_entrega)]
          .filter(Boolean).join(' · ');
        return { ...base, origem, tipo: 'criacao', titulo: 'Pedido criado', detalhe: detalhe || undefined };
      }
      if (log.operacao === 'DELETE') {
        return { ...base, origem, tipo: 'exclusao', titulo: 'Pedido excluído' };
      }

      const antes = log.dadosAntes ?? {};
      const depois = log.dadosDepois ?? {};
      const campos = Object.keys(depois).filter(k => !SKIP_FIELDS.has(k));

      if ('status' in depois) {
        const novo = depois.status as string;
        const titulo = STATUS_STEP_TITULO[novo] ?? `Status alterado para ${PEDIDO_STATUS_LABEL[novo as StatusPedido] ?? novo}`;
        const partes: string[] = [];
        if (antes.status) partes.push(`De "${PEDIDO_STATUS_LABEL[antes.status as StatusPedido] ?? antes.status}" para "${PEDIDO_STATUS_LABEL[novo as StatusPedido] ?? novo}"`);
        if (novo === 'retirado' && depois.retirado_por) partes.push(`Retirado por: ${depois.retirado_por}`);
        if (depois.codigo_rastreio) partes.push(`Rastreio: ${depois.codigo_rastreio}`);
        const outros = campos.filter(k => !['status', 'retirado_por', 'codigo_rastreio'].includes(k));
        partes.push(...outros.map(k => `${FIELD_LABEL[k] ?? k}: ${formatFieldValue(k, antes[k])} → ${formatFieldValue(k, depois[k])}`));
        return { ...base, origem, tipo: 'status', titulo, detalhe: partes.join(' · ') || undefined };
      }

      if (campos.length === 0) return null;
      const detalhe = campos.map(k => `${FIELD_LABEL[k] ?? k}: ${formatFieldValue(k, antes[k])} → ${formatFieldValue(k, depois[k])}`).join(' · ');
      return { ...base, origem, tipo: 'edicao', titulo: 'Pedido alterado', detalhe: detalhe || undefined };
    })
    .filter((s): s is HistoricoStep => s !== null);
}

interface PedidoDetalheModalProps {
  /** Pedido a exibir; passar null fecha o modal. */
  pedido: Pedido | null;
  onClose: () => void;
  /** Chamado sempre que o pedido é alterado — o chamador deve atualizar sua própria lista/estado. */
  onUpdated: (pedido: Pedido) => void;
}

/** Modal completo de detalhe de pedido — itens (com edição), endereço/retirada,
 *  etiqueta MelhorEnvio, rastreio manual e ações de status. Compartilhado entre
 *  as telas de Pedidos e Logística para evitar duas cópias divergentes. */
export function PedidoDetalheModal({ pedido, onClose, onUpdated }: PedidoDetalheModalProps) {
  const [modalTab, setModalTab]             = useState<'detalhes' | 'historico'>('detalhes');
  const [historicoLogs, setHistoricoLogs]   = useState<PedidoAuditLog[]>([]);
  const [historicoLoading, setHistoricoLoading] = useState(false);

  const [assDetalhe, setAssDetalhe]         = useState<Assinatura | null>(null);
  const [carregandoAss, setCarregandoAss]   = useState(false);
  const [rastreio, setRastreio]             = useState('');
  const [salvandoRastreio, setSalvandoRastreio] = useState(false);
  const [gerandoEtiqueta, setGerandoEtiqueta]   = useState(false);
  const [cancelandoEtiqueta, setCancelandoEtiqueta] = useState(false);
  const [limpandoEtiqueta, setLimpandoEtiqueta] = useState(false);
  const [erroEtiqueta, setErroEtiqueta]     = useState('');

  const [editandoItens, setEditandoItens]   = useState(false);
  const [itensEdit, setItensEdit]           = useState<EditItemForm[]>([]);
  const [freteEdit, setFreteEdit]           = useState('0');
  const [descontoEdit, setDescontoEdit]     = useState('0');
  const [salvandoItens, setSalvandoItens]   = useState(false);

  const [prontoParaRetirar, setProntoParaRetirar] = useState(false);
  const [nomeRetirou, setNomeRetirou]             = useState('');
  const [marcandoRetirado, setMarcandoRetirado]   = useState(false);

  useEffect(() => {
    setRastreio(pedido?.codigoRastreio ?? '');
    setErroEtiqueta('');
    setEditandoItens(false);
    setAssDetalhe(null);
    setModalTab('detalhes');
    setProntoParaRetirar(false);
    setNomeRetirou('');
    setHistoricoLogs([]);
    if (pedido?.assinaturaId) {
      setCarregandoAss(true);
      getAssinatura(pedido.assinaturaId)
        .then(setAssDetalhe)
        .catch(() => { /* silencia */ })
        .finally(() => setCarregandoAss(false));
    }
    if (pedido?.id) {
      setHistoricoLoading(true);
      getPedidoHistorico(pedido.id)
        .then(setHistoricoLogs)
        .catch(() => setHistoricoLogs([]))
        .finally(() => setHistoricoLoading(false));
    }
  }, [pedido?.id, pedido?.assinaturaId, pedido?.codigoRastreio]);

  const historicoSteps = buildPedidoHistoricoSteps(historicoLogs);

  function abrirEditarItens() {
    if (!pedido) return;
    setItensEdit(pedido.itens.map(i => ({
      key: crypto.randomUUID(), itemId: i.id,
      nome: i.produto.nome, sku: i.produto.sku,
      quantidade: String(i.quantidade), precoUnitario: String(i.precoUnitario),
    })));
    setFreteEdit(String(pedido.frete));
    setDescontoEdit(String(pedido.desconto));
    setEditandoItens(true);
  }

  function atualizarItemEdit(key: string, patch: Partial<EditItemForm>) {
    setItensEdit(prev => prev.map(i => i.key === key ? { ...i, ...patch } : i));
  }

  async function handleSalvarItens() {
    if (!pedido) return;
    if (itensEdit.length === 0 || itensEdit.some(i => !i.nome.trim() || !i.precoUnitario)) {
      alert('Preencha o nome e o preço de todos os itens.');
      return;
    }
    setSalvandoItens(true);
    try {
      const atualizado = await updatePedidoItens(
        pedido.id,
        itensEdit.map(i => ({
          id: i.itemId,
          nomeProduto: i.nome,
          skuProduto: i.sku || `MAN-${Date.now()}`,
          quantidade: Math.max(1, parseInt(i.quantidade) || 1),
          precoUnitario: parseFloat(i.precoUnitario) || 0,
        })),
        parseFloat(freteEdit) || 0,
        parseFloat(descontoEdit) || 0,
      );
      onUpdated(atualizado);
      setEditandoItens(false);
    } catch {
      alert('Erro ao salvar itens do pedido.');
    } finally {
      setSalvandoItens(false);
    }
  }

  async function handleLimparEtiquetaLocal() {
    if (!pedido) return;
    if (!confirm('Remover a etiqueta SOMENTE do sistema (banco de dados)?\n\nUse esta opção APENAS se você já cancelou manualmente no painel MelhorEnvio. O pedido voltará ao status "pago".')) return;
    setLimpandoEtiqueta(true);
    setErroEtiqueta('');
    try {
      await limparEtiquetaLocal(pedido.id);
      const atualizado = await getPedido(pedido.id);
      if (atualizado) onUpdated(atualizado);
    } catch (e) {
      setErroEtiqueta(`Erro ao limpar etiqueta: ${e instanceof Error ? e.message : 'Tente novamente.'}`);
    } finally {
      setLimpandoEtiqueta(false);
    }
  }

  async function handleGerarEtiqueta() {
    if (!pedido) return;
    setGerandoEtiqueta(true);
    setErroEtiqueta('');
    try {
      const result = await gerarEtiqueta(pedido.id);
      if (result.error) {
        setErroEtiqueta(result.error);
        return;
      }
      const atualizado = await getPedido(pedido.id);
      if (atualizado) onUpdated(atualizado);
    } catch {
      setErroEtiqueta('Erro ao conectar com o servidor. Tente novamente.');
    } finally {
      setGerandoEtiqueta(false);
    }
  }

  async function handleCancelarEtiqueta() {
    if (!pedido) return;
    if (!confirm('Cancelar a etiqueta e estornar o valor no MelhorEnvio? O pedido voltará ao status "pago".')) return;
    setCancelandoEtiqueta(true);
    setErroEtiqueta('');
    try {
      const result = await cancelarEtiqueta(pedido.id);
      const msgErro = result.error ?? result.message ?? ((result as Record<string, unknown>).msg as string | undefined) ?? null;
      if (msgErro && !result.success) {
        setErroEtiqueta(String(msgErro));
        return;
      }
      const atualizado = await getPedido(pedido.id);
      if (atualizado) onUpdated(atualizado);
    } catch (e) {
      setErroEtiqueta(`Erro ao cancelar a etiqueta: ${e instanceof Error ? e.message : 'Tente novamente.'}`);
    } finally {
      setCancelandoEtiqueta(false);
    }
  }

  async function handleSalvarRastreio() {
    if (!pedido || !rastreio.trim()) return;
    setSalvandoRastreio(true);
    try {
      await updatePedidoRastreio(pedido.id, rastreio.trim(), 'enviado');
      onUpdated({ ...pedido, codigoRastreio: rastreio.trim(), status: 'enviado' });
    } catch {
      alert('Erro ao salvar rastreio.');
    } finally {
      setSalvandoRastreio(false);
    }
  }

  async function handleMudarStatus(novoStatus: Pedido['status']) {
    if (!pedido) return;
    await updatePedidoStatus(pedido.id, novoStatus);
    onUpdated({ ...pedido, status: novoStatus });
  }

  async function handleCancelarPedido() {
    if (!pedido || !confirm('Cancelar este pedido?')) return;
    await handleMudarStatus('cancelado');
  }

  async function handleMarcarRetirado() {
    if (!pedido || !nomeRetirou.trim()) return;
    setMarcandoRetirado(true);
    try {
      await marcarComoRetirado(pedido.id, nomeRetirou.trim());
      onUpdated({ ...pedido, status: 'retirado', retiradoPor: nomeRetirou.trim() });
      setProntoParaRetirar(false);
      setNomeRetirou('');
    } catch {
      alert('Erro ao marcar como retirado.');
    } finally {
      setMarcandoRetirado(false);
    }
  }

  return (
    <Modal open={!!pedido} onClose={onClose} title={`Pedido ${pedido?.numero ?? ''}`} size="xl">
      {pedido && (
        <div className="space-y-5">
          {/* Abas internas: Detalhes / Histórico */}
          <div className="flex gap-1 border-b border-cream-200 -mt-1">
            <button
              onClick={() => setModalTab('detalhes')}
              className={`px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors ${
                modalTab === 'detalhes' ? 'text-forest-600 border-forest-500' : 'text-charcoal-400 border-transparent hover:text-charcoal-600'
              }`}
            >
              Detalhes
            </button>
            <button
              onClick={() => setModalTab('historico')}
              className={`px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors flex items-center gap-1.5 ${
                modalTab === 'historico' ? 'text-forest-600 border-forest-500' : 'text-charcoal-400 border-transparent hover:text-charcoal-600'
              }`}
            >
              <History size={12} /> Histórico
              {historicoLogs.length > 0 && (
                <span className="text-[10px] bg-cream-200 text-charcoal-500 rounded-full px-1.5 leading-4">{historicoLogs.length}</span>
              )}
            </button>
          </div>

          {modalTab === 'historico' ? (
            historicoLoading ? (
              <div className="flex items-center justify-center py-16">
                <RefreshCw size={22} className="animate-spin text-forest-500" />
              </div>
            ) : historicoSteps.length === 0 ? (
              <p className="text-sm text-charcoal-400 py-6 text-center">Nenhum evento de histórico registrado para este pedido.</p>
            ) : (
              <div className="space-y-0 max-h-[480px] overflow-y-auto pr-1">
                {historicoSteps.map((step, i) => {
                  const cfg = TIPO_CONFIG[step.tipo];
                  return (
                    <div key={step.id} className="relative pl-9 pb-6 last:pb-0">
                      {i < historicoSteps.length - 1 && (
                        <span className="absolute left-[13px] top-6 bottom-0 w-px bg-cream-200" />
                      )}
                      <span className={`absolute left-0 top-0 flex items-center justify-center w-7 h-7 rounded-full border ${cfg.color}`}>
                        {cfg.icon}
                      </span>
                      <p className="text-sm font-medium text-charcoal-700">{step.titulo}</p>
                      <p className="text-xs text-charcoal-400 mt-0.5">
                        {formatDateHora(step.criadoEm)} · {step.usuario}
                        <span className="inline-flex items-center gap-1 ml-1.5">
                          <MapPin size={10} className="inline" /> {step.origem}
                        </span>
                      </p>
                      {step.detalhe && (
                        <p className="text-xs text-charcoal-500 mt-1.5 bg-cream-50 border border-cream-200 rounded-sm px-2.5 py-1.5">
                          {step.detalhe}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          ) : (
          <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Cliente', value: pedido.cliente?.name ?? '—' },
              { label: 'Data', value: new Date(pedido.createdAt).toLocaleDateString('pt-BR') },
              { label: 'Pagamento', value: pedido.formaPagamento },
              { label: 'Status', value: <Badge variant={PEDIDO_STATUS_VARIANT[pedido.status] ?? 'inactive'}>{PEDIDO_STATUS_LABEL[pedido.status] ?? pedido.status}</Badge> },
              ...(pedido.retiradoPor ? [{ label: 'Retirado por', value: pedido.retiradoPor as ReactNode }] : []),
            ].map(info => (
              <div key={info.label} className="bg-cream-50 rounded-sm p-3">
                <p className="text-xs text-charcoal-400 mb-1">{info.label}</p>
                <div className="text-sm font-medium text-charcoal-700">{info.value}</div>
              </div>
            ))}
          </div>

          {/* Origem: assinatura */}
          {pedido.tipo === 'assinatura' && (
            <div className="rounded-sm border border-forest-200 bg-forest-50 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Link2 size={14} className="text-forest-600" />
                <p className="text-xs font-medium text-forest-700 uppercase tracking-wider">Pedido de assinatura</p>
                {carregandoAss && <RefreshCw size={12} className="text-forest-400 animate-spin ml-auto" />}
              </div>

              {(() => {
                // Extrai período do número do pedido: DM-YYYYMM-xxx
                const match = pedido.numero.match(/^DM-(\d{4})(\d{2})-/);
                const periodoStr = match ? `${match[2]}/${match[1]}` : null;

                // Ciclo correspondente (disponível quando assDetalhe carregou)
                const ciclo = assDetalhe?.ciclos.find(c => c.id === pedido.cicloId) ?? null;

                return (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      <div className="bg-white/70 rounded-sm p-2.5">
                        <p className="text-xs text-forest-600 mb-0.5">Plano</p>
                        <p className="text-sm font-medium text-charcoal-700">
                          {assDetalhe ? assDetalhe.plano.nome : <span className="text-charcoal-300 italic">—</span>}
                        </p>
                      </div>

                      <div className="bg-white/70 rounded-sm p-2.5">
                        <p className="text-xs text-forest-600 mb-0.5">Período</p>
                        <p className="text-sm font-medium text-charcoal-700">
                          {ciclo ? `${String(ciclo.mes).padStart(2,'0')}/${ciclo.ano}` : periodoStr ?? '—'}
                        </p>
                      </div>

                      <div className="bg-white/70 rounded-sm p-2.5">
                        <p className="text-xs text-forest-600 mb-0.5">Edição</p>
                        <p className="text-sm font-medium text-charcoal-700">
                          {ciclo?.edicaoTitulo ?? <span className="text-charcoal-300 italic">Sem edição</span>}
                        </p>
                      </div>

                      {assDetalhe && (
                        <div className="bg-white/70 rounded-sm p-2.5">
                          <p className="text-xs text-forest-600 mb-0.5">Status assinatura</p>
                          <Badge variant={({ ativa:'active', pendente:'pending', inadimplente:'cancelled', cancelada:'inactive', pausada:'inactive' } as Record<string,'active'|'pending'|'cancelled'|'inactive'>)[assDetalhe.status] ?? 'inactive'}>
                            {assDetalhe.status}
                          </Badge>
                        </div>
                      )}

                      {assDetalhe && (
                        <div className="bg-white/70 rounded-sm p-2.5">
                          <p className="text-xs text-forest-600 mb-0.5">Preferência</p>
                          <p className="text-sm font-medium text-charcoal-700">
                            {assDetalhe.preferenciaCafe === 'grao' ? 'Grão' : `Moído (${assDetalhe.tipoMoagem ?? '—'})`}
                          </p>
                        </div>
                      )}
                    </div>

                    <p className="text-xs text-forest-600">
                      ID: <span className="font-mono text-charcoal-500">{pedido.assinaturaId}</span>
                    </p>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Itens */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-charcoal-400 uppercase tracking-wider">Itens do pedido</p>
              {!editandoItens && pedido.status !== 'cancelado' && (
                <button onClick={abrirEditarItens} className="flex items-center gap-1.5 text-xs text-forest-600 hover:text-forest-700 font-medium">
                  <Pencil size={12} /> Editar itens
                </button>
              )}
            </div>

            {!editandoItens ? (
              <div className="space-y-2">
                {pedido.itens.map(item => (
                  <div key={item.id} className="flex items-center justify-between py-2 border-b border-cream-100">
                    <div className="flex items-center gap-3">
                      <Package size={16} className="text-earth-400" />
                      <div>
                        <p className="text-sm text-charcoal-700">{item.produto.nome}</p>
                        {item.produto.sku && <p className="text-xs text-charcoal-400">SKU: {item.produto.sku}</p>}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-charcoal-600">x{item.quantidade}</p>
                      <p className="text-sm font-medium text-charcoal-700">R$ {item.subtotal.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3 bg-cream-50 rounded-sm p-3 border border-cream-200">
                <div className="space-y-2">
                  {itensEdit.map(item => (
                    <div key={item.key} className="flex gap-2 items-start">
                      <div className="flex-1">
                        <input
                          value={item.nome}
                          onChange={e => atualizarItemEdit(item.key, { nome: e.target.value })}
                          placeholder="Nome do produto *"
                          className="w-full px-2.5 py-1.5 text-sm border border-cream-200 rounded-sm bg-white text-charcoal-700 placeholder-charcoal-300 focus:outline-none focus:ring-1 focus:ring-forest-400"
                        />
                      </div>
                      <div className="w-20">
                        <input
                          type="number" min="1" value={item.quantidade}
                          onChange={e => atualizarItemEdit(item.key, { quantidade: e.target.value })}
                          placeholder="Qtd"
                          className="w-full px-2.5 py-1.5 text-sm border border-cream-200 rounded-sm bg-white text-charcoal-700 focus:outline-none focus:ring-1 focus:ring-forest-400"
                        />
                      </div>
                      <div className="w-32">
                        <input
                          type="number" min="0" step="0.01" value={item.precoUnitario}
                          onChange={e => atualizarItemEdit(item.key, { precoUnitario: e.target.value })}
                          placeholder="Preço *"
                          className="w-full px-2.5 py-1.5 text-sm border border-cream-200 rounded-sm bg-white text-charcoal-700 focus:outline-none focus:ring-1 focus:ring-forest-400"
                        />
                      </div>
                      <div className="w-24 text-right pt-1.5 text-sm text-charcoal-500">
                        R$ {((parseFloat(item.quantidade) || 0) * (parseFloat(item.precoUnitario) || 0)).toFixed(2)}
                      </div>
                      <button onClick={() => setItensEdit(prev => prev.filter(i => i.key !== item.key))} className="p-1.5 text-charcoal-300 hover:text-red-500 transition-colors mt-0.5">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                <button onClick={() => setItensEdit(prev => [...prev, emptyEditItem()])} className="flex items-center gap-1.5 text-sm text-forest-600 hover:text-forest-700 font-medium">
                  <Plus size={13} /> Adicionar item
                </button>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <Input label="Frete (R$)" type="number" min="0" step="0.01" value={freteEdit} onChange={e => setFreteEdit(e.target.value)} />
                  <Input label="Desconto (R$)" type="number" min="0" step="0.01" value={descontoEdit} onChange={e => setDescontoEdit(e.target.value)} />
                </div>

                <div className="flex justify-end gap-3 pt-1">
                  <Button variant="ghost" size="sm" onClick={() => setEditandoItens(false)}>Cancelar</Button>
                  <Button variant="primary" size="sm" loading={salvandoItens} onClick={handleSalvarItens}>
                    Salvar itens
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Totals */}
          <div className="bg-cream-50 rounded-sm p-4 space-y-2">
            <div className="flex justify-between text-sm"><span className="text-charcoal-500">Subtotal</span><span>R$ {pedido.subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-charcoal-500">Frete</span><span>R$ {pedido.frete.toFixed(2)}</span></div>
            {pedido.desconto > 0 && (
              <div className="flex justify-between text-sm text-forest-500">
                <span>Desconto {pedido.cupom && `(${pedido.cupom})`}</span>
                <span>- R$ {pedido.desconto.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-medium border-t border-cream-200 pt-2">
              <span className="text-charcoal-700">Total</span>
              <span className="font-serif text-lg">R$ {pedido.total.toFixed(2)}</span>
            </div>
          </div>

          {/* Endereço */}
          <div>
            <p className="text-xs font-medium text-charcoal-400 uppercase tracking-wider mb-2">Endereço de entrega</p>
            <p className="text-sm text-charcoal-600">
              {pedido.enderecoEntrega.logradouro}, {pedido.enderecoEntrega.numero}
              {pedido.enderecoEntrega.complemento && `, ${pedido.enderecoEntrega.complemento}`}
            </p>
            <p className="text-sm text-charcoal-600">
              {pedido.enderecoEntrega.bairro} — {pedido.enderecoEntrega.cidade}/{pedido.enderecoEntrega.estado} · CEP {pedido.enderecoEntrega.cep}
            </p>
          </div>

          {/* Observações */}
          {pedido.observacoes && (
            <div>
              <p className="text-xs font-medium text-charcoal-400 uppercase tracking-wider mb-1">Observações</p>
              <p className="text-sm text-charcoal-600">{pedido.observacoes}</p>
            </div>
          )}

          {/* Etiqueta MelhorEnvio — não se aplica a pedidos de retirada */}
          {pedido.formaEntrega !== 'retirada' && pedido.status !== 'cancelado' && pedido.status !== 'reembolsado' && (
            <div>
              <p className="text-xs font-medium text-charcoal-400 uppercase tracking-wider mb-2">Etiqueta de envio</p>

              {pedido.etiquetaUrl ? (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-3 p-3 bg-forest-50 border border-forest-200 rounded-sm">
                    <Tag size={16} className="text-forest-500" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-forest-700">Etiqueta gerada</p>
                      {pedido.codigoRastreio && (
                        <p className="text-xs text-charcoal-500 font-mono mt-0.5">{pedido.codigoRastreio}</p>
                      )}
                    </div>
                    <Button
                      variant="danger"
                      size="sm"
                      loading={cancelandoEtiqueta}
                      onClick={handleCancelarEtiqueta}
                      icon={<X size={13} />}
                    >
                      Cancelar etiqueta
                    </Button>
                    <a href={pedido.etiquetaUrl} target="_blank" rel="noopener noreferrer">
                      <Button variant="primary" size="sm" icon={<ExternalLink size={13} />}>
                        Imprimir etiqueta
                      </Button>
                    </a>
                  </div>
                  {erroEtiqueta && (
                    <div className="space-y-2">
                      <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-sm text-sm text-red-700">
                        <AlertCircle size={14} className="mt-0.5 shrink-0" />
                        <span className="flex-1">{erroEtiqueta}</span>
                      </div>
                      <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-sm">
                        <AlertCircle size={13} className="text-amber-600 shrink-0" />
                        <p className="text-xs text-amber-700 flex-1">
                          Cancele manualmente no <strong>painel MelhorEnvio</strong> e depois use o botão abaixo para atualizar o sistema.
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          loading={limpandoEtiqueta}
                          onClick={handleLimparEtiquetaLocal}
                        >
                          Limpar no sistema
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {erroEtiqueta && (
                    <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-sm text-sm text-red-700">
                      <AlertCircle size={14} className="mt-0.5 shrink-0" />
                      {erroEtiqueta}
                    </div>
                  )}
                  <Button
                    variant="primary"
                    size="sm"
                    loading={gerandoEtiqueta}
                    onClick={handleGerarEtiqueta}
                    icon={<Tag size={13} />}
                  >
                    {gerandoEtiqueta ? 'Gerando etiqueta…' : 'Gerar etiqueta (MelhorEnvio)'}
                  </Button>
                  <p className="text-xs text-charcoal-400">
                    Gera a etiqueta e debita do saldo MelhorEnvio automaticamente.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Rastreio manual — não se aplica a pedidos de retirada */}
          {pedido.formaEntrega !== 'retirada' && !pedido.etiquetaUrl && pedido.status !== 'cancelado' && pedido.status !== 'entregue' && (
            <div>
              <p className="text-xs font-medium text-charcoal-400 uppercase tracking-wider mb-2">Código de rastreio manual</p>
              <div className="flex gap-2">
                <Input value={rastreio} onChange={e => setRastreio(e.target.value)} placeholder="Ex: BR123456789BR" className="flex-1" />
                <Button variant="secondary" size="sm" loading={salvandoRastreio} onClick={handleSalvarRastreio} icon={<Truck size={13} />}>
                  Salvar
                </Button>
              </div>
              {pedido.codigoRastreio && (
                <p className="mt-1 text-xs text-charcoal-400">Atual: <span className="font-mono">{pedido.codigoRastreio}</span></p>
              )}
            </div>
          )}

          {/* Ações */}
          <div className="flex flex-wrap gap-3 pt-2 border-t border-cream-200">
            {pedido.status === 'pago' && (
              <Button variant="secondary" size="sm" onClick={() => handleMudarStatus('em_separacao')}>
                <Check size={14} /> Em separação
              </Button>
            )}
            {pedido.status === 'em_separacao' && pedido.formaEntrega === 'retirada' && (
              <Button variant="primary" size="sm" onClick={() => handleMudarStatus('disponivel_retirada')} icon={<Tag size={14} />}>
                Marcar disponível para retirada
              </Button>
            )}
            {pedido.status === 'em_separacao' && pedido.formaEntrega !== 'retirada' && (
              <Button variant="primary" size="sm" onClick={handleSalvarRastreio} loading={salvandoRastreio} icon={<Truck size={14} />}>
                Marcar como enviado
              </Button>
            )}
            {pedido.status === 'disponivel_retirada' && !prontoParaRetirar && (
              <Button variant="primary" size="sm" onClick={() => setProntoParaRetirar(true)} icon={<Check size={14} />}>
                Marcar como retirado
              </Button>
            )}
            {pedido.status !== 'cancelado' && pedido.status !== 'entregue' && pedido.status !== 'retirado' && pedido.status !== 'reembolsado' && (
              <Button variant="danger" size="sm" onClick={handleCancelarPedido} icon={<X size={14} />}>
                Cancelar pedido
              </Button>
            )}
          </div>

          {prontoParaRetirar && (
            <div className="bg-cream-50 border border-cream-200 rounded-sm p-4 space-y-3">
              <p className="text-xs font-medium text-charcoal-600">Nome completo de quem retirou *</p>
              <Input
                value={nomeRetirou}
                onChange={e => setNomeRetirou(e.target.value)}
                placeholder="Ex: Maria da Silva"
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => { setProntoParaRetirar(false); setNomeRetirou(''); }}
                >
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  loading={marcandoRetirado}
                  disabled={!nomeRetirou.trim()}
                  onClick={handleMarcarRetirado}
                  icon={<Check size={14} />}
                >
                  Confirmar retirada
                </Button>
              </div>
            </div>
          )}
          </>
          )}
        </div>
      )}
    </Modal>
  );
}
