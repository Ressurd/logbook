"use client";

import { BookOpenText } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { LoadingState } from "@/components/common/LoadingState";
import { SetupNotice } from "@/components/common/SetupNotice";
import { useAuth } from "@/hooks/useAuth";

export default function LoginPage() {
  const {
    user,
    loading,
    busy,
    error,
    configurationError,
    signIn,
    clearError,
  } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.replace("/");
  }, [loading, router, user]);

  if (configurationError) return <SetupNotice message={configurationError} />;
  if (loading || user) return <LoadingState label="로그인 확인 중" fullScreen />;

  return (
    <main className="login-page">
      <div className="login-panel">
        <div className="brand-mark" aria-hidden="true">
          <BookOpenText size={27} />
        </div>
        <p className="eyebrow">PRIVATE LOGBOOK</p>
        <h1>떠오른 생각을<br />놓치지 마세요.</h1>
        <p className="login-description">
          입력 시각과 함께 빠르게 기록하고, 내 기기 어디서든 같은 로그를
          확인하는 개인용 기록장입니다.
        </p>
        <button
          className="google-button"
          type="button"
          disabled={busy}
          onClick={() => {
            clearError();
            void signIn();
          }}
        >
          <span className="google-g" aria-hidden="true">G</span>
          {busy ? "로그인 중" : "Google 계정으로 계속"}
        </button>
        {error ? (
          <p className="login-error" role="alert">
            {error}
          </p>
        ) : null}
        <p className="login-footnote">
          기록은 로그인한 계정의 UID 아래에만 저장됩니다.
        </p>
      </div>
    </main>
  );
}
