"use client";

import Link from "next/link";
import styles from "../_components/ProtectedLayout.module.css";

export default function HelpPage() {
  return (
    <div className={styles.cardGrid}>
      <div className={styles.card} style={{ gridColumn: "span 12" }}>
        <div className={styles.cardTitle}>Central de Ajuda</div>
        <div className={styles.cardValue} style={{ fontSize: 16 }}>
          Manual rápido do ERP-GES (Premium)
        </div>
        <div className={styles.cardHint}>
          Objetivo: você operar, cobrar e crescer sem depender de ninguém.
        </div>

        <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link className={styles.btn as any} href="/app">
            Ir ao Dashboard
          </Link>
          <Link className={styles.btn as any} href="/finance/ar-by-client">
            Ver A Receber
          </Link>
          <Link className={styles.btn as any} href="/billing">
            Assinatura
          </Link>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardTitle}>Primeiros 10 minutos</div>
        <div className={styles.cardHint} style={{ marginTop: 10 }}>
          <ol style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
            <li>Entre em <b>/login</b>.</li>
            <li>Abra <b>Financeiro</b> e veja os <b>Alertas</b> no topo.</li>
            <li>
              Vá em <b>A Receber por Cliente</b> → selecione um cliente → <b>Carregar</b>.
            </li>
            <li>Foque em <b>Vencidos</b> (vermelho) e <b>Vence hoje</b> (amarelo).</li>
            <li>Use o <b>Dashboard</b> para ver o fluxo (últimos 6 meses).</li>
          </ol>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardTitle}>Financeiro</div>
        <div className={styles.cardHint} style={{ marginTop: 10, lineHeight: 1.6 }}>
          <b>Alertas financeiros</b> (topo):<br />
          🔴 Vencidos = prioridade máxima<br />
          🟡 Vence hoje = cobrar agora<br />
          ✅ Pago = histórico/controle
          <div style={{ marginTop: 10 }}>
            Dica: entre diariamente e trate os alertas como “lista de dinheiro a recuperar”.
          </div>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardTitle}>Operação (OPS)</div>
        <div className={styles.cardHint} style={{ marginTop: 10, lineHeight: 1.6 }}>
          A operação é o lugar de rotina: execução, controle e lançamentos.<br />
          Regras de segurança (RBAC):
          <ul style={{ margin: "8px 0 0 0", paddingLeft: 18, lineHeight: 1.6 }}>
            <li><b>admin</b>: tudo</li>
            <li><b>finance</b>: financeiro</li>
            <li><b>ops</b>: operação (sem acessar financeiro)</li>
          </ul>
        </div>
      </div>

      <div className={styles.card} style={{ gridColumn: "span 12" }}>
        <div className={styles.cardTitle}>Planos e limites</div>
        <div className={styles.cardHint} style={{ marginTop: 10, lineHeight: 1.6 }}>
          <b>Free</b>: limitado (ex.: clientes ativos).<br />
          <b>Pro</b>: libera recursos e relatórios.<br />
          <b>Premium</b>: ilimitado + automações e recursos avançados.
          <div style={{ marginTop: 10 }}>
            Acesse{" "}
            <Link href="/billing" style={{ textDecoration: "underline", color: "#e8e8ee" }}>
              Assinatura
            </Link>{" "}
            para upgrade.
          </div>
        </div>
      </div>
    </div>
  );
}