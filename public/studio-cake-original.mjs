import {validateDocument} from './studio-model.mjs';
// Coordinates from the supplied Canva pages. Only transparent padding was
// trimmed from the PNGs; their original pixels and relative positions survive.
export const CAKE_ORIGINAL_ASSETS={
 plate:{file:'plate.png',box:[22,0,1166,593]},
 vines:{file:'vines.png',box:[40,17,1148,588]},
 birdhouse:{file:'birdhouse.png',box:[20,497,307,957]},
 flowers:{file:'flowers.png',box:[24,853,433,1141]},
 mushroom:{file:'mushroom.png',box:[767,765,1177,1139]},
 butterfly:{file:'butterfly.png',box:[925,610,1097,774]},
 fairy:{file:'fairy.png',box:[304,523,809,1141]}
};
export function originalCakeDocument(assets){
 const scale=200/1203,x0=48,y0=10;
 const box=(x,y,w,h)=>({x:x0+x*scale,y:y0+y*scale,w:w*scale,h:h*scale});
 const paths=[{id:'cake-support-right',label:'Ligação branca · placa à casinha',kind:'polygon',usage:'art',fill:'#ffffff',color:'#ffffff',stroke:.1,...box(1008,527,22,300),points:[[0,0],[1,0],[1,1],[0,1]]},
 {id:'cake-support-garden',label:'Ligação branca · jardim',kind:'polygon',usage:'art',fill:'#ffffff',color:'#ffffff',stroke:.1,...box(360,1105,480,22),points:[[0,0],[1,0],[1,1],[0,1]]}];
 const images=Object.entries(CAKE_ORIGINAL_ASSETS).map(([key,a])=>{const [x,y,r,b]=a.box;return {id:'cake-'+key,asset:assets[key],face:'page',...box(x,y,r-x,b-y)}});
 const fields=[{id:'cake-name',key:'name',...box(280,140,660,180),size:80,minSize:12,color:'#b82b5a',align:'center',font:'script'},
 {id:'cake-age',key:'age',...box(390,325,450,105),size:42,minSize:10,color:'#754329',align:'center',font:'italic'}];
 return validateDocument({schema:1,structure:'art-a4',background:'#ffffff',baseLines:false,paths,images,fields,order:[...paths,...images,...fields].map(l=>l.id),imposition:{enabled:false,margin:10,gap:3,quantity:0}});
}
