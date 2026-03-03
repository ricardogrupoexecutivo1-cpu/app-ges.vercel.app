import { getCashBalances } from './actions'

function money(v: any) {
  const n = Number(v || 0)
  return `R$ ${n.toFixed(2)}`
}

export default async function CashBalancesPage() {
  const rows = await getCashBalances()

  return (
    <div style={{ padding: 20, maxWidth: 1000 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800 }}>Financeiro • Caixa • Saldos por conta</h1>

      <div style={{ display: 'grid', gap: 10, marginTop: 14 }}>
        {rows.map((r: any) => (
          <div
            key={r.bank_account_id}
            style={{
              border: '1px solid rgba(0,0,0,.12)',
              borderRadius: 10,
              padding: 12,
              display: 'grid',
              gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr',
              gap: 10,
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ fontWeight: 800 }}>{r.account_name}</div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>{r.account_code}</div>
            </div>

            <div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>Saldo inicial</div>
              <div style={{ fontWeight: 700 }}>{money(r.opening_balance)}</div>
            </div>

            <div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>Entradas</div>
              <div style={{ fontWeight: 700 }}>{money(r.income_total)}</div>
            </div>

            <div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>Saídas</div>
              <div style={{ fontWeight: 700 }}>{money(r.expense_total)}</div>
            </div>

            <div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>Saldo atual</div>
              <div style={{ fontWeight: 900 }}>{money(r.current_balance)}</div>
            </div>
          </div>
        ))}

        {!rows.length && (
          <div style={{ opacity: 0.7, padding: 10, border: '1px dashed rgba(0,0,0,.25)', borderRadius: 10 }}>
            Nenhuma conta encontrada.
          </div>
        )}
      </div>
    </div>
  )
}