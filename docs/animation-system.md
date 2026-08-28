# Target Pose / IK Combat Animation

이 문서는 전투 입력, motion clip, 목표 자세와 관절 자동 계산의 공식 계약을 소유한다.

## 핵심 방향

공격 animation 데이터에 어깨·팔꿈치·손목 회전을 각각 기록하지 않는다. 각 keyframe은 손·방패·검 같은 최종 Effector 목표와 몸 전체 의도만 정의한다.

```text
Input Snapshot
    ↓
CombatCommandController
    ↓
Motion State (id / progress / phase / queue)
    ↓
CombatPoseLibrary Target Keyframes
    ↓
Target Pose interpolation
    ↓
TwoBoneIKSolver
    ↓
Shoulder → Elbow → Hand joint positions
    ↓
Character Polygon RenderFrame
```

## Target Keyframe

현재 keyframe이 가질 수 있는 값은 다음과 같다.

```js
{
  time: 0.3,
  pose: {
    handTarget: { x: 70, y: 15 },
    shieldTarget: { x: -45, y: 2 },
    swordAngle: 0.3,
    bodyOffset: { x: 8, y: 0 },
    bodyLean: 0.11,
    bodyScaleY: 1,
    trailOpacity: 0.9,
    trailArc: 2.05
  },
  easing: "easeOut"
}
```

`upperRotation`, `lowerRotation`, `elbow` 같은 관절 결과를 clip 데이터에 넣지 않는다.

## IK Solver

현재 팔과 방패 팔은 해석적 Two-Bone IK를 사용한다.

- 입력: shoulder root, hand target, upper/lower bone length, bend direction
- 출력: elbow와 hand 위치, upper/lower rotation
- bone length를 항상 보존한다.
- target이 reach 밖이면 같은 방향의 최대 도달점으로 제한한다.

팔·다리처럼 두 segment인 limb에는 이 solver를 사용한다. 척추·꼬리·로프처럼 segment가 가변적인 chain이 실제로 필요해지면 같은 Target Pose 경계 뒤에 FABRIK solver를 추가한다.

참고:

- [Unity 2D IK workflow and solver definitions](https://github.com/Unity-Technologies/2d-animation-samples/blob/master/Documentation/2DIK.md)
- [FABRIK: A fast, iterative solver for the Inverse Kinematics problem](https://www.andreasaristidou.com/publications/papers/FABRIK.pdf)

## Combat Commands

| 키  | Command        | Motion         |
| --- | -------------- | -------------- |
| `A` | Primary Attack | 기본 베기      |
| `S` | Thrust Attack  | 찌르기         |
| `Q` | Heavy Attack   | 강한 내려베기  |
| `W` | Rising Attack  | 올려베기       |
| `E` | Rage Attack    | 회전 공격      |
| `↑` | Guard          | 방패 전방 자세 |
| `↓` | Crouch         | 낮은 자세      |

이동은 `←/→`, 점프는 `Space`가 소유한다. 전투 키와 충돌하므로 `A/D` 이동은 사용하지 않는다.

## Command Lifecycle

- keydown hold가 아니라 false→true edge에서 command를 한 번 발행한다.
- active motion은 `windup → strike → recovery` phase로 진행한다.
- active motion 30% 이후 입력한 다음 공격은 한 개까지 buffer한다.
- 현재 motion 종료 시 buffer된 command를 새 sequence로 시작한다.
- 공격 중 movement scale과 jump 허용 여부는 command state가 제공한다.
- Guard/Crouch는 공격이 없을 때 held pose로 적용한다.

## Current Motions

- Slash: 뒤로 감았다가 아래·앞으로 빠르게 베기
- Thrust: 몸을 당긴 뒤 손 목표를 전방으로 직선 확장
- Heavy: 머리 위 windup 뒤 큰 내려베기
- Rising: 낮은 준비 자세에서 위로 올려베기
- Spin: 연속 목표 각도를 통과하는 회전 공격
- Guard: 방패 손 Effector를 전방으로 이동
- Crouch: 몸 높이 목표를 낮추고 무게 중심 하강

Slash, Heavy, Rising과 Spin은 현재 검 위치와 목표 각도로 procedural ribbon을 생성한다. Trail은 별도 bone이 아니며 sampled target pose의 출력만 읽는다.
