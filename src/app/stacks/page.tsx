import { AuthGuard } from "@/components/auth/AuthGuard";
import { StackTrackerScreen } from "@/components/stacks/StackTrackerScreen";

export default function StacksPage() {
  return <AuthGuard><StackTrackerScreen /></AuthGuard>;
}

