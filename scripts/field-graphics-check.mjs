import { SceneCompositionPresenter } from '../src/graphics/scene/SceneCompositionPresenter.js';
import { createGameScene } from '../src/app/createGameScene.js';
import { readVisualQaRequest } from '../src/app/VisualQaConfig.js';
import { openQaBrowser } from './qa/BrowserHarness.mjs';
import assert from 'node:assert/strict';
import { createGraphicsResourceCatalog } from '../src/graphics/GraphicsResourceCatalog.js';
import { createGraphicsResourceSampler } from '../src/graphics/GraphicsResourceSampler.js';
import {
  createFieldQuestResources,
  createFieldQuestReviewScene,
  selectFieldQuestItems,
  detachFieldScenePresentation,
} from '../src/graphics/FieldQuestResources.js';
const catalog = createGraphicsResourceCatalog(),
  sampler = createGraphicsResourceSampler(catalog),
  resources = createFieldQuestResources();
let checked = 0,
  storageReads = 0;
const oldWindow = globalThis.window;
globalThis.window = {
  get localStorage() {
    storageReads++;
    throw new Error('Field graphics cannot read player saves');
  },
};
try {
  for (const resource of resources) {
    assert.equal(catalog.get(resource.id).producer, 'field-quest');
    for (const action of resource.actions) {
      const scene = createFieldQuestReviewScene(resource, action);
      try {
        const production = scene.createRenderFrame(1),
          sample = sampler.sample(resource.id, { actionId: action.id });
        const actual = selectFieldQuestItems(production, resource);
        assert.ok(actual.length > 0);
        assert.deepEqual(sample.frame.items, actual);
        for (const scale of [0.5, 1.5]) {
          const presenter = new SceneCompositionPresenter();
          const rendered = presenter.resolve(sample.frame, {
            project: (p, parallax = 1) => ({
              x: (p.x - sample.frame.cameraOffset.x * parallax) * scale,
              y: (p.y - sample.frame.cameraOffset.y * parallax) * scale,
            }),
            viewport: { width: 960, height: 540 },
          });
          assert.ok(
            rendered.frame.items.length > 0,
            'disposed gameplay scene never invalidates retained field frame',
          );
        }
        assert.ok(
          sample.frame.items.every(
            (item) =>
              item.points.length > 2 &&
              item.points.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y)),
          ),
        );
        assert.equal(sample.fieldDiagnostics.statePreview, true);
        assert.match(sample.notes, /승인/);
        if (resource.fieldKind !== 'night-enemy') {
          const ids = new Set(actual.map((i) => i.id));
          assert.deepEqual(
            scene.fieldQuests
              .renderItems()
              .filter((i) => ids.has(i.id))
              .sort((a, b) => a.id.localeCompare(b.id)),
            [...actual].sort((a, b) => a.id.localeCompare(b.id)),
            'actual FieldQuestRuntime geometry is reused',
          );
        } else {
          assert.equal(
            scene.roomSceneNode.encounter.enemy.id,
            'quest:mine-night-workline:day:1:enemy',
          );
          assert.equal(sample.fieldDiagnostics.encounterId, scene.roomSceneNode.encounter.enemy.id);
        }
        if (resource.fieldKind === 'lamp') {
          assert.equal(
            scene.getProgressionSnapshot().quests.worldFacts['harbor-lamp-service'],
            action.outcome,
          );
          assert.equal(
            actual.find((i) => i.id === 'field-quest-lamp:bulb').emissive,
            !!action.night,
          );
          assert.equal(scene.fieldQuests.workLights().length, action.night ? 1 : 0);
        }
        const within = actual
          .flatMap((i) => i.points)
          .some((p) => p.x >= production.cameraOffset.x && p.x <= production.cameraOffset.x + 960);
        assert.ok(within, 'selected object remains in its scene viewport');
        checked++;
      } finally {
        scene.dispose();
      }
    }
  }
  const lamp = catalog.get('field:harbor-lamp');
  assert.notDeepEqual(
    sampler.sample(lamp.id, { actionId: 'serviced' }).frame.items,
    sampler.sample(lamp.id, { actionId: 'temporary' }).frame.items,
  );
  assert.equal(storageReads, 0);
  assert.equal(catalog.inventory.total, catalog.resources.length);
} finally {
  sampler.destroy();
  if (oldWindow === undefined) delete globalThis.window;
  else globalThis.window = oldWindow;
}
const coreScene = createGameScene();
try {
  const request = readVisualQaRequest('?visualQa=1&gameStart=scrap-intro-before');
  coreScene.setVisualQaScrapAwakeningStage(request.scenario.scrapAwakeningStageId);
  coreScene.setVisualQaLocation(request.scenario);
  const frame = coreScene.createRenderFrame(1);
  assert.ok(frame.items.some((i) => i.id === 'scrap-device-core'));
  const retained = {
    ...frame,
    scenePresentationForView: detachFieldScenePresentation(coreScene.scenePresentation),
  };
  const views = [
    { width: 320, height: 180, scale: 0.5, x: 400, y: 200 },
    { width: 1280, height: 720, scale: 2, x: 500, y: 250 },
    { width: 1920, height: 1080, scale: 6, x: 700, y: 280 },
    { width: 960, height: 540, scale: 8, x: 730, y: 320 },
  ];
  const expected = views.map(
    (view) =>
      new SceneCompositionPresenter().resolve(frame, {
        project: (p, parallax = 1) => ({
          x: (p.x - view.x * parallax) * view.scale,
          y: (p.y - view.y * parallax) * view.scale,
        }),
        viewport: view,
      }).frame.items,
  );
  coreScene.dispose();
  views.forEach((view, i) =>
    assert.deepEqual(
      new SceneCompositionPresenter().resolve(retained, {
        project: (p, parallax = 1) => ({
          x: (p.x - view.x * parallax) * view.scale,
          y: (p.y - view.y * parallax) * view.scale,
        }),
        viewport: view,
      }).frame.items,
      expected[i],
      'production core replacement/LOD/order survives scene disposal',
    ),
  );
} finally {
  if (!coreScene.isDisposed) coreScene.dispose();
}
const browser = await openQaBrowser({ width: 960, height: 540, search: 'PRODUCT_GOAL.html' });
try {
  await browser.until(`document.readyState === 'complete' && location.protocol === 'http:'`);
  const renders = [];
  for (const resource of resources)
    for (const action of resource.actions) {
      const result = await browser.evaluate(`(async()=>{
   const {createFieldQuestResources,sampleFieldQuestResource}=await import('/src/graphics/FieldQuestResources.js');
   const {CanvasHost}=await import('/src/rendering/CanvasHost.js');const {Camera2D}=await import('/src/rendering/Camera2D.js');const {CanvasPolygonRenderer}=await import('/src/rendering/CanvasPolygonRenderer.js');
   const resource=createFieldQuestResources().find(r=>r.id===${JSON.stringify(resource.id)}),action=resource.actions.find(a=>a.id===${JSON.stringify(action.id)});
   const canvas=document.createElement('canvas');canvas.style.cssText='width:480px;height:270px';document.body.append(canvas);const host=new CanvasHost(canvas,{renderWidth:960,renderHeight:540,maxPixelRatio:1});host.resize();const renderer=new CanvasPolygonRenderer(host,new Camera2D());
   try{const sampled=sampleFieldQuestResource(resource,action);const stats=renderer.render(sampled.frame,{transparent:true,showWorldGrid:false});const pixels=host.context.getImageData(0,0,canvas.width,canvas.height).data;let painted=0;for(let i=3;i<pixels.length;i+=4)if(pixels[i])painted++;return {id:resource.id,action:action.id,painted,finite:Number.isFinite(stats.logicalWidth)};}finally{canvas.remove();}
  })()`);
      renders.push(result);
    }
  assert.equal(renders.length, 11);
  assert.ok(
    renders.every((r) => r.painted > 0 && r.finite),
    'real CanvasPolygonRenderer paints all retained field samples',
  );
} finally {
  await browser.close();
}

console.log(
  JSON.stringify({
    status: 'PASS',
    resources: resources.length,
    states: checked,
    storageReads,
    checks: [
      'runtime-board-hidden-marker-outcome-geometry',
      'actual-accepted-night-encounter',
      'same-production-items-and-light-state',
      'selected-scene-visibility',
      'no-player-save-access-no-art-approval-claim',
    ],
  }),
);
