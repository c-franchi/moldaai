import {impositionPlan} from '../public/studio-imposition.mjs';
import {STRUCTURES} from '../public/studio-model.mjs';
import {degrees,rgb} from 'pdf-lib';
const MM=72/25.4;
export async function imposePDF(pdf,source,d,font){
 const p=impositionPlan(d);if(!p)return;
 const b=p.bounds,H=STRUCTURES[d.structure].height,embedded=await pdf.embedPage(source,{left:b.x*MM,right:(b.x+b.w)*MM,bottom:(H-b.y-b.h)*MM,top:(H-b.y)*MM});
 for(let i=0;i<p.sheets;i++){
 const page=pdf.addPage([p.width*MM,p.height*MM]),n=Math.min(p.capacity,p.quantity-i*p.capacity);
 for(const q of p.placements.slice(0,n)){const x=q.rotation?q.x+q.w:q.x;page.drawPage(embedded,{x:x*MM,y:(p.height-q.y-q.h)*MM,width:b.w*MM,height:b.h*MM,rotate:degrees(q.rotation)});}
 page.drawRectangle({x:p.margin*MM,y:p.margin*MM,width:10*MM,height:10*MM,borderWidth:.2*MM,borderColor:rgb(.4,.4,.4)});
 page.drawText('10 mm | imprimir em 100% | '+n+' unidades | folha '+(i+1)+'/'+p.sheets,{x:(p.margin+13)*MM,y:(p.margin+4)*MM,size:8,font,color:rgb(.4,.4,.4)});
  if(STRUCTURES[d.structure].experimental)page.drawText('TESTE | conferir montagem antes de produzir o lote',{x:(p.margin+13)*MM,y:(p.margin+1)*MM,size:6,font,color:rgb(.5,.3,.35)});
 }
 pdf.removePage(pdf.getPages().indexOf(source));
}
