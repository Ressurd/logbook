import { doc, serverTimestamp, setDoc, Timestamp } from "firebase/firestore";

import type { StackTracker } from "../model/stack.types";
import { getKstPeriodDate } from "../utils/stackCalculations";
import { getUserStackEventsCollection } from "@/lib/firebase/firestore";

export type StackEventWrite = { id: string; completion: Promise<void> };

export function createConsumeEvent(
  uid: string,
  tracker: StackTracker,
  now = new Date(),
): StackEventWrite {
  const reference = doc(getUserStackEventsCollection(uid));
  return {
    id: reference.id,
    completion: setDoc(reference, {
      trackerId: tracker.id,
      trackerName: tracker.name,
      eventType: "consume",
      periodDate: getKstPeriodDate(now),
      chargeIndex: null,
      amount: -1,
      occurredAt: Timestamp.fromDate(now),
      createdAt: serverTimestamp(),
    }),
  };
}

