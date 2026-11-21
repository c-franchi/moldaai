import {ensureStudioClassifications} from './studio-classifications.mjs';
import {modelIdentity} from '../public/studio-library.mjs';
import {studioThumbnail} from './studio-thumbnail.mjs';
import {studioAIAPI} from './studio-ai.mjs';
import {createStudioKit} from './studio-kit.mjs';
import {assemblyInstructions,productionRules,templateProductInfo} from '../public/studio-production.mjs';
import {validateDocument,blankStudioDocument,STRUCTURES,personalization,geometry} from '../public/studio-model.mjs';
import {renderStudioPDF} from './studio-pdf.mjs';
export async function studioAPI(r,env,user,{json,fail,readJSON,bodyLimited,detectFile}){
 if(/^\/api\/admin\/studio\/(ai\/|templates\/[-\w]+\/ai$)/.test(new URL(r.url).pathname))return studioAIAPI(r,env,user,{json,fail,bodyLimited,detectFile});
 if(new URL(r.url).pathname==='/api/admin/studio/kits'&&r.method==='POST')return createStudioKit(r,env,user,{json,fail,readJSON});
 const path=new URL(r.url).pathname,method=r.method,db=env.DB,now=()=>new Date().toISOString(),uid=()=>crypto.randomUUID();
 const record=row=>row?{...row,document:JSON.parse(row.document_json),document_json:undefined}:null;
 const get=async id=>{const row=await db.prepare('SELECT * FROM studio_templates WHERE id=?').bind(id).first();if(!row)fail(404,'Template não encontrado.');return row;};
 const assets=async id=>(await db.prepare('SELECT id,filename,mime,bytes FROM studio_assets WHERE template_id=? ORDER BY rowid').bind(id).all()).results.map(a=>({...a,url:'/api/admin/studio/assets/'+a.id}));
 const checkAssets=async(d,id)=>{for(const asset of new Set(d.images.map(i=>i.asset))){const a=await db.prepare('SELECT id FROM studio_assets WHERE id=? AND template_id=?').bind(asset,id).first();if(!a)fail(400,'A arte não pertence a este template.');}};
 const valid=body=>{try{return validateDocument(body)}catch(e){fail(400,e.message)}};
 const text=(v,n)=>typeof v==='string'?v.trim().slice(0,n):'';
 if(path==='/api/admin/studio/templates'&&method==='GET'){
  await db.prepare('CREATE TABLE IF NOT EXISTS studio_archives(template_id TEXT PRIMARY KEY,archived_at TEXT NOT NULL)').run();
  await db.prepare('CREATE TABLE IF NOT EXISTS studio_trash(template_id TEXT PRIMARY KEY,deleted_at TEXT NOT NULL)').run();
  const deleted=new URL(r.url).searchParams.get('deleted')==='1',archived=new URL(r.url).searchParams.get('archived')==='1';
  const productLinks=(await db.prepare("SELECT p.id,p.title,s.source_revision FROM products p JOIN product_personalization_sources s ON s.product_id=p.id WHERE p.status!='archived'").all()).results;
  return json({templates:(await db.prepare('SELECT t.id,t.title,t.theme,t.source_note,t.revision,t.updated_at,t.document_json,json_extract(t.document_json,\'$.structure\') AS structure,json_extract(t.document_json,\'$.catalog\') AS catalog_json,json_array_length(json_extract(t.document_json,\'$.images\')) AS image_count,a.archived_at,z.deleted_at FROM studio_templates t LEFT JOIN studio_archives a ON a.template_id=t.id LEFT JOIN studio_trash z ON z.template_id=t.id '+(deleted?'WHERE z.template_id IS NOT NULL ':'WHERE z.template_id IS NULL '+(archived?'':'AND a.template_id IS NULL '))+'ORDER BY t.updated_at DESC').all()).results.map(t=>({...t,linked_products:productLinks.filter(p=>/^studio-(.+)-r[0-9]+$/.exec(p.id)?.[1]===t.id).map(p=>({...p,outdated:p.source_revision<t.revision,current_revision:t.revision})),model:modelIdentity(JSON.parse(t.document_json),t.title,t.id),preview_url:'/api/admin/studio/templates/'+t.id+'/preview?revision='+t.revision,document_json:undefined,catalog:t.catalog_json?JSON.parse(t.catalog_json):undefined,catalog_json:undefined})),structures:STRUCTURES});
 }
 if(path==='/api/admin/studio/templates'&&method==='POST'){
  const b=await readJSON(r),d=valid(b.document),title=text(b.title,160);if(title.length<3)fail(400,'Informe um título com pelo menos 3 caracteres.');if(b.classification_required&&(!b.theme?.trim()||b.theme.trim().length<2||b.theme.trim().length>80||!d.catalog||d.catalog.family==='other'))fail(400,'Escolha um tipo de molde e informe um tema antes de criar.');if(d.images.length)fail(400,'Salve o template antes de enviar as artes.');const id=uid(),at=now();
  await db.prepare('INSERT INTO studio_templates(id,title,theme,source_note,document_json,created_at,updated_at) VALUES(?,?,?,?,?,?,?)').bind(id,title,text(b.theme,100),text(b.source_note,800),JSON.stringify(d),at,at).run();await ensureStudioClassifications(db,d,title,text(b.theme,100));return json({template:record(await get(id)),assets:[],versions:[]},201);
 }
 let m=path.match(/^\/api\/admin\/studio\/assets\/([-\w]+)(?:\/(download))?$/);
 if(m&&method==='GET'){const a=await db.prepare('SELECT * FROM studio_assets WHERE id=?').bind(m[1]).first();if(!a)fail(404,'Arte não encontrada.');const obj=await env.BUCKET.get(a.object_key);if(!obj)fail(404,'Arte indisponível.');const headers={'content-type':a.mime,'cache-control':'private, no-store','x-content-type-options':'nosniff'};if(m[2]==='download'){const name=(a.filename||'arte').replace(/[\x00-\x1f\x7f"\\/]/g,'_').slice(0,150);headers['content-disposition']='attachment; filename="arte'+(a.mime==='image/jpeg'?'.jpg':'.png')+'"; filename*=UTF-8\'\''+encodeURIComponent(name).replace(/['()*]/g,c=>'%'+c.charCodeAt(0).toString(16).toUpperCase());}return new Response(obj.body,{headers});}
 if(m&&!m[2]&&method==='DELETE'){
  const a=await db.prepare('SELECT * FROM studio_assets WHERE id=?').bind(m[1]).first();if(!a)fail(404,'Arte não encontrada.');
  // Keep assets referenced by the current document or any approved snapshot.
  const used=await db.prepare("SELECT id FROM studio_templates WHERE EXISTS (SELECT 1 FROM json_each(document_json,'$.images') WHERE json_extract(value,'$.asset')=?) UNION ALL SELECT id FROM studio_versions WHERE EXISTS (SELECT 1 FROM json_each(document_json,'$.images') WHERE json_extract(value,'$.asset')=?) LIMIT 1").bind(a.id,a.id).first();
  if(used)fail(409,'Esta imagem está em uso no molde ou em uma versão aprovada. Remova suas aplicações do molde antes de excluir; imagens de versões aprovadas precisam ser preservadas.');
  // Recheck inside the deletion statement to protect against a concurrent save.
  await db.prepare("DELETE FROM studio_assets WHERE id=? AND NOT EXISTS (SELECT 1 FROM studio_templates,json_each(document_json,'$.images') WHERE json_extract(value,'$.asset')=?) AND NOT EXISTS (SELECT 1 FROM studio_versions,json_each(document_json,'$.images') WHERE json_extract(value,'$.asset')=?)").bind(a.id,a.id,a.id).run();
  if(await db.prepare('SELECT id FROM studio_assets WHERE id=?').bind(a.id).first())fail(409,'A imagem passou a ser usada. Atualize o molde antes de excluir.');
  // Copies of templates can share the same object. Retain bytes for those copies.
  const aiTable=await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='studio_ai_jobs'").first();const aiPreview=aiTable&&await db.prepare("SELECT id FROM studio_ai_jobs WHERE object_key=? AND status IN ('ready','accepted') LIMIT 1").bind(a.object_key).first();
  if(!aiPreview&&!await db.prepare('SELECT id FROM studio_assets WHERE object_key=?').bind(a.object_key).first())await env.BUCKET.delete(a.object_key);
  return json({ok:true,assets:await assets(a.template_id)});
 }
 m=path.match(/^\/api\/admin\/studio\/templates\/([-\w]+)(?:\/(assets|approve|pdf|package|product|refresh-product|archive|restore|trash|untrash|preview|clone))?$/);
 if(!m)fail(404,'Recurso do Estúdio não encontrado.');const [,id,action]=m,row=await get(id);
 if(action==='preview'&&method==='GET'){const svg=await studioThumbnail(JSON.parse(row.document_json),async asset=>{const a=await db.prepare('SELECT * FROM studio_assets WHERE id=? AND template_id=?').bind(asset,id).first();if(!a||a.bytes>1024*1024)return null;const obj=await env.BUCKET.get(a.object_key);return obj?{mime:a.mime,data:new Uint8Array(await obj.arrayBuffer())}:null;});return new Response(svg,{headers:{'content-type':'image/svg+xml','cache-control':'private, no-cache','x-content-type-options':'nosniff','content-security-policy':"default-src 'none'; img-src data:; style-src 'unsafe-inline'; sandbox"}});}
 const detail=async()=>({template:record(await get(id)),assets:await assets(id),versions:(await db.prepare('SELECT id,source_revision,title,theme,validation_note,created_at FROM studio_versions WHERE template_id=? ORDER BY source_revision DESC').bind(id).all()).results});
 if((action==='trash'||action==='untrash')&&method==='POST'){
  const b=await readJSON(r);if(b.revision!==row.revision)fail(409,'O molde mudou. Atualize antes de excluir ou restaurar.');
  await db.prepare('CREATE TABLE IF NOT EXISTS studio_trash(template_id TEXT PRIMARY KEY,deleted_at TEXT NOT NULL)').run();
  if(action==='trash')await db.prepare('INSERT OR REPLACE INTO studio_trash(template_id,deleted_at) VALUES(?,?)').bind(id,now()).run();
  else await db.prepare('DELETE FROM studio_trash WHERE template_id=?').bind(id).run();
  return json({ok:true,deleted:action==='trash'});
 }
 if(action==='clone'&&method==='POST'){
  const b=await readJSON(r);if(b.revision!==row.revision)fail(409,'O molde mudou. Atualize e tente novamente.');
  const title=text(b.title,160);if(title.length<3)fail(400,'Informe um título com pelo menos 3 caracteres.');if(!['blank','copy'].includes(b.mode))fail(400,'Escolha como iniciar a arte.');
  const d=JSON.parse(row.document_json),newId=uid(),at=now(),statements=[];
  if(b.mode==='blank'){Object.assign(d,blankStudioDocument(d));delete d.faceLinks;}
  else{for(const a of (await db.prepare('SELECT * FROM studio_assets WHERE template_id=?').bind(id).all()).results){const aid=uid();for(const image of d.images)if(image.asset===a.id)image.asset=aid;statements.push(db.prepare('INSERT INTO studio_assets(id,template_id,object_key,filename,mime,bytes) VALUES(?,?,?,?,?,?)').bind(aid,newId,a.object_key,a.filename,a.mime,a.bytes));}}
  if(b.classification_required&&(!b.theme?.trim()||b.theme.trim().length<2||b.theme.trim().length>80))fail(400,'Informe um tema de 2 a 80 caracteres para a nova arte.');if(b.classification_required&&modelIdentity(d,row.title).family==='other')fail(400,'Classifique o tipo do molde de origem antes de criar uma nova arte.');const document=valid(d);await ensureStudioClassifications(db,document,title,text(b.theme,100));statements.unshift(db.prepare('INSERT INTO studio_templates(id,title,theme,source_note,document_json,created_at,updated_at) VALUES(?,?,?,?,?,?,?)').bind(newId,title,text(b.theme,100),text('Derivado do molde '+id+' · revisão '+row.revision,800),JSON.stringify(document),at,at));await db.batch(statements);
  return json({template:record(await get(newId)),assets:await assets(newId),versions:[]},201);
 }
 if((action==='archive'||action==='restore')&&method==='POST'){
  const b=await readJSON(r);if(b.revision!==row.revision)fail(409,'O template mudou. Atualize a lista antes de arquivar.');
  await db.prepare('CREATE TABLE IF NOT EXISTS studio_archives(template_id TEXT PRIMARY KEY,archived_at TEXT NOT NULL)').run();
  if(action==='archive')await db.prepare('INSERT OR REPLACE INTO studio_archives(template_id,archived_at) VALUES(?,?)').bind(id,now()).run();
  else await db.prepare('DELETE FROM studio_archives WHERE template_id=?').bind(id).run();
  return json({ok:true,archived:action==='archive'});
 }
 if(!action&&method==='GET')return json(await detail());
 if(!action&&method==='PATCH'){
  const b=await readJSON(r),d=valid(b.document),title=text(b.title,160);if(title.length<3)fail(400,'Informe um título.');await checkAssets(d,id);
  const result=await db.prepare('UPDATE studio_templates SET title=?,theme=?,source_note=?,document_json=?,revision=revision+1,updated_at=? WHERE id=? AND revision=?').bind(title,text(b.theme,100),text(b.source_note,800),JSON.stringify(d),now(),id,Number.isSafeInteger(b.revision)?b.revision:0).run();if(!result.meta.changes)fail(409,'Este template foi alterado em outra tela. Reabra antes de salvar.');await ensureStudioClassifications(db,d,title,text(b.theme,100));return json(await detail());
 }
 if(action==='assets'&&method==='POST'){
  const bytes=await bodyLimited(r,8*1024*1024+65536);let form;try{form=await new Request(r.url,{method:'POST',headers:{'content-type':r.headers.get('content-type')||''},body:bytes}).formData()}catch{fail(400,'Upload inválido.');}
  const f=form.get('file');if(!f||typeof f==='string'||!f.size||f.size>8*1024*1024)fail(400,'Escolha uma arte PNG ou JPG de até 8 MB.');const data=new Uint8Array(await f.arrayBuffer()),mime=detectFile(data,f.name,true);if(!['image/png','image/jpeg'].includes(mime))fail(415,'Use PNG ou JPG para o Estúdio.');
  if((await assets(id)).length>=24)fail(400,'Limite de 24 artes por template.');
  // Fully decode through the PDF image reader before accepting the asset.
  try{const {PDFDocument}=await import('pdf-lib');const p=await PDFDocument.create();const im=mime==='image/png'?await p.embedPng(data):await p.embedJpg(data);if(im.width*im.height>20000000)fail(400,'Use uma imagem de até 20 megapixels.');}catch(e){if(e.status)throw e;fail(400,'Não foi possível ler esta imagem.');}
  const aid=uid(),key='studio/'+id+'/'+aid;await env.BUCKET.put(key,data,{httpMetadata:{contentType:mime}});
  try{await db.prepare('INSERT INTO studio_assets(id,template_id,object_key,filename,mime,bytes) VALUES(?,?,?,?,?,?)').bind(aid,id,key,text(f.name,150),mime,data.length).run();}catch(e){await env.BUCKET.delete(key);throw e;}return json({asset_id:aid,assets:await assets(id)},201);
 }
 if(action==='approve'&&method==='POST'){
  const b=await readJSON(r),d=valid(JSON.parse(row.document_json));if(b.revision!==row.revision)fail(409,'Salve ou reabra a revisão atual antes de aprovar.');if(STRUCTURES[d.structure].experimental)fail(400,'A Caixa Bala piloto não pode ser aprovada. Falta converter e validar a geometria original.');
  if(b.physical_test!==true||text(b.validation_note,1000).length<10)fail(400,'Confirme a impressão e o teste físico, registrando o resultado.');await checkAssets(d,id);
  const result=await db.prepare('INSERT INTO studio_versions(id,template_id,source_revision,title,theme,source_note,document_json,validation_note,created_by,created_at) SELECT ?,id,revision,title,theme,source_note,document_json,?,?,? FROM studio_templates WHERE id=? AND revision=?').bind(uid(),text(b.validation_note,1000),user.id,now(),id,b.revision).run();if(!result.meta.changes)fail(409,'A revisão mudou. Reabra o template.');return json(await detail(),201);
 }
 if((action==='package'||action==='product'||action==='refresh-product')&&method==='POST'){
  const b=await readJSON(r);if(b.revision!==row.revision)fail(409,'O template mudou. Reabra a revisão atual antes de preparar o produto.');
  const d=valid(JSON.parse(row.document_json));await checkAssets(d,id);
  const refreshing=action==='refresh-product';let target;const productId=refreshing?b.product_id:'studio-'+id+'-r'+row.revision;
  if(refreshing){target=await db.prepare('SELECT p.*,s.source_key FROM products p JOIN product_personalization_sources s ON s.product_id=p.id WHERE p.id=?').bind(productId).first();if(!target)fail(404,'Produto vinculado não encontrado.');const sourceObject=await env.BUCKET.get(target.source_key);const previous=sourceObject&&JSON.parse(await sourceObject.text());if(previous?.template_id!==id)fail(400,'Este produto pertence a outro template.');}
  if(action==='product'){const existing=await db.prepare('SELECT id FROM products WHERE id=?').bind(productId).first();if(existing)return json({product_id:existing.id,existing:true});if(!Number.isSafeInteger(b.price_cents)||b.price_cents<=0||b.price_cents>100000000)fail(400,'Informe um preço válido maior que zero.');}
  const {kind,stem}=templateProductInfo(d);
  const title=target?.title||text(b.title,160)||(kind+' '+row.theme),blank=b.blank!==false;let values={name:'',age:''};if(!blank){try{values=personalization(b.values);}catch(e){fail(400,e.message);}}
  const bytes=await renderStudioPDF(d,values,async asset=>{const a=await db.prepare('SELECT * FROM studio_assets WHERE id=? AND template_id=?').bind(asset,id).first();const obj=a&&await env.BUCKET.get(a.object_key);return obj?{mime:a.mime,data:new Uint8Array(await obj.arrayBuffer())}:null;},{delivery:true,blankPersonalization:blank,title,theme:row.theme,revision:row.revision});
  if(action==='package')return new Response(bytes,{headers:{'content-type':'application/pdf','content-disposition':'attachment; filename="moldae-molde-e-instrucoes.pdf"','cache-control':'private, no-store'}});
  if(bytes.length>25*1024*1024)fail(400,'O PDF excede 25 MB. Reduza as artes antes de preparar o produto.');
  const current=await get(id);if(current.revision!==row.revision)fail(409,'O template mudou durante a geração. Reabra antes de tentar novamente.');
  const fileId=uid(),key='digital-products/'+productId+'/'+fileId,sourceKey='studio-products/'+productId+'/'+fileId+'-source.json',at=now(),dims=d.dimensions;
  const dimensionText=d.structure==='brigadeiro-petal'?(()=>{const p=geometry(d.structure,d.dimensions).params;return 'base quadrada '+p.base+' mm; altura inclinada '+p.height+' mm; curva superior '+p.crown+' mm; ';})():(dims?.faceW&&dims?.bodyH?'painel central '+dims.faceW+' × '+dims.bodyH+' mm; ':'');
  const instructions=assemblyInstructions(d).map(([h,p],i)=>(i+1)+'. '+h+': '+p).join('\n\n');
  const source={template_id:id,source_revision:row.revision,title,theme:row.theme,document:d,values,blank,production_rules:productionRules(d),created_at:at};
  const slug=(title.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,65))+'-'+id.slice(0,8)+'-r'+row.revision;
  const description='Molde digital da '+kind+' no tema '+row.theme+'. Inclui PDF A4 em escala real e guia ilustrado de corte, vinco e colagem. '+'Após o pagamento confirmado, acesse Meus moldes para informar e confirmar uma única vez o nome da criança e o complemento. Seu PDF personalizado será liberado para baixar novamente quando precisar. O nome da capa é ilustrativo.'+' Imagem de apresentação simulada; materiais, fitas e peça física não inclusos.';
  await env.BUCKET.put(key,bytes,{httpMetadata:{contentType:'application/pdf'}});await env.BUCKET.put(sourceKey,JSON.stringify(source),{httpMetadata:{contentType:'application/json'}});
  if(refreshing){
   const token=uid(),guard='EXISTS(SELECT 1 FROM products WHERE id=? AND mutation_token=?)';
   try{const result=await db.batch([
    db.prepare('UPDATE products SET instructions=?,revision=revision+1,updated_at=?,mutation_token=? WHERE id=? AND revision=? AND EXISTS(SELECT 1 FROM studio_templates WHERE id=? AND revision=?)').bind(instructions,at,token,productId,target.revision,id,row.revision),
    db.prepare('UPDATE product_files SET is_active=0 WHERE product_id=? AND original_filename LIKE ? AND '+guard).bind(productId,stem+'-molde-e-instrucoes-r%.pdf',productId,token),
    db.prepare("INSERT INTO product_files(id,product_id,object_key,original_filename,mime_type,bytes,sha256,format,version,is_active) SELECT ?,?,?,?,?,?,?,'PDF',?,1 WHERE "+guard).bind(fileId,productId,key,stem+'-molde-e-instrucoes-r'+row.revision+'.pdf','application/pdf',bytes.length,[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join(''),Date.now(),productId,token),
    db.prepare('UPDATE product_personalization_sources SET source_key=?,source_revision=?,created_at=? WHERE product_id=? AND '+guard).bind(sourceKey,row.revision,at,productId,productId,token)
   ]);if(!result[0].meta.changes)fail(409,'O produto ou template mudou durante a geração. Reabra e tente novamente.');
   }catch(e){await env.BUCKET.delete(key);await env.BUCKET.delete(sourceKey);throw e;}
   return json({product_id:productId,source_revision:row.revision,updated:true});
  }
  const classificationIds=await ensureStudioClassifications(db,d,title,row.theme);
  try{await db.batch([
   db.prepare("INSERT INTO products(id,slug,title,short_description,description,price_cents,status,featured,is_kit,license_text,formats_json,dimensions,instructions,created_at,updated_at) VALUES(?,?,?,?,?,?,'draft',0,0,?,'[\"PDF\"]',?,?,?,?)").bind(productId,slug,title,'PDF personalizado com o nome da criança, em A4, com guia de corte e montagem.',description,b.price_cents,'Uso pessoal e produção de peças físicas para venda. Não revender, compartilhar ou redistribuir os arquivos digitais.','Folha A4 297 × 210 mm; '+dimensionText+'sugestão de papel 180 a 240 g/m².',instructions,at,at),
   db.prepare("INSERT INTO product_files(id,product_id,object_key,original_filename,mime_type,bytes,sha256,format,version,is_active) VALUES(?,?,?,?,?,?,?,'PDF',?,1)").bind(fileId,productId,key,stem+'-molde-e-instrucoes-r'+row.revision+'.pdf','application/pdf',bytes.length,[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join(''),Date.now()),
   db.prepare('INSERT INTO product_personalization_sources(product_id,source_key,source_revision,created_at) VALUES(?,?,?,?)').bind(productId,sourceKey,row.revision,at),
   ...classificationIds.map(t=>db.prepare('INSERT INTO product_taxonomies(product_id,taxonomy_id) VALUES(?,?)').bind(productId,t))
  ]);}catch(e){await env.BUCKET.delete(key);await env.BUCKET.delete(sourceKey);const existing=await db.prepare('SELECT id FROM products WHERE id=?').bind(productId).first();if(existing)return json({product_id:existing.id,existing:true});throw e;}
  return json({product_id:productId,existing:false,source_revision:row.revision},201);
 }
 if(action==='pdf'&&method==='POST'){
  const b=await readJSON(r);let d=valid(b.document),approved=false,pdfTitle=row.title;
  if(b.version_id){const v=await db.prepare('SELECT document_json,title FROM studio_versions WHERE id=? AND template_id=?').bind(b.version_id,id).first();if(!v)fail(404,'Versão não encontrada.');d=valid(JSON.parse(v.document_json));approved=true;pdfTitle=v.title;}
  await checkAssets(d,id);let values;try{values=personalization(b.values)}catch(e){fail(400,e.message)}
  try{const bytes=await renderStudioPDF(d,values,async asset=>{const a=await db.prepare('SELECT * FROM studio_assets WHERE id=? AND template_id=?').bind(asset,id).first();const obj=a&&await env.BUCKET.get(a.object_key);return obj?{mime:a.mime,data:new Uint8Array(await obj.arrayBuffer())}:null;},{approved,title:pdfTitle});return new Response(bytes,{headers:{'content-type':'application/pdf','content-disposition':'attachment; filename="moldae-teste-A4.pdf"','cache-control':'private, no-store','x-content-type-options':'nosniff'}});}catch(e){fail(400,'PDF não gerado: '+e.message);}
 }
 fail(405,'Operação indisponível.');
}
