import test from 'node:test';import assert from 'node:assert/strict';
import {newDocument,CANDY_DIMENSIONS} from '../public/studio-model.mjs';
import {productionRules} from '../public/studio-production.mjs';
import {renderStudioPDF} from '../server/studio-pdf.mjs';
import {PDFDocument} from 'pdf-lib';
const doc=()=>{const d=newDocument('candy-lab');d.dimensions={...CANDY_DIMENSIONS};const {x,y,endH}=d.dimensions;d.paths=[{id:'a',x:x-7,y:y,w:7,h:2,kind:'line',usage:'cut',points:[[0,1],[1,0]],color:'#444444',stroke:.25},{id:'b',x:x-7,y:y+2,w:1,h:endH-4,kind:'line',usage:'cut',points:[[0,0],[0,1]],color:'#444444',stroke:.25},{id:'c',x:x-7,y:y+endH-2,w:7,h:2,kind:'line',usage:'cut',points:[[0,0],[1,1]],color:'#444444',stroke:.25}];return d;};
test('production rules preserve geometry and convert only a connected attached tab seam to fold',()=>{const d=doc(),original=structuredClone(d),rules=productionRules(d);assert.equal(rules.tabs.length,1);const x=d.dimensions.x,y=d.dimensions.y,end=y+d.dimensions.endH;assert.ok(rules.folds.some(([a,b])=>a[0]===x&&b[0]===x&&a[1]===y&&b[1]===end));assert.ok(!rules.cuts.some(([a,b])=>a[0]===x&&b[0]===x&&Math.min(a[1],b[1])===y&&Math.max(a[1],b[1])===end));assert.deepEqual(d,original);d.paths.pop();assert.equal(productionRules(d).tabs.length,0);});
test('delivery contains A4 mold and guide while test export remains one page',async()=>{const d=doc(),load=()=>null;const bytes=await renderStudioPDF(d,{name:'Sophia',age:'1 aninho'},load,{delivery:true,title:'Jardim Encantado',blankPersonalization:true,revision:3});const pdf=await PDFDocument.load(bytes);assert.equal(pdf.getPageCount(),2);assert.ok(Math.abs(pdf.getPage(0).getWidth()-297*72/25.4)<.001);assert.ok(Math.abs(pdf.getPage(0).getHeight()-210*72/25.4)<.001);const test=await PDFDocument.load(await renderStudioPDF(d,{name:'Sophia',age:'1 aninho'},load));assert.equal(test.getPageCount(),1);});

test('automatic contours saved white export a visible closed stroke above art, and full guide polygon',async()=>{
 const {automaticCutStyle}=await import('../public/studio-cut-style.mjs');const {inflateSync}=await import('node:zlib');
 const p={id:'autocut-test',kind:'polygon',usage:'cut',fill:'#ffffff',color:'#ffffff',stroke:.15,x:40,y:20,w:100,h:100,points:[[0,0],[1,0],[.8,.6],[1,1],[0,1]]};
 assert.equal(automaticCutStyle(p).color,'#8b717d');assert.equal(automaticCutStyle(p).stroke,.18);
 const d={schema:1,structure:'art-a4',background:'#ffffff',baseLines:false,images:[],fields:[],paths:[p,{id:'cover',kind:'rect',usage:'art',color:'#f0c0d0',stroke:.1,x:40,y:20,w:100,h:100,points:[[0,0],[1,1]]}],order:['autocut-test','cover']};
 const before=JSON.stringify(d),pdf=await PDFDocument.load(await renderStudioPDF(d,{name:'Sophia',age:'1 aninho'},()=>null,{delivery:true}));assert.equal(JSON.stringify(d),before);assert.equal(pdf.getPageCount(),2);
 const streams=page=>{const contents=page.node.Contents();return (contents.asArray?contents.asArray():[contents]).map(ref=>inflateSync(pdf.context.lookup(ref).getContents()).toString()).join('\n')};
 const mold=streams(pdf.getPage(0)),guide=streams(pdf.getPage(1));
 // Full five-vertex path has four line segments; old guide drew a single segment.
 assert.match(guide,/m\n(?:[^\n]+ l\n){4}h/);assert.ok(mold.lastIndexOf('0.5450980392156862')>mold.indexOf('0.9411764705882353'));
 const {assemblyInstructions}=await import('../public/studio-production.mjs');assert.match(assemblyInstructions(d).flat().join(' '),/Não corte os espaços brancos internos/);
});
