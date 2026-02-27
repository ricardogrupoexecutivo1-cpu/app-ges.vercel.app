// lib/supabase.ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * IMPORTANTÍSSIMO:
 * - Não cria client se faltar env (evita quebrar build/SSR na Vercel)
 */
export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

/**
 * Use isso quando você quer obrigar o Supabase e ter erro claro.
 */
export function supabaseOrThrow(): SupabaseClient {
  if (!supabase) {
    throw new Error(
      "Supabase env missing. Configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel."
    );
  }
  return supabase;
}