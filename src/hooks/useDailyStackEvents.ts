"use client";

import { useEffect, useState } from "react";

import {
  subscribeDailyStackEvents,
  type StackSubscriptionMetadata,
} from "@/features/stacks/api/subscribeStacks";
import type { StackEvent } from "@/features/stacks/model/stack.types";

type State = {
  key: string;
  events: StackEvent[];
  metadata: StackSubscriptionMetadata;
  loading: boolean;
  error: string | null;
};

function initial(key: string): State {
  return {
    key,
    events: [],
    metadata: { fromCache: false, hasPendingWrites: false },
    loading: true,
    error: null,
  };
}

export function useDailyStackEvents(uid: string, date: string) {
  const key = `${uid}:${date}`;
  const [state, setState] = useState<State>(() => initial(key));

  useEffect(() => {
    let active = true;
    let unsubscribe: () => void = () => undefined;
    try {
      unsubscribe = subscribeDailyStackEvents(
        uid,
        date,
        (events, metadata) => {
          if (active) setState({ key, events, metadata, loading: false, error: null });
        },
        () => {
          if (active) setState({ ...initial(key), loading: false, error: "스택 이벤트를 불러오지 못했습니다." });
        },
      );
    } catch {
      queueMicrotask(() => {
        if (active) setState({ ...initial(key), loading: false, error: "스택 이벤트 구독을 시작하지 못했습니다." });
      });
    }
    return () => {
      active = false;
      unsubscribe();
    };
  }, [date, key, uid]);

  return state.key === key ? state : initial(key);
}
