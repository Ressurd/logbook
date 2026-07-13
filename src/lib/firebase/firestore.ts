import { collection, doc, type CollectionReference } from "firebase/firestore";

import { getFirebaseServices } from "./client";

export function getUserLogsCollection(uid: string): CollectionReference {
  return collection(getFirebaseServices().db, "users", uid, "logs");
}

export function getUserLogDocument(uid: string, logId: string) {
  return doc(getFirebaseServices().db, "users", uid, "logs", logId);
}
