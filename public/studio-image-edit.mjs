// Crop coordinates refer to the original asset; source bytes never change.
export function imageSourceBox(layer){const c=layer.crop||{x:0,y:0,w:1,h:1};return {x:layer.x-c.x*layer.w/c.w,y:layer.y-c.y*layer.h/c.h,w:layer.w/c.w,h:layer.h/c.h};}
export function cropImage(layer,region,page){
 if(!layer.asset||layer.locked)throw new Error('Selecione uma imagem desbloqueada.');
 if(!region||['x','y','w','h'].some(k=>!Number.isFinite(region[k]))||region.x<0||region.y<0||region.w<.01||region.h<.01||region.x+region.w>1.000001||region.y+region.h>1.000001)throw new Error('Selecione uma área válida para manter.');
 const old=layer.crop||{x:0,y:0,w:1,h:1},a=(layer.rotation||0)*Math.PI/180,dx=(region.x+region.w/2-.5)*layer.w,dy=(region.y+region.h/2-.5)*layer.h,w=layer.w*region.w,h=layer.h*region.h;
 const out={...layer,x:layer.x+layer.w/2+dx*Math.cos(a)-dy*Math.sin(a)-w/2,y:layer.y+layer.h/2+dx*Math.sin(a)+dy*Math.cos(a)-h/2,w,h,crop:{x:old.x+region.x*old.w,y:old.y+region.y*old.h,w:old.w*region.w,h:old.h*region.h}};
 if(w<1||h<1||out.x<0||out.y<0||out.x+w>page.width||out.y+h>page.height)throw new Error('O recorte precisa ficar dentro da folha e ter pelo menos 1 mm.');return out;
}
export function resetImageCrop(layer,page){if(!layer.crop)return {...layer};const c=layer.crop,a=(layer.rotation||0)*Math.PI/180,w=layer.w/c.w,h=layer.h/c.h,dx=(c.x+c.w/2-.5)*w,dy=(c.y+c.h/2-.5)*h;
 const out={...layer,w,h,x:layer.x+layer.w/2-dx*Math.cos(a)+dy*Math.sin(a)-w/2,y:layer.y+layer.h/2-dx*Math.sin(a)-dy*Math.cos(a)-h/2};delete out.crop;
 if(w>page.width||h>page.height)throw new Error('A imagem inteira ultrapassa a folha. Diminua a imagem antes de restaurar.');out.x=Math.max(0,Math.min(page.width-w,out.x));out.y=Math.max(0,Math.min(page.height-h,out.y));return out;}

export function resizeImageDimension(layer,key,value,page){
 if(!layer.asset||layer.locked||!['w','h'].includes(key)||!Number.isFinite(value)||value<1)throw new Error('Use uma dimensão de pelo menos 1 mm em uma imagem desbloqueada.');
 const next={w:layer.w,h:layer.h,[key]:value};
 if(layer.keepRatio!==false){const other=key==='w'?'h':'w';next[other]=layer[other]*value/layer[key];}
 if(next.w<1||next.h<1||layer.x+next.w>page.width+.000001||layer.y+next.h>page.height+.000001)throw new Error('As dimensões precisam caber na folha.');
 return next;
}
