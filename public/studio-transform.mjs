// Centered local reflection followed by rotation. Shared by SVG and PDF.
export function layerMatrix(l,unit=1,pageHeight){
 const a=(l.rotation||0)*Math.PI/180,c=Math.cos(a),s=Math.sin(a),sx=l.flipX?-1:1,sy=l.flipY?-1:1;
 const cx=(l.x+l.w/2)*unit,cy=(pageHeight===undefined?l.y+l.h/2:pageHeight-l.y-l.h/2)*unit;
 const sign=pageHeight===undefined?1:-1,A=c*sx,B=sign*s*sx,C=-sign*s*sy,D=c*sy;
 return [A,B,C,D,cx-A*cx-C*cy,cy-B*cx-D*cy];
}
export const layerSVGTransform=l=>'matrix('+layerMatrix(l).join(' ')+')';
