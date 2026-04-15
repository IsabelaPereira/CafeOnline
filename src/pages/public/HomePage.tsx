import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, Star, Package, BookOpen, Heart, Plus,
  Coffee, MapPin, Award, Check, Mail, Leaf,
} from 'lucide-react';
import { createLead } from '../../services/leads.service';
import { PlanosShowcase } from '../../components/planos/PlanosShowcase';

// ---------- utilities ----------

function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>('.reveal');
    if (!('IntersectionObserver' in window)) {
      els.forEach(el => el.classList.add('is-visible'));
      return;
    }
    const io = new IntersectionObserver(
      entries => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            e.target.classList.add('is-visible');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    );
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);
}

function ScrollProgress() {
  const [p, setP] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      setP(max > 0 ? (h.scrollTop / max) * 100 : 0);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-[2px] bg-charcoal-700/20">
      <div
        className="h-full bg-earth-400 transition-[width] duration-150 ease-out"
        style={{ width: `${p}%` }}
      />
    </div>
  );
}

// ---------- HERO ----------

function Hero() {
  return (
    <section className="relative overflow-hidden bg-charcoal-700 text-cream-100">
      <div className="absolute inset-0 grain-layer opacity-[0.12]" />
      <div
        className="absolute inset-0 drift-slow pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(55% 55% at 18% 28%, rgba(196,149,106,0.28) 0%, transparent 62%), radial-gradient(50% 50% at 92% 85%, rgba(45,74,62,0.55) 0%, transparent 62%)',
        }}
      />

      {/* meta strip */}
      <div className="relative z-10 pt-20 md:pt-28 px-6 sm:px-10 flex items-center justify-between text-[10px] sm:text-[11px] tracking-[0.35em] uppercase font-mono text-cream-300/75">
        <span>Das Matas · CLUBE</span>
        <span className="hidden sm:block">CAFÉ DE VERDADE · CAFETERIA DE ESPECIALIDADE</span>
        <span>MINAS GERAIS / Brasil</span>
      </div>
      <div className="relative z-10 mt-5 border-t border-cream-300/15 mx-6 sm:mx-10" />

      {/* full-width video stage */}
      <div className="relative z-10 mt-6 w-full">
        <div className="relative w-full h-[62vh] sm:h-[68vh] lg:h-[78vh] overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <iframe
              src="https://player.vimeo.com/video/1159251839?autoplay=1&autopause=1&color=240700&background=1&transparent=0&controls=0&loop=1&muted=1&portrait=0&title=0&byline=0"
              title="Das Matas — Hero"
              allow="autoplay; fullscreen; picture-in-picture"
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[177.78vh] h-[56.25vw] min-w-full min-h-full border-0 pointer-events-none"
            />
          </div>

          {/* gradient overlay for contrast */}
          <div className="absolute inset-0 bg-gradient-to-r from-charcoal-700/85 via-charcoal-700/40 to-charcoal-700/80" />
          <div className="absolute inset-0 bg-gradient-to-t from-charcoal-700/70 via-transparent to-transparent" />

          {/* overlay content */}
          <div className="relative z-10 h-full px-6 sm:px-10 max-w-7xl mx-auto flex flex-col justify-end lg:justify-center pb-10 lg:pb-0">
            <div className="grid grid-cols-12 gap-6 w-full">
              <div className="hidden lg:block lg:col-span-7">
                <span className="inline-flex items-center gap-3 text-[10px] tracking-[0.35em] uppercase font-mono text-earth-300">
                  <span className="w-10 h-px bg-earth-300" /> Clube de cafés especiais
                </span>
                <h1 className="mt-6 font-editorial italic text-cream-100 tracking-[-0.02em] leading-[0.9] text-[clamp(2.5rem,6vw,5.5rem)] max-w-xl">
                  Todo mês, <span className="text-earth-200">dois cafés</span>{' '}
                  <span className="italic text-earth-300">diferentes</span>{' '}
                  <span className="text-cream-200">na sua casa.</span>
                </h1>
              </div>

              <aside className="col-span-12 lg:col-span-5 lg:col-start-8 space-y-6 lg:space-y-8">
                <div className="border-l-2 border-earth-300 pl-5 max-w-sm bg-charcoal-700/40 backdrop-blur-sm py-3 lg:bg-transparent lg:backdrop-blur-0 lg:py-0">
                  <p className="font-display italic text-lg sm:text-xl text-cream-100 leading-snug">
                    Uma jornada sensorial mensal — de origens, produtores e métodos —
                    para quem valoriza café de verdade.
                  </p>
                </div>

                <div className="flex flex-col gap-3 max-w-xs">
                  <Link
                    to="/assinar"
                    className="group flex items-center justify-between gap-4 px-6 py-4 bg-earth-400 text-cream-100 text-[11px] tracking-[0.3em] uppercase font-mono rounded-[2px] hover:bg-earth-500 transition-colors"
                  >
                    Assinar o clube
                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </Link>
                  <Link
                    to="/clube"
                    className="group flex items-center justify-between gap-4 px-6 py-4 border border-cream-300/40 bg-charcoal-700/30 backdrop-blur-sm text-cream-100 text-[11px] tracking-[0.3em] uppercase font-mono rounded-[2px] hover:border-earth-300 hover:text-earth-200 transition-colors"
                  >
                    Conhecer o clube
                    <ArrowRight size={14} className="opacity-60 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </aside>
            </div>
          </div>
        </div>
      </div>

      {/* stats row */}


      {/* origins marquee */}
      <div className="relative z-10 border-t border-cream-300/15 py-4 overflow-hidden">
        <div className="marquee-track flex gap-10 whitespace-nowrap text-[11px] tracking-[0.4em] uppercase font-mono text-cream-200/55 w-[300%]">
          {Array.from({ length: 3 }).map((_, k) => (
            <React.Fragment key={k}>
              {[
                'Mantiqueira de Minas',
                'Cerrado Mineiro',
                'Chapada Diamantina',
                'Sul de Minas',
                'Matas de Rondônia',
                'Montanhas do Espírito Santo',
                'Serra Fluminense',
                'Planalto da Bahia',
              ].map(r => (
                <span key={`${k}-${r}`} className="inline-flex items-center gap-10">
                  <span>{r}</span>
                  <span className="text-earth-300">✦</span>
                </span>
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* corner ornament */}
      <div className="absolute bottom-24 right-6 sm:right-10 w-28 h-28 hidden md:flex items-center justify-center text-earth-300/50 pointer-events-none">
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" fill="none" stroke="currentColor">
          <circle cx="50" cy="50" r="48" strokeWidth="0.8" strokeDasharray="2 3" />
          <circle cx="50" cy="50" r="36" strokeWidth="0.5" />
        </svg>
        <div className="relative text-center">
          <p className="text-[9px] tracking-[0.3em] uppercase font-mono">Edição</p>
          <p className="font-editorial italic text-2xl leading-none mt-0.5 text-earth-200">N° 36</p>
        </div>
      </div>
    </section>
  );
}

// ---------- SOBRE ----------

function SobreOClube() {
  return (
    <section className="relative py-24 sm:py-32 bg-cream-100 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 sm:px-10">
        <div className="grid grid-cols-12 gap-8 lg:gap-12 items-start">
          <div className="col-span-12 lg:col-span-7 reveal">
            <div className="flex items-center gap-4 text-[10px] tracking-[0.35em] uppercase font-mono text-earth-500">
              <span className="w-12 h-px bg-earth-400" /> Capítulo Um · O Clube
            </div>
            <h2 className="mt-6 font-editorial italic text-[clamp(2.5rem,6.2vw,5.25rem)] leading-[0.95] text-charcoal-700 tracking-[-0.015em]">
              Uma jornada
              <br />
              <span className="text-earth-500">sensorial</span>{' '}
              <span className="font-serif not-italic text-charcoal-700">a cada mês.</span>
            </h2>

            <div className="mt-10 max-w-xl space-y-5">
              <p className="text-charcoal-500 leading-[1.85] text-[15px]">
                <span className="float-left font-editorial italic text-[5.5rem] leading-[0.75] mr-3 mt-2 text-earth-400">
                  A
                </span>
                Das Matas é uma marca dedicada à curadoria de cafés especiais e experiências
                que valorizam origem, sensorial e descoberta. No Clube Das Matas, selecionamos
                mensalmente dois cafés diferentes — para que cada assinante conheça novos
                perfis, produtores e regiões produtoras ao longo do ano.
              </p>
              <p className="text-charcoal-500 leading-[1.85] text-[15px]">
                Mais do que receber cafés em casa, o assinante vive uma jornada de repertório,
                conhecimento e prazer — com conteúdo exclusivo e uma experiência
                cuidadosamente pensada em cada edição.
              </p>
            </div>

            <Link
              to="/clube"
              className="mt-10 inline-flex items-center gap-3 text-[11px] tracking-[0.3em] uppercase font-mono text-forest-500 hover:text-forest-600 border-b border-forest-500/40 pb-1.5 group"
            >
              Conhecer o Clube
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* Magazine cover composition */}
          <div className="col-span-12 lg:col-span-5 relative reveal">
            <div className="relative aspect-[3/4] rounded-[2px] overflow-hidden shadow-[0_30px_60px_-20px_rgba(74,44,23,0.45)] bg-gradient-to-br from-earth-400 via-earth-500 to-earth-700">
              <div className="absolute inset-0 grain-layer opacity-25" />
              <div
                className="absolute inset-0 opacity-40"
                style={{
                  backgroundImage:
                    'radial-gradient(60% 50% at 80% 10%, rgba(248,244,239,0.25) 0%, transparent 60%)',
                }}
              />

              <div className="absolute inset-0 flex flex-col justify-between p-8 text-cream-100">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] tracking-[0.35em] uppercase font-mono opacity-75">
                      Edição Especial
                    </p>
                    <p className="text-[10px] tracking-[0.35em] uppercase font-mono opacity-75 mt-0.5">
                      café de verdade
                    </p>
                  </div>
                  <p className="text-[10px] tracking-[0.35em] uppercase font-mono opacity-75">
                    origem
                  </p>
                </div>

                <div>
                  <p className="font-editorial italic text-[clamp(2rem,4.5vw,3.25rem)] leading-[0.98]">
                    Onde o
                    <br />
                    café <em className="not-italic font-serif">respira</em>
                    <br />
                    e a terra
                    <br />
                    conta
                    <br />
                    <span className="italic text-cream-200">sua história.</span>
                  </p>
                  <div className="mt-6 h-px bg-cream-100/25" />
                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-[10px] tracking-[0.35em] uppercase font-mono opacity-80">
                      Curadoria Das Matas
                    </p>
                    <p className="text-[10px] tracking-[0.35em] uppercase font-mono opacity-80">
                      EXCLUSIVO
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Circular stamp */}
            <div className="absolute -bottom-8 -left-4 sm:-left-10 w-36 h-36 bg-cream-50 rounded-full shadow-xl flex items-center justify-center border border-earth-300/40 -rotate-[8deg]">
              <svg
                viewBox="0 0 100 100"
                className="absolute inset-0 w-full h-full text-earth-600/70"
              >
                <defs>
                  <path
                    id="stamp-path"
                    d="M 50 50 m -36 0 a 36 36 0 1 1 72 0 a 36 36 0 1 1 -72 0"
                  />
                </defs>
                <text fontSize="6.5" letterSpacing="4" fill="currentColor" fontFamily="IBM Plex Mono">
                  <textPath href="#stamp-path">
                    CLUBE DAS MATAS · DESDE 2019 ·                   </textPath>
                </text>
              </svg>
              <div className="text-center">
                <p className="font-editorial italic text-3xl text-earth-700 leading-none">Box</p>
                <div className="my-1 w-8 h-px bg-earth-500/40 mx-auto" />
                <p className="font-editorial italic text-xl text-earth-700 leading-none">do Mês</p>
              </div>
            </div>

            {/* Floating mini-card */}
            <div className="absolute -top-6 -right-3 sm:-right-6 bg-forest-600 text-cream-100 p-4 rounded-[2px] rotate-[5deg] shadow-xl border border-forest-400/40">
              <Leaf size={14} className="text-earth-300" />
              <p className="mt-2 text-[9px] tracking-[0.3em] uppercase font-mono opacity-75">
                ENVIOs com
              </p>
              <p className="font-editorial italic text-lg leading-tight text-cream-100">
                 Torra Fresca
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------- COMO FUNCIONA ----------

function ComoFunciona() {
  const steps = [
    { title: 'Escolha seu plano', desc: 'Selecione entre três planos, cada um com proposta sensorial distinta.' },
    { title: 'Receba a curadoria', desc: 'Dois pacotes de 250g chegam todo mês à sua porta, sempre frescos.' },
    { title: 'Explore o conteúdo', desc: 'Origem, produtor, ficha sensorial e dicas de preparo para cada café.' },
    { title: 'Avalie e descubra', desc: 'Registre suas impressões e amplie seu repertório a cada edição.' },
  ];

  return (
    <section className="relative py-24 sm:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-6 sm:px-10">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-16 border-b border-charcoal-200 pb-8">
          <div>
            <div className="flex items-center gap-4 text-[10px] tracking-[0.35em] uppercase font-mono text-earth-500">
              <span className="w-12 h-px bg-earth-400" /> Capítulo Dois · A Jornada
            </div>
            <h2 className="mt-6 font-editorial italic text-[clamp(2.5rem,6.2vw,5.25rem)] leading-[0.95] text-charcoal-700 tracking-[-0.015em]">
              Como <span className="text-earth-500">funciona</span>.
            </h2>
          </div>
          <p className="md:max-w-xs md:text-right font-display italic text-xl text-charcoal-500 leading-snug">
            Quatro passos simples
            <br />
            — da curadoria à xícara.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => (
            <div
              key={i}
              className={`reveal relative p-8 ${
                i !== 0 ? 'lg:border-l lg:border-charcoal-200' : ''
              } ${i < steps.length - 1 ? 'border-b lg:border-b-0 border-charcoal-200' : ''}`}
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              <p className="flex items-start gap-1 font-editorial italic text-earth-300 leading-[0.85]">
                <span className="text-[11px] tracking-[0.2em] font-mono italic mt-3 text-earth-400/70">
                  N°
                </span>
                <span className="text-[96px]">{String(i + 1).padStart(2, '0')}</span>
              </p>
              <h3 className="mt-6 font-serif text-2xl text-charcoal-700 leading-tight">{step.title}</h3>
              <div className="mt-3 w-10 h-px bg-earth-400/60" />
              <p className="mt-4 text-sm text-charcoal-500 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------- BENEFÍCIOS ----------

function Beneficios() {
  const items = [
    { icon: <Coffee size={20} />, title: 'Descoberta mensal', desc: 'Novos perfis, origens e experiências a cada edição.' },
    { icon: <Award size={20} />, title: 'Curadoria especializada', desc: 'Cada café selecionado com critério técnico e sensorial.' },
    { icon: <MapPin size={20} />, title: 'Origem e produtor', desc: 'Conheça quem plantou, onde e como cada café nasceu.' },
    { icon: <BookOpen size={20} />, title: 'Conteúdo exclusivo', desc: 'Fichas técnicas, vídeos e histórias só para assinantes.' },
    { icon: <Package size={20} />, title: 'Conveniência mensal', desc: 'Receba sem preocupação — sem precisar se lembrar.' },
    { icon: <Heart size={20} />, title: 'Comunidade viva', desc: 'Faça parte de um círculo que valoriza café de verdade.' },
  ];

  return (
    <section className="relative py-24 sm:py-32 bg-forest-600 text-cream-100 overflow-hidden">
      <div className="absolute inset-0 grain-layer opacity-[0.18]" />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(70% 60% at 85% 0%, rgba(196,149,106,0.2) 0%, transparent 60%), radial-gradient(50% 50% at 0% 100%, rgba(196,149,106,0.14) 0%, transparent 60%)',
        }}
      />

      <div className="relative max-w-7xl mx-auto px-6 sm:px-10">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-4 text-[10px] tracking-[0.35em] uppercase font-mono text-earth-300">
            <span className="w-10 h-px bg-earth-300" />
            Capítulo Três · Os Ganhos
            <span className="w-10 h-px bg-earth-300" />
          </div>
          <h2 className="mt-6 font-editorial italic text-[clamp(2.5rem,6.2vw,5.25rem)] leading-[0.95] tracking-[-0.015em]">
            Por que <span className="text-earth-300">assinar</span>.
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-forest-400/25 border border-forest-400/25">
          {items.map((b, i) => (
            <div
              key={i}
              className="reveal group bg-forest-600 p-8 hover:bg-forest-500 transition-colors"
              style={{ transitionDelay: `${(i % 3) * 70}ms` }}
            >
              <div className="flex items-start justify-between mb-6">
                <div className="w-12 h-12 border border-earth-300/50 rounded-full flex items-center justify-center text-earth-300 group-hover:bg-earth-400/10 transition-colors">
                  {b.icon}
                </div>
                <span className="font-editorial italic text-xl text-earth-300/70">
                  · {String(i + 1).padStart(2, '0')}
                </span>
              </div>
              <h3 className="font-editorial italic text-2xl text-cream-100 leading-tight">
                {b.title}
              </h3>
              <div className="mt-3 w-10 h-px bg-earth-300/50" />
              <p className="mt-4 text-sm text-cream-200/80 leading-relaxed">{b.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------- PLANOS ----------

function Planos() {
  return <PlanosShowcase />;
}

// ---------- GRÃO OU MOÍDO ----------

function GraoOuMoido() {
  const [selected, setSelected] = useState<'grao' | 'moido'>('grao');

  const content = {
    grao: {
      leftLabel: 'Vantagens',
      rightLabel: 'Recomendamos para',
      left: [
        'Máxima frescura e preservação dos aromas',
        'Liberdade para escolher a granulometria',
        'Melhor aproveitamento do potencial do café',
        'Ideal para quem tem moedor em casa',
      ],
      right: [
        'Possui moedor manual ou elétrico',
        'Prepara café em métodos filtrados',
        'Deseja a experiência completa do preparo',
        'Valoriza o ritual de moer na hora',
      ],
    },
    moido: {
      leftLabel: 'Vantagens',
      rightLabel: 'Opções de moagem',
      left: [
        'Conveniência imediata no preparo',
        'Dispensa moedor em casa',
        'Granulometria na medida do seu método',
        'Perfeito para a correria do dia a dia',
      ],
      right: [
        'Fina — espresso e moka',
        'Média — coador e AeroPress',
        'Grossa — prensa francesa',
        'Extra grossa — cold brew',
      ],
    },
  } as const;

  const c = content[selected];

  return (
    <section className="relative py-24 sm:py-32 bg-earth-700 text-cream-100 overflow-hidden">
      <div className="absolute inset-0 grain-layer opacity-[0.2]" />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(55% 55% at 10% 100%, rgba(196,149,106,0.25) 0%, transparent 60%), radial-gradient(45% 50% at 95% 10%, rgba(139,94,60,0.3) 0%, transparent 60%)',
        }}
      />

      <div className="relative max-w-7xl mx-auto px-6 sm:px-10">
        <div className="grid grid-cols-12 gap-8 lg:gap-12 items-start">
          <div className="col-span-12 lg:col-span-5">
            <div className="flex items-center gap-4 text-[10px] tracking-[0.35em] uppercase font-mono text-earth-300">
              <span className="w-12 h-px bg-earth-300" /> Capítulo Cinco · Preparo
            </div>
            <h2 className="mt-6 font-editorial italic text-[clamp(3rem,7.5vw,6.5rem)] leading-[0.9] tracking-[-0.02em]">
              Grão
              <br />
              <span className="text-earth-300">ou</span>
              <br />
              moído?
            </h2>
            <p className="mt-6 max-w-md text-earth-100/80 leading-relaxed text-[15px]">
              Escolha como prefere receber seu café. Você pode alternar
              quando quiser na sua área de assinante.
            </p>

            <div className="mt-10 inline-flex gap-0 p-1 bg-earth-800/60 rounded-full border border-earth-500/40">
              {(['grao', 'moido'] as const).map(opt => (
                <button
                  key={opt}
                  onClick={() => setSelected(opt)}
                  className={`px-6 py-3 rounded-full text-[11px] tracking-[0.3em] uppercase font-mono transition-all ${
                    selected === opt
                      ? 'bg-earth-400 text-cream-100 shadow-inner'
                      : 'text-earth-200 hover:text-cream-100'
                  }`}
                >
                  {opt === 'grao' ? 'Em grão' : 'Moído'}
                </button>
              ))}
            </div>
          </div>

          <div className="col-span-12 lg:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-px bg-earth-500/35 rounded-[2px] overflow-hidden border border-earth-500/50">
            <div className="p-8 bg-earth-700/90 backdrop-blur-sm">
              <p className="text-[10px] tracking-[0.35em] uppercase font-mono text-earth-300">
                {c.leftLabel}
              </p>
              <ul className="mt-6 space-y-4">
                {c.left.map((item, i) => (
                  <li key={i} className="flex items-start gap-4 text-[15px] text-earth-100 leading-relaxed">
                    <span className="font-editorial italic text-earth-300 shrink-0 w-7 text-xl leading-none pt-1">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="p-8 bg-earth-700/90 backdrop-blur-sm">
              <p className="text-[10px] tracking-[0.35em] uppercase font-mono text-earth-300">
                {c.rightLabel}
              </p>
              <ul className="mt-6 space-y-4">
                {c.right.map((item, i) => (
                  <li key={i} className="flex items-start gap-4 text-[15px] text-earth-100 leading-relaxed">
                    <span className="font-editorial italic text-earth-300 shrink-0 w-7 text-xl leading-none pt-1">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------- DEPOIMENTOS ----------

function Depoimentos() {
  const depoimentos = [
    {
      nome: 'Larissa M.',
      cidade: 'São Paulo · SP',
      plano: 'Cafés Selecionados',
      texto:
        'Assino há oito meses e cada edição é uma surpresa. Aprendi muito sobre regiões, processos — meu paladar mudou. Simplesmente não consigo mais tomar um café qualquer.',
      nota: 5,
    },
    {
      nome: 'Ricardo T.',
      cidade: 'Belo Horizonte · MG',
      plano: 'Cafés Raridades',
      texto:
        'O nível de curadoria é impressionante. Os cafés chegam sempre frescos, o conteúdo é rico, o atendimento impecável. Recomendo a qualquer apreciador.',
      nota: 5,
    },
    {
      nome: 'Amanda P.',
      cidade: 'Curitiba · PR',
      plano: 'Cafés da Casa',
      texto:
        'Comecei pelo plano menor e já quero subir. A qualidade supera qualquer café que eu comprava no mercado. Virou o meu ritual diário favorito.',
      nota: 5,
    },
  ];

  return (
    <section className="relative py-24 sm:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-6 sm:px-10">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-16 border-b border-charcoal-200 pb-8">
          <div>
            <div className="flex items-center gap-4 text-[10px] tracking-[0.35em] uppercase font-mono text-earth-500">
              <span className="w-12 h-px bg-earth-400" /> Capítulo Seis · Vozes
            </div>
            <h2 className="mt-6 font-editorial italic text-[clamp(2.5rem,6.2vw,5.25rem)] leading-[0.95] text-charcoal-700 tracking-[-0.015em]">
              O que dizem <span className="text-earth-500">as xícaras</span>.
            </h2>
          </div>
          <div className="flex md:flex-col items-baseline md:items-end gap-2 md:gap-0">
            <span className="font-editorial italic text-6xl md:text-7xl text-gold-400 leading-none">
              wellness
            </span>
            <span className="text-[10px] tracking-[0.3em] uppercase font-mono text-charcoal-400">
              · LIFESTYLE DE QUALIDADE COMEÇA NO CAFÉ DE VERDADE
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {depoimentos.map((dep, i) => (
            <figure
              key={i}
              className="reveal relative bg-cream-50 border border-cream-300 p-10"
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              <span
                aria-hidden
                className="absolute -top-8 left-6 font-editorial italic text-[150px] leading-none text-earth-300 select-none pointer-events-none"
              >
                &ldquo;
              </span>
              <blockquote className="relative font-display italic text-xl text-charcoal-600 leading-[1.5]">
                {dep.texto}
              </blockquote>
              <div className="mt-8 pt-6 border-t border-cream-300 flex items-start justify-between gap-3">
                <figcaption>
                  <p className="font-serif text-base text-charcoal-700">{dep.nome}</p>
                  <p className="mt-0.5 text-[10px] tracking-[0.3em] uppercase font-mono text-charcoal-400">
                    {dep.cidade}
                  </p>
                  <p className="mt-2 text-[10px] tracking-[0.3em] uppercase font-mono text-forest-500">
                    {dep.plano}
                  </p>
                </figcaption>
                <div className="flex gap-0.5 shrink-0">
                  {Array.from({ length: dep.nota }).map((_, j) => (
                    <Star key={j} size={12} className="text-gold-400" fill="#C9A84C" />
                  ))}
                </div>
              </div>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------- FAQ ----------

function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  const perguntas = [
    {
      q: 'Como funciona a assinatura?',
      a: 'Após assinar, você recebe mensalmente dois pacotes de café de 250g cada, selecionados pela nossa equipe. A cobrança é automática todo mês no cartão cadastrado.',
    },
    {
      q: 'Posso cancelar quando quiser?',
      a: 'Sim. Não há fidelidade. Você pode cancelar a qualquer momento pela sua área de cliente, sem multas ou complicações.',
    },
    {
      q: 'Como é calculado o frete?',
      a: 'O frete é calculado automaticamente com base no seu CEP durante o checkout. O valor é somado à mensalidade do plano e renovado mensalmente.',
    },
    {
      q: 'Posso trocar de plano?',
      a: 'Sim. Você pode mudar de plano a qualquer momento pela sua área de cliente. A mudança é efetiva na próxima cobrança.',
    },
    {
      q: 'Em quanto tempo recebo meu primeiro pedido?',
      a: 'O primeiro envio é feito em até 7 dias úteis após a confirmação do pagamento. Você recebe o código de rastreio por e-mail.',
    },
    {
      q: 'Posso escolher quais cafés recebo?',
      a: 'O clube funciona com curadoria — a seleção é feita pela nossa equipe para garantir a melhor experiência de descoberta. Você pode indicar preferências sensoriais no perfil.',
    },
  ];

  return (
    <section className="relative py-24 sm:py-32 bg-cream-100">
      <div className="max-w-6xl mx-auto px-6 sm:px-10">
        <div className="grid grid-cols-12 gap-8 items-start">
          <div className="col-span-12 md:col-span-4 md:sticky md:top-10">
            <div className="flex items-center gap-4 text-[10px] tracking-[0.35em] uppercase font-mono text-earth-500">
              <span className="w-12 h-px bg-earth-400" /> Capítulo Sete · Dúvidas
            </div>
            <h2 className="mt-6 font-editorial italic text-[clamp(2.5rem,5.5vw,4.5rem)] leading-[0.95] text-charcoal-700 tracking-[-0.015em]">
              Perguntas <span className="text-earth-500">frequentes</span>.
            </h2>
            <p className="mt-6 text-sm text-charcoal-500 leading-relaxed">
              Não encontrou o que procurava? Fale com a gente em{' '}
              <a
                href="mailto:contato@dasmatas.com.br"
                className="text-charcoal-700 underline decoration-earth-400 underline-offset-4 hover:decoration-earth-500"
              >
                contato@dasmatas.com.br
              </a>
              .
            </p>
          </div>

          <div className="col-span-12 md:col-span-8 border-t border-charcoal-200">
            {perguntas.map((item, i) => {
              const isOpen = open === i;
              return (
                <div key={i} className="border-b border-charcoal-200">
                  <button
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="w-full flex items-start justify-between gap-6 py-6 text-left group"
                  >
                    <div className="flex items-baseline gap-6 flex-1">
                      <span className="font-editorial italic text-2xl text-earth-400 w-10 shrink-0">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span className="font-serif text-lg text-charcoal-700 leading-snug group-hover:text-charcoal-600">
                        {item.q}
                      </span>
                    </div>
                    <span
                      className={`shrink-0 mt-1.5 w-7 h-7 rounded-full border flex items-center justify-center transition-all duration-300 ${
                        isOpen
                          ? 'rotate-45 bg-earth-400 border-earth-400 text-cream-100'
                          : 'border-charcoal-400 text-charcoal-500'
                      }`}
                    >
                      <Plus size={14} />
                    </span>
                  </button>
                  <div
                    className={`grid transition-all duration-500 ease-out ${
                      isOpen ? 'grid-rows-[1fr] opacity-100 pb-6' : 'grid-rows-[0fr] opacity-0'
                    }`}
                  >
                    <div className="overflow-hidden pl-16 pr-6">
                      <p className="text-[15px] text-charcoal-500 leading-[1.8]">{item.a}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------- NEWSLETTER ----------

function Newsletter() {
  const [email, setEmail] = useState('');
  const [nome, setNome] = useState('');
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setErro('');
    try {
      const hoje = new Date();
      const followUp = new Date(hoje);
      followUp.setDate(followUp.getDate() + 5);
      const toISODate = (d: Date) => d.toISOString().split('T')[0];

      await createLead({
        nome: nome || email.split('@')[0],
        email,
        origem:          'landing-clube',
        etapa:           'interesse_assinatura',
        interesse:       'Clube de Assinatura',
        tags:            ['newsletter', 'potencial-assinante'],
        ultimoContato:   toISODate(hoje),
        proximoFollowUp: toISODate(followUp),
        observacoes:     'Cliente assinou a newsletter na home do site da assinatura',
      });
      setEnviado(true);
    } catch (err: any) {
      console.error('[Newsletter] createLead falhou:', err);
      setErro(err?.message ?? 'Não foi possível realizar o cadastro. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="relative py-24 bg-charcoal-700 text-cream-100 overflow-hidden">
      <div className="absolute inset-0 grain-layer opacity-[0.15]" />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(50% 50% at 50% 0%, rgba(196,149,106,0.18) 0%, transparent 60%)',
        }}
      />

      <div className="relative max-w-4xl mx-auto px-6 sm:px-10">
        <div className="border border-cream-300/15 p-10 sm:p-14 bg-charcoal-700/30 backdrop-blur-sm rounded-[2px]">
          <div className="flex items-center gap-3 text-[10px] tracking-[0.35em] uppercase font-mono text-earth-300">
            <Mail size={14} /> Receba a carta
          </div>
          <h2 className="mt-6 font-editorial italic text-[clamp(2rem,4.5vw,3.5rem)] leading-[0.98] tracking-[-0.01em]">
            Histórias, produtores e
            <br />
            <span className="text-earth-300">preparo</span> — direto no e-mail.
          </h2>
          <p className="mt-4 text-cream-200/70 text-[15px] leading-relaxed max-w-xl">
            Dicas de preparo, histórias de produtores e alertas das novas edições.
            Uma carta por mês — sem spam.
          </p>

          {enviado ? (
            <div className="mt-10 flex items-center gap-3 py-4 px-6 bg-forest-600 border border-forest-400/40 rounded-[2px]">
              <Check size={18} className="text-earth-300" />
              <p className="text-cream-100 text-sm font-medium">
                Ótimo — você está na lista. Obrigado!
              </p>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="mt-10 grid grid-cols-1 sm:grid-cols-[1fr_1.2fr_auto] items-stretch"
            >
              <input
                type="text"
                value={nome}
                onChange={e => setNome(e.target.value)}
                placeholder="Seu nome"
                className="bg-transparent py-4 px-1 text-[16px] text-cream-100 placeholder:text-cream-300/45 focus:outline-none font-display italic border-b border-cream-300/30 focus:border-earth-300 transition-colors"
              />
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="bg-transparent py-4 px-1 sm:pl-4 text-[16px] text-cream-100 placeholder:text-cream-300/45 focus:outline-none font-display italic border-b border-cream-300/30 focus:border-earth-300 transition-colors sm:border-l sm:border-b sm:border-cream-300/20 sm:focus:border-l-earth-300"
              />
              <button
                type="submit"
                disabled={loading || !email}
                className="mt-4 sm:mt-0 sm:ml-4 sm:self-stretch inline-flex items-center justify-between gap-3 px-6 py-4 bg-earth-400 text-cream-100 text-[11px] tracking-[0.3em] uppercase font-mono hover:bg-earth-500 disabled:opacity-50 transition-colors rounded-[2px]"
              >
                {loading ? '...' : 'Inscrever'}
                <ArrowRight size={14} />
              </button>
            </form>
          )}
          {erro && <p className="text-red-400 text-xs mt-3">{erro}</p>}
          <p className="mt-6 text-[10px] tracking-[0.3em] uppercase font-mono text-cream-300/50">
            Sem spam · Cancele quando quiser
          </p>
        </div>
      </div>
    </section>
  );
}

// ---------- CTA FINAL ----------

function CTAFinal() {
  return (
    <section className="relative py-28 sm:py-36 bg-forest-700 text-cream-100 overflow-hidden">
      <div className="absolute inset-0 grain-layer opacity-[0.18]" />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(55% 55% at 28% 100%, rgba(196,149,106,0.22) 0%, transparent 60%), radial-gradient(45% 45% at 92% 0%, rgba(196,149,106,0.14) 0%, transparent 60%)',
        }}
      />

      <div className="relative max-w-5xl mx-auto px-6 sm:px-10 text-center">
        <div className="inline-flex items-center gap-4 text-[10px] tracking-[0.35em] uppercase font-mono text-earth-300">
          <span className="w-12 h-px bg-earth-300" />
          Última página
          <span className="w-12 h-px bg-earth-300" />
        </div>
        <h2 className="mt-8 font-editorial italic text-[clamp(3rem,9vw,7.5rem)] leading-[0.92] tracking-[-0.02em]">
          Comece sua
          <br />
          <span className="text-earth-300">jornada</span> com café
          <br />
          <em className="not-italic font-serif">especial</em> hoje.
        </h2>
        <p className="mt-10 text-cream-200/75 font-display italic text-xl max-w-xl mx-auto">
          Junte-se a 127 assinantes que descobrem novos cafés todo mês.
        </p>

        <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/assinar"
            className="group inline-flex items-center gap-3 px-10 py-4 bg-earth-400 text-cream-100 text-[11px] tracking-[0.3em] uppercase font-mono rounded-[2px] hover:bg-earth-500 transition-colors"
          >
            Assinar o clube
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            to="/loja"
            className="inline-flex items-center gap-3 px-10 py-4 border border-cream-300/30 text-cream-100 text-[11px] tracking-[0.3em] uppercase font-mono rounded-[2px] hover:border-earth-300 hover:text-earth-200 transition-colors"
          >
            Comprar avulso
          </Link>
          <Link
            to="/reservas"
            className="inline-flex items-center gap-3 px-10 py-4 border border-cream-300/30 text-cream-100 text-[11px] tracking-[0.3em] uppercase font-mono rounded-[2px] hover:border-earth-300 hover:text-earth-200 transition-colors"
          >
            Reservar mesa
          </Link>
        </div>

        <div className="mt-20 flex items-center justify-center gap-4 text-earth-300/60">
          <span className="w-12 h-px bg-earth-300/40" />
          <span className="font-editorial italic text-2xl">✦</span>
          <span className="w-12 h-px bg-earth-300/40" />
        </div>
      </div>
    </section>
  );
}

// ---------- PAGE ----------

export function HomePage() {
  useReveal();
  return (
    <>
      <ScrollProgress />
      <Hero />
      <SobreOClube />
      <ComoFunciona />
      <Beneficios />
      <Planos />
      <GraoOuMoido />
      <Depoimentos />
      <FAQ />
      <Newsletter />
      <CTAFinal />
    </>
  );
}
