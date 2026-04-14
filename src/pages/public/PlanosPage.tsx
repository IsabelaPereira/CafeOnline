import React from 'react';
import { Link } from 'react-router-dom';
import { Check, ArrowRight } from 'lucide-react';
import { usePlanos } from '../../hooks/useAssinaturas';

export function PlanosPage() {
  const { data: planos } = usePlanos();
  return (
    <div className="pt-20">
      {/* Header */}
      <section className="py-20 bg-charcoal-700 text-center">
        <p className="font-display italic text-earth-300 text-lg mb-3">Escolha sua experiência</p>
        <h1 className="font-serif text-5xl text-cream-100 mb-4">Planos do Clube</h1>
        <p className="text-charcoal-300 max-w-xl mx-auto">
          Cada plano oferece uma curadoria diferente, com dois pacotes de 250g por mês e conteúdo exclusivo de membros.
        </p>
      </section>

      {/* Planos */}
      <section className="py-20 bg-cream-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
            {planos.map((plano) => (
              <div
                key={plano.id}
                className={`rounded-sm border-2 overflow-hidden ${
                  plano.destaque ? 'border-forest-500 shadow-xl' : 'border-cream-300 bg-white'
                }`}
              >
                {plano.destaque && (
                  <div className="bg-forest-500 text-center py-2">
                    <span className="text-cream-100 text-xs font-medium tracking-widest uppercase">
                      Mais Escolhido
                    </span>
                  </div>
                )}
                <div className={`p-8 ${plano.destaque ? 'bg-forest-500' : 'bg-white'}`}>
                  <h2 className={`font-serif text-3xl mb-2 ${plano.destaque ? 'text-cream-100' : 'text-charcoal-700'}`}>
                    {plano.nome}
                  </h2>
                  <p className={`text-sm leading-relaxed mb-6 ${plano.destaque ? 'text-forest-200' : 'text-charcoal-500'}`}>
                    {plano.descricao}
                  </p>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className={`font-display text-5xl ${plano.destaque ? 'text-cream-100' : 'text-charcoal-700'}`}>
                      R$ {plano.preco}
                    </span>
                    <span className={`${plano.destaque ? 'text-forest-200' : 'text-charcoal-400'}`}>/mês</span>
                  </div>
                  <p className={`text-xs ${plano.destaque ? 'text-forest-200' : 'text-charcoal-400'}`}>
                    + frete calculado pelo CEP
                  </p>
                </div>
                <div className={`p-8 ${plano.destaque ? 'bg-forest-600' : 'bg-cream-50'}`}>
                  <p className={`text-xs font-medium uppercase tracking-wider mb-4 ${plano.destaque ? 'text-forest-300' : 'text-charcoal-400'}`}>
                    Incluído no plano
                  </p>
                  <ul className="space-y-3 mb-8">
                    {plano.beneficios.map((b, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <Check size={14} className={`mt-0.5 shrink-0 ${plano.destaque ? 'text-earth-300' : 'text-forest-500'}`} />
                        <span className={`text-sm ${plano.destaque ? 'text-forest-100' : 'text-charcoal-600'}`}>{b}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    to={`/assinar?plano=${plano.id}`}
                    className={`flex items-center justify-center gap-2 py-3.5 rounded-sm text-sm font-medium tracking-wider uppercase transition-colors group ${
                      plano.destaque
                        ? 'bg-earth-400 text-cream-100 hover:bg-earth-500'
                        : 'bg-forest-500 text-cream-100 hover:bg-forest-600'
                    }`}
                  >
                    Assinar {plano.nome}
                    <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Comparison */}
          <div className="mt-16 bg-white rounded-sm border border-cream-200 overflow-hidden">
            <div className="p-6 border-b border-cream-200">
              <h3 className="font-serif text-2xl text-charcoal-700">Comparativo dos planos</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-cream-50">
                    <th className="px-6 py-3 text-left text-xs font-medium text-charcoal-400 uppercase tracking-wider">Benefício</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-charcoal-400 uppercase tracking-wider">Da Casa</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-forest-500 uppercase tracking-wider bg-forest-50">Selecionados</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-charcoal-400 uppercase tracking-wider">Raridades</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cream-100">
                  {[
                    ['2 pacotes de 250g/mês', true, true, true],
                    ['Conteúdo exclusivo', true, true, true],
                    ['Ficha técnica completa', false, true, true],
                    ['Vídeos sobre produtores', false, true, true],
                    ['Microlotes e raridades', false, false, true],
                    ['Convites para eventos', false, false, true],
                    ['Acesso prioritário', false, true, true],
                    ['Atendimento personalizado', false, false, true],
                  ].map(([label, casa, sel, rar], i) => (
                    <tr key={i} className="hover:bg-cream-50">
                      <td className="px-6 py-3 text-sm text-charcoal-600">{String(label)}</td>
                      {[casa, sel, rar].map((has, j) => (
                        <td key={j} className={`px-6 py-3 text-center ${j === 1 ? 'bg-forest-50' : ''}`}>
                          {has ? (
                            <Check size={16} className="text-forest-500 mx-auto" />
                          ) : (
                            <span className="text-charcoal-300 text-sm">—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <p className="text-center text-sm text-charcoal-400 mt-8">
            Ainda com dúvidas?{' '}
            <Link to="/contato" className="text-forest-500 hover:underline">Fale com a gente</Link>
          </p>
        </div>
      </section>
    </div>
  );
}
