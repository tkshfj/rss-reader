// supabase.ts
// Supabase client initialization
// https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native
import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";

// Credentials loaded from .env file via Expo's EXPO_PUBLIC_ prefix
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// Initialize Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: {
      getItem: (key: string) => SecureStore.getItemAsync(key),
      setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
      removeItem: (key: string) => SecureStore.deleteItemAsync(key),
    },
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Not needed for mobile apps
  },
});
