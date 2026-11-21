import {validateDocument,newDocument,geometry} from './studio-model.mjs';
export const BOSQUE_ASSETS={bear:'urso.png',leaves:'folhagem.png'};
export function bosqueTagDocument(assets={bear:'bear',leaves:'leaves'}){const x=103,y=88,w=90,h=35,d={schema:1,structure:'art-a4',background:'#ffffff',baseLines:false,catalog:{family:'tag',variant:'Plana horizontal · ursinho 3D',size:'90 × 35 mm',baseModel:'tag-horizontal-90x35-v1'},images:[],fields:[],paths:[],order:[],imposition:{enabled:true,margin:10,gap:3,quantity:0}};const add=(k,l)=>{d[k].push(l);d.order.push(l.id)};const rect=(id,label,inset,fill,color,stroke,dash)=>add('paths',{id,label,kind:'polygon',usage:id==='tag-cut'?'cut':'art',x:x+inset,y:y+inset,w:w-2*inset,h:h-2*inset,points:[[0,0],[1,0],[1,1],[0,1]],...(fill?{fill}:{}),color,stroke,...(dash?{dash}:{})});rect('tag-cut','Corte reto · 90 × 35 mm',0,undefined,'#a78d73',.15);rect('tag-border','Borda caramelo',.35,'#f8c37f','#c78442',.2);rect('tag-cream','Fundo creme',1.1,'#fff6e7','#fffaf1',.3);rect('tag-stitch','Pesponto decorativo',2,undefined,'#d2944c',.15,'dashed');const image=(id,key,xx,yy,ww,hh)=>add('images',{id,asset:assets[key],face:'shape-tag-cream',x:xx,y:yy,w:ww,h:hh});image('folhagem','leaves',x+2,y+3,25,28);image('ursinho','bear',x+59,y+3,29,29);add('fields',{id:'nome',key:'name',x:x+27,y:y+9,w:33,h:9,size:19,minSize:8,color:'#6e411e',align:'center',font:'cookie'});add('fields',{id:'idade',key:'age',x:x+29,y:y+20,w:28,h:5,size:10,minSize:6,color:'#507329',align:'center',font:'classic'});return validateDocument(d)}

export const BOSQUE_3D_ASSETS={bear:'urso-3d-v2.png',leaves:'folhagem-3d-v2.png'};
export function bosqueFoldedTagDocument(assets={bear:'bear',leaves:'leaves'}){
 const base=bosqueTagDocument(assets),d={...base,catalog:{family:'tag',variant:'Dobrável de mesa · duas faces · 3D',size:'90 × 35 mm por face · aberta 90 × 70 mm',baseModel:'tag-mesa-dobravel-90x35-v1'},images:[],fields:[],paths:[],order:[]};
 const add=(kind,l)=>{d[kind].push(l);d.order.push(l.id)};
 add('paths',{id:'tag-cut',label:'Corte externo único · 90 × 70 mm',kind:'polygon',usage:'cut',x:103,y:70,w:90,h:70,points:[[0,0],[1,0],[1,1],[0,1]],color:'#a78d73',stroke:.15});
 for(const side of ['back','front'])for(const kind of ['paths','images','fields'])for(const l of base[kind]){if(l.id==='tag-cut')continue;const offset=l.y-88,next={...l,id:side+'-'+l.id,y:side==='front'?105+offset:105-offset-l.h};if(side==='back'){next.x=296-l.x-l.w;next.rotation=180}if(kind==='images')next.face='shape-'+side+'-tag-cream';add(kind,next)}
 add('paths',{id:'tag-fold',label:'Vinco central · dobrar sem cortar',kind:'line',usage:'fold',x:103,y:105,w:90,h:1,points:[[0,0],[1,0]],color:'#808080',stroke:.2,dash:'dashed'});
 return validateDocument(d);
}

export function bosqueBrigadeiroDocument(assets={bear:'bear',leaves:'leaves'}){
 const d=newDocument('brigadeiro-petal');d.dimensions={heart:1};d.background='#fff6e7';d.images=[];d.fields=[];d.paths=[];d.order=[];
 d.catalog={family:'brigadeiro',variant:'Topo coração · duas curvas por face · ursinho e folhagem',size:'Base 35 mm · parede 22 mm · A4',baseModel:'bosque-brigadeiro-coracao-35-v2'};
 const push=(k,l)=>{d[k].push(l);d.order.push(l.id)};
 for(const face of geometry(d.structure,d.dimensions).faces.filter(f=>f.id.startsWith('sweet-face'))){const b=face.box,cx=b.x+b.w/2,cy=b.y+b.h/2;
  const points=face.points.map(([x,y])=>[(x-b.x)/b.w,(y-b.y)/b.h]);
  push('paths',{id:face.id+'-border',label:'Borda caramelo · '+face.label,kind:'polygon',usage:'art',x:b.x,y:b.y,w:b.w,h:b.h,points,color:'#d2944c',stroke:.2,dash:'dashed',cornerRadius:1});
  push('images',{id:face.id+'-leaves',asset:assets.leaves,face:face.id,x:cx-16,y:cy-8,w:12,h:15});
  push('images',{id:face.id+'-bear',asset:assets.bear,face:face.id,x:cx+6,y:cy-7,w:13,h:13});
  push('fields',{id:face.id+'-name',key:'name',x:cx-8,y:cy-4,w:17,h:5,size:9,minSize:6,color:'#6e411e',align:'center',font:'cookie'});
  push('fields',{id:face.id+'-age',key:'age',x:cx-7,y:cy+2,w:15,h:4,size:6,minSize:6,color:'#507329',align:'center',font:'classic'});
 }
 d.imposition={enabled:true,margin:10,gap:3,quantity:0};return validateDocument(d);
}
