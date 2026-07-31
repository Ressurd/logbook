import { doc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";

import { stackTrackerInputSchema, type StackTrackerInput } from "../schemas/stack.schema";
import {
  getUserStackTrackerDocument,
  getUserStackTrackersCollection,
} from "@/lib/firebase/firestore";

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

