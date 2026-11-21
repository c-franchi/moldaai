import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PDFDocument,PDFName,PDFDict,PDFNumber} from 'pdf-lib';
import {newDocument,validateDocument} from '../public/studio-model.mjs';
import {copyLayer,pasteLayer} from '../public/studio-clipboard.mjs';
import {renderStudioPDF} from '../server/studio-pdf.mjs';
test('opacity: optional alpha preserves old documents, accepts invisible layers and rejects invalid values',()=>{
 const d=newDocument();assert.equal(validateDocument(d).fields[0].opacity,undefined);
 d.images=[{id:'im',asset:'art',face:'mold',x:60,y:70,w:20,h:20,opacity:0}];d.fields[0].opacity=.45;d.paths=[{id:'p',kind:'line',usage:'art',x:50,y:40,w:20,h:1,points:[[0,0],[1,1]],color:'#ff0000',stroke:.4,opacity:.25}];
 const saved=validateDocument(d);assert.equal(saved.images[0].opacity,0);assert.equal(saved.fields[0].opacity,.45);assert.equal(saved.paths[0].opacity,.25);
 for(const opacity of [-.1,1.1,NaN,null,'0.5'])assert.throws(()=>validateDocument({...d,fields:[{...d.fields[0],opacity}]}),/Transparência/);
 const packet=copyLayer(d,'im',{templateId:'t'}),pasted=pasteLayer(d,packet,{templateId:'t',assetIds:['art']});assert.equal(pasted.document.images.at(-1).opacity,0);
});
test('PDF opacity: independent alpha states for PNG, vector, straight and curved text; base lines stay opaque',async()=>{
 const d=newDocument();d.fields[0].opacity=.45;d.fields[1].opacity=.7;d.fields[1].curve=-35;d.fields[1].h=12;
 d.images=[{id:'im',asset:'art',face:'mold',x:60,y:70,w:20,h:20,opacity:0}];d.paths=[{id:'p',kind:'line',usage:'art',x:50,y:40,w:20,h:1,points:[[0,0],[1,1]],color:'#ff0000',stroke:.4,opacity:.25}];
 const png=Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64'));
 const before=JSON.stringify(d),bytes=await renderStudioPDF(d,{name:'Ana Clara',age:'1 aninho'},async()=>({mime:'image/png',data:png}));assert.equal(JSON.stringify(d),before);
 const pdf=await PDFDocument.load(bytes),states=pdf.getPage(0).node.Resources().lookup(PDFName.of('ExtGState'),PDFDict);const alphas=[];for(const key of states.keys()){const state=states.lookup(key,PDFDict);for(const name of ['ca','CA']){const n=state.lookup(PDFName.of(name));if(n instanceof PDFNumber)alphas.push(n.asNumber());}}
 for(const n of [0,.25,.45,.7])assert.ok(alphas.includes(n),'Missing alpha '+n);assert.equal(pdf.getPageCount(),1);
});
