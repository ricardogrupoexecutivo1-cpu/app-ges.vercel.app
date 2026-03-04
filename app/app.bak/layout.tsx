import AuthGate from "../_components/AuthGate";
import ProtectedLayout from "../_components/ProtectedLayout";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <ProtectedLayout title="Dashboard" subtitle="Visão geral e atalhos rápidos">
        {children}
      </ProtectedLayout>
    </AuthGate>
  );
}