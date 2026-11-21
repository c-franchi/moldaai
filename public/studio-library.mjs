import {geometry} from './studio-model.mjs';
import {classifyTemplate,MOLD_FAMILIES} from './studio-organization.mjs';
const hash=s=>{let h=2166136261;for(const c of s)h=Math.imul(h^c.charCodeAt(0),16777619);return (h>>>0).toString(36)};
export function modelIdentity(document,title='',templateId=''){
 const d=document,c=classifyTemplate({title,structure:d.structure,catalog:d.catalog});
 const paths=(d.paths||[]).filter(p=>p.usage==='cut'||p.usage==='fold');
 const clean=paths.map(p=>({kind:p.kind,usage:p.usage,x:p.x,y:p.y,w:p.w,h:p.h,points:p.points,rotation:p.rotation||0,cornerRadius:p.cornerRadius||0}));
 const g=geometry(d.structure,d.dimensions),signature=hash(JSON.stringify({structure:d.structure,faces:g.faces.map(f=>f.points),folds:g.folds,paths:clean}));
 const text=[c.modelName,c.baseModel,c.variant,title].join(' ').toLocaleLowerCase('pt-BR');
 const type=c.family==='tag'?(/dobrá|dobrav|de mesa/.test(text)?'Tag dobrável':/redond/.test(text)?'Tag redonda':/retang|horizontal/.test(text)?'Tag retangular':'Tags'):MOLD_FAMILIES[c.family];
 const cuts=paths.filter(p=>p.usage==='cut'&&p.w>=8&&p.h>=8),box=cuts[0]||geometry(d.structure,d.dimensions).faces[0]?.box;
 const dimensions=box?`${+box.w.toFixed(1)} × ${+box.h.toFixed(1)} mm`:'';
 const label=c.modelName||`${type}${dimensions?' · '+dimensions:''}${cuts.length>1?' · '+cuts.length+' peças':''}`;
 return {family:c.family,type,label,key:d.structure==='art-a4'&&!paths.length?'unidentified:'+(templateId||hash(title)):[c.family,c.baseModel||'',signature].join(':'),signature};
}
export function groupLibraryModels(list){
 const groups=new Map();for(const t of list){const model=t.model||{family:classifyTemplate(t).family,type:MOLD_FAMILIES[classifyTemplate(t).family],label:classifyTemplate(t).modelName||classifyTemplate(t).variant,key:'legacy:'+t.id};const key=model.type+'|'+model.key;if(!groups.has(key))groups.set(key,{...model,items:[]});groups.get(key).items.push(t);}return [...groups.values()];
}
