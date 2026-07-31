# Logbook

떠오른 생각과 작업을 입력 시각과 함께 빠르게 남기고, 모바일과 PC에서 같은 기록을 확인하는 개인용 웹 로그북입니다. 모든 화면 날짜와 날짜 경계는 `Asia/Seoul` 기준이며, Firestore에는 UTC 기반 `Timestamp`로 저장합니다.

## 주요 기능

- Google 로그인과 선택적 단일 이메일 허용 목록
- 날짜별 실시간 기록 작성, 수정, 소프트 삭제
- PC `Enter` 저장, `Shift + Enter` 줄바꿈, 모바일 `Enter` 동작 선택
- 이전/다음/오늘/직접 선택 날짜 이동과 `?date=YYYY-MM-DD` 유지
- Firestore IndexedDB 오프라인 캐시와 멀티탭 동기화
- 별도 IndexedDB 검색 캐시를 이용한 한글 부분 문자열 검색
- 검색 캐시에서 계산한 UID별 자주 쓴 단어 바로 검색
- 삭제되지 않은 기록의 JSON/CSV 백업
- 새 기록 진입 애니메이션, 전체 다크 테마, 모바일 하단 내비게이션, PWA 설치
- UID 기반 Firestore Security Rules

## 기술 스택

- Next.js 16, App Router, React 19, TypeScript
- Tailwind CSS 4와 프로젝트 CSS
- Firebase Authentication, Cloud Firestore
- Zod, `date-fns`, `date-fns-tz`, `idb`
- Vitest, Firebase Rules Unit Testing, ESLint
- Next.js 기본 manifest/route 기능과 직접 작성한 service worker
- Vercel 배포 기준

Firebase Storage, Cloud Functions, 외부 검색 서비스, 유료 Firebase 기능은 사용하지 않습니다.

## 폴더 구조

```text
src/
├─ app/                         # /, /login, /search, /settings, PWA 메타데이터
├─ components/
│  ├─ auth/                    # 인증 상태와 보호 라우트
│  ├─ common/                  # 공통 로딩, 설정 안내, 대화상자
│  ├─ layout/                  # 앱 셸, 내비게이션, service worker 등록
│  ├─ logbook/                 # 작성, 날짜, 목록, 수정/삭제, 검색 UI
│  └─ settings/                # 계정, 백업, 캐시 설정 UI
├─ features/logbook/
│  ├─ api/                     # Firestore 읽기/쓰기/구독/검색 동기화
│  ├─ model/                   # 로그 타입과 매퍼
│  ├─ schemas/                 # Zod 입력 검증
│  ├─ search/                  # IndexedDB 검색 저장소
│  └─ utils/                   # KST 날짜, 표시, JSON/CSV 내보내기
├─ hooks/                      # 인증, 온라인 상태, 날짜별 실시간 목록
└─ lib/firebase/               # Firebase 단일 초기화, Auth, 참조 헬퍼

firestore.rules                # UID 기반 보안 규칙
firestore.indexes.json         # 날짜별/백업 쿼리 인덱스
firebase.json                  # Rules/Index/Emulator 설정
tests/firestore.rules.test.ts  # Firestore Emulator 보안 규칙 테스트
```

## 로컬 실행

요구 사항은 Node.js 20.9 이상과 npm입니다.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Windows PowerShell에서는 다음처럼 복사할 수 있습니다.

```powershell
Copy-Item .env.example .env.local
npm run dev
```

Firebase 값 없이도 lint, typecheck, test, production build는 성공합니다. 앱을 열면 Firebase 설정 안내 화면이 표시됩니다.

## Firebase 프로젝트 준비

### 1. 프로젝트와 웹 앱 생성

1. [Firebase Console](https://console.firebase.google.com/)에서 프로젝트를 생성합니다.
2. 프로젝트 개요에서 웹 앱(`</>`)을 등록합니다.
3. 표시된 Firebase 구성값을 `.env.local`에 옮깁니다. 이 값들은 Firebase 웹 클라이언트 식별자이며 서비스 계정 비밀키가 아닙니다.
4. Storage와 Cloud Functions는 활성화하지 않습니다.

### 2. Google 로그인 활성화

1. **Authentication → Sign-in method**로 이동합니다.
2. **Google** 제공업체를 활성화합니다.
3. 지원 이메일을 선택하고 저장합니다.
4. **Authentication → Settings → Authorized domains**에 로컬 및 배포 도메인을 등록합니다.

`localhost`는 개발용으로 확인하고, Vercel 배포 후에는 `프로젝트명.vercel.app`과 사용하는 사용자 지정 도메인을 추가합니다. `https://`나 경로 없이 호스트 이름만 입력합니다.

### 3. Cloud Firestore 생성

1. **Firestore Database → Create database**를 선택합니다.
2. 무료 Spark 플랜에서 사용할 데이터베이스를 만듭니다.
3. 주 사용자가 한국에 있다면 가까운 리전을 선택합니다. 생성 후 리전은 바꾸기 어렵습니다.
4. 임시 공개 규칙을 사용하지 말고 이 저장소의 `firestore.rules`를 배포합니다.

데이터 구조는 다음과 같습니다.

```text
users/{uid}/logs/{logId}
```

문서 필드:

```ts
{
  content: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  deletedAt: Timestamp | null;
}
```

문서 ID는 필드로 중복 저장하지 않습니다. 삭제는 문서를 제거하지 않고 `deletedAt`과 `updatedAt`을 서버 시간으로 갱신합니다.

### 4. Rules와 Index 배포

```bash
npm install -g firebase-tools
firebase login
firebase use --add
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

또는 `.firebaserc.example`을 `.firebaserc`로 복사한 뒤 프로젝트 ID를 바꿀 수 있습니다.

`firestore.rules`는 다음을 강제합니다.

- 인증된 사용자는 자기 UID 경로만 읽고 쓸 수 있음
- 허용 필드는 `content`, `createdAt`, `updatedAt`, `deletedAt`뿐임
- 내용은 1~10,000자
- 생성/수정 시간은 Firestore 요청 서버 시간
- `createdAt` 변경 금지
- 실제 문서 삭제 금지
- 삭제되지 않은 문서만 한 번 소프트 삭제 가능

## 환경변수

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_ALLOWED_EMAIL=
```

`NEXT_PUBLIC_ALLOWED_EMAIL`이 비어 있으면 Google 로그인 사용자가 모두 앱에 진입할 수 있습니다. 값을 넣으면 대소문자 구분 없이 해당 이메일만 허용하며, 다른 계정은 즉시 로그아웃됩니다. 이 값은 UI 접근 제한용이고 실제 데이터 보호는 Security Rules의 UID 검사로 수행합니다.

`firebase-admin`, 서비스 계정, private key는 필요하지 않으며 저장소나 Vercel 환경변수에 추가하지 마세요.

## 검색 캐시와 오프라인 동작

두 IndexedDB 저장소의 역할은 분리되어 있습니다.

1. **Firestore 내부 캐시**: Firebase SDK의 `persistentLocalCache`와 멀티탭 관리 기능을 사용합니다. 읽은 쿼리와 오프라인 쓰기를 보관하고 온라인 복귀 시 Firestore와 동기화합니다. 지원되지 않는 환경에서는 메모리 캐시로 폴백합니다.
2. **Logbook 검색 캐시**: `idb`로 모든 로그의 검색용 사본을 UID namespace별로 저장합니다. 첫 검색에서는 200개 단위로 전체 동기화하고 페이지마다 재개 cursor를 기록합니다. 이후에는 `updatedAt ASC, documentId ASC` 복합 cursor로 변경분을 가져오되 마지막 5분 구간을 겹쳐 조회하고 문서 ID로 upsert합니다. 증분 동기화가 모두 끝난 뒤에만 high-water cursor를 전진시키며, 소프트 삭제 문서도 캐시에 반영한 뒤 결과에서 제외합니다.

검색 문자열은 NFC 정규화, `ko-KR` 소문자 변환, 앞뒤 공백 제거 후 비교합니다. 검색 결과는 최신순이며 50개씩 더 봅니다. 설정의 **동기화 캐시 초기화**는 검색 캐시만 지우고 Firestore 내부 캐시는 지우지 않습니다.

**자주 쓴 단어**는 현재 UID의 삭제되지 않은 검색 캐시에서만 계산합니다. 한 기록 안에서 같은 단어가 반복되어도 한 번으로 세고, 두 개 이상의 기록에 나온 상위 10개 단어를 표시합니다. 칩을 누르면 바로 해당 단어로 검색하며 추가 Firestore 읽기나 별도 태그 필드는 사용하지 않습니다.

로그아웃하거나 허용되지 않은 계정으로 판정되면 해당 UID의 검색 캐시를 제거합니다. 개인 기록이 브라우저의 Firestore 내부 캐시에 남을 수 있으므로 신뢰하는 개인 기기에서 사용하는 것을 권장합니다.

## JSON/CSV 백업

**설정 → JSON 백업** 또는 **CSV 백업**을 선택합니다. 삭제되지 않은 기록을 최신순으로 Firestore에서 페이지 단위로 읽어 내려받습니다.

- JSON: 버전, 내보낸 UTC 시각, `Asia/Seoul`, ISO 타임스탬프 포함
- CSV: `id,date_kst,time_kst,content,created_at,updated_at,deleted_at`
- CSV는 Excel 한글 깨짐을 줄이기 위해 UTF-8 BOM을 포함함
- 쉼표, 큰따옴표, 줄바꿈은 RFC 스타일 큰따옴표 escaping 적용
- 파일명: `logbook-backup-YYYY-MM-DD.json` 또는 `.csv`

이번 버전에는 백업 복원 기능이 없습니다.

## PWA 설치

production 환경은 manifest, 192/512 아이콘, Apple touch icon, `display: standalone`, 정적 리소스 service worker 캐시를 제공합니다. HTML은 캐시에 저장하지 않고 항상 네트워크를 우선해 새 배포의 HTML과 이전 JavaScript가 섞이지 않게 합니다. Firebase Auth, Firestore, Google OAuth, POST, cross-origin 요청은 service worker가 가로채거나 캐시하지 않습니다.

- Android/Chrome: 브라우저 메뉴의 **앱 설치** 또는 **홈 화면에 추가**
- iPhone/Safari: 공유 버튼 → **홈 화면에 추가**
- 데스크톱 Chrome/Edge: 주소창의 설치 아이콘

설치 기능에는 HTTPS가 필요합니다. Vercel 배포는 기본 HTTPS를 제공합니다. Firestore 데이터 오프라인 동작은 service worker가 아니라 Firebase SDK 캐시가 담당합니다.

## 검증 명령어

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Rules Emulator 테스트는 Java와 Firebase CLI가 필요합니다. 현재 Firebase CLI는 JDK 11 이상에서 실행되며, 향후 호환성을 위해 JDK 21 LTS를 권장합니다. Windows에서는 다음처럼 설치할 수 있습니다. 실제 앱 의존성이 아니므로 프로젝트 설정 과정에서만 설치합니다.

```powershell
winget install EclipseAdoptium.Temurin.21.JDK
# 새 PowerShell을 연 뒤 확인
java -version
npx firebase --version
```

Firebase CLI는 프로젝트 개발 의존성에 고정되어 있으므로 별도 전역 설치가 필요하지 않습니다. 아래 명령 하나로 Firestore Emulator가 자동 시작되고, Rules 테스트 종료 후 자동으로 정리됩니다.

```bash
npm run test:rules
```

스크립트는 실제 Firebase 프로젝트나 로그인이 필요 없는 `demo-logbook` 프로젝트 ID를 사용합니다. 8080 포트가 비어 있어야 합니다. 테스트는 본인 생성/읽기, 비인증 및 타 UID 접근 차단, 정확한 필드 집합, content 타입과 1~10,000자 경계, `request.time` 생성/수정, `createdAt` 불변, 임의 `deletedAt` 차단, 소프트 삭제, 삭제 후 수정/복원 차단, 실제 delete 차단을 확인합니다.

## Vercel 배포

1. 저장소를 GitHub 등에 push합니다.
2. Vercel에서 **Add New → Project**로 저장소를 가져옵니다.
3. Framework Preset은 Next.js, Build Command는 `npm run build` 기본값을 사용합니다.
4. **Project Settings → Environment Variables**에 `.env.local`과 같은 `NEXT_PUBLIC_*` 값을 등록합니다.
5. Production, Preview, Development 중 필요한 환경에 적용한 뒤 재배포합니다.
6. 발급된 Vercel 도메인을 Firebase Authentication의 Authorized domains에 추가합니다.

Preview 배포마다 도메인이 달라질 수 있습니다. 고정된 production 도메인을 우선 사용하거나 실제로 사용할 preview 도메인만 Firebase에 등록하세요.

## 무료 Spark 플랜 사용 범위

앱은 Firebase Authentication의 Google 로그인과 Cloud Firestore의 문서 읽기/쓰기, 실시간 리스너, 웹 오프라인 캐시만 사용합니다. Storage, Functions, 외부 유료 검색, 예약 작업은 사용하지 않습니다. 실제 무료 할당량은 Firebase 정책과 사용량에 따라 달라질 수 있으므로 Firebase Console의 Usage 화면을 확인하세요.

## 문제 해결

- **Firebase 연결 안내만 표시됨**: `.env.local`의 필수 값을 채우고 개발 서버를 다시 시작합니다.
- **`auth/unauthorized-domain`**: Firebase Authentication의 Authorized domains에 현재 호스트를 추가합니다.
- **로그 목록에서 인덱스 오류**: `firebase deploy --only firestore:indexes`를 실행합니다. Firebase Console에 표시된 인덱스 생성이 완료될 때까지 기다립니다.
- **로그인은 되지만 바로 로그아웃됨**: `NEXT_PUBLIC_ALLOWED_EMAIL`과 로그인 이메일을 확인합니다.
- **오프라인 캐시를 사용할 수 없음**: 브라우저의 사생활 보호 모드나 IndexedDB 정책에 따라 메모리 캐시로 폴백할 수 있습니다.
- **검색 내용이 오래됨**: 검색 화면의 새로고침을 누르거나 설정에서 검색 캐시를 초기화합니다.
- **PWA 변경이 바로 보이지 않음**: 설치된 앱과 브라우저 탭을 모두 닫았다 다시 열거나 기존 service worker/사이트 데이터를 제거합니다.
- **Rules 테스트 연결 실패**: `java -version`, `firebase --version`, 8080 포트 사용 여부를 확인합니다. `demo-logbook` 테스트에는 Firebase 로그인이 필요하지 않습니다.

## 현재 범위와 제한

- Firebase 실제 프로젝트와 Google 계정 없이는 실제 로그인/동기화 동작을 자동 검증할 수 없습니다.
- 클라이언트 이메일 허용 목록은 보조 장치입니다. 보안 경계는 UID 기반 Firestore Rules입니다.
- 로컬 부분 문자열 검색은 브라우저별 캐시를 사용하므로 새 기기 첫 검색 때 전체 동기화가 필요합니다.
- 휴지통/복원, 백업 복원, 태그, 첨부, 공유, 협업, 푸시 알림은 포함하지 않습니다.

## 스택 트래커

`/stacks`는 하루 동안 여러 번 충전하거나, 4일·7일처럼 정한 간격마다 1회씩 누적하는 기능입니다. 예를 들어 04:00~24:00에 140회를 설정하면 약 8분 34초마다 1회가 충전됩니다. `N일마다 계속 누적`을 선택하면 트래커를 만든 정확한 시각부터 N일이 지날 때마다 +1이 쌓이며, 사용하지 않은 수량은 최대치 없이 계속 이월됩니다. 모든 날짜 경계와 스케줄 계산은 `Asia/Seoul` 기준입니다.

현재 수량은 Firestore에 별도의 카운터로 저장하지 않고 다음 식으로 언제든 다시 계산합니다.

```text
durationMs = periodEnd - periodStart
chargeAt(index) = periodStart + durationMs * index / totalCharges
현재 스택 = 현재 시각까지의 충전 횟수 - 오늘 사용 이벤트 수

주기형 충전 시각 = 트래커 생성 시각 + 충전 순번 × 주기 일수
주기형 현재 스택 = 생성 이후 누적 충전된 횟수 - 전체 누적 사용 횟수
```

충전 인덱스는 1부터 시작하며 매일 충전 방식의 마지막 충전은 종료 시각과 정확히 일치합니다. 사용은 현재 수량이 0이어도 가능하므로 음수 스택이 표시될 수 있습니다. 매일 충전 방식은 KST 자정에 초기화되지만, `N일마다` 방식은 사용하지 않은 스택과 사용 횟수를 계속 누적합니다.

### Firestore 데이터 구조

```text
users/{uid}/stackTrackers/{trackerId}
users/{uid}/stackEvents/{eventId}
```

트래커 문서에는 이름, `all_day | custom_time | interval_days`, 시작/종료 분, 하루 충전 횟수(1~200), `intervalDays`, 호환용 `anchorDate`, 활성 상태, 생성/수정 서버 시각을 저장합니다. 주기형의 실제 기준 시각은 서버가 기록한 `createdAt`이며 `anchorDate`는 새 문서에서 `null`입니다. 기존 트래커에는 새 필드가 없어도 읽을 수 있습니다. 이벤트 문서에는 트래커 ID와 당시 이름, `charge | consume`, KST 날짜, 충전 인덱스, `1 | -1`, 실제 발생 시각과 생성 서버 시각을 저장합니다.

### 충전 보정과 오프라인 동작

Cloud Functions, Cloud Scheduler, cron, 서버 타이머는 사용하지 않습니다. 로그인 후 앱 진입, 활성 트래커 변경, `/stacks` 진입, 탭이 다시 보임, 온라인 복귀, 다음 충전 시각에 클라이언트가 오늘 누락된 충전 이벤트를 보정합니다.

충전 이벤트 ID는 다음과 같이 결정적입니다.

```text
{trackerId}_charge_{YYYY-MM-DD}_{chargeIndex}
```

매일 충전 방식은 현재 날짜의 기존 ID를 먼저 조회한 뒤 오늘 누락분만 보정합니다. 주기형은 마지막 누적 충전 순번을 한 건 조회하고 그 다음 순번부터 현재까지 빠진 충전을 생성합니다. 주기형 ID는 `{trackerId}_interval_charge_{YYYY-MM-DD}_{chargeIndex}`입니다. 모든 쓰기는 Firestore transaction을 사용하므로 여러 탭이나 기기에서 동시에 실행되어도 같은 이벤트는 하나만 남습니다. 과거 날짜를 자동 보정하지 않는 정책은 매일 충전 방식에만 적용되며, 누적 주기형은 생성 시각 이후 빠진 주기를 보정합니다.

사용 버튼은 클릭마다 미리 만든 고유 문서 ID를 한 번만 쓰며 Firestore 오프라인 쓰기 큐를 사용합니다. 자동 충전 이벤트 기록이 네트워크 문제로 늦어져도 현재 스택 자체는 시간 계산으로 표시할 수 있습니다. 브라우저가 완전히 종료된 동안 정확한 시각에 백그라운드 코드를 실행하는 기능은 없으며, 다음 진입 때 누락분을 복구합니다.

### 검색, 타임라인, 백업

- 오늘 및 날짜별 화면은 수동 로그와 스택 이벤트를 `occurredAt` 기준으로 합쳐 표시합니다. 수동 로그만 수정·삭제할 수 있습니다.
- 검색 IndexedDB는 `manual_log`와 `stack_event` 소스를 UID namespace 안에 분리해 저장합니다. 두 소스 모두 시간/문서 ID 복합 커서로 증분 동기화하며, 자주 쓴 단어는 자동 이벤트 문구를 제외한 수동 로그에서만 계산합니다.
- 설정의 **스택 JSON 백업**을 누를 때만 트래커와 모든 이벤트를 각각 200개 단위로 끝까지 조회합니다. 파일명은 `logbook-stacks-backup-YYYY-MM-DD.json`입니다. 어느 페이지라도 실패하면 불완전한 파일을 다운로드하지 않습니다.

### Rules와 인덱스

`firestore.rules`는 각 스택 collection에서 본인 UID 읽기만 허용하고, 정확한 필드 집합·타입·범위·`request.time`을 검사합니다. 트래커의 실제 delete와 이벤트의 update/delete는 차단합니다. 활성 트래커 조회에 필요한 복합 인덱스는 `firestore.indexes.json`에 포함되어 있습니다.

클라이언트만 사용하는 구조이므로 인증된 사용자가 개발자 도구나 수정한 클라이언트로 규칙에 맞는 가짜 `charge` 이벤트를 만들 가능성까지 서버에서 판별할 수는 없습니다. Rules는 다른 UID 접근과 문서 변조 형태를 막지만, 충전 시각이 실제 계산 결과인지 신뢰성 있게 증명하려면 향후 신뢰 가능한 서버가 필요합니다. 현재 개인용·무료 범위에서는 이 제한을 명시적으로 받아들입니다.

배포 전에 다음을 반영해야 합니다. 이 저장소의 구현 과정에서는 자동 배포하지 않습니다.

```bash
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

Rules 테스트는 실제 Firebase 프로젝트가 필요 없는 `demo-logbook` ID를 사용합니다. JDK 21 LTS와 로컬 `firebase-tools`가 준비된 환경에서 `npm run test:rules` 한 명령으로 Emulator를 시작하고 테스트 뒤 종료합니다. Windows에서는 `winget install EclipseAdoptium.Temurin.21.JDK` 후 새 PowerShell에서 `java -version`을 확인하세요.

Vercel 배포 환경에는 기존 `NEXT_PUBLIC_FIREBASE_*` 값만 필요하며 새로운 서버 비밀키, Storage, Functions, Scheduler 설정은 추가하지 않습니다.

트래커의 시간 범위나 총 충전 횟수를 당일 중간에 수정해도 이미 생성된 불변 충전 이벤트의 예정 시각은 다시 쓰지 않습니다. 주기형의 일수나 운영 방식 자체를 바꾸면 변경한 시각부터 새 주기를 시작하고 기존 이력을 보존하기 위해 새 트래커를 만들며, 기존 트래커는 원자적으로 비활성화합니다.
