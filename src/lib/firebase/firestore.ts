import { collection, doc, type CollectionReference } from "firebase/firestore";

import { getFirebaseServices } from "./client";

export function getUserLogsCollection(uid: string): CollectionReference {
  return collection(getFirebaseServices().db, "users", uid, "logs");
}

export function getUserLogDocument(uid: string, logId: string) {
  return doc(getFirebaseServices().db, "users", uid, "logs", logId);
}

export function getUserStackTrackersCollection(uid: string): CollectionReference {
  return collection(getFirebaseServices().db, "users", uid, "stackTrackers");
}

export function getUserStackTrackerDocument(uid: string, trackerId: string) {
  return doc(getFirebaseServices().db, "users", uid, "stackTrackers", trackerId);
}

export function getUserStackEventsCollection(uid: string): CollectionReference {
  return collection(getFirebaseServices().db, "users", uid, "stackEvents");
}

export function getUserStackEventDocument(uid: string, eventId: string) {
  return doc(getFirebaseServices().db, "users", uid, "stackEvents", eventId);
}
