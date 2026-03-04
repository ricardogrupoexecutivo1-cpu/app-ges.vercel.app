"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getMyRole, AppRole } from "@/lib/rbac";

// SaaS (enquanto Stripe não está ligado)
const PLAN: "free" | "pro" | "premium" = "free";
const FREE_CLIENTS_LIMIT = 3;

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

export default function OpsHomePage() {
  const companyName = "GRUPO EXECUTIVO SERVICE";
  const [email, setEmail] = useState<string>("");
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  // SaaS usage
  const [activeClients, setActiveClients] = useState<number | null>(null);
  const [msg, setMsg] = useState<string>("");

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setMsg("");

        // Sessão (com proteção contra refresh token ausente)
        let user: any = null;

        try {
          const { data, error } = await supabase.auth.getSession();

          if (error && (error as any).code === "refresh_token_not_found") {
            clearSupabaseBrowserSession();
            try {
              await supabase.auth.signOut();
            } catch {}
            window.location.replace("/login?next=/ops");
            return;
          }

          user = data.session?.user ?? null;
        } catch (e: any) {
          if (e?.code === "refresh_token_not_found") {
            clearSupabaseBrowserSession();
            try {
              await supabase.auth.signOut();
            } catch {}
            window.location.replace("/login?next=/ops");
            return;
          }
          throw e;
        }

        if (!user) {
          window.location.replace("/login?next=/ops");
          return;
        }

        if (!alive) return;
        setEmail(user.email ?? "");

        const r = await getMyRole();
        if (!alive) return;
        setRole(r);

        // Contar clientes ativos (RLS deve filtrar por company_id)
        try {
          const { count, error: cErr } = await supabase
            .from("clients")
            .select("id", { count: "exact", head: true })
            .eq("active", true);

          if (!alive) return;

          if (cErr) {
            setActiveClients(null);
          } else {
            setActiveClients(typeof count === "number" ? count : 0);
          }
        } catch {
          if (!alive) return;
          setActiveClients(null);
        }
      } catch (e: any) {
        if (!alive) return;
        setMsg(e?.message ? `❌ ${e.message}` : "❌ Erro ao carregar operação.");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  if (!supabase) {
    return (
      <div style={{ padding: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Operação</h1>
        <p style={{ color: "crimson", fontWeight: 600, marginTop: 10 }}>
          Supabase não configurado.
        </p>
        <p style={{ marginTop: 6 }}>
          Configure <b>NEXT_PUBLIC_SUPABASE_URL</b> e <b>NEXT_PUBLIC_SUPABASE_ANON_KEY</b> na Vercel e faça Redeploy.
        </p>
      </div>
    );
  }

  const allowed = role === "admin" || role === "ops";

  const clientsLimitReached =
    PLAN === "free" && typeof activeClients === "number" && activeClients >= FREE_CLIENTS_LIMIT;

  const clientsPct = useMemo(() => {
    if (PLAN !== "free") return 0;
    if (typeof activeClients !== "number") return 0;
    return Math.min(100, (activeClients / FREE_CLIENTS_LIMIT) * 100);
  }, [activeClients]);

  function goClients() {
    window.location.href = "/ops/clients";
  }

  return (
    <div style={{ padding: 20 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>Operação</h1>

      <p style={{ marginTop: 8 }}>
        Usuário: <b>{email || "carregando..."}</b> • Papel: <b>{role || "carregando..."}</b>
      </p>

      <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Link
          href="/app"
          style={{
            textDecoration: "none",
            padding: 10,
            border: "1px solid #000",
            borderRadius: 10,
          }}
        >
          Voltar
        </Link>

        <Link
          href="/upgrade"
          style={{
            textDecoration: "none",
            padding: 10,
            border: "1px solid #000",
            borderRadius: 10,
            fontWeight: 800,
          }}
        >
          Upgrade →
        </Link>
      </div>

      {!allowed ? (
        <div style={{ marginTop: 18, padding: 12, border: "1px solid #f00", borderRadius: 10 }}>
          <b>ACESSO NEGADO.</b>
          <p style={{ marginTop: 8 }}>Somente admin/ops pode acessar a operação.</p>
        </div>
      ) : loading ? (
        <p style={{ marginTop: 16 }}>Carregando…</p>
      ) : (
        <>
          {/* Plano & Limites */}
          <div style={{ marginTop: 18, padding: 12, border: "1px solid #ccc", borderRadius: 10 }}>
            <div style={{ fontWeight: 900 }}>Plano & Limites</div>
            <p style={{ marginTop: 8, opacity: 0.9 }}>
              Plano atual: <b>{PLAN.toUpperCase()}</b>
              <br />
              Clientes ativos:{" "}
              <b>
                {typeof activeClients === "number" ? activeClients : "…"}
                {PLAN === "free" ? `/${FREE_CLIENTS_LIMIT}` : ""}
              </b>
            </p>

            {PLAN === "free" && typeof activeClients === "number" ? (
              <div style={{ marginTop: 10 }}>
                <div
                  style={{
                    height: 10,
                    borderRadius: 999,
                    background: "rgba(0,0,0,0.08)",
                    overflow: "hidden",
                  }}
                >
                  <div style={{ height: "100%", width: `${clientsPct}%`, background: "rgba(0,0,0,0.35)" }} />
                </div>

                {clientsLimitReached ? (
                  <div style={{ marginTop: 10, fontWeight: 900 }}>
                    ⭐ Limite do FREE atingido (máx. {FREE_CLIENTS_LIMIT} clientes ativos).{" "}
                    <Link href="/upgrade" style={{ textDecoration: "underline", color: "inherit" }}>
                      Fazer upgrade →
                    </Link>
                  </div>
                ) : (
                  <div style={{ marginTop: 10, opacity: 0.9 }}>
                    Dica: no <b>PRO</b> você libera mais clientes + relatórios + exportação.
                  </div>
                )}
              </div>
            ) : null}

            <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                onClick={goClients}
                style={{
                  padding: 12,
                  borderRadius: 10,
                  border: "1px solid #000",
                  cursor: "pointer",
                  fontWeight: 900,
                }}
              >
                👥 Clientes (Empresa)
              </button>

              <Link
                href="/finance/ar-by-client"
                style={{
                  textDecoration: "none",
                  padding: 12,
                  borderRadius: 10,
                  border: "1px solid #000",
                }}
              >
                Ver A Receber →
              </Link>
            </div>

            {msg ? <p style={{ marginTop: 12 }}>{msg}</p> : null}
          </div>

          {/* Info operação */}
          <div style={{ marginTop: 14, padding: 12, border: "1px solid #ccc", borderRadius: 10 }}>
            <p>
              <b>Operação</b> (ops) pode lançar dados operacionais.
            </p>
            <p style={{ marginTop: 8, opacity: 0.85 }}>* Financeiro fica bloqueado para perfil operacional.</p>
          </div>
        </>
      )}
    </div>
  );
}