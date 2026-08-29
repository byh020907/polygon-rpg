# Polygon RPG — Agent Instructions

이 파일은 이 저장소에서 작업하는 AI 개발 에이전트의 최상위 프로젝트 지침이자 문서 인덱스다. 에이전트는 필요한 문맥만 단계적으로 읽고, 문서의 정확성을 실제 코드와 설정으로 검증하며, 상충하는 규칙을 임의로 해석하지 않는다.

## Engineering Method

다음 Method를 읽고 따른다.

- [Reference-Guided Engineering](https://github.com/byh020907/ai-development-methods/blob/main/methods/reference-guided-engineering/METHOD.md)

이 프로젝트가 명시적으로 선택한 Engineering Method는 **Reference-Guided Engineering** 하나뿐이다. 사용자가 다른 Method를 프로젝트에 명시적으로 추가하기 전에는 같은 저장소의 sibling Method를 탐색·읽기·적용하거나, 해당 Method의 실행 전략을 암묵적으로 결합하지 않는다.

이 Method는 directory·module boundary, 책임 분리, abstraction depth, dependency direction, state ownership, lifecycle, naming, error handling, testing과 verification 같은 Engineering Decision에만 적용한다. Product Requirement, Domain Model, Gameplay Rule, 화면·asset·balance, iteration 횟수, autonomous improvement loop와 Reference 자동 승격은 이 Method가 결정하지 않는다.

## Engineering References

다음 두 로컬 저장소를 공동 초기 **Engineering Exemplars**로 사용한다.

- `C:/projects/ball-fight-simulator`
- `C:/projects/baeseongjin`

Reference의 directory tree나 class 이름을 template처럼 복제하지 않는다. 실제 코드, caller, test와 문서에서 선택의 맥락과 해결하려는 문제를 추론하고 Polygon RPG의 요구사항에 맞게 적용한다. Reference의 기능, Domain Model, Gameplay Rule, 화면, asset, balance, project-specific workaround와 불필요한 abstraction은 기본적으로 계승하지 않는다.

Engineering Decision의 근거 우선순위는 다음과 같다. 이 순위는 아래의 전체 Instruction Precedence를 대체하지 않고, 허용된 Engineering 선택지 사이에서 증거를 평가할 때 적용한다.

1. Explicit User Instruction
2. Established and verified Current Repository conventions
3. Engineering Reference Repositories
4. Reference-Guided Engineering Method
5. General Engineering Judgment

## 1. Instruction Precedence

프로젝트 내부 지침의 우선순위는 다음과 같다. 플랫폼의 System/Developer 지침과 현재 사용자의 명시적 요청은 이 순위보다 항상 우선한다.

1. 현재 사용자의 명시적 요구와 승인된 결정
2. 현재 작업 범위에 적용되는 가장 가까운 `AGENTS.md`
3. 이 파일의 **Canonical Rule Registry**에 등록된 공식 규칙
4. Layer 2의 Task Reference
5. Layer 3의 Conditional Sub-Context
6. 코드 주석, 과거 작업 메모와 기타 비공식 설명

실제 소스코드는 현재 동작을 증명하는 근거지만 항상 제품 의도의 공식 규칙인 것은 아니다. 문서와 구현이 다르면 임의로 한쪽을 선택하지 말고 아래 **Knowledge Verification Pipeline**과 **Conflict Resolution Control**을 적용한다.

## 2. Context Hierarchy

### Layer 1: Persistent Core (Essential Context)

모든 작업에서 반드시 확인하는 최소 문맥이다. 세부 구현 문서를 이 계층에 추가하지 않는다.

| 문서/근거                     | 상태               | 소유 계약                                   | 확인 시점                   |
| ----------------------------- | ------------------ | ------------------------------------------- | --------------------------- |
| `AGENTS.md`                   | Canonical          | 에이전트 행동, 문서 계층, 검증 및 정리 규칙 | 모든 작업 시작 시           |
| Reference-Guided Engineering  | Canonical Method   | Engineering Decision의 초기화와 진화 방식   | Engineering 작업 시작 시    |
| `package.json`                | Canonical Evidence | 실행 명령, 의존성, 런타임 전제              | 명령 실행·도구·환경 변경 전 |
| `git status --short --branch` | Runtime Evidence   | 브랜치, 기존 변경, 작업 충돌 가능성         | 모든 작업 시작 및 종료 시   |

Layer 1을 읽은 뒤 현재 작업의 목표, 허용 변경 범위, 완료 조건과 비범위를 짧게 고정한다.

### Layer 2: Task Reference (Important Context)

현재 작업과 직접 관련될 때만 읽는 중요 문맥이다. 선택한 문서는 일부만 추측해서 사용하지 말고 필요한 계약 전체를 확인한다.

| 문서                             | 상태                | 담당 영역                                                   | 로드 조건                                                             |
| -------------------------------- | ------------------- | ----------------------------------------------------------- | --------------------------------------------------------------------- |
| `README.md`                      | Active Reference    | 프로젝트 소개, 실행 방법, 공개 배포 방식                    | 실행·온보딩·배포·공개 계약 변경 시                                    |
| `docs/reference-repositories.md` | Canonical Reference | 로컬 레퍼런스 저장소와 영역별 참고 경로                     | 공용 기반, 물리, 게임 루프, Canvas, 파티클, 렌더링, 개발 환경 작업 시 |
| `docs/rendering-pipeline.md`     | Canonical Reference | 공유 RenderFrame과 Polygon/Retro 렌더 파이프라인            | 렌더러, 카메라, 좌표계, 후처리, 관련 Debug UI 작업 시                 |
| `docs/ui-architecture.md`        | Canonical Reference | Alpine.js 화면 상태, UI bridge와 App lifecycle              | 메인 메뉴, HUD, 화면 전환, UI control 및 Alpine bootstrap 작업 시     |
| `docs/animation-system.md`       | Canonical Reference | Target Pose, IK solver, combat command와 motion clip        | Skeleton, 관절, 전투 모션, 입력 command와 procedural trail 작업 시    |
| `docs/input-system.md`           | Canonical Reference | Keyboard/Mobile adapter, pointer lifecycle과 input sequence | 키보드, 터치 UI, 멀티터치, command 입력 및 모바일 layout 작업 시      |
| `docs/world-map-system.md`       | Canonical Reference | 권역, 생활·필드·던전, 청크·깊이 레인과 상태 패치            | 맵, 월드 이동, 낮밤·날씨, 지역 상태와 던전 구조 작업 시               |

새로운 공식 설계, 개발 규칙 또는 운영 문서를 만들면 같은 변경에서 이 표에 등록한다. 인덱스에 없는 문서를 암묵적인 공식 규칙으로 취급하지 않는다.

### Layer 3: Conditional Sub-Context (On-Demand Context)

특정 영역을 실제로 수정하거나 Layer 2의 근거를 검증할 때만 읽는다. 작업과 무관한 디렉터리나 레퍼런스 저장소 전체를 선제적으로 로드하지 않는다.

| 작업 트리거        | On-Demand Context                                                                                                      |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| 물리·충돌          | 현재 물리 구현 또는 새 공용 물리 경계, `docs/reference-repositories.md`가 지정한 두 로컬 레퍼런스의 관련 코드와 caller |
| fixed-step·입력    | 현재 loop/input 구현, Baeseongjin의 `FixedStepRunner`, `InputSampler`, 실제 조립 caller                                |
| 모바일 입력        | `docs/input-system.md`, Keyboard/Mobile adapter, pointer lifecycle, Alpine control catalog와 GameApp caller            |
| 전투 모션·관절     | `docs/animation-system.md`, 현재 command controller·target pose clip·IK solver와 GameScene 조립 caller                 |
| Canvas·카메라·DPR  | 현재 Canvas 진입점과 스타일, 레퍼런스의 Canvas host 및 scene renderer                                                  |
| 파티클·절차적 효과 | 현재 effect/event 경계, Baeseongjin particle 문서·preset 구현, Ball Fight Simulator effect 구현                        |
| 정적 배포          | `index.html`, `.nojekyll`, `README.md`, GitHub Pages의 실제 source 상태                                                |
| lint·format·npm    | `package.json`, lockfile, ESLint/Prettier 설정과 실제 실행 결과                                                        |

Layer 3에서는 필요한 파일, import/export, caller와 검증 경로만 좁게 읽는다. 한 링크에서 시작해 관련성 없이 참조를 연쇄적으로 모두 읽지 않는다.

## 3. Progressive Disclosure

에이전트는 다음 순서로 문맥을 점진적으로 공개하고 소비한다.

1. **Discover:** Layer 1만 읽어 저장소 상태와 현재 작업 범위를 확인한다.
2. **Route:** 문서 인덱스에서 현재 작업에 해당하는 Layer 2 문서를 선택한다.
3. **Expand:** 선택한 문서가 지시하는 Layer 3 코드, 설정, caller와 검증 경로만 읽는다.
4. **Verify:** 문서 설명을 실제 파일 구조, 설정과 실행 결과로 교차 검증한다.
5. **Act:** 검증된 문맥 안에서 가장 작은 실행 가능한 변경을 수행한다.
6. **Prune:** 단계 종료 후 다음 작업에 필요 없는 문맥을 제거하고 핵심 근거만 유지한다.

금지 사항:

- 작업과 무관한 모든 문서를 한 번에 읽지 않는다.
- 문서 제목이나 검색 결과만 보고 계약을 추측하지 않는다.
- Layer 3의 과거 구현 세부를 Layer 1 규칙처럼 영구 유지하지 않는다.
- 이전 작업에서 읽은 문서를 현재 작업에도 유효하다고 자동 가정하지 않는다.
- 인덱스되지 않은 임시 메모를 Canonical Rule로 승격하지 않는다.

## 4. Canonical Rule Registry

현재 저장소의 공식 프로젝트 계약은 다음과 같다.

| Rule ID                   | Canonical Rule                                                                                                                                 | 검증 근거                                 |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| `ARCH-STATIC-ESM`         | Vanilla JavaScript ES Module을 사용한다.                                                                                                       | `package.json`, `index.html`              |
| `DEPLOY-NO-BUILD`         | 별도 프로덕션 빌드 없이 정적 `index.html`을 배포한다.                                                                                          | `README.md`, GitHub Pages source          |
| `DEPLOY-PAGES-MAIN`       | GitHub Pages는 `main /`을 사용한다.                                                                                                            | `README.md`, Pages API 상태               |
| `DEPS-NO-RUNTIME`         | 외부 게임·렌더 엔진은 사용자 승인 없이 추가하지 않는다.                                                                                        | `package.json`                            |
| `UI-ALPINE`               | DOM UI는 로컬 vendored Alpine.js와 선언형 binding으로 관리한다.                                                                                | `docs/ui-architecture.md`, `index.html`   |
| `METHOD-REFERENCE-GUIDED` | 명시적으로 선택된 유일한 Method인 Reference-Guided Engineering을 따른다.                                                                       | 이 파일의 Engineering Method 절           |
| `REF-LOCAL-FIRST`         | 기반 시스템은 `ball-fight-simulator`와 `baeseongjin`을 1차 로컬 레퍼런스로 조사한다.                                                           | `docs/reference-repositories.md`          |
| `ARCH-RENDER-READONLY`    | Renderer는 물리·게임 상태를 변경하지 않고 읽기 전용 결과만 소비한다.                                                                           | `docs/rendering-pipeline.md`, 실제 caller |
| `ARCH-EFFECT-SEPARATION`  | 파티클과 시각 효과는 게임 판정 객체와 분리한다.                                                                                                | 이 파일, 향후 effect 구현과 caller        |
| `VERIFY-USER-OWNED-TESTS` | 테스트 파일·script·fixture는 사용자가 명시적으로 요청한 경우에만 저장소에 영구 추가한다. 개발 중 임시 검증 코드는 허용하되 완료 전에 제거한다. | 사용자 결정, `package.json`, 최종 diff    |
| `ANIM-TARGET-IK`          | 전투 모션은 관절 회전 keyframe이 아니라 Effector Target Pose와 IK로 계산한다.                                                                  | `docs/animation-system.md`, 실제 solver   |
| `INPUT-ADAPTERS`          | 키보드와 모바일 입력은 adapter에서 공통 intent snapshot으로 통합한다.                                                                          | `docs/input-system.md`, 실제 adapters     |
| `MAP-LAYERED-CHUNKS`      | 월드는 청크와 지정 연결점으로 전환하는 깊이 레인으로 구성한다.                                                                                 | `docs/world-map-system.md`, 실제 runtime  |
| `MAP-GAMEPLAY-RENDER`     | 단순 gameplay surface와 생성·override된 render geometry를 분리한다.                                                                            | `docs/world-map-system.md`, 실제 runtime  |
| `MAP-STATE-PATCHES`       | 낮밤·날씨·스토리는 base map 복제가 아닌 결정적 조건 패치로 해석한다.                                                                           | `docs/world-map-system.md`, 실제 resolver |

공식 규칙이 추가·변경·폐기되면 이 Registry와 담당 문서를 같은 변경에서 갱신한다. 같은 의미의 규칙을 여러 문서에 서로 다른 표현으로 복제하지 않는다.

## 5. Knowledge Verification Pipeline

문서, 설계 설명 또는 기존 구현을 근거로 작업할 때 다음 파이프라인을 순서대로 적용한다.

### Stage 1 — Context Selection

- 현재 목표와 직접 관련된 Context Layer를 선택한다.
- 변경할 파일뿐 아니라 import, export, caller와 검증 명령을 식별한다.
- 이번 작업에서 확인하지 않을 영역을 명시한다.

### Stage 2 — Reference Integrity Verification

- 인덱스와 선택한 문서의 로컬 링크가 실제 파일을 가리키는지 확인한다.
- 대소문자, 확장자와 상대 경로가 실제 저장소 구조와 일치하는지 확인한다.
- 문서가 참조하는 명령과 설정 파일이 실제로 존재하는지 확인한다.

### Stage 3 — Source-of-Truth Verification

문서의 주요 주장을 최소한 아래 근거 중 관련되는 항목과 교차 검증한다.

- 실제 소스 코드와 import/export/caller
- `package.json`과 lockfile
- ESLint, Prettier 및 편집기 설정
- Git 브랜치·remote·배포 설정
- 실행 결과, validator, lint, format과 브라우저 동작

문서만 서로 인용해서 사실을 검증하지 않는다.

### Stage 4 — Knowledge Classification

검증한 지식은 다음 상태 중 하나로 분류한다.

| 상태         | 의미                                            | 행동                                   |
| ------------ | ----------------------------------------------- | -------------------------------------- |
| `VERIFIED`   | 현재 코드·설정·실행 증거와 일치                 | 구현 근거로 사용                       |
| `UNVERIFIED` | 확인 근거가 부족                                | 가정임을 밝히고 검증 전 확대 적용 금지 |
| `STALE`      | 과거에는 맞았으나 현재 구현·설정과 불일치       | **Legacy & Staleness Check** 적용      |
| `CONFLICT`   | 둘 이상의 공식 참조가 서로 다른 규칙을 요구     | **Conflict Resolution Control** 적용   |
| `ORPHANED`   | 인덱스 또는 문서 링크의 대상이 없거나 도달 불가 | **Orphaned Document Detection** 적용   |

### Stage 5 — Execution Verification

- 구현 변경은 관련된 가장 작은 검사부터 실행한다.
- 최소 기준은 syntax/lint, format, `git diff --check`와 실제 사용자 경로다.
- 수학·물리·시간 기반 동작은 DOM 없는 결정적 검증과 Canvas 실행 검증을 분리한다.
- 사용자가 테스트 자산의 영구 추가를 명시적으로 요청하지 않았다면 검증용 test 파일, script와 fixture를 저장소에 남기지 않는다. 필요한 임시 검증 코드는 작업 완료 전에 제거한다.
- Renderer 변경은 console error 부재만으로 완료하지 않고 실제 Canvas 출력, resize와 동일 상태 공유를 확인한다.
- 실행하지 않은 검사를 통과했다고 보고하지 않는다.

### Stage 6 — Evidence Report

작업 결과에는 다음을 간결하게 남긴다.

- 선택한 Canonical Rule과 Task Reference
- 검증한 실제 코드·설정
- 변경 파일과 변경 이유
- 실행한 검증과 결과
- `UNVERIFIED`, `STALE`, `CONFLICT`, `ORPHANED` 상태 및 남은 위험

## 6. Proactive Documentation Governance

문서 품질 관리는 별도 요청을 기다리지 않는 상시 책임이다. 단, 현재 작업을 불필요하게 확장하지 않고 발견 사실과 제안을 먼저 보고한다.

### Orphaned Document Detection

다음 중 하나를 발견하면 해당 지식을 `ORPHANED`로 분류한다.

- `AGENTS.md` 문서 인덱스가 존재하지 않는 파일을 가리킨다.
- Markdown 링크의 대상 파일이나 anchor가 없다.
- 문서가 제거·이름 변경된 소스, 설정 또는 명령을 공식 경로로 제시한다.
- 실제 문서 파일이 있지만 어떤 인덱스에서도 도달할 수 없다.

필수 행동:

1. 발견 즉시 사용자에게 문서와 깨진 대상 경로를 보고한다.
2. 올바른 대체 경로가 확인되면 링크 수정안을 제시한다.
3. 대체 근거가 없으면 인덱스 항목 제거 또는 문서 보관 전환을 제안한다.
4. 사용자 승인 없이 의미 있는 문서나 기록을 삭제하지 않는다.

### Legacy & Staleness Check

다음 불일치는 `STALE`로 분류한다.

- 문서의 디렉터리·클래스·함수·명령이 현재 코드에 없다.
- 문서의 npm script나 의존성이 `package.json` 또는 lockfile과 다르다.
- 문서의 lint/format 규칙이 실제 ESLint·Prettier 설정과 다르다.
- 문서의 배포·브랜치 설명이 실제 GitHub Pages 또는 Git 상태와 다르다.
- 설계 설명이 현재 import 방향, 상태 소유권 또는 caller 흐름과 다르다.

필수 행동:

1. 현재 실제 근거와 불일치하는 문장·경로를 함께 제시한다.
2. 현재 구현이 의도인지 결함인지 구분할 증거를 확인한다.
3. 문서 수정, 구현 복구 또는 Legacy 전환 중 적절한 수정안을 선제적으로 제안한다.
4. 문서의 날짜만으로 Legacy 판정을 내리지 않는다.

### Conflict Resolution Control

참조 문서, Canonical Rule, 실제 설정 또는 승인된 사용자 결정이 서로 다른 행동을 요구하면 `CONFLICT`로 분류한다.

필수 행동:

1. 충돌하는 두 규칙을 파일 경로와 함께 정확히 나열한다.
2. 각 규칙을 적용했을 때 달라지는 코드·사용자 동작·배포 결과를 설명한다.
3. 충돌에 의존하지 않는 조사와 작업은 계속할 수 있지만, 충돌에 좌우되는 구현은 중단한다.
4. 에이전트가 임의로 공식 규칙을 선택하지 않는다.
5. 사용자에게 어떤 규칙을 Canonical Rule로 확정할지 요청한다.
6. 확정 후 Canonical Rule Registry와 관련 문서를 같은 변경에서 정합한다.

## 7. Context Pruning

에이전트는 문맥을 많이 보존하는 대신 다음 작업에 필요한 검증된 정보만 유지한다.

### Retain

- 현재 목표, 완료 조건과 명시적 비범위
- 적용 중인 Canonical Rule
- 사용자가 승인한 결정
- 변경 파일과 아직 커밋되지 않은 사용자 작업
- 검증 명령, 결과와 실패 원인
- 해결되지 않은 `CONFLICT`, `STALE`, `ORPHANED` 상태
- 다음 단계가 의존하는 공개 API와 책임 경계

### Prune

- 현재 목표와 무관한 문서 전문
- 다른 저장소의 게임 전용 세부 규칙
- 해결된 탐색 로그와 중복 설명
- 이미 대체된 가설과 임시 계획
- 재생성 가능한 긴 명령 출력
- 현재 diff와 관계없는 과거 구현 세부
- 근거 없이 생성된 추측

### Never Prune

- 현재 사용자의 요구와 금지 사항
- Canonical Rule과 공식 충돌 상태
- 미커밋 변경의 소유권과 보존 조건
- 실패한 검사와 검증하지 못한 경계
- 보안·데이터 손실·공개 배포 위험

### Pruning Triggers

다음 시점에 working context를 정리한다.

- 분석에서 구현으로 넘어가기 전
- 하나의 수직 작업 단위를 완료한 뒤
- 작업 목표나 수정 영역이 바뀐 뒤
- 브랜치, HEAD, `package.json`, lockfile 또는 `AGENTS.md`가 바뀐 뒤
- 동일 정보를 중복해서 로드하기 시작했을 때
- 대화 압축 또는 핸드오프 전

### Compact Context Format

장기 작업이나 핸드오프에서는 다음 형식만 보존한다.

```text
Current Objective:
Completion Criteria:
Canonical Rules:
Selected Context:
Verified Evidence:
Decisions:
Changed Files:
Validation:
Open Conflicts / Risks:
Next Step:
```

브랜치, HEAD 또는 핵심 설정이 바뀌면 이전 요약의 코드·설정 주장을 캐시처럼 신뢰하지 않고 다시 검증한다.

## 8. Reference-Guided Engineering Policy

공용 기반, 물리, Canvas 렌더링, 파티클, 게임 루프 또는 개발 환경 구현 전에는 `docs/reference-repositories.md`를 Layer 2로 로드한다.

- 1차 로컬 레퍼런스는 `C:/projects/ball-fight-simulator`와 `C:/projects/baeseongjin`이다.
- 먼저 현재 저장소에서 같은 책임의 established and verified convention이 있는지 확인한다. 현재 Domain에 더 적합하고 반복 사용되며 실제 검증된 local convention은 그 영역에서 초기 Reference보다 우선한다.
- 새 기반을 추측으로 설계하기 전에 두 저장소의 실제 코드, caller, 개발 규칙과 검증 방식을 확인한다.
- Reference의 구조적 외형보다 책임의 크기, abstraction 도입 이유, dependency와 state 흐름, resource lifecycle, error handling, testing style 및 trade-off를 분석한다.
- 레퍼런스 코드를 무조건 복사하지 않는다. `직접 재사용`, `Polygon RPG에 맞게 수정`, `원칙만 차용`, `적용하지 않음` 중 하나로 판단한다.
- 레퍼런스의 게임 전용 결합, 단위 의미, 성능 특성과 의존 방향을 확인한다.
- Reference에 interface, layer, manager, singleton 또는 공통화가 있다는 이유만으로 도입하지 않는다. 현재 변경에서 책임 경계, 대체 가능성, dependency control 또는 testability의 구체적 이점이 확인될 때만 abstraction을 추가한다.
- Reference와 Current Repository에서 합리적으로 추론 가능한 class granularity, module boundary, state management와 verification style을 반복적으로 사용자에게 질문하지 않는다. Product Requirement, 새로운 Domain Decision 또는 코드에서 추론할 수 없는 의도만 사용자 판단 대상으로 남긴다.
- 레퍼런스와 이 저장소의 Canonical Rule이 충돌하면 **Conflict Resolution Control**을 적용한다.
- 작업 결과에 어떤 레퍼런스를 어떻게 반영했는지 기록한다.

### Reference-Guided Workflow

Engineering 변경은 필요한 범위에서 다음 순서를 따른다.

1. 현재 변경의 Engineering 질문과 책임 경계를 한 문장으로 고정한다.
2. Current Repository의 관련 구현, caller, test와 문서에서 established convention을 확인한다.
3. `docs/reference-repositories.md`가 지정한 두 Reference의 대응 구현, caller, test와 문서만 선택적으로 읽는다.
4. 각 선택이 해결하는 문제, 제약, dependency/state ownership과 trade-off를 추론한다.
5. `직접 재사용`, `Polygon RPG에 맞게 수정`, `원칙만 차용`, `적용하지 않음`으로 채택 결정을 분류한다.
6. 현재 Domain에 필요한 최소 구조를 구현하고 변경 위험에 비례해 검증한다.
7. 결과 보고에 사용한 Reference evidence, 채택·비채택 이유와 Current Repository에서의 검증 결과를 남긴다.

Reference와 다른 현재 구조를 단지 차이가 있다는 이유로 되돌리지 않는다. 일회성 편의나 검증되지 않은 차이도 established convention으로 승격하지 않는다. 이 저장소의 convention을 다른 프로젝트의 새로운 Engineering Reference로 promotion하는 결정은 사용자만 할 수 있으며, AI Agent는 Golden Reference를 자동 선택하거나 승격하지 않는다.

## 9. Implementation Guardrails

- 기존 동작과 사용자의 변경을 보존한다.
- 작은 실행 가능 수직 단위로 구현하고 각 단계에서 브라우저 실행 상태를 유지한다.
- 게임 규칙은 공용 `game-kit` 기반이 알지 못하게 한다.
- 물리 상태의 최종 쓰기 권한은 물리 시스템에 둔다.
- Renderer는 읽기 전용 상태만 소비하고 animation, physics 또는 effect lifetime을 진행하지 않는다.
- 파티클과 시각 효과는 gameplay 판정, collider와 분리한다.
- 외부 런타임 라이브러리는 사용자 승인 없이 추가하지 않는다.
- Browser Implicit Global을 사용하지 않고 DOM 요소를 명시적으로 조회한다.
- 시간 기반 상태는 frame count가 아닌 명시적인 delta/fixed time으로 갱신한다.
- 사용자가 요청하지 않은 테스트 자산을 영구 관리 포인트로 추가하지 않는다. 개발 중 만든 임시 검증 코드는 완료 전에 제거한다.
- placeholder, 생략된 구현과 설명 없는 TODO를 완료 결과로 남기지 않는다.

## 10. Work Start and Completion Checklist

### Start

- [ ] `git status --short --branch` 확인
- [ ] 목표, 완료 조건, 비범위 확정
- [ ] Layer 2 Task Reference 선택
- [ ] 필요한 Layer 3만 로드
- [ ] 인덱스 링크와 문서 주장 검증
- [ ] 충돌·레거시·고아 상태 확인

### Complete

- [ ] 관련 syntax/lint/format 검사
- [ ] `git diff --check`
- [ ] 실제 사용자 경로 또는 Canvas 검증
- [ ] 명시 요청 없이 만든 임시 test·script·fixture 제거
- [ ] 문서 인덱스와 Canonical Rule 정합 확인
- [ ] Orphaned/Stale/Conflict 상태 보고
- [ ] 변경 파일, 이유, 검증 결과와 다음 단계 보고
