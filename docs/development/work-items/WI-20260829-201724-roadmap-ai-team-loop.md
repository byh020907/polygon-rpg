---
id: WI-20260829-201724
status: done
priority: high
lane: maintenance
created_at: 2026-08-29T20:17:24+09:00
depends_on: []
reopens: null
review: team-lead
---

# Reference 기반 roadmap과 AI 개발 팀 loop 확립

## 팀장 원문

> 메인을 최신화하고 개발 로드맵을 작성하자 내가 이번프로젝트에서 원하는방향은 난 레퍼런스위주로 주고 ai에이전트가 주도적으로 개발해나가는 방법을 쓸거야 루프기반으로

추가 방향:

> 메인흐름은 내가 생각나는 업무는 메인 워크트리 대화에 계속 쌓으면 그걸 메인에선 하지말고 계속 이력단위 문서로 쌓아나가는거지 이걸 계속 루프에서 컨슈밍해서 이력우선순위 기반으로 반영해서 진행하는흐름임. 각 이력 하나는 하나의 대화로 진행해서 컨텍스트를 유지하고 내가 대화방향성보고 개입가능한구조여야해.

## 접수 해석

제품 Reference와 팀장 인터뷰로 플레이 가능한 roadmap을 만들고, 메인 대화를 오염시키지 않으면서 Git 이력 queue를 최대 3개 worker가 소비하는 프로젝트 기본 skill을 확립한다.

## 인터뷰와 결정

- 핵심 재미는 검·방패 조작감, 타격감, effect와 Polygon→Retro Pixel graphics다.
- 전투는 skill 난사 RPG가 아니라 관대한 기본 입력과 숙련자용 frame·cancel·배후·공중 combo를 가진 action RPG다.
- 성장 stat은 장비가 제공하고 command는 level/재화로 해금하며 skill level이 배율·타수·공중 사용·cancel route를 확장한다.
- 월드 깊이는 Z lane이 아니라 `Region → Room/Chunk → Portal`과 빠른 camera travel로 표현한다.
- 개발 feedback은 기능 단위가 아니라 플레이 가능한 수직 단위로 받는다.
- 메인 대화는 업무 접수 Interface이며 인터뷰와 구현은 work item 전용 대화에서 진행한다.
- 한 팀장 메시지는 명시적 분리 지시가 없으면 work item 하나다.
- Background manager는 main Git write·queue·roadmap·통합을 소유하며 실제 worker 최대 3개를 감독한다.
- `feedback` idle과 manager는 worker 상한에서 제외한다.
- `bugfix`와 `maintenance`는 permanent worktree에서 새 대화로 순차 소비하고 큰 기능은 전용 managed worktree를 사용한다.
- Work item은 하나씩 즉시 commit·push하고 완료·취소 뒤 lane을 최신 main으로 정렬한다.
- 실행 중 취소는 결정·이유를 보존한 뒤 해당 이력의 단독 소유 미병합 코드만 폐기한다.
- 프로젝트 기본 흐름은 하나의 `dev-team-loop` skill이 현재 맥락으로 자동 routing한다.

## 실행 계약

- 제품 방향과 M1~M5 playable milestone을 roadmap에 기록한다.
- 팀장 Interface, background manager, worker, feedback, integration과 cancel lifecycle을 process 문서로 고정한다.
- 하나의 repo-local skill과 mode별 reference를 만든다.
- 기존 runtime 코드는 변경하지 않는다.
- 다른 AI가 수정 중인 main worktree와 기존 system 문서를 건드리지 않는다.

## Reference Brief

- 제품: 레전드 오브 곡괭이의 action RPG 진행·장비 성장·강한 표현, 케로로파이터의 관대한 기본 combo와 숙련 위치·command 싸움을 원칙만 차용한다.
- Engineering: Ball Fight Simulator와 Baeseongjin의 책임 경계, fixed-step, effect separation과 병렬 worktree 운영을 Polygon RPG에 맞게 수정한다.
- OpenAI Codex: repo-local skill, AGENTS instruction budget, chat 전용 worktree와 permanent worktree 원칙을 반영한다.
- 비차용: 원작 IP·asset·수치·command열, 별도 scheduler/database, 검증되지 않은 자동화 framework.

## 취소 기록

해당 없음.

## 결과

- 제품 핵심 재미와 M1~M5 playable milestone을 Reference 근거와 함께 roadmap으로 고정했다.
- 팀장 Interface, replaceable background manager, worker 3개, permanent lane과 이력별 대화 lifecycle을 process로 고정했다.
- 등록·관리·실행·취소를 자동 routing하는 repo-local `dev-team-loop` skill과 work-item schema를 만들었다.
- Runtime source와 다른 AI가 수정 중인 main worktree는 변경하지 않았다.
- `npm run check`, `git diff --check`, local link 검사와 manual skill validator가 통과했다.
- Register·cancel 현실 시나리오의 독립 forward test에서 발견한 message schema·ID·report·pause 모호성을 수정했다.
- Bundled Python validator는 이 PC에 Python runtime이 없어 실행하지 못했고 같은 검사 계약을 Node 일회성 검증으로 대체했다.

## 연결

- Worktree: `서브 트리`
- Branch: `byh020907/서브-트리`
- Final commit: 병합 Git 이력에서 확인
- 업무보고: M0 process bootstrap이므로 별도 playable report 없음
