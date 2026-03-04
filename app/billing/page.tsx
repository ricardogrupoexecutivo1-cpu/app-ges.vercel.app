"use client";

import { useEffect, useState } from "react";
import styles from "../_components/ProtectedLayout.module.css";

type Company = {
  id: string;
  name: string;
  plan: "free" | "pro" | "premium" | string;
  plan_status: "active" | "past_due" | "canceled" | string;
};

function clearSupabaseBrowserSession() {
  try {
    // limpa storage do supabase-js (chave sb-...)
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith("sb-")) localStorage.removeItem(k);
    }
  } catch {}

  try {
    // tenta limpar cookies sb-... (nem sempre acessível, mas ajuda)
    document.cookie.split(";").forEach((c) => {
      const name = c.split("=")[0]?.trim();
      if (name && name.startsWith("sb-")) {
        document.cookie = `${name}=; Max-Age=0; path=/`;
      }
    });
  } catch {}
}

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

        // 1) Sessão (com proteção contra refresh token ausente)
        let user: any = null;

        try {
          const { data, error } = await supabase.auth.getSession();

          if (error && (error as any).code === "refresh_token_not_found") {
            clearSupabaseBrowserSession();
            try {
              await supabase.auth.signOut();
            } catch {}
            window.location.replace("/login?next=/billing");
            return;
          }

          user = data.session?.user ?? null;
        } catch (e: any) {
          if (e?.code === "refresh_token_not_found") {
            clearSupabaseBrowserSession();
            try {
              await supabase.auth.signOut();
            } catch {}
            window.location.replace("/login?next=/billing");
            return;
          }
          throw e;
        }

        if (!user) {
          window.location.replace("/login?next=/billing");
          return;
        }

        // 2) Pega seu profile (company_id)
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

        // 3) Pega a company (com RLS já protegendo)
        const { data: cData, error: cErr } = await supabase
          .from("companies")
          .select("id,name,plan,plan_status")
          .eq("id", companyId)
          .single();

        if (cErr) throw cErr;

        if (!alive) return;
        clearTimeout(watchdog);
        setCompany(cData as Company);
        setStatus("ready");
      } catch (e: any) {
        console.error("Billing load error:", e);
        if (!alive) return;
        clearTimeout(watchdog);
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
      setMsg(e?.message ? `Erro: ${e.message}` : "Erro ao iniciar checkout.");
    }
  }

  return (
    <div className={styles.page}>
      <h1>Billing</h1>

      {status === "loading" ? (
        <p>Carregando…</p>
      ) : status === "error" ? (
        <div style={{ padding: 12, border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12 }}>
          {msg || "Erro ao carregar billing."}
        </div>
      ) : (
        <>
          <div style={{ marginTop: 12, padding: 14, border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12 }}>
            <div style={{ fontWeight: 800 }}>{company?.name ?? "Empresa"}</div>
            <div style={{ marginTop: 6 }}>Plano: {String(company?.plan ?? "—").toUpperCase()}</div>
            <div style={{ marginTop: 6 }}>Status: {String(company?.plan_status ?? "—")}</div>
          </div>

          <div style={{ marginTop: 18, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button onClick={() => startCheckout("pro")} style={{ padding: 10 }}>
              Assinar PRO
            </button>
            <button onClick={() => startCheckout("premium")} style={{ padding: 10 }}>
              Assinar PREMIUM
            </button>
          </div>

          {msg ? (
            <div style={{ marginTop: 12, padding: 12, border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12 }}>
              {msg}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}