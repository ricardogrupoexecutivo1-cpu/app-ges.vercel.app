"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type AppRole = "admin" | "finance" | "ops" | null;

type ARRow = {
  id: string;
  client_id: string;
  due_date: string; // YYYY-MM-DD
  amount: number;
  status: "to_do" | "done" | "cancelled";
  description: string | null;
};

const VERSION = "DASH-MISSION-2026-03-01-02";
const COMPANY_NAME = "GRUPO EXECUTIVO SERVICE";

// SaaS (enquanto Stripe não está ligado)
const PLAN: "free" | "pro" | "premium" = "free";
const FREE_CLIENTS_LIMIT = 3;

function fmtBRL(v: number) {
  const n = Number(v || 0);
  try {
    return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  } catch {
    return `R$ ${n.toFixed(2)}`;
  }
}

function isoToday() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function addDaysISO(baseISO: string, days: number) {
  const d = new Date(baseISO + "T00:00:00");
  d.setDate(d.getDate() + days);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function monthKey(iso: string) {
  return iso.slice(0, 7); // YYYY-MM
}

function monthLabel(yyyyMm: string) {
  const [y, m] = yyyyMm.split("-");
  const map: Record<string, string> = {
    "01": "jan",
    "02": "fev",
    "03": "mar",
    "04": "abr",
    "05": "mai",
    "06": "jun",
    "07": "jul",
    "08": "ago",
    "09": "set",
    "10": "out",
    "11": "nov",
    "12": "dez",
  };
  return `${map[m] ?? m}/${y}`;
}

export default function DashboardPage() {
  const [email, setEmail] = useState<string>("");
  const [role, setRole] = useState<AppRole>(null);

  const [rows, setRows] = useState<ARRow[]>([]);
  const [msg, setMsg] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // SaaS usage
  const [activeClients, setActiveClients] = useState<number | null>(null);

  const todayISO = useMemo(() => isoToday(), []);

  // Enquanto carrega role, NÃO bloqueia (evita mensagem errada).
  const allowedFinance = role === null || role === "admin" || role === "finance";

  // Totais
  const totals = useMemo(() => {
    let totalOpen = 0;
    let totalDone = 0;
    let vencidos = 0;
    let vencendo7 = 0;

    const plus7 = addDaysISO(todayISO, 7);

    for (const r of rows) {
      const amt = Number(r.amount || 0);

      if (r.status === "done") totalDone += amt;

      if (r.status === "to_do") {
        totalOpen += amt;
        if (r.due_date < todayISO) vencidos += amt;
        if (r.due_date >= todayISO && r.due_date <= plus7) vencendo7 += amt;
      }
    }

    return { totalOpen, totalDone, vencidos, vencendo7 };
  }, [rows, todayISO]);

  // Fluxo 6 meses baseado em due_date
  const fluxo = useMemo(() => {
    const map = new Map<string, { open: number; done: number }>();

    for (const r of rows) {
      const k = monthKey(r.due_date);
      if (!map.has(k)) map.set(k, { open: 0, done: 0 });

      const obj = map.get(k)!;
      const amt = Number(r.amount || 0);

      if (r.status === "done") obj.done += amt;
      if (r.status === "to_do") obj.open += amt;
    }

    const keys = Array.from(map.keys()).sort();
    return keys.map((k) => ({
      key: k,
      label: monthLabel(k),
      done: map.get(k)!.done,
      open: map.get(k)!.open,
    }));
  }, [rows]);

  // Missão do dia
  const missionText = useMemo(() => {
    if (totals.vencidos > 0) {
      return `Hoje sua prioridade é cobrar vencidos (${fmtBRL(totals.vencidos)}). Faça isso agora e destrave caixa.`;
    }
    if (totals.vencendo7 > 0) {
      return `Prioridade: cobrar o que vence nos próximos 7 dias (${fmtBRL(totals.vencendo7)}).`;
    }
    return "Missão do dia: manter o caixa saudável (sem vencidos).";
  }, [totals.vencidos, totals.vencendo7]);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      setMsg("");

      try {
        const supabase = createClient();

        // 1) Sessão
        const { data } = await supabase.auth.getSession();
        const user = data.session?.user;

        if (!user) {
          window.location.replace("/login?next=/app");
          return;
        }

        if (!alive) return;
        setEmail(user.email ?? "");

        // 2) Role (RBAC -> fallback profiles.role)
        try {
          const rbacMod = await import("@/lib/rbac");
          const r = await rbacMod.getMyRole(COMPANY_NAME);

          if (!alive) return;

          if (r) {
            setRole(r as any);
          } else {
            // fallback profiles.role
            const { data: prof } = await supabase
              .from("profiles")
              .select("role")
              .eq("id", user.id)
              .maybeSingle();

            if (!alive) return;
            setRole((prof?.role ?? null) as any);
          }
        } catch {
          // fallback profiles.role
          const { data: prof } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .maybeSingle();

          if (!alive) return;
          setRole((prof?.role ?? null) as any);
        }

        // 3) Contar clientes ativos
        try {
          const { count, error: cErr } = await supabase
            .from("clients")
            .select("id", { count: "exact", head: true })
            .eq("active", true);

          if (!alive) return;
          if (cErr) setActiveClients(null);
          else setActiveClients(typeof count === "number" ? count : 0);
        } catch {
          if (!alive) return;
          setActiveClients(null);
        }

        // 4) Puxar AR últimos ~6 meses
        const fromISO = addDaysISO(todayISO, -190);

        const { data: arData, error: arErr } = await supabase
          .from("accounts_receivable")
          .select("id,client_id,due_date,amount,status,description")
          .gte("due_date", fromISO)
          .order("due_date", { ascending: true });

        if (!alive) return;

        if (arErr) {
          setMsg(`Erro ao carregar contas a receber: ${arErr.message}`);
          setRows([]);
        } else {
          setRows((arData ?? []) as ARRow[]);
        }
      } catch (e: any) {
        if (!alive) return;
        setMsg(e?.message ?? "Erro inesperado no dashboard.");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [todayISO]);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0 }}>Dashboard</h1>
          <div style={{ opacity: 0.85 }}>Visão geral e atalhos rápidos</div>
        </div>

        <div style={{ textAlign: "right", opacity: 0.85, fontSize: 12 }}>
          <div>
            Versão: {VERSION} • Usuário: {email || "—"} • Papel: {role ?? "carregando..."}
          </div>
          <div>Plano atual: {PLAN.toUpperCase()}</div>
        </div>
      </div>

      {msg ? (
        <div style={{ marginTop: 14, padding: 12, border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12 }}>
          {msg}
        </div>
      ) : null}

      <div style={{ marginTop: 18, display: "grid", gap: 12 }}>
        <div style={{ padding: 14, border: "1px solid rgba(255,255,255,0.10)", borderRadius: 14 }}>
          <div style={{ fontWeight: 800 }}>Plano & Limites</div>
          <div style={{ marginTop: 6 }}>Plano atual: {PLAN.toUpperCase()}</div>
          <div style={{ marginTop: 6 }}>
            Clientes ativos:{" "}
            {activeClients === null ? "—" : `${activeClients}/${PLAN === "free" ? FREE_CLIENTS_LIMIT : "∞"}`}
          </div>
          <div style={{ marginTop: 6, opacity: 0.85 }}>
            Dica: no PRO você libera mais clientes + relatórios + exportação.
          </div>
          <div style={{ marginTop: 10 }}>
            <Link href="/upgrade" style={{ textDecoration: "underline" }}>
              Ver planos →
            </Link>
          </div>
        </div>

        <div style={{ padding: 14, border: "1px solid rgba(255,255,255,0.10)", borderRadius: 14 }}>
          <div style={{ fontWeight: 800 }}>Missão do dia (dinheiro na mesa)</div>
          <div style={{ marginTop: 6 }}>{missionText}</div>

          <div style={{ marginTop: 10, display: "flex", gap: 16, flexWrap: "wrap" }}>
            <Link href="/ops" style={{ textDecoration: "underline" }}>
              Ir para Operação →
            </Link>

            <Link href="/ops/clients" style={{ textDecoration: "underline" }}>
              Ver A Receber →
            </Link>

            {allowedFinance ? (
              <Link href="/finance" style={{ textDecoration: "underline" }}>
                Ir para Financeiro →
              </Link>
            ) : (
              <span style={{ opacity: 0.8 }}>Financeiro bloqueado para perfil operacional.</span>
            )}
          </div>
        </div>

        <div style={{ padding: 14, border: "1px solid rgba(255,255,255,0.10)", borderRadius: 14 }}>
          <div style={{ fontWeight: 800 }}>Alertas financeiros</div>
          <div style={{ marginTop: 6 }}>
            🔴 Vencidos: <b>{fmtBRL(totals.vencidos)}</b>
          </div>
          <div style={{ marginTop: 10 }}>
            <Link href={allowedFinance ? "/finance/ar-by-client" : "/ops"} style={{ textDecoration: "underline" }}>
              Ver agora →
            </Link>
          </div>
        </div>

        <div style={{ padding: 14, border: "1px solid rgba(255,255,255,0.10)", borderRadius: 14 }}>
          <div style={{ fontWeight: 800 }}>Resumo</div>

          {loading ? (
            <div style={{ marginTop: 8, opacity: 0.8 }}>Carregando…</div>
          ) : (
            <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
              <div>
                Total em aberto: <b>{fmtBRL(totals.totalOpen)}</b> (to_do)
              </div>
              <div>
                Total recebido: <b>{fmtBRL(totals.totalDone)}</b> (done)
              </div>
              <div>
                Vencidos: <b>{fmtBRL(totals.vencidos)}</b> (to_do com vencimento passado)
              </div>
              <div>
                Vencendo em 7 dias: <b>{fmtBRL(totals.vencendo7)}</b> (to_do próximos 7 dias)
              </div>
            </div>
          )}
        </div>

        <div style={{ padding: 14, border: "1px solid rgba(255,255,255,0.10)", borderRadius: 14 }}>
          <div style={{ fontWeight: 800 }}>Fluxo (últimos 6 meses)</div>
          <div style={{ marginTop: 6, opacity: 0.85 }}>
            *Baseado em vencimento (due_date). Em seguida vamos evoluir para “data real de pagamento”.
          </div>

          {loading ? (
            <div style={{ marginTop: 8, opacity: 0.8 }}>Carregando…</div>
          ) : fluxo.length === 0 ? (
            <div style={{ marginTop: 8, opacity: 0.8 }}>Sem dados no período.</div>
          ) : (
            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              {fluxo.map((m) => (
                <div
                  key={m.key}
                  style={{
                    padding: 10,
                    border: "1px solid rgba(255,255,255,0.10)",
                    borderRadius: 12,
                  }}
                >
                  <div style={{ fontWeight: 800 }}>{m.label}</div>
                  <div style={{ marginTop: 6 }}>Recebido: {fmtBRL(m.done)}</div>
                  <div>Em aberto: {fmtBRL(m.open)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}