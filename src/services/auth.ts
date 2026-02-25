// auth.ts
import { supabase } from "./supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Storage key for user ID
const STORAGE_KEY = "user_id";

// Check if user exists in the users table
export async function checkUserExists(email: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("users")
    .select("id")
    .eq("email", email)
    .single();

  if (error && error.code !== "PGRST116") { // Ignore "No rows found" error
    console.error("Error checking user:", error);
    return false;
  }
  
  return !!data;
}

// Sign Up
export async function signUp(email: string, password: string) {
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password });

  if (signUpError) throw signUpError;

  const user = signUpData?.user;
  if (!user) throw new Error("User not created during sign-up");

  await syncUserIdWithUsersTable(user.id, email);
  await saveUserId(user.id);

  return user;
}

// Sign In
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  
  if (error) throw error;

  const user = data?.user;
  if (!user) throw new Error("User not found during sign-in");

  await syncUserIdWithUsersTable(user.id, email);
  await saveUserId(user.id);

  return user;
}

// Sign Out
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (storageError) {
    console.error("Error removing user ID:", storageError);
  }
}

// Sync user ID in `users` table with `auth.users.id`
async function syncUserIdWithUsersTable(authUserId: string, email: string) {
  try {
    const { data: existingUser, error } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Error checking users table:", error);
      return;
    }

    if (existingUser && existingUser.id !== authUserId) {
      // Mismatch between auth.users.id and public.users.id.
      // Cannot safely update the PK because foreign keys (feeds, articles)
      // reference users(id) with ON DELETE CASCADE but no ON UPDATE CASCADE.
      // Delete the stale row and re-insert so cascading deletes clean up orphans.
      console.warn(`Replacing stale user record: ${existingUser.id} -> ${authUserId}`);

      const { error: deleteError } = await supabase
        .from("users")
        .delete()
        .eq("id", existingUser.id);

      if (deleteError) throw deleteError;

      await insertUserIfNotExists(authUserId, email);
    } else if (!existingUser) {
      await insertUserIfNotExists(authUserId, email);
    }
  } catch (error) {
    console.error("Error syncing user ID:", error);
  }
}

// Insert user only if they are not already in the users table
export async function insertUserIfNotExists(userId: string, email: string) {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("id")
      .eq("id", userId)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Error checking user existence:", error);
      return;
    }

    if (!data) {
      const { error: insertError } = await supabase.from("users").insert([
        {
          id: userId,
          email: email,
          dark_mode: false,
          auto_theme: true,
          font_size: 16,
          line_spacing: 1.5,
          notifications: false,
        },
      ]);

      if (insertError && insertError.code === "23505") {
        console.warn("User already exists in users table, skipping insert.");
      } else if (insertError) {
        throw insertError;
      }
    }
  } catch (error) {
    console.error("Error inserting user:", error);
  }
}

// Get Auth State
export function onAuthStateChange(callback: (user: any) => void) {
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null);
  });
}

// Get Current User from Supabase Auth
export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    console.error("Error fetching user:", error);
    return null;
  }
  return data.user ?? null;
}

// Save user ID locally
export async function saveUserId(userId: string) {
  if (!userId) return;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, userId);
  } catch (error) {
    console.error("Error saving user ID:", error);
  }
}

// Retrieve user ID from local storage, ensure it matches Supabase Auth
export async function getUserId(): Promise<string | null> {
  try {
    const storedUserId = await AsyncStorage.getItem(STORAGE_KEY);
    const supabaseUser = await getCurrentUser();

    if (!supabaseUser?.id) {
      console.warn("No authenticated user found in Supabase.");
      return null;
    }

    if (storedUserId !== supabaseUser.id) {
      console.warn(`Updating AsyncStorage userId (${storedUserId}) to match Supabase (${supabaseUser.id})`);
      await saveUserId(supabaseUser.id);
      return supabaseUser.id;
    }

    return storedUserId;
  } catch (error) {
    console.error("Error retrieving user ID:", error);
    return null;
  }
}

