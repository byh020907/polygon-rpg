# 개발 업무보고

이 디렉터리는 플레이 가능한 수직 단위별 업무보고를 보관한다.

- 작성·ownership·형식은 [`../process.md`](../process.md)의 **완료 결과 전달과 업무보고** 절을 따른다.
- 파일명은 `WI-YYYYMMDD-HHmmss-<slice-slug>.md`를 사용한다.
- 하나의 work item executor branch가 자기 수직 단위의 보고서 파일 하나를 수정하고 fresh-run verified final commit에 포함한다.
- 보고서는 실제 변경 파일로 시작하고, 의도, 플레이 결과, 영향, 검증·팀장 의견과 다음 개선 단계를 쉬운 한국어로 기록한다.
- 계획, Reference Brief, 실행·품질 계약과 task list의 승인 문서로 사용하지 않는다.
- 작은 bug·문서 정합·maintenance는 work item의 `결과`가 업무보고이며 별도 보고서를 만들지 않는다.
- Team-lead main은 보고서를 대리 작성하거나 context에 복제하지 않는다. Fresh direct-executor run은 구현 checkpoint와 별도 검증 run을 거쳐 보고서를 확정하고, integration run이 final commit과 work-item 연결을 main에 병합한다.
