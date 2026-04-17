import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, Check, Leaf, Sparkles, Crown, Star, Zap,
  Truck, Gift, Award, Shield,
} from 'lucide-react';
import { usePlanos } from '../../hooks/useAssinaturas';
import type { PlanoAssinatura } from '../../types';

export const FALLBACK_PLANOS: PlanoAssinatura[] = [
  {
    id: 'descobridor',
    nome: 'Descobridor',
    descricao: 'Sua porta de entrada ao mundo dos cafés especiais. Curadoria cuidadosa para quem começa a jornada.',
    preco: 69,
    beneficios: [
      '2 cafés especiais · 250g cada',
      'Edição mensal exclusiva',
      'Ficha sensorial do produtor',
      'Conteúdo educativo premium',
      'Comunidade Das Matas',
    ],
    destaque: false,
    ativo: true,
    ordem: 1,
  },
  {
    id: 'explorador',
    nome: 'Explorador',
    descricao: 'O plano mais completo. Variedade, métodos e origens raras — com benefícios exclusivos.',
    preco: 119,
    beneficios: [
      '3 cafés especiais · 250g cada',
      'Café raro de microlote',
      'Degustação guiada em vídeo',
      'Curso online de barismo',
      'Desconto 15% na loja',
      'Frete grátis Brasil',
    ],
    destaque: true,
    ativo: true,
    ordem: 2,
  },
  {
    id: 'conhecedor',
    nome: 'Conhecedor',
    descricao: 'Para o paladar apurado. Cafés premiados, origens exóticas e experiências sensoriais inéditas.',
    preco: 189,
    beneficios: [
      '4 cafés premiados · 250g',
      'Edições limitadas e raras',
      'Mentoria trimestral com barista',
      'Eventos exclusivos presenciais',
      'Desconto 25% na loja',
      'Frete expresso grátis',
    ],
    destaque: false,
    ativo: true,
    ordem: 3,
  },
];

interface Props {
  showHeader?: boolean;
  showTrustStrip?: boolean;
  showCompareLink?: boolean;
  className?: string;
}

export function PlanosShowcase({
  showHeader = true,
  showTrustStrip = true,
  showCompareLink = true,
  className = '',
}: Props) {
  const { data: planosData } = usePlanos();
  const planos = planosData && planosData.length > 0 ? planosData : FALLBACK_PLANOS;
  const [hovered, setHovered] = useState<string | null>(null);

  const planoMeta = [
    { icon: Leaf, tagline: 'Para começar' },
    { icon: Sparkles, tagline: 'O preferido' },
    { icon: Crown, tagline: 'Experiência premium' },
  ];

  return (
    <section
      id="planos"
      className={`relative py-28 sm:py-40 bg-gradient-to-b from-cream-100 via-cream-50 to-cream-100 overflow-hidden ${className}`}
    >
      <div
        className="absolute inset-0 opacity-[0.035] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, #2d4a3e 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />
      <div className="absolute -top-40 -right-32 w-[560px] h-[560px] rounded-full bg-earth-200/25 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-32 w-[520px] h-[520px] rounded-full bg-forest-200/25 blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-px h-32 bg-gradient-to-b from-transparent via-earth-400/40 to-transparent pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-6 sm:px-10">
        {showHeader && (
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-4 text-[10px] tracking-[0.4em] uppercase font-mono text-earth-500">
              <span className="w-10 h-px bg-earth-400" />
              Capítulo Quatro · Escolha
              <span className="w-10 h-px bg-earth-400" />
            </div>
            <h2 className="mt-6 font-editorial italic text-[clamp(2.75rem,7vw,6rem)] leading-[0.9] text-charcoal-700 tracking-[-0.02em]">
              Encontre o <span className="text-earth-500">seu ritmo</span>
              <br />
              <span className="font-serif not-italic text-charcoal-700">de descoberta.</span>
            </h2>
            <p className="mt-8 font-display italic text-xl sm:text-2xl text-charcoal-500 leading-snug max-w-2xl mx-auto">
              Três caminhos para transformar seu café de cada dia em uma jornada sensorial completa.
            </p>

            <div className="mt-12 inline-flex flex-wrap items-center justify-center gap-x-8 gap-y-3 px-8 py-4 rounded-full border border-charcoal-200/60 bg-white/70 backdrop-blur-sm">
              <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-charcoal-400 flex items-center gap-2">
                <Shield size={12} className="text-forest-500" /> Em todos os planos
              </span>
              <span className="h-4 w-px bg-charcoal-200 hidden sm:block" />
              <span className="text-[11px] font-medium text-charcoal-600 flex items-center gap-1.5">
                <Check size={12} className="text-forest-500" /> Sem fidelidade
              </span>
              <span className="text-[11px] font-medium text-charcoal-600 flex items-center gap-1.5">
                <Check size={12} className="text-forest-500" /> Cancele quando quiser
              </span>
              <span className="text-[11px] font-medium text-charcoal-600 flex items-center gap-1.5">
                <Check size={12} className="text-forest-500" /> Primeiro envio em 7 dias
              </span>
            </div>
          </div>
        )}

        <div className={`${showHeader ? 'mt-20' : ''} grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-stretch`}>
          {planos.slice(0, 3).map((plano, i) => {
            const destaque = !!plano.destaque;
            const meta = planoMeta[i] ?? planoMeta[0];
            const Icon = meta.icon;
            const isHovered = hovered === plano.id;

            return (
              <div
                key={plano.id}
                onMouseEnter={() => setHovered(plano.id)}
                onMouseLeave={() => setHovered(null)}
                className={`group relative ${destaque ? 'lg:-mt-8 lg:mb-8 lg:z-10' : 'lg:z-0'}`}
              >
                {destaque && (
                  <div className="absolute -inset-4 bg-gradient-to-br from-earth-400/30 via-earth-300/10 to-forest-500/20 rounded-[6px] blur-2xl opacity-70 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                )}

                <div
                  className={`relative flex flex-col h-full overflow-hidden rounded-[3px] transition-all duration-500 ${
                    destaque
                      ? 'bg-gradient-to-br from-charcoal-700 via-forest-600 to-charcoal-700 text-cream-100 shadow-[0_30px_80px_-20px_rgba(17,30,24,0.55)] group-hover:shadow-[0_40px_100px_-20px_rgba(17,30,24,0.7)] group-hover:-translate-y-2'
                      : 'bg-white text-charcoal-700 border border-charcoal-200/80 shadow-[0_4px_20px_-8px_rgba(0,0,0,0.08)] group-hover:shadow-[0_30px_60px_-20px_rgba(0,0,0,0.18)] group-hover:-translate-y-1.5 group-hover:border-earth-300'
                  }`}
                >
                  <div
                    className={`absolute inset-0 pointer-events-none transition-transform duration-1000 ease-out ${
                      isHovered ? 'translate-x-full' : '-translate-x-full'
                    }`}
                    style={{
                      background: `linear-gradient(110deg, transparent 30%, ${destaque ? 'rgba(255,240,220,0.15)' : 'rgba(196,149,106,0.18)'} 50%, transparent 70%)`,
                    }}
                  />

                  {destaque && (
                    <div className="absolute top-5 right-5 flex items-center gap-1.5 px-3 py-1.5 bg-earth-400 text-cream-100 rounded-full text-[9px] font-mono uppercase tracking-[0.3em] shadow-lg z-10">
                      <Star size={10} fill="currentColor" />
                      Favorito
                    </div>
                  )}

                  <div
                    className="absolute inset-0 opacity-[0.04] pointer-events-none"
                    style={{
                      backgroundImage:
                        'radial-gradient(circle at 30% 20%, #000 1px, transparent 1px), radial-gradient(circle at 70% 80%, #000 1px, transparent 1px)',
                      backgroundSize: '16px 16px',
                    }}
                  />

                  <div className="relative px-8 pt-10 pb-6">
                    <div className="flex items-center justify-between">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110 ${
                          destaque
                            ? 'bg-earth-400/20 text-earth-300 ring-1 ring-earth-300/40'
                            : 'bg-earth-50 text-earth-500 ring-1 ring-earth-200'
                        }`}
                      >
                        <Icon size={20} />
                      </div>
                      <div className="text-right">
                        <p className={`text-[9px] tracking-[0.35em] uppercase font-mono ${destaque ? 'text-earth-300/80' : 'text-earth-500/70'}`}>
                          Plano N° {String(i + 1).padStart(2, '0')}
                        </p>
                        <p className={`text-[10px] tracking-[0.2em] uppercase font-mono mt-1 ${destaque ? 'text-cream-200/70' : 'text-charcoal-400'}`}>
                          {meta.tagline}
                        </p>
                      </div>
                    </div>

                    <h3 className={`mt-7 font-editorial italic text-[2.75rem] leading-[0.95] tracking-[-0.01em] ${destaque ? 'text-cream-100' : 'text-charcoal-700'}`}>
                      {plano.nome}
                    </h3>
                    <p className={`mt-4 text-sm leading-relaxed ${destaque ? 'text-cream-200/80' : 'text-charcoal-500'}`}>
                      {plano.descricao}
                    </p>
                  </div>

                  <div className={`relative px-8 py-7 border-y ${destaque ? 'border-cream-100/15 bg-charcoal-700/40' : 'border-charcoal-200/60 bg-cream-50/50'}`}>
                    <div className="flex items-baseline gap-1">
                      <span className={`text-xs font-mono uppercase tracking-[0.2em] ${destaque ? 'text-cream-200/70' : 'text-charcoal-400'}`}>
                        R$
                      </span>
                      <span className={`font-editorial italic text-[5.5rem] leading-none ${destaque ? 'text-earth-300' : 'text-earth-500'}`}>
                        {plano.preco}
                      </span>
                      <span className={`text-sm ml-1 ${destaque ? 'text-cream-200/70' : 'text-charcoal-400'}`}>
                        /mês
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      <p className={`text-[10px] tracking-[0.25em] uppercase font-mono ${destaque ? 'text-cream-200/60' : 'text-charcoal-400'}`}>
                        Frete calculado
                      </p>
                      {destaque && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-earth-400/25 text-earth-200 text-[9px] font-mono uppercase tracking-[0.2em]">
                          <Zap size={9} /> cafés únicos
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="relative px-8 py-7 flex-1">
                    <p className={`text-[10px] tracking-[0.35em] uppercase font-mono mb-5 ${destaque ? 'text-earth-300' : 'text-earth-500'}`}>
                      Inclui
                    </p>
                    <ul className="space-y-3.5">
                      {plano.beneficios.map((b, j) => (
                        <li
                          key={j}
                          className="flex items-start gap-3 transition-transform duration-300"
                          style={{
                            transitionDelay: `${j * 40}ms`,
                            transform: isHovered ? 'translateX(4px)' : 'translateX(0)',
                          }}
                        >
                          <div
                            className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                              destaque ? 'bg-earth-400/25 text-earth-300' : 'bg-forest-50 text-forest-500'
                            }`}
                          >
                            <Check size={11} strokeWidth={3} />
                          </div>
                          <span className={`text-sm leading-relaxed ${destaque ? 'text-cream-100/90' : 'text-charcoal-600'}`}>
                            {b}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Link
                    to={`/assinar?plano=${plano.id}`}
                    className={`relative flex items-center justify-between gap-4 mx-5 mb-5 px-6 py-4 rounded-[3px] text-[11px] font-mono tracking-[0.35em] uppercase transition-all duration-300 overflow-hidden group/btn ${
                      destaque
                        ? 'bg-earth-400 text-cream-100 hover:bg-earth-500 shadow-lg shadow-earth-500/30'
                        : 'bg-charcoal-700 text-cream-100 hover:bg-charcoal-600'
                    }`}
                  >
                    <span className="relative z-10">Assinar {plano.nome}</span>
                    <ArrowRight size={14} className="relative z-10 transition-transform duration-300 group-hover/btn:translate-x-1" />
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {showTrustStrip && (
          <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {[
              { icon: Truck, label: 'Entrega nacional', sub: 'Para todo Brasil' },
              { icon: Gift, label: 'Receba em casa', sub: 'Envio programado, sem chance de ficar sem café' },
              { icon: Award, label: 'Cafés Premicaods', sub: 'Receba cafés que não encontra à venda no mercado' },
              { icon: Shield, label: 'Garantia de frescor', sub: 'Envio de cafés com torra fresca' },
            ].map(item => (
              <div
                key={item.label}
                className="flex flex-col items-center text-center gap-2 px-4 py-6 rounded-[3px] border border-charcoal-200/40 bg-white/50 backdrop-blur-sm hover:bg-white hover:border-earth-300 hover:-translate-y-0.5 transition-all duration-300"
              >
                <div className="w-11 h-11 rounded-full bg-earth-50 text-earth-500 flex items-center justify-center ring-1 ring-earth-200">
                  <item.icon size={18} />
                </div>
                <p className="text-[11px] font-medium text-charcoal-700">{item.label}</p>
                <p className="text-[10px] tracking-[0.15em] uppercase font-mono text-charcoal-400">{item.sub}</p>
              </div>
            ))}
          </div>
        )}

        {showCompareLink && (
          <div className="mt-16 text-center">
            <Link
              to="/planos"
              className="inline-flex items-center gap-3 text-[11px] tracking-[0.35em] uppercase font-mono text-charcoal-500 hover:text-earth-500 transition-colors group"
            >
              <span className="w-10 h-px bg-charcoal-300 group-hover:bg-earth-400 transition-colors" />
              Comparar todos os detalhes
              <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
