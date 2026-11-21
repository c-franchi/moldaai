import {modelIdentity} from '../public/studio-library.mjs';
export const classificationSlug=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,100);
export async function ensureClassification(db,kind,value){
 const label=String(value||'').trim().replace(/\s+/g,' '),slug=classificationSlug(label);
 if(!['type','theme','occasion','celebration'].includes(kind)||label.length<2||label.length>80||!slug||/[\p{Cc}\p{Cs}]/u.test(label))throw new Error('Informe uma classificação de 2 a 80 caracteres.');
 const before=await db.prepare('SELECT id,kind,label FROM taxonomies WHERE kind=? AND slug=?').bind(kind,slug).first();if(before)return {...before,existing:true};
 await db.prepare('INSERT OR IGNORE INTO taxonomies(id,kind,slug,label) VALUES(?,?,?,?)').bind(crypto.randomUUID(),kind,slug,label).run();
 return {...await db.prepare('SELECT id,kind,label FROM taxonomies WHERE kind=? AND slug=?').bind(kind,slug).first(),existing:false};
}
export async function ensureStudioClassifications(db,document,title,theme){const model=modelIdentity(document,title),ids=[];if(model.family!=='other')ids.push((await ensureClassification(db,'type',model.type)).id);if(theme?.trim().length>=2&&theme.trim().length<=80)ids.push((await ensureClassification(db,'theme',theme)).id);return ids;}
export async function syncStudioClassifications(db){
 const rows=(await db.prepare('SELECT title,theme,document_json FROM studio_templates').all()).results,existing=(await db.prepare('SELECT kind,slug FROM taxonomies').all()).results,known=new Set(existing.map(t=>t.kind+':'+t.slug)),missing=new Map();
 for(const t of rows){const model=modelIdentity(JSON.parse(t.document_json),t.title),entries=[...(model.family!=='other'?[['type',model.type]]:[]),['theme',t.theme]];for(const [kind,value] of entries){const label=String(value||'').trim().replace(/\s+/g,' '),slug=classificationSlug(label),key=kind+':'+slug;if(label.length>=2&&label.length<=80&&slug&&!known.has(key))missing.set(key,{kind,label,slug});}}
 if(missing.size)await db.batch([...missing.values()].map(t=>db.prepare('INSERT OR IGNORE INTO taxonomies(id,kind,slug,label) VALUES(?,?,?,?)').bind(crypto.randomUUID(),t.kind,t.slug,t.label)));
 return {ok:true,templates:rows.length,added:missing.size};
}
