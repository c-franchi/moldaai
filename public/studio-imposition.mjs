import {geometry,STRUCTURES,orderedLayers,artAreas} from './studio-model.mjs';
import {layerBounds} from './studio-selection.mjs';
export function printBounds(d){
 const g=geometry(d.structure,d.dimensions),points=d.structure==='art-a4'?[]:[...(g.cuts||g.faces.map(f=>f.points)).flat(),...g.glue.flat()];
 for(const l of orderedLayers(d)){if(l.opacity===0)continue;let b=layerBounds(l);if(l.asset||l.face){const ps=l.face==='mold'?[...g.faces.map(f=>f.points).flat(),...g.glue.flat()]:artAreas(d.structure,{includeLegacy:true,dimensions:d.dimensions,paths:d.paths}).find(a=>a.id===l.face)?.points;if(ps?.length){b={x:Math.max(b.x,Math.min(...ps.map(p=>p[0]))),y:Math.max(b.y,Math.min(...ps.map(p=>p[1]))),right:Math.min(b.right,Math.max(...ps.map(p=>p[0]))),bottom:Math.min(b.bottom,Math.max(...ps.map(p=>p[1])))};}}
 if(b.right>b.x&&b.bottom>b.y){const pad=l.kind?l.stroke/2:0;points.push([b.x-pad,b.y-pad],[b.right+pad,b.bottom+pad]);}}
 if(!points.length)throw new Error('Adicione uma arte ou um elemento para otimizar a folha.');
 const spec=STRUCTURES[d.structure],x=Math.max(0,Math.min(...points.map(p=>p[0]))-.3),y=Math.max(0,Math.min(...points.map(p=>p[1]))-.3),right=Math.min(spec.width,Math.max(...points.map(p=>p[0]))+.3),bottom=Math.min(spec.height,Math.max(...points.map(p=>p[1]))+.3);
 return{x,y,w:right-x,h:bottom-y};
}
// Compare both A4 orientations and mixed rows of 0°/90° pieces, always at 1:1.
export function impositionPlan(d){
 const s={enabled:false,margin:10,gap:3,quantity:0,...d.imposition};
 if(!s.enabled)return null;
 if(d.printLayout?.mode==='two')throw new Error('Use uma folha no formato do molde antes de ativar Otimizar folha.');
 const bounds=printBounds(d);let best=null;
 for(const [width,height] of [[297,210],[210,297]])for(const transpose of [false,true]){
 const W=(transpose?height:width)-2*s.margin-(transpose?14:0),H=(transpose?width:height)-2*s.margin-(transpose?0:14),gap=s.gap;
 const bw=transpose?bounds.h:bounds.w,bh=transpose?bounds.w:bounds.h;
 const n0=Math.floor((W+gap)/(bw+gap)),n1=Math.floor((W+gap)/(bh+gap));
 const max0=n0?Math.min(500,Math.floor((H+gap)/(bh+gap))):0,max1=n1?Math.min(500,Math.floor((H+gap)/(bw+gap))):0;
 for(let a=0;a<=max0;a++)for(let b=0;b<=max1;b++){
 const used=a*(bh+gap)+b*(bw+gap)-gap,count=a*n0+b*n1;if(!count||used>H+1e-7||count>500||best&&count<=best.capacity)continue;
 const placements=[];let y=s.margin;
 for(const [rows,cols,rot,w,h] of [[a,n0,false,bw,bh],[b,n1,true,bh,bw]])for(let row=0;row<rows;row++){for(let col=0;col<cols;col++){const x=s.margin+col*(w+gap);placements.push(transpose?{x:y,y:x,w:h,h:w,rotation:rot?0:90}:{x,y,w,h,rotation:rot?90:0});}y+=h+gap;}
 best={width,height,bounds,placements,capacity:count};
 }}
 if(!best)throw new Error('O molde não cabe no A4 com estas margens. Reduza a margem ou use uma peça por folha.');
 const quantity=s.quantity||best.capacity,sheets=Math.ceil(quantity/best.capacity);if(sheets>100)throw new Error('Gere no máximo 100 folhas por PDF. Reduza a quantidade.');
 return{...best,quantity,sheets,margin:s.margin,gap:s.gap,scale:1};
}
