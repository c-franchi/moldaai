import {test} from 'node:test';import assert from 'node:assert/strict';
import {copyLayer,pasteLayer} from '../public/studio-clipboard.mjs';import {newDocument,validateDocument,orderedLayers,MAX_IMAGE_LAYERS} from '../public/studio-model.mjs';
const options={templateId:'template-a',origin:'https://moldae.test',makeId:()=> 'copy1'};
const line={id:'line1',kind:'curve',usage:'fold',dash:'dotted',x:80,y:70,w:35,h:15,rotation:45,points:[[0,1],[.5,0],[1,1]],color:'#444444',stroke:.7};
test('clipboard preserves curve geometry, text and image properties; pasted layers are independent and in front',()=>{
 const d=newDocument();d.paths=[line];d.fields[0].font='script';d.fields[0].rotation=90;d.images=[{id:'image1',asset:'asset1',face:'mold',x:50,y:60,w:20,h:30}];
 for(const id of ['line1','name1','image1']){const packet=copyLayer(d,id,options),original=structuredClone(packet.layer),result=pasteLayer(d,packet,{templateId:'template-a',assetIds:['asset1'],makeId:()=> 'pasted'}),copy=orderedLayers(result.document).at(-1);assert.equal(copy.id,'pasted');assert.equal(copy.x,original.x+2);assert.equal(copy.y,original.y+2);assert.equal(copy.rotation,original.rotation);assert.equal(copy.font,original.font);assert.equal(copy.asset,original.asset);assert.equal(copy.dash,original.dash);assert.deepEqual(copy.points,original.points);assert.equal(orderedLayers(d).length,4);assert.doesNotThrow(()=>validateDocument(result.document));if(copy.points){copy.points[1][0]=.8;assert.equal(line.points[1][0],.5);assert.equal(packet.layer.points[1][0],.5);}}
});
test('clipboard repeated pastes use new ids, respect page boundaries and unlock copies without altering source',()=>{
 const d=newDocument();d.paths=[{...line,x:262,y:195,w:35,h:15,locked:true}];const packet=copyLayer(d,'line1',options);let n=0;const result=pasteLayer(d,packet,{templateId:'template-a',count:20,makeId:()=> 'p'+(++n)});const copy=result.document.paths.at(-1);assert.equal(copy.x,262);assert.equal(copy.y,195);assert.notEqual(copy.locked,true);assert.equal(d.paths[0].locked,true);assert.ok(copy.x+copy.w<=297&&copy.y+copy.h<=210);
});
test('clipboard refuses foreign images, malformed data, duplicate IDs and overflow; supports text across templates',()=>{
 const d=newDocument();d.images=[{id:'image1',asset:'asset1',face:'mold',x:50,y:60,w:20,h:20}];const packet=copyLayer(d,'image1',options);assert.throws(()=>pasteLayer(d,packet,{templateId:'template-b',assetIds:['asset1']}),/origem/);assert.throws(()=>pasteLayer(d,packet,{templateId:'template-a',assetIds:[]}),/origem/);assert.throws(()=>pasteLayer(d,{...packet,version:2}));assert.throws(()=>pasteLayer(d,{...packet,layer:{...packet.layer,w:NaN}},{templateId:'template-a',assetIds:['asset1']}));
 const text=copyLayer(d,'name1',options);assert.doesNotThrow(()=>pasteLayer(d,text,{templateId:'template-b'}));assert.throws(()=>pasteLayer(d,text,{templateId:'template-a',makeId:()=> 'name1'}));
 const full={...d,images:Array.from({length:MAX_IMAGE_LAYERS},(_,i)=>({...d.images[0],id:'img'+i}))};assert.throws(()=>pasteLayer(full,packet,{templateId:'template-a',assetIds:['asset1']}),/Limite/);assert.equal(full.images.length,MAX_IMAGE_LAYERS);
});

test('paste to another area changes clipping and centers image without resizing or changing opacity',async()=>{
 const {artAreas}=await import('../public/studio-model.mjs');const d=newDocument('milk-a4'),areas=artAreas(d.structure),a=areas[0],b=areas[2];
 d.images=[{id:'im',asset:'asset1',face:a.id,x:a.box.x,y:a.box.y,w:15,h:12,rotation:30,opacity:.4}];
 const before=structuredClone(d),packet=copyLayer(d,'im',options),result=pasteLayer(d,packet,{templateId:'template-a',assetIds:['asset1'],targetArea:b.id});const copy=result.document.images.at(-1);
 assert.equal(copy.face,b.id);assert.equal(copy.w,15);assert.equal(copy.h,12);assert.equal(copy.rotation,30);assert.equal(copy.opacity,.4);
 assert.ok(Math.abs(copy.x+copy.w/2-b.box.x-b.box.w/2)<.001);assert.ok(Math.abs(copy.y+copy.h/2-b.box.y-b.box.h/2)<.001);assert.deepEqual(d,before);
 assert.throws(()=>pasteLayer(d,packet,{templateId:'template-a',assetIds:['asset1'],targetArea:'missing'}),/área válida/);
});
test('destination preserves relative group geometry and resolves areas underneath objects',async()=>{
 const {artAreas}=await import('../public/studio-model.mjs');const {areaAtPoint}=await import('../public/studio-clipboard.mjs');const d=newDocument(),a=artAreas(d.structure).find(a=>a.id.endsWith('-body'));
 d.paths=[{...line,group:'g',rotation:0},{...line,id:'line2',x:100,y:90,group:'g',rotation:0}];
 const packet=copyLayer(d,'line1',options);let i=0;const result=pasteLayer(d,packet,{templateId:'template-a',targetArea:a.id,makeId:()=> 'q'+(++i)}),[x,y]=result.document.paths.slice(-2);
 assert.equal(y.x-x.x,20);assert.equal(y.y-x.y,20);assert.equal(x.group,y.group);assert.notEqual(x.group,'g');
 assert.equal(areaAtPoint(d,{x:a.box.x+a.box.w/2,y:a.box.y+a.box.h/2}).id,a.id);assert.equal(areaAtPoint(d,{x:0,y:0}),null);
});
