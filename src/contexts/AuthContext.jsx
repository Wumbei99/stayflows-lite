import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser]               = useState(null);
  const [tenantId, setTenantId]       = useState(null);
  const [role, setRole]               = useState(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading]         = useState(true);

  // We track the last resolved user ID so we can skip redundant re-resolution
  // when Supabase fires TOKEN_REFRESHED (happens on every tab focus).
  const resolvedUserIdRef = useRef(null);

  // ─── Core user resolution ──────────────────────────────────────────────────
  // IMPORTANT: This must be defined BEFORE the useEffect that calls it,
  // as useCallback does not hoist like a function declaration.
  const resolveUser = useCallback(async (authUser, showSpinner = false) => {
    if (!authUser) {
      resolvedUserIdRef.current = null;
      setUser(null);
      setTenantId(null);
      setRole(null);
      setIsSuperAdmin(false);
      setLoading(false);
      return;
    }

    if (showSpinner) setLoading(true);

    setUser(authUser);
    resolvedUserIdRef.current = authUser.id;

    try {
      // 1. Check if super admin
      const { data: adminData } = await supabase
        .from('platform_admins')
        .select('user_id')
        .eq('user_id', authUser.id)
        .maybeSingle();

      if (adminData) {
        setIsSuperAdmin(true);
        setTenantId(null);
        setRole(null);
        setLoading(false);
        return;
      }

      // 2. Check tenant membership
      const { data: tenantUser } = await supabase
        .from('tenant_users')
        .select('tenant_id, role')
        .eq('user_id', authUser.id)
        .maybeSingle();

      if (tenantUser) {
        setTenantId(tenantUser.tenant_id);
        setRole(tenantUser.role);
      } else {
        setTenantId(null);
        setRole(null);
      }

      setIsSuperAdmin(false);
    } finally {
      setLoading(false);
    }
  }, []);

  // ─── Auth state listener ───────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    // Get the current session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) {
        resolveUser(session?.user ?? null, true);
      }
    });

    // Subscribe to future auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      const incomingUserId = session?.user?.id ?? null;

      // TOKEN_REFRESHED fires every time the tab regains focus.
      // If it's the same user, there is nothing to resolve — skip it.
      // This is what prevents the blank-screen flicker on tab switch.
      if (event === 'TOKEN_REFRESHED' && incomingUserId === resolvedUserIdRef.current) {
        return;
      }

      // For all other events (SIGNED_IN, SIGNED_OUT, USER_UPDATED),
      // do a full resolution. Show spinner only on actual sign-in.
      const needsSpinner = event === 'SIGNED_IN' || event === 'INITIAL_SESSION';
      resolveUser(session?.user ?? null, needsSpinner);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [resolveUser]);

  // ─── Inactivity logout (10 minutes) ───────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    const LIMIT = 10 * 60 * 1000;
    let timer;

    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        console.log('[Auth] Inactivity timeout — signing out');
        supabase.auth.signOut();
      }, LIMIT);
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach(e => window.addEventListener(e, reset));
    reset();

    return () => {
      clearTimeout(timer);
      events.forEach(e => window.removeEventListener(e, reset));
    };
  }, [user]);

  // ─── Public API ────────────────────────────────────────────────────────────
  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, tenantId, role, isSuperAdmin, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
