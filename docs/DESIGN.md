# Polygon RPG Design

이 문서는 무엇을 만드는지 정의하는 거의 변하지 않는 제품 source of truth다. 현재 진행과 다음 일은 [`STATUS.md`](./STATUS.md), 팀장이 메인 대화에서 등록한 원문은 [`feedback/INBOX.md`](./feedback/INBOX.md)가 소유한다.

## Product Vision

> 마법 없이 검과 방패만으로 다양한 마법 생물을 공략하고, 탐험을 통해 전투 방식이 확장되는 2D 횡스크롤 액션 RPG.

핵심 재미는 콘텐츠 양보다 다음 네 축에서 나온다.

1. **조작감:** 입력 의도와 캐릭터 반응이 즉각적이고 예측 가능하다.
2. **타격감:** 적중·guard·회피·punish와 공중 연계 성공을 즉시 인지한다.
3. **Effect:** 검 궤적, impact, hitstop, 피격 반응과 camera feedback이 판정을 선명하게 전달한다.
4. **Graphics:** Polygon 제작 효율을 유지하면서 강한 대비·단순한 silhouette·과장된 동작을 Retro Pixel 출력으로 전달한다.

## Combat

- Cooldown skill을 순서대로 난사하지 않고 기본기, 거리, 방향, frame, guard, 회피, 띄우기, 공중 상태와 cancel을 직접 조작한다.
- 기본 입력과 짧은 combo는 관대하고, 숙련자는 frame·위치·배후·cancel·최적 route로 더 큰 보상을 얻는다.
- 적 기본 공격은 guard하고 강공격은 roll의 이동·무적 구간으로 통과해 배후 punish를 만든다.
- Punish는 launcher → 공중 combo → landing까지 하나의 읽을 수 있는 흐름이다.
- 모든 combat action은 startup/active/recovery, hit/block stun, input buffer/cancel window, roll invulnerability, airborne/landing과 결정적 juggle limit을 가진다.
- 120Hz fixed-step simulation과 60Hz integer combat frame 표기를 사용하며 정확한 balance는 실제 플레이로 조정한다.

## Growth

- 플레이어가 직접 분배하는 기본 stat은 두지 않는다.
- 장비가 공격·방어·공격속도·사거리·경직·띄우기·guard 성질을 제공한다.
- 공통 command grammar를 유지하면서 장비 profile과 skill level이 frame, 공격 성질, 타수, 공중 사용과 cancel route를 확장한다.
- 성장은 버튼 수보다 기존 command의 선택과 연계 가능성을 늘린다.

## World

```text
학원촌 준비
→ Field 탐험과 조우
→ Dungeon 공략
→ Boss 전투
→ 장비·재화·command 해금
→ 마을 귀환과 다음 지역 준비
```

- World → Region → Room/Chunk → gameplay surface/entity/render item/Portal 구조를 사용한다.
- 문·계단·골목·출구는 Portal로 연결하고 완료 fixed-step에서 목적 Room, spawn과 collision을 원자적으로 바꾼다.
- Camera travel로 공간의 깊이와 연결감을 표현한다. 자유 Z축·Depth Lane scale/order transition은 확장하지 않는다.
- Gameplay surface와 생성·override된 render geometry를 분리한다.
- 낮밤·날씨·story는 base map 복제가 아니라 stable ID 기반 결정적 patch로 해석한다.

## Runtime And Presentation

- Vanilla JavaScript ES Module, no-build static deployment와 vendored Alpine.js UI를 유지한다.
- Runtime은 tree-owned Scene/Node lifecycle과 owner cleanup Signal로 조립한다.
- Renderer는 read-only RenderFrame만 소비하고 physics, animation이나 effect lifetime을 진행하지 않는다.
- 전투 motion은 Effector Target Pose와 IK로 계산한다.
- Keyboard/Mobile adapter는 공통 intent snapshot을 만든다.
- 파티클·VFX는 gameplay 판정과 collider에서 분리한다.
- 외부 runtime game/render engine은 명시적 승인 없이 추가하지 않는다.

## Playable Roadmap

Approved vertical sequence는 다음과 같다. 실제 완료 상태와 다음 항목은 `STATUS.md`에서만 관리한다.

1. **M0 — 자율 개발 loop:** Fresh-session file memory, Git executor branch/worktree, checkpoint, 독립 검증과 자동 integration.
2. **M1 — 훈련방 첫 전투:** Guard → roll 배후 → launcher → 공중 combo → landing.
3. **M2 — 학원촌 ↔ 훈련장:** 장비 선택, Room Portal 왕복, camera travel과 전투 반복.
4. **M3 — 첫 Field·Dungeon·Boss:** 준비 → 탐험 → checkpoint → boss → 보상 → shortcut 귀환.
5. **M4 — 장비·command 성장:** 장비 trade-off, command 해금, skill level, save.
6. **M5 — 첫 Region 확장:** 새 환경·마법 생물·Dungeon·Boss·영구 shortcut을 갖춘 반복 가능한 수직 원정.

추가 Region·생물·quest는 팀장이 메인 대화에서 새 원문을 inbox에 등록하거나 approved design을 변경할 때만 범위에 들어온다.

## Quality Contract

- 개발 단위는 처음부터 끝까지 반복 실행 가능한 사용자 시나리오다.
- 기능 완결성·조작 명료성·타격감/Effect·Graphics·설계 정합·회귀 안전성의 적용 축은 모두 2/3 이상이어야 한다.
- 결정적 검사와 실제 Canvas/mobile 관찰은 별도 증거다.
- Writer checkpoint 뒤 fresh session이 final artifact를 독립 검증한다.
- 같은 원인의 결함·지적이 두 번 확인되고 기계적으로 측정 가능할 때만 가장 작은 durable check로 승격한다.

## Product Experience References

- **레전드 오브 곡괭이:** 2D 횡스크롤 action RPG의 조작·cancel·공중 행동, 마을 준비 → 장비 → 탐험 → boss 연결과 강한 silhouette를 원칙으로 차용한다. 캐릭터·몬스터·명칭·story·map·item·motion·asset·수치는 복제하지 않는다. 근거: [Team Pickaxe 공식 패치 노트와 팁](https://tpickaxe.tistory.com/32).
- **케로로파이터:** 방향+공격 command grammar, 쉬운 기본 combo와 위치·배후·cancel·공중 연계, guard·회피·punish의 심리전과 즉시 읽히는 적중 feedback을 원칙으로 차용한다. 캐릭터·기술명·원작 command열·frame/balance는 복제하지 않는다. 근거: [개발 팀장 인터뷰](https://www.inven.co.kr/webzine/news/?news=16119), [베타 타격감 평가](https://www.gamemeca.com/view.php?gid=119281).

## References And Non-Scope

- 제품 경험 Reference의 캐릭터, 명칭, story, map, item, motion, sprite, sound, command열과 balance 수치를 복제하지 않는다.
- 자유 Z축/belt-scroll, cooldown 순환 combat, 직접 stat point 분배, 대량 콘텐츠 선행과 반복 근거 없는 영구 test suite는 비범위다.
