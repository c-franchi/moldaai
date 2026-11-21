import {PDFDocument,PDFString} from 'pdf-lib';
export function safeLink(value){try{const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||u.href.length>2000)throw 0;return u.href}catch{throw new Error('Use um link HTTPS completo e sem senha.')}}
export function validateInvitation(b){
 if(!b||!/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(b.image||'')||b.image.length>5600000)throw new Error('Envie uma imagem PNG ou JPG de até 4 MB.');
 const width=Number(b.width),height=Number(b.height);if(!Number.isFinite(width)||!Number.isFinite(height)||width<100||height<100||width*height>20000000)throw new Error('Imagem inválida ou maior que 20 megapixels.');
 if(!Array.isArray(b.links)||b.links.length>12)throw new Error('Use até 12 áreas clicáveis.');
 const links=b.links.map(l=>{const {x,y,w,h}=l;if(![x,y,w,h].every(Number.isFinite)||x<0||y<0||w<=0||h<=0||x+w>1.001||y+h>1.001)throw new Error('Mantenha as áreas dentro da arte.');return {x,y,w,h,label:String(l.label||'Abrir link').slice(0,80),url:safeLink(l.url)}});
 const printWidth=Number(b.printWidth??100);if(!Number.isFinite(printWidth)||printWidth<40||printWidth>190)throw new Error('A largura impressa deve ficar entre 40 e 190 mm.');
 return {image:b.image,width,height,links,printWidth};
}
export async function invitationPDF(b,print=false){const d=validateInvitation(b),pdf=await PDFDocument.create();let image;try{const bytes=Uint8Array.from(atob(d.image.split(',')[1]),c=>c.charCodeAt(0));image=d.image.startsWith('data:image/png')?await pdf.embedPng(bytes):await pdf.embedJpg(bytes)}catch{throw new Error('Não foi possível ler a imagem. Use PNG ou JPG válido.')}
 if(image.width*image.height>20000000||image.width!==d.width||image.height!==d.height)throw new Error('Dimensões da imagem não conferem.');
 let w=540,h=w*d.height/d.width,x=0,y=0,page;
 if(print){w=d.printWidth*72/25.4;h=w*d.height/d.width;if(h>277*72/25.4)throw new Error('Reduza a largura para a arte caber no A4.');page=pdf.addPage([595.28,841.89]);x=(page.getWidth()-w)/2;y=(page.getHeight()-h)/2}else{if(h>3000)throw new Error('A imagem está muito alta para um convite.');page=pdf.addPage([w,h])}
 page.drawImage(image,{x,y,width:w,height:h});
 if(!print)for(const l of d.links){const annotation=pdf.context.obj({Type:'Annot',Subtype:'Link',Rect:[l.x*w,h-(l.y+l.h)*h,(l.x+l.w)*w,h-l.y*h],Border:[0,0,0],Contents:PDFString.of(l.label),A:{Type:'Action',S:'URI',URI:PDFString.of(l.url)}});page.node.addAnnot(pdf.context.register(annotation))}
 pdf.setTitle(print?'Convite para impressão':'Convite interativo');return pdf.save();}
export async function invitationsAPI(r,env,user,helpers){const {json,fail,readJSON}=helpers,path=new URL(r.url).pathname,key=`invitations/${encodeURIComponent(user.id)}/draft.json`;
 if(path==='/api/me/invitations/draft'&&r.method==='GET'){const obj=await env.BUCKET.get(key);return json({draft:obj?await obj.json():null})}
 if(path==='/api/me/invitations/draft'&&r.method==='PUT'){try{const d=validateInvitation(await readJSON(r,6*1024*1024));await env.BUCKET.put(key,JSON.stringify(d),{httpMetadata:{contentType:'application/json'}});return json({ok:true})}catch(e){if(e.status)throw e;fail(400,e.message)}}
 if(path==='/api/me/invitations/pdf'&&r.method==='POST'){try{const print=new URL(r.url).searchParams.get('print')==='1',bytes=await invitationPDF(await readJSON(r,6*1024*1024),print);return new Response(bytes,{headers:{'content-type':'application/pdf','content-disposition':`attachment; filename="convite-${print?'imprimir':'interativo'}.pdf"`,'cache-control':'private, no-store'}})}catch(e){if(e.status)throw e;fail(400,e.message)}}
 fail(404,'Recurso não encontrado.');}
