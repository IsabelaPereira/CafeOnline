import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { getEffectivePermissions } from '../services/permissions.service';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isClient: boolean;
  isMaster: boolean;
  permissions: string[];
  hasPermission: (key: string) => boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; inactive?: boolean }>;
  logout: () => Promise<void>;
  updateProfile: (name: string) => Promise<void>;
  reloadPermissions: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadProfile(session: Session | null) {
    if (!session) { setUser(null); setSession(null); setPermissions([]); setLoading(false); return; }
    setSession(session);
    // Try with new columns first, fall back to old schema
    let data: any = null;
    const full = await supabase
      .from('profiles')
      .select('id, name, role, is_master, active, created_at')
      .eq('id', session.user.id)
      .single();
    if (full.error) {
      const fallback = await supabase
        .from('profiles')
        .select('id, name, role, created_at')
        .eq('id', session.user.id)
        .single();
      data = fallback.data;
    } else {
      data = full.data;
    }

    if (data) {
      const isMaster = data.is_master ?? false;
      const active = data.active ?? true;

      if (active === false && data.role !== 'cliente') {
        await supabase.auth.signOut();
        setUser(null); setSession(null); setPermissions([]); setLoading(false);
        return;
      }
      const u: User = {
        id: data.id,
        name: data.name,
        email: session.user.email ?? '',
        role: data.role as User['role'],
        isMaster,
        active,
        createdAt: data.created_at,
      };
      setUser(u);

      if (u.role !== 'cliente') {
        try {
          const perms = await getEffectivePermissions(u.role, u.id, u.isMaster);
          setPermissions(perms);
        } catch {
          // If permission tables don't exist yet, grant all for admin roles
          if (u.role === 'admin' || u.isMaster) {
            const { ALL_PERMISSION_KEYS } = await import('../lib/permissions');
            setPermissions([...ALL_PERMISSION_KEYS]);
          } else {
            setPermissions(['dashboard']);
          }
        }
      }
    }
    setLoading(false);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      loadProfile(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      loadProfile(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<{ ok: boolean; inactive?: boolean }> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { ok: false };

    try {
      const { data: { session: newSession } } = await supabase.auth.getSession();
      if (newSession) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('active, role')
          .eq('id', newSession.user.id)
          .single();
        if (profile && profile.active === false && profile.role !== 'cliente') {
          await supabase.auth.signOut();
          return { ok: false, inactive: true };
        }
      }
    } catch {
      // active column may not exist yet — allow login
    }

    return { ok: true };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setPermissions([]);
  };

  const updateProfile = async (name: string) => {
    if (!user) return;
    const { error } = await supabase.from('profiles').update({ name }).eq('id', user.id);
    if (error) throw error;
    setUser(prev => prev ? { ...prev, name } : null);
  };

  const reloadPermissions = useCallback(async () => {
    if (!user || user.role === 'cliente') return;
    try {
      const perms = await getEffectivePermissions(user.role, user.id, user.isMaster);
      setPermissions(perms);
    } catch { /* keep current */ }
  }, [user]);

  const isAuthenticated = !!user;
  const isAdmin  = !!user && user.role !== 'cliente';
  const isClient = user?.role === 'cliente';
  const isMaster = user?.isMaster ?? false;

  const hasPermission = useCallback(
    (key: string) => isMaster || permissions.includes(key),
    [isMaster, permissions],
  );

  return (
    <AuthContext.Provider value={{
      user, session, isAuthenticated, isAdmin, isClient, isMaster,
      permissions, hasPermission, loading,
      login, logout, updateProfile, reloadPermissions,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
