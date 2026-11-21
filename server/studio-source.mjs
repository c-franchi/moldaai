import {PDFDocument} from 'pdf-lib';
import {validateDocument} from '../public/studio-model.mjs';
import {renderStudioPDF} from './studio-pdf.mjs';
export function sourceDocuments(source){
 const items=source.kind==='kit'?source.items:[source];
 if(!Array.isArray(items)||items.length<1||items.length>12||source.kind==='kit'&&items.length<2)throw new Error('O kit deve conter de 2 a 12 modelos.');
 return items.map(item=>{if(typeof item.template_id!=='string'||!Number.isSafeInteger(item.source_revision))throw new Error('Origem do molde inválida.');return {...item,document:validateDocument(item.document)};});
}
export async function renderSourcePDF(source,values,loadAsset,options={}){
 const items=sourceDocuments(source);
 if(source.kind!=='kit'){const item=items[0];return renderStudioPDF(item.document,values,asset=>loadAsset(item.template_id,asset),{delivery:true,title:item.title,theme:item.theme,revision:item.source_revision,...options});}
 const pdf=await PDFDocument.create();
 // Each renderer releases its decoded PNGs before processing the next model.
 // Only compressed PDF streams are retained in the combined document.
 for(const item of items){await appendModel(pdf,item,values,loadAsset,options);if(pdf.getPageCount()>100)throw new Error('O kit excede 100 páginas. Reduza a quantidade de cópias.');}
 pdf.setTitle(source.title||'Kit de moldes');pdf.setCreator('Moldaê Personalizados');return pdf.save();
}
async function appendModel(pdf,item,values,loadAsset,options){
 const bytes=await renderStudioPDF(item.document,values,asset=>loadAsset(item.template_id,asset),{delivery:true,title:item.title,theme:item.theme,revision:item.source_revision,...options});
 const part=await PDFDocument.load(bytes,{updateMetadata:false});const pages=await pdf.copyPages(part,part.getPageIndices());for(const page of pages)pdf.addPage(page);
}
