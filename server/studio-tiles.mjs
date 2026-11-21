import {FOLD_GUIDE} from '../public/studio-model.mjs';
import {rgb} from 'pdf-lib';
import {milkPrintPlan} from '../public/studio-milk.mjs';
const MM=72/25.4;
export async function tileMilkPDF(pdf,source,d,font){
 const plan=milkPrintPlan(d);if(plan.mode!=='two')return;
 const {geo,split,scale,tab,leftW,rightW}=plan,{x,y,h}=plan.bounds,p=geo.params;
 const sourceH=210;
 for(let i=0;i<2;i++){
  const start=i?split:x,end=i?x+plan.bounds.w:split,w=i?rightW:leftW;
  const epsilon=.2;const embedded=await pdf.embedPage(source,{left:(start+(i?epsilon:0))*MM,right:(end-(i?0:epsilon))*MM,bottom:(sourceH-y-h)*MM,top:(sourceH-y)*MM});
  const page=pdf.addPage([210*MM,297*MM]),ox=(210-(w*scale+(i?0:tab)))/2,oy=14;
  page.drawPage(embedded,{x:(ox+(i?epsilon*scale:0))*MM,y:(297-oy-h*scale)*MM,width:(w-epsilon)*scale*MM,height:h*scale*MM});
  const at=(xx,yy)=>({x:(ox+(xx-start)*scale)*MM,y:(297-oy-(yy-y)*scale)*MM});
  const line=(a,b,fold=false)=>page.drawLine({start:a,end:b,thickness:(fold?FOLD_GUIDE.stroke:.25)*MM,opacity:fold?FOLD_GUIDE.opacity:1,color:fold?rgb(...FOLD_GUIDE.color.slice(1).match(/../g).map(v=>parseInt(v,16)/255)):rgb(.25,.25,.25),...(fold?{dashArray:[2*MM,MM]}:{})});
  const seamX=ox+w*scale;
  if(i===0){
   for(const [a,b] of [[geo.roofY,geo.bodyY],[geo.bodyY,geo.bottomY]]){
    const top=at(split,a),bottom=at(split,b),bevel=Math.min(4,(b-a)*scale/4)*MM;
    const q1={x:top.x+tab*MM,y:top.y-bevel},q2={x:bottom.x+tab*MM,y:bottom.y+bevel};
    line(top,q1);line(q1,q2);line(q2,bottom);line(top,bottom,true);
    page.drawText('COLAR A',{x:top.x+1*MM,y:(top.y+bottom.y)/2,font,size:5,color:rgb(.4,.3,.35),rotate:{type:'degrees',angle:90}});
   }
  line(at(split,p.y+4),at(split,geo.roofY));
  }else {line(at(split,geo.roofY),at(split,geo.bottomY));line(at(split,geo.bottomY),at(split,geo.bounds.y+geo.bounds.h));}
  // Matching registration ticks on the same source heights; printed outside artwork.
  for(const yy of [geo.bodyY+8,geo.bottomY-8]){const q=at(split,yy),dir=i?-1:1;line({x:q.x+dir*1.5*MM,y:q.y},{x:q.x+dir*4*MM,y:q.y});}
  page.drawText('Caixa Milk · parte '+(i+1)+'/2 · ampliação '+Math.round(scale*100)+'% · imprimir em 100%',{x:10*MM,y:9*MM,font,size:8,color:rgb(.5,.2,.3)});
  page.drawRectangle({x:10*MM,y:15*MM,width:10*MM,height:10*MM,borderWidth:.25*MM,borderColor:rgb(.25,.25,.25)});page.drawText('10 × 10 mm · unir pelas marcas A',{x:23*MM,y:18*MM,font,size:8,color:rgb(.3,.3,.3)});
 }
 pdf.removePage(pdf.getPages().indexOf(source));
}
