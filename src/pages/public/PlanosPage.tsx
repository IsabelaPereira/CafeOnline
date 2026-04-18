import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { SEO } from '../../components/SEO';

import { PlanosShowcase } from '../../components/planos/PlanosShowcase';
import { getConfiguracoes } from '../../services/configuracoes.service';

export function PlanosPage() {
  const [whatsappUrl, setWhatsappUrl] = useState('https://wa.me/');

  useEffect(() => {
    getConfiguracoes().then(config => {
      const num = config?.empresa?.whatsapp || config?.empresa?.telefone || '';
      const digits = num.replace(/\D/g, '');
      if (digits) setWhatsappUrl(`https://wa.me/${digits}`);
    }).catch(() => {});
  }, []);

  return (
    <div className="pt-20">
      <SEO
        title="Planos do Clube — Assine e Receba Cafés Especiais Todo Mês"
        description="Escolha seu plano Das Matas: Explorador, Colecionador ou Mestre. Cafés especiais selecionados, torra fresca, notas sensoriais e entrega mensal. A partir de R$59/mês. Cancele quando quiser."
        path="/planos"
        schema={{
          '@context': 'https://schema.org',
          '@type': 'ProductGroup',
          'name': 'Clube Das Matas — Planos de Assinatura',
          'url': 'https://www.dasmatas.com.br/planos',
          'description': 'Planos mensais de assinatura de cafés especiais com curadoria exclusiva.',
          'brand': { '@id': 'https://www.dasmatas.com.br/#organization' }
        }}
      />
      {/* Editorial Hero */}
      <section className="relative py-24 sm:py-32 bg-charcoal-700 text-center overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.08] pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(55% 55% at 20% 30%, rgba(196,149,106,0.35) 0%, transparent 60%), radial-gradient(50% 50% at 85% 80%, rgba(45,74,62,0.55) 0%, transparent 60%)',
          }}
        />
        <div className="relative z-10 max-w-3xl mx-auto px-6">
          <div className="inline-flex items-center gap-4 text-[10px] tracking-[0.4em] uppercase font-mono text-earth-300">
            <span className="w-10 h-px bg-earth-300" />
            Planos do Clube
            <span className="w-10 h-px bg-earth-300" />
          </div>
          <h1 className="mt-6 font-editorial italic text-[clamp(2.75rem,7vw,5.5rem)] leading-[0.9] text-cream-100 tracking-[-0.02em]">
            Escolha sua <span className="text-earth-300">experiência</span>
          </h1>
          <p className="mt-6 font-display italic text-xl text-cream-200/85 max-w-xl mx-auto leading-snug">
            Três curadorias, um compromisso: café especial, fresco e com história — direto na sua casa.
          </p>
        </div>
      </section>

      {/* Planos Showcase (shared with home) */}
      <PlanosShowcase showHeader={false} showCompareLink={false} />

      {/* Comparison Table */}
      <section className="relative py-20 bg-cream-100">
        <div className="max-w-5xl mx-auto px-6 sm:px-10">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-3 text-[10px] tracking-[0.4em] uppercase font-mono text-earth-500">
              <span className="w-10 h-px bg-earth-400" />
              Comparativo detalhado
              <span className="w-10 h-px bg-earth-400" />
            </div>
            <h2 className="mt-4 font-editorial italic text-4xl sm:text-5xl text-charcoal-700 tracking-[-0.015em]">
              Tudo o que está incluído.
            </h2>
          </div>

          <div className="bg-white rounded-[3px] border border-charcoal-200/60 overflow-hidden shadow-[0_4px_24px_-8px_rgba(0,0,0,0.08)]">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-cream-50 border-b border-charcoal-200/60">
                    <th className="px-6 py-5 text-left text-[10px] font-mono font-medium text-charcoal-500 uppercase tracking-[0.2em]">
                      Benefício
                    </th>
                    <th className="px-6 py-5 text-center text-[10px] font-mono font-medium text-charcoal-500 uppercase tracking-[0.2em]">
                      Descobridor
                    </th>
                    <th className="px-6 py-5 text-center text-[10px] font-mono font-medium uppercase tracking-[0.2em] bg-earth-50 text-earth-600 relative">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-earth-400" />
                        Explorador
                      </span>
                    </th>
                    <th className="px-6 py-5 text-center text-[10px] font-mono font-medium text-charcoal-500 uppercase tracking-[0.2em]">
                      Conhecedor
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-charcoal-100">
                  {[
                    ['Pacotes de 250g/mês', '2', '2', '2'],
                    ['Cafés diferentes todo mês', false, true, true],
                    ['Edição mensal exclusiva', true, true, true],
                    ['Ficha sensorial do produtor', true, true, true],
                    ['Conteúdo educativo premium', true, true, true],
                    ['Café raro de microlote', false, false, true],
                    ['Conteúdos em vídeo', false, true, true],
                    ['Cursos online', false, true, true],
                    ['Edições limitadas e raras', false, false, true],
                    ['Convites para workshop presencial', true, true, true],
                    ['Ingressos gratuitos para workshop presencial', false, false, true],
                    ['Desconto na loja', '—', '10%', '15%'],
                    ['Frete', 'Calculado', 'Calculado', 'Frete grátis'],
                  ].map(([label, d, e, c], i) => (
                    <tr key={i} className="hover:bg-cream-50/60 transition-colors">
                      <td className="px-6 py-4 text-sm text-charcoal-600 font-medium">{String(label)}</td>
                      {[d, e, c].map((val, j) => (
                        <td
                          key={j}
                          className={`px-6 py-4 text-center ${j === 1 ? 'bg-earth-50/40' : ''}`}
                        >
                          {typeof val === 'boolean' ? (
                            val ? (
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center mx-auto ${j === 1 ? 'bg-earth-400/20 text-earth-500' : 'bg-forest-50 text-forest-500'}`}>
                                <Check size={12} strokeWidth={3} />
                              </div>
                            ) : (
                              <span className="text-charcoal-300">—</span>
                            )
                          ) : (
                            <span className={`text-sm ${j === 1 ? 'text-earth-600 font-semibold' : 'text-charcoal-700 font-medium'}`}>
                              {String(val)}
                            </span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <p className="text-center text-sm text-charcoal-500 mt-10">
            Ainda com dúvidas?{' '}
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="text-earth-500 hover:text-earth-600 underline underline-offset-4">
              Fale com a gente
            </a>
          </p>
        </div>
      </section>
    </div>
  );
}
