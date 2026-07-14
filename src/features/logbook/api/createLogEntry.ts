import { doc, serverTimestamp, setDoc } from "firebase/firestore";

import { createLogEntrySchema } from "../schemas/logEntry.schema";
import { getUserLogsCollection } from "@/lib/firebase/firestore";

export type LogEntryWrite = {
  id: string;
  completion: Promise<void>;
};

export function createLogEntry(uid: string, content: string): LogEntryWrite {
  const data = createLogEntrySchema.parse({ content });
  const reference = doc(getUserLogsCollection(uid));
  return {
    id: reference.id,
    completion: setDoc(reference, {
      content: data.content,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      deletedAt: null,
    }),
  };
}
