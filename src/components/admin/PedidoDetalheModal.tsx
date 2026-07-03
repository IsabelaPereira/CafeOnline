import { useEffect, useState } from 'react';
import { Package, Truck, Check, X, Plus, Trash2, Tag, ExternalLink, AlertCircle, RefreshCw, Link2, Pencil } from 'lucide-react';
import { Badge, Modal, Button, Input } from '../ui';
import {
  getPedido, updatePedidoStatus, updatePedidoRastreio, updatePedidoItens,
  gerarEtiqueta, cancelarEtiqueta, limparEtiquetaLocal,
} from '../../services/pedidos.service';
import { getAssinatura } from '../../services/assinaturas.service';
import { PEDIDO_STATUS_LABEL, PEDIDO_STATUS_VARIANT } from '../../constants/pedidoStatus';
import type { Pedido, Assinatura } from '../../types';

// itemId: id real em itens_pedido (undefined = item novo, ainda não salvo)
type EditItemForm = { key: string; itemId?: string; nome: string; sku: string; quantidade: string; precoUnitario: string };
const emptyEditItem = (): EditItemForm => ({ key: crypto.randomUUID(), nome: '', sku: '', quantidade: '1', precoUnitario: '' });

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

  useEffect(() => {
    setRastreio(pedido?.codigoRastreio ?? '');
    setErroEtiqueta('');
    setEditandoItens(false);
    setAssDetalhe(null);
    if (pedido?.assinaturaId) {
      setCarregandoAss(true);
      getAssinatura(pedido.assinaturaId)
        .then(setAssDetalhe)
        .catch(() => { /* silencia */ })
        .finally(() => setCarregandoAss(false));
    }
  }, [pedido?.id, pedido?.assinaturaId, pedido?.codigoRastreio]);

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

  return (
    <Modal open={!!pedido} onClose={onClose} title={`Pedido ${pedido?.numero ?? ''}`} size="xl">
      {pedido && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Cliente', value: pedido.cliente?.name ?? '—' },
              { label: 'Data', value: new Date(pedido.createdAt).toLocaleDateString('pt-BR') },
              { label: 'Pagamento', value: pedido.formaPagamento },
              { label: 'Status', value: <Badge variant={PEDIDO_STATUS_VARIANT[pedido.status] ?? 'inactive'}>{PEDIDO_STATUS_LABEL[pedido.status] ?? pedido.status}</Badge> },
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
            {pedido.status === 'disponivel_retirada' && (
              <Button variant="primary" size="sm" onClick={() => handleMudarStatus('retirado')} icon={<Check size={14} />}>
                Marcar como retirado
              </Button>
            )}
            {pedido.status !== 'cancelado' && pedido.status !== 'entregue' && pedido.status !== 'retirado' && pedido.status !== 'reembolsado' && (
              <Button variant="danger" size="sm" onClick={handleCancelarPedido} icon={<X size={14} />}>
                Cancelar pedido
              </Button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
