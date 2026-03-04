"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  createCashTransaction,
  deleteCashTransaction,
  type BankAccountRow,
  type CashTxRow,
  type CashFilters,
  listCashTransactions,
} from "./actions";

type Role = "admin" | "ops" | "finance" | "member" | string | null | undefined;

function canDelete(role: Role) {
  return role === "admin" || role === "finance";
}

function formatBRL(v: number) {
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function toISODateInput(d = new Date()) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function CashClient(props: { accounts: BankAccountRow[]; initialTx: CashTxRow[] }) {
  const { accounts, initialTx } = props;

  const [role, setRole] = useState<Role>(null); // se você já tem um jeito global de obter role, podemos plugar depois
  const allowDelete = useMemo(() => canDelete(role), [role]);

  const [rows, setRows] = useState<CashTxRow[]>(initialTx ?? []);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  // filtros
  const [filters, setFilters] = useState<CashFilters>({});
  const [q, setQ] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [txType, setTxType] = useState<"income" | "expense" | "">("");
  const [bankAccountId, setBankAccountId] = useState<string>("");

  // form de criação
  const [newAccount, setNewAccount] = useState<string>(accounts?.[0]?.id ?? "");
  const [newType, setNewType] = useState<"income" | "expense">("expense");
  const [newDate, setNewDate] = useState<string>(toISODateInput());
  const [newAmount, setNewAmount] = useState<string>("");
  const [newDesc, setNewDesc] = useState<string>("");

  async function refresh(custom?: Partial<CashFilters>) {
    setMsg("");
    const f: CashFilters = {
      ...filters,
      ...custom,
    };

    // sincroniza estado dos filtros “visuais”
    setFilters(f);

    const data = await listCashTransactions(f);
    setRows(data ?? []);
  }

  async function handleCreate() {
    setMsg("");
    try {
      await createCashTransaction({
        bank_account_id: newAccount,
        tx_type: newType,
        amount: Number(String(newAmount).replace(",", ".")),
        occurred_at: newDate,
        description: newDesc,
      });

      setNewAmount("");
      setNewDesc("");
      await refresh();
      setMsg("Lançamento adicionado ✅");
    } catch (e: any) {
      setMsg(e?.message ?? "Erro ao adicionar.");
    }
  }

  async function handleDelete(id: string) {
    setMsg("");

    if (!allowDelete) {
      alert("Acesso negado. Somente admin/finance pode excluir lançamentos.");
      return;
    }

    if (!confirm("Excluir este lançamento?")) return;

    try {
      setBusyId(id);
      await deleteCashTransaction(id);
      await refresh();
    } catch (e: any) {
      alert(e?.message ?? "Erro ao excluir.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      {/* FORM ADD */}
      <div className="mt-4">
        <h2 className="font-semibold">Adicionar lançamento</h2>

        <div className="mt-2 flex flex-wrap gap-2 items-end">
          <div>
            <div className="text-xs opacity-70">Conta</div>
            <select className="border px-2 py-1" value={newAccount} onChange={(e) => setNewAccount(e.target.value)}>
              {accounts?.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.kind ?? "bank"})
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="text-xs opacity-70">Tipo</div>
            <select className="border px-2 py-1" value={newType} onChange={(e) => setNewType(e.target.value as any)}>
              <option value="expense">Saída</option>
              <option value="income">Entrada</option>
            </select>
          </div>

          <div>
            <div className="text-xs opacity-70">Data</div>
            <input className="border px-2 py-1" type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
          </div>

          <div>
            <div className="text-xs opacity-70">Valor (R$)</div>
            <input className="border px-2 py-1" value={newAmount} onChange={(e) => setNewAmount(e.target.value)} placeholder="Ex: 985,33" />
          </div>

          <div style={{ minWidth: 260 }}>
            <div className="text-xs opacity-70">Descrição</div>
            <input className="border px-2 py-1 w-full" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Ex: pedágio, adiantamento..." />
          </div>

          <button className="border px-3 py-1" onClick={handleCreate}>
            Adicionar
          </button>
        </div>

        {msg ? <div className="mt-2 text-sm">{msg}</div> : null}
      </div>

      {/* FILTROS */}
      <div className="mt-6">
        <h3 className="font-semibold">Filtros</h3>

        <div className="mt-2 flex flex-wrap gap-2 items-end">
          <div>
            <div className="text-xs opacity-70">Conta</div>
            <select
              className="border px-2 py-1"
              value={bankAccountId}
              onChange={(e) => {
                const v = e.target.value;
                setBankAccountId(v);
              }}
            >
              <option value="">(Todas)</option>
              {accounts?.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="text-xs opacity-70">Tipo</div>
            <select className="border px-2 py-1" value={txType} onChange={(e) => setTxType(e.target.value as any)}>
              <option value="">(Todos)</option>
              <option value="income">Entrada</option>
              <option value="expense">Saída</option>
            </select>
          </div>

          <div>
            <div className="text-xs opacity-70">De</div>
            <input className="border px-2 py-1" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>

          <div>
            <div className="text-xs opacity-70">Até</div>
            <input className="border px-2 py-1" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>

          <div style={{ minWidth: 260 }}>
            <div className="text-xs opacity-70">Buscar na descrição</div>
            <input className="border px-2 py-1 w-full" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ex: pedagio, adiantamento..." />
          </div>

          <button
            className="border px-3 py-1"
            onClick={() =>
              refresh({
                bank_account_id: bankAccountId || undefined,
                tx_type: (txType || undefined) as any,
                date_from: dateFrom || undefined,
                date_to: dateTo || undefined,
                q: q?.trim() ? q.trim() : undefined,
              })
            }
          >
            Atualizar
          </button>

          <button
            className="border px-3 py-1"
            onClick={() => {
              setBankAccountId("");
              setTxType("");
              setDateFrom("");
              setDateTo("");
              setQ("");
              setFilters({});
              refresh({});
            }}
          >
            Limpar filtros
          </button>
        </div>
      </div>

      {/* TABELA */}
      <div className="mt-6">
        <h3 className="font-semibold">Últimos lançamentos (até 200)</h3>

        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 pr-3">Data</th>
                <th className="py-2 pr-3">Tipo</th>
                <th className="py-2 pr-3">Descrição</th>
                <th className="py-2 pr-3">Conta</th>
                <th className="py-2 pr-3">Valor</th>
                <th className="py-2 pr-0 text-right">Ações</th>
              </tr>
            </thead>

            <tbody>
              {rows?.length ? (
                rows.map((r) => (
                  <tr key={r.id} className="border-b">
                    <td className="py-2 pr-3">{new Date(r.occurred_at).toLocaleDateString("pt-BR")}</td>
                    <td className="py-2 pr-3">{r.tx_type === "expense" ? "Saída" : "Entrada"}</td>
                    <td className="py-2 pr-3">{r.description ?? "-"}</td>
                    <td className="py-2 pr-3">{r.bank_account_id}</td>
                    <td className="py-2 pr-3">{formatBRL(Number(r.amount))}</td>

                    <td className="py-2 pr-0 text-right">
                      {allowDelete ? (
                        <button onClick={() => handleDelete(r.id)} disabled={busyId === r.id} className="underline" title="Excluir">
                          {busyId === r.id ? "Excluindo…" : "Excluir"}
                        </button>
                      ) : (
                        <span className="opacity-50" title="Somente admin/finance">
                          —
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="py-3 opacity-70" colSpan={6}>
                    Nenhum lançamento encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {!allowDelete && (
            <p className="mt-2 text-xs opacity-70">
              Dica: somente <b>admin</b> ou <b>finance</b> podem excluir lançamentos.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}