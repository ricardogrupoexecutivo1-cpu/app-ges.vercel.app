// lib/supabase.ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let _supabase: SupabaseClient | null = null;

if (supabaseUrl && supabaseAnonKey) {
  _supabase = createClient(supabaseUrl, supabaseAnonKey);
}

/**
 * Use em páginas/client-components.
 * Se faltar env, isso vira null e você pode mostrar mensagem "Supabase não configurado".
 */
export const supabase = _supabase;

/**
 * Use quando você quer OBRIGAR o Supabase (e ter erro claro).
 */
export function supabaseOrThrow(): SupabaseClient {
  if (!_supabase) {
    throw new Error(
      "Supabase env missing. Configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }
  return _supabase;
}