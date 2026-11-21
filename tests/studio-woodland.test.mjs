import test from 'node:test';
import assert from 'node:assert/strict';
import {WOODLAND_MODELS,woodlandDocument} from '../public/studio-woodland.mjs';
import {geometry,validateDocument} from '../public/studio-model.mjs';
test('six woodland arts preserve heart cuts and tabs, keep independent clipped layers and custom dimensions',()=>{
 const dimensions={heart:1,base:38};
 for(const model of WOODLAND_MODELS){const d=woodlandDocument(model,{character:'animal',leaves:'foliage'},dimensions);assert.deepEqual(geometry(d.structure,d.dimensions).cuts,geometry('brigadeiro-petal',dimensions).cuts);assert.equal(d.images.filter(l=>l.asset==='animal').length,4);assert.equal(d.images.filter(l=>l.asset==='foliage').length,8);assert.equal(new Set(d.order).size,d.order.length);assert.deepEqual(validateDocument(d),d);assert(d.images.every(l=>l.face.startsWith('sweet-face')));assert(d.paths.every(l=>l.usage==='art'));}
});
