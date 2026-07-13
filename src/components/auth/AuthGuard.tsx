"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { LoadingState } from "@/components/common/LoadingState";
import { SetupNotice } from "@/components/common/SetupNotice";
import { useAuth } from "@/hooks/useAuth";

export function AuthGuard({ children }: { children: ReactNode }) {
  const { user, loading, configurationError } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !configurationError && !user) router.replace("/login");
  }, [configurationError, loading, router, user]);

  if (configurationError) return <SetupNotice message={configurationError} />;
  if (loading || !user) return <LoadingState label="로그인 확인 중" fullScreen />;
  return children;
}
