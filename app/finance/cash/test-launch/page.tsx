import TestLaunchClient from './ui'
import { listBankAccountsForSelect } from './actions'

export default async function Page() {
  let accounts: any[] = []
  try {
    const res = await listBankAccountsForSelect()
    accounts = Array.isArray(res) ? res : []
  } catch {
    accounts = []
  }

  return <TestLaunchClient accounts={accounts} />
}