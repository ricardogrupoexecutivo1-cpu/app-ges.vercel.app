export type Role = 'admin' | 'ops' | 'finance' | 'member' | string | null | undefined

export function isAdmin(role: Role) {
  return role === 'admin'
}

export function isOps(role: Role) {
  return role === 'ops'
}

export function isFinance(role: Role) {
  return role === 'finance'
}

export function canAccessOps(role: Role) {
  return role === 'admin' || role === 'ops'
}

export function canAccessFinance(role: Role) {
  return role === 'admin' || role === 'finance'
}// ---- compat: telas antigas usam getMyRole() ----
import { createClient } from "@/lib/supabase/client";

export type AppRole = "admin" | "finance" | "ops" | "operational" | "member" | string;

export async function getMyRole(): Promise<AppRole | null> {
  const supabase = createClient();

  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userRes?.user) return null;

  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userRes.user.id)
    .single();

  if (profileErr) return null;

  return (profile?.role as AppRole) ?? null;
}