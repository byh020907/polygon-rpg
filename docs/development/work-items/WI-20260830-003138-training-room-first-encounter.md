---
id: WI-20260830-003138
status: queued
priority: high
lane: dedicated
created_at: 2026-08-30T00:31:38+09:00
depends_on: []
reopens: null
review: team-lead
source: roadmap
source_ref: M1
---

# 훈련방 첫 전투 조우

## 팀장 원문 또는 파생 근거

승인된 roadmap의 다음 미충족 milestone인 `M1 — 훈련방 첫 전투 조우`에서 파생했다.

플레이어가 기본 검·방패로 훈련 몬스터의 기본 공격을 guard하고, 강공격을 구르기로 통과해 배후를 잡은 뒤 launcher → 공중 combo → 착지까지 반복 플레이할 수 있는 첫 전투 수직 단위를 완성한다.

## 접수 해석

현재 motion demo를 120Hz fixed-step 위의 결정적 전투 조우로 확장한다. 입력·판정·적 패턴·animation·VFX·camera를 하나의 플레이 가능한 경로로 통합하며 Polygon/Retro renderer가 동일한 gameplay 결과를 표현하게 한다.

## 인터뷰와 결정

- M1 시작 인터뷰에서 기본 공격, 강공격, guard, roll의 실제 키 조합과 command 우선순위를 팀장에게 결과·영향과 함께 확인한다.
- module boundary, combat frame data, state ownership, event/effect buffer와 camera 책임은 현재 코드와 Engineering Reference 증거로 Director가 결정한다.
- 원작 캐릭터·몬스터·명칭·motion·수치·asset·command열은 차용하지 않는다.

## 실행 계약

- 먼저 `CombatFrame`, `CombatEvent`, RenderFrame extension과 writer ownership을 고정한다.
- 60Hz integer combat frame data를 120Hz simulation이 결정적으로 샘플하는 timeline 또는 동등하게 읽기 쉬운 시간 계약을 만든다.
- 방향+공격 command resolution, input history/buffer, hitbox/hurtbox, facing, guard, damage, hit/block stun을 구현한다.
- roll movement/invulnerability/통과/배후 판정과 enemy의 guardable basic, roll-required heavy, punish window를 연결한다.
- launcher, airborne, juggle 제한, 공중 combo와 landing을 연결한다.
- 확정 CombatEvent에서 hitstop, flash/reaction, sword trail, impact와 최소 camera feedback을 생성한다.
- Polygon/Retro renderer가 동일한 판정·animation state를 읽기 전용으로 소비하게 한다.
- debug 조작 없이 시나리오 전체를 반복 플레이하고 입력 실패와 판정 실패를 화면에서 구분할 수 있게 한다.
- 사용자 요청 없는 영구 test·fixture·test script는 추가하지 않는다.

## 품질 계약

- 적용 축: 기능 완결성, 조작감, 타격감, Effect, Graphics, Reference 정합, 회귀 안전성.
- 최소 threshold: `docs/development/quality-loop.md`의 모든 적용 축 2 이상이며, 0 또는 1이 남은 candidate는 제출하지 않는다.
- 증거: DOM 없는 결정적 combat 진단, 실제 Canvas의 Polygon/Retro 플레이 경로, resize와 console 상태, 마지막 writer 뒤 독립 검증.
- feedback gate: 팀장이 로컬 또는 모바일 플레이 경로에서 guard → roll 배후 회피 → launcher → 공중 combo → 착지 방향을 확인한다.

## 평가 기록

- Baseline: 현재 combat은 player motion demo이며 enemy, hitbox/hurtbox, damage, stun, hitstop, roll과 juggle 판정이 없다.
- Current best: root Director가 baseline과 첫 통합 artifact를 같은 rubric으로 채점한 뒤 기록한다.
- 다음 병목: 시작 인터뷰의 M1 key/command 결정과 public combat DTO·ownership 고정.

## Reference Brief

- 제품 Reference: roadmap에 기록된 관대한 기본 combo, guard/roll/punish와 숙련자용 배후·cancel·공중 route의 원칙만 사용한다.
- Engineering Reference: 현재 Polygon RPG의 fixed-step/input/Target Pose/RenderFrame 경계와 `ball-fight-simulator`, `baeseongjin`의 관련 source·caller·검증 경로만 조사한다.
- 차용/수정/비차용: root Director가 실제 evidence와 함께 업무보고에 분류한다.
- 결과물: 훈련방에서 전체 M1 전투 흐름을 반복 플레이하는 통합 artifact.

## 결과

진행 전.

## 취소 기록

해당 없음.

## 연결

- Roadmap: `M1 — 훈련방 첫 전투 조우`
- 업무보고: 완료 또는 feedback candidate 준비 시 생성
