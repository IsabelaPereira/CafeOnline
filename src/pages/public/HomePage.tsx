import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, Star, Package, BookOpen, Heart, ChevronDown,
  Coffee, MapPin, Award, Check, Quote, Mail
} from 'lucide-react';
import { usePlanos } from '../../hooks/useAssinaturas';
import { createLead } from '../../services/leads.service';

// ---- HERO ----
function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-charcoal-700">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 25% 50%, #C4956A 0%, transparent 50%), radial-gradient(circle at 75% 50%, #2D4A3E 0%, transparent 50%)',
        }} />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-forest-500/20 border border-forest-500/30 rounded-full text-forest-300 text-xs font-medium tracking-wider uppercase mb-8">
          <Coffee size={12} />
          Clube de Cafés Especiais
        </div>

        <h1 className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl text-cream-100 leading-tight mb-6" style={{ letterSpacing: '-1px' }}>
          Todo mês, dois cafés
          <span className="block italic text-earth-300">especiais diferentes</span>
          na sua casa.
        </h1>

        <p className="font-sans text-charcoal-300 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed mb-10">
          Conheça novos perfis sensoriais, produtores e regiões produtoras.
          Uma jornada mensal de descoberta para quem valoriza café de verdade.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/assinar"
            className="flex items-center gap-3 px-8 py-4 bg-earth-400 text-cream-100 font-sans font-medium text-sm tracking-wider uppercase rounded-sm hover:bg-earth-500 transition-colors group"
          >
            Assinar o Clube
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            to="/clube"
            className="flex items-center gap-3 px-8 py-4 border border-cream-300/30 text-cream-200 font-sans font-medium text-sm tracking-wider uppercase rounded-sm hover:bg-cream-100/10 transition-colors"
          >
            Conhecer o Clube
          </Link>
        </div>

        {/* Stats */}
        <div className="flex flex-wrap items-center justify-center gap-8 mt-16 pt-8 border-t border-charcoal-600">
          {[
            { value: '127+', label: 'Assinantes ativos' },
            { value: '36+', label: 'Edições do clube' },
            { value: '4.8', label: 'Avaliação média' },
            { value: '12+', label: 'Regiões produtoras' },
          ].map(stat => (
            <div key={stat.label} className="text-center">
              <p className="font-serif text-2xl text-earth-300">{stat.value}</p>
              <p className="text-xs text-charcoal-400 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-charcoal-400 animate-bounce">
        <span className="text-xs">Rolar</span>
        <ChevronDown size={16} />
      </div>
    </section>
  );
}

// ---- O QUE É O CLUBE ----
function SobreOClube() {
  return (
    <section className="py-24 bg-cream-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <p className="font-display italic text-earth-400 text-lg mb-4">O que é o Clube Das Matas</p>
            <h2 className="font-serif text-4xl md:text-5xl text-charcoal-700 leading-tight mb-6">
              Uma jornada sensorial a cada mês
            </h2>
            <p className="text-charcoal-500 leading-relaxed mb-6">
              A Das Matas é uma marca dedicada à curadoria de cafés especiais e experiências que
              valorizam origem, sensorial e descoberta. No Clube Das Matas, selecionamos mensalmente
              dois cafés diferentes para que nossos assinantes conheçam novos perfis, produtores e
              regiões produtoras ao longo do ano.
            </p>
            <p className="text-charcoal-500 leading-relaxed mb-8">
              Mais do que receber cafés em casa, o assinante vive uma jornada de repertório,
              conhecimento e prazer, com conteúdo exclusivo e uma experiência cuidadosamente
              pensada em cada edição.
            </p>
            <Link
              to="/clube"
              className="inline-flex items-center gap-2 text-forest-500 font-medium text-sm hover:text-forest-600 transition-colors group"
            >
              Conhecer tudo sobre o clube
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* Visual */}
          <div className="relative">
            <div className="bg-earth-200 rounded-sm aspect-square flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center p-12">
                  <Coffee size={64} className="text-earth-500 mx-auto mb-6 opacity-40" />
                  <p className="font-display text-2xl italic text-earth-600 opacity-60">
                    "Curadoria especial da Das Matas para transformar sua experiência com café."
                  </p>
                </div>
              </div>
            </div>
            {/* Floating card */}
            <div className="absolute -bottom-6 -left-6 bg-white rounded-sm shadow-lg p-4 max-w-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-forest-100 rounded-sm flex items-center justify-center">
                  <Package size={20} className="text-forest-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-charcoal-700">Box do mês</p>
                  <p className="text-xs text-charcoal-400">Edição Outono 2026</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ---- COMO FUNCIONA ----
function ComoFunciona() {
  const steps = [
    {
      num: '01',
      title: 'Escolha seu plano',
      desc: 'Selecione entre os três planos disponíveis, cada um com uma proposta de experiência diferente.',
    },
    {
      num: '02',
      title: 'Receba a curadoria',
      desc: 'Todo mês, dois pacotes de 250g chegam na sua casa com cafés especiais de diferentes origens.',
    },
    {
      num: '03',
      title: 'Explore o conteúdo',
      desc: 'Acesse informações exclusivas sobre cada café: origem, produtor, sensorial e dicas de preparo.',
    },
    {
      num: '04',
      title: 'Avalie e descubra',
      desc: 'Registre suas impressões e continue ampliando seu repertório a cada nova edição.',
    },
  ];

  return (
    <section className="py-24 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-16">
          <p className="font-display italic text-earth-400 text-lg mb-3">Simples assim</p>
          <h2 className="font-serif text-4xl text-charcoal-700">Como funciona o clube</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, i) => (
            <div key={i} className="relative">
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-8 left-[calc(100%+8px)] right-[-8px] h-px bg-cream-300" />
              )}
              <div className="bg-cream-100 rounded-sm p-6">
                <p className="font-display text-4xl text-earth-300 italic mb-4">{step.num}</p>
                <h3 className="font-serif text-lg text-charcoal-700 mb-3">{step.title}</h3>
                <p className="text-sm text-charcoal-500 leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---- BENEFÍCIOS ----
function Beneficios() {
  const beneficios = [
    { icon: <Coffee size={24} />, title: 'Descoberta mensal', desc: 'Novos perfis, origens e experiências a cada edição.' },
    { icon: <Award size={24} />, title: 'Curadoria especializada', desc: 'Cada café é selecionado com critério técnico e sensorial.' },
    { icon: <MapPin size={24} />, title: 'Origem e produtor', desc: 'Conheça quem produziu e onde nasceu cada café.' },
    { icon: <BookOpen size={24} />, title: 'Conteúdo exclusivo', desc: 'Fichas técnicas, vídeos e histórias disponíveis apenas para membros.' },
    { icon: <Package size={24} />, title: 'Conveniência recorrente', desc: 'Receba sem preocupação, todo mês, sem precisar se lembrar.' },
    { icon: <Heart size={24} />, title: 'Comunidade e relacionamento', desc: 'Faça parte de uma comunidade que valoriza o bom café.' },
  ];

  return (
    <section className="py-24 bg-forest-500">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-16">
          <p className="font-display italic text-forest-300 text-lg mb-3">Por que assinar</p>
          <h2 className="font-serif text-4xl text-cream-100">Os benefícios do clube</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {beneficios.map((b, i) => (
            <div key={i} className="bg-forest-600/50 rounded-sm p-6 border border-forest-400/30">
              <div className="w-12 h-12 bg-forest-400/30 rounded-sm flex items-center justify-center text-earth-300 mb-4">
                {b.icon}
              </div>
              <h3 className="font-serif text-lg text-cream-100 mb-2">{b.title}</h3>
              <p className="text-sm text-forest-200 leading-relaxed">{b.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---- PLANOS ----
function Planos() {
  const { data: planos } = usePlanos();
  return (
    <section className="py-24 bg-cream-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-16">
          <p className="font-display italic text-earth-400 text-lg mb-3">Escolha sua experiência</p>
          <h2 className="font-serif text-4xl text-charcoal-700 mb-4">Planos do clube</h2>
          <p className="text-charcoal-500 max-w-lg mx-auto">
            Todos os planos incluem dois pacotes de 250g por mês, conteúdo exclusivo e acesso às edições do clube.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {planos.map((plano) => (
            <div
              key={plano.id}
              className={`rounded-sm border-2 overflow-hidden transition-transform hover:-translate-y-1 ${
                plano.destaque
                  ? 'border-forest-500 shadow-lg'
                  : 'border-cream-300 bg-white'
              }`}
            >
              {plano.destaque && (
                <div className="bg-forest-500 text-cream-100 text-xs font-medium tracking-wider uppercase text-center py-2">
                  Mais popular
                </div>
              )}
              <div className={`p-8 ${plano.destaque ? 'bg-forest-500 text-cream-100' : 'bg-white'}`}>
                <h3 className={`font-serif text-2xl mb-2 ${plano.destaque ? 'text-cream-100' : 'text-charcoal-700'}`}>
                  {plano.nome}
                </h3>
                <p className={`text-sm mb-6 leading-relaxed ${plano.destaque ? 'text-forest-200' : 'text-charcoal-500'}`}>
                  {plano.descricao}
                </p>
                <div className="flex items-baseline gap-1">
                  <span className={`font-display text-4xl ${plano.destaque ? 'text-cream-100' : 'text-charcoal-700'}`}>
                    R$ {plano.preco}
                  </span>
                  <span className={`text-sm ${plano.destaque ? 'text-forest-200' : 'text-charcoal-400'}`}>/mês</span>
                </div>
                <p className={`text-xs mt-1 ${plano.destaque ? 'text-forest-200' : 'text-charcoal-400'}`}>
                  + frete calculado no checkout
                </p>
              </div>

              <div className={`p-6 ${plano.destaque ? 'bg-forest-600' : 'bg-cream-50'}`}>
                <ul className="space-y-3 mb-6">
                  {plano.beneficios.map((b, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <Check size={14} className={`mt-0.5 shrink-0 ${plano.destaque ? 'text-earth-300' : 'text-forest-500'}`} />
                      <span className={`text-sm ${plano.destaque ? 'text-forest-100' : 'text-charcoal-600'}`}>{b}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  to={`/assinar?plano=${plano.id}`}
                  className={`block text-center py-3 rounded-sm text-sm font-medium tracking-wider uppercase transition-colors ${
                    plano.destaque
                      ? 'bg-earth-400 text-cream-100 hover:bg-earth-500'
                      : 'bg-forest-500 text-cream-100 hover:bg-forest-600'
                  }`}
                >
                  Assinar agora
                </Link>
              </div>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-charcoal-400 mt-6">
          Sem taxa de adesão · Cancele quando quiser · Primeiro envio em até 7 dias
        </p>
      </div>
    </section>
  );
}

// ---- GRÃO OU MOÍDO ----
function GraoOuMoido() {
  const [selected, setSelected] = useState<'grao' | 'moido'>('grao');

  return (
    <section className="py-24 bg-earth-700">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <p className="font-display italic text-earth-300 text-lg mb-3">Você decide</p>
          <h2 className="font-serif text-4xl text-cream-100">Grão ou moído?</h2>
        </div>

        <div className="flex justify-center gap-4 mb-12">
          {(['grao', 'moido'] as const).map(opt => (
            <button
              key={opt}
              onClick={() => setSelected(opt)}
              className={`px-8 py-3 rounded-sm text-sm font-medium tracking-wider uppercase transition-colors ${
                selected === opt
                  ? 'bg-earth-400 text-cream-100'
                  : 'border border-earth-500 text-earth-300 hover:border-earth-300'
              }`}
            >
              {opt === 'grao' ? 'Em Grão' : 'Moído'}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {selected === 'grao' ? (
            <>
              <div className="bg-earth-600/50 rounded-sm p-6 border border-earth-500/30">
                <h3 className="font-serif text-xl text-cream-100 mb-3">Vantagens do grão</h3>
                <ul className="space-y-2">
                  {[
                    'Máxima frescura e preservação dos aromas',
                    'Liberdade para escolher a granulometria',
                    'Melhor aproveitamento do potencial do café',
                    'Ideal para quem tem moedor em casa',
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-earth-200">
                      <Check size={14} className="text-earth-300 mt-0.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-earth-600/50 rounded-sm p-6 border border-earth-500/30">
                <h3 className="font-serif text-xl text-cream-100 mb-3">Recomendamos para quem</h3>
                <ul className="space-y-2">
                  {[
                    'Possui moedor manual ou elétrico',
                    'Prepara cafés em métodos filtrados',
                    'Deseja a experiência completa do café',
                    'Valoriza o processo do preparo',
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-earth-200">
                      <Check size={14} className="text-earth-300 mt-0.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            <>
              <div className="bg-earth-600/50 rounded-sm p-6 border border-earth-500/30">
                <h3 className="font-serif text-xl text-cream-100 mb-3">Vantagens do moído</h3>
                <ul className="space-y-2">
                  {[
                    'Conveniência imediata no preparo',
                    'Não precisa de moedor',
                    'Granulometria ideal para seu método',
                    'Perfeito para a correria do dia a dia',
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-earth-200">
                      <Check size={14} className="text-earth-300 mt-0.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-earth-600/50 rounded-sm p-6 border border-earth-500/30">
                <h3 className="font-serif text-xl text-cream-100 mb-3">Opções de moagem</h3>
                <ul className="space-y-2">
                  {[
                    'Fina — para espresso e moka',
                    'Média — para coador e AeroPress',
                    'Grossa — para prensa francesa',
                    'Extra grossa — para cold brew',
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-earth-200">
                      <Check size={14} className="text-earth-300 mt-0.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

// ---- DEPOIMENTOS ----
function Depoimentos() {
  const depoimentos = [
    {
      nome: 'Larissa M.',
      cidade: 'São Paulo, SP',
      plano: 'Cafés Selecionados',
      texto: 'Assino há 8 meses e toda edição é uma surpresa nova. Aprendi muito sobre regiões, processos e meu paladar mudou completamente. Simplesmente não consigo mais tomar um café qualquer.',
      nota: 5,
    },
    {
      nome: 'Ricardo T.',
      cidade: 'Belo Horizonte, MG',
      plano: 'Cafés Raridades',
      texto: 'O nível de curadoria é impressionante. Os cafés chegam sempre frescos, o conteúdo é muito rico e o atendimento é impecável. Recomendo a qualquer apreciador de café especial.',
      nota: 5,
    },
    {
      nome: 'Amanda P.',
      cidade: 'Curitiba, PR',
      plano: 'Cafés da Casa',
      texto: 'Comecei pelo plano menor e já quero subir. A qualidade supera muito qualquer café que comprava no mercado. Virou o meu café favorito do dia a dia.',
      nota: 5,
    },
  ];

  return (
    <section className="py-24 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-16">
          <p className="font-display italic text-earth-400 text-lg mb-3">O que dizem os assinantes</p>
          <h2 className="font-serif text-4xl text-charcoal-700">Experiências reais</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {depoimentos.map((dep, i) => (
            <div key={i} className="bg-cream-100 rounded-sm p-6">
              <Quote size={32} className="text-earth-300 mb-4" />
              <p className="text-charcoal-600 leading-relaxed mb-6 italic">
                "{dep.texto}"
              </p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-charcoal-700 text-sm">{dep.nome}</p>
                  <p className="text-xs text-charcoal-400">{dep.cidade}</p>
                  <p className="text-xs text-forest-500 mt-0.5">{dep.plano}</p>
                </div>
                <div className="flex gap-0.5">
                  {Array.from({ length: dep.nota }).map((_, j) => (
                    <Star key={j} size={14} className="text-gold-400" fill="#C9A84C" />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---- FAQ ----
function FAQ() {
  const [open, setOpen] = useState<number | null>(null);

  const perguntas = [
    {
      q: 'Como funciona a assinatura?',
      a: 'Após assinar, você recebe mensalmente dois pacotes de café de 250g cada, selecionados pela nossa equipe. A cobrança é automática todo mês no cartão cadastrado.',
    },
    {
      q: 'Posso cancelar quando quiser?',
      a: 'Sim! Não há fidelidade. Você pode cancelar a qualquer momento pela sua área de cliente, sem multas ou complicações.',
    },
    {
      q: 'Como é calculado o frete?',
      a: 'O frete é calculado automaticamente com base no seu CEP durante o checkout. O valor é somado à mensalidade do plano e renovado mensalmente.',
    },
    {
      q: 'Posso trocar de plano?',
      a: 'Sim! Você pode mudar de plano a qualquer momento pela sua área de cliente. A mudança é efetiva na próxima cobrança.',
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
    <section className="py-24 bg-cream-100">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <p className="font-display italic text-earth-400 text-lg mb-3">Dúvidas frequentes</p>
          <h2 className="font-serif text-4xl text-charcoal-700">Perguntas frequentes</h2>
        </div>

        <div className="space-y-3">
          {perguntas.map((item, i) => (
            <div key={i} className="bg-white rounded-sm border border-cream-200 overflow-hidden">
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between px-6 py-4 text-left"
              >
                <span className="font-medium text-charcoal-700 text-sm">{item.q}</span>
                <ChevronDown
                  size={18}
                  className={`text-charcoal-400 shrink-0 ml-4 transition-transform ${open === i ? 'rotate-180' : ''}`}
                />
              </button>
              {open === i && (
                <div className="px-6 pb-5 border-t border-cream-100">
                  <p className="text-sm text-charcoal-500 leading-relaxed pt-4">{item.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---- NEWSLETTER ----
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
      await createLead({
        nome: nome || email.split('@')[0],
        email,
        origem: 'landing',
        interesse: 'newsletter',
      });
      setEnviado(true);
    } catch {
      setErro('Não foi possível realizar o cadastro. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="py-20 bg-forest-800">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Mail size={20} className="text-earth-300" />
          <span className="text-xs font-medium tracking-wider uppercase text-earth-300">Newsletter</span>
        </div>
        <h2 className="font-serif text-3xl text-cream-100 mb-3">Receba novidades sobre café especial</h2>
        <p className="text-charcoal-300 text-sm mb-8">
          Dicas de preparo, histórias de produtores e alertas das novas edições do clube.
        </p>

        {enviado ? (
          <div className="flex items-center justify-center gap-3 py-4 px-6 bg-forest-700 rounded-sm border border-forest-600">
            <Check size={18} className="text-earth-300" />
            <p className="text-cream-100 text-sm font-medium">Ótimo! Você está na lista. Obrigado!</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="text"
              value={nome}
              onChange={e => setNome(e.target.value)}
              placeholder="Seu nome"
              className="flex-1 px-4 py-3 bg-forest-700 border border-forest-600 rounded-sm text-sm text-cream-100 placeholder-charcoal-400 focus:outline-none focus:ring-1 focus:ring-earth-400"
            />
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="flex-1 px-4 py-3 bg-forest-700 border border-forest-600 rounded-sm text-sm text-cream-100 placeholder-charcoal-400 focus:outline-none focus:ring-1 focus:ring-earth-400"
            />
            <button
              type="submit"
              disabled={loading || !email}
              className="px-6 py-3 bg-earth-400 text-cream-100 text-sm font-medium rounded-sm hover:bg-earth-500 disabled:opacity-50 transition-colors uppercase tracking-wider shrink-0"
            >
              {loading ? '...' : 'Inscrever'}
            </button>
          </form>
        )}
        {erro && <p className="text-red-400 text-xs mt-3">{erro}</p>}
        <p className="text-charcoal-400 text-xs mt-4">Sem spam. Cancele quando quiser.</p>
      </div>
    </section>
  );
}

// ---- CTA FINAL ----
function CTAFinal() {
  return (
    <section className="py-24 bg-charcoal-700 relative overflow-hidden">
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at center, #C4956A 0%, transparent 70%)',
        }} />
      </div>

      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 text-center">
        <h2 className="font-display text-5xl text-cream-100 italic leading-tight mb-6">
          Comece sua jornada com café especial hoje.
        </h2>
        <p className="text-charcoal-300 text-lg mb-10">
          Junte-se a mais de 127 assinantes que descobrem novos cafés todo mês.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/assinar"
            className="px-10 py-4 bg-earth-400 text-cream-100 font-sans font-medium text-sm tracking-wider uppercase rounded-sm hover:bg-earth-500 transition-colors"
          >
            Assinar o Clube
          </Link>
          <Link
            to="/loja"
            className="px-10 py-4 border border-cream-300/30 text-cream-200 font-sans font-medium text-sm tracking-wider uppercase rounded-sm hover:bg-cream-100/10 transition-colors"
          >
            Comprar avulso
          </Link>
          <Link
            to="/reservas"
            className="px-10 py-4 border border-cream-300/30 text-cream-200 font-sans font-medium text-sm tracking-wider uppercase rounded-sm hover:bg-cream-100/10 transition-colors"
          >
            Reservar mesa
          </Link>
        </div>
      </div>
    </section>
  );
}

// ---- PAGE ----
export function HomePage() {
  return (
    <>
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
