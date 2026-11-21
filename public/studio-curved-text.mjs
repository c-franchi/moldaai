// Same circular glyph layout in SVG and PDF. Coordinates and bounds are in mm.
const MM=25.4/72;
const graphemes=text=>typeof Intl.Segmenter==='function'?[...new Intl.Segmenter('pt-BR',{granularity:'grapheme'}).segment(text)].map(s=>s.segment):Array.from(text.normalize('NFC'));
export function curvedTextLayout(text,field,measure){
 const curve=field.curve||0;if(!Number.isFinite(curve)||Math.abs(curve)>180)throw new Error('A curva deve estar entre -180° e 180°.');
 const chars=graphemes(text);if(!chars.length)return {size:field.size,glyphs:[],bounds:{w:0,h:0}};
 let size=field.size;
 while(true){
  const total=measure(text,size),angle=Math.abs(curve)*Math.PI/180,sign=Math.sign(curve)||1,radius=angle?total/angle:Infinity;
  let prefix='',minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;const glyphs=[];
  for(const char of chars){const before=measure(prefix,size);prefix+=char;const after=measure(prefix,size),width=measure(char,size),distance=(before+after-total)/2,a=radius===Infinity?0:distance/radius;
   const x=angle?radius*Math.sin(a):distance,y=angle?sign*radius*(1-Math.cos(a)):0,rotation=sign*a,ex=(Math.abs(width*Math.cos(rotation))+Math.abs(size*MM*Math.sin(rotation)))/2,ey=(Math.abs(width*Math.sin(rotation))+Math.abs(size*MM*Math.cos(rotation)))/2;
   glyphs.push({text:char,x,y,width,angle:rotation*180/Math.PI});minX=Math.min(minX,x-ex);maxX=Math.max(maxX,x+ex);minY=Math.min(minY,y-ey);maxY=Math.max(maxY,y+ey);
  }
  const w=maxX-minX,h=maxY-minY;
  if(w<=field.w+.001&&h<=field.h+.001){const dx=field.x-minX+(field.align==='center'?(field.w-w)/2:field.align==='right'?field.w-w:0),dy=field.y-minY+(field.h-h)/2;return {size,bounds:{w,h},glyphs:glyphs.map(g=>({...g,x:g.x+dx,y:g.y+dy}))};}
  if(size<=field.minSize)throw new Error('O texto curvo não cabe. Aumente a largura ou a altura do campo, reduza a curva ou diminua a fonte mínima.');
  size=Math.max(field.minSize,size-.25);
 }
}
