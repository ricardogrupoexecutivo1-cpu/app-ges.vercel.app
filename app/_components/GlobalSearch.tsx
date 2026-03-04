"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Item = {
  label: string;
  hint?: string;
  href: string;
  keywords: string[];
};

export default function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  // Lista simples (por enquanto). Depois a gente liga com Supabase pra buscar clientes/viagens.
  const items: Item[] = useMemo(
    () => [
      { label: "Dashboard", hint: "/app", href: "/app", keywords: ["dash", "inicio", "home", "painel", "dashboard"] },
      { label: "Operação", hint: "/ops", href: "/ops", keywords: ["ops", "operacao", "operação", "rotina"] },
      { label: "Clientes", hint: "/ops/clients", href: "/ops/clients", keywords: ["cliente", "clientes", "empresa"] },
      { label: "Ordens de Serviço", hint: "/ops/service-orders", href: "/ops/service-orders", keywords: ["os", "ordem", "servico"] },
      { label: "Viagens", hint: "/ops/trips", href: "/ops/trips", keywords: ["viagem", "viagens", "rota"] },
      { label: "Financeiro", hint: "/finance", href: "/finance", keywords: ["fin", "finance", "financeiro", "caixa"] },
      { label: "Caixa", hint: "/finance/cash", href: "/finance/cash", keywords: ["caixa", "saldo", "contas"] },
      { label: "A Receber por Cliente", hint: "/finance/ar-by-client", href: "/finance/ar-by-client", keywords: ["receber", "cobrar", "ar"] },
      { label: "Pessoal", hint: "/personal", href: "/personal", keywords: ["pessoal", "minhas", "financas"] },
      { label: "Billing", hint: "/billing", href: "/billing", keywords: ["billing", "plano", "assinatura"] },
      { label: "Upgrade", hint: "/upgrade", href: "/upgrade", keywords: ["upgrade", "pro", "premium", "plano"] },
      { label: "Ajuda", hint: "/help", href: "/help", keywords: ["ajuda", "manual", "tutorial"] },
    ],
    []
  );

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items.slice(0, 8);

    const scored = items
      .map((it) => {
        const hay = [it.label, it.hint ?? "", ...it.keywords].join(" ").toLowerCase();
        const score =
          (it.label.toLowerCase().includes(s) ? 5 : 0) +
          (it.hint?.toLowerCase().includes(s) ? 3 : 0) +
          (it.keywords.some((k) => k.toLowerCase().includes(s)) ? 2 : 0) +
          (hay.includes(s) ? 1 : 0);
        return { it, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score);

    return scored.map((x) => x.it).slice(0, 10);
  }, [q, items]);

  function go(href: string) {
    setOpen(false);
    setQ("");
    router.push(href);
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // Ctrl+K / Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
        return;
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
      if (e.key === "Enter" && open && results.length > 0) {
        e.preventDefault();
        go(results[0].href);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, results]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          padding: "10px 12px",
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.14)",
          background: "rgba(255,255,255,0.04)",
          color: "inherit",
          fontWeight: 800,
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
        title="Ctrl+K"
      >
        🔎 Buscar (Ctrl+K)
      </button>

      {open ? (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            display: "grid",
            placeItems: "center",
            zIndex: 9999,
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(760px, 100%)",
              borderRadius: 16,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(15,15,18,0.98)",
              overflow: "hidden",
            }}
          >
            <div style={{ padding: 12, borderBottom: "1px solid rgba(255,255,255,0.10)" }}>
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Digite: cliente, viagem, financeiro, caixa..."
                style={{
                  width: "100%",
                  padding: 12,
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(255,255,255,0.04)",
                  color: "inherit",
                  outline: "none",
                }}
              />
              <div style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>
                Enter abre o primeiro • Esc fecha
              </div>
            </div>

            <div style={{ maxHeight: 360, overflow: "auto" }}>
              {results.length === 0 ? (
                <div style={{ padding: 14, opacity: 0.85 }}>Nada encontrado.</div>
              ) : (
                results.map((it) => (
                  <button
                    key={it.href}
                    type="button"
                    onClick={() => go(it.href)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: 14,
                      border: "none",
                      borderTop: "1px solid rgba(255,255,255,0.06)",
                      background: "transparent",
                      color: "inherit",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ fontWeight: 900 }}>{it.label}</div>
                    <div style={{ fontSize: 12, opacity: 0.8 }}>{it.hint}</div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}