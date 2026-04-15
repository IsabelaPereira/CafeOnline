import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Package, ShoppingBag, Users, Calendar, BookOpen,
  CreditCard, BarChart3, Settings, LogOut, Menu, Bell,
  ChevronDown, Truck, Star, Search, ArrowUpRight, ClipboardList
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface NavItem {
  icon: React.ReactNode;
  label: string;
  to: string;
  children?: { label: string; to: string }[];
}

const navItems: NavItem[] = [
  { icon: <LayoutDashboard size={16} />, label: 'Painel', to: '/admin' },
  {
    icon: <ShoppingBag size={16} />, label: 'Pedidos', to: '/admin/pedidos',
    children: [
      { label: 'Lista de pedidos', to: '/admin/pedidos' },
      { label: 'Novo pedido', to: '/admin/pedidos/novo' },
    ],
  },
  {
    icon: <Star size={16} />, label: 'Assinaturas', to: '/admin/assinaturas',
    children: [
      { label: 'Assinantes', to: '/admin/assinaturas' },
      { label: 'Planos', to: '/admin/assinaturas/planos' },
      { label: 'Edições do clube', to: '/admin/assinaturas/edicoes' },
    ],
  },
  {
    icon: <Users size={16} />, label: 'CRM · Leads', to: '/admin/crm',
    children: [
      { label: 'Funil de leads', to: '/admin/crm' },
      { label: 'Todos os leads', to: '/admin/crm/leads' },
      { label: 'Clientes', to: '/admin/crm/clientes' },
    ],
  },
  { icon: <Calendar size={16} />, label: 'Reservas', to: '/admin/reservas' },
  {
    icon: <Package size={16} />, label: 'Produtos', to: '/admin/produtos',
    children: [
      { label: 'Catálogo', to: '/admin/produtos' },
      { label: 'Estoque', to: '/admin/produtos/estoque' },
      { label: 'Categorias', to: '/admin/produtos/categorias' },
    ],
  },
  { icon: <BookOpen size={16} />, label: 'Editorial · Blog', to: '/admin/blog' },
  {
    icon: <CreditCard size={16} />, label: 'Financeiro', to: '/admin/financeiro',
    children: [
      { label: 'Visão geral', to: '/admin/financeiro' },
      { label: 'Contas a receber', to: '/admin/financeiro/receber' },
      { label: 'Contas a pagar', to: '/admin/financeiro/pagar' },
      { label: 'DRE', to: '/admin/financeiro/dre' },
      { label: 'Fluxo de caixa', to: '/admin/financeiro/fluxo' },
      { label: 'Planejador', to: '/admin/financeiro/planejador' },
    ],
  },
  { icon: <Truck size={16} />, label: 'Logística', to: '/admin/logistica' },
  { icon: <BarChart3 size={16} />, label: 'Relatórios', to: '/admin/relatorios' },
  { icon: <ClipboardList size={16} />, label: 'Logs de Auditoria', to: '/admin/logs' },
  { icon: <Settings size={16} />, label: 'Configurações', to: '/admin/configuracoes' },
];

function NavItemComponent({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const location = useLocation();
  const isActive =
    location.pathname === item.to ||
    (item.children?.some(c => location.pathname === c.to));
  const [expanded, setExpanded] = useState<boolean>(Boolean(isActive && item.children));

  const baseRow =
    'group relative w-full flex items-center gap-3 px-3 py-2 text-[12px] font-mono tracking-[0.18em] uppercase transition-all duration-200';
  const accentBar =
    'absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-6 rounded-full transition-all duration-300';

  if (item.children && !collapsed) {
    return (
      <div className="relative">
        <button
          onClick={() => setExpanded(!expanded)}
          className={`${baseRow} ${
            isActive
              ? 'text-cream-100 bg-cream-100/[0.06]'
              : 'text-cream-100/55 hover:text-cream-100 hover:bg-cream-100/[0.04]'
          }`}
        >
          <span
            aria-hidden
            className={`${accentBar} ${isActive ? 'bg-gold-300' : 'bg-transparent group-hover:bg-cream-100/30'}`}
          />
          <span className={`shrink-0 ${isActive ? 'text-gold-300' : 'text-cream-100/50 group-hover:text-cream-100/80'}`}>
            {item.icon}
          </span>
          <span className="flex-1 text-left">{item.label}</span>
          <ChevronDown
            size={12}
            className={`transition-transform duration-300 opacity-60 ${expanded ? 'rotate-180' : ''}`}
          />
        </button>
        <div
          className={`grid transition-[grid-template-rows] duration-300 ease-out ${
            expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
          }`}
        >
          <div className="overflow-hidden">
            <div className="pl-9 pr-3 pt-1 pb-2 space-y-0.5">
              {item.children.map(child => {
                const childActive = location.pathname === child.to;
                return (
                  <Link
                    key={child.to}
                    to={child.to}
                    className={`flex items-center gap-2 py-2 text-[13px] transition-colors ${
                      childActive
                        ? 'text-gold-300'
                        : 'text-cream-100/65 hover:text-cream-100'
                    }`}
                  >
                    <span className={`h-px w-3 shrink-0 ${childActive ? 'bg-gold-300' : 'bg-cream-100/30'}`} />
                    <span className="font-sans">{child.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Link
      to={item.to}
      title={collapsed ? item.label : undefined}
      className={`${baseRow} ${collapsed ? 'justify-center px-0' : ''} ${
        isActive
          ? 'text-cream-100 bg-cream-100/[0.06]'
          : 'text-cream-100/55 hover:text-cream-100 hover:bg-cream-100/[0.04]'
      }`}
    >
      <span
        aria-hidden
        className={`${accentBar} ${isActive ? 'bg-gold-300' : 'bg-transparent group-hover:bg-cream-100/30'}`}
      />
      <span className={`shrink-0 ${isActive ? 'text-gold-300' : 'text-cream-100/50 group-hover:text-cream-100/80'}`}>
        {item.icon}
      </span>
      {!collapsed && <span>{item.label}</span>}
    </Link>
  );
}

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // breadcrumb derivation
  const currentItem =
    navItems.find(n =>
      n.to === location.pathname ||
      n.children?.some(c => c.to === location.pathname)
    ) ?? navItems[0];
  const currentChild = currentItem.children?.find(c => c.to === location.pathname);
  const crumbMain = currentItem.label;
  const crumbSub = currentChild?.label;

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <div
      className={`relative flex flex-col h-full bg-forest-700 text-cream-100 overflow-hidden ${
        mobile ? 'w-72' : collapsed ? 'w-[68px]' : 'w-64'
      } transition-[width] duration-300`}
    >
      {/* warm radial accent */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none opacity-80"
        style={{
          background:
            'radial-gradient(120% 60% at 0% 0%, rgba(201,168,76,0.14) 0%, transparent 55%), radial-gradient(90% 70% at 100% 100%, rgba(107,68,35,0.4) 0%, transparent 65%)',
        }}
      />
      <div aria-hidden className="absolute inset-0 grain-layer opacity-[0.14] pointer-events-none" />

      {/* Brand */}
      <Link
        to="/admin"
        className={`relative flex items-center gap-3 px-4 h-24 border-b border-cream-100/10 group ${
          collapsed && !mobile ? 'justify-center' : ''
        }`}
      >
        <img
          src="/logo-das-matas.png"
          alt="Das Matas"
          style={{ filter: 'brightness(0) invert(1)' }}
          className={`shrink-0 object-contain transition-all ${
            collapsed && !mobile ? 'h-10 w-10' : 'h-14 w-auto'
          }`}
        />
        {(!collapsed || mobile) && (
          <div className="min-w-0 border-l border-cream-100/15 pl-3">
            <p className="font-mono text-[9px] tracking-[0.32em] uppercase text-gold-300/80">
              Painel
            </p>
            <p className="font-mono text-[9px] tracking-[0.32em] uppercase text-cream-100/45 mt-1">
              Administrativo
            </p>
          </div>
        )}
      </Link>

      {/* Section label */}
      {(!collapsed || mobile) && (
        <div className="relative flex items-center gap-3 px-4 pt-5 pb-2">
          <span className="h-px w-4 bg-gold-400/50" />
          <span className="font-mono text-[9px] tracking-[0.35em] uppercase text-cream-100/45">
            Navegação
          </span>
        </div>
      )}

      {/* Nav */}
      <nav className="relative flex-1 overflow-y-auto px-2 pb-4 space-y-[2px] scrollbar-thin">
        {navItems.map(item => (
          <NavItemComponent key={item.to} item={item} collapsed={collapsed && !mobile} />
        ))}
      </nav>

      {/* User */}
      <div className="relative border-t border-cream-100/10 p-3">
        {!collapsed || mobile ? (
          <div className="flex items-center gap-3 p-2 rounded-sm hover:bg-cream-100/[0.04] transition-colors">
            <div className="relative w-9 h-9 shrink-0">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-gold-300 to-earth-500 flex items-center justify-center font-editorial text-forest-700 text-[15px]">
                {user?.name?.[0] ?? 'A'}
              </div>
              <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-forest-300 border border-forest-700" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-editorial text-sm text-cream-100 truncate leading-tight">
                {user?.name ?? 'Administrador'}
              </p>
              <p className="font-mono text-[9px] tracking-[0.25em] uppercase text-cream-100/45 mt-0.5 truncate">
                {user?.role ?? 'admin'}
              </p>
            </div>
            <button
              onClick={handleLogout}
              title="Sair"
              className="text-cream-100/40 hover:text-red-300 transition-colors"
            >
              <LogOut size={15} />
            </button>
          </div>
        ) : (
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center text-cream-100/50 hover:text-red-300 transition-colors py-2"
            title="Sair"
          >
            <LogOut size={16} />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-cream-100 overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden md:flex shrink-0">
        <Sidebar />
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="absolute inset-0 bg-forest-700/70 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative animate-slide-up">
            <Sidebar mobile />
          </div>
        </div>
      )}

      {/* Main column */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="relative h-20 shrink-0 bg-cream-50 border-b border-cream-200 flex items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-5 min-w-0">
            <button
              className="md:hidden text-charcoal-600 hover:text-forest-500 transition-colors"
              onClick={() => setMobileOpen(true)}
              aria-label="Abrir menu"
            >
              <Menu size={22} />
            </button>
            <button
              className="hidden md:flex items-center justify-center w-9 h-9 border border-cream-300 rounded-sm text-charcoal-500 hover:text-forest-500 hover:border-forest-400 transition-colors"
              onClick={() => setCollapsed(!collapsed)}
              aria-label="Alternar sidebar"
            >
              <Menu size={16} />
            </button>

            {/* Breadcrumb + title */}
            <div className="hidden md:block min-w-0">
              <div className="flex items-center gap-2 font-mono text-[10px] tracking-[0.3em] uppercase text-charcoal-400">
                <span>Admin</span>
                <span className="text-charcoal-300">/</span>
                <span className="text-earth-500">{crumbMain}</span>
                {crumbSub && (
                  <>
                    <span className="text-charcoal-300">/</span>
                    <span className="text-charcoal-500">{crumbSub}</span>
                  </>
                )}
              </div>
              <div className="font-editorial text-[20px] leading-none text-charcoal-700 mt-1 tracking-tight">
                {crumbSub ?? crumbMain}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            {/* search chip */}
            <div className="hidden lg:flex items-center gap-2 px-3 h-9 border border-cream-300 bg-white rounded-sm text-charcoal-400 hover:border-forest-400 transition-colors cursor-pointer group">
              <Search size={14} />
              <span className="font-mono text-[10px] tracking-[0.25em] uppercase pr-6">
                Buscar
              </span>
              <span className="font-mono text-[9px] tracking-[0.15em] uppercase border border-cream-300 rounded-sm px-1.5 py-0.5 text-charcoal-400 group-hover:border-forest-300">
                ⌘K
              </span>
            </div>

            {/* notifications */}
            <button
              className="relative flex items-center justify-center w-9 h-9 border border-cream-300 bg-white rounded-sm text-charcoal-500 hover:text-forest-500 hover:border-forest-400 transition-colors"
              aria-label="Notificações"
            >
              <Bell size={15} />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-gold-400" />
            </button>

            {/* view site */}
            <Link
              to="/"
              className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3 border border-cream-300 rounded-sm font-mono text-[10px] tracking-[0.25em] uppercase text-charcoal-500 hover:text-forest-500 hover:border-forest-400 transition-colors"
            >
              Ver site
              <ArrowUpRight size={12} />
            </Link>

            {/* avatar */}
            <div className="flex items-center gap-2.5 pl-2 md:pl-3 md:border-l md:border-cream-200">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gold-300 to-earth-500 flex items-center justify-center font-editorial text-forest-700 text-sm">
                {user?.name?.[0] ?? 'A'}
              </div>
              <div className="hidden xl:block">
                <p className="font-editorial text-sm text-charcoal-700 leading-none">
                  {user?.name?.split(' ')[0] ?? 'Admin'}
                </p>
                <p className="font-mono text-[9px] tracking-[0.25em] uppercase text-charcoal-400 mt-1">
                  {user?.role ?? 'admin'}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-8 max-w-[1600px] mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
