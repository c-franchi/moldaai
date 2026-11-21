// A developed four-sided holder: equal shared seams, one integral square floor.
// Dimensions are prototype values, not inferred from the unscaled sketch.
export const BRIGADEIRO_DIMENSIONS={base:35,extra:4,height:22,crown:5,glue:6,bottomTab:5};
export function brigadeiroGeometry(dimensions={}){
 const p={...BRIGADEIRO_DIMENSIONS,...dimensions};
 if(p.heart!==undefined&&p.heart!==0&&p.heart!==1)throw new Error('Topo inválido.');
 for(const k of Object.keys(p))if(!Number.isFinite(p[k]))throw new Error('Medida inválida.');
 if(p.base<20||p.base>55||p.extra<1||p.extra>8||p.height<12||p.height>35||p.crown<1||p.crown>10||p.glue<3||p.glue>10||p.bottomTab<3||p.bottomTab>10)throw new Error('Confira os limites das medidas da forminha.');
 const {base:B,extra:E,height:H,crown:C}=p,theta=2*Math.atan(E/(2*H)),r=B/(2*Math.sin(theta/2)),R=(B+E)/(2*Math.sin(theta/2));
 const polar=(radius,a)=>[radius*Math.sin(a),-radius*Math.cos(a)],faces=[],areas=[],glue=[],folds=[];
 const box=ps=>{const x=Math.min(...ps.map(q=>q[0])),y=Math.min(...ps.map(q=>q[1]));return{x,y,w:Math.max(...ps.map(q=>q[0]))-x,h:Math.max(...ps.map(q=>q[1]))-y};};
 const add=(id,label,group,points,isGlue=false)=>{const a={id,label,group,points,box:box(points)};areas.push(a);(isGlue?glue:faces).push(isGlue?points:a);return a;};
 for(let i=0;i<4;i++){
  const a=(i-2)*theta,b=a+theta,lo=polar(r,a),hi=polar(R,a),end=polar(R,b),bottom=polar(r,b),mid=(a+b)/2;
  // Smooth convex top sampled from a quadratic curve, kept identical in SVG/PDF/clips.
  const control=[(hi[0]+end[0])/2+2*C*Math.sin(mid),(hi[1]+end[1])/2-2*C*Math.cos(mid)];
  const curve=Array.from({length:33},(_,n)=>{const t=n/32;if(p.heart===1){const u=t<=.5?t*2:(t-.5)*2,v=4*u*(1-u),lift=C*(.2*Math.sin(Math.PI*t)+.8*v);return[(1-t)*hi[0]+t*end[0]+lift*Math.sin(mid),(1-t)*hi[1]+t*end[1]-lift*Math.cos(mid)];}return[(1-t)**2*hi[0]+2*(1-t)*t*control[0]+t*t*end[0],(1-t)**2*hi[1]+2*(1-t)*t*control[1]+t*t*end[1]];});
  add('sweet-face'+(i+1),'Face curva '+(i+1),'Quatro faces',[lo,...curve,bottom]);
  if(i<3)folds.push([end,bottom]);
 }
 const f=faces[1].points,A=f[0],D=f.at(-1),ux=(D[0]-A[0])/B,uy=(D[1]-A[1])/B,nx=-uy,ny=ux;
 const floor=[A,D,[D[0]+nx*B,D[1]+ny*B],[A[0]+nx*B,A[1]+ny*B]];
 add('sweet-floor','Fundo quadrado inteiro','Fundo',floor);folds.push([A,D]);
 // Keep the old layout anchor so existing artwork never moves when tabs change sides.
 const legacyTabs=[];
 for(let i=1;i<4;i++){const a=floor[i],b=floor[(i+1)%4],dx=(b[0]-a[0])/B,dy=(b[1]-a[1])/B,t=p.bottomTab,bevel=Math.min(2,t/2);legacyTabs.push([a,b,[b[0]+dy*t-dx*bevel,b[1]-dx*t-dy*bevel],[a[0]+dy*t+dx*bevel,a[1]-dx*t+dy*bevel]]);}
 // Tabs attach to the bottom edge of the three walls; the square floor stays clean.
 let tabIndex=0;for(const i of [0,2,3]){const wall=faces[i].points,a=wall.at(-1),b=wall[0],dx=(b[0]-a[0])/B,dy=(b[1]-a[1])/B,t=p.bottomTab,bevel=Math.min(2,t/2);const tab=[a,b,[b[0]+dy*t-dx*bevel,b[1]-dx*t-dy*bevel],[a[0]+dy*t+dx*bevel,a[1]-dx*t+dy*bevel]];add('sweet-bottom-tab'+(++tabIndex),'Cola inferior da face '+(i+1),'Abas de colagem',tab,true);folds.push([a,b]);}
 const last=faces[3].points,a=last[last.length-2],b=last.at(-1),len=Math.hypot(b[0]-a[0],b[1]-a[1]),dx=(b[0]-a[0])/len,dy=(b[1]-a[1])/len;
 add('sweet-seam','Emenda lateral','Abas de colagem',[a,b,[b[0]+dy*p.glue-dx*2,b[1]-dx*p.glue-dy*2],[a[0]+dy*p.glue+dx*2,a[1]-dx*p.glue+dy*2]],true);folds.push([a,b]);
 // Cancel attached edges; only exterior edges are cut, never shared creases.
 // Integer quantization canonicalizes signed zero at the central seam.
 const key=q=>q.map(v=>Math.round(v*1e6)).join(','),edges=new Map();
 for(const ps of [...faces.map(f=>f.points),...glue])for(let i=0;i<ps.length;i++){const a=ps[i],b=ps[(i+1)%ps.length],k=[key(a),key(b)].sort().join('|');if(edges.has(k))edges.delete(k);else edges.set(k,[a,b]);}
 const cuts=[];while(edges.size){const [k,edge]=edges.entries().next().value;edges.delete(k);const ps=[edge[0],edge[1]];while(key(ps.at(-1))!==key(ps[0])){const found=[...edges].find(([,e])=>e.some(q=>key(q)===key(ps.at(-1))));if(!found)throw new Error('Contorno do molde aberto.');const [id,e]=found;edges.delete(id);ps.push(key(e[0])===key(ps.at(-1))?e[1]:e[0]);}cuts.push(ps.slice(0,-1));}
 const bounds=box(areas.flatMap(a=>a.points));if(bounds.w>277||bounds.h>180)throw new Error('O molde ultrapassa a área A4. Reduza as medidas.');
 const anchor=box([...areas.filter(a=>!a.id.startsWith('sweet-bottom-tab')).flatMap(a=>a.points),...legacyTabs.flat()]);
 const tx=(297-anchor.w)/2-anchor.x,ty=35-anchor.y,move=q=>[+(q[0]+tx).toFixed(6),+(q[1]+ty).toFixed(6)];
 for(const a of areas){a.points=a.points.map(move);a.box=box(a.points);}return{faces,areas,glue:areas.filter(a=>a.group==='Abas de colagem').map(a=>a.points),folds:folds.map(e=>e.map(move)),cuts:cuts.map(ps=>ps.map(move)),params:p};
}
