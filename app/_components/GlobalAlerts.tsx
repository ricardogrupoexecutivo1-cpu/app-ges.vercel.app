"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type ARRow = {
  id: string;
  due_date: string; // YYYY-MM-DD
  amount: number;
  status: "to_do" | "done" | "cancelled";
};

function toBRL(n: number) {
  try {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
  } catch {
    return `R$ ${Number(n).toFixed(2)}`;
  }
}

function parseISODate(iso: string) {
  const [y, m, d] = iso.split("-").map((x) => Number(x));
  return new Date(y, (m || 1) - 1, d || 1);
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export default function GlobalAlerts() {
  const [rows, setRows] = useState<ARRow[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let alive = true;

    (async () => {
      setStatus("loading");

      const watchdog = setTimeout(() => {
        if (!alive) return;
        setStatus("error");
      }, 8000);

      try {
        const supaMod = await import("@/lib/supabase");
        const supabase = supaMod.supabase;

        // Se não tiver sessão, não mostra alerta
        const { data } = await supabase.auth.getSession();
        if (!data.session?.user) {
          if (!alive) return;
          setRows([]);
          setStatus("ready");
          return;
        }

        // Buscar só o que interessa (to_do) para alertas
        const { data: arData, error: arErr } = await supabase
          .from("accounts_receivable")
          .select("id,due_date,amount,status")
          .eq("status", "to_do")
          .order("due_date", { ascending: true });

        if (arErr) throw arErr;

        if (!alive) return;
        setRows((arData ?? []) as ARRow[]);
        setStatus("ready");
      } catch (e) {
        console.error("GlobalAlerts error:", e);
        if (!alive) return;
        setStatus("error");
      } finally {
        clearTimeout(watchdog);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const { overdue, dueToday } = useMemo(() => {
    const t0 = startOfToday();
    let overdueSum = 0;
    let todaySum = 0;

    for (const r of rows) {
      if (r.status !== "to_do") continue;
      const due = parseISODate(r.due_date);

      if (due < t0) overdueSum += Number(r.amount || 0);
      else if (due.getTime() === t0.getTime()) todaySum += Number(r.amount || 0);
    }

    return { overdue: overdueSum, dueToday: todaySum };
  }, [rows]);

  const hasAlerts = overdue > 0 || dueToday > 0;

  // visual inline pra não criar CSS extra agora (rápido e seguro)
  const boxStyle: React.CSSProperties = {
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.03)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    flexWrap: "wrap",
  };

  const leftStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    minWidth: 260,
  };

  const titleStyle: React.CSSProperties = {
    fontWeight: 900,
    fontSize: 12,
    letterSpacing: 0.3,
    opacity: 0.9,
  };

  const lineStyle: React.CSSProperties = {
    fontSize: 12,
    opacity: 0.85,
  };

  const badgeStyle = (kind: "danger" | "warn" | "ok"): React.CSSProperties => {
    const colors =
      kind === "danger"
        ? { b: "rgba(239,68,68,0.35)", bg: "rgba(239,68,68,0.08)", c: "rgba(239,68,68,0.95)" }
        : kind === "warn"
        ? { b: "rgba(234,179,8,0.35)", bg: "rgba(234,179,8,0.08)", c: "rgba(234,179,8,0.95)" }
        : { b: "rgba(16,185,129,0.25)", bg: "rgba(16,185,129,0.06)", c: "rgba(16,185,129,0.95)" };

    return {
      padding: "6px 10px",
      borderRadius: 999,
      border: `1px solid ${colors.b}`,
      background: colors.bg,
      color: colors.c,
      fontWeight: 900,
      fontSize: 11,
      letterSpacing: 0.3,
    };
  };

  const btnStyle: React.CSSProperties = {
    padding: "10px 12px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.18)",
    color: "#e8e8ee",
    textDecoration: "none",
    fontWeight: 800,
    fontSize: 12,
  };

  if (status === "loading") {
    return (
      <div style={boxStyle}>
        <div style={leftStyle}>
          <div style={titleStyle}>Alertas</div>
          <div style={lineStyle}>Sincronizando vencimentos…</div>
        </div>
        <span style={badgeStyle("ok")}>…</span>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div style={boxStyle}>
        <div style={leftStyle}>
          <div style={titleStyle}>Alertas</div>
          <div style={lineStyle}>Falha ao carregar alertas (internet instável).</div>
        </div>
        <span style={badgeStyle("warn")}>ATENÇÃO</span>
      </div>
    );
  }

  if (!hasAlerts) {
    return (
      <div style={boxStyle}>
        <div style={leftStyle}>
          <div style={titleStyle}>Alertas</div>
          <div style={lineStyle}>✅ Nenhum vencimento crítico hoje.</div>
        </div>
        <span style={badgeStyle("ok")}>OK</span>
      </div>
    );
  }

  return (
    <div style={boxStyle}>
      <div style={leftStyle}>
        <div style={titleStyle}>Alertas financeiros</div>
        <div style={lineStyle}>
          {overdue > 0 ? (
            <>
              🔴 Vencidos: <b>{toBRL(overdue)}</b>{" "}
            </>
          ) : null}
          {overdue > 0 && dueToday > 0 ? "• " : null}
          {dueToday > 0 ? (
            <>
              🟡 Vence hoje: <b>{toBRL(dueToday)}</b>
            </>
          ) : null}
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        {overdue > 0 ? <span style={badgeStyle("danger")}>VENCIDO</span> : null}
        {dueToday > 0 ? <span style={badgeStyle("warn")}>HOJE</span> : null}
        <Link href="/finance/ar-by-client" style={btnStyle}>
          Ver agora →
        </Link>
      </div>
    </div>
  );
}