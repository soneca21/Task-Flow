import React, { createContext, useState, useContext, useEffect } from 'react';
import { api } from '@/api/dataClient';
import { supabase } from '@/api/supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings, setAppPublicSettings] = useState(null);

  useEffect(() => {
    checkAppState();
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setIsAuthenticated(!!currentUser);
      setIsLoadingAuth(false);
      if (!currentUser) {
        setAuthError({
          type: 'auth_required',
          message: 'Authentication required'
        });
      } else {
        setAuthError(null);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const checkAppState = async () => {
    try {
      setAuthError(null);
      await checkUserAuth();
    } catch (error) {
      setAuthError({
        type: 'unknown',
        message: error.message || 'An unexpected error occurred'
      });
      setIsLoadingAuth(false);
    }
  };

  const checkUserAuth = async () => {
    try {
      setIsLoadingAuth(true);
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      const currentUser = data?.session?.user ?? null;
      setUser(currentUser);
      setIsAuthenticated(!!currentUser);
      setIsLoadingAuth(false);
      if (!currentUser) {
        setAuthError({
          type: 'auth_required',
          message: 'Authentication required'
        });
      }
    } catch (error) {
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
      
      setAuthError({
        type: 'auth_required',
        message: 'Authentication required'
      });
    }
  };

  const logout = (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    
    if (shouldRedirect) {
      api.auth.logout(window.location.href);
    } else {
      api.auth.logout();
    }
  };

  // Promote the currently authenticated user to admin role by updating
  // the `role` field stored in `user_metadata`. This works for the logged-in
  // user; elevating other users requires a server-side service role.
  const promoteToAdmin = async () => {
    try {
      // Supabase client can update the current user's metadata
      const { data, error } = await supabase.auth.updateUser({
        data: { role: 'admin' },
      });
      if (error) throw error;
      // Refresh the user object in context
      if (data?.user) {
        setUser(data.user);
      }
      setIsAuthenticated(true);
      return data?.user;
    } catch (err) {
      console.error('Failed to promote to admin:', err);
      setAuthError({ type: 'promotion_failed', message: err.message });
      throw err;
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      logout,
      promoteToAdmin,
      checkAppState
    }}>
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

