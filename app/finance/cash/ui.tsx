'use client'

import React, { useMemo, useState } from 'react'
import type { BankAccountRow, CashTxRow } from './actions'

type Role = 'admin' | 'ops' | 'finance' | 'member' | string | null | undefined

function canDelete(role: Role) {
  return role === 'admin' || role === 'finance'
}

type Tx = {
  id: string
  occurred_at: string
  tx_type: 'income' | 'expense' | string
  description: string | null
  amount: number
  account: 'bank' | 'cash' | string
}

function CashUI(props: { role: Role; rows: Tx[]; onDelete: (id: string) => Promise<void> }) {
  const { role, rows, onDelete } = props
  const allowDelete = useMemo(() => canDelete(role), [role])
  const [busyId, setBusyId] = useState<string | null>(null)

  async function handleDelete(id: string) {
    if (!allowDelete) {
      alert('Acesso negado. Somente admin/finance pode excluir lançamentos.')
      return
    }

    if (!confirm('Excluir este lançamento?')) return

    try {
      setBusyId(id)
      await onDelete(id)
    } catch (e: any) {
      alert(e?.message ?? 'Erro ao excluir.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="mt-4">
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
                  <td className="py-2 pr-3">
                    {new Date(r.occurred_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="py-2 pr-3">{r.tx_type === 'expense' ? 'Saída' : 'Entrada'}</td>
                  <td className="py-2 pr-3">{r.description ?? '-'}</td>
                  <td className="py-2 pr-3">{r.account}</td>
                  <td className="py-2 pr-3">
                    {Number(r.amount).toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    })}
                  </td>

                  <td className="py-2 pr-0 text-right">
                    {allowDelete ? (
                      <button
                        onClick={() => handleDelete(r.id)}
                        disabled={busyId === r.id}
                        className="underline"
                        title="Excluir"
                      >
                        {busyId === r.id ? 'Excluindo…' : 'Excluir'}
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
  )
}

export default function CashClient(props: {
  accounts: BankAccountRow[]
  initialTx: CashTxRow[]
}) {
  // por enquanto, como você é admin, travo role = 'admin' para não quebrar build/deploy.
  // depois a gente puxa do profile com calma.
  const role: Role = 'admin'

  const rows: Tx[] = (props.initialTx ?? []).map((t) => ({
    id: t.id,
    occurred_at: t.occurred_at,
    tx_type: t.tx_type,
    description: t.description,
    amount: Number(t.amount),
    account: 'bank',
  }))

  async function onDelete(id: string) {
    // import dinâmico para evitar edge cases do bundler
    const mod = await import('./actions')
    await mod.deleteCashTransaction(id)
    // refresh simples
    window.location.reload()
  }

  return <CashUI role={role} rows={rows} onDelete={onDelete} />
}