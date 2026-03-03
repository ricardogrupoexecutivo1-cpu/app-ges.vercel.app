"use client";

import Link from "next/link";
import styles from "../_components/ProtectedLayout.module.css";

const VERSION = "UPGRADE-FUNIL-2026-03-01-01";

function Card({
  title,
  price,
  subtitle,
  bullets,
  ctaText,
  ctaHref,
  highlight,
}: {
  title: string;
  price: string;
  subtitle: string;
  bullets: string[];
  ctaText: string;
  ctaHref: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={styles.card}
      style={{
        border: highlight ? "1px solid rgba(255,255,255,0.28)" : undefined,
        background: highlight ? "rgba(255,255,255,0.06)" : undefined,
      }}
    >
      <div className={styles.cardTitle}>{title}</div>
      <div className={styles.cardValue} style={{ fontSize: 28, marginTop: 8 }}>
        {price}
      </div>
      <div className={styles.cardHint} style={{ marginTop: 6 }}>
        {subtitle}
      </div>

      <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
        {bullets.map((b) => (
          <div
            key={b}
            style={{
              padding: 10,
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.02)",
            }}
          >
            ✅ {b}
          </div>
        ))}
      </div>

      <div style={{ marginTop: 14 }}>
        <Link className={styles.btn as any} href={ctaHref}>
          {ctaText}
        </Link>
      </div>
    </div>
  );
}

export default function UpgradePage() {
  return (
    <div className={styles.cardGrid}>
      <div className={styles.card} style={{ gridColumn: "span 12" }}>
        <div className={styles.cardTitle}>Upgrade</div>
        <div className={styles.cardValue} style={{ fontSize: 18 }}>
          Desbloqueie velocidade, controle e previsibilidade
        </div>
        <div className={styles.cardHint} style={{ marginTop: 8 }}>
          Versão: <b>{VERSION}</b> • Em poucos minutos você sai do “apagar incêndio” e entra no “gestão profissional”.
        </div>

        <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link className={styles.btn as any} href="/billing">
            Ir para Assinatura →
          </Link>
          <Link className={styles.btn as any} href="/app">
            Voltar ao Dashboard
          </Link>
        </div>
      </div>

      <div className={styles.card} style={{ gridColumn: "span 12" }}>
        <div className={styles.cardTitle}>Por que vale pagar?</div>
        <div className={styles.cardHint} style={{ marginTop: 8, lineHeight: 1.7 }}>
          O ERP-GES não é “mais um sistema”. Ele te dá <b>missões diárias</b>, <b>alertas financeiros</b> e um painel de{" "}
          <b>decisão rápida</b>.
          <br />
          <br />
          O plano pago existe para liberar o que gera dinheiro:
          <br />• limites maiores (clientes e lançamentos)
          <br />• relatórios e exportação
          <br />• automações (cobrança e rotina)
        </div>
      </div>

      <Card
        title="FREE"
        price="R$ 0"
        subtitle="Para começar e testar"
        bullets={[
          "Dashboard + Missão do dia",
          "Financeiro básico",
          "Pessoal com limite de lançamentos",
          "Ideal para validação",
        ]}
        ctaText="Continuar no FREE"
        ctaHref="/app"
      />

      <Card
        title="PRO"
        price="R$ 29/mês"
        subtitle="Para quem quer consistência"
        bullets={[
          "Pessoal ilimitado",
          "Mais clientes ativos",
          "Relatórios essenciais",
          "Exportação (CSV/PDF)",
        ]}
        ctaText="Quero o PRO →"
        ctaHref="/billing"
        highlight
      />

      <Card
        title="PREMIUM"
        price="R$ 59/mês"
        subtitle="Para crescimento e escala"
        bullets={[
          "Automações (rotinas e cobranças)",
          "Alertas avançados",
          "Relatórios completos",
          "Prioridade de suporte",
        ]}
        ctaText="Quero o PREMIUM →"
        ctaHref="/billing"
      />

      <div className={styles.card} style={{ gridColumn: "span 12" }}>
        <div className={styles.cardTitle}>Próximo passo</div>
        <div className={styles.cardHint} style={{ marginTop: 8, lineHeight: 1.7 }}>
          Clique em <b>“Ir para Assinatura”</b>. Quando sua Stripe estiver pronta, o checkout será automático.
          <br />
          Até lá, esta página já cria desejo e melhora sua conversão.
        </div>
      </div>
    </div>
  );
}