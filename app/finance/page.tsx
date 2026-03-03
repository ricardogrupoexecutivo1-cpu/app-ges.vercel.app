import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function FinancePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div style={{ padding: 24 }}>
      <h1>Financeiro</h1>
      <p>Caixa, contas e relatórios</p>

      <div style={{ marginTop: 20 }}>
        <Link href="/finance/ar-by-client">A Receber por Cliente</Link>
      </div>

      <div style={{ marginTop: 20 }}>
        <Link href="/finance/debit-notes">Notas de Débito</Link>
      </div>
    </div>
  );
}