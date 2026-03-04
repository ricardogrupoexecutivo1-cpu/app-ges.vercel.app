"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import styles from "../_components/ProtectedLayout.module.css";

type Tx = {
  id: string;
  occurred_at: string;
  kind: "income" | "expense";
  amount: number;
  description: string | null;
};

const VERSION = "PESSOAL-FORM-LIMIT-2026-03-01-03";
const FREE_LIMIT = 30;

function fmtBRL(v: number) {
  try {
    return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  } catch {
    return `R$ ${Number(v).toFixed(2)}`;
  }
}

function isoToday() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function clearSupabaseBrowserSession() {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith("sb-")) localStorage.removeItem(k);
    }
  } catch {}

  try {
    document.cookie.split(";").forEach((c) => {
      const name = c.split("=")[0]?.trim();
      if (name && name.startsWith("sb-")) {
        document.cookie = `${name}=; Max-Age=0; path=/`;
      }
    });
  } catch {}
}

async function requireSessionOrRedirect(nextPath: string) {
  const supaMod = await import("@/lib/supabase");
  const supabase = supaMod.supabase;

  try {
    const { data, error } = await supabase.auth.getSession();

    if (error && (error as any).code === "refresh_token_not_found") {
      clearSupabaseBrowserSession();
      try {
        await supabase.auth.signOut();
      } catch {}
      window.location.replace(`/login?next=${encodeURIComponent(nextPath)}`);
      return { supabase, user: null as any, redirected: true };
    }

    const user = data.session?.user ?? null;

    if (!user) {
      window.location.replace(`/login?next=${encodeURIComponent(nextPath)}`);
      return { supabase, user: null as any, redirected: true };
    }

    return { supabase, user, redirected: false };
  } catch (e: any) {
    if (e?.code === "refresh_token_not_found") {
      clearSupabaseBrowserSession();
      try {
        await supabase.auth.signOut();
      } catch {}
      window.location.replace(`/login?next=${encodeURIComponent(nextPath)}`);
      return { supabase, user: null as any, redirected: true };
    }
    throw e;
  }
}

export default function PersonalPage() {
  const [email, setEmail] = useState("");
  const [tx, setTx] = useState<Tx[]>([]);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);

  const [kind, setKind] = useState<"income" | "expense">("expense");
  const [amount, setAmount] = useState<string>("");
  const [occurredAt, setOccurredAt] = useState<string>(isoToday());
  const [desc, setDesc] = useState<string>("");
  const [saving, setSaving] = useState(false);

  async function loadTx() {
    setLoading(true);
    setMsg("");

    try {
      const { supabase, user, redirected } = await requireSessionOrRedirect("/personal");
      if (redirected) return;

      setEmail(user.email ?? "");

      const { data: tData, error: tErr } = await supabase
        .from("personal_transactions")
        .select("id,occurred_at,kind,amount,description")
        .order("occurred_at", { ascending: false })
        .limit(50);

      if (tErr) {
        setMsg(`❌ ${tErr.message}`);
        setTx([]);
      } else {
        setTx((tData ?? []) as Tx[]);
      }
    } catch (e: any) {
      setMsg(e?.message ? `❌ ${e.message}` : "❌ Erro ao carregar.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTx();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totals = useMemo(() => {
    const income = tx.filter((t) => t.kind === "income").reduce((a, b) => a + Number(b.amount), 0);
    const expense = tx.filter((t) => t.kind === "expense").reduce((a, b) => a + Number(b.amount), 0);
    return { income, expense, balance: income - expense };
  }, [tx]);

  // Enquanto Stripe não está conectado, tratamos como FREE para disparar o funil.
  const plan = "free";
  const used = tx.length;
  const remaining = plan === "free" ? Math.max(0, FREE_LIMIT - used) : 999999;
  const blocked = plan === "free" && used >= FREE_LIMIT;

  async function addTx() {
    setMsg("");
    if (blocked) return setMsg("⭐ Você atingiu o limite do plano FREE. Faça upgrade para continuar lançando.");
    if (!amount || Number(amount) <= 0) return setMsg("❌ Informe um valor válido.");
    if (!occurredAt) return setMsg("❌ Informe a data.");
    if (desc.trim().length < 2) return setMsg("❌ Descreva em poucas palavras (ex: Uber, Mercado, Salário).");

    setSaving(true);

    try {
      const { supabase, user, redirected } = await requireSessionOrRedirect("/personal");
      if (redirected) return;

      const payload = {
        user_id: user.id,
        occurred_at: occurredAt,
        kind,
        amount: Number(amount),
        description: desc.trim(),
      };

      const { error } = await supabase.from("personal_transactions").insert(payload);

      if (error) {
        setMsg(`❌ ${error.message}`);
        return;
      }

      setAmount("");
      setDesc("");
      setOccurredAt(isoToday());
      setMsg("✅ Lançamento salvo!");

      await loadTx();
    } catch (e: any) {
      setMsg(e?.message ? `❌ ${e.message}` : "❌ Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function removeTx(id: string) {
    setMsg("");
    try {
      const supaMod = await import("@/lib/supabase");
      const supabase = supaMod.supabase;

      const ok = confirm("Apagar este lançamento?");
      if (!ok) return;

      const { error } = await supabase.from("personal_transactions").delete().eq("id", id);
      if (error) return setMsg(`❌ ${error.message}`);

      setMsg("✅ Apagado.");
      await loadTx();
    } catch (e: any) {
      setMsg(e?.message ? `❌ ${e.message}` : "❌ Erro ao apagar.");
    }
  }

  return (
    <div className={styles.cardGrid}>
      <div className={styles.card} style={{ gridColumn: "span 12" }}>
        <div className={styles.cardTitle}>Pessoal</div>
        <div className={styles.cardValue} style={{ fontSize: 16 }}>
          Controle simples e poderoso da sua vida financeira
        </div>
        <div className={styles.cardHint}>
          Versão: <b>{VERSION}</b> • Usuário: <b>{email || "…"}</b>
        </div>

        <div
          style={{
            marginTop: 12,
            padding: 12,
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(255,255,255,0.03)",
          }}
        >
          <div style={{ fontWeight: 900, marginBottom: 6 }}>Plano atual: FREE</div>
          <div style={{ opacity: 0.9 }}>
            Uso: <b>{used}</b>/{FREE_LIMIT} lançamentos • Restam: <b>{remaining}</b>
          </div>

          <div
            style={{
              marginTop: 10,
              height: 10,
              borderRadius: 999,
              background: "rgba(255,255,255,0.08)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${Math.min(100, (used / FREE_LIMIT) * 100)}%`,
                background: "rgba(255,255,255,0.35)",
              }}
            />
          </div>

          {blocked ? (
            <div style={{ marginTop: 10, fontWeight: 900 }}>
              ⭐ Limite atingido.{" "}
              <Link href="/upgrade" style={{ textDecoration: "underline", color: "inherit" }}>
                Fazer upgrade →
              </Link>
            </div>
          ) : (
            <div style={{ marginTop: 10, opacity: 0.9 }}>Dica: no PRO você libera lançamentos ilimitados + relatórios.</div>
          )}
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardTitle}>Receitas</div>
        <div className={styles.cardValue}>{fmtBRL(totals.income)}</div>
        <div className={styles.cardHint}>Entradas (últimos 50 lançamentos)</div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardTitle}>Despesas</div>
        <div className={styles.cardValue}>{fmtBRL(totals.expense)}</div>
        <div className={styles.cardHint}>Saídas (últimos 50 lançamentos)</div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardTitle}>Saldo</div>
        <div className={styles.cardValue}>{fmtBRL(totals.balance)}</div>
        <div className={styles.cardHint}>Receitas - Despesas</div>
      </div>

      <div className={styles.card} style={{ gridColumn: "span 12" }}>
        <div className={styles.cardTitle}>Adicionar lançamento</div>
        <div className={styles.cardHint} style={{ marginTop: 6 }}>
          Rápido: descreva (ex: Mercado), valor e data. O sistema salva com segurança (RLS).
        </div>

        {blocked ? (
          <div
            style={{
              marginTop: 12,
              padding: 12,
              borderRadius: 14,
              border: "1px solid rgba(255,0,0,0.35)",
              background: "rgba(255,0,0,0.08)",
            }}
          >
            <b>⭐ Plano FREE atingiu o limite.</b>
            <div style={{ marginTop: 6 }}>
              Para continuar lançando, faça upgrade em{" "}
              <Link href="/upgrade" style={{ textDecoration: "underline", color: "inherit" }}>
                Upgrade →
              </Link>
            </div>
          </div>
        ) : null}

        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "160px 160px 1fr", gap: 10, opacity: blocked ? 0.5 : 1 }}>
          <label style={{ display: "grid", gap: 6 }}>
            Tipo
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as any)}
              disabled={blocked}
              style={{
                padding: 10,
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "transparent",
                color: "inherit",
              }}
            >
              <option value="income">Receita</option>
              <option value="expense">Despesa</option>
            </select>
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            Data
            <input
              value={occurredAt}
              onChange={(e) => setOccurredAt(e.target.value)}
              type="date"
              disabled={blocked}
              style={{
                padding: 10,
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "transparent",
                color: "inherit",
              }}
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            Descrição
            <input
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Ex: Mercado, Uber, Salário..."
              disabled={blocked}
              style={{
                padding: 10,
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "transparent",
                color: "inherit",
              }}
            />
          </label>
        </div>

        <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "220px 1fr", gap: 10, opacity: blocked ? 0.5 : 1 }}>
          <label style={{ display: "grid", gap: 6 }}>
            Valor (R$)
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(",", "."))}
              placeholder="Ex: 120.50"
              inputMode="decimal"
              disabled={blocked}
              style={{
                padding: 10,
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "transparent",
                color: "inherit",
              }}
            />
          </label>

          <div style={{ display: "flex", alignItems: "end", gap: 10 }}>
            <button className={styles.btn} onClick={addTx} disabled={saving || blocked}>
              {saving ? "Salvando…" : kind === "income" ? "Adicionar Receita" : "Adicionar Despesa"}
            </button>

            <Link href="/upgrade" className={styles.btn as any} style={{ opacity: 0.95 }}>
              Upgrade →
            </Link>
          </div>
        </div>

        {msg && (
          <div className={styles.cardHint} style={{ marginTop: 10 }}>
            {msg}
          </div>
        )}
      </div>

      <div className={styles.card} style={{ gridColumn: "span 12" }}>
        <div className={styles.cardTitle}>Últimos lançamentos</div>

        {loading ? (
          <div className={styles.cardHint} style={{ marginTop: 8 }}>
            Carregando…
          </div>
        ) : tx.length === 0 ? (
          <div className={styles.cardHint} style={{ marginTop: 8 }}>
            Sem lançamentos ainda. Adicione sua primeira receita/despesa acima.
          </div>
        ) : (
          <div style={{ marginTop: 10, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, overflow: "hidden" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "120px 120px 140px 1fr 110px",
                padding: 10,
                fontWeight: 900,
                background: "rgba(255,255,255,0.03)",
              }}
            >
              <div>Data</div>
              <div>Tipo</div>
              <div>Valor</div>
              <div>Descrição</div>
              <div></div>
            </div>

            {tx.map((t) => (
              <div
                key={t.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "120px 120px 140px 1fr 110px",
                  padding: 10,
                  borderTop: "1px solid rgba(255,255,255,0.06)",
                  alignItems: "center",
                }}
              >
                <div>{t.occurred_at}</div>
                <div>{t.kind === "income" ? "Receita" : "Despesa"}</div>
                <div>{fmtBRL(Number(t.amount))}</div>
                <div>{t.description || "-"}</div>
                <button className={styles.btn} onClick={() => removeTx(t.id)} style={{ opacity: 0.85 }}>
                  Apagar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}