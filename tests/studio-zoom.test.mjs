import test from 'node:test';import assert from 'node:assert/strict';import {zoomLayout,clampZoom} from '../public/studio-zoom.mjs';
test('art near the top of the sheet stays at viewport center through zoom range',()=>{for(const zoom of [.15,.5,1,1.23,2,3])for(const ruler of [0,10]){const focus={x:148,y:52},l=zoomLayout({width:297,height:210,ruler,zoom,viewportWidth:730,viewportHeight:480,focus}),scale=2.5*zoom;assert.ok(Math.abs(l.left+(focus.x+ruler)*scale-l.scrollLeft-365)<1e-8);assert.ok(Math.abs(l.top+(focus.y+ruler)*scale-l.scrollTop-240)<1e-8);assert.ok(l.scrollLeft>=0&&l.scrollLeft<=l.stageWidth-730);assert.ok(l.scrollTop>=0&&l.scrollTop<=l.stageHeight-480);}});
test('fit centers the whole sheet and zoom input stays between 15 and 300 percent',()=>{assert.equal(clampZoom(.01),.15);assert.equal(clampZoom(9),3);assert.equal(clampZoom(NaN),1);const l=zoomLayout({width:297,height:210,ruler:10,zoom:1,viewportWidth:700,viewportHeight:500});assert.equal(l.left+l.sheetWidth/2-l.scrollLeft,350);assert.equal(l.top+l.sheetHeight/2-l.scrollTop,250);});

test('pinch keeps the touched sheet point under the moving midpoint',async()=>{
 const {pinchZoom}=await import('../public/studio-zoom.mjs');
 const input={startZoom:1,startDistance:100,distance:200,anchor:{x:80,y:60},midpoint:{x:120,y:150},viewportWidth:360,viewportHeight:500};
 const p=pinchZoom(input);
 assert.equal(p.zoom,2);
 assert.equal(180+80*2.5*p.zoom-p.scrollLeft,120);
 assert.equal(250+60*2.5*p.zoom-p.scrollTop,150);
 assert.equal(pinchZoom({...input,distance:9999}).zoom,3);
 assert.equal(pinchZoom({...input,distance:1}).zoom,.15);
});
