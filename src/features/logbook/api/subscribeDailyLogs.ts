import {
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  where,
  type DocumentSnapshot,
} from "firebase/firestore";

import { mapLogDocument } from "../model/logEntry.mapper";
import type {
  FirestoreLogEntry,
  LogEntry,
} from "../model/logEntry.types";
import { getKstDayRange } from "../utils/date";
import { getUserLogsCollection } from "@/lib/firebase/firestore";

export type DailyLogsMetadata = {
  fromCache: boolean;
  hasPendingWrites: boolean;
};

export function subscribeDailyLogs(
  uid: string,
  date: string,
  onData: (entries: LogEntry[], metadata: DailyLogsMetadata) => void,
  onError: (error: Error) => void,
) {
  const { start, end } = getKstDayRange(date);
  const logsQuery = query(
    getUserLogsCollection(uid),
    where("deletedAt", "==", null),
    where("createdAt", ">=", Timestamp.fromDate(start)),
    where("createdAt", "<", Timestamp.fromDate(end)),
    orderBy("createdAt", "desc"),
  );

  return onSnapshot(
    logsQuery,
    { includeMetadataChanges: true },
    (snapshot) => {
      const entries = snapshot.docs.map((document) =>
        mapLogDocument(
          document as DocumentSnapshot<FirestoreLogEntry>,
          { serverTimestamps: "estimate" },
        ),
      );
      onData(entries, {
        fromCache: snapshot.metadata.fromCache,
        hasPendingWrites: snapshot.metadata.hasPendingWrites,
      });
    },
    (error) => onError(error),
  );
}
