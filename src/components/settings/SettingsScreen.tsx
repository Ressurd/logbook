"use client";

import {
  DatabaseZap,
  Download,
  FileJson2,
  FileSpreadsheet,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";

import { AppShell } from "@/components/layout/AppShell";
import { fetchAllActiveLogs } from "@/features/logbook/api/fetchLogs";
import { clearSearchCache } from "@/features/logbook/search/searchDb";
import {
  createCsvBackup,
  createJsonBackup,
  downloadTextFile,
} from "@/features/logbook/utils/export";
import { getErrorMessage } from "@/features/logbook/utils/format";
import { useAuth } from "@/hooks/useAuth";

type Action = "json" | "csv" | "cache" | "logout" | null;

export function SettingsScreen() {
  const { user, signOut } = useAuth();
  const [action, setAction] = useState<Action>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState(false);

  const runAction = async (nextAction: Exclude<Action, null>, task: () => Promise<string>) => {
    if (action) return;
    setAction(nextAction);
    setMessage(null);
    setError(false);
    try {
      setMessage(await task());
    } catch (actionError) {
      setError(true);
      setMessage(getErrorMessage(actionError, "작업을 완료하지 못했습니다."));
    } finally {
      setAction(null);
    }
  };

  const exportBackup = async (format: "json" | "csv") => {
    const entries = await fetchAllActiveLogs(user!.uid);
    if (format === "json") {
      downloadTextFile(createJsonBackup(entries), "json");
    } else {
      downloadTextFile(createCsvBackup(entries), "csv");
    }
    return `${entries.length.toLocaleString("ko-KR")}개 기록을 ${format.toUpperCase()}로 저장했습니다.`;
  };

  return (
    <AppShell>
      <section className="page-heading">
        <div>
          <p className="eyebrow">계정과 데이터</p>
          <h1>설정</h1>
        </div>
      </section>

      <section className="settings-section" aria-labelledby="account-title">
        <h2 id="account-title">Google 계정</h2>
        <div className="account-row">
          <div className="account-avatar" aria-hidden="true">
            {(user?.displayName || user?.email || "L").slice(0, 1).toUpperCase()}
          </div>
          <div className="account-text">
            <strong>{user?.displayName || "Google 사용자"}</strong>
            <span>{user?.email}</span>
          </div>
          <ShieldCheck size={19} aria-label="인증된 계정" />
        </div>
        <button
          type="button"
          className="settings-action"
          disabled={Boolean(action)}
          onClick={() =>
            void runAction("logout", async () => {
              await signOut();
              return "로그아웃했습니다.";
            })
          }
        >
          <LogOut size={18} />
          <span>로그아웃</span>
        </button>
      </section>

      <section className="settings-section" aria-labelledby="backup-title">
        <h2 id="backup-title">백업</h2>
        <p>삭제되지 않은 기록을 최신순으로 내려받습니다.</p>
        <button
          type="button"
          className="settings-action"
          disabled={Boolean(action)}
          aria-busy={action === "json"}
          onClick={() => void runAction("json", () => exportBackup("json"))}
        >
          <FileJson2 size={19} />
          <span>{action === "json" ? "JSON 백업 준비 중" : "JSON 백업"}</span>
          <Download size={16} />
        </button>
        <button
          type="button"
          className="settings-action"
          disabled={Boolean(action)}
          aria-busy={action === "csv"}
          onClick={() => void runAction("csv", () => exportBackup("csv"))}
        >
          <FileSpreadsheet size={19} />
          <span>{action === "csv" ? "CSV 백업 준비 중" : "CSV 백업"}</span>
          <Download size={16} />
        </button>
      </section>

      <section className="settings-section" aria-labelledby="cache-title">
        <h2 id="cache-title">검색 캐시</h2>
        <p>Firestore 오프라인 캐시는 유지하고, 검색용 IndexedDB만 초기화합니다.</p>
        <button
          type="button"
          className="settings-action"
          disabled={Boolean(action)}
          onClick={() =>
            void runAction("cache", async () => {
              await clearSearchCache(user!.uid);
              return "검색 캐시를 초기화했습니다. 다음 검색에서 전체 동기화합니다.";
            })
          }
        >
          <DatabaseZap size={19} />
          <span>동기화 캐시 초기화</span>
        </button>
      </section>

      {message ? (
        <p className={error ? "state-message error compact" : "state-message success compact"} aria-live="polite">
          {message}
        </p>
      ) : null}

      <section className="settings-section app-info" aria-labelledby="app-title">
        <h2 id="app-title">앱 정보</h2>
        <div><span>이름</span><strong>Logbook</strong></div>
        <div><span>시간대</span><strong>Asia/Seoul</strong></div>
        <div><span>버전</span><strong>0.1.0</strong></div>
      </section>
    </AppShell>
  );
}
