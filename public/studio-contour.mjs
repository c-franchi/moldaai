import {imageSourceBox} from './studio-image-edit.mjs';
import {curvedTextLayout} from './studio-curved-text.mjs';
import {STRUCTURES,orderedLayers,pathData,imageClipPolygons,FONTS,fitText} from './studio-model.mjs';
// Clockwise exterior loops only; interior transparent holes are not cut automatically.
export function traceMask(alpha,width,height,{scale=4,margin=2}={}){
 const size=width*height,dist=new Float32Array(size);for(let i=0;i<size;i++)dist[i]=alpha[i]?0:1e6;
 const diag=Math.SQRT2;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){const i=y*width+x;let v=dist[i];if(x)v=Math.min(v,dist[i-1]+1);if(y){v=Math.min(v,dist[i-width]+1);if(x)v=Math.min(v,dist[i-width-1]+diag);if(x+1<width)v=Math.min(v,dist[i-width+1]+diag)}dist[i]=v}
 for(let y=height-1;y>=0;y--)for(let x=width-1;x>=0;x--){const i=y*width+x;let v=dist[i];if(x+1<width)v=Math.min(v,dist[i+1]+1);if(y+1<height){v=Math.min(v,dist[i+width]+1);if(x)v=Math.min(v,dist[i+width-1]+diag);if(x+1<width)v=Math.min(v,dist[i+width+1]+diag)}dist[i]=v}
 const on=(x,y)=>x>=0&&x<width&&y>=0&&y<height&&dist[y*width+x]<=margin*scale;
 const edges=new Map(),stride=width+1,vertex=(x,y)=>y*stride+x;
 const edge=(a,b)=>{const list=edges.get(a)||[];list.push(b);edges.set(a,list)};
 for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(on(x,y)){
  if(!on(x,y-1))edge(vertex(x,y),vertex(x+1,y));if(!on(x+1,y))edge(vertex(x+1,y),vertex(x+1,y+1));if(!on(x,y+1))edge(vertex(x+1,y+1),vertex(x,y+1));if(!on(x-1,y))edge(vertex(x,y+1),vertex(x,y));
 }
 const loops=[];while(edges.size){const start=edges.keys().next().value,ps=[];let at=start,guard=0;do{ps.push([at%stride/scale,Math.floor(at/stride)/scale]);const list=edges.get(at);if(!list)break;const next=list.pop();if(!list.length)edges.delete(at);at=next;}while(at!==start&&++guard<size*4);
  if(at!==start||ps.length<4)continue;const area=ps.reduce((n,p,i)=>{const q=ps[(i+1)%ps.length];return n+p[0]*q[1]-q[0]*p[1]},0)/2;if(area<1)continue;
  // Collinear simplification retains the exact dilated pixel boundary, then
  // submillimetre RDP reduces stair steps without changing physical scale.
  const corners=ps.filter((p,i)=>{const a=ps[(i+ps.length-1)%ps.length],b=ps[(i+1)%ps.length];return (p[0]-a[0])*(b[1]-p[1])!==(p[1]-a[1])*(b[0]-p[0])});
  const split=Math.floor(corners.length/2),simplified=[...rdp(corners.slice(0,split+1),.18).slice(0,-1),...rdp([...corners.slice(split),corners[0]],.18).slice(0,-1)];if(simplified.length>=3)loops.push(simplified);
 }
 return loops.sort((a,b)=>b.length-a.length);
}
function rdp(ps,tolerance){if(ps.length<3)return ps;const a=ps[0],b=ps.at(-1),dx=b[0]-a[0],dy=b[1]-a[1],den=dx*dx+dy*dy;let max=0,index=0;for(let i=1;i<ps.length-1;i++){const p=ps[i],t=den?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/den)):0,d=Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);if(d>max){max=d;index=i}}return max>tolerance?[...rdp(ps.slice(0,index+1),tolerance).slice(0,-1),...rdp(ps.slice(index),tolerance)]:[a,b]}
export async function generateContour(document,values,assetURL,{margin=2}={}){
 if(!Number.isFinite(margin)||margin<.5||margin>6)throw new Error('Use uma margem entre 0,5 e 6 mm.');
 const spec=STRUCTURES[document.structure],scale=4,canvas=globalThis.document.createElement('canvas');canvas.width=Math.ceil(spec.width*scale);canvas.height=Math.ceil(spec.height*scale);const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.scale(scale,scale);const cache=new Map();
 for(const l of orderedLayers(document)){
  if(l.opacity===0||l.id.startsWith('autocut-')||l.kind&&l.usage!=='art')continue;
  ctx.save();
  if(l.asset){ctx.beginPath();for(const poly of imageClipPolygons(document.structure,l.face,document.dimensions,document.paths)){poly.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();}ctx.clip();}
  ctx.translate(l.x+l.w/2,l.y+l.h/2);ctx.rotate((l.rotation||0)*Math.PI/180);ctx.translate(-l.x-l.w/2,-l.y-l.h/2);ctx.globalAlpha=l.opacity??1;
  if(l.kind){const path=new Path2D(pathData(l));ctx.lineWidth=l.stroke;ctx.strokeStyle=l.color;if(l.fill){ctx.fillStyle=l.fill;ctx.fill(path)}ctx.stroke(path)}
  else if(l.asset){if(!cache.has(l.asset)){const im=new Image();im.src=assetURL(l.asset);await im.decode();cache.set(l.asset,im)}const im=cache.get(l.asset),c=l.crop||{x:0,y:0,w:1,h:1};ctx.drawImage(im,c.x*im.naturalWidth,c.y*im.naturalHeight,c.w*im.naturalWidth,c.h*im.naturalHeight,l.x,l.y,l.w,l.h)}
  else{const text=l.key==='static'?l.text:values[l.key];if(text){const family=FONTS[l.font||'sans'].family;if(l.curve){const layout=curvedTextLayout(text,l,(t,size)=>{ctx.font=`${size*25.4/72}px ${family}`;return ctx.measureText(t).width});ctx.font=`${layout.size*25.4/72}px ${family}`;ctx.fillStyle=l.color;ctx.textAlign='center';ctx.textBaseline='middle';for(const g of layout.glyphs){ctx.save();ctx.translate(g.x,g.y);ctx.rotate(g.angle*Math.PI/180);ctx.fillText(g.text,0,0);ctx.restore()}ctx.restore();continue;}const fit=fitText(text,l,(t,size)=>{ctx.font=`${size*25.4/72}px ${family}`;return ctx.measureText(t).width});ctx.font=`${fit.size*25.4/72}px ${family}`;ctx.fillStyle=l.color;ctx.textAlign=l.align==='center'?'center':l.align==='right'?'right':'left';ctx.textBaseline='middle';ctx.fillText(text,l.x+(l.align==='center'?l.w/2:l.align==='right'?l.w:0),l.y+l.h/2);}}
  ctx.restore();
 }
 const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data,alpha=new Uint8Array(canvas.width*canvas.height);for(let i=0;i<alpha.length;i++)alpha[i]=pixels[i*4+3]>=32?1:0;
 const loops=traceMask(alpha,canvas.width,canvas.height,{scale,margin});if(!loops.length)throw new Error('Não há arte visível para gerar o recorte.');if(loops.length>40)throw new Error('Muitas peças pequenas separadas. Aproxime as artes ou aumente a margem.');
 const paths=loops.map((ps,i)=>{const x=Math.min(...ps.map(p=>p[0])),y=Math.min(...ps.map(p=>p[1])),w=Math.max(...ps.map(p=>p[0]))-x,h=Math.max(...ps.map(p=>p[1]))-y;if(x<=.1||y<=.1||x+w>=spec.width-.1||y+h>=spec.height-.1)throw new Error('A margem de recorte alcança a borda da folha. Afaste a composição das bordas.');if(ps.length>2048)throw new Error('Contorno complexo demais. Aumente a margem.');return {id:'autocut-'+crypto.randomUUID(),label:'Recorte automático '+(i+1),kind:'polygon',usage:'cut',fill:'#ffffff',color:'#997b87',stroke:.15,x,y,w:Math.max(1,w),h:Math.max(1,h),points:ps.map(p=>[(p[0]-x)/Math.max(1,w),(p[1]-y)/Math.max(1,h)])}});
 ctx.save();ctx.strokeStyle='#a93660';ctx.lineWidth=.3;for(const p of paths)ctx.stroke(new Path2D(pathData(p)));ctx.restore();
 return {paths,preview:canvas.toDataURL('image/png')};
}
