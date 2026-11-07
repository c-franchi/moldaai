import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {Miniflare} from 'miniflare';
import {handleAPI} from '../server/api.mjs';
const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("ok")}}',compatibilityDate:'2026-05-15',d1Databases:['DB'],r2Buckets:['BUCKET']});
const DB=await mf.getD1Database('DB'),BUCKET=await mf.getR2Bucket('BUCKET');
for(const file of readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort()){for(const sql of readFileSync('drizzle/'+file,'utf8').split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean))await DB.prepare(sql).run()}
const ADMIN_EMAIL='owner@example.test';
const env={DB,BUCKET,MOLDAE_ADMIN_EMAIL:ADMIN_EMAIL},origin='https://moldae.test';
const identities={admin:{'oai-authenticated-user-id':'owner-subject','oai-authenticated-user-email':ADMIN_EMAIL},viewer:{'oai-authenticated-user-id':'viewer-subject','oai-authenticated-user-email':'viewer@example.test'},other:{'oai-authenticated-user-id':'other-subject','oai-authenticated-user-email':'other@example.test'}};
async function req(path,{actor,method='GET',body,originHeader=origin}={}){return handleAPI(new Request(origin+path,{method,headers:{...identities[actor],...(method!=='GET'?{origin:originHeader}:{}),...(body&&!(body instanceof FormData)?{'content-type':'application/json'}:{})},...(body?{body:body instanceof FormData?body:JSON.stringify(body)}:{})}),env)}
const value={title:'Mini calendário Dinossauro 2027',slug:'calendario-dino',description:'Molde de calendário',short_description:'Um calendário de mesa',price_cents:1490,sale_price_cents:null,status:'draft',formats:['PDF'],license_text:'Uso pessoal e venda de peças físicas. Não revender o arquivo.',taxonomy_ids:[],featured:false,is_kit:false};
let product,fileId,mediaId;
after(()=>mf.dispose());
test('anonymous and viewer cannot access admin; origin checked before mutation',async()=>{
 assert.equal((await req('/api/admin/products')).status,401);
 assert.equal((await req('/api/admin/products',{actor:'viewer'})).status,403);
 assert.equal((await req('/api/admin/products',{actor:'admin',method:'POST',body:value,originHeader:'https://evil.test'})).status,403);
 assert.equal((await req('/api/checkout',{actor:'viewer',method:'POST',body:{}})).status,503);
});
test('creates persisted draft, classifies it, rejects duplicates and invalid prices',async()=>{
 let r=await req('/api/admin/taxonomies',{actor:'admin',method:'POST',body:{kind:'theme',label:'Dinossauros'}});assert.equal(r.status,201);value.taxonomy_ids=[(await r.json()).id];
 r=await req('/api/admin/products',{actor:'admin',method:'POST',body:value});assert.equal(r.status,201,await r.clone().text());product=(await r.json()).product;
 assert.equal((await req('/api/admin/products',{actor:'admin',method:'POST',body:value})).status,409);
 assert.equal((await req('/api/admin/products',{actor:'admin',method:'POST',body:{...value,slug:'bad-price',price_cents:-1}})).status,400);
 assert.equal((await req('/api/products').then(r=>r.json())).products.length,0);
 const saved=(await req('/api/admin/products',{actor:'admin'}).then(r=>r.json())).products[0];assert.equal(saved.title,value.title);assert.equal(saved.taxonomies[0].label,'Dinossauros');
 assert.equal((await req('/api/admin/products/'+product.id,{actor:'admin',method:'PATCH',body:{...value,status:'active',revision:product.revision}})).status,400);
});
test('checks file bytes and keeps originals private, including drafts and other user',async()=>{
 const bad=new FormData();bad.set('file',new File(['<script>evil</script>'],'fake.png',{type:'image/png'}));assert.equal((await req(`/api/admin/products/${product.id}/media`,{actor:'admin',method:'POST',body:bad})).status,415);
 const svg=new FormData();svg.set('file',new File(['<svg onload="alert(1)"></svg>'],'evil.svg'));assert.equal((await req(`/api/admin/products/${product.id}/files`,{actor:'admin',method:'POST',body:svg})).status,415);
 const png=Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64'));
 const media=new FormData();media.set('file',new File([png],'capa.png'));let r=await req(`/api/admin/products/${product.id}/media`,{actor:'admin',method:'POST',body:media});assert.equal(r.status,201,await r.clone().text());let data=await r.json();mediaId=data.id;product=data.product;
 const original=new FormData();original.set('file',new File(['%PDF-1.4\noriginal example\n%%EOF'],'molde.pdf'));r=await req(`/api/admin/products/${product.id}/files`,{actor:'admin',method:'POST',body:original});assert.equal(r.status,201,await r.clone().text());data=await r.json();fileId=data.id;product=data.product;
 assert.equal((await req('/api/media/'+mediaId,{actor:'viewer'})).status,404);
 assert.equal((await req('/api/admin/files/'+fileId+'/download',{actor:'viewer'})).status,403);
 assert.equal((await req('/api/download/'+fileId,{actor:'viewer'})).status,403);
 const download=await req('/api/admin/files/'+fileId+'/download',{actor:'admin'});assert.equal(download.status,200);assert.ok(download.headers.get('content-disposition').startsWith('attachment'));
});
test('activates only complete products, no private keys exposed, concurrent editing rejected',async()=>{
 let r=await req('/api/admin/products/'+product.id,{actor:'admin',method:'PATCH',body:{...value,status:'active',revision:product.revision}});assert.equal(r.status,200,await r.clone().text());const stale=product.revision;product=(await r.json()).product;
 const publicData=await req('/api/products').then(r=>r.json());assert.equal(publicData.products.length,1);assert.equal(publicData.products[0].files,undefined);assert.ok(!JSON.stringify(publicData).includes('digital-products/'));assert.ok(!JSON.stringify(publicData).includes('object_key'));
 assert.equal((await req('/api/media/'+mediaId)).status,200);
 assert.equal((await req('/api/admin/products/'+product.id,{actor:'admin',method:'PATCH',body:{...value,title:'Stale edit',revision:stale}})).status,409);
 assert.equal((await req('/api/admin/products',{actor:'admin'}).then(r=>r.json())).products[0].title,value.title);
});
test('library and download require a paid order belonging to exact user',async()=>{
 await req('/api/me',{actor:'viewer'});await req('/api/me',{actor:'other'});
 await DB.prepare("INSERT INTO orders(id,order_number,user_id,currency,subtotal_cents,discount_cents,total_cents,status,created_at) VALUES('order1','TEST1','viewer-subject','BRL',1490,0,1490,'pending','2026-11-07')").run();
 await DB.prepare('INSERT INTO order_items(id,order_id,product_id,product_title_snapshot,unit_price_cents,quantity) VALUES(?,?,?,?,?,1)').bind('item1','order1',product.id,value.title,1490).run();
 assert.equal((await req('/api/download/'+fileId,{actor:'viewer'})).status,403);
 assert.equal((await req('/api/me/downloads',{actor:'viewer'}).then(r=>r.json())).downloads.length,0);
 await DB.prepare("UPDATE orders SET status='paid' WHERE id='order1'").run();
 assert.equal((await req('/api/me/downloads',{actor:'viewer'}).then(r=>r.json())).downloads.length,1);
 assert.equal((await req('/api/download/'+fileId,{actor:'viewer'})).status,200);
 assert.equal((await req('/api/download/'+fileId,{actor:'other'})).status,403);
 assert.equal((await req('/api/me/orders',{actor:'other'}).then(r=>r.json())).orders.length,0);
 await DB.prepare("UPDATE orders SET status='refunded' WHERE id='order1'").run();assert.equal((await req('/api/download/'+fileId,{actor:'viewer'})).status,403);
});
test('deactivating original returns to draft, archive hides product without deleting history',async()=>{
 assert.equal((await req('/api/admin/files/'+fileId,{actor:'admin',method:'DELETE'})).status,200);
 assert.equal((await req('/api/products').then(r=>r.json())).products.length,0);
 assert.equal((await req('/api/admin/products/'+product.id,{actor:'admin',method:'DELETE'})).status,200);
 assert.equal((await req('/api/admin/products',{actor:'admin'}).then(r=>r.json())).products[0].status,'archived');
 assert.ok(await DB.prepare("SELECT * FROM order_items WHERE id='item1'").first());
});
