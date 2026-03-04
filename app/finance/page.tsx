"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function FinancePage() {
  const router = useRouter();
  const [email, setEmail] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);

        const supabase = createClient();
        const { data, error } = await supabase.auth.getSession();

        const user = data.session?.user;

        // Se não tem sessão (ou deu erro), manda pro login
        if (!user || error) {
          router.replace("/login?next=/finance");
          return;
        }

        if (!alive) return;
        setEmail(user.email ?? "");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [router]);

  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <h1>Financeiro</h1>
        <p>Carregando…</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>Financeiro</h1>
      <p style={{ opacity: 0.85 }}>Usuário: {email || "—"}</p>
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