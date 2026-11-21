import {recoverLegacyFaceRegions} from './studio-face-regions.mjs';
import {validateCatalog,classifyTemplate} from './studio-organization.mjs';
import {brigadeiroGeometry} from './studio-brigadeiro.mjs';
import {milkGeometry,milkPrintPlan} from './studio-milk.mjs';
// Units are millimetres. These explicit models never execute imported scripts.
export const MAX_IMAGE_LAYERS=64;
export const FONTS={cookie:{label:'Caligráfica · Jardim',family:'MoldaeCookie',file:'Cookie.ttf'},sans:{label:'Ateliê Sans',family:'AtelieSans',file:'AtelieSans.ttf'},classic:{label:'Clássica · Serif',family:'MoldaeClassic',file:'Classica.ttf'},italic:{label:'Elegante · Itálica',family:'MoldaeItalic',file:'Elegante.ttf'},script:{label:'Caligráfica · Chancery',family:'MoldaeScript',file:'Caligrafica.otf'}};

export const STRUCTURES = {
 'brigadeiro-petal':{label:'Forminha de brigadeiro · quatro pétalas',width:297,height:210,experimental:true,note:'Protótipo com quatro faces curvas, fundo quadrado inteiro e emenda lateral. Medidas iniciais propostas; imprima e valide a curvatura e a colagem.'},
 'milk-a4':{label:'Caixa Milk · Canva página 21',width:297,height:210,experimental:true,note:'Modelo da página 21, com fundo de encaixe e abas com furos. Confira medidas e montagem física antes da venda.'},
 'candy-lab': {label:'Caixa Bala · piloto técnico', width:297, height:210, experimental:true, note:'Geometria demonstrativa. A conversão fiel da página 5 do Canva ainda está pendente; não liberar para venda.'},
 'candy-closed': {label:'Faixa integral · alternativa experimental',width:297,height:210,experimental:true,note:'Dobras retangulares de 45 mm, com a mesma largura da face. Nova geometria para teste físico; montagem ainda não validada.'},
 'tag-60x40': {label:'Tag retangular · 60 × 40 mm', width:210, height:297, experimental:false, note:'Uma tag de 60 × 40 mm. Conferir a escala na impressão em 100%.'},
 'art-a4': {label:'Arte pronta · A4 horizontal', width:297, height:210, experimental:false, note:'Use uma arte sem nome, já exportada em A4. O tamanho da folha não comprova as medidas do molde na imagem.'}
};
export function geometry(type,dimensions){
 if(type==='brigadeiro-petal')return brigadeiroGeometry(dimensions);
 if(type==='milk-a4')return milkGeometry(dimensions);
 if(dimensions&&type.startsWith('candy-'))return candyGeometry(type,dimensions);
 if(type==='tag-60x40')return {faces:[{id:'tag',label:'Tag',points:[[75,110],[135,110],[135,150],[75,150]],box:{x:75,y:110,w:60,h:40}}],folds:[],glue:[]};
 if(type==='art-a4')return {faces:[{id:'page',label:'Folha inteira',points:[[0,0],[297,0],[297,210],[0,210]],box:{x:0,y:0,w:297,h:210}}],folds:[],glue:[]};
 const faces=[],folds=[],areas=[];
 for(let n=0;n<4;n++){
  const x=54+n*45,points=[[0,25],[45,25],[45,41],[32,53],[45,65],[45,113],[32,125],[45,137],[45,153],[0,153],[0,137],[13,125],[0,113],[0,65],[13,53],[0,41]].map(([a,b])=>[x+a,b]);
  if(type==='candy-closed')points.splice(0,points.length,[x,25],[x+45,25],[x+45,153],[x,153]);
  faces.push({id:'face'+(n+1),label:'Face '+(n+1),points,box:{x,y:25,w:45,h:128}});
  const add=(key,label,group,y,h,shape)=>areas.push({id:`face${n+1}-${key}`,label:`${label} ${n+1}`,group,parent:'face'+(n+1),points:(type==='candy-closed'&&key.includes('fold')?[[0,y],[45,y],[45,y+h],[0,y+h]]:shape).map(([a,b])=>[x+a,b]),box:{x,y,w:45,h}});
  add('top','Ponta superior','Pontas superiores',25,16,[[0,25],[45,25],[45,41],[0,41]]);
  add('upper-fold','Dobra superior','Dobras superiores',41,24,[[0,41],[45,41],[32,53],[45,65],[0,65],[13,53]]);
  add('body','Painel central','Painéis centrais',65,48,[[0,65],[45,65],[45,113],[0,113]]);
  add('lower-fold','Dobra inferior','Dobras inferiores',113,24,[[0,113],[45,113],[32,125],[45,137],[0,137],[13,125]]);
  add('bottom','Ponta inferior','Pontas inferiores',137,16,[[0,137],[45,137],[45,153],[0,153]]);
  for(const y of [41,65,113,137])folds.push([[x,y],[x+45,y]]);
  if(n<3)folds.push([[x+45,type==='candy-closed'?25:65],[x+45,type==='candy-closed'?153:113]]);
 }
 const glue=[[[46,69],[54,65],[54,113],[46,109]]];
 areas.push({id:'glue-tab',label:'Aba de colagem',group:'Aba de colagem (opcional)',optional:true,points:glue[0],box:{x:46,y:65,w:8,h:48}});
 if(type==='candy-closed'){folds.push([[54,65],[54,113]]);return {faces,folds,glue,areas,cuts:[[[54,25],[234,25],[234,153],[54,153],[54,113],[46,109],[46,69],[54,65]]]};}
 return {faces,folds,glue,areas};
}
export function isRoundTagCut(p){return p.usage==='cut'&&p.w>=8&&Math.abs(p.w-p.h)<.03*Math.max(p.w,p.h)&&(p.kind==='ellipse'||p.kind==='polygon'&&p.points?.length>=16&&p.points.every(([x,y])=>Math.abs(Math.hypot(x-.5,y-.5)-.5)<.025));}
export function artAreas(type,{includeLegacy=false,dimensions,paths=[]}={}){const g=geometry(type,dimensions),base=g.areas?(includeLegacy?[...g.areas,...g.faces]:g.areas):g.faces;return [...base,...paths.filter(p=>['polygon','ellipse','rect'].includes(p.kind)&&(p.fill||p.editableFace||p.usage==='cut')&&Array.isArray(p.points)&&(['ellipse','rect'].includes(p.kind)||p.points.length>=3)).sort((a,b)=>b.w*b.h-a.w*a.h).map(p=>{const a=(p.rotation||0)*Math.PI/180,c=Math.cos(a),s=Math.sin(a),cx=p.x+p.w/2,cy=p.y+p.h/2;return {id:'shape-'+p.id,label:p.label||'Área decorativa '+p.id,group:'Bases e molduras',points:(p.kind==='rect'?[[0,0],[1,0],[1,1],[0,1]]:p.kind==='ellipse'?Array.from({length:120},(_,i)=>[.5+.5*Math.cos(i*Math.PI/60),.5+.5*Math.sin(i*Math.PI/60)]):p.points).map(([u,v])=>{const x=(u-.5)*p.w*(p.flipX?-1:1),y=(v-.5)*p.h*(p.flipY?-1:1);return [cx+x*c-y*s,cy+x*s+y*c]}),box:{x:p.x,y:p.y,w:p.w,h:p.h}}})];}
export function newDocument(structure='candy-lab'){
 if(structure==='brigadeiro-petal'){const f=brigadeiroGeometry().faces[1].box;return {schema:1,structure,background:'#ffffff',imposition:{enabled:true,margin:10,gap:3,quantity:0},images:[],fields:[{id:'name1',key:'name',x:f.x+3,y:f.y+6,w:f.w-6,h:8,size:14,minSize:7,color:'#944c72',align:'center',font:'script'},{id:'age1',key:'age',x:f.x+3,y:f.y+15,w:f.w-6,h:5,size:8,minSize:6,color:'#725a69',align:'center'}]};}
 if(structure==='milk-a4'){const g=milkGeometry(),f=g.areas.find(a=>a.id==='milk-face2-body').box;return {schema:1,structure,background:'#ffffff',printLayout:{mode:'single',scale:1.35,tab:8,seam:2},images:[],fields:[{id:'name1',key:'name',x:f.x+5,y:f.y+20,w:f.w-10,h:15,size:24,minSize:9,color:'#944c72',align:'center',font:'script'},{id:'age1',key:'age',x:f.x+5,y:f.y+38,w:f.w-10,h:8,size:12,minSize:8,color:'#725a69',align:'center'}]};}
 const f=geometry(structure).faces[0].box;
 return {schema:1,structure,background:'#ffffff',images:[],fields:[{id:'name1',key:'name',x:f.x+3,y:structure.startsWith('candy-')?82:f.y+8,w:f.w-6,h:15,size:22,minSize:9,color:'#944c72',align:'center'},{id:'age1',key:'age',x:f.x+3,y:structure.startsWith('candy-')?99:f.y+25,w:f.w-6,h:8,size:12,minSize:8,color:'#725a69',align:'center'}]};
}
export function validateDocument(d){
 if(d&&typeof d==='object')d=recoverLegacyFaceRegions(d);
 if(!d||d.schema!==1||!Object.hasOwn(STRUCTURES,d.structure))throw new Error('Estrutura inválida.');
 if(d.cachepotEdge&&(!['straight','oval','soft','circular'].includes(d.cachepotEdge.style)||!Number.isInteger(d.cachepotEdge.count)||d.cachepotEdge.count<1||d.cachepotEdge.count>12||!Number.isFinite(d.cachepotEdge.height)||d.cachepotEdge.height<0||d.cachepotEdge.height>20||d.cachepotEdge.gap!==undefined&&(!Number.isFinite(d.cachepotEdge.gap)||d.cachepotEdge.gap<0||d.cachepotEdge.gap>20)))throw new Error('Perfil de borda inválido.');
 const page=STRUCTURES[d.structure];if(d.imposition){const p=d.imposition;if(typeof p.enabled!=='boolean'||!Number.isFinite(p.margin)||p.margin<3||p.margin>25||!Number.isFinite(p.gap)||p.gap<1||p.gap>15||!Number.isSafeInteger(p.quantity)||p.quantity<0||p.quantity>1000)throw new Error('Configuração de otimização inválida.');if(p.enabled&&d.printLayout?.mode==='two')throw new Error('Desative Otimizar folha para dividir em duas folhas.');}if(d.dimensions){if(d.structure!=='brigadeiro-petal'&&d.structure!=='milk-a4'&&!d.structure.startsWith('candy-'))throw new Error('Medidas não suportadas nesta estrutura.');if(d.structure==='brigadeiro-petal')brigadeiroGeometry(d.dimensions);else if(d.structure==='milk-a4')milkGeometry(d.dimensions);else candyGeometry(d.structure,d.dimensions);}
 if(d.printLayout){if(d.structure!=='milk-a4')throw new Error('Divisão em folhas disponível para Caixa Milk.');milkPrintPlan(d);}
 const color=v=>typeof v==='string'&&/^#[0-9a-f]{6}$/i.test(v);
 if(!color(d.background)||!Array.isArray(d.images)||!Array.isArray(d.fields)||d.images.length>MAX_IMAGE_LAYERS||d.fields.length>24)throw new Error('Template inválido ou com camadas demais.');
 const ids=new Set(),faces=artAreas(d.structure,{includeLegacy:true,dimensions:d.dimensions,paths:d.paths}).map(f=>f.id);
 const box=(v)=>{if(v.linkKey!==undefined&&(typeof v.linkKey!=='string'||!/^[-\w]{1,60}$/.test(v.linkKey)))throw new Error('Vínculo de elemento inválido.');for(const k of ['flipX','flipY'])if(v[k]!==undefined&&typeof v[k]!=='boolean')throw new Error('Espelhamento inválido.');if(v.opacity!==undefined&&(!Number.isFinite(v.opacity)||v.opacity<0||v.opacity>1))throw new Error('Transparência inválida: use 0 a 100%.');for(const k of ['x','y','w','h'])if(!Number.isFinite(v[k]))throw new Error('Posição inválida.');if(v.w<1||v.h<1||v.x<0||v.y<0||v.x+v.w>page.width+.01||v.y+v.h>page.height+.01)throw new Error('Uma camada ultrapassa a folha.');if(typeof v.id!=='string'||!/^[-\w]{1,60}$/.test(v.id)||ids.has(v.id))throw new Error('Identificador de camada inválido.');if(v.rotation!==undefined&&(!Number.isFinite(v.rotation)||Math.abs(v.rotation)>360))throw new Error('Rotação inválida.');if(v.group!==undefined&&(typeof v.group!=='string'||!/^[-\w]{1,60}$/.test(v.group)))throw new Error('Grupo inválido.');ids.add(v.id);};
 const images=d.images.map(v=>{box(v);if(v.shadow&&(!color(v.shadow.color)||!['dx','dy','blur','opacity'].every(k=>Number.isFinite(v.shadow[k]))||Math.abs(v.shadow.dx)>15||Math.abs(v.shadow.dy)>15||v.shadow.blur<0||v.shadow.blur>8||v.shadow.opacity<0||v.shadow.opacity>1))throw new Error('Sombra inválida.');if(v.crop&&(['x','y','w','h'].some(k=>!Number.isFinite(v.crop[k]))||v.crop.x<0||v.crop.y<0||v.crop.w<=0||v.crop.h<=0||v.crop.x+v.crop.w>1.000001||v.crop.y+v.crop.h>1.000001))throw new Error('Recorte inválido.');if(typeof v.asset!=='string'||!/^[-\w]{1,60}$/.test(v.asset)||!(v.face==='mold'||faces.includes(v.face)))throw new Error('Arte ou face inválida.');return {id:v.id,asset:v.asset,face:v.face,...(v.keepRatio===false?{keepRatio:false}:{}),...(v.shadow?{shadow:{color:v.shadow.color,dx:v.shadow.dx,dy:v.shadow.dy,blur:v.shadow.blur,opacity:v.shadow.opacity}}:{}),...(v.crop?{crop:{x:v.crop.x,y:v.crop.y,w:v.crop.w,h:v.crop.h}}:{}),x:v.x,y:v.y,w:v.w,h:v.h,...(v.rotation?{rotation:v.rotation}:{}),...(v.flipX?{flipX:true}:{}),...(v.flipY?{flipY:true}:{}),...(v.opacity!==undefined?{opacity:v.opacity}:{}),...(v.locked?{locked:true}:{}),...(v.group?{group:v.group}:{}),...(v.linkKey?{linkKey:v.linkKey}:{})};});
 const fields=d.fields.map(v=>{box(v);if(v.curve!==undefined&&(!Number.isFinite(v.curve)||Math.abs(v.curve)>180))throw new Error('Curva do texto inválida: use -180 a 180 graus.');if(v.font!==undefined&&!Object.hasOwn(FONTS,v.font))throw new Error('Fonte inválida.');if(!['name','age','static'].includes(v.key)||!['left','center','right'].includes(v.align)||!color(v.color)||!Number.isFinite(v.size)||!Number.isFinite(v.minSize)||v.size<6||v.size>100||v.minSize<6||v.minSize>v.size||v.h*72/25.4+.01<v.size)throw new Error('Texto '+v.id+': confira tamanho da fonte, fonte mínima e altura do campo (mínimo '+(v.size*25.4/72).toFixed(2)+' mm).');if(v.key==='static'&&(typeof v.text!=='string'||v.text.length>200||/[\p{Cc}\p{Cs}]/u.test(v.text)))throw new Error('Texto livre inválido.');return {id:v.id,key:v.key,x:v.x,y:v.y,w:v.w,h:v.h,size:v.size,minSize:v.minSize,color:v.color,align:v.align,...(v.rotation?{rotation:v.rotation}:{}),...(v.flipX?{flipX:true}:{}),...(v.flipY?{flipY:true}:{}),...(v.opacity!==undefined?{opacity:v.opacity}:{}),...(v.locked?{locked:true}:{}),...(v.group?{group:v.group}:{}),...(v.linkKey?{linkKey:v.linkKey}:{}),...(v.font?{font:v.font}:{}),...(v.curve?{curve:v.curve}:{}),...(v.key==='static'?{text:v.text}:{})};});
 if(d.paths!==undefined&&(!Array.isArray(d.paths)||d.paths.length>100))throw new Error('Limite de 100 linhas e curvas.');
 const paths=(d.paths||[]).map(v=>{box(v);if(v.editableFace!==undefined&&typeof v.editableFace!=='boolean')throw new Error('Definição de face editável inválida.');if(v.face!==undefined&&(!(v.face==='mold'||faces.includes(v.face))||v.face==='shape-'+v.id))throw new Error('Área de recorte da forma inválida.');if(v.fill!==undefined&&(!color(v.fill)||!['polygon','ellipse'].includes(v.kind)))throw new Error('Preenchimento inválido.');if(v.label!==undefined&&(typeof v.label!=='string'||v.label.length>100))throw new Error('Nome da forma inválido.');if(v.cornerRadius!==undefined&&(!['rect','polygon'].includes(v.kind)||!Number.isFinite(v.cornerRadius)||v.cornerRadius<0||v.cornerRadius>50))throw new Error('Arredondamento inválido. Use 0 a 50 mm.');if(v.dash!==undefined&&!['solid','dashed','dotted'].includes(v.dash))throw new Error('Estilo de linha inválido.');if(!['line','curve','rect','polygon','ellipse'].includes(v.kind)||!['cut','fold','art'].includes(v.usage)||!color(v.color)||!Number.isFinite(v.stroke)||v.stroke<.1||v.stroke>3||!Array.isArray(v.points)||(v.kind==='polygon'?(v.points.length<3||v.points.length>2048):v.points.length!==(v.kind==='curve'?3:2))||v.points.some(p=>!Array.isArray(p)||p.length!==2||p.some(n=>!Number.isFinite(n)||n<0||n>1)))throw new Error('Linha ou curva inválida.');return {id:v.id,kind:v.kind,...(v.editableFace||d.structure==='art-a4'&&v.usage==='art'&&/^cachepot-face[0-9]+$/.test(v.id)?{editableFace:true}:{}),...(v.face?{face:v.face}:{}),...(v.cornerRadius!==undefined?{cornerRadius:v.cornerRadius}:{}),...(v.fill?{fill:v.fill}:{}),...(v.label?{label:v.label}:{}),usage:v.usage,color:v.color,stroke:v.stroke,...(v.dash?{dash:v.dash}:{}),points:v.points.map(p=>[...p]),x:v.x,y:v.y,w:v.w,h:v.h,...(v.rotation?{rotation:v.rotation}:{}),...(v.flipX?{flipX:true}:{}),...(v.flipY?{flipY:true}:{}),...(v.opacity!==undefined?{opacity:v.opacity}:{}),...(v.locked?{locked:true}:{}),...(v.group?{group:v.group}:{}),...(v.linkKey?{linkKey:v.linkKey}:{})};});if(paths.length>100)throw new Error('Limite de 100 linhas e curvas.');
 const order=d.order===undefined?undefined:d.order;if(order!==undefined&&(!Array.isArray(order)||order.length!==ids.size||new Set(order).size!==ids.size||order.some(id=>!ids.has(id))))throw new Error('Ordem de camadas inválida.');
 if(d.faceLinks&&(!Array.isArray(d.faceLinks.areas)||d.faceLinks.areas.length<2||d.faceLinks.areas.length>16||new Set(d.faceLinks.areas).size!==d.faceLinks.areas.length||d.faceLinks.areas.some(id=>!faces.includes(id))||!d.faceLinks.areas.includes(d.faceLinks.source)))throw new Error('Seleção de faces vinculadas inválida.');
 if(d.foldedFaces&&(!d.paths?.some(p=>p.id==='tag-fold'&&p.usage==='fold')||d.foldedFaces.upright!==true||!['linked','independent'].includes(d.foldedFaces.mode)))throw new Error('Configuração de faces inválida.');
 return {schema:1,structure:d.structure,background:d.background,images,fields,...(d.cachepotEdge?{cachepotEdge:{style:d.cachepotEdge.style,count:d.cachepotEdge.count,height:d.cachepotEdge.height,...(d.cachepotEdge.gap!==undefined?{gap:d.cachepotEdge.gap}:{})}}:{}),...(d.faceLinks?{faceLinks:{areas:[...d.faceLinks.areas],source:d.faceLinks.source}}:{}),...(d.foldedFaces?{foldedFaces:{upright:true,mode:d.foldedFaces.mode}}:{}),...(d.catalog?{catalog:validateCatalog({...d.catalog,family:classifyTemplate({structure:d.structure,catalog:d.catalog}).family})}:{}),...(d.imposition?{imposition:{enabled:d.imposition.enabled,margin:d.imposition.margin,gap:d.imposition.gap,quantity:d.imposition.quantity}}:{}),...(d.printLayout?{printLayout:{mode:d.printLayout.mode,scale:d.printLayout.scale??1.35,tab:d.printLayout.tab??8,seam:d.printLayout.seam??2}}:{}),...(d.dimensions?{dimensions:{...d.dimensions}}:{}),...(d.baseLines===false?{baseLines:false}:{}),...(paths.length?{paths}:{}),...(order?{order:[...order]}:{})};
}
export function personalization(v){
 const clean=s=>typeof s==='string'?s.trim().normalize('NFC'):'';
 const name=clean(v?.name),age=clean(v?.age);
 if(!name||name.length>60||age.length>30||/[\p{Cc}\p{Cs}]/u.test(name+age)||!/^[\p{L}\p{M}\p{N} .,'’ºª°!()\-]*$/u.test(name+age))throw new Error('Informe um nome de até 60 caracteres e idade de até 30, usando letras, números e pontuação simples.');
 return {name,age};
}
export function fitText(text,field,measure){
 let size=field.size;
 while(size>field.minSize&&measure(text,size)>field.w)size=Math.max(field.minSize,size-.25);
 if(measure(text,size)>field.w+.001)throw new Error('O texto “'+text+'” não cabe no campo. Aumente a largura ou reduza o tamanho mínimo.');
 return {size,width:measure(text,size)};
}
// Shared placement for any registered structure. Build every copy first so a
// limit or invalid area never leaves a partially applied multi-selection.
export function imageLayersForAreas(document,asset,areaIds,imageSize,{layout='repeat',fit='contain',makeId=()=> 'img'+crypto.randomUUID()}={}){
 const d=validateDocument(document),areas=artAreas(d.structure,{includeLegacy:true,dimensions:d.dimensions,paths:d.paths}),page=STRUCTURES[d.structure];
 const ids=[...new Set(areaIds)];
 if(!ids.length)throw new Error('Selecione pelo menos uma área para aplicar a arte.');
 if(d.images.length+ids.length>MAX_IMAGE_LAYERS)throw new Error('A seleção excede o limite de '+MAX_IMAGE_LAYERS+' camadas de arte. Reduza as áreas ou remova camadas.');
 if(!['repeat','continuous'].includes(layout)||!['contain','cover'].includes(fit)||!Number.isFinite(imageSize.width)||!Number.isFinite(imageSize.height)||imageSize.width<=0||imageSize.height<=0)throw new Error('Configuração da arte inválida.');
 const faces=ids.map(id=>{const f=areas.find(f=>f.id===id);if(!f)throw new Error('Uma área selecionada não existe neste molde.');return f;});
 const union={x:Math.min(...faces.map(f=>f.box.x)),y:Math.min(...faces.map(f=>f.box.y))};
 union.w=Math.max(...faces.map(f=>f.box.x+f.box.w))-union.x;union.h=Math.max(...faces.map(f=>f.box.y+f.box.h))-union.y;
 const layers=faces.map(face=>{const b=layout==='continuous'?union:face.box;
  const scale=(fit==='cover'?Math.max:Math.min)(b.w/imageSize.width,b.h/imageSize.height),w=imageSize.width*scale,h=imageSize.height*scale;
  if(w>page.width+.001||h>page.height+.001)throw new Error('A proporção da imagem ultrapassa a folha. Escolha “Arte inteira” ou use uma arte com proporção mais próxima das áreas selecionadas.');
  return {id:makeId(),asset,face:face.id,x:Math.max(0,Math.min(page.width-w,b.x+(b.w-w)/2)),y:Math.max(0,Math.min(page.height-h,b.y+(b.h-h)/2)),w,h};
 });
 validateDocument({...d,images:[...d.images,...layers],...(d.order?{order:[...d.order,...layers.map(l=>l.id)]}:{})});return layers;
}
export function withoutImageLayers(document,ids){const d=validateDocument(document),remove=new Set(ids);return {...d,images:d.images.filter(l=>!remove.has(l.id)),...(d.order?{order:d.order.filter(id=>!remove.has(id))}:{})};}

// Free elements clip against the whole printable silhouette, never one face.
export function imageClipPolygons(type,face,dimensions,paths=[]){
 const g=geometry(type,dimensions);
 if(face==='mold')return [...g.faces.map(f=>f.points),...g.glue];
 const area=artAreas(type,{includeLegacy:true,dimensions,paths}).find(f=>f.id===face);
 if(!area)throw new Error('Área de recorte inválida.');
 return [area.points];
}
export function freeImageLayer(document,asset,imageSize,areaId){
 const d=validateDocument(document),page=STRUCTURES[d.structure];
 if(d.images.length>=MAX_IMAGE_LAYERS)throw new Error('Limite de camadas atingido.');
 if(!Number.isFinite(imageSize.width)||!Number.isFinite(imageSize.height)||imageSize.width<=0||imageSize.height<=0)throw new Error('Dimensões da imagem inválidas.');
 const b=(artAreas(d.structure,{dimensions:d.dimensions,paths:d.paths}).find(f=>f.id===areaId)||geometry(d.structure,d.dimensions).faces[0]).box;
 const scale=Math.min(Math.min(30,b.w*.65)/imageSize.width,Math.min(30,b.h*.65)/imageSize.height);
 const w=Math.max(1,imageSize.width*scale),h=Math.max(1,imageSize.height*scale);
 const l={id:'img'+crypto.randomUUID(),asset,face:areaId&&artAreas(d.structure,{dimensions:d.dimensions,paths:d.paths}).some(f=>f.id===areaId)?areaId:'mold',x:Math.max(0,Math.min(page.width-w,b.x+(b.w-w)/2)),y:Math.max(0,Math.min(page.height-h,b.y+(b.h-h)/2)),w,h};
 validateDocument({...d,images:[...d.images,l],...(d.order?{order:[...d.order,l.id]}:{})});return l;
}
export function resizeLayerBox(box,scale,page){
 const factor=Math.max(Math.max(1/box.w,1/box.h),Math.min(scale,(page.width-box.x)/box.w,(page.height-box.y)/box.h));
 return {w:+(box.w*factor).toFixed(3),h:+(box.h*factor).toFixed(3)};
}

export function orderedLayers(d){const all=[...d.images,...d.fields,...(d.paths||[])],map=new Map(all.map(l=>[l.id,l]));return d.order?d.order.map(id=>map.get(id)).filter(Boolean):all;}
export function moveLayer(document,id,target){const d=validateDocument(document),order=orderedLayers(d).map(l=>l.id);if(!order.includes(id))throw new Error('Camada não encontrada.');order.splice(order.indexOf(id),1);const index=target==='front'?order.length:target==='back'?0:order.indexOf(target);if(index<0)throw new Error('Destino inválido.');order.splice(index,0,id);return {...d,order};}
export function syncLayerOrder(d){if(d.order){const ids=new Set([...d.images,...d.fields,...(d.paths||[])].map(l=>l.id));d.order=[...d.order.filter(id=>ids.has(id)),...[...ids].filter(id=>!d.order.includes(id))];}return d;}

export const CANDY_DIMENSIONS={x:54,y:25,faceW:45,bodyH:48,foldH:24,endH:16,inset:13,glueW:8};
export function candyGeometry(type,params){
 if(!params||typeof params!=='object'||Array.isArray(params)||Object.keys(params).some(k=>!Object.hasOwn(CANDY_DIMENSIONS,k)))throw new Error('Conjunto de medidas inválido.');
 const p={...CANDY_DIMENSIONS,...params};for(const k of Object.keys(CANDY_DIMENSIONS))if(!Number.isFinite(p[k]))throw new Error('Medida inválida: '+k);
 const {x,y,faceW:w,bodyH:b,foldH:f,endH:e,glueW:g}=p,n=type==='candy-closed'?0:p.inset;
 if(w<10||b<10||f<4||e<4||g<2||n<0||n>=w/2||x-g<0||y<0||x+4*w>297||y+2*e+2*f+b>190)throw new Error('As medidas devem caber na folha, acima da escala de impressão; o recorte deve ser menor que metade da face.');
 const Y=[y,y+e,y+e+f,y+e+f+b,y+e+2*f+b,y+2*e+2*f+b],faces=[],areas=[],folds=[];const [a,c,d,h,j,k]=Y,mt=(c+d)/2,mb=(h+j)/2;
 for(let i=0;i<4;i++){const xx=x+i*w,P=[[0,a],[w,a],[w,c],[w-n,mt],[w,d],[w,h],[w-n,mb],[w,j],[w,k],[0,k],[0,j],[n,mb],[0,h],[0,d],[n,mt],[0,c]].map(([px,py])=>[xx+px,py]);faces.push({id:'face'+(i+1),label:'Face '+(i+1),points:P,box:{x:xx,y:a,w,h:k-a}});
 const add=(key,label,group,lo,hi,shape)=>areas.push({id:'face'+(i+1)+'-'+key,label:label+' '+(i+1),parent:'face'+(i+1),group,points:shape.map(([px,py])=>[xx+px,py]),box:{x:xx,y:lo,w,h:hi-lo}});
 add('top','Ponta superior','Pontas superiores',a,c,[[0,a],[w,a],[w,c],[0,c]]);add('upper-fold','Dobra superior','Dobras superiores',c,d,[[0,c],[w,c],[w-n,mt],[w,d],[0,d],[n,mt]]);add('body','Painel central','Painéis centrais',d,h,[[0,d],[w,d],[w,h],[0,h]]);add('lower-fold','Dobra inferior','Dobras inferiores',h,j,[[0,h],[w,h],[w-n,mb],[w,j],[0,j],[n,mb]]);add('bottom','Ponta inferior','Pontas inferiores',j,k,[[0,j],[w,j],[w,k],[0,k]]);
 for(const yy of [c,d,h,j])folds.push([[xx,yy],[xx+w,yy]]);if(i<3)folds.push([[xx+w,d],[xx+w,h]]);
 }
 const bevel=Math.min(4,b/4),glue=[[[x-g,d+bevel],[x,d],[x,h],[x-g,h-bevel]]];areas.push({id:'glue-tab',label:'Aba de colagem',group:'Aba de colagem (opcional)',optional:true,points:glue[0],box:{x:x-g,y:d,w:g,h:b}});folds.push([[x,d],[x,h]]);
 const r=x+4*w,cuts=[[[x,a],[r,a],[r,c],[r-n,mt],[r,d],[r,h],[r-n,mb],[r,j],[r,k],[x,k],[x,j],[x+n,mb],[x,h],[x-g,h-bevel],[x-g,d+bevel],[x,d],[x+n,mt],[x,c]]];
 if(n)for(let i=1;i<4;i++){const xx=x+i*w;cuts.push([[xx,c],[xx+n,mt],[xx,d],[xx-n,mt]],[[xx,h],[xx+n,mb],[xx,j],[xx-n,mb]]);}
 return {faces,areas,folds,glue,cuts};
}
function roundedPolygon(ps,r){
 const corners=ps.map((p,i)=>{const prev=ps[(i+ps.length-1)%ps.length],next=ps[(i+1)%ps.length],a=Math.hypot(prev[0]-p[0],prev[1]-p[1]),b=Math.hypot(next[0]-p[0],next[1]-p[1]),t=Math.min(r,a/2,b/2);const toward=(q,length)=>length?[p[0]+(q[0]-p[0])*t/length,p[1]+(q[1]-p[1])*t/length]:p;return {p,start:toward(prev,a),end:toward(next,b)};});
 return `M ${corners[0].start} `+corners.map(c=>`L ${c.start} Q ${c.p} ${c.end}`).join(' ')+' Z';
}
export function pathData(l){if(l.cornerRadius>0&&['rect','polygon'].includes(l.kind)){const ps=l.points.map(([x,y])=>[l.x+x*l.w,l.y+y*l.h]);return roundedPolygon(l.kind==='rect'?[ps[0],[ps[1][0],ps[0][1]],ps[1],[ps[0][0],ps[1][1]]]:ps,l.cornerRadius);} if(l.kind==='ellipse'){const x=l.x,y=l.y,w=l.w,h=l.h,cx=x+w/2,cy=y+h/2,k=.5522847498307936,rx=w/2,ry=h/2;return `M ${cx} ${y} C ${cx+k*rx} ${y} ${x+w} ${cy-k*ry} ${x+w} ${cy} C ${x+w} ${cy+k*ry} ${cx+k*rx} ${y+h} ${cx} ${y+h} C ${cx-k*rx} ${y+h} ${x} ${cy+k*ry} ${x} ${cy} C ${x} ${cy-k*ry} ${cx-k*rx} ${y} ${cx} ${y} Z`;} const ps=l.points.map(([x,y])=>[l.x+x*l.w,l.y+y*l.h]);if(l.kind==='polygon')return `M ${ps[0]} L ${ps.slice(1).map(p=>p.join(',')).join(' ')} Z`;if(l.kind==='rect')return `M ${ps[0]} L ${ps[1][0]},${ps[0][1]} L ${ps[1]} L ${ps[0][0]},${ps[1][1]} Z`;return `M ${ps[0]} ${l.kind==='curve'?'Q':'L'} ${ps.slice(1).map(p=>p.join(',')).join(' ')}`;}
export function repairTextFields(document){const d=structuredClone(document),page=STRUCTURES[d.structure];for(const f of d.fields){f.size=Math.max(6,Math.min(100,Number(f.size)||12));f.minSize=Math.max(6,Math.min(f.size,Number(f.minSize)||6));const required=f.size*25.4/72;if(Number.isFinite(f.y)&&f.y+required>page.height)f.y=Math.max(0,page.height-required);f.h=Math.max(Number(f.h)||1,required+.001);}return d;}

export function lineDash(l){const style=l.dash||(l.usage==='fold'?'dashed':'solid');return style==='dashed'?[2,1]:style==='dotted'?[.3,1]:[];}

// Discreet scoring guides shared by editor, test PDFs and tiled delivery.
export const FOLD_GUIDE={color:"#b8a9ae",opacity:.5,stroke:.18};

// Common blank-art operation retains structural face masks as editable regions.
export function blankStudioDocument(document){const d=validateDocument(document);d.images=[];d.fields=[];d.paths=(d.paths||[]).filter(p=>p.usage==='cut'||p.usage==='fold'||p.editableFace).map(p=>{if(!p.editableFace)return p;const face={...p};delete face.fill;return face;});d.background='#ffffff';if(d.order)d.order=d.order.filter(id=>d.paths.some(p=>p.id===id));delete d.faceLinks;return validateDocument(d);}
