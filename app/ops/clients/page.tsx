"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getMyRole, type AppRole } from "@/lib/rbac";

// SaaS (enquanto Stripe não está ligado)
const PLAN: "free" | "pro" | "premium" = "free";
const FREE_CLIENTS_LIMIT = 3;

type ClientRow = {
  id: string;
  name: string;
  active: boolean;
  created_at?: string | null;
};

const COMPANY_NAME = "GRUPO EXECUTIVO SERVICE";
const VERSION = "OPS-CLIENTS-2026-03-01-01";

export default function OpsClientsPage() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AppRole | null>(null);

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const [clients, setClients] = useState<ClientRow[]>([]);
  const [activeCount, setActiveCount] = useState<number | null>(null);

  // form
  const [name, setName] = useState("");

  const allowed = role === "admin" || role === "ops";

  const limitReached =
    PLAN === "free" && typeof activeCount === "number" && activeCount >= FREE_CLIENTS_LIMIT;

  const pct = useMemo(() => {
    if (PLAN !== "free") return 0;
    if (typeof activeCount !== "number") return 0;
    return Math.min(100, (activeCount / FREE_CLIENTS_LIMIT) * 100);
  }, [activeCount]);

  async function refresh() {
    setMsg("");

    if (!supabase) return;
    setLoading(true);

    try {
      // lista
      const { data, error } = await supabase
        .from("clients")
        .select("id,name,active,created_at")
        .order("name", { ascending: true });

      if (error) throw error;
      setClients((data ?? []) as ClientRow[]);

      // count ativos (RLS filtra por company_id)
      const { count, error: cErr } = await supabase
        .from("clients")
        .select("id", { count: "exact", head: true })
        .eq("active", true);

      if (!cErr) setActiveCount(typeof count === "number" ? count : 0);
      else setActiveCount(null);
    } catch (e: any) {
      setMsg(e?.message ? `❌ ${e.message}` : "❌ Erro ao carregar clientes.");
    } finally {
      setLoading(false);
    }
  }

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

        const { data } = await supabase.auth.getSession();
        const user = data.session?.user;
        if (!user) {
          window.location.href = "/login";
          return;
        }

        if (!alive) return;
        setEmail(user.email ?? "");

setEmail(user.email ?? "");const r = await getMyRole();
if (!alive) return;
setRole(r);;
        if (!alive) return;
        setRole(r);

        await refresh();
      } catch (e: any) {
        if (!alive) return;
        setMsg(e?.message ? `❌ ${e.message}` : "❌ Erro ao iniciar.");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function addClient() {
    setMsg("");

    if (!allowed) return setMsg("❌ Acesso negado.");
    if (!name.trim()) return setMsg("❌ Informe o nome do cliente.");

    // trava FREE
    if (limitReached) {
      return setMsg(`⭐ Limite do FREE: máximo ${FREE_CLIENTS_LIMIT} clientes ativos. Faça upgrade para continuar.`);
    }

    try {
      const { error } = await supabase
        .from("clients")
        .insert({ name: name.trim(), active: true });

      if (error) throw error;

      setName("");
      setMsg("✅ Cliente criado!");
      await refresh();
    } catch (e: any) {
      setMsg(e?.message ? `❌ ${e.message}` : "❌ Erro ao criar cliente.");
    }
  }

  async function toggleActive(c: ClientRow) {
    setMsg("");
    if (!allowed) return setMsg("❌ Acesso negado.");

    // se vai ativar e já está no limite, bloqueia
    const willActivate = !c.active;
    if (willActivate && limitReached) {
      return setMsg(`⭐ Limite do FREE: máximo ${FREE_CLIENTS_LIMIT} clientes ativos. Faça upgrade para ativar.`);
    }

    try {
      const { error } = await supabase
        .from("clients")
        .update({ active: !c.active })
        .eq("id", c.id);

      if (error) throw error;

      setMsg("✅ Atualizado!");
      await refresh();
    } catch (e: any) {
      setMsg(e?.message ? `❌ ${e.message}` : "❌ Erro ao atualizar.");
    }
  }

  if (!supabase) {
    return (
      <div style={{ padding: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 900 }}>Clientes</h1>
        <p style={{ color: "crimson", fontWeight: 700, marginTop: 10 }}>
          Supabase não configurado.
        </p>
        <p style={{ marginTop: 6 }}>
          Configure <b>NEXT_PUBLIC_SUPABASE_URL</b> e{" "}
          <b>NEXT_PUBLIC_SUPABASE_ANON_KEY</b> na Vercel e faça Redeploy.
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: 20, maxWidth: 980 }}>
      <h1 style={{ fontSize: 22, fontWeight: 900 }}>Clientes (Empresa)</h1>
      <p style={{ marginTop: 6, opacity: 0.8 }}>
        Versão: <b>{VERSION}</b>
      </p>

      <p style={{ marginTop: 10 }}>
        Usuário: <b>{email || "..."}</b> • Papel: <b>{role || "..."}</b>
      </p>

      <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Link
          href="/ops"
          style={{ textDecoration: "none", padding: 10, border: "1px solid #000", borderRadius: 10 }}
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
            fontWeight: 900,
          }}
        >
          Upgrade →
        </Link>
      </div>

      {!allowed ? (
        <div style={{ marginTop: 18, padding: 12, border: "1px solid #f00", borderRadius: 10 }}>
          <b>ACESSO NEGADO.</b>
          <p style={{ marginTop: 8 }}>Somente admin/ops pode gerenciar clientes.</p>
        </div>
      ) : (
        <div style={{ marginTop: 18, padding: 12, border: "1px solid #ccc", borderRadius: 10 }}>
          <div style={{ fontWeight: 900 }}>Plano & Limites</div>
          <p style={{ marginTop: 8, opacity: 0.9 }}>
            Plano atual: <b>{PLAN.toUpperCase()}</b>
            <br />
            Clientes ativos:{" "}
            <b>
              {typeof activeCount === "number" ? activeCount : "…"}
              {PLAN === "free" ? `/${FREE_CLIENTS_LIMIT}` : ""}
            </b>
          </p>

          {PLAN === "free" && typeof activeCount === "number" ? (
            <div style={{ marginTop: 10 }}>
              <div
                style={{
                  height: 10,
                  borderRadius: 999,
                  background: "rgba(0,0,0,0.08)",
                  overflow: "hidden",
                }}
              >
                <div style={{ height: "100%", width: `${pct}%`, background: "rgba(0,0,0,0.35)" }} />
              </div>

              {limitReached ? (
                <div style={{ marginTop: 10, fontWeight: 900 }}>
                  ⭐ Limite do FREE atingido (máx. {FREE_CLIENTS_LIMIT} ativos).{" "}
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

          <hr style={{ margin: "14px 0", opacity: 0.3 }} />

          <div style={{ fontWeight: 900 }}>Adicionar cliente</div>

          <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Raja Aluguel de Veículos"
              style={{ padding: 12, borderRadius: 10, border: "1px solid #ccc", minWidth: 320 }}
            />

            <button
              onClick={addClient}
              disabled={limitReached}
              style={{
                padding: 12,
                borderRadius: 10,
                border: "1px solid #000",
                cursor: limitReached ? "not-allowed" : "pointer",
                opacity: limitReached ? 0.55 : 1,
                fontWeight: 900,
              }}
            >
              + Criar
            </button>
          </div>

          {msg ? <p style={{ marginTop: 12 }}>{msg}</p> : null}
        </div>
      )}

      <div style={{ marginTop: 16, padding: 12, border: "1px solid #ddd", borderRadius: 10 }}>
        <div style={{ fontWeight: 900 }}>Lista de clientes</div>

        {loading ? (
          <p style={{ marginTop: 10 }}>Carregando…</p>
        ) : clients.length === 0 ? (
          <p style={{ marginTop: 10, opacity: 0.85 }}>Sem clientes ainda.</p>
        ) : (
          <div style={{ marginTop: 10, border: "1px solid #eee", borderRadius: 10, overflow: "hidden" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 120px 140px",
                gap: 10,
                padding: 10,
                fontWeight: 900,
                background: "#f7f7f7",
              }}
            >
              <div>Cliente</div>
              <div>Status</div>
              <div>Ações</div>
            </div>

            {clients.map((c) => (
              <div
                key={c.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 120px 140px",
                  gap: 10,
                  padding: 10,
                  borderTop: "1px solid #eee",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontWeight: 900 }}>{c.name}</div>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>{c.id}</div>
                </div>

                <div style={{ fontWeight: 900 }}>{c.active ? "ATIVO" : "INATIVO"}</div>

                <div>
                  <button
                    onClick={() => toggleActive(c)}
                    style={{
                      padding: 10,
                      borderRadius: 10,
                      border: "1px solid #000",
                      cursor: "pointer",
                      width: "100%",
                      fontWeight: 900,
                    }}
                  >
                    {c.active ? "Desativar" : "Ativar"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginTop: 14, opacity: 0.75, fontSize: 12 }}>
        * Segurança: RLS deve garantir que você só veja clientes da sua company_id.
      </div>
    </div>
  );
}