import { addDoc, serverTimestamp } from "firebase/firestore";

import { createLogEntrySchema } from "../schemas/logEntry.schema";
import { getUserLogsCollection } from "@/lib/firebase/firestore";

export async function createLogEntry(uid: string, content: string) {
  const data = createLogEntrySchema.parse({ content });
  return addDoc(getUserLogsCollection(uid), {
    content: data.content,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    deletedAt: null,
  });
}
