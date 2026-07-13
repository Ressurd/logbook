"use client";

import {
  useCallback,
  useEffect,
  useState,
  type SetStateAction,
} from "react";

import {
  subscribeDailyLogs,
  type DailyLogsMetadata,
} from "@/features/logbook/api/subscribeDailyLogs";
import type { LogEntry } from "@/features/logbook/model/logEntry.types";

type DailyLogsState = {
  key: string;
  entries: LogEntry[];
  metadata: DailyLogsMetadata;
  loading: boolean;
  error: string | null;
};

function createInitialState(key: string): DailyLogsState {
  return {
    key,
    entries: [],
    metadata: { fromCache: false, hasPendingWrites: false },
    loading: true,
    error: null,
  };
}

export function useDailyLogs(uid: string, date: string) {
  const key = `${uid}:${date}`;
  const [state, setState] = useState<DailyLogsState>(() => createInitialState(key));

  useEffect(() => {
    let active = true;
    let unsubscribe: () => void = () => undefined;
    try {
      unsubscribe = subscribeDailyLogs(
        uid,
        date,
        (entries, metadata) => {
          if (!active) return;
          setState({ key, entries, metadata, loading: false, error: null });
        },
        () => {
          if (!active) return;
          setState({
            ...createInitialState(key),
            loading: false,
            error:
              "기록을 불러오지 못했습니다. 네트워크와 Firestore 인덱스를 확인해주세요.",
          });
        },
      );
    } catch {
      queueMicrotask(() => {
        if (!active) return;
        setState({
          ...createInitialState(key),
          loading: false,
          error:
            "기록 구독을 시작하지 못했습니다. Firebase 설정을 확인해주세요.",
        });
      });
    }

    return () => {
      active = false;
      unsubscribe();
    };
  }, [date, key, uid]);

  const visibleState = state.key === key ? state : createInitialState(key);
  const setEntries = useCallback(
    (action: SetStateAction<LogEntry[]>) => {
      setState((current) => {
        const base = current.key === key ? current : createInitialState(key);
        const entries =
          typeof action === "function" ? action(base.entries) : action;
        return { ...base, entries };
      });
    },
    [key],
  );

  return { ...visibleState, setEntries };
}
