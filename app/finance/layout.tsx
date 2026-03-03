import AuthGate from "../_components/AuthGate";
import ProtectedLayout from "../_components/ProtectedLayout";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <ProtectedLayout title="Financeiro" subtitle="Caixa, contas e relatórios">
        {children}
      </ProtectedLayout>
    </AuthGate>
  );
}