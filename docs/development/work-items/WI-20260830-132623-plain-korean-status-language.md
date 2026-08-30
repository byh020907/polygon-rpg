---
id: WI-20260830-132623
status: done
priority: normal
lane: maintenance
created_at: 2026-08-30T13:26:23+09:00
depends_on: []
reopens: null
review: auto
source: team-lead
source_ref: null
---

# 팀장 진행 보고의 쉬운 한국어 기준

## 팀장 원문

> M2 피드백이 뭐야? 자꾸 용어 남발하지 말아줘 기본 규칙에 업데이트해줘

## 결과

팀장에게 보이는 진행 보고와 답변이 실제 기능명과 쉬운 한국어로 시작하도록 기본 규칙을 추가했다.

- `AGENTS.md`에 팀장 안내 문장 공식 규칙과 기본 작성 원칙을 등록했다.
- 개발 절차 문서에 내부 용어 치환 기준, 질문 답변 방식, 진행 보고 순서와 완료 결과 전달 순서를 정리했다.
- 개발 팀 실행 스킬의 메인 진행 보고, 업무 결과 전달, 취소 안내가 같은 기준을 사용하도록 맞췄다.
- 업무보고 안내도 실제 변경 파일과 쉬운 한국어로 시작하도록 정리했다.
- 게임 실행 코드와 gameplay/runtime source는 변경하지 않았다.

적용 품질 수준은 기능 완결성 2/3, 회귀 안전성 2/3이다. 조작·타격·화면 품질은 문서 정합 업무라 적용하지 않았다.

검증:

- `npm run lint`
- `npm run format:check`
- `skill-creator/scripts/quick_validate.py .agents/skills/dev-team-loop`
- 변경 문서의 로컬 링크와 기준 절 제목 확인
- `git diff --check`

최종 commit은 이 업무 담당 대화의 완료 답변으로 전달한다.

## 연결

- 최종 worktree commit: `2ccb562f4636d9c32d1590d86c269c0eb21f5191`
- main integration commit: `2ccb562f4636d9c32d1590d86c269c0eb21f5191` (fast-forward)
- 메인 확인: 쉬운 한국어 규칙·최상위 규칙 보존·파일 크기·전체 검사 통과
