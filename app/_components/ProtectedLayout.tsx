"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import styles from "./ProtectedLayout.module.css";
import { createClient } from "@/lib/supabase/client";

type AppRole = "admin" | "finance" | "ops" | null;

type Props = {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  companyName?: string;
};

const DEFAULT_COMPANY = "GRUPO EXECUTIVO SERVICE";
const PLAN: "free" | "pro" | "premium" = "free";

function cls(...xs: Array<string | false | undefined | null>) {
  return xs.filter(Boolean).join(" ");
}

export default function ProtectedLayout({
  children,
  title = "ERP-GES Premium",
  subtitle = "Controle. Clareza. Crescimento.",
  companyName = DEFAULT_COMPANY,
}: Props) {
  const pathname = usePathname();

  const [email, setEmail] = useState<string>("");
  const [role, setRole] = useState<AppRole>(null);

  const allowedFinance = role === "admin" || role === "finance";

  const navItems = useMemo(() => {
    return [
      { href: "/app", icon: "⬛", title: "Dashboard", hint: "Visão geral do negócio" },
      { href: "/ops", icon: "⚙️", title: "Operação", hint: "Rotinas e execução" },
      {
        href: "/finance",
        icon: "💳",
        title: "Financeiro",
        hint: "Caixa, contas, relatórios",
        disabled: !allowedFinance,
      },
      { href: "/personal", icon: "👤", title: "Pessoal", hint: "Suas finanças pessoais" },
      { href: "/upgrade", icon: "⭐", title: "Assinatura", hint: "Plano e upgrade" },
      { href: "/help", icon: "❓", title: "Ajuda", hint: "Manual e passos rápidos" },
    ] as const;
  }, [allowedFinance]);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const supabase = createClient();

        // 1) Session
        const { data } = await supabase.auth.getSession();
        const user = data.session?.user;

        if (!alive) return;
        setEmail(user?.email ?? "");

        if (!user) {
          setRole(null);
          return;
        }

        // 2) Tenta RBAC primeiro (se existir)
        try {
          const rbacMod = await import("@/lib/rbac");
          const r = await rbacMod.getMyRole(companyName);
          if (!alive) return;
          if (r) {
            setRole(r as any);
            return;
          }
        } catch {
          // ignore e cai no fallback
        }

        // 3) Fallback: profiles.role (RLS deve permitir select own)
        const { data: prof, error: pErr } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();

        if (!alive) return;

        if (pErr) {
          setRole(null);
          return;
        }

        setRole((prof?.role ?? null) as any);
      } catch {
        if (!alive) return;
        setEmail("");
        setRole(null);
      }
    })();

    return () => {
      alive = false;
    };
  }, [companyName]);

  async function onLogout() {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } finally {
      window.location.assign("/login");
    }
  }

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <div className={styles.brandTitle}>ERP-GES Premium</div>
          <div className={styles.brandSub}>Controle. Clareza. Crescimento.</div>
        </div>

        <nav className={styles.nav}>
          {navItems.map((it) => {
            const active =
              it.href === "/app" ? pathname === "/app" : pathname?.startsWith(it.href);

            const disabled = (it as any).disabled;

            if (disabled) {
              return (
                <div
                  key={it.href}
                  className={styles.navLink}
                  style={{ opacity: 0.55, cursor: "not-allowed" }}
                  title="Bloqueado para perfil operacional"
                >
                  <div className={styles.navIcon}>{it.icon}</div>
                  <div className={styles.navText}>
                    <div className={styles.navTitle}>{it.title}</div>
                    <div className={styles.navHint}>{it.hint}</div>
                  </div>
                </div>
              );
            }

            return (
              <Link
                key={it.href}
                href={it.href}
                className={cls(styles.navLink, active && styles.navLinkActive)}
              >
                <div className={styles.navIcon}>{it.icon}</div>
                <div className={styles.navText}>
                  <div className={styles.navTitle}>{it.title}</div>
                  <div className={styles.navHint}>{it.hint}</div>
                </div>
              </Link>
            );
          })}
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.pill}>
            <div className={styles.pillLine}>
              Usuário: <span className={styles.pillStrong}>{email || "—"}</span>
            </div>
            <div className={styles.pillLine}>
              Papel: <span className={styles.pillStrong}>{role ?? "carregando..."}</span>
            </div>
            <div className={styles.pillLine}>
              ⭐ Plano: <span className={styles.pillStrong}>{PLAN}</span> (active)
            </div>
          </div>

          <button className={styles.btn} onClick={onLogout}>
            Sair
          </button>

          {!allowedFinance && (
            <div className={styles.pill} style={{ opacity: 0.8 }}>
              <div className={styles.pillLine}>
                * Financeiro fica bloqueado para perfil operacional.
              </div>
            </div>
          )}
        </div>
      </aside>

      <main className={styles.main}>
        <div className={styles.topbar}>
          <div className={styles.topTitle}>
            <div className={styles.h1}>{title}</div>
            <div className={styles.h2}>{subtitle}</div>
          </div>

          <div className={styles.userBox}>
            <div className={styles.userMeta}>
              <div className={styles.userEmail}>{email || "—"}</div>
              <div className={styles.userRole}>Papel: {role ?? "carregando..."}</div>
            </div>
          </div>
        </div>

        <div className={styles.content}>{children}</div>
      </main>
    </div>
  );
}