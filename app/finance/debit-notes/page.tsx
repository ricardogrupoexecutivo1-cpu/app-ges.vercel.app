"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

type ClientRow = { id: string; name: string };

type DebitNoteRow = {
  id: string;
  number_seq?: number | null;
  issue_date?: string | null;
  due_date?: string | null;
  notes?: string | null;
  status?: string | null;
  created_at?: string | null;
};

function getSupabaseBrowser() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  if (!anon) throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY");
  return createClient(url, anon);
}

function money(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function DebitNotesPage() {
  const supabase = useMemo(() => getSupabaseBrowser(), []);

  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);

  const [clients, setClients] = useState<ClientRow[]>([]);
  const [notes, setNotes] = useState<DebitNoteRow[]>([]);

  const [clientId, setClientId] = useState("");
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState("OPEN");
  const [noteText, setNoteText] = useState("");

  const [itemDesc, setItemDesc] = useState("");
  const [qty, setQty] = useState<number>(1);
  const [unitPrice, setUnitPrice] = useState<number>(0);

  const itemTotal = useMemo(() => Number(qty || 0) * Number(unitPrice || 0), [qty, unitPrice]);

  const [msg, setMsg] = useState<string | null>(null);

  async function loadAll() {
    setMsg(null);
    setLoading(true);
    try {
      // 1) user
      const { data: userRes, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      const user = userRes.user;
      if (!user) {
        setCompanyId(null);
        setClients([]);
        setNotes([]);
        setMsg("Faça login para acessar as Notas de Débito.");
        return;
      }

      // 2) company_id do profile
      const { data: profile, error: profileErr } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();

      if (profileErr) throw profileErr;
      if (!profile?.company_id) {
        setMsg("Profile sem company_id. Verifique a tabela profiles.");
        return;
      }

      const cid = profile.company_id as string;
      setCompanyId(cid);

      // 3) clients
      const { data: cdata, error: cerr } = await supabase
        .from("clients")
        .select("id,name")
        .order("name", { ascending: true })
        .limit(2000);

      if (cerr) throw cerr;
      setClients((cdata ?? []) as ClientRow[]);

      // 4) debit_notes (tenta filtrar por company_id; se o nome for diferente, fazemos fallback)
      const list1 = await supabase
        .from("debit_notes")
        .select("id,number_seq,issue_date,due_date,notes,status,created_at")
        .eq("company_id", cid)
        .order("created_at", { ascending: false })
        .limit(200);

      if (!list1.error) {
        setNotes((list1.data ?? []) as DebitNoteRow[]);
        return;
      }

      // fallback: company_is
      const list2 = await supabase
        .from("debit_notes")
        .select("id,number_seq,issue_date,due_date,notes,status,created_at")
        .eq("company_is", cid as any)
        .order("created_at", { ascending: false })
        .limit(200);

      if (list2.error) throw list2.error;
      setNotes((list2.data ?? []) as DebitNoteRow[]);
    } catch (e: any) {
      setMsg(e?.message ?? "Erro ao carregar dados.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createDebitNote() {
    setMsg(null);

    if (!companyId) return setMsg("Sem company_id.");
    if (!clientId) return setMsg("Selecione um cliente.");
    if (!itemDesc.trim()) return setMsg("Descreva o item.");
    if (!qty || qty <= 0) return setMsg("Quantidade inválida.");
    if (unitPrice < 0) return setMsg("Valor unitário inválido.");

    setLoading(true);
    try {
      // 1) criar nota (tenta company_id/client_id; se falhar, tenta company_is/client_is)
      const payloadA: any = {
        company_id: companyId,
        client_id: clientId,
        issue_date: issueDate,
        due_date: dueDate,
        notes: noteText || null,
        status,
      };

      let noteId: string | null = null;

      const insA = await supabase.from("debit_notes").insert(payloadA).select("id").single();
      if (!insA.error) {
        noteId = insA.data?.id ?? null;
      } else {
        const payloadB: any = {
          company_is: companyId,
          client_is: clientId,
          issue_date: issueDate,
          due_date: dueDate,
          notes: noteText || null,
          status,
        };

        const insB = await supabase.from("debit_notes").insert(payloadB).select("id").single();
        if (insB.error) throw insB.error;
        noteId = insB.data?.id ?? null;
      }

      if (!noteId) throw new Error("Não consegui obter o id da nota criada.");

      // 2) criar 1 item
      const itemPayloadA: any = {
        debit_note_id: noteId,
        description: itemDesc,
        qty,
        unit_price: unitPrice,
        total: itemTotal,
      };

      const itemInsA = await supabase.from("debit_note_items").insert(itemPayloadA);
      if (itemInsA.error) {
        // fallback caso a coluna tenha typo (debit_note_is)
        const itemPayloadB: any = {
          debit_note_is: noteId,
          description: itemDesc,
          qty,
          unit_price: unitPrice,
          total: itemTotal,
        };
        const itemInsB = await supabase.from("debit_note_items").insert(itemPayloadB);
        if (itemInsB.error) throw itemInsB.error;
      }

      setMsg("Nota de débito criada com sucesso ✅");
      // reset item
      setItemDesc("");
      setQty(1);
      setUnitPrice(0);
      setNoteText("");

      await loadAll();
    } catch (e: any) {
      setMsg(e?.message ?? "Erro ao criar nota.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <header style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <h1 style={{ margin: 0 }}>Financeiro • Notas de Débito</h1>
        <Link href="/finance" style={{ textDecoration: "underline" }}>
          Voltar
        </Link>
      </header>

      {msg ? (
        <div
          style={{
            marginTop: 12,
            padding: 12,
            border: "1px solid rgba(0,0,0,0.12)",
            borderRadius: 12,
          }}
        >
          {msg}
        </div>
      ) : null}

      <section
        style={{
          marginTop: 12,
          padding: 16,
          border: "1px solid rgba(0,0,0,0.12)",
          borderRadius: 12,
        }}
      >
        <h2 style={{ marginTop: 0 }}>Criar nova nota</h2>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label>Cliente</label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              style={{ width: "100%", padding: 10, marginTop: 6 }}
              disabled={loading}
            >
              <option value="">Selecione…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label>Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={{ width: "100%", padding: 10, marginTop: 6 }}
              disabled={loading}
            >
              <option value="OPEN">OPEN</option>
              <option value="PAID">PAID</option>
              <option value="CANCELED">CANCELED</option>
            </select>
          </div>

          <div>
            <label>Data de emissão</label>
            <input
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              style={{ width: "100%", padding: 10, marginTop: 6 }}
              disabled={loading}
            />
          </div>

          <div>
            <label>Vencimento</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              style={{ width: "100%", padding: 10, marginTop: 6 }}
              disabled={loading}
            />
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <label>Observações</label>
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            style={{ width: "100%", padding: 10, marginTop: 6, minHeight: 70 }}
            disabled={loading}
          />
        </div>

        <div
          style={{
            marginTop: 12,
            padding: 12,
            border: "1px dashed rgba(0,0,0,0.25)",
            borderRadius: 12,
          }}
        >
          <h3 style={{ marginTop: 0 }}>Item (1 por enquanto)</h3>

          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 12 }}>
            <div>
              <label>Descrição</label>
              <input
                value={itemDesc}
                onChange={(e) => setItemDesc(e.target.value)}
                style={{ width: "100%", padding: 10, marginTop: 6 }}
                disabled={loading}
              />
            </div>
            <div>
              <label>Qtd</label>
              <input
                type="number"
                value={qty}
                onChange={(e) => setQty(Number(e.target.value))}
                style={{ width: "100%", padding: 10, marginTop: 6 }}
                disabled={loading}
              />
            </div>
            <div>
              <label>Valor unit.</label>
              <input
                type="number"
                step="0.01"
                value={unitPrice}
                onChange={(e) => setUnitPrice(Number(e.target.value))}
                style={{ width: "100%", padding: 10, marginTop: 6 }}
                disabled={loading}
              />
            </div>
          </div>

          <div style={{ marginTop: 10, opacity: 0.85 }}>
            Total do item: <b>{money(itemTotal)}</b>
          </div>
        </div>

        <button
          onClick={createDebitNote}
          disabled={loading}
          style={{ marginTop: 12, padding: "10px 14px", cursor: "pointer" }}
        >
          {loading ? "Processando..." : "Criar nota"}
        </button>
      </section>

      <section
        style={{
          marginTop: 12,
          border: "1px solid rgba(0,0,0,0.12)",
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        <div style={{ padding: 12, borderBottom: "1px solid rgba(0,0,0,0.12)" }}>
          <b>Últimas notas</b>
          {companyId ? (
            <span style={{ marginLeft: 10, opacity: 0.75, fontSize: 12 }}>
              company_id: {companyId}
            </span>
          ) : null}
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left" }}>
              <th style={th}>Número</th>
              <th style={th}>Emissão</th>
              <th style={th}>Vencimento</th>
              <th style={th}>Status</th>
              <th style={th}>Notas</th>
            </tr>
          </thead>
          <tbody>
            {notes.length === 0 ? (
              <tr>
                <td style={{ padding: 12 }} colSpan={5}>
                  {loading ? "Carregando..." : "Nenhuma nota encontrada."}
                </td>
              </tr>
            ) : (
              notes.map((n) => (
                <tr key={n.id}>
                  <td style={td}>{n.number_seq ?? "-"}</td>
                  <td style={td}>{n.issue_date ?? "-"}</td>
                  <td style={td}>{n.due_date ?? "-"}</td>
                  <td style={td}>{n.status ?? "-"}</td>
                  <td style={td}>{n.notes ?? ""}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}

const th: React.CSSProperties = {
  padding: 12,
  borderBottom: "1px solid rgba(0,0,0,0.12)",
};

const td: React.CSSProperties = {
  padding: 12,
  borderBottom: "1px solid rgba(0,0,0,0.06)",
};