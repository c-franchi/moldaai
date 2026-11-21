import {rgb} from 'pdf-lib';
import {productionRules,assemblyInstructions,templateProductInfo,flatArtworkType} from '../public/studio-production.mjs';
import {geometry,STRUCTURES,pathData} from '../public/studio-model.mjs';
const MM=72/25.4;
export async function addAssemblyGuide(pdf,font,d,{title,theme='',revision,artPage}={}){
 const page=pdf.addPage([297*MM,210*MM]),ink=rgb(.22,.17,.2),rose=rgb(.63,.24,.36),teal=rgb(.13,.48,.52),muted=rgb(.43,.39,.42);
 const text=(s,x,y,size=10,color=ink)=>page.drawText(String(s),{x:x*MM,y:(210-y)*MM,size,font,color});
 const wrap=(s,x,y,width,size=10)=>{let line='',yy=y;for(const word of s.split(/\s+/)){const next=line?line+' '+word:word;if(font.widthOfTextAtSize(next,size)>width*MM&&line){text(line,x,yy,size);yy+=4.6;line=word;}else line=next;}if(line)text(line,x,yy,size);return yy+4.6;};
 text('Moldaê Personalizados',13,14,11,rose);text('Guia de corte e montagem',13,26,21);text((theme||title||'Seu molde').slice(0,65),13,35,11,muted);text(''+(d.imposition?.enabled?'As folhas anteriores contêm cópias do molde em tamanho real.':d.printLayout?.mode==='two'?'As duas folhas anteriores formam o molde ampliado.':'A folha anterior contém o molde em tamanho real.')+' Este mapa é reduzido.',13,43,9,muted);
 const flatCut=d.structure==='art-a4'&&(d.paths||[]).some(p=>p.usage==='cut');
 const rule=productionRules(d),geo=geometry(d.structure,d.dimensions),spec=STRUCTURES[d.structure],s=Math.min(132/spec.width,104/spec.height),ox=10,oy=51;
 if(flatCut&&artPage){const miniature=await pdf.embedPage(artPage);page.drawPage(miniature,{x:ox*MM,y:(210-oy-spec.height*s)*MM,width:spec.width*s*MM,height:spec.height*s*MM});}
 const pos=([x,y])=>({x:(ox+x*s)*MM,y:(210-oy-y*s)*MM});
 const line=(a,b,dash=false)=>page.drawLine({start:pos(a),end:pos(b),thickness:dash?.65:.75,color:dash?rose:ink,...(dash?{dashArray:[3,2]}:{})});
 for(const tab of [...geo.glue,...rule.tabs.map(t=>t.points)]){page.drawSvgPath('M '+tab.map(p=>p.join(' ')).join(' L ')+' Z',{x:ox*MM,y:(210-oy)*MM,scale:s*MM,color:rgb(.84,.95,.95),borderWidth:0});}
 if(d.baseLines!==false){for(const [a,b] of rule.cuts)line(a,b);for(const [a,b] of rule.folds)line(a,b,true);}
 for(const l of (d.paths||[]).filter(l=>l.usage!=='art')){const angle=-(l.rotation||0)*Math.PI/180,cx=l.x+l.w/2,cy=l.y+l.h/2;
 // Construct transformed paths in page coordinates to preserve rotation, curves and usage.
 const p=l.points.map(([u,v])=>{const x=l.x+u*l.w-cx,y=l.y+v*l.h-cy;return [cx+x*Math.cos(-angle)-y*Math.sin(-angle),cy+x*Math.sin(-angle)+y*Math.cos(-angle)];});
 if(l.kind==='ellipse'){page.drawSvgPath(pathData({...l,x:ox+l.x*s,y:oy+l.y*s,w:l.w*s,h:l.h*s}),{x:0,y:210*MM,scale:MM,borderWidth:.23,borderColor:ink});continue;}
 const coords=p.map(([x,y])=>[ox+x*s,oy+y*s]);let path='M '+coords[0];if(l.kind==='curve')path+=' Q '+coords.slice(1).map(q=>q.join(',')).join(' ');else if(l.kind==='rect'){const q=[[l.x,l.y],[l.x+l.w,l.y],[l.x+l.w,l.y+l.h],[l.x,l.y+l.h]].map(([x,y])=>[ox+(cx+(x-cx)*Math.cos(-angle)-(y-cy)*Math.sin(-angle))*s,oy+(cy+(x-cx)*Math.sin(-angle)+(y-cy)*Math.cos(-angle))*s]);path='M '+q.map(q=>q.join(',')).join(' L ')+' Z';}else if(l.kind==='polygon')path='M '+coords.map(q=>q.join(' ')).join(' L ')+' Z';else path+=' L '+coords[1];
 page.drawSvgPath(path,{x:0,y:210*MM,scale:MM,borderWidth:.23,borderColor:l.usage==='fold'?rose:ink,...(l.usage==='fold'?{borderDashArray:[1,.7]}:{})});}
 let yy=55;for(const [i,[heading,body]] of assemblyInstructions(d).entries()){text((i+1)+'. '+heading,152,yy,11,rose);yy=wrap(body,152,yy+5,130,9.5)+4;}
 page.drawLine({start:{x:14*MM,y:58*MM},end:{x:30*MM,y:58*MM},thickness:1,color:ink});text('Cortar',34,153,10);
 if(!flatCut||(d.paths||[]).some(p=>p.usage==='fold')){page.drawLine({start:{x:14*MM,y:49*MM},end:{x:30*MM,y:49*MM},thickness:1,color:rose,dashArray:[4,3]});text('Vincar e dobrar - não cortar',34,162,10);
 if(!flatCut){page.drawRectangle({x:14*MM,y:38*MM,width:16*MM,height:6*MM,color:rgb(.84,.95,.95)});text('Abas de colagem - preservar',34,171,10);}}
 wrap(((d.paths||[]).some(p=>p.id==='tag-fold'&&p.usage==='fold')?'Materiais: papel próprio para sua impressora (180 a 240 g/m²), tesoura, régua e ferramenta de vinco sem corte. A peça de mesa não precisa de cola, fita ou furo.':flatArtworkType(d)==='tag'&&!(d.paths||[]).some(p=>p.id==='tag-hole')?'Materiais: papel próprio para sua impressora (180 a 240 g/m²) e tesoura ou estilete. Tag plana sem furo marcado.':flatArtworkType(d)==='tag'?'Materiais: papel próprio para sua impressora (180 a 240 g/m²), tesoura e furador. Fita ou cordão para prender à lembrancinha.':flatCut?'Materiais: papel próprio para sua impressora (180 a 240 g/m²), tesoura ou estilete, cola e palitos ou suporte próprio para topo. Fixe o suporte no verso.':'Materiais: papel próprio para sua impressora (sugestão: 180 a 240 g/m²), tesoura ou estilete, régua, boleador, cola para papel e fita para fechar.'),13,185,128,8.5);
 text('Referência: revisão '+(revision??'-')+' · '+templateProductInfo(d).kind+' · montagem manual',152,195,8,muted);
 text('Página de instruções - não recortar. Faça a conferência física antes da produção em quantidade.',13,203,8,muted);
}
