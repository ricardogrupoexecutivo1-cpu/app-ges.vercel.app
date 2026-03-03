"use client";

import { useEffect, useState } from "react";
import styles from "../_components/ProtectedLayout.module.css";

type Company = {
  id: string;
  name: string;
  plan: "free" | "pro" | "premium" | string;
  plan_status: "active" | "past_due" | "canceled" | string;
};

export default function BillingPage() {
  const [company, setCompany] = useState<Company | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    let alive = true;

    (async () => {
      setStatus("loading");
      setMsg("");

      const watchdog = setTimeout(() => {
        if (!alive) return;
        setStatus("error");
        setMsg("Conexão instável: não consegui carregar o billing. Recarregue (Ctrl+R).");
      }, 12000);

      try {
        const supaMod = await import("@/lib/supabase");
        const supabase = supaMod.supabase;

        const { data } = await supabase.auth.getSession();
        const user = data.session?.user;
        if (!user) {
          window.location.replace("/login");
          return;
        }

        // Pega seu profile (company_id)
        const { data: pData, error: pErr } = await supabase
          .from("profiles")
          .select("company_id")
          .eq("id", user.id)
          .single();

        if (pErr) throw pErr;

        const companyId = pData?.company_id;
        if (!companyId) {
          throw new Error("Seu usuário não possui company_id no profile.");
        }

        // Pega a company (com RLS já protegendo)
        const { data: cData, error: cErr } = await supabase
          .from("companies")
          .select("id,name,plan,plan_status")
          .eq("id", companyId)
          .single();

        if (cErr) throw cErr;

        if (!alive) return;
        setCompany(cData as Company);
        setStatus("ready");
      } catch (e: any) {
        console.error("Billing load error:", e);
        if (!alive) return;
        setStatus("error");
        setMsg(e?.message ? `Erro: ${e.message}` : "Erro ao carregar billing.");
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  async function startCheckout(plan: "pro" | "premium") {
    setMsg("");

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json?.error || "Falha ao iniciar checkout.");
      }

      if (!json?.url) {
        throw new Error("Checkout sem URL de redirecionamento.");
      }

      window.location.href = json.url;
    } catch (e: any) {
      setMsg(e?.message ? `❌ ${e.message}` : "❌ Erro ao abrir checkout.");
    }
  }

  return (
    <div className={styles.cardGrid}>
      <div className={styles.card} style={{ gridColumn: "span 12" }}>
        <div className={styles.cardTitle}>Assinatura</div>

        {status !== "ready" ? (
          <>
            <div className={styles.cardValue} style={{ fontSize: 16 }}>
              {status === "loading" ? "Carregando…" : "Erro"}
            </div>
            <div className={styles.cardHint}>{msg || "Aguarde alguns segundos."}</div>
          </>
        ) : (
          <>
            <div className={styles.cardValue} style={{ fontSize: 16 }}>
              Empresa: <b>{company?.name}</b>
            </div>
            <div className={styles.cardHint} style={{ marginTop: 6 }}>
              Plano atual: <b>{company?.plan}</b> • Status: <b>{company?.plan_status}</b>
            </div>

            <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button className={styles.btn} onClick={() => startCheckout("pro")}>
                Assinar PRO
              </button>
              <button className={styles.btn} onClick={() => startCheckout("premium")}>
                Assinar PREMIUM
              </button>
            </div>

            {msg ? <div style={{ marginTop: 10, fontSize: 12 }}>{msg}</div> : null}

            <div className={styles.cardHint} style={{ marginTop: 14 }}>
              *No Sprint seguinte: após o pagamento, o plano será ativado automaticamente via webhook.
            </div>
          </>
        )}
      </div>
    </div>
  );
}