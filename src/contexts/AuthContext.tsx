import { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type UserRole = 'retailer' | 'customer' | 'ngo';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: UserRole | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string, role: UserRole) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  // Store pending role to assign after session is established
  const pendingRole = useRef<{ userId: string; role: UserRole } | null>(null);

  const fetchRole = async (userId: string) => {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();
    if (data) {
      setRole(data.role as UserRole);
      return true;
    }
    return false;
  };

  const assignPendingRole = async (userId: string) => {
    if (pendingRole.current && pendingRole.current.userId === userId) {
      const roleToAssign = pendingRole.current.role;
      pendingRole.current = null;
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: roleToAssign });
      if (!error) {
        setRole(roleToAssign);
        return;
      }
    }
    // If no pending role, try to fetch existing
    await fetchRole(userId);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        // Use setTimeout to avoid potential deadlocks with Supabase auth
        setTimeout(() => assignPendingRole(session.user.id), 0);
      } else {
        setRole(null);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchRole(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string, userRole: UserRole) => {
    // Store the role to be assigned after auth state change gives us a session
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) throw error;

    if (data.user) {
      // Store pending role - will be assigned when session is established
      pendingRole.current = { userId: data.user.id, role: userRole };

      // If session is immediately available (auto-confirm enabled), assign now
      if (data.session) {
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({ user_id: data.user.id, role: userRole });
        if (roleError) {
          console.error('Role assignment error:', roleError);
          // Don't throw - user is created, role can be assigned on next login
        } else {
          pendingRole.current = null;
          setRole(userRole);
        }
      }
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, role, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
