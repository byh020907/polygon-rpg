# 컨셉 아트에서 유형별 몹 만들기

검토실의 **몹 유형 시안**에는 인간 수거반·드릴 하운드·정찰 말벌·산업 중장비 각각 한 개가 있다. 대기·이동·공격을 재생하고 프레임·좌우·Polygon/Retro를 비교한다. 실전 몹이나 주인공을 이 견본으로 일괄 대체하지 않는다.

## 수정하는 곳

| 원본                                     | 책임                                            |
| ---------------------------------------- | ----------------------------------------------- |
| `src/graphics/EnemyReferenceProfiles.js` | 외형, 색, 부모 연결, 본의 정규 위치와 크기 비율 |
| `src/animation/EnemyReferenceMotions.js` | 유형별 공용 동작. 새 몹마다 복사하지 않는다.    |
| `src/graphics/EnemyReferenceModel.js`    | 디자인 compile과 동일 clip 적용                 |
| `src/animation/NormalizedLocalFrame.js`  | 부모 축 합성·정규좌표 투영·정적 삼각화          |

`id`는 몹 디자인 이름이고 `archetype`은 재사용할 동작 유형이다. 새 컨셉 아트를 보고 알맞은 유형을 선택한 뒤 그 본 역할을 유지하며 `offset`, `size`, `shape`, `tone`을 바꾼다. 다른 몸 구조를 억지로 인간형 본에 넣지 않는다. 같은 유형의 본이 빠지면 compile이 실패해 조용히 움직이지 않는 부위를 남기지 않는다.

```js
const variant = createEnemyReferenceModel(
  { ...humanoidSource, id: 'new-raider', archetype: 'humanoid' },
  { torso: { size: [0.9, 3.2, 0.9] } },
);
sampleEnemyReferenceModel(variant, { action: 'move', frameIndex: 24 });
```

이 변경에는 동작 프레임이나 별도 이미지를 만들 필요가 없다. 모든 부착물과 세 공용 clip이 변경된 본을 사용한다. 다만 컨셉 아트를 자동으로 정확히 리깅하는 기능은 아니다. AI가 부위 구분·본 배치·비율을 해석하고 실제 재생 결과를 확인한다.

## 부모 기준 좌표

- `offset: [x,y,z]`: 부모 축 기준 `[-1,1]`. `-1/+1`은 부모 범위의 양 끝이다.
- `shape: [[x,y], ...]`: 해당 부위 기준 `[-1,1]` 윤곽. 표면의 로컬 z는 0이다.
- `size: [x,y,z]`: 부모에 대한 양수 크기 비율. 위치 좌표와 다르므로 1보다 클 수도 있다.
- `rotation`: 원본의 정지 회전은 라디안이며 compile 때 quaternion이 된다. 동작 회전도 quaternion으로 합성한다.
- 부모의 크기는 부착 위치와 자식 크기에 전파된다. 회전할 때는 단위 축을 합성하므로 길쭉한 부모 아래의 회전 칼날이 갑자기 늘어나지 않는다.
- 인스턴스의 `position`, `scale`, `facing`은 마지막 배치 값이다. 원본 vertex를 월드 픽셀 좌표로 다시 작성하지 않는다.

## 구조 선택과 비용

최우선은 **AI가 원본 한 곳을 바꾸면 모든 동작에 반영되는 편집성**이다. 3D 본→2D 폴리곤→정수 픽셀 자체가 동일한 몸체를 강제하지는 않는다. 유형마다 다른 본 계층과 외형을 갖게 하고, 가림과 부모 변환을 일관되게 적용한다. 저해상도에서 한 픽셀보다 작아지는 세부는 해상도를 무조건 높이기 전에 면 크기·실루엣으로 정리한다.

| 대안                           | 편집성 / 판단                                                             |
| ------------------------------ | ------------------------------------------------------------------------- |
| 유형별 본 + 선언형 폴리곤 부위 | 현재 선택. 본·윤곽 수정만으로 공용 동작과 두 렌더러에 전파                |
| 부위별 SVG cutout              | 원본 입력으로 유리. 그룹·관절이 있으면 정규 부위로 옮기기 쉬움            |
| 모델 전체의 수동 sprite sheet  | 프레임 재생성·장비 조합 관리 때문에 이번 방향에서 제외                    |
| 전체 3D mesh/skin              | 표현 폭은 넓지만 현재 목표에 필요한 원본·도구 복잡도가 커서 채택하지 않음 |

부위별 cutout과 공용 본의 결합은 [Godot의 cutout 설명](https://docs.godotengine.org/en/stable/tutorials/animation/cutout_animation.html)에도 나온다. SVG는 [그룹의 변환을 자식에게 적용](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/g)하고 [viewBox](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Attribute/viewBox)로 좌표계를 정의할 수 있어 정리된 원본에 적합하다. PNG를 SVG 안에 넣거나 자동 tracing한 복잡한 path는 같은 이점을 보장하지 않는다.

참고 원본은 [레퍼런스 폴더](./references/enemy-archetypes/README.md)에 보관한다. 최신 주인공 시트에는 부위·관절 설명이 있지만 실제 파일 형식은 PNG다. 이미지 속 “SVG”라는 제목을 벡터 데이터로 오인하지 않는다.

삼각화는 compile 때 한 번만 하고 frame마다 본과 vertex만 sample한다. 대표당 9~~17개 부위, 32~~81개 삼각형이다. 로컬 Node 25 측정에서 한 대표의 sample 중앙값은 약 0.16~0.36ms였으며 이는 휴대폰 FPS나 렌더 시간 측정이 아니다. 원본 PNG는 문서에만 보관하고 PWA 필수 asset에 넣지 않는다. 반복 그림의 cache는 [MDN Canvas 최적화](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas)가 설명하듯 계산을 줄일 수 있지만, 현재는 원본 편집성을 해치는 sprite 산출물을 추가하지 않는다.

## 확인

`npm run test:enemy-references`는 624개 프레임에서 정규 범위·좌우 반전·전체 배율·회전 중 크기 유지·다른 디자인 ID의 동일 clip 적용을 확인한다. `npm run test:enemy-references:browser`는 실제 검토실의 네 대표와 세 동작·터치·재생·저장 보존을 확인한다. 최종 디자인 만족이나 실전 전투 튜닝 완료를 뜻하지 않는다.
