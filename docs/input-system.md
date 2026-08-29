# Keyboard / Mobile Input Adapters

이 문서는 키보드와 모바일 pointer 입력을 동일한 gameplay intent로 변환하는 계약을 소유한다.

## Architecture

```text
KeyboardInputAdapter ─┐
                      ├→ GameInputController → Frozen Input Snapshot → GameScene
MobileInputAdapter ───┘
```

GameScene과 CombatCommandController는 입력 장치, DOM event 또는 pointer ID를 알지 않는다.

Frozen Input Snapshot은 adapter가 만든 gameplay held state와 command sequence만 포함한다. Animation Speed 같은 UI·simulation 설정은 입력 DTO에 섞지 않고 `GameApp`이 별도 frozen Simulation Settings로 `GameScene`에 전달한다.

## Adapter Responsibilities

### KeyboardInputAdapter

- key code를 공통 action ID로 변환한다.
- `attach()`/`detach()`가 listener 수명주기를 소유한다.
- blur와 document hidden에서 held state를 비운다.
- key repeat는 새 command sequence를 만들지 않는다.

### MobileInputAdapter

- `pointerId → actionId` Map으로 멀티터치를 소유한다.
- Alpine 수명주기와 분리된 document-level event delegation으로 동적 버튼 입력을 수신한다.
- pointerdown에서 action을 press하고 pointerup/cancel/lost capture에서 같은 pointer만 release한다.
- Pointer Events가 없는 브라우저에서는 Touch Events의 identifier를 같은 pointer ID 계약으로 변환한다.
- movement/guard는 held state로 유지한다.
- jump와 attack은 press마다 단조 증가 sequence를 만든다.
- 짧은 탭이 다음 fixed update 전에 끝나도 sequence가 남아 입력이 유실되지 않는다.

### GameInputController

- 두 adapter의 held state는 OR로 합친다.
- 두 adapter의 command sequence는 단조 증가 합계로 합친다.
- 화면 전환 시 held pointer/key를 정리한다.
- 새 게임이나 scene reset에서는 adapter와 command controller sequence를 함께 초기화한다.

## Action Contract

| Intent                 | Keyboard   | Mobile         |
| ---------------------- | ---------- | -------------- |
| Move Left / Right      | `←/→`      | `←/→` 방향 pad |
| Jump / Guard           | `↑/↓`      | `↑/↓` 방향 pad |
| Basic / Strong Attack  | `A/S`      | `X/Y`          |
| Thrust / Rising / Spin | `AA/AS/SA` | `XX/XY/YX`     |

깊이 레인 연결점에서는 `↑/↓`가 문맥적인 뒤/앞 lane 전환으로 우선 사용된다. 연결점 밖에서는 Jump / Guard intent가 그대로 유지된다. `GameScene`이 frozen input snapshot과 active connection을 함께 보고 우선순위를 결정하며 adapter는 맵 문맥을 알지 않는다. Pending transition 동안 새 이동·점프·전투 command는 적용하지 않지만 input edge와 sequence는 계속 소비한다.

지상 이동 중 `↓` Guard edge는 현재 이동 방향으로 구르기를 시작한다. 계단·포탈 connection이 같은 위치에서 활성화되면 공간 전환을 우선하고, 정지 상태의 `↓`는 Guard held pose를 유지한다. 구르기 시작 뒤에는 방향을 바꾸지 않으며 진행률 12~62% 구간에 무적 판정을 둔다.

공중에서도 같은 Basic/Strong intent를 사용한다.

지상 공격 중 `↑` Jump가 발행되면 진행률과 hit 여부에 관계없이 Jump를 최우선 처리한다. active attack과 buffered attack을 모두 취소하고 airborne 상태를 먼저 확정한 뒤, 같은 snapshot에 포함된 Basic/Strong 입력은 air command로 해석한다.

| Air sequence | Motion         |
| ------------ | -------------- |
| `A` / `X`    | 공중 베기      |
| `S` / `Y`    | 공중 내려베기  |
| `AA` / `XX`  | 공중 되베기    |
| `AS` / `XY`  | 공중 회전      |
| `SA` / `YX`  | 공중 교차 베기 |

Alpine `gameShell`은 control catalog와 `data-mobile-action`만 렌더링한다. `MobileInputAdapter`가 DOM 이벤트를 공통 action으로 바꾸며 Alpine state나 DOM 버튼은 gameplay 상태를 직접 수정하지 않는다.

## Pointer Lifecycle

```text
pointerdown
→ adapter.press(actionId, pointerId)
→ setPointerCapture(pointerId)

pointerup | pointercancel
→ releasePointerCapture(pointerId)
→ adapter.release(pointerId)

lostpointercapture
→ adapter.release(pointerId)
```

Capture 해제는 best-effort이며 브라우저가 이미 해제했거나 capture가 없으면 실패를 무시한다. `lostpointercapture`는 이미 capture가 종료된 알림이므로 adapter state만 해제한다. Input release는 멱등적이며 다른 pointer의 action을 해제하지 않는다.

## Layout

- coarse pointer 또는 폭 900px 이하에서만 mobile controls를 표시한다.
- 메뉴의 `모바일 조작으로 시작`을 선택하면 Orca 원격 작업을 위해 media query와 무관하게 mobile controls를 표시한다.
- 왼쪽은 이동·점프·방어 3×3 pad이며 최대 control 크기를 38px로 제한한다.
- 오른쪽은 기본공격 X와 강한공격 Y 두 버튼 및 지상/공중 `XX/XY/YX` command guide를 사용하며 최대 control 크기를 40px로 제한한다.
- control은 `touch-action: none`, pointer capture와 document-level release fallback을 사용한다.
- 모바일 landscape는 `100dvh` 안에 16:9 Game Canvas를 맞추고 desktop footer를 숨긴다.
- `모바일 조작으로 시작`의 사용자 gesture에서 fullscreen 진입 후 `screen.orientation.lock('landscape')`를 best-effort로 요청한다.
- 메뉴 복귀와 page destroy에서는 orientation lock을 해제하고 앱이 시작한 fullscreen만 종료한다.
- API가 없거나 브라우저 정책으로 요청이 거부된 portrait 환경에서는 조작기를 숨기고 landscape 회전 안내를 표시한다.

## Reference Adoption

- Baeseongjin: `controlPointers` Map, frozen snapshot, action/movement adapter 분리, viewport 기반 control size
- Ball Fight Simulator: pointer capture와 pointerup/cancel/lost capture 종료 처리
- Keroro Fighter: 기술별 버튼을 나열하지 않고 기본·강한 두 공격 입력의 순서로 combo branch를 만드는 원칙
- Polygon RPG: fixed-step 사이 탭 유실 방지를 위한 action sequence 추가
