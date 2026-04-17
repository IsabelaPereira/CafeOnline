import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingCart, Plus, Minus, X, ArrowRight, Search,
  Filter, Package, Check, ChevronLeft, ChevronRight,
  MapPin, User, Leaf, FlaskConical, Mountain, Flame,
  Play, Coffee, Star,
} from 'lucide-react';
import { useProdutos } from '../../hooks/useProdutos';
import { useCart } from '../../contexts/CartContext';
import { normalizeVideoUrl, videoType } from '../../services/storage.service';
import type { Produto } from '../../types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(v: number) { return v.toFixed(2).replace('.', ','); }

// ─── Product Detail Modal ─────────────────────────────────────────────────────

function ProdutoModal({ produto, onClose }: { produto: Produto; onClose: () => void }) {
  const { addItem } = useCart();
  const [preferencia, setPreferencia] = useState<'grao' | 'moido'>('grao');
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [photoIdx, setPhotoIdx] = useState(0);
  const [showVideo, setShowVideo] = useState<number | null>(null);
  const [fichaOpen, setFichaOpen] = useState(true);

  const preco = produto.precoPromocional ?? produto.preco;
  const allMedia = [...(produto.fotos ?? [])];

  function handleAdd() {
    addItem(produto, qty, preferencia);
    setAdded(true);
    setTimeout(() => setAdded(false), 2500);
  }

  function prevPhoto() { setPhotoIdx(i => (i - 1 + allMedia.length) % allMedia.length); }
  function nextPhoto() { setPhotoIdx(i => (i + 1) % allMedia.length); }

  const fichaFields = [
    { icon: MapPin,        label: 'Região',     value: produto.regiao },
    { icon: User,          label: 'Produtor',   value: produto.produtor },
    { icon: Leaf,          label: 'Variedade',  value: produto.variedade },
    { icon: FlaskConical,  label: 'Processo',   value: produto.processo },
    { icon: Mountain,      label: 'Altitude',   value: produto.altitude },
    { icon: Flame,         label: 'Torra',      value: produto.torra },
  ].filter(f => f.value);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-charcoal-900/70 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative bg-white w-full max-w-4xl max-h-[92vh] rounded-sm shadow-2xl overflow-hidden flex flex-col">

        {/* Close */}
        <button onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center bg-white/90 backdrop-blur-sm rounded-full text-charcoal-600 hover:text-charcoal-900 shadow-md transition-colors">
          <X size={16} />
        </button>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 min-h-[500px]">

            {/* ── Left: Gallery ── */}
            <div className="bg-cream-50 flex flex-col">
              {/* Main image / video */}
              <div className="relative aspect-square bg-gradient-to-br from-earth-100 to-cream-200 flex items-center justify-center overflow-hidden">
                {allMedia.length > 0 ? (
                  <>
                    <img src={allMedia[photoIdx]} alt={produto.nome}
                      className="w-full h-full object-cover" />
                    {allMedia.length > 1 && (
                      <>
                        <button onClick={prevPhoto}
                          className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow-md hover:bg-white transition-colors">
                          <ChevronLeft size={16} />
                        </button>
                        <button onClick={nextPhoto}
                          className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow-md hover:bg-white transition-colors">
                          <ChevronRight size={16} />
                        </button>
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                          {allMedia.map((_, i) => (
                            <button key={i} onClick={() => setPhotoIdx(i)}
                              className={`w-1.5 h-1.5 rounded-full transition-all ${i === photoIdx ? 'bg-white w-4' : 'bg-white/60'}`} />
                          ))}
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <Package size={64} className="text-earth-300" />
                )}

                {/* Badges */}
                <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                  {produto.destaque && (
                    <span className="flex items-center gap-1 px-2.5 py-1 bg-gold-400 text-charcoal-700 text-xs font-semibold rounded-sm">
                      <Star size={10} /> Destaque
                    </span>
                  )}
                  {produto.precoPromocional && (
                    <span className="px-2.5 py-1 bg-red-500 text-white text-xs font-semibold rounded-sm">
                      Promoção
                    </span>
                  )}
                  {produto.estoque > 0 && produto.estoque <= produto.estoqueMinimo && (
                    <span className="px-2.5 py-1 bg-charcoal-800/80 text-cream-100 text-xs rounded-sm">
                      Últimas unidades
                    </span>
                  )}
                </div>
              </div>

              {/* Thumbnails */}
              {allMedia.length > 1 && (
                <div className="flex gap-2 p-3 overflow-x-auto">
                  {allMedia.map((url, i) => (
                    <button key={i} onClick={() => setPhotoIdx(i)}
                      className={`w-14 h-14 flex-shrink-0 rounded-sm overflow-hidden border-2 transition-all ${
                        i === photoIdx ? 'border-forest-500' : 'border-transparent opacity-60 hover:opacity-90'
                      }`}>
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              {/* Videos */}
              {produto.videos && produto.videos.length > 0 && (
                <div className="px-4 pb-4 space-y-2">
                  <p className="text-[10px] font-mono tracking-widest uppercase text-charcoal-400 mb-1.5">Vídeos</p>
                  {produto.videos.map((url, i) => {
                    const type = videoType(url);
                    const embedUrl = normalizeVideoUrl(url);
                    return (
                      <div key={i}>
                        {showVideo === i ? (
                          <div className="relative aspect-video rounded-sm overflow-hidden bg-charcoal-900">
                            {type === 'direct' ? (
                              <video src={url} controls autoPlay className="w-full h-full" />
                            ) : (
                              <iframe src={embedUrl} className="w-full h-full" allowFullScreen
                                allow="autoplay; encrypted-media" title={`Video ${i + 1}`} />
                            )}
                            <button onClick={() => setShowVideo(null)}
                              className="absolute top-2 right-2 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center text-white">
                              <X size={12} />
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => setShowVideo(i)}
                            className="w-full flex items-center gap-2 px-3 py-2.5 bg-charcoal-700 text-cream-100 rounded-sm hover:bg-charcoal-800 transition-colors text-sm">
                            <Play size={14} className="fill-current" />
                            <span className="text-xs capitalize">{type === 'youtube' ? 'YouTube' : type === 'vimeo' ? 'Vimeo' : 'Vídeo'} {produto.videos!.length > 1 ? `${i + 1}` : ''}</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── Right: Info ── */}
            <div className="p-7 flex flex-col gap-5">

              {/* Sensory notes */}
              {produto.notasSensoriais.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {produto.notasSensoriais.map(nota => (
                    <span key={nota}
                      className="px-2.5 py-0.5 bg-earth-50 border border-earth-200 text-earth-700 text-xs rounded-full font-medium">
                      {nota}
                    </span>
                  ))}
                </div>
              )}

              {/* Name */}
              <div>
                <h2 className="font-serif text-3xl text-charcoal-700 leading-tight mb-1">{produto.nome}</h2>
                {produto.descricaoCurta && (
                  <p className="text-sm text-charcoal-500 leading-relaxed">{produto.descricaoCurta}</p>
                )}
              </div>

              {/* Price */}
              <div className="flex items-baseline gap-3">
                <span className="font-serif text-3xl text-charcoal-700">R$ {fmt(preco)}</span>
                {produto.precoPromocional && (
                  <span className="text-base text-charcoal-400 line-through">R$ {fmt(produto.preco)}</span>
                )}
                <span className="text-xs text-charcoal-400">/ {produto.peso > 0 ? `${produto.peso}g` : '250g'}</span>
              </div>

              {/* Preferencia */}
              <div>
                <p className="text-xs font-mono uppercase tracking-widest text-charcoal-400 mb-2">Moagem</p>
                <div className="grid grid-cols-2 gap-2">
                  {(['grao', 'moido'] as const).map(opt => (
                    <button key={opt} onClick={() => setPreferencia(opt)}
                      className={`py-2.5 text-sm font-medium rounded-sm border-2 transition-all ${
                        preferencia === opt
                          ? 'bg-forest-600 text-white border-forest-600'
                          : 'border-cream-300 text-charcoal-500 hover:border-forest-300'
                      }`}>
                      {opt === 'grao' ? 'Em Grão' : 'Moído'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Qty + Add to cart */}
              <div className="flex gap-3 items-center">
                <div className="flex items-center border-2 border-cream-300 rounded-sm overflow-hidden">
                  <button onClick={() => setQty(q => Math.max(1, q - 1))}
                    className="px-3 py-2.5 hover:bg-cream-100 transition-colors text-charcoal-600">
                    <Minus size={14} />
                  </button>
                  <span className="px-4 py-2.5 text-sm font-medium text-charcoal-700 min-w-[3rem] text-center">{qty}</span>
                  <button onClick={() => setQty(q => q + 1)}
                    className="px-3 py-2.5 hover:bg-cream-100 transition-colors text-charcoal-600">
                    <Plus size={14} />
                  </button>
                </div>
                <button onClick={handleAdd} disabled={produto.estoque === 0}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-sm text-sm font-semibold tracking-wide uppercase transition-all ${
                    added
                      ? 'bg-forest-500 text-white'
                      : produto.estoque === 0
                      ? 'bg-charcoal-200 text-charcoal-400 cursor-not-allowed'
                      : 'bg-earth-500 text-cream-100 hover:bg-earth-600'
                  }`}>
                  {added ? <Check size={16} /> : <ShoppingCart size={16} />}
                  {produto.estoque === 0 ? 'Esgotado' : added ? 'Adicionado!' : 'Adicionar ao carrinho'}
                </button>
              </div>

              {/* Total */}
              {qty > 1 && (
                <p className="text-xs text-charcoal-400 -mt-2">
                  Total: <strong className="text-charcoal-600">R$ {fmt(preco * qty)}</strong>
                </p>
              )}

              {/* Ficha técnica */}
              {fichaFields.length > 0 && (
                <div className="border-t border-cream-200 pt-4">
                  <button onClick={() => setFichaOpen(o => !o)}
                    className="flex items-center justify-between w-full text-left mb-3 group">
                    <p className="text-xs font-mono uppercase tracking-widest text-charcoal-500 flex items-center gap-2">
                      <Coffee size={12} /> Ficha técnica
                    </p>
                    <ChevronRight size={14} className={`text-charcoal-400 transition-transform ${fichaOpen ? 'rotate-90' : ''}`} />
                  </button>
                  {fichaOpen && (
                    <div className="grid grid-cols-2 gap-2">
                      {fichaFields.map(({ icon: Icon, label, value }) => (
                        <div key={label} className="flex items-start gap-2 p-2.5 bg-cream-50 rounded-sm">
                          <Icon size={12} className="text-charcoal-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-[9px] font-mono uppercase tracking-widest text-charcoal-400">{label}</p>
                            <p className="text-xs font-medium text-charcoal-700">{value}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Full description */}
              {produto.descricao && (
                <div className="border-t border-cream-200 pt-4">
                  <p className="text-xs font-mono uppercase tracking-widest text-charcoal-400 mb-2">Sobre este café</p>
                  <p className="text-sm text-charcoal-600 leading-relaxed">{produto.descricao}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Product Card ─────────────────────────────────────────────────────────────

function ProdutoCard({ produto, onDetail }: { produto: Produto; onDetail: () => void }) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);
  const [preferencia, setPreferencia] = useState<'grao' | 'moido'>('grao');

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    addItem(produto, 1, preferencia);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const preco = produto.precoPromocional ?? produto.preco;
  const coverUrl = produto.fotos?.[0];

  return (
    <div onClick={onDetail}
      className="bg-white rounded-sm border border-cream-200 overflow-hidden hover:shadow-lg transition-all cursor-pointer group">

      {/* Image */}
      <div className="aspect-square bg-gradient-to-br from-earth-100 to-cream-200 relative overflow-hidden flex items-center justify-center">
        {coverUrl ? (
          <img src={coverUrl} alt={produto.nome}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <Package size={48} className="text-earth-300" />
        )}

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1">
          {produto.destaque && (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-gold-400 text-charcoal-700 text-[10px] font-semibold rounded-sm">
              <Star size={8} /> Destaque
            </span>
          )}
          {produto.precoPromocional && (
            <span className="px-2 py-0.5 bg-red-500 text-white text-[10px] font-semibold rounded-sm">
              Promo
            </span>
          )}
        </div>

        {produto.estoque > 0 && produto.estoque <= produto.estoqueMinimo && (
          <div className="absolute bottom-3 left-3 px-2 py-0.5 bg-charcoal-700/80 text-cream-100 text-[10px] rounded-sm">
            Últimas unidades
          </div>
        )}

        {/* Video indicator */}
        {produto.videos && produto.videos.length > 0 && (
          <div className="absolute top-3 right-3 w-7 h-7 bg-charcoal-800/80 rounded-full flex items-center justify-center">
            <Play size={10} className="text-white fill-current ml-0.5" />
          </div>
        )}

        {/* Multi-photo indicator */}
        {produto.fotos && produto.fotos.length > 1 && (
          <div className="absolute bottom-3 right-3 px-1.5 py-0.5 bg-charcoal-800/70 text-white text-[9px] rounded-sm">
            {produto.fotos.length} fotos
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex flex-wrap gap-1 mb-2">
          {produto.notasSensoriais.slice(0, 3).map(nota => (
            <span key={nota} className="px-2 py-0.5 bg-cream-100 text-charcoal-500 text-[10px] rounded-full border border-cream-200">
              {nota}
            </span>
          ))}
        </div>

        <h3 className="font-serif text-lg text-charcoal-700 mb-0.5 leading-tight group-hover:text-forest-600 transition-colors">
          {produto.nome}
        </h3>
        <p className="text-xs text-charcoal-400 mb-3 line-clamp-1">
          {[produto.regiao, produto.processo, produto.torra].filter(Boolean).join(' · ')}
        </p>

        {/* Preferencia selector */}
        <div className="flex gap-1.5 mb-3" onClick={e => e.stopPropagation()}>
          {(['grao', 'moido'] as const).map(opt => (
            <button key={opt} onClick={() => setPreferencia(opt)}
              className={`flex-1 py-1.5 text-xs rounded-sm border transition-colors ${
                preferencia === opt
                  ? 'bg-forest-500 text-white border-forest-500'
                  : 'border-cream-300 text-charcoal-500 hover:border-forest-400'
              }`}>
              {opt === 'grao' ? 'Em Grão' : 'Moído'}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <div>
            {produto.precoPromocional && (
              <span className="text-[10px] text-charcoal-400 line-through block">R$ {fmt(produto.preco)}</span>
            )}
            <span className="font-serif text-xl text-charcoal-700">R$ {fmt(preco)}</span>
            <span className="text-xs text-charcoal-400 ml-1">/ {produto.peso > 0 ? `${produto.peso}g` : '250g'}</span>
          </div>
          <button onClick={handleAdd} disabled={produto.estoque === 0}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-sm text-sm font-medium transition-all ${
              added
                ? 'bg-forest-500 text-white'
                : produto.estoque === 0
                ? 'bg-charcoal-200 text-charcoal-400 cursor-not-allowed'
                : 'bg-earth-400 text-cream-100 hover:bg-earth-500'
            }`}>
            {added ? <Check size={14} /> : <ShoppingCart size={14} />}
            {produto.estoque === 0 ? 'Esgotado' : added ? 'Ok!' : 'Adicionar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Cart Drawer ──────────────────────────────────────────────────────────────

function CartDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { items, total, removeItem, updateQuantity, count } = useCart();

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50" onClick={onClose} />
          <div className="relative ml-auto flex flex-col w-full max-w-md bg-white shadow-xl">
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
                    const cover = item.produto.fotos?.[0];
                    return (
                      <div key={item.produto.id} className="flex gap-4 pb-4 border-b border-cream-100">
                        <div className="w-16 h-16 bg-cream-100 rounded-sm flex items-center justify-center shrink-0 overflow-hidden">
                          {cover
                            ? <img src={cover} alt={item.produto.nome} className="w-full h-full object-cover" />
                            : <Package size={24} className="text-earth-300" />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-charcoal-700 leading-tight mb-1">{item.produto.nome}</p>
                          <p className="text-xs text-charcoal-400 mb-2">
                            {item.preferencia === 'grao' ? 'Em Grão' : 'Moído'}
                          </p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center border border-cream-300 rounded-sm">
                              <button onClick={() => updateQuantity(item.produto.id, item.quantidade - 1)}
                                className="p-1.5 hover:bg-cream-100 transition-colors">
                                <Minus size={12} />
                              </button>
                              <span className="px-3 text-sm">{item.quantidade}</span>
                              <button onClick={() => updateQuantity(item.produto.id, item.quantidade + 1)}
                                className="p-1.5 hover:bg-cream-100 transition-colors">
                                <Plus size={12} />
                              </button>
                            </div>
                            <span className="font-medium text-sm text-charcoal-700">
                              R$ {fmt(preco * item.quantidade)}
                            </span>
                          </div>
                        </div>
                        <button onClick={() => removeItem(item.produto.id)}
                          className="text-charcoal-300 hover:text-red-400 transition-colors shrink-0">
                          <X size={16} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {items.length > 0 && (
              <div className="px-6 py-4 border-t border-cream-200">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-sm text-charcoal-600">Subtotal</span>
                  <span className="font-serif text-xl text-charcoal-700">R$ {fmt(total)}</span>
                </div>
                <p className="text-xs text-charcoal-400 mb-4">Frete calculado no checkout</p>
                <Link to="/checkout" onClick={onClose}
                  className="flex items-center justify-center gap-2 w-full py-3.5 bg-forest-500 text-cream-100 text-sm font-medium tracking-wider uppercase rounded-sm hover:bg-forest-600 transition-colors">
                  Finalizar compra <ArrowRight size={14} />
                </Link>
                <button onClick={onClose}
                  className="w-full mt-2 py-2.5 text-sm text-charcoal-500 hover:text-charcoal-700 transition-colors">
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

// ─── Loja Page ────────────────────────────────────────────────────────────────

export function LojaPage() {
  const [query, setQuery] = useState('');
  const [cartOpen, setCartOpen] = useState(false);
  const [filterTorra, setFilterTorra] = useState('');
  const [detalhe, setDetalhe] = useState<Produto | null>(null);
  const { count, total } = useCart();
  const { data: produtos } = useProdutos(true);

  const torras = Array.from(new Set(produtos.map(p => p.torra).filter(Boolean)));

  const filtered = produtos.filter(p =>
    p.ativo &&
    (query === '' ||
      p.nome.toLowerCase().includes(query.toLowerCase()) ||
      p.descricaoCurta?.toLowerCase().includes(query.toLowerCase()) ||
      p.notasSensoriais.some(n => n.toLowerCase().includes(query.toLowerCase()))
    ) &&
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
              <input type="text" value={query} onChange={e => setQuery(e.target.value)}
                placeholder="Buscar por nome, notas sensoriais..."
                className="w-full pl-9 pr-4 py-3 border border-cream-300 rounded-sm bg-white text-sm focus:outline-none focus:ring-1 focus:ring-forest-400" />
            </div>
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => setFilterTorra('')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-sm text-sm transition-colors ${
                  filterTorra === ''
                    ? 'bg-forest-500 text-cream-100'
                    : 'bg-white border border-cream-300 text-charcoal-600 hover:bg-cream-50'
                }`}>
                <Filter size={14} /> Todos
              </button>
              {torras.map(torra => torra && (
                <button key={torra} onClick={() => setFilterTorra(torra === filterTorra ? '' : torra)}
                  className={`px-4 py-2 rounded-sm text-sm transition-colors ${
                    filterTorra === torra
                      ? 'bg-forest-500 text-cream-100'
                      : 'bg-white border border-cream-300 text-charcoal-600 hover:bg-cream-50'
                  }`}>
                  {torra}
                </button>
              ))}
            </div>
          </div>

          {/* Cart floating button */}
          {count > 0 && (
            <div className="fixed bottom-6 right-6 z-40">
              <button onClick={() => setCartOpen(true)}
                className="flex items-center gap-3 px-5 py-3.5 bg-forest-500 text-cream-100 rounded-sm shadow-lg hover:bg-forest-600 transition-colors">
                <ShoppingCart size={18} />
                <span className="text-sm font-medium">{count} {count === 1 ? 'item' : 'itens'}</span>
                <span className="font-medium">· R$ {fmt(total)}</span>
              </button>
            </div>
          )}

          {/* Results count */}
          {query || filterTorra ? (
            <p className="text-xs text-charcoal-400 mb-4">
              {filtered.length} {filtered.length === 1 ? 'produto encontrado' : 'produtos encontrados'}
            </p>
          ) : null}

          {/* Products grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(produto => (
              <ProdutoCard key={produto.id} produto={produto} onDetail={() => setDetalhe(produto)} />
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

      {/* Product Detail Modal */}
      {detalhe && <ProdutoModal produto={detalhe} onClose={() => setDetalhe(null)} />}
    </div>
  );
}
