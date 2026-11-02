// UNUFood - Supabase Client Configuration
// Initialize Supabase client for authentication and database

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Supabase Configuration
// TODO: Ganti dengan kredensial Supabase Anda
export const SUPABASE_URL = "https://qdgbjjtichoirqiqqngv.supabase.co";
export const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkZ2JqanRpY2hvaXJxaXFxbmd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM0MjY0NjgsImV4cCI6MjEwOTAwMjQ2OH0.4kbKBz--cvlCcRJQx_TfQltrtgFlJEVsbcm1ESDKqpI";

// Note: Anon key is safe to expose in frontend code
// Security is handled by Row Level Security (RLS) in Supabase

// Initialize Supabase client
let supabaseClient = null;

export const initSupabase = () => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error(
      "Supabase credentials not configured. Authentication will not work.",
    );
    return null;
  }

  if (!supabaseClient) {
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
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
  USERS: "users",
  ORDERS: "orders",
  MENUS: "menus",
  PARTNERS: "partners",
};
