import {validateDocument} from './studio-model.mjs';
export const TAG_REFERENCE_ASSETS={round:'round-garden.png',rectangle:'rectangle-garden.png',vine:'vine.png',butterfly:'butterfly.png'};
function arch(){const ps=[];let last=[.12,.1];const line=(p)=>{ps.push(p);last=p};const q=(control,end)=>{const from=last;for(let i=1;i<=12;i++){const t=i/12,u=1-t;ps.push([u*u*from[0]+2*u*t*control[0]+t*t*end[0],u*u*from[1]+2*u*t*control[1]+t*t*end[1]])}last=end};line(last);line([.28,.1]);q([.35,0],[.5,0]);q([.65,0],[.72,.1]);line([.88,.1]);q([1,.1],[1,.22]);line([1,.9]);q([1,1],[.88,1]);line([.12,1]);q([0,1],[0,.9]);line([0,.22]);q([0,.1],[.12,.1]);return ps;}
const circle=()=>Array.from({length:120},(_,i)=>[.5+.5*Math.cos(i*Math.PI/60),.5+.5*Math.sin(i*Math.PI/60)]);
export function referenceTagDocument(key,assets){
 if(!['round','rectangle'].includes(key))throw new Error('Tag inválida.');
 const round=key==='round',x=85,y=60,w=round?50:40,h=round?50:60,ps=round?circle():arch();
 const d={schema:1,structure:'art-a4',background:'#ffffff',baseLines:false,images:[],fields:[],paths:[],order:[],imposition:{enabled:true,margin:10,gap:3,quantity:0}};
 const add=(type,l)=>{d[type].push(l);d.order.push(l.id);return l};
 const shape=(id,label,inset,fill,color,stroke,dash)=>add('paths',{id,label,kind:'polygon',usage:id==='tag-cut'?'cut':'art',x:x+inset,y:y+inset,w:w-2*inset,h:h-2*inset,points:ps,...(fill?{fill}:{}),color,stroke,...(dash?{dash}:{})});
 shape('tag-cut','Contorno de corte',0,undefined,'#ad8190',.15);
 shape('tag-pink','Base rosa',.25,'#f3a2bc','#e797b2',.18);
 shape('tag-pale','Borda rosa clara',1,'#fde3e9','#fff8f7',.25);
 const inner=shape('tag-cream','Área da arte · creme',1.7,'#fff7ed','#e9a1b7',.18);shape('tag-stitch','Pesponto',2.2,undefined,'#bd8c87',.15,'dashed');
 const face='shape-'+inner.id;
 const image=(id,asset,xx,yy,ww,hh,rotation=0)=>add('images',{id,asset:assets[asset],face,x:xx,y:yy,w:ww,h:hh,rotation});
 const text=(id,key,xx,yy,ww,hh,size,color)=>add('fields',{id,key,x:xx,y:yy,w:ww,h:hh,size,minSize:8,color,align:'center',font:'cookie'});
 if(round){
  image('vine-left','vine',91,65,15,17,-2);image('vine-right','vine',116.5,65,14,16,90);
  image('garden','round',89,89.5,42,18.5);image('butterfly','butterfly',90,82,10.2,9,-15);
  text('tag-name','name',96,69.5,31,12.5,32,'#bd315b');text('tag-age','age',98,81,29,7.5,18,'#3f2b25');
 }else{
  image('vine-left','vine',87,67,12,12,-3);image('vine-right','vine',112,67,11,12,90);
  image('garden','rectangle',88.2,91,33.8,27);image('butterfly','butterfly',115,87,8.5,8,12);
  text('tag-name','name',90,76,30,12.5,30,'#bd315b');text('tag-age','age',93,87,24,7.2,18,'#573629');
 }
 add('paths',{id:'tag-hole',label:'Furo · 3 mm',kind:'polygon',usage:'cut',x:x+w/2-1.5,y:y+(round?3:5.5),w:3,h:3,points:circle(),color:'#a47780',stroke:.15,fill:'#fffdf9'});
 return validateDocument(d);
}
