import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { StaffProfile, UserRole } from '@/types/database';
import { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: StaffProfile | null;
  role: UserRole | null;
  isDoctor: boolean;
  isHelper: boolean;
  isStaff: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // 1. Check current active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchStaffProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // 2. Listen to session mutations
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchStaffProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchStaffProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('staff_profiles')
        .select('*')
        .eq('id', userId)
        .eq('is_active', true)
        .maybeSingle();

      if (!error && data) {
        setProfile(data as StaffProfile);
      } else {
        setProfile(null);
      }
    } catch (err) {
      console.error('Error fetching staff profile:', err);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error ? new Error(error.message) : null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  const role = profile?.role ?? null;
  const isDoctor = role === 'doctor';
  const isHelper = role === 'helper';
  const isStaff = isDoctor || isHelper;

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        role,
        isDoctor,
        isHelper,
        isStaff,
        loading,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

