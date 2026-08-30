# 개발 업무보고

이 디렉터리는 플레이 가능한 수직 단위별 업무보고를 보관한다.

- 작성·ownership·형식은 [`../process.md`](../process.md)의 **업무보고** 절을 따른다.
- 파일명은 `WI-YYYYMMDD-HHmmss-<slice-slug>.md`를 사용해 work item 간 충돌을 막는다.
- 한 root agent는 자기 수직 단위의 보고서 파일 하나만 수정한다.
- 보고서는 팀장이 구현 범위를 즉시 파악할 수 있는 compact changed code tree로 시작하고, 의도, 플레이 결과, 영향, 검증·피드백과 다음 loop를 기록한다.
- 계획, Reference Brief, 실행·품질 계약과 task list의 승인을 받는 문서로 사용하지 않는다. 구현된 candidate의 evidence만 기록한다.
- 기능 하나, 진행 중 상태와 긴 command log를 별도 보고서로 만들지 않는다.
- 작은 bug·문서 정합·maintenance 결과는 work item의 `결과`가 업무보고 링크 역할을 하며 별도 보고서를 만들지 않는다.
