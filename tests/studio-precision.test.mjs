import {test} from 'node:test';import assert from 'node:assert/strict';
import {worldPoints,connectionTargets,nearestConnection,movePathPoint,measureBetween,removeLayer} from '../public/studio-precision.mjs';
import {newDocument,validateDocument,lineDash} from '../public/studio-model.mjs';
const path={id:'line1',kind:'line',usage:'cut',x:80,y:70,w:35,h:15,points:[[0,.5],[1,.5]],color:'#444444',stroke:.25};
test('point snapping prioritizes endpoints, projects onto segments and excludes moving line',()=>{
 const d=newDocument();d.paths=[path];const targets=connectionTargets(d,'line1');assert.ok(!targets.points.some(p=>p.x===80&&p.y===77.5));const snap=nearestConnection({x:54.3,y:25.2},targets,1);assert.equal(snap.type,'endpoint');assert.equal(snap.x,54);assert.equal(snap.y,25);
 const projected=nearestConnection({x:76,y:25.4},targets,1);assert.equal(projected.type,'line');assert.equal(projected.y,25);assert.equal(projected.x,76);assert.equal(nearestConnection({x:4,y:4},targets,1),null);
});
test('extending a rotated endpoint beyond its old box preserves the stationary endpoint',()=>{
 for(const rotation of [0,35,90,180]){const l={...path,rotation},before=worldPoints(l),target={x:150,y:120},moved=movePathPoint(l,1,target,{width:297,height:210});assert.ok(moved);const after=worldPoints(moved);assert.ok(Math.hypot(after[0].x-before[0].x,after[0].y-before[0].y)<1e-8);assert.ok(Math.hypot(after[1].x-target.x,after[1].y-target.y)<1e-8);assert.doesNotThrow(()=>validateDocument({...newDocument(),paths:[moved]}));}
 assert.equal(movePathPoint({...path,locked:true},0,{x:50,y:50},{width:297,height:210}),null);
});
test('curve connections expose ends rather than control nodes; measurement is in physical mm',()=>{
 const d=newDocument('art-a4');d.baseLines=false;d.paths=[{...path,kind:'curve',points:[[0,1],[.5,0],[1,1]]}];const targets=connectionTargets(d);assert.equal(targets.points.length,2);assert.equal(targets.segments.length,24);assert.deepEqual(measureBetween({x:20,y:10},{x:50,y:50}),{distance:50,dx:30,dy:40,angle:Math.atan2(40,30)*180/Math.PI});
});
test('dash style is explicit and persists independently from cut/fold usage',()=>{
 const d=newDocument();d.paths=[{...path,dash:'dashed'}];const saved=validateDocument(d);assert.deepEqual(lineDash(saved.paths[0]),[2,1]);assert.deepEqual(lineDash({...path,usage:'fold',dash:'solid'}),[]);assert.deepEqual(lineDash({...path,dash:'dotted'}),[.3,1]);assert.throws(()=>validateDocument({...d,paths:[{...path,dash:'invalid'}]}));
});
test('delete accepts paths, text and images while preserving locks, ordering and source',()=>{
 const d=newDocument();d.paths=[path];d.images=[{id:'image1',asset:'a',face:'mold',x:60,y:70,w:20,h:20}];d.order=['name1','line1','image1','age1'];
 let removed=removeLayer(d,'line1');assert.equal(removed.paths.length,0);assert.deepEqual(removed.order,['name1','image1','age1']);removed=removeLayer(removed,'name1');assert.equal(removed.fields.length,1);removed=removeLayer(removed,'image1');assert.equal(removed.images.length,0);assert.doesNotThrow(()=>validateDocument(removed));assert.equal(d.paths.length,1);assert.throws(()=>removeLayer({...d,paths:[{...path,locked:true}]},'line1'),/Desbloqueie/);
});

test('PDF keeps tracejado and stroke in millimetres under the SVG scale transform',async()=>{
 const {renderStudioPDF}=await import('../server/studio-pdf.mjs'),{PDFDocument}=await import('pdf-lib'),{inflateSync}=await import('node:zlib');const d=newDocument();d.paths=[{...path,dash:'dashed',stroke:.7}];
 const pdf=await PDFDocument.load(await renderStudioPDF(d,{name:'Sophia',age:'1 aninho'},async()=>null));const stream=pdf.getPages()[0].node.Contents().lookup(0),ops=inflateSync(stream.getContents()).toString();assert.match(ops,/0\.7 w/);assert.match(ops,/\[\s*2\s+1\s*\]\s+0 d/);
});
