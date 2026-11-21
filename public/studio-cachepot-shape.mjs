import {validateDocument,STRUCTURES} from './studio-model.mjs';
const points=p=>p.points.map(([u,v])=>[p.x+u*p.w,p.y+v*p.h]);
export function cachepotTopInfo(d){
 const left=d.paths?.find(p=>p.id==='cachepot-face0'),right=d.paths?.find(p=>p.id==='cachepot-face1'),outer=d.paths?.find(p=>p.id==='outer');
 if(!left||!right||!outer||left.kind!=='polygon'||right.kind!=='polygon'||outer.kind!=='polygon'||left.points.length<4||right.points.length<4)return null;
 const a=points(left)[0],b=points(right).at(-3),pivot=points(left).at(-3);if(Math.abs(b[0]-a[0])<1)return null;
 return {left,right,outer,a,b,pivot,angle:Math.atan2(b[1]-a[1],b[0]-a[0])*180/Math.PI};
}
export function setCachepotTopAngle(document,angle){
 const d=validateDocument(document),info=cachepotTopInfo(d);if(!info)throw new Error('Este molde não tem uma borda superior compatível com o ajuste.');
 if(!Number.isFinite(angle)||angle< -20||angle>20)throw new Error('Use uma inclinação entre −20° e 20°.');
 if([info.left,info.right,info.outer].some(p=>p.rotation||p.flipX||p.flipY))throw new Error('Ajuste a inclinação antes de girar ou refletir o contorno.');
 const next=structuredClone(d),slope=Math.tan(angle*Math.PI/180)-(info.b[1]-info.a[1])/(info.b[0]-info.a[0]),top=[...points(info.left).slice(0,-2),...points(info.right).slice(0,-2)],epsilon=.002;
 const onTop=([x,y])=>top.some(([a,b])=>Math.abs(x-a)<epsilon&&Math.abs(y-b)<epsilon);
 const outerTopCount=info.left.points.length+info.right.points.length-5;
 for(const p of next.paths){let ps=points(p),changed=false;
  ps=ps.map((point,index)=>{let dy=onTop(point)?slope*(point[0]-info.pivot[0]):0;if(p.id==='outer'&&index===outerTopCount)dy=slope*(info.b[0]-info.pivot[0]);if(Math.abs(dy)>1e-10){changed=true;return [point[0],point[1]+dy];}return point;});
  if(!changed)continue;const x=Math.min(...ps.map(p=>p[0])),y=Math.min(...ps.map(p=>p[1])),w=Math.max(...ps.map(p=>p[0]))-x,h=Math.max(...ps.map(p=>p[1]))-y,page=STRUCTURES[d.structure];
  if(x<0||y<0||x+w>page.width||y+h>page.height)throw new Error('Esta inclinação ultrapassa a folha A4. Use um ângulo menor.');
  p.x=x;p.y=y;p.w=Math.max(1,w);p.h=Math.max(1,h);p.points=ps.map(([a,b])=>[(a-x)/p.w,(b-y)/p.h]);
 }
 return validateDocument(next);
}

// Change the repeated edge profile while keeping all seam endpoints and lower vertices fixed.
export function setCachepotEdgeProfile(document,{style='oval',count=4,height=8,gap=0}={}){
 const d=validateDocument(document),info=cachepotTopInfo(d);if(!info)throw new Error('Este molde não tem uma borda superior compatível.');
 if(!['straight','oval','soft','circular'].includes(style)||!Number.isInteger(count)||count<1||count>12||!Number.isFinite(height)||height<0||height>20)throw new Error('Escolha borda reta, oval ou suave, com 1 a 12 curvas e altura de 0 a 20 mm.');
 if([info.left,info.right,info.outer].some(p=>p.rotation||p.flipX||p.flipY))throw new Error('Edite as curvas antes de girar ou refletir o contorno.');
 const left=points(info.left),right=points(info.right),outer=points(info.outer),oldCount=left.length+right.length-5,close=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1])<.01;
 if(!close(outer[0],left[0])||!close(outer[left.length-3],left.at(-3))||!close(outer[oldCount-1],right.at(-3)))throw new Error('O recorte e as faces foram editados separadamente. Revise seus pontos antes de ajustar a borda.');
 if(!Number.isFinite(gap)||gap<0||gap>20)throw new Error('Use uma abertura entre 0 e 20 mm.');
 const arcPoint=(a,b,n,u)=>{const dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy),t=(n+u)/count,bump=style==='circular'?circularRise(length/count,height,u):height*(style==='oval'?Math.sqrt(Math.max(0,1-(2*u-1)**2)):Math.sin(Math.PI*u)**2);return [a[0]+dx*t+dy/length*bump,a[1]+dy*t-dx/length*bump];};
 let effectiveGap=style==='straight'||style==='circular'||height===0?0:gap,seamTrim=0;const widths=[Math.hypot(left.at(-3)[0]-left[0][0],left.at(-3)[1]-left[0][1])/count,Math.hypot(right.at(-3)[0]-right[0][0],right.at(-3)[1]-right[0][1])/count];
 if(effectiveGap){const maximum=Math.min(...widths)*.8;if(effectiveGap>=maximum)throw new Error('A abertura deve ser menor que '+maximum.toFixed(2)+' mm para preservar os arcos. Reduza o vão ou a quantidade de curvas.');const distance=trim=>{const a=arcPoint(left[0],left.at(-3),count-1,1-trim/widths[0]),b=arcPoint(right[0],right.at(-3),0,trim/widths[1]);return Math.hypot(b[0]-a[0],b[1]-a[1]);};let low=0,high=Math.min(...widths)*.4;if(distance(high)<effectiveGap)throw new Error('Esta abertura não cabe na união das faces. Use um vão menor.');for(let i=0;i<50;i++){const middle=(low+high)/2;if(distance(middle)<effectiveGap)low=middle;else high=middle;}seamTrim=(low+high)/2;}
 // Rounded shoulders follow the tangent of the retained arc and the face normal at the valley.
 // No straight chamfer is inserted between the arc and the original seam anchor.
 const profile=(a,b,startTrim=0,endTrim=0)=>{
  if(style==='straight'||height===0)return [a,b];
  const dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy),width=length/count,result=[];
  const add=p=>{if(!result.length||Math.hypot(p[0]-result.at(-1)[0],p[1]-result.at(-1)[1])>1e-9)result.push(p);};
  const shoulder=(n,u,atStart)=>{
   const point=arcPoint(a,b,n,u),v=atStart?0:1,anchor=arcPoint(a,b,n,v);
   const derivative=style==='oval'?height*(-2*(2*u-1))/Math.sqrt(Math.max(1e-12,1-(2*u-1)**2)):height*Math.PI*Math.sin(2*Math.PI*u);
   const bump=height*(style==='oval'?Math.sqrt(Math.max(0,1-(2*u-1)**2)):Math.sin(Math.PI*u)**2);
   const controlHeight=Math.max(0,bump+derivative*(v-u));
   const control=[anchor[0]+dy/length*controlHeight,anchor[1]-dx/length*controlHeight];
   const from=atStart?anchor:point,to=atStart?point:anchor;
   for(let i=0;i<=16;i++){const t=i/16,k=1-t;add([k*k*from[0]+2*k*t*control[0]+t*t*to[0],k*k*from[1]+2*k*t*control[1]+t*t*to[1]]);}
  };
  add([...a]);
  for(let n=0;n<count;n++){
   const first=effectiveGap?(n===0?startTrim:effectiveGap/2)/width:0,last=effectiveGap?1-(n===count-1?endTrim:effectiveGap/2)/width:1;
   if(first>0)shoulder(n,first,true);else add(arcPoint(a,b,n,0));
   for(let step=1;step<48;step++){const u=step/48;if(u>first&&u<last)add(arcPoint(a,b,n,u));}
   add(arcPoint(a,b,n,last));if(last<1)shoulder(n,last,false);
  }
  add([...b]);return result;
 };
 const topLeft=profile(left[0],left.at(-3),0,seamTrim),topRight=profile(right[0],right.at(-3),seamTrim,0),replacements=new Map([[info.left.id,[...topLeft,...left.slice(-2)]],[info.right.id,[...topRight,...right.slice(-2)]],[info.outer.id,[...topLeft,...topRight.slice(1),...outer.slice(oldCount)]]]);
 const next=structuredClone(d),page=STRUCTURES[d.structure];
 for(const p of next.paths){const ps=replacements.get(p.id);if(!ps)continue;const x=Math.min(...ps.map(p=>p[0])),y=Math.min(...ps.map(p=>p[1])),w=Math.max(...ps.map(p=>p[0]))-x,h=Math.max(...ps.map(p=>p[1]))-y;if(x<0||y<0||x+w>page.width||y+h>page.height)throw new Error('As curvas ultrapassam a folha. Reduza a altura.');p.x=x;p.y=y;p.w=Math.max(1,w);p.h=Math.max(1,h);p.points=ps.map(([a,b])=>[(a-x)/p.w,(b-y)/p.h]);}
 next.cachepotEdge={style,count:style==='straight'?1:count,height:style==='straight'?0:height,...(effectiveGap?{gap:effectiveGap}:{})};return validateDocument(next);
}

// A shallow circular segment has finite endpoint slopes, unlike a half ellipse.
function circularRise(width,height,u){
 if(u===0||u===1||height===0)return 0;
 const radius=(width*width/4+height*height)/(2*height),x=(u-.5)*width;
 return Math.sqrt(Math.max(0,radius*radius-x*x))-(radius-height);
}
export function setCachepotStandardEdge(document,{style='circular',count=4}={}){
 if(!['circular','straight','soft'].includes(style)||!Number.isInteger(count)||count<1||count>12)throw new Error('Escolha um acabamento e de 1 a 12 curvas por face.');
 const info=cachepotTopInfo(document);if(!info)throw new Error('Este molde não tem uma borda superior compatível.');
 const widths=[info.left,info.right].map(p=>{const ps=points(p);return Math.hypot(ps.at(-3)[0]-ps[0][0],ps.at(-3)[1]-ps[0][1])/count;});
 return setCachepotEdgeProfile(document,{style,count,height:style==='straight'?0:Math.min(20,Math.min(...widths)*.16),gap:0});
}
