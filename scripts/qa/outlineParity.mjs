// Compare captured pixels only. Actor-only extras and actual world occlusion
// remain visible in the coordinate report; this is evidence, not a blanket pass.
export const outlineParityExpression = `(async()=>{
  const main=document.createElement('canvas'),actor=document.createElement('canvas');
  const mc=main.getContext('2d',{willReadFrequently:true}),ac=actor.getContext('2d',{willReadFrequently:true});
  const reports=[];let overlayPng=null;
  for(let index=0;index<globalThis.__motionFrames.length;index++){
    const frame=globalThis.__motionFrames[index];
    const images=await Promise.all([frame.png,frame.actorPng].map(async source=>{const im=new Image();im.src=source;await im.decode();return im}));
    if(images[0].width!==images[1].width||images[0].height!==images[1].height)throw new Error('Same-frame PNG dimensions differ');
    const width=images[0].width,height=images[0].height;main.width=actor.width=width;main.height=actor.height=height;
    mc.drawImage(images[0],0,0);ac.drawImage(images[1],0,0);
    const game=mc.getImageData(0,0,width,height).data,cutout=ac.getImageData(0,0,width,height).data;
    let outlinePixels=0,mismatchCount=0;const mismatches=[];
    for(let y=1;y<height-1;y++)for(let x=1;x<width-1;x++){
      const offset=(y*width+x)*4;
      if(cutout[offset+3]!==255||Math.max(cutout[offset],cutout[offset+1],cutout[offset+2])>64)continue;
      if([offset-4,offset+4,offset-width*4,offset+width*4].every(n=>cutout[n+3]>=128))continue;
      outlinePixels++;
      if(Math.max(...[0,1,2].map(c=>Math.abs(game[offset+c]-cutout[offset+c])))<=8)continue;
      mismatchCount++;
      if(mismatches.length<256)mismatches.push({x,y,actor:[...cutout.slice(offset,offset+4)],game:[...game.slice(offset,offset+4)]});
      if(index===0){mc.fillStyle='#ff365d';mc.fillRect(x,y,1,1)}
    }
    if(index===0)overlayPng=main.toDataURL('image/png');
    reports.push({index,milliseconds:frame.milliseconds,width,height,outlinePixels,mismatchCount,mismatches});
  }
  return {definition:'Opaque dark actor boundary pixels (RGB max <=64, alpha255, adjacent alpha<128); mismatch RGB delta>8. Coordinates are backing pixels.',reports,overlayPng};
})()`;
