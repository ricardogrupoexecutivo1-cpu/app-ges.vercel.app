"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase, supabaseOrThrow } from "@/lib/supabase";
import { getMyRole, AppRole } from "@/lib/rbac";

type Client = { id: string; name: string };

type ARRow = {
  id: string;
  client_id: string;
  due_date: string;
  amount: number;
  status: "to_do" | "done" | "cancelled";
  description: string | null;
};

export default function ARByClientPage() {
  const companyName = "GRUPO EXECUTIVO SERVICE";

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AppRole | null>(null);

  const [clients, setClients] = useState<Client[]>([]);
  const [rows, setRows] = useState<ARRow[]>([]);
  const [clientId, setClientId] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);

  const allowed = role === "admin" || role === "finance";

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session?.user) {
        window.location.href = "/login";
        return;
      }

      setEmail(data.session.user.email ?? "");

      const r = await getMyRole(companyName);
      setRole(r);

      const { data: cData, error: cErr } = await supabase
        .from("clients")
        .select("id,name")
        .eq("active", true)
        .order("name");

      if (cErr) {
        setMsg(`❌ ${cErr.message}`);
        setLoading(false);
        return;
      }

      setClients((cData ?? []) as Client[]);
      setLoading(false);
    })();
  }, []);

  const clientNameById = useMemo(() => {
    const m = new Map<string, string>();
    clients.forEach((c) => m.set(c.id, c.name));
    return m;
  }, [clients]);

  async function loadAR() {
    setMsg("");

    if (!allowed) return setMsg("❌ Acesso negado.");
    if (!clientId) return setMsg("❌ Selecione um cliente.");

    const sb = supabaseOrThrow();

    const { data, error } = await sb
      .from("accounts_receivable")
      .select("id,client_id,due_date,amount,status,description")
      .eq("client_id", clientId)
      .order("due_date", { ascending: true });

    if (error) return setMsg(`❌ ${error.message}`);
    setRows((data ?? []) as ARRow[]);
  }

  if (!supabase) {
    return (
      <div style={{ padding: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>A Receber por Cliente</h1>
        <p style={{ color: "crimson", fontWeight: 600, marginTop: 10 }}>
          Supabase não configurado.
        </p>
        <p style={{ marginTop: 6 }}>
          Configure <b>NEXT_PUBLIC_SUPABASE_URL</b> e{" "}
          <b>NEXT_PUBLIC_SUPABASE_ANON_KEY</b> na Vercel e faça Redeploy.
        </p>
      </div>
    );
  }

  const totalOpen = rows
    .filter((r) => r.status === "to_do")
    .reduce((a, b) => a + Number(b.amount), 0);

  const totalDone = rows
    .filter((r) => r.status === "done")
    .reduce((a, b) => a + Number(b.amount), 0);

  return (
    <div style={{ padding: 20 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>A Receber por Cliente</h1>

      <p style={{ marginTop: 8 }}>
        Usuário: <b>{email || "carregando..."}</b> • Papel:{" "}
        <b>{role || "carregando..."}</b>
      </p>

      <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Link
          href="/finance"
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
          href="/finance/debit-notes"
          style={{
            textDecoration: "none",
            padding: 10,
            border: "1px solid #000",
            borderRadius: 10,
          }}
        >
          Notas de Débito
        </Link>
      </div>

      {!allowed ? (
        <div style={{ marginTop: 18, padding: 12, border: "1px solid #f00", borderRadius: 10 }}>
          <b>ACESSO NEGADO.</b>
          <p style={{ marginTop: 8 }}>Somente admin/finance pode ver contas a receber.</p>
        </div>
      ) : loading ? (
        <p style={{ marginTop: 16 }}>Carregando…</p>
      ) : (
        <div style={{ marginTop: 18, padding: 12, border: "1px solid #ccc", borderRadius: 10, maxWidth: 820 }}>
          <label>
            Cliente
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ccc", marginTop: 6 }}
            >
              <option value="">Selecione...</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <button
            onClick={loadAR}
            style={{ marginTop: 12, padding: 12, borderRadius: 10, border: "1px solid #000", cursor: "pointer" }}
          >
            Carregar A Receber
          </button>

          {msg && <p style={{ marginTop: 10 }}>{msg}</p>}

          {rows.length > 0 && (
            <>
              <p style={{ marginTop: 14 }}>
                Total em aberto: <b>R$ {totalOpen.toFixed(2)}</b> • Total recebido:{" "}
                <b>R$ {totalDone.toFixed(2)}</b>
              </p>

              <div style={{ marginTop: 10, border: "1px solid #ddd", borderRadius: 10, overflow: "hidden" }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "200px 120px 120px 1fr",
                    padding: 10,
                    fontWeight: 700,
                    background: "#f7f7f7",
                  }}
                >
                  <div>Cliente</div>
                  <div>Vencimento</div>
                  <div>Valor</div>
                  <div>Descrição</div>
                </div>

                {rows.map((r) => (
                  <div
                    key={r.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "200px 120px 120px 1fr",
                      padding: 10,
                      borderTop: "1px solid #eee",
                    }}
                  >
                    <div>{clientNameById.get(r.client_id) ?? r.client_id}</div>
                    <div>{r.due_date}</div>
                    <div>R$ {Number(r.amount).toFixed(2)}</div>
                    <div>
                      <b>{r.status}</b> — {r.description ?? "-"}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

