# Target Pose / IK Combat Animation

이 문서는 전투 입력, motion clip, 목표 자세와 관절 자동 계산의 공식 계약을 소유한다.

## 핵심 방향

공격 animation 데이터에 어깨·팔꿈치·손목 회전을 각각 기록하지 않는다. 각 keyframe은 손·방패·검 같은 최종 Effector 목표와 몸 전체 의도만 정의한다.

```text
Input Snapshot
    ↓
CombatCommandController
    ├→ Motion State (id / progress / phase / queue)
    ├→ SpinContactConstraint (pulse spacing / pull cap / release velocity)
    ├→ CombatPoseLibrary arm/weapon targets
    └→ CharacterBonePoseLibrary pelvis/head/foot targets
             ↓
       TwoBoneIKSolver (arms + legs)
    ↓
Shoulder → Elbow → Hand / Hip → Knee → Foot joint positions
    ↓
Character Polygon RenderFrame
```

## Target Keyframe

현재 keyframe이 가질 수 있는 값은 다음과 같다.

```js
{
  progress: 0.58,
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

`progress`는 motion duration과 분리된 `0..1` 정규화 값이다. `CombatPoseLibrary`는 이 presentation keyframe과 Target Pose 보간만 소유하며 실제 지속시간이나 이동 제약을 결정하지 않는다.

`CombatCommandController`는 animation module을 import하지 않는다. Controller가 공개한 normalized `motionState.progress`를 `CombatPoseLibrary`가 읽는 단방향 dependency를 유지한다.

## Full-Body Bone Pose

`CharacterBonePoseLibrary`는 관절 각도를 저장하지 않고 pelvis offset, body/head lean, rear/lead foot target과 cape lift를 계산한다. `GameScene`은 shoulder·hip root를 조립하고 같은 `TwoBoneIKSolver`로 팔꿈치·손과 무릎·발을 계산한다.

- Idle: 작은 호흡과 머리 counter tilt
- Move: 교차 보폭, 발 lift, 전경 상체와 뒤로 빠지는 scarf
- Jump Rise/Fall: 서로 다른 무릎 tuck과 착지 준비
- Landing: gameplay collider를 바꾸지 않는 140ms pelvis compression과 넓은 foot plant
- Guard: 넓은 stance와 뒤로 물린 중심
- Roll: 이동 방향을 고정한 tuck pose와 360° body rotation
- Ground/Air Combat: motion progress에 맞춘 stance, head counter-motion과 cape lift

레오곡의 작은 머리·좁은 몸통·긴 사지와 동작 방향으로 길게 뻗는 silhouette 원칙만 참고하며 원본 sprite, 색상과 authored frame을 복제하지 않는다.

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

| 키  | Command       | Motion         |
| --- | ------------- | -------------- |
| `A` | Basic Attack  | 기본 베기      |
| `S` | Strong Attack | 강한 내려베기  |
| `↑` | Jump          | 점프           |
| `↓` | Guard         | 방패 전방 자세 |

이동은 `←/→`가 소유한다. 깊이 레인 연결점에서는 `↑/↓`가 뒤/앞 lane 전환으로 우선 동작하고 연결점 밖에서 점프/방어로 동작한다. 전투 키와 충돌하므로 `A/D` 이동은 사용하지 않는다.

키보드와 모바일은 각각 A/S와 X/Y로 표시하지만 동일한 Basic/Strong Attack intent와 combo branch를 공유한다. 기술별 직접 입력은 두지 않는다.

| Command sequence | Motion        |
| ---------------- | ------------- |
| `X` / `A`        | 기본 베기     |
| `Y` / `S`        | 강한 내려베기 |
| `XX` / `AA`      | 찌르기        |
| `XY` / `AS`      | 올려베기      |
| `YX` / `SA`      | 회전 공격     |

공중에서는 같은 두 입력이 별도 air branch로 해석된다.

| Command sequence | Motion         |
| ---------------- | -------------- |
| `X` / `A`        | 공중 베기      |
| `Y` / `S`        | 공중 내려베기  |
| `XX` / `AA`      | 공중 되베기    |
| `XY` / `AS`      | 공중 회전      |
| `YX` / `SA`      | 공중 교차 베기 |

## Command Lifecycle

- keydown hold가 아니라 false→true edge에서 command를 한 번 발행한다.
- active motion은 `windup → strike → recovery` phase로 진행한다.
- 공격의 progress/range/vertical 범위는 broad phase만 담당한다. Player 공격 range는 contact tolerance 4 World unit을 더하고, Enemy 공격은 실제 presentation weapon 길이와 Player silhouette 여유를 포함한 보수적 범위를 사용한다. 최종 hit 승인은 gameplay가 같은 Target Pose·IK 표본에서 만든 현재 sword blade와 최근 3 fixed-step의 swept-contact polygon을 combat mob body/head/limb hurt polygon과 비교해 교차·최대 4 World unit 간격에서만 허용한다. Renderer는 이 swept polygon을 sword trail로 표시하지만 opacity·색상은 damage를 바꾸지 않는다. Enemy 공격도 현재 weapon polygon과 Player body/head/limb/shield hurt polygon의 같은 접촉 계약을 사용하며 Guard 중에는 shield contact를 우선한다. 성공한 attacker, weapon/hurt ID와 fixed-step `simulationGap`은 RenderFrame `combatContact`에 180ms 기록해 시각 프레임과 damage 프레임을 함께 검증한다.
- active motion 중 입력한 다음 공격은 한 개까지 buffer하며 가장 최근 유효 입력으로 branch를 결정한다.
- combo branch가 시작되면 직전 motion의 실제 chain pose를 branch별 50~80ms 동안 새 motion에 ease blend한다. Gameplay progress와 active window는 그대로 진행하되 weapon·limb·torso가 첫 frame에 순간이동하지 않게 한다.
- 한 combo cycle의 attack facing은 starter가 시작될 때 결정하고 착지 또는 다음 cycle 전까지 고정한다. 이동 입력은 계속 위치를 바꾸지만 공격 도중 반대 방향 입력이 검과 캐릭터를 적 반대편으로 순간이동시키지 않는다.
- queued ground motion은 기본적으로 recovery 초입 74%에서, air normal은 62~72%에서 남은 recovery를 cancel하고 시작한다.
- Slash/Heavy starter 뒤의 Basic/Strong 입력은 combo table로 다음 motion을 해석한다. 다른 motion 뒤에서는 새 starter로 돌아간다.
- 모든 grounded attack은 진행률과 hit 여부에 관계없이 jump cancel할 수 있다.
- jump 입력은 active ground motion과 buffered motion을 먼저 폐기하고 airborne 상태를 확정한다. 같은 input snapshot의 attack은 ground command가 아니라 새 air command로 즉시 시작한다.
- airborne snapshot에서 입력한 Basic/Strong은 ground queue와 분리된 air combo table로 해석한다.
- 현재 motion 종료 시 buffer된 command를 새 sequence로 시작한다.
- `CombatCommandController`가 label, duration, movement scale과 jump 허용 여부를 gameplay 정책으로 소유하고 command state로 제공한다.
- Guard는 공격이 없을 때 held pose로 적용한다.

## Current Motions

- Slash: 뒤로 감았다가 아래·앞으로 빠르게 베기
- Thrust: 몸을 당긴 뒤 손 목표를 전방으로 직선 확장
- Heavy: 머리 위 windup 뒤 큰 내려베기
- Rising: 낮은 준비 자세에서 위로 올려베기
- Spin: 연속 목표 각도를 통과하는 회전 공격
- Guard: 방패 손 Effector를 전방으로 이동
- Air Slash/Heavy/Return/Spin/Cross: 공중 체공 자세에서 같은 두 버튼의 별도 연계
- Ground Spin은 짧게 도약하되 화면 평면에서 몸 전체를 공중제비시키지 않는다. 몸통·발은 수평 yaw를 암시하는 폭·무게중심·실루엣을 바꾸고, 회전 전후면에 따라 sword/shield limb의 고정 draw order·opacity·뒷면 색조를 교대한다. Sword trail item은 opacity 0을 포함해 항상 유지하므로 RenderFrame item shape과 장비 order가 바뀌지 않는다. Depth phase에는 양 끝이 0인 ease envelope를 곱해 idle 진입·복귀 pose와 연속되게 하며, 뒷면 shade 결과는 제한된 palette cache에서 재사용한다. 검 Effector는 지면 위의 독립된 원형 궤도로 3개의 hit pulse를 만든다. `SpinContactConstraint`는 Heavy 이후 적의 실제 간격을 시작점으로 pulse 간격을 연속 보간하고 pull 속도를 초당 300 World unit으로 제한한다. 공개 update 경계는 motion progress/sequence, 좌표, `-1/+1` facing과 deltaSeconds를 유한성·범위 검증한다. 마지막 pulse의 수평 velocity는 명시적인 release DTO로 전달해 constraint 종료 직후 위치 snap 없이 launch feedback을 보존한다.
- Air Heavy는 Player를 빠르게 하강시키고 적을 바닥에 70ms 박은 뒤 다시 bounce시키는 slam finisher다.

## Combat Mob / Juggle Contract

전투 실험 던전의 combat mob은 경공격·강공격·대공격을 순환하고 거리 접근, windup, active, recovery, guard, evade, hitstun을 독립 상태로 관리한다. 공격 중 고정한 facing을 판정과 렌더링이 함께 사용하며, 피격 반응은 현재 weapon/body pose에서 전용 180ms recovery로 이어진다. Player 피격 knockback은 Light < Anti-air < Heavy 순의 velocity와 decay profile을 사용하고 작은 잔여 속도는 0으로 정산한다.

combat mob은 공중 hit마다 낙하 속도를 제거하고 감소하는 위쪽 impulse와 짧은 gravity suppression을 받는다. 공중 sustain 공격이 적중하면 Player도 적과 같은 위쪽 속도, gravity suppression과 progressive gravity scale을 받아 같은 높이 흐름을 유지한다. 허공 공격은 체공을 연장하지 않는다.

combat mob의 가슴 core는 지원하는 최대 Retro Pixel Size 10에서도 최소 한 logical pixel 면적을 유지하는 청록색 육각형과 저강도 외곽 glow를 사용한다. Glow는 silhouette와 공격 telegraph보다 밝게 팽창하지 않고 core 위치만 식별시킨다. Geometry diagnostics는 world-space authored degeneracy와 Retro pixel-snap 이후 projected raster collapse를 별도 결과로 분류한다.

- Air Slash/Return/Spin은 높이를 유지하는 extender다.
- Air Heavy(`S/Y`)는 바닥에 박은 뒤 함께 튕겨 오르는 slam finisher이며, Air Cross(`SA/YX`)는 재부양하지 않는 finisher다.
- sustain hit는 Player를 목표 간격 44 World unit으로 최대 32 unit 보정해 다음 대각선 타격의 거리도 유지한다.
- Air combo 중 same-side target gap은 기본 44 World unit, 되베기 진입은 22 World unit을 상한으로 부드럽게 pull한다. 반대편에 있는 목표에는 좌표 clamp를 적용하지 않아 away 이동이나 cross-up이 반대편 순간이동으로 바뀌지 않는다.
- Ground active movement는 이동 전·후 signed gap을 비교해 같은 면의 12 World unit contact plane에서 멈추며, target이 airborne여도 접촉면을 통과하지 않는다. Spin target constraint는 같은 combo cycle에서 Heavy 또는 첫 Spin pulse가 실제 hit-confirm된 뒤에만 켜지므로 whiff한 starter가 적을 끌어오지 않는다.
- 경공격 hit는 35ms, 강공격·finisher hit는 50ms hit-stop을 적용하며 stop 중 새 입력 sequence는 adapter에 보존된다.
- 적중과 Guard는 hit-stop 동안에도 진행되는 짧은 방향성 camera kick을 함께 발생시킨다. Camera offset은 gameplay position과 분리되고 공격 강도에 따라 bounded scale을 사용한다.
- launch를 포함해 최대 6 hit 또는 3.2초까지만 juggle할 수 있다.
- hit마다 enemy gravity가 증가하고 relaunch impulse·float 시간이 감소한다.
- 한계에 도달하면 강제 낙하하며 착지 전에는 추가 hit를 받지 않는다.
- 착지하면 juggle count, 누적 시간과 gravity scale을 초기화한다.
- Player가 정면 Guard에 성공하면 damage와 knockback 없이 40ms block-stop을 적용한다. 실제 shield polygon의 전방 끝점에서 impact와 spark를 만들며 Light/Heavy에 각각 120/240ms blockstun과 차등 recoil·effect 강도를 적용한다. Anti-air는 공중 목표만 맞히므로 지상 Guard 대상이 아니다.
- blockstun과 KO 중에는 이동·점프뿐 아니라 새 combat command와 hit 판정도 잠근다. Block-stop 중 들어온 attack sequence는 blockstun의 첫 simulation tick에서 소비하되 실행하지 않아 숨은 공격이나 지연 발동을 남기지 않는다.
- 한쪽이 한 combo command cycle을 끝내면 피격자는 550ms retaliation invulnerability를 얻는다. 이 보호는 새 피해만 거부하고 보호받는 Player/Combat mob의 이동·Guard·공격은 허용해 다음 neutral에서 반격할 수 있게 한다. Player는 hitstun 종료에 시작하고, combat mob은 command controller의 새 `comboCycle` 경계에서 시작하며 공중에서는 시간이 소모되지 않는다. 보호 시간 안에 다음 공격 cycle이 시작되면 episode당 최초 한 cycle ID만 전체 보호 대상으로 고정해 후반 branch도 피해를 주지 못한다. 다음 cycle은 남은 시간만 보호하고 만료 뒤 정상 적중한다. Rising의 jump cancel과 착지 전 air chase는 기존 cycle ID를 보존하므로 정상 launcher combo는 끊지 않는다. 보호 중 combat mob은 연속 공격을 다시 Guard하는 대신 공격 접근을 우선한다. Retaliation aura는 양쪽 silhouette 뒤에서 표시한다.

Slash, Heavy, Rising과 Spin의 trail polygon은 gameplay가 최근 blade pose에서 계산한 swept-contact geometry를 그대로 사용한다. Target Pose는 trail opacity와 색 표현만 제공하고 Renderer는 sweep history나 hit lifetime을 진행하지 않는다.
