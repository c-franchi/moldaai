import test from 'node:test';
import assert from 'node:assert/strict';
import {addTag,roundTagCuts} from '../public/studio-tags.mjs';
import {artAreas,validateDocument,imageClipPolygons} from '../public/studio-model.mjs';
import {areaAtPoint} from '../public/studio-clipboard.mjs';
import {faceGuideAreas,faceGuidesSVG,centerGuidesSVG} from '../public/studio-face-guides.mjs';
import {smoothCircle} from '../public/studio-circle.mjs';
import {renderStudioPDF} from '../server/studio-pdf.mjs';
import {PDFDocument} from 'pdf-lib';
const fixture=()=>validateDocument({schema:1,structure:'art-a4',background:'#ffffff',baseLines:false,images:[{id:'giraffe',asset:'animal',face:'shape-base',x:63,y:63,w:44,h:38,opacity:.8,crop:{x:.1,y:0,w:.8,h:1}}],fields:[{id:'name',key:'name',x:65,y:102,w:40,h:8,size:18,minSize:8,color:'#889933',align:'center',font:'italic'}],paths:[{id:'tag-cut',label:'Tag redonda',kind:'ellipse',usage:'cut',x:60,y:60,w:50,h:50,points:[[0,0],[1,1]],color:'#333333',stroke:.2},{id:'base',label:'Círculo',kind:'ellipse',usage:'art',x:62,y:62,w:46,h:46,points:[[0,0],[1,1]],fill:'#fff1dd',color:'#eecc99',stroke:.5}],order:['tag-cut','base','giraffe','name'],imposition:{enabled:false,margin:10,gap:3,quantity:0}});
let n=0;const opts={makeId:()=> 'copy'+(++n)};
test('three independent tags keep real dimensions, order, images, clipping and texts through save/reload',()=>{
 const d=fixture(),before=structuredClone(d),second=addTag(d,{...opts,mode:'copy'}),third=addTag(second.document,{...opts,mode:'blank',sourceId:second.cutId}),result=validateDocument(JSON.parse(JSON.stringify(third.document)));
 assert.deepEqual(d,before);assert.equal(roundTagCuts(result).length,3);assert.equal(result.images.length,2);assert.equal(result.fields.length,2);
 const cuts=roundTagCuts(result);assert.deepEqual(cuts.map(p=>[p.x,p.y,p.w,p.h]),[[60,60,50,50],[115,60,50,50],[170,60,50,50]]);
 const copy=result.images[1];assert.notEqual(copy.id,d.images[0].id);assert.notEqual(copy.face,d.images[0].face);assert.equal(copy.asset,'animal');assert.equal(copy.opacity,.8);assert.deepEqual(copy.crop,d.images[0].crop);assert.equal(copy.x-d.images[0].x,55);
 assert.ok(imageClipPolygons(result.structure,copy.face,undefined,result.paths).every(ps=>ps.every(([x])=>x>=117&&x<=163)));
 result.images[1].asset='other';result.fields[1].key='static';result.fields[1].text='Outra arte';assert.equal(result.images[0].asset,'animal');assert.equal(result.fields[0].key,'name');assert.doesNotThrow(()=>validateDocument(result));
 assert.equal(areaAtPoint(result,{x:170.5,y:85}).id,third.areaId);assert.ok(artAreas(result.structure,{paths:result.paths}).some(a=>a.id===third.areaId));
});
test('guides align with the tag rather than the A4 center, and blank tags have their own center and clip',()=>{
 const d=fixture(),before=structuredClone(d),r=addTag(d,{...opts,mode:'blank'}),areas=faceGuideAreas(r.document);assert.deepEqual(areas.map(a=>a.box.x),[60,115]);
 assert.match(faceGuidesSVG(d,{x:80,y:74,w:10,h:10}),/M 85 60 V 110/);assert.doesNotMatch(faceGuidesSVG(d,{x:80,y:74,w:10,h:10}),/148.5/);
 assert.match(centerGuidesSVG(r.document),/M 140 60 V 110 M 115 85 H 165/);assert.match(centerGuidesSVG(d),/pointer-events="none"/);assert.deepEqual(d,before);
 assert.equal(areaAtPoint(r.document,{x:115.5,y:85}).id,r.areaId);assert.equal(imageClipPolygons('art-a4',r.areaId,undefined,r.document.paths).length,1);
});
test('adding a tag is atomic on layer limit and lack of free space; old polygon circles remain supported',()=>{
 const d=fixture();d.fields=Array.from({length:24},(_,i)=>({...d.fields[0],id:'text'+i}));delete d.order;const before=structuredClone(d);assert.throws(()=>addTag(d,{mode:'copy'}),/camadas/);assert.deepEqual(d,before);
 const large=fixture();large.paths[0]={...large.paths[0],x:10,y:10,w:190,h:190};assert.throws(()=>addTag(large),/espaço livre/);
 const polygon=fixture();polygon.paths[0].kind='polygon';polygon.paths[0].points=Array.from({length:120},(_,i)=>[.5+.5*Math.cos(i*Math.PI/60),.5+.5*Math.sin(i*Math.PI/60)]);assert.equal(roundTagCuts(polygon).length,1);assert.doesNotThrow(()=>addTag(polygon,opts));
});
test('smoothing one tag preserves other cuts, per-tag clip references and layer order',()=>{
 const r=addTag(fixture(),{...opts,mode:'copy'}),before=structuredClone(r.document),clean=smoothCircle(r.document,r.cutId);assert.equal(roundTagCuts(clean).length,2);assert.deepEqual(clean.paths.find(p=>p.id==='tag-cut'),before.paths.find(p=>p.id==='tag-cut'));assert.deepEqual(clean.images,before.images);assert.deepEqual(clean.order,before.order);
 const d=fixture();d.images[0].face='shape-tag-cut';const result=smoothCircle(d);assert.equal(result.images[0].face,'shape-smooth-circle-cut');assert.equal(result.order[0],'smooth-circle-cut');
});
test('page-wide legacy name boxes do not block three copies and keep their text anchors',()=>{
 const d=fixture();Object.assign(d.fields[0],{x:0,w:170});const before=structuredClone(d),second=addTag(d,{...opts,mode:'copy'}),third=addTag(second.document,{...opts,mode:'copy',sourceId:second.cutId});
 assert.equal(roundTagCuts(third.document).length,3);assert.deepEqual(d,before);assert.deepEqual(third.document.fields[0],d.fields[0]);assert.equal(third.document.fields[1].w,50);assert.equal(third.document.fields[1].x+25,140);assert.equal(third.document.fields[2].x+25,195);assert.equal(third.document.fields[1].size,d.fields[0].size);
});
test('PDF exports three different tags together at A4 size without editor guides',async()=>{
 let d=addTag(fixture(),{...opts,mode:'copy'}).document;d=addTag(d,{...opts,mode:'copy'}).document;d.fields.forEach((f,i)=>{f.key='static';f.text=['Modelo A','Modelo B','Modelo C'][i];});
 const png=Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64'));
 const bytes=await renderStudioPDF(d,{name:'Lucca',age:''},async()=>({mime:'image/png',data:png}));const pdf=await PDFDocument.load(bytes);assert.equal(pdf.getPageCount(),1);assert.ok(Math.abs(pdf.getPage(0).getWidth()-297*72/25.4)<.01);assert.equal(d.fields.length,3);assert.ok(!JSON.stringify(d).includes('editor-center-guides'));
});
