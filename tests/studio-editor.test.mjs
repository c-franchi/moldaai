import {test} from 'node:test';import assert from 'node:assert/strict';
import {DraftSaver} from '../public/studio-autosave.mjs';
import {newDocument,validateDocument,geometry,artAreas,orderedLayers,moveLayer,syncLayerOrder,FONTS} from '../public/studio-model.mjs';
import {renderStudioPDF} from '../server/studio-pdf.mjs';import {PDFDocument} from 'pdf-lib';
const memory=()=>{const map=new Map();return {map,setItem:(k,v)=>map.set(k,v),getItem:k=>map.get(k),removeItem:k=>map.delete(k)}};
test('autosave: synchronous recovery copy, late response preserves newer edits, serialized revisions',async()=>{
 const storage=memory(),states=[];let template={id:'a',revision:1,document:newDocument(),title:'Original'},resolve,active=0,maxActive=0,sends=0;
 const saver=new DraftSaver({snapshot:()=>template,storage,key:t=>t.id,delay:100000,state:s=>states.push(s),accepted:(r,p,unchanged)=>{template.revision=r.revision;if(unchanged)template.title=r.title;},send:async payload=>{active++;maxActive=Math.max(active,maxActive);sends++;if(sends===1)await new Promise(r=>resolve=r);active--;return {...payload,revision:payload.revision+1};}});
 template.title='Primeira edição';saver.changed();assert.equal(JSON.parse(storage.getItem('a')).template.title,'Primeira edição');
 const first=saver.flush();template.title='Edição durante envio';saver.changed();resolve();await first;
 assert.equal(template.title,'Edição durante envio');assert.equal(template.revision,2);assert.ok(storage.getItem('a'));assert.equal(saver.pending,true);
 await saver.flush();assert.equal(template.revision,3);assert.equal(maxActive,1);assert.equal(storage.getItem('a'),undefined);assert.equal(states.at(-1),'saved');saver.cancel();
});
test('autosave: network failure keeps recovery, conflicts never overwrite another revision',async()=>{
 const storage=memory();let t={id:'a',revision:2,title:'Recover me'},status=0,sends=0;
 const saver=new DraftSaver({snapshot:()=>t,storage,key:t=>t.id,delay:100000,state:()=>{},accepted:()=>{},send:async()=>{sends++;throw Object.assign(new Error('failure'),{status});}});
 saver.changed();await assert.rejects(saver.flush());assert.ok(storage.getItem('a'));assert.equal(saver.pending,true);
 status=409;await assert.rejects(saver.flush());assert.equal(saver.conflict,true);await saver.flush();assert.equal(sends,2);assert.equal(JSON.parse(storage.getItem('a')).template.title,'Recover me');saver.cancel();
});
test('geometry: integral fold is rectangular and matches the face width; legacy unchanged',()=>{
 const old=geometry('candy-lab'),full=geometry('candy-closed');assert.equal(old.faces[0].points.length,16);assert.equal(full.faces[0].points.length,4);
 for(const a of artAreas('candy-closed').filter(a=>a.id.includes('fold'))){assert.equal(a.points.length,4);assert.equal(a.box.w,45);assert.equal(a.box.h,24);assert.equal(Math.max(...a.points.map(p=>p[0]))-Math.min(...a.points.map(p=>p[0])),45);}
 assert.deepEqual(full.faces.map(f=>f.box),old.faces.map(f=>f.box));
});
test('layer order and transforms survive validation; arbitrary fonts/order rejected',()=>{
 const d=newDocument();d.images=[{id:'img1',asset:'a',face:'mold',x:50,y:50,w:20,h:20,rotation:135}];d.fields[0].font='script';d.fields[0].rotation=-90;
 const moved=moveLayer(d,'img1','front');assert.equal(orderedLayers(moved).at(-1).id,'img1');assert.equal(validateDocument(moved).fields[0].font,'script');
 const back=moveLayer(moved,'name1','back');assert.equal(orderedLayers(back)[0].id,'name1');back.fields.pop();assert.doesNotThrow(()=>validateDocument(syncLayerOrder(back)));
 assert.throws(()=>validateDocument({...d,order:['img1','img1','age1']}));assert.throws(()=>validateDocument({...d,fields:[{...d.fields[0],font:'arbitrary'}]}));
});
test('PDF embeds every font, handles rotated names and images in mixed order',async()=>{
 const d=newDocument('candy-closed');d.fields=Object.keys(FONTS).map((font,i)=>({...d.fields[0],id:'text'+i,font,x:60+i*30,y:70,size:18,minSize:8,rotation:i*45,w:29,h:20}));
 d.images=[{id:'image1',asset:'a',face:'mold',x:80,y:80,w:25,h:25,rotation:35}];d.order=[...d.fields.map(l=>l.id),'image1'];
 const png=Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64'));
 const bytes=await renderStudioPDF(d,{name:'Sophia Áçã',age:'1 aninho'},async()=>({mime:'image/png',data:png}));const pdf=await PDFDocument.load(bytes);assert.equal(pdf.getPageCount(),1);assert.ok(bytes.length>15000);
});

test('editable candy dimensions retain area IDs, preserve necks and reject impossible measurements',async()=>{
 const {CANDY_DIMENSIONS}=await import('../public/studio-model.mjs');const p={...CANDY_DIMENSIONS,faceW:48,bodyH:51,foldH:28,inset:12};const g=geometry('candy-lab',p);assert.equal(g.faces[0].box.w,48);assert.equal(g.areas.find(a=>a.id==='face1-body').box.h,51);assert.equal(g.areas.find(a=>a.id==='face1-upper-fold').box.h,28);assert.equal(g.cuts.length,7);
 const d={...newDocument(),dimensions:p};assert.deepEqual(validateDocument(d).dimensions,p);assert.throws(()=>validateDocument({...d,dimensions:{...p,faceW:90}}));assert.throws(()=>geometry('candy-lab',{...p,inset:25}));
});
test('static text, vector nodes, locking and dimensions persist together and export as A4',async()=>{
 const {CANDY_DIMENSIONS,pathData}=await import('../public/studio-model.mjs');const d=newDocument();d.dimensions={...CANDY_DIMENSIONS};d.fields[0]={...d.fields[0],key:'static',text:'Cole aqui',locked:true};d.paths=[{id:'curve1',kind:'curve',usage:'fold',color:'#333333',stroke:.3,x:60,y:70,w:40,h:20,rotation:25,points:[[0,1],[.4,0],[1,1]]},{id:'line1',kind:'line',usage:'cut',color:'#444444',stroke:.25,x:70,y:80,w:30,h:10,points:[[0,.5],[1,.5]]}];d.order=[...d.fields.map(l=>l.id),...d.paths.map(l=>l.id)];const clean=validateDocument(d);assert.equal(clean.fields[0].text,'Cole aqui');assert.equal(clean.fields[0].locked,true);assert.match(pathData(clean.paths[0]),/ Q /);assert.equal(orderedLayers(clean).at(-1).id,'line1');
 const bytes=await renderStudioPDF(clean,{name:'Sophia',age:'1 aninho'},async()=>null);assert.equal((await PDFDocument.load(bytes)).getPageCount(),1);
 assert.throws(()=>validateDocument({...d,paths:[{...d.paths[0],points:[[0,0],[2,0],[1,1]]}]}));
});
test('text repair keeps rotation and text, fixes min font and rounded height overflow',async()=>{
 const {repairTextFields}=await import('../public/studio-model.mjs');const d=newDocument();d.fields[0]={...d.fields[0],rotation:90,minSize:40,h:2};assert.throws(()=>validateDocument(d),/Texto name1/);const repaired=repairTextFields(d);assert.doesNotThrow(()=>validateDocument(repaired));assert.equal(repaired.fields[0].rotation,90);assert.equal(repaired.fields[0].minSize,22);assert.equal(d.fields[0].minSize,40);
});
