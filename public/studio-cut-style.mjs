// Old automatic contours were saved white. Keep their white backing, but
// draw the technical cutting stroke visibly, once, above the artwork.
export const isAutomaticCut=p=>p.kind==='polygon'&&p.usage==='cut'&&p.id.startsWith('autocut-');
export function automaticCutStyle(p){return {color:/^#(?:ffffff|fffafa)$/i.test(p.color)?'#8b717d':p.color,stroke:Math.max(.18,p.stroke),opacity:p.opacity??1};}
