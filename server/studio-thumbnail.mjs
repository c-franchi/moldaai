import {printBounds} from '../public/studio-imposition.mjs';
import {validateDocument,geometry,STRUCTURES,orderedLayers,pathData,artAreas,imageClipPolygons} from '../public/studio-model.mjs';
import {layerSVGTransform} from '../public/studio-transform.mjs';
import {imageSourceBox} from '../public/studio-image-edit.mjs';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
export async function studioThumbnail(document,loadAsset){
 const d=validateDocument(document),g=geometry(d.structure,d.dimensions),page=STRUCTURES[d.structure],polygon=ps=>`<polygon points="${ps.map(p=>p.join(',')).join(' ')}"/>`;
 const areas=artAreas(d.structure,{includeLegacy:true,dimensions:d.dimensions,paths:d.paths});
 let bounds={x:0,y:0,w:page.width,h:page.height};try{bounds=printBounds(d);}catch{}const pad=3;
 let svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${bounds.x-pad} ${bounds.y-pad} ${bounds.w+pad*2} ${bounds.h+pad*2}" role="img" aria-label="Prévia da arte salva"><defs><clipPath id="mold">${imageClipPolygons(d.structure,'mold',d.dimensions,d.paths).map(polygon).join('')}</clipPath>${areas.map(a=>`<clipPath id="${esc(a.id)}">${polygon(a.points)}</clipPath>`).join('')}</defs><rect x="${bounds.x-pad}" y="${bounds.y-pad}" width="${bounds.w+pad*2}" height="${bounds.h+pad*2}" fill="white"/>`;
 if(d.structure!=='art-a4')svg+=g.faces.map(f=>`<polygon points="${f.points.map(p=>p.join(',')).join(' ')}" fill="${d.background}" stroke="#b5a7af" stroke-width=".25"/>`).join('');
 const cache=new Map();let bytes=0;
 for(const l of orderedLayers(d)){
  const transform=esc(layerSVGTransform(l)),clip=l.face?` clip-path="url(#${esc(l.face)})"`:'';
  if(l.kind){if(l.editableFace&&!l.fill)continue;svg+=`<g${clip}><path d="${pathData(l)}" transform="${transform}" fill="${l.fill||'none'}" stroke="${l.color}" stroke-width="${Math.max(.25,l.stroke)}" opacity="${l.opacity??1}"${l.usage==='fold'?' stroke-dasharray="2 1"':''}/></g>`;continue;}
  if(l.asset){if(!cache.has(l.asset)){const asset=await loadAsset(l.asset);if(asset&&asset.data.byteLength<=1024*1024&&bytes+asset.data.byteLength<=3*1024*1024){bytes+=asset.data.byteLength;cache.set(l.asset,`data:${asset.mime};base64,${Buffer.from(asset.data).toString('base64')}`);}else cache.set(l.asset,null);}const href=cache.get(l.asset);if(!href)continue;const b=imageSourceBox(l);svg+=`<g${clip}><g transform="${transform}"><svg x="${l.x}" y="${l.y}" width="${l.w}" height="${l.h}" viewBox="${l.x} ${l.y} ${l.w} ${l.h}" overflow="hidden"><image href="${href}" x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" preserveAspectRatio="none" opacity="${l.opacity??1}"/></svg></g></g>`;continue;}
  svg+=`<text x="${l.x+l.w/2}" y="${l.y+l.h/2}" text-anchor="middle" dominant-baseline="central" font-family="sans-serif" font-size="${Math.min(l.size*25.4/72,l.h)}" fill="${l.color}" transform="${transform}" opacity="${l.opacity??1}">${esc(l.key==='static'?l.text:l.key==='name'?'Nome':'Idade')}</text>`;
 }
 if(d.structure!=='art-a4'&&d.baseLines!==false)svg+=(g.cuts||g.faces.map(f=>f.points)).map(ps=>`<polygon points="${ps.map(p=>p.join(',')).join(' ')}" fill="none" stroke="#776974" stroke-width=".3"/>`).join('');
 return svg+'</svg>';
}
