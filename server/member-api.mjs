import {writeKitZip} from './kit-zip.mjs';
import {startKitJob,getKitJob,renderKitPart,finishKitJob,clearKitJob} from './kit-jobs.mjs';
import {validateDocument,personalization} from '../public/studio-model.mjs';
import {renderSourcePDF} from './studio-source.mjs';
export async function memberAPI(r,env,user,{json,fail,readJSON}){
 const path=new URL(r.url).pathname,db=env.DB;
 if(path==='/api/me/purchases'&&r.method==='GET'){
  const rows=(await db.prepare(`SELECT i.id,i.product_title_snapshot AS title,i.quantity,o.order_number,o.status AS payment_status,o.created_at,
  (SELECT m.id FROM product_media m WHERE m.product_id=i.product_id AND m.is_hidden=0 ORDER BY m.is_cover DESC,m.sort_order LIMIT 1) AS media_id,
  CASE WHEN s.source_key IS NOT NULL THEN 1 ELSE 0 END AS personalizable,p.name,p.age,p.created_at AS personalized_at
  FROM order_items i JOIN orders o ON o.id=i.order_id LEFT JOIN order_item_sources s ON s.order_item_id=i.id LEFT JOIN item_personalizations p ON p.order_item_id=i.id
  WHERE o.user_id=? ORDER BY o.created_at DESC,i.id`).bind(user.id).all()).results;
  return json({purchases:rows.map(p=>({...p,cover_url:p.media_id?'/api/media/'+p.media_id:null,media_id:undefined,download_url:p.payment_status==='paid'&&p.personalized_at?'/api/me/purchases/'+encodeURIComponent(p.id)+'/pdf':null}))});
 }
 const match=path.match(/^\/api\/me\/purchases\/([-\w]+)\/(personalize|pdf)$/);if(!match)return null;
 const [,itemId,action]=match;
 const owned=()=>db.prepare(`SELECT i.id,i.product_title_snapshot AS title,s.source_key,o.status FROM order_items i JOIN orders o ON o.id=i.order_id LEFT JOIN order_item_sources s ON s.order_item_id=i.id WHERE i.id=? AND o.user_id=?`).bind(itemId,user.id).first();
 const item=await owned();if(!item)fail(404,'Compra não encontrada na sua conta.');if(item.status!=='paid')fail(403,'A personalização é liberada somente após o pagamento confirmado.');if(!item.source_key)fail(400,'Este produto não possui personalização de nome.');
 const existing=()=>db.prepare('SELECT name,age,object_key,created_at FROM item_personalizations WHERE order_item_id=?').bind(itemId).first();
 const result=p=>({name:p.name,age:p.age,created_at:p.created_at,download_url:'/api/me/purchases/'+encodeURIComponent(itemId)+'/pdf'});
 if(action==='pdf'&&r.method==='GET'){
  const p=await existing();if(!p)fail(409,'Confirme o nome da criança em Meus moldes para liberar seu PDF.');const obj=await env.BUCKET.get(p.object_key);if(!obj)fail(503,'Seu PDF está temporariamente indisponível. Tente novamente.');
  return new Response(obj.body,{headers:{'content-type':p.object_key.endsWith('.zip')?'application/zip':'application/pdf','content-disposition':p.object_key.endsWith('.zip')?'attachment; filename="Moldae-kit-personalizado.zip"':'attachment; filename="Moldae-personalizado.pdf"','cache-control':'private, no-store','x-content-type-options':'nosniff','content-security-policy':"sandbox; default-src 'none'"}});
 }
 if(action!=='personalize'||r.method!=='POST')fail(405,'Operação indisponível.');
 const body=await readJSON(r);if(body.confirmed!==true)fail(400,'Confira o nome e confirme a personalização definitiva.');let values;try{values=personalization(body);}catch(e){fail(400,e.message);}
 const prior=await existing();if(prior){if(prior.name!==values.name||prior.age!==values.age)fail(409,'Esta compra já foi personalizada. O nome e o complemento não podem ser alterados.');return json({personalization:result(prior),existing:true});}
 const sourceObject=await env.BUCKET.get(item.source_key);if(!sourceObject)fail(503,'O template desta compra está indisponível. Contate o suporte.');
 const source=JSON.parse(await sourceObject.text());
 let job;let bytes;try{
 if(source.kind==='kit'&&source.items?.length>3){
  if(!body.stage)return json(await startKitJob(env,{owner:user.id,purpose:itemId,source,source_key:item.source_key,values}));
  job=await getKitJob(env,body.job_id,user.id,itemId);if(job.source_key!==item.source_key||job.values.name!==values.name||job.values.age!==values.age)fail(409,'Os dados desta preparação não correspondem à compra.');
  if(body.stage==='part'){await renderKitPart(env,body.job_id,job,body.index);return json({ok:true});}if(body.stage!=='finish')fail(400,'Etapa de geração inválida.');bytes=null;
 }else bytes=await renderSourcePDF(source,values,async (templateId,asset)=>{const a=await db.prepare('SELECT mime,object_key FROM studio_assets WHERE id=? AND template_id=?').bind(asset,templateId).first();const obj=a&&await env.BUCKET.get(a.object_key);return obj?{mime:a.mime,data:new Uint8Array(await obj.arrayBuffer())}:null;},{delivery:true,title:item.title,theme:source.theme,revision:source.source_revision});}catch(e){fail(400,'Não foi possível gerar o PDF: '+e.message+' O nome ainda não foi confirmado; você pode corrigir e tentar novamente.');}
 if(bytes&&bytes.length>(source.kind==='kit'?100:25)*1024*1024)fail(400,'O PDF ultrapassou o limite de tamanho. Contate o suporte.');
 const key='personalized-purchases/'+itemId+'/'+crypto.randomUUID()+(job?'.zip':'.pdf'),at=new Date().toISOString();if(job)await writeKitZip(env,body.job_id,job,key);else await env.BUCKET.put(key,bytes,{httpMetadata:{contentType:'application/pdf'}});
 let saved;try{saved=await db.prepare(`INSERT OR IGNORE INTO item_personalizations(order_item_id,name,age,object_key,created_at)
 SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM order_items i JOIN orders o ON o.id=i.order_id WHERE i.id=? AND o.user_id=? AND o.status='paid')`).bind(itemId,values.name,values.age,key,at,itemId,user.id).run();}catch(e){await env.BUCKET.delete(key);throw e;}
 if(!saved.meta.changes){await env.BUCKET.delete(key);const winner=await existing();if(winner){if(winner.name!==values.name||winner.age!==values.age)fail(409,'Esta compra já foi personalizada em outra tela. Reabra Meus moldes.');return json({personalization:result(winner),existing:true});}fail(403,'O pagamento desta compra não está mais confirmado.');}
 if(job)await clearKitJob(env,body.job_id,job);
 return json({personalization:result({name:values.name,age:values.age,created_at:at}),existing:false},201);
}
