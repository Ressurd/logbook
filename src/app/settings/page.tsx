import { AuthGuard } from "@/components/auth/AuthGuard";
import { SettingsScreen } from "@/components/settings/SettingsScreen";

export default function SettingsPage() {
  return (
    <AuthGuard>
      <SettingsScreen />
    </AuthGuard>
  );
}
