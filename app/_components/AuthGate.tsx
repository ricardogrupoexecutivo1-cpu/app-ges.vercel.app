"use client";

import React, { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = { children: React.ReactNode };

export default function AuthGate({ children }: Props) {
  const pathname = usePathname();

  const isPublic = useMemo(() => {
    if (!pathname) return true;
    return (
      pathname === "/login" ||
      pathname.startsWith("/login") ||
      pathname.startsWith("/api") ||
      pathname.startsWith("/help") ||
      pathname.startsWith("/upgrade") ||
      pathname.startsWith("/billing") ||
      pathname === "/"
    );
  }, [pathname]);

  const [status, setStatus] = useState<"checking" | "authed" | "anon">("checking");

  useEffect(() => {
    let alive = true;
    const supabase = createClient();

    async function hardCheck() {
      try {
        // getUser() tende a ser mais confiável pra confirmar sessão válida
        const { data, error } = await supabase.auth.getUser();
        const hasUser = !!data?.user && !error;

        if (!alive) return;

        if (isPublic) {
          setStatus("authed");
          return;
        }

        setStatus(hasUser ? "authed" : "anon");
      } catch {
        if (!alive) return;
        setStatus(isPublic ? "authed" : "anon");
      }
    }

    // 1) Primeira checagem
    hardCheck();

    // 2) Em qualquer mudança (inclui INITIAL_SESSION), atualiza
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!alive) return;

      if (isPublic) {
        setStatus("authed");
        return;
      }

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