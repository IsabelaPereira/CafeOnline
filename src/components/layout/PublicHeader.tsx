import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, ShoppingCart, User } from 'lucide-react';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';

const navLinks = [
  { to: '/clube', label: 'Clube' },
  { to: '/planos', label: 'Planos' },
  { to: '/loja', label: 'Loja' },
  { to: '/reservas', label: 'Reservas' },
  { to: '/blog', label: 'Blog' },
  { to: '/sobre', label: 'Sobre' },
];

export function PublicHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { count } = useCart();
  const { isAuthenticated, isAdmin, isClient } = useAuth();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => { setOpen(false); }, [location.pathname]);

  return (
    <header className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
      scrolled ? 'bg-white shadow-sm border-b border-cream-200' : 'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 md:h-24">
          {/* Logo */}
          <Link to="/" className="flex items-center h-full">
            <img
              src="/logo-das-matas.png"
              alt="Das Matas"
              className={`h-16 md:h-24 w-auto transition-[filter] duration-300 ${
                scrolled ? '' : 'invert'
              }`}
            />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map(link => (
              <Link
                key={link.to}
                to={link.to}
                className={`text-sm font-medium tracking-wide transition-colors ${
                  location.pathname === link.to
                    ? scrolled ? 'text-forest-500' : 'text-earth-200'
                    : scrolled
                      ? 'text-charcoal-600 hover:text-forest-500'
                      : 'text-cream-100 hover:text-earth-200'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Link
              to="/loja"
              className={`relative p-2 transition-colors ${
                scrolled
                  ? 'text-charcoal-600 hover:text-forest-500'
                  : 'text-cream-100 hover:text-earth-200'
              }`}
            >
              <ShoppingCart size={20} />
              {count > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-earth-400 text-white text-xs rounded-full flex items-center justify-center">
                  {count}
                </span>
              )}
            </Link>

            {isAuthenticated ? (
              <Link
                to={isAdmin ? '/admin' : '/cliente'}
                className="hidden md:flex items-center gap-2 px-4 py-2 bg-forest-500 text-cream-100 text-sm font-medium rounded-sm hover:bg-forest-600 transition-colors"
              >
                <User size={14} />
                {isAdmin ? 'Painel' : 'Minha Conta'}
              </Link>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Link
                  to="/login"
                  className={`text-sm font-medium transition-colors ${
                    scrolled
                      ? 'text-charcoal-600 hover:text-forest-500'
                      : 'text-cream-100 hover:text-earth-200'
                  }`}
                >
                  Entrar
                </Link>
                <Link
                  to="/assinar"
                  className="px-4 py-2 bg-forest-500 text-cream-100 text-sm font-medium rounded-sm hover:bg-forest-600 transition-colors"
                >
                  Assinar
                </Link>
              </div>
            )}

            {/* Mobile menu */}
            <button
              className={`md:hidden p-2 transition-colors ${
                scrolled ? 'text-charcoal-600' : 'text-cream-100'
              }`}
              onClick={() => setOpen(!open)}
            >
              {open ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {open && (
        <div className="md:hidden bg-white border-t border-cream-200 shadow-lg">
          <div className="px-4 py-4 space-y-1">
            {navLinks.map(link => (
              <Link
                key={link.to}
                to={link.to}
                className="block px-4 py-3 text-sm font-medium text-charcoal-600 hover:bg-cream-100 hover:text-forest-500 rounded-sm transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-3 border-t border-cream-200 space-y-2">
              {isAuthenticated ? (
                <Link
                  to={isAdmin ? '/admin' : '/cliente'}
                  className="block px-4 py-3 bg-forest-500 text-cream-100 text-sm font-medium rounded-sm text-center"
                >
                  {isAdmin ? 'Painel Admin' : 'Minha Conta'}
                </Link>
              ) : (
                <>
                  <Link to="/login" className="block px-4 py-3 text-sm font-medium text-charcoal-600 hover:bg-cream-100 rounded-sm text-center">
                    Entrar
                  </Link>
                  <Link to="/assinar" className="block px-4 py-3 bg-forest-500 text-cream-100 text-sm font-medium rounded-sm text-center">
                    Assinar Agora
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
