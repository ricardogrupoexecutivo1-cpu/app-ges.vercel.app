import { NextResponse } from "next/server";

// ATENÇÃO:
// 1) Você precisa ter STRIPE_SECRET_KEY na Vercel (Environment Variables)
// 2) E também STRIPE_PRICE_PRO e STRIPE_PRICE_PREMIUM (IDs de Price do Stripe)
// 3) URL de retorno: use o seu domínio da Vercel

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const plan = body?.plan;

    if (plan !== "pro" && plan !== "premium") {
      return NextResponse.json({ error: "Plano inválido." }, { status: 400 });
    }

    const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
    const PRICE_PRO = process.env.STRIPE_PRICE_PRO;
    const PRICE_PREMIUM = process.env.STRIPE_PRICE_PREMIUM;

    if (!STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: "STRIPE_SECRET_KEY não configurada." }, { status: 500 });
    }
    if (!PRICE_PRO || !PRICE_PREMIUM) {
      return NextResponse.json(
        { error: "STRIPE_PRICE_PRO / STRIPE_PRICE_PREMIUM não configurados." },
        { status: 500 }
      );
    }

    const priceId = plan === "pro" ? PRICE_PRO : PRICE_PREMIUM;

    const origin =
      req.headers.get("origin") ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "https://app-ges-vercel-app.vercel.app";

    // Stripe API via fetch (sem lib extra, mais simples)
    const params = new URLSearchParams();
    params.set("mode", "subscription");
    params.set("success_url", `${origin}/billing?success=1`);
    params.set("cancel_url", `${origin}/billing?canceled=1`);
    params.set("line_items[0][price]", priceId);
    params.set("line_items[0][quantity]", "1");

    const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const stripeJson = await stripeRes.json();

    if (!stripeRes.ok) {
      return NextResponse.json(
        { error: stripeJson?.error?.message || "Erro Stripe." },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: stripeJson.url });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Erro interno." }, { status: 500 });
  }
}