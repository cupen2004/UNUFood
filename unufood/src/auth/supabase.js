// UNUFood - Supabase Client Configuration
// Initialize Supabase client for authentication and database

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Load environment variables
// In production, use proper env var management
const getEnvVar = (key) => {
  // Try to get from window.ENV (set in HTML) or fallback
  if (window.ENV && window.ENV[key]) {
    return window.ENV[key];
  }

  // Fallback for development - you should set these in your HTML or use a build tool
  console.warn(`Environment variable ${key} not found. Please configure Supabase credentials.`);
  return null;
};

export const SUPABASE_URL = getEnvVar('SUPABASE_URL');
export const SUPABASE_ANON_KEY = getEnvVar('SUPABASE_ANON_KEY');

// Initialize Supabase client
let supabaseClient = null;

export const initSupabase = () => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Supabase credentials not configured. Authentication will not work.');
    return null;
  }

  if (!supabaseClient) {
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      }
    });
  }

  return supabaseClient;
};

export const getSupabase = () => {
  if (!supabaseClient) {
    return initSupabase();
  }
  return supabaseClient;
};

// Database table names
export const TABLES = {
  USERS: 'users',
  ORDERS: 'orders',
  MENUS: 'menus',
  PARTNERS: 'partners',
};
