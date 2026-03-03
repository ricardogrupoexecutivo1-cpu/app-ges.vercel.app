'use client'

import { useMemo, useState, useTransition } from 'react'
import { deleteCashAccount, upsertCashAccount } from './actions'

type Account = {
  id: string
  name: string
  code: string
  opening_balance: number
  is_active: boolean
  created_at: string
}

export default function AccountsClient({ initialAccounts }: { initialAccounts: Account[] }) {
  const [pending, startTransition] = useTransition()
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts)

  const [form, setForm] = useState({
    id: '' as string | '',
    name: '',
    code: '',
    opening_balance: 0,
    is_active: true,
  })

  const editing = useMemo(() => !!form.id, [form.id])

  function resetForm() {
    setForm({ id: '', name: '', code: '', opening_balance: 0, is_active: true })
  }

  async function onSave() {
    const name = form.name.trim()
    const code = form.code.trim().toLowerCase()

    if (!name) return alert('Informe o nome da conta.')
    if (!code) return alert('Informe o código (ex: bank, cash, pix).')

    startTransition(async () => {
      try {
        await upsertCashAccount({
          id: form.id || undefined,
          name,
          code,
          opening_balance: Number(form.opening_balance || 0),
          is_active: !!form.is_active,
        })
        window.location.reload()
      } catch (e: any) {
        alert(e?.message ?? 'Erro ao salvar.')
      }
    })
  }

  async function onDelete(id: string) {
    if (!confirm('Excluir esta conta?')) return

    startTransition(async () => {
      try {
        await deleteCashAccount(id)
        window.location.reload()
      } catch (e: any) {
        alert(e?.message ?? 'Erro ao excluir.')
      }
    })
  }

  return (
    <div style={{ padding: 20, maxWidth: 1000 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800 }}>Financeiro • Configuração de Contas</h1>

      {/* FORM */}
      <div style={{ marginTop: 16, padding: 12, border: '1px solid rgba(0,0,0,.15)', borderRadius: 10 }}>
        <div style={{ display: 'grid', gap: 10, gridTemplateColumns: '2fr 1fr 1fr 1fr' }}>
          <div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>Nome da conta</div>
            <input
              placeholder="Ex: Banco principal"
              value={form.name}
              onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>Código</div>
            <input
              placeholder="bank | cash | pix"
              value={form.code}
              onChange={(e) => setForm((s) => ({ ...s, code: e.target.value }))}
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>Saldo inicial (R$)</div>
            <input
              type="number"
              step="0.01"
              value={form.opening_balance}
              onChange={(e) => setForm((s) => ({ ...s, opening_balance: Number(e.target.value) }))}
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>Status</div>
            <select
              value={form.is_active ? '1' : '0'}
              onChange={(e) => setForm((s) => ({ ...s, is_active: e.target.value === '1' }))}
              style={{ width: '100%' }}
            >
              <option value="1">Ativa</option>
              <option value="0">Inativa</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button onClick={onSave} disabled={pending}>
            {pending ? 'Salvando...' : editing ? 'Salvar alterações' : 'Salvar Conta'}
          </button>
          <button onClick={resetForm} disabled={pending}>
            Limpar
          </button>
        </div>
      </div>

      {/* LISTA */}
      <h2 style={{ marginTop: 18, fontSize: 16, fontWeight: 800 }}>Contas cadastradas</h2>

      <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
        {accounts.length === 0 && (
          <div style={{ opacity: 0.7, padding: 10, border: '1px dashed rgba(0,0,0,.25)', borderRadius: 10 }}>
            Nenhuma conta cadastrada ainda. Crie a primeira acima.
          </div>
        )}

        {accounts.map((a) => (
          <div
            key={a.id}
            style={{
              border: '1px solid rgba(0,0,0,.12)',
              padding: 12,
              borderRadius: 10,
              display: 'grid',
              gridTemplateColumns: '2fr 1fr 1fr 1fr auto',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <div>
              <div style={{ fontWeight: 800 }}>{a.name}</div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>{a.id}</div>
            </div>

            <div style={{ fontWeight: 700 }}>{a.code}</div>

            <div>R$ {Number(a.opening_balance || 0).toFixed(2)}</div>

            <div>{a.is_active ? 'Ativa' : 'Inativa'}</div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() =>
                  setForm({
                    id: a.id,
                    name: a.name,
                    code: a.code,
                    opening_balance: Number(a.opening_balance || 0),
                    is_active: !!a.is_active,
                  })
                }
                disabled={pending}
              >
                Editar
              </button>
              <button onClick={() => onDelete(a.id)} disabled={pending}>
                Excluir
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}