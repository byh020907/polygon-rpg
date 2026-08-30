---
id: WI-20260830-014120
status: integrating
priority: high
lane: dedicated
created_at: 2026-08-30T01:41:20+09:00
depends_on:
  - WI-20260830-003138
reopens: null
review: team-lead
source: team-lead
source_ref: null
---

# Godot Scene·Node·Signal 기반 시스템 구조 개선

## 팀장 원문 또는 파생 근거

> 피드백할건 많은데 일단 넘기고 우선순위 높은 내용 알려줄게
> godot 엔진 구조 레퍼런스 참고해서 우리 시스템부터 유지보수 및 관리 하기 좋게 할거야
>
> 핵심개념은
> 씬, 노드, 그리고 시그널 패턴 이야 이 3가지는 꼭 충실히 반영해줘

## 결과

변경된 코드 트리:

```text
src/core/
├─ Scene.js
├─ SceneNode.js
└─ Signal.js
src/app/GameApp.js
src/game/
├─ GameScene.js
└─ GameStatusNode.js
docs/
├─ development/reports/WI-20260830-014120-godot-scene-node-signal-architecture.md
├─ runtime-architecture.md
├─ rendering-pipeline.md
└─ ui-architecture.md
AGENTS.md
```

`GameApp → GameScene → GameStatus`가 실제 Scene/Node tree로 동작한다. GameApp enter/exit가 input, browser listener, ResizeObserver, RAF와 Signal connection을 정리하고, 120Hz fixed traversal이 기존 combat/world writer를 실행한다. Player/world status와 단일 immutable RenderFrame은 lifecycle-owned Signal로 GameApp의 UI bridge와 Polygon/Retro renderer에 전달된다.

새 게임 → Portal → training enemy spawn → shared RenderFrame 경로, Node/Signal lifecycle·reentrancy·cleanup과 GameApp 재진입, Canvas/Render Lab/resize/console을 확인했다. `npm run check`, `git diff --check`와 독립 verifier가 PASS했고 수리 finding은 없었다. Browser held-key 제약으로 guard → roll → punish → air combo 전체를 재자동 입력하지는 않았지만 gameplay frame/input/판정 코드는 변경하지 않았다.

HEAD `7a3b732` 재정합에서 바뀐 파일은 개발 workflow 문서뿐이고 `src`·`package.json` 변화는 없었다. 현재 HEAD에서 deterministic Portal/RenderFrame과 repository checks를 다시 PASS했다. Browser surface는 재연결할 수 없어 새 screenshot은 만들지 못했으며, unchanged runtime candidate에 대한 기존 Browser·독립 verifier PASS를 Canvas 검증 경계로 유지한다.

품질: 기능 2, 구조 명료성 2, lifecycle 안전성 3, Signal 결합도 2, Godot Reference 정합 2, 회귀 안전성 2. 다음 병목은 enemy state·AI·physics·contact writer를 실제 `TrainingEncounterNode`로 옮기고 player 결과를 root-owned Signal로 분리하는 일이다.

업무보고: `docs/development/reports/WI-20260830-014120-godot-scene-node-signal-architecture.md`

## 피드백

- 2026-08-30: 팀장 `규칙 다시읽고 진행해` — implementation-first 규칙을 현재 HEAD에서 다시 확인했고, concrete candidate 승인과 통합 계속 지시로 반영했다.

## 취소 기록

해당 없음.

## 연결

- Root agent: `/root/wi_20260830_014120`
- Integration commit: coordinator pending
- 업무보고: `docs/development/reports/WI-20260830-014120-godot-scene-node-signal-architecture.md`
