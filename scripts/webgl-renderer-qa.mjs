import assert from 'node:assert/strict';
import fs from 'node:fs';
import { openQaBrowser } from './qa/BrowserHarness.mjs';

const outputDirectory = 'artifacts/webgl-renderer';
fs.mkdirSync(outputDirectory, { recursive: true });
const browser = await openQaBrowser({
  width: 800,
  height: 500,
  search: '?visualQa=1&gameStart=scrap-art-benchmark',
});

try {
  await browser.until('globalThis.__POLYGON_RPG_VISUAL_QA__?.ready === true');
  const result = await browser.evaluate(`(async()=>{
    const [{WebGlCanvasHost},{WebGlPolygonRenderer},{Camera2D}]=await Promise.all([
      import('/src/rendering/WebGlCanvasHost.js'),
      import('/src/rendering/WebGlPolygonRenderer.js'),
      import('/src/rendering/Camera2D.js')
    ]);
    const canvas=document.createElement('canvas');
    canvas.style.cssText='position:fixed;right:10px;bottom:10px;width:180px;height:180px;background:#000;z-index:99999';
    document.body.append(canvas);
    const host=new WebGlCanvasHost(canvas,{renderWidth:18,renderHeight:18,maxPixelRatio:1});
    host.resize();
    const camera=new Camera2D({x:9,y:9,worldWidth:18,worldHeight:18});
    const renderer=new WebGlPolygonRenderer(host,camera);
    const points=[{x:1,y:1},{x:15,y:1},{x:1,y:15}];
    const item=(id,depths,fill,extra={})=>({id,depthGroup:'actor',points,depths,fill,...extra});
    const base={
      worldSize:{width:18,height:18},gridSize:18,palette:{background:'#000000',arena:'#000000',ground:'#000000',grid:'#000000',outline:'#111416'},
      cameraOffset:{x:0,y:0},items:[],scenePresentation:null,scenePresentationForView:null
    };
    const sample=(data,x,y)=>{
      const px=Math.max(0,Math.min(data.width-1,Math.floor(x*10)));
      const py=Math.max(0,Math.min(data.height-1,Math.floor(y*10)));
      const index=((data.height-1-py)*data.width+px)*4;
      return Array.from(data.data.slice(index,index+4));
    };
    const render=(items)=>{
      const stats=renderer.render({...base,items},{transparent:true,showWorldGrid:false});
      return {stats,pixels:renderer.readPixelsForQa()};
    };
    const red=item('red',[0,14,0],'#ff0000');
    const blue=item('blue',[7,7,7],'#0000ff');
    const crossed=render([red,blue]);
    const crossedReverse=render([blue,red]);
    const rearTrail=item('rear-trail',[4,4,4],'#00ff00',{opacity:.5,depthWrite:false});
    const frontTrail=item('front-trail',[20,20,20],'#00ff00',{opacity:.5,depthWrite:false});
    const rear=render([blue,rearTrail]);
    const front=render([blue,frontTrail]);
    const rearOutline=render([item('rear-outline',[0,0,0],'#ff0000',{stroke:'#ffffff',lineWidth:3}),blue]);
    const boxPoints=[{x:3,y:3},{x:10,y:3},{x:10,y:10},{x:3,y:10}];
    const box={id:'box',depthGroup:'actor',points:boxPoints,depths:[5,5,5,5],fill:'#708090',stroke:'#383838',lineWidth:1};
    const outline=render([box]);
    const cachedDepthStats=render([red,blue]).stats;
    const cachedOutlineStats=render([box]).stats;
    const beforeResize={...crossed.stats};
    canvas.style.width='240px';canvas.style.height='120px';host.resize();
    const afterResize=renderer.render({...base,items:[blue]},{transparent:true,showWorldGrid:false});
    const disposeCanvas=document.createElement('canvas');
    disposeCanvas.style.cssText='width:18px;height:18px';document.body.append(disposeCanvas);
    const disposeHost=new WebGlCanvasHost(disposeCanvas,{renderWidth:18,renderHeight:18,maxPixelRatio:1});
    disposeHost.resize();
    const disposeRenderer=new WebGlPolygonRenderer(disposeHost,camera);
    disposeRenderer.render({...base,items:[blue]},{transparent:true,showWorldGrid:false});
    const disposeGl=disposeHost.context;
    const disposeResources={...disposeRenderer.resources};
    disposeRenderer.destroy();disposeHost.destroy();disposeCanvas.remove();
    const disposed=!disposeGl.isBuffer(disposeResources.buffer)&&!disposeGl.isVertexArray(disposeResources.vertexArray)&&!disposeGl.isProgram(disposeResources.program);
    const extension=host.context.getExtension('WEBGL_lose_context');
    let lossSupported=Boolean(extension),lost=false,restored=false,restoreTimedOut=false;
    if(extension){
      const lostEvent=new Promise(resolve=>canvas.addEventListener('webglcontextlost',()=>resolve(),{once:true}));
      extension.loseContext();await lostEvent;
      lost=renderer.render({...base,items:[blue]},{transparent:true}).contextLost===true;
      const restoredEvent=new Promise(resolve=>canvas.addEventListener('webglcontextrestored',()=>resolve(),{once:true}));
      extension.restoreContext();
      const restoreEventObserved=await Promise.race([
        restoredEvent.then(()=>true),
        new Promise(resolve=>setTimeout(()=>resolve(false),5000))
      ]);
      restoreTimedOut=!restoreEventObserved;
      if(restoreEventObserved) restored=renderer.render({...base,items:[blue]},{transparent:true,showWorldGrid:false}).contextLost===false;
    }
    const answer={
      crossingFar:sample(crossed.pixels,3,3),crossingNear:sample(crossed.pixels,10,2),
      crossingReverseFar:sample(crossedReverse.pixels,3,3),crossingReverseNear:sample(crossedReverse.pixels,10,2),
      rearTrail:sample(rear.pixels,3,3),frontTrail:sample(front.pixels,3,3),
      rearOutline:sample(rearOutline.pixels,3,3),outerOutline:sample(outline.pixels,2.8,5),
      beforeResize,afterResize,cachedDepthStats,cachedOutlineStats,disposed,lossSupported,lost,restored,restoreTimedOut
    };
    renderer.destroy();host.destroy();canvas.remove();
    return answer;
  })()`);

  assert.ok(result.crossingFar[2] > 240 && result.crossingFar[0] < 15);
  assert.ok(result.crossingNear[0] > 240 && result.crossingNear[2] < 15);
  assert.deepEqual(result.crossingReverseFar, result.crossingFar);
  assert.deepEqual(result.crossingReverseNear, result.crossingNear);
  assert.ok(result.rearTrail[2] > 240 && result.rearTrail[1] < 15);
  assert.ok(result.frontTrail[1] > 100 && result.frontTrail[2] > 100);
  assert.ok(
    result.frontTrail[3] > 250,
    'straight-alpha source-over keeps opaque destination alpha',
  );
  assert.ok(result.rearOutline[2] > 240, 'rear outline must not bleed through nearer fill');
  assert.ok(result.outerOutline[3] > 220, 'visible opaque silhouette remains present');
  assert.equal(result.beforeResize.renderer, 'webgl2-gpu');
  assert.equal(result.cachedDepthStats.topologyCacheMisses, 0);
  assert.ok(result.cachedDepthStats.topologyCacheHits >= 2);
  assert.equal(result.cachedOutlineStats.strokeCacheMisses, 0);
  assert.ok(result.cachedOutlineStats.strokeCacheHits >= 1);
  assert.equal(result.afterResize.backingWidth, 240);
  assert.equal(result.afterResize.backingHeight, 120);
  assert.equal(result.disposed, true);
  if (result.lossSupported) {
    assert.equal(result.lost, true);
    if (!result.restoreTimedOut) assert.equal(result.restored, true);
  }
  const gameLossSupported = await browser.evaluate(`(()=>{
    const canvas=document.querySelector('#game-canvas');
    const extension=canvas.getContext('webgl2')?.getExtension('WEBGL_lose_context');
    extension?.loseContext();
    return Boolean(extension);
  })()`);
  if (gameLossSupported) {
    const notice = await browser.until(`(()=>{
      const node=document.querySelector('.render-recovery-status');
      return node?.textContent?.includes('그래픽 장치를 복구하는 중')&&getComputedStyle(node).display!=='none';
    })()`);
    assert.equal(notice, true);
    await browser.screenshot(`${outputDirectory}/context-lost-user-notice.png`);
  }
  assert.equal(
    browser.events.filter((event) => event.method === 'Runtime.exceptionThrown').length,
    0,
  );
  await browser.screenshot(`${outputDirectory}/depth-alpha-outline-context.png`);
  fs.writeFileSync(`${outputDirectory}/evidence.json`, JSON.stringify(result, null, 2));
  console.log(
    `WebGL2 depth/alpha/outline/resize/context-loss browser QA: PASS${result.restoreTimedOut ? ' (headless context restore unverified)' : ''}`,
  );
} finally {
  await browser.close();
}

const unsupportedBrowser = await openQaBrowser({
  width: 800,
  height: 500,
  browserArguments: ['--disable-webgl'],
});
try {
  const unsupported = await unsupportedBrowser.until(`(()=>{
    const loading=document.querySelector('.app-loading');
    return loading?.textContent?.includes('WebGL2 그래픽을 지원하지 않습니다')
      ? {message:loading.textContent,noticeVisible:loading.getBoundingClientRect().width>0&&getComputedStyle(loading).display!=='none'}
      : null;
  })()`);
  assert.equal(unsupported.noticeVisible, true);
  console.log('WebGL2 unsupported-environment notice browser QA: PASS');
} finally {
  await unsupportedBrowser.close();
}

const reviewLossBrowser = await openQaBrowser({
  width: 960,
  height: 640,
  search: '?graphicsReview=1&resource=player%3Aprotagonist&reviewCategory=player',
});
try {
  await reviewLossBrowser.until(
    "document.querySelector('#graphics-review')?.dataset.ready === 'true'",
  );
  const reviewLossSupported = await reviewLossBrowser.evaluate(`(()=>{
    const canvas=document.querySelector('[data-gr="canvas"]');
    const extension=canvas.getContext('webgl2')?.getExtension('WEBGL_lose_context');
    extension?.loseContext();
    return Boolean(extension);
  })()`);
  if (reviewLossSupported) {
    const reviewNotice = await reviewLossBrowser.until(
      "document.querySelector('[data-gr=\"status\"]')?.textContent?.includes('그래픽 장치를 복구하는 중')",
    );
    assert.equal(reviewNotice, true);
  }
  console.log('Graphics review context-loss user notice browser QA: PASS');
} finally {
  await reviewLossBrowser.close();
}
