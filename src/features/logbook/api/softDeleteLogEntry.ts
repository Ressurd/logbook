import { serverTimestamp, updateDoc } from "firebase/firestore";

import { getUserLogDocument } from "@/lib/firebase/firestore";

export async function softDeleteLogEntry(
  uid: string,
  id: string,
): Promise<void> {
  if (!id) throw new Error("삭제할 기록을 찾을 수 없습니다.");
  await updateDoc(getUserLogDocument(uid, id), {
    deletedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}
