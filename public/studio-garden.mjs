import {validateDocument} from './studio-model.mjs';
export const GARDEN_ASSETS={fairy:'fada',mushroom:'casinha-cogumelo',birdhouse:'casinha-passaro',flowers:'flores',butterfly:'borboleta',garden:'jardim'};
export const GARDEN_PRESETS={round:{title:'Tag redonda · Jardim Encantado',note:'Diâmetro 50 mm · bases rosa e rosa clara · furo de 3 mm opcional'},rectangle:{title:'Tag retangular · Jardim Encantado',note:'40 × 60 mm · bases rosa e rosa clara · furo de 3 mm opcional'},toppers:{title:'Toppers · Jardim Encantado',note:'Três modelos de 40 mm · bases recortadas inteiras e áreas para imagens'},cake:{title:'Topo de bolo · Jardim Encantado',note:'Composição integrada de 200 mm · recorte pela silhueta das artes'}};
export function gardenDocument(key,assets){
 if(!GARDEN_PRESETS[key])throw new Error('Modelo de jardim inválido.');
 const d={schema:1,structure:'art-a4',background:'#ffffff',baseLines:false,images:[],fields:[],paths:[],order:[],imposition:{enabled:key!=='cake',margin:10,gap:3,quantity:0}};let n=0;
 const push=(type,l)=>{l.id='garden-'+(++n);d[type].push(l);d.order.push(l.id);return l};
 function shape(label,x,y,w,h,points,{fill,color='#df8eaa',stroke=.25,usage='art',dash}={}){return push('paths',{label,kind:'polygon',x,y,w,h,points:points.map(p=>p.map(n=>+n.toFixed(5))),usage,color,stroke,...(fill?{fill}:{}),...(dash?{dash}:{})})}
 const round=(petals=0)=>Array.from({length:120},(_,i)=>{const a=i*Math.PI*2/120,r=petals?.47+.03*Math.cos(petals*a):.5;return [.5+r*Math.cos(a),.5+r*Math.sin(a)]});
 const rectangle=Array.from({length:64},(_,i)=>{const c=Math.floor(i/16),a=(-Math.PI/2+c*Math.PI/2)+(i%16)/15*Math.PI/2;return [[.83,.17],[.83,.83],[.17,.83],[.17,.17]][c].map((v,k)=>v+.17*(k?Math.sin(a):Math.cos(a)))});
 const bases=(label,x,y,w,h,points)=>{shape(label+' · recorte',x,y,w,h,points,{usage:'cut',color:'#a78790',stroke:.15});shape(label+' · rosa',x+.6,y+.6,w-1.2,h-1.2,points,{fill:'#e994b2',stroke:.3});shape(label+' · rosa clara',x+1.6,y+1.6,w-3.2,h-3.2,points,{fill:'#fbe1e9',color:'#fff8fb',stroke:.35});const inner=shape(label+' · área interna',x+3,y+3,w-6,h-6,points,{fill:'#fff9f2',color:'#e9a5bc',stroke:.3});shape(label+' · pesponto',x+2.1,y+2.1,w-4.2,h-4.2,points,{stroke:.15,color:'#c67094',dash:'dashed'});return 'shape-'+inner.id};
 const image=(asset,x,y,w,h,rotation=0,face='page')=>push('images',{asset:assets[asset],face,x,y,w,h,...(rotation?{rotation}:{})});
 const text=(key,x,y,w,h,size,font='script')=>push('fields',{key,x,y,w,h,size,minSize:Math.min(size,8),color:key==='name'?'#ac365f':'#734629',align:'center',font});
 if(key==='round'){
  const face=bases('Tag redonda',85,65,50,50,round());shape('Furo opcional',108.5,68,3,3,round(),{usage:'cut',color:'#a78790',stroke:.15});
  image('mushroom',98,92,24,18,0,face);image('garden',91,103,38,10,0,face);image('flowers',87,74,19,10,-25,face);image('flowers',117,76,15,8,35,face);image('butterfly',89,91,12,9,-20,face);
  text('name',92,79,36,10,20);text('age',94,89,32,6,11,'italic');
 }else if(key==='rectangle'){
  const face=bases('Tag retangular',85,60,40,60,rectangle);shape('Furo opcional',103.5,63.5,3,3,round(),{usage:'cut',color:'#a78790',stroke:.15});
  image('flowers',87,68,17,9,-20,face);image('flowers',111,69,12,7,30,face);image('birdhouse',95,91,23,28,0,face);image('garden',87,108,37,13,0,face);image('butterfly',87,91,12,9,-15,face);
  text('name',89,77,32,9,18);text('age',91,86,28,6,11,'italic');
 }else if(key==='toppers'){
  for(let i=0;i<3;i++){const x=63+i*46,face=bases('Topper '+(i+1),x,75,40,40,round(12));
   image(['mushroom','fairy','birdhouse'][i],x+4,79,32,33,0,face);image('garden',x+4,103,32,11,0,face);image('flowers',x+2,79,15,8,-20,face);image('flowers',x+25,101,12,7,15,face);
  }
 }else{
  const cloud=round(10);shape('Placa · rosa',60,17,170,85,cloud,{fill:'#e994b2',stroke:.4});shape('Placa · rosa clara',62,19,166,81,cloud,{fill:'#fde5eb',color:'#fff8fb',stroke:.5});shape('Placa · centro creme',65,22,160,75,cloud,{fill:'#fff9f0',stroke:.3});
  image('garden',45,139,200,58);image('birdhouse',47,89,49,88);image('mushroom',173,120,66,53);image('fairy',101,88,82,88);
  for(const [x,y,w,h,r] of [[58,24,48,25,-30],[112,15,42,22,0],[179,29,48,25,40],[194,65,38,22,75],[65,70,40,22,-40],[45,151,55,28,-10],[183,151,55,28,10]])image('flowers',x,y,w,h,r);
  image('butterfly',65,64,31,23,-25);image('butterfly',199,103,28,21,15);
  text('name',88,38,115,26,52);text('age',101,65,90,15,31,'italic');
 }
 return validateDocument(d);
}
