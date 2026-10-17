# 계정·언어와 Console 인증 통합 — 2026-10-17

최신 UI0.7.1 위에 중앙 인증을 선택적으로 통합했다. 세 서비스의 공통 헤더·푸터·계정 메뉴 운영 배포는 완료 상태를 유지하며, **이번 인증 전환은 아직 운영에 배포하지 않았다.** 이 문서는 최종 사이트 검증 중 갱신된다.

사용자는 최초 Console 관리자 Jay 1명과 회원별 명시 허용표라는 기존 설계 유지를 확인했다. 실제 UUID 등록, 실회원 grants, hosted 설정, 실메일, push/merge/배포는 수행하지 않았다.

## 소스와 격리

| 대상 | 기존 최신 UI/인증 기준 | 새 통합 작업 위치·브랜치 | 검증 런타임 |
| --- | --- | --- | --- |
| naeil.dev | UI `9f83816` / 초대 `ede9f7b`, `bb83a99` | `/Users/jaymini/.paseo/worktrees/28nele6j/naeil-account-language` · `integrate/console-account-language-site` | 최종 동결 후 아래 영수증 갱신 |
| AB Estimate | UI `8c3e043` / 인증 `af7d6ea` | `/Users/jaymini/.paseo/worktrees/1bnldk74/estimate-account-language` · `integrate/console-account-language-estimate` | `72e22fc74bcc8db266c8b844fe852b914e4ec36a` |
| Jev | UI `6b5fd15` / 독립 인증 snapshot `36002aa` | `/Users/jaymini/.paseo/worktrees/3tl6a87q/jev-account-language` · `integrate/console-account-language-jev` | `2b3a31140e12ec88677942a8749b39a55af2503a` |
| Home Console | 인증 `dd8fa93c` | `/Users/jaymini/.paseo/worktrees/3qtenke4/naeil-home-account-language` · `integrate/console-account-language-home` | 좁은 보완 `51482f6c16cf3fca33648990998378629574fcbb` |

오래된 인증 브랜치의 package/CSS/메뉴로 덮어쓰지 않았다. [원본7개 작업 위치 상태](evidence/account-language-integration-2026-10-17/original-worktrees.json)는 인계와 같으며, 기존 미커밋 문서·mockup 변경도 보존했다. 공통0.7.1 archive SHA256는 `ecd656c595fd63516417eef58a5e2624d1f1bf928ba0465761292d05502ab3f8`로 동일하다. 공개0.6.0 재게시나0.7.1 archive 교체는 없다.

## 연결한 동작과 수정

- 세 앱은 기존 `NaeilHeaderAccountControl`을 사용한다. 이름·이메일은 서버가 검증한 Auth 응답에서 표시용으로만 전달한다. 권한 근거로 사용자 metadata를 사용하지 않는다. pending/요청 lock은 desktop/mobile slot 위에서 유지한다.
- Estimate/Jev는 개인 opaque host-only 세션과 서버 고정 서비스의 현재 `access_decision`을 보호 요청마다 확인한다.401/403/503, 권한 회수·전체 차단, legacy cookie 거부, Origin/CSRF, PKCE replay/refresh/logout 경계를 유지한다.
- 계정 전환은 기존 공유 로그아웃 다음 provider 로그인이다. Google에는 계정 선택을 요청한다. 새 계정 메뉴/프로필 편집/전역 로그아웃/자동 SSO는 추가하지 않았다.
- Estimate의 raw invalid input, save/flush 실패,409 충돌, restore file, export/명시적 폐기, 새 탭 재인증 후 identity/revision 재검증을 보존했다. 전체 E2E에서 발견한768px 긴 category Select의 중복 scrollbar 보상 문제는 소비 앱의 해당 메뉴에만 보완했다. 업무 schema3/계산/기존 데이터·backup은 바꾸지 않았다.
- Jev의 입력·기존 결과를 인증 실패로 지우지 않는다. dirty/result/stream 상태에서 로그아웃 전 명시적으로 확인하고, 승인된 logout pending 동안 입력을 막는다. quota/lease/stream 경계는 기존 계약을 따른다.
- 사이트는 host-only 전용 세션 namespace로 기존 공유 cookie를 신뢰하지 않는다. 인증 장애 때 recoverable cookie를 유지하며 보호 문서에는503을 돌려준다. 로그인 복귀 URL의 locale 중복, query percent 이중 해석, background prefetch가 return cookie를 덮는 문제를 수정했다. callback은 no-store/no-referrer이며 안전한 query/hash를 보존한다. 지연된 refresh/callback이 로그아웃을 되돌리지 못하도록 로그인 generation과 로그아웃 epoch를 분리했고, 복귀 cookie도 같은 namespace에 묶었다. 정상 logout 실패 시 성공 이동을 하지 않으며, 명시적인 브라우저 로컬 정리 동작으로 해당 사이트의 정보만 제거하고 다시 로그인할 수 있다.
- Console은 재현된 두 결함을 수정했다. 다른 동일 계정 세션까지 해제하던 기본 logout scope를 local로 제한했고, generic upstream401/403을 개인 만료로 오인하지 않는다. 권한 거부·장애 후에도 Home-bound CSRF로 개인 logout을 할 수 있으며 dirty/불확실 작업의 기존 확인을 유지한다.

## 언어 계약

| 앱 | 지원 | 전환·유지 |
| --- | --- | --- |
| naeil.dev | ko/ja/en | localized URL과 origin-local locale cookie, query/hash 보존, 로그인 성공/실패 복귀에도 유지. 격리된 초대 수락 화면도3개 언어와 reload 지원. |
| Jev | ko/ja/en | URL `lang` → localStorage → host-only cookie → 기본 English. query/hash·입력·결과 보존, history와 storage 차단 조건 검증. |
| AB Estimate | ja | 본문과 공통 chrome은 일본어. 지원하지 않는 언어 선택기 없음. |

Estimate 본문 번역, 서비스 간 동기화, 계정별 언어 저장은 합의/구현된 요구로 취급하지 않았다.

## 검증 증거와 경계

| 대상 | 이번 직접 실행 결과 | 증거 |
| --- | --- | --- |
| 사이트 | 260 unit/5 opt-in skip, 계정 slot2, types/lint 통과; auth recovery 수정 완료, 최종 동결·built browser·초대 재검증 진행 중 | 최종 영수증 추가 예정 |
| Estimate |712 unit, 초기 전체365 browser 중355 pass → 원인 수정 후 영향66 case 해결,62 smoke,608 actual local Auth/DB,17 integrity; lint/types/build 통과 | [소비 앱 보고서](/Users/jaymini/.paseo/worktrees/1bnldk74/estimate-account-language/docs/evidence/account-language-2026-10-17/verification.md) |
| Jev |125 unit,46 Chromium,76 actual local Auth/DB; type/lint/build·2133파일28링크 무결성 통과 | [소비 앱 보고서](/Users/jaymini/.paseo/worktrees/3tl6a87q/jev-account-language/docs/ops/account-language-verification.md) |
| Home |339 scoped backend,911 full frontend,6 actual Auth/Home,25 recovery browser; scoped static/types/format, OpenSpec 통과 | [Console 보완 보고서](/Users/jaymini/.paseo/worktrees/3qtenke4/naeil-home-account-language/openspec/changes/naeil-console-access/account-integration-verification-2026-10-17.md) |
| 중앙 SQL | 새 fixture migration001–003,270 pgTAP,24 separate-connection race 통과 | Home 보고서의 실행 경계·fixture ownership |

actual local은 실제 GoTrue/PostgREST/RLS/Postgres와 가상 사용자에 대한 검사다. 외부 OAuth code 교환과 모델 응답은 명시적 test seam이다. Google/GitHub 실제 로그인·identity linking, 운영 HTTPS 세션, 실SMTP inbox, 물리 기기/native AT 성공으로 표현하지 않는다.

새 fixture는 `/private/tmp/naeil-account-language-review-20261017/fixture-home`, API55421/DB55422이며 suite를 순서대로 실행했다. 원래55321/55322나 운영 컨테이너를 재시작·초기화하지 않았다. 서비스 field 복구와 가상 사용자/관련 행 cleanup을 각 actual suite가 확인했다. 업무 데이터·backup·운영 환경 값은 fixture로 읽거나 복사하지 않았다.

[메인 독립 리뷰](evidence/account-language-integration-2026-10-17/independent-review.md)는 source diff, artifact 무결성, 실제 consumer screenshots와 Home39 focused tests를 직접 대조했다. 동일 조건의 익명/로그인,390/768/1440/1920,light/dark,지원 locale,keyboard/Escape/touch는 앱별 browser 보고서를 따른다. shared package 코드/토큰/스타일은 고정했으므로 이번 소비 앱 검증을 새 패키지·Storybook release 검증으로 바꾸어 표현하지 않는다.

Impeccable context/harden/craft-floor와 scoped detector를 실제 실행했다. Aside hosted 설정 탭 attach는 timeout이어서 설정 검증으로 계산하지 않았다. 외부 디자인 카탈로그/생성 도구 사용은 없다. 정확한 범위는 [frontend sources](../design/frontend-sources.md)를 따른다.

## 고정 산출물

| 앱 | 위치·identity | 무결성 |
| --- | --- | --- |
| Estimate | `estimate-account-language/release/72e22fc74bcc-4ceff0a23fa2` | runtime artifact `45d0c6c51499477e98517f64fc67b6c1c635eafa4677436f1e5db690bd6a16d3`; manifest `3c2f557029a5da2b133556db35e28163ef4e2b757064f8346191ff3f8797447b` |
| Jev | `~/.local/share/naeil-ui-rollout/consumer-candidates/jev/2b3a31140e12ec88677942a8749b39a55af2503a` · BUILD_ID `Lj7mR-mIgo3sYAZ5l-a7U` | archive SHA256 `61916868ce188b33778036d8a99b859332c5267f8df09e9891d139e576b8a86c` |
| 사이트 | 최종 local-only synthetic Auth artifact 동결 예정 | 운영 설정 artifact로 사용하지 않음 |

후속 결과 문서 커밋과 런타임 source를 구분한다. Estimate source archive는 test transport fixture를 의도적으로 제외하므로 전체 acceptance 재실행은 정확한 Git source를 사용한다. Home의 보완 커밋은 현재 운영 소스를 조정한 배포 artifact가 아니다.

## 운영 상태와 다음 경계

[최종 공개 identity 관측](evidence/account-language-integration-2026-10-17/production-unchanged.json)에서 세 앱은 인계 당시 source/artifact와 동일한 UI0.7.1이다. 인계 때 미완료였던 중복 사이트 merged-source [CI39002496935](https://github.com/naeil-dev/naeil-ui/actions/runs/39002496935)는 completed/success로 확인했다. 이는 기존 UI 배포의 CI이며 이번 인증 후보 CI/배포가 아니다.

[운영 전환 검토 자료](account-language-transition-2026-10-17.md)에 초기 허용표, callback/signup/provider/SMTP 조건, 실제 writer/data 보존, 순차 활성화와 권한을 유지하는 복구안을 준비했다. 특히 **현재 Vercel의 초대 transaction 지속성/비밀 파일 공급, Home 운영 overlay·소스 조정, 실제 제공자·실수신함**은 아직 완료되지 않았다. 단순 push로 이 경계를 우회하지 않는다.
