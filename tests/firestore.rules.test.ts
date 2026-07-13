import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { afterAll, afterEach, beforeAll, describe, it } from "vitest";

const PROJECT_ID = "demo-logbook";
let environment: RulesTestEnvironment;

beforeAll(async () => {
  environment = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      host: "127.0.0.1",
      port: 8080,
      rules: readFileSync(resolve("firestore.rules"), "utf8"),
    },
  });
});

afterEach(async () => environment.clearFirestore());
afterAll(async () => environment.cleanup());

function logRef(uid: string, id = "log-1") {
  return doc(environment.authenticatedContext(uid).firestore(), "users", uid, "logs", id);
}

async function seedLog(uid: string, id = "log-1") {
  const createdAt = Timestamp.fromDate(new Date("2026-07-13T05:23:17.000Z"));
  await environment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "users", uid, "logs", id), {
      content: "기존 기록",
      createdAt,
      updatedAt: createdAt,
      deletedAt: null,
    });
  });
  return createdAt;
}

describe("Firestore Security Rules", () => {
  it("본인 로그를 생성하고 읽을 수 있다", async () => {
    const reference = logRef("owner");
    await assertSucceeds(
      setDoc(reference, {
        content: "새 기록",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        deletedAt: null,
      }),
    );
    await assertSucceeds(getDoc(reference));
  });

  it("인증되지 않은 생성과 읽기를 차단한다", async () => {
    await seedLog("owner");
    const firestore = environment.unauthenticatedContext().firestore();
    const reference = doc(firestore, "users", "owner", "logs", "log-1");
    await assertFails(getDoc(reference));
    await assertFails(
      setDoc(doc(firestore, "users", "owner", "logs", "new"), {
        content: "비로그인 기록",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        deletedAt: null,
      }),
    );
  });

  it("다른 UID의 로그를 읽거나 수정할 수 없다", async () => {
    await seedLog("owner");
    const otherView = doc(
      environment.authenticatedContext("other").firestore(),
      "users",
      "owner",
      "logs",
      "log-1",
    );
    await assertFails(getDoc(otherView));
    await assertFails(
      updateDoc(otherView, {
        content: "침입",
        updatedAt: serverTimestamp(),
      }),
    );
  });

  it("실제 문서 삭제를 차단한다", async () => {
    await seedLog("owner");
    await assertFails(deleteDoc(logRef("owner")));
  });

  it("내용 길이 경계와 타입을 검증한다", async () => {
    const invalid = (content: string, id: string) =>
      setDoc(logRef("owner", id), {
        content,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        deletedAt: null,
      });
    await assertFails(invalid("", "empty"));
    await assertSucceeds(invalid("가".repeat(10_000), "max-length"));
    await assertFails(invalid("가".repeat(10_001), "too-long"));
    await assertFails(
      setDoc(logRef("owner", "wrong-type"), {
        content: 123,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        deletedAt: null,
      }),
    );
  });

  it("생성 시 정확한 필드 집합과 request.time을 요구한다", async () => {
    await assertFails(
      setDoc(logRef("owner", "missing"), {
        content: "필드 누락",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    );
    await assertFails(
      setDoc(logRef("owner", "extra"), {
        content: "추가 필드",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        deletedAt: null,
        owner: "owner",
      }),
    );
    const arbitraryTime = Timestamp.fromDate(new Date("2026-07-13T00:00:00Z"));
    await assertFails(
      setDoc(logRef("owner", "client-time"), {
        content: "클라이언트 시간",
        createdAt: arbitraryTime,
        updatedAt: arbitraryTime,
        deletedAt: null,
      }),
    );
  });

  it("일반 수정은 content와 updatedAt만 변경할 수 있다", async () => {
    await seedLog("owner");
    const reference = logRef("owner");
    await assertSucceeds(
      updateDoc(reference, {
        content: "수정 기록",
        updatedAt: serverTimestamp(),
      }),
    );
    await assertFails(
      updateDoc(reference, {
        createdAt: Timestamp.fromDate(new Date("2026-07-14T00:00:00.000Z")),
        updatedAt: serverTimestamp(),
      }),
    );
    await assertFails(
      updateDoc(reference, {
        content: deleteField(),
        updatedAt: serverTimestamp(),
      }),
    );
    await assertFails(
      updateDoc(reference, {
        unexpected: true,
        updatedAt: serverTimestamp(),
      }),
    );
  });

  it("deletedAt 임의 변경은 차단하고 request.time 소프트 삭제만 허용한다", async () => {
    await seedLog("owner");
    const reference = logRef("owner");
    await assertFails(
      updateDoc(reference, {
        deletedAt: Timestamp.fromDate(new Date("2026-07-13T00:00:00Z")),
        updatedAt: serverTimestamp(),
      }),
    );
    await assertSucceeds(
      updateDoc(reference, {
        deletedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    );
  });

  it("삭제된 문서의 수정과 복원을 모두 차단한다", async () => {
    await seedLog("owner");
    const reference = logRef("owner");
    await assertSucceeds(
      updateDoc(reference, {
        deletedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    );
    await assertFails(
      updateDoc(reference, {
        content: "삭제 후 수정",
        updatedAt: serverTimestamp(),
      }),
    );
    await assertFails(
      updateDoc(reference, {
        deletedAt: null,
        updatedAt: serverTimestamp(),
      }),
    );
  });
});
