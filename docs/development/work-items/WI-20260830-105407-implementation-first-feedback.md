---
id: WI-20260830-105407
status: done
priority: high
lane: maintenance
created_at: 2026-08-30T10:54:07+09:00
depends_on: []
reopens: null
review: auto
source: team-lead
source_ref: null
---

# 구현 우선·실체 기반 피드백 workflow

## 팀장 원문

> 현재 결과물봐바 난 필요한 내용을 말햇는데 다시 컨펌을 받는데 이거도 문서로 나한테 물어보는데 난 내의도를 이미 다말햇고 업무 보고만 확인할건데, 자꾸 컨펌을 받으니까 업무 진행이 안되
>
> 내가 원하는건 코드 트리만 결과로 보고싶고, 그거 기반으로 피드백할거라, 문서는 의미가 없다는 의견이야 어차피 문서 컨펌 해달라해도, 그렇게 안짜는경우가 많아서 일단 구현하고 코드 트리등 멀 구현할건지를 보고싶은거지 그래야 내가 구체적으로 인터뷰를 해서 고치던가 하는데 지금 만든 컨펌문서는 실체가 없으니 아무런 피드백을 할수가 없고 효과가 없어

> 추가로 만약 진짜로 개발전 물어봐야할 내용있다면 그건 인터뷰형태로 진행을 해야지 문서로 그렇게 길게 줘받자 맥락을 잃어서 이해가안되, 즉 내가 yes or no로 답하거나 여러개 선택지중 한개 선택하는 방향으로 결정방향만 물어봐야지, 너가 할일 문서로 만들어줘받자 큰의미가 없어 어차피 코드랑 같을거란보장도없고 결정방향 같은데 굳이 문서를 내가 볼필요도 없지ㅏ

## 결과

### 실제 changed code tree

```text
.agents/skills/dev-team-loop/
├─ SKILL.md
└─ references/
   ├─ cancel.md
   ├─ manage.md
   ├─ register.md
   ├─ run.md
   ├─ start.md
   └─ work-item-schema.md
docs/development/
├─ process.md
├─ quality-loop.md
├─ roadmap.md
├─ reports/README.md
└─ work-items/WI-20260830-105407-implementation-first-feedback.md
```

### 동작 경로

```text
명시된 팀장 의도
→ 재확인·계획 승인 없이 root agent 구현
→ 안전하고 가역적인 default candidate
→ 품질 threshold와 독립 검증
→ 실제 code tree + behavior/play path + verification + 업무보고 링크
→ 같은 agent에 concrete feedback
```

구현을 실제로 막고 추론·가역 default가 불가능한 결정만 Yes/No 또는 2~3개 선택지 중 하나로 답할 수 있는 짧은 질문 하나를 사용한다. Work item은 queue/status와 구현 후 결과·feedback·연결만 남기는 최소 durable record로 축소했다. M2 Portal/장비와 M4 성장 결정은 구현 전 interview gate 대신 data/config로 되돌릴 수 있는 첫 candidate 기본값을 두었다.

### 품질과 검증

- 기능 완결성 2: Register → Run → Manage/Start → candidate feedback 흐름 전체가 구현 우선 계약으로 연결된다.
- Reference 정합 2: Reference-Guided Engineering의 반복 Engineering interview 최소화 원칙과 사용자 명시 지시 우선순위를 반영했다.
- 회귀 안전성 2: skill validator, 7개 semantic contract assertion, 로컬 링크 검사, Prettier, `npm run check`, `git diff --check`가 통과했다.
- 독립 검증 PASS: read-only verifier가 skill validator PASS, `npm run check` PASS, 로컬 Markdown 링크 PASS, scoped `git diff --check` PASS를 관찰했다.
- Runtime 영향: 게임 source와 플레이 동작은 변경하지 않은 process/skill maintenance다. 이 item의 실제 사용자 artifact는 위 workflow 경로와 Git diff다.

별도 milestone 보고서는 만들지 않는다. 이 `결과` 절이 maintenance 업무보고다.

## 피드백

아직 없음. 이후 피드백은 위 실제 candidate를 기준으로 같은 root agent에 연결한다.

## 연결

- root agent task: `wi_20260830_105407`
- 업무보고: 이 문서의 `결과`
- 최종 commit: `e27c5c1dd8aa4aea16357fe850007a70dbc8e674`
