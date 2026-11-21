import {artAreas} from './studio-model.mjs';
import {isFoldedTag} from './studio-folded-faces.mjs';
import {roundTagCuts} from './studio-tags.mjs';
// View-only geometry: never add these lines to document.paths or PDF output.
export function faceGuideAreas(d){
 if(isFoldedTag(d)){
  const cut=d.paths.find(p=>p.id==='tag-cut'),fold=d.paths.find(p=>p.id==='tag-fold');
  if(cut)return [{id:'tag-back',box:{x:cut.x,y:cut.y,w:cut.w,h:fold.y-cut.y}},{id:'tag-front',box:{x:cut.x,y:fold.y,w:cut.w,h:cut.y+cut.h-fold.y}}];
 }
 const tags=roundTagCuts(d);if(tags.length)return tags.map(p=>({id:'shape-'+p.id,box:{x:p.x,y:p.y,w:p.w,h:p.h}}));
 const areas=artAreas(d.structure,{dimensions:d.dimensions,paths:d.paths}),faces=areas.filter(a=>d.paths?.some(p=>'shape-'+p.id===a.id&&p.editableFace));if(faces.length)return faces;
 return areas.some(a=>a.id!=='page')?areas.filter(a=>a.id!=='page'):areas;
}
export function centerGuidesSVG(d){
 const areas=faceGuideAreas(d);
 return `<g data-editor-center-guides aria-hidden="true" pointer-events="none" fill="none" stroke="#268aab" stroke-opacity=".65" stroke-width="1" vector-effect="non-scaling-stroke" stroke-dasharray="4 4">${areas.map(({box:b})=>`<path vector-effect="non-scaling-stroke" d="M ${b.x+b.w/2} ${b.y} V ${b.y+b.h} M ${b.x} ${b.y+b.h/2} H ${b.x+b.w}"/>`).join('')}</g>`;
}
export function faceGuidesSVG(d,bounds,tolerance=.7,movingIds=[]){
 if(!bounds)return '';
 const cx=bounds.x+bounds.w/2,cy=bounds.y+bounds.h/2;
 const areas=faceGuideAreas(d).filter(a=>!movingIds.includes(a.id.replace(/^shape-/,''))).filter(({box:b})=>cx>=b.x&&cx<=b.x+b.w&&cy>=b.y&&cy<=b.y+b.h);
 // Prefer the actual face over nested decorative backing shapes.
 const face=areas.sort((a,b)=>b.box.w*b.box.h-a.box.w*a.box.h)[0];if(!face)return '';
 const b=face.box,x=b.x+b.w/2,y=b.y+b.h/2,lines=[];
 if(Math.abs(cx-x)<=tolerance)lines.push(`M ${x} ${b.y} V ${b.y+b.h}`);
 if(Math.abs(cy-y)<=tolerance)lines.push(`M ${b.x} ${y} H ${b.x+b.w}`);
 if(!lines.length)return '';
 return `<g data-editor-face-guides aria-hidden="true" pointer-events="none" fill="none" stroke="#268aab" stroke-opacity=".8" stroke-width=".2" stroke-dasharray="1.5 1"><path d="${lines.join(' ')}"/></g>`;
}
