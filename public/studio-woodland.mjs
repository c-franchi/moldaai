import {bosqueBrigadeiroDocument} from './studio-bosque.mjs';
import {geometry,validateDocument} from './studio-model.mjs';
export const WOODLAND_MODELS=[['fox','Raposa','#fff6e7'],['bear','Urso','#fff0d7'],['raccoon','Guaxinim','#e4f2fa'],['deer','Cervo','#fff6e7'],['rabbit','Coelho','#fff6e7'],['owl','Coruja','#fff0d7']].map(([id,label,color])=>({id,label,color,filename:'bosque-'+id+'-v1.png'}));
export function woodlandDocument(model,assets,dimensions={heart:1}){
 const d=bosqueBrigadeiroDocument({bear:assets.character,leaves:assets.leaves});d.dimensions={...dimensions};d.background=model.color;d.images=[];d.fields=[];d.paths=[];d.order=[];
 d.catalog.variant='Coração · '+model.label+' · camadas independentes';
 const add=(k,l)=>{d[k].push(l);d.order.push(l.id)};
 for(const face of geometry(d.structure,d.dimensions).faces.filter(f=>f.id.startsWith('sweet-face'))){
 const b=face.box,cx=b.x+b.w/2,cy=b.y+b.h/2;
 add('paths',{id:face.id+'-background',label:'Fundo · '+face.label,kind:'polygon',usage:'art',x:b.x,y:b.y,w:b.w,h:b.h,points:face.points.map(([x,y])=>[(x-b.x)/b.w,(y-b.y)/b.h]),fill:model.color,color:model.color,stroke:.1});
 if(['fox','raccoon'].includes(model.id))for(let n=0;n<6;n++)add('paths',{id:face.id+'-stripe'+n,label:'Listra azul '+(n+1),kind:'polygon',usage:'art',x:b.x+n*b.w/6,y:b.y,w:b.w/12,h:b.h,points:stripePoints(face.points,b.x+n*b.w/6,b.x+n*b.w/6+b.w/12).map(([x,y])=>[Math.max(0,Math.min(1,(x-b.x-n*b.w/6)/(b.w/12))),Math.max(0,Math.min(1,(y-b.y)/b.h))]),fill:'#d6eaf4',color:'#d6eaf4',stroke:.1});
 for(const side of [-1,1])add('images',{id:face.id+'-leaves'+side,label:'Folhagem '+(side<0?'esquerda':'direita'),asset:assets.leaves,face:face.id,x:cx+(side<0?-17:7),y:cy-5,w:10,h:17});
 const ratio=['fox','bear','raccoon','deer'].includes(model.id)?1.5:1.08,iw=24,ih=iw/ratio;
 add('images',{id:face.id+'-character',label:model.label,asset:assets.character,face:face.id,x:cx-iw/2,y:cy-ih/2+1,w:iw,h:ih});
 const a=face.points[0],z=face.points.at(-1),angle=Math.atan2(z[1]-a[1],z[0]-a[0]),cos=Math.cos(angle),sin=Math.sin(angle);
 for(const l of d.images.filter(l=>l.face===face.id)){const dx=l.x+l.w/2-cx,dy=l.y+l.h/2-cy;l.x=cx+dx*cos-dy*sin-l.w/2;l.y=cy+dx*sin+dy*cos-l.h/2;l.rotation=angle*180/Math.PI;}

 }
 return validateDocument(d);
}

function stripePoints(points,left,right){let out=points;for(const [edge,sign] of [[left,1],[right,-1]]){const input=out;out=[];for(let i=0;i<input.length;i++){const a=input[i],b=input[(i+1)%input.length],insideA=(a[0]-edge)*sign>=0,insideB=(b[0]-edge)*sign>=0;if(insideA)out.push(a);if(insideA!==insideB){const t=(edge-a[0])/(b[0]-a[0]);out.push([edge,a[1]+t*(b[1]-a[1])]);}}}return out;}
