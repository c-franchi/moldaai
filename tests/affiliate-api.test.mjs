import {test,after} from 'node:test';import assert from 'node:assert/strict';import {readFileSync,readdirSync} from 'node:fs';import {Miniflare} from 'miniflare';import {handleAPI} from '../server/api.mjs';import {safeAffiliateURL} from '../server/affiliate-api.mjs';
const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("ok")}}',compatibilityDate:'2026-05-15',d1Databases:['DB'],r2Buckets:['BUCKET']});const DB=await mf.getD1Database('DB'),BUCKET=await mf.getR2Bucket('BUCKET');
for(const f of readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())for(const sql of readFileSync('drizzle/'+f,'utf8').split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean))await DB.prepare(sql).run();
const origin='https://moldae.test',env={DB,BUCKET,MOLDAE_ADMIN_EMAIL:'admin@example.test'},headers=actor=>actor?{'oai-authenticated-user-id':actor,'oai-authenticated-user-email':actor+'@example.test'}:{};
async function req(path,{actor,method='GET',body,originHeader=origin}={}){return handleAPI(new Request(origin+path,{method,headers:{...headers(actor),...(method!=='GET'?{origin:originHeader}:{}),...(body&&!(body instanceof FormData)?{'content-type':'application/json'}:{})},...(body?{body:body instanceof FormData?body:JSON.stringify(body)}:{})}),env);}
const admin=async()=>{const r=await req('/api/admin/affiliates',{actor:'admin'});assert.equal(r.status,200);return r.json();};let seed,copyId,category,market,created;
after(()=>mf.dispose());
test('affiliate management requires server admin and mutation origin; public seed is idempotent and never enters digital catalog',async()=>{
 assert.equal((await req('/api/admin/affiliates')).status,401);assert.equal((await req('/api/admin/affiliates',{actor:'viewer'})).status,403);
 assert.equal((await req('/api/admin/affiliates/products',{actor:'admin',method:'POST',body:{},originHeader:'https://evil.test'})).status,403);
 const r=await req('/api/affiliates');assert.equal(r.status,200);const d=await r.json();assert.equal(d.products.length,2);seed=d.products.find(p=>p.id==='epson-l3250');assert.equal(seed.id,'epson-l3250');assert.equal(seed.offers[0].url,'https://meli.la/1EJzL9T');assert.equal(seed.price_cents,97678);assert.equal(seed.rating,4.9);assert.equal(seed.stale,true);assert.equal(seed.price_checked_at,null);assert.match(seed.images[0].url,/epson-l3250/);
 const again=await (await req('/api/affiliates')).json();assert.equal(again.products.length,2);assert.equal((await DB.prepare('SELECT COUNT(*) AS n FROM products').first()).n,0);
 const digital=await req('/api/products');assert.equal((await digital.json()).products.length,0);assert.equal((await req('/api/checkout',{method:'POST',body:{product_id:seed.id}})).status,503);
});
test('URL validation preserves the exact affiliate query and rejects unsafe URLs, credentials and lookalike hosts',()=>{
 const m={domains:['meli.la','mercadolivre.com.br']},url='https://meli.la/ABC?tag=a%2Fb&x=1#ref';assert.equal(safeAffiliateURL(url,m),url);
 for(const value of ['javascript:alert(1)','http://meli.la/a','https://meli.la.evil.com/a','https://evil.com/?url=https://meli.la','https://user:pass@meli.la/a','https://meli.la:444/a','https://127.0.0.1/a','https://meli.la/a\n'])assert.throws(()=>safeAffiliateURL(value,m));
});
test('manual link resolver does not fetch external URLs or claim an automatic connection',async()=>{
 const r=await req('/api/admin/affiliates/resolve',{actor:'admin',method:'POST',body:{url:'https://meli.la/1EJzL9T'}});const d=await r.json();assert.equal(d.url,seed.offers[0].url);assert.equal(d.marketplace_id,'mercado-livre');assert.equal(d.integration,'unavailable');assert.equal((await req('/api/admin/affiliates/resolve',{actor:'admin',method:'POST',body:{url:'https://evil.test'}})).status,400);
});
test('clicks aggregate anonymously by day/product/market and never become sales or orders',async()=>{
 for(let i=0;i<2;i++){const r=await req('/api/affiliates/epson-l3250/click',{method:'POST',body:{marketplace_id:'mercado-livre'}});assert.equal(r.status,200);assert.equal((await r.json()).url,seed.offers[0].url);}
 assert.equal((await req('/api/affiliates/epson-l3250/click',{method:'POST',body:{marketplace_id:'amazon'}})).status,400);
 const d=await admin();assert.equal(d.summary.clicks,2);assert.equal(d.clicks.length,1);assert.equal(d.clicks[0].clicks,2);assert.deepEqual(Object.keys(d.clicks[0]).sort(),['clicks','day','marketplace_id','product_id']);assert.equal(d.summary.sales,undefined);assert.equal((await DB.prepare('SELECT COUNT(*) AS n FROM orders').first()).n,0);
});
test('categories and marketplace CRUD protect in-use records, reject unsafe domains and keep deletions across requests',async()=>{
 let r=await req('/api/admin/affiliates/categories',{actor:'admin',method:'POST',body:{name:'Materiais de teste',active:true}});assert.equal(r.status,201);category=(await r.json()).item;
 r=await req('/api/admin/affiliates/marketplaces',{actor:'admin',method:'POST',body:{name:'Parceiro de teste',active:true,domains:['partner.example.com']}});assert.equal(r.status,201);market=(await r.json()).item;
 assert.equal((await req('/api/admin/affiliates/categories/impressoras',{actor:'admin',method:'DELETE'})).status,409);
 assert.equal((await req('/api/admin/affiliates/marketplaces',{actor:'admin',method:'POST',body:{name:'Inválido',domains:['127.0.0.1']}})).status,400);
 assert.equal((await req('/api/admin/affiliates/marketplaces/amazon',{actor:'admin',method:'DELETE'})).status,200);assert.ok(!(await admin()).marketplaces.some(m=>m.id==='amazon'));
});
test('manual product create/edit/conflict/photo validation and admin duplication persist independently',async()=>{
 let r=await req('/api/admin/affiliates/products',{actor:'admin',method:'POST',body:{...seed,title:'Produto manual',category_id:category.id,status:'draft',images:[],offers:[{marketplace_id:market.id,url:'https://partner.example.com/product?a=1'}]}});assert.equal(r.status,201);created=(await r.json()).id;
 let p=(await admin()).products.find(p=>p.id===created);assert.ok(p);assert.equal(p.offers[0].url,'https://partner.example.com/product?a=1');
 assert.equal((await req('/api/admin/affiliates/products/'+created,{actor:'admin',method:'PUT',body:{...p,status:'active'}})).status,400);
 assert.equal((await req('/api/admin/affiliates/products/'+created,{actor:'admin',method:'PUT',body:{...p,images:[{url:'https://attacker.com/fake.png'}]}})).status,400);
 r=await req('/api/admin/affiliates/products/'+seed.id+'/duplicate',{actor:'admin',method:'POST',body:{revision:seed.revision}});assert.equal(r.status,201);copyId=(await r.json()).id;let copy=(await admin()).products.find(p=>p.id===copyId);assert.equal(copy.status,'draft');assert.equal(copy.offers[0].url,seed.offers[0].url);assert.equal(copy.images.length,1);
 assert.equal((await req('/api/admin/affiliates/products/'+copyId,{actor:'admin',method:'PUT',body:{...copy,title:'Cópia editada'}})).status,200);
 assert.equal((await req('/api/admin/affiliates/products/'+copyId,{actor:'admin',method:'PUT',body:copy})).status,409);
 assert.equal((await admin()).products.find(p=>p.id===seed.id).title,seed.title);
});
test('mobile/desktop multipart images validate file signatures, private drafts and independent duplicate media',async()=>{
 const form=new FormData();form.set('file',new File([readFileSync('public/assets/affiliates/epson-l3250-announcement.png')],'camera.png',{type:'image/png'}));let r=await req('/api/admin/affiliates/products/'+created+'/media',{actor:'admin',method:'POST',body:form});assert.equal(r.status,201);const image=(await r.json()).image;
 assert.equal((await req(image.url)).status,404);assert.equal((await req(image.url,{actor:'admin'})).status,200);
 const bad=new FormData();bad.set('file',new File(['<script>bad</script>'],'bad.png',{type:'image/png'}));assert.equal((await req('/api/admin/affiliates/products/'+created+'/media',{actor:'admin',method:'POST',body:bad})).status,415);
 let p=(await admin()).products.find(p=>p.id===created);assert.equal(p.images.length,1);assert.equal((await req('/api/admin/affiliates/products/'+created,{actor:'admin',method:'PUT',body:{...p,status:'active'}})).status,200);assert.equal((await req(image.url)).status,200);
 p=(await admin()).products.find(p=>p.id===created);r=await req('/api/admin/affiliates/products/'+created+'/duplicate',{actor:'admin',method:'POST',body:{revision:p.revision}});const id=(await r.json()).id,copy=(await admin()).products.find(p=>p.id===id);assert.notEqual(copy.images[0].id,p.images[0].id);assert.equal((await req(copy.images[0].url)).status,404);
 assert.equal((await req('/api/admin/affiliates/products/'+id,{actor:'admin',method:'PUT',body:{...copy,status:'active'}})).status,200);assert.equal((await req(copy.images[0].url)).status,200);
});
test('archive, deactivate, delete and marketplace disabling remove public recommendations while preserving other records',async()=>{
 let p=(await admin()).products.find(p=>p.id===created);assert.equal((await req('/api/admin/affiliates/products/'+created,{actor:'admin',method:'PUT',body:{...p,status:'archived'}})).status,200);assert.ok(!(await (await req('/api/affiliates')).json()).products.some(p=>p.id===created));
 p=(await admin()).products.find(p=>p.id===copyId);assert.equal((await req('/api/admin/affiliates/products/'+copyId,{actor:'admin',method:'DELETE',body:{revision:p.revision}})).status,200);assert.ok(!(await admin()).products.some(p=>p.id===copyId));
 const d=await admin(),m=d.marketplaces.find(m=>m.id==='mercado-livre');assert.equal((await req('/api/admin/affiliates/marketplaces/'+m.id,{actor:'admin',method:'PUT',body:{...m,active:false}})).status,200);assert.ok(!(await (await req('/api/affiliates')).json()).products.some(p=>p.id===seed.id));assert.ok((await admin()).products.some(p=>p.id===seed.id));
 assert.equal((await req('/api/affiliates/epson-l3250/click',{method:'POST',body:{marketplace_id:'mercado-livre'}})).status,404);
 assert.equal((await req('/api/admin/affiliates/settings',{actor:'admin',method:'PUT',body:{stale_days:7}})).status,200);assert.equal((await admin()).settings.stale_days,7);
});

test('requested Report paper import has six exact bundled photos, no fixed price, editable data and no reseeding after restart',async()=>{
 let p=(await admin()).products.find(p=>p.id==='report-premium-a4-75g-500');assert.ok(p);assert.equal(p.images.length,6);assert.equal(p.price_cents,null);assert.equal(p.sale_price_cents,null);assert.equal(p.offers[0].marketplace_id,'mercado-livre');assert.ok(p.offers[0].url.includes('ref=BJtPnttWJHegPrU8gf5K%2BbvRXnsVwo12OV0uOp1cmULPuRq5wCfSiQKSYcfmYGqCZF8%2BZ07pZmR98pXrNQXATuALnoVi0zsOl6MYdQRhPy6zzJ2a4pZ7b5IwXq6tK8bmqtRDuq8KAElaS%2F62kCnul9nvyVfRUoOfDnY2hCjyShelBSNKs%2FqzGPt3UR%2FucKdORVt69TtawQX7fDukCK1dUkPGIme%2F2wgJAO5BA74sQrHyzwxj4d9mrjt6JcsiF0g3m5GFXw%3D%3D'));
 for(const image of p.images){const bytes=readFileSync('public'+image.url);assert.equal(bytes.subarray(0,4).toString(),'RIFF');assert.equal(bytes.subarray(8,12).toString(),'WEBP');}
 assert.equal((await req('/api/admin/affiliates/products/'+p.id,{actor:'admin',method:'PUT',body:{...p,title:'Papel editado pelo administrador',status:'inactive'}})).status,200);
 const proxy={prepare:(...args)=>DB.prepare(...args),batch:(...args)=>DB.batch(...args)};const r=await handleAPI(new Request(origin+'/api/admin/affiliates',{headers:headers('admin')}),{...env,DB:proxy});assert.equal(r.status,200);const data=await r.json();assert.equal(data.products.filter(x=>x.id===p.id).length,1);assert.equal(data.products.find(x=>x.id===p.id).title,'Papel editado pelo administrador');
});
