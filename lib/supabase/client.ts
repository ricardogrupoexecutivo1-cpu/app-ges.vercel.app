// lib/supabase/client.ts
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// compat: alguns lugares usam `supabase` direto
export const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey);

// compat: algumas telas antigas importam `createClient`
// exemplo: import { createClient } from "@/lib/supabase/client";
export function createClient() {
  return createSupabaseClient(supabaseUrl, supabaseAnonKey);
}