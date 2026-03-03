"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type ProfileRow = { id: string; company_id: string; role: string };

type ClientRow = { id: string; name: string | null; active: boolean | null };

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

type CollaboratorRow = {
  id: string;
  name: string;
  category: string;
  active: boolean;
};

type VehicleRow = {
  id: string;
  plate: string;
  nickname: string | null;
  active: boolean;
};

type TripRow = {
  id: string;
  service_order_id: string;
  client_id: string;
  cost_center_id: string | null;
  trip_no: number;
  collaborator_id: string | null;
  vehicle_id: string | null;
  plate_snapshot: string | null;
  driver_type: "fixed" | "freelance" | string;
  client_price: number;
  driver_price: number;
  occurred_at: string;
  status: string;

  // view fields (optional)
  advances_total?: number;
  expenses_total?: number;
  driver_balance?: number;
  trip_profit?: number;
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

export default function TripsPage() {
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const [profile, setProfile] = useState<ProfileRow | null>(null);

  const [clients, setClients] = useState<ClientRow[]>([]);
  const [orders, setOrders] = useState<ServiceOrderRow[]>([]);
  const [collabs, setCollabs] = useState<CollaboratorRow[]>([]);
  const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
  const [trips, setTrips] = useState<TripRow[]>([]);

  // form
  const [orderId, setOrderId] = useState<string>("");
  const [driverId, setDriverId] = useState<string>("");
  const [driverType, setDriverType] = useState<"fixed" | "freelance">("fixed");
  const [vehicleId, setVehicleId] = useState<string>("");
  const [clientPrice, setClientPrice] = useState<string>("0");
  const [driverPrice, setDriverPrice] = useState<string>("0");
  const [occurredAt, setOccurredAt] = useState<string>(isoToday());
  const [saving, setSaving] = useState(false);

  const canUse =
    profile?.role === "admin" || profile?.role === "finance" || profile?.role === "ops";

  const clientNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of clients) m.set(c.id, c.name ?? "(Sem nome)");
    return m;
  }, [clients]);

  const collabNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of collabs) m.set(c.id, c.name);
    return m;
  }, [collabs]);

  const vehicleLabelById = useMemo(() => {
    const m = new Map<string, string>();
    for (const v of vehicles) m.set(v.id, `${v.plate}${v.nickname ? ` • ${v.nickname}` : ""}`);
    return m;
  }, [vehicles]);

  const orderById = useMemo(() => {
    const m = new Map<string, ServiceOrderRow>();
    for (const o of orders) m.set(o.id, o);
    return m;
  }, [orders]);

  async function loadAll() {
    setLoading(true);
    setMsg("");

    const { data: sess } = await supabase.auth.getSession();
    const user = sess.session?.user;

    if (!user) {
      window.location.assign("/login?next=/ops/trips");
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

    const [c1, c2, c3, c4, c5] = await Promise.all([
      supabase.from("clients").select("id,name,active").order("name", { ascending: true }),
      supabase
        .from("service_orders")
        .select("id,internal_no,client_id,cost_center_id,client_os,client_oc,title,service_value,status,created_at")
        .order("created_at", { ascending: false })
        .limit(80),
      supabase
        .from("collaborators")
        .select("id,name,category,active")
        .eq("active", true)
        .order("name", { ascending: true }),
      supabase.from("vehicles").select("id,plate,nickname,active").eq("active", true).order("plate"),
      // view (se não existir, cai no catch abaixo)
      supabase
        .from("v_trip_closure")
        .select(
          "trip_id,service_order_id,client_id,cost_center_id,trip_no,collaborator_id,vehicle_id,plate_snapshot,driver_type,client_price,driver_price,occurred_at,status,advances_total,expenses_total,driver_balance,trip_profit"
        )
        .order("occurred_at", { ascending: false })
        .limit(50),
    ]);

    if (c1.error) setMsg((m) => (m ? m + " | " : "") + `Erro clients: ${c1.error.message}`);
    if (c2.error) setMsg((m) => (m ? m + " | " : "") + `Erro OS: ${c2.error.message}`);
    if (c3.error) setMsg((m) => (m ? m + " | " : "") + `Erro colaboradores: ${c3.error.message}`);
    if (c4.error) setMsg((m) => (m ? m + " | " : "") + `Erro veículos: ${c4.error.message}`);

    setClients((c1.data ?? []) as ClientRow[]);
    setOrders((c2.data ?? []) as ServiceOrderRow[]);
    setCollabs((c3.data ?? []) as CollaboratorRow[]);
    setVehicles((c4.data ?? []) as VehicleRow[]);

    // trips via view
    if (!c5.error) {
      const rows = (c5.data ?? []).map((r: any) => ({
        id: r.trip_id,
        service_order_id: r.service_order_id,
        client_id: r.client_id,
        cost_center_id: r.cost_center_id,
        trip_no: r.trip_no,
        collaborator_id: r.collaborator_id,
        vehicle_id: r.vehicle_id,
        plate_snapshot: r.plate_snapshot,
        driver_type: r.driver_type,
        client_price: Number(r.client_price ?? 0),
        driver_price: Number(r.driver_price ?? 0),
        occurred_at: r.occurred_at,
        status: r.status,
        advances_total: Number(r.advances_total ?? 0),
        expenses_total: Number(r.expenses_total ?? 0),
        driver_balance: Number(r.driver_balance ?? 0),
        trip_profit: Number(r.trip_profit ?? 0),
      })) as TripRow[];
      setTrips(rows);
    } else {
      // fallback: se a view não existe, busca direto
      const t = await supabase
        .from("service_trips")
        .select(
          "id,service_order_id,client_id,cost_center_id,trip_no,collaborator_id,vehicle_id,plate_snapshot,driver_type,client_price,driver_price,occurred_at,status"
        )
        .order("occurred_at", { ascending: false })
        .limit(50);

      if (t.error) setMsg((m) => (m ? m + " | " : "") + `Erro trips: ${t.error.message}`);
      setTrips((t.data ?? []) as any);
    }

    // defaults
    if (!orderId) {
      const first = (c2.data ?? [])[0] as any;
      if (first?.id) setOrderId(first.id);
    }
    if (!driverId) {
      const firstD = (c3.data ?? [])[0] as any;
      if (firstD?.id) setDriverId(firstD.id);
    }
    if (!vehicleId) {
      const firstV = (c4.data ?? [])[0] as any;
      if (firstV?.id) setVehicleId(firstV.id);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createTrip() {
    if (!profile?.company_id) return setMsg("Sem company_id.");
    if (!canUse) return setMsg("Seu papel não pode criar viagens.");
    if (!orderId) return setMsg("Selecione uma OS.");

    const o = orderById.get(orderId);
    if (!o) return setMsg("OS inválida.");

    setSaving(true);
    setMsg("");

    try {
      // trip_no = próximo dentro da OS
      const nextNo =
        1 +
        trips
          .filter((t) => t.service_order_id === orderId)
          .reduce((acc, t) => Math.max(acc, Number(t.trip_no ?? 0)), 0);

      const cp = Number(String(clientPrice).replace(",", "."));
      const dp = Number(String(driverPrice).replace(",", "."));

      const client_price = Number.isFinite(cp) ? cp : 0;
      const driver_price = Number.isFinite(dp) ? dp : 0;

      const veh = vehicles.find((v) => v.id === vehicleId);
      const plate_snapshot = veh?.plate ?? null;

      const ins = await supabase
        .from("service_trips")
        .insert({
          company_id: profile.company_id,
          service_order_id: orderId,
          client_id: o.client_id,
          cost_center_id: o.cost_center_id,
          trip_no: nextNo,
          collaborator_id: driverId || null,
          driver_type: driverType,
          vehicle_id: vehicleId || null,
          plate_snapshot,
          client_price,
          driver_price,
          occurred_at: occurredAt,
          status: "open",
          created_by: profile.id,
        })
        .select(
          "id,service_order_id,client_id,cost_center_id,trip_no,collaborator_id,vehicle_id,plate_snapshot,driver_type,client_price,driver_price,occurred_at,status"
        )
        .single();

      if (ins.error) throw new Error(ins.error.message);

      setMsg(`Viagem criada (OS #${o.internal_no} • Viagem ${nextNo}) ✅`);

      // reload to include view totals
      await loadAll();
    } catch (e: any) {
      setMsg(e?.message ?? "Erro ao criar viagem.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div style={{ padding: 18 }}>Carregando…</div>;

  return (
    <div style={{ padding: 18, display: "grid", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0 }}>Operação • Viagens</h1>
          <div style={{ opacity: 0.8, fontSize: 13 }}>
            Crie viagens vinculadas à OS, com placa e motorista fixo/freela.
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <Link href="/ops/service-orders" style={{ textDecoration: "underline" }}>
            OS
          </Link>
          <Link href="/ops" style={{ textDecoration: "underline" }}>
            Voltar
          </Link>
        </div>
      </div>

      {msg ? <div style={{ padding: 10, border: "1px solid rgba(255,255,255,0.15)" }}>{msg}</div> : null}

      {/* FORM */}
      <div style={{ padding: 14, border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12 }}>
        <div style={{ fontWeight: 800, marginBottom: 10 }}>Criar nova viagem</div>

        {!canUse ? (
          <div style={{ opacity: 0.85 }}>Seu papel ({profile?.role}) não pode criar viagens.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span>OS interna</span>
              <select value={orderId} onChange={(e) => setOrderId(e.target.value)} style={{ padding: 10 }}>
                <option value="">Selecione…</option>
                {orders.map((o) => (
                  <option key={o.id} value={o.id}>
                    #{o.internal_no} • {clientNameById.get(o.client_id) ?? "(Cliente)"}{" "}
                    {o.title ? `• ${o.title}` : ""}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span>Data da viagem</span>
              <input
                type="date"
                value={occurredAt}
                onChange={(e) => setOccurredAt(e.target.value)}
                style={{ padding: 10 }}
              />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span>Motorista</span>
              <select value={driverId} onChange={(e) => setDriverId(e.target.value)} style={{ padding: 10 }}>
                <option value="">(Sem motorista)</option>
                {collabs.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.category ? `• ${c.category}` : ""}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span>Tipo do motorista</span>
              <select value={driverType} onChange={(e) => setDriverType(e.target.value as any)} style={{ padding: 10 }}>
                <option value="fixed">Fixo</option>
                <option value="freelance">Freelancer</option>
              </select>
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span>Veículo / Placa</span>
              <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} style={{ padding: 10 }}>
                <option value="">(Sem veículo)</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.plate} {v.nickname ? `• ${v.nickname}` : ""}
                  </option>
                ))}
              </select>
            </label>

            <div />

            <label style={{ display: "grid", gap: 6 }}>
              <span>Preço do cliente (R$)</span>
              <input value={clientPrice} onChange={(e) => setClientPrice(e.target.value)} style={{ padding: 10 }} />
              <span style={{ fontSize: 12, opacity: 0.75 }}>Quanto o cliente paga por essa viagem.</span>
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span>Preço do motorista (R$)</span>
              <input value={driverPrice} onChange={(e) => setDriverPrice(e.target.value)} style={{ padding: 10 }} />
              <span style={{ fontSize: 12, opacity: 0.75 }}>
                Quanto você paga ao freelancer (para fixo pode ser 0).
              </span>
            </label>

            <div style={{ display: "flex", alignItems: "end" }}>
              <button onClick={createTrip} disabled={saving} style={{ padding: "10px 14px", cursor: "pointer" }}>
                {saving ? "Criando…" : "Criar viagem"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* LIST */}
      <div style={{ padding: 14, border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div style={{ fontWeight: 800 }}>Últimas viagens</div>
          <button onClick={loadAll} style={{ padding: "8px 12px", cursor: "pointer" }}>
            Atualizar
          </button>
        </div>

        <div style={{ overflowX: "auto", marginTop: 10 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", opacity: 0.85 }}>
                <th style={{ padding: 8, borderBottom: "1px solid rgba(255,255,255,0.12)" }}>OS/Viagem</th>
                <th style={{ padding: 8, borderBottom: "1px solid rgba(255,255,255,0.12)" }}>Cliente</th>
                <th style={{ padding: 8, borderBottom: "1px solid rgba(255,255,255,0.12)" }}>Motorista</th>
                <th style={{ padding: 8, borderBottom: "1px solid rgba(255,255,255,0.12)" }}>Placa</th>
                <th style={{ padding: 8, borderBottom: "1px solid rgba(255,255,255,0.12)" }}>Cliente</th>
                <th style={{ padding: 8, borderBottom: "1px solid rgba(255,255,255,0.12)" }}>Motorista</th>
                <th style={{ padding: 8, borderBottom: "1px solid rgba(255,255,255,0.12)" }}>Adiant.</th>
                <th style={{ padding: 8, borderBottom: "1px solid rgba(255,255,255,0.12)" }}>Despesas</th>
                <th style={{ padding: 8, borderBottom: "1px solid rgba(255,255,255,0.12)" }}>Saldo Mot.</th>
                <th style={{ padding: 8, borderBottom: "1px solid rgba(255,255,255,0.12)" }}>Lucro</th>
              </tr>
            </thead>
            <tbody>
              {trips.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ padding: 10, opacity: 0.8 }}>
                    Nenhuma viagem encontrada.
                  </td>
                </tr>
              ) : (
                trips.map((t) => {
                  const o = orderById.get(t.service_order_id);
                  return (
                    <tr key={t.id}>
                      <td style={{ padding: 8, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                        {o ? (
                          <b>
                            #{o.internal_no} • {t.trip_no}
                          </b>
                        ) : (
                          <b>—</b>
                        )}
                      </td>
                      <td style={{ padding: 8, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                        {clientNameById.get(t.client_id) ?? t.client_id}
                      </td>
                      <td style={{ padding: 8, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                        {(t.collaborator_id ? collabNameById.get(t.collaborator_id) : "—") ?? "—"}{" "}
                        <span style={{ opacity: 0.75, fontSize: 12 }}>
                          ({t.driver_type === "freelance" ? "freela" : "fixo"})
                        </span>
                      </td>
                      <td style={{ padding: 8, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                        {t.plate_snapshot ?? (t.vehicle_id ? vehicleLabelById.get(t.vehicle_id) : "—") ?? "—"}
                      </td>
                      <td style={{ padding: 8, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                        {fmtBRL(Number(t.client_price || 0))}
                      </td>
                      <td style={{ padding: 8, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                        {fmtBRL(Number(t.driver_price || 0))}
                      </td>
                      <td style={{ padding: 8, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                        {fmtBRL(Number(t.advances_total ?? 0))}
                      </td>
                      <td style={{ padding: 8, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                        {fmtBRL(Number(t.expenses_total ?? 0))}
                      </td>
                      <td style={{ padding: 8, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                        {fmtBRL(Number(t.driver_balance ?? 0))}
                      </td>
                      <td style={{ padding: 8, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                        {fmtBRL(Number(t.trip_profit ?? 0))}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 10, fontSize: 12, opacity: 0.8 }}>
          Próximo passo: tela de <b>Adiantamentos/Despesas por Viagem</b> (gera também lançamentos no Caixa).
        </div>
      </div>
    </div>
  );
}