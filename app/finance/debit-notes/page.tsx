"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getMyRole, AppRole } from "@/lib/rbac";

type Client = { id: string; name: string };
type DebitNoteRow = { id: string; number_seq: number; issue_date: string; due_date: string; client_id: string };

export default function DebitNotesPage() {
  const companyName = "GRUPO EXECUTIVO SERVICE";

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AppRole | null>(null);

  const [clients, setClients] = useState<Client[]>([]);
  const [notes, setNotes] = useState<DebitNoteRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string>("");

  const [clientId, setClientId] = useState("");
  const [issueDate, setIssueDate] = useState<string>("");
  const [noteText, setNoteText] = useState<string>("");

  // itens (simples para começar)
  const [itemDesc, setItemDesc] = useState("Serviço");
  const [itemQty, setItemQty] = useState("1");
  const [itemUnit, setItemUnit] = useState("0");

  const allowed = role === "admin" || role === "finance";

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session?.user) {
        window.location.href = "/login";
        return;
      }
      setEmail(data.session.user.email ?? "");
      const r = await getMyRole(companyName);
      setRole(r);

      // clientes
      const { data: cData } = await supabase.from("clients").select("id,name").eq("active", true).order("name");
      setClients((cData ?? []) as Client[]);

      await refreshNotes();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refreshNotes() {
    const { data: dn, error } = await supabase
      .from("debit_notes")
      .select("id,number_seq,issue_date,due_date,client_id")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      setNotes([]);
      return;
    }
    setNotes((dn ?? []) as DebitNoteRow[]);
  }

  const clientNameById = useMemo(() => {
    const m = new Map<string, string>();
    clients.forEach((c) => m.set(c.id, c.name));
    return m;
  }, [clients]);

  async function createDebitNote() {
    setMsg("");
    if (!allowed) {
      setMsg("❌ Acesso negado (somente admin/finance).");
      return;
    }
    if (!clientId) return setMsg("❌ Selecione um cliente.");
    const qty = Number(itemQty);
    const unit = Number(itemUnit);
    if (!itemDesc || !Number.isFinite(qty) || !Number.isFinite(unit)) return setMsg("❌ Item inválido.");

    setLoading(true);
    try {
      const items = [{ description: itemDesc, qty, unit_price: unit }];
      const { data, error } = await supabase.rpc("create_debit_note", {
        p_company_name: companyName,
        p_client_id: clientId,
        p_issue_date: issueDate ? issueDate : null,
        p_notes: noteText || null,
        p_items: items,
      });

      if (error) throw error;

      setMsg("✅ Nota criada com sucesso.");
      setNoteText("");
      setItemDesc("Serviço");
      setItemQty("1");
      setItemUnit("0");

      await refreshNotes();
    } catch (e: any) {
      setMsg(`❌ ${e?.message ?? "Erro ao criar nota"}`);
    } finally {
      setLoading(false);
    }
  }

  if (role === null) {
    // carregando papel
  }

  return (
    <div style={{ padding: 20 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>Notas de Débito</h1>
      <p style={{ marginTop: 8 }}>
        Usuário: <b>{email || "carregando..."}</b> • Papel: <b>{role || "carregando..."}</b>
      </p>

      <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Link href="/finance" style={{ textDecoration: "none", padding: 10, border: "1px solid #000", borderRadius: 10 }}>
          Voltar
        </Link>
        <Link
          href="/finance/ar-by-client"
          style={{ textDecoration: "none", padding: 10, border: "1px solid #000", borderRadius: 10 }}
        >
          A Receber por Cliente
        </Link>
      </div>

      {!allowed ? (
        <div style={{ marginTop: 18, padding: 12, border: "1px solid #f00", borderRadius: 10 }}>
          <b>ACESSO NEGADO.</b>
          <p style={{ marginTop: 8 }}>Somente admin/finance pode criar e ver notas.</p>
        </div>
      ) : (
        <div style={{ marginTop: 18, padding: 12, border: "1px solid #ccc", borderRadius: 10 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>Criar nova nota</h2>

          <div style={{ marginTop: 12, display: "grid", gap: 10, maxWidth: 520 }}>
            <label>
              Cliente
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
              >
                <option value="">Selecione...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Data de emissão (opcional)
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
              />
            </label>

            <label>
              Observações (opcional)
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
              />
            </label>

            <div style={{ marginTop: 6, padding: 10, border: "1px dashed #aaa", borderRadius: 10 }}>
              <b>Item 1</b>
              <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
                <input
                  value={itemDesc}
                  onChange={(e) => setItemDesc(e.target.value)}
                  placeholder="Descrição"
                  style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
                />
                <input
                  value={itemQty}
                  onChange={(e) => setItemQty(e.target.value)}
                  placeholder="Qtd"
                  style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
                />
                <input
                  value={itemUnit}
                  onChange={(e) => setItemUnit(e.target.value)}
                  placeholder="Valor unitário"
                  style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
                />
              </div>
            </div>

            <button
              disabled={loading}
              onClick={createDebitNote}
              style={{ padding: 12, borderRadius: 10, border: "1px solid #000", cursor: "pointer" }}
            >
              {loading ? "Criando..." : "Criar Nota de Débito"}
            </button>

            {msg && <p>{msg}</p>}
          </div>
        </div>
      )}

      <div style={{ marginTop: 18 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700 }}>Últimas notas</h2>
        <div style={{ marginTop: 10, border: "1px solid #ddd", borderRadius: 10, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "120px 160px 160px 1fr", gap: 0, padding: 10, fontWeight: 700 }}>
            <div>Número</div>
            <div>Emissão</div>
            <div>Vencimento</div>
            <div>Cliente</div>
          </div>

          {notes.map((n) => (
            <div
              key={n.id}
              style={{ display: "grid", gridTemplateColumns: "120px 160px 160px 1fr", gap: 0, padding: 10, borderTop: "1px solid #eee" }}
            >
              <div>#{n.number_seq}</div>
              <div>{n.issue_date}</div>
              <div>{n.due_date}</div>
              <div>{clientNameById.get(n.client_id) ?? n.client_id}</div>
            </div>
          ))}

          {notes.length === 0 && <div style={{ padding: 10, opacity: 0.8 }}>Nenhuma nota ainda.</div>}
        </div>
      </div>
    </div>
  );
}