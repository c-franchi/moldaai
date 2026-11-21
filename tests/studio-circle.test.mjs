import test from 'node:test';
import assert from 'node:assert/strict';
import {smoothCircle} from '../public/studio-circle.mjs';
import {referenceTagDocument} from '../public/studio-tag-reference.mjs';
import {pathData} from '../public/studio-model.mjs';
test('circular cut replaces raster trace with four smooth Béziers and preserves editable artwork',()=>{
 const doc=referenceTagDocument('round',{round:'round',rectangle:'rectangle',vine:'vine',butterfly:'butterfly'}),old=structuredClone(doc);
 const result=smoothCircle(doc),circle=result.paths.find(p=>p.id==='smooth-circle-cut');
 assert.equal(circle.kind,'ellipse');assert.equal(circle.w,circle.h);assert.equal((pathData(circle).match(/C/g)||[]).length,4);assert.ok(pathData(circle).endsWith('Z'));
 assert.deepEqual(result.images,old.images);assert.deepEqual(result.fields,old.fields);assert.deepEqual(doc,old);assert.equal(result.paths.find(p=>p.id==='tag-hole').kind,'ellipse');assert.deepEqual(smoothCircle(result),result);
 assert.throws(()=>smoothCircle(referenceTagDocument('rectangle',{round:'r',rectangle:'q',vine:'v',butterfly:'b'})),/redonda/);
});
