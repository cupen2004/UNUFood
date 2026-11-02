// UNUFood - Authentication Module
// Handles user authentication with Supabase (Email + Google OAuth)

import { getSupabase } from './supabase.js';
import { USER_ROLES } from '../config/constants.js';

class AuthManager {
  constructor() {
    this.currentUser = null;
    this.authListeners = [];
    this.supabase = getSupabase();
  }

  // Initialize auth state and listen for changes
  async initialize() {
    if (!this.supabase) {
      console.error('Supabase not configured');
      return;
    }

    // Get current session
    const { data: { session } } = await this.supabase.auth.getSession();
    if (session) {
      await this.handleAuthStateChange(session);
    }

    // Listen for auth changes
    this.supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event);
      await this.handleAuthStateChange(session);
    });
  }

  async handleAuthStateChange(session) {
    if (session) {
      // User is signed in
      this.currentUser = {
        id: session.user.id,
        email: session.user.email,
        name: session.user.user_metadata.full_name || session.user.email,
        avatar: session.user.user_metadata.avatar_url || null,
        provider: session.user.app_metadata.provider,
      };

      // Fetch additional user data from database
      await this.loadUserProfile();
      this.notifyListeners({ isAuthenticated: true, user: this.currentUser });
    } else {
      // User is signed out
      this.currentUser = null;
      this.notifyListeners({ isAuthenticated: false, user: null });
    }
  }

  async loadUserProfile() {
    if (!this.currentUser) return;

    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('*')
        .eq('id', this.currentUser.id)
        .single();

      if (error) {
        // User doesn't exist in database yet, create profile
        if (error.code === 'PGRST116') {
          await this.createUserProfile();
        } else {
          throw error;
        }
      } else {
        // Merge database profile with auth data
        this.currentUser = { ...this.currentUser, ...data };
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  }

  async createUserProfile() {
    const profile = {
      id: this.currentUser.id,
      email: this.currentUser.email,
      name: this.currentUser.name,
      role: USER_ROLES.CUSTOMER, // Default role
      phone: null,
      faculty: 'FTI',
      created_at: new Date().toISOString(),
    };

    try {
      const { error } = await this.supabase
        .from('users')
        .insert([profile]);

      if (error) throw error;

      this.currentUser = { ...this.currentUser, ...profile };
    } catch (error) {
      console.error('Error creating user profile:', error);
    }
  }

  // Sign in with Google
  async signInWithGoogle() {
    if (!this.supabase) {
      throw new Error('Supabase not configured');
    }

    const { data, error } = await this.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/public/index-redirect.html',
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        }
      }
    });

    if (error) throw error;
    return data;
  }

  // Sign in with email/password
  async signInWithEmail(email, password) {
    if (!this.supabase) {
      throw new Error('Supabase not configured');
    }

    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  }

  // Sign up with email/password
  async signUpWithEmail(email, password, name) {
    if (!this.supabase) {
      throw new Error('Supabase not configured');
    }

    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
        }
      }
    });

    if (error) throw error;
    return data;
  }

  // Sign out
  async signOut() {
    if (!this.supabase) return;

    const { error } = await this.supabase.auth.signOut();
    if (error) throw error;
  }

  // Update user profile
  async updateProfile(updates) {
    if (!this.currentUser) return;

    const { error } = await this.supabase
      .from('users')
      .update(updates)
      .eq('id', this.currentUser.id);

    if (error) throw error;

    // Reload profile
    await this.loadUserProfile();
  }

  // Check if user is authenticated
  isAuthenticated() {
    return this.currentUser !== null;
  }

  // Get current user
  getCurrentUser() {
    return this.currentUser;
  }

  // Check if user has role
  hasRole(role) {
    return this.currentUser && this.currentUser.role === role;
  }

  // Subscribe to auth state changes
  onAuthStateChange(callback) {
    this.authListeners.push(callback);
    // Immediately call with current state
    callback({
      isAuthenticated: this.isAuthenticated(),
      user: this.currentUser
    });

    // Return unsubscribe function
    return () => {
      this.authListeners = this.authListeners.filter(cb => cb !== callback);
    };
  }

  notifyListeners(state) {
    this.authListeners.forEach(callback => callback(state));
  }
}

// Export singleton instance
export const authManager = new AuthManager();
