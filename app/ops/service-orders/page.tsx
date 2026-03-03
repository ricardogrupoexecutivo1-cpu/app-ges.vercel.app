"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type ProfileRow = {
  id: string;
  company_id: string;
  role: "admin" | "finance" | "ops" | string;
};

type ClientRow = {
  id: string;
  name: string | null;
  active: boolean | null;
};

type CostCenterRow = {
  id: string;
  name: string;
  active: boolean;
};

type ServiceOrderRow = {
  id: string;
  internal_no: number;
  client_id: string;
  cost_center_id: string | null;
  client_os: string | null;
  client_oc: string | null;
  title: string | null;
  service_value: number;
  status: string;
  created_at: string;
};

function fmtBRL(v: number) {
  try {
    return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  } catch {
    return `R$ ${Number(v || 0).toFixed(2)}`;
  }
}

export default function ServiceOrdersPage() {
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string>("");

  const [profile, setProfile] = useState<ProfileRow | null>(null);

  const [clients, setClients] = useState<ClientRow[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenterRow[]>([]);
  const [orders, setOrders] = useState<ServiceOrderRow[]>([]);

  // form
  const [clientId, setClientId] = useState<string>("");
  const [costCenterId, setCostCenterId] = useState<string>("");
  const [clientOS, setClientOS] = useState<string>("");
  const [clientOC, setClientOC] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [serviceValue, setServiceValue] = useState<string>("0");
  const [saving, setSaving] = useState(false);

  const canUse =
    profile?.role === "admin" || profile?.role === "finance" || profile?.role === "ops";

  async function loadAll() {
    setLoading(true);
    setMsg("");

    const { data: sess } = await supabase.auth.getSession();
    const user = sess.session?.user;

    if (!user) {
      window.location.assign("/login?next=/ops/service-orders");
      return;
    }

    // 1) profile (company_id + role)
    const prof = await supabase
      .from("profiles")
      .select("id,company_id,role")
      .eq("id", user.id)
      .single();

    if (prof.error || !prof.data?.company_id) {
      setProfile(null);
      setLoading(false);
      setMsg("Não consegui localizar seu profile/company_id. Verifique a tabela profiles e a policy.");
      return;
    }

    setProfile(prof.data as ProfileRow);

    // 2) clients + cost_centers + service_orders
    const [c1, c2, c3] = await Promise.all([
      supabase
        .from("clients")
        .select("id,name,active")
        .order("name", { ascending: true }),
      supabase
        .from("cost_centers")
        .select("id,name,active")
        .order("name", { ascending: true }),
      supabase
        .from("service_orders")
        .select("id,internal_no,client_id,cost_center_id,client_os,client_oc,title,service_value,status,created_at")
        .order("created_at", { ascending: false })
        .limit(30),
    ]);

    if (c1.error) setMsg((m) => (m ? m + " | " : "") + `Erro clients: ${c1.error.message}`);
    if (c2.error) setMsg((m) => (m ? m + " | " : "") + `Erro centros de custo: ${c2.error.message}`);
    if (c3.error) setMsg((m) => (m ? m + " | " : "") + `Erro OS: ${c3.error.message}`);

    setClients((c1.data ?? []) as ClientRow[]);
    setCostCenters((c2.data ?? []) as CostCenterRow[]);
    setOrders((c3.data ?? []) as ServiceOrderRow[]);

    // default client
    if (!clientId) {
      const firstActive = (c1.data ?? []).find((x: any) => x.active !== false);
      if (firstActive?.id) setClientId(firstActive.id);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clientNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of clients) m.set(c.id, c.name ?? "(Sem nome)");
    return m;
  }, [clients]);

  const ccNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const cc of costCenters) m.set(cc.id, cc.name);
    return m;
  }, [costCenters]);

  async function createOrder() {
    if (!profile?.company_id) {
      setMsg("Sem company_id.");
      return;
    }
    if (!canUse) {
      setMsg("Seu papel não pode criar OS.");
      return;
    }
    if (!clientId) {
      setMsg("Selecione um cliente.");
      return;
    }

    setSaving(true);
    setMsg("");

    try {
      // 1) gerar número interno (RPC)
      const rpc = await supabase.rpc("next_service_order_no", {
        p_company_id: profile.company_id,
      });

      if (rpc.error) throw new Error(`RPC next_service_order_no: ${rpc.error.message}`);
      const internalNo = Number(rpc.data);
      if (!internalNo || Number.isNaN(internalNo)) throw new Error("Não consegui gerar internal_no.");

      // 2) inserir OS
      const v = Number(String(serviceValue).replace(",", "."));
      const service_value = Number.isFinite(v) ? v : 0;

      const ins = await supabase
        .from("service_orders")
        .insert({
          company_id: profile.company_id,
          internal_no: internalNo,
          client_id: clientId,
          cost_center_id: costCenterId || null,
          client_os: clientOS.trim() ? clientOS.trim() : null,
          client_oc: clientOC.trim() ? clientOC.trim() : null,
          title: title.trim() ? title.trim() : null,
          service_value,
          status: "open",
          created_by: profile.id,
        })
        .select(
          "id,internal_no,client_id,cost_center_id,client_os,client_oc,title,service_value,status,created_at"
        )
        .single();

      if (ins.error) throw new Error(ins.error.message);

      setOrders((prev) => [ins.data as ServiceOrderRow, ...prev]);

      // limpar form básico
      setClientOS("");
      setClientOC("");
      setTitle("");
      setServiceValue("0");
      setMsg(`OS #${internalNo} criada com sucesso ✅`);
    } catch (e: any) {
      setMsg(e?.message ?? "Erro ao criar OS.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div style={{ padding: 18 }}>Carregando…</div>;
  }

  if (!profile) {
    return (
      <div style={{ padding: 18 }}>
        <h1 style={{ marginTop: 0 }}>Operação • Ordens de Serviço</h1>
        <div style={{ padding: 10, border: "1px solid rgba(255,255,255,0.15)" }}>
          {msg || "Sem profile."}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 18, display: "grid", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0 }}>Operação • Ordens de Serviço</h1>
          <div style={{ opacity: 0.8, fontSize: 13 }}>
            Crie a OS interna e, se existir, registre OS/OC do cliente. (company_id:{" "}
            <span style={{ fontFamily: "monospace" }}>{profile.company_id}</span>)
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <Link href="/ops" style={{ textDecoration: "underline" }}>
            Voltar
          </Link>
        </div>
      </div>

      {msg ? (
        <div style={{ padding: 10, border: "1px solid rgba(255,255,255,0.15)" }}>{msg}</div>
      ) : null}

      {/* FORM */}
      <div style={{ padding: 14, border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12 }}>
        <div style={{ fontWeight: 800, marginBottom: 10 }}>Criar nova OS</div>

        {!canUse ? (
          <div style={{ opacity: 0.85 }}>Seu papel ({profile.role}) não pode criar OS.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span>Cliente</span>
              <select value={clientId} onChange={(e) => setClientId(e.target.value)} style={{ padding: 10 }}>
                <option value="">Selecione…</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {(c.active === false ? "⛔ " : "") + (c.name ?? "(Sem nome)")}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span>Centro de custo (opcional)</span>
              <select value={costCenterId} onChange={(e) => setCostCenterId(e.target.value)} style={{ padding: 10 }}>
                <option value="">(Sem centro de custo)</option>
                {costCenters
                  .filter((cc) => cc.active !== false)
                  .map((cc) => (
                    <option key={cc.id} value={cc.id}>
                      {cc.name}
                    </option>
                  ))}
              </select>
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span>OS do cliente (opcional)</span>
              <input value={clientOS} onChange={(e) => setClientOS(e.target.value)} style={{ padding: 10 }} />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span>OC do cliente (opcional)</span>
              <input value={clientOC} onChange={(e) => setClientOC(e.target.value)} style={{ padding: 10 }} />
            </label>

            <label style={{ display: "grid", gap: 6, gridColumn: "1 / -1" }}>
              <span>Título / Descrição rápida</span>
              <input value={title} onChange={(e) => setTitle(e.target.value)} style={{ padding: 10 }} />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span>Valor do serviço (R$)</span>
              <input
                value={serviceValue}
                onChange={(e) => setServiceValue(e.target.value)}
                inputMode="decimal"
                style={{ padding: 10 }}
              />
              <span style={{ fontSize: 12, opacity: 0.75 }}>
                Pode deixar 0 aqui e definir depois na viagem (service_trips).
              </span>
            </label>

            <div style={{ display: "flex", alignItems: "end" }}>
              <button
                onClick={createOrder}
                disabled={saving}
                style={{ padding: "10px 14px", cursor: "pointer" }}
              >
                {saving ? "Criando…" : "Criar OS"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* LIST */}
      <div style={{ padding: 14, border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
          <div style={{ fontWeight: 800 }}>Últimas OS</div>
          <button onClick={loadAll} style={{ padding: "8px 12px", cursor: "pointer" }}>
            Atualizar
          </button>
        </div>

        <div style={{ overflowX: "auto", marginTop: 10 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", opacity: 0.85 }}>
                <th style={{ padding: 8, borderBottom: "1px solid rgba(255,255,255,0.12)" }}>OS</th>
                <th style={{ padding: 8, borderBottom: "1px solid rgba(255,255,255,0.12)" }}>Cliente</th>
                <th style={{ padding: 8, borderBottom: "1px solid rgba(255,255,255,0.12)" }}>CC</th>
                <th style={{ padding: 8, borderBottom: "1px solid rgba(255,255,255,0.12)" }}>OS/OC cliente</th>
                <th style={{ padding: 8, borderBottom: "1px solid rgba(255,255,255,0.12)" }}>Valor</th>
                <th style={{ padding: 8, borderBottom: "1px solid rgba(255,255,255,0.12)" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: 10, opacity: 0.8 }}>
                    Nenhuma OS encontrada.
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr key={o.id}>
                    <td style={{ padding: 8, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                      <b>#{o.internal_no}</b>
                    </td>
                    <td style={{ padding: 8, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                      {clientNameById.get(o.client_id) ?? o.client_id}
                    </td>
                    <td style={{ padding: 8, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                      {o.cost_center_id ? ccNameById.get(o.cost_center_id) ?? "(CC)" : "—"}
                    </td>
                    <td style={{ padding: 8, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                      {o.client_os || o.client_oc ? (
                        <span>
                          {o.client_os ? `OS: ${o.client_os}` : ""}
                          {o.client_os && o.client_oc ? " • " : ""}
                          {o.client_oc ? `OC: ${o.client_oc}` : ""}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td style={{ padding: 8, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                      {fmtBRL(Number(o.service_value || 0))}
                    </td>
                    <td style={{ padding: 8, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>{o.status}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 10, fontSize: 12, opacity: 0.8 }}>
          Próximo passo: criar a tela de <b>Viagens</b> vinculadas à OS (placa, motorista fixo/freela, valores).
        </div>
      </div>
    </div>
  );
}