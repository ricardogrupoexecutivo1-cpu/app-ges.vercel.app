"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function ArByClientPage() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Se Supabase não estiver configurado, não quebra build
    if (!supabase) {
      setLoading(false);
      return;
    }

    (async () => {
      const { data } = await supabase.auth.getSession();

      if (!data.session?.user) {
        window.location.href = "/login";
        return;
      }

      // Aqui você pode buscar os dados do relatório por cliente
      // Exemplo:
      // const { data: rows, error } = await supabase
      //   .from("invoices")
      //   .select("*")
      //   .eq("status", "open");

      setLoading(false);
    })();
  }, []);

  if (!supabase) {
    return (
      <div style={{ padding: 20 }}>
        <h1>Financeiro — A/R por Cliente</h1>
        <p style={{ color: "crimson", fontWeight: 600 }}>
          Supabase não configurado.
        </p>
        <p style={{ marginTop: 6 }}>
          Configure <b>NEXT_PUBLIC_SUPABASE_URL</b> e{" "}
          <b>NEXT_PUBLIC_SUPABASE_ANON_KEY</b> na Vercel e faça Redeploy.
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: 20 }}>
      <h1 style={{ fontSize: 20, fontWeight: 700 }}>Financeiro — A/R por Cliente</h1>

      {loading ? (
        <p style={{ marginTop: 10 }}>Carregando…</p>
      ) : (
        <p style={{ marginTop: 10 }}>OK. (Agora é só plugar a consulta do relatório.)</p>
      )}
    </div>
  );
}