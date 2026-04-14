// ============================================================
// COMPONENTES UI REUTILIZÁVEIS — DAS MATAS
// ============================================================

import React, { useState } from 'react';
import { X, ChevronDown, ChevronUp, Search, Filter, Download, Eye, EyeOff } from 'lucide-react';

// ---- BUTTON ----
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'gold' | 'earth' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

export function Button({
  variant = 'primary', size = 'md', loading, icon, children, className = '', disabled, ...props
}: ButtonProps) {
  const base = 'inline-flex items-center justify-center gap-2 font-sans font-medium tracking-wider uppercase transition-all duration-200 rounded-sm disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]';
  const variants = {
    primary: 'bg-forest-500 text-cream-100 hover:bg-forest-600',
    secondary: 'border border-forest-500 text-forest-500 hover:bg-forest-500 hover:text-cream-100',
    gold: 'bg-gold-400 text-charcoal-700 hover:bg-gold-500',
    earth: 'bg-earth-500 text-cream-100 hover:bg-earth-600',
    ghost: 'text-charcoal-500 hover:bg-cream-200 hover:text-charcoal-700',
    danger: 'bg-red-500 text-white hover:bg-red-600',
  };
  const sizes = {
    sm: 'px-4 py-2 text-xs',
    md: 'px-6 py-3 text-sm',
    lg: 'px-8 py-4 text-base',
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : icon}
      {children}
    </button>
  );
}

// ---- INPUT ----
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
}

export function Input({ label, error, hint, leftIcon, className = '', ...props }: InputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = props.type === 'password';

  return (
    <div className="w-full">
      {label && (
        <label className="block text-xs font-medium text-charcoal-500 uppercase tracking-wider mb-1.5">
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-400">
            {leftIcon}
          </span>
        )}
        <input
          {...props}
          type={isPassword && showPassword ? 'text' : props.type}
          className={`
            w-full px-4 py-3 border rounded-sm bg-white text-charcoal-700 font-sans text-sm
            focus:outline-none focus:ring-1 focus:ring-forest-400 focus:border-forest-400
            transition-colors placeholder:text-charcoal-300
            ${error ? 'border-red-400 focus:ring-red-400 focus:border-red-400' : 'border-cream-300'}
            ${leftIcon ? 'pl-10' : ''}
            ${isPassword ? 'pr-10' : ''}
            ${className}
          `}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal-400 hover:text-charcoal-600"
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      {hint && !error && <p className="mt-1 text-xs text-charcoal-400">{hint}</p>}
    </div>
  );
}

// ---- SELECT ----
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export function Select({ label, error, options, placeholder, className = '', ...props }: SelectProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-xs font-medium text-charcoal-500 uppercase tracking-wider mb-1.5">
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <select
        {...props}
        className={`
          w-full px-4 py-3 border rounded-sm bg-white text-charcoal-700 font-sans text-sm
          focus:outline-none focus:ring-1 focus:ring-forest-400 focus:border-forest-400
          transition-colors appearance-none cursor-pointer
          ${error ? 'border-red-400' : 'border-cream-300'}
          ${className}
        `}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

// ---- TEXTAREA ----
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({ label, error, className = '', ...props }: TextareaProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-xs font-medium text-charcoal-500 uppercase tracking-wider mb-1.5">
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <textarea
        {...props}
        className={`
          w-full px-4 py-3 border rounded-sm bg-white text-charcoal-700 font-sans text-sm
          focus:outline-none focus:ring-1 focus:ring-forest-400 focus:border-forest-400
          transition-colors resize-none placeholder:text-charcoal-300
          ${error ? 'border-red-400' : 'border-cream-300'}
          ${className}
        `}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

// ---- BADGE ----
type BadgeVariant = 'active' | 'pending' | 'cancelled' | 'inactive' | 'gold' | 'blue' | 'red';

export function Badge({ variant = 'active', children }: { variant?: BadgeVariant; children: React.ReactNode }) {
  const variants: Record<BadgeVariant, string> = {
    active: 'bg-forest-100 text-forest-600',
    pending: 'bg-gold-100 text-gold-600',
    cancelled: 'bg-red-100 text-red-600',
    inactive: 'bg-charcoal-100 text-charcoal-500',
    gold: 'bg-gold-100 text-gold-600',
    blue: 'bg-blue-100 text-blue-600',
    red: 'bg-red-100 text-red-600',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]}`}>
      {children}
    </span>
  );
}

// ---- CARD ----
export function Card({
  children,
  className = '',
  padding = true,
}: {
  children: React.ReactNode;
  className?: string;
  padding?: boolean;
}) {
  return (
    <div className={`bg-white rounded-sm border border-cream-200 shadow-sm ${padding ? 'p-6' : ''} ${className}`}>
      {children}
    </div>
  );
}

// ---- STAT CARD ----
export function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  color = 'forest',
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: { value: number; label: string };
  color?: 'forest' | 'gold' | 'earth' | 'red';
}) {
  const colors = {
    forest: 'text-forest-500 bg-forest-100',
    gold: 'text-gold-500 bg-gold-100',
    earth: 'text-earth-500 bg-earth-100',
    red: 'text-red-500 bg-red-100',
  };

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium text-charcoal-400 uppercase tracking-wider">{title}</p>
        {icon && (
          <span className={`p-2 rounded-sm ${colors[color]}`}>{icon}</span>
        )}
      </div>
      <div>
        <p className="text-2xl font-serif text-charcoal-700">{value}</p>
        {subtitle && <p className="text-xs text-charcoal-400 mt-0.5">{subtitle}</p>}
      </div>
      {trend && (
        <div className={`flex items-center gap-1 text-xs font-medium ${trend.value >= 0 ? 'text-forest-500' : 'text-red-500'}`}>
          {trend.value >= 0 ? (
            <ChevronUp size={14} />
          ) : (
            <ChevronDown size={14} />
          )}
          <span>{Math.abs(trend.value)}% {trend.label}</span>
        </div>
      )}
    </Card>
  );
}

// ---- MODAL ----
export function Modal({
  open,
  onClose,
  title,
  children,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  if (!open) return null;

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white rounded-sm shadow-xl w-full ${sizes[size]} animate-slide-up max-h-[90vh] overflow-y-auto`}>
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-cream-200">
            <h3 className="font-serif text-lg text-charcoal-700">{title}</h3>
            <button onClick={onClose} className="text-charcoal-400 hover:text-charcoal-700 transition-colors">
              <X size={20} />
            </button>
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

// ---- TABLE ----
interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
}

export function Table<T extends Record<string, unknown>>({
  columns, data, loading, emptyMessage = 'Nenhum registro encontrado.', onRowClick,
}: TableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sorted = sortKey
    ? [...data].sort((a, b) => {
        const av = a[sortKey]; const bv = b[sortKey];
        if (av === bv) return 0;
        const r = String(av) < String(bv) ? -1 : 1;
        return sortDir === 'asc' ? r : -r;
      })
    : data;

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr>
            {columns.map(col => (
              <th
                key={col.key}
                className="px-4 py-3 text-left text-xs font-medium text-charcoal-400 uppercase tracking-wider bg-cream-100 border-b border-cream-200 cursor-pointer select-none"
                onClick={() => col.sortable && handleSort(col.key)}
              >
                <span className="flex items-center gap-1">
                  {col.header}
                  {col.sortable && sortKey === col.key && (
                    sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>
                {columns.map(col => (
                  <td key={col.key} className="px-4 py-3 border-b border-cream-100">
                    <div className="h-4 bg-cream-200 rounded animate-pulse" />
                  </td>
                ))}
              </tr>
            ))
          ) : sorted.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-sm text-charcoal-400">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            sorted.map((row, i) => (
              <tr
                key={i}
                className={`border-b border-cream-100 ${onRowClick ? 'hover:bg-cream-50 cursor-pointer' : ''} transition-colors`}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map(col => (
                  <td key={col.key} className="px-4 py-3 text-sm text-charcoal-600">
                    {col.render ? col.render(row) : String(row[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// ---- SEARCH BAR ----
export function SearchBar({
  value,
  onChange,
  placeholder = 'Buscar...',
  className = '',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-400" />
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-4 py-2.5 border border-cream-300 rounded-sm bg-white text-sm text-charcoal-700 placeholder:text-charcoal-300 focus:outline-none focus:ring-1 focus:ring-forest-400 focus:border-forest-400"
      />
    </div>
  );
}

// ---- PAGINATION ----
export function Pagination({
  page,
  total,
  perPage,
  onChange,
}: {
  page: number;
  total: number;
  perPage: number;
  onChange: (p: number) => void;
}) {
  const pages = Math.ceil(total / perPage);
  if (pages <= 1) return null;

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-cream-200">
      <p className="text-xs text-charcoal-400">
        Mostrando {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} de {total}
      </p>
      <div className="flex gap-1">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          className="px-3 py-1.5 text-xs border border-cream-300 rounded-sm hover:bg-cream-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Anterior
        </button>
        {Array.from({ length: Math.min(pages, 5) }).map((_, i) => {
          const p = i + 1;
          return (
            <button
              key={p}
              onClick={() => onChange(p)}
              className={`px-3 py-1.5 text-xs border rounded-sm transition-colors ${
                page === p
                  ? 'bg-forest-500 text-white border-forest-500'
                  : 'border-cream-300 hover:bg-cream-100'
              }`}
            >
              {p}
            </button>
          );
        })}
        <button
          onClick={() => onChange(page + 1)}
          disabled={page === pages}
          className="px-3 py-1.5 text-xs border border-cream-300 rounded-sm hover:bg-cream-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Próxima
        </button>
      </div>
    </div>
  );
}

// ---- EMPTY STATE ----
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {icon && <div className="text-charcoal-300 mb-4">{icon}</div>}
      <h3 className="font-serif text-lg text-charcoal-600 mb-2">{title}</h3>
      {description && <p className="text-sm text-charcoal-400 max-w-sm mb-6">{description}</p>}
      {action}
    </div>
  );
}

// ---- LOADING SPINNER ----
export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-12 w-12' };
  return (
    <svg
      className={`animate-spin ${sizes[size]} text-forest-500`}
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

// ---- TOAST ----
export function Toast({
  message,
  type = 'success',
  onClose,
}: {
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  onClose: () => void;
}) {
  const styles = {
    success: 'bg-forest-500 text-white',
    error: 'bg-red-500 text-white',
    warning: 'bg-gold-400 text-charcoal-700',
    info: 'bg-blue-500 text-white',
  };

  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-sm shadow-lg ${styles[type]} animate-slide-up`}>
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="opacity-70 hover:opacity-100">
        <X size={16} />
      </button>
    </div>
  );
}

// ---- FILTER BAR ----
export function FilterBar({ children, onExport }: { children: React.ReactNode; onExport?: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-3 p-4 bg-cream-50 border-b border-cream-200">
      <Filter size={16} className="text-charcoal-400" />
      <div className="flex flex-wrap gap-3 flex-1">{children}</div>
      {onExport && (
        <button
          onClick={onExport}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-charcoal-500 border border-cream-300 rounded-sm hover:bg-cream-100 transition-colors"
        >
          <Download size={14} />
          Exportar
        </button>
      )}
    </div>
  );
}

// ---- SECTION HEADER ----
export function SectionHeader({
  title,
  subtitle,
  action,
  back,
  onBack,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  back?: boolean;
  onBack?: () => void;
}) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div className="flex items-center gap-3">
        {back && (
          <button
            onClick={onBack}
            className="text-charcoal-400 hover:text-charcoal-700 transition-colors"
          >
            ← Voltar
          </button>
        )}
        <div>
          <h1 className="font-serif text-2xl text-charcoal-700">{title}</h1>
          {subtitle && <p className="text-sm text-charcoal-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

// ---- TABS ----
export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: string; label: string; count?: number }[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex border-b border-cream-200 overflow-x-auto">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
            active === tab.id
              ? 'text-forest-500 border-forest-500'
              : 'text-charcoal-400 border-transparent hover:text-charcoal-700'
          }`}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              active === tab.id ? 'bg-forest-100 text-forest-600' : 'bg-cream-200 text-charcoal-500'
            }`}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// ---- PROGRESS BAR ----
export function ProgressBar({ value, max = 100, color = 'forest' }: {
  value: number;
  max?: number;
  color?: 'forest' | 'gold' | 'earth' | 'red';
}) {
  const pct = Math.min((value / max) * 100, 100);
  const colors = {
    forest: 'bg-forest-500',
    gold: 'bg-gold-400',
    earth: 'bg-earth-400',
    red: 'bg-red-500',
  };
  return (
    <div className="w-full bg-cream-200 rounded-full h-2">
      <div
        className={`h-2 rounded-full transition-all duration-500 ${colors[color]}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ---- STAR RATING ----
export function StarRating({
  value,
  onChange,
  readonly = false,
  size = 'md',
}: {
  value: number;
  onChange?: (v: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
}) {
  const [hover, setHover] = useState(0);
  const sizes = { sm: 'w-4 h-4', md: 'w-5 h-5', lg: 'w-6 h-6' };

  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(star)}
          onMouseEnter={() => !readonly && setHover(star)}
          onMouseLeave={() => setHover(0)}
          className={`${sizes[size]} ${readonly ? 'cursor-default' : 'cursor-pointer'}`}
        >
          <svg viewBox="0 0 20 20" fill={star <= (hover || value) ? '#C9A84C' : '#DDD5C8'}>
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </button>
      ))}
    </div>
  );
}

// ---- ALERT ----
export function Alert({
  type = 'info',
  title,
  message,
  onClose,
}: {
  type?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  message: string;
  onClose?: () => void;
}) {
  const styles = {
    info: 'bg-blue-50 border-blue-200 text-blue-700',
    success: 'bg-forest-50 border-forest-200 text-forest-700',
    warning: 'bg-gold-50 border-gold-200 text-gold-700',
    error: 'bg-red-50 border-red-200 text-red-700',
  };

  return (
    <div className={`flex items-start gap-3 p-4 border rounded-sm ${styles[type]}`}>
      <div className="flex-1">
        {title && <p className="font-medium text-sm mb-1">{title}</p>}
        <p className="text-sm">{message}</p>
      </div>
      {onClose && (
        <button onClick={onClose} className="opacity-60 hover:opacity-100">
          <X size={16} />
        </button>
      )}
    </div>
  );
}

// ---- DIVIDER ----
export function Divider({ label }: { label?: string }) {
  if (!label) return <hr className="border-cream-200 my-6" />;
  return (
    <div className="flex items-center gap-4 my-6">
      <hr className="flex-1 border-cream-200" />
      <span className="text-xs text-charcoal-400 uppercase tracking-wider">{label}</span>
      <hr className="flex-1 border-cream-200" />
    </div>
  );
}
