"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getMyRole } from "@/lib/rbac";

export default function OpsPage() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("");
  const [msg, setMsg] = useState<string>("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      setEmail(data.session?.user?.email ?? "");
      const r = await getMyRole();
      setRole(r ?? "sem papel");
    })();
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>Operação</h1>
      <p style={{ marginTop: 8 }}>Usuário: <b>{email || "não logado"}</b></p>
      <p style={{ marginTop: 6 }}>Papel: <b>{role}</b></p>

      <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
        <Link href="/app" style={{ textDecoration: "none", padding: 10, border: "1px solid #000", borderRadius: 10 }}>
          Voltar
        </Link>
      </div>

      <div style={{ marginTop: 18, padding: 12, border: "1px solid #ccc", borderRadius: 10 }}>
        <p><b>Operacional</b> pode lançar:</p>
        <ul>
          <li>OS / Viagens</li>
          <li>Despesas com comprovante</li>
          <li>Adiantamentos</li>
        </ul>
        <p style={{ marginTop: 8, opacity: 0.85 }}>
          Próximo passo: vamos criar tela de “Nova OS” e “Nova Viagem”.
        </p>
      </div>

      {msg && <p style={{ marginTop: 12 }}>{msg}</p>}
    </div>
  );
}