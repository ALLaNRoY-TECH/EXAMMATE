'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { Profile } from '@/types/database';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  isConfigured: boolean;
  signInWithGoogle: () => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const configured = isSupabaseConfigured();

  const fetchProfile = async (userId: string, currentUser?: User | null) => {
    if (!configured) {
      const meta = currentUser?.user_metadata;
      setProfile({
        id: userId,
        name: meta?.full_name || meta?.name || 'Allan Roy',
        email: currentUser?.email || 'allan@srmist.edu.in',
        avatar_url: meta?.avatar_url,
        created_at: new Date().toISOString(),
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (data) {
        const profileData = data as Profile;
        const meta = currentUser?.user_metadata;
        if (meta?.avatar_url && !profileData.avatar_url) {
          profileData.avatar_url = meta.avatar_url;
          await supabase
            .from('profiles')
            .update({ avatar_url: meta.avatar_url })
            .eq('id', userId);
        }
        setProfile(profileData);
      } else {
        if (error) {
          console.warn('Profile fetch warning:', error.message);
        }
        if (currentUser) {
          const meta = currentUser.user_metadata;
          setProfile({
            id: currentUser.id,
            name: meta?.full_name || meta?.name || currentUser.email?.split('@')[0] || 'Student',
            email: currentUser.email || '',
            avatar_url: meta?.avatar_url,
            created_at: new Date().toISOString(),
          });
        }
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  };

  useEffect(() => {
    if (!configured) {
      // Mock session for local preview if env vars not provided yet
      const savedMockUser = localStorage.getItem('exammate_mock_user');
      if (savedMockUser) {
        const parsed = JSON.parse(savedMockUser);
        setUser(parsed.user);
        setProfile(parsed.profile);
      }
      setIsLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        fetchProfile(currentUser.id, currentUser);
      }
      setIsLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        await fetchProfile(currentUser.id, currentUser);
      } else {
        setProfile(null);
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [configured]);

  const signInWithGoogle = async () => {
    if (!configured) {
      const mockUser = {
        id: 'mock-google-user-1',
        email: 'allan@srmist.edu.in',
        user_metadata: {
          full_name: 'Allan Roy',
          avatar_url: 'https://lh3.googleusercontent.com/a/default-user',
        },
      } as unknown as User;
      const mockProfile: Profile = {
        id: 'mock-google-user-1',
        name: 'Allan Roy',
        email: 'allan@srmist.edu.in',
        avatar_url: 'https://lh3.googleusercontent.com/a/default-user',
        created_at: new Date().toISOString(),
      };
      setUser(mockUser);
      setProfile(mockProfile);
      localStorage.setItem('exammate_mock_user', JSON.stringify({ user: mockUser, profile: mockProfile }));
      return { error: null };
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          prompt: 'consent select_account',
        },
      },
    });
    return { error };
  };

  const signOut = async () => {
    if (!configured) {
      localStorage.removeItem('exammate_mock_user');
      setUser(null);
      setProfile(null);
      return;
    }

    setIsLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setIsLoading(false);
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id, user);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isLoading,
        isConfigured: configured,
        signInWithGoogle,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
