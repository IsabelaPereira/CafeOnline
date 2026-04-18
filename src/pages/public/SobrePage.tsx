import React from 'react';
import { Link } from 'react-router-dom';
import { Coffee, MapPin, Heart, Award, ArrowRight } from 'lucide-react';
import { SEO } from '../../components/SEO';

export function SobrePage() {
  return (
    <div className="pt-20">
      <SEO
        title="Sobre a Das Matas — Nossa História e Propósito"
        description="Conheça a Das Matas: uma marca nascida do amor pelo café especial e pelo desejo de aproximar pessoas de origens, produtores e experiências únicas em Minas Gerais e no Brasil."
        path="/sobre"
        schema={{
          '@context': 'https://schema.org',
          '@type': 'AboutPage',
          'name': 'Sobre a Das Matas',
          'url': 'https://www.dasmatas.com.br/sobre',
          'description': 'A Das Matas é uma marca dedicada à curadoria de cafés especiais, com clube de assinatura e cafeteria de especialidade em Minas Gerais.',
          'publisher': { '@id': 'https://www.dasmatas.com.br/#organization' }
        }}
      />
      {/* Hero */}
      <section className="py-24 bg-charcoal-700 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-gradient-to-br from-earth-400 to-forest-700" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <p className="font-display italic text-earth-300 text-lg mb-4">Quem somos</p>
          <h1 className="font-serif text-5xl md:text-6xl text-cream-100 leading-tight mb-6">
            Sobre a Das Matas
          </h1>
          <p className="text-charcoal-300 text-lg leading-relaxed max-w-2xl mx-auto">
            Uma marca nascida do amor pelo café especial e pelo desejo de aproximar pessoas de origens, produtores e experiências únicas.
          </p>
        </div>
      </section>

      {/* Manifesto */}
      <section className="py-24 bg-cream-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="font-display italic text-earth-400 text-lg mb-4">Nosso propósito</p>
              <h2 className="font-serif text-4xl text-charcoal-700 mb-6">
                Conectar pessoas a cafés extraordinários
              </h2>
              <p className="text-charcoal-500 leading-relaxed mb-4">
                A Das Matas é uma marca dedicada à curadoria de cafés especiais e experiências que valorizam origem, sensorial e descoberta. Acreditamos que um bom café tem uma história, um produtor e um terroir que merecem ser conhecidos e celebrados.
              </p>
              <p className="text-charcoal-500 leading-relaxed mb-4">
                Fundada por apaixonados por café especial, a Das Matas nasceu da convicção de que o consumidor merece mais do que um produto — merece uma experiência completa de conexão com o café que consome.
              </p>
              <p className="text-charcoal-500 leading-relaxed">
                Nossa missão é curar, selecionar e apresentar os melhores cafés do Brasil, aproximando assinantes de produtores, regiões e processos que transformam cada xícara em uma pequena jornada sensorial.
              </p>
            </div>

            <div className="bg-forest-500 rounded-sm p-10 text-center">
              <Coffee size={56} className="text-forest-300 mx-auto mb-6" />
              <blockquote className="font-display text-2xl text-cream-100 italic leading-relaxed">
                "Curadoria especial da Das Matas para transformar sua experiência com café."
              </blockquote>
            </div>
          </div>
        </div>
      </section>

      {/* Valores */}
      <section className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <p className="font-display italic text-earth-400 text-lg mb-3">O que nos guia</p>
            <h2 className="font-serif text-4xl text-charcoal-700">Nossos valores</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: <Award size={28} />,
                title: 'Qualidade sem concessões',
                desc: 'Selecionamos apenas cafés com pontuação acima de 80 pontos SCA. Cada grão importa.',
              },
              {
                icon: <MapPin size={28} />,
                title: 'Origem e rastreabilidade',
                desc: 'Conhecemos cada produtor, região e fazenda. Transparência total na cadeia do café.',
              },
              {
                icon: <Coffee size={28} />,
                title: 'Educação sensorial',
                desc: 'Acreditamos que o conhecimento amplia o prazer. Por isso educamos enquanto deliciamos.',
              },
              {
                icon: <Heart size={28} />,
                title: 'Relacionamento genuíno',
                desc: 'Tratamos cada assinante como parte da família Das Matas, com cuidado e atenção.',
              },
            ].map((valor, i) => (
              <div key={i} className="text-center p-6">
                <div className="w-16 h-16 bg-earth-100 rounded-sm flex items-center justify-center text-earth-500 mx-auto mb-4">
                  {valor.icon}
                </div>
                <h3 className="font-serif text-lg text-charcoal-700 mb-3">{valor.title}</h3>
                <p className="text-sm text-charcoal-500 leading-relaxed">{valor.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* O Clube */}
      <section className="py-24 bg-earth-700">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="font-display italic text-earth-300 text-lg mb-4">Nossa essência</p>
              <h2 className="font-serif text-4xl text-cream-100 mb-6">O Clube Das Matas</h2>
              <p className="text-earth-200 leading-relaxed mb-4">
                O Clube Das Matas é a expressão mais completa da nossa missão. Todo mês, duas caixas de café chegam na casa dos assinantes com uma proposta clara: ampliar o repertório, descobrir novos sabores e criar uma relação mais profunda com o café.
              </p>
              <p className="text-earth-200 leading-relaxed mb-6">
                Cada edição é pensada com cuidado, reunindo cafés de perfis complementares, regiões distintas e processos diferentes, acompanhados de conteúdo exclusivo que contextualiza e enriquece a experiência.
              </p>
              <Link
                to="/assinar"
                className="inline-flex items-center gap-2 px-6 py-3 bg-earth-400 text-cream-100 text-sm font-medium tracking-wider uppercase rounded-sm hover:bg-earth-500 transition-colors group"
              >
                Assinar o clube
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            <div className="space-y-4">
              {[
                { titulo: 'Curadoria mensal', desc: 'Dois cafés especiais selecionados com critério técnico e sensorial.' },
                { titulo: 'Conteúdo exclusivo', desc: 'Fichas técnicas, vídeos, histórias e dicas de preparo acessíveis na área do membro.' },
                { titulo: 'Avaliação e descoberta', desc: 'Registre suas impressões e construa seu perfil de consumo ao longo do tempo.' },
                { titulo: 'Comunidade Das Matas', desc: 'Faça parte de uma rede de apreciadores que valorizam experiência e qualidade.' },
              ].map((item, i) => (
                <div key={i} className="bg-earth-600/50 rounded-sm p-5 border border-earth-500/30">
                  <h4 className="font-serif text-lg text-cream-100 mb-1">{item.titulo}</h4>
                  <p className="text-sm text-earth-200">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* A Cafeteria */}
      <section className="py-24 bg-cream-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <p className="font-display italic text-earth-400 text-lg mb-4">Nos visite</p>
          <h2 className="font-serif text-4xl text-charcoal-700 mb-6">Nossa cafeteria</h2>
          <p className="text-charcoal-500 max-w-2xl mx-auto leading-relaxed mb-8">
            Nossa cafeteria física é o espaço onde tudo se encontra: o café, a conversa, o conhecimento e a experiência. Um lugar para descobrir, provar e aprender sobre cafés especiais em um ambiente acolhedor e refinado.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
            {[
              { label: 'Endereço', value: 'Rua dos Cafezais, 245 — São Paulo, SP' },
              { label: 'Horário', value: 'Ter–Sex: 8h–18h · Sáb–Dom: 9h–17h' },
              { label: 'Reservas', value: 'Reserve sua mesa online com antecedência' },
            ].map((info, i) => (
              <div key={i} className="bg-white rounded-sm p-5 border border-cream-200">
                <p className="text-xs font-medium text-charcoal-400 uppercase tracking-wider mb-2">{info.label}</p>
                <p className="text-sm text-charcoal-600">{info.value}</p>
              </div>
            ))}
          </div>
          <Link
            to="/reservas"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-forest-500 text-cream-100 text-sm font-medium tracking-wider uppercase rounded-sm hover:bg-forest-600 transition-colors"
          >
            Reservar uma mesa
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
}
