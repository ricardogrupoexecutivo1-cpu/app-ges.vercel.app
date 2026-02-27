"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      window.location.href = "/app";
    } catch (err: any) {
      setMsg(`❌ ${err?.message ?? "Erro ao logar"}`);
    } finally {
      setLoading(false);
    }
  }

  async function signUp() {
    setMsg(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      setMsg("✅ Cadastro criado. Se exigir confirmação por email, confirme e depois faça login.");
    } catch (err: any) {
      setMsg(`❌ ${err?.message ?? "Erro ao cadastrar"}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: "40px auto", padding: 20 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>ERP-GES • Login</h1>

      <form onSubmit={signIn} style={{ marginTop: 20, display: "grid", gap: 12 }}>
        <label>
          E-mail
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: "100%", padding: 10, border: "1px solid #ccc", borderRadius: 8 }}
          />
        </label>

        <label>
          Senha
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: "100%", padding: 10, border: "1px solid #ccc", borderRadius: 8 }}
          />
        </label>

        <button
          type="submit"
          disabled={loading || !email || !password}
          style={{ padding: 12, borderRadius: 10, border: "1px solid #000", cursor: "pointer" }}
        >
          {loading ? "Aguarde..." : "Entrar"}
        </button>

        <button
          type="button"
          disabled={loading || !email || !password}
          onClick={signUp}
          style={{ padding: 12, borderRadius: 10, border: "1px solid #000", cursor: "pointer" }}
        >
          Criar conta
        </button>

        {msg && <p style={{ marginTop: 10 }}>{msg}</p>}
      </form>
    </div>
  );
}