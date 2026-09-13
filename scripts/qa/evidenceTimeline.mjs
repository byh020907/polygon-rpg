import { readFileSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { wrapWikiReport } from '../wiki-document.mjs';

// Embed captured pixels, not a pose reconstruction. This also makes downloads
// work when the review HTML is opened directly from the filesystem.
export function writeEvidenceTimeline(
  directory,
  captures,
  { title = 'Actual renderer motion' } = {},
) {
  const tracks = {};
  for (const capture of captures) {
    const match = capture.file.match(/^(.+)-\d+\.png$/);
    if (!match) continue;
    const key = match[1];
    tracks[key] ??= [];
    tracks[key].push({
      time: Math.max(0, capture.milliseconds),
      file: capture.file,
      image: `data:image/png;base64,${readFileSync(join(directory, capture.file)).toString('base64')}`,
    });
  }
  const data = JSON.stringify(tracks).replaceAll('<', '\\u003c');
  const safeTitle = title.replaceAll('&', '&amp;').replaceAll('<', '&lt;');
  writeFileSync(
    join(directory, 'timeline.html'),
    wrapWikiReport(
      `<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${safeTitle}</title>
<style>.evidence-timeline .timeline-controls{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:16px 0}.evidence-timeline button,.evidence-timeline select{max-width:100%;font:inherit;padding:9px;color:inherit;background:#fafafa;border:1px solid #ccc;border-radius:2px}.evidence-timeline canvas{display:block;width:auto;max-width:100%;height:auto;max-height:60vh;background:repeating-conic-gradient(#28323a 0% 25%,#20282f 0% 50%) 0/24px 24px;image-rendering:auto}.evidence-timeline input{width:100%;margin:18px 0}.evidence-timeline output{display:block;margin-bottom:16px;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}</style>
<body><section class="evidence-timeline"><h2>Captured-frame playback</h2><p>These are captured production renderer pixels, played at their original recorded timestamps. Playback never synthesizes poses or inserts interpolated frames. Transparent actor tracks, when present, rerender the same immutable gameplay frame through the production renderer.</p>
<div class="timeline-controls"><label>Sequence <select id="track"></select></label><button id="play">Pause</button><button id="restart">Restart</button><button id="png">Download frame PNG</button><button id="sheet">Download frame sheet</button></div>
<canvas id="view"></canvas><input id="seek" type="range" min="0" step="1" value="0" aria-label="Captured frame"><output id="status"></output><p><a href="evidence.json">Capture timestamps and telemetry</a></p></section>
<script>
const tracks=${data};
const selector=document.querySelector('#track'),canvas=document.querySelector('#view'),ctx=canvas.getContext('2d'),seek=document.querySelector('#seek'),status=document.querySelector('#status');
let current=[],images=[],index=0,playing=true,start=performance.now(),loading=false,crop=null;
for(const name of Object.keys(tracks)){const option=document.createElement('option');option.value=name;option.textContent=name;selector.append(option)}
function draw(i){index=Math.max(0,Math.min(current.length-1,i));const im=images[index];if(!im)return;const r=crop??{x:0,y:0,width:im.width,height:im.height};if(canvas.width!==r.width||canvas.height!==r.height){canvas.width=r.width;canvas.height=r.height}ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(im,r.x,r.y,r.width,r.height,0,0,r.width,r.height);seek.value=index;status.textContent=current[index].file+' · '+Math.round(current[index].time)+' ms · frame '+(index+1)+' / '+current.length+' · original speed';}
async function load(){loading=true;current=tracks[selector.value]??[];images=await Promise.all(current.map(async f=>{const im=new Image();im.src=f.image;await im.decode();return im}));crop=null;if(selector.value.endsWith("-actor")&&images.length){const c=document.createElement("canvas");c.width=images[0].width;c.height=images[0].height;const q=c.getContext("2d",{willReadFrequently:true});let x0=c.width,y0=c.height,x1=0,y1=0;for(const im of images){q.clearRect(0,0,c.width,c.height);q.drawImage(im,0,0);const pixels=q.getImageData(0,0,c.width,c.height).data;for(let y=0;y<c.height;y+=2)for(let x=0;x<c.width;x+=2)if(pixels[(y*c.width+x)*4+3]){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y)}}if(x1>=x0){crop={x:Math.max(0,x0-12),y:Math.max(0,y0-12),width:x1-x0+25,height:y1-y0+25}}}seek.max=Math.max(0,current.length-1);draw(0);start=performance.now();loading=false}
function loop(now){if(playing&&!loading&&current.length){const duration=Math.max(1,current.at(-1).time-current[0].time+33);const t=(now-start)%duration+current[0].time;let i=0;while(i+1<current.length&&current[i+1].time<=t)i++;draw(i)}requestAnimationFrame(loop)}
function setPlaying(value){playing=value;document.querySelector('#play').textContent=playing?'Pause':'Play';start=performance.now()-(current[index]?.time??0)+(current[0]?.time??0)}
function download(data,name){const a=document.createElement('a');a.href=data;a.download=name;a.click()}
selector.onchange=load;document.querySelector('#play').onclick=()=>setPlaying(!playing);document.querySelector('#restart').onclick=()=>{draw(0);start=performance.now()};seek.oninput=()=>{setPlaying(false);draw(Number(seek.value))};document.querySelector('#png').onclick=()=>download(current[index].image,current[index].file);
document.querySelector('#sheet').onclick=()=>{if(!images.length)return;const r=crop??{x:0,y:0,width:images[0].width,height:images[0].height};const columns=8,w=256,h=Math.round(r.height/r.width*w),sheet=document.createElement('canvas');sheet.width=columns*w;sheet.height=Math.ceil(images.length/columns)*(h+24);const c=sheet.getContext('2d');c.imageSmoothingEnabled=true;images.forEach((im,i)=>{const x=(i%columns)*w,y=Math.floor(i/columns)*(h+24);c.drawImage(im,r.x,r.y,r.width,r.height,x,y,w,h);c.fillStyle='#151a20';c.fillRect(x,y+h,w,24);c.fillStyle='white';c.font='13px sans-serif';c.fillText(i+' · '+Math.round(current[i].time)+' ms',x+5,y+h+17)});download(sheet.toDataURL('image/png'),selector.value+'-sheet.png')};
load();requestAnimationFrame(loop);
</script></body></html>`,
      {
        title,
        category: '모션 검증 보고서',
        repoHref: `${relative(resolve(directory), fileURLToPath(new URL('../../', import.meta.url))).replaceAll('\\', '/') || '.'}/`,
      },
    ),
  );
}
