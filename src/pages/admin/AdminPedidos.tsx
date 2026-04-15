import React, { useEffect, useState } from 'react';
import { Eye, Package, Truck, Check, X, Plus, Trash2, Search, Tag, ExternalLink, AlertCircle } from 'lucide-react';
import {
  Card, Badge, SearchBar, FilterBar, Select, Pagination,
  Modal, Button, SectionHeader, Input,
} from '../../components/ui';
import { getPedidos, createPedido, updatePedidoStatus, updatePedidoRastreio, buscarClientePorEmail, gerarEtiqueta } from '../../services/pedidos.service';
import type { Pedido, Endereco } from '../../types';

const statusOptions = [
  { value: '', label: 'Todos os status' },
  { value: 'pendente', label: 'Pendente' },
  { value: 'pago', label: 'Pago' },
  { value: 'em_separacao', label: 'Em separação' },
  { value: 'enviado', label: 'Enviado' },
  { value: 'entregue', label: 'Entregue' },
  { value: 'cancelado', label: 'Cancelado' },
];

const statusVariant: Record<string, 'active' | 'pending' | 'cancelled' | 'inactive' | 'gold'> = {
  pendente: 'pending', pago: 'pending', em_separacao: 'gold',
  enviado: 'gold', entregue: 'active', cancelado: 'cancelled', reembolsado: 'inactive',
};

type ItemForm = { id: string; nome: string; sku: string; quantidade: string; precoUnitario: string };
type EnderecoForm = { cep: string; logradouro: string; numero: string; complemento: string; bairro: string; cidade: string; estado: string };

const emptyItem = (): ItemForm => ({ id: crypto.randomUUID(), nome: '', sku: '', quantidade: '1', precoUnitario: '' });
const emptyEndereco = (): EnderecoForm => ({ cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '' });

export function AdminPedidos() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Pedido | null>(null);
  const [rastreio, setRastreio] = useState('');
  const [salvandoRastreio, setSalvandoRastreio] = useState(false);
  const [gerandoEtiqueta, setGerandoEtiqueta] = useState(false);
  const [erroEtiqueta, setErroEtiqueta] = useState('');
  const perPage = 10;

  // ── Novo pedido ─────────────────────────────────────────────────────────────
  const [criandoPedido, setCriandoPedido] = useState(false);
  const [salvandoPedido, setSalvandoPedido] = useState(false);
  const [buscandoCliente, setBuscandoCliente] = useState(false);
  const [clienteEmail, setClienteEmail] = useState('');
  const [clienteId, setClienteId] = useState<string | null>(null);
  const [clienteNome, setClienteNome] = useState('');
  const [formStatus, setFormStatus] = useState<'pendente' | 'pago'>('pago');
  const [formaPagamento, setFormaPagamento] = useState('');
  const [frete, setFrete] = useState('0');
  const [desconto, setDesconto] = useState('0');
  const [observacoes, setObservacoes] = useState('');
  const [itens, setItens] = useState<ItemForm[]>([emptyItem()]);
  const [endereco, setEndereco] = useState<EnderecoForm>(emptyEndereco());

  useEffect(() => {
    getPedidos().then(setPedidos).catch(console.error);
  }, []);

  const filtered = pedidos.filter(p =>
    (search === '' || p.numero.toLowerCase().includes(search.toLowerCase()) ||
     (p.cliente?.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
     (p.cliente?.email ?? '').toLowerCase().includes(search.toLowerCase())) &&
    (statusFilter === '' || p.status === statusFilter)
  );

  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  // ── Cálculos ─────────────────────────────────────────────────────────────────
  const subtotalCalc = itens.reduce((acc, i) => acc + (parseFloat(i.quantidade) || 0) * (parseFloat(i.precoUnitario) || 0), 0);
  const freteNum     = parseFloat(frete) || 0;
  const descontoNum  = parseFloat(desconto) || 0;
  const totalCalc    = Math.max(0, subtotalCalc + freteNum - descontoNum);

  function resetForm() {
    setClienteEmail(''); setClienteId(null); setClienteNome('');
    setFormStatus('pago'); setFormaPagamento(''); setFrete('0');
    setDesconto('0'); setObservacoes(''); setItens([emptyItem()]); setEndereco(emptyEndereco());
  }

  async function handleBuscarCliente() {
    if (!clienteEmail.trim()) return;
    setBuscandoCliente(true);
    try {
      const result = await buscarClientePorEmail(clienteEmail.trim());
      if (result) {
        setClienteId(result.clienteId);
        setClienteNome(result.nome);
      } else {
        setClienteId(null);
        setClienteNome('');
        alert('Nenhum cliente encontrado com este e-mail.');
      }
    } finally {
      setBuscandoCliente(false);
    }
  }

  function atualizarItem(id: string, patch: Partial<ItemForm>) {
    setItens(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i));
  }

  async function handleCriarPedido() {
    if (itens.some(i => !i.nome.trim() || !i.precoUnitario)) {
      alert('Preencha o nome e o preço de todos os itens.');
      return;
    }
    const enderecoObj: Endereco = {
      id: '', padrao: false,
      cep: endereco.cep, logradouro: endereco.logradouro,
      numero: endereco.numero, complemento: endereco.complemento || undefined,
      bairro: endereco.bairro, cidade: endereco.cidade, estado: endereco.estado,
    };
    setSalvandoPedido(true);
    try {
      const novo = await createPedido({
        clienteId: clienteId ?? undefined,
        itens: itens.map(i => ({
          nomeProduto:    i.nome,
          skuProduto:     i.sku || `MAN-${Date.now()}`,
          quantidade:     Math.max(1, parseInt(i.quantidade) || 1),
          precoUnitario:  parseFloat(i.precoUnitario) || 0,
        })),
        subtotal:        subtotalCalc,
        frete:           freteNum,
        desconto:        descontoNum,
        total:           totalCalc,
        enderecoEntrega: enderecoObj,
        formaPagamento:  formaPagamento || 'Manual',
        status:          formStatus,
        observacoes:     observacoes || undefined,
      });
      setPedidos(prev => [novo, ...prev]);
      setCriandoPedido(false);
      resetForm();
    } catch {
      alert('Erro ao criar pedido. Tente novamente.');
    } finally {
      setSalvandoPedido(false);
    }
  }

  async function handleGerarEtiqueta() {
    if (!selected) return;
    setGerandoEtiqueta(true);
    setErroEtiqueta('');
    try {
      const result = await gerarEtiqueta(selected.id);
      if (result.error) {
        setErroEtiqueta(result.error);
        return;
      }
      // Recarregar pedidos para pegar campos atualizados
      const atualizados = await getPedidos();
      setPedidos(atualizados);
      const updatedSelected = atualizados.find(p => p.id === selected.id) ?? null;
      setSelected(updatedSelected);
    } catch {
      setErroEtiqueta('Erro ao conectar com o servidor. Tente novamente.');
    } finally {
      setGerandoEtiqueta(false);
    }
  }

  async function handleSalvarRastreio() {
    if (!selected || !rastreio.trim()) return;
    setSalvandoRastreio(true);
    try {
      await updatePedidoRastreio(selected.id, rastreio.trim(), 'enviado');
      const updated = { ...selected, codigoRastreio: rastreio.trim(), status: 'enviado' as Pedido['status'] };
      setPedidos(prev => prev.map(p => p.id === selected.id ? updated : p));
      setSelected(updated);
    } catch {
      alert('Erro ao salvar rastreio.');
    } finally {
      setSalvandoRastreio(false);
    }
  }

  async function handleCancelarPedido() {
    if (!selected || !confirm('Cancelar este pedido?')) return;
    await updatePedidoStatus(selected.id, 'cancelado');
    const updated = { ...selected, status: 'cancelado' as Pedido['status'] };
    setPedidos(prev => prev.map(p => p.id === selected.id ? updated : p));
    setSelected(updated);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <SectionHeader
        title="Pedidos"
        subtitle={`${filtered.length} pedido${filtered.length !== 1 ? 's' : ''}`}
        action={
          <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => setCriandoPedido(true)}>
            Novo pedido
          </Button>
        }
      />

      <Card padding={false}>
        <FilterBar onExport={() => alert('Exportando CSV...')}>
          <SearchBar value={search} onChange={setSearch} placeholder="Número, cliente ou e-mail…" className="w-64" />
          <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} options={statusOptions} className="w-40" />
        </FilterBar>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-th">Pedido</th>
                <th className="table-th">Cliente</th>
                <th className="table-th">Itens</th>
                <th className="table-th">Total</th>
                <th className="table-th">Pagamento</th>
                <th className="table-th">Data</th>
                <th className="table-th">Status</th>
                <th className="table-th">Envio</th>
                <th className="table-th">Ações</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-sm text-charcoal-400">
                    Nenhum pedido encontrado
                  </td>
                </tr>
              ) : paginated.map(p => (
                <tr key={p.id} className="border-t border-cream-100 hover:bg-cream-50 transition-colors cursor-pointer" onClick={() => { setSelected(p); setRastreio(p.codigoRastreio ?? ''); setErroEtiqueta(''); }}>
                  <td className="table-td font-medium text-charcoal-700">{p.numero}</td>
                  <td className="table-td">
                    <p className="text-sm text-charcoal-700">{p.cliente?.name ?? '—'}</p>
                    <p className="text-xs text-charcoal-400">{p.cliente?.email ?? ''}</p>
                  </td>
                  <td className="table-td text-charcoal-500">{p.itens.length}</td>
                  <td className="table-td font-medium text-charcoal-700">R$ {p.total.toFixed(2)}</td>
                  <td className="table-td text-charcoal-500">{p.formaPagamento}</td>
                  <td className="table-td text-charcoal-500">{new Date(p.createdAt).toLocaleDateString('pt-BR')}</td>
                  <td className="table-td">
                    <Badge variant={statusVariant[p.status] ?? 'inactive'}>{p.status}</Badge>
                  </td>
                  <td className="table-td">
                    {p.etiquetaUrl ? (
                      <a href={p.etiquetaUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="flex items-center gap-1 text-xs text-forest-600 hover:text-forest-700 font-medium">
                        <Tag size={12} /> Etiqueta
                      </a>
                    ) : p.codigoRastreio ? (
                      <span className="text-xs text-charcoal-400 font-mono">{p.codigoRastreio}</span>
                    ) : (
                      <span className="text-xs text-charcoal-300">—</span>
                    )}
                  </td>
                  <td className="table-td">
                    <button onClick={e => { e.stopPropagation(); setSelected(p); setRastreio(p.codigoRastreio ?? ''); setErroEtiqueta(''); }} className="p-1.5 text-charcoal-400 hover:text-forest-500 hover:bg-forest-50 rounded-sm transition-colors">
                      <Eye size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Pagination page={page} total={filtered.length} perPage={perPage} onChange={setPage} />
      </Card>

      {/* ── Modal — Novo pedido ──────────────────────────────────────────────── */}
      <Modal open={criandoPedido} onClose={() => { setCriandoPedido(false); resetForm(); }} title="Novo Pedido" size="xl">
        <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">

          {/* Cliente */}
          <div>
            <p className="text-xs font-medium text-charcoal-400 uppercase tracking-wider mb-2">Cliente (opcional)</p>
            <div className="flex gap-2">
              <Input
                value={clienteEmail}
                onChange={e => { setClienteEmail(e.target.value); setClienteId(null); setClienteNome(''); }}
                placeholder="E-mail do cliente…"
                className="flex-1"
                onKeyDown={e => e.key === 'Enter' && handleBuscarCliente()}
              />
              <Button variant="secondary" size="sm" loading={buscandoCliente} onClick={handleBuscarCliente} icon={<Search size={13} />}>
                Buscar
              </Button>
            </div>
            {clienteNome && (
              <p className="mt-1.5 text-sm text-forest-600 font-medium">✓ {clienteNome}</p>
            )}
          </div>

          {/* Itens */}
          <div>
            <p className="text-xs font-medium text-charcoal-400 uppercase tracking-wider mb-2">Itens do pedido</p>
            <div className="space-y-2">
              {itens.map((item, idx) => (
                <div key={item.id} className="flex gap-2 items-start">
                  <div className="flex-1">
                    <input
                      value={item.nome}
                      onChange={e => atualizarItem(item.id, { nome: e.target.value })}
                      placeholder="Nome do produto *"
                      className="w-full px-2.5 py-1.5 text-sm border border-cream-200 rounded-sm bg-white text-charcoal-700 placeholder-charcoal-300 focus:outline-none focus:ring-1 focus:ring-forest-400"
                    />
                  </div>
                  <div className="w-20">
                    <input
                      type="number" min="1" value={item.quantidade}
                      onChange={e => atualizarItem(item.id, { quantidade: e.target.value })}
                      placeholder="Qtd"
                      className="w-full px-2.5 py-1.5 text-sm border border-cream-200 rounded-sm bg-white text-charcoal-700 focus:outline-none focus:ring-1 focus:ring-forest-400"
                    />
                  </div>
                  <div className="w-32">
                    <input
                      type="number" min="0" step="0.01" value={item.precoUnitario}
                      onChange={e => atualizarItem(item.id, { precoUnitario: e.target.value })}
                      placeholder="Preço *"
                      className="w-full px-2.5 py-1.5 text-sm border border-cream-200 rounded-sm bg-white text-charcoal-700 focus:outline-none focus:ring-1 focus:ring-forest-400"
                    />
                  </div>
                  <div className="w-24 text-right pt-1.5 text-sm text-charcoal-500">
                    R$ {((parseFloat(item.quantidade) || 0) * (parseFloat(item.precoUnitario) || 0)).toFixed(2)}
                  </div>
                  {itens.length > 1 && (
                    <button onClick={() => setItens(prev => prev.filter(i => i.id !== item.id))} className="p-1.5 text-charcoal-300 hover:text-red-500 transition-colors mt-0.5">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
              {itens.length === 1 && <div className="w-6" />}
            </div>
            <button onClick={() => setItens(prev => [...prev, emptyItem()])} className="mt-2 flex items-center gap-1.5 text-sm text-forest-600 hover:text-forest-700 font-medium">
              <Plus size={13} /> Adicionar item
            </button>
          </div>

          {/* Valores */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-cream-50 rounded-sm p-3 text-center">
              <p className="text-xs text-charcoal-400 mb-1">Subtotal</p>
              <p className="font-medium text-charcoal-700">R$ {subtotalCalc.toFixed(2)}</p>
            </div>
            <div>
              <Input label="Frete (R$)" type="number" min="0" step="0.01" value={frete} onChange={e => setFrete(e.target.value)} />
            </div>
            <div>
              <Input label="Desconto (R$)" type="number" min="0" step="0.01" value={desconto} onChange={e => setDesconto(e.target.value)} />
            </div>
            <div className="bg-forest-50 rounded-sm p-3 text-center">
              <p className="text-xs text-forest-600 mb-1">Total</p>
              <p className="font-serif text-lg font-medium text-forest-700">R$ {totalCalc.toFixed(2)}</p>
            </div>
          </div>

          {/* Pagamento e status */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Forma de pagamento"
              value={formaPagamento}
              onChange={e => setFormaPagamento(e.target.value)}
              placeholder="Ex: PIX, Dinheiro, Cartão…"
            />
            <div>
              <label className="block text-sm font-medium text-charcoal-600 mb-1.5">Status</label>
              <select value={formStatus} onChange={e => setFormStatus(e.target.value as 'pendente' | 'pago')} className="w-full px-3 py-2 text-sm border border-cream-300 rounded-sm bg-white text-charcoal-700 focus:outline-none focus:ring-1 focus:ring-forest-400">
                <option value="pago">Pago</option>
                <option value="pendente">Pendente</option>
              </select>
            </div>
          </div>

          {/* Endereço */}
          <div>
            <p className="text-xs font-medium text-charcoal-400 uppercase tracking-wider mb-2">Endereço de entrega</p>
            <div className="grid grid-cols-2 gap-2">
              <Input label="CEP" value={endereco.cep} onChange={e => setEndereco(p => ({ ...p, cep: e.target.value }))} placeholder="00000-000" />
              <Input label="Número" value={endereco.numero} onChange={e => setEndereco(p => ({ ...p, numero: e.target.value }))} />
              <div className="col-span-2">
                <Input label="Logradouro" value={endereco.logradouro} onChange={e => setEndereco(p => ({ ...p, logradouro: e.target.value }))} placeholder="Rua, Av., …" />
              </div>
              <Input label="Complemento" value={endereco.complemento} onChange={e => setEndereco(p => ({ ...p, complemento: e.target.value }))} placeholder="Apto, Bloco…" />
              <Input label="Bairro" value={endereco.bairro} onChange={e => setEndereco(p => ({ ...p, bairro: e.target.value }))} />
              <Input label="Cidade" value={endereco.cidade} onChange={e => setEndereco(p => ({ ...p, cidade: e.target.value }))} />
              <Input label="Estado (UF)" value={endereco.estado} onChange={e => setEndereco(p => ({ ...p, estado: e.target.value.toUpperCase().slice(0, 2) }))} placeholder="MG" />
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="block text-sm font-medium text-charcoal-600 mb-1.5">Observações</label>
            <textarea rows={2} value={observacoes} onChange={e => setObservacoes(e.target.value)} placeholder="Instruções de entrega, notas internas…" className="w-full px-3 py-2 text-sm border border-cream-300 rounded-sm bg-white text-charcoal-700 placeholder-charcoal-300 focus:outline-none focus:ring-1 focus:ring-forest-400 resize-none" />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-cream-100 mt-4">
          <Button variant="ghost" onClick={() => { setCriandoPedido(false); resetForm(); }}>Cancelar</Button>
          <Button variant="primary" loading={salvandoPedido} icon={<Package size={14} />} onClick={handleCriarPedido}>
            Criar pedido
          </Button>
        </div>
      </Modal>

      {/* ── Modal — Detalhe do pedido ────────────────────────────────────────── */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title={`Pedido ${selected?.numero}`} size="xl">
        {selected && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Cliente', value: selected.cliente?.name ?? '—' },
                { label: 'Data', value: new Date(selected.createdAt).toLocaleDateString('pt-BR') },
                { label: 'Pagamento', value: selected.formaPagamento },
                { label: 'Status', value: <Badge variant={statusVariant[selected.status] ?? 'inactive'}>{selected.status}</Badge> },
              ].map(info => (
                <div key={info.label} className="bg-cream-50 rounded-sm p-3">
                  <p className="text-xs text-charcoal-400 mb-1">{info.label}</p>
                  <div className="text-sm font-medium text-charcoal-700">{info.value}</div>
                </div>
              ))}
            </div>

            {/* Itens */}
            <div>
              <p className="text-xs font-medium text-charcoal-400 uppercase tracking-wider mb-3">Itens do pedido</p>
              <div className="space-y-2">
                {selected.itens.map(item => (
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
            </div>

            {/* Totals */}
            <div className="bg-cream-50 rounded-sm p-4 space-y-2">
              <div className="flex justify-between text-sm"><span className="text-charcoal-500">Subtotal</span><span>R$ {selected.subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-charcoal-500">Frete</span><span>R$ {selected.frete.toFixed(2)}</span></div>
              {selected.desconto > 0 && (
                <div className="flex justify-between text-sm text-forest-500">
                  <span>Desconto {selected.cupom && `(${selected.cupom})`}</span>
                  <span>- R$ {selected.desconto.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-medium border-t border-cream-200 pt-2">
                <span className="text-charcoal-700">Total</span>
                <span className="font-serif text-lg">R$ {selected.total.toFixed(2)}</span>
              </div>
            </div>

            {/* Endereço */}
            <div>
              <p className="text-xs font-medium text-charcoal-400 uppercase tracking-wider mb-2">Endereço de entrega</p>
              <p className="text-sm text-charcoal-600">
                {selected.enderecoEntrega.logradouro}, {selected.enderecoEntrega.numero}
                {selected.enderecoEntrega.complemento && `, ${selected.enderecoEntrega.complemento}`}
              </p>
              <p className="text-sm text-charcoal-600">
                {selected.enderecoEntrega.bairro} — {selected.enderecoEntrega.cidade}/{selected.enderecoEntrega.estado} · CEP {selected.enderecoEntrega.cep}
              </p>
            </div>

            {/* Observações */}
            {selected.observacoes && (
              <div>
                <p className="text-xs font-medium text-charcoal-400 uppercase tracking-wider mb-1">Observações</p>
                <p className="text-sm text-charcoal-600">{selected.observacoes}</p>
              </div>
            )}

            {/* Etiqueta MelhorEnvio */}
            {selected.status !== 'cancelado' && selected.status !== 'reembolsado' && (
              <div>
                <p className="text-xs font-medium text-charcoal-400 uppercase tracking-wider mb-2">Etiqueta de envio</p>

                {selected.etiquetaUrl ? (
                  /* Etiqueta já gerada */
                  <div className="flex flex-wrap items-center gap-3 p-3 bg-forest-50 border border-forest-200 rounded-sm">
                    <Tag size={16} className="text-forest-500" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-forest-700">Etiqueta gerada</p>
                      {selected.codigoRastreio && (
                        <p className="text-xs text-charcoal-500 font-mono mt-0.5">{selected.codigoRastreio}</p>
                      )}
                    </div>
                    <a href={selected.etiquetaUrl} target="_blank" rel="noopener noreferrer">
                      <Button variant="primary" size="sm" icon={<ExternalLink size={13} />}>
                        Imprimir etiqueta
                      </Button>
                    </a>
                  </div>
                ) : (
                  /* Sem etiqueta — gerar */
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

            {/* Rastreio manual */}
            {!selected.etiquetaUrl && selected.status !== 'cancelado' && selected.status !== 'entregue' && (
              <div>
                <p className="text-xs font-medium text-charcoal-400 uppercase tracking-wider mb-2">Código de rastreio manual</p>
                <div className="flex gap-2">
                  <Input value={rastreio} onChange={e => setRastreio(e.target.value)} placeholder="Ex: BR123456789BR" className="flex-1" />
                  <Button variant="secondary" size="sm" loading={salvandoRastreio} onClick={handleSalvarRastreio} icon={<Truck size={13} />}>
                    Salvar
                  </Button>
                </div>
                {selected.codigoRastreio && (
                  <p className="mt-1 text-xs text-charcoal-400">Atual: <span className="font-mono">{selected.codigoRastreio}</span></p>
                )}
              </div>
            )}

            {/* Ações */}
            <div className="flex flex-wrap gap-3 pt-2 border-t border-cream-200">
              {selected.status === 'pago' && (
                <Button variant="secondary" size="sm" onClick={async () => {
                  await updatePedidoStatus(selected.id, 'em_separacao');
                  const u = { ...selected, status: 'em_separacao' as Pedido['status'] };
                  setPedidos(prev => prev.map(p => p.id === selected.id ? u : p));
                  setSelected(u);
                }}>
                  <Check size={14} /> Em separação
                </Button>
              )}
              {selected.status === 'em_separacao' && (
                <Button variant="primary" size="sm" onClick={handleSalvarRastreio} loading={salvandoRastreio} icon={<Truck size={14} />}>
                  Marcar como enviado
                </Button>
              )}
              {selected.status !== 'cancelado' && selected.status !== 'entregue' && selected.status !== 'reembolsado' && (
                <Button variant="danger" size="sm" onClick={handleCancelarPedido} icon={<X size={14} />}>
                  Cancelar pedido
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
