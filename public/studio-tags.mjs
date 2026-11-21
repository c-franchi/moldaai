import {artAreas,orderedLayers,STRUCTURES,validateDocument,isRoundTagCut} from './studio-model.mjs';

// Work with actual circular cut contours, including older polygon circles.
export function pieceCuts(d){
 if(d.structure!=='art-a4'||d.paths?.some(p=>p.usage==='fold'))return [];
 const cuts=(d.paths||[]).filter(p=>p.usage==='cut'&&['polygon','ellipse','rect'].includes(p.kind)&&p.w>=8&&p.h>=8&&!p.rotation);
 return cuts.filter(p=>!cuts.some(q=>q!==p&&q.w*q.h>p.w*p.h&&p.x>=q.x&&p.y>=q.y&&p.x+p.w<=q.x+q.w&&p.y+p.h<=q.y+q.h));
}
export function roundTagCuts(d){
 if(d.structure!=='art-a4'||d.paths?.some(p=>p.usage==='fold'))return [];
 return (d.paths||[]).filter(isRoundTagCut);
}
export function tagAt(d,{areaId,layerId}={}){
 const cuts=pieceCuts(d),layer=orderedLayers(d).find(l=>l.id===layerId),area=artAreas(d.structure,{paths:d.paths}).find(a=>a.id===areaId);
 const box=layer||area?.box;
 return cuts.find(p=>p.id===layerId||'shape-'+p.id===areaId)||(box&&cuts.find(p=>box.x+box.w/2>=p.x&&box.x+box.w/2<=p.x+p.w&&box.y+box.h/2>=p.y&&box.y+box.h/2<=p.y+p.h))||cuts[0]||null;
}
export function addTag(document,{sourceId,mode='blank',gap=5,makeId=()=> 'tag-'+crypto.randomUUID()}={}){
 const d=validateDocument(document),cuts=pieceCuts(d),source=sourceId?cuts.find(p=>p.id===sourceId):cuts[0];
 if(!source)throw new Error('Selecione uma peça com contorno fechado de corte.');
 if(!['blank','copy'].includes(mode))throw new Error('Escolha como criar a nova tag.');
 const page=STRUCTURES[d.structure],margin=10;
 const belongs=l=>{const cx=l.x+l.w/2,cy=l.y+l.h/2;return cx>=source.x&&cx<=source.x+source.w&&cy>=source.y&&cy<=source.y+source.h&&!cuts.some(p=>p.id!==source.id&&p.id===l.id);};
 const originals=orderedLayers(d).filter(l=>belongs(l)&&(mode==='copy'||l.kind)).map(l=>{
  // Older tags may have a page-wide text box with its anchor inside the tag.
  // Reframe only the copy, preserving its text anchor and font settings.
  if(l.key&&l.w>source.w&&!l.rotation&&!l.curve){const a=l.align==='left'?0:l.align==='right'?1:.5,anchor=l.x+l.w*a,left=anchor-source.x,right=source.x+source.w-anchor;
   const w=Math.min(l.w,a===.5?2*Math.min(left,right):a===0?right:left);if(w>=1)return {...l,x:anchor-w*a,w};
  }
  return l;
 });
 // Keep the copied composition intact; never squeeze it to fit the sheet.
 const minX=Math.min(source.x,...originals.map(l=>l.x)),minY=Math.min(source.y,...originals.map(l=>l.y));
 const maxX=Math.max(source.x+source.w,...originals.map(l=>l.x+l.w)),maxY=Math.max(source.y+source.h,...originals.map(l=>l.y+l.h));
 const candidates=[{x:source.x+source.w+gap,y:source.y}];
 for(let y=source.y;y+source.h<=page.height-margin;y+=source.h+gap)for(let x=margin;x+source.w<=page.width-margin;x+=source.w+gap)candidates.push({x,y});
 for(let y=margin;y+source.h<=page.height-margin;y+=source.h+gap)for(let x=margin;x+source.w<=page.width-margin;x+=source.w+gap)candidates.push({x,y});
 const position=candidates.find(q=>{const dx=q.x-source.x,dy=q.y-source.y;return minX+dx>=margin&&minY+dy>=margin&&maxX+dx<=page.width-margin&&maxY+dy<=page.height-margin&&!cuts.some(p=>q.x<p.x+p.w+gap-.01&&q.x+source.w+gap-.01>p.x&&q.y<p.y+p.h+gap-.01&&q.y+source.h+gap-.01>p.y);});
 if(!position)throw new Error('Não há espaço livre no A4 para outra peça deste tamanho. Mova as tags existentes ou use outro arquivo.');
 const dx=position.x-source.x,dy=position.y-source.y,map=new Map(originals.map(l=>[l.id,makeId()])),groups=new Map(),copies=[];
 const next=structuredClone(d);next.order=orderedLayers(d).map(l=>l.id);
 for(const l of originals){const copy=structuredClone(l);copy.id=map.get(l.id);copy.x+=dx;copy.y+=dy;delete copy.linkKey;
  if(copy.group){if(!groups.has(copy.group))groups.set(copy.group,makeId());copy.group=groups.get(copy.group);}
  if(copy.face?.startsWith('shape-')){const id=map.get(copy.face.slice(6));if(id)copy.face='shape-'+id;else delete copy.face;}
  if(copy.asset&&(!copy.face||['page','mold'].includes(copy.face)))copy.face='shape-'+map.get(source.id);
  if(copy.kind&&copy.label)copy.label='Peça '+(cuts.length+1)+' · '+copy.label.replace(/^(Tag|Peça) \d+ · /,'');
  if(l.id===source.id)copy.label='Peça '+(cuts.length+1)+' · contorno de corte';
  (next[copy.asset?'images':copy.kind?'paths':'fields']??=[]).push(copy);next.order.push(copy.id);copies.push(copy.id);
 }
 const clean=validateDocument(next),cutId=map.get(source.id);
 return {document:clean,ids:copies,cutId,areaId:'shape-'+cutId,count:cuts.length+1,wrapped:position.y!==source.y};
}

export function removePiece(document,sourceId){
 const d=validateDocument(document),cuts=pieceCuts(d),source=cuts.find(p=>p.id===sourceId);
 if(!source||cuts.length<2)throw new Error('Mantenha pelo menos uma peça no arquivo.');
 const ids=new Set(orderedLayers(d).filter(l=>{const cx=l.x+l.w/2,cy=l.y+l.h/2;return l.id===source.id||l.face==='shape-'+source.id||cx>=source.x&&cx<=source.x+source.w&&cy>=source.y&&cy<=source.y+source.h;}).map(l=>l.id));
 const next=structuredClone(d);for(const key of ['images','fields','paths'])next[key]=(next[key]||[]).filter(l=>!ids.has(l.id));next.order=orderedLayers(d).filter(l=>!ids.has(l.id)).map(l=>l.id);delete next.faceLinks;
 return validateDocument(next);
}
