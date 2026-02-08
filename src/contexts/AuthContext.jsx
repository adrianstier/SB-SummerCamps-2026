import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import {
  supabase,
  signInWithGoogle,
  signOut as supabaseSignOut,
  onAuthStateChange,
  getProfile,
  getChildren,
  updateProfile
} from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [familyChildren, setFamilyChildren] = useState([]);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [authError, setAuthError] = useState(null);

  // Check if Supabase is configured
  const isConfigured = !!supabase;

  useEffect(() => {
    if (!isConfigured) {
      setLoading(false);
      return;
    }

    // Check for OAuth errors in URL
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const errorDescription = hashParams.get('error_description');
    const error = hashParams.get('error');
    if (error || errorDescription) {
      console.error('OAuth error:', error, errorDescription);
      setAuthError(errorDescription || error);
      // Clear error from URL to prevent re-triggering
      window.history.replaceState(null, '', window.location.pathname);
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Error getting session:', error);
      }
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserData(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserData(session.user.id);
      } else {
        setProfile(null);
        setFamilyChildren([]);
        setShowOnboarding(false);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [isConfigured]);

  async function loadUserData(userId) {
    try {
      const [profileData, childrenData] = await Promise.all([
        getProfile(userId),
        getChildren()
      ]);

      setProfile(profileData);
      setFamilyChildren(childrenData);

      // Check if user needs onboarding
      // Show for users who haven't completed onboarding and have no children
      const needsOnboarding = profileData &&
        !profileData.onboarding_completed &&
        childrenData.length === 0;

      if (needsOnboarding) {
        setShowOnboarding(true);
      }

      // Update last active timestamp
      updateProfile({ last_active_at: new Date().toISOString() });
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  }

  const refreshProfile = useCallback(async function refreshProfile() {
    if (user) {
      try {
        const data = await getProfile(user.id);
        setProfile(data || null);
      } catch (error) {
        console.error('Failed to refresh profile:', error);
      }
    }
  }, [user]);

  const refreshChildren = useCallback(async function refreshChildren() {
    try {
      const data = await getChildren();
      setFamilyChildren(data || []);
    } catch (error) {
      console.error('Failed to refresh children:', error);
    }
  }, []);

  const signIn = useCallback(async function signIn() {
    return signInWithGoogle();
  }, []);

  const signOut = useCallback(async function signOut() {
    await supabaseSignOut();
    setUser(null);
    setProfile(null);
    setFamilyChildren([]);
    setShowOnboarding(false);
  }, []);

  const completeOnboarding = useCallback(function completeOnboarding() {
    setShowOnboarding(false);
    refreshProfile();
    refreshChildren();
  }, [refreshProfile, refreshChildren]);

  const clearAuthError = useCallback(function clearAuthError() {
    setAuthError(null);
  }, []);

  const value = useMemo(() => ({
    user,
    profile,
    loading,
    isConfigured,
    signIn,
    signOut,
    // Auth errors
    authError,
    clearAuthError,
    // Onboarding
    showOnboarding,
    completeOnboarding,
    // Profile
    refreshProfile,
    // Family
    children: familyChildren,
    refreshChildren
  }), [
    user,
    profile,
    loading,
    isConfigured,
    signIn,
    signOut,
    authError,
    clearAuthError,
    showOnboarding,
    completeOnboarding,
    refreshProfile,
    familyChildren,
    refreshChildren
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
