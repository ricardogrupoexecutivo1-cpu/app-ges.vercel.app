import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Missing STRIPE_SECRET_KEY");
  return new Stripe(key);
}

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  if (!serviceRole) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");

  return createClient(url, serviceRole, {
    auth: { persistSession: false },
  });
}

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json(
      { error: "Missing STRIPE_WEBHOOK_SECRET" },
      { status: 500 }
    );
  }

  const body = await req.text();

  let event: Stripe.Event;
  try {
    const stripe = getStripe(); // ✅ só cria aqui (runtime)
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: any) {
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdmin();

  try {
    // ✅ Checkout concluído → ativa PRO
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      const companyId = session.metadata?.company_id;
      if (!companyId) return NextResponse.json({ ok: true });

      const customerId =
        typeof session.customer === "string"
          ? session.customer
          : session.customer?.id;

      const subscriptionId =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id;

      const { error } = await supabase
        .from("companies")
        .update({
          plan: "PRO",
          stripe_customer_id: customerId ?? null,
          stripe_subscription_id: subscriptionId ?? null,
        })
        .eq("id", companyId);

      if (error) throw error;
    }

    // ✅ Falha de pagamento → volta FREE (tipagem varia, então any)
    if (event.type === "invoice.payment_failed") {
      const invoiceAny = event.data.object as any;

      const subscriptionId =
        typeof invoiceAny.subscription === "string"
          ? invoiceAny.subscription
          : invoiceAny.subscription?.id;

      if (subscriptionId) {
        const { error } = await supabase
          .from("companies")
          .update({ plan: "FREE" })
          .eq("stripe_subscription_id", subscriptionId);

        if (error) throw error;
      }
    }

    // ✅ Cancelamento → FREE
    if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object as Stripe.Subscription;

      const { error } = await supabase
        .from("companies")
        .update({ plan: "FREE" })
        .eq("stripe_subscription_id", sub.id);

      if (error) throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? "Webhook handler error" },
      { status: 500 }
    );
  }
}