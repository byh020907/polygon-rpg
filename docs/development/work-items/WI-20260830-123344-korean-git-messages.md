---
id: WI-20260830-123344
status: done
priority: normal
lane: maintenance
created_at: 2026-08-30T12:33:44+09:00
depends_on: []
reopens: null
review: auto
source: team-lead
source_ref: null
---

# Git 커밋·머지 메시지 한국어 기준

## 팀장 원문

> 커밋, 머지 메세지 기준을 한글로 해줘

## 결과

`GIT-MESSAGES-KOREAN`을 canonical rule로 등록하고, 앞으로 에이전트가 직접 작성하는 local commit과 명시적 merge commit의 subject·body를 한국어로 쓰도록 개발 process와 `dev-team-loop`의 등록·통합 경로를 정합했다.

```text
AGENTS.md
.agents/skills/dev-team-loop/
├─ SKILL.md
└─ references/
   ├─ manage.md
   └─ register.md
docs/development/
├─ process.md
└─ work-items/
   └─ WI-20260830-123344-korean-git-messages.md
```

- 기술 식별자·경로·명령·work-item ID·branch·hash·외부 issue/PR 제목은 필요한 경우 원문을 보존한다.
- 영문 Conventional Commit prefix는 요구하지 않으며 간결하고 결과 중심인 한국어 subject를 기본값으로 한다.
- fast-forward를 메시지 때문에 merge commit으로 바꾸지 않고, 과거 이력이나 통제 밖에서 생성된 메시지는 rewrite하지 않는다.
- 검증 통과: `quick_validate.py`, 소유 파일 Prettier, 로컬 Markdown 링크 15개, ESLint, `git diff --check`.
- `npm run check`는 ESLint까지 통과했으나 다른 work item 소유의 `docs/rendering-pipeline.md`, `docs/runtime-architecture.md`가 Prettier 검사에 실패해 전체 명령은 종료 코드 1이었다. 이 작업에서는 두 파일을 수정하지 않았다.
- 품질 threshold: 문서 정합·회귀 안전성 2 이상. 런타임과 플레이 동작은 변경하지 않았다.

## 연결

- 최종 commit: `469d02148656d888c2f9bce250e861995dc5b9bd`
