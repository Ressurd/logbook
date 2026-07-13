import { serverTimestamp, updateDoc } from "firebase/firestore";

import { updateLogEntrySchema } from "../schemas/logEntry.schema";
import { getUserLogDocument } from "@/lib/firebase/firestore";

export async function updateLogEntry(
  uid: string,
  id: string,
  content: string,
): Promise<void> {
  const data = updateLogEntrySchema.parse({ id, content });
  await updateDoc(getUserLogDocument(uid, data.id), {
    content: data.content,
    updatedAt: serverTimestamp(),
  });
}
