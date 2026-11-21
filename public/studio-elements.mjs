import {validateDocument,STRUCTURES,orderedLayers} from './studio-model.mjs';
const polygon=(n,offset=-Math.PI/2)=>Array.from({length:n},(_,i)=>[.5+.5*Math.cos(offset+i*2*Math.PI/n),.5+.5*Math.sin(offset+i*2*Math.PI/n)]);
const star=n=>Array.from({length:n*2},(_,i)=>{const a=-Math.PI/2+i*Math.PI/n,r=i%2?.22:.5;return [.5+r*Math.cos(a),.5+r*Math.sin(a)]});
const arrow=[[0,.28],[.6,.28],[.6,0],[1,.5],[.6,1],[.6,.72],[0,.72]];
const heart=Array.from({length:96},(_,i)=>{const t=i*2*Math.PI/96;return [.5+16*Math.sin(t)**3/34,.48-(13*Math.cos(t)-5*Math.cos(2*t)-2*Math.cos(3*t)-Math.cos(4*t))/34]});
export const ELEMENTS=[
 {id:'line',label:'Linha reta',category:'Linhas',kind:'line',points:[[0,.5],[1,.5]],w:30,h:2},
 {id:'dash',label:'Linha tracejada',category:'Linhas',kind:'line',points:[[0,.5],[1,.5]],dash:'dashed',w:30,h:2},
 {id:'dot',label:'Linha pontilhada',category:'Linhas',kind:'line',points:[[0,.5],[1,.5]],dash:'dotted',w:30,h:2},
 {id:'square',label:'Quadrado',category:'Formas básicas',points:[[0,0],[1,0],[1,1],[0,1]]},
 {id:'rounded',label:'Quadrado arredondado',category:'Formas básicas',points:[[0,0],[1,0],[1,1],[0,1]],cornerRadius:3},
 {id:'rectangle',label:'Retângulo',category:'Formas básicas',points:[[0,0],[1,0],[1,1],[0,1]],w:30,h:18},
 {id:'circle',label:'Círculo',category:'Formas básicas',kind:'ellipse',points:[[0,0],[1,1]]},
 {id:'oval',label:'Oval',category:'Formas básicas',kind:'ellipse',points:[[0,0],[1,1]],w:30,h:18},
 {id:'triangle',label:'Triângulo',category:'Formas básicas',points:[[.5,0],[1,1],[0,1]]},
 {id:'diamond',label:'Losango',category:'Formas básicas',points:[[.5,0],[1,.5],[.5,1],[0,.5]]},
 {id:'heart',label:'Coração',category:'Formas básicas',points:heart},
 ...[5,6,7,8].map(n=>({id:'polygon'+n,label:['Pentágono','Hexágono','Heptágono','Octógono'][n-5],category:'Polígonos',points:polygon(n)})),
 ...[4,5,6,8].map(n=>({id:'star'+n,label:'Estrela de '+n+' pontas',category:'Estrelas',points:star(n)})),
 ...['Direita','Esquerda','Cima','Baixo'].map((label,i)=>({id:'arrow'+i,label:'Seta para '+label.toLowerCase(),category:'Setas',points:arrow.map(([x,y])=>i===0?[x,y]:i===1?[1-x,y]:i===2?[y,1-x]:[y,x])})),
 {id:'trapezoid',label:'Trapézio',category:'Outras formas',points:[[.2,0],[.8,0],[1,1],[0,1]]},
 {id:'parallelogram',label:'Paralelogramo',category:'Outras formas',points:[[.25,0],[1,0],[.75,1],[0,1]]},
 {id:'cross',label:'Cruz',category:'Outras formas',points:[[.35,0],[.65,0],[.65,.35],[1,.35],[1,.65],[.65,.65],[.65,1],[.35,1],[.35,.65],[0,.65],[0,.35],[.35,.35]]}
];
export const ELEMENT_COLORS=['#ffffff','#fff6e7','#f8c37f','#d2944c','#6e411e','#d5eaf2','#86b7d4','#507329','#a8c7a0','#f5c9d6','#b84c72','#242424'];
export function elementIcon(e,color='#242424'){
 if(e.kind==='line')return `<svg viewBox="0 0 50 50" aria-hidden="true"><path d="M 3 25 H 47" fill="none" stroke="${color}" stroke-width="2" ${e.dash?'stroke-dasharray="'+(e.dash==='dotted'?'1 3':'5 3')+'"':''}/></svg>`;
 const outline='stroke="#81737a" stroke-width=".5"';
 return `<svg viewBox="-2 -2 54 54" aria-hidden="true">${e.kind==='ellipse'?`<ellipse cx="25" cy="25" rx="24" ry="${e.id==='oval'?16:24}" fill="${color}" ${outline}/>`:e.cornerRadius?`<rect width="50" height="50" rx="8" fill="${color}" ${outline}/>`:`<polygon points="${e.points.map(([x,y])=>[x*50,y*50].join(',')).join(' ')}" fill="${color}" ${outline}/>`}</svg>`;
}
export function makeElement(document,id,{color='#d2944c',area,uid='element'+crypto.randomUUID()}={}){
 const e=ELEMENTS.find(e=>e.id===id);if(!e)throw new Error('Forma não encontrada.');if(!/^#[0-9a-f]{6}$/i.test(color))throw new Error('Cor inválida.');if((document.paths||[]).length>=100)throw new Error('Limite de 100 formas.');
 const page=STRUCTURES[document.structure],w=e.w||22,h=e.h||22,b=area||{x:0,y:0,w:page.width,h:page.height};
 const l={id:uid,label:e.label,kind:e.kind||'polygon',usage:'art',x:Math.max(0,Math.min(page.width-w,b.x+(b.w-w)/2)),y:Math.max(0,Math.min(page.height-h,b.y+(b.h-h)/2)),w,h,points:e.points.map(p=>[...p]),color,stroke:e.kind==='line'?.5:.15,...(e.kind==='line'?{}:{fill:color}),...(e.dash?{dash:e.dash}:{}),...(e.cornerRadius?{cornerRadius:e.cornerRadius}:{})};
 validateDocument({...document,paths:[...(document.paths||[]),l],order:[...orderedLayers(document).map(l=>l.id),l.id]});return l;
}
