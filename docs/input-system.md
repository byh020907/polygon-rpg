# Keyboard / Mobile Input Adapters

이 문서는 키보드와 모바일 pointer 입력을 동일한 gameplay intent로 변환하는 계약을 소유한다.

## Architecture

```text
KeyboardInputAdapter ─┐
                      ├→ GameInputController → Frozen Input Snapshot → GameScene
MobileInputAdapter ───┘
```

GameScene과 CombatCommandController는 입력 장치, DOM event 또는 pointer ID를 알지 않는다.

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
- movement/guard/crouch는 held state로 유지한다.
- jump와 attack은 press마다 단조 증가 sequence를 만든다.
- 짧은 탭이 다음 fixed update 전에 끝나도 sequence가 남아 입력이 유실되지 않는다.

### GameInputController

- 두 adapter의 held state는 OR로 합친다.
- 두 adapter의 command sequence는 단조 증가 합계로 합친다.
- 화면 전환 시 held pointer/key를 정리한다.
- 새 게임이나 scene reset에서는 adapter와 command controller sequence를 함께 초기화한다.

## Action Contract

| Intent                | Keyboard | Mobile           |
| --------------------- | -------- | ---------------- |
| Move Left / Right     | `←/→`    | 왼쪽 방향 pad    |
| Jump                  | `Space`  | `JUMP`           |
| Slash / Thrust        | `A/S`    | `A/S`            |
| Heavy / Rising / Spin | `Q/W/E`  | `Q/W/E`          |
| Guard / Crouch        | `↑/↓`    | 위/아래 방향 pad |

깊이 레인 연결점에서는 `↑/↓`가 문맥적인 lane 전환으로 우선 사용된다. 연결점 밖에서는 기존 Guard / Crouch intent가 그대로 유지된다. GameScene 또는 map runtime이 frozen input snapshot과 active connection을 함께 보고 우선순위를 결정하며 adapter는 맵 문맥을 알지 않는다.

Alpine `gameShell`은 control catalog와 `data-mobile-action`만 렌더링한다. `MobileInputAdapter`가 DOM 이벤트를 공통 action으로 바꾸며 Alpine state나 DOM 버튼은 gameplay 상태를 직접 수정하지 않는다.

## Pointer Lifecycle

```text
pointerdown
→ adapter.press(actionId, pointerId)
→ setPointerCapture(pointerId)

pointerup | pointercancel | lostpointercapture
→ adapter.release(pointerId)
→ releasePointerCapture(pointerId)
```

release는 멱등적이며 다른 pointer의 action을 해제하지 않는다.

## Layout

- coarse pointer 또는 폭 900px 이하에서만 mobile controls를 표시한다.
- 메뉴의 `모바일 조작으로 시작`을 선택하면 Orca 원격 작업을 위해 media query와 무관하게 mobile controls를 표시한다.
- 왼쪽은 이동·방어·앉기 3×3 pad다.
- 오른쪽은 Q/W/E와 A/S/JUMP 3×2 pad다.
- control은 `touch-action: none`, pointer capture와 document-level release fallback을 사용한다.
- 모바일 landscape는 `100dvh` 안에 16:9 Game Canvas를 맞추고 desktop footer를 숨긴다.
- portrait에서는 조작기를 숨기고 landscape 회전 안내를 표시한다.

## Reference Adoption

- Baeseongjin: `controlPointers` Map, frozen snapshot, action/movement adapter 분리, viewport 기반 control size
- Ball Fight Simulator: pointer capture와 pointerup/cancel/lost capture 종료 처리
- Polygon RPG: fixed-step 사이 탭 유실 방지를 위한 action sequence 추가
