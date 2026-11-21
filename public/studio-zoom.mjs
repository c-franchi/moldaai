export const MIN_ZOOM=.15,MAX_ZOOM=3;
export function clampZoom(value){return Math.max(MIN_ZOOM,Math.min(MAX_ZOOM,Number.isFinite(value)?value:1));}
// Half a viewport of free canvas around the sheet allows any point on it to
// remain centered, even when that point is near an edge of a large page.
export function zoomLayout({width,height,ruler=0,zoom,viewportWidth,viewportHeight,focus}){
 const scale=2.5*zoom,sheetWidth=(width+ruler)*scale,sheetHeight=(height+ruler)*scale;
 const target=focus||{x:width/2-ruler/2,y:height/2-ruler/2};
 return {sheetWidth,sheetHeight,stageWidth:sheetWidth+viewportWidth,stageHeight:sheetHeight+viewportHeight,left:viewportWidth/2,top:viewportHeight/2,scrollLeft:Math.max(0,Math.min(sheetWidth,(target.x+ruler)*scale)),scrollTop:Math.max(0,Math.min(sheetHeight,(target.y+ruler)*scale))};
}
// Coordinates are relative to the scroll viewport and sheet (including rulers).
export function pinchZoom({startZoom,startDistance,distance,anchor,midpoint,viewportWidth,viewportHeight}){
 const zoom=clampZoom(startZoom*distance/Math.max(1,startDistance)),scale=2.5*zoom;
 return {zoom,scrollLeft:viewportWidth/2+anchor.x*scale-midpoint.x,scrollTop:viewportHeight/2+anchor.y*scale-midpoint.y};
}
