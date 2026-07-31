import type { StackTracker } from "../model/stack.types";

export function compareStackTrackerOrder(
  left: Pick<StackTracker, "id" | "sortOrder" | "createdAt">,
  right: Pick<StackTracker, "id" | "sortOrder" | "createdAt">,
): number {
  return left.sortOrder - right.sortOrder
    || left.createdAt.getTime() - right.createdAt.getTime()
    || left.id.localeCompare(right.id);
}

export function sortStackTrackers(trackers: readonly StackTracker[]): StackTracker[] {
  return [...trackers].sort(compareStackTrackerOrder);
}

export function getSwappedStackSortOrders(
  earlierSortOrder: number,
  laterSortOrder: number,
): { earlier: number; later: number } {
  if (earlierSortOrder !== laterSortOrder) {
    return { earlier: laterSortOrder, later: earlierSortOrder };
  }
  return {
    earlier: earlierSortOrder + 0.5,
    later: laterSortOrder - 0.5,
  };
}
