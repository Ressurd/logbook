import {
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  where,
  type DocumentSnapshot,
} from "firebase/firestore";

import { mapStackEventDocument, mapStackTrackerDocument } from "../model/stack.mapper";
import type {
  FirestoreStackEvent,
  FirestoreStackTracker,
  StackEvent,
  StackTracker,
} from "../model/stack.types";
import { getKstDayRange } from "@/features/logbook/utils/date";
import {
  getUserStackEventsCollection,
  getUserStackTrackersCollection,
} from "@/lib/firebase/firestore";

export type StackSubscriptionMetadata = {
  fromCache: boolean;
  hasPendingWrites: boolean;
};

export function subscribeActiveStackTrackers(
  uid: string,
  onData: (trackers: StackTracker[], metadata: StackSubscriptionMetadata) => void,
  onError: (error: Error) => void,
) {
  const trackersQuery = query(
    getUserStackTrackersCollection(uid),
    where("isActive", "==", true),
    orderBy("createdAt", "asc"),
  );
  return onSnapshot(
    trackersQuery,
    { includeMetadataChanges: true },
    (snapshot) => {
      onData(
        snapshot.docs.map((document) =>
          mapStackTrackerDocument(
            document as DocumentSnapshot<FirestoreStackTracker>,
            { serverTimestamps: "estimate" },
          ),
        ),
        {
          fromCache: snapshot.metadata.fromCache,
          hasPendingWrites: snapshot.metadata.hasPendingWrites,
        },
      );
    },
    onError,
  );
}

export function subscribeDailyStackEvents(
  uid: string,
  date: string,
  onData: (events: StackEvent[], metadata: StackSubscriptionMetadata) => void,
  onError: (error: Error) => void,
) {
  const { start, end } = getKstDayRange(date);
  const eventsQuery = query(
    getUserStackEventsCollection(uid),
    where("occurredAt", ">=", Timestamp.fromDate(start)),
    where("occurredAt", "<", Timestamp.fromDate(end)),
    orderBy("occurredAt", "desc"),
  );
  return onSnapshot(
    eventsQuery,
    { includeMetadataChanges: true },
    (snapshot) => {
      onData(
        snapshot.docs.map((document) =>
          mapStackEventDocument(
            document as DocumentSnapshot<FirestoreStackEvent>,
            { serverTimestamps: "estimate" },
          ),
        ),
        {
          fromCache: snapshot.metadata.fromCache,
          hasPendingWrites: snapshot.metadata.hasPendingWrites,
        },
      );
    },
    onError,
  );
}

