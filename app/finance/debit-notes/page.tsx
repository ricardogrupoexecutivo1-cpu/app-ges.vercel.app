"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function DebitNotesPage() {
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    // Evita quebrar build/TypeScript quando supabase está null
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

      setEmail(data.session.user.email ?? "");
      setLoading(false);

      // Aqui você pluga as consultas da sua página (notas de débito)
      // Ex:
      // const { data: notes, error } = await supabase.from("debit_notes").select("*");
    })();
  }, []);

  if (!supabase) {
    return (
      <div style={{ padding: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Notas de Débito</h1>
        <p style={{ color: "crimson", fontWeight: 600, marginTop: 10 }}>
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
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>Notas de Débito</h1>

      <div style={{ marginTop: 14 }}>
        <Link
          href="/finance"
          style={{
            textDecoration: "none",
            padding: 10,
            border: "1px solid #000",
            borderRadius: 10,
            display: "inline-block",
          }}
        >
          Voltar
        </Link>
      </div>

      {loading ? (
        <p style={{ marginTop: 16 }}>Carregando…</p>
      ) : (
        <div style={{ marginTop: 16 }}>
          <p>
            Usuário: <b>{email}</b>
          </p>
          <p style={{ marginTop: 10 }}>
            Página pronta ✅ (agora é só plugar a listagem/criação das notas).
          </p>
        </div>
      )}
    </div>
  );
}