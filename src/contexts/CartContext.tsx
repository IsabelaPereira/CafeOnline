import React, { createContext, useContext, useState } from 'react';
import type { Produto } from '../types';

interface CartItem {
  produto: Produto;
  quantidade: number;
  preferencia: 'grao' | 'moido';
  moagem?: string;
}

interface CartContextType {
  items: CartItem[];
  total: number;
  count: number;
  addItem: (produto: Produto, quantidade?: number, preferencia?: 'grao' | 'moido', moagem?: string) => void;
  removeItem: (produtoId: string) => void;
  updateQuantity: (produtoId: string, quantidade: number) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = (produto: Produto, quantidade = 1, preferencia: 'grao' | 'moido' = 'grao', moagem?: string) => {
    setItems(prev => {
      const existing = prev.find(i => i.produto.id === produto.id);
      if (existing) {
        return prev.map(i =>
          i.produto.id === produto.id ? { ...i, quantidade: i.quantidade + quantidade } : i
        );
      }
      return [...prev, { produto, quantidade, preferencia, moagem }];
    });
  };

  const removeItem = (produtoId: string) => {
    setItems(prev => prev.filter(i => i.produto.id !== produtoId));
  };

  const updateQuantity = (produtoId: string, quantidade: number) => {
    if (quantidade <= 0) {
      removeItem(produtoId);
      return;
    }
    setItems(prev => prev.map(i => i.produto.id === produtoId ? { ...i, quantidade } : i));
  };

  const clearCart = () => setItems([]);

  const total = items.reduce((acc, item) => {
    const preco = item.produto.precoPromocional ?? item.produto.preco;
    return acc + preco * item.quantidade;
  }, 0);

  const count = items.reduce((acc, item) => acc + item.quantidade, 0);

  return (
    <CartContext.Provider value={{ items, total, count, addItem, removeItem, updateQuantity, clearCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be inside CartProvider');
  return ctx;
}
