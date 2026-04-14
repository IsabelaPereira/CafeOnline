import React from 'react';
import { Link } from 'react-router-dom';
import { Coffee, AtSign, Share2, Mail, Phone, MapPin } from 'lucide-react';

export function PublicFooter() {
  return (
    <footer className="bg-charcoal-700 text-cream-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-forest-500 rounded-sm flex items-center justify-center">
                <Coffee size={18} className="text-cream-100" />
              </div>
              <span className="font-serif text-xl text-cream-100">Das Matas</span>
            </div>
            <p className="text-sm text-charcoal-300 leading-relaxed mb-6">
              Curadoria mensal de cafés especiais que conectam você a origens, produtores e experiências únicas.
            </p>
            <div className="flex gap-3">
              <a href="#" className="p-2 bg-charcoal-600 rounded-sm hover:bg-forest-500 transition-colors">
                <AtSign size={16} className="text-cream-200" />
              </a>
              <a href="#" className="p-2 bg-charcoal-600 rounded-sm hover:bg-forest-500 transition-colors">
                <Share2 size={16} className="text-cream-200" />
              </a>
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
              <li className="flex items-center gap-2.5 text-sm text-charcoal-300">
                <Mail size={14} className="text-earth-300 shrink-0" />
                contato@dasmatas.com.br
              </li>
              <li className="flex items-center gap-2.5 text-sm text-charcoal-300">
                <Phone size={14} className="text-earth-300 shrink-0" />
                (11) 99999-8888
              </li>
              <li className="flex items-start gap-2.5 text-sm text-charcoal-300">
                <MapPin size={14} className="text-earth-300 shrink-0 mt-0.5" />
                Rua dos Cafezais, 245 — São Paulo, SP
              </li>
            </ul>
            <div className="mt-6">
              <p className="text-xs text-charcoal-400 mb-2">Horário da Cafeteria</p>
              <p className="text-sm text-charcoal-300">Ter – Sex: 8h às 18h</p>
              <p className="text-sm text-charcoal-300">Sáb – Dom: 9h às 17h</p>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-charcoal-600 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-charcoal-400">
            © 2026 Das Matas. Todos os direitos reservados.
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
