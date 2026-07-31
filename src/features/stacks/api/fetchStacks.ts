import {
  documentId,
  getDocsFromServer,
  limit,
  orderBy,
  query,
  startAfter,
  startAt,
  Timestamp,
  type DocumentSnapshot,
  type QueryConstraint,
  type QueryDocumentSnapshot,
} from "firebase/firestore";

import { mapStackEventDocument, mapStackTrackerDocument } from "../model/stack.mapper";
import type {
  ExportableStackEvent,
  ExportableStackTracker,
  FirestoreStackEvent,
  FirestoreStackTracker,
  StackEvent,
} from "../model/stack.types";
import { retryFirestoreRead } from "@/features/logbook/api/fetchLogs";
import type { FirestorePageCursor } from "@/features/logbook/model/logEntry.types";
import {
  getUserStackEventsCollection,
  getUserStackTrackersCollection,
} from "@/lib/firebase/firestore";

export const STACK_PAGE_SIZE = 200;

export type StackBackupPage<T> = {
  entries: T[];
  cursor: FirestorePageCursor | null;
  hasMore: boolean;
};

export type StackEventChangePage = StackBackupPage<StackEvent>;

function timestampFromCursor(cursor: FirestorePageCursor) {
  return new Timestamp(cursor.seconds, cursor.nanoseconds);
}

function cursorFromDocument(document: QueryDocumentSnapshot): FirestorePageCursor {
  const timestamp = document.get("createdAt");
  if (!(timestamp instanceof Timestamp)) throw new Error("스택 문서 생성 시간이 확정되지 않았습니다.");
  return { seconds: timestamp.seconds, nanoseconds: timestamp.nanoseconds, documentId: document.id };
}

function cursorKey(cursor: FirestorePageCursor | null) {
  return cursor ? `${cursor.seconds}:${cursor.nanoseconds}:${cursor.documentId}` : "start";
}

export async function collectAllStackPages<T extends { id: string }>(
  fetchPage: (cursor: FirestorePageCursor | null) => Promise<StackBackupPage<T>>,
): Promise<T[]> {
  const byId = new Map<string, T>();
  let cursor: FirestorePageCursor | null = null;
  while (true) {
    const previous = cursorKey(cursor);
    const page = await fetchPage(cursor);
    page.entries.forEach((entry) => byId.set(entry.id, entry));
    if (!page.hasMore) break;
    if (!page.cursor || cursorKey(page.cursor) === previous) {
      throw new Error("스택 백업 페이지 커서가 진행되지 않았습니다.");
    }
    cursor = page.cursor;
  }
  return [...byId.values()];
}

export async function fetchStackTrackerPage(uid: string, cursor: FirestorePageCursor | null): Promise<StackBackupPage<ExportableStackTracker>> {
  const constraints: QueryConstraint[] = [orderBy("createdAt", "asc"), orderBy(documentId(), "asc")];
  if (cursor) constraints.push(startAfter(timestampFromCursor(cursor), cursor.documentId));
  constraints.push(limit(STACK_PAGE_SIZE));
  const snapshot = await retryFirestoreRead(() => getDocsFromServer(query(getUserStackTrackersCollection(uid), ...constraints)));
  const last = snapshot.docs.at(-1);
  return {
    entries: snapshot.docs.map((document) => {
      const entry = mapStackTrackerDocument(document as DocumentSnapshot<FirestoreStackTracker>, { serverTimestamps: "estimate" });
      return {
        id: entry.id,
        name: entry.name,
        scheduleMode: entry.scheduleMode,
        startMinute: entry.startMinute,
        endMinute: entry.endMinute,
        totalCharges: entry.totalCharges,
        intervalDays: entry.intervalDays,
        anchorDate: entry.anchorDate,
        sortOrder: entry.sortOrder,
        isActive: entry.isActive,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
      };
    }),
    cursor: last ? cursorFromDocument(last) : null,
    hasMore: snapshot.size === STACK_PAGE_SIZE,
  };
}

export async function fetchStackEventPage(uid: string, cursor: FirestorePageCursor | null): Promise<StackBackupPage<ExportableStackEvent>> {
  const constraints: QueryConstraint[] = [orderBy("createdAt", "asc"), orderBy(documentId(), "asc")];
  if (cursor) constraints.push(startAfter(timestampFromCursor(cursor), cursor.documentId));
  constraints.push(limit(STACK_PAGE_SIZE));
  const snapshot = await retryFirestoreRead(() => getDocsFromServer(query(getUserStackEventsCollection(uid), ...constraints)));
  const last = snapshot.docs.at(-1);
  return {
    entries: snapshot.docs.map((document) => {
      const entry = mapStackEventDocument(document as DocumentSnapshot<FirestoreStackEvent>, { serverTimestamps: "estimate" });
      return {
        id: entry.id,
        trackerId: entry.trackerId,
        trackerName: entry.trackerName,
        eventType: entry.eventType,
        periodDate: entry.periodDate,
        chargeIndex: entry.chargeIndex,
        amount: entry.amount,
        occurredAt: entry.occurredAt,
        createdAt: entry.createdAt,
      };
    }),
    cursor: last ? cursorFromDocument(last) : null,
    hasMore: snapshot.size === STACK_PAGE_SIZE,
  };
}

export async function fetchStackEventChangePage(
  uid: string,
  options: { cursor: FirestorePageCursor | null; inclusiveTimestamp?: boolean },
): Promise<StackEventChangePage> {
  const constraints: QueryConstraint[] = [orderBy("createdAt", "asc"), orderBy(documentId(), "asc")];
  if (options.cursor) {
    constraints.push(
      options.inclusiveTimestamp
        ? startAt(timestampFromCursor(options.cursor))
        : startAfter(timestampFromCursor(options.cursor), options.cursor.documentId),
    );
  }
  constraints.push(limit(STACK_PAGE_SIZE));
  const snapshot = await retryFirestoreRead(() => getDocsFromServer(query(getUserStackEventsCollection(uid), ...constraints)));
  const last = snapshot.docs.at(-1);
  return {
    entries: snapshot.docs.map((document) => mapStackEventDocument(document as DocumentSnapshot<FirestoreStackEvent>, { serverTimestamps: "estimate" })),
    cursor: last ? cursorFromDocument(last) : null,
    hasMore: snapshot.size === STACK_PAGE_SIZE,
  };
}

export async function fetchAllStackData(uid: string): Promise<{ trackers: ExportableStackTracker[]; events: ExportableStackEvent[] }> {
  const [trackers, events] = await Promise.all([
    collectAllStackPages((cursor) => fetchStackTrackerPage(uid, cursor)),
    collectAllStackPages((cursor) => fetchStackEventPage(uid, cursor)),
  ]);
  return { trackers, events };
}
