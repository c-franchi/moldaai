// Public token prices, checked 2026-11-18.
// Estimates exclude taxes, currency conversion fees and organization discounts.
export const MODEL_PRICING=Object.fromEntries([['gpt-image-1.5',32],['gpt-image-2.6-sunburst',30]].map(([model,output])=>[model,{model,checked:'2026-11-18',source:'https://developers.openai.com/api/docs/models/'+model,text:5,image:8,output}]));
export const IMAGE_PRICING=MODEL_PRICING['gpt-image-2.6-sunburst'];
export function imageCost(usage,model=IMAGE_PRICING.model){
 const pricing=MODEL_PRICING[model];if(!pricing)return null;
 const valid=n=>Number.isSafeInteger(n)&&n>=0;
 if(!usage||!valid(usage.input_tokens)||!valid(usage.output_tokens)||!valid(usage.input_tokens_details?.text_tokens)||!valid(usage.input_tokens_details?.image_tokens))return null;
 const {text_tokens:text,image_tokens:image}=usage.input_tokens_details;
 if(text+image!==usage.input_tokens)return null;
 // Cached token details are not reported by this Images API; standard rates
 // are an estimate, never presented as an invoice amount.
 const usd=(text*pricing.text+image*pricing.image+usage.output_tokens*pricing.output)/1e6;
 return {usd,text_tokens:text,image_tokens:image,output_tokens:usage.output_tokens};
}
export async function initAICost(db){
 await db.prepare(`CREATE TABLE IF NOT EXISTS studio_ai_costs(job_id TEXT PRIMARY KEY,usd REAL NOT NULL,usage_json TEXT NOT NULL,model TEXT NOT NULL,pricing_date TEXT NOT NULL)`).run();
 await db.prepare(`CREATE TABLE IF NOT EXISTS studio_ai_render(job_id TEXT PRIMARY KEY,model TEXT NOT NULL,quality TEXT NOT NULL,size TEXT NOT NULL,width INTEGER,height INTEGER)`).run();
 await db.prepare(`CREATE TABLE IF NOT EXISTS studio_ai_balance(id INTEGER PRIMARY KEY CHECK(id=1),balance_usd REAL NOT NULL,baseline_usd REAL NOT NULL,usd_brl REAL,updated_at TEXT NOT NULL,updated_by TEXT NOT NULL)`).run();
}
export async function recordAICost(db,id,usage,model=IMAGE_PRICING.model){const cost=imageCost(usage,model);if(!cost)return;
 await db.prepare('INSERT OR IGNORE INTO studio_ai_costs(job_id,usd,usage_json,model,pricing_date) VALUES(?,?,?,?,?)').bind(id,cost.usd,JSON.stringify(cost),model,MODEL_PRICING[model].checked).run();
}
export async function jobCost(db,id){const cost=await db.prepare('SELECT usd,model,pricing_date FROM studio_ai_costs WHERE job_id=?').bind(id).first();return cost?{...cost,estimated:true}:null;}
async function totals(db,template){return db.prepare(`SELECT COALESCE(SUM(c.usd),0) AS usd,COUNT(c.job_id) AS measured,COUNT(*)-COUNT(c.job_id) AS unknown FROM studio_ai_jobs j LEFT JOIN studio_ai_costs c ON c.job_id=j.id ${template?'WHERE j.template_id=?':''}`).bind(...(template?[template]:[])).first();}
export async function aiFinance(db,template){
 const all=await totals(db),current=template?await totals(db,template):null;
 const balance=await db.prepare('SELECT balance_usd,baseline_usd,usd_brl,updated_at FROM studio_ai_balance WHERE id=1').first();
 const month=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit'}).format(new Date());
 const monthly=await db.prepare('SELECT COALESCE(SUM(c.usd),0) AS usd FROM studio_ai_jobs j JOIN studio_ai_costs c ON c.job_id=j.id WHERE j.month_key=?').bind(month).first();
 const history=await db.prepare(`SELECT j.id,j.template_id,t.title,j.status,j.created_at,c.usd FROM studio_ai_jobs j LEFT JOIN studio_ai_costs c ON c.job_id=j.id LEFT JOIN studio_templates t ON t.id=j.template_id ${template?'WHERE j.template_id=? ':''}ORDER BY j.created_at DESC,j.rowid DESC LIMIT 50`).bind(...(template?[template]:[])).all();
 return {currency:'USD',estimated:true,pricing:IMAGE_PRICING,total:all,current,month_usd:monthly.usd,balance:balance?{...balance,remaining_usd:balance.balance_usd-(all.usd-balance.baseline_usd),source:'manual'}:null,history:history.results};
}
export async function updateAIBalance(db,user,body,fail){
 const {balance_usd,usd_brl}=body||{};
 if(typeof balance_usd!=='number'||!Number.isFinite(balance_usd)||balance_usd<0||balance_usd>1000000||(usd_brl!=null&&(typeof usd_brl!=='number'||!Number.isFinite(usd_brl)||usd_brl<=0||usd_brl>100)))fail(400,'Informe o saldo em dólares (zero ou maior) e uma cotação válida, se desejar converter para reais.');
 // Snapshot and baseline are written in one statement: concurrent generations
 // are either included in the baseline or deducted afterwards.
 await db.prepare(`INSERT INTO studio_ai_balance(id,balance_usd,baseline_usd,usd_brl,updated_at,updated_by) SELECT 1,?,COALESCE(SUM(c.usd),0),?,?,? FROM studio_ai_jobs j LEFT JOIN studio_ai_costs c ON c.job_id=j.id ON CONFLICT(id) DO UPDATE SET balance_usd=excluded.balance_usd,baseline_usd=excluded.baseline_usd,usd_brl=excluded.usd_brl,updated_at=excluded.updated_at,updated_by=excluded.updated_by`).bind(balance_usd,usd_brl??null,new Date().toISOString(),user.id).run();
}
