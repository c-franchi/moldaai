// Identity headers are supplied by Sites dispatch, never browser storage or form fields.
// Administrator identity is configured in server-only runtime settings.
const MAX_IMAGE=8*1024*1024,MAX_FILE=25*1024*1024;
const kinds=['occasion','celebration','theme','type'];
const formats=['PDF','SVG','PNG','JPG','DXF','STUDIO3','ZIP','Canva'];
const now=()=>new Date().toISOString();
const uid=()=>crypto.randomUUID();
export const slugify=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,100);
class HTTPError extends Error{constructor(status,message){super(message);this.status=status}}
const fail=(s,m)=>{throw new HTTPError(s,m)};
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
const str=(v,n=500)=>typeof v==='string'?v.trim().slice(0,n):'';
async function bodyLimited(request,max){
 if(Number(request.headers.get('content-length'))>max)fail(413,'Arquivo ou formulário acima do limite.');
 const reader=request.body?.getReader();if(!reader)return new Uint8Array();let size=0;const chunks=[];
 while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>max){await reader.cancel();fail(413,'Arquivo ou formulário acima do limite.')}chunks.push(value)}
 const all=new Uint8Array(size);let offset=0;for(const chunk of chunks){all.set(chunk,offset);offset+=chunk.length}return all;
}
async function readJSON(r){if(!r.headers.get('content-type')?.startsWith('application/json'))fail(415,'Envie um formulário JSON.');try{return JSON.parse(new TextDecoder().decode(await bodyLimited(r,65536)))}catch(e){if(e instanceof HTTPError)throw e;fail(400,'Formulário inválido.')}}
async function identity(r,db,required=false,adminEmail=''){
 const id=r.headers.get('oai-authenticated-user-id'),email=r.headers.get('oai-authenticated-user-email');
 if(!id||!email){if(required)fail(401,'Entre na sua conta para continuar.');return null}
 let name=r.headers.get('oai-authenticated-user-full-name')||email;
 if(r.headers.get('oai-authenticated-user-full-name-encoding')==='percent-encoded-utf-8'){try{name=decodeURIComponent(name)}catch{}}
 const admins=adminEmail.split(',').map(value=>value.trim().toLowerCase()).filter(Boolean);
 const role=admins.includes(email.trim().toLowerCase())?'admin':'customer';
 await db.prepare('INSERT INTO users(id,auth_subject,email,full_name,role,created_at) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET email=excluded.email,full_name=excluded.full_name,role=excluded.role').bind(id,id,email,name,role,now()).run();
 return {id,email,name,role};
}
function validateProduct(b){
 const title=str(b.title,160),slug=slugify(str(b.slug,100)||title);if(title.length<3||!slug)fail(400,'Informe um título com pelo menos 3 caracteres.');
 if(!Number.isSafeInteger(b.price_cents)||b.price_cents<0||b.price_cents>100000000)fail(400,'Preço inválido.');
 const sale=b.sale_price_cents===null||b.sale_price_cents===undefined||b.sale_price_cents===''?null:b.sale_price_cents;
 if(sale!==null&&(!Number.isSafeInteger(sale)||sale<0||sale>b.price_cents))fail(400,'Preço promocional deve ser menor ou igual ao preço normal.');
 if(!['draft','active','archived'].includes(b.status))fail(400,'Situação inválida.');
 if(!Array.isArray(b.formats)||b.formats.length>8||b.formats.some(f=>!formats.includes(f)))fail(400,'Formatos inválidos.');
 if(!Array.isArray(b.taxonomy_ids)||b.taxonomy_ids.length>32||b.taxonomy_ids.some(id=>typeof id!=='string'))fail(400,'Classificações inválidas.');
 return {title,slug,short_description:str(b.short_description,400),description:str(b.description,12000),price_cents:b.price_cents,sale_price_cents:sale,status:b.status,featured:b.featured?1:0,is_kit:b.is_kit?1:0,license_text:str(b.license_text,4000),formats_json:JSON.stringify([...new Set(b.formats)]),dimensions:str(b.dimensions,250),instructions:str(b.instructions,8000),taxonomy_ids:[...new Set(b.taxonomy_ids)]};
}
async function productRows(db,admin=false){
 const rows=(await db.prepare(`SELECT * FROM products ${admin?'':"WHERE status='active'"} ORDER BY featured DESC,created_at DESC`).all()).results;
 const media=(await db.prepare('SELECT id,product_id,alt_text,sort_order,is_cover FROM product_media ORDER BY is_cover DESC,sort_order,id').all()).results;
 const tax=(await db.prepare('SELECT pt.product_id,t.* FROM product_taxonomies pt JOIN taxonomies t ON t.id=pt.taxonomy_id').all()).results;
 const files=admin?(await db.prepare('SELECT id,product_id,original_filename,mime_type,bytes,format,version,is_active FROM product_files ORDER BY version DESC').all()).results:[];
 return rows.map(p=>({...p,formats:JSON.parse(p.formats_json),formats_json:undefined,mutation_token:undefined,media:media.filter(m=>m.product_id===p.id).map(m=>({...m,url:`/api/media/${m.id}`})),taxonomies:tax.filter(t=>t.product_id===p.id),...(admin?{files:files.filter(f=>f.product_id===p.id)}:{})}));
}
async function getProduct(db,id){const p=await db.prepare('SELECT * FROM products WHERE id=?').bind(id).first();if(!p)fail(404,'Molde não encontrado.');return p}
async function readyToActivate(db,p,id){if(p.status!=='active')return;
 const counts=await db.prepare('SELECT (SELECT COUNT(*) FROM product_media WHERE product_id=?) AS media,(SELECT COUNT(*) FROM product_files WHERE product_id=? AND is_active=1) AS files').bind(id,id).first();
 if(!counts?.media||!counts?.files||!p.license_text||!JSON.parse(p.formats_json).length||p.price_cents<=0)fail(400,'Antes de exibir no catálogo, adicione capa, arquivo original, formatos, licença e preço maior que zero.');
}
async function saveProduct(r,db,id){const input=await readJSON(r);const p=validateProduct(input),timestamp=now();const existing=id?await getProduct(db,id):null;id=id||uid();
 if(existing&&input.revision!==existing.revision)fail(409,'Este molde foi alterado em outra tela. Recarregue antes de salvar.');
 if(p.taxonomy_ids.length){const found=(await db.prepare(`SELECT id FROM taxonomies WHERE id IN (${p.taxonomy_ids.map(()=>'?').join(',')})`).bind(...p.taxonomy_ids).all()).results;if(found.length!==p.taxonomy_ids.length)fail(400,'Uma classificação não está mais disponível.');}
 await readyToActivate(db,p,id);
 const keys=['slug','title','short_description','description','price_cents','sale_price_cents','status','featured','is_kit','license_text','formats_json','dimensions','instructions'];
 const statements=[],token=uid();
 if(existing){statements.push(db.prepare(`UPDATE products SET ${keys.map(k=>k+'=?').join(',')},updated_at=?,mutation_token=?,revision=revision+1 WHERE id=? AND revision=?`).bind(...keys.map(k=>p[k]),timestamp,token,id,input.revision));}
 else statements.push(db.prepare(`INSERT INTO products(id,${keys.join(',')},created_at,updated_at,mutation_token) VALUES(${Array(keys.length+4).fill('?').join(',')})`).bind(id,...keys.map(k=>p[k]),timestamp,timestamp,token));
 // D1 batch is atomic. All classification changes are guarded by the same new revision.
 const revision=existing?existing.revision+1:1;
 statements.push(db.prepare('DELETE FROM product_taxonomies WHERE product_id=? AND EXISTS(SELECT 1 FROM products WHERE id=? AND mutation_token=?)').bind(id,id,token));
 for(const t of p.taxonomy_ids)statements.push(db.prepare('INSERT OR IGNORE INTO product_taxonomies(product_id,taxonomy_id) SELECT ?,? WHERE EXISTS(SELECT 1 FROM products WHERE id=? AND mutation_token=?)').bind(id,t,id,token));
 const result=await db.batch(statements);if(existing&&!result[0].meta.changes)fail(409,'Alteração simultânea detectada. Recarregue o molde.');
 return json({product:(await productRows(db,true)).find(p=>p.id===id)},existing?200:201);
}
export function detectFile(bytes,name,imageOnly=false){
 const ext=name.split('.').pop().toLowerCase();const magic=[...bytes.slice(0,12)];const starts=(seq)=>seq.every((v,i)=>magic[i]===v);let mime;
 if(ext==='png'&&starts([137,80,78,71,13,10,26,10]))mime='image/png';
 if(['jpg','jpeg'].includes(ext)&&starts([255,216,255]))mime='image/jpeg';
 if(ext==='webp'&&new TextDecoder().decode(bytes.slice(0,4))==='RIFF'&&new TextDecoder().decode(bytes.slice(8,12))==='WEBP')mime='image/webp';
 if(!imageOnly){
  if(ext==='pdf'&&new TextDecoder().decode(bytes.slice(0,5))==='%PDF-')mime='application/pdf';
  if(ext==='zip'&&starts([80,75])&&[[3,4],[5,6],[7,8]].some(pair=>magic[2]===pair[0]&&magic[3]===pair[1]))mime='application/zip';
  if(ext==='svg'){const xml=new TextDecoder().decode(bytes);if(/<svg[\s>]/i.test(xml)&&!/<(?:script|foreignObject|iframe|object|embed|image|use|style)\b|\bon[a-z]+\s*=|(?:href|src)\s*=|url\s*\(|<!ENTITY|<!DOCTYPE/i.test(xml))mime='image/svg+xml';}
  if(ext==='dxf'){const txt=new TextDecoder().decode(bytes.slice(0,4096));if(/SECTION/.test(txt)&&/HEADER|ENTITIES/.test(txt))mime='application/dxf';}
 }
 if(!mime)fail(415,imageOnly?'Use uma imagem PNG, JPG ou WebP válida.':'Arquivo inválido. Use PDF, ZIP, SVG seguro, DXF, PNG ou JPG. Para Studio, envie um ZIP.');return mime;
}
async function upload(r,env,id,kind){await getProduct(env.DB,id);const isImage=kind==='media';const bytes=await bodyLimited(r,(isImage?MAX_IMAGE:MAX_FILE)+65536);let form;
 try{form=await new Request(r.url,{method:'POST',headers:{'content-type':r.headers.get('content-type')||''},body:bytes}).formData()}catch{fail(400,'Upload inválido.')}
 const f=form.get('file');if(!f||typeof f==='string'||!f.size)fail(400,'Escolha um arquivo.');if(f.size>(isImage?MAX_IMAGE:MAX_FILE))fail(413,isImage?'Imagem acima de 8 MB.':'Arquivo acima de 25 MB.');
 const data=new Uint8Array(await f.arrayBuffer());const filename=f.name.replace(/[^a-zA-Z0-9._ -]/g,'_').slice(-150)||'arquivo';const mime=detectFile(data,filename,isImage);const asset=uid();
 const count=await env.DB.prepare(`SELECT COUNT(*) AS n FROM ${isImage?'product_media':'product_files'} WHERE product_id=? ${isImage?'':'AND is_active=1'}`).bind(id).first();if(count.n>=12)fail(400,'Limite de 12 imagens ou arquivos por molde.');
 const key=`${isImage?'previews':'digital-products'}/${id}/${asset}`;
 await env.BUCKET.put(key,data,{httpMetadata:{contentType:mime}});
 try{
  const stmt=isImage?env.DB.prepare('INSERT INTO product_media(id,product_id,object_key,alt_text,sort_order,is_cover) VALUES(?,?,?,?,?,?)').bind(asset,id,key,str(form.get('alt'),250)||filename,count.n,count.n===0?1:0):env.DB.prepare('INSERT INTO product_files(id,product_id,object_key,original_filename,mime_type,bytes,sha256,format,version,is_active) VALUES(?,?,?,?,?,?,?,?,?,1)').bind(asset,id,key,filename,mime,data.length,[...new Uint8Array(await crypto.subtle.digest('SHA-256',data))].map(x=>x.toString(16).padStart(2,'0')).join(''),filename.split('.').pop().toUpperCase(),Date.now());
  await env.DB.batch([stmt,env.DB.prepare('UPDATE products SET updated_at=?,revision=revision+1 WHERE id=?').bind(now(),id)]);
 }catch(e){await env.BUCKET.delete(key);throw e}
 return json({id:asset,product:(await productRows(env.DB,true)).find(p=>p.id===id)},201);
}
async function serveFile(env,file){const object=await env.BUCKET.get(file.object_key);if(!object)fail(404,'Arquivo não encontrado no armazenamento.');return new Response(object.body,{headers:{'content-type':'application/octet-stream','content-disposition':`attachment; filename="${file.original_filename.replace(/["\\\r\n]/g,'_')}"`,'content-length':String(object.size),'cache-control':'private, no-store','x-content-type-options':'nosniff','content-security-policy':"sandbox; default-src 'none'"}})}
export async function handleAPI(r,env){try{
 const path=new URL(r.url).pathname.replace(/\/$/,''),method=r.method;const db=env.DB;
 if(!db||!env.BUCKET)fail(503,'Armazenamento temporariamente indisponível. Tente novamente.');
 if(!['GET','HEAD'].includes(method)&&r.headers.get('origin')!==new URL(r.url).origin)fail(403,'Origem da solicitação não autorizada.');
 if(path==='/api/checkout'||path.startsWith('/api/webhooks/'))fail(503,'Pagamentos ainda não foram ativados. Nenhuma cobrança foi criada.');
 if(path==='/api/products'&&method==='GET')return json({products:await productRows(db)});
 if(path==='/api/taxonomies'&&method==='GET')return json({taxonomies:(await db.prepare('SELECT * FROM taxonomies ORDER BY kind,sort_order,label').all()).results});
 if(path.startsWith('/api/media/')&&method==='GET'){
  const id=path.split('/').pop();let m=await db.prepare("SELECT m.* FROM product_media m JOIN products p ON p.id=m.product_id WHERE m.id=? AND p.status='active'").bind(id).first();
  if(!m){const user=await identity(r,db,true,env.MOLDAE_ADMIN_EMAIL);if(user.role!=='admin')fail(404,'Imagem indisponível.');m=await db.prepare('SELECT * FROM product_media WHERE id=?').bind(id).first();}if(!m)fail(404,'Imagem indisponível.');const obj=await env.BUCKET.get(m.object_key);if(!obj)fail(404,'Imagem indisponível.');return new Response(obj.body,{headers:{'content-type':obj.httpMetadata?.contentType||'image/png','cache-control':'private, no-store','x-content-type-options':'nosniff'}});
 }
 const user=await identity(r,db,true,env.MOLDAE_ADMIN_EMAIL);
 if(path==='/api/me'&&method==='GET')return json({user,payments_enabled:false});
 if(path==='/api/me/orders'&&method==='GET')return json({orders:(await db.prepare('SELECT id,order_number,status,total_cents,currency,created_at,paid_at FROM orders WHERE user_id=? ORDER BY created_at DESC').bind(user.id).all()).results});
 if(path==='/api/me/downloads'&&method==='GET')return json({downloads:(await db.prepare("SELECT DISTINCT f.id,f.original_filename,f.format,i.product_title_snapshot AS title FROM orders o JOIN order_items i ON i.order_id=o.id JOIN product_files f ON f.product_id=i.product_id WHERE o.user_id=? AND o.status='paid' AND f.is_active=1").bind(user.id).all()).results});
 if(path.startsWith('/api/download/')&&method==='GET'){
  const f=await db.prepare("SELECT f.*,i.id AS item_id FROM product_files f JOIN order_items i ON i.product_id=f.product_id JOIN orders o ON o.id=i.order_id WHERE f.id=? AND f.is_active=1 AND o.user_id=? AND o.status='paid' LIMIT 1").bind(path.split('/').pop(),user.id).first();if(!f)fail(403,'Este arquivo exige uma compra confirmada na sua conta.');
  const response=await serveFile(env,f);await db.prepare('INSERT INTO download_events(id,user_id,order_item_id,product_file_id,downloaded_at) VALUES(?,?,?,?,?)').bind(uid(),user.id,f.item_id,f.id,now()).run();return response;
 }
 if(!path.startsWith('/api/admin/'))fail(404,'Recurso não encontrado.');if(user.role!=='admin')fail(403,'Esta área é exclusiva do administrador.');
 if(path==='/api/admin/products'&&method==='GET')return json({products:await productRows(db,true)});
 if(path==='/api/admin/products'&&method==='POST')return await saveProduct(r,db);
 let match=path.match(/^\/api\/admin\/products\/([^/]+)(?:\/(media|files))?$/);
 if(match){const [,id,kind]=match;if(kind&&method==='POST')return await upload(r,env,id,kind);if(!kind&&method==='PATCH')return await saveProduct(r,db,id);if(!kind&&method==='DELETE'){await getProduct(db,id);await db.prepare("UPDATE products SET status='archived',revision=revision+1,updated_at=? WHERE id=?").bind(now(),id).run();return json({ok:true})}}
 match=path.match(/^\/api\/admin\/(media|files)\/([^/]+)(?:\/(cover|download))?$/);
 if(match){const [,kind,id,action]=match;const table=kind==='media'?'product_media':'product_files';const asset=await db.prepare(`SELECT * FROM ${table} WHERE id=?`).bind(id).first();if(!asset)fail(404,'Arquivo não encontrado.');
  if(kind==='files'&&action==='download'&&method==='GET')return await serveFile(env,asset);
  if(kind==='media'&&action==='cover'&&method==='POST'){await db.batch([db.prepare('UPDATE product_media SET is_cover=CASE WHEN id=? THEN 1 ELSE 0 END WHERE product_id=?').bind(id,asset.product_id),db.prepare('UPDATE products SET revision=revision+1,updated_at=? WHERE id=?').bind(now(),asset.product_id)]);return json({ok:true})}
  if(!action&&method==='DELETE'){
   await db.batch([kind==='media'?db.prepare('DELETE FROM product_media WHERE id=?').bind(id):db.prepare('UPDATE product_files SET is_active=0 WHERE id=?').bind(id),db.prepare("UPDATE products SET status=CASE WHEN status='active' THEN 'draft' ELSE status END,revision=revision+1,updated_at=? WHERE id=?").bind(now(),asset.product_id)]);return json({ok:true});
  }
 }
 if(path==='/api/admin/taxonomies'&&method==='POST'){const b=await readJSON(r);if(!kinds.includes(b.kind)||str(b.label,80).length<2)fail(400,'Informe grupo e nome da classificação.');const label=str(b.label,80),slug=slugify(label);if(!slug)fail(400,'Nome inválido.');const id=uid();await db.prepare('INSERT INTO taxonomies(id,kind,slug,label) VALUES(?,?,?,?)').bind(id,b.kind,slug,label).run();return json({id},201)}
 match=path.match(/^\/api\/admin\/taxonomies\/([^/]+)$/);
 if(match&&method==='PATCH'){const b=await readJSON(r),label=str(b.label,80),slug=slugify(label);if(label.length<2||!slug)fail(400,'Informe um nome válido.');const result=await db.prepare('UPDATE taxonomies SET label=?,slug=? WHERE id=?').bind(label,slug,match[1]).run();if(!result.meta.changes)fail(404,'Classificação não encontrada.');return json({ok:true})}
 if(path==='/api/admin/summary'&&method==='GET'){return json(await db.prepare("SELECT (SELECT COUNT(*) FROM products WHERE status!='archived') AS products,(SELECT COUNT(*) FROM products WHERE status='draft') AS drafts,(SELECT COUNT(*) FROM orders WHERE status='paid') AS paid_orders,(SELECT COALESCE(SUM(total_cents),0) FROM orders WHERE status='paid') AS revenue_cents").first())}
 fail(404,'Recurso não encontrado.');
 }catch(e){if(e instanceof HTTPError)return json({error:e.message},e.status);if(/UNIQUE constraint/i.test(String(e)))return json({error:'Já existe um registro com esse endereço ou nome.'},409);console.error('Moldae API error',e?.name);return json({error:'Não foi possível concluir. Tente novamente.'},500)}}
