import {
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
  where,
} from "firebase/firestore";

import type { StackTracker } from "../model/stack.types";
import {
  calculateChargeSchedule,
  getKstPeriodDate,
} from "../utils/stackCalculations";
import { getFirebaseServices } from "@/lib/firebase/client";
import {
  getUserStackEventDocument,
  getUserStackEventsCollection,
} from "@/lib/firebase/firestore";

export type PlannedChargeEvent = {
  id: string;
  trackerId: string;
  trackerName: string;
  periodDate: string;
  chargeIndex: number;
  occurredAt: Date;
};

export function getChargeEventId(
  trackerId: string,
  periodDate: string,
  chargeIndex: number,
): string {
  return `${trackerId}_charge_${periodDate}_${chargeIndex}`;
}

export function planMissingChargeEvents(
  trackers: readonly StackTracker[],
  existingEventIds: ReadonlySet<string>,
  now = new Date(),
): PlannedChargeEvent[] {
  const periodDate = getKstPeriodDate(now);
  const nowMs = now.getTime();
  return trackers
    .filter((tracker) => tracker.isActive)
    .flatMap((tracker) =>
      calculateChargeSchedule(tracker, periodDate).flatMap((occurredAt, offset) => {
        const chargeIndex = offset + 1;
        const id = getChargeEventId(tracker.id, periodDate, chargeIndex);
        return occurredAt.getTime() <= nowMs && !existingEventIds.has(id)
          ? [{
              id,
              trackerId: tracker.id,
              trackerName: tracker.name,
              periodDate,
              chargeIndex,
              occurredAt,
            }]
          : [];
      }),
    );
}

type ActiveReconciliation = {
  revision: number;
  completedRevision: number;
  trackers: readonly StackTracker[];
  now: Date;
  promise: Promise<number>;
  cancelled: boolean;
};

const activeReconciliations = new Map<string, ActiveReconciliation>();

async function performReconciliation(
  uid: string,
  trackers: readonly StackTracker[],
  now: Date,
  isCancelled: () => boolean,
): Promise<number> {
  if (trackers.length === 0 || isCancelled()) return 0;
  const periodDate = getKstPeriodDate(now);
  const existing = await getDocs(
    query(getUserStackEventsCollection(uid), where("periodDate", "==", periodDate)),
  );
  const missing = planMissingChargeEvents(
    trackers,
    new Set(existing.docs.map((document) => document.id)),
    now,
  );
  const { db } = getFirebaseServices();
  let created = 0;
  for (const event of missing) {
    if (isCancelled()) break;
    const reference = getUserStackEventDocument(uid, event.id);
    const didCreate = await runTransaction(db, async (transaction) => {
      if ((await transaction.get(reference)).exists()) return false;
      transaction.set(reference, {
        trackerId: event.trackerId,
        trackerName: event.trackerName,
        eventType: "charge",
        periodDate: event.periodDate,
        chargeIndex: event.chargeIndex,
        amount: 1,
        occurredAt: Timestamp.fromDate(event.occurredAt),
        createdAt: serverTimestamp(),
      });
      return true;
    });
    if (didCreate) created += 1;
  }
  return created;
}

export function reconcileStackCharges(
  uid: string,
  trackers: readonly StackTracker[],
  now = new Date(),
): Promise<number> {
  const existing = activeReconciliations.get(uid);
  if (existing) {
    existing.cancelled = false;
    existing.trackers = trackers;
    existing.now = now;
    existing.revision += 1;
    return existing.promise;
  }

  const state: ActiveReconciliation = {
    revision: 1,
    completedRevision: 0,
    trackers,
    now,
    promise: Promise.resolve(0),
    cancelled: false,
  };
  state.promise = (async () => {
    let totalCreated = 0;
    while (state.completedRevision < state.revision) {
      const targetRevision = state.revision;
      totalCreated += await performReconciliation(
        uid,
        state.trackers,
        state.now,
        () => state.cancelled,
      );
      state.completedRevision = targetRevision;
      if (state.cancelled) break;
    }
    return totalCreated;
  })().finally(() => {
    activeReconciliations.delete(uid);
  });
  activeReconciliations.set(uid, state);
  return state.promise;
}

export function reconcileTodayChargeEvents(
  uid: string,
  tracker: StackTracker,
  now = new Date(),
) {
  return reconcileStackCharges(uid, [tracker], now);
}

export function reconcileAllActiveTrackers(
  uid: string,
  trackers: readonly StackTracker[],
  now = new Date(),
) {
  return reconcileStackCharges(uid, trackers, now);
}

export function cancelStackReconciliation(uid: string): void {
  const state = activeReconciliations.get(uid);
  if (state) state.cancelled = true;
}
