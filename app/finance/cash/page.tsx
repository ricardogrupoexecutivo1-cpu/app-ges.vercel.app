import CashClient from './ui'
import { getMyRole, listBankAccounts, listCashTransactions, softDeleteCashTransaction } from './actions'

export default async function FinanceCashPage() {
  const role = await getMyRole()
  const accounts = await listBankAccounts()
  const initialTx = await listCashTransactions({})

  return (
    <CashClient
      role={role}
      accounts={accounts}
      initialTx={initialTx}
      onDelete={softDeleteCashTransaction}
    />
  )
}