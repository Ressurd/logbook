import { doc, serverTimestamp, setDoc, updateDoc, writeBatch } from "firebase/firestore";

import { stackTrackerInputSchema, type StackTrackerInput } from "../schemas/stack.schema";
import {
  getUserStackTrackerDocument,
  getUserStackTrackersCollection,
} from "@/lib/firebase/firestore";
import { getFirebaseServices } from "@/lib/firebase/client";

export function createStackTracker(uid: string, input: StackTrackerInput) {
  const data = stackTrackerInputSchema.parse(input);
  const reference = doc(getUserStackTrackersCollection(uid));
  return setDoc(reference, {
    ...data,
    isActive: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export function updateStackTracker(
  uid: string,
  trackerId: string,
  input: StackTrackerInput,
) {
  const data = stackTrackerInputSchema.parse(input);
  return updateDoc(getUserStackTrackerDocument(uid, trackerId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export function deactivateStackTracker(uid: string, trackerId: string) {
  return updateDoc(getUserStackTrackerDocument(uid, trackerId), {
    isActive: false,
    updatedAt: serverTimestamp(),
  });
}

export async function replaceStackTracker(
  uid: string,
  trackerId: string,
  input: StackTrackerInput,
) {
  const data = stackTrackerInputSchema.parse(input);
  const replacement = doc(getUserStackTrackersCollection(uid));
  const batch = writeBatch(getFirebaseServices().db);
  batch.set(replacement, {
    ...data,
    isActive: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  batch.update(getUserStackTrackerDocument(uid, trackerId), {
    isActive: false,
    updatedAt: serverTimestamp(),
  });
  await batch.commit();
}
