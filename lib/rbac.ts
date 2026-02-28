import { supabase, supabaseOrThrow } from "@/lib/supabase";

export type AppRole = "admin" | "finance" | "ops";

export async function getMyRole(
  companyName = "GRUPO EXECUTIVO SERVICE"
): Promise<AppRole | null> {

  if (!supabase) return null;

  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;
  if (!user?.id) return null;

  const sb = supabaseOrThrow();

  const { data, error } = await sb
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .eq("company_name", companyName)
    .single();

  if (error) return null;

  return data?.role ?? null;
}


