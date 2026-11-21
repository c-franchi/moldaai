// Compatibility for cachepôs created before structural face masks were preserved.
// Reuse only actual contour/crease vertices; do not redraw or replace the cut.
export function recoverLegacyFaceRegions(document){
 const d=document;if(d.structure!=='art-a4'||!(d.catalog?.family==='cachepot'||d.catalog?.baseModel?.startsWith('cachepot-canva-379-380-')))return d;
 const paths=d.paths||[],outer=paths.find(p=>p.id==='outer'),folds=[0,1,2,3].map(i=>paths.find(p=>p.id==='fold'+i));if(!outer||outer.kind!=='polygon'||folds.some(p=>!p)||[outer,...folds].some(p=>p.rotation||p.flipX||p.flipY))return d;
 const world=p=>p.points.map(([u,v])=>[p.x+u*p.w,p.y+v*p.h]),ps=world(outer),f=folds.map(world),same=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1])<.01,seam=ps.findIndex(p=>same(p,f[0][0])),end=ps.findIndex(p=>same(p,f[1][0]));if(seam<1||end<=seam||!same(f[2][1],f[3][0]))return d;
 const definitions=[{id:'cachepot-face0',points:[...ps.slice(0,seam+1),f[2][1],f[2][0]]},{id:'cachepot-face1',points:[...ps.slice(seam,end+1),f[3][1],f[3][0]]}],missing=definitions.filter(face=>!paths.some(p=>p.id===face.id));if(!missing.length)return d;
 const next=structuredClone(d);for(const [i,face] of missing.entries()){const x=Math.min(...face.points.map(p=>p[0])),y=Math.min(...face.points.map(p=>p[1])),w=Math.max(...face.points.map(p=>p[0]))-x,h=Math.max(...face.points.map(p=>p[1]))-y;if(w<=0||h<=0)return d;next.paths.push({id:face.id,label:'Face editável '+(Number(face.id.match(/[0-9]+$/)[0])+1),kind:'polygon',usage:'art',editableFace:true,color:outer.color,stroke:.15,x,y,w,h,points:face.points.map(([a,b])=>[(a-x)/w,(b-y)/h])});if(next.order)next.order.unshift(face.id);}
 return next;
}
