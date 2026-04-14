import React, { useState } from 'react';
import { CreditCard, Plus, Trash2, Star, Shield, CheckCircle } from 'lucide-react';
import { Card, Button, Input, Modal, Alert } from '../../components/ui';

interface CartaoSalvo {
  id: string;
  bandeira: 'visa' | 'mastercard' | 'elo' | 'amex';
  ultimos4: string;
  titular: string;
  validade: string;
  padrao: boolean;
}

const BANDEIRAS: Record<CartaoSalvo['bandeira'], { nome: string; cor: string }> = {
  visa:       { nome: 'Visa',       cor: 'bg-blue-600' },
  mastercard: { nome: 'Mastercard', cor: 'bg-red-500' },
  elo:        { nome: 'Elo',        cor: 'bg-yellow-500' },
  amex:       { nome: 'Amex',       cor: 'bg-indigo-600' },
};

const cartoesIniciaisf: CartaoSalvo[] = [
  {
    id: 'card_001',
    bandeira: 'visa',
    ultimos4: '4242',
    titular: 'MARINA A OLIVEIRA',
    validade: '08/28',
    padrao: true,
  },
];

function detectarBandeira(numero: string): CartaoSalvo['bandeira'] {
  const n = numero.replace(/\s/g, '');
  if (n.startsWith('4')) return 'visa';
  if (n.match(/^5[1-5]/)) return 'mastercard';
  if (n.startsWith('34') || n.startsWith('37')) return 'amex';
  return 'elo';
}

function formatarNumero(val: string) {
  return val.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
}

function formatarValidade(val: string) {
  return val.replace(/\D/g, '').slice(0, 4).replace(/^(\d{2})(\d)/, '$1/$2');
}

export function ClientPagamentos() {
  const [cartoes, setCartoes] = useState<CartaoSalvo[]>(cartoesIniciaisf);
  const [modalAdd, setModalAdd] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [sucesso, setSucesso] = useState('');

  const [form, setForm] = useState({
    numero: '',
    titular: '',
    validade: '',
    cvv: '',
    padrao: false,
  });
  const [erros, setErros] = useState<Record<string, string>>({});

  function validar() {
    const e: Record<string, string> = {};
    if (form.numero.replace(/\s/g, '').length < 16) e.numero = 'Número inválido';
    if (!form.titular.trim()) e.titular = 'Obrigatório';
    if (!form.validade.match(/^\d{2}\/\d{2}$/)) e.validade = 'MM/AA inválido';
    if (form.cvv.length < 3) e.cvv = 'CVV inválido';
    return e;
  }

  async function handleSalvar() {
    const e = validar();
    if (Object.keys(e).length) { setErros(e); return; }
    setSalvando(true);
    await new Promise(r => setTimeout(r, 800));

    const novo: CartaoSalvo = {
      id: `card_${Date.now()}`,
      bandeira: detectarBandeira(form.numero),
      ultimos4: form.numero.replace(/\s/g, '').slice(-4),
      titular: form.titular.toUpperCase(),
      validade: form.validade,
      padrao: form.padrao,
    };

    let lista = [...cartoes, novo];
    if (form.padrao) lista = lista.map(c => c.id === novo.id ? c : { ...c, padrao: false });
    setCartoes(lista);
    setSalvando(false);
    setModalAdd(false);
    setForm({ numero: '', titular: '', validade: '', cvv: '', padrao: false });
    setSucesso('Cartão adicionado com sucesso!');
    setTimeout(() => setSucesso(''), 4000);
  }

  function handleDefinirPadrao(id: string) {
    setCartoes(prev => prev.map(c => ({ ...c, padrao: c.id === id })));
    setSucesso('Cartão padrão atualizado.');
    setTimeout(() => setSucesso(''), 3000);
  }

  function handleExcluir(id: string) {
    setCartoes(prev => prev.filter(c => c.id !== id));
    setConfirmDelete(null);
    setSucesso('Cartão removido.');
    setTimeout(() => setSucesso(''), 3000);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl text-charcoal-700">Pagamentos</h1>
          <p className="text-charcoal-400 text-sm mt-1">Gerencie seus métodos de pagamento para assinatura e pedidos.</p>
        </div>
        <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => { setModalAdd(true); setErros({}); }}>
          Novo cartão
        </Button>
      </div>

      {sucesso && <Alert type="success" message={sucesso} />}

      {/* Aviso segurança */}
      <div className="flex items-center gap-3 p-4 bg-forest-50 border border-forest-100 rounded-sm text-sm text-forest-700">
        <Shield size={16} className="shrink-0" />
        Seus dados de pagamento são criptografados e não armazenamos o número completo do cartão.
      </div>

      {/* Cartões */}
      {cartoes.length === 0 ? (
        <Card className="text-center py-16">
          <CreditCard size={48} className="text-charcoal-200 mx-auto mb-3" />
          <p className="font-serif text-xl text-charcoal-500">Nenhum cartão salvo</p>
          <p className="text-sm text-charcoal-400 mt-1 mb-5">Adicione um cartão para pagamentos futuros.</p>
          <Button variant="primary" onClick={() => setModalAdd(true)} icon={<Plus size={14} />}>Adicionar cartão</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {cartoes.map(cartao => {
            const bInfo = BANDEIRAS[cartao.bandeira];
            return (
              <Card key={cartao.id} className={`relative overflow-hidden ${cartao.padrao ? 'ring-2 ring-forest-400' : ''}`}>
                {/* Background decorativo */}
                <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-cream-50 -translate-y-8 translate-x-8 opacity-50" />
                <div className="relative">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`${bInfo.cor} text-white text-xs font-bold px-2.5 py-1 rounded-sm`}>
                      {bInfo.nome}
                    </div>
                    <div className="flex items-center gap-1">
                      {cartao.padrao && (
                        <span className="flex items-center gap-1 text-xs text-forest-600 bg-forest-50 px-2 py-0.5 rounded-full">
                          <Star size={10} fill="currentColor" /> Padrão
                        </span>
                      )}
                      {!cartao.padrao && (
                        <button onClick={() => setConfirmDelete(cartao.id)} className="p-1.5 hover:bg-red-50 rounded-sm text-charcoal-400 hover:text-red-500 transition-colors">
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="font-mono text-charcoal-700 text-lg tracking-widest mb-3">
                    •••• •••• •••• {cartao.ultimos4}
                  </p>

                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-xs text-charcoal-400 mb-0.5">Titular</p>
                      <p className="text-sm text-charcoal-700 font-medium">{cartao.titular}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-charcoal-400 mb-0.5">Validade</p>
                      <p className="text-sm text-charcoal-700 font-medium">{cartao.validade}</p>
                    </div>
                  </div>

                  {!cartao.padrao && (
                    <button
                      onClick={() => handleDefinirPadrao(cartao.id)}
                      className="mt-4 text-xs text-forest-500 hover:text-forest-600 font-medium"
                    >
                      Definir como padrão
                    </button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Histórico de cobranças resumido */}
      <Card>
        <h3 className="font-serif text-lg text-charcoal-700 mb-4">Últimas Cobranças</h3>
        <div className="space-y-3">
          {[
            { data: '05/04/2026', desc: 'Assinatura Cafés Raridades — Abr/2026', valor: 207.90, status: 'pago' },
            { data: '05/03/2026', desc: 'Assinatura Cafés Raridades — Mar/2026', valor: 207.90, status: 'pago' },
            { data: '05/02/2026', desc: 'Assinatura Cafés Raridades — Fev/2026', valor: 207.90, status: 'pago' },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between py-3 border-b border-cream-100 last:border-0">
              <div>
                <p className="text-sm text-charcoal-700">{item.desc}</p>
                <p className="text-xs text-charcoal-400 mt-0.5">{item.data}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-xs text-forest-600">
                  <CheckCircle size={12} /> {item.status}
                </span>
                <span className="font-serif text-charcoal-700">R$ {item.valor.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Modal adicionar cartão */}
      <Modal open={modalAdd} onClose={() => setModalAdd(false)} title="Adicionar Cartão">
        <div className="space-y-4">
          <Input
            label="Número do cartão *"
            value={form.numero}
            onChange={e => setForm(p => ({ ...p, numero: formatarNumero(e.target.value) }))}
            placeholder="0000 0000 0000 0000"
            error={erros.numero}
            leftIcon={<CreditCard size={14} />}
          />
          <Input
            label="Nome no cartão *"
            value={form.titular}
            onChange={e => setForm(p => ({ ...p, titular: e.target.value }))}
            placeholder="Como aparece no cartão"
            error={erros.titular}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Validade *"
              value={form.validade}
              onChange={e => setForm(p => ({ ...p, validade: formatarValidade(e.target.value) }))}
              placeholder="MM/AA"
              error={erros.validade}
            />
            <Input
              label="CVV *"
              value={form.cvv}
              onChange={e => setForm(p => ({ ...p, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
              placeholder="000"
              error={erros.cvv}
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.padrao}
              onChange={e => setForm(p => ({ ...p, padrao: e.target.checked }))}
              className="w-4 h-4 accent-forest-500"
            />
            <span className="text-sm text-charcoal-600">Definir como cartão padrão</span>
          </label>
          <div className="flex justify-end gap-3 pt-2 border-t border-cream-100">
            <Button variant="ghost" onClick={() => setModalAdd(false)}>Cancelar</Button>
            <Button variant="primary" loading={salvando} onClick={handleSalvar} icon={<Plus size={14} />}>
              Adicionar cartão
            </Button>
          </div>
        </div>
      </Modal>

      {/* Confirmar exclusão */}
      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Remover cartão">
        <p className="text-charcoal-600 mb-6">Tem certeza que deseja remover este cartão?</p>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setConfirmDelete(null)}>Cancelar</Button>
          <Button variant="danger" icon={<Trash2 size={14} />} onClick={() => handleExcluir(confirmDelete!)}>
            Remover
          </Button>
        </div>
      </Modal>
    </div>
  );
}
