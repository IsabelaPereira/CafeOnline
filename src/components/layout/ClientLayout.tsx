import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  User, Star, ShoppingBag, Truck, BookOpen, Heart,
  MapPin, CreditCard, LogOut, Coffee, Menu, X, ChevronRight
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const navLinks = [
  { icon: <User size={16} />, label: 'Minha Conta', to: '/cliente' },
  { icon: <Star size={16} />, label: 'Minhas Assinaturas', to: '/cliente/assinaturas' },
  { icon: <ShoppingBag size={16} />, label: 'Meus Pedidos', to: '/cliente/pedidos' },
  { icon: <Truck size={16} />, label: 'Rastreamentos', to: '/cliente/rastreamentos' },
  { icon: <BookOpen size={16} />, label: 'Conteúdo Exclusivo', to: '/cliente/conteudo' },
  { icon: <Heart size={16} />, label: 'Minhas Avaliações', to: '/cliente/avaliacoes' },
  { icon: <MapPin size={16} />, label: 'Endereços', to: '/cliente/enderecos' },
  { icon: <CreditCard size={16} />, label: 'Pagamentos', to: '/cliente/pagamentos' },
];

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const SidebarContent = () => (
    <>
      {/* Profile */}
      <div className="p-6 border-b border-cream-200">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 bg-earth-200 rounded-full flex items-center justify-center text-earth-600 font-serif text-lg">
            {user?.name?.[0] ?? 'M'}
          </div>
          <div>
            <p className="font-medium text-charcoal-700 text-sm">{user?.name}</p>
            <p className="text-xs text-charcoal-400">{user?.email}</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-forest-100 text-forest-600 text-xs rounded-full">
          <Star size={10} fill="currentColor" />
          Membro Ativo
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3">
        {navLinks.map(link => {
          const active = location.pathname === link.to;
          return (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-sm text-sm transition-colors mb-0.5 ${
                active
                  ? 'bg-forest-500 text-white'
                  : 'text-charcoal-500 hover:bg-cream-200 hover:text-charcoal-700'
              }`}
            >
              {link.icon}
              <span className="flex-1">{link.label}</span>
              {active && <ChevronRight size={14} />}
            </Link>
          );
        })}
      </nav>

      {/* Links bottom */}
      <div className="p-4 border-t border-cream-200 space-y-1">
        <Link to="/" className="flex items-center gap-2 px-4 py-2 text-xs text-charcoal-400 hover:text-forest-500 transition-colors">
          <Coffee size={14} />
          Voltar ao site
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-4 py-2 text-xs text-charcoal-400 hover:text-red-500 transition-colors"
        >
          <LogOut size={14} />
          Sair
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-cream-100">
      {/* Mobile header */}
      <header className="md:hidden h-16 bg-white border-b border-cream-200 flex items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-7 h-7 bg-forest-500 rounded-sm flex items-center justify-center">
            <Coffee size={15} className="text-cream-100" />
          </div>
          <span className="font-serif text-lg text-charcoal-700">Das Matas</span>
        </Link>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="text-charcoal-600">
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </header>

      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex flex-col w-72 min-h-screen bg-white border-r border-cream-200 sticky top-0 h-screen">
          {/* Logo */}
          <div className="flex items-center gap-2 px-6 h-16 border-b border-cream-200">
            <div className="w-8 h-8 bg-forest-500 rounded-sm flex items-center justify-center">
              <Coffee size={18} className="text-cream-100" />
            </div>
            <span className="font-serif text-lg text-charcoal-700">Das Matas</span>
          </div>
          <SidebarContent />
        </aside>

        {/* Mobile sidebar */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
            <div className="relative flex flex-col w-72 bg-white shadow-xl">
              <SidebarContent />
            </div>
          </div>
        )}

        {/* Main */}
        <main className="flex-1 min-h-screen">
          <div className="max-w-4xl mx-auto p-4 md:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
