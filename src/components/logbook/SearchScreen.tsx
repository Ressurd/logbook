"use client";

import { Clock3, RefreshCw, Search as SearchIcon } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { AppShell } from "@/components/layout/AppShell";
import { syncSearchCache } from "@/features/logbook/api/syncSearchCache";
import type { CachedLogEntry } from "@/features/logbook/model/logEntry.types";
import type { FrequentKeyword } from "@/features/logbook/search/frequentKeywords";
import {
  getFrequentCachedKeywords,
  isSearchCacheReady,
  searchCachedLogs,
} from "@/features/logbook/search/searchDb";
import {
  formatKstDateShort,
  formatKstTime,
  getTodayKstDateString,
} from "@/features/logbook/utils/date";
import { getErrorMessage } from "@/features/logbook/utils/format";
import { useAuth } from "@/hooks/useAuth";

export function SearchScreen() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [entries, setEntries] = useState<CachedLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [visibleCount, setVisibleCount] = useState(50);
  const [syncing, setSyncing] = useState(true);
  const [cacheReady, setCacheReady] = useState(false);
  const [syncMessage, setSyncMessage] = useState("검색 기록을 준비하는 중");
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncRevision, setSyncRevision] = useState(0);
  const [frequentKeywords, setFrequentKeywords] = useState<FrequentKeyword[]>([]);

  const refreshFrequentKeywords = useCallback(async (uid: string) => {
    try {
      setFrequentKeywords(await getFrequentCachedKeywords(uid));
    } catch {
      setFrequentKeywords([]);
    }
  }, []);

  const synchronize = useCallback(async () => {
    const uid = user!.uid;
    setSyncing(true);
    setError(null);
    let hadReadyCache = false;
    try {
      hadReadyCache = await isSearchCacheReady(uid);
      setCacheReady(hadReadyCache);
      if (hadReadyCache) await refreshFrequentKeywords(uid);
      const result = await syncSearchCache(uid, (progress) => {
        const mode = progress.mode === "full" ? "전체" : "변경분";
        setSyncMessage(
          `${mode} 동기화 중 · ${progress.processed.toLocaleString("ko-KR")}개 처리`,
        );
      });
      setSyncMessage(
        result.mode === "full"
          ? `전체 기록 ${result.processed.toLocaleString("ko-KR")}개 동기화 완료`
          : `변경된 기록 ${result.processed.toLocaleString("ko-KR")}개 확인 완료`,
      );
      setCacheReady(true);
      await refreshFrequentKeywords(uid);
      setSyncRevision((revision) => revision + 1);
    } catch (syncError) {
      setError(
        getErrorMessage(
          syncError,
          "검색 기록을 동기화하지 못했습니다. 기존 캐시로 검색합니다.",
        ),
      );
      setCacheReady(hadReadyCache);
      if (hadReadyCache) await refreshFrequentKeywords(uid);
    } finally {
      setSyncing(false);
    }
  }, [refreshFrequentKeywords, user]);

  useEffect(() => {
    const timer = window.setTimeout(() => void synchronize(), 0);
    return () => window.clearTimeout(timer);
  }, [synchronize]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
      setVisibleCount(50);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    let active = true;
    if (!debouncedQuery || !cacheReady) {
      return;
    }
    void Promise.resolve().then(async () => {
      if (active) setSearching(true);
      try {
        const result = await searchCachedLogs(
          user!.uid,
          debouncedQuery,
          visibleCount,
        );
        if (!active) return;
        setEntries(result.entries);
        setTotal(result.total);
      } catch (searchError) {
        if (active) {
          setError(getErrorMessage(searchError, "검색하지 못했습니다."));
        }
      } finally {
        if (active) setSearching(false);
      }
    });
    return () => {
      active = false;
    };
  }, [cacheReady, debouncedQuery, syncRevision, user, visibleCount]);

  return (
    <AppShell>
      <section className="page-heading">
        <div>
          <p className="eyebrow">내 기록 찾기</p>
          <h1>검색</h1>
        </div>
        <button
          className="text-button sync-button"
          type="button"
          disabled={syncing}
          onClick={() => void synchronize()}
        >
          <RefreshCw size={15} className={syncing ? "spin" : undefined} />
          새로고침
        </button>
      </section>
      <label className="search-field">
        <SearchIcon size={20} aria-hidden="true" />
        <span className="sr-only">기록 내용 검색</span>
        <input
          type="search"
          value={query}
          placeholder="기록 내용에서 검색"
          autoComplete="off"
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      {cacheReady && frequentKeywords.length > 0 ? (
        <section className="frequent-keywords" aria-labelledby="frequent-keywords-title">
          <h2 id="frequent-keywords-title">자주 쓴 단어</h2>
          <div className="keyword-list">
            {frequentKeywords.map(({ word, count }) => (
              <button
                key={word}
                type="button"
                className="keyword-chip"
                aria-label={`${word}, ${count}개 기록에서 사용, 검색하기`}
                onClick={() => setQuery(word)}
              >
                <span>{word}</span>
                <small>{count}</small>
              </button>
            ))}
          </div>
        </section>
      ) : null}
      <div className="search-status" aria-live="polite">
        <span>{syncMessage}</span>
        {searching ? <span>검색 중</span> : null}
      </div>
      {error ? <p className="state-message error compact">{error}</p> : null}

      {!debouncedQuery ? (
        <div className="search-prompt">
          <SearchIcon size={25} aria-hidden="true" />
          <p>찾고 싶은 단어나 문장을 입력하세요.</p>
          <span>한글 부분 문자열과 대소문자 구분 없는 검색을 지원합니다.</span>
        </div>
      ) : !cacheReady ? (
        <p className="state-message">
          전체 동기화가 완료되면 검색할 수 있습니다.
        </p>
      ) : (
        <section className="search-results" aria-label="검색 결과">
          <div className="list-heading">
            <h2>검색 결과 {total.toLocaleString("ko-KR")}</h2>
          </div>
          {entries.length === 0 && !searching ? (
            <p className="state-message">일치하는 기록이 없습니다.</p>
          ) : (
            entries.map((entry) => {
              const createdAt = new Date(entry.createdAt);
              const date = getTodayKstDateString(createdAt);
              return (
                <Link
                  key={entry.key}
                  href={`/?date=${date}`}
                  className="search-result"
                >
                  <div className="result-meta">
                    <span>{formatKstDateShort(createdAt)}</span>
                    <time dateTime={createdAt.toISOString()}>
                      {formatKstTime(createdAt)}
                    </time>
                  </div>
                  <p>{entry.content}</p>
                  <Clock3 size={15} aria-hidden="true" />
                </Link>
              );
            })
          )}
          {entries.length < total ? (
            <button
              type="button"
              className="secondary-button load-more"
              onClick={() => setVisibleCount((count) => count + 50)}
            >
              더 보기
            </button>
          ) : null}
        </section>
      )}
    </AppShell>
  );
}
