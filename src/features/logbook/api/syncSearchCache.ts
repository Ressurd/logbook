import { fetchLogChangePage, type LogChangePage } from "./fetchLogs";
import { toCachedLogEntry } from "../model/logEntry.mapper";
import type {
  CachedLogEntry,
  FirestorePageCursor,
} from "../model/logEntry.types";
import {
  getSearchSyncMeta,
  putCachedLogEntries,
  setSearchSyncMeta,
  type SearchSyncMeta,
} from "../search/searchDb";

export type SearchSyncProgress = {
  mode: "full" | "incremental";
  processed: number;
};

export type SearchSyncDependencies = {
  getMeta: (uid: string) => Promise<SearchSyncMeta | undefined>;
  setMeta: (meta: SearchSyncMeta) => Promise<void>;
  putEntries: (entries: CachedLogEntry[]) => Promise<void>;
  fetchPage: (
    uid: string,
    options: {
      cursor: FirestorePageCursor | null;
      inclusiveTimestamp?: boolean;
    },
  ) => Promise<LogChangePage>;
};

export const CHANGE_SYNC_OVERLAP_SECONDS = 5 * 60;

const defaultDependencies: SearchSyncDependencies = {
  getMeta: getSearchSyncMeta,
  setMeta: setSearchSyncMeta,
  putEntries: putCachedLogEntries,
  fetchPage: fetchLogChangePage,
};

const activeSyncs = new Map<string, Promise<SearchSyncProgress>>();

function cursorKey(cursor: FirestorePageCursor | null): string {
  return cursor
    ? `${cursor.seconds}:${cursor.nanoseconds}:${cursor.documentId}`
    : "start";
}

function compareCursors(
  left: FirestorePageCursor,
  right: FirestorePageCursor,
): number {
  return (
    left.seconds - right.seconds ||
    left.nanoseconds - right.nanoseconds ||
    left.documentId.localeCompare(right.documentId)
  );
}

export function createIncrementalStartCursor(
  cursor: FirestorePageCursor,
): FirestorePageCursor {
  return {
    seconds: Math.max(0, cursor.seconds - CHANGE_SYNC_OVERLAP_SECONDS),
    nanoseconds: 0,
    documentId: "",
  };
}

export async function performSearchSync(
  uid: string,
  dependencies: SearchSyncDependencies,
  onProgress?: (progress: SearchSyncProgress) => void,
): Promise<SearchSyncProgress> {
  const meta = await dependencies.getMeta(uid);
  const mode: SearchSyncProgress["mode"] =
    meta?.phase === "ready" ? "incremental" : "full";
  let highWaterCursor = meta?.cursor ?? null;
  let cursor =
    mode === "incremental" && meta?.cursor
      ? createIncrementalStartCursor(meta.cursor)
      : meta?.cursor ?? null;
  let firstPage = true;
  let processed = 0;

  while (true) {
    const previousCursorKey = cursorKey(cursor);
    const page = await dependencies.fetchPage(uid, {
      cursor,
      inclusiveTimestamp: mode === "incremental" && firstPage && Boolean(cursor),
    });
    firstPage = false;
    await dependencies.putEntries(
      page.entries.map((entry) => toCachedLogEntry(uid, entry)),
    );
    processed += page.entries.length;

    if (page.cursor) {
      cursor = page.cursor;
      if (!highWaterCursor || compareCursors(page.cursor, highWaterCursor) > 0) {
        highWaterCursor = page.cursor;
      }
    }
    onProgress?.({ mode, processed });

    if (mode === "full" && page.cursor) {
      await dependencies.setMeta({ uid, phase: "full", cursor });
    }

    if (!page.hasMore) break;
    if (!page.cursor || cursorKey(cursor) === previousCursorKey) {
      throw new Error("검색 동기화 페이지 커서가 진행되지 않았습니다.");
    }
  }

  await dependencies.setMeta({ uid, phase: "ready", cursor: highWaterCursor });
  return { mode, processed };
}

export function syncSearchCache(
  uid: string,
  onProgress?: (progress: SearchSyncProgress) => void,
): Promise<SearchSyncProgress> {
  const existing = activeSyncs.get(uid);
  if (existing) return existing;

  const sync = performSearchSync(uid, defaultDependencies, onProgress).finally(
    () => activeSyncs.delete(uid),
  );
  activeSyncs.set(uid, sync);
  return sync;
}
