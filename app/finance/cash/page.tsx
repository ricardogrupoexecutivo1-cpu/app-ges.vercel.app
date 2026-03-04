import CashClient from "./ui";
import { listBankAccounts, listCashTransactions } from "./actions";

export default async function FinanceCashPage() {
  const accounts = await listBankAccounts();
  const initialTx = await listCashTransactions({});

  return <CashClient accounts={accounts} initialTx={initialTx} />;
}