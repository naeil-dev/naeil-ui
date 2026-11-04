> **이 기록은 대체된 초기 혼합안의 리뷰다.** 현재 기준은 모든 필수 서비스의 경로 통일이며, [현재 설계](../../superpowers/specs/2026-11-04-shared-language-design.md)와 [새 리뷰](opus-path-review.md)를 따른다. 이전 검토 대상은 [보존본](superseded-hybrid-design.md)이다.

# Opus 5.5 리뷰 반영 기록

사용자가 요청한 모델로 독립 검토했다. 범위는 설계 검토이며 구현·브라우저 실행 시험·제품 변경은 하지 않았다.

| 항목 | 기록 |
| --- | --- |
| 요청/관측 runtime model | `claude-opus-5-5` (Opus 5.5), high |
| agent | `57075402-e0e3-4036-8311-45431ff534c0` |
| runtime session | `5c10c037-3fb4-4759-a241-88c031c6edca` |
| 서버 / workspace | `srv_ExrvrbkWmtMP` / `wks_51cd033507167804` |
| 최초 요청 | 2026-11-03 21:43:01 UTC / 11-04 06:43 JST |
| 초안 SHA256 | `ab9991d771878a43e89751df299e4eaf875a10c1765b1704bfa081d701406321` |
| 1차 응답 완료 | 2026-11-03 21:47:34 UTC |
| 모델 확인 | finished 알림 뒤 snapshot.runtimeInfo.model 및 extra.runtimeModel을 확인 |
| 원문 | [1차 리뷰](opus-review-initial.md) — 최종 답변 조각만 보존; 내부 분석/중간 도구 출력 제외 |
| 결론 | 공통 정책 + 경로/query adapter 권고에 동의. 초기 SSR 전달·업그레이드·rollout·호환 동작을 보완할 조건 |

## 반영표

| 지적 | 판단 | 최종 설계 반영/이유 |
| --- | --- | --- |
| 핵심 대안 비교 | 조정 채택 | §2: Jev validator 수정 자체를 큰 장애로 부풀리지 않고 locale 경계의 상태 수명과 Estimate 옛 URL 의미를 주요 비용으로 명시. 미래 path 이관은 adapter 설정만 바꾸면 끝나는 작업이 아니라 서버 진입·인증·호환 검증도 필요하다고 한정했다. |
| B1 deterministic root와 선호의 역할 | 채택, 표현 교정 | §4: 현재 자동 탐지 제거를 의도적 변경으로 기록하고 저장 선호의 비강제 제안 링크를 추가했다. 리뷰의 “선호를 덮는다”는 표현은 **이동 언어만 en이 되며 저장 ko는 바뀌지 않음**으로 바로잡았다. |
| B2 query SSR 전달 | 채택 | §6: proxy의 검증된 내부 요청 헤더 → root layout/provider/metadata snapshot; 요청자가 보낸 헤더 덮어쓰기, auth Set-Cookie 보존, Jev localStorage 예외까지 명시했다. |
| B3 패키지 업그레이드 영향 | 채택 | §10: UI identity 0.9.0과 이 branch/소비자 0.7.2 차이를 먼저 배포·발행 증거로 해소하고, 새 entry 소비에 필요한 header/footer/account·packed consumption 검증을 독립 단계로 추가했다. |
| B4 수신자 우선 rollout | 조정 채택 | §10: Estimate → Jev 수신 준비 후 송신 링크/공통 쓰기 활성화, 메인 마지막. live 채택 상태를 npm에서 제거했다. 구 앱이 query를 무시해도 언어 계약은 실패하므로 “먼저 보내도 안전”이라는 제안은 채택하지 않았다. |
| M1 서버 쿠키 endpoint/ITP | 부분 채택 | §6: Max-Age는 실제 보존 기간 보장이 아님을 명시. 새 서버 endpoint/HttpOnly 전환은 채택하지 않았다. 현재 요구는 장기 저장 SLA가 아니라 링크/URL의 언어 전달이고 client-only helper로 충분하다. 브라우저별 정확한 7일 주장은 이번 외부 조사로 검증되지 않았으며 최종 사실 근거로 쓰지 않았다. |
| M2 중복 쿠키 복구 | 채택 | 명시 선택 때 현재 호스트의 알려진 같은 이름·Path=/ host-only 잔여값 삭제 후 Domain 값 기록. 모르는 모든 Path를 지울 수 있다고 보장하지 않는다. 남는 중복은 invalid, URL은 계속 동작한다. |
| M3 forcePrefix·307·query 정리 | 채택 | 로컬 4.8.3 소스를 직접 대조했다. 완성된 locale href는 기본 Next link/router로 전달하고 명시 locale 옵션으로 재해석하지 않는다. `/en`은 기본307, 메인 lang query는 무시하되 보존한다. |
| M4 Estimate 기본값/포맷 | 조정 채택 | 단순히 browser 뒤의 fallback만 ja로 바꾸면 영어 브라우저의 옛 일본어 URL은 여전히 바뀐다. §4의 `legacy-ja` neutral 정책으로 무URL언어·무공통선호일 때 ja를 유지하며 explicit/shared가 항상 우선한다. 읽기 전용 표시는 UI Intl, 업무 통화/시간대/문서 언어는 기존 데이터 정책, raw 입력은 재파싱하지 않는다. 구분자가 같으니 안전하다는 논증은 사용하지 않는다. |
| M5 범위 종료점 | 채택 | 날짜가 찍힌 현재 DNS/hosting/배포 route·link inventory로 이번 릴리즈 범위를 고정하고 이후는 amendment/계약 검사로 다룬다. |
| M6 실제 링크 기준 | 조정 채택 | 존재하는 UI 링크 × 3언어로 브라우저 행렬을 만들고, 전체 서비스 쌍은 builder 계약 시험으로 따로 보장한다. 현재 branch의 catalog를 모든 배포의 메뉴라고 가정하지 않는다. |
| M7 정적 메시지/guard 단순화 | 채택 | Jev/Estimate 세 메시지를 정적 번들. locale-only 전환은 client state 변경이라 save guard/저장/revision을 실행하지 않는다. 실제 떠나는 이동/로그아웃의 guard는 유지한다. |
| L1 basePath 추상화 | 채택 | 현재 세 서비스에 없는 mount 추상화는 제거. 실제 inventory에서 필요해질 때 명시 추가한다. |
| L2 history 언어 | 채택 | back/forward는 그 URL의 언어를 복원하고 선호를 쓰지 않는 의도된 동작으로 기록했다. |
| L3 보호 UI noindex | 채택 | 인증 앱의 보호/오류 화면은 noindex, 공개 SEO용 alternate 목록 없음. |
| L4 미번역 직접 접근 | 채택 | 직접 접근404와 선택기 fallback을 분리했다. 영어 본문을 다른 언어 URL로200 응답하지 않는다. |
| L5 legacy 종료일 | 채택 | 배포 날짜를 꾸며 쓰지 않고 전체 활성일 T+90일을 확정 정책으로 삼으며 실제 날짜를 receipt에 고정한다. Estimate neutral-ja 예외와 구별한다. |
| L6 인증 언어/비활성 코드 | 채택 | 로그인 화면은 메인 경로, next.lang은 복귀 앱 담당. exact return 경계 유지. 비활성 archive의 옛 코드는 현재 운영 버그로 주장하지 않는다. |
| 별도 보완: alternateLinks/부분 번역 | 반영 | §8에 alternateLinks:false, metadata/sitemap 단일 소유. 헤더의 세 UI 언어는 유지하고 번역 없는 글 선택은 해당 언어 목록+검증된 원문 안내로 보낸다. |

쿠키 수명, root routing, query SSR의 모든 플랫폼 조합을 실행해 검증했다는 뜻은 아니다. 코드를 읽어 확인한 사실과 구현 후 acceptance를 구분한다. R13 Reddit 사례는 로컬 소스 확인으로 공식 근거가 되는 것이 아니며, 단일 사용자 경험이라는 기존 한계를 그대로 유지했다.

## 수정본 재검토

Opus 5.5는 수정본 `8822aa4a950925586655c38914209f84db34672331c2fcc8d332ec17db2dcc1a`를 읽고, 위 조정 판단을 수용했다. [실제 재검토 답변](opus-review-recheck.md)은 “남은 차단 1건을 보완하면 최종 설계로 확정 가능”이라는 조건부 결론이다.

마지막 차단은 **client provider만 바꾸면 RSC에 고정된 이전 언어 문구는 남는다**는 점이었다. 최종 §9는 제시된 두 해결책 중 client 렌더 소유권을 선택했다. 전환 대상 UI 문구는 두 앱 모두 client provider에서 렌더하고 서버는 데이터/key/code를 전달한다. 최초 SSR은 여전히 제공하며, 데이터 fetch 전체를 client로 옮기지 않는다. locale-only `router.refresh()`를 추가해 편집 상태를 위험하게 만드는 대안은 채택하지 않았다. §11에는 전환 직후 모든 번역 대상 key 갱신과 데이터 보존을 함께 확인하는 조건을 넣었다. 사용자 입력·기존 생성 결과·고유명까지 번역하라는 뜻으로 확장하지 않았다.

추가로 지적한 세 문장도 반영했다: §3 표를 고정 inventory 기준으로 수정, §9 메인의 guard 수락 직후 쿠키 기록을 명시적 예외로 구분, §6 layout에서 locale 재검증 및 proxy 제외 경로의 헤더 불신 규칙 추가.

이 마지막 보완은 작업자가 반영·문서 검증했다. **최종 바이트에 대해 다시 무조건 승인을 받았다고 주장하지 않는다.** 구현 후 상태 보존/번역 실행 시험도 아직 하지 않았다. 최종 설계 SHA256: `03275533fa9b609b56393492c8ba0ba8fecb5a13f8b61ce3eacc3af06f9aa566`. 모델과 파일 hash의 기계 기록은 [리뷰 receipt](review-receipt.json)에 있다.
