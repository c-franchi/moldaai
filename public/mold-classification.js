/* Shared by storefront and server. Missing or conflicting identities never share a group. */
(function(root){
 const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
 function typeOf(value){const s=norm(value);for(const [re,id,label] of [[/caixa milk/,'milk','Caixa Milk'],[/caixa bala/,'candy','Caixa Bala'],[/\btoppers?\b/,'topper','Topper'],[/topo de bolo/,'cake','Topo de bolo'],[/\btags?\b/,'tag','Tag'],[/cachepo/,'cachepot','Cachepô'],[/forminha|brigadeiro/,'brigadeiro','Forminha de brigadeiro'],[/calendario/,'calendar','Calendário'],[/caixa casinha/,'house','Caixa casinha'],[/caixa cone/,'cone','Caixa cone'],[/caixa almofada/,'pillow','Caixa almofada']])if(re.test(s)){const variant=id==='tag'?(/dobrav|de mesa/.test(s)?'folded':/redond/.test(s)?'round':/retang/.test(s)?'rectangle':''):'';return {family:id,variant,label:label+(variant==='round'?' redonda':variant==='rectangle'?' retangular':variant==='folded'?' dobrável':'')};}return null;}
 function resolve(p){
  const title=typeOf(p.title||p.name),types=(p.taxonomies?.filter(t=>t.kind==='type').map(t=>t.label)||p.types||[p.type]).filter(Boolean),known=types.map(typeOf).filter(Boolean),source=p.mold_classification;
  if(source?.family&&source.family!=='other'){const label=source.label||typeOf(source.family)?.label||title?.label;return {...source,label:label||'Molde',kind:'single',key:source.baseModel?'model:'+source.baseModel:[source.family,source.variant||''].join(':')};}
  if(/^studio-kit-/.test(p.id||'')||/^kit\b/.test(norm(p.title||p.name)))return {kind:'kit',label:'Kit de moldes',key:'kit:'+p.id};
  const typed=known[0];if(known.some(t=>t.family!==typed.family)||title&&typed&&title.family!==typed.family)return {kind:'unknown',label:title?.label||p.title||p.name||'Molde',key:'product:'+p.id};
  const info=title||typed;
  // A historical kit checkbox cannot turn an individual mold into a kit.
  if(info){const variant=info.variant||typed?.variant||'';return {...info,label:info.variant?info.label:typed?.variant?typed.label:info.label,variant,kind:'single',key:info.family+':'+variant};}
  if(/^studio-kit-/.test(p.id||'')||/^kit\b/.test(norm(p.title||p.name)))return {kind:'kit',label:'Kit de moldes',key:'kit:'+p.id};
  return {kind:'unknown',label:p.title||p.name||'Molde',key:'product:'+p.id};
 }
 function validate(p,taxonomies){
  const types=taxonomies.filter(t=>t.kind==='type'),themes=taxonomies.filter(t=>t.kind==='theme');
  if(types.length>1)throw new Error('Escolha somente um tipo de molde. Kits devem usar o tipo Kits.');
  if(themes.length>1)throw new Error('Escolha somente um tema para esta arte. Crie outro produto para outro tema.');
  const type=types[0],kitType=type&&/^(kit|kits|kit de moldes)$/.test(norm(type.label)),flag=p.is_kit===true||p.is_kit===1||p.is_kit==='1',title=typeOf(p.title),typed=type&&typeOf(type.label);
  if(type&&flag!==Boolean(kitType))throw new Error('A opção de kit deve corresponder ao tipo escolhido: Kits para conjunto; tipo individual para um molde.');
  if(type&&/^kit\b/.test(norm(p.title))&&!kitType)throw new Error('Um kit deve usar o tipo Kits e a opção de kit marcada.');
  if(title&&kitType&&!/^kit\b/.test(norm(p.title)))throw new Error('Este nome identifica um molde individual. Selecione seu tipo e desmarque a opção de kit.');
  if(title&&typed&&(title.family!==typed.family||title.variant&&typed.variant&&title.variant!==typed.variant))throw new Error('O tipo selecionado não corresponde ao molde informado no nome.');
  if(p.status==='active'&&(!type||!themes.length))throw new Error('Para exibir no catálogo, escolha um tipo de molde e um tema.');
 }
 root.MoldaeMolds=Object.freeze({resolve,typeOf,validate});
})(globalThis);
