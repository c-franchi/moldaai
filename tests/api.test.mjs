import {crc32} from 'node:zlib';
import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {Miniflare} from 'miniflare';
import {handleAPI} from '../server/api.mjs';
import {newDocument,geometry,fitText,validateDocument,imageLayersForAreas,artAreas,MAX_IMAGE_LAYERS,withoutImageLayers,freeImageLayer,imageClipPolygons,resizeLayerBox} from '../public/studio-model.mjs';
import {PDFDocument} from 'pdf-lib';
import {deflateSync} from 'node:zlib';
const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("ok")}}',compatibilityDate:'2026-05-15',d1Databases:['DB'],r2Buckets:['BUCKET']});
const DB=await mf.getD1Database('DB'),BUCKET=await mf.getR2Bucket('BUCKET');
for(const file of readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort()){for(const sql of readFileSync('drizzle/'+file,'utf8').split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean))await DB.prepare(sql).run()}
const ADMIN_EMAIL='owner@example.test';
const env={DB,BUCKET,MOLDAE_ADMIN_EMAIL:ADMIN_EMAIL+', CoAdmin@example.test '},origin='https://moldae.test';
const identities={secondAdmin:{'oai-authenticated-user-id':'second-admin-subject','oai-authenticated-user-email':'coadmin@example.test'},lookalike:{'oai-authenticated-user-id':'lookalike-subject','oai-authenticated-user-email':'not-coadmin@example.test'},admin:{'oai-authenticated-user-id':'owner-subject','oai-authenticated-user-email':ADMIN_EMAIL},viewer:{'oai-authenticated-user-id':'viewer-subject','oai-authenticated-user-email':'viewer@example.test'},other:{'oai-authenticated-user-id':'other-subject','oai-authenticated-user-email':'other@example.test'}};
async function req(path,{actor,method='GET',body,originHeader=origin}={}){return handleAPI(new Request(origin+path,{method,headers:{...identities[actor],...(method!=='GET'?{origin:originHeader}:{}),...(body&&!(body instanceof FormData)?{'content-type':'application/json'}:{})},...(body?{body:body instanceof FormData?body:JSON.stringify(body)}:{})}),env)}
const value={assembled_dimensions:{length:150,height:50,width:48},title:'Mini calendário Dinossauro 2027',slug:'calendario-dino',description:'Molde de calendário',short_description:'Um calendário de mesa',price_cents:1490,sale_price_cents:null,status:'draft',formats:['PDF'],license_text:'Uso pessoal e venda de peças físicas. Não revender o arquivo.',taxonomy_ids:[],featured:false,is_kit:false};
let product,fileId,mediaId;
let studio,studioAsset,approvedVersion;
after(()=>mf.dispose());
test('studio: twenty independent candy regions cover the legacy faces exactly, plus glue',()=>{
 const areas=artAreas('candy-lab'),geo=geometry('candy-lab');assert.equal(areas.length,21);
 const area=points=>Math.abs(points.reduce((sum,p,i)=>{const q=points[(i+1)%points.length];return sum+p[0]*q[1]-p[1]*q[0];},0))/2;
 for(const face of geo.faces){const children=areas.filter(a=>a.parent===face.id);assert.equal(children.length,5);assert.equal(children.reduce((sum,a)=>sum+area(a.points),0),area(face.points));}
 assert.deepEqual([...new Set(areas.map(a=>a.group))],['Pontas superiores','Dobras superiores','Painéis centrais','Dobras inferiores','Pontas inferiores','Aba de colagem (opcional)']);
 const d=newDocument(),images=imageLayersForAreas(d,'asset1',areas.map(a=>a.id),{width:900,height:900},{layout:'continuous',fit:'cover'});assert.equal(images.length,21);validateDocument({...d,images});
 // Existing complete-face clips remain valid and can coexist with the new regions.
 validateDocument({...d,images:[...images,{id:'old-face',asset:'asset1',face:'face1',x:54,y:25,w:45,h:128}]});
 assert.ok(areas.some(a=>a.id==='glue-tab'&&a.optional));
});
test('studio: deleting one image application preserves other regions, text and source document',()=>{
 const d=newDocument();d.images=imageLayersForAreas(d,'asset1',['face1-top','face1-body','face1-upper-fold'],{width:900,height:900});const original=structuredClone(d);
 const removed=withoutImageLayers(d,[d.images[1].id]);assert.equal(removed.images.length,2);assert.deepEqual(removed.images.map(a=>a.face),['face1-top','face1-upper-fold']);assert.deepEqual(removed.fields,d.fields);assert.deepEqual(d,original);
 assert.deepEqual(withoutImageLayers(d,['missing-layer']).images,d.images);
});
test('studio: multi-area repeat, continuous placement and atomic limits across structures',()=>{
 const d=newDocument(),before=JSON.stringify(d);let n=0;const makeId=()=> 'test'+(++n),size={width:900,height:900};
 const repeated=imageLayersForAreas(d,'asset1',['face1','face3','face1'],size,{makeId});
 assert.deepEqual(repeated.map(l=>l.face),['face1','face3']);assert.notEqual(repeated[0].x,repeated[1].x);assert.equal(repeated[0].w,repeated[1].w);
 const continuous=imageLayersForAreas(d,'asset1',['face1','face2','face3','face4'],size,{layout:'continuous',fit:'cover',makeId});
 assert.equal(continuous.length,4);for(const l of continuous){assert.deepEqual([l.x,l.y,l.w,l.h],[continuous[0].x,continuous[0].y,continuous[0].w,continuous[0].h]);}
 validateDocument({...d,images:continuous});assert.equal(JSON.stringify(d),before);
 assert.throws(()=>imageLayersForAreas(d,'asset1',[],size),/Selecione/);
 assert.throws(()=>imageLayersForAreas(d,'asset1',['unknown'],size),/não existe/);
 const full={...d,images:Array.from({length:MAX_IMAGE_LAYERS-1},(_,i)=>({...repeated[0],id:'old'+i}))};const fullBefore=JSON.stringify(full);
 assert.throws(()=>imageLayersForAreas(full,'asset1',['face1','face2'],size),/64 camadas/);assert.equal(JSON.stringify(full),fullBefore);
 for(const [structure,area] of [['tag-60x40','tag'],['art-a4','page']]){const doc=newDocument(structure),images=imageLayersForAreas(doc,'asset1',[area],size,{makeId});assert.equal(images[0].face,area);validateDocument({...doc,images});}
});
test('studio: authorization, persisted drafts and optimistic locking',async()=>{
 assert.equal((await req('/api/admin/studio/templates',{actor:'viewer'})).status,403);
 assert.equal((await req('/api/admin/studio/templates')).status,401);
 let r=await req('/api/admin/studio/templates',{actor:'admin',method:'POST',body:{title:'Tag Jardim Encantado',theme:'Jardim Encantado',document:newDocument('tag-60x40')}});assert.equal(r.status,201,await r.clone().text());studio=(await r.json()).template;
 r=await req('/api/admin/studio/templates/'+studio.id,{actor:'admin'});assert.equal((await r.json()).template.theme,'Jardim Encantado');
 r=await req('/api/admin/studio/templates/'+studio.id,{actor:'admin',method:'PATCH',body:{...studio,title:'Tag editada'}});assert.equal(r.status,200);const stale=studio;studio=(await r.json()).template;
 assert.equal((await req('/api/admin/studio/templates/'+studio.id,{actor:'admin',method:'PATCH',body:stale})).status,409);
 const invalid=structuredClone(studio);invalid.document.fields[0].x=220;
 assert.equal((await req('/api/admin/studio/templates/'+studio.id,{actor:'admin',method:'PATCH',body:invalid})).status,400);
 assert.equal((await req('/api/admin/studio/templates',{actor:'admin',method:'POST',originHeader:'https://evil.test',body:{}})).status,403);
});
test('studio: private decoded artwork, cross-template asset isolation and persisted layers',async()=>{
 let form=new FormData();form.set('file',new File(['not png'],'fake.png'));
 assert.equal((await req('/api/admin/studio/templates/'+studio.id+'/assets',{actor:'admin',method:'POST',body:form})).status,415);
 const png=Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64'));
 form=new FormData();form.set('file',new File([png],'fundo.png'));
 const r=await req('/api/admin/studio/templates/'+studio.id+'/assets',{actor:'admin',method:'POST',body:form});assert.equal(r.status,201,await r.clone().text());studioAsset=(await r.json()).assets[0];
 assert.equal((await req('/api/admin/studio/assets/'+studioAsset.id,{actor:'viewer'})).status,403);
 assert.equal((await req('/api/admin/studio/assets/'+studioAsset.id,{actor:'admin'})).headers.get('content-type'),'image/png');
 studio.document.images=[{id:'art1',asset:studioAsset.id,face:'tag',x:75,y:110,w:60,h:40}];
 const saved=await req('/api/admin/studio/templates/'+studio.id,{actor:'admin',method:'PATCH',body:studio});assert.equal(saved.status,200);studio=(await saved.json()).template;
 const other=await req('/api/admin/studio/templates',{actor:'admin',method:'POST',body:{title:'Outro template',document:newDocument('tag-60x40')}}).then(r=>r.json());other.template.document.images=studio.document.images;
 assert.equal((await req('/api/admin/studio/templates/'+other.template.id,{actor:'admin',method:'PATCH',body:other.template})).status,400);
});
test('studio: approvals require physical verification, snapshots stay immutable and pilot is blocked',async()=>{
 const url='/api/admin/studio/templates/'+studio.id+'/approve';
 assert.equal((await req(url,{actor:'admin',method:'POST',body:{revision:studio.revision,physical_test:false}})).status,400);
 let r=await req(url,{actor:'admin',method:'POST',body:{revision:studio.revision,physical_test:true,validation_note:'Conferidos 60 x 40 mm e impressão 100% no ensaio local.'}});assert.equal(r.status,201,await r.clone().text());approvedVersion=(await r.json()).versions[0];
 const original=await DB.prepare('SELECT document_json FROM studio_versions WHERE id=?').bind(approvedVersion.id).first();
 studio.document.fields[0].x+=2;r=await req('/api/admin/studio/templates/'+studio.id,{actor:'admin',method:'PATCH',body:studio});assert.equal(r.status,200);studio=(await r.json()).template;
 assert.deepEqual(await DB.prepare('SELECT document_json FROM studio_versions WHERE id=?').bind(approvedVersion.id).first(),original);
 const pilot=await req('/api/admin/studio/templates',{actor:'admin',method:'POST',body:{title:'Piloto Bala',document:newDocument()}}).then(r=>r.json());
 assert.equal((await req('/api/admin/studio/templates/'+pilot.template.id+'/approve',{actor:'admin',method:'POST',body:{revision:1,physical_test:true,validation_note:'Solicitação sem geometria validada.'}})).status,400);
});
test('studio: accepts a real PNG larger than 2 MB and returns the asset to apply',async()=>{
 const crc=buf=>{let c=0xffffffff;for(const b of buf){c^=b;for(let k=0;k<8;k++)c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^0xffffffff)>>>0;};
 const chunk=(type,data)=>{const t=Buffer.from(type),n=Buffer.alloc(4),sum=Buffer.alloc(4);n.writeUInt32BE(data.length);sum.writeUInt32BE(crc(Buffer.concat([t,data])));return Buffer.concat([n,t,data,sum]);};
 const width=900,height=900,raw=Buffer.alloc((width*3+1)*height);let seed=42;
 for(let y=0;y<height;y++)for(let x=1;x<=width*3;x++){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;raw[y*(width*3+1)+x]=seed&255;}
 const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(width,0);ihdr.writeUInt32BE(height,4);ihdr[8]=8;ihdr[9]=2;
 const png=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',deflateSync(raw,{level:0})),chunk('IEND',Buffer.alloc(0))]);
 assert.ok(png.length>2*1024*1024);const form=new FormData();form.set('file',new File([png],'arte-2mb.png',{type:'image/png'}));
 const r=await req('/api/admin/studio/templates/'+studio.id+'/assets',{actor:'admin',method:'POST',body:form});assert.equal(r.status,201,await r.clone().text());const result=await r.json();assert.ok(result.assets.some(a=>a.id===result.asset_id&&a.bytes===png.length));
});
test('studio: A4 PDF in mm, accents and names fit, overflow rejected, approved snapshot export',async()=>{
 for(const name of ['Sophia','Mariana','Ana Clara','João Luís']){
  const r=await req('/api/admin/studio/templates/'+studio.id+'/pdf',{actor:'admin',method:'POST',body:{document:studio.document,values:{name,age:'1 aninho'}}});assert.equal(r.status,200,await r.clone().text());
  const bytes=new Uint8Array(await r.arrayBuffer());const pdf=await PDFDocument.load(bytes);const size=pdf.getPage(0).getSize();assert.ok(Math.abs(size.width-210*72/25.4)<.001);assert.ok(Math.abs(size.height-297*72/25.4)<.001);
  if(name==='Sophia'){await import('node:fs').then(fs=>fs.writeFileSync('/tmp/moldae-studio-test.pdf',bytes));}
 }
 const narrow=structuredClone(studio.document);narrow.fields[0].w=1;
 assert.equal((await req('/api/admin/studio/templates/'+studio.id+'/pdf',{actor:'admin',method:'POST',body:{document:narrow,values:{name:'Nome muito comprido'}}})).status,400);
 const r=await req('/api/admin/studio/templates/'+studio.id+'/pdf',{actor:'admin',method:'POST',body:{document:studio.document,version_id:approvedVersion.id,values:{name:'Ana Clara'}}});assert.equal(r.status,200);
 const face=geometry('tag-60x40').faces[0];assert.equal(face.box.w,60);assert.equal(face.box.h,40);
 assert.throws(()=>fitText('Ana Clara',{size:20,minSize:8,w:1},(s,size)=>s.length*size));
 assert.throws(()=>validateDocument({...newDocument(),structure:'__proto__'}));
});
test('multiple administrators use exact normalized emails and ordinary viewers remain blocked',async()=>{
 assert.equal((await req('/api/me',{actor:'admin'}).then(r=>r.json())).user.role,'admin');
 assert.equal((await req('/api/me',{actor:'secondAdmin'}).then(r=>r.json())).user.role,'admin');
 assert.equal((await req('/api/admin/products',{actor:'secondAdmin'})).status,200);
 assert.equal((await req('/api/admin/products',{actor:'lookalike'})).status,403);
 assert.equal((await req('/api/admin/products',{actor:'viewer'})).status,403);
});
test('anonymous and viewer cannot access admin; origin checked before mutation',async()=>{
 assert.equal((await req('/api/admin/products')).status,401);
 assert.equal((await req('/api/admin/products',{actor:'viewer'})).status,403);
 assert.equal((await req('/api/admin/products',{actor:'admin',method:'POST',body:value,originHeader:'https://evil.test'})).status,403);
 assert.equal((await req('/api/checkout',{actor:'viewer',method:'POST',body:{}})).status,503);
});
test('creates persisted draft, classifies it, rejects duplicates and invalid prices',async()=>{
 let r=await req('/api/admin/taxonomies',{actor:'admin',method:'POST',body:{kind:'theme',label:'Dinossauros'}});assert.equal(r.status,201);value.taxonomy_ids=[(await r.json()).id];const type=await req('/api/admin/taxonomies',{actor:'admin',method:'POST',body:{kind:'type',label:'Calendário'}});value.taxonomy_ids.push((await type.json()).id);
 r=await req('/api/admin/products',{actor:'admin',method:'POST',body:value});assert.equal(r.status,201,await r.clone().text());product=(await r.json()).product;
 assert.equal((await req('/api/admin/products',{actor:'admin',method:'POST',body:value})).status,409);
 assert.equal((await req('/api/admin/products',{actor:'admin',method:'POST',body:{...value,slug:'bad-price',price_cents:-1}})).status,400);
 assert.equal((await req('/api/products').then(r=>r.json())).products.length,0);
 const saved=(await req('/api/admin/products',{actor:'admin'}).then(r=>r.json())).products[0];assert.equal(saved.title,value.title);assert.ok(saved.taxonomies.some(t=>t.label==='Dinossauros'));
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

test('studio: free elements cross faces, persist their clip and render a PDF',async()=>{
 const d=newDocument(),element=freeImageLayer(d,'garden',{width:1200,height:800});
 assert.equal(freeImageLayer(d,'garden',{width:1200,height:800},'face1-body').face,'face1-body');
 assert.equal(element.face,'mold');assert.equal(element.w/element.h,1.5);
 element.x=90;element.y=70;element.w=30;element.h=20;
 const saved=validateDocument({...d,images:[element]});assert.equal(saved.images[0].face,'mold');
 assert.deepEqual(imageClipPolygons(d.structure,'mold'),[...geometry(d.structure).faces.map(f=>f.points),...geometry(d.structure).glue]);
 assert.equal(imageClipPolygons(d.structure,'face1-body').length,1);
 const {renderStudioPDF}=await import('../server/studio-pdf.mjs');
 const png=Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64'));
 const pdf=await PDFDocument.load(await renderStudioPDF(saved,{name:'Ana Clara',age:'1 aninho'},async()=>({mime:'image/png',data:png})));
 assert.equal(pdf.getPageCount(),1);assert.ok(Math.abs(pdf.getPage(0).getWidth()-297*72/25.4)<.01);
 assert.throws(()=>validateDocument({...d,images:[{...element,face:'unknown'}]}));
 const resized=resizeLayerBox({x:270,y:190,w:15,h:10},8,STRUCT_PAGE);
 assert.equal(resized.w/resized.h,1.5);assert.ok(270+resized.w<=297&&190+resized.h<=210);
 const minimum=resizeLayerBox({x:50,y:60,w:30,h:20},-4,STRUCT_PAGE);assert.ok(minimum.w>=1&&minimum.h>=1);
});
const STRUCT_PAGE={width:297,height:210};

test('studio: autosave payload persists font, rotation and mixed stacking without changing approved versions',async()=>{
 const detail=await req('/api/admin/studio/templates/'+studio.id,{actor:'admin'}).then(r=>r.json()),t=detail.template;
 t.document.fields[0].font='script';t.document.fields[0].rotation=35;
 t.document.order=[...t.document.fields.map(l=>l.id),...t.document.images.map(l=>l.id)];
 let r=await req('/api/admin/studio/templates/'+t.id,{actor:'admin',method:'PATCH',body:t});assert.equal(r.status,200,await r.clone().text());
 const reopened=await req('/api/admin/studio/templates/'+t.id,{actor:'admin'}).then(r=>r.json());assert.equal(reopened.template.document.fields[0].font,'script');assert.equal(reopened.template.document.fields[0].rotation,35);assert.deepEqual(reopened.template.document.order,t.document.order);
 r=await req('/api/admin/studio/templates/'+t.id,{actor:'admin',method:'PATCH',body:t});assert.equal(r.status,409);
});

test('studio: editable geometry, static captions and vector control points round trip through the server',async()=>{
 const d=newDocument('candy-lab');d.dimensions={x:54,y:25,faceW:46,bodyH:50,foldH:26,endH:16,inset:13,glueW:8};d.fields[0].key='static';d.fields[0].text='Cole aqui';d.paths=[{id:'cut1',kind:'curve',usage:'cut',x:60,y:70,w:30,h:20,points:[[0,.8],[.4,.1],[1,.8]],color:'#444444',stroke:.25,locked:true}];
 let r=await req('/api/admin/studio/templates',{actor:'admin',method:'POST',body:{title:'Molde editável de teste',document:d}});assert.equal(r.status,201,await r.clone().text());const t=(await r.json()).template;
 const reopened=await req('/api/admin/studio/templates/'+t.id,{actor:'admin'}).then(r=>r.json());assert.equal(reopened.template.document.dimensions.faceW,46);assert.equal(reopened.template.document.paths[0].locked,true);assert.equal(reopened.template.document.fields[0].text,'Cole aqui');
 r=await req('/api/admin/studio/templates/'+t.id+'/pdf',{actor:'admin',method:'POST',body:{document:reopened.template.document,values:{name:'Sophia',age:'1 aninho'}}});assert.equal(r.status,200,await r.clone().text());
});

test('studio product preparation: permissions, revision, immutable source, PDF with guide and idempotence',async()=>{
 const created=await req('/api/admin/studio/templates',{actor:'admin',method:'POST',body:{title:'Caixa Bala Jardim teste',theme:'Jardim Encantado',document:newDocument('candy-lab')}});const t=(await created.json()).template,path='/api/admin/studio/templates/'+t.id+'/product',body={revision:t.revision,title:'Caixa Bala Jardim teste',price_cents:1490,blank:true};
 assert.equal((await req(path,{actor:'viewer',method:'POST',body})).status,403);
 assert.equal((await req(path,{actor:'admin',method:'POST',body:{...body,revision:0}})).status,409);
 assert.equal((await req(path,{actor:'admin',method:'POST',body:{...body,price_cents:0}})).status,400);
 let r=await req(path,{actor:'admin',method:'POST',body});assert.equal(r.status,201,await r.clone().text());const result=await r.json(),p=await DB.prepare('SELECT * FROM products WHERE id=?').bind(result.product_id).first();assert.equal(p.price_cents,1490);assert.equal(p.status,'draft');assert.match(p.instructions,/linhas tracejadas/);const f=await DB.prepare('SELECT * FROM product_files WHERE product_id=?').bind(p.id).first(),obj=await BUCKET.get(f.object_key),pdf=await PDFDocument.load(await obj.arrayBuffer());assert.equal(pdf.getPageCount(),2);
 const sourceKey='studio-products/'+p.id+'/'+f.id+'-source.json',source=JSON.parse(await (await BUCKET.get(sourceKey)).text());assert.equal(source.source_revision,t.revision);assert.deepEqual(source.document,t.document);assert.equal(source.blank,true);assert.equal(source.values.name,'');
 r=await req(path,{actor:'admin',method:'POST',body});assert.equal((await r.json()).existing,true);assert.equal((await DB.prepare('SELECT COUNT(*) AS n FROM product_files WHERE product_id=?').bind(p.id).first()).n,1);
 await req('/api/admin/studio/templates/'+t.id,{actor:'admin',method:'PATCH',body:{...t,title:'Outro título'}});assert.equal(JSON.parse(await (await BUCKET.get(sourceKey)).text()).title,body.title);
 assert.equal((await req('/api/admin/products/'+p.id,{actor:'admin',method:'PATCH',body:{...value,...p,status:'active',formats:['PDF'],taxonomy_ids:[]}})).status,400);
});

async function personalizedFixture(suffix=''){
 const created=await req('/api/admin/studio/templates',{actor:'admin',method:'POST',body:{title:'Caixa Bala compra '+suffix,theme:'Jardim Encantado',document:newDocument('candy-lab')}}),t=(await created.json()).template;
 const prepared=await req('/api/admin/studio/templates/'+t.id+'/product',{actor:'admin',method:'POST',body:{revision:t.revision,title:'Caixa Bala compra '+suffix,price_cents:1490,blank:true}}),p=(await prepared.json()).product_id;
 // Fixtures simulate an already verified provider event; no production payment endpoint is exposed.
 await req('/api/me',{actor:'viewer'});await req('/api/me',{actor:'other'});
 const oid='purchase-'+suffix,iid='purchase-item-'+suffix;
 await DB.prepare('INSERT INTO orders(id,order_number,user_id,currency,subtotal_cents,total_cents,status,created_at) VALUES(?,?,?,\'BRL\',1490,1490,\'pending\',?)').bind(oid,'BUY-'+suffix,'viewer-subject','2026-11-08').run();
 await DB.prepare('INSERT INTO order_items(id,order_id,product_id,product_title_snapshot,unit_price_cents,quantity) VALUES(?,?,?,?,1490,1)').bind(iid,oid,p,'Caixa Bala compra '+suffix).run();
 return {template:t,product:p,order:oid,item:iid,path:'/api/me/purchases/'+iid};
}
test('member personalization: paid ownership, confirmation, single name, retries, private PDF and refund revocation',async()=>{
 const f=await personalizedFixture('single'),body={name:'Ana Clara',age:'2 aninhos',confirmed:true};
 assert.equal((await req(f.path+'/personalize',{method:'POST',body})).status,401);
 assert.equal((await req(f.path+'/personalize',{actor:'other',method:'POST',body})).status,404);
 assert.equal((await req(f.path+'/personalize',{actor:'viewer',method:'POST',body:{...body,paid:true}})).status,403);
 await DB.prepare("UPDATE orders SET status='paid' WHERE id=?").bind(f.order).run();
 assert.equal((await req(f.path+'/pdf',{actor:'viewer'})).status,409);
 assert.equal((await req(f.path+'/personalize',{actor:'viewer',method:'POST',body:{...body,confirmed:false}})).status,400);
 assert.equal((await req(f.path+'/personalize',{actor:'viewer',method:'POST',body:{...body,name:'A'.repeat(61)}})).status,400);
 let r=await req(f.path+'/personalize',{actor:'viewer',method:'POST',body});assert.equal(r.status,201,await r.clone().text());const saved=await r.json();assert.equal(saved.personalization.name,'Ana Clara');
 r=await req(f.path+'/personalize',{actor:'viewer',method:'POST',body});assert.equal(r.status,200);assert.equal((await r.json()).existing,true);
 assert.equal((await req(f.path+'/personalize',{actor:'viewer',method:'POST',body:{...body,name:'Sophia'}})).status,409);
 assert.equal((await req(f.path+'/personalize',{actor:'viewer',method:'POST',body:{...body,age:'3 aninhos'}})).status,409);
 const catalog=await req('/api/admin/products',{actor:'admin'}).then(r=>r.json());assert.equal(catalog.products.find(p=>p.id===f.product).personalizable,true);
 const list=await req('/api/me/purchases',{actor:'viewer'}).then(r=>r.json()),item=list.purchases.find(p=>p.id===f.item);assert.equal(item.name,'Ana Clara');assert.equal(item.download_url,saved.personalization.download_url);
 assert.ok(!(await req('/api/me/purchases',{actor:'other'}).then(r=>r.json())).purchases.some(p=>p.id===f.item));
 const files=(await req('/api/admin/products',{actor:'admin'}).then(r=>r.json())).products.find(p=>p.id===f.product).files;assert.equal((await req('/api/download/'+files[0].id,{actor:'viewer'})).status,403);
 const pdf=await req(f.path+'/pdf',{actor:'viewer'});assert.equal(pdf.headers.get('content-type'),'application/pdf');assert.equal((await PDFDocument.load(await pdf.arrayBuffer())).getPageCount(),2);
 assert.equal((await req(f.path+'/pdf',{actor:'other'})).status,404);
 await DB.prepare("UPDATE orders SET status='refunded' WHERE id=?").bind(f.order).run();assert.equal((await req(f.path+'/pdf',{actor:'viewer'})).status,403);assert.equal((await req(f.path+'/personalize',{actor:'viewer',method:'POST',body})).status,403);
 assert.equal((await req('/api/me/purchases',{actor:'viewer'}).then(r=>r.json())).purchases.find(p=>p.id===f.item).download_url,null);
});
test('member personalization: simultaneous confirmations produce one immutable file and retain purchase source',async()=>{
 const f=await personalizedFixture('race');await DB.prepare("UPDATE orders SET status='paid' WHERE id=?").bind(f.order).run();
 const original=await DB.prepare('SELECT source_key FROM order_item_sources WHERE order_item_id=?').bind(f.item).first();
 await DB.prepare('UPDATE product_personalization_sources SET source_key=? WHERE product_id=?').bind('changed-product-source.json',f.product).run();assert.equal((await DB.prepare('SELECT source_key FROM order_item_sources WHERE order_item_id=?').bind(f.item).first()).source_key,original.source_key);
 const responses=await Promise.all(['Maria','Mariana'].map(name=>req(f.path+'/personalize',{actor:'viewer',method:'POST',body:{name,age:'1 aninho',confirmed:true}})));assert.deepEqual(responses.map(r=>r.status).sort(),[201,409]);
 const row=await DB.prepare('SELECT * FROM item_personalizations WHERE order_item_id=?').bind(f.item).first();assert.ok(['Maria','Mariana'].includes(row.name));assert.equal((await BUCKET.list({prefix:'personalized-purchases/'+f.item+'/'})).objects.length,1);
});
test('member personalization: generation/storage failures do not consume confirmation and retry remains available',async()=>{
 const f=await personalizedFixture('retry');await DB.prepare("UPDATE orders SET status='paid' WHERE id=?").bind(f.order).run();const source=await DB.prepare('SELECT source_key FROM order_item_sources WHERE order_item_id=?').bind(f.item).first(),original=await (await BUCKET.get(source.source_key)).text();
 const data=JSON.parse(original);data.document.images=[{id:'missing',asset:'missing',face:'mold',x:50,y:60,w:20,h:20}];delete data.document.order;await BUCKET.put(source.source_key,JSON.stringify(data));
 const body={name:'Bruno',age:'',confirmed:true};assert.equal((await req(f.path+'/personalize',{actor:'viewer',method:'POST',body})).status,400);assert.equal(await DB.prepare('SELECT * FROM item_personalizations WHERE order_item_id=?').bind(f.item).first(),null);
 await BUCKET.put(source.source_key,original);
 const badStorage={get:BUCKET.get.bind(BUCKET),put:async()=>{throw new Error('storage unavailable')},delete:BUCKET.delete.bind(BUCKET)};
 const request=new Request(origin+f.path+'/personalize',{method:'POST',headers:{...identities.viewer,origin,'content-type':'application/json'},body:JSON.stringify(body)});
 assert.equal((await handleAPI(request,{...env,BUCKET:badStorage})).status,500);assert.equal(await DB.prepare('SELECT * FROM item_personalizations WHERE order_item_id=?').bind(f.item).first(),null);
 assert.equal((await req(f.path+'/personalize',{actor:'viewer',method:'POST',body})).status,201);
});

test('gallery: obsolete images leave storefront reversibly, preserve active products and restore on request',async()=>{
 const r=await req('/api/admin/products',{actor:'admin',method:'POST',body:{...value,title:'Galeria de imagens',slug:'galeria-imagens'}}),p=(await r.json()).product;
 const image=()=>{const f=new FormData();f.set('file',new File([Uint8Array.from([137,80,78,71,13,10,26,10])],'demo.png'));return f;};
 // Gallery validation uses magic bytes; preview pixels are outside this API test.
 const a=await req('/api/admin/products/'+p.id+'/media',{actor:'admin',method:'POST',body:image()}).then(r=>r.json()),b=await req('/api/admin/products/'+p.id+'/media',{actor:'admin',method:'POST',body:image()}).then(r=>r.json());
 await DB.prepare("UPDATE products SET status='active' WHERE id=?").bind(p.id).run();
 assert.equal((await req('/api/admin/media/'+a.id,{actor:'viewer',method:'DELETE'})).status,403);
 assert.equal((await req('/api/admin/media/'+a.id,{actor:'admin',method:'DELETE'})).status,200);
 let pub=(await req('/api/products').then(r=>r.json())).products.find(x=>x.id===p.id);assert.equal(pub.media.filter(m=>!m.is_dimensions).length,1);assert.equal(pub.media[0].id,b.id);assert.equal(pub.media[0].is_cover,1);assert.equal((await req('/api/media/'+a.id,{actor:'viewer'})).status,404);
 let row=await DB.prepare('SELECT * FROM product_media WHERE id=?').bind(a.id).first();assert.equal(row.is_hidden,1);assert.ok(await BUCKET.get(row.object_key));
 assert.equal((await req('/api/admin/media/'+a.id+'/cover',{actor:'admin',method:'POST'})).status,400);
 assert.equal((await req('/api/admin/media/'+a.id+'/restore',{actor:'viewer',method:'POST'})).status,403);
 assert.equal((await req('/api/admin/media/'+a.id+'/restore',{actor:'admin',method:'POST'})).status,200);pub=(await req('/api/products').then(r=>r.json())).products.find(x=>x.id===p.id);assert.equal(pub.media.filter(m=>!m.is_dimensions).length,2);assert.equal(pub.status,'active');
 await req('/api/admin/media/'+a.id,{actor:'admin',method:'DELETE'});await req('/api/admin/media/'+b.id,{actor:'admin',method:'DELETE'});assert.equal((await DB.prepare('SELECT status FROM products WHERE id=?').bind(p.id).first()).status,'draft');
});


test('dimensions: validated gallery diagram, private assembly steps and activation requirement',async()=>{
 let r=await req('/api/admin/products',{actor:'admin',method:'POST',body:{...value,slug:'dimensions-test',assembled_dimensions:{length:150,height:50,width:null}}});assert.equal(r.status,400);
 const data=await req('/api/admin/products',{actor:'admin'}).then(r=>r.json());const p=data.products.find(p=>p.id===product.id);
 const path='/api/products/'+p.id+'/dimensions.svg';assert.equal((await req(path)).status,401); // archived records require admin
 r=await req(path,{actor:'admin'});assert.equal(r.status,200);assert.match(r.headers.get('content-type'),/svg/);const svg=await r.text();assert.match(svg,/<image href="data:image\/png;base64,/);assert.ok(!svg.includes('Vista da extremidade'));assert.ok(!svg.includes('Desenho esquemático'));assert.ok(!svg.includes('<pattern'));for(const label of ['15 cm','5 cm','4,8 cm'])assert.ok(svg.includes(label));
 const live=(await req('/api/products').then(r=>r.json())).products;for(const p of live){assert.equal(p.instructions,undefined);if(p.assembled_dimensions)assert.ok(p.media.some(m=>m.is_dimensions));}
});

test('refresh: latest saved paths are published, old purchase source is immutable and stale revision rejected',async()=>{
 const f=await personalizedFixture('refresh'),old=await DB.prepare('SELECT * FROM product_personalization_sources WHERE product_id=?').bind(f.product).first();
 const captured=await DB.prepare('SELECT * FROM order_item_sources WHERE order_item_id=?').bind(f.item).first();
 const t=f.template;t.document.paths=[{id:'new-tab-line',kind:'line',usage:'cut',x:40,y:40,w:10,h:10,points:[[0,0],[1,1]],color:'#444444',stroke:.25}];
 const saved=await req('/api/admin/studio/templates/'+t.id,{actor:'admin',method:'PATCH',body:t}).then(r=>r.json());const path='/api/admin/studio/templates/'+t.id+'/refresh-product';
 assert.equal((await req(path,{actor:'admin',method:'POST',body:{product_id:f.product,revision:t.revision}})).status,409);
 assert.equal((await req(path,{actor:'viewer',method:'POST',body:{product_id:f.product,revision:saved.template.revision}})).status,403);
 const r=await req(path,{actor:'admin',method:'POST',body:{product_id:f.product,revision:saved.template.revision}});assert.equal(r.status,200,await r.clone().text());
 const next=await DB.prepare('SELECT * FROM product_personalization_sources WHERE product_id=?').bind(f.product).first();assert.notEqual(next.source_key,old.source_key);assert.equal(next.source_revision,saved.template.revision);
 const source=JSON.parse(await (await BUCKET.get(next.source_key)).text());assert.equal(source.document.paths[0].id,'new-tab-line');
 assert.deepEqual(await DB.prepare('SELECT * FROM order_item_sources WHERE order_item_id=?').bind(f.item).first(),captured);assert.ok(await BUCKET.get(old.source_key));
 assert.equal((await DB.prepare('SELECT COUNT(*) AS n FROM product_files WHERE product_id=? AND is_active=1').bind(f.product).first()).n,1);
});

test('Milk: saved two-page template prepares a private product and a paid personalized three-page PDF',async()=>{
 const d=newDocument('milk-a4');d.printLayout.mode='two';
 let r=await req('/api/admin/studio/templates',{actor:'admin',method:'POST',body:{title:'Caixa Milk Jardim Encantado · 2 folhas',theme:'Jardim Encantado',document:d}});assert.equal(r.status,201,await r.clone().text());const t=(await r.json()).template;
 const reopened=await req('/api/admin/studio/templates/'+t.id,{actor:'admin'}).then(r=>r.json());assert.equal(reopened.template.document.printLayout.mode,'two');assert.equal(reopened.template.document.printLayout.scale,1.35);
 r=await req('/api/admin/studio/templates/'+t.id+'/product',{actor:'admin',method:'POST',body:{revision:t.revision,price_cents:1490,blank:true}});assert.equal(r.status,201,await r.clone().text());const pid=(await r.json()).product_id;
 const p=await DB.prepare('SELECT * FROM products WHERE id=?').bind(pid).first();assert.equal(p.title,'Caixa Milk Jardim Encantado');assert.match(p.instructions,/Encaixe o fundo/);assert.match(p.instructions,/duas partes/);
 const file=await DB.prepare('SELECT * FROM product_files WHERE product_id=?').bind(pid).first();assert.match(file.original_filename,/caixa-milk/);assert.equal((await PDFDocument.load(await (await BUCKET.get(file.object_key)).arrayBuffer())).getPageCount(),3);
 await req('/api/me',{actor:'viewer'});await DB.prepare("INSERT INTO orders(id,order_number,user_id,currency,subtotal_cents,total_cents,status,created_at) VALUES('milk-order','MILK-TEST','viewer-subject','BRL',1490,1490,'pending','2026-11-08')").run();
 await DB.prepare("INSERT INTO order_items(id,order_id,product_id,product_title_snapshot,unit_price_cents,quantity) VALUES('milk-item','milk-order',?,'Caixa Milk',1490,1)").bind(pid).run();await DB.prepare("UPDATE orders SET status='paid' WHERE id='milk-order'").run();
 r=await req('/api/me/purchases/milk-item/personalize',{actor:'viewer',method:'POST',body:{name:'Ana Clara',age:'2 aninhos',confirmed:true}});assert.equal(r.status,201,await r.clone().text());
 r=await req('/api/me/purchases/milk-item/pdf',{actor:'viewer'});assert.equal(r.status,200);assert.equal((await PDFDocument.load(await r.arrayBuffer())).getPageCount(),3);
});

test('brigadeiro product: package, product preparation, correct name/files/dimensions, optimized pages plus assembly guide',async()=>{
 const d=newDocument('brigadeiro-petal');d.imposition.quantity=5;d.dimensions={base:35,extra:4,height:22,crown:5,glue:6,bottomTab:5};
 const created=await req('/api/admin/studio/templates',{actor:'admin',method:'POST',body:{title:'Forminha Jardim',theme:'Jardim Encantado',document:d}}),t=(await created.json()).template,path='/api/admin/studio/templates/'+t.id;
 const body={revision:t.revision,price_cents:1490,blank:true};
 const packageResult=await req(path+'/package',{actor:'admin',method:'POST',body});assert.equal(packageResult.status,200,await packageResult.clone().text());const pack=await PDFDocument.load(await packageResult.arrayBuffer());assert.equal(pack.getPageCount(),3);
 const r=await req(path+'/product',{actor:'admin',method:'POST',body});assert.equal(r.status,201,await r.clone().text());const id=(await r.json()).product_id,p=await DB.prepare('SELECT * FROM products WHERE id=?').bind(id).first();assert.equal(p.title,'Forminha de brigadeiro Jardim Encantado');assert.match(p.instructions,/três abas inferiores/);assert.match(p.instructions,/forminha interna/);assert.match(p.dimensions,/base quadrada 35 mm/);assert.doesNotMatch(p.dimensions,/undefined/);assert.equal(p.status,'draft');const f=await DB.prepare('SELECT * FROM product_files WHERE product_id=?').bind(id).first();assert.match(f.original_filename,/^forminha-brigadeiro-/);assert.equal((await PDFDocument.load(await (await BUCKET.get(f.object_key)).arrayBuffer())).getPageCount(),3);
 assert.equal((await req(path+'/product',{actor:'viewer',method:'POST',body})).status,403);
 assert.equal((await req(path+'/product',{actor:'admin',method:'POST',body})).status,200);
});

test('studio archives are reversible, revision checked and restricted to administrators',async()=>{
 const made=await req('/api/admin/studio/templates',{actor:'admin',method:'POST',body:{title:'Modelo temporário para arquivar',theme:'Jardim',document:newDocument('art-a4')}}),t=(await made.json()).template;
 const path='/api/admin/studio/templates/'+t.id;
 assert.equal((await req(path+'/archive',{actor:'viewer',method:'POST',body:{revision:t.revision}})).status,403);
 assert.equal((await req(path+'/archive',{actor:'admin',method:'POST',body:{revision:t.revision+1}})).status,409);
 assert.equal((await req(path+'/archive',{actor:'admin',method:'POST',body:{revision:t.revision}})).status,200);
 assert.ok(!(await (await req('/api/admin/studio/templates',{actor:'admin'})).json()).templates.some(x=>x.id===t.id));
 assert.ok((await (await req('/api/admin/studio/templates?archived=1',{actor:'admin'})).json()).templates.find(x=>x.id===t.id).archived_at);
 assert.equal((await req(path,{actor:'admin'})).status,200);
 assert.equal((await req(path+'/restore',{actor:'admin',method:'POST',body:{revision:t.revision}})).status,200);
 assert.ok((await (await req('/api/admin/studio/templates',{actor:'admin'})).json()).templates.some(x=>x.id===t.id));
});

test('kit snapshots multiple editable models, produces one PDF and personalizes all after one paid confirmation',async()=>{
 const items=[];for(let i=0;i<4;i++){const doc=newDocument('art-a4');doc.fields[0].font=i?'cookie':'sans';const r=await req('/api/admin/studio/templates',{actor:'admin',method:'POST',body:{title:'Modelo do kit '+i,theme:'Jardim Encantado',document:doc}});items.push((await r.json()).template);}
 const unit=await req('/api/admin/studio/templates/'+items[0].id+'/product',{actor:'admin',method:'POST',body:{revision:items[0].revision,price_cents:1490,blank:true}}),unitId=(await unit.json()).product_id;
 const photoKey='kit-source-photo-key';const photo=Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64'));await BUCKET.put(photoKey,photo,{httpMetadata:{contentType:'image/png'}});
 await DB.prepare("INSERT INTO product_media(id,product_id,object_key,alt_text,sort_order,is_cover) VALUES('kit-source-photo',?,?,'Foto original',0,1)").bind(unitId,photoKey).run();await DB.prepare("UPDATE products SET status='active' WHERE id=?").bind(unitId).run();
 const body={title:'Kit Jardim Encantado teste',price_cents:9130,items:items.map(t=>({template_id:t.id,revision:t.revision}))};
 assert.equal((await req('/api/admin/studio/kits',{actor:'viewer',method:'POST',body})).status,403);
 assert.equal((await req('/api/admin/studio/kits',{actor:'admin',method:'POST',body:{...body,items:[body.items[0],body.items[0]]}})).status,400);
 assert.equal((await req('/api/admin/studio/kits',{actor:'admin',method:'POST',body:{...body,items:body.items.map(t=>({...t,revision:99}))}})).status,409);
 const prep=await req('/api/admin/studio/kits',{actor:'admin',method:'POST',body:{...body,stage:'prepare'}});assert.equal(prep.status,200,await prep.clone().text());const job=await prep.json();assert.equal(job.parts,4);
 for(let index=0;index<job.parts;index++){const part=await req('/api/admin/studio/kits',{actor:'admin',method:'POST',body:{stage:'part',job_id:job.job_id,index}});assert.equal(part.status,200,await part.clone().text());}
 const made=await req('/api/admin/studio/kits',{actor:'admin',method:'POST',body:{stage:'finish',job_id:job.job_id}});assert.equal(made.status,201,await made.clone().text());const id=(await made.json()).product_id;
 const again=await req('/api/admin/studio/kits',{actor:'admin',method:'POST',body});assert.equal((await again.json()).product_id,id);
 const product=(await (await req('/api/admin/products',{actor:'admin'})).json()).products.find(p=>p.id===id);assert.equal(product.is_kit,1);assert.equal(product.personalizable,true);assert.equal(product.files.length,1);assert.equal(product.media.length,1);const copied=await DB.prepare('SELECT object_key FROM product_media WHERE product_id=?').bind(id).first();assert.notEqual(copied.object_key,photoKey);assert.deepEqual(new Uint8Array(await (await BUCKET.get(copied.object_key)).arrayBuffer()),photo);

 const pdf=await req('/api/admin/files/'+product.files[0].id+'/download',{actor:'admin'});assert.equal(await kitZipPages(new Uint8Array(await pdf.arrayBuffer())),8);
 const source=await DB.prepare('SELECT source_key FROM product_personalization_sources WHERE product_id=?').bind(id).first();const snapshot=JSON.parse(await (await BUCKET.get(source.source_key)).text());assert.equal(snapshot.items.length,4);assert.equal(snapshot.items[1].document.fields[0].font,'cookie');
 await req('/api/admin/studio/templates/'+items[0].id,{actor:'admin',method:'PATCH',body:{...items[0],title:'Mudou depois do kit'}});assert.equal(JSON.parse(await (await BUCKET.get(source.source_key)).text()).items[0].title,items[0].title);
 await req('/api/me',{actor:'viewer'});await DB.prepare("INSERT INTO orders(id,order_number,user_id,currency,subtotal_cents,total_cents,status,created_at) VALUES('kit-order','KIT-1','viewer-subject','BRL',9130,9130,'pending','2026-11-15')").run();
 await DB.prepare("INSERT INTO order_items(id,order_id,product_id,product_title_snapshot,unit_price_cents,quantity) VALUES('kit-item','kit-order',?,'Kit de teste',9130,1)").bind(id).run();
 const path='/api/me/purchases/kit-item',personal={name:'Sofia',age:'1 aninho',confirmed:true};assert.equal((await req(path+'/personalize',{actor:'viewer',method:'POST',body:personal})).status,403);
 await DB.prepare("UPDATE orders SET status='paid' WHERE id='kit-order'").run();const rendered=await req(path+'/personalize',{actor:'viewer',method:'POST',body:personal});assert.equal(rendered.status,200,await rendered.clone().text());const memberJob=await rendered.json();assert.equal(memberJob.parts,4);
 assert.equal((await req(path+'/personalize',{actor:'viewer',method:'POST',body:{...personal,name:'Outro nome',stage:'part',job_id:memberJob.job_id,index:0}})).status,400);
 assert.equal((await req(path+'/pdf',{actor:'viewer'})).status,409);
 for(let index=0;index<memberJob.parts;index++){const part=await req(path+'/personalize',{actor:'viewer',method:'POST',body:{...personal,stage:'part',job_id:memberJob.job_id,index}});assert.equal(part.status,200,await part.clone().text());}
 const finished=await req(path+'/personalize',{actor:'viewer',method:'POST',body:{...personal,stage:'finish',job_id:memberJob.job_id}});assert.equal(finished.status,201,await finished.clone().text());
 const file=await req(path+'/pdf',{actor:'viewer'});assert.equal(file.headers.get('content-type'),'application/zip');assert.equal(await kitZipPages(new Uint8Array(await file.arrayBuffer())),8);
 assert.equal((await req(path+'/personalize',{actor:'viewer',method:'POST',body:{...personal,name:'Outro nome'}})).status,409);assert.equal((await req(path+'/pdf',{actor:'other'})).status,404);
});

async function kitZipPages(bytes){const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);assert.equal(view.getUint32(bytes.length-22,true),0x06054b50);const count=view.getUint16(bytes.length-12,true);assert.equal(count,4);let at=view.getUint32(bytes.length-6,true),pages=0;for(let i=0;i<count;i++){assert.equal(view.getUint32(at,true),0x02014b50);assert.equal(view.getUint16(at+10,true),0);const size=view.getUint32(at+20,true),offset=view.getUint32(at+42,true),name=view.getUint16(at+28,true);assert.equal(view.getUint32(offset,true),0x04034b50);const start=offset+30+view.getUint16(offset+26,true)+view.getUint16(offset+28,true),data=bytes.subarray(start,start+size);assert.equal(crc32(data),view.getUint32(at+16,true));pages+=(await PDFDocument.load(data)).getPageCount();at+=46+name+view.getUint16(at+30,true)+view.getUint16(at+32,true);}return pages;}

test('studio: new artwork copies saved molds independently and enforces revision and access',async()=>{
 const created=await req('/api/admin/studio/templates',{actor:'admin',method:'POST',body:{title:'Molde para reutilizar',theme:'Original',document:newDocument('tag-60x40')}});const source=(await created.json()).template;
 const endpoint='/api/admin/studio/templates/'+source.id+'/clone',body={title:'Nova arte de Natal',theme:'Natal',revision:source.revision,mode:'blank'};
 assert.equal((await req(endpoint,{actor:'viewer',method:'POST',body})).status,403);
 assert.equal((await req(endpoint,{actor:'admin',method:'POST',body:{...body,revision:999}})).status,409);
 for(const mode of ['blank','copy']){const r=await req(endpoint,{actor:'admin',method:'POST',body:{...body,mode}});assert.equal(r.status,201,await r.clone().text());const result=await r.json();assert.notEqual(result.template.id,source.id);assert.equal(result.template.document.structure,source.document.structure);assert.equal(result.template.document.fields.length,mode==='blank'?0:source.document.fields.length);assert.deepEqual(result.versions,[]);}
 const original=await (await req('/api/admin/studio/templates/'+source.id,{actor:'admin'})).json();assert.equal(original.template.title,source.title);assert.equal(original.template.revision,source.revision);
});

test('studio: admins delete unused uploaded images while current and approved references remain protected',async()=>{
 const created=await req('/api/admin/studio/templates',{actor:'admin',method:'POST',body:{title:'Excluir arte teste',document:newDocument('art-a4')}});const t=(await created.json()).template;
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');const f=new FormData();f.set('file',new File([png],'remover.png'));
 const uploaded=await req('/api/admin/studio/templates/'+t.id+'/assets',{actor:'admin',method:'POST',body:f});const a=(await uploaded.json()).assets[0],url='/api/admin/studio/assets/'+a.id;
 assert.equal((await req(url,{actor:'viewer',method:'DELETE'})).status,403);
 const download=await req(url+'/download',{actor:'admin'});assert.equal(download.status,200);assert.match(download.headers.get('content-disposition'),/^attachment;/);assert.match(download.headers.get('content-disposition'),/remover.png/);assert.equal(download.headers.get('content-type'),'image/png');assert.deepEqual(Buffer.from(await download.arrayBuffer()),png);assert.equal((await req(url+'/download',{actor:'viewer'})).status,403);assert.equal((await req(url+'/download')).status,401);
 const d={...t.document,images:[{id:'im',asset:a.id,face:'page',x:10,y:10,w:20,h:20}]};
 await DB.prepare('UPDATE studio_templates SET document_json=? WHERE id=?').bind(JSON.stringify(d),t.id).run();
 assert.equal((await req(url,{actor:'admin',method:'DELETE'})).status,409);
 await DB.prepare('UPDATE studio_templates SET document_json=? WHERE id=?').bind(JSON.stringify(t.document),t.id).run();
 const deleted=await req(url,{actor:'admin',method:'DELETE'});assert.equal(deleted.status,200,await deleted.clone().text());assert.deepEqual((await deleted.json()).assets,[]);
 assert.equal((await req(url,{actor:'admin'})).status,404);
 assert.equal((await req('/api/admin/studio/assets/'+studioAsset.id,{actor:'admin',method:'DELETE'})).status,409);
});

test('studio trash hides duplicates reversibly without removing documents or assets',async()=>{
 const made=await req('/api/admin/studio/templates',{actor:'admin',method:'POST',body:{title:'Duplicado para lixeira',theme:'Safari',document:newDocument('art-a4')}}),t=(await made.json()).template,path='/api/admin/studio/templates/'+t.id;
 assert.equal((await req(path+'/trash',{actor:'viewer',method:'POST',body:{revision:t.revision}})).status,403);
 assert.equal((await req(path+'/trash',{actor:'admin',method:'POST',body:{revision:t.revision+1}})).status,409);
 assert.equal((await req(path+'/trash',{actor:'admin',method:'POST',body:{revision:t.revision}})).status,200);
 for(const suffix of ['', '?archived=1'])assert.ok(!(await (await req('/api/admin/studio/templates'+suffix,{actor:'admin'})).json()).templates.some(x=>x.id===t.id));
 assert.ok((await (await req('/api/admin/studio/templates?deleted=1',{actor:'admin'})).json()).templates.find(x=>x.id===t.id).deleted_at);
 const preserved=(await (await req(path,{actor:'admin'})).json()).template;assert.deepEqual(preserved.document,t.document);
 assert.equal((await req(path+'/untrash',{actor:'admin',method:'POST',body:{revision:t.revision}})).status,200);
 assert.ok((await (await req('/api/admin/studio/templates',{actor:'admin'})).json()).templates.some(x=>x.id===t.id));
});

test('product classification rejects mixed types, conflicting kit flags and missing active identities',async()=>{
 const type=await req('/api/admin/taxonomies',{actor:'admin',method:'POST',body:{kind:'type',label:'Tag retangular'}}),tag=(await type.json()).id;
 const topper=(await (await req('/api/admin/taxonomies',{actor:'admin',method:'POST',body:{kind:'type',label:'Topper'}})).json()).id;
 const secondTheme=(await (await req('/api/admin/taxonomies',{actor:'admin',method:'POST',body:{kind:'theme',label:'Safari teste classificação'}})).json()).id;
 const kit=(await (await req('/api/admin/taxonomies',{actor:'admin',method:'POST',body:{kind:'type',label:'Kits'}})).json()).id;
 for(const overrides of [{taxonomy_ids:[tag,value.taxonomy_ids[0],secondTheme]},{taxonomy_ids:[tag,topper]},{taxonomy_ids:[tag],is_kit:true},{taxonomy_ids:[kit],is_kit:false},{taxonomy_ids:[topper]},{taxonomy_ids:[tag],is_kit:'0'},{taxonomy_ids:[],status:'active'}]){
 const r=await req('/api/admin/products',{actor:'admin',method:'POST',body:{...value,title:'Tag retangular Safari',slug:'classification-'+crypto.randomUUID(),is_kit:false,...overrides}});assert.equal(r.status,400,await r.clone().text());
 }
 const valid=await req('/api/admin/products',{actor:'admin',method:'POST',body:{...value,title:'Tag retangular Safari',slug:'classification-valid',taxonomy_ids:[tag,value.taxonomy_ids[0]],is_kit:false}});assert.equal(valid.status,201,await valid.clone().text());
 const validKit=await req('/api/admin/products',{actor:'admin',method:'POST',body:{...value,title:'Kit de tags Safari',slug:'classification-valid-kit',taxonomy_ids:[kit,secondTheme],is_kit:true}});assert.equal(validKit.status,201,await validKit.clone().text());
});

test('archived product trash is reversible, revision checked, and preserves original files',async()=>{
 const made=await req('/api/admin/products',{actor:'admin',method:'POST',body:{...value,title:'Calendário duplicado para lixeira',slug:'trash-calendar-duplicate'}});assert.equal(made.status,201,await made.clone().text());const p=(await made.json()).product,path='/api/admin/products/'+p.id;
 assert.equal((await req(path+'/trash',{actor:'admin',method:'POST',body:{revision:p.revision}})).status,400);
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64'),form=new FormData();form.set('file',new File([png],'original.png'));
 assert.equal((await req(path+'/files',{actor:'admin',method:'POST',body:form})).status,201);
 assert.equal((await req(path,{actor:'admin',method:'DELETE'})).status,200);
 const list=async()=> (await (await req('/api/admin/products',{actor:'admin'})).json()).products;
 const archived=(await list()).find(q=>q.id===p.id),revision=archived.revision;
 assert.equal((await req(path+'/trash',{actor:'viewer',method:'POST',body:{revision}})).status,403);
 assert.equal((await req(path+'/trash',{actor:'admin',method:'POST',body:{revision:revision-1}})).status,409);
 assert.equal((await req(path+'/trash',{actor:'admin',method:'POST',body:{revision}})).status,200);
 const deleted=(await list()).find(q=>q.id===p.id);assert.ok(deleted.deleted_at);assert.equal(deleted.status,'archived');assert.deepEqual(deleted.files,archived.files);
 assert.equal((await req(path,{actor:'admin',method:'PATCH',body:{...value,slug:p.slug,revision,status:'draft'}})).status,409);
 assert.equal((await req('/api/admin/files/'+deleted.files[0].id+'/download',{actor:'admin'})).status,200);
 assert.equal((await req(path+'/untrash',{actor:'admin',method:'POST',body:{revision}})).status,200);
 const restored=(await list()).find(q=>q.id===p.id);assert.equal(restored.deleted_at,null);assert.equal(restored.status,'archived');assert.deepEqual(restored.files,archived.files);
});

test('library exposes model identity, private thumbnails and stale product revision indicators',async()=>{
 const made=await req('/api/admin/studio/templates',{actor:'admin',method:'POST',body:{title:'Tag retangular teste biblioteca',theme:'Safari',document:newDocument('tag-60x40')}}),t=(await made.json()).template,path='/api/admin/studio/templates/'+t.id;
 const prepared=await req(path+'/product',{actor:'admin',method:'POST',body:{revision:t.revision,price_cents:690,blank:true}});assert.equal(prepared.status,201,await prepared.clone().text());const productId=(await prepared.json()).product_id;
 assert.equal((await req(path+'/preview',{actor:'viewer'})).status,403);assert.equal((await req(path+'/preview')).status,401);
 const preview=await req(path+'/preview',{actor:'admin'});assert.equal(preview.status,200);assert.equal(preview.headers.get('content-type'),'image/svg+xml');assert.match(await preview.text(),/<svg/);
 await req(path,{actor:'admin',method:'PATCH',body:{...t,title:t.title+' atualizada',document:t.document}});
 const list=(await (await req('/api/admin/studio/templates',{actor:'admin'})).json()).templates,item=list.find(x=>x.id===t.id);assert.ok(item.model.key);assert.match(item.preview_url,/revision=2/);assert.equal(item.document_json,undefined);assert.equal(item.linked_products.find(p=>p.id===productId).outdated,true);
 const p=(await (await req('/api/admin/products',{actor:'admin'})).json()).products.find(p=>p.id===productId);assert.equal(p.template_revision,2);assert.equal(p.source_revision,1);assert.equal(p.mold_model_key,'product:'+productId);
});

test('classification creation reuses normalized labels and sync is admin-only and idempotent',async()=>{
 const first=await req('/api/admin/taxonomies',{actor:'admin',method:'POST',body:{kind:'theme',label:'Tema Árvore Unificado'}});assert.equal(first.status,201);const a=await first.json();const second=await req('/api/admin/taxonomies',{actor:'admin',method:'POST',body:{kind:'theme',label:'  TEMA arvore   unificado  '}});assert.equal(second.status,200);assert.equal((await second.json()).id,a.id);
 assert.equal((await req('/api/admin/taxonomies/sync',{actor:'viewer',method:'POST'})).status,403);
 assert.equal((await req('/api/admin/taxonomies/sync',{actor:'admin',method:'POST'})).status,200);
 const before=(await (await req('/api/taxonomies')).json()).taxonomies.length;assert.equal((await req('/api/admin/taxonomies/sync',{actor:'admin',method:'POST'})).status,200);assert.equal((await (await req('/api/taxonomies')).json()).taxonomies.length,before);
});
test('classified creation requires metadata and product inherits type and theme from Studio',async()=>{
 const d=newDocument('tag-60x40');d.catalog={family:'tag',variant:'Retangular',size:'60 × 40 mm',baseModel:'classified-create-test'};const body={title:'Tag retangular classificada',theme:'Tema Unificado Novo',document:d,classification_required:true};
 const denied=await req('/api/admin/studio/templates',{actor:'admin',method:'POST',body:{...body,theme:''}});assert.equal(denied.status,400);
 const made=await req('/api/admin/studio/templates',{actor:'admin',method:'POST',body});assert.equal(made.status,201);const t=(await made.json()).template;
 const requiredClone=await req('/api/admin/studio/templates/'+t.id+'/clone',{actor:'admin',method:'POST',body:{title:'Nova arte classificada',theme:'',mode:'blank',revision:t.revision,classification_required:true}});assert.equal(requiredClone.status,400);
 const prepared=await req('/api/admin/studio/templates/'+t.id+'/product',{actor:'admin',method:'POST',body:{revision:t.revision,price_cents:690,blank:true}});assert.equal(prepared.status,201);const productId=(await prepared.json()).product_id;
 const product=(await (await req('/api/admin/products',{actor:'admin'})).json()).products.find(p=>p.id===productId);assert.ok(product.taxonomies.some(t=>t.kind==='type'&&t.label==='Tag retangular'));assert.ok(product.taxonomies.some(t=>t.kind==='theme'&&t.label===body.theme));
});
