'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { createCashTransaction } from './actions'

type Account = { id: string; name: string; code: string }

function parseBRNumber(v: string) {
  const s = (v ?? '').toString().trim().replace(/\./g, '').replace(',', '.')
  const n = Number(s)
  return Number.isFinite(n) ? n : NaN
}

export default function TestLaunchClient({ accounts }: { accounts: Account[] }) {
  const safeAccounts = Array.isArray(accounts) ? accounts : []
  const [pending, startTransition] = useTransition()

  const firstId = useMemo(() => safeAccounts?.[0]?.id ?? '', [safeAccounts])

  const [form, setForm] = useState({
    bank_account_id: '',
    tx_type: 'expense' as 'income' | 'expense',
    amountText: '',
    occurred_at: new Date().toISOString().slice(0, 10),
    description: '',
  })

  useEffect(() => {
    if (!form.bank_account_id && firstId) {
      setForm((s) => ({ ...s, bank_account_id: firstId }))
    }
  }, [firstId, form.bank_account_id])

  function submit() {
    if (!form.bank_account_id) return alert('Nenhuma conta ativa encontrada / selecionada.')

    const amount = parseBRNumber(form.amountText)
    if (!Number.isFinite(amount) || amount <= 0) return alert('Informe um valor válido maior que 0. Ex: 985,33')

    startTransition(async () => {
      try {
        await createCashTransaction({
          bank_account_id: form.bank_account_id,
          tx_type: form.tx_type,
          amount,
          occurred_at: form.occurred_at,
          description: form.description,
        })

        alert('Lançamento criado! Agora abra /finance/cash/balances')
        setForm((s) => ({ ...s, amountText: '', description: '' }))
      } catch (e: any) {
        alert(e?.message ?? 'Erro ao lançar.')
      }
    })
  }

  return (
    <div style={{ padding: 20, maxWidth: 800 }}>
      <h1 style={{ fontSize: 20, fontWeight: 800 }}>Teste • Lançar no Caixa com Conta</h1>
      <p style={{ opacity: 0.75 }}>
        Use isto só para validar que o saldo por conta muda. Depois conectamos no seu formulário oficial.
      </p>

      {safeAccounts.length === 0 ? (
        <div style={{ padding: 12, border: '1px dashed rgba(0,0,0,.25)', borderRadius: 10, marginTop: 12 }}>
          Nenhuma conta retornou do Supabase (accounts vazio).<br />
          Verifique se você está logado e se RLS permite SELECT em <b>cash_accounts</b>.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
          <div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>Conta</div>
            <select
              value={form.bank_account_id}
              onChange={(e) => setForm((s) => ({ ...s, bank_account_id: e.target.value }))}
              style={{ width: '100%' }}
            >
              {safeAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.code})
                </option>
              ))}
            </select>

            <div style={{ fontSize: 12, opacity: 0.6, marginTop: 6 }}>
              bank_account_id atual: <b>{form.bank_account_id || '(vazio)'}</b>
            </div>
          </div>

          <div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>Tipo</div>
            <select
              value={form.tx_type}
              onChange={(e) => setForm((s) => ({ ...s, tx_type: e.target.value as any }))}
              style={{ width: '100%' }}
            >
              <option value="income">Entrada</option>
              <option value="expense">Saída</option>
            </select>
          </div>

          <div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>Valor (R$) — pode usar vírgula</div>
            <input
              value={form.amountText}
              onChange={(e) => setForm((s) => ({ ...s, amountText: e.target.value }))}
              placeholder="Ex: 985,33"
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>Data</div>
            <input
              type="date"
              value={form.occurred_at}
              onChange={(e) => setForm((s) => ({ ...s, occurred_at: e.target.value }))}
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>Descrição</div>
            <input
              value={form.description}
              onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
              placeholder="Ex: Pedágio, Adiantamento..."
              style={{ width: '100%' }}
            />
          </div>

          <button onClick={submit} disabled={pending}>
            {pending ? 'Salvando...' : 'Criar lançamento'}
          </button>
        </div>
      )}
    </div>
  )
}