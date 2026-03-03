import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function ARByClientPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div style={{ padding: 24 }}>
      <h1>Financeiro • A Receber por Cliente</h1>
      <p>Você está autenticado no server ✅</p>
    </div>
  );
}