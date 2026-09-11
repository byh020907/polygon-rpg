import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { openQaBrowser, wait } from './qa/BrowserHarness.mjs';
const out = 'artifacts/system-runtime';
fs.mkdirSync(out, { recursive: true });
for (const [name, width, height] of [
  ['desktop', 1280, 720],
  ['mobile', 844, 390],
]) {
  const b = await openQaBrowser({ width, height, search: '?graphicsReview=1&inputQa=1' });
  try {
    await b.until("document.querySelector('#graphics-review')?.dataset.ready==='true'");
    const { root } = await b.send('DOM.getDocument');
    const { nodeId } = await b.send('DOM.querySelector', {
      nodeId: root.nodeId,
      selector: '[data-gr=svg-file]',
    });
    await b.send('DOM.setFileInputFiles', {
      nodeId,
      files: [path.resolve('public/graphics/system-reference.master.svg')],
    });
    await b.until(
      "document.querySelector('#graphics-review').dataset.resourceId==='uploaded-svg:system-reference'",
    );
    await b.choose('[data-gr=action]', 'far:base');
    await b.screenshot(`${out}/${name}-svg-far.png`);
    await b.choose('[data-gr=action]', 'near:packed');
    await b.screenshot(`${out}/${name}-svg-pose.png`);
    await b.choose('[data-gr=action]', 'near:base');
    const selection = await b.evaluate('location.href');
    const saved = await b.evaluate('JSON.stringify({...localStorage})');
    await b.click('[data-gr=test]', name === 'mobile');
    await b.until(
      "globalThis.__POLYGON_RPG_INPUT_QA__?.raster?.scenePresentation?.objects?.some(o=>o.id==='svg-test-object')",
    );
    const x = await b.evaluate('__POLYGON_RPG_INPUT_QA__.player.position.x');
    await b.send('Input.dispatchKeyEvent', {
      type: 'keyDown',
      key: 'ArrowRight',
      code: 'ArrowRight',
      windowsVirtualKeyCode: 39,
    });
    await wait(250);
    await b.send('Input.dispatchKeyEvent', {
      type: 'keyUp',
      key: 'ArrowRight',
      code: 'ArrowRight',
      windowsVirtualKeyCode: 39,
    });
    assert.ok((await b.evaluate('__POLYGON_RPG_INPUT_QA__.player.position.x')) > x);
    await b.screenshot(`${out}/${name}-svg-test.png`);
    await b.click('#test-review-return');
    await b.until("!document.querySelector('#graphics-review').hidden");
    assert.equal(await b.evaluate('location.href'), selection);
    assert.equal(await b.evaluate('JSON.stringify({...localStorage})'), saved);
    await b.navigate('?visualQa=1&gameStart=scrap-intro-before&inputQa=1');
    await b.until(
      "globalThis.__POLYGON_RPG_INPUT_QA__?.raster?.scenePresentation?.objects?.some(o=>o.id==='world-control-core')",
    );
    await b.screenshot(`${out}/${name}-prologue-core.png`);
    assert.equal(
      await b.evaluate(
        "__POLYGON_RPG_INPUT_QA__.raster.scenePresentation.objects.filter(o=>o.id==='world-control-core').length",
      ),
      1,
    );
    // Render the actual GameScene SVG character sample through the same production Canvas renderer.
    const master = fs.readFileSync('scripts/fixtures/svg-character-system.master.svg', 'utf8');
    await b.evaluate(
      `(async()=>{const [{createGameScene},{compileSvgMaster},{WebGlCanvasHost},{WebGlPolygonRenderer},{Camera2D}]=await Promise.all([import('/src/app/createGameScene.js'),import('/src/graphics/svg/SvgAssetCompiler.js'),import('/src/rendering/WebGlCanvasHost.js'),import('/src/rendering/WebGlPolygonRenderer.js'),import('/src/rendering/Camera2D.js')]);const asset=compileSvgMaster(${JSON.stringify(master)});const scene=createGameScene();scene.setCharacterAnimationSettings({svgAsset:asset,svgRootFrame:[-100,-100,300,220]});const canvas=document.createElement('canvas');canvas.style.cssText='position:fixed;inset:0;width:100vw;height:100vh;z-index:9999;background:#111';document.body.append(canvas);const host=new WebGlCanvasHost(canvas);host.resize();const renderer=new WebGlPolygonRenderer(host,new Camera2D());let samples=0;for(const id of ['idle','slash','heavy','shieldBash'])for(const progress of [0,.2,.4,.6,.8]){const g=scene.samplePlayerCombatGeometry({id,progress,phase:'active',sequence:5});const f=scene.createRenderFrame(1);renderer.render({...f,items:g.svgPresentation.items,scenePresentation:null,scenePresentationForView:null,cameraOffset:{x:0,y:0}});samples++;}window.__SVG_ACTOR_QA__={samples,frame:scene.createRenderFrame(1).combatGeometry.svgPresentation};scene.dispose();renderer.destroy();host.destroy();})();`,
    );
    assert.equal(await b.evaluate('__SVG_ACTOR_QA__.samples'), 20);
    await b.screenshot(`${out}/${name}-svg-character.png`);
    assert.equal(b.events.filter((e) => e.method === 'Runtime.exceptionThrown').length, 0);
    console.log(
      name,
      'PASS native SVG upload/LOD/pose/test input/return/save + prologue identity + SVG character renderer',
    );
  } finally {
    await b.close();
  }
}
