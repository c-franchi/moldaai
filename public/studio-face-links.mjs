import {pieceCuts} from './studio-tags.mjs';
import {geometry,artAreas,orderedLayers,validateDocument} from './studio-model.mjs';
const collections=['paths','images','fields'];
const hash=s=>{let h=2166136261;for(const c of s)h=Math.imul(h^c.charCodeAt(0),16777619);return(h>>>0).toString(36)};
export function faceLinkGroups(d){
 if(d.paths?.some(p=>p.id==='tag-fold'))return [];// Folded tags retain their existing two-face controls.
 const g=geometry(d.structure,d.dimensions),groups=[];
 const declared=artAreas(d.structure,{paths:d.paths,dimensions:d.dimensions}).filter(a=>d.paths?.some(p=>'shape-'+p.id===a.id&&p.editableFace));if(declared.length>1)return [{id:'declared-faces',label:'Faces do molde',areas:declared}];
 const pieces=pieceCuts(d);if(pieces.length>1){const areas=artAreas(d.structure,{paths:d.paths}).filter(a=>pieces.some(p=>'shape-'+p.id===a.id));const batches=[];for(const area of areas){let batch=batches.find(b=>Math.abs(b[0].box.w-area.box.w)<.1&&Math.abs(b[0].box.h-area.box.h)<.1);if(!batch)batches.push(batch=[]);batch.push(area);}return batches.filter(b=>b.length>1).map((areas,i)=>({id:'pieces-'+i,label:'Peças compatíveis · '+areas[0].box.w+' × '+areas[0].box.h+' mm',areas}));}
 const walls=g.faces.filter(f=>f.id.startsWith('sweet-face'));
 if(walls.length>1)return [{id:'walls',label:'Faces da forminha',areas:walls}];
 if(g.areas){for(const label of [...new Set(g.areas.filter(a=>!a.optional).map(a=>a.group))]){const areas=g.areas.filter(a=>a.group===label&&!a.optional);if(areas.length>1)groups.push({id:label,label,areas});}}
 if(g.faces.length>1)groups.push({id:'whole',label:'Faces completas',areas:g.faces});
 if(!groups.length){const areas=artAreas(d.structure,{dimensions:d.dimensions,paths:d.paths}).filter(a=>a.id.startsWith('shape-'));if(areas.length>1)groups.push({id:'custom',label:'Áreas desenhadas · escolha as faces',areas});}
 return groups;
}
export function frameForArea(d,id){
 const area=artAreas(d.structure,{includeLegacy:true,dimensions:d.dimensions,paths:d.paths}).find(a=>a.id===id);if(!area)throw new Error('Face não encontrada.');
 let angle=0,origin={x:area.box.x+area.box.w/2,y:area.box.y+area.box.h/2},width=area.box.w,height=area.box.h;
 if(id.startsWith('sweet-face')){const a=area.points[0],b=area.points.at(-1);angle=Math.atan2(b[1]-a[1],b[0]-a[0]);origin={x:(a[0]+b[0])/2,y:(a[1]+b[1])/2};width=Math.hypot(b[0]-a[0],b[1]-a[1]);height=Math.max(...area.points.map(p=>-(p[0]-origin.x)*-Math.sin(angle)-(p[1]-origin.y)*Math.cos(angle)));}
 else if(id.startsWith('shape-'))angle=(d.paths.find(p=>p.id===id.slice(6))?.rotation||0)*Math.PI/180;
 return {...area,angle,origin,width,height:Math.max(1,height)};
}
const inside=(p,ps)=>{let yes=false;for(let i=0,j=ps.length-1;i<ps.length;j=i++){const a=ps[i],b=ps[j];if((a[1]>p.y)!==(b[1]>p.y)&&p.x<(b[0]-a[0])*(p.y-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;};
export function layerFace(d,l,ids,frames,seen=new Set()){
 if(seen.has(l.id))return null;seen.add(l.id);
 if(l.kind&&l.usage!=='art')return null;
 if(ids.some(id=>id==='shape-'+l.id))return null;// Keep chosen masks/structural areas intact.
 if(ids.includes(l.face))return l.face;
 if(l.face?.startsWith('shape-')){const mask=d.paths?.find(p=>'shape-'+p.id===l.face);if(mask&&mask.id!==l.id){const owner=layerFace(d,mask,ids,frames,seen);if(owner)return owner;}}
 const p={x:l.x+l.w/2,y:l.y+l.h/2};return ids.find(id=>{try{return inside(p,(frames?.get(id)||frameForArea(d,id)).points);}catch{return false;}})||null;
}
export function transferFaceLayer(layer,source,target){
 const l=structuredClone(layer),dx=l.x+l.w/2-source.origin.x,dy=l.y+l.h/2-source.origin.y,cs=Math.cos(source.angle),ss=Math.sin(source.angle),ct=Math.cos(target.angle),st=Math.sin(target.angle),u=(dx*cs+dy*ss)*target.width/source.width,v=(-dx*ss+dy*cs)*target.height/source.height;
 l.x=target.origin.x+u*ct-v*st-l.w/2;l.y=target.origin.y+u*st+v*ct-l.h/2;l.rotation=(((l.rotation||0)+(target.angle-source.angle)*180/Math.PI+540)%360)-180;
 return l;
}
export function replicateFaces(document,sourceId,ids){
 const d=validateDocument(document);if(!ids.includes(sourceId)||ids.length<2)throw new Error('Selecione uma origem e pelo menos outra face.');
 const frames=new Map(ids.map(id=>[id,frameForArea(d,id)])),all=orderedLayers(d),owned=new Map(all.map(l=>[l.id,layerFace(d,l,ids,frames)])),source=all.filter(l=>owned.get(l.id)===sourceId),areaSet=new Set(artAreas(d.structure,{includeLegacy:true,dimensions:d.dimensions,paths:d.paths}).map(a=>a.id));
 const selectedDefinitions=new Set(ids.filter(id=>id.startsWith('shape-')).map(id=>id.slice(6))),keep=l=>!owned.get(l.id)||owned.get(l.id)===sourceId||selectedDefinitions.has(l.id);
 const next=structuredClone(d);for(const key of collections)next[key]=(d[key]||[]).filter(keep).map(l=>structuredClone(l));next.order=all.filter(keep).map(l=>l.id);
 for(const l of source){const current=collections.flatMap(k=>next[k]).find(q=>q.id===l.id);current.linkKey=l.linkKey||l.id;}
 for(const [index,id] of ids.entries()){if(id===sourceId)continue;const old=all.filter(l=>owned.get(l.id)===id),mapping=new Map(source.map(l=>{const key=l.linkKey||l.id;return [l.id,old.find(q=>q.linkKey===key)?.id||'lf'+index+'-'+hash(key)+'-'+key.slice(0,35)];}));
 for(const original of source){const l=transferFaceLayer(original,frames.get(sourceId),frames.get(id)),key=l.asset?'images':l.kind?'paths':'fields';l.id=mapping.get(original.id);l.linkKey=original.linkKey||original.id;if(original.face?.startsWith('shape-')&&mapping.has(original.face.slice(6)))l.face='shape-'+mapping.get(original.face.slice(6));else if(original.face?.startsWith(sourceId+'-')&&areaSet.has(id+original.face.slice(sourceId.length)))l.face=id+original.face.slice(sourceId.length);else if(original.asset||original.kind||original.face)l.face=id;if(l.group)l.group='lfg'+index+'-'+(l.group.match(/^lfg\d+-(.+)$/)?.[1]||hash(l.group));next[key].push(l);next.order.push(l.id);}}
 next.faceLinks={areas:[...ids],source:sourceId};return validateDocument(next);
}
export function syncFaceLinks(d,previous){
 if(!d.faceLinks||!previous?.faceLinks||JSON.stringify(d.faceLinks.areas)!==JSON.stringify(previous.faceLinks.areas))return d;
 const ids=d.faceLinks.areas,frames=new Map(ids.map(id=>[id,frameForArea(d,id)])),oldFrames=new Map(ids.map(id=>[id,frameForArea(previous,id)])),before=new Map(orderedLayers(previous).map(l=>[l.id,l]));let source;
 for(const l of orderedLayers(d)){const old=before.get(l.id);before.delete(l.id);if(JSON.stringify(l)!==JSON.stringify(old)){source=layerFace(d,l,ids,frames)||old&&layerFace(previous,old,ids,oldFrames);if(source)break;}}
 if(!source)for(const l of before.values()){source=layerFace(previous,l,ids,oldFrames);if(source)break;}
 return source?replicateFaces(d,source,ids):d;
}
