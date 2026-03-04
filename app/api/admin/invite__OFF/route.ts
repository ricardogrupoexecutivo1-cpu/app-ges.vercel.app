import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 10;

export async function POST(_req: Request) {
  return NextResponse.json(
    {
      ok: false,
      message:
        "Endpoint /api/admin/invite desativado temporariamente para destravar o build.",
    },
    { status: 501 }
  );
}