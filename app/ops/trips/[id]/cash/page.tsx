"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type ProfileRow = { id: string; company_id: string; role: string };

type TripRow = {
  id: string;
  company_id: string;
  service_order_id: string;
  client_id: string;
  cost_center_id: string | null;
  trip_no: number;
  collaborator_id: string | null;
  vehicle_id: string | null;
  plate_snapshot: string | null;
  driver_type: string;
  client_price: number;
  driver_price: number;
  occurred_at: string;
  status: string;
};

type ServiceOrderRow = { id: string; internal_no: number; title: string | null };
type ClientRow = { id: string; name: string | null };

type BankAccountRow = { id: string; name: string; kind: string };

type SupplierRow = { id: string; name: string | null; active: boolean | null };

type AdvanceRow = { id: string; amount: number; occurred_at: string; notes: string | null; created_at: string };
type ExpenseRow = {
  id: string;
  category: string;
  amount: number;
  occurred_at: string;
  notes: string | null;
  supplier_id: string | null;
  created_at: string;
};

function fmtBRL(v: number) {
  try {
    return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  } catch {
    return `R$ ${Number(v || 0).toFixed(2)}`;
  }
}

function isoToday() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function TripCashPage() {
  const supabase = useMemo(() => createClient(), []);
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const tripId = params?.id;

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const [profile, setProfile] = useState<ProfileRow | null>(null);

  const [trip, setTrip] = useState<TripRow | null>(null);
  const [order, setOrder] = useState<ServiceOrderRow | null>(null);
  const [client, setClient] = useState<ClientRow | null>(null);

  const [accounts, setAccounts] = useState<BankAccountRow[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);

  const [advances, setAdvances] = useState<AdvanceRow[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);

  // form advance
  const [accountId, setAccountId] = useState("");
  const [advAmount, setAdvAmount] = useState("0");
  const [advDate, setAdvDate] = useState(isoToday());
  const [advNotes, setAdvNotes] = useState("");

  // form expense
  const [expAccountId, setExpAccountId] = useState("");
  const [expAmount, setExpAmount] = useState("0");
  const [expDate, setExpDate] = useState(isoToday());
  const [expCategory, setExpCategory] = useState("combustivel");
  const [expSupplierId, setExpSupplierId] = useState("");
  const [expNotes, setExpNotes] = useState("");

  const [saving, setSaving] = useState(false);

  const canUse =
    profile?.role === "admin" || profile?.role === "finance" || profile?.role === "ops";

  const advancesTotal = useMemo(
    () => advances.reduce((acc, a) => acc + Number(a.amount || 0), 0),
    [advances]
  );
  const expensesTotal = useMemo(
    () => expenses.reduce((acc, e) => acc + Number(e.amount || 0), 0),
    [expenses]
  );

  async function loadAll() {
    if (!tripId) return;

    setLoading(true);
    setMsg("");

    const { data: sess } = await supabase.auth.getSession();
    const user = sess.session?.user;

    if (!user) {
      window.location.assign(`/login?next=/ops/trips/${encodeURIComponent(String(tripId))}/cash`);
      return;
    }

    const prof = await supabase
      .from("profiles")
      .select("id,company_id,role")
      .eq("id", user.id)
      .single();

    if (prof.error || !prof.data?.company_id) {
      setProfile(null);
      setLoading(false);
      setMsg("Não consegui localizar seu profile/company_id.");
      return;
    }
    setProfile(prof.data as ProfileRow);

    // trip
    const t = await supabase
      .from("service_trips")
      .select(
        "id,company_id,service_order_id,client_id,cost_center_id,trip_no,collaborator_id,vehicle_id,plate_snapshot,driver_type,client_price,driver_price,occurred_at,status"
      )
      .eq("id", tripId)
      .single();

    if (t.error || !t.data) {
      setLoading(false);
      setMsg(`Não consegui carregar a viagem: ${t.error?.message ?? "erro"}`);
      return;
    }

    setTrip(t.data as any);

    // order + client
    const [o, c, ba, sp, ad, ex] = await Promise.all([
      supabase.from("service_orders").select("id,internal_no,title").eq("id", t.data.service_order_id).single(),
      supabase.from("clients").select("id,name").eq("id", t.data.client_id).single(),
      supabase.from("bank_accounts").select("id,name,kind").order("name", { ascending: true }),
      supabase.from("suppliers").select("id,name,active").order("name", { ascending: true }),
      supabase
        .from("trip_advances")
        .select("id,amount,occurred_at,notes,created_at")
        .eq("trip_id", tripId)
        .order("occurred_at", { ascending: false })
        .limit(50),
      supabase
        .from("trip_expenses")
        .select("id,category,amount,occurred_at,notes,supplier_id,created_at")
        .eq("trip_id", tripId)
        .order("occurred_at", { ascending: false })
        .limit(50),
    ]);

    if (o.error) setMsg((m) => (m ? m + " | " : "") + `Erro OS: ${o.error.message}`);
    if (c.error) setMsg((m) => (m ? m + " | " : "") + `Erro cliente: ${c.error.message}`);
    if (ba.error) setMsg((m) => (m ? m + " | " : "") + `Erro contas: ${ba.error.message}`);
    if (sp.error) setMsg((m) => (m ? m + " | " : "") + `Erro fornecedores: ${sp.error.message}`);
    if (ad.error) setMsg((m) => (m ? m + " | " : "") + `Erro adiantamentos: ${ad.error.message}`);
    if (ex.error) setMsg((m) => (m ? m + " | " : "") + `Erro despesas: ${ex.error.message}`);

    setOrder((o.data ?? null) as any);
    setClient((c.data ?? null) as any);
    setAccounts((ba.data ?? []) as any);
    setSuppliers((sp.data ?? []) as any);
    setAdvances((ad.data ?? []) as any);
    setExpenses((ex.data ?? []) as any);

    // defaults: first account
    const firstAcc = (ba.data ?? [])[0] as any;
    if (firstAcc?.id) {
      if (!accountId) setAccountId(firstAcc.id);
      if (!expAccountId) setExpAccountId(firstAcc.id);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId]);

  // --- cash_transactions insertion (tenta 2 formatos comuns)
  async function insertCashTx(payload: any) {
    // Formato A (mais provável no seu projeto)
    const tryA = await supabase.from("cash_transactions").insert(payload);
    if (!tryA.error) return;

    // Formato B fallback (alguns projetos usam "type" ao invés de "tx_type")
    const payloadB = { ...payload };
    if ("tx_type" in payloadB) {
      payloadB.type = payloadB.tx_type;
      delete payloadB.tx_type;
    }
    const tryB = await supabase.from("cash_transactions").insert(payloadB);
    if (!tryB.error) return;

    throw new Error(tryA.error?.message ?? tryB.error?.message ?? "Erro ao gravar no caixa.");
  }

  async function addAdvance() {
    if (!trip || !profile) return;
    if (!canUse) return setMsg("Sem permissão.");
    if (!accountId) return setMsg("Selecione a conta (Caixa/Banco/PIX).");

    setSaving(true);
    setMsg("");

    try {
      const amt = Number(String(advAmount).replace(",", "."));
      const amount = Number.isFinite(amt) ? amt : 0;
      if (amount <= 0) throw new Error("Valor do adiantamento precisa ser > 0.");

      // 1) trip_advances
      const insA = await supabase
        .from("trip_advances")
        .insert({
          company_id: profile.company_id,
          trip_id: trip.id,
          collaborator_id: trip.collaborator_id,
          amount,
          occurred_at: advDate,
          notes: advNotes.trim() ? advNotes.trim() : null,
          created_by: profile.id,
        })
        .select("id,amount,occurred_at,notes,created_at")
        .single();

      if (insA.error) throw new Error(insA.error.message);

      // 2) cash_transactions (adiantamento = saída/expense)
      await insertCashTx({
        company_id: profile.company_id,
        bank_account_id: accountId,
        tx_type: "expense",
        amount,
        occurred_at: advDate,
        description: `Adiantamento (OS #${order?.internal_no ?? "?"} • Viagem ${trip.trip_no})`,
        ref_payment_id: null,
        ref_invoice_id: null,
        created_by: profile.id,
        created_at: new Date().toISOString(),
        trip_id: trip.id,
        service_order_id: trip.service_order_id,
        cost_center_id: trip.cost_center_id,
      });

      setAdvAmount("0");
      setAdvNotes("");
      await loadAll();
      setMsg("Adiantamento lançado ✅");
    } catch (e: any) {
      setMsg(e?.message ?? "Erro ao lançar adiantamento.");
    } finally {
      setSaving(false);
    }
  }

  async function addExpense() {
    if (!trip || !profile) return;
    if (!canUse) return setMsg("Sem permissão.");
    if (!expAccountId) return setMsg("Selecione a conta (Caixa/Banco/PIX).");

    setSaving(true);
    setMsg("");

    try {
      const amt = Number(String(expAmount).replace(",", "."));
      const amount = Number.isFinite(amt) ? amt : 0;
      if (amount <= 0) throw new Error("Valor da despesa precisa ser > 0.");

      // 1) trip_expenses
      const insE = await supabase
        .from("trip_expenses")
        .insert({
          company_id: profile.company_id,
          trip_id: trip.id,
          supplier_id: expSupplierId || null,
          category: expCategory.trim() ? expCategory.trim() : "despesa",
          amount,
          occurred_at: expDate,
          notes: expNotes.trim() ? expNotes.trim() : null,
          created_by: profile.id,
        })
        .select("id,category,amount,occurred_at,notes,supplier_id,created_at")
        .single();

      if (insE.error) throw new Error(insE.error.message);

      // 2) cash_transactions (despesa = saída/expense)
      await insertCashTx({
        company_id: profile.company_id,
        bank_account_id: expAccountId,
        tx_type: "expense",
        amount,
        occurred_at: expDate,
        description: `Despesa ${expCategory} (OS #${order?.internal_no ?? "?"} • Viagem ${trip.trip_no})`,
        created_by: profile.id,
        created_at: new Date().toISOString(),
        trip_id: trip.id,
        service_order_id: trip.service_order_id,
        cost_center_id: trip.cost_center_id,
      });

      setExpAmount("0");
      setExpNotes("");
      await loadAll();
      setMsg("Despesa lançada ✅");
    } catch (e: any) {
      setMsg(e?.message ?? "Erro ao lançar despesa.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div style={{ padding: 18 }}>Carregando…</div>;

  if (!trip) {
    return (
      <div style={{ padding: 18 }}>
        <h1 style={{ marginTop: 0 }}>Viagem • Caixa</h1>
        <div style={{ padding: 10, border: "1px solid rgba(255,255,255,0.15)" }}>
          {msg || "Viagem não encontrada."}
        </div>
        <div style={{ marginTop: 10 }}>
          <button onClick={() => router.back()} style={{ padding: "8px 12px", cursor: "pointer" }}>
            Voltar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 18, display: "grid", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0 }}>Viagem • Caixa</h1>
          <div style={{ opacity: 0.8, fontSize: 13 }}>
            OS <b>#{order?.internal_no ?? "?"}</b> • Viagem <b>{trip.trip_no}</b> • Cliente{" "}
            <b>{client?.name ?? "—"}</b>
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <Link href="/ops/trips" style={{ textDecoration: "underline" }}>
            Viagens
          </Link>
          <Link href="/ops" style={{ textDecoration: "underline" }}>
            Operação
          </Link>
        </div>
      </div>

      {msg ? <div style={{ padding: 10, border: "1px solid rgba(255,255,255,0.15)" }}>{msg}</div> : null}

      {/* RESUMO */}
      <div style={{ padding: 14, border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12 }}>
        <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
          <div>
            <div style={{ opacity: 0.8, fontSize: 12 }}>Preço cliente</div>
            <div style={{ fontWeight: 900, fontSize: 18 }}>{fmtBRL(Number(trip.client_price || 0))}</div>
          </div>
          <div>
            <div style={{ opacity: 0.8, fontSize: 12 }}>Preço motorista</div>
            <div style={{ fontWeight: 900, fontSize: 18 }}>{fmtBRL(Number(trip.driver_price || 0))}</div>
          </div>
          <div>
            <div style={{ opacity: 0.8, fontSize: 12 }}>Adiantamentos</div>
            <div style={{ fontWeight: 900, fontSize: 18 }}>{fmtBRL(advancesTotal)}</div>
          </div>
          <div>
            <div style={{ opacity: 0.8, fontSize: 12 }}>Despesas</div>
            <div style={{ fontWeight: 900, fontSize: 18 }}>{fmtBRL(expensesTotal)}</div>
          </div>
          <div>
            <div style={{ opacity: 0.8, fontSize: 12 }}>Saldo motorista</div>
            <div style={{ fontWeight: 900, fontSize: 18 }}>
              {fmtBRL(Number(trip.driver_price || 0) - advancesTotal - expensesTotal)}
            </div>
          </div>
          <div>
            <div style={{ opacity: 0.8, fontSize: 12 }}>Lucro viagem</div>
            <div style={{ fontWeight: 900, fontSize: 18 }}>
              {fmtBRL(Number(trip.client_price || 0) - Number(trip.driver_price || 0) - expensesTotal)}
            </div>
          </div>
        </div>
      </div>

      {/* ADIANTAMENTO */}
      <div style={{ padding: 14, border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12 }}>
        <div style={{ fontWeight: 800, marginBottom: 10 }}>Lançar adiantamento</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span>Conta (Caixa/Banco/PIX)</span>
            <select value={accountId} onChange={(e) => setAccountId(e.target.value)} style={{ padding: 10 }}>
              <option value="">Selecione…</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.kind})
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span>Data</span>
            <input type="date" value={advDate} onChange={(e) => setAdvDate(e.target.value)} style={{ padding: 10 }} />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span>Valor (R$)</span>
            <input value={advAmount} onChange={(e) => setAdvAmount(e.target.value)} style={{ padding: 10 }} />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span>Observação</span>
            <input value={advNotes} onChange={(e) => setAdvNotes(e.target.value)} style={{ padding: 10 }} />
          </label>

          <div style={{ display: "flex", alignItems: "end" }}>
            <button onClick={addAdvance} disabled={saving} style={{ padding: "10px 14px", cursor: "pointer" }}>
              {saving ? "Salvando…" : "Lançar adiantamento"}
            </button>
          </div>
        </div>

        <div style={{ marginTop: 10, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", opacity: 0.85 }}>
                <th style={{ padding: 8, borderBottom: "1px solid rgba(255,255,255,0.12)" }}>Data</th>
                <th style={{ padding: 8, borderBottom: "1px solid rgba(255,255,255,0.12)" }}>Valor</th>
                <th style={{ padding: 8, borderBottom: "1px solid rgba(255,255,255,0.12)" }}>Obs</th>
              </tr>
            </thead>
            <tbody>
              {advances.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ padding: 10, opacity: 0.8 }}>
                    Nenhum adiantamento.
                  </td>
                </tr>
              ) : (
                advances.map((a) => (
                  <tr key={a.id}>
                    <td style={{ padding: 8, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>{a.occurred_at}</td>
                    <td style={{ padding: 8, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                      {fmtBRL(Number(a.amount || 0))}
                    </td>
                    <td style={{ padding: 8, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>{a.notes ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DESPESA */}
      <div style={{ padding: 14, border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12 }}>
        <div style={{ fontWeight: 800, marginBottom: 10 }}>Lançar despesa</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span>Conta (Caixa/Banco/PIX)</span>
            <select value={expAccountId} onChange={(e) => setExpAccountId(e.target.value)} style={{ padding: 10 }}>
              <option value="">Selecione…</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.kind})
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span>Data</span>
            <input type="date" value={expDate} onChange={(e) => setExpDate(e.target.value)} style={{ padding: 10 }} />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span>Categoria</span>
            <input value={expCategory} onChange={(e) => setExpCategory(e.target.value)} style={{ padding: 10 }} />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span>Fornecedor (opcional)</span>
            <select value={expSupplierId} onChange={(e) => setExpSupplierId(e.target.value)} style={{ padding: 10 }}>
              <option value="">(Sem fornecedor)</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name ?? "(Sem nome)"}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span>Valor (R$)</span>
            <input value={expAmount} onChange={(e) => setExpAmount(e.target.value)} style={{ padding: 10 }} />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span>Observação</span>
            <input value={expNotes} onChange={(e) => setExpNotes(e.target.value)} style={{ padding: 10 }} />
          </label>

          <div style={{ display: "flex", alignItems: "end" }}>
            <button onClick={addExpense} disabled={saving} style={{ padding: "10px 14px", cursor: "pointer" }}>
              {saving ? "Salvando…" : "Lançar despesa"}
            </button>
          </div>
        </div>

        <div style={{ marginTop: 10, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", opacity: 0.85 }}>
                <th style={{ padding: 8, borderBottom: "1px solid rgba(255,255,255,0.12)" }}>Data</th>
                <th style={{ padding: 8, borderBottom: "1px solid rgba(255,255,255,0.12)" }}>Categoria</th>
                <th style={{ padding: 8, borderBottom: "1px solid rgba(255,255,255,0.12)" }}>Valor</th>
                <th style={{ padding: 8, borderBottom: "1px solid rgba(255,255,255,0.12)" }}>Obs</th>
              </tr>
            </thead>
            <tbody>
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: 10, opacity: 0.8 }}>
                    Nenhuma despesa.
                  </td>
                </tr>
              ) : (
                expenses.map((e) => (
                  <tr key={e.id}>
                    <td style={{ padding: 8, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>{e.occurred_at}</td>
                    <td style={{ padding: 8, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>{e.category}</td>
                    <td style={{ padding: 8, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                      {fmtBRL(Number(e.amount || 0))}
                    </td>
                    <td style={{ padding: 8, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>{e.notes ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ fontSize: 12, opacity: 0.8 }}>
        Próximo passo: tela do <b>Caixa multi-contas</b> no Financeiro com filtros por OS/Viagem/Cliente/CC.
      </div>
    </div>
  );
}