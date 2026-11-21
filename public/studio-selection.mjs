import {orderedLayers,STRUCTURES,validateDocument} from './studio-model.mjs';
export function expandSelection(d,ids){const all=orderedLayers(d),chosen=new Set(ids),groups=new Set(all.filter(l=>chosen.has(l.id)&&l.group).map(l=>l.group));return all.filter(l=>chosen.has(l.id)||(l.group&&groups.has(l.group))).map(l=>l.id);}
export function layerBounds(l){const a=(l.rotation||0)*Math.PI/180,cx=l.x+l.w/2,cy=l.y+l.h/2;const ps=[[0,0],[1,0],[1,1],[0,1]].map(([x,y])=>{const dx=(x-.5)*l.w,dy=(y-.5)*l.h;return {x:cx+dx*Math.cos(a)-dy*Math.sin(a),y:cy+dx*Math.sin(a)+dy*Math.cos(a)};});return {x:Math.min(...ps.map(p=>p.x)),y:Math.min(...ps.map(p=>p.y)),right:Math.max(...ps.map(p=>p.x)),bottom:Math.max(...ps.map(p=>p.y))};}
export function rectangleSelection(d,a,b){const x=Math.min(a.x,b.x),y=Math.min(a.y,b.y),right=Math.max(a.x,b.x),bottom=Math.max(a.y,b.y);return expandSelection(d,orderedLayers(d).filter(l=>{const q=layerBounds(l);return !l.locked&&q.x>=x&&q.y>=y&&q.right<=right&&q.bottom<=bottom;}).map(l=>l.id));}
export function groupSelection(document,ids,ungroup=false,makeId=()=> 'group'+crypto.randomUUID()){const d=validateDocument(document),selected=expandSelection(d,ids),ls=orderedLayers(d).filter(l=>selected.includes(l.id));if(ls.some(l=>l.locked))throw new Error('Desbloqueie os elementos antes de agrupar.');if(!ungroup&&ls.length<2)throw new Error('Selecione pelo menos dois elementos.');const group=makeId();for(const l of ls){if(ungroup)delete l.group;else l.group=group;}return validateDocument(d);}
export function moveSelection(d,ids,dx,dy,originals){const ls=orderedLayers(d).filter(l=>ids.includes(l.id));if(!ls.length||ls.some(l=>l.locked))return false;const source=originals||ls,page=STRUCTURES[d.structure];dx=Math.max(...source.map(l=>-l.x),Math.min(dx,...source.map(l=>page.width-l.x-l.w)));dy=Math.max(...source.map(l=>-l.y),Math.min(dy,...source.map(l=>page.height-l.y-l.h)));for(const l of ls){const o=source.find(q=>q.id===l.id);l.x=+(o.x+dx).toFixed(4);l.y=+(o.y+dy).toFixed(4);}return true;}
export function selectionBounds(d,ids){const ls=orderedLayers(d).filter(l=>ids.includes(l.id));if(!ls.length)return null;const bs=ls.map(layerBounds),x=Math.min(...bs.map(b=>b.x)),y=Math.min(...bs.map(b=>b.y));return {x,y,w:Math.max(...bs.map(b=>b.right))-x,h:Math.max(...bs.map(b=>b.bottom))-y};}
export function scaleSelection(document,ids,factor){
 const d=validateDocument(document),chosen=expandSelection(d,ids),ls=orderedLayers(d).filter(l=>chosen.includes(l.id));
 if(!ls.length||ls.some(l=>l.locked))throw new Error('Selecione elementos desbloqueados.');
 if(!Number.isFinite(factor)||factor<=0)throw new Error('Escala inválida.');
 const b=selectionBounds(d,chosen),page=STRUCTURES[d.structure];
 const min=Math.max(...ls.map(l=>Math.max(1/l.w,1/l.h,l.key?6/l.minSize:0)));
 const max=Math.min((page.width-b.x)/b.w,(page.height-b.y)/b.h,...ls.map(l=>l.key?100/l.size:Infinity));
 if(factor<min||factor>max)throw new Error('Esta escala excede a folha ou o tamanho mínimo de um elemento.');
 for(const l of ls){l.x=b.x+(l.x-b.x)*factor;l.y=b.y+(l.y-b.y)*factor;l.w*=factor;l.h*=factor;if(l.key){l.size*=factor;l.minSize*=factor;}if(l.kind)l.stroke=Math.max(.1,Math.min(3,l.stroke*factor));}
 return validateDocument(d);
}
