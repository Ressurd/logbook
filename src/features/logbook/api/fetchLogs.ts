import {
  documentId,
  getDocsFromServer,
  limit,
  orderBy,
  query,
  startAfter,
  startAt,
  Timestamp,
  where,
  type DocumentSnapshot,
  type QueryConstraint,
  type QueryDocumentSnapshot,
} from "firebase/firestore";

import { mapLogDocument } from "../model/logEntry.mapper";
import type {
  ExportableLogEntry,
  FirestoreLogEntry,
  FirestorePageCursor,
  LogEntry,
} from "../model/logEntry.types";
import { getUserLogsCollection } from "@/lib/firebase/firestore";

export const LOG_PAGE_SIZE = 200;
export const FIRESTORE_READ_RETRY_DELAYS_MS = [250, 750] as const;

const retryableReadCodes = new Set([
  "aborted",
  "deadline-exceeded",
  "internal",
  "unavailable",
]);

export type LogChangePage = {
  entries: LogEntry[];
  cursor: FirestorePageCursor | null;
  hasMore: boolean;
};

export type ActiveLogPage = {
  entries: ExportableLogEntry[];
  cursor: FirestorePageCursor | null;
  hasMore: boolean;
};

function timestampFromCursor(cursor: FirestorePageCursor): Timestamp {
  return new Timestamp(cursor.seconds, cursor.nanoseconds);
}

function cursorFromDocument(
  document: QueryDocumentSnapshot,
  timestampField: "createdAt" | "updatedAt",
): FirestorePageCursor {
  const timestamp = document.get(timestampField);
  if (!(timestamp instanceof Timestamp)) {
    throw new Error(`로그의 ${timestampField} 서버 시간이 확정되지 않았습니다.`);
  }
  return {
    seconds: timestamp.seconds,
    nanoseconds: timestamp.nanoseconds,
    documentId: document.id,
  };
}

function cursorKey(cursor: FirestorePageCursor | null): string {
  return cursor
    ? `${cursor.seconds}:${cursor.nanoseconds}:${cursor.documentId}`
    : "start";
}

function getErrorCode(error: unknown): string | null {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    return error.code.replace(/^firestore\//, "");
  }
  return null;
}

export function isRetryableFirestoreReadError(error: unknown): boolean {
  const code = getErrorCode(error);
  return code !== null && retryableReadCodes.has(code);
}

export async function retryFirestoreRead<T>(
  operation: () => Promise<T>,
  delays: readonly number[] = FIRESTORE_READ_RETRY_DELAYS_MS,
  wait: (milliseconds: number) => Promise<void> = (milliseconds) =>
    new Promise((resolve) => setTimeout(resolve, milliseconds)),
): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      const delay = delays[attempt];
      if (delay === undefined || !isRetryableFirestoreReadError(error)) {
        throw error;
      }
      await wait(delay);
    }
  }
}

export async function fetchLogChangePage(
  uid: string,
  options: {
    cursor: FirestorePageCursor | null;
    inclusiveTimestamp?: boolean;
  },
): Promise<LogChangePage> {
  const constraints: QueryConstraint[] = [
    orderBy("updatedAt", "asc"),
    orderBy(documentId(), "asc"),
  ];
  if (options.cursor) {
    constraints.push(
      options.inclusiveTimestamp
        ? startAt(timestampFromCursor(options.cursor))
        : startAfter(
            timestampFromCursor(options.cursor),
            options.cursor.documentId,
          ),
    );
  }
  constraints.push(limit(LOG_PAGE_SIZE));

  const snapshot = await retryFirestoreRead(() =>
    getDocsFromServer(query(getUserLogsCollection(uid), ...constraints)),
  );
  const lastDocument = snapshot.docs.at(-1);
  return {
    entries: snapshot.docs.map((document) =>
      mapLogDocument(
        document as DocumentSnapshot<FirestoreLogEntry>,
        { serverTimestamps: "estimate" },
      ),
    ),
    cursor: lastDocument
      ? cursorFromDocument(lastDocument, "updatedAt")
      : null,
    hasMore: snapshot.size === LOG_PAGE_SIZE,
  };
}

export async function fetchActiveLogPage(
  uid: string,
  cursor: FirestorePageCursor | null,
): Promise<ActiveLogPage> {
  const constraints: QueryConstraint[] = [
    where("deletedAt", "==", null),
    orderBy("createdAt", "desc"),
    orderBy(documentId(), "desc"),
  ];
  if (cursor) {
    constraints.push(
      startAfter(timestampFromCursor(cursor), cursor.documentId),
    );
  }
  constraints.push(limit(LOG_PAGE_SIZE));

  const snapshot = await retryFirestoreRead(() =>
    getDocsFromServer(query(getUserLogsCollection(uid), ...constraints)),
  );
  const lastDocument = snapshot.docs.at(-1);
  return {
    entries: snapshot.docs.map((document) => {
      const mapped = mapLogDocument(
        document as DocumentSnapshot<FirestoreLogEntry>,
        { serverTimestamps: "estimate" },
      );
      return {
        id: mapped.id,
        content: mapped.content,
        createdAt: mapped.createdAt,
        updatedAt: mapped.updatedAt,
        deletedAt: mapped.deletedAt,
      };
    }),
    cursor: lastDocument
      ? cursorFromDocument(lastDocument, "createdAt")
      : null,
    hasMore: snapshot.size === LOG_PAGE_SIZE,
  };
}

export async function collectAllActiveLogs(
  fetchPage: (cursor: FirestorePageCursor | null) => Promise<ActiveLogPage>,
): Promise<ExportableLogEntry[]> {
  const entriesById = new Map<string, ExportableLogEntry>();
  let cursor: FirestorePageCursor | null = null;

  while (true) {
    const previousCursorKey = cursorKey(cursor);
    const page = await fetchPage(cursor);
    for (const entry of page.entries) entriesById.set(entry.id, entry);

    if (!page.hasMore) break;
    if (!page.cursor || cursorKey(page.cursor) === previousCursorKey) {
      throw new Error("백업 페이지 커서가 진행되지 않았습니다.");
    }
    cursor = page.cursor;
  }

  return [...entriesById.values()].sort(
    (left, right) =>
      right.createdAt.getTime() - left.createdAt.getTime() ||
      right.id.localeCompare(left.id),
  );
}

export function fetchAllActiveLogs(uid: string): Promise<ExportableLogEntry[]> {
  return collectAllActiveLogs((cursor) => fetchActiveLogPage(uid, cursor));
}
