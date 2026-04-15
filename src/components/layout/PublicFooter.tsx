import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AtSign, Share2, Mail, Phone, MapPin } from 'lucide-react';
import { getConfiguracoes } from '../../services/configuracoes.service';
import type { Configuracoes, HorarioFuncionamento } from '../../types';

const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const DIAS_CURTO = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function formatHora(h: string): string {
  if (!h) return '';
  const [hh, mm] = h.split(':');
  return mm === '00' ? `${parseInt(hh, 10)}h` : `${parseInt(hh, 10)}h${mm}`;
}

function formatEndereco(c: Configuracoes['empresa']): string {
  const partes: string[] = [];
  if (c.endereco) partes.push(c.endereco);
  const cidadeEstado = [c.cidade, c.estado].filter(Boolean).join(' – ');
  if (cidadeEstado) partes.push(cidadeEstado);
  return partes.join(' — ');
}

function agruparHorarios(horarios: HorarioFuncionamento[]): { label: string; range: string }[] {
  const ordenados = [1, 2, 3, 4, 5, 6, 0]
    .map(d => horarios.find(h => h.diaSemana === d))
    .filter((h): h is HorarioFuncionamento => !!h);

  const grupos: { dias: number[]; range: string }[] = [];
  for (const h of ordenados) {
    const range = h.fechado ? 'Fechado' : `${formatHora(h.abertura)} às ${formatHora(h.fechamento)}`;
    const last = grupos[grupos.length - 1];
    if (last && last.range === range) last.dias.push(h.diaSemana);
    else grupos.push({ dias: [h.diaSemana], range });
  }

  return grupos
    .filter(g => g.range !== 'Fechado')
    .map(g => {
      const label =
        g.dias.length === 1
          ? DIAS[g.dias[0]]
          : `${DIAS_CURTO[g.dias[0]]} – ${DIAS_CURTO[g.dias[g.dias.length - 1]]}`;
      return { label, range: g.range };
    });
}

export function PublicFooter() {
  const [config, setConfig] = useState<Configuracoes | null>(null);

  useEffect(() => {
    getConfiguracoes().then(setConfig).catch(() => setConfig(null));
  }, []);

  const empresa = config?.empresa;
  const horarios = config ? agruparHorarios(config.cafeteria.horarios) : [];
  const endereco = empresa ? formatEndereco(empresa) : '';

  return (
    <footer className="bg-charcoal-700 text-cream-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="lg:col-span-1">
            <Link to="/" className="inline-block mb-4">
              <img
                src="/logo-das-matas.png"
                alt={empresa?.nome || 'Das Matas'}
                className="h-20 md:h-24 w-auto invert"
              />
            </Link>
            <p className="text-sm text-charcoal-300 leading-relaxed mb-6">
              Curadoria mensal de cafés especiais que conectam você a origens, produtores e experiências únicas.
            </p>
            <div className="flex gap-3">
              {empresa?.instagram && (
                <a
                  href={empresa.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-charcoal-600 rounded-sm hover:bg-forest-500 transition-colors"
                >
                  <AtSign size={16} className="text-cream-200" />
                </a>
              )}
              {empresa?.facebook && (
                <a
                  href={empresa.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-charcoal-600 rounded-sm hover:bg-forest-500 transition-colors"
                >
                  <Share2 size={16} className="text-cream-200" />
                </a>
              )}
              {empresa?.email && (
                <a
                  href={`mailto:${empresa.email}`}
                  className="p-2 bg-charcoal-600 rounded-sm hover:bg-forest-500 transition-colors"
                >
                  <AtSign size={16} className="text-cream-200" />
                </a>
              )}
              {!empresa?.instagram && !empresa?.facebook && !empresa?.email && (
                <>
                  <span className="p-2 bg-charcoal-600 rounded-sm">
                    <AtSign size={16} className="text-cream-200" />
                  </span>
                  <span className="p-2 bg-charcoal-600 rounded-sm">
                    <Share2 size={16} className="text-cream-200" />
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Navegação */}
          <div>
            <h4 className="text-xs font-medium text-charcoal-400 uppercase tracking-wider mb-4">Navegação</h4>
            <ul className="space-y-3">
              {[
                { to: '/clube', label: 'O Clube' },
                { to: '/planos', label: 'Planos' },
                { to: '/loja', label: 'Loja' },
                { to: '/reservas', label: 'Reservas' },
                { to: '/blog', label: 'Blog' },
                { to: '/sobre', label: 'Sobre Nós' },
              ].map(link => (
                <li key={link.to}>
                  <Link to={link.to} className="text-sm text-charcoal-300 hover:text-cream-100 transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Clube */}
          <div>
            <h4 className="text-xs font-medium text-charcoal-400 uppercase tracking-wider mb-4">Planos</h4>
            <ul className="space-y-3">
              {[
                { to: '/assinar?plano=casa', label: 'Cafés da Casa — R$ 99/mês' },
                { to: '/assinar?plano=selecionados', label: 'Cafés Selecionados — R$ 129/mês' },
                { to: '/assinar?plano=raridades', label: 'Cafés Raridades — R$ 189/mês' },
              ].map(link => (
                <li key={link.to}>
                  <Link to={link.to} className="text-sm text-charcoal-300 hover:text-cream-100 transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contato */}
          <div>
            <h4 className="text-xs font-medium text-charcoal-400 uppercase tracking-wider mb-4">Contato</h4>
            <ul className="space-y-3">
              {empresa?.email && (
                <li className="flex items-center gap-2.5 text-sm text-charcoal-300">
                  <Mail size={14} className="text-earth-300 shrink-0" />
                  <a href={`mailto:${empresa.email}`} className="hover:text-cream-100 transition-colors">
                    {empresa.email}
                  </a>
                </li>
              )}
              {empresa?.telefone && (
                <li className="flex items-center gap-2.5 text-sm text-charcoal-300">
                  <Phone size={14} className="text-earth-300 shrink-0" />
                  <a href={`tel:${empresa.telefone.replace(/\D/g, '')}`} className="hover:text-cream-100 transition-colors">
                    {empresa.telefone}
                  </a>
                </li>
              )}
              {endereco && (
                <li className="flex items-start gap-2.5 text-sm text-charcoal-300">
                  <MapPin size={14} className="text-earth-300 shrink-0 mt-0.5" />
                  <span>{endereco}</span>
                </li>
              )}
            </ul>
            {horarios.length > 0 && (
              <div className="mt-6">
                <p className="text-xs text-charcoal-400 mb-2">Horário da Cafeteria</p>
                {horarios.map(h => (
                  <p key={h.label} className="text-sm text-charcoal-300">
                    {h.label}: {h.range}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-charcoal-600 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-charcoal-400">
            © {new Date().getFullYear()} {empresa?.nome || 'Das Matas'}. Todos os direitos reservados.
          </p>
          <div className="flex gap-4">
            <Link to="/privacidade" className="text-xs text-charcoal-400 hover:text-cream-200 transition-colors">
              Privacidade
            </Link>
            <Link to="/termos" className="text-xs text-charcoal-400 hover:text-cream-200 transition-colors">
              Termos
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
