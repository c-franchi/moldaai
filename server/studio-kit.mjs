import {writeKitZip} from './kit-zip.mjs';
import {startKitJob,getKitJob,renderKitPart,finishKitJob,clearKitJob} from './kit-jobs.mjs';
import {validateDocument} from '../public/studio-model.mjs';
import {renderSourcePDF} from './studio-source.mjs';
export function kitItemsWithVariants(items,includeSingle=false){
 const result=[...items];if(includeSingle)for(const item of items){if(item.document.structure==='milk-a4'&&item.document.printLayout?.mode==='two'){
  const single=structuredClone(item);single.title=item.title.replace(/2 folhas/g,'1 folha')+' · mesma arte';single.document.printLayout.mode='single';result.push(single);
 }}if(result.length>12)throw new Error('O kit excede 12 modelos incluindo as versões de uma folha.');return result;
}
export async function createStudioKit(r,env,user,{json,fail,readJSON}){
 let b=await readJSON(r);const db=env.DB;let job;
 if(b.stage==='part'||b.stage==='finish'){try{job=await getKitJob(env,b.job_id,user.id,'admin');}catch(error){fail(400,error.message);}if(b.stage==='part'){await renderKitPart(env,b.job_id,job,b.index);return json({ok:true});}b={...job.body,stage:'finish',job_id:b.job_id};}

 if(!Array.isArray(b.items)||b.items.length<2||b.items.length>12||new Set(b.items.map(i=>i.template_id)).size!==b.items.length)fail(400,'Selecione de 2 a 12 modelos diferentes.');
 const title=typeof b.title==='string'?b.title.trim():'';if(title.length<3||title.length>160||!Number.isSafeInteger(b.price_cents)||b.price_cents<=0||b.price_cents>100000000)fail(400,'Informe nome e preço válidos para o kit.');
 let items=[];for(const selected of b.items){
  const row=await db.prepare('SELECT * FROM studio_templates WHERE id=?').bind(selected.template_id).first();if(!row)fail(404,'Um dos modelos não foi encontrado.');if(row.revision!==selected.revision)fail(409,'Um dos modelos mudou. Atualize a lista e confira o kit.');
  const document=validateDocument(JSON.parse(row.document_json));for(const asset of new Set(document.images.map(i=>i.asset))){if(!await db.prepare('SELECT id FROM studio_assets WHERE id=? AND template_id=?').bind(asset,row.id).first())fail(400,'Arte não pertence ao modelo selecionado.');}
  items.push({template_id:row.id,source_revision:row.revision,title:row.title,theme:row.theme,document});
 }
 try{items=kitItemsWithVariants(items,b.include_single_milk===true);}catch(error){fail(400,error.message);}
 const digest=async data=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',data))].map(x=>x.toString(16).padStart(2,'0')).join('');
 const signature=items.map(i=>[i.template_id,i.source_revision,i.document.printLayout?.mode||'']).sort((a,b)=>a[0].localeCompare(b[0]));
 const id='studio-kit-'+(await digest(new TextEncoder().encode(JSON.stringify(signature)))).slice(0,24);
 if(await db.prepare('SELECT id FROM products WHERE id=?').bind(id).first())return json({product_id:id,existing:true});
 const source={kind:'kit',title,theme:items[0].theme,items,created_at:new Date().toISOString()};
 if(b.stage==='prepare'){
  const previous=await env.BUCKET.list({prefix:'kit-jobs/',limit:1000});
  for(const entry of previous.objects.filter(o=>o.key.endsWith('/job.json')).sort((a,b)=>new Date(b.uploaded)-new Date(a.uploaded))){const object=await env.BUCKET.get(entry.key),cached=object&&JSON.parse(await object.text());if(cached?.owner===user.id&&cached.purpose==='admin'&&Date.now()-cached.created_at<86400000&&cached.body?.title===b.title&&cached.body?.price_cents===b.price_cents&&JSON.stringify(cached.source.items.map(i=>[i.template_id,i.source_revision,i.document.printLayout?.mode||'']).sort((a,b)=>a[0].localeCompare(b[0])))===JSON.stringify(signature))return json({job_id:entry.key.split('/')[1],parts:cached.source.items.length});}
  return json(await startKitJob(env,{owner:user.id,purpose:'admin',source,body:b,blank:true}));
 }

 const bytes=b.stage==='finish'?null:await renderSourcePDF(source,{name:'',age:''},async(templateId,asset)=>{const a=await db.prepare('SELECT object_key,mime FROM studio_assets WHERE id=? AND template_id=?').bind(asset,templateId).first(),obj=a&&await env.BUCKET.get(a.object_key);return obj?{mime:a.mime,data:new Uint8Array(await obj.arrayBuffer())}:null;},{blankPersonalization:true});
 if(bytes&&bytes.length>100*1024*1024)fail(400,'O PDF do kit excede 100 MB. Reduza o tamanho das imagens.');
 // Recheck all revisions after the PDF generation, then guard the atomic writes.
 for(const item of items){const row=await db.prepare('SELECT revision FROM studio_templates WHERE id=?').bind(item.template_id).first();if(row?.revision!==item.source_revision)fail(409,'Um modelo mudou durante a geração. Confira antes de tentar novamente.');}
 const file=crypto.randomUUID(),at=source.created_at,key='digital-products/'+id+'/'+file,sourceKey='studio-products/'+id+'/'+file+'-source.json';
 const archive=b.stage==='finish'?await writeKitZip(env,b.job_id,job,key):{size:bytes.length,sha256:await digest(bytes),mime:'application/pdf',format:'PDF',filename:'kit-jardim-encantado-moldes-e-guias.pdf'};
 if(bytes)await env.BUCKET.put(key,bytes,{httpMetadata:{contentType:'application/pdf'}});source.output_format=archive.format;await env.BUCKET.put(sourceKey,JSON.stringify(source),{httpMetadata:{contentType:'application/json'}});
 const list=items.map(i=>'• '+i.title).join('\n');
 const description='Kit digital com todos os modelos selecionados:\n'+list+'\n\nInclui arquivos PDF A4 em escala real com as artes e os guias de cada modelo, organizados em um ZIP. Após o pagamento confirmado, informe e confirme uma única vez o nome e o complemento em Meus moldes: o mesmo nome será aplicado a todo o kit. Fotos ilustrativas. Não inclui produtos físicos, doces, bolo, fitas, palitos, balões, painel, fotografia ou camiseta.';
 const revisionGuard=items.map(()=> 'EXISTS(SELECT 1 FROM studio_templates WHERE id=? AND revision=?)').join(' AND '),guardValues=items.flatMap(i=>[i.template_id,i.source_revision]);
 const photos=[];try{for(const templateId of new Set(items.map(i=>i.template_id))){const photo=await db.prepare("SELECT m.object_key,p.title FROM product_media m JOIN products p ON p.id=m.product_id WHERE p.id LIKE ? AND p.status='active' AND m.is_hidden=0 ORDER BY m.is_cover DESC,p.updated_at DESC,m.sort_order LIMIT 1").bind('studio-'+templateId+'-r%').first();if(photo){const object=await env.BUCKET.get(photo.object_key);if(object){const copyKey='kit-media/'+id+'/'+crypto.randomUUID();await env.BUCKET.put(copyKey,new Uint8Array(await object.arrayBuffer()),{httpMetadata:object.httpMetadata});photos.push({...photo,object_key:copyKey});}}}}catch(error){await env.BUCKET.delete([key,sourceKey,...photos.map(p=>p.object_key)]);throw error;}
 const photoStatements=photos.map((photo,i)=>db.prepare('INSERT INTO product_media(id,product_id,object_key,alt_text,sort_order,is_cover) SELECT ?,?,?,?,?,0 WHERE EXISTS(SELECT 1 FROM products WHERE id=?)').bind(crypto.randomUUID(),id,photo.object_key,photo.title+' · produto incluído no kit',10+i,id));
 try{const result=await db.batch([
  db.prepare("INSERT INTO products(id,slug,title,short_description,description,price_cents,status,featured,is_kit,license_text,formats_json,dimensions,instructions,created_at,updated_at) SELECT ?,?,?,?,?,?,'draft',0,1,?,'[\"PDF\",\"ZIP\"]',?,?,?,? WHERE "+revisionGuard).bind(id,'kit-'+id.slice(11),title,'Kit digital Jardim Encantado: todos os moldes em PDF, com uma única personalização de nome para o conjunto.',description,b.price_cents,'Uso pessoal e produção de peças físicas para venda. Não revender nem redistribuir os arquivos digitais.','PDF A4; medidas próprias de cada modelo; imprimir em 100%. Papel 180 a 240 g/m².','Os guias de corte e acabamento acompanham cada modelo dentro do PDF do kit.',at,at,...guardValues),
  db.prepare("INSERT INTO product_files(id,product_id,object_key,original_filename,mime_type,bytes,sha256,format,version,is_active) SELECT ?,?,?,?,?,?,?,?,?,1 WHERE EXISTS(SELECT 1 FROM products WHERE id=?)").bind(file,id,key,archive.filename,archive.mime,archive.size,archive.sha256,archive.format,Date.now(),id),
  db.prepare('INSERT INTO product_personalization_sources(product_id,source_key,source_revision,created_at) SELECT ?,?,1,? WHERE EXISTS(SELECT 1 FROM products WHERE id=?)').bind(id,sourceKey,at,id),
  ...photoStatements
 ]);if(!result[0].meta.changes)fail(409,'Um modelo mudou durante a preparação. Atualize a lista.');}
 catch(error){await env.BUCKET.delete([key,sourceKey,...photos.map(p=>p.object_key)]);if(await db.prepare('SELECT id FROM products WHERE id=?').bind(id).first())return json({product_id:id,existing:true});throw error;}
 if(job)await clearKitJob(env,b.job_id,job);
 return json({product_id:id,existing:false,model_count:items.length,bytes:archive.size},201);
}
