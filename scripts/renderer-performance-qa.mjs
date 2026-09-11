import fs from 'node:fs';
import path from 'node:path';
import { openQaBrowser } from './qa/BrowserHarness.mjs';

const args = new Map();
for (let index = 2; index < process.argv.length; index += 2) {
  args.set(process.argv[index].replace(/^--/, ''), process.argv[index + 1]);
}

const label = args.get('label') ?? 'current';
const iterations = Math.max(30, Number(args.get('iterations') ?? 90));
const renderOnly = args.get('render-only') === '1';
const stressCopies = Math.max(0, Math.min(8, Number(args.get('stress-copies') ?? 0)));
const outputDirectory = path.resolve(args.get('output') ?? 'artifacts/webgl-migration');
const scenarios = (
  args.get('scenarios') ?? 'scrap-art-benchmark,combat-hit,pose-roll,scrap-garage-0'
)
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);
const viewports = [
  { id: 'desktop', width: 1280, height: 720, mobile: false },
  { id: 'mobile', width: 844, height: 390, mobile: true },
];

function percentile(values, ratio) {
  if (!values.length) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * ratio))];
}

function summarize(values) {
  return {
    count: values.length,
    mean: values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length),
    p50: percentile(values, 0.5),
    p95: percentile(values, 0.95),
    p99: percentile(values, 0.99),
    max: Math.max(...values, 0),
  };
}

fs.mkdirSync(outputDirectory, { recursive: true });
const results = [];
for (const viewport of viewports) {
  for (const scenario of scenarios) {
    const browser = await openQaBrowser({
      width: viewport.width,
      height: viewport.height,
      search: `?visualQa=1&inputQa=1&gameStart=${scenario}&visualQaPhase=active`,
    });
    try {
      await browser.send('Emulation.setDeviceMetricsOverride', {
        width: viewport.width,
        height: viewport.height,
        deviceScaleFactor: 1,
        mobile: viewport.mobile,
      });
      await browser.send('Page.reload', { ignoreCache: true });
      await browser.until('globalThis.__POLYGON_RPG_VISUAL_QA__?.ready === true');
      const capabilities = await browser.evaluate(`(()=>{
        const canvas=document.createElement('canvas');
        const gl=canvas.getContext('webgl2');
        return {
          webgl2:Boolean(gl),
          renderer:gl?.getParameter(gl.RENDERER)??null,
          vendor:gl?.getParameter(gl.VENDOR)??null,
          heap:performance.memory?.usedJSHeapSize??null
        };
      })()`);
      const sample = await browser.evaluate(`(async()=>{
        let lastRendererStats=null;
        const renderSample=()=>lastRendererStats=${stressCopies > 0 ? `globalThis.__POLYGON_RPG_RENDER_STRESS_QA__(${stressCopies})` : renderOnly ? 'globalThis.__POLYGON_RPG_VISUAL_QA_RENDER__()' : 'globalThis.__POLYGON_RPG_PERFORMANCE_QA_STEP__?.()??globalThis.__POLYGON_RPG_VISUAL_QA_RENDER__()'};
        for(let index=0;index<12;index+=1) renderSample();
        const beforeHeap=performance.memory?.usedJSHeapSize??null;
        const costs=[];
        const intervals=[];
        const heapSamples=[];
        let previous=0;
        await new Promise((resolve)=>{
          let remaining=${iterations};
          const tick=(now)=>{
            if(previous) intervals.push(now-previous);
            previous=now;
            const started=performance.now();
            renderSample();
            costs.push(performance.now()-started);
            if(remaining%15===0&&performance.memory) heapSamples.push(performance.memory.usedJSHeapSize);
            remaining-=1;
            if(remaining>0) requestAnimationFrame(tick); else resolve();
          };
          requestAnimationFrame(tick);
        });
        return {
          costs,
          intervals,
          heapSamples,
          beforeHeap,
          afterHeap:performance.memory?.usedJSHeapSize??null,
          renderer:globalThis.__POLYGON_RPG_INPUT_QA__?.raster?.renderer??'cpu-depth-canvas2d',
          stats:typeof lastRendererStats?.renderer==='string'?lastRendererStats:(globalThis.__POLYGON_RPG_INPUT_QA__?.raster??null),
          stages:globalThis.__POLYGON_RPG_PERFORMANCE_QA__??null
        };
      })()`);
      const entry = {
        label,
        renderOnly,
        stressCopies,
        scenario,
        viewport: viewport.id,
        size: { width: viewport.width, height: viewport.height },
        capabilities,
        renderMilliseconds: summarize(sample.costs),
        frameIntervalMilliseconds: summarize(sample.intervals),
        longFrames: sample.intervals.filter((value) => value > 34).length,
        heapDeltaBytes:
          sample.beforeHeap === null || sample.afterHeap === null
            ? null
            : sample.afterHeap - sample.beforeHeap,
        heapSamples: sample.heapSamples,
        heapPeakBytes: sample.heapSamples.length ? Math.max(...sample.heapSamples) : null,
        renderer: sample.renderer,
        rendererStats: sample.stats,
        stages: sample.stages,
      };
      results.push(entry);
      await browser.screenshot(
        path.join(outputDirectory, `${label}-${viewport.id}-${scenario}.png`),
      );
      fs.writeFileSync(
        path.join(outputDirectory, `${label}.json`),
        JSON.stringify({ label, iterations, renderOnly, stressCopies, results }, null, 2),
      );
      console.log(
        `${label} ${viewport.id} ${scenario}: render p50=${entry.renderMilliseconds.p50.toFixed(2)}ms p95=${entry.renderMilliseconds.p95.toFixed(2)}ms frame p95=${entry.frameIntervalMilliseconds.p95.toFixed(2)}ms`,
      );
    } finally {
      await browser.close();
    }
  }
}

const output = path.join(outputDirectory, `${label}.json`);
fs.writeFileSync(
  output,
  JSON.stringify({ label, iterations, renderOnly, stressCopies, results }, null, 2),
);
console.log(`Renderer performance evidence: ${output}`);
