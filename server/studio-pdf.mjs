import {layerMatrix} from '../public/studio-transform.mjs';
import {printFoldDocument} from '../public/studio-folded-faces.mjs';
import {shadowPNG} from './studio-shadow.mjs';
import {isAutomaticCut,automaticCutStyle} from '../public/studio-cut-style.mjs';
import {imageSourceBox} from '../public/studio-image-edit.mjs';
import {imposePDF} from './studio-imposition.mjs';
import {curvedTextLayout} from '../public/studio-curved-text.mjs';
import {tileMilkPDF} from './studio-tiles.mjs';
import {productionRules} from '../public/studio-production.mjs';
import {addAssemblyGuide} from './studio-guide.mjs';
import {PDFDocument,rgb,pushGraphicsState,popGraphicsState,moveTo,lineTo,closePath,clip,endPath,concatTransformationMatrix} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import fontData from './studio-font.mjs';
import extraFonts from './studio-extra-fonts.mjs';
import {FOLD_GUIDE,STRUCTURES,geometry,imageClipPolygons,fitText,personalization,validateDocument,orderedLayers,pathData,lineDash} from '../public/studio-model.mjs';
const MM=72/25.4;
const color=s=>rgb(...s.slice(1).match(/../g).map(v=>parseInt(v,16)/255));
export async function renderStudioPDF(document,values,loadAsset,{approved=false,title='Template',delivery=false,blankPersonalization=false,theme='',revision}={}){
 const d=printFoldDocument(validateDocument(document)),v=blankPersonalization?{name:'',age:''}:personalization(values),spec=STRUCTURES[d.structure],geo=geometry(d.structure,d.dimensions);
 const pdf=await PDFDocument.create();pdf.registerFontkit(fontkit);
 const font=await pdf.embedFont(Uint8Array.from(atob(fontData),c=>c.charCodeAt(0)),{subset:true});
 const page=pdf.addPage([spec.width*MM,spec.height*MM]);pdf.setTitle(title+(delivery?' · molde e instruções':' · teste de impressão'));pdf.setCreator('Moldae Personalizados');
 const coords=([x,y])=>[x*MM,(spec.height-y)*MM];
 const line=(a,b,options={})=>{const [x,y]=coords(a),[xx,yy]=coords(b);page.drawLine({start:{x,y},end:{x:xx,y:yy},thickness:.25*MM,color:rgb(.25,.25,.25),...options});};
 const polygon=(points,fill)=>{page.drawSvgPath('M '+points.map(p=>p.join(' ')).join(' L ')+' Z',{x:0,y:spec.height*MM,scale:MM,color:fill,borderWidth:0});};
 for(const face of geo.faces)polygon(face.points,color(d.background));
 const rawAssets=new Map(),shadowCache=new Map(),cache=new Map(),fontCache=new Map([['sans',font]]);
 const clipLayer=l=>{if(!l.face)return;const ops=imageClipPolygons(d.structure,l.face,d.dimensions,d.paths).flatMap(p=>{const ps=p.map(coords);return [moveTo(...ps[0]),...ps.slice(1).map(p=>lineTo(...p)),closePath()];});page.pushOperators(...ops,clip(),endPath());};
 const rotate=l=>{page.pushOperators(concatTransformationMatrix(...layerMatrix(l,MM,spec.height)));};
 for(const layer of orderedLayers(d)){
 if(layer.kind){if(layer.editableFace&&!layer.fill)continue;page.pushOperators(pushGraphicsState());clipLayer(layer);rotate(layer);page.drawSvgPath(pathData(layer),{x:0,y:spec.height*MM,scale:MM,...(layer.fill?{color:color(layer.fill),opacity:layer.opacity??1}:{}),borderColor:color(layer.usage==='fold'?FOLD_GUIDE.color:layer.color),borderWidth:isAutomaticCut(layer)?0:layer.stroke,borderDashArray:lineDash(layer),borderOpacity:(layer.opacity??1)*(layer.usage==='fold'?FOLD_GUIDE.opacity:1)});page.pushOperators(popGraphicsState());}else if(layer.asset){
  if(!cache.has(layer.asset)){const asset=await loadAsset(layer.asset);if(!asset)throw new Error('Arte não encontrada.');rawAssets.set(layer.asset,asset);const embedded=asset.mime==='image/png'?await pdf.embedPng(asset.data):await pdf.embedJpg(asset.data);if(embedded.width*embedded.height>20000000)throw new Error('Arte acima de 20 megapixels.');cache.set(layer.asset,embedded);}
  const paths=imageClipPolygons(d.structure,layer.face,d.dimensions,d.paths).flatMap(p=>{const points=p.map(coords);return [moveTo(...points[0]),...points.slice(1).map(p=>lineTo(...p)),closePath()];});
  page.pushOperators(pushGraphicsState(),...paths,clip(),endPath());
  rotate(layer);if(layer.crop){page.pushOperators(moveTo(...coords([layer.x,layer.y])),lineTo(...coords([layer.x+layer.w,layer.y])),lineTo(...coords([layer.x+layer.w,layer.y+layer.h])),lineTo(...coords([layer.x,layer.y+layer.h])),closePath(),clip(),endPath());}const source=imageSourceBox(layer);
  if(layer.shadow?.opacity){const key=layer.asset+JSON.stringify(layer.shadow)+JSON.stringify(layer.crop)+source.w;if(!shadowCache.has(key)){const asset=rawAssets.get(layer.asset),mask=shadowPNG(asset.data,asset.mime,{...layer.shadow,crop:layer.crop,referenceWidth:source.w});shadowCache.set(key,mask?{...mask,image:await pdf.embedPng(mask.bytes)}:null)}const mask=shadowCache.get(key);if(mask)page.drawImage(mask.image,{x:(source.x-mask.padX*source.w+layer.shadow.dx)*MM,y:(spec.height-source.y-source.h-mask.padY*source.h-layer.shadow.dy)*MM,width:source.w*(1+2*mask.padX)*MM,height:source.h*(1+2*mask.padY)*MM,opacity:layer.shadow.opacity*(layer.opacity??1)})}
  page.drawImage(cache.get(layer.asset),{x:source.x*MM,y:(spec.height-source.y-source.h)*MM,width:source.w*MM,height:source.h*MM,opacity:layer.opacity??1});page.pushOperators(popGraphicsState());
 }else{
 const field=layer,text=field.key==='static'?field.text:v[field.key];if(!text)continue;
 const key=field.font||'sans';if(!fontCache.has(key))fontCache.set(key,await pdf.embedFont(Uint8Array.from(atob(extraFonts[key]),c=>c.charCodeAt(0)),{subset:true}));const font=fontCache.get(key);
 page.pushOperators(pushGraphicsState());rotate(field);
  for(const char of text)if(!font.getCharacterSet().includes(char.codePointAt(0)))throw new Error('A fonte não possui o caractere “'+char+'”.');
  if(field.curve){const layout=curvedTextLayout(text,field,(s,size)=>font.widthOfTextAtSize(s,size)/MM);const height=font.heightAtSize(layout.size,{descender:false});for(const g of layout.glyphs){const x=g.x*MM,y=(spec.height-g.y)*MM,a=-g.angle*Math.PI/180,c=Math.cos(a),s=Math.sin(a);page.pushOperators(pushGraphicsState(),concatTransformationMatrix(c,s,-s,c,x-c*x+s*y,y-s*x-c*y));page.drawText(g.text,{x:x-g.width*MM/2,y:y-height/2,size:layout.size,font,color:color(field.color),opacity:field.opacity??1});page.pushOperators(popGraphicsState());}page.pushOperators(popGraphicsState());continue;}
  const fit=fitText(text,field,(s,size)=>font.widthOfTextAtSize(s,size)/MM);
  const dx=field.align==='center'?(field.w-fit.width)/2:field.align==='right'?field.w-fit.width:0;
  const h=font.heightAtSize(fit.size,{descender:false});
  page.drawText(text,{x:(field.x+dx)*MM,y:(spec.height-field.y-field.h/2)*MM-h/2,size:fit.size,font,color:color(field.color),opacity:field.opacity??1});page.pushOperators(popGraphicsState());
 }}
 // Draw automatic strokes last, independently of the white backing's stacking.
 for(const layer of (d.paths||[]).filter(isAutomaticCut)){const style=automaticCutStyle(layer);page.pushOperators(pushGraphicsState());clipLayer(layer);rotate(layer);page.drawSvgPath(pathData(layer),{x:0,y:spec.height*MM,scale:MM,borderColor:color(style.color),borderWidth:style.stroke,borderOpacity:style.opacity});page.pushOperators(popGraphicsState());}
 if(d.structure!=='art-a4'&&d.baseLines!==false){
  const rules=delivery?productionRules(d):{cuts:(geo.cuts||[...geo.faces.map(f=>f.points),...geo.glue]).flatMap(ps=>ps.map((p,i)=>[p,ps[(i+1)%ps.length]])),folds:geo.folds};
  for(const [a,b] of rules.cuts)line(a,b);
  for(const [a,b] of rules.folds)line(a,b,{color:color(FOLD_GUIDE.color),opacity:FOLD_GUIDE.opacity,thickness:FOLD_GUIDE.stroke*MM,dashArray:[2*MM,1*MM]});
 }
 if(!d.imposition?.enabled){
 // Calibration square is outside the built-in models; never scale the model to fit it.
 page.drawRectangle({x:10*MM,y:10*MM,width:10*MM,height:10*MM,borderWidth:.25*MM,borderColor:rgb(.2,.2,.2)});
 page.drawText('10 × 10 mm',{x:10*MM,y:6*MM,font,size:6,color:rgb(.3,.3,.3)});
 const label=delivery?'Moldaê · imprimir em 100% · conferir montagem':STRUCTURES[d.structure].experimental?'TESTE · GEOMETRIA PILOTO NÃO VALIDADA':approved?'TESTE · VERSÃO APROVADA':'TESTE · RASCUNHO NÃO APROVADO';
 page.drawText('100% · '+(delivery?'Moldaê':'TESTE'),{x:10*MM,y:2*MM,font,size:6,color:rgb(.6,.15,.25)});
 }
 if(d.imposition?.enabled)await imposePDF(pdf,page,d,font);
 if(d.structure==='milk-a4'&&d.printLayout?.mode==='two')await tileMilkPDF(pdf,page,d,font);
 if(delivery)await addAssemblyGuide(pdf,font,d,{title,theme,revision,artPage:page});
 return pdf.save();
}
