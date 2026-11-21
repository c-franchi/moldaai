import test from 'node:test';
import assert from 'node:assert/strict';
import {cachepotDocument} from '../public/studio-cachepot.mjs';
import {setCachepotStandardEdge,setCachepotEdgeProfile} from '../public/studio-cachepot-shape.mjs';
import {validateDocument} from '../public/studio-model.mjs';
const world=p=>p.points.map(([u,v])=>[p.x+u*p.w,p.y+v*p.h]);
const near=(a,b)=>a.forEach((v,i)=>assert.ok(Math.abs(v-b[i])<1e-7));
test('standard arcs follow each angled chord with constant circular radius and proportional automatic height',()=>{
 for(const part of [1,2])for(const count of [1,2,4,12]){
  const source=cachepotDocument(part),d=setCachepotStandardEdge(source,{count});
  assert.equal(d.cachepotEdge.style,'circular');assert.equal(d.cachepotEdge.gap,undefined);
  for(const id of ['cachepot-face0','cachepot-face1']){
   const original=world(source.paths.find(p=>p.id===id)),top=world(d.paths.find(p=>p.id===id)),a=top[0],b=top.at(-3),length=Math.hypot(b[0]-a[0],b[1]-a[1]),ux=(b[0]-a[0])/length,uy=(b[1]-a[1])/length,w=length/count,h=d.cachepotEdge.height,r=(w*w/4+h*h)/(2*h);
   near(a,original[0]);near(b,original.at(-3));near(top.at(-2),original.at(-2));near(top.at(-1),original.at(-1));
   assert.equal(top.length,count*48+3);
   for(let n=0;n<count;n++)for(let j=0;j<=48;j++){
    const p=top[n*48+j],x=(p[0]-a[0])*ux+(p[1]-a[1])*uy-n*w,y=(p[0]-a[0])*uy-(p[1]-a[1])*ux;
    assert.ok(Math.abs((x-w/2)**2+(y+r-h)**2-r*r)<1e-6,'constant radius across entire arc, including its endpoints');
    if(j===0||j===48)assert.ok(Math.abs(y)<1e-7,'valleys on inclined chord');
   }
  }
  assert.deepEqual(d.images,source.images);assert.deepEqual(d.fields,source.fields);assert.deepEqual(d.paths.filter(p=>p.usage==='fold'),source.paths.filter(p=>p.usage==='fold'));
  assert.deepEqual(validateDocument(JSON.parse(JSON.stringify(d))),d);
 }
});
test('converting legacy gap profiles is explicit, idempotent and reversible to straight',()=>{
 const source=setCachepotEdgeProfile(cachepotDocument(),{height:7.5,gap:15}),before=structuredClone(source),standard=setCachepotStandardEdge(source,{count:4});
 assert.deepEqual(source,before);assert.deepEqual(setCachepotStandardEdge(standard,{count:4}),standard);
 const straight=setCachepotStandardEdge(standard,{style:'straight'});assert.equal(straight.paths.find(p=>p.id==='cachepot-face0').points.length,4);
 for(const count of [0,13,NaN])assert.throws(()=>setCachepotStandardEdge(source,{count}));
});
