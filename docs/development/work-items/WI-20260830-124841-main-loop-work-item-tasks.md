---
id: WI-20260830-124841
status: ready-for-integration
priority: high
lane: maintenance
created_at: 2026-08-30T12:48:41+09:00
depends_on: []
reopens: null
review: auto
source: team-lead
source_ref: null
---

# 메인 loop와 독립 work-item task 분리

## 팀장 원문

> 그리고 내가 초기에 전달해준 에이전트루프가 정상적으로 구성되어 운영중인지 알려줘
> 내가 지금 봣을땐 뭔가 메인이 계속 잡고가는거 같은데 에이전트 루프 핵심은 업무 완료후 문서로 남기고 새 대화 루프인데 그게아닌거같아서

> 아예 팀장 팀원 워크 플로우를 메인에서 제외하고 메인이 루프여야해

## 결과

### Actual changed tree

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
AGENTS.md
docs/development/
├─ process.md
├─ quality-loop.md
├─ reports/README.md
├─ roadmap.md
└─ work-items/WI-20260830-124841-main-loop-work-item-tasks.md
```

### 동작 계약

- 메인 task는 roadmap·queue·compact task status·commit integration만 소유하며 제품 인터뷰, 구현, 품질 tuning과 feedback 중계를 하지 않는다.
- 각 work item은 `WI-... 제목`의 별도 사용자 소유 Codex task에서 처음부터 끝까지 수행하고, Git repository에서는 기본 Codex-managed worktree를 사용한다.
- 팀장은 해당 sidebar task를 직접 열어 changed tree와 artifact를 보고 feedback한다. Blocking 선택도 그 task에서 짧은 Yes/No 또는 2~3 choice로 직접 처리한다.
- Work-item task는 result/report와 검증을 포함한 final scoped worktree commit을 만들고 hash를 반환하지만 push·merge·다음 item 시작은 하지 않는다.
- 메인은 final commit을 실제 diff/check로 검증해 main에 통합하고 worktree/integration hash와 roadmap을 갱신한 뒤 다음 gate를 반드시 새 Codex task로 시작한다.
- Subagent는 work-item task 내부의 bounded exploration, 증명된 disjoint implementation 또는 independent verification만 수행하며 parent task가 결과를 수집·통합한다.
- Pause·cancel·recovery는 exact Codex task, managed worktree/snapshot과 Git checkpoint/final commit evidence를 기준으로 복구하며 guessed cleanup을 하지 않는다.

### 근거와 품질

- 공식 [OpenAI Worktrees](https://learn.chatgpt.com/docs/environments/git-worktrees)의 independent chat·per-chat managed worktree 계약과 [OpenAI Subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents)의 parent-main result collection 계약을 검증해 역할 경계로 채택했다.
- Reference-Guided Engineering은 기존 project의 implementation-first, 짧은 선택 인터뷰, 한국어 Git 메시지와 단일 Vertical Slice Director 품질 ownership을 보존하고, shared-checkout/root-subagent topology만 task/worktree topology로 수정 적용했다.
- 적용 rubric은 기능 완결성 2, Reference 정합 2, 회귀 안전성 2다. Gameplay·화면·balance는 변경하지 않아 조작/Effect/Graphics 축은 비적용이다.

### 검증

- `quick_validate.py .agents/skills/dev-team-loop`: 통과
- `npm run check`: ESLint와 repository 전체 Prettier check 통과
- 변경 Markdown 13개 local link target 검사: 통과
- `AGENTS.md`: 32,651 bytes로 32 KiB instruction budget 통과
- `git diff --check`: 통과
- Remote commit mode: 비활성 확인, push 없음

이 maintenance item은 이 `결과` 절을 업무보고로 사용하며 별도 report를 만들지 않는다.

## 연결

- 업무보고: 이 문서의 `결과`
- 최종 worktree commit: 이 task의 final 응답에서 반환
- main integration commit: 통합 후 메인 coordinator가 기록
