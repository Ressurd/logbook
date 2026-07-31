"use client";

import { useEffect, useMemo, useState } from "react";

import { subscribeStackTrackerConsumes } from "@/features/stacks/api/subscribeStacks";
import type { StackTracker } from "@/features/stacks/model/stack.types";

type State = {
  key: string;
  counts: Record<string, number>;
  loading: boolean;
  error: string | null;
  hasPendingWrites: boolean;
};

function initial(key: string, loading: boolean): State {
  return { key, counts: {}, loading, error: null, hasPendingWrites: false };
}

export function useCumulativeStackConsumes(
  uid: string,
  trackers: readonly StackTracker[],
) {
  const trackerIdsKey = useMemo(
    () => trackers
      .filter((tracker) => tracker.scheduleMode === "interval_days")
      .map((tracker) => tracker.id)
      .sort()
      .join(","),
    [trackers],
  );
  const trackerIds = useMemo(
    () => trackerIdsKey ? trackerIdsKey.split(",") : [],
    [trackerIdsKey],
  );
  const key = `${uid}:${trackerIdsKey}`;
  const [state, setState] = useState<State>(() => initial(key, trackerIds.length > 0));

  useEffect(() => {
    if (trackerIds.length === 0) return;
    let active = true;
    const completed = new Set<string>();
    const counts: Record<string, number> = {};
    const pending: Record<string, boolean> = {};
    let subscriptionError = false;
    const unsubscribes = trackerIds.map((trackerId) =>
      subscribeStackTrackerConsumes(
        uid,
        trackerId,
        (events, metadata) => {
          if (!active) return;
          completed.add(trackerId);
          counts[trackerId] = events.length;
          pending[trackerId] = metadata.hasPendingWrites;
          setState({
            key,
            counts: { ...counts },
            loading: completed.size < trackerIds.length,
            error: subscriptionError ? "일부 누적 사용량을 불러오지 못했습니다." : null,
            hasPendingWrites: Object.values(pending).some(Boolean),
          });
        },
        () => {
          subscriptionError = true;
          if (active) setState({ ...initial(key, false), error: "누적 사용량을 불러오지 못했습니다." });
        },
      ),
    );
    return () => {
      active = false;
      unsubscribes.forEach((unsubscribe) => unsubscribe());
    };
  }, [key, trackerIds, uid]);

  if (trackerIds.length === 0) return initial(key, false);
  return state.key === key ? state : initial(key, true);
}
