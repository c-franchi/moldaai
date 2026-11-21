// Measurements in mm; labels are rendered from validated values over the product photo.
export function readDimensions(value,strict=false){
 if(value==null)return null;
 const keys=['length','height','width'];if(keys.every(k=>value[k]===null||value[k]===undefined||value[k]===''))return null;
 if(keys.some(k=>typeof value[k]!=='number'||!Number.isFinite(value[k])||value[k]<1||value[k]>5000)){if(strict)throw new Error('Preencha comprimento, altura e largura com medidas de 0,1 a 500 cm.');return null;}
 return Object.fromEntries(keys.map(k=>[k,Math.round(value[k]*100)/100]));
}
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
export function dimensionPhotoURI(data,mime){
 if(!['image/png','image/jpeg','image/webp'].includes(mime))throw new Error('Imagem de produto inválida.');
 let binary='';for(let i=0;i<data.length;i+=8192)binary+=String.fromCharCode(...data.subarray(i,i+8192));
 return 'data:'+mime+';base64,'+btoa(binary);
}
export function dimensionSVG(d,title,photo){
 const cm=n=>(n/10).toLocaleString('pt-BR',{maximumFractionDigits:2})+' cm';
 const arrow=(x1,y1,x2,y2)=>`<path d="M${x1} ${y1}L${x2} ${y2}" fill="none" stroke="#84394f" stroke-width="2.5" marker-start="url(#a)" marker-end="url(#a)"/>`;
 const label=(x,y,t,extra='')=>`<text x="${x}" y="${y}" text-anchor="middle" ${extra}>${esc(t)}</text>`;
 if(!/caixa bala/i.test(title)){
 const tall=d.height>d.length*1.3;
 return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1000" viewBox="0 0 1200 1000" role="img" aria-label="Peça montada com cotas"><defs><marker id="a" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto-start-reverse"><path d="M7 0L0 3.5L7 7" fill="none" stroke="#84394f" stroke-width="1.1"/></marker></defs><rect width="1200" height="1000" fill="white"/>
 <g font-family="Arial,sans-serif" fill="#713349" text-anchor="middle"><text x="600" y="55" font-size="18" letter-spacing="3">MOLDAÊ PERSONALIZADOS</text><text x="600" y="100" font-size="30">Dimensões da peça montada</text><text x="600" y="137" font-size="22">${esc(title)}</text></g>
 ${photo?`<image href="${esc(photo)}" x="220" y="160" width="760" height="650" preserveAspectRatio="xMidYMid meet"/>`:''}
 ${arrow(210,tall?205:310,210,tall?760:700)}${arrow(330,830,760,830)}${arrow(800,815,935,740)}
 <g font-family="Arial,sans-serif" fill="#713349" font-size="26" font-weight="600">${label(165,490,'Altura: '+cm(d.height),'transform="rotate(-90 165 490)"')}${label(545,875,'Comprimento: '+cm(d.length))}${label(920,907,'Largura: '+cm(d.width))}</g>
 <g font-family="Arial,sans-serif" text-anchor="middle" fill="#806771" font-size="17"><text x="600" y="950">Medidas da peça montada informadas pelo ateliê · Imagem ilustrativa</text></g></svg>`;
 }
 return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800" role="img" aria-label="Caixa montada com cotas"><defs><marker id="a" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto-start-reverse"><path d="M7 0L0 3.5L7 7" fill="none" stroke="#84394f" stroke-width="1.1"/></marker></defs><rect width="1200" height="800" fill="white"/>
 <g font-family="Arial,sans-serif" fill="#713349"><text x="600" y="65" text-anchor="middle" font-size="17" letter-spacing="3">MOLDAÊ PERSONALIZADOS</text><text x="600" y="110" text-anchor="middle" font-size="32" font-weight="600">Dimensões da caixa montada</text><text x="600" y="147" text-anchor="middle" font-size="21">${esc(title)}</text></g>
 ${photo?`<image href="${esc(photo)}" x="100" y="160" width="1000" height="500" preserveAspectRatio="xMidYMid meet"/>`:''}
 <g fill="none" stroke="#bc8897" stroke-width="1.3"><path d="M285 566V632 M917 566V632 M925 334H1000 M925 559H1000 M718 334L778 312 M692 268L752 246"/></g>
 ${arrow(285,615,917,615)}${arrow(980,334,980,559)}${arrow(766,308,740,242)}
 <g font-family="Arial,sans-serif" fill="#713349" font-size="25" font-weight="600">${label(601,655,'Comprimento total: '+cm(d.length))}${label(1020,447,'Altura: '+cm(d.height),'transform="rotate(-90 1020 447)"')}${label(861,221,'Largura: '+cm(d.width))}</g>
 <path d="M846 230L753 272" stroke="#84394f" fill="none" stroke-width="1.4"/>
 <g font-family="Arial,sans-serif" text-anchor="middle" fill="#806771" font-size="17"><text x="600" y="719">Comprimento de ponta a ponta · Nome ilustrativo</text><text x="600" y="749">Medidas da peça montada informadas pelo ateliê.</text></g></svg>`;
}
