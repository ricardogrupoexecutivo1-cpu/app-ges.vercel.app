import AuthGate from "../_components/AuthGate";
import ProtectedLayout from "../_components/ProtectedLayout";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <ProtectedLayout title="Pessoal" subtitle="Suas finanças pessoais">
        {children}
      </ProtectedLayout>
    </AuthGate>
  );
}