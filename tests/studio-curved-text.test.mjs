import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newDocument,validateDocument} from '../public/studio-model.mjs';
import {curvedTextLayout} from '../public/studio-curved-text.mjs';
import {renderStudioPDF} from '../server/studio-pdf.mjs';
import {PDFDocument} from 'pdf-lib';
import {writeFileSync} from 'node:fs';
const measure=(text,size)=>Array.from(text).length*size*.18;
const field={x:10,y:20,w:60,h:25,size:22,minSize:6,align:'center',curve:70};
test('curved text: inverse arcs mirror vertically, preserve graphemes and fit within editable bounds',()=>{
 const up=curvedTextLayout('Ana Clara',field,measure),down=curvedTextLayout('Ana Clara',{...field,curve:-70},measure);assert.equal(up.size,down.size);assert.equal(up.glyphs.length,9);assert.ok(up.glyphs[0].angle<0);assert.ok(down.glyphs[0].angle>0);
 for(let i=0;i<up.glyphs.length;i++){assert.ok(Math.abs(up.glyphs[i].x-down.glyphs[i].x)<1e-8);assert.ok(Math.abs(up.glyphs[i].y+down.glyphs[i].y-(field.y*2+field.h))<1e-8);}
 assert.ok(up.bounds.w<=field.w);assert.ok(up.bounds.h<=field.h);assert.equal(curvedTextLayout('Joa\u0303o',field,measure).glyphs.length,4);
 assert.equal(curvedTextLayout('',field,measure).glyphs.length,0);assert.throws(()=>curvedTextLayout('Nome muito grande',{...field,w:1,h:1},measure),/não cabe/);
});
test('curved text: schema persists signed curvature without changing old straight documents',()=>{
 const d=newDocument();assert.equal(validateDocument(d).fields[0].curve,undefined);d.fields[0].curve=65;d.fields[1].curve=-40;const saved=validateDocument(d);assert.equal(saved.fields[0].curve,65);assert.equal(saved.fields[1].curve,-40);
 for(const curve of [181,-181,NaN,'45',null])assert.throws(()=>validateDocument({...d,fields:[{...d.fields[0],curve}]}),/Curva/);
});
test('curved text PDF: named/static/age arcs, rotation, accents, scripts, two pages and immutable input',async()=>{
 const d=newDocument('milk-a4');Object.assign(d.fields[0],{curve:75,h:24,rotation:12});Object.assign(d.fields[1],{curve:-45,y:95,h:18});d.fields.push({...d.fields[1],id:'caption',key:'static',text:'Jardim Encantado',curve:60,x:42,y:70,w:52,h:25});
 const original=JSON.stringify(d),bytes=await renderStudioPDF(d,{name:'João Luís',age:'2 aninhos'},async()=>null);assert.equal((await PDFDocument.load(bytes)).getPageCount(),1);assert.equal(JSON.stringify(d),original);writeFileSync('/tmp/moldae-curved-text.pdf',bytes);
 d.printLayout.mode='two';const pdf=await renderStudioPDF(d,{name:'Ana Clara',age:'3 anos'},async()=>null,{delivery:true});assert.equal((await PDFDocument.load(pdf)).getPageCount(),3);
});
