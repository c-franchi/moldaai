// External recommendations are independent from digital products, orders and checkout.
export const AFFILIATE_NOTICE='Este produto é vendido por uma loja parceira. Ao comprar pelo nosso link, podemos receber uma comissão, sem custo adicional para você.';
const stamp=()=>new Date().toISOString(),clean=(v,n)=>typeof v==='string'?v.trim().slice(0,n):'';
const DEFAULT_MARKETS=[['mercado-livre','Mercado Livre',['meli.la','mercadolivre.com.br','mercadolivre.com','mercadolibre.com']],['amazon','Amazon',['amazon.com.br','amzn.to','amazon.com']],['shopee','Shopee',['shopee.com.br','s.shopee.com.br','shope.ee']],['magalu','Magalu',['magazineluiza.com.br','magazinevoce.com.br','magalu.com','divulgador.magalu.com']]].map(([id,name,domains])=>({id,name,domains,active:true,integration:'unavailable'}));
export const INITIAL_AFFILIATE={title:'Impressora Multifuncional Epson EcoTank L3250, Colorida, Wi-Fi',brand:'Epson',model:'L3250',category_id:'impressoras',description:'Impressora multifuncional com tanque de tinta, impressão colorida, conexão Wi-Fi e funcionalidade de cópia e digitalização.',features:'Tanque de tinta\nImpressão colorida\nConexão Wi-Fi\nCópia e digitalização',status:'active',featured:true,sort_order:0,price_cents:97678,sale_price_cents:null,price_checked_at:null,rating:4.9,rating_note:'Avaliação informada na captura do anúncio; não atualizada em tempo real.',offers:[{marketplace_id:'mercado-livre',url:'https://meli.la/1EJzL9T'}],images:[{url:'/assets/affiliates/epson-l3250-announcement.png',alt:'Epson EcoTank L3250 — fotografia do anúncio fornecida pelo administrador',crop:{width:1292,x:53,y:51,size:260}}],related_ids:[],mold_ids:[]};
export function safeAffiliateURL(raw,market){
 if(typeof raw!=='string'||raw.length>2048||/[\s\u0000-\u001f\u007f]/.test(raw))throw new Error('Informe um link HTTPS válido, sem espaços.');
 let u;try{u=new URL(raw)}catch{throw new Error('Link inválido.');}
 if(u.protocol!=='https:'||u.username||u.password||u.port||!market?.domains?.some(d=>u.hostname===d||u.hostname.endsWith('.'+d)))throw new Error('O link deve usar HTTPS e pertencer ao marketplace selecionado.');
 return raw; // Preserve the administrator's affiliate URL byte-for-byte.
}
export function validateAffiliate(b,refs,fail){
 const title=clean(b.title,160);if(title.length<3)fail(400,'Informe o nome do produto.');
 if(!['draft','active','inactive','archived'].includes(b.status))fail(400,'Situação inválida.');
 const category=refs.categories.find(c=>c.id===b.category_id);if(!category||b.status==='active'&&!category.active)fail(400,'Selecione uma categoria ativa.');
 const price=v=>{if(v===null||v===undefined||v==='')return null;if(!Number.isSafeInteger(v)||v<1||v>100000000)fail(400,'Preço inválido.');return v;};const amount=price(b.price_cents),sale=price(b.sale_price_cents);if(sale!==null&&(amount===null||sale>amount))fail(400,'Preço promocional deve ser menor ou igual ao de referência.');
 if(!Array.isArray(b.offers)||b.offers.length<1||b.offers.length>8)fail(400,'Adicione de 1 a 8 links de compra.');
 const offers=b.offers.map(o=>{const m=refs.marketplaces.find(m=>m.id===o.marketplace_id);if(!m||b.status==='active'&&!m.active)fail(400,'Selecione um marketplace ativo.');try{return {marketplace_id:m.id,url:safeAffiliateURL(o.url,m)}}catch(e){fail(400,e.message)}});
 if(new Set(offers.map(o=>o.marketplace_id)).size!==offers.length)fail(400,'Use apenas um link por marketplace.');
 const images=Array.isArray(b.images)?b.images:[];if(images.length>12)fail(400,'Limite de 12 imagens.');if(b.status==='active'&&!images.length)fail(400,'Adicione uma fotografia do produto antes de publicar.');
 const rating=b.rating==null||b.rating===''?null:Number(b.rating);if(rating!==null&&(!Number.isFinite(rating)||rating<0||rating>5))fail(400,'Avaliação deve estar entre 0 e 5.');
 if(b.price_checked_at!=null&&(!Number.isFinite(Date.parse(b.price_checked_at))||Date.parse(b.price_checked_at)>Date.now()+60000))fail(400,'Data de referência inválida.');
 const list=v=>Array.isArray(v)&&v.length<=30&&v.every(x=>typeof x==='string'&&x.length<=160)?[...new Set(v)]:[];
 return {title,description:clean(b.description,12000),brand:clean(b.brand,100),model:clean(b.model,100),features:clean(b.features,4000),category_id:category.id,status:b.status,featured:!!b.featured,sort_order:Math.max(0,Math.min(99999,Math.round(Number(b.sort_order)||0))),price_cents:amount,sale_price_cents:sale,price_checked_at:b.price_checked_at||null,rating,rating_note:clean(b.rating_note,400),offers,images,related_ids:list(b.related_ids),mold_ids:list(b.mold_ids)};
}
const schemaReady=new WeakMap();
async function ensure(db){if(!schemaReady.has(db)){const promise=initialize(db).catch(error=>{schemaReady.delete(db);throw error;});schemaReady.set(db,promise);}return schemaReady.get(db);}
async function initialize(db){
 await db.batch([
 db.prepare('CREATE TABLE IF NOT EXISTS affiliate_products(id TEXT PRIMARY KEY,document_json TEXT NOT NULL,revision INTEGER NOT NULL DEFAULT 1,deleted_at TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)'),
 db.prepare('CREATE TABLE IF NOT EXISTS affiliate_refs(kind TEXT NOT NULL,id TEXT NOT NULL,document_json TEXT NOT NULL,PRIMARY KEY(kind,id))'),
 db.prepare('CREATE TABLE IF NOT EXISTS affiliate_media(id TEXT PRIMARY KEY,product_id TEXT NOT NULL,object_key TEXT NOT NULL,mime TEXT NOT NULL)'),
 db.prepare('CREATE TABLE IF NOT EXISTS affiliate_clicks(day TEXT NOT NULL,product_id TEXT NOT NULL,marketplace_id TEXT NOT NULL,clicks INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(day,product_id,marketplace_id))')]);
 const at=stamp();await db.batch([...DEFAULT_MARKETS.map(m=>db.prepare("INSERT OR IGNORE INTO affiliate_refs(kind,id,document_json) SELECT ?,?,? WHERE NOT EXISTS(SELECT 1 FROM affiliate_refs WHERE kind='settings' AND id='general')").bind('marketplaces',m.id,JSON.stringify(m))),db.prepare("INSERT OR IGNORE INTO affiliate_refs(kind,id,document_json) SELECT ?,?,? WHERE NOT EXISTS(SELECT 1 FROM affiliate_refs WHERE kind='settings' AND id='general')").bind('categories','impressoras',JSON.stringify({id:'impressoras',name:'Impressoras e Equipamentos',active:true})),db.prepare("INSERT OR IGNORE INTO affiliate_refs(kind,id,document_json) SELECT ?,?,? WHERE NOT EXISTS(SELECT 1 FROM affiliate_refs WHERE kind='settings' AND id='general')").bind('settings','general',JSON.stringify({stale_days:30,notice:AFFILIATE_NOTICE})),db.prepare('INSERT OR IGNORE INTO affiliate_products(id,document_json,created_at,updated_at) VALUES(?,?,?,?)').bind('epson-l3250',JSON.stringify(INITIAL_AFFILIATE),at,at)]);
}
async function records(db){const rows=(await db.prepare('SELECT * FROM affiliate_products WHERE deleted_at IS NULL ORDER BY created_at DESC').all()).results;return rows.map(r=>({...JSON.parse(r.document_json),id:r.id,revision:r.revision,created_at:r.created_at,updated_at:r.updated_at}));}
async function references(db){const rows=(await db.prepare('SELECT * FROM affiliate_refs').all()).results;return {categories:rows.filter(r=>r.kind==='categories').map(r=>JSON.parse(r.document_json)),marketplaces:rows.filter(r=>r.kind==='marketplaces').map(r=>JSON.parse(r.document_json)),settings:JSON.parse(rows.find(r=>r.kind==='settings')?.document_json||'{}')};}
export async function affiliateAPI(r,env,user,h){
 const {json,fail,readJSON,bodyLimited,detectFile}=h,db=env.DB,path=new URL(r.url).pathname.replace(/\/$/,''),method=r.method,admin=path.startsWith('/api/admin/affiliates');
 if(admin&&user?.role!=='admin')fail(user?403:401,'Acesso administrativo necessário.');
 await ensure(db);const refs=await references(db),products=await records(db);
 const get=id=>{const p=products.find(p=>p.id===id);if(!p)fail(404,'Produto afiliado não encontrado.');return p;};
 const visible=p=>p.status==='active'&&refs.categories.some(c=>c.id===p.category_id&&c.active)&&p.offers.some(o=>refs.marketplaces.some(m=>m.id===o.marketplace_id&&m.active));
 const stale=p=>!!p.price_cents&&(!p.price_checked_at||Date.now()-Date.parse(p.price_checked_at)>refs.settings.stale_days*86400000);
 if(!admin){
  if(path==='/api/affiliates'&&method==='GET')return json({products:products.filter(visible).map(p=>({...p,offers:p.offers.filter(o=>refs.marketplaces.some(m=>m.id===o.marketplace_id&&m.active)),stale:stale(p)})),...refs,categories:refs.categories.filter(c=>c.active),marketplaces:refs.marketplaces.filter(m=>m.active),notice:AFFILIATE_NOTICE});
  const media=path.match(/^\/api\/affiliates\/media\/([a-zA-Z0-9-]+)$/);if(media&&method==='GET'){
   const row=await db.prepare('SELECT * FROM affiliate_media WHERE id=?').bind(media[1]).first();if(!row)fail(404,'Imagem indisponível.');const p=products.find(p=>p.id===row.product_id);if(!p||!visible(p)){if(user?.role!=='admin')fail(404,'Imagem indisponível.');}const object=await env.BUCKET.get(row.object_key);if(!object)fail(404,'Imagem indisponível.');return new Response(object.body,{headers:{'content-type':row.mime,'cache-control':'no-store','x-content-type-options':'nosniff'}});
  }
  const click=path.match(/^\/api\/affiliates\/([^/]+)\/click$/);if(click&&method==='POST'){
   const p=get(click[1]);if(!visible(p))fail(404,'Produto indisponível.');const b=await readJSON(r),offer=p.offers.find(o=>o.marketplace_id===b.marketplace_id),market=refs.marketplaces.find(m=>m.id===b.marketplace_id&&m.active);if(!offer||!market)fail(400,'Link indisponível.');safeAffiliateURL(offer.url,market);
   await db.prepare('INSERT INTO affiliate_clicks(day,product_id,marketplace_id,clicks) VALUES(?,?,?,1) ON CONFLICT(day,product_id,marketplace_id) DO UPDATE SET clicks=clicks+1').bind(stamp().slice(0,10),p.id,market.id).run();return json({ok:true,url:offer.url});
  }
  fail(404,'Recurso não encontrado.');
 }
 if(path==='/api/admin/affiliates'&&method==='GET'){
  const clicks=(await db.prepare('SELECT * FROM affiliate_clicks ORDER BY day DESC').all()).results;
  return json({products:products.map(p=>({...p,stale:stale(p)})),...refs,clicks,integration_status:'Integração automática indisponível',summary:{total:products.length,active:products.filter(visible).length,inactive:products.length-products.filter(visible).length,stale:products.filter(stale).length,clicks:clicks.reduce((n,c)=>n+c.clicks,0)}});
 }
 if(path==='/api/admin/affiliates/resolve'&&method==='POST'){
  const b=await readJSON(r),market=refs.marketplaces.find(m=>{try{safeAffiliateURL(b.url,m);return true}catch{return false}});if(!market)fail(400,'Marketplace não reconhecido. Cadastre seu domínio antes de usar o link.');return json({marketplace_id:market.id,url:b.url,integration:'unavailable',message:'Integração automática indisponível. Preencha os dados e envie as fotos manualmente.'});
 }
 if(path==='/api/admin/affiliates/settings'&&method==='PUT'){
  const b=await readJSON(r);if(!Number.isInteger(b.stale_days)||b.stale_days<1||b.stale_days>365)fail(400,'Informe um prazo entre 1 e 365 dias.');await db.prepare('UPDATE affiliate_refs SET document_json=? WHERE kind=? AND id=?').bind(JSON.stringify({stale_days:b.stale_days,notice:AFFILIATE_NOTICE}),'settings','general').run();return json({ok:true});
 }
 const ref=path.match(/^\/api\/admin\/affiliates\/(categories|marketplaces)(?:\/([a-zA-Z0-9-]+))?$/);
 if(ref&&['POST','PUT','DELETE'].includes(method)){
  const [,kind,existing]=ref,b=method==='DELETE'?{}:await readJSON(r),id=existing||crypto.randomUUID();
  if(existing&&!refs[kind].some(x=>x.id===id))fail(404,'Cadastro não encontrado.');
  if(method==='DELETE'){if(products.some(p=>kind==='categories'?p.category_id===id:p.offers.some(o=>o.marketplace_id===id)))fail(409,'Este cadastro está em uso. Edite os produtos antes de excluir.');await db.prepare('DELETE FROM affiliate_refs WHERE kind=? AND id=?').bind(kind,id).run();return json({ok:true});}
  const value={id,name:clean(b.name,80),active:b.active!==false};if(value.name.length<2)fail(400,'Informe o nome.');
  if(kind==='marketplaces'){const domains=Array.isArray(b.domains)?b.domains.map(d=>String(d).trim().toLowerCase()):[];if(!domains.length||domains.length>12||domains.some(d=>d.length>253||!/^([a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/.test(d)||/(^|\.)(localhost|local|internal|test|invalid)$/.test(d)))fail(400,'Informe domínios públicos válidos, sem https ou caminhos.');value.domains=[...new Set(domains)];value.integration='unavailable';
   if(existing&&products.some(p=>p.offers.some(o=>{if(o.marketplace_id!==id)return false;try{safeAffiliateURL(o.url,value);return false}catch{return true}})))fail(409,'Há links existentes fora dos novos domínios. Corrija os produtos primeiro.');
  }
  if(refs[kind].some(x=>x.id!==id&&x.name.toLocaleLowerCase('pt-BR')===value.name.toLocaleLowerCase('pt-BR')))fail(409,'Já existe um cadastro com este nome.');
  await db.prepare('INSERT INTO affiliate_refs(kind,id,document_json) VALUES(?,?,?) ON CONFLICT(kind,id) DO UPDATE SET document_json=excluded.document_json').bind(kind,id,JSON.stringify(value)).run();return json({item:value},existing?200:201);
 }
 const duplicate=path.match(/^\/api\/admin\/affiliates\/products\/([a-zA-Z0-9-]+)\/duplicate$/);
 if(duplicate&&method==='POST'){
  const p=get(duplicate[1]),b=await readJSON(r);if(b.revision!==p.revision)fail(409,'O produto mudou. Recarregue antes de duplicar.');
  const id=crypto.randomUUID(),value=structuredClone(p),at=stamp(),statements=[];
  for(const key of ['id','revision','created_at','updated_at'])delete value[key];value.title=(p.title+' · cópia').slice(0,160);value.status='draft';value.featured=false;
  const assets=(await db.prepare('SELECT * FROM affiliate_media WHERE product_id=?').bind(p.id).all()).results;
  value.images=value.images.map(image=>{if(!image.id)return image;const old=assets.find(a=>a.id===image.id);if(!old)fail(409,'Fotografia não encontrada.');const asset=crypto.randomUUID();statements.push(db.prepare('INSERT INTO affiliate_media(id,product_id,object_key,mime) VALUES(?,?,?,?)').bind(asset,id,old.object_key,old.mime));return {...image,id:asset,url:'/api/affiliates/media/'+asset};});
  statements.unshift(db.prepare('INSERT INTO affiliate_products(id,document_json,created_at,updated_at) VALUES(?,?,?,?)').bind(id,JSON.stringify(value),at,at));await db.batch(statements);return json({id},201);
 }
 const match=path.match(/^\/api\/admin\/affiliates\/products(?:\/([a-zA-Z0-9-]+))?(?:\/(media))?$/);
 if(match){const id=match[1],media=match[2],p=id?get(id):null;
  if(media&&method==='POST'){
   const bytes=await bodyLimited(r,8*1024*1024+65536);let form;try{form=await new Request(r.url,{method:'POST',headers:{'content-type':r.headers.get('content-type')||''},body:bytes}).formData()}catch{fail(400,'Upload inválido.');}
   const file=form.get('file');if(!file||typeof file==='string'||!file.size||file.size>8*1024*1024)fail(400,'Envie uma imagem de até 8 MB.');if(p.images.length>=12)fail(400,'Limite de 12 imagens.');const data=new Uint8Array(await file.arrayBuffer()),mime=detectFile(data,file.name,true),asset=crypto.randomUUID(),key='affiliates/'+id+'/'+asset,image={id:asset,url:'/api/affiliates/media/'+asset,alt:p.title};
   await env.BUCKET.put(key,data,{httpMetadata:{contentType:mime}});const next={...p,images:[...p.images,image]};delete next.id;delete next.revision;delete next.created_at;delete next.updated_at;
   try{const result=await db.batch([db.prepare('UPDATE affiliate_products SET document_json=?,revision=revision+1,updated_at=? WHERE id=? AND revision=? AND deleted_at IS NULL').bind(JSON.stringify(next),stamp(),id,p.revision),db.prepare('INSERT INTO affiliate_media(id,product_id,object_key,mime) SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM affiliate_products WHERE id=? AND revision=? AND document_json=?)').bind(asset,id,key,mime,id,p.revision+1,JSON.stringify(next))]);if(!result[0].meta.changes){await env.BUCKET.delete(key);fail(409,'O produto mudou. Recarregue antes de enviar a foto.');}}catch(e){await env.BUCKET.delete(key);throw e;}return json({image},201);
  }
  if(!media&&method==='DELETE'&&p){const b=await readJSON(r);if(b.revision!==p.revision)fail(409,'O produto mudou. Recarregue.');const result=await db.prepare('UPDATE affiliate_products SET deleted_at=?,revision=revision+1 WHERE id=? AND revision=? AND deleted_at IS NULL').bind(stamp(),id,p.revision).run();if(!result.meta.changes)fail(409,'Alteração simultânea.');return json({ok:true});}
  if(!media&&['POST','PUT'].includes(method)){
   const b=await readJSON(r);if(p&&b.revision!==p.revision)fail(409,'O produto mudou em outra tela. Recarregue antes de salvar.');const value=validateAffiliate(b,refs,fail),productId=id||crypto.randomUUID();
   if(value.related_ids.some(x=>x===id||!products.some(p=>p.id===x)))fail(400,'Produto relacionado inválido.');
   if(value.mold_ids.length){const molds=(await db.prepare('SELECT id FROM products').all()).results;if(value.mold_ids.some(id=>!molds.some(p=>p.id===id)))fail(400,'Molde relacionado inválido.');}
   const owned=(await db.prepare('SELECT * FROM affiliate_media WHERE product_id=?').bind(id||'').all()).results;
   value.images=value.images.map(i=>{if(i.url===INITIAL_AFFILIATE.images[0].url)return {...INITIAL_AFFILIATE.images[0]};const m=owned.find(m=>m.id===i.id&&i.url==='/api/affiliates/media/'+m.id);if(!m)fail(400,'Envie as imagens pelo cadastro deste produto.');return {id:m.id,url:i.url,alt:clean(i.alt,200)||value.title};});
   const at=stamp();if(p){const result=await db.prepare('UPDATE affiliate_products SET document_json=?,revision=revision+1,updated_at=? WHERE id=? AND revision=? AND deleted_at IS NULL').bind(JSON.stringify(value),at,id,p.revision).run();if(!result.meta.changes)fail(409,'Alteração simultânea.');}else await db.prepare('INSERT INTO affiliate_products(id,document_json,created_at,updated_at) VALUES(?,?,?,?)').bind(productId,JSON.stringify(value),at,at).run();return json({id:productId},p?200:201);
  }
 }
 fail(404,'Recurso não encontrado.');
}
