import { listCashAccounts } from './actions'
import AccountsClient from './ui'

export default async function FinanceAccountsPage() {
  const accounts = await listCashAccounts()
  return <AccountsClient initialAccounts={accounts} />
}