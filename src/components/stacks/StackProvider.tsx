"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  cancelStackReconciliation,
  reconcileAllActiveTrackers,
} from "@/features/stacks/api/reconcileCharges";
import { subscribeActiveStackTrackers, type StackSubscriptionMetadata } from "@/features/stacks/api/subscribeStacks";
import type { StackTracker } from "@/features/stacks/model/stack.types";
import { getNextTrackerChargeAt, getKstPeriodDate } from "@/features/stacks/utils/stackCalculations";
import { getKstDayRange } from "@/features/logbook/utils/date";
import { createReconciliationTriggerDebouncer } from "@/features/stacks/utils/reconciliationTrigger";
import { useAuth } from "@/hooks/useAuth";

type StackContextValue = {
  trackers: StackTracker[];
  metadata: StackSubscriptionMetadata;
  loading: boolean;
  error: string | null;
  reconcile: () => Promise<void>;
};

const StackContext = createContext<StackContextValue | null>(null);

export function StackProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [trackers, setTrackers] = useState<StackTracker[]>([]);
  const [metadata, setMetadata] = useState<StackSubscriptionMetadata>({ fromCache: false, hasPendingWrites: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ownerUid, setOwnerUid] = useState<string | null>(null);
  const [timerRevision, setTimerRevision] = useState(0);
  const trackersRef = useRef<{ uid: string | null; entries: StackTracker[] }>({
    uid: null,
    entries: [],
  });
  const timerRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const reconcile = useCallback(async () => {
    if (!user || typeof navigator === "undefined" || !navigator.onLine) return;
    if (trackersRef.current.uid !== user.uid) return;
    try {
      await reconcileAllActiveTrackers(user.uid, trackersRef.current.entries);
      if (mountedRef.current) setError(null);
    } catch {
      if (mountedRef.current) setError("스택 충전 기록 동기화를 완료하지 못했습니다. 현재 수량 계산은 계속 사용할 수 있습니다.");
    }
  }, [user]);

  useEffect(() => {
    const currentTrackers = ownerUid === user?.uid ? trackers : [];
    trackersRef.current = { uid: user?.uid ?? null, entries: currentTrackers };
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    if (!user || currentTrackers.length === 0) return;
    const now = new Date();
    const nextTimes = currentTrackers
      .map((tracker) => getNextTrackerChargeAt(tracker, now)?.getTime())
      .filter((value): value is number => value !== undefined);
    const nextAt = Math.min(
      ...nextTimes,
      getKstDayRange(getKstPeriodDate(now)).end.getTime(),
    );
    timerRef.current = window.setTimeout(() => {
      void reconcile().finally(() => {
        if (mountedRef.current) setTimerRevision((revision) => revision + 1);
      });
    }, Math.max(250, Math.min(nextAt - now.getTime() + 250, 2_147_000_000)));
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, [ownerUid, reconcile, timerRevision, trackers, user]);

  useEffect(() => {
    if (!user) {
      trackersRef.current = { uid: null, entries: [] };
      return;
    }
    let active = true;
    const unsubscribe = subscribeActiveStackTrackers(
      user.uid,
      (nextTrackers, nextMetadata) => {
        if (!active) return;
        trackersRef.current = { uid: user.uid, entries: nextTrackers };
        setOwnerUid(user.uid);
        setTrackers(nextTrackers);
        setMetadata(nextMetadata);
        setLoading(false);
        if (!nextMetadata.fromCache && navigator.onLine) void reconcileAllActiveTrackers(user.uid, nextTrackers).catch(() => {
          if (active) setError("스택 충전 기록 동기화를 완료하지 못했습니다. 현재 수량 계산은 계속 사용할 수 있습니다.");
        });
      },
      () => {
        if (active) {
          setOwnerUid(user.uid);
          setLoading(false);
          setError("스택 트래커를 불러오지 못했습니다.");
        }
      },
    );
    const debouncer = createReconciliationTriggerDebouncer(() => void reconcile());
    const trigger = () => {
      if (document.visibilityState !== "visible" || !navigator.onLine) return;
      debouncer.trigger();
    };
    window.addEventListener("online", trigger);
    document.addEventListener("visibilitychange", trigger);
    return () => {
      active = false;
      unsubscribe();
      cancelStackReconciliation(user.uid);
      debouncer.cancel();
      window.removeEventListener("online", trigger);
      document.removeEventListener("visibilitychange", trigger);
    };
  }, [reconcile, user]);

  const visibleForUser = Boolean(user && ownerUid === user.uid);
  const value = useMemo(() => ({
    trackers: visibleForUser ? trackers : [],
    metadata: visibleForUser ? metadata : { fromCache: false, hasPendingWrites: false },
    loading: Boolean(user) && (!visibleForUser || loading),
    error: visibleForUser ? error : null,
    reconcile,
  }), [error, loading, metadata, reconcile, trackers, user, visibleForUser]);
  return <StackContext.Provider value={value}>{children}</StackContext.Provider>;
}

export function useStacks(): StackContextValue {
  const value = useContext(StackContext);
  if (!value) throw new Error("useStacks는 StackProvider 안에서 사용해야 합니다.");
  return value;
}
