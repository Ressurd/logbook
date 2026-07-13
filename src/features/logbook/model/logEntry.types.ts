import type { Timestamp } from "firebase/firestore";

export type FirestoreLogEntry = {
  content: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
  deletedAt: Timestamp | null;
};

export type LogEntry = {
  id: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  hasPendingWrites: boolean;
};

export type ExportableLogEntry = Omit<LogEntry, "hasPendingWrites">;

export type CachedLogEntry = {
  key: string;
  uid: string;
  id: string;
  content: string;
  normalizedContent: string;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
};

export type FirestorePageCursor = {
  seconds: number;
  nanoseconds: number;
  documentId: string;
};
