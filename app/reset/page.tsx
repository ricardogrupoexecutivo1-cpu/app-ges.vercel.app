"use client";

import { useEffect, useState } from "react";

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

export default function ResetPage() {
  const [done, setDone] = useState(false);

  useEffect(() => {
    // roda uma vez por aba
    if (sessionStorage.getItem("ges_reset_done") === "1") {
      setDone(true);
      return;
    }
    sessionStorage.setItem("ges_reset_done", "1");

    clearSupabaseBrowserSession();
    setDone(true);
  }, []);

  return (
    <div style={{ padding: 24, maxWidth: 520 }}>
      <h1>Reset de sessão</h1>

      {done ? (
        <>
          <p>✅ Sessão local limpa (sb-* removidos).</p>
          <p>Clique para ir ao login:</p>

          <button
            onClick={() => (window.location.href = "/login?next=/app")}
            style={{
              padding: 12,
              borderRadius: 10,
              border: "1px solid #000",
              cursor: "pointer",
              fontWeight: 800,
            }}
          >
            Ir para /login
          </button>
        </>
      ) : (
        <p>Executando reset…</p>
      )}
    </div>
  );
}