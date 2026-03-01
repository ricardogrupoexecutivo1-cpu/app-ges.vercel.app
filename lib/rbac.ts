import { supabase } from "@/lib/supabase";

export type AppRole = "admin" | "finance" | "ops";

/**
 * companyName é opcional.
 * Mantemos o parâmetro para não quebrar chamadas antigas.
 */
export async function getMyRole(
  _companyName?: string
): Promise<AppRole | null> {
  if (!supabase) return null;

  // 1) Usuário logado
  const { data: userRes, error: userError } = await supabase.auth.getUser();
  if (userError || !userRes.user?.id) return null;

  const userId = userRes.user.id;

  // 2) Buscar role direto no profiles
  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (error || !data) {
    console.error("Erro ao buscar role:", error);
    return null;
  }

  return data.role as AppRole;
}