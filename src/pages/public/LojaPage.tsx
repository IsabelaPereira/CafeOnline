import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingCart, Plus, Minus, X, ArrowRight, Search,
  Filter, Star, Package, Check
} from 'lucide-react';
import { useProdutos } from '../../hooks/useProdutos';
import { useCart } from '../../contexts/CartContext';
import type { Produto } from '../../types';

// ---- PRODUCT CARD ----
function ProdutoCard({ produto }: { produto: Produto }) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);
  const [preferencia, setPreferencia] = useState<'grao' | 'moido'>('grao');

  const handleAdd = () => {
    addItem(produto, 1, preferencia);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const preco = produto.precoPromocional ?? produto.preco;

  return (
    <div className="bg-white rounded-sm border border-cream-200 overflow-hidden hover:shadow-md transition-shadow group">
      {/* Image */}
      <div className="aspect-square bg-gradient-to-br from-earth-100 to-cream-200 relative flex items-center justify-center">
        {produto.destaque && (
          <div className="absolute top-3 left-3 px-2 py-1 bg-gold-400 text-charcoal-700 text-xs font-medium rounded-sm">
            Destaque
          </div>
        )}
        {produto.precoPromocional && (
          <div className="absolute top-3 right-3 px-2 py-1 bg-red-500 text-white text-xs font-medium rounded-sm">
            Promoção
          </div>
        )}
        {produto.estoque <= produto.estoqueMinimo && (
          <div className="absolute bottom-3 left-3 px-2 py-1 bg-charcoal-700/80 text-cream-100 text-xs rounded-sm">
            Últimas unidades
          </div>
        )}
        <Package size={48} className="text-earth-300" />
      </div>

      {/* Content */}
      <div className="p-5">
        <div className="flex flex-wrap gap-1 mb-2">
          {produto.notasSensoriais.slice(0, 3).map(nota => (
            <span key={nota} className="px-2 py-0.5 bg-cream-100 text-charcoal-500 text-xs rounded-full border border-cream-200">
              {nota}
            </span>
          ))}
        </div>

        <h3 className="font-serif text-lg text-charcoal-700 mb-1 leading-tight">{produto.nome}</h3>
        <p className="text-xs text-charcoal-400 mb-3">{produto.regiao} · {produto.processo} · {produto.torra}</p>

        {/* Preferencia */}
        <div className="flex gap-2 mb-4">
          {(['grao', 'moido'] as const).map(opt => (
            <button
              key={opt}
              onClick={() => setPreferencia(opt)}
              className={`flex-1 py-1.5 text-xs rounded-sm border transition-colors ${
                preferencia === opt
                  ? 'bg-forest-500 text-white border-forest-500'
                  : 'border-cream-300 text-charcoal-500 hover:border-forest-400'
              }`}
            >
              {opt === 'grao' ? 'Em Grão' : 'Moído'}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <div>
            {produto.precoPromocional && (
              <span className="text-xs text-charcoal-400 line-through block">
                R$ {produto.preco.toFixed(2)}
              </span>
            )}
            <span className="font-serif text-xl text-charcoal-700">R$ {preco.toFixed(2)}</span>
            <span className="text-xs text-charcoal-400 ml-1">/ 250g</span>
          </div>
          <button
            onClick={handleAdd}
            className={`flex items-center gap-2 px-4 py-2 rounded-sm text-sm font-medium transition-all ${
              added
                ? 'bg-forest-500 text-white'
                : 'bg-earth-400 text-cream-100 hover:bg-earth-500'
            }`}
          >
            {added ? <Check size={14} /> : <ShoppingCart size={14} />}
            {added ? 'Adicionado' : 'Adicionar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- CART DRAWER ----
function CartDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { items, total, removeItem, updateQuantity, count } = useCart();

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50" onClick={onClose} />
          <div className="relative ml-auto flex flex-col w-full max-w-md bg-white shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-cream-200">
              <h3 className="font-serif text-xl text-charcoal-700">
                Carrinho
                {count > 0 && (
                  <span className="ml-2 text-sm font-sans text-charcoal-400">({count} {count === 1 ? 'item' : 'itens'})</span>
                )}
              </h3>
              <button onClick={onClose} className="text-charcoal-400 hover:text-charcoal-700">
                <X size={20} />
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                  <ShoppingCart size={48} className="text-charcoal-200" />
                  <p className="font-serif text-lg text-charcoal-600">Seu carrinho está vazio</p>
                  <p className="text-sm text-charcoal-400">Adicione cafés incríveis à sua compra.</p>
                  <button onClick={onClose} className="text-sm text-forest-500 font-medium hover:text-forest-600">
                    Continuar comprando →
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {items.map(item => {
                    const preco = item.produto.precoPromocional ?? item.produto.preco;
                    return (
                      <div key={item.produto.id} className="flex gap-4 pb-4 border-b border-cream-100">
                        <div className="w-16 h-16 bg-cream-100 rounded-sm flex items-center justify-center shrink-0">
                          <Package size={24} className="text-earth-300" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-charcoal-700 leading-tight mb-1">
                            {item.produto.nome}
                          </p>
                          <p className="text-xs text-charcoal-400 mb-2">
                            {item.preferencia === 'grao' ? 'Em Grão' : 'Moído'}
                          </p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center border border-cream-300 rounded-sm">
                              <button
                                onClick={() => updateQuantity(item.produto.id, item.quantidade - 1)}
                                className="p-1.5 hover:bg-cream-100 transition-colors"
                              >
                                <Minus size={12} />
                              </button>
                              <span className="px-3 text-sm">{item.quantidade}</span>
                              <button
                                onClick={() => updateQuantity(item.produto.id, item.quantidade + 1)}
                                className="p-1.5 hover:bg-cream-100 transition-colors"
                              >
                                <Plus size={12} />
                              </button>
                            </div>
                            <span className="font-medium text-sm text-charcoal-700">
                              R$ {(preco * item.quantidade).toFixed(2)}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => removeItem(item.produto.id)}
                          className="text-charcoal-300 hover:text-red-400 transition-colors shrink-0"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="px-6 py-4 border-t border-cream-200">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-sm text-charcoal-600">Subtotal</span>
                  <span className="font-serif text-xl text-charcoal-700">R$ {total.toFixed(2)}</span>
                </div>
                <p className="text-xs text-charcoal-400 mb-4">Frete calculado no checkout</p>
                <Link
                  to="/checkout"
                  onClick={onClose}
                  className="flex items-center justify-center gap-2 w-full py-3.5 bg-forest-500 text-cream-100 text-sm font-medium tracking-wider uppercase rounded-sm hover:bg-forest-600 transition-colors"
                >
                  Finalizar compra
                  <ArrowRight size={14} />
                </Link>
                <button
                  onClick={onClose}
                  className="w-full mt-2 py-2.5 text-sm text-charcoal-500 hover:text-charcoal-700 transition-colors"
                >
                  Continuar comprando
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// ---- LOJA PAGE ----
export function LojaPage() {
  const [query, setQuery] = useState('');
  const [cartOpen, setCartOpen] = useState(false);
  const [filterTorra, setFilterTorra] = useState('');
  const { count, total } = useCart();
  const { data: produtos } = useProdutos(true);

  const torras = Array.from(new Set(produtos.map(p => p.torra).filter(Boolean)));

  const filtered = produtos.filter(p =>
    p.ativo &&
    (query === '' || p.nome.toLowerCase().includes(query.toLowerCase()) || p.descricaoCurta.toLowerCase().includes(query.toLowerCase())) &&
    (filterTorra === '' || p.torra === filterTorra)
  );

  return (
    <div className="pt-20">
      {/* Header */}
      <section className="py-20 bg-charcoal-700 text-center">
        <p className="font-display italic text-earth-300 text-lg mb-3">Escolha o seu café</p>
        <h1 className="font-serif text-5xl text-cream-100 mb-4">Loja Das Matas</h1>
        <p className="text-charcoal-300 max-w-lg mx-auto">
          Cafés especiais selecionados com cuidado. Compre avulso e descubra o melhor do café brasileiro.
        </p>
      </section>

      <section className="py-12 bg-cream-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-400" />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Buscar cafés..."
                className="w-full pl-9 pr-4 py-3 border border-cream-300 rounded-sm bg-white text-sm focus:outline-none focus:ring-1 focus:ring-forest-400"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setFilterTorra('')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-sm text-sm transition-colors ${
                  filterTorra === ''
                    ? 'bg-forest-500 text-cream-100'
                    : 'bg-white border border-cream-300 text-charcoal-600 hover:bg-cream-50'
                }`}
              >
                <Filter size={14} />
                Todos
              </button>
              {torras.map(torra => torra && (
                <button
                  key={torra}
                  onClick={() => setFilterTorra(torra === filterTorra ? '' : torra)}
                  className={`px-4 py-2 rounded-sm text-sm transition-colors ${
                    filterTorra === torra
                      ? 'bg-forest-500 text-cream-100'
                      : 'bg-white border border-cream-300 text-charcoal-600 hover:bg-cream-50'
                  }`}
                >
                  {torra}
                </button>
              ))}
            </div>
          </div>

          {/* Cart button (floating) */}
          {count > 0 && (
            <div className="fixed bottom-6 right-6 z-40">
              <button
                onClick={() => setCartOpen(true)}
                className="flex items-center gap-3 px-5 py-3.5 bg-forest-500 text-cream-100 rounded-sm shadow-lg hover:bg-forest-600 transition-colors"
              >
                <ShoppingCart size={18} />
                <span className="text-sm font-medium">{count} {count === 1 ? 'item' : 'itens'}</span>
                <span className="font-medium">· R$ {total.toFixed(2)}</span>
              </button>
            </div>
          )}

          {/* Products */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(produto => (
              <ProdutoCard key={produto.id} produto={produto} />
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-16">
              <Package size={48} className="text-charcoal-200 mx-auto mb-4" />
              <p className="text-charcoal-400">Nenhum produto encontrado.</p>
            </div>
          )}
        </div>
      </section>

      {/* Cart Drawer */}
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  );
}
