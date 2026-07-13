import { AuthGuard } from "@/components/auth/AuthGuard";
import { HomeScreen } from "@/components/logbook/HomeScreen";
import { resolveSelectedDate } from "@/features/logbook/utils/date";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string | string[] }>;
}) {
  const params = await searchParams;
  const rawDate = Array.isArray(params.date) ? params.date[0] : params.date;
  const selectedDate = resolveSelectedDate(rawDate);

  return (
    <AuthGuard>
      <HomeScreen selectedDate={selectedDate} />
    </AuthGuard>
  );
}
