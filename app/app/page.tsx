"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AppPage() {
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data }) => {
      setEmail(data.session?.user?.email ?? "");
    });
  }, []);

  return (
    <div style={{ padding: "40px" }}>
      <h1>ERP GES</h1>
      <p>Bem-vindo ao sistema.</p>

      {email ? (
        <p>Usuário logado: {email}</p>
      ) : (
        <p>Nenhum usuário logado.</p>
      )}
    </div>
  );
}