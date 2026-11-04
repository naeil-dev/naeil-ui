# 내부 다국어 구현 통일 — Opus 5.5 재검토

사용자가 URL·정책뿐 아니라 내부 구현도 통일하도록 요청해 설계를 수정했다. [현재 설계](../../superpowers/specs/2026-11-04-shared-language-design.md)의 공통 next-intl route/provider/controller와 JSON 번역 관리가 이번 검토 대상이다. [이전 URL 리뷰](opus-path-review.md)를 이번 내부 구조의 승인으로 사용하지 않는다.

| 항목 | 기록 |
| --- | --- |
| reviewer | 기존 Opus advisor `57075402-e0e3-4036-8311-45431ff534c0` |
| 요청 모델 | claude-opus-5-5, high |
| 요청 대상 SHA256 | `3d13a0d3f5486b1fff5204c31903675a7c0410bec0400e823757120e40214bb7` |
| 요청 message ID | `6f8d3620-5054-4cbe-b2cd-cee89b1b783e` |
| 범위 | 변경 문서와 필요한 로컬 소스 열람. 실행/외부 조사/제품 수정 없음 |
| 상태 | 최종 파일 자체 재검토 완료. reviewer 결론: 남은 설계 차단 없음 |
| 모델 확인 | 응답 후 Paseo snapshot model/runtimeInfo.model/extra.runtimeModel이 모두 claude-opus-5-5, updatedAt 2026-11-03T23:48:14.737Z |

기존 main/Jev의 next-intl 사용, 서로 다른 메시지 저장 형식, Estimate 일본어 전용 소스와 Home i18next는 작업자가 직접 확인했다. 근거와 운영 소스 대조 한계는 [현행 확인](source-audit.md)에 기록했다. 새로운 외부 조사 run을 시작하지 않았다.

[초기 조건부 응답](opus-runtime-review-response.md)은 차단1건·핵심 수정1건 반영 조건으로 승인한다는 결론이었다. 내부 추론이나 중간 도구 출력은 보존하지 않았다.

| 지적 | 판단 | 최종 반영 |
| --- | --- | --- |
| RSC 실패/인증 redirect가 document 이동을 유발해 root store 소멸 | 채택 | 로컬 Next fetch-server-response.js에서 해당 fallback 분기를 직접 확인. §6에 보호 데이터 없는 정상 RSC 복구 payload·header 위조 불신·별도 data 권한 검사, §7에 공통 beforeunload/실패 주입 시험을 추가했다. 최초 document와 RSC 처리 형식을 구분한다. |
| beforeunload로 모든 환경에서 무조건 보존 가능하다는 해석 | 한정 | 이 이벤트를 전체 보존 보장으로 쓰지 않는다. 지원 환경의 실패 시험에서 상태 유지/사용자 확인이 안 되면 완료를 막고 같은 controller에서 작업 중 전환을 보류한다. 사용자 이탈 확인 후 스트림까지 유지된다고 주장하지 않는다. |
| remount에서 server props로 store 덮어쓰기 | 채택 | 사용자/entity/revision 기준 기존 store 재초기화 금지, 더 새 revision은 충돌 흐름, 오래된 payload의 역전 금지. root provider는 번역 hook에 의존하지 않고 dialog 렌더는 locale 경계 아래에 둔다. |
| standalone 공통 사전 bundle 예외 | 채택 | 작은 공통 사전 세 언어만 standalone entry에서 정적 포함. 새 provider 경로는 naeil namespace, 서비스 사전은 타 앱에 포함하지 않는다. 원본 JSON은 하나다. |
| 기존 generateStaticParams 때문에 정적 렌더 퇴행 위험이 없음 | 단정 미채택 | 공통 root가 headers/auth 의존성을 추가하면 결과가 달라질 수 있다. 공개 경로의 실제 정적 생성·캐시 결과를 구현 검사에 추가했다. |
| optional peer 선언으로 next-intl 사본 중복이 구조적으로 차단됨 | 단정 미채택 | 선언은 올바른 방향이지만 소비 resolution/번들까지 보장하지 않는다. 실제 packed 소비 dependency tree와 React/next-intl context 중복 검사로 확인하도록 했다. |

## 최종 파일 재검토 완료

사용자가 리뷰 포함 완료 여부를 확인해, 조건을 반영한 설계 자체를 동일 Opus 5.5 reviewer에게 다시 검토받았다. [최종 재검토 응답](opus-runtime-review-final.md)은 `7a8d1436ff5e82f1f78b4ae7efbbc67eb1679daedf9e2cac75473e21ac3fb9e7`의 남은 설계 차단이 없음을 확인했다. 비차단으로 지적한 사용자 확인 후 document 이탈 예외를 §6/§12 두 곳에 명시했다.

그 두 문구까지 반영한 최종 파일 SHA256 `514c16a8dfc1a85324a9209811db624fb19ca57ae3cf3a457ef9c930e900dc0e`를 reviewer가 다시 확인했고 **설계 검토 완료, 남은 설계 차단 없음**으로 결론냈다. 그 뒤 설계 파일은 변경하지 않았다. 제품 구현·배포·런타임 시험은 별도 단계이며 수행하지 않았다. hash와 모델 기록은 [리뷰 receipt](runtime-review-receipt.json)에 있다.
