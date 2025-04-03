import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { getCurrentUser, signIn, signOut, signUp, SignUpData, SignInData } from '../lib/auth';

type AuthContextType = {
  user: User | null;
  loading: boolean;
  error: Error | null;
  isAdmin: boolean;
  organizationId: string | null;
  signUp: (data: SignUpData) => Promise<void>;
  signIn: (data: SignInData) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [organizationId, setOrganizationId] = useState<string | null>(null);

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    try {
      const user = await getCurrentUser();
      setUser(user);
      setIsAdmin(user?.user_metadata?.role === 'admin' || false);
      setOrganizationId(user?.user_metadata?.organization_id || null);
    } catch (error) {
      console.error('Error checking user:', error);
      setError(error as Error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSignUp(data: SignUpData) {
    try {
      setLoading(true);
      await signUp(data);
      await checkUser();
    } catch (error) {
      setError(error as Error);
      throw error;
    } finally {
      setLoading(false);
    }
  }

  async function handleSignIn(data: SignInData) {
    try {
      setLoading(true);
      await signIn(data);
      await checkUser();
    } catch (error) {
      setError(error as Error);
      throw error;
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOut() {
    try {
      setLoading(true);
      await signOut();
      setUser(null);
      setIsAdmin(false);
      setOrganizationId(null);
    } catch (error) {
      setError(error as Error);
      throw error;
    } finally {
      setLoading(false);
    }
  }

  const value = {
    user,
    loading,
    error,
    isAdmin,
    organizationId,
    signUp: handleSignUp,
    signIn: handleSignIn,
    signOut: handleSignOut
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}