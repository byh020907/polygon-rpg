# Polygon RPG Development Roadmap

- 상태: **M1 완료 / M2 recovery 진행 중**
- 기준 인터뷰: 2026-08-29
- 소유자: Product Director(방향) / standalone coordinator tick(진행 상태)

이 roadmap은 기능 목록이나 일정표가 아니라 AI 개발 팀이 다음 Playable Reference Loop를 선택하는 기준이다. 각 milestone은 팀장이 처음부터 끝까지 플레이하고 방향 피드백을 줄 수 있을 때만 완료된다.

## 제품 비전

> 마법 없이 검과 방패만으로 다양한 마법 생물을 공략하고, 탐험을 통해 전투 방식이 확장되는 액션 RPG.

핵심 재미는 콘텐츠 양보다 다음 네 축에서 나온다.

1. **조작감:** 입력 의도와 캐릭터 반응이 즉각적이고 예측 가능하다.
2. **타격감:** 적중·guard·회피·punish와 공중 연계의 성공을 즉시 인지한다.
3. **Effect:** 검 궤적, impact, hitstop, 피격 반응과 camera feedback이 판정을 선명하게 전달한다.
4. **Graphics:** Polygon 기반 제작 효율을 유지하면서 강한 대비·단순한 silhouette·과장된 동작을 Retro Pixel 최종 출력으로 전달한다.

## 장르와 전투 원칙

이 게임은 액션 RPG지만 전투 문법은 격투게임에 가깝다.

- cooldown skill을 순서대로 난사하는 구조가 아니다.
- 기본기, 거리, 방향, frame, guard, 회피, 띄우기, 공중 상태와 cancel을 직접 조작한다.
- 기본 입력과 짧은 combo는 관대하게 받아 진입 장벽을 낮춘다.
- 숙련자는 frame, 위치, 배후, cancel과 최적 combo route로 더 큰 보상을 얻는다.
- 적의 기본 공격은 guard하고, 강공격은 구르기의 이동·무적 구간으로 통과해 배후를 잡는다.
- punish 기회에는 띄우기에서 공중 combo로 이어가고 착지까지 하나의 전투 흐름으로 만든다.

모든 combat action은 최소한 다음 시간 계약을 가진다.

- startup / active / recovery
- hitstun / blockstun
- input buffer와 cancel window
- roll invulnerability와 통과 가능 구간
- airborne / launcher / landing
- 공중 combo 제한을 위한 juggle budget 또는 동등한 결정적 규칙

정확한 frame과 balance 수치는 Reference에서 복제하지 않고 120Hz fixed-step 위에서 실제 플레이로 조정한다.

## 성장 원칙

- 플레이어가 직접 분배하는 기본 stat은 두지 않는다.
- 장비가 공격력, 방어력, 공격속도, 사거리, 경직, 띄우기 힘과 guard 성질을 제공한다.
- 장비 종류가 달라도 공통 command grammar는 유지하며 frame과 공격 성질이 달라진다.
- 기술은 level 또는 재화로 최초 해금한다.
- skill level은 피해 배율, 타격 횟수, 공중 사용 횟수, cancel route와 판정 성질을 확장한다.
- 성장은 버튼 수를 계속 늘리기보다 기존 기본기와 command의 선택·연계 가능성을 넓힌다.

## 월드 원칙

기본 진행 loop는 다음과 같다.

```text
학원촌에서 준비
→ Field 탐험과 조우
→ Dungeon 공략
→ Boss 전투
→ 장비·재화·command 해금
→ 마을 귀환과 다음 지역 준비
```

같은 지역 안의 깊이감은 gameplay Z축이나 여러 Depth Lane으로 구현하지 않는다.

```text
World
└─ Region
   └─ Room / Chunk
      ├─ Gameplay Surface
      ├─ Entity / Trigger
      ├─ Render Item
      └─ Portal → 다른 Room의 Spawn
```

- 문, 계단, 골목과 출구는 모두 Portal 계약을 사용한다.
- Portal 완료 fixed-step에서 목적 Room, spawn과 collision을 원자적으로 바꾼다.
- Camera가 목적 공간으로 짧고 빠르게 이동해 같은 지역 안쪽으로 이어지는 느낌을 만든다.
- 캐릭터 크기와 render order를 바꿔 앞·중간·뒤 lane을 표현하지 않는다.
- 현재 `Depth Lane + visual scale transition` 구현은 migration source일 뿐 확장 대상이 아니다.

Portal 사용 입력은 M2의 가역적인 첫 candidate 기본값으로 구현하고 실제 왕복 artifact에서 조정한다.

## Reference Brief

### 제품 경험 Reference

#### 레전드 오브 곡괭이

차용:

- 2D 횡스크롤 action RPG의 전체 진행 감각
- 기본 동작·cancel·공중 행동을 숙련하는 전투
- 마을 준비, 장비, 탐험과 boss의 연결
- 장비 중심 stat 성장과 기술 훈련
- 강한 대비, 단순한 silhouette와 과장된 전투 표현
- 독립된 공간과 입구·출구를 연결하는 world 감각

비차용:

- 원작 캐릭터, 몬스터, 명칭, story, map, item, motion, sprite, sound와 UI
- 원작의 수치, command열과 balance
- 원작 표현을 pixel asset으로 그대로 복제하는 방식

근거: [Team Pickaxe 공식 패치 노트와 팁](https://tpickaxe.tistory.com/32)

#### 케로로파이터

차용:

- 방향 입력과 공격 버튼을 조합하는 command grammar
- 쉬운 기본 combo와 숙련자용 위치·배후·cancel·공중 연계의 공존
- guard 방향, 회피 이동과 punish의 심리전
- 공격 적중을 분명하게 알려야 격투 재미가 유지된다는 실패 방지 기준

비차용:

- 캐릭터, 기술명, 원작 command열, 5타 down/reset과 무한 combo 규칙
- 공개 근거가 없는 정확한 frame 수치

근거: [개발 팀장 인터뷰](https://www.inven.co.kr/webzine/news/?news=16119), [베타 타격감 평가](https://www.gamemeca.com/view.php?gid=119281)

### Engineering Reference

- `C:/projects/ball-fight-simulator`: collision·command lifecycle, Canvas effect와 gameplay/presentation 분리
- `C:/projects/baeseongjin`: fixed-step, frozen input, RenderFrame, particle/event 경계, 병렬 worktree 운영
- 현재 Polygon RPG: 120Hz runner, input adapter, Target Pose/IK, shared Polygon/Retro RenderFrame과 map patch

각 수직 단위는 필요한 실제 source, caller와 검증 경로만 다시 확인하고 `직접 재사용`, `수정`, `원칙만 차용`, `비차용`을 업무보고에 남긴다.

## 현재 기반 판정

### 보존할 기반

- 120Hz `FixedStepRunner`, catch-up 제한과 render interpolation
- Keyboard/Mobile adapter의 held state와 command sequence
- `CombatCommandController`의 edge, buffer, normalized motion progress
- Target Pose와 Two-Bone IK의 gameplay → presentation 단방향
- 동일 RenderFrame을 소비하는 Polygon/Retro renderer와 Canvas host
- immutable map definition, stable ID patch와 day/night resolver
- `MapRuntime`의 원자적 active location·spawn 전환 골격

### 교체하거나 확장할 기반

- M1 combat은 60Hz `CombatFrame`을 120Hz simulation에서 결정적으로 샘플하고, 첫 training enemy의 Light guard, Heavy roll-through, 배후 punish, launcher, 공중 combo, juggle과 landing을 직접 판정 feedback·bounded 결과 `CombatEvent`·공유 RenderFrame으로 전달한다. Contact와 trail은 별도 `combatContact` DTO와 weapon geometry를 사용한다. 이후 조우는 이 계약을 확장한다.
- M4의 장비·기술 성장은 현재 A/S Basic·Strong과 방향+공격 command grammar를 유지하면서 frame, 공격 성질과 cancel route를 확장해야 한다.
- static `Camera2D`에는 Room portal travel/follow가 필요하다.
- `Depth Lane + character scale/order transition`은 Room/Portal로 교체한다.
- `GameScene`에 집중된 combat, world, character geometry와 RenderFrame 조립은 병렬 작업 전에 필요한 공개 DTO 경계만 분리한다.
- Render Lab의 debug Animation Speed를 장비 공격속도나 gameplay balance에 재사용하지 않는다.

## Milestone 순서

| 순서 | Playable milestone          | 팀장이 플레이할 결과                                              | 상태 |
| ---- | --------------------------- | ----------------------------------------------------------------- | ---- |
| M0   | AI 개발 loop와 roadmap      | Work item별 독립 task/worktree와 Git queue·commit 통합을 추적     | 완료 |
| M1   | 훈련방 첫 전투 조우         | guard → roll 배후 회피 → launcher → 공중 combo → 착지             | 완료 |
| M2   | 학원촌 ↔ 훈련장 Room Portal | 장비를 선택하고 camera travel로 두 Room을 왕복해 훈련 전투를 반복 | 대기 |
| M3   | 첫 Field·Dungeon·Boss loop  | 마을 준비부터 boss 보상과 shortcut 귀환까지 한 번에 플레이        | 대기 |
| M4   | 장비·command 성장 loop      | 장비 교체와 기술 해금·level이 같은 command 전투의 선택지를 확장   | 대기 |
| M5   | Region 확장과 품질 반복     | 새 마법 생물·지역마다 완전한 조우와 dungeon slice가 추가          | 대기 |

## M0 — AI 개발 loop와 roadmap

### 결과물

- Git queue 접수·상태 조회만 하는 팀장 메인 task, 매번 새 context의 standalone coordinator tick과 사용자 소유 work-item task를 분리한 개발 흐름
- 최소 Git work item, sidebar에서 직접 여는 전용 구현·feedback task와 실체 기반 업무보고 계약
- Git work item마다 기본 Codex-managed worktree와 final scoped commit으로 다른 업무를 격리하는 계약
- `bugfix`·`maintenance`·`dedicated` scheduling lane과 Codex-native agent routing
- 등록·관리·실행·취소 맥락을 자동 routing하는 repo-local `dev-team-loop` skill
- 이전 main/coordinator context 없이 Git·exact task title·managed worktree·commit graph로 복구하는 무상태 coordinator 경계
- Lead Game Developer & QA Director 페르소나, 공통 품질 rubric과 feedback 규칙 승격 계약
- 승인된 현재 milestone에서 다음 미충족 gate를 자동 파생·소비하는 bounded continuous roadmap loop
- 프로젝트 대상 standalone recurring automation과 bare `$dev-team-loop` 수동 tick이 동일한 one-tick reconcile 계약을 사용하는 entrypoint
- repo-local lease, main HEAD compare-and-stop와 exact task title 재확인으로 중첩 tick·중복 writer/task를 막는 계약
- Subagent를 work-item task 내부의 bounded exploration·disjoint implementation·독립 검증으로 제한하고 parent task가 결과를 수집하는 계약

### 완료 gate

- 새 요청 하나가 재확인 없이 work item 하나로 등록되고 즉시 구현 입력이 되는 규칙이 명확하다.
- 제품 인터뷰·구현·품질 tuning·direct feedback은 전용 task에 남고 메인 context에는 ID/title/task link/status/stop condition/integration result만 남는다.
- 취소·pause·recovery·통합이 Codex task/worktree와 Git commit evidence로 정의된다.
- `AGENTS.md`는 32 KiB instruction budget 안에서 process와 skill을 찾을 수 있다.
- Skill validation과 현실적인 mode routing 검증을 통과한다.
- 새 구현 work item이 반복 프롬프트 없이 내부 품질 기준, baseline, current best와 다음 병목을 유지하고 Git에는 실제 결과만 기록한다.
- 다음 미충족 gate를 소유한 open item이 없으면 vertical work item을 파생해 반드시 새 Codex-managed worktree task로 시작하고, direct feedback·blocker·제품 결정 gate까지 계속한다.
- bare skill 호출이 work item으로 등록되지 않고 one-tick reconcile을 수동 실행한 뒤 종료한다.
- 팀장 메인 대화 종료와 coordinator context 소실 뒤에도 다음 standalone tick이 Git evidence로 ready item을 통합하거나 다음 gate를 새 사용자 소유 task로 시작한다.
- active item이 있으면 tick은 기다리거나 중복 task를 만들지 않고 종료하며, task 완료·tick 종료·unchanged timeout은 전체 loop 종료 조건이 아니다.

## M1 — 훈련방 첫 전투 조우

### 플레이 시나리오

1. 기본 검·방패를 든 플레이어가 훈련 몬스터와 대치한다.
2. 적 기본 공격을 guard해 damage를 막고 block reaction을 확인한다.
3. 적 강공격 telegraph를 보고 구르기로 몸을 통과해 배후를 잡는다.
4. punish window에 launcher를 적중시킨다.
5. 지상 공격을 공중 combo로 연결하고 착지한다.

### 포함

- 60Hz integer combat frame data를 120Hz simulation이 결정적으로 샘플하는 timeline 또는 동등하게 읽기 쉬운 시간 계약
- input history/buffer와 방향+공격 command resolution
- hitbox/hurtbox, guard·damage·hit/block stun과 facing
- roll movement, invulnerability와 배후 판정
- launcher, airborne, juggle 제한과 landing
- hitstop, hit flash/reaction, sword trail, impact effect와 최소 camera feedback
- Polygon/Retro 동일 판정·animation 결과
- 훈련 enemy 한 종과 기본 장비 한 세트

### 완료 gate

- debug 조작 없이 전체 시나리오를 반복 플레이할 수 있다.
- 입력 실패와 판정 실패를 화면에서 구분할 수 있다.
- 공격 적중·guard·회피·punish를 한 frame 안에 인지할 수 있는 결합 피드백이 있다.
- 쉬운 기본 연계와 숙련자가 사용할 cancel/배후 route가 함께 존재한다.
- 팀장이 Codex 앱에서 열린 로컬 또는 모바일 플레이 경로로 방향이 맞다고 판단한다.

### 첫 병렬 작업 경계

M1의 Vertical Slice Director가 먼저 `CombatFrame`, `CombatEvent`, RenderFrame extension과 ownership을 고정한다. 이후 다음 lane을 dependency 순서에 맞게 Codex supporting agent로 실행한다.

- Gameplay: player command와 frame state
- Encounter: enemy pattern과 hit resolution
- Presentation: `combatContact`·weapon geometry, 직접 판정 feedback과 bounded 결과 `CombatEvent`를 각 책임에 맞게 소비하는 reaction·VFX·camera
- Verification: frozen candidate의 수치·Canvas 경로

여러 writer가 중앙 `GameScene`이나 같은 public contract를 동시에 수정하지 않는다. 하위 lane은 독립 feedback 단위가 아니며, Vertical Slice Director가 M1의 실제 플레이 경로로 통합·재채점하고 독립 검증을 통과한 뒤에만 팀장 피드백을 요청한다.

## M2 — 학원촌 ↔ 훈련장 Room Portal

### 플레이 시나리오

1. 학원촌에서 기본 장비를 선택한다.
2. 훈련장 입구 Portal을 사용한다.
3. 목적 Room spawn과 collision으로 전환되고 Camera가 빠르게 이동한다.
4. M1 전투를 반복한 뒤 학원촌으로 돌아온다.

### 포함

- `Region → Room/Chunk → Portal` target contract
- 기존 MapDefinition/patch의 재사용 범위와 lane migration
- active Room의 surface/entity/render snapshot
- Portal destination, spawn, transition lifecycle와 input 결정
- camera follow/travel presentation
- character visual scale lane 보간 제거
- 최소 두 장비 profile의 공격속도 차이 체감

### 첫 candidate 기본값

- Portal 범위 안에서 `↑` 입력 edge를 사용한다. 범위 밖에서는 기존 Jump intent를 유지하고 전환 중에는 추가 입력을 소비만 하므로 현재 adapter 계약에 가장 작고 되돌리기 쉬운 변경이다.
- 첫 두 장비는 `균형형`과 `중량형`으로 구현한다. 중량형은 공격 startup/recovery가 느린 대신 사거리·경직이 높도록 data profile로 분리해 팀장이 실제 전투에서 비교한 뒤 수치나 축을 피드백할 수 있게 한다.
- 이 기본값은 구현 전 승인 gate가 아니다. 실제 장비 선택 → Portal 왕복 → 전투 candidate와 코드 트리를 먼저 제시한다.

### 완료 gate

- 한 지역이 여러 독립 Room으로 구성되지만 camera 이동으로 공간 연결감이 난다.
- Portal 전환 전후에 잘못된 Room collision이나 entity가 판정에 참여하지 않는다.
- guard/crouch 입력을 lane transition이 선점하지 않는다.
- 장비 공격속도는 combat timeline에서 달라지고 debug Animation Speed와 분리된다.
- 장비 선택 → 이동 → 전투 → 귀환이 첫 대형 milestone으로 플레이된다.

## M3 — 첫 Field·Dungeon·Boss loop

### 플레이 시나리오

```text
학원촌 준비
→ Field Rooms 탐험과 일반 조우·우회
→ 폐쇄 실습림 Dungeon
→ checkpoint
→ Boss의 guardable basic / roll-required heavy / punish window 공략
→ 보상
→ shortcut Portal로 귀환
```

### 완료 gate

- 일반 적과 boss가 M1의 같은 combat contract를 사용한다.
- 탐험이 전투 선택과 장비 준비에 영향을 준다.
- boss는 체력만 큰 적이 아니라 읽을 수 있는 frame·위치 문제를 제공한다.
- 시작부터 보상·귀환까지 끊기지 않는 첫 RPG loop가 완성된다.

## M4 — 장비·command 성장 loop

### 포함

- 장비가 소유하는 공격·방어·공격속도·사거리·경직·띄우기·guard profile
- level/재화 기반 command 최초 해금
- skill level에 따른 피해 배율, 타수, 공중 사용 횟수와 cancel route 확장
- 장비 구매·획득·교체와 최소 save contract
- 플레이어 직접 stat 분배 없음

### 완료 gate

- 장비와 skill level이 새 버튼 난사보다 기존 격투 전투의 route를 바꾼다.
- 빠른 장비와 느린 장비의 frame·거리·stun trade-off가 실제 조작에서 느껴진다.
- 숫자가 올라가지 않아도 새 command와 cancel 선택으로 성장감을 얻는다.

## M5 — Region 확장과 품질 반복

- 학원촌을 중심으로 Field, Dungeon, 생활 거점을 한 수직 단위씩 추가한다.
- 새 마법 생물은 기존 적의 색·체력 변경이 아니라 하나의 새 frame·위치 문제를 제공한다.
- 각 Region은 대표 환경 변화, boss와 영구 shortcut을 가진다.
- 조작감·타격감·effect·graphics gate가 약해지면 콘텐츠 추가를 멈추고 해당 slice를 다시 연다.

## 확정 비범위

- 자유로운 Z축·벨트스크롤 이동과 Depth Lane 확장
- skill cooldown 순환 중심 combat
- 플레이어 직접 stat point 분배
- 원작 asset·캐릭터·맵·수치 복제
- 핵심 전투 gate 이전의 대량 Region·enemy·quest 제작
- 사용자 요청 없는 영구 자동 test suite

## 이후 milestone의 candidate-first 기본값

남은 제품 선택도 구현 전 승인 gate로 두지 않는다.

- M2 Portal 입력과 장비 체감 축은 위의 첫 candidate 기본값으로 구현한 뒤 실제 왕복·전투 artifact에서 feedback을 받는다.
- M4 첫 candidate는 단일 훈련 재화, 3단계 skill level, 장비·해금·skill level만 저장하는 local save를 data/schema 경계로 구현한다. 이름·상한·save 범위는 구현된 성장 loop와 code tree를 본 feedback으로 조정한다.

이 기본값은 안전하고 국소적인 data/config 변경으로 되돌릴 수 있어 사전 질문하지 않는다. 새로운 선택이 실제 구현을 막고 현재 코드·roadmap·Reference에서 추론할 수 없으며 가역 candidate도 만들 수 없을 때만 Yes/No 또는 2~3개 선택지 중 하나를 묻는 짧은 질문 하나를 사용한다. Module boundary, state ownership, frame data 형식, effect buffer와 camera 책임은 AI 개발 팀이 자율 결정하고 구현 후 업무보고에 이유를 남긴다.
