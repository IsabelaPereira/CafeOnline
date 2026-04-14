import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isClient: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  updateProfile: (name: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile(session: Session | null) {
    if (!session) { setUser(null); setSession(null); setLoading(false); return; }
    setSession(session);
    const { data } = await supabase
      .from('profiles')
      .select('id, name, role, created_at')
      .eq('id', session.user.id)
      .single();
    if (data) {
      setUser({
        id: data.id,
        name: data.name,
        email: session.user.email ?? '',
        role: data.role as User['role'],
        createdAt: data.created_at,
      });
    }
    setLoading(false);
  }

  useEffect(() => {
    // Sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      loadProfile(session);
    });

    // Listener de mudanças de sessão
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      loadProfile(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return !error;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  const updateProfile = async (name: string) => {
    if (!user) return;
    const { error } = await supabase.from('profiles').update({ name }).eq('id', user.id);
    if (error) throw error;
    setUser(prev => prev ? { ...prev, name } : null);
  };

  const isAuthenticated = !!user;
  const isAdmin  = !!user && user.role !== 'cliente';
  const isClient = user?.role === 'cliente';

  return (
    <AuthContext.Provider value={{ user, session, isAuthenticated, isAdmin, isClient, loading, login, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
