import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, getCurrentUser, UserProfile } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  login: (userData: any, token: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const createDefaultProfile = useCallback(async (userId: string, userData: User): Promise<UserProfile | null> => {
    const fallbackName =
      (userData.user_metadata?.full_name as string | undefined) ||
      (userData.user_metadata?.name as string | undefined) ||
      userData.email?.split('@')[0];

    const fallbackAvatar =
      (userData.user_metadata?.avatar_url as string | undefined) ||
      (userData.user_metadata?.picture as string | undefined);

    const profilePayload: {
      user_id: string;
      full_name?: string;
      avatar_url?: string;
    } = {
      user_id: userId
    };

    if (fallbackName) {
      profilePayload.full_name = fallbackName;
    }

    if (fallbackAvatar) {
      profilePayload.avatar_url = fallbackAvatar;
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .upsert(profilePayload, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) {
      console.error('Error creating default user profile:', error);
      return null;
    }

    if (!data) {
      return null;
    }

    return data as UserProfile;
  }, []);

  const loadUserProfile = useCallback(async (userId: string, userData?: User): Promise<UserProfile | null> => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading user profile:', error);
        setProfile(null);
        return null;
      }

      if (data) {
        setProfile(data);
        return data;
      }

      if (!userData) {
        console.warn('User profile not found and user data unavailable for creation');
        setProfile(null);
        return null;
      }

      const createdProfile = await createDefaultProfile(userId, userData);

      if (createdProfile) {
        setProfile(createdProfile);
        return createdProfile;
      }

      setProfile(null);
      return null;
    } catch (error) {
      console.error('Error loading user profile:', error);
      setProfile(null);
      return null;
    }
  }, [createDefaultProfile]);

  // Load user on mount (one-time check)
  useEffect(() => {
    async function loadUser() {
      setLoading(true);
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
        if (currentUser) {
          await loadUserProfile(currentUser.id, currentUser);
        }
      } catch (error) {
        console.error('Error loading user:', error);
      } finally {
        setLoading(false);
      }
    }
    loadUser();

    // Set up auth listener - KEEP SIMPLE, avoid any async operations in callback
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        // NEVER use any async operations in callback
        setUser(session?.user || null);
        if (session?.user) {
          // Load profile in next tick to avoid blocking the auth callback
          setTimeout(() => {
            void loadUserProfile(session.user!.id, session.user!);
          }, 0);
        } else {
          setProfile(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [loadUserProfile]);

  async function signInWithGoogle() {
    try {
      setLoading(true);
      
      // Get current frontend URL for OAuth callback
      const currentUrl = window.location.origin;
      
      // Get Google OAuth URL from our Edge Function
      const { data, error } = await supabase.functions.invoke('google-oauth', {
        body: { 
          action: 'url',
          frontend_url: currentUrl
        }
      });
      
      if (error) {
        throw new Error('Failed to get OAuth URL');
      }
      
      if (data?.data?.oauth_url) {
        // Redirect to Google OAuth
        window.location.href = data.data.oauth_url;
      } else {
        throw new Error('No OAuth URL received');
      }
    } catch (error: any) {
      console.error('Error signing in with Google:', error);
      toast.error(error.message || '登入失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  }

  async function signInWithEmail(email: string, password: string) {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        throw error;
      }
      
      if (data.user) {
        setUser(data.user);
        await loadUserProfile(data.user.id, data.user);
        toast.success('登入成功！');
      }
    } catch (error: any) {
      console.error('Error signing in with email:', error);
      toast.error(error.message || '登入失敗，請檢查您的電子郵件和密碼');
      throw error;
    } finally {
      setLoading(false);
    }
  }

  async function signUpWithEmail(email: string, password: string) {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });
      
      if (error) {
        throw error;
      }
      
      if (data.user) {
        if (data.session) {
          await loadUserProfile(data.user.id, data.user);
        }

        toast.success('註冊成功！請檢查您的電子郵件以驗證帳戶。');
      }
    } catch (error: any) {
      console.error('Error signing up with email:', error);
      toast.error(error.message || '註冊失敗，請稍後再試');
      throw error;
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword(email: string) {
    try {
      setLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`
      });
      
      if (error) {
        throw error;
      }
      
      toast.success('重置密碼連結已發送到您的電子郵件');
    } catch (error: any) {
      console.error('Error resetting password:', error);
      toast.error(error.message || '發送重置密碼連結失敗');
      throw error;
    } finally {
      setLoading(false);
    }
  }
  async function signOut() {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
      setUser(null);
      setProfile(null);
      toast.success('成功登出');
    } catch (error: any) {
      console.error('Error signing out:', error);
      toast.error('登出失敗：' + error.message);
    } finally {
      setLoading(false);
    }
  }

  async function refreshProfile() {
    if (user) {
      await loadUserProfile(user.id, user);
    }
  }

  async function login(userData: any, token: string) {
    try {
      // Create a user object that matches Supabase's User type
      const user: User = {
        id: userData.id,
        email: userData.email,
        user_metadata: {
          name: userData.name,
          picture: userData.picture
        },
        app_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        phone: null,
        email_confirmed_at: new Date().toISOString(),
        last_sign_in_at: new Date().toISOString(),
        role: 'authenticated'
      };
      
      setUser(user);
      await loadUserProfile(userData.id, user);
      
    } catch (error) {
      console.error('Error in login function:', error);
      throw error;
    }
  }

  const value = {
    user,
    profile,
    loading,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    resetPassword,
    signOut,
    refreshProfile,
    login
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}