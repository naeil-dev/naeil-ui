> **Historical record preserved on 2026-11-04.** Original body below is unchanged from `5fb1c464d83ad5da95c9286a39328c15634b7f67`. This is a dated design/verification record, not an active execution plan or current deployment status. See the [project closeout index](../../design/project-closeout-2026-11-04.md) for disposition and current boundaries.

# 개인 견적 앱 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 비밀번호로 입장해 견적을 편집·비교하고 JSON 파일에 자동 저장하는 1인용 일본어 견적 앱을 naeil UI로 만든다.

**Architecture:** 독립 Next.js 앱이 순수 계산 모듈과 단일 Node 서버의 인증·JSON 저장 모듈을 사용한다. 계산 기준은 견적마다 보관하고, 전체 상태를 revision으로 보호해 원자적으로 교체한다. 업무 데이터와 credential은 빌드·저장소 밖의 지속 폴더에 둔다.

**Tech Stack:** Node 24.21.0, pnpm 10.30.3, TypeScript, Next 16.1.7, React/ReactDOM 19.2.3, Tailwind 4, @naeil/ui 0.3.0, decimal.js 10.6.0, Zod 4.1.12, Vitest, Playwright/axe.

**Spec:** [2026-10-09-estimate-app-design.md](../specs/2026-10-09-estimate-app-design.md). 2026-10-09 사용자 승인. 실행자는 이 계획과 설계 문서를 모두 읽는다.

## Global Constraints

- 새 제품 루트는 `/Users/jaymini/projects/estimate`다. 2026-10-09 확인 시 존재하지 않았다. 실행 직전 다시 확인하고 기존 파일이 생겼으면 덮어쓰지 않는다.
- 현재 공유 UI worktree에는 설계/계획 문서만 둔다. 구현은 새 제품의 격리 worktree에서 진행하며 정확한 경로를 STATUS.md에 기록한다. 네이티브 workspace 도구를 우선하고 없으면 git worktree를 쓴다.
- 일본어 UI, JPY, 임시 제품명 `見積`. 원본의 회사·인명·개별 단가는 production seed에서 제외한다. 테스트는 이름을 익명화한 fixture를 사용한다.
- 1인용·단일 서버·DB 없음. 팀 계정·Excel·PDF·AI·메일·공휴일 외부 API는 제외한다.
- 기본 RR `0.565`, 올림 단위 `100000`, 1인월 `160`시간, 세율 `0.1`. decimal 문자열로 보관한다. 견적별 계산 기준을 보존한다.
- 입력 안정 후 자동 저장 `600ms`, 최근 백업 `20개`, 세션 `24시간`, 요청/상태 `5MiB`, 견적당 인력/경비 각각 `100행`, 기간 `10년 이하`.
- 인원은 0 이상 정수, 비율·금액·시간은 유한한 비음수, 투입률 `0~100%`, 인월 시간은 양수. 필수값 누락은 null인 초안으로 저장 가능하지만 합계는 미완료로 표시한다.
- `@naeil/ui@0.3.0` public imports와 세 CSS export를 사용한다. neutral light/dark, Pretendard 1.3.9 + Noto Sans JP 5.3.0, 입력/본문16px, 보조14px, 터치44px, 기본 콘텐츠1200px·설정640px·로그인480px을 따른다.
- npm 존재 여부 확인은 패키지 빌드 검증을 대체하지 않는다. 공유 컴포넌트를 변경할 필요가 생기면 그 범위를 분리하고 Storybook·contrast·packed consumption을 검사한다.
- UI 구현 직전 Impeccable craft-floor를 읽고 기존 DESIGN.md를 권위로 적용한다. 새 스타일 선택·이미지 생성·히어로 제작은 이 앱의 요구가 아니다.
- 개발 `127.0.0.1:2470`, E2E `2471`, 독립 smoke `2472`, 운영 후보 `2473`. 읽기 확인 당시 네 포트에 listener가 없었으나 시작 직전 재확인한다. 사용 중이면 다른 프로세스를 종료하지 말고 이 앱의 설정을 변경한다.
- 개발 데이터 `~/.local/share/estimate-dev/`, 운영 후보 `~/.local/share/estimate/`, 테스트는 `mkdtemp` 디렉터리다. bare 개발/설정 명령은 상속된 production 환경과 무관하게 개발 모드를 선택한다.
- 실제 운영 비밀번호와 최종 호스트는 구현 완료 후 설정한다. 채팅/명령 인자에 비밀번호를 받지 않는다. JEV·naeil 운영 설정·DNS·프로세스를 준비 중 변경하지 않는다.

## Review Focus

1. 저장 요청이 진행되는 동안 더 입력하거나 응답이 유실되더라도 새 입력을 버리지 않고 저장 상태를 정확히 표시해야 한다 — Task 5.
2. 서로 다른 탭이 수정하거나 과거 백업을 복원했을 때 오래된 revision으로 덮어쓰면 안 된다 — Tasks 2, 7.
3. 세션 만료와 비밀번호 교체 후 재로그인해도 현재 탭의 입력을 보존해야 한다 — Tasks 3, 5.
4. 직위명·단가·휴일을 바꿔도 기존 견적이 바뀌지 않고 명시적 갱신 때만 재계산돼야 한다 — Tasks 1, 7.
5. 전원 중단·손상 파일·데이터 유실을 빈 신규 설치로 오인하지 않고 정상 사본을 복구할 수 있어야 한다 — Tasks 2, 9.

## 작업 환경과 파일 구조

2026-10-09 읽기 확인: 기본 node는 22.23.2, Homebrew node는 26.0.0이다. 공식 `https://nodejs.org/dist/index.json`에서 24.21.0 LTS 배포와 macOS tarball을 확인했다. 해당 runtime은 앱 전용 경로에 설치하고 공식 SHASUMS256.txt와 대조한다. 전역 node symlink/PATH를 바꾸지 않는다. `.node-version`과 운영 템플릿에는 24.21.0을 고정한다.

최초 실행은 using-git-worktrees 절차를 따른다. 새 제품 root에 최소 git bootstrap commit을 만든 뒤 `feat/estimate-v1` 격리 workspace를 생성한다. 현재 설계·계획과 시각 권위 DESIGN.md를 제품 docs로 옮겨 출처와 원본 커밋을 기록한다. 이후 계획의 상대 경로는 모두 제품 worktree 기준이다.

| 경로 | 책임 |
| --- | --- |
| `src/domain/{types,schema,calendar,calculate,criteria,commands,compare}.ts` | 입력/상태 계약, 날짜·decimal 계산, 기준 갱신, ID 기반 상태 변경, 견적 비교 |
| `src/server/storage/{store,atomic-file,lock}.ts` | 직렬 쓰기, revision, 영속 파일·백업·단독 프로세스 |
| `src/server/auth/{password,session,rate-limit}.ts` | scrypt, 고정 알고리즘 서명 쿠키, 로그인 제한 |
| `src/server/{config,runtime,http,service}.ts` | 환경 경계·단일 인스턴스·API 검증·업무 서비스 |
| `src/app/{layout.tsx,page.tsx,globals.css}` | 폰트/테마·공통 프레임·기본 이동 |
| `src/app/login/page.tsx`, `src/app/(workspace)/{layout.tsx,estimates/page.tsx,estimates/[id]/page.tsx,compare/page.tsx,settings/page.tsx}` | 서버측 인증 경계와 화면 진입점 |
| `src/app/api/{session,state,backup,health}/route.ts` | 로그인/로그아웃·상태 조회/변경·백업/복원·readiness |
| `src/components/{app-frame,providers,field}.tsx` | 제품 탐색, theme, label/help/error 조합 |
| `src/features/auth/{login-form,reauth-dialog}.tsx` | 입장·오류·같은 탭 재인증 |
| `src/features/estimates/{workspace-provider,list,create-dialog,editor,member-row,expense-row,summary,analysis}.tsx` | 목록·초안·반복 행·합계·분석 |
| `src/features/estimates/{save-controller,use-save,form-adapter}.ts` | 문자열 입력→도메인 변환, 대기/요청/오류/충돌 상태 |
| `src/features/{compare/compare-view.tsx,settings/settings-view.tsx,settings/criteria-dialog.tsx,settings/backup-dialog.tsx}` | 비교·설정·기준 갱신·복원 |
| `src/messages/ja.ts` | 일본어 UI 문구·용어 |
| `scripts/{init-data,set-password,runtime-env,run,package-standalone,smoke}.mts` | 초기 설정·숨김 비밀번호·환경 선택·실행·배포 묶음·smoke |
| `ops/{server.env.example,dev.naeil.estimate.plist.example}`, `docs/ops/deployment.md` | 배포/복구 가능한 구체 템플릿 |
| `tests/{domain,server,integration,e2e,fixtures,helpers}`, `docs/evidence/` | 각 경계의 검사·익명 fixture·실제 실행 기록 |

### 공통 타입·오류·API 계약

Task 1에서 타입/스키마와 명령 union을 정의하고 나머지 작업은 재정의하지 않는다.

- `DecimalString = string`, `DateOnly = string`, `Id = string`; 스키마가 정규화된 decimal·실제 날짜·UUID를 보장한다. 이름 ≤200자, 메모 ≤2000자, decimal 입력 ≤24자, 값 ≤10^12, 인원 ≤10000. 중복 ID와 dangling 회사/직위 관계를 거절한다. 이 한도는 무한 루프/과대 요청 방지를 위한 제품 계약이다.
- `WorkspaceState = {schemaVersion:1; revision:number; updatedAt:string; settings:Settings; companies:Company[]; estimates:Estimate[]}`. revision은 비음수 safe integer다. `WorkspaceContent = Omit<WorkspaceState,'revision'|'updatedAt'>`.
- `Settings = {rr; roundUnit; hoursPerMonth; tax; rates:Rate[]; holidays:Holiday[]; holidayYears:number[]}`; 네 숫자는 DecimalString. `Rate = {id; title; hourlyRate:DecimalString|null; archived:boolean}`; `Holiday = {date:DateOnly; name:string}`. 신규 설치의 rate/holiday/year 배열은 비어 있고 휴일 범위 미확인을 안내한다.
- `Company = {id; name}`; `Estimate = {id; companyId; name; start:DateOnly|null; end:DateOnly|null; rrOverride:DecimalString|null; criteria:Settings; members:Member[]; expenses:Expense[]; updatedAt:string}`.
- `Member = {id; name; rateId:Id|null; hourlyRateOverride:DecimalString|null; hoursPerDay:DecimalString|null; allocation:DecimalString|null; count:number|null; start:DateOnly|null; end:DateOnly|null}`. allocation은 0~1 저장값이며 UI는 0~100 입력이다.
- `Expense = {id; label; unit:DecimalString|null; quantity:DecimalString|null; people:number|null; memo}`. 새 행은 quantity/people=1이고 빈 값도 계산상 1로 해석한다. unit null은 0으로 처리하지 않는다.
- `Issue = {path:string; code:string}`. `Calculation = {status:'incomplete'; issues:Issue[]; warnings:Issue[]} | {status:'complete'; totals:{hours; personMonths; labor; roundedLabor; expenses; total; taxIncluded; perPersonMonth:DecimalString|null}; members:MemberResult[]; monthly:PeriodHours[]; weekly:PeriodHours[]; warnings:Issue[]}`. totals의 나머지 값은 DecimalString; 결과 행은 안정적인 memberId를 포함한다.
- `MemberResult = {memberId:Id; standardRate:DecimalString; effectiveRate:DecimalString; businessDays:number; hours:DecimalString; personMonths:DecimalString; amount:DecimalString}`; `PeriodHours = {key:string; start:DateOnly; end:DateOnly; hours:DecimalString; byMember:Record<Id,DecimalString>}`. 월 key는 YYYY-MM, 주 key는 월요일 YYYY-MM-DD다.
- `CriteriaSection = 'rates'|'rr'|'roundUnit'|'hoursPerMonth'|'tax'|'calendar'`. Calendar 갱신은 holidays/holidayYears를 함께 교체한다. `Command` payload는 아래 표로 고정한다. 새로운 회사/견적/복제 ID와 수정 시각은 service가 생성한다. 편집 중 새 인력/경비 행의 UUID는 클라이언트가 생성하고 서버가 형식·중복을 검증한다. 회사 삭제는 관련 견적 수를 확인하는 UI를 거친 뒤 서버에서 함께 삭제한다.
- 서버 오류코드/HTTP: `UNAUTHENTICATED`401, `ORIGIN_REJECTED`403, `REVISION_CONFLICT`409, `INVALID_INPUT`422, `PAYLOAD_TOO_LARGE`413, `RATE_LIMITED`429, `STORAGE_UNAVAILABLE`503, `CONFIG_UNAVAILABLE`503. 오류응답은 `{error:{code, issues?}}`이며 경로·credential·원문 데이터를 노출하지 않는다.
- `GET /api/state → WorkspaceState`; `PATCH /api/state {expectedRevision,command} → {state:WorkspaceState,resultId?:Id}`. 모든 쓰기는 같은 revision 규칙을 따른다.
- `GET /api/backup`은 인증 후 현재 snapshot JSON을 다운로드한다. `POST /api/backup {expectedRevision,snapshot}`은 검증한 파일을 복원한다. 최종 snapshot이 5MiB를 넘으면 거절하므로 전체 요청 5MiB보다 wrapper만큼 작을 수 있다. UI 파일 검사와 요청 직렬화 둘 다 한도를 확인한다.
- `POST /api/session {password}`와 `DELETE /api/session`은 204+cookie. `GET /api/session`은 인증 상태 204 또는401. 로그인 body 한도 4KiB. `GET /api/health`는 readiness의 200/503 및 `{ok:boolean}`만 공개한다.

| Command.type | 추가 필드 |
| --- | --- |
| createCompany | `name:string` |
| renameCompany | `id:Id; name:string` |
| deleteCompany | `id:Id` |
| createEstimate | `companyId:Id; name:string` |
| replaceEstimate | `estimate:Estimate` (서버가 updatedAt을 재발급) |
| duplicateEstimate | `id:Id` |
| deleteEstimate | `id:Id` |
| replaceSettings | `settings:Settings` |
| refreshCriteria | `id:Id; sections:CriteriaSection[]` |

## Task 1: 독립 프로젝트와 계산 도메인

**Files:** Create 제품 bootstrap/config, `src/domain/{types,schema,calendar,calculate,criteria,commands}.ts`, `tests/domain/{calculate,calendar,criteria,commands,schema}.test.ts`, `tests/fixtures/scenario.ts`, `tests/helpers/state.ts`, README/AGENTS/STATUS.

**Interfaces:** `createEmptyState(now:string):WorkspaceState`; `calculate(estimate:Estimate):Calculation`; `businessDays(start:DateOnly,end:DateOnly,holidays:Holiday[]):DateOnly[]`; `refreshCriteria(estimate:Estimate,settings:Settings,sections:CriteriaSection[]):Estimate`; `applyCommand(state:WorkspaceState,command:Command,deps:{now:string;newId:()=>Id}):{content:WorkspaceContent;resultId?:Id}`. Test helpers export `scenarioFixture():Estimate`, `workspaceFixture():WorkspaceState`, `contentOf(state:WorkspaceState):WorkspaceContent`; 마지막 함수는 revision/updatedAt을 제거한다.

- [ ] **Step 1 — 격리 환경과 테스트 실행기:** 새 프로젝트/worktree를 만들고 scripts `test`, `typecheck`, `lint`, `build`, `dev`, `start`, `test:e2e`, `smoke`, `data:init`, `password:set`을 정의한다. React/Next/naeil/decimal/Zod는 상단 버전으로 고정하고 나머지 의존성도 실제 설치 버전과 lockfile로 고정한다. 전용 Node 실행 경로와 SHA 검증을 기록하고 이 앱 명령의 환경에만 적용한다. 런타임 데이터·비밀·test-results·빌드를 gitignore한다.
- [ ] **Step 2 — 실패 테스트:** 익명 fixture를 원본 기간 2026-10-26~2027-01-24, 57영업일과 동일 수치로 만든다. 달력은 윤년/존재하지 않는 날짜/중복 휴일/10년 한도, 스키마는 null 초안/음수/0인월 시간/행 개수/과대한 decimal을 검사한다.

```ts
expect(calculate(scenarioFixture())).toMatchObject({status:'complete', totals:{hours:'843.6',personMonths:'5.2725',roundedLabor:'17500000',expenses:'1500000',total:'19000000',taxIncluded:'20900000'}});
expect(calculate({...scenarioFixture(), criteria:{...scenarioFixture().criteria, rates:[]}}).status).toBe('incomplete');
```

- [ ] **Step 3 — 실패 확인:** `pnpm test tests/domain`가 아직 없는 도메인 구현 때문에 실패하는 것을 확인한다.
- [ ] **Step 4 — 구현:** 공통 계약과 위 함수를 만든다. 중간값은 decimal로 유지하고 엔 반올림 → 단위 올림 → 세금 포함 금액 내림 순서를 지킨다. 날짜는 UTC 일 단위로 순회하되 외부 계약은 date-only다. 설정 변경은 snapshot을 건드리지 않고 refresh는 선택한 항목만 교체하며 개별 override를 보존한다. 복제는 견적/행 ID를 새로 만들고 기준값은 보존한다.
- [ ] **Step 5 — 갱신/경계 검증:** 직위 rename/archive 후 과거 합계 유지, 선택한 기준 갱신 때만 변화, 누락 단가와 0단가 구별, 명시적 0과 빈 경비 수량 구별, 0인월의 perPersonMonth=null, 개별 기간이 견적 밖이면 계산과 warning을 확인한다. `pnpm test tests/domain && pnpm typecheck && pnpm lint` 모두 exit 0.
- [ ] **Step 6 — 커밋:** 도메인·테스트·실행 환경·설계 출처만 stage하여 `feat: add estimate calculation domain`.

## Task 2: 원자적 JSON 저장·revision·백업

**Files:** Create `src/server/storage/{store,atomic-file,lock}.ts`, `scripts/init-data.mts`, `tests/server/{store,atomic-file,lock}.test.ts`, `tests/helpers/store.ts`.

**Interfaces:** `openStore(dataDir:string):Promise<Store>`; `Store.read():Promise<WorkspaceState>`; `Store.update(expectedRevision:number,fn:(current:WorkspaceState)=>WorkspaceContent):Promise<WorkspaceState>`; `Store.restore(expectedRevision:number,snapshot:WorkspaceState):Promise<WorkspaceState>`; `Store.close():Promise<void>`; `initData(dataDir:string,now:string):Promise<void>`; `acquireLock(dataDir:string):Promise<()=>Promise<void>>`. Store는 close까지 프로세스 잠금을 소유하고 같은 프로세스의 호출자는 runtime 인스턴스를 공유한다.

- [ ] **Step 1 — 실패 테스트:** 임시 폴더에만 initData를 호출한다. 같은 revision의 동시 쓰기 중 하나만 성공하고 다른 하나는 conflict인지, restore가 현재 revision+1인지, 21회 쓰기 뒤 백업이 20개인지 검사한다.

```ts
const s = await store.read();
const writes = await Promise.allSettled([
  store.update(s.revision, c=>({...contentOf(c),companies:[{id:companyA,name:'A'}]})),
  store.update(s.revision, c=>({...contentOf(c),companies:[{id:companyB,name:'B'}]})),
]);
expect(writes.filter(r=>r.status==='fulfilled')).toHaveLength(1);
expect((await store.read()).revision).toBe(s.revision+1);
```

- [ ] **Step 2 — 실패 확인:** `pnpm test tests/server/store.test.ts tests/server/atomic-file.test.ts tests/server/lock.test.ts`에서 미구현 오류를 확인한다.
- [ ] **Step 3 — 구현:** 한 프로세스의 Promise queue 안에서 최신 파일 읽기 → revision 검사 → 변경/전체 스키마 검사 → 백업 완료 → 같은 디렉터리 임시 파일 쓰기/fsync → rename → 디렉터리 sync를 수행한다. 파일은 0600, 폴더는 0700이다. main 교체 실패 때 cache/revision을 진행시키지 않는다. rename 이후 디렉터리 sync 실패는 결과 불확실로 응답하고 클라이언트가 재조회하도록 한다. 백업 정리 실패가 이미 완료된 쓰기를 실패로 바꾸지 않되 운영 로그에 경고한다.
- [ ] **Step 4 — 장애 검증:** `AtomicFileIO`의 `writeTemp(path,bytes)`, `syncFile(path)`, `rename(from,to)`, `syncDir(path)`, `writeBackup(path,bytes)`는 모두 Promise<void>다. 실제 fs adapter와 실패 주입 adapter를 나눠 단계별 오류 후 main JSON 상태를 검사한다. child process 강제 종료 후 불완전 tmp 무시, 잠금 실패·stale lock 수동 복구, corrupt/missing file의 503, initData의 기존 파일 덮어쓰기 거부를 검사한다. 잠금은 자기 random token과 일치할 때만 해제한다.
- [ ] **Step 5 — 검증/커밋:** 해당 server tests와 typecheck/lint exit 0 후 `feat: add atomic JSON persistence and recovery`.

## Task 3: DB 없는 비밀번호 인증과 실행 설정

**Files:** Create `src/server/auth/{password,session,rate-limit}.ts`, `src/server/{config,runtime,http}.ts`, `scripts/{set-password,runtime-env,run}.mts`, `src/instrumentation.ts`, `tests/server/{auth,config,rate-limit}.test.ts`, `tests/integration/password-command.test.ts`.

**Interfaces:** `loadConfig(mode:'development'|'test'|'production'):Config` returns `{origin:URL,dataDir:string,credentialFile:string,signingKeyFile:string,port:number,secureCookie:boolean}`; `hashPassword(input:string):Promise<Credential>`; `verifyPassword(input:string,credential:Credential):Promise<boolean>`; `issueSession(version:string,key:Buffer,now:number):string`; `verifySession(token:string,version:string,key:Buffer,now:number):boolean`; `getRuntime():Promise<{config:Config;store:Store;credential:Credential;signingKey:Buffer}>`. Credential은 `{version:string,salt:string,hash:string}`이며 salt/hash는 base64, scrypt 매개변수는 서버 상수다. 인증 검사는 교체된 credential을 다시 읽는다. `requireSession(request:Request):Promise<void>`와 `assertSameOrigin(request:Request,origin:URL):void`는 http에 둔다.

- [ ] **Step 1 — 실패 테스트:** 정상/오류 비밀번호, 앞뒤 공백 보존, 24시간 경계, 변조·미래 iat·다른 credentialVersion, 쿠키 플래그, 4KiB body, 61초 후 시도 제한 초기화를 검사한다.

```ts
const token=issueSession('v1',key,now);
expect(verifySession(token,'v1',key,now+86400000)).toBe(false);
expect(verifySession(token,'v2',key,now)).toBe(false);
expect(verifySession(token+'x','v1',key,now)).toBe(false);
```

- [ ] **Step 2 — 실패 확인:** `pnpm test tests/server/auth.test.ts tests/server/config.test.ts tests/server/rate-limit.test.ts tests/integration/password-command.test.ts` 실패 확인.
- [ ] **Step 3 — 인증 구현:** scrypt N=16384/r=8/p=1/salt=16bytes/hash=64bytes와 timingSafeEqual을 사용한다. 서명은 HMAC-SHA256 고정, key는 32bytes, payload는 `{v:1,credentialVersion,iat,exp}`다. 쿠키는 prod `__Host-estimate_session`, local HTTP `estimate_session`이며 HttpOnly/SameSite=Lax/Path=/, HTTPS에서 Secure, Domain 없음이다. 전역 분당 30회·동시 검증 1개로 제한한다. 설정 누락은 503이며 기본 비밀번호를 만들지 않는다.
- [ ] **Step 4 — 설정/CLI 구현:** 숨김 TTY 입력과 재확인만 허용하고 1~256문자를 임의 trim하지 않는다. credential 교체는 원자적이며 version을 새로 발급한다. 실행 script가 `ESTIMATE_RUNTIME_MODE`와 `ESTIMATE_SERVE=1`을 전달하고 instrumentation이 Node 서빙에서만 runtime을 초기화한다. build는 ESTIMATE_SERVE를 해제하고 실제 데이터를 읽지 않는다. global Promise로 중복 store 초기화를 막고 종료 때 잠금을 해제한다. dev/start는 development를 강제하고 production은 명시된 경로와 HTTPS origin을 요구한다. 개발 CLI가 운영 canonical 경로나 그 symlink를 가리키면 거부한다.
- [ ] **Step 5 — 검증/커밋:** HOME을 재지정하지 않고 명시적 temp dataDir로 테스트한다. 임시 TTY에서 비밀번호 입력·Ctrl-C 복원·로그 비노출·기존 key 보존을 검사한다. 상속된 production env로 bare 명령을 실행해 운영 fixture의 hash/mtime 불변을 assert한다. 해당 tests/typecheck/lint exit 0 후 `feat: add password gate and isolated runtime configuration`.

## Task 4: 인증된 API와 공유 UI 앱 프레임

**Files:** Create `src/server/service.ts`, API routes, root/workspace layouts, `src/components/*`, `src/features/auth/*`, `src/messages/ja.ts`, `next.config.ts`, `tests/integration/api.test.ts`, `tests/e2e/login.spec.ts`, `playwright.config.ts`, `scripts/package-standalone.mts`.

**Interfaces:** `executeCommand(store:Store,expectedRevision:number,command:Command):Promise<{state:WorkspaceState;resultId?:Id}>`; API는 공통 HTTP 계약을 따른다. `AppFrame({children,authenticated})`; `LoginForm({onAuthenticated?})`; `ReauthDialog({open,onAuthenticated})`. Health는 runtime readiness만 확인하며 경로·데이터를 노출하지 않는다.

- [ ] **Step 1 — 실패 테스트:** 실제 router를 임시 runtime으로 기동하는 fixture로 아래 경계를 검사한다. 로그인 E2E는 공개 비밀번호 폼으로만 진입한다. 테스트의 정상 쓰기 요청에는 fixture origin을 설정한다.

```ts
expect((await anonymous.get('/api/state')).status()).toBe(401);
expect((await signedIn.patch('/api/state',{headers:{Origin:'https://wrong.example'},data:validCommand})).status()).toBe(403);
expect((await signedIn.patch('/api/state',{data:staleCommand})).status()).toBe(409);
```

- [ ] **Step 2 — 실패 확인:** `pnpm test tests/integration/api.test.ts`와 `pnpm test:e2e tests/e2e/login.spec.ts`가 미구현 routes로 실패하는지 확인한다.
- [ ] **Step 3 — API 구현:** 인증 → Origin(쓰기) → 크기를 제한한 streamed body → Zod → service/store 순서를 적용한다. Content-Length 없는 stream에도 byte 한도를 적용한다. snapshot의 schemaVersion/참조 관계를 검사하고 변경/복원된 견적을 같은 calculate로 서버에서 재계산한다. 미완성 null은 허용하고 잘못된 값은 거절한다. 클라이언트 합계 필드는 받지 않는다. 서버측 workspace layout과 API를 모두 인증하고 페이지는 동적 렌더링한다. Server Component의 cookie 값도 requireSession과 같은 verifySession을 통과시킨다. 경로 ID와 비교 query를 검증한다.
- [ ] **Step 4 — UI 프레임 구현:** craft-floor를 읽은 뒤 실제 naeil primitives/세 CSS·폰트·Tailwind dist scan을 연결한다. 제품명/테마/인증 영역의 기준선을 유지하고 홈은 estimates로 이동한다. ThemeProvider는 next-themes를 사용하고 next-intl/root barrel의 불필요한 의존성을 도입하지 않는다. 일본어 label/error를 연결하고 로그인 상태에 따라 탐색 항목만 바꾼다.
- [ ] **Step 5 — 빌드/소비 검증:** `pnpm typecheck && pnpm lint && pnpm test tests/integration/api.test.ts && pnpm build && pnpm test:e2e tests/e2e/login.spec.ts` exit 0. Credential 없는 clean build 성공, 설정 없는 서버의 닫힌 상태, 인증 문서/API no-store, 해시 static cache, 비밀 경로 404를 검사한다. npm에서 설치한 @naeil/ui를 실제 production bundle이 소비하는지 기록한다.
- [ ] **Step 6 — 커밋:** `feat: add authenticated API and naeil application frame`.

## Task 5: 견적 목록·편집·자동 저장

**Files:** Create `src/features/estimates/*`, estimate routes, `tests/server/save-controller.test.ts`, `tests/e2e/estimate-editor.spec.ts`, `tests/e2e/save-recovery.spec.ts`.

**Interfaces:** `SaveController({read,write,clock,onState})`는 `edit(command:Command):void`, `flush():Promise<boolean>`, `retry():Promise<void>`, `reauthenticated():Promise<void>`, `reload():Promise<void>`, `exportDraft():WorkspaceState`, `dispose():void`와 읽기 전용 `state`를 제공한다. 상태는 `idle|dirty|saving|saved|invalid|error|conflict|reauth`. Read는 GET state, write는 PATCH state 계약이며 Clock은 setTimeout/clearTimeout을 주입한다. `useSave`는 React lifecycle을 연결한다. Provider는 최근 서버 상태와 local draft를 분리하고 FormAdapter는 raw 문자열을 보존한 채 `{estimate,issues}`로 변환한다.

- [ ] **Step 1 — 실패 테스트:** fake timer와 주입 transport로 599ms 미저장/600ms 저장, 요청 중 새 편집, 서버 성공 뒤 응답 유실, 409/401/503, unmount를 검사한다. 다음 테스트의 transport와 clock은 test helper다.

```ts
controller.edit(firstEdit); clock.advance(600); // request 1 pending
controller.edit(secondEdit); transport.resolveWrite(0,revision1State);
await controller.flush();
expect(transport.lastWrittenEstimate().name).toBe(secondEdit.estimate.name);
expect(controller.state.status).toBe('saved');
```

- [ ] **Step 2 — 실패 확인:** `pnpm test tests/server/save-controller.test.ts`와 편집 E2E에서 미구현 동작 실패를 확인한다.
- [ ] **Step 3 — 상태기계 구현:** 요청을 순차화하고 편집 sequence로 늦은 응답이 최신 draft를 대체하지 못하게 한다. 응답 유실은 재조회 후 서버 내용과 보낸 candidate가 같은지 비교한다. 같으면 저장 성공을 인정하고 다르면 conflict다. 서버 생성 ID를 받기 전인 create/duplicate는 자동 재전송하지 않고 새 상태를 보여줘 중복 생성을 피한다. 401은 draft를 보존한 재로그인, 409는 덮어쓰기 없는 충돌, 503은 재시도다. 이동/logout은 flush 성공 뒤 진행한다.
- [ ] **Step 4 — 화면 구현:** 회사 검색/filter·최근 수정 순 목록·새 회사/견적 Dialog·반복 인력 행·경비·sticky 요약·복제/삭제 메뉴를 구현한다. 개별 기간/단가/RR에는 상속 여부를 표시한다. 여러 인력 행을 동시에 펼칠 수 있다. 누락 금액을 0합계로 표시하지 않는다. 월별 차트·계산 명세·접힌 주별 표를 calculate 결과로 연결한다. 큰 금액 표시는 Number로 변환해 정밀도를 잃지 않게 한다.
- [ ] **Step 5 — 흐름 검증:** 빈 상태 → 생성 → 완성 → 복제 → 삭제, 다른 브라우저 context의 저장 결과 조회, 탭 간 409, 오류 재시도, 세션 만료 Dialog 재로그인 뒤 draft 보존을 E2E로 확인한다. 익명 fixture의 `¥19,000,000`과 `843.6` 표시를 assert한다. `pnpm test tests/server/save-controller.test.ts && pnpm test:e2e tests/e2e/estimate-editor.spec.ts tests/e2e/save-recovery.spec.ts` exit 0.
- [ ] **Step 6 — 커밋:** `feat: add estimate editor and resilient autosave`.

## Task 6: 저장된 견적안 비교

**Files:** Create `src/domain/compare.ts`, `src/features/compare/compare-view.tsx`, compare route, `tests/domain/compare.test.ts`, `tests/e2e/compare.spec.ts`; Modify 목록 선택 컨트롤.

**Interfaces:** `compareEstimates(estimates:Estimate[],baselineId:Id):Comparison` returns `{baselineId,columns:[{estimateId,result:Calculation,delta:{total,personMonths,roundedLabor,expenses}|null}]}`. Delta는 기준안을 뺀 decimal 문자열이며 미완성 안은 null이다. 같은 회사 2~4개만 허용한다.

- [ ] **Step 1 — 실패 테스트:** 1개/5개/중복 ID/다른 회사/누락 ID/미완성 견적/기준안 전환을 검사한다. `expect(compareEstimates([base,copy],base.id).columns[1].delta?.total).toBe('0')`; 경비를 늘린 fixture에는 정확한 차액을 assert한다.
- [ ] **Step 2 — 실패 확인:** `pnpm test tests/domain/compare.test.ts` 실패 확인.
- [ ] **Step 3 — 구현:** 서버에 저장된 상태로 목록 선택과 query를 검증하고 비교표를 만든다. 미저장 draft가 있으면 이동 전 flush한다. 기준안 Select, 기간/금액/공수/차액, 미완성 안내와 표 내부 가로 스크롤을 구현한다.
- [ ] **Step 4 — 검증/커밋:** `pnpm test tests/domain/compare.test.ts && pnpm test:e2e tests/e2e/compare.spec.ts` exit 0. 390px에서 페이지 넘침 없이 표만 스크롤하는지 확인 후 `feat: add saved estimate comparison`.

## Task 7: 설정·기준 갱신·백업 복원

**Files:** Create `src/features/settings/*`, settings route, `tests/e2e/settings.spec.ts`, `tests/e2e/backup.spec.ts`; Modify editor의 기준 갱신 진입점.

**Interfaces:** Task 1의 refreshCriteria와 Task 4의 state/backup API를 사용한다. `CriteriaDialog({estimate,settings,onApply(sections)})`는 선택 항목과 변경 전후 합계를 미리 보여준다. BackupDialog는 검증된 snapshot과 회사/견적 개수를 표시하고 확인 뒤 POST한다.

- [ ] **Step 1 — 실패 테스트:** master 단가/휴일 변경 뒤 과거 견적 합계 불변, rates를 명시적으로 갱신한 뒤 예상 합계, 개별 override 유지, 직위명 변경/보관 뒤 기존 표기 유지를 검사한다. Store 테스트에 `expect(restored.revision).toBe(beforeRestore.revision+1)`와 지원하지 않는 schema 거부/현재 백업 생성을 추가한다.
- [ ] **Step 2 — 실패 확인:** Settings/backup E2E가 없는 화면/동작 때문에 실패하는지 확인한다.
- [ ] **Step 3 — 구현:** 640px 설정 폼, 직위 관리, 휴일 날짜/이름과 관리 연도 범위, 회사 관리 Dialog, 기준 갱신 preview, JSON 입출력을 구현한다. 원본 HTML의 상태는 지원하지 않는 형식으로 안내한다. 복원 전 flush → 스키마 검증 → 개수 preview → 교체 확인 뒤 store.restore를 사용한다.
- [ ] **Step 4 — 검증/커밋:** `pnpm test tests/domain/criteria.test.ts tests/server/store.test.ts && pnpm test:e2e tests/e2e/settings.spec.ts tests/e2e/backup.spec.ts` exit 0. 큰 파일·깨진 참조·미래 schema·복원 후 다른 탭의 409와 회복을 확인 후 `feat: add settings and verified backup restore`.

## Task 8: 통합·디자인 검증과 수정

**Files:** Create `tests/e2e/{layout,accessibility}.spec.ts`, `docs/evidence/<run-id>/{verification.md,layout.json,findings.md}`, `docs/design/frontend-sources.md`; Modify 검사로 확인된 제품 파일만.

**Interfaces:** 공통 landmark `[data-app-brand]`, `[data-app-toolbar]`, `[data-app-nav]`, `[data-content]`를 사용한다. 테스트 fixture는 E2E 임시 서버에서만 사용하며 production 인증 우회 route를 만들지 않는다.

- [ ] **Step 1 — acceptance 검사:** 로그인/목록/편집/비교/설정, 빈/많은/긴 내용, 390/768/1440/2560px × light/dark를 표로 정의한다. 페이지 scrollWidth≤clientWidth, 같은 조건에서 브랜드/toolbar x좌표 오차≤1px, 실제 폰트 로드, 본문16px/터치44px, Dialog 키보드 포커스 복귀를 assert한다.
- [ ] **Step 2 — 브라우저 검사:** 작업 흐름을 실행하고 실제 screenshot을 열어 검토한다. Vitest·typecheck·lint·build·Playwright/axe, 텍스트/컨트롤/선택/포커스 대비, OS reduced motion을 검사한다. 사용자 viewport를 알게 되면 추가한다. 같은 프레임과 목록/비교의 긴 내용을 나란히 확인한다.
- [ ] **Step 3 — 배치 수정:** 발견한 범위 내 결함을 한 번에 수정하고 영향 검사를 재실행한다. 기능·공유 디자인 준수·실제 배치 결과를 분리해 기록한다. 직위명 연결·Infinity·저장 실패·휴일 범위·모바일 미검증은 새 증거로 각각 닫는다. 실제 보조 기술 검사를 하지 않았다면 미검증으로 남긴다.
- [ ] **Step 4 — 최종 리뷰:** 선택한 실행 방식과 적용 skill의 독립 리뷰에 실제 revision·spec·screenshot을 제공한다. 코드 리뷰를 브라우저 검사로 대체하지 않는다. 새 필수 발견 사항만 수정·재검증하고 과거 증거는 보존한다. 필수 기준이 남아 있으면 출시 준비 완료로 부르지 않는다.
- [ ] **Step 5 — 검증/커밋:** `pnpm typecheck && pnpm lint && pnpm test && pnpm build && pnpm test:e2e` exit 0과 검사별 evidence 확인 후 `test: verify estimate workflows and shared design compliance`.

## Task 9: 지속 저장 가능한 배포 묶음과 서브도메인 연결

**Files:** Create `scripts/smoke.mts`, `ops/*`, `docs/ops/deployment.md`, `docs/evidence/<release-id>/smoke.json`; Modify packaging script, README/STATUS.

**Interfaces:** `pnpm smoke`는 임시 데이터·무작위 비밀번호·서명 키·2472 포트로 standalone을 실행하고 종료 때 자기 프로세스만 정리한다. 운영 템플릿은 runtime mode=production, ESTIMATE_SERVE=1, 지속 dataDir, credential/key 경로, APP_ORIGIN,2473포트,Node24.21.0을 명시한다.

- [ ] **Step 1 — 패키징:** Standalone에 public/font/.next/static이 포함됐는지 검사한다. 소스/문서/lockfile/commit와 빌드 hash를 manifest로 남기고 credential·실제 env·데이터가 묶음에 없음을 검사한다. Launchd 템플릿을 최종 설치 경로로 치환 가능하게 만든다.
- [ ] **Step 2 — 로컬 운영 빌드 smoke:** 임시 credential로 실제 로그인 → 견적 생성 → 조회 → 서버 종료/재시작 → 같은 쿠키로 견적 조회 → 로그아웃을 검사한다. 다른 Origin403/익명401/비밀경로404, 데이터 보존, 백업 복원, 두 번째 서버의 잠금 실패를 확인한다. 정상 종료의 잠금 해제와 비정상 종료 뒤 runbook 복구를 검사한다. `pnpm build && pnpm smoke`와 `plutil -lint ops/dev.naeil.estimate.plist.example`의 유효한 치환 fixture 결과가 exit 0이어야 한다.
- [ ] **Step 3 — 구체 배포안 확정:** 검증한 빌드, 사용 가능한 호스트 이름, 포트, 지속 폴더, 프로세스명, rollback 경로를 제시한다. 최종 서브도메인과 사용자가 숨김 입력으로 설정할 운영 비밀번호는 이 단계의 외부 입력이다. 이를 기다리기 전에 코드·검증·패키징을 완료한다. 기존 승인의 범위를 존중하되 다른 서비스 변경을 포함시키지 않는다.
- [ ] **Step 4 — 확정된 대상에 배포:** 별도 release 디렉터리에 설치하고 전용 초기 설정 명령으로 빈 상태를 만든다. 사용자는 숨김 비밀번호 명령으로 운영 비밀번호를 정한다. 기존 데이터가 있으면 덮어쓰지 않는다. 이 앱의 LaunchAgent·ingress만 반영하고 기존 서비스는 보존한다. 공개 HTTPS 로그인·직접 API 차단·host-only cookie·static 경로를 검사한다. 운영 비밀번호를 읽지 않고 사용자 브라우저의 로그인 완료 상태로 정상 사용을 확인한다.
- [ ] **Step 5 — 결과/커밋:** 검사한 범위와 하지 못한 범위를 구분하고 URL·source/build revision·재시작·백업 복구·rollback 방법을 STATUS에 기록한다. 코드 rollback은 현재 데이터/credential을 덮지 않는다. `docs: document estimate deployment and recovery`로 커밋한다. 원격 push/merge는 실제 대상과 통합 요청을 확인해 수행한다.

## 계획 점검과 실행 인계

- 명세1~4의 독립 앱/언어/화면/디자인 → Tasks1,4~8; 명세5 계산/기준 보관 → Tasks1,5~7; 명세6 저장 → Tasks2,5,7,9; 명세7 인증 → Tasks3~5,9; 명세8 경계 → 파일 구조/공통 계약; 명세9 검증/출시 → 각 Task 검사와 Tasks8~9.
- 다섯 Review Focus 모두 실패 테스트와 검증 작업에 배정했다. Task6이 추가하는 compare 파일은 Task1에서 placeholder로 만들지 않는다. Task4 이전에는 도메인/서버 테스트를 진행한다.
- 공통 저장 호출은 `Store.update(expectedRevision,fn)`이며 복원도 같은 queue/revision 규칙이다. SaveController의 transport는 Task4 API 계약을 따른다. 설정 변경과 견적 기준 갱신 명령을 분리했다.
- 이번 계획 작성 중 실행한 것은 읽기 탐색·npm 버전 조회·Node 공식 배포 목록 조회·문서 검사다. 새 runtime 설치·프로젝트 생성·제품 테스트·배포는 아직 실행하지 않았다.
- 권장 방식은 이 세션에서 직접 구현한 뒤 최종 독립 리뷰다. 9개 작업이 도메인·저장·상태 계약을 순차 사용하므로 한 구현자가 일관성을 유지하는 이점이 크다. 사용자가 작업별 subagent/리뷰를 선택하면 그 방식을 따른다. 문서 검토와 실행 방식 선택 뒤 첫 미완료 Task부터 시작한다.
