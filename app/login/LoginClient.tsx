"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function clearSupabaseBrowserSession() {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith("sb-")) localStorage.removeItem(k);
    }
  } catch {}

  try {
    document.cookie.split(";").forEach((c) => {
      const name = c.split("=")[0]?.trim();
      if (name && name.startsWith("sb-")) {
        document.cookie = `${name}=; Max-Age=0; path=/`;
      }
    });
  } catch {}
}

export default function LoginClient() {
  const searchParams = useSearchParams();
  const next = useMemo(() => searchParams.get("next") || "/app", [searchParams]);

  const [email, setEmail] = useState("ricardogrupoexecutivo1@gmail.com");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // ✅ se tiver sessão quebrada, limpa pra não travar
  useEffect(() => {
    clearSupabaseBrowserSession();
  }, []);

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    try {
      const supabase = createClient();

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setMsg(error.message);
        return;
      }

      window.location.assign(next);
    } catch (err: any) {
      setMsg(err?.message ?? "Erro ao fazer login.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 420 }}>
      <h1 style={{ marginTop: 0 }}>Login</h1>

      <form onSubmit={onLogin} style={{ display: "grid", gap: 12 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span>Email</span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            style={{ padding: 10 }}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span>Senha</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            style={{ padding: 10 }}
          />
        </label>

        <button type="submit" disabled={loading} style={{ padding: 10 }}>
          {loading ? "Entrando..." : "Entrar"}
        </button>

        {msg ? <div style={{ padding: 10, border: "1px solid #ddd" }}>{msg}</div> : null}

        <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
          Dica: se travar, abra <b>/reset</b> e depois volte para <b>/login</b>.
        </div>
      </form>
    </div>
  );
}