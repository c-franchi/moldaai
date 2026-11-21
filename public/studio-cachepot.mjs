import {validateDocument} from './studio-model.mjs';
// Reconstructed from Canva DAHaQQlt0NI 379/380. Physical assembly still needs a paper proof.
export function cachepotDocument(part=1,assets={}){
 if(![1,2].includes(part))throw new Error('Parte do cachepô inválida.');
 const d={schema:1,structure:'art-a4',background:'#ffffff',baseLines:false,catalog:{family:'cachepot',variant:'Centro de mesa · parte '+part+' de 2',size:'Duas folhas A4 · escala 100%',baseModel:'cachepot-canva-379-380-p'+part},images:[],fields:[],paths:[],order:[]};
 const add=(k,l)=>{d[k].push(l);d.order.push(l.id)};
 const scale=p=>[p[0]*297/531,p[1]*210/376];
 const path=(id,label,points,usage='cut',fill)=>{const ps=points.map(scale),x=Math.min(...ps.map(p=>p[0])),y=Math.min(...ps.map(p=>p[1])),w=Math.max(...ps.map(p=>p[0]))-x,h=Math.max(...ps.map(p=>p[1]))-y;add('paths',{id,label,kind:ps.length===2?'line':'polygon',usage,x,y,w:Math.max(w,1),h:Math.max(h,1),points:ps.map(p=>[(p[0]-x)/Math.max(w,1),(p[1]-y)/Math.max(h,1)]),color:usage==='fold'?'#a0a0a0':'#a78d73',stroke:.15,...(fill?{fill}:{}),...(usage==='fold'?{dash:'dashed'}:{})});return {x,y,w,h};};
 const scallops=(nodes)=>{const points=[];for(let i=0;i<nodes.length-1;i++){const a=nodes[i],b=nodes[i+1];for(let n=0;n<12;n++){const t=n/12;points.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t-18*Math.sin(Math.PI*t)]);}}points.push(nodes.at(-1));return points;};
 const leftTop=scallops([[84,93],[126,69],[168,60],[210,49],[256,47]]),rightTop=scallops([[256,47],[301,37],[345,37],[389,37],[434,47]]);
 const faces=[ [...leftTop,[282,263],[160,293]], [...rightTop,[407,263],[282,263]] ];
 for(let n=0;n<2;n++){
  const ps=faces[n],box=path('cachepot-face'+n,'Face '+(n+1)+' · fundo editável',ps,'art','#fff6e7');
  path('cachepot-top'+n,'Corte superior e lateral '+(n+1),ps);
  if(assets.character)add('images',{id:'character'+n,asset:assets.character,face:'shape-cachepot-face'+n,x:box.x+box.w*.2,y:box.y+box.h*.38,w:box.w*.6,h:box.w*.43});
  if(assets.leaves)add('images',{id:'leaves'+n,asset:assets.leaves,face:'shape-cachepot-face'+n,x:box.x+box.w*.05,y:box.y+box.h*.55,w:box.w*.27,h:box.w*.4});
  add('fields',{id:'name'+n,key:'name',x:box.x+box.w*.2,y:box.y+box.h*.78,w:box.w*.6,h:8,size:16,minSize:7,color:'#6e411e',align:'center',font:'cookie'});
 }
 // Shared seams are creases, never duplicate cut edges.
 d.paths=d.paths.filter(p=>!p.id.startsWith('cachepot-top'));d.order=d.order.filter(id=>!id.startsWith('cachepot-top'));
 path('outer','Corte externo · parte '+part,[...leftTop,...rightTop.slice(1),[448,61],[425,252],[407,263],...(part===1?[[407,333],[282,333],[282,263],[237,324],[170,354],[160,293]]:[[366,331],[298,352],[282,269],[215,326],[160,299]] )]);
 for(const [i,ps]of [[[256,47],[282,263]],[[434,47],[407,263]],[[160,293],[282,263]],[[282,263],[407,263]]].entries())path('fold'+i,'Vinco '+(i+1),ps,'fold');
 return validateDocument(d);
}
