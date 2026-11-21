// Reconstructed from the visible outline/ruler of Canva DAHaQQlt0NI page 21.
// Four equal faces; dimensions in mm, editable pending a physical assembly check.
export const MILK_DIMENSIONS={x:41,y:4.6,faceW:56.4,bodyH:85,roofH:32.5,capH:11.5,baseH:45,glueW:7.5,holeR:2.5};
const box=ps=>{const xs=ps.map(p=>p[0]),ys=ps.map(p=>p[1]);return {x:Math.min(...xs),y:Math.min(...ys),w:Math.max(...xs)-Math.min(...xs),h:Math.max(...ys)-Math.min(...ys)}};
export function milkGeometry(input={}){
 const p={...MILK_DIMENSIONS,...input};for(const [k,v] of Object.entries(p))if(!Object.hasOwn(MILK_DIMENSIONS,k)||!Number.isFinite(v)||v<0)throw new Error('Medida da Caixa Milk inválida.');
 const {x,y,faceW:w,bodyH:h,roofH:r,capH:c,baseH:b,glueW:g,holeR:hr}=p;
 if(w<20||h<30||r<10||c<6||b<10||g<3||g>20||hr<1||hr>c/3||x+4*w+g>287||y+c+r+h+b>185)throw new Error('Ajuste as medidas: o molde Milk deve caber na folha A4, com espaço para calibração.');
 const roof=y+c,body=roof+r,bottom=body+h,end=bottom+b,faces=[],areas=[],folds=[],cuts=[],glue=[];
 const rect=(xx,yy,ww,hh)=>[[xx,yy],[xx+ww,yy],[xx+ww,yy+hh],[xx,yy+hh]];
 const add=(id,label,group,points,parent,optional=false)=>areas.push({id,label,group,points,box:box(points),...(parent?{parent}:{}),...(optional?{optional:true}:{})});
 for(let n=0;n<4;n++){
  const xx=x+n*w,id='milk-face'+(n+1),front=n%2===1;
  const base=n===0?[[xx,bottom],[xx+w,bottom],[xx+w,end],[xx+w*.73,end],[xx+w*.73,bottom+b*.48]]:n===1?[[xx,bottom],[xx+w,bottom],[xx+w*.73,bottom+b*.62],[xx+w*.73,end],[xx+w*.26,end],[xx+w*.26,bottom+b*.62]]:n===2?[[xx,bottom],[xx+w,bottom],[xx+w*.27,bottom+b*.48],[xx+w*.27,end],[xx,end]]:[[xx,bottom],[xx+w,bottom],[xx+w,end],[xx+w*.74,end],[xx+w*.74,bottom+b*.62],[xx+w*.26,bottom+b*.62],[xx+w*.26,end],[xx,end]];
  const cap=front?[[xx,roof],[xx, y+4],[xx+.5,y+2],[xx+2,y+.5],[xx+4,y],[xx+w-4,y],[xx+w-2,y+.5],[xx+w-.5,y+2],[xx+w,y+4],[xx+w,roof]]:null;
  const points=[...(cap||[[xx,roof],[xx+w,roof]]),[xx+w,bottom],...base.slice(2),[xx,bottom]];
  faces.push({id,label:['Lateral 1','Frente','Lateral 2','Verso'][n],points,box:box(points)});
  add(id+'-body',['Lateral 1','Frente','Lateral 2','Verso'][n],'Corpo',rect(xx,body,w,h),id);
  add(id+'-roof','Dobra superior '+(n+1),'Fechamento superior',rect(xx,roof,w,r),id);
  if(cap)add(id+'-cap','Aba com furos '+(n+1),'Abas superiores com furos',cap,id);
  add(id+'-base','Aba do fundo '+(n+1),'Fundo de encaixe',base,id);
  folds.push([[xx,body],[xx+w,body]],[[xx,bottom],[xx+w,bottom]]);
  if(front){folds.push([[xx,roof],[xx+w,roof]]);for(const dx of [-4.6,4.6]){const cx=xx+w/2+dx,cy=y+c/2;cuts.push(Array.from({length:32},(_,i)=>[cx+hr*Math.cos(i*Math.PI/16),cy+hr*Math.sin(i*Math.PI/16)]));}}
  else folds.push([[xx,body],[xx+w/2,roof]],[[xx+w/2,roof],[xx+w,body]]);
  if(n<3)folds.push([[xx+w,roof],[xx+w,bottom]]);
 }
 const edge=x+4*w;
 for(const [a,z] of [[roof,body],[body,bottom]]){const bevel=Math.min(6,(z-a)/4),tab=[[edge,a],[edge+g,a+bevel],[edge+g,z-bevel],[edge,z]];glue.push(tab);add('milk-glue-'+glue.length,'Aba lateral de cola '+glue.length,'Abas de colagem',tab,null,true);folds.push([[edge,a],[edge,z]]);}
 // One exterior contour: panel boundaries remain folds, bottom slots remain cuts.
 const outer=[[x,roof]];
 for(let n=0;n<4;n++){const xx=x+n*w;if(n%2)outer.push(...areas.find(a=>a.id==='milk-face'+(n+1)+'-cap').points.slice(1));else outer.push([xx+w,roof]);}
 outer.push(...glue[0].slice(1),...glue[1].slice(1));
 for(let n=3;n>=0;n--){const base=areas.find(a=>a.id==='milk-face'+(n+1)+'-base').points;outer.push(...base.slice(2),base[0]);}
 cuts.unshift(outer);
 return {faces,areas,folds,glue,cuts,params:p,bodyY:body,bottomY:bottom,roofY:roof,bounds:{x,y,w:4*w+g,h:c+r+h+b}};
}
export function milkPrintPlan(d){
 const mode=d.printLayout?.mode||'single';if(!['single','two'].includes(mode))throw new Error('Escolha uma ou duas folhas.');
 if(mode==='single')return {mode,scale:1};
 const geo=milkGeometry(d.dimensions),scale=d.printLayout.scale??1.35,tab=d.printLayout.tab??8,seam=d.printLayout.seam??2;
 if(!Number.isFinite(scale)||scale<1||scale>2||!Number.isFinite(tab)||tab<3||tab>15||![1,2,3].includes(seam))throw new Error('Divisão inválida: ampliação 100 a 200%, aba 3 a 15 mm e união entre faces.');
 const p=geo.params,split=p.x+seam*p.faceW;let minX=geo.bounds.x,minY=geo.bounds.y,maxX=minX+geo.bounds.w,maxY=minY+geo.bounds.h;
 for(const list of [d.paths,d.fields])for(const l of Array.isArray(list)?list:[]){if(!['x','y','w','h'].every(k=>Number.isFinite(l[k])))continue;const a=(Number.isFinite(l.rotation)?l.rotation:0)*Math.PI/180,c=Math.cos(a),s=Math.sin(a),cx=l.x+l.w/2,cy=l.y+l.h/2;for(const [xx,yy] of [[l.x,l.y],[l.x+l.w,l.y],[l.x+l.w,l.y+l.h],[l.x,l.y+l.h]]){const X=cx+(xx-cx)*c-(yy-cy)*s,Y=cy+(xx-cx)*s+(yy-cy)*c;minX=Math.min(minX,X);minY=Math.min(minY,Y);maxX=Math.max(maxX,X);maxY=Math.max(maxY,Y);}}
 const bounds={x:minX,y:minY,w:maxX-minX,h:maxY-minY},leftW=split-minX,rightW=maxX-split;
 if(Math.max(leftW*scale+tab,rightW*scale)>190||bounds.h*scale>267)throw new Error('A ampliação não cabe em duas folhas A4. Reduza a escala ou escolha a divisão entre as faces 2 e 3.');
 return {mode,scale,tab,seam,split,geo,bounds,leftW,rightW};
}
