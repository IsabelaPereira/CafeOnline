import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { SEO } from '../../components/SEO';
import {
  ArrowRight, MapPin, Clock, Phone,
  Users, Calendar, Mic, Cake, Briefcase, BookOpen,
  ArrowUpRight, ChevronRight,
} from 'lucide-react';
import { getConfiguracoes } from '../../services/configuracoes.service';
import type { Configuracoes, HorarioFuncionamento } from '../../types';

// ─── Helpers de horário ───────────────────────────────────────────────────────
const DIAS_LABEL = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function fmtHora(h: string) {
  // "09:00" → "9h" | "18:30" → "18h30"
  const [hh, mm] = h.split(':');
  return mm === '00' ? `${parseInt(hh)}h` : `${parseInt(hh)}h${mm}`;
}

/** Lista completa de horários por dia */
function listaHorarios(horarios: HorarioFuncionamento[]): [string, string][] {
  return horarios.map(h => [
    DIAS_LABEL[h.diaSemana],
    h.fechado ? 'Fechado' : `${fmtHora(h.abertura)} às ${fmtHora(h.fechamento)}`,
  ]);
}

// Instagram SVG inline (lucide-react desta versão não exporta Instagram)
const InstagramIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

// ─── Grain overlay ──────────────────────────────────────────────────────────
const Grain = ({ opacity = 0.08 }: { opacity?: number }) => (
  <div className="absolute inset-0 pointer-events-none grain-layer" style={{ opacity }} aria-hidden />
);

// ─── useReveal ───────────────────────────────────────────────────────────────
function useReveal() {
  useEffect(() => {
    const io = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('is-visible'); }),
      { threshold: 0.1 }
    );
    document.querySelectorAll('[data-reveal]').forEach(el => io.observe(el));
    return () => io.disconnect();
  });
}

// ─── Drag-to-scroll hook ─────────────────────────────────────────────────────
function useDragScroll() {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef({ active: false, startX: 0, scrollLeft: 0 });
  return {
    ref,
    onMouseDown: (e: React.MouseEvent) => {
      const el = ref.current!;
      drag.current = { active: true, startX: e.pageX - el.offsetLeft, scrollLeft: el.scrollLeft };
    },
    onMouseMove: (e: React.MouseEvent) => {
      if (!drag.current.active) return;
      e.preventDefault();
      const el = ref.current!;
      el.scrollLeft = drag.current.scrollLeft - (e.pageX - el.offsetLeft - drag.current.startX);
    },
    onMouseUp: () => { drag.current.active = false; },
    onMouseLeave: () => { drag.current.active = false; },
  };
}

// ─── Placeholder Image ────────────────────────────────────────────────────────
const GRADIENTS = [
  'from-earth-600 via-earth-500 to-gold-500',
  'from-forest-700 via-forest-600 to-earth-500',
  'from-charcoal-600 via-earth-600 to-earth-400',
  'from-gold-600 via-earth-500 to-forest-600',
  'from-earth-700 via-charcoal-600 to-forest-700',
  'from-forest-600 via-earth-600 to-gold-400',
];

function ImgPlaceholder({ src, idx, className = '', alt = '' }: {
  src?: string; idx: number; className?: string; alt?: string;
}) {
  if (src) return <img src={src} alt={alt} className={`w-full h-full object-cover ${className}`} />;
  return (
    <div className={`w-full h-full bg-gradient-to-br ${GRADIENTS[idx % GRADIENTS.length]} ${className}`} />
  );
}

// ─── DATA: Cardápio gallery ───────────────────────────────────────────────────
const MENU_PHOTOS: { label: string; src?: string }[] = [
  { label: 'Iced Caramel',    src: '/cardapio/01-iced-caramel.jpg' },
  { label: 'Espresso & Água', src: '/cardapio/02-espresso-agua.jpg' },
  { label: 'Cinnamon Roll',   src: '/cardapio/03-cinnamon-roll.jpg' },
  { label: 'Chemex',          src: '/cardapio/04-chemex.jpg' },
  { label: 'Brownie',         src: '/cardapio/05-brownie.jpg' },
  { label: 'Sanduíche',       src: '/cardapio/06-sanduiche.jpg' },
  { label: 'Waffles',    src: '/cardapio/07-bacon-ovos.jpg' },
  { label: 'Sobremesas',      src: '/cardapio/08-sobremesas.jpg' },
];

// ─── DATA: Serviços ───────────────────────────────────────────────────────────
const SERVICOS = [
  {
    num: '01', icon: <Users size={20} />,
    titulo: 'Encontros & Eventos',
    desc: 'Reuniões íntimas ou celebrações especiais. O espaço se adapta ao seu momento.',
  },
  {
    num: '02', icon: <BookOpen size={20} />,
    titulo: 'Workshops & Oficinas',
    desc: 'Imersões em técnicas de preparo, torra, degustação e cultura do café especial.',
  },
  {
    num: '03', icon: <Cake size={20} />,
    titulo: 'Aniversários',
    desc: 'Comemore com quem você ama em um ambiente único, com cardápio personalizado.',
  },
  {
    num: '04', icon: <Briefcase size={20} />,
    titulo: 'Eventos Corporativos',
    desc: 'Coffee breaks, integrações de time e experiências sensoriais para empresas.',
  },
  {
    num: '05', icon: <Mic size={20} />,
    titulo: 'Palestras & Talks',
    desc: 'Estrutura completa para apresentações, painéis e conversas sobre café e cultura.',
  },
  {
    num: '06', icon: <Calendar size={20} />,
    titulo: 'Experiências Privadas',
    desc: 'Uma tarde exclusiva para o seu grupo com curadoria de cafés e degustação guiada.',
  },
];

// ─── Galeria social — cole aqui as URLs dos posts/reels do Instagram ─────────
// ─── Posts do Instagram — cole as URLs dos reels/posts que quer exibir ────────
const SOCIAL_POSTS: string[] = [
  'https://www.instagram.com/reel/DLzP9L-sxzD/',
  // Adicione mais URLs abaixo (até 9):
  'https://www.instagram.com/reel/DKxk7FuvpFi/',
  'https://www.instagram.com/reel/DKVu_eDsrDw/',
  'https://www.instagram.com/reel/DM0RCGtgzsh/',
  'https://www.instagram.com/reel/DOjpkMBCVqD/',
  'https://www.instagram.com/reel/DTxpfYgDSvb/'
  // 'https://www.instagram.com/p/XXXXXXX/',
];

// Declara o global do script de embed do Instagram
declare global {
  interface Window {
    instgrm?: { Embeds: { process: () => void } };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  SEÇÕES
// ─────────────────────────────────────────────────────────────────────────────

// ── 1. Hero ──────────────────────────────────────────────────────────────────
function Hero() {
  const scrollToVideo = () => {
    document.getElementById('video')?.scrollIntoView({ behavior: 'smooth' });
  };
  return (
    <section className="relative bg-charcoal-700 min-h-screen flex flex-col justify-end overflow-hidden pt-24">
      <Grain opacity={0.12} />
      {/* Vertical decorative lines */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute left-1/3 top-0 bottom-0 w-px bg-cream-100/[0.04]" />
        <div className="absolute left-2/3 top-0 bottom-0 w-px bg-cream-100/[0.04]" />
      </div>

      {/* Background tint */}
      <div className="absolute inset-0 bg-gradient-to-b from-charcoal-700/30 via-transparent to-charcoal-700/90 pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-10 pb-16 md:pb-24 w-full">
        {/* Label */}
        <div className="flex items-center gap-4 mb-8 md:mb-12">
          <span className="h-px w-10 bg-gold-400/60" />
          <span className="font-mono text-[9px] tracking-[0.45em] uppercase text-cream-100/40">
            Das Matas · Cafeteria
          </span>
        </div>

        {/* Title */}
        <h1 className="font-editorial italic leading-[0.88] text-cream-50 mb-8">
          <span className="block text-[clamp(3.8rem,11vw,9.5rem)]">Um lugar</span>
          <span className="block text-[clamp(3.8rem,11vw,9.5rem)] pl-[10%] text-gold-300/90">para sentir</span>
          <span className="block text-[clamp(3.8rem,11vw,9.5rem)] pl-[22%]">o café.</span>
        </h1>

        {/* Bottom row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6">
          <p className="max-w-sm text-cream-100/50 text-sm leading-relaxed font-light">
            Mais do que uma cafeteria — um espaço editorial para pessoas que acreditam que uma boa xícara muda o dia.
          </p>
          <button
            onClick={scrollToVideo}
            className="flex items-center gap-3 group"
          >
            <span className="w-12 h-12 rounded-full border border-gold-400/40 flex items-center justify-center text-gold-300 group-hover:bg-gold-400/10 transition-colors">
              <ChevronRight size={16} />
            </span>
            <span className="font-mono text-[9px] tracking-[0.35em] uppercase text-cream-100/40 group-hover:text-gold-300 transition-colors">
              Ver o espaço
            </span>
          </button>
        </div>
      </div>

      {/* Bottom gold rule */}
      <div className="relative z-10 h-px bg-gradient-to-r from-transparent via-gold-400/40 to-transparent" />
    </section>
  );
}

// ── 2. Vídeo ─────────────────────────────────────────────────────────────────
const VIDEOS = [
  {
    src: 'https://www.youtube.com/embed/eicRqKxcagY?mute=1&controls=1&loop=1&playlist=eicRqKxcagY&rel=0&modestbranding=1&playsinline=1',
    title: 'Das Matas — Short 1',
    allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
  },
  {
    src: 'https://www.youtube.com/embed/C0GjjKw1Um4?mute=1&controls=1&loop=1&playlist=C0GjjKw1Um4&rel=0&modestbranding=1&playsinline=1',
    title: 'Das Matas — Short 2',
    allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
  },
  {
    src: 'https://www.youtube.com/embed/6usGKJlL_Ec?mute=1&controls=1&loop=1&playlist=6usGKJlL_Ec&rel=0&modestbranding=1&playsinline=1',
    title: 'Das Matas — Short 3',
    allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
  },
];

function VideoSection() {
  return (
    <section id="video" className="relative bg-charcoal-700 overflow-hidden">
      <Grain opacity={0.08} />
      <div className="max-w-7xl mx-auto px-6 sm:px-10 py-16 md:py-20">
        {/* Header */}
        <div className="flex items-center gap-4 mb-10">
          <span className="font-editorial italic text-5xl text-charcoal-600">01</span>
          <div>
            <p className="font-mono text-[9px] tracking-[0.4em] uppercase text-cream-100/40">O espaço em movimento</p>
            <p className="font-editorial italic text-xl text-cream-100/80 mt-0.5">Conheça a cafeteria</p>
          </div>
        </div>

        {/* Grid de 3 vídeos verticais */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {VIDEOS.map((v, i) => (
            <div key={i} className="relative w-full overflow-hidden bg-charcoal-600" style={{ paddingTop: '177.78%' }}>
              <iframe
                src={v.src}
                title={v.title}
                allow={v.allow}
                allowFullScreen
                scrolling="no"
                className="absolute inset-0 w-full h-full border-0"
              />
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}

// ── 3. Cardápio Visual ────────────────────────────────────────────────────────
function MenuGallery() {
  const drag = useDragScroll();
  return (
    <section className="bg-cream-50 py-16 md:py-24 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 sm:px-10 mb-10">
        <div className="flex items-end justify-between">
          <div>
            <div className="flex items-center gap-4 mb-3">
              <span className="font-editorial italic text-5xl text-charcoal-200">02</span>
              <span className="font-mono text-[9px] tracking-[0.4em] uppercase text-charcoal-400">O cardápio</span>
            </div>
            <h2 className="font-editorial italic text-4xl md:text-5xl text-charcoal-700 leading-tight">
              Feito com intenção,<br />servido com cuidado.
            </h2>
          </div>
          <p className="hidden md:block max-w-xs text-sm text-charcoal-400 leading-relaxed text-right">
            Bebidas de origem, comidas artesanais e uma carta sazonal que muda com a natureza.
          </p>
        </div>
      </div>

      {/* Horizontal draggable photo strip — inspired by the reference */}
      <div
        {...drag}
        className="overflow-x-auto scrollbar-none cursor-grab active:cursor-grabbing select-none"
      >
        <div className="flex gap-2 px-6 sm:px-10" style={{ width: 'max-content' }}>
          {MENU_PHOTOS.map((item, i) => (
            <div
              key={i}
              className="relative overflow-hidden flex-shrink-0 group"
              style={{ width: i % 3 === 0 ? '280px' : i % 3 === 1 ? '220px' : '260px', height: '360px' }}
            >
              <ImgPlaceholder src={item.src} idx={i} className="transition-transform duration-700 group-hover:scale-105" />
              {/* Hover label */}
              <div className="absolute inset-0 bg-charcoal-700/0 group-hover:bg-charcoal-700/50 transition-all duration-400 flex items-end p-4">
                <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 font-editorial italic text-cream-100 text-lg">
                  {item.label}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 sm:px-10 mt-8">
        <p className="font-mono text-[9px] tracking-[0.35em] uppercase text-charcoal-400 flex items-center gap-2">
          <span className="w-6 h-px bg-charcoal-300" />
          Arraste para explorar o cardápio
        </p>
      </div>
    </section>
  );
}

// ── 4. História & Espaço ──────────────────────────────────────────────────────
function Historia({ config }: { config: Configuracoes | null }) {
  const { empresa, cafeteria } = config ?? { empresa: null, cafeteria: null };
  const horarios = cafeteria ? listaHorarios(cafeteria.horarios) : [];

  const infoStrip: { icon: React.ReactNode; label: string; value: React.ReactNode }[] = [
    {
      icon: <Users size={16} />, label: 'Capacidade',
      value: cafeteria ? 'Até 55 pessoas. Para maiores eventos, entre em contato.' : '—',
    },
    {
      icon: <Clock size={16} />, label: 'Horários',
      value: horarios.length > 0 ? (
        <div className="space-y-1 mt-1">
          {horarios.map(([d, h]) => (
            <div key={d} className="flex items-center justify-between gap-4 text-sm border-b border-charcoal-700/[0.07] last:border-0 pb-1 last:pb-0">
              <span className="font-mono text-[10px] text-charcoal-400 shrink-0">{d}</span>
              <span className={`font-editorial italic ${h === 'Fechado' ? 'text-charcoal-400' : 'text-charcoal-700'}`}>{h}</span>
            </div>
          ))}
        </div>
      ) : '—',
    },
    {
      icon: <MapPin size={16} />, label: 'Endereço',
      value: empresa?.cidade ? `${empresa.cidade}${empresa.estado ? `, ${empresa.estado}` : ''}` : '—',
    },
    {
      icon: <Phone size={16} />, label: 'Contato',
      value: empresa?.whatsapp || empresa?.telefone || 'WhatsApp / Email',
    },
  ];

  return (
    <section className="bg-cream-100 py-20 md:py-32 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 sm:px-10">

        {/* Section number */}
        <div className="flex items-center gap-4 mb-16">
          <span className="font-editorial italic text-5xl text-charcoal-200">03</span>
          <span className="font-mono text-[9px] tracking-[0.4em] uppercase text-charcoal-400">A história</span>
          <span className="h-px flex-1 bg-charcoal-700/8 ml-2" />
        </div>

        {/* Content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center mb-20">
          {/* Text */}
          <div data-reveal className="reveal space-y-6">
            <h2 className="font-editorial italic text-4xl md:text-5xl text-charcoal-700 leading-tight">
              Nascemos das matas<br />e das histórias<br />
              <span className="text-gold-500">de quem planta.</span>
            </h2>
            <p className="text-charcoal-500 leading-relaxed">
              Bem-vindo à nossa cafeteria, onde o ambiente aconchegante se une para oferecer a melhor experiência com cafés especiais. Encontre cafés especiais no Centro de Contagem, preparados com diversos métodos disponíveis à sua escolha, que harmonizam perfeitamente com nosso menu. Nossa equipe de baristas treinados está pronta para proporcionar a você experiências inesquecíveis e compartilhar informações sobre os cafés especiais que oferecemos.
            </p>
            <p className="text-charcoal-500 leading-relaxed">
              Projetado para ser um refúgio no cotidiano, o espaço foi pensado nos mínimos detalhes: a iluminação, o som ambiente, as texturas, os aromas. Aqui, tomar um café é um ato de presença.
            </p>
            <p className="text-charcoal-500 leading-relaxed">
              O Clube do Café Das Matas nasceu do amor pela cultura do café e do desejo de compartilhar as melhores experiências com os amantes da bebida. Nossa missão é levar até você os grãos mais especiais, direto dos produtores, promovendo os pequenos produtores e incentivando as regiões produtoras, para que cada xícara seja uma verdadeira celebração.
            </p>
            
          </div>

          {/* Image */}
          <div data-reveal className="reveal" style={{ animationDelay: '100ms' }}>
            <div className="relative">
              <div className="aspect-[4/5] overflow-hidden">
                <ImgPlaceholder src="/cafeteria-espaco.jpg" idx={1} className="transition-transform duration-700 hover:scale-105" />
              </div>
              {/* Floating caption card */}
              <div className="absolute -bottom-5 -left-5 bg-charcoal-700 p-4 max-w-[200px]">
                <Grain opacity={0.15} />
                <p className="font-editorial italic text-cream-100/80 text-sm leading-tight relative z-10">
                  "Cada xícara carrega a história de uma família, de uma fazenda, de um lugar."
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Ambient info strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border border-charcoal-700/10">
          {infoStrip.map((item, i) => (
            <div
              key={i}
              className={`p-6 ${i < 3 ? 'border-r border-charcoal-700/10' : ''} flex flex-col gap-2`}
            >
              <span className="text-gold-500">{item.icon}</span>
              <p className="font-mono text-[9px] tracking-[0.3em] uppercase text-charcoal-400">{item.label}</p>
              <p className="font-editorial italic text-charcoal-700 text-lg leading-tight">{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── 5. Serviços ───────────────────────────────────────────────────────────────
function Servicos() {
  return (
    <section className="bg-charcoal-700 py-20 md:py-32 overflow-hidden relative">
      <Grain opacity={0.1} />
      {/* Decorative bg text */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
        <span className="font-editorial italic text-[clamp(8rem,25vw,20rem)] text-cream-100/[0.025] leading-none select-none whitespace-nowrap">
          Espaço
        </span>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-10">
        <div className="flex items-center gap-4 mb-4">
          <span className="font-editorial italic text-5xl text-charcoal-500">04</span>
          <span className="font-mono text-[9px] tracking-[0.4em] uppercase text-cream-100/30">Serviços</span>
        </div>
        <h2 className="font-editorial italic text-4xl md:text-5xl text-cream-50 leading-tight mb-3">
          O espaço é seu.
        </h2>
        <p className="text-cream-100/40 text-sm max-w-md mb-14">
          Alugue o espaço para o seu evento, escolha o cardápio e deixe a experiência com a gente.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-cream-100/[0.07]">
          {SERVICOS.map((s, i) => (
            <div
              key={i}
              data-reveal
              className="reveal bg-charcoal-700 p-8 group hover:bg-cream-100/[0.04] transition-colors duration-300"
              style={{ animationDelay: `${(i % 3) * 80}ms` }}
            >
              <div className="flex items-start justify-between mb-6">
                <span className="font-editorial italic text-4xl text-cream-100/10 group-hover:text-gold-400/30 transition-colors duration-300">
                  {s.num}
                </span>
                <span className="text-gold-400/60 group-hover:text-gold-300 transition-colors duration-300">
                  {s.icon}
                </span>
              </div>
              <h3 className="font-editorial italic text-xl text-cream-100/80 group-hover:text-cream-50 transition-colors duration-300 mb-3 leading-tight">
                {s.titulo}
              </h3>
              <p className="text-cream-100/35 text-sm leading-relaxed group-hover:text-cream-100/55 transition-colors duration-300">
                {s.desc}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-10 flex items-center gap-4">
          <Link
            to="/reservas"
            className="inline-flex items-center gap-3 px-8 py-4 bg-gold-400 text-charcoal-700 font-mono text-[10px] tracking-[0.35em] uppercase hover:bg-gold-300 transition-colors"
          >
            Falar sobre o evento <ArrowUpRight size={13} />
          </Link>
        </div>
      </div>
    </section>
  );
}

// ── 6. Reservas CTA ───────────────────────────────────────────────────────────
function ReservasCTA({ config }: { config: Configuracoes | null }) {
  const horarios = config?.cafeteria ? listaHorarios(config.cafeteria.horarios) : [];

  return (
    <section className="relative bg-forest-700 overflow-hidden py-20 md:py-28">
      <Grain opacity={0.1} />
      <div className="absolute inset-0 bg-gradient-to-r from-forest-700 via-transparent to-forest-600 pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Text */}
          <div>
            <div className="flex items-center gap-4 mb-8">
              <span className="font-editorial italic text-5xl text-forest-500">05</span>
              <span className="font-mono text-[9px] tracking-[0.4em] uppercase text-cream-100/30">Reservas</span>
            </div>
            <h2 className="font-editorial italic text-4xl md:text-6xl text-cream-50 leading-[0.92] mb-5">
              Reserve sua<br />
              <span className="text-gold-300">mesa agora.</span>
            </h2>
            <p className="text-cream-100/50 text-sm leading-relaxed max-w-sm mb-8">
              Garanta seu momento. Aceitamos reservas para grupos a partir de 2 pessoas, com disponibilidade de terça a domingo.
            </p>
            <Link
              to="/reservas"
              className="inline-flex items-center gap-3 px-8 py-4 border border-gold-400/50 text-gold-300 font-mono text-[10px] tracking-[0.35em] uppercase hover:bg-gold-400/10 transition-colors"
            >
              Fazer reserva <ArrowRight size={13} />
            </Link>
          </div>

          {/* Info cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Horários dinâmicos */}
            <div className="bg-cream-100/[0.06] border border-cream-100/[0.09] p-6">
              <p className="font-mono text-[9px] tracking-[0.35em] uppercase text-gold-300/60 mb-3">Horários</p>
              {horarios.length > 0 ? horarios.map(([d, h]) => (
                <div key={d} className="flex items-center justify-between gap-2 py-1.5 border-b border-cream-100/[0.06] last:border-0">
                  <span className="font-mono text-[10px] text-cream-100/40 shrink-0">{d}</span>
                  <span className={`text-sm ${h === 'Fechado' ? 'text-cream-100/25' : 'text-cream-100/60'}`}>{h}</span>
                </div>
              )) : (
                <p className="text-cream-100/30 text-sm">—</p>
              )}
            </div>
            {/* Políticas */}
            <div className="bg-cream-100/[0.06] border border-cream-100/[0.09] p-6">
              <p className="font-mono text-[9px] tracking-[0.35em] uppercase text-gold-300/60 mb-3">Reservas</p>
              {['Reserva sem custo', 'Agendamento Online', 'Tolerância de 15 minutos','Comanda individual para grupos'].map(l => (
                <p key={l} className="text-cream-100/50 text-sm py-1.5 border-b border-cream-100/[0.06] last:border-0">
                  {l}
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── 7. Galeria Social ─────────────────────────────────────────────────────────
function GaleriaSocial({ config }: { config: Configuracoes | null }) {
  const raw = config?.empresa?.instagram ?? '';
  // Normaliza: aceita "cafedasmatas", "@cafedasmatas" ou URL completa
  const igUrl = raw
    ? raw.startsWith('http')
      ? raw
      : `https://www.instagram.com/${raw.replace(/^@/, '')}/`
    : 'https://instagram.com';
  const igHandle = igUrl
    .replace(/^https?:\/\/(www\.)?instagram\.com\/?/, '')
    .replace(/\/$/, '') || 'dasmatas';

  const posts = SOCIAL_POSTS.filter(Boolean);

  // Carrega embed.js do Instagram uma vez e reprocessa quando os posts mudam
  useEffect(() => {
    if (posts.length === 0) return;
    if (window.instgrm) {
      window.instgrm.Embeds.process();
      return;
    }
    const script = document.createElement('script');
    script.src = '//www.instagram.com/embed.js';
    script.async = true;
    script.onload = () => window.instgrm?.Embeds.process();
    document.body.appendChild(script);
  }, [posts.length]);

  return (
    <section className="bg-cream-50 py-20 md:py-28">
      <div className="max-w-7xl mx-auto px-6 sm:px-10">
        <div className="flex items-end justify-between mb-12">
          <div>
            <div className="flex items-center gap-4 mb-3">
              <span className="font-editorial italic text-5xl text-charcoal-200">06</span>
              <span className="font-mono text-[9px] tracking-[0.4em] uppercase text-charcoal-400">@{igHandle}</span>
            </div>
            <h2 className="font-editorial italic text-4xl md:text-5xl text-charcoal-700 leading-tight">
              A experiência<br />de quem viveu.
            </h2>
          </div>
          <a
            href={igUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:flex items-center gap-2 font-mono text-[9px] tracking-[0.35em] uppercase text-charcoal-500 hover:text-charcoal-700 transition-colors border-b border-charcoal-700/20 pb-px"
          >
            <InstagramIcon size={12} />
            Seguir no Instagram
          </a>
        </div>

        {posts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((url, i) => (
              <div
                key={url}
                data-reveal
                className="reveal flex flex-col items-center"
                style={{ animationDelay: `${(i % 3) * 80}ms` }}
              >
                {/* Sem data-instgrm-captioned = exibe só a mídia, sem legenda */}
                <blockquote
                  className="instagram-media"
                  data-instgrm-permalink={url}
                  data-instgrm-version="14"
                  style={{ width: '100%', maxWidth: '540px', minWidth: '0', margin: 0 }}
                />
                {/* Botão para ler legenda no Instagram */}
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 flex items-center gap-1.5 font-mono text-[9px] tracking-[0.3em] uppercase text-charcoal-400 hover:text-charcoal-700 transition-colors"
                >
                  <InstagramIcon size={10} />
                  Ler legenda
                  <ArrowUpRight size={9} />
                </a>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-16 text-center">
            <InstagramIcon size={32} />
            <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-charcoal-400 mt-4">
              Adicione URLs em SOCIAL_POSTS no código
            </p>
          </div>
        )}

        <div className="mt-8 flex justify-center">
          <a
            href={igUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 font-mono text-[9px] tracking-[0.4em] uppercase text-charcoal-500 hover:text-charcoal-700 transition-colors"
          >
            <InstagramIcon size={12} />
            Ver mais no Instagram
            <ArrowUpRight size={11} />
          </a>
        </div>
      </div>
    </section>
  );
}

// ── 8. Localização ────────────────────────────────────────────────────────────
function Localizacao({ config }: { config: Configuracoes | null }) {
  const emp = config?.empresa;
  const caf = config?.cafeteria;
  const horarios = caf ? listaHorarios(caf.horarios) : [];
  const mapsUrl = 'https://maps.app.goo.gl/FwLUituSiuowJPa4A';

  return (
    <section className="bg-charcoal-700 py-0 overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[480px]">
        {/* Map */}
        <div className="relative min-h-[320px] lg:min-h-0 bg-charcoal-600">
          {/*
            Substitua o src abaixo pelo embed do Google Maps:
            Maps → Compartilhar → Incorporar um mapa → copie o <iframe src="...">
          */}
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3656.1234567890!2d-46.6!3d-23.5!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjPCsDMwJzAwLjAiUyA0NsKwMzYnMDAuMCJX!5e0!3m2!1spt-BR!2sbr!4v1234567890"
            className="absolute inset-0 w-full h-full border-0 opacity-70 grayscale"
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Localização Das Matas"
          />
          <div className="absolute inset-0 bg-charcoal-700/20 pointer-events-none" />
        </div>

        {/* Info */}
        <div className="relative flex flex-col justify-center p-10 md:p-14 lg:p-16 bg-charcoal-700">
          <Grain opacity={0.1} />
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-8">
              <span className="font-editorial italic text-5xl text-charcoal-500">07</span>
              <span className="font-mono text-[9px] tracking-[0.4em] uppercase text-cream-100/30">Como chegar</span>
            </div>

            <h2 className="font-editorial italic text-3xl md:text-4xl text-cream-50 leading-tight mb-8">
              Venha nos visitar.
            </h2>

            <div className="space-y-6">
              {/* Endereço */}
              <div className="flex gap-4">
                <MapPin size={16} className="text-gold-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-mono text-[9px] tracking-[0.3em] uppercase text-cream-100/30 mb-1">Endereço</p>
                  <p className="text-cream-100/70 text-sm leading-relaxed">
                    {emp?.endereco || '—'}
                    {(emp?.cidade || emp?.estado) && (
                      <><br />{[emp.cidade, emp.estado].filter(Boolean).join(', ')}</>
                    )}
                    {emp?.cep && <><br />CEP {emp.cep}</>}
                  </p>
                </div>
              </div>

              {/* Horários */}
              {horarios.length > 0 && (
                <div className="flex gap-4">
                  <Clock size={16} className="text-gold-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-mono text-[9px] tracking-[0.3em] uppercase text-cream-100/30 mb-1">Horários</p>
                    <div className="space-y-1">
                      {horarios.map(([d, h]) => (
                        <div key={d} className="flex items-center justify-between text-sm text-cream-100/50 py-1 border-b border-cream-100/[0.05] last:border-0">
                          <span>{d}</span>
                          <span className={h === 'Fechado' ? 'text-charcoal-400' : 'text-cream-100/70'}>{h}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Contato */}
              {(emp?.telefone || emp?.whatsapp || emp?.email) && (
                <div className="flex gap-4">
                  <Phone size={16} className="text-gold-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-mono text-[9px] tracking-[0.3em] uppercase text-cream-100/30 mb-1">Contato</p>
                    {(emp.whatsapp || emp.telefone) && (
                      <p className="text-cream-100/70 text-sm">{emp.whatsapp || emp.telefone}</p>
                    )}
                    {emp.email && (
                      <p className="text-cream-100/50 text-xs mt-0.5">{emp.email}</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-10 pt-8 border-t border-cream-100/[0.07]">
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 font-mono text-[9px] tracking-[0.35em] uppercase text-gold-300 hover:text-gold-200 transition-colors"
              >
                Abrir no Google Maps <ArrowUpRight size={11} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  PÁGINA PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export function CafeteriaPage() {
  const [config, setConfig] = useState<Configuracoes | null>(null);

  useEffect(() => {
    getConfiguracoes().then(setConfig).catch(() => {});
  }, []);

  useReveal();

  return (
    <div className="min-h-screen">
      <SEO
        title="Cafeteria Das Matas — Café de Especialidade em Minas Gerais"
        description="Visite a Cafeteria Das Matas em Minas Gerais. Carta de cafés de origem, métodos alternativos, experiências sensoriais e ambiente único. Reserve sua mesa online."
        path="/cafeteria"
        schema={{
          '@context': 'https://schema.org',
          '@type': 'CafeOrCoffeeShop',
          'name': 'Das Matas — Cafeteria de Especialidade',
          'url': 'https://www.dasmatas.com.br/cafeteria',
          'description': 'Cafeteria de especialidade em Minas Gerais com carta de cafés de origem, método e experiência sensorial. Reserve sua mesa online.',
          'servesCuisine': ['Café Especial', 'Cafeteria de Especialidade'],
          'priceRange': '$$',
          'address': { '@type': 'PostalAddress', 'addressRegion': 'MG', 'addressCountry': 'BR' },
          'reservations': 'https://www.dasmatas.com.br/reservas',
          'parentOrganization': { '@id': 'https://www.dasmatas.com.br/#organization' }
        }}
      />
      <Hero />
      <VideoSection />
      <MenuGallery />
      <Historia config={config} />
      <Servicos />
      <ReservasCTA config={config} />
      <GaleriaSocial config={config} />
      <Localizacao config={config} />
    </div>
  );
}
