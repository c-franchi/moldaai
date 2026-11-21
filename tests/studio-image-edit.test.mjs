import test from 'node:test';import assert from 'node:assert/strict';
import {cropImage,resetImageCrop,imageSourceBox} from '../public/studio-image-edit.mjs';
import {scaleSelection,selectionBounds} from '../public/studio-selection.mjs';
import {validateDocument} from '../public/studio-model.mjs';
const image={id:'im',asset:'asset1',face:'page',x:30,y:30,w:100,h:80};
const doc={schema:1,structure:'art-a4',background:'#ffffff',images:[image],fields:[{id:'name',key:'name',x:60,y:50,w:60,h:20,size:36,minSize:12,color:'#000000',align:'center'}],paths:[{id:'cut',kind:'polygon',x:25,y:25,w:110,h:90,points:[[0,0],[1,0],[1,1],[0,1]],usage:'cut',color:'#999999',stroke:.2}],order:['cut','im','name']};
test('proportional multi-selection scales positions, fonts, cut geometry and crop together',()=>{
 const d=validateDocument(doc),ids=d.order,b=selectionBounds(d,ids),out=scaleSelection(d,ids,.8);
 for(const key of ['images','fields','paths']){const a=d[key][0],n=out[key][0];assert.ok(Math.abs(n.x-(b.x+(a.x-b.x)*.8))<1e-9);assert.equal(n.w,a.w*.8);assert.equal(n.h,a.h*.8);}
 assert.equal(out.fields[0].size,28.8);assert.deepEqual(out.paths[0].points,d.paths[0].points);assert.equal(doc.images[0].w,100);assert.throws(()=>scaleSelection(d,ids,.01));assert.throws(()=>scaleSelection(d,ids,5));
});
test('crop is reversible, composes repeated crops and preserves rotated source registration',()=>{
 for(const rotation of [0,45,90]){const im={...image,rotation};const out=cropImage(im,{x:.2,y:.1,w:.5,h:.6},{width:297,height:210});assert.equal(out.w,50);assert.equal(out.h,48);assert.deepEqual(out.crop,{x:.2,y:.1,w:.5,h:.6});const restored=resetImageCrop(out,{width:297,height:210});for(const k of ['x','y','w','h'])assert.ok(Math.abs(restored[k]-im[k])<1e-9);assert.equal(restored.crop,undefined);}
 const once=cropImage(image,{x:.2,y:0,w:.5,h:1},{width:297,height:210}),twice=cropImage(once,{x:.2,y:0,w:.5,h:1},{width:297,height:210});assert.ok(Math.abs(twice.crop.x-.3)<1e-9);assert.equal(twice.crop.w,.25);assert.equal(imageSourceBox(once).w,100);
 assert.throws(()=>validateDocument({...doc,images:[{...image,crop:{x:.8,y:0,w:.5,h:1}}]}));assert.deepEqual(validateDocument({...doc,images:[once]}).images[0].crop,once.crop);
});

test('image dimensions preserve ratio by default, allow independent sizing and persist the choice',async()=>{
 const {resizeImageDimension}=await import('../public/studio-image-edit.mjs');const page={width:210,height:297};
 assert.deepEqual(resizeImageDimension(image,'w',125,page),{w:125,h:100});
 assert.deepEqual(resizeImageDimension(image,'h',40,page),{w:50,h:40});
 const unlocked={...image,keepRatio:false};assert.deepEqual(resizeImageDimension(unlocked,'w',125,page),{w:125,h:80});
 assert.equal(validateDocument({...doc,images:[unlocked]}).images[0].keepRatio,false);
 assert.throws(()=>resizeImageDimension(image,'w',200,page));assert.throws(()=>resizeImageDimension(image,'h',NaN,page));assert.throws(()=>resizeImageDimension({...image,locked:true},'w',50,page));assert.equal(image.w,100);
});
