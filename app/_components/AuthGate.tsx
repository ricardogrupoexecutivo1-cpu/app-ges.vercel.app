"use client";

import React, { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = { children: React.ReactNode };

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

export default function AuthGate({ children }: Props) {
  const pathname = usePathname();

  const isPublic = useMemo(() => {
    if (!pathname) return true;
    return (
      pathname === "/" ||
      pathname === "/login" ||
      pathname.startsWith("/login") ||
      pathname.startsWith("/reset") || // ✅ libera reset
      pathname.startsWith("/api") ||
      pathname.startsWith("/help") ||
      pathname.startsWith("/upgrade") ||
      pathname.startsWith("/billing")
    );
  }, [pathname]);

  const [status, setStatus] = useState<"checking" | "authed" | "anon">("checking");

  useEffect(() => {
    let alive = true;

    // ✅ ROTA PÚBLICA: NÃO consulta Supabase (evita travar /reset e /login)
    if (isPublic) {
      setStatus("authed");
      return () => {
        alive = false;
      };
    }

    const supabase = createClient();

    async function hardCheck() {
      try {
        const { data, error } = await supabase.auth.getUser();

        // token quebrado -> limpa e trata como anon
        if (error && (error as any).code === "refresh_token_not_found") {
          clearSupabaseBrowserSession();
          try {
            await supabase.auth.signOut();
          } catch {}
          if (!alive) return;
          setStatus("anon");
          return;
        }

        const hasUser = !!data?.user && !error;
        if (!alive) return;
        setStatus(hasUser ? "authed" : "anon");
      } catch {
        if (!alive) return;
        setStatus("anon");
      }
    }

    hardCheck();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!alive) return;
      setStatus(session ? "authed" : "anon");
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [isPublic]);

  if (status === "checking") {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ opacity: 0.8 }}>Carregando sessão…</div>
      </div>
    );
  }

  if (status === "anon" && !isPublic) {
    if (typeof window !== "undefined") {
      const next = encodeURIComponent(pathname || "/app");
      window.location.assign(`/login?next=${next}`);
    }
    return null;
  }

  return <>{children}</>;
}