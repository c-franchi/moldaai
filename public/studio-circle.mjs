import {validateDocument,orderedLayers} from './studio-model.mjs';
export function smoothCircle(document,baseId){
 const d=validateDocument(document),base=(baseId?d.paths?.find(p=>p.id===baseId):null)||(d.paths||[]).find(p=>['tag-cut','smooth-circle-cut'].includes(p.id))||(d.paths||[]).find(p=>p.usage==='cut'&&p.label?.toLowerCase().includes('redonda'));
 if(!base||Math.abs(base.w-base.h)>Math.max(base.w,base.h)*.03)throw new Error('Use esta função em uma tag redonda com base circular.');
 const automatic=d.paths.filter(p=>p.id.startsWith('autocut-')&&p.usage==='cut'&&Math.abs(p.x+p.w/2-base.x-base.w/2)<base.w/4&&Math.abs(p.y+p.h/2-base.y-base.h/2)<base.h/4);
 const boundary=automatic.length===1?automatic[0]:base,diameter=Math.max(boundary.w,boundary.h),cx=boundary.x+boundary.w/2,cy=boundary.y+boundary.h/2;
 const removed=new Set(automatic.map(p=>p.id));removed.add(base.id);
 const circle={id:base.id==='tag-cut'?'smooth-circle-cut':base.id,label:'Recorte circular liso',kind:'ellipse',usage:'cut',x:cx-diameter/2,y:cy-diameter/2,w:diameter,h:diameter,points:[[0,0],[1,1]],color:'#8b717d',stroke:.18};
 const kept=d.paths.filter(p=>!removed.has(p.id));d.paths=[...kept,circle];for(const layer of [...d.images,...d.paths])if(layer.face&&removed.has(layer.face.replace(/^shape-/,'')))layer.face='shape-'+circle.id;
 // The cut remains in its original stacking position; it must not cover artwork.
 d.order=orderedLayers(document).flatMap(l=>l.id===base.id?[circle.id]:removed.has(l.id)?[]:[l.id]);
 const hole=d.paths.find(p=>p.id==='tag-hole');if(hole){hole.kind='ellipse';hole.points=[[0,0],[1,1]];}
 return validateDocument(d);
}
