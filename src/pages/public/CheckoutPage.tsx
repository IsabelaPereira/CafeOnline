import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingCart, MapPin, CreditCard, CheckCircle2,
  ChevronRight, Package, Minus, Plus, X, Lock,
  QrCode, FileText, ArrowLeft, Store
} from 'lucide-react';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import { createPedido } from '../../services/pedidos.service';
import { getClienteByUserId } from '../../services/clientes.service';
import { createCheckoutSession } from '../../services/stripe.service';
import { RETIRADA_OPCAO } from '../../services/frete.service';
import { upsertLeadByEmail } from '../../services/leads.service';
import { supabase } from '../../lib/supabase';

// ---- STEP INDICATOR ----
function StepIndicator({ step }: { step: number }) {
  const steps = [
    { n: 1, label: 'Carrinho' },
    { n: 2, label: 'Entrega' },
    { n: 3, label: 'Pagamento' },
    { n: 4, label: 'Confirmação' },
  ];

  return (
    <div className="flex items-center justify-center gap-0 mb-10">
      {steps.map((s, i) => (
        <React.Fragment key={s.n}>
          <div className="flex flex-col items-center gap-1">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                step > s.n
                  ? 'bg-forest-500 text-white'
                  : step === s.n
                  ? 'bg-charcoal-700 text-cream-100'
                  : 'bg-cream-300 text-charcoal-400'
              }`}
            >
              {step > s.n ? <CheckCircle2 size={16} /> : s.n}
            </div>
            <span
              className={`text-xs whitespace-nowrap ${
                step >= s.n ? 'text-charcoal-600 font-medium' : 'text-charcoal-400'
              }`}
            >
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={`h-px w-12 sm:w-20 mb-4 transition-colors ${
                step > s.n ? 'bg-forest-500' : 'bg-cream-300'
              }`}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ---- ORDER SUMMARY PANEL ----
function OrderSummary({
  frete,
  cupom,
  desconto,
}: {
  frete: number;
  cupom: string;
  desconto: number;
}) {
  const { items, total, updateQuantity, removeItem } = useCart();

  return (
    <div className="bg-white rounded-sm border border-cream-200">
      <div className="px-6 py-4 border-b border-cream-200">
        <h3 className="font-serif text-lg text-charcoal-700">Resumo do pedido</h3>
      </div>
      <div className="px-6 py-4 space-y-4">
        {items.map(item => {
          const preco = item.produto.precoPromocional ?? item.produto.preco;
          return (
            <div key={item.produto.id} className="flex gap-3">
              <div className="w-12 h-12 bg-cream-100 rounded-sm flex items-center justify-center shrink-0">
                <Package size={18} className="text-earth-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-charcoal-700 leading-tight">
                  {item.produto.nome}
                </p>
                <p className="text-xs text-charcoal-400 mb-1">
                  {item.preferencia === 'grao' ? 'Em Grão' : 'Moído'} · 250g
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex items-center border border-cream-300 rounded-sm">
                    <button
                      onClick={() => updateQuantity(item.produto.id, item.quantidade - 1)}
                      className="p-1 hover:bg-cream-100 transition-colors"
                    >
                      <Minus size={10} />
                    </button>
                    <span className="px-2 text-xs">{item.quantidade}</span>
                    <button
                      onClick={() => updateQuantity(item.produto.id, item.quantidade + 1)}
                      className="p-1 hover:bg-cream-100 transition-colors"
                    >
                      <Plus size={10} />
                    </button>
                  </div>
                  <button
                    onClick={() => removeItem(item.produto.id)}
                    className="text-charcoal-300 hover:text-red-400 transition-colors"
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>
              <span className="text-sm font-medium text-charcoal-700 shrink-0">
                R$ {(preco * item.quantidade).toFixed(2)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Totals */}
      <div className="px-6 py-4 border-t border-cream-100 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-charcoal-500">Subtotal</span>
          <span className="text-charcoal-700">R$ {total.toFixed(2)}</span>
        </div>
        {desconto > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-charcoal-500">Cupom ({cupom})</span>
            <span className="text-forest-600">− R$ {desconto.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span className="text-charcoal-500">Frete</span>
          <span className="text-charcoal-700">
            {frete === 0 ? (
              <span className="text-forest-600">Grátis</span>
            ) : (
              `R$ ${frete.toFixed(2)}`
            )}
          </span>
        </div>
        <div className="flex justify-between font-medium border-t border-cream-200 pt-2">
          <span className="text-charcoal-700">Total</span>
          <span className="font-serif text-xl text-charcoal-700">
            R$ {Math.max(0, total - desconto + frete).toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ---- STEP 1: CART ----
function StepCart({
  onNext,
  cupomAplicado,
  setCupomAplicado,
  desconto,
  setDesconto,
}: {
  onNext: () => void;
  cupomAplicado: string;
  setCupomAplicado: (v: string) => void;
  desconto: number;
  setDesconto: (v: number) => void;
}) {
  const { items, count } = useCart();
  const [cupomInput, setCupomInput] = useState('');
  const [cupomErro, setCupomErro] = useState('');

  const CUPONS: Record<string, number> = {
    BEMVINDO10: 10,
    DASMATAS15: 15,
    CAFE20: 20,
  };

  const aplicarCupom = () => {
    const code = cupomInput.toUpperCase().trim();
    if (CUPONS[code]) {
      setCupomAplicado(code);
      setDesconto(CUPONS[code]);
      setCupomErro('');
    } else {
      setCupomErro('Cupom inválido ou expirado.');
      setCupomAplicado('');
      setDesconto(0);
    }
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-20">
        <ShoppingCart size={56} className="text-charcoal-200 mx-auto mb-4" />
        <p className="font-serif text-2xl text-charcoal-500 mb-2">Carrinho vazio</p>
        <p className="text-charcoal-400 mb-6">Adicione produtos da nossa loja para continuar.</p>
        <Link
          to="/loja"
          className="inline-flex items-center gap-2 px-6 py-3 bg-forest-500 text-cream-100 text-sm font-medium rounded-sm hover:bg-forest-600 transition-colors uppercase tracking-wider"
        >
          Ir à loja
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h2 className="font-serif text-2xl text-charcoal-700 mb-6">Seu carrinho ({count} {count === 1 ? 'item' : 'itens'})</h2>

      {/* Cupom */}
      <div className="bg-white rounded-sm border border-cream-200 p-5 mb-6">
        <p className="text-sm font-medium text-charcoal-600 mb-3">Cupom de desconto</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={cupomInput}
            onChange={e => { setCupomInput(e.target.value); setCupomErro(''); }}
            placeholder="Ex: BEMVINDO10"
            className="flex-1 px-4 py-2.5 border border-cream-300 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-forest-400 uppercase"
          />
          <button
            onClick={aplicarCupom}
            className="px-5 py-2.5 bg-charcoal-700 text-cream-100 text-sm font-medium rounded-sm hover:bg-charcoal-800 transition-colors"
          >
            Aplicar
          </button>
        </div>
        {cupomErro && <p className="text-xs text-red-500 mt-2">{cupomErro}</p>}
        {cupomAplicado && (
          <p className="text-xs text-forest-600 mt-2">
            Cupom aplicado! Desconto de R$ {desconto.toFixed(2)}.
          </p>
        )}
      </div>

      <OrderSummary frete={0} cupom={cupomAplicado} desconto={desconto} />

      <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-between">
        <Link
          to="/loja"
          className="flex items-center gap-2 text-sm text-charcoal-500 hover:text-charcoal-700 transition-colors"
        >
          <ArrowLeft size={14} />
          Continuar comprando
        </Link>
        <button
          onClick={onNext}
          className="flex items-center justify-center gap-2 px-8 py-3.5 bg-forest-500 text-cream-100 text-sm font-medium rounded-sm hover:bg-forest-600 transition-colors uppercase tracking-wider"
        >
          Ir para entrega
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

// ---- STEP 2: DELIVERY ----
interface EnderecoForm {
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
}

const FRETE_OPCOES = [
  RETIRADA_OPCAO,
  { id: 'pac',   nome: 'PAC — Correios',   empresa: '7–12 dias úteis', preco: 18.9,  prazo: 7 },
  { id: 'sedex', nome: 'SEDEX — Correios', empresa: '2–5 dias úteis',  preco: 34.9,  prazo: 5 },
  { id: 'jadlog', nome: 'Jadlog',          empresa: '5–8 dias úteis',  preco: 22.5,  prazo: 5 },
];

interface ContatoForm { nome: string; email: string; telefone: string; }

function StepEntrega({
  onNext,
  onBack,
  endereco,
  setEndereco,
  freteOpcaoId,
  setFreteOpcaoId,
  setFrete,
  contato,
  setContato,
  isLoggedIn,
}: {
  onNext: () => void;
  onBack: () => void;
  endereco: EnderecoForm;
  setEndereco: (e: EnderecoForm) => void;
  freteOpcaoId: string;
  setFreteOpcaoId: (id: string) => void;
  setFrete: (f: number) => void;
  contato: ContatoForm;
  setContato: (c: ContatoForm) => void;
  isLoggedIn: boolean;
}) {
  const [cepLoading, setCepLoading] = useState(false);
  const [cepErro, setCepErro] = useState('');

  const isRetirada = freteOpcaoId === 'retirada';

  const buscarCep = async () => {
    const cep = endereco.cep.replace(/\D/g, '');
    if (cep.length !== 8) return;
    setCepLoading(true);
    setCepErro('');
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (data.erro) {
        setCepErro('CEP não encontrado.');
      } else {
        setEndereco({
          ...endereco,
          logradouro: data.logradouro ?? '',
          bairro: data.bairro ?? '',
          cidade: data.localidade ?? '',
          estado: data.uf ?? '',
        });
      }
    } catch {
      setCepErro('Erro ao buscar CEP. Preencha manualmente.');
    } finally {
      setCepLoading(false);
    }
  };

  const selecionarFrete = (id: string, preco: number) => {
    setFreteOpcaoId(id);
    setFrete(preco);
  };

  const formValido =
    isRetirada ||
    (endereco.cep.replace(/\D/g, '').length === 8 &&
      !!endereco.logradouro &&
      !!endereco.numero &&
      !!endereco.cidade &&
      !!endereco.estado);

  const field = (
    label: string,
    key: keyof EnderecoForm,
    props?: React.InputHTMLAttributes<HTMLInputElement>
  ) => (
    <div>
      <label className="block text-xs font-medium text-charcoal-500 mb-1">{label}</label>
      <input
        value={endereco[key]}
        onChange={e => setEndereco({ ...endereco, [key]: e.target.value })}
        className="w-full px-4 py-2.5 border border-cream-300 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-forest-400"
        {...props}
      />
    </div>
  );

  return (
    <div>
      <h2 className="font-serif text-2xl text-charcoal-700 mb-6">Entrega</h2>

      {/* Dados de contato — apenas para visitantes não autenticados */}
      {!isLoggedIn && (
        <div className="bg-white rounded-sm border border-cream-200 p-6 mb-6 space-y-4">
          <p className="text-sm font-medium text-charcoal-600">Dados de contato</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-charcoal-500 mb-1">Nome completo</label>
              <input value={contato.nome} onChange={e => setContato({ ...contato, nome: e.target.value })}
                placeholder="Seu nome" className="w-full px-4 py-2.5 border border-cream-300 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-forest-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-charcoal-500 mb-1">E-mail</label>
              <input type="email" value={contato.email} onChange={e => setContato({ ...contato, email: e.target.value })}
                placeholder="seu@email.com" className="w-full px-4 py-2.5 border border-cream-300 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-forest-400" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-charcoal-500 mb-1">Telefone / WhatsApp (opcional)</label>
            <input value={contato.telefone} onChange={e => setContato({ ...contato, telefone: e.target.value })}
              placeholder="(11) 99999-9999" className="w-full px-4 py-2.5 border border-cream-300 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-forest-400" />
          </div>
        </div>
      )}

      {/* Opções de entrega */}
      <div className="bg-white rounded-sm border border-cream-200 p-6 mb-6">
        <p className="text-sm font-medium text-charcoal-600 mb-4">Forma de entrega</p>
        <div className="space-y-3">
          {FRETE_OPCOES.map(opt => (
            <label
              key={opt.id}
              className={`flex items-center justify-between p-4 rounded-sm border-2 cursor-pointer transition-colors ${
                freteOpcaoId === opt.id
                  ? 'border-forest-500 bg-forest-50'
                  : 'border-cream-200 hover:border-cream-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="frete"
                  value={opt.id}
                  checked={freteOpcaoId === opt.id}
                  onChange={() => selecionarFrete(opt.id, opt.preco)}
                  className="text-forest-500"
                />
                <div className="flex items-center gap-2">
                  {opt.id === 'retirada'
                    ? <Store size={15} className="text-charcoal-400 shrink-0" />
                    : <MapPin size={15} className="text-charcoal-400 shrink-0" />
                  }
                  <div>
                    <p className="text-sm font-medium text-charcoal-700">{opt.nome}</p>
                    <p className="text-xs text-charcoal-400">
                      {opt.id === 'retirada' ? opt.empresa : opt.empresa}
                    </p>
                  </div>
                </div>
              </div>
              {opt.preco === 0
                ? <span className="text-sm font-medium text-forest-600">Grátis</span>
                : <span className="text-sm font-medium text-charcoal-700">R$ {opt.preco.toFixed(2)}</span>
              }
            </label>
          ))}
        </div>
      </div>

      {/* Endereço — apenas para entrega */}
      {!isRetirada && (
        <div className="bg-white rounded-sm border border-cream-200 p-6 mb-6 space-y-4">
          <p className="text-sm font-medium text-charcoal-600">Endereço de entrega</p>
          {/* CEP */}
          <div>
            <label className="block text-xs font-medium text-charcoal-500 mb-1">CEP</label>
            <div className="flex gap-2">
              <input
                value={endereco.cep}
                onChange={e => setEndereco({ ...endereco, cep: e.target.value })}
                onBlur={buscarCep}
                placeholder="00000-000"
                maxLength={9}
                className="flex-1 px-4 py-2.5 border border-cream-300 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-forest-400"
              />
              <button
                onClick={buscarCep}
                disabled={cepLoading}
                className="px-4 py-2.5 border border-cream-300 rounded-sm text-sm text-charcoal-600 hover:bg-cream-50 transition-colors disabled:opacity-50"
              >
                {cepLoading ? '...' : 'Buscar'}
              </button>
            </div>
            {cepErro && <p className="text-xs text-red-500 mt-1">{cepErro}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              {field('Logradouro', 'logradouro', { placeholder: 'Rua, Avenida...' })}
            </div>
            {field('Número', 'numero', { placeholder: '100' })}
          </div>
          {field('Complemento', 'complemento', { placeholder: 'Apto, bloco (opcional)' })}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1">{field('Bairro', 'bairro')}</div>
            <div className="sm:col-span-1">{field('Cidade', 'cidade')}</div>
            <div>
              <label className="block text-xs font-medium text-charcoal-500 mb-1">Estado</label>
              <select
                value={endereco.estado}
                onChange={e => setEndereco({ ...endereco, estado: e.target.value })}
                className="w-full px-4 py-2.5 border border-cream-300 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-forest-400 bg-white"
              >
                <option value="">UF</option>
                {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
                  'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(uf => (
                  <option key={uf} value={uf}>{uf}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-charcoal-500 hover:text-charcoal-700 transition-colors"
        >
          <ArrowLeft size={14} />
          Voltar ao carrinho
        </button>
        <button
          onClick={onNext}
          disabled={!formValido}
          className="flex items-center justify-center gap-2 px-8 py-3.5 bg-forest-500 text-cream-100 text-sm font-medium rounded-sm hover:bg-forest-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors uppercase tracking-wider"
        >
          Ir para pagamento
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

// ---- STEP 3: PAYMENT ----
type MetodoPagamento = 'cartao' | 'pix' | 'boleto';

function StepPagamento({
  onNext,
  onBack,
  metodo,
  setMetodo,
  loading = false,
}: {
  onNext: () => void;
  onBack: () => void;
  metodo: MetodoPagamento | '';
  setMetodo: (m: MetodoPagamento) => void;
  loading?: boolean;
}) {
  const [cartao, setCartao] = useState({
    numero: '',
    nome: '',
    validade: '',
    cvv: '',
    parcelas: '1',
  });
  const { total } = useCart();

  const metodos = [
    { id: 'cartao' as MetodoPagamento, label: 'Cartão de crédito', icon: <CreditCard size={18} /> },
    { id: 'pix' as MetodoPagamento, label: 'PIX', icon: <QrCode size={18} /> },
    { id: 'boleto' as MetodoPagamento, label: 'Boleto bancário', icon: <FileText size={18} /> },
  ];

  const formatarCartao = (val: string) =>
    val.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim().slice(0, 19);

  const formatarValidade = (val: string) => {
    const digits = val.replace(/\D/g, '');
    if (digits.length <= 2) return digits;
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}`;
  };

  const cartaoValido =
    metodo !== 'cartao' ||
    (cartao.numero.replace(/\s/g, '').length === 16 &&
      cartao.nome.trim().length > 3 &&
      cartao.validade.length === 5 &&
      cartao.cvv.length >= 3);

  const formValido = metodo !== '' && cartaoValido;

  return (
    <div>
      <h2 className="font-serif text-2xl text-charcoal-700 mb-6">Forma de pagamento</h2>

      {/* Method tabs */}
      <div className="flex gap-3 mb-6">
        {metodos.map(m => (
          <button
            key={m.id}
            onClick={() => setMetodo(m.id)}
            className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-sm border-2 transition-colors ${
              metodo === m.id
                ? 'border-forest-500 bg-forest-50 text-forest-600'
                : 'border-cream-200 text-charcoal-500 hover:border-cream-300'
            }`}
          >
            {m.icon}
            <span className="text-xs font-medium">{m.label}</span>
          </button>
        ))}
      </div>

      {/* Cartão */}
      {metodo === 'cartao' && (
        <div className="bg-white rounded-sm border border-cream-200 p-6 mb-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-charcoal-500 mb-1">Número do cartão</label>
            <input
              value={cartao.numero}
              onChange={e => setCartao({ ...cartao, numero: formatarCartao(e.target.value) })}
              placeholder="0000 0000 0000 0000"
              maxLength={19}
              className="w-full px-4 py-2.5 border border-cream-300 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-forest-400 font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-charcoal-500 mb-1">Nome no cartão</label>
            <input
              value={cartao.nome}
              onChange={e => setCartao({ ...cartao, nome: e.target.value.toUpperCase() })}
              placeholder="COMO ESCRITO NO CARTÃO"
              className="w-full px-4 py-2.5 border border-cream-300 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-forest-400 uppercase"
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-charcoal-500 mb-1">Validade</label>
              <input
                value={cartao.validade}
                onChange={e => setCartao({ ...cartao, validade: formatarValidade(e.target.value) })}
                placeholder="MM/AA"
                maxLength={5}
                className="w-full px-4 py-2.5 border border-cream-300 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-forest-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-charcoal-500 mb-1">CVV</label>
              <input
                value={cartao.cvv}
                onChange={e => setCartao({ ...cartao, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                placeholder="000"
                maxLength={4}
                type="password"
                className="w-full px-4 py-2.5 border border-cream-300 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-forest-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-charcoal-500 mb-1">Parcelas</label>
              <select
                value={cartao.parcelas}
                onChange={e => setCartao({ ...cartao, parcelas: e.target.value })}
                className="w-full px-4 py-2.5 border border-cream-300 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-forest-400 bg-white"
              >
                {[1, 2, 3, 4, 6, 8, 10, 12].map(n => (
                  <option key={n} value={String(n)}>
                    {n}x {n === 1 ? 'sem juros' : `R$ ${(total / n).toFixed(2)}`}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="flex items-center gap-1.5 text-xs text-charcoal-400">
            <Lock size={12} />
            Pagamento seguro via Pagar.me — seus dados são criptografados.
          </p>
        </div>
      )}

      {/* PIX */}
      {metodo === 'pix' && (
        <div className="bg-white rounded-sm border border-cream-200 p-6 mb-6 text-center">
          <div className="w-32 h-32 bg-cream-100 rounded-sm mx-auto mb-4 flex items-center justify-center">
            <QrCode size={64} className="text-charcoal-400" />
          </div>
          <p className="text-sm font-medium text-charcoal-700 mb-1">QR Code gerado após confirmação</p>
          <p className="text-xs text-charcoal-400 mb-3">
            O código PIX ficará disponível na próxima tela. Você terá 30 minutos para pagar.
          </p>
          <p className="text-xs text-forest-600 font-medium">5% de desconto para pagamento via PIX</p>
        </div>
      )}

      {/* Boleto */}
      {metodo === 'boleto' && (
        <div className="bg-white rounded-sm border border-cream-200 p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-cream-100 rounded-sm flex items-center justify-center shrink-0">
              <FileText size={24} className="text-charcoal-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-charcoal-700 mb-1">Boleto bancário</p>
              <p className="text-xs text-charcoal-400 leading-relaxed">
                O boleto será gerado após a confirmação do pedido. Prazo de pagamento: 3 dias úteis.
                Após o pagamento, a confirmação pode levar até 2 dias úteis.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-charcoal-500 hover:text-charcoal-700 transition-colors"
        >
          <ArrowLeft size={14} />
          Voltar à entrega
        </button>
        <button
          onClick={onNext}
          disabled={!formValido || loading}
          className="flex items-center justify-center gap-2 px-8 py-3.5 bg-forest-500 text-cream-100 text-sm font-medium rounded-sm hover:bg-forest-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors uppercase tracking-wider"
        >
          {loading ? 'Confirmando...' : 'Confirmar pedido'}
          {!loading && <ChevronRight size={14} />}
        </button>
      </div>
    </div>
  );
}

// ---- STEP 4: CONFIRMATION ----
function StepConfirmacao({
  metodo,
  endereco,
  pedidoNumero,
  freteOpcaoId,
}: {
  metodo: MetodoPagamento | '';
  endereco: EnderecoForm;
  pedidoNumero: string;
  freteOpcaoId: string;
}) {
  const numeroPedido = pedidoNumero || `DM-${Date.now().toString().slice(-6)}`;

  return (
    <div className="text-center">
      <div className="w-20 h-20 bg-forest-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <CheckCircle2 size={40} className="text-forest-500" />
      </div>
      <h2 className="font-serif text-3xl text-charcoal-700 mb-2">Pedido confirmado!</h2>
      <p className="text-charcoal-500 mb-1">
        Pedido <span className="font-medium text-charcoal-700">#{numeroPedido}</span>
      </p>
      <p className="text-sm text-charcoal-400 mb-8">
        Você receberá um e-mail com a confirmação e informações de rastreio.
      </p>

      <div className="bg-white rounded-sm border border-cream-200 p-6 text-left mb-8 max-w-sm mx-auto space-y-3">
        <div>
          <p className="text-xs font-medium text-charcoal-400 uppercase tracking-wider mb-1">Entrega</p>
          {freteOpcaoId === 'retirada' ? (
            <>
              <p className="text-sm font-medium text-charcoal-700">Retirada na cafeteria</p>
              <p className="text-xs text-charcoal-400">R. Bernardo Monteiro, 150 — Centro, Contagem/MG</p>
            </>
          ) : (
            <>
              <p className="text-sm text-charcoal-600">
                {endereco.logradouro}{endereco.numero ? `, ${endereco.numero}` : ''}
                {endereco.complemento ? ` — ${endereco.complemento}` : ''}
              </p>
              <p className="text-sm text-charcoal-600">
                {endereco.bairro && `${endereco.bairro}, `}{endereco.cidade}/{endereco.estado}
              </p>
            </>
          )}
        </div>
        <div>
          <p className="text-xs font-medium text-charcoal-400 uppercase tracking-wider mb-1">Pagamento</p>
          <p className="text-sm text-charcoal-600 capitalize">
            {metodo === 'cartao' ? 'Cartão de crédito' : metodo === 'pix' ? 'PIX' : 'Boleto bancário'}
          </p>
          {metodo === 'pix' && (
            <div className="mt-3">
              <div className="w-24 h-24 bg-cream-100 rounded-sm mx-auto flex items-center justify-center">
                <QrCode size={40} className="text-charcoal-500" />
              </div>
              <p className="text-xs text-charcoal-400 mt-2 text-center">QR Code PIX (simulado)</p>
            </div>
          )}
          {metodo === 'boleto' && (
            <button className="mt-2 text-xs text-forest-500 hover:underline">
              Baixar boleto →
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          to="/cliente/pedidos"
          className="px-6 py-3 bg-forest-500 text-cream-100 text-sm font-medium rounded-sm hover:bg-forest-600 transition-colors uppercase tracking-wider"
        >
          Acompanhar pedido
        </Link>
        <Link
          to="/loja"
          className="px-6 py-3 border border-cream-300 text-charcoal-600 text-sm font-medium rounded-sm hover:bg-cream-50 transition-colors"
        >
          Continuar comprando
        </Link>
      </div>
    </div>
  );
}

// ---- MAIN CHECKOUT PAGE ----
export function CheckoutPage() {
  const [step, setStep] = useState(1);
  const [endereco, setEndereco] = useState<EnderecoForm>({
    cep: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
  });
  const [contato, setContato] = useState<ContatoForm>({ nome: '', email: '', telefone: '' });
  const [freteOpcaoId, setFreteOpcaoId] = useState('retirada');
  const [frete, setFrete] = useState(0);
  const [metodo, setMetodo] = useState<MetodoPagamento | ''>('');
  const [cupomAplicado, setCupomAplicado] = useState('');
  const [desconto, setDesconto] = useState(0);
  const [pedidoNumero, setPedidoNumero] = useState('');
  const [confirmando, setConfirmando] = useState(false);
  const [leadId, setLeadId] = useState('');
  const abandonmentScheduledRef = useRef(false);
  const { items, total, clearCart } = useCart();
  const { user } = useAuth();

  // Agenda verificação de abandono quando o cliente chega ao pagamento
  useEffect(() => {
    if (step !== 3) { abandonmentScheduledRef.current = false; return; }
    if (abandonmentScheduledRef.current || !leadId) return;
    abandonmentScheduledRef.current = true;
    const scheduledAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    supabase.from('lead_abandonment_checks').insert({
      lead_id: leadId,
      assinatura_id: null,
      scheduled_at: scheduledAt,
    }).then(r => {
      if (r.error) abandonmentScheduledRef.current = false;
    });
  }, [step, leadId]);

  const confirmar = async () => {
    setConfirmando(true);
    try {
      let clienteId: string | undefined;
      const emailContato = user?.email ?? contato.email;
      const nomeContato  = user?.name  ?? contato.nome;
      const foneContato  = contato.telefone;

      if (user) {
        const cliente = await getClienteByUserId(user.id).catch(() => null);
        clienteId = cliente?.id;
      }
      const totalFinal = Math.max(0, total - desconto + frete);

      const enderecoEntrega = freteOpcaoId === 'retirada'
        ? { id: '', cep: '32017170', logradouro: 'R. Bernardo Monteiro', numero: '150', complemento: 'Loja 1', bairro: 'Centro', cidade: 'Contagem', estado: 'MG', padrao: false }
        : { id: '', cep: endereco.cep, logradouro: endereco.logradouro, numero: endereco.numero, complemento: endereco.complemento || undefined, bairro: endereco.bairro, cidade: endereco.cidade, estado: endereco.estado, padrao: false };

      const pedido = await createPedido({
        clienteId,
        itens: items.map(item => ({
          produtoId: item.produto.id,
          nomeProduto: item.produto.nome,
          skuProduto: item.produto.sku,
          quantidade: item.quantidade,
          precoUnitario: item.produto.precoPromocional ?? item.produto.preco,
        })),
        subtotal: total,
        frete,
        desconto,
        total: totalFinal,
        enderecoEntrega,
        formaPagamento: metodo === 'cartao' ? 'Cartão de crédito' : metodo === 'pix' ? 'PIX' : 'Boleto bancário',
        cupom: cupomAplicado || undefined,
      });

      // Registra / atualiza lead para rastreamento de conversão e carrinho abandonado
      if (emailContato) {
        try {
          const lid = await upsertLeadByEmail({
            email: emailContato,
            nome: nomeContato || undefined,
            telefone: foneContato || undefined,
            origem: 'checkout',
            etapa: 'checkout_iniciado',
            interesse: 'Compra na loja',
            tags: ['loja'],
          });
          setLeadId(lid);
          sessionStorage.setItem('dsmatas_lead_id', lid);
        } catch { /* silencioso */ }
      }

      // Redirecionar ao Stripe
      try {
        const currentLeadId = leadId || sessionStorage.getItem('dsmatas_lead_id') || '';
        const successPath = `/sucesso?tipo=pedido&id=${pedido.id}${currentLeadId ? `&lead=${currentLeadId}` : ''}`;
        const stripeUrl = await createCheckoutSession({
          items: [{ name: `Pedido ${pedido.numero}`, amount: totalFinal }],
          successPath,
          cancelPath: '/checkout',
          metadata: { pedido_id: pedido.id },
        });
        clearCart();
        window.location.href = stripeUrl;
        return;
      } catch {
        // Stripe não configurado — exibir tela de confirmação local
      }

      setPedidoNumero(pedido.numero);
    } catch (err) {
      console.error('Erro ao criar pedido:', err);
    } finally {
      clearCart();
      setConfirmando(false);
      setStep(4);
    }
  };

  return (
    <div className="pt-20 min-h-screen bg-cream-100">
      {/* Header */}
      <div className="bg-white border-b border-cream-200 py-4">
        <div className="max-w-3xl mx-auto px-4 flex items-center gap-3">
          <Link to="/loja" className="text-charcoal-400 hover:text-charcoal-700 transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <span className="font-serif text-xl text-charcoal-700">Checkout</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-10">
        <StepIndicator step={step} />

        {step === 1 && (
          <StepCart
            onNext={() => setStep(2)}
            cupomAplicado={cupomAplicado}
            setCupomAplicado={setCupomAplicado}
            desconto={desconto}
            setDesconto={setDesconto}
          />
        )}
        {step === 2 && (
          <StepEntrega
            onNext={() => setStep(3)}
            onBack={() => setStep(1)}
            endereco={endereco}
            setEndereco={setEndereco}
            freteOpcaoId={freteOpcaoId}
            setFreteOpcaoId={setFreteOpcaoId}
            setFrete={setFrete}
            contato={contato}
            setContato={setContato}
            isLoggedIn={!!user}
          />
        )}
        {step === 3 && (
          <StepPagamento
            onNext={confirmar}
            onBack={() => setStep(2)}
            metodo={metodo}
            setMetodo={setMetodo}
            loading={confirmando}
          />
        )}
        {step === 4 && (
          <StepConfirmacao metodo={metodo} endereco={endereco} pedidoNumero={pedidoNumero} freteOpcaoId={freteOpcaoId} />
        )}
      </div>
    </div>
  );
}
