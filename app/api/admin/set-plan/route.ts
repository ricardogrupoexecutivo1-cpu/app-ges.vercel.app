import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  if (!serviceRole) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");

  return createClient(url, serviceRole, { auth: { persistSession: false } });
}

export async function POST(req: Request) {
  try {
    const adminSecret = process.env.ADMIN_ACTION_SECRET;
    if (!adminSecret) {
      return NextResponse.json(
        { error: "Missing ADMIN_ACTION_SECRET" },
        { status: 500 }
      );
    }

    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (token !== adminSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const companyId = body?.companyId as string | undefined;
    const plan = body?.plan as string | undefined;

    if (!companyId || !plan) {
      return NextResponse.json(
        { error: "Missing companyId or plan" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    const { error } = await supabase
      .from("companies")
      .update({ plan })
      .eq("id", companyId);

    if (error) throw error;

    return NextResponse.json({ ok: true, companyId, plan });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? "Internal error" },
      { status: 500 }
    );
  }
}