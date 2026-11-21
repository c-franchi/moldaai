import {frameForArea,transferFaceLayer,layerFace,faceLinkGroups} from './studio-face-links.mjs';
import {expandSelection,moveSelection,layerBounds} from './studio-selection.mjs';
import {artAreas,STRUCTURES,MAX_IMAGE_LAYERS,validateDocument,orderedLayers} from './studio-model.mjs';
export const LAYER_CLIPBOARD_MIME='application/x-moldae-element+json';
export const LAYER_CLIPBOARD_PREFIX='MOLDAE_ELEMENT_V1\n';
export function copyLayer(document,id,{templateId,origin,makeId=()=>crypto.randomUUID()}={}){
 const doc=validateDocument(document),ids=expandSelection(doc,Array.isArray(id)?id:[id]),selected=orderedLayers(doc).filter(l=>ids.includes(l.id)),layer=selected[0];if(!layer)throw new Error('Selecione um elemento para copiar.');return {version:1,clipboardId:makeId(),sourceTemplate:templateId,origin,layer:structuredClone(layer),...(selected.length>1?{layers:structuredClone(selected)}:{})};
}
export function pasteLayer(document,packet,{templateId,assetIds=[],count=1,targetArea=null,makeId=()=> 'layer'+crypto.randomUUID()}={}){
 if(!packet||packet.version!==1||typeof packet.layer!=='object'||!packet.layer||!Number.isSafeInteger(count)||count<1)throw new Error('O conteúdo copiado não é um elemento válido do Estúdio.');
 const d=validateDocument(document),sources=packet.layers||[packet.layer];if(!Array.isArray(sources)||!sources.length||sources.length>188)throw new Error('Seleção copiada inválida.');
 const next=structuredClone(d),groups=new Map(),copies=[];next.order=orderedLayers(next).map(l=>l.id);
 for(const source of sources){if(!source||typeof source!=='object')throw new Error('Elemento inválido.');const collection=source.asset?'images':source.kind?'paths':'fields',limit=collection==='images'?MAX_IMAGE_LAYERS:collection==='paths'?100:24;
 if((next[collection]||[]).length>=limit)throw new Error('Limite de '+limit+' camadas deste tipo atingido.');
 if(source.asset&&(packet.sourceTemplate!==templateId||!assetIds.includes(source.asset)))throw new Error('Esta imagem só pode ser colada no template de origem.');
 const copy={...structuredClone(source),id:makeId(),locked:false};delete copy.linkKey;if(source.group){if(!groups.has(source.group))groups.set(source.group,'group'+crypto.randomUUID());copy.group=groups.get(source.group);}copies.push(copy);(next[collection]??=[]).push(copy);next.order.push(copy.id);}
 // Validate before moving so malformed source coordinates are never repaired implicitly.
 validateDocument(next);
 if(targetArea){
  const area=artAreas(d.structure,{dimensions:d.dimensions,paths:d.paths}).find(a=>a.id===targetArea);
  if(!area)throw new Error('Selecione uma área válida para colar.');
  const bs=copies.map(layerBounds),left=Math.min(...bs.map(b=>b.x)),top=Math.min(...bs.map(b=>b.y)),right=Math.max(...bs.map(b=>b.right)),bottom=Math.max(...bs.map(b=>b.bottom));
  moveSelection(next,copies.map(l=>l.id),area.box.x+area.box.w/2-(left+right)/2,area.box.y+area.box.h/2-(top+bottom)/2);
  if(d.structure==='brigadeiro-petal'&&packet.sourceTemplate===templateId){const ids=faceLinkGroups(d)[0]?.areas.map(a=>a.id)||[],owners=sources.map(l=>layerFace(d,l,ids));if(ids.includes(targetArea)&&owners[0]&&owners.every(id=>id===owners[0])&&owners[0]!==targetArea){const from=frameForArea(d,owners[0]),to=frameForArea(d,targetArea);copies.forEach((copy,i)=>{const mapped=transferFaceLayer(sources[i],from,to);Object.assign(copy,{x:mapped.x,y:mapped.y,rotation:mapped.rotation});});}}
  for(const copy of copies)if(copy.asset||copy.kind)copy.face=area.id;
 }else moveSelection(next,copies.map(l=>l.id),count*2,count*2);
 return {document:validateDocument(next),id:copies[0].id,ids:copies.map(l=>l.id)};
}

// Resolve the underlying area even when an image or text covers it.
export function areaAtPoint(document,p){
 return artAreas(document.structure,{dimensions:document.dimensions,paths:document.paths}).slice().reverse().find(area=>{
  let inside=false;const ps=area.points;
  for(let i=0,j=ps.length-1;i<ps.length;j=i++){
   const [x,y]=ps[i],[a,b]=ps[j];
   const cross=(p.x-x)*(b-y)-(p.y-y)*(a-x);
   if(Math.abs(cross)<1e-7&&p.x>=Math.min(x,a)-1e-7&&p.x<=Math.max(x,a)+1e-7&&p.y>=Math.min(y,b)-1e-7&&p.y<=Math.max(y,b)+1e-7)return true;
   if((y>p.y)!==(b>p.y)&&p.x<(a-x)*(p.y-y)/(b-y)+x)inside=!inside;
  }return inside;
 })||null;
}
