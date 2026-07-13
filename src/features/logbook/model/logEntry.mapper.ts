import type {
  DocumentSnapshot,
  QueryDocumentSnapshot,
  SnapshotOptions,
} from "firebase/firestore";

import type {
  CachedLogEntry,
  FirestoreLogEntry,
  LogEntry,
} from "./logEntry.types";

type LogDocument =
  | DocumentSnapshot<FirestoreLogEntry>
  | QueryDocumentSnapshot<FirestoreLogEntry>;

export function mapLogDocument(
  snapshot: LogDocument,
  options?: SnapshotOptions,
): LogEntry {
  const data = snapshot.data(options);
  const fallback = new Date();

  if (!data) {
    throw new Error("로그 문서의 데이터가 없습니다.");
  }

  return {
    id: snapshot.id,
    content: data.content,
    createdAt: data.createdAt?.toDate() ?? fallback,
    updatedAt: data.updatedAt?.toDate() ?? data.createdAt?.toDate() ?? fallback,
    deletedAt: data.deletedAt?.toDate() ?? null,
    hasPendingWrites: snapshot.metadata.hasPendingWrites,
  };
}

export function toCachedLogEntry(uid: string, entry: LogEntry): CachedLogEntry {
  return {
    key: `${uid}:${entry.id}`,
    uid,
    id: entry.id,
    content: entry.content,
    normalizedContent: normalizeSearchText(entry.content),
    createdAt: entry.createdAt.getTime(),
    updatedAt: entry.updatedAt.getTime(),
    deletedAt: entry.deletedAt?.getTime() ?? null,
  };
}

export function normalizeSearchText(value: string): string {
  return value.normalize("NFC").toLocaleLowerCase("ko-KR").trim();
}
