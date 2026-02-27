"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getMyRole, AppRole } from "@/lib/rbac";

export default function FinancePage() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AppRole | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      setEmail(data.session?.user?.email ?? "");
      const r = await getMyRole();
      setRole(r);
    })();
  }, []);

  const allowed = role === "admin" || role === "finance";

  return (
    <div style={{ padding: 20 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>Financeiro</h1>
      <p style={{ marginTop: 8 }}>Usuário: <b>{email || "não logado"}</b></p>
      <p style={{ marginTop: 6 }}>Papel: <b>{role || "sem papel"}</b></p>

      <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
        <Link href="/app" style={{ textDecoration: "none", padding: 10, border: "1px solid #000", borderRadius: 10 }}>
          Voltar
        </Link>
      </div>

      {!allowed ? (
        <div style={{ marginTop: 18, padding: 12, border: "1px solid #f00", borderRadius: 10 }}>
          <b>ACESSO NEGADO.</b>
          <p style={{ marginTop: 8 }}>
            Seu perfil é <b>operacional</b>. Você não pode acessar bancos, contas a pagar/receber, notas e DRE.
          </p>
        </div>
      ) : (
        <div style={{ marginTop: 18, padding: 12, border: "1px solid #ccc", borderRadius: 10 }}>
          <p><b>Financeiro</b> pode:</p>
          <ul>
            <li>Contas a pagar / receber</li>
            <li>Emissão de Nota de Débito</li>
            <li>Relatórios por cliente (pagos e a receber)</li>
            <li>DRE</li>
          </ul>

          <p style={{ marginTop: 8, opacity: 0.85 }}>
            Próximo passo: criar tela “Notas de Débito” + “A Receber por Cliente”.
          </p>
        </div>
      )}
    </div>
  );
}