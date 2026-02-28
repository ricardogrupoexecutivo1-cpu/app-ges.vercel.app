"use client";

import { useState } from "react";
import { supabase, supabaseOrThrow } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string>("");

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");

    if (!email || !password) {
      setMsg("Informe email e senha.");
      return;
    }

    setLoading(true);
    try {
      const sb = supabaseOrThrow();
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw error;
      window.location.href = "/app";
    } catch (err: any) {
      setMsg(err?.message ?? "Erro ao entrar.");
    } finally {
      setLoading(false);
    }
  }

  if (!supabase) {
    return (
      <div style={{ maxWidth: 420, margin: "60px auto", padding: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Entrar</h1>
        <p style={{ color: "crimson", fontWeight: 600, marginTop: 10 }}>
          Supabase não configurado.
        </p>
        <p style={{ marginTop: 6 }}>
          Configure <b>NEXT_PUBLIC_SUPABASE_URL</b> e <b>NEXT_PUBLIC_SUPABASE_ANON_KEY</b> na Vercel e faça Redeploy.
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 420, margin: "60px auto", padding: 20 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>Entrar</h1>

      <form onSubmit={onLogin} style={{ marginTop: 16, display: "grid", gap: 10 }}>
        <label style={{ display: "grid", gap: 6 }}>
          Email
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            autoComplete="email"
            style={{ padding: 10, borderRadius: 10, border: "1px solid #ccc" }}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          Senha
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            autoComplete="current-password"
            style={{ padding: 10, borderRadius: 10, border: "1px solid #ccc" }}
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          style={{ padding: 12, borderRadius: 10, border: "1px solid #000", cursor: "pointer" }}
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>

        {msg ? <p style={{ marginTop: 6 }}>{msg}</p> : null}
      </form>
    </div>
  );
}


