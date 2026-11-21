import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {Miniflare} from 'miniflare';
import {readFileSync,readdirSync} from 'node:fs';
import {studioAIAPI,aiSettings} from '../server/studio-ai.mjs';
import {handleAPI,detectFile} from '../server/api.mjs';
const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("ok")}}',compatibilityDate:'2026-05-15',d1Databases:['DB'],r2Buckets:['BUCKET']});
const DB=await mf.getD1Database('DB'),BUCKET=await mf.getR2Bucket('BUCKET');
for(const file of readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())for(const sql of readFileSync('drizzle/'+file,'utf8').split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean))await DB.prepare(sql).run();
after(()=>mf.dispose());
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');
const helpers={json:(v,status=200)=>Response.json(v,{status}),fail:(status,message)=>{const e=new Error(message);e.status=status;throw e;},bodyLimited:async(r,max)=>{const bytes=new Uint8Array(await r.arrayBuffer());if(bytes.length>max)helpers.fail(413,'Acima do limite.');return bytes;},detectFile};
const env={DB,BUCKET,OPENAI_API_KEY:'test-secret-never-expose',MOLDAE_ADMIN_EMAIL:'admin@test.example'},user={id:'admin'};
const path='/api/admin/studio/';
async function call(url,method='GET',body=null,opts={}){const request=new Request('https://moldae.test'+path+url,{method,...(body?{body}:{})});return studioAIAPI(request,{...env,...opts.env},opts.user||user,helpers,opts.transport||(()=>{throw new Error('Unexpected provider call');}));}
function payload(overrides={}){const f=new FormData();for(const[k,v]of Object.entries({request_id:crypto.randomUUID(),description:'Elefantinho baby em aquarela verde',style:'watercolor',format:'square',background:'transparent',mode:'create',quality:'max',confirmed:'yes',...overrides}))f.set(k,v);return f;}
async function seed(){await DB.prepare('DELETE FROM studio_ai_jobs').run();await DB.prepare('DELETE FROM studio_assets').run();await DB.prepare("INSERT OR IGNORE INTO studio_templates(id,title,theme,source_note,document_json,created_at,updated_at) VALUES('template','Teste IA','','','{}','now','now')").run();}
let generatedId;
test('AI configuration is admin-only, key stays private and missing configuration cannot charge',async()=>{
 const headers={'oai-authenticated-user-id':'viewer','oai-authenticated-user-email':'viewer@test.example'};
 const denied=await handleAPI(new Request('https://moldae.test'+path+'ai/config',{headers}),env);assert.equal(denied.status,403);
 const config=await call('ai/config','GET',null,{env:{OPENAI_API_KEY:undefined}});assert.equal((await config.json()).enabled,false);
 await seed();await assert.rejects(()=>call('templates/template/ai','POST',payload(),{env:{OPENAI_API_KEY:undefined}}),{status:503});assert.equal((await DB.prepare('SELECT COUNT(*) AS n FROM studio_ai_jobs').first()).n,0);
 assert.equal(aiSettings({OPENAI_API_KEY:'k',MOLDAE_AI_DAILY_LIMIT:'9999'}).dailyLimit,20);
});
test('AI generation uses one image, persists preview, idempotent replay, explicit save and protected ownership',async()=>{
 await seed();let calls=0;const f=payload();generatedId=f.get('request_id');const transport=async(url,options)=>{calls++;assert.equal(url,'https://api.openai.com/v1/images/generations');const b=JSON.parse(options.body);assert.equal(b.n,1);assert.equal(b.output_format,'png');assert.equal(b.background,'transparent');assert.equal(b.quality,'max');assert.equal(b.model,'gpt-image-2.6-sunburst');assert.equal(b.size,'2048x2048');assert.equal(b.complexity,'high');assert.match(b.prompt,/aquarela/i);return Response.json({data:[{b64_json:png.toString('base64')}]});};
 let response=await call('templates/template/ai','POST',f,{transport});const j=(await response.json()).job;assert.equal(j.status,'ready');assert.ok(j.preview_url);assert.equal((await DB.prepare('SELECT COUNT(*) AS n FROM studio_assets').first()).n,0);
 response=await call('templates/template/ai','POST',payload({request_id:generatedId}),{transport});assert.equal((await response.json()).job.id,generatedId);assert.equal(calls,1);
 await assert.rejects(()=>call('ai/jobs/'+generatedId,'GET',null,{user:{id:'other'}}),{status:404});
 assert.equal((await call('ai/jobs/'+generatedId+'/image')).headers.get('content-type'),'image/png');
 for(let i=0;i<2;i++)assert.equal((await (await call('ai/jobs/'+generatedId+'/accept','POST')).json()).asset_id,generatedId);
 assert.equal((await DB.prepare('SELECT COUNT(*) AS n FROM studio_assets').first()).n,1);
 await assert.rejects(()=>call('ai/jobs/'+generatedId,'DELETE'),{status:409});
 const text=await (await call('ai/config')).text();assert.ok(!text.includes(env.OPENAI_API_KEY));
});
test('AI edits validate template-owned image reference and send multipart bytes to edit endpoint',async()=>{
 let calls=0;const transport=async(url,options)=>{calls++;assert.equal(url,'https://api.openai.com/v1/images/edits');assert.ok(options.body instanceof FormData);assert.equal(options.body.get('image').type,'image/png');assert.equal(options.body.get('size'),'2048x3072');assert.equal(options.body.get('quality'),'low');return Response.json({data:[{b64_json:png.toString('base64')}]});};
 const response=await call('templates/template/ai','POST',payload({mode:'edit',reference_asset:generatedId,format:'portrait',quality:'low'}),{transport});assert.equal((await response.json()).job.status,'ready');assert.equal(calls,1);
 await assert.rejects(()=>call('templates/template/ai','POST',payload({mode:'edit',reference_asset:'foreign'}),{transport}),{status:400});assert.equal(calls,1);
});
test('AI uploaded reference is decoded; discard removes preview but consumes quota',async()=>{
 await seed();const f=payload({mode:'reference'});f.set('reference',new File([png],'ref.png',{type:'image/png'}));const id=f.get('request_id');let count=0;
 const transport=async()=>{count++;return Response.json({data:[{b64_json:png.toString('base64')}]});};
 assert.equal((await (await call('templates/template/ai','POST',f,{transport})).json()).job.status,'ready');
 assert.equal((await call('ai/jobs/'+id,'DELETE')).status,200);assert.equal((await (await call('ai/config')).json()).daily,1);
 await assert.rejects(()=>call('ai/jobs/'+id+'/image'),{status:404});
 await assert.rejects(()=>call('templates/template/ai','POST',payload(),{transport,env:{MOLDAE_AI_DAILY_LIMIT:'1'}}),{status:429});assert.equal(count,1);
 const invalid=payload({mode:'edit'});invalid.set('reference',new File(['fake'],'fake.png'));await assert.rejects(()=>call('templates/template/ai','POST',invalid,{transport}),{status:415});assert.equal(count,1);
});
test('AI confirmation, format and provider failures do not leak credentials or automatically retry',async()=>{
 await seed();let calls=0;const transport=async()=>{calls++;return new Response('secret internal details',{status:401});};
 await assert.rejects(()=>call('templates/template/ai','POST',payload({confirmed:'no'}),{transport}),{status:400});
 await assert.rejects(()=>call('templates/template/ai','POST',payload({format:'huge'}),{transport}),{status:400});assert.equal(calls,0);
 const f=payload(),id=f.get('request_id');const response=await call('templates/template/ai','POST',f,{transport}),out=await response.json();assert.equal(out.job.status,'failed');assert.ok(!JSON.stringify(out).includes('secret'));assert.equal(calls,1);
 await call('templates/template/ai','POST',payload({request_id:id}),{transport});assert.equal(calls,1);
 assert.equal((await (await call('ai/config')).json()).daily,1);
});
test('AI reservations serialize concurrent paid requests across administrators',async()=>{
 await seed();let release,started;const gate=new Promise(resolve=>release=resolve),begin=new Promise(resolve=>started=resolve);let calls=0;
 const first=call('templates/template/ai','POST',payload(),{transport:async()=>{calls++;started();await gate;return Response.json({data:[{b64_json:png.toString('base64')}]});}});
 await begin;await assert.rejects(()=>call('templates/template/ai','POST',payload(),{user:{id:'other'}}),{status:429});release();assert.equal((await (await first).json()).job.status,'ready');assert.equal(calls,1);
});

test('Saved secret alias enables generation and stays server-side',async()=>{
 await seed();
 const alias={OPENAI_API_KEY:undefined,OPENAI_KEY_SECRET:' saved-alias-secret '};
 const config=await (await call('ai/config','GET',null,{env:alias})).text();
 assert.equal(JSON.parse(config).enabled,true);assert.ok(!config.includes('saved-alias-secret'));
 assert.equal(aiSettings({...alias,MOLDAE_AI_ENABLED:'false'}).enabled,false);
 const transport=async(url,options)=>{assert.equal(options.headers.authorization,'Bearer saved-alias-secret');return Response.json({data:[{b64_json:png.toString('base64')}]});};
 assert.equal((await (await call('templates/template/ai','POST',payload(),{env:alias,transport})).json()).job.status,'ready');
});

test('Finance tracks costs once, preserves discarded spend, snapshots balance and isolates template totals',async()=>{
 await seed();
 const usage={input_tokens:150,input_tokens_details:{text_tokens:100,image_tokens:50},output_tokens:1000,total_tokens:1150};
 let providerCalls=0;const transport=async()=>{providerCalls++;return Response.json({usage,data:[{b64_json:png.toString('base64')}]});};
 const zero=await (await call('ai/finance?template=template')).json();assert.equal(zero.balance,null);assert.equal(zero.total.usd,0);
 await call('ai/balance','PUT',JSON.stringify({balance_usd:10,usd_brl:5.2}));
 const f=payload(),id=f.get('request_id');const j=(await (await call('templates/template/ai','POST',f,{transport})).json()).job;
 const cost=(100*5+50*8+1000*30)/1e6;assert.equal(j.cost.usd,cost);assert.equal(j.cost.estimated,true);
 await call('templates/template/ai','POST',payload({request_id:id}),{transport});assert.equal(providerCalls,1);
 await call('ai/jobs/'+id,'DELETE');
 let finance=await (await call('ai/finance?template=template')).json();assert.equal(finance.current.usd,cost);assert.equal(finance.total.usd,cost);assert.equal(finance.total.unknown,0);assert.equal(finance.balance.remaining_usd,10-cost);assert.equal(finance.history[0].status,'discarded');
 await call('ai/balance','PUT',JSON.stringify({balance_usd:20,usd_brl:null}));
 finance=await (await call('ai/finance')).json();assert.equal(finance.balance.remaining_usd,20);assert.equal(finance.total.usd,cost);assert.equal(finance.balance.usd_brl,null);
 // A billable success whose bytes cannot be stored must retain its usage cost.
 const broken=await call('templates/template/ai','POST',payload(),{transport:async()=>Response.json({usage,data:[]})});assert.equal((await broken.json()).job.status,'failed');
 finance=await (await call('ai/finance')).json();assert.equal(finance.total.usd,2*cost);assert.equal(finance.balance.remaining_usd,20-cost);
 const other=await (await call('ai/finance?template=other')).json();assert.equal(other.current.usd,0);assert.equal(other.history.length,0);assert.equal(other.total.usd,2*cost);
 // Legacy/failed calls without usage remain unknown, never silently marked free.
 await call('templates/template/ai','POST',payload(),{transport:async()=>new Response('',{status:401})});
 finance=await (await call('ai/finance?template=template')).json();assert.equal(finance.total.unknown,1);assert.equal(finance.total.measured,2);assert.equal(finance.history.length,3);
 for(const body of [{balance_usd:-1},{balance_usd:'10'},{balance_usd:10,usd_brl:0},{balance_usd:10,usd_brl:'5.2'}])await assert.rejects(()=>call('ai/balance','PUT',JSON.stringify(body)),{status:400});
 const viewer={'oai-authenticated-user-id':'viewer','oai-authenticated-user-email':'viewer@test.example'};
 assert.equal((await handleAPI(new Request('https://moldae.test'+path+'ai/finance',{headers:viewer}),env)).status,403);
 assert.equal((await handleAPI(new Request('https://moldae.test'+path+'ai/balance',{method:'PUT',headers:{...viewer,'content-type':'application/json','origin':'https://moldae.test'},body:JSON.stringify({balance_usd:99})}),env)).status,403);
});

test('Art direction reaches the provider, max quality is default, legacy requires explicit compatible settings',async()=>{
 await seed();let calls=0;
 const f=payload({composition:'frame',palette:'Verde-sálvia e areia',details:'Girafa com olhos delicados',avoid:'Sem cores neon',format:'portrait'});f.delete('quality');
 const transport=async(url,options)=>{calls++;const body=JSON.parse(options.body);assert.equal(body.quality,'max');assert.equal(body.model,'gpt-image-2.6-sunburst');assert.equal(body.size,'2048x3072');assert.equal(body.complexity,'high');assert.match(body.prompt,/centro livre/);assert.match(body.prompt,/Verde-sálvia/);assert.match(body.prompt,/olhos delicados/);assert.match(body.prompt,/Sem cores neon/);return Response.json({data:[{b64_json:png.toString('base64')}],usage:{input_tokens:150,input_tokens_details:{text_tokens:100,image_tokens:50},output_tokens:1000}});};
 const result=(await (await call('templates/template/ai','POST',f,{transport})).json()).job;assert.equal(result.status,'ready');assert.equal(result.render.quality,'max');assert.equal(result.render.width,1);assert.equal(result.render.height,1);assert.equal(result.cost.model,'gpt-image-2.6-sunburst');
 for(const changes of [{model:'unknown'},{model:'gpt-image-1.5',quality:'max',resolution:'standard'},{model:'gpt-image-1.5',quality:'high',resolution:'print'},{composition:'invalid'},{palette:'x'.repeat(301)}])await assert.rejects(()=>call('templates/template/ai','POST',payload(changes),{transport}),{status:400});assert.equal(calls,1);
 // A manually chosen compatibility model retains its own pricing and schema.
 const legacy=await call('templates/template/ai','POST',payload({model:'gpt-image-1.5',quality:'high',resolution:'standard'}),{transport:async(url,options)=>{calls++;const b=JSON.parse(options.body);assert.equal(b.model,'gpt-image-1.5');assert.equal(b.quality,'high');assert.equal(b.size,'1024x1024');assert.equal(b.complexity,undefined);return Response.json({data:[{b64_json:png.toString('base64')}],usage:{input_tokens:150,input_tokens_details:{text_tokens:100,image_tokens:50},output_tokens:1000}});}});
 const old=(await legacy.json()).job;assert.equal(old.cost.usd,(100*5+50*8+1000*32)/1e6);assert.equal(old.cost.model,'gpt-image-1.5');
 const reread=(await (await call('ai/jobs/'+result.id)).json()).job;assert.equal(reread.cost.usd,result.cost.usd);assert.equal(reread.render.model,'gpt-image-2.6-sunburst');
 const failure=(await (await call('templates/template/ai','POST',payload(),{transport:async()=>{calls++;return new Response('',{status:403});}})).json()).job;assert.equal(failure.status,'failed');assert.equal(calls,3);assert.match(failure.error,/não trocamos o modelo automaticamente/);
});

test('Removing a saved AI image from Artes preserves consumption and the generation preview',async()=>{
 await seed();const usage={input_tokens:10,input_tokens_details:{text_tokens:10,image_tokens:0},output_tokens:100};
 const j=(await (await call('templates/template/ai','POST',payload(),{transport:async()=>Response.json({usage,data:[{b64_json:png.toString('base64')}]})})).json()).job;
 await call('ai/jobs/'+j.id+'/accept','POST');
 const origin='https://moldae.test',headers={'oai-authenticated-user-id':'admin','oai-authenticated-user-email':'admin@test.example',origin};
 const url=origin+path+'assets/'+j.id;
 const download=await handleAPI(new Request(url+'/download',{headers}),env);assert.equal(download.status,200);assert.match(download.headers.get('content-disposition'),/^attachment;/);assert.deepEqual(Buffer.from(await download.arrayBuffer()),png);
 const removed=await handleAPI(new Request(url,{method:'DELETE',headers}),env);assert.equal(removed.status,200);assert.equal((await removed.json()).assets.length,0);
 assert.equal((await handleAPI(new Request(url+'/download',{headers}),env)).status,404);
 assert.equal((await call('ai/jobs/'+j.id+'/image')).status,200);const finance=await (await call('ai/finance')).json();assert.equal(finance.total.usd,j.cost.usd);assert.equal(finance.history.length,1);
});
