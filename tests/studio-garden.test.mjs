import test from 'node:test';
import assert from 'node:assert/strict';
import {GARDEN_ASSETS,GARDEN_PRESETS,gardenDocument} from '../public/studio-garden.mjs';
import {validateDocument} from '../public/studio-model.mjs';
import {impositionPlan} from '../public/studio-imposition.mjs';
const assets=Object.fromEntries(Object.keys(GARDEN_ASSETS).map(k=>[k,'asset-'+k]));
test('garden starters preserve independently editable artwork, live personalization and actual-size imposition',()=>{
 for(const key of Object.keys(GARDEN_PRESETS)){
  const d=gardenDocument(key,assets);assert.deepEqual(validateDocument(d),d);assert.ok(d.images.length>=5);assert.ok(d.paths.length<100);assert.equal(new Set(d.order).size,d.images.length+d.fields.length+d.paths.length);
  const before=structuredClone(d);d.images[0].x+=.5;validateDocument(d);assert.deepEqual(d.images.slice(1),before.images.slice(1));assert.deepEqual(d.fields,before.fields);
  if(key!=='toppers')assert.deepEqual(d.fields.map(f=>f.key),['name','age']);
  if(key!=='cake'){const plan=impositionPlan(d);assert.equal(plan.scale,1);assert.ok(plan.capacity>1);}
  else assert.equal(impositionPlan(d),null);
 }
 const toppers=gardenDocument('toppers',assets);for(const name of ['mushroom','fairy','birdhouse'])assert.ok(toppers.images.some(i=>i.asset===assets[name]));
 assert.throws(()=>gardenDocument('invalid',assets));
});

test('closed bases are single editable filled shapes with selectable clipping areas',async()=>{
 const {artAreas,imageLayersForAreas,pathData}=await import('../public/studio-model.mjs');const d=gardenDocument('toppers',assets);assert.equal(d.paths.length,15);assert.ok(d.paths.every(p=>p.kind==='polygon'));const areas=artAreas(d.structure,{paths:d.paths});const inner=areas.find(a=>a.label==='Topper 1 · área interna');assert.ok(inner);const layer=imageLayersForAreas(d,'asset-fairy',[inner.id],{width:100,height:100},{makeId:()=> 'added'})[0];assert.equal(layer.face,inner.id);assert.ok(pathData(d.paths[0]).endsWith(' Z'));assert.throws(()=>validateDocument({...d,paths:[{...d.paths[0],points:[[0,0],[1,1]]}]}));
});

test('automatic cut traces disconnected exterior pieces, adds margin and skips transparent holes',async()=>{
 const {traceMask}=await import('../public/studio-contour.mjs');const w=80,h=60,mask=new Uint8Array(w*h);for(let y=15;y<35;y++)for(let x=10;x<30;x++)mask[y*w+x]=1;for(let y=20;y<25;y++)for(let x=15;x<20;x++)mask[y*w+x]=0;for(let y=15;y<25;y++)for(let x=55;x<65;x++)mask[y*w+x]=1;
 const paths=traceMask(mask,w,h,{scale:1,margin:2});assert.equal(paths.length,2);const xs=paths.flat().map(p=>p[0]);assert.equal(Math.min(...xs),8);assert.equal(Math.max(...xs),67);assert.deepEqual(traceMask(new Uint8Array(w*h),w,h,{scale:1,margin:2}),[]);
});

test('uploaded cake composition retains registration, separate assets, live text and support bridges',async()=>{
 const {CAKE_ORIGINAL_ASSETS,originalCakeDocument}=await import('../public/studio-cake-original.mjs');
 const ids=Object.fromEntries(Object.keys(CAKE_ORIGINAL_ASSETS).map(k=>[k,'asset-'+k]));const d=originalCakeDocument(ids);
 assert.equal(d.images.length,7);assert.deepEqual(d.fields.map(f=>f.key),['name','age']);assert.equal(d.paths.filter(p=>p.fill==='#ffffff').length,2);
 const scale=d.images[0].w/(1166-22);
 for(const [key,a] of Object.entries(CAKE_ORIGINAL_ASSETS)){const im=d.images.find(i=>i.asset===ids[key]);assert.ok(Math.abs(im.x-(48+a.box[0]*scale))<.00001);assert.ok(Math.abs(im.y-(10+a.box[1]*scale))<.00001);}
 const copy=structuredClone(d);copy.images.find(i=>i.asset===ids.fairy).x+=2;validateDocument(copy);assert.deepEqual(copy.fields,d.fields);assert.deepEqual(copy.images.filter(i=>i.asset!==ids.fairy),d.images.filter(i=>i.asset!==ids.fairy));
});

test('reference tags preserve editable lettering, arched rectangle, hole and independent decorations',async()=>{
 const {referenceTagDocument}=await import('../public/studio-tag-reference.mjs');
 for(const key of ['round','rectangle']){const d=referenceTagDocument(key,{round:'round',rectangle:'rectangle',vine:'vine',butterfly:'butterfly'});assert.deepEqual(validateDocument(d),d);assert.equal(d.fields.length,2);assert.ok(d.fields.every(f=>f.font==='cookie'));assert.ok(d.images.some(i=>i.id==='butterfly'));assert.ok(d.paths.find(p=>p.id==='tag-hole'));assert.ok(impositionPlan(d).capacity>1);if(key==='rectangle'){const points=d.paths.find(p=>p.id==='tag-cut').points;assert.ok(points.some(p=>p[1]===0));assert.ok(points.some(p=>p[1]===.1));}}
});
