import { supabaseOrThrow } from "@/lib/supabase";

export type AppPlan = "free" | "pro" | "premium" | string;

export async function getMyCompanyPlan(): Promise<{
  company_id: string;
  plan: AppPlan;
  plan_status: string;
  company_name?: string;
} | null> {
  const sb = supabaseOrThrow();

  // pega usuário
  const { data: uRes, error: uErr } = await sb.auth.getUser();
  if (uErr) return null;
  const uid = uRes.user?.id;
  if (!uid) return null;

  // pega company_id do profile
  const { data: pData, error: pErr } = await sb
    .from("profiles")
    .select("company_id")
    .eq("id", uid)
    .single();

  if (pErr) return null;
  const company_id = pData?.company_id;
  if (!company_id) return null;

  // pega plano da empresa (RLS protege)
  const { data: cData, error: cErr } = await sb
    .from("companies")
    .select("id,name,plan,plan_status")
    .eq("id", company_id)
    .single();

  if (cErr) return null;

  return {
    company_id: cData.id,
    company_name: cData.name,
    plan: cData.plan,
    plan_status: cData.plan_status,
  };
}