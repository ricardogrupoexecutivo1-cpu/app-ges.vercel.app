import AuthGate from "../_components/AuthGate";
import ProtectedLayout from "../_components/ProtectedLayout";

export default function ProtectedGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <ProtectedLayout>{children}</ProtectedLayout>
    </AuthGate>
  );
}