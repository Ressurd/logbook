import { AuthGuard } from "@/components/auth/AuthGuard";
import { SearchScreen } from "@/components/logbook/SearchScreen";

export default function SearchPage() {
  return (
    <AuthGuard>
      <SearchScreen />
    </AuthGuard>
  );
}
