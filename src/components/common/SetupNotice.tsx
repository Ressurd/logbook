import { Settings2 } from "lucide-react";

export function SetupNotice({ message }: { message: string }) {
  return (
    <main className="screen-center setup-screen">
      <div className="setup-mark" aria-hidden="true">
        <Settings2 size={24} />
      </div>
      <p className="eyebrow">개발 환경 안내</p>
      <h1>Firebase 연결이 필요합니다</h1>
      <p>{message}</p>
      <p className="muted">
        루트의 <code>.env.example</code>을 <code>.env.local</code>로 복사한 뒤
        Firebase 웹 앱 값을 입력해주세요.
      </p>
    </main>
  );
}
