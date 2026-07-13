import { clearSearchCache } from "@/features/logbook/search/searchDb";

import { signOutCurrentUser } from "./auth";

export async function signOutAndClearUserCache(
  uid: string | null,
  dependencies: {
    signOut?: () => Promise<void>;
    clearCache?: (targetUid: string) => Promise<void>;
  } = {},
): Promise<void> {
  const signOutTask = (dependencies.signOut ?? signOutCurrentUser)();
  const clearTask = uid
    ? (dependencies.clearCache ?? clearSearchCache)(uid)
    : Promise.resolve();

  const [signOutResult, clearResult] = await Promise.allSettled([
    signOutTask,
    clearTask,
  ]);
  if (signOutResult.status === "rejected") {
    throw signOutResult.reason;
  }
  if (clearResult.status === "rejected") {
    throw clearResult.reason;
  }
}
