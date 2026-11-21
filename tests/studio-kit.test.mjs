import test from 'node:test';
import assert from 'node:assert/strict';
import {kitItemsWithVariants} from '../server/studio-kit.mjs';
import {newDocument} from '../public/studio-model.mjs';
test('single-sheet milk variant retains every finalized image, field and geometry without modifying source',()=>{
 const document=newDocument('milk-a4');document.printLayout={mode:'two',scale:1.35,tab:8,seam:2};const source={template_id:'milk',source_revision:419,title:'Caixa Milk · 2 folhas',document},before=structuredClone(source);
 const result=kitItemsWithVariants([source],true);assert.equal(result.length,2);assert.equal(result[1].document.printLayout.mode,'single');assert.deepEqual(result[1].document.images,source.document.images);assert.deepEqual(result[1].document.fields,source.document.fields);assert.deepEqual(result[1].document.dimensions,source.document.dimensions);assert.deepEqual(source,before);assert.equal(kitItemsWithVariants([source],false).length,1);
});
