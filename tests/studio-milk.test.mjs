import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PDFDocument} from 'pdf-lib';
import {newDocument,validateDocument,geometry,artAreas,imageLayersForAreas} from '../public/studio-model.mjs';
import {MILK_DIMENSIONS,milkGeometry,milkPrintPlan} from '../public/studio-milk.mjs';
import {renderStudioPDF} from '../server/studio-pdf.mjs';
import {writeFileSync} from 'node:fs';
test('Milk: four equal faces, distinct roof/body/base/cap/glue areas and four holes',()=>{
 const d=newDocument('milk-a4'),g=milkGeometry();assert.equal(g.faces.length,4);assert.equal(g.areas.length,16);assert.equal(g.glue.length,2);assert.equal(g.cuts.length,5);
 assert.equal(g.faces[1].label,'Frente');assert.equal(g.areas.filter(a=>a.group==='Corpo').length,4);assert.equal(g.areas.filter(a=>a.group==='Fundo de encaixe').length,4);assert.equal(g.areas.filter(a=>a.group==='Abas superiores com furos').length,2);
 for(const a of g.areas.filter(a=>a.group==='Corpo')){assert.ok(Math.abs(a.box.w-MILK_DIMENSIONS.faceW)<1e-8);assert.equal(a.box.h,MILK_DIMENSIONS.bodyH);}
 assert.ok(g.folds.some(([a,b])=>a[0]===153.8&&b[0]===153.8));assert.equal(geometry(d.structure).cuts.length,5);assert.equal(artAreas(d.structure).length,16);validateDocument(d);
 const changed={...d,dimensions:{...MILK_DIMENSIONS,faceW:50,bodyH:90}};validateDocument(changed);assert.ok(Math.abs(geometry(changed.structure,changed.dimensions).areas.find(a=>a.id==='milk-face2-body').box.w-50)<1e-8);
 assert.throws(()=>validateDocument({...d,dimensions:{...MILK_DIMENSIONS,faceW:90}}),/caber/);
 const images=imageLayersForAreas(d,'asset',['milk-face1-body','milk-face2-body'],{width:600,height:900});assert.equal(images.length,2);validateDocument({...d,images});
});
test('Milk: persisted two-page settings reject impossible page sizes and keep geometry/art intact',()=>{
 const d=newDocument('milk-a4'),before=JSON.stringify(d);d.printLayout.mode='two';const result=validateDocument(d),p=milkPrintPlan(result);assert.equal(p.split,153.8);assert.equal(p.scale,1.35);assert.equal(p.tab,8);assert.equal(result.printLayout.seam,2);
 assert.throws(()=>validateDocument({...d,printLayout:{...d.printLayout,scale:2}}),/não cabe/);assert.throws(()=>validateDocument({...d,printLayout:{...d.printLayout,seam:4}}),/Divisão/);
 assert.equal(JSON.stringify(geometry('milk-a4')),JSON.stringify(geometry('milk-a4')));assert.equal(JSON.parse(before).printLayout.mode,'single');
});
test('Milk PDF: single A4, two portrait A4 parts with calibration, optional assembly guide',async()=>{
 const d=newDocument('milk-a4'),single=await renderStudioPDF(d,{name:'Ana Clara',age:'2 aninhos'},async()=>null);assert.equal((await PDFDocument.load(single)).getPageCount(),1);
 d.printLayout.mode='two';const source=JSON.stringify(d);const bytes=await renderStudioPDF(d,{name:'Sophia',age:'1 aninho'},async()=>null);writeFileSync('/tmp/milk-two-test.pdf',bytes);
 const pdf=await PDFDocument.load(bytes);assert.equal(pdf.getPageCount(),2);for(const p of pdf.getPages()){assert.ok(Math.abs(p.getWidth()-210*72/25.4)<.001);assert.ok(Math.abs(p.getHeight()-297*72/25.4)<.001);}
 assert.equal(JSON.stringify(d),source);const delivery=await renderStudioPDF(d,{name:'Sophia',age:'1 aninho'},async()=>null,{delivery:true,title:'Caixa Milk Jardim Encantado',theme:'Jardim Encantado',revision:1});assert.equal((await PDFDocument.load(delivery)).getPageCount(),3);writeFileSync('/tmp/milk-delivery-test.pdf',delivery);
});
