import { supabase } from "@/lib/supabase";

export type AppRole = "admin" | "finance" | "ops";

export async function getMyRole(companyName = "GRUPO EXECUTIVO SERVICE"): Promise<AppRole | null> {
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;
  if (!user?.id) return null;

  const { data, error } = await supabase.rpc("get_my_role", { p_company_name: companyName });

  if (error) return null;
  return (data ?? null) as AppRole | null;
}