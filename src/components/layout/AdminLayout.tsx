import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Package, ShoppingBag, Users, Calendar, BookOpen,
  CreditCard, BarChart3, Settings, LogOut, Menu, X, Coffee, Bell,
  ChevronDown, Truck, FileText, Star, Tag, Inbox
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface NavItem {
  icon: React.ReactNode;
  label: string;
  to: string;
  children?: { label: string; to: string }[];
}

const navItems: NavItem[] = [
  { icon: <LayoutDashboard size={18} />, label: 'Dashboard', to: '/admin' },
  {
    icon: <ShoppingBag size={18} />, label: 'Pedidos', to: '/admin/pedidos',
    children: [
      { label: 'Lista de Pedidos', to: '/admin/pedidos' },
      { label: 'Novo Pedido', to: '/admin/pedidos/novo' },
    ],
  },
  {
    icon: <Star size={18} />, label: 'Assinaturas', to: '/admin/assinaturas',
    children: [
      { label: 'Assinantes', to: '/admin/assinaturas' },
      { label: 'Planos', to: '/admin/assinaturas/planos' },
      { label: 'Edições do Clube', to: '/admin/assinaturas/edicoes' },
    ],
  },
  {
    icon: <Users size={18} />, label: 'CRM / Leads', to: '/admin/crm',
    children: [
      { label: 'Funil de Leads', to: '/admin/crm' },
      { label: 'Todos os Leads', to: '/admin/crm/leads' },
      { label: 'Clientes', to: '/admin/crm/clientes' },
    ],
  },
  { icon: <Calendar size={18} />, label: 'Reservas', to: '/admin/reservas' },
  {
    icon: <Package size={18} />, label: 'Produtos', to: '/admin/produtos',
    children: [
      { label: 'Catálogo', to: '/admin/produtos' },
      { label: 'Estoque', to: '/admin/produtos/estoque' },
      { label: 'Categorias', to: '/admin/produtos/categorias' },
    ],
  },
  { icon: <BookOpen size={18} />, label: 'Blog', to: '/admin/blog' },
  {
    icon: <CreditCard size={18} />, label: 'Financeiro', to: '/admin/financeiro',
    children: [
      { label: 'Visão Geral', to: '/admin/financeiro' },
      { label: 'Contas a Receber', to: '/admin/financeiro/receber' },
      { label: 'Contas a Pagar', to: '/admin/financeiro/pagar' },
      { label: 'DRE', to: '/admin/financeiro/dre' },
      { label: 'Fluxo de Caixa', to: '/admin/financeiro/fluxo' },
      { label: 'Planejador', to: '/admin/financeiro/planejador' },
    ],
  },
  { icon: <Truck size={18} />, label: 'Logística', to: '/admin/logistica' },
  { icon: <BarChart3 size={18} />, label: 'Relatórios', to: '/admin/relatorios' },
  { icon: <Settings size={18} />, label: 'Configurações', to: '/admin/configuracoes' },
];

function NavItemComponent({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const location = useLocation();

  const isActive = location.pathname === item.to ||
    (item.children?.some(c => location.pathname === c.to));

  if (item.children && !collapsed) {
    return (
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-sm text-sm transition-colors ${
            isActive
              ? 'bg-forest-500 text-white'
              : 'text-charcoal-400 hover:bg-cream-200 hover:text-charcoal-700'
          }`}
        >
          {item.icon}
          <span className="flex-1 text-left">{item.label}</span>
          <ChevronDown size={14} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
        {expanded && (
          <div className="ml-7 mt-1 space-y-0.5">
            {item.children.map(child => (
              <Link
                key={child.to}
                to={child.to}
                className={`block px-4 py-2 text-xs rounded-sm transition-colors ${
                  location.pathname === child.to
                    ? 'text-forest-500 bg-forest-50'
                    : 'text-charcoal-400 hover:text-charcoal-700 hover:bg-cream-100'
                }`}
              >
                {child.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link
      to={item.to}
      title={collapsed ? item.label : undefined}
      className={`flex items-center gap-3 px-4 py-2.5 rounded-sm text-sm transition-colors ${
        isActive
          ? 'bg-forest-500 text-white'
          : 'text-charcoal-400 hover:bg-cream-200 hover:text-charcoal-700'
      } ${collapsed ? 'justify-center' : ''}`}
    >
      {item.icon}
      {!collapsed && <span>{item.label}</span>}
    </Link>
  );
}

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <div className={`flex flex-col h-full bg-white border-r border-cream-200 ${
      mobile ? 'w-72' : collapsed ? 'w-16' : 'w-64'
    } transition-all duration-300`}>
      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 h-16 border-b border-cream-200 ${collapsed ? 'justify-center' : ''}`}>
        <div className="w-8 h-8 bg-forest-500 rounded-sm flex items-center justify-center shrink-0">
          <Coffee size={18} className="text-cream-100" />
        </div>
        {(!collapsed || mobile) && (
          <div>
            <p className="font-serif text-sm text-charcoal-700">Das Matas</p>
            <p className="text-xs text-charcoal-400">Painel Admin</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
        {navItems.map(item => (
          <NavItemComponent key={item.to} item={item} collapsed={collapsed && !mobile} />
        ))}
      </nav>

      {/* User */}
      <div className={`p-4 border-t border-cream-200 ${collapsed && !mobile ? 'flex justify-center' : ''}`}>
        {(!collapsed || mobile) ? (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-earth-200 rounded-full flex items-center justify-center text-earth-600 font-medium text-sm">
              {user?.name?.[0] ?? 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-charcoal-700 truncate">{user?.name}</p>
              <p className="text-xs text-charcoal-400 truncate capitalize">{user?.role}</p>
            </div>
            <button onClick={handleLogout} className="text-charcoal-400 hover:text-red-500 transition-colors">
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <button onClick={handleLogout} className="text-charcoal-400 hover:text-red-500 transition-colors">
            <LogOut size={18} />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-cream-100 overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="relative">
            <Sidebar mobile />
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-cream-200 flex items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-4">
            <button
              className="md:hidden text-charcoal-600"
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={22} />
            </button>
            <button
              className="hidden md:block text-charcoal-400 hover:text-charcoal-700 transition-colors"
              onClick={() => setCollapsed(!collapsed)}
            >
              <Menu size={20} />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button className="relative p-2 text-charcoal-400 hover:text-charcoal-700 transition-colors">
              <Bell size={20} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </button>
            <Link
              to="/"
              className="hidden sm:flex items-center gap-1.5 text-xs text-charcoal-400 hover:text-forest-500 transition-colors border border-cream-300 px-3 py-1.5 rounded-sm"
            >
              Ver site
            </Link>
            <div className="w-8 h-8 bg-earth-200 rounded-full flex items-center justify-center text-earth-600 font-medium text-sm">
              {user?.name?.[0] ?? 'A'}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
