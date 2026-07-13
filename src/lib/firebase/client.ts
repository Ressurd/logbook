import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import {
  getFirestore,
  initializeFirestore,
  memoryLocalCache,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from "firebase/firestore";

export type FirebaseServices = {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  persistence: "indexeddb" | "memory";
};

export class FirebaseConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FirebaseConfigurationError";
  }
}

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const requiredConfig = [
  ["NEXT_PUBLIC_FIREBASE_API_KEY", firebaseConfig.apiKey],
  ["NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", firebaseConfig.authDomain],
  ["NEXT_PUBLIC_FIREBASE_PROJECT_ID", firebaseConfig.projectId],
  ["NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID", firebaseConfig.messagingSenderId],
  ["NEXT_PUBLIC_FIREBASE_APP_ID", firebaseConfig.appId],
] as const;

type FirebaseGlobal = typeof globalThis & {
  __logbookFirebaseServices?: FirebaseServices;
};

const firebaseGlobal = globalThis as FirebaseGlobal;

export function getFirebaseConfigurationError(): string | null {
  const missing = requiredConfig
    .filter(([, value]) => !value?.trim())
    .map(([name]) => name);

  if (missing.length === 0) return null;
  return `Firebase 연결 설정이 필요합니다. .env.local에 ${missing.join(", ")} 값을 입력해주세요.`;
}

export function getFirebaseServices(): FirebaseServices {
  if (firebaseGlobal.__logbookFirebaseServices) {
    return firebaseGlobal.__logbookFirebaseServices;
  }
  if (typeof window === "undefined") {
    throw new FirebaseConfigurationError(
      "Firebase는 브라우저에서만 초기화할 수 있습니다.",
    );
  }

  const configError = getFirebaseConfigurationError();
  if (configError) throw new FirebaseConfigurationError(configError);

  const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  let persistence: FirebaseServices["persistence"] = "indexeddb";
  let db: Firestore;

  try {
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    });
  } catch {
    persistence = "memory";
    try {
      db = initializeFirestore(app, { localCache: memoryLocalCache() });
    } catch {
      db = getFirestore(app);
    }
  }

  const services = { app, auth: getAuth(app), db, persistence };
  firebaseGlobal.__logbookFirebaseServices = services;
  return services;
}
