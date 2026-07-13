import { openDB, type DBSchema, type IDBPDatabase } from "idb";

import type {
  CachedLogEntry,
  FirestorePageCursor,
} from "../model/logEntry.types";
import { normalizeSearchText } from "../model/logEntry.mapper";

export type SearchSyncMeta = {
  uid: string;
  phase: "full" | "ready";
  cursor: FirestorePageCursor | null;
};

interface LogbookSearchDb extends DBSchema {
  logs: {
    key: string;
    value: CachedLogEntry;
    indexes: { "by-uid": string };
  };
  syncMeta: {
    key: string;
    value: SearchSyncMeta;
  };
}

let databasePromise: Promise<IDBPDatabase<LogbookSearchDb>> | null = null;

function getDatabase() {
  if (!databasePromise) {
    databasePromise = openDB<LogbookSearchDb>("logbook-search", 2, {
      upgrade(database, oldVersion, _newVersion, transaction) {
        if (oldVersion < 1) {
          const logs = database.createObjectStore("logs", { keyPath: "key" });
          logs.createIndex("by-uid", "uid");
          database.createObjectStore("syncMeta", { keyPath: "uid" });
        }
        if (oldVersion === 1) {
          transaction.objectStore("syncMeta").clear();
        }
      },
    });
  }
  return databasePromise;
}

export async function putCachedLogEntries(
  entries: CachedLogEntry[],
): Promise<void> {
  if (entries.length === 0) return;
  const database = await getDatabase();
  const transaction = database.transaction("logs", "readwrite");
  await Promise.all([
    ...entries.map((entry) => transaction.store.put(entry)),
    transaction.done,
  ]);
}

export async function getSearchSyncMeta(
  uid: string,
): Promise<SearchSyncMeta | undefined> {
  return (await getDatabase()).get("syncMeta", uid);
}

export async function setSearchSyncMeta(meta: SearchSyncMeta): Promise<void> {
  await (await getDatabase()).put("syncMeta", meta);
}

export async function isSearchCacheReady(uid: string): Promise<boolean> {
  return (await getSearchSyncMeta(uid))?.phase === "ready";
}

export async function clearSearchCache(uid: string): Promise<void> {
  const database = await getDatabase();
  const transaction = database.transaction(["logs", "syncMeta"], "readwrite");
  const logsStore = transaction.objectStore("logs");
  const keys = await logsStore.index("by-uid").getAllKeys(uid);
  await Promise.all(keys.map((key) => logsStore.delete(key)));
  await transaction.objectStore("syncMeta").delete(uid);
  await transaction.done;
}

export type SearchResultPage = {
  entries: CachedLogEntry[];
  total: number;
  hasMore: boolean;
};

export async function searchCachedLogs(
  uid: string,
  searchTerm: string,
  visibleCount = 50,
): Promise<SearchResultPage> {
  const normalizedTerm = normalizeSearchText(searchTerm);
  if (!normalizedTerm) return { entries: [], total: 0, hasMore: false };

  const database = await getDatabase();
  const allEntries = await database.getAllFromIndex("logs", "by-uid", uid);
  const matches = allEntries
    .filter(
      (entry) =>
        entry.deletedAt === null &&
        entry.normalizedContent.includes(normalizedTerm),
    )
    .sort(
      (left, right) =>
        right.createdAt - left.createdAt || right.id.localeCompare(left.id),
    );

  return {
    entries: matches.slice(0, visibleCount),
    total: matches.length,
    hasMore: matches.length > visibleCount,
  };
}

export function resetSearchDatabaseForTests(): void {
  databasePromise = null;
}
