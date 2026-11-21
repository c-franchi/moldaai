import {geometry,validateDocument,orderedLayers} from './studio-model.mjs';
// A white band follows the actual sampled upper curve. Its inward side is
// clipped to the same face, so the edge never spills into a neighboring panel.
export function addWhiteTopBorder(document,areaIds=[],width=1.2){
 const d=validateDocument(document);if(d.structure!=='brigadeiro-petal')throw new Error('Borda disponível para a forminha de brigadeiro.');if(!Number.isFinite(width)||width<.3||width>4)throw new Error('Use espessura de 0,3 a 4 mm.');
 const faces=geometry(d.structure,d.dimensions).faces.filter(f=>f.id.startsWith('sweet-face')&&(!areaIds.length||areaIds.includes(f.id)));if(!faces.length)throw new Error('Selecione as faces curvas da forminha.');
 const replace=new Set(faces.map(f=>'white-top-'+f.id));d.paths=(d.paths||[]).filter(l=>!replace.has(l.id));d.order=orderedLayers(d).map(l=>l.id).filter(id=>!replace.has(id));
 for(const f of faces){const top=f.points.slice(1,-1),a=f.points[0],b=f.points.at(-1),angle=Math.atan2(b[1]-a[1],b[0]-a[0]),dx=-Math.sin(angle)*width,dy=Math.cos(angle)*width,ps=[...top,...top.map(p=>[p[0]+dx,p[1]+dy]).reverse()],x=Math.min(...ps.map(p=>p[0])),y=Math.min(...ps.map(p=>p[1])),w=Math.max(...ps.map(p=>p[0]))-x,h=Math.max(...ps.map(p=>p[1]))-y,id='white-top-'+f.id;
 d.paths.push({id,label:'Borda branca superior · '+f.label,kind:'polygon',usage:'art',face:f.id,x,y,w,h,points:ps.map(p=>[(p[0]-x)/w,(p[1]-y)/h]),fill:'#ffffff',color:'#ffffff',stroke:.1});d.order.push(id);}
 return validateDocument(d);
}
