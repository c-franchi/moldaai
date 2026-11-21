export const AI_MODELS={
 'gpt-image-2.6-sunburst':{label:'GPT Image 2.6 Sunburst · composição detalhada',qualities:['max','xhigh','high','medium','low']},
 'gpt-image-1.5':{label:'GPT Image 1.5 · compatibilidade',qualities:['high','medium','low']}
};
export const AI_STYLES={auto:'Siga o estilo descrito pelo usuário ou apresentado na referência, sem impor outro estilo.',watercolor:'Aquarela ilustrada delicada, pigmentos e transições controlados, detalhes bem definidos sem aspecto borrado.',kids:'Ilustração infantil baby de acabamento editorial, formas suaves, expressões delicadas e proporções coerentes.',realistic:'Fotografia realista com materiais, iluminação e anatomia convincentes.',flat:'Ilustração plana com contornos suaves e precisos e cores uniformes.'};
export const AI_COMPOSITIONS={auto:'Siga a composição descrita, respeitando enquadramento e espaços vazios pedidos.',element:'Um elemento isolado, inteiro, centralizado, com margem de respiro em todos os lados. Não corte cabeça, orelhas, cauda, pés ou detalhes na borda.',frame:'Moldura decorativa com centro livre para personalização. Distribua os elementos pelas bordas com equilíbrio, sem invadir o centro. Preserve por inteiro os personagens salvo recorte explicitamente pedido.',scene:'Cena completa com hierarquia visual clara, escala consistente e relações espaciais coerentes entre os elementos.'};
export function aiSize(format='square',resolution='print'){
 const sizes=resolution==='print'?{square:'2048x2048',portrait:'2048x3072',landscape:'3072x2048'}:{square:'1024x1024',portrait:'1024x1536',landscape:'1536x1024'};
 return sizes[format];
}
export function buildArtPrompt({mode='create',description='',style='auto',background='transparent',composition='auto',palette='',details='',avoid=''}){
 return [mode==='edit'?'Edite a imagem de referência seguindo o pedido. Preserve identidade, traços, estilo, cores e elementos não mencionados. Não redesenhe o restante sem necessidade.':mode==='reference'?'Crie uma nova arte usando a referência como guia visual de estilo, paleta, acabamento e identidade dos personagens. Siga as diferenças explicitamente pedidas.':'Crie uma arte final para papelaria personalizada com acabamento editorial profissional.',
 'PEDIDO PRINCIPAL DO USUÁRIO:\n'+description.trim(),
 'DIREÇÃO DE ARTE:\n'+AI_STYLES[style],
 'COMPOSIÇÃO:\n'+AI_COMPOSITIONS[composition],
 palette.trim()?'PALETA SOLICITADA:\n'+palette.trim():'',
 details.trim()?'DETALHES OBRIGATÓRIOS E A PRESERVAR:\n'+details.trim():'',
 avoid.trim()?'EVITAR:\n'+avoid.trim():'',
 'ACABAMENTO: bordas limpas e bem resolvidas, formas consistentes, detalhes legíveis, luz e sombras coerentes, sem deformações, membros extras, duplicações acidentais, manchas ou artefatos. Preserve textura apenas quando fizer parte do estilo solicitado. Não simplifique em clipart genérico se o pedido exigir riqueza de detalhes.',
 background==='transparent'?'FUNDO: realmente transparente com canal alfa, sem quadriculado desenhado e sem halo nas bordas.':'FUNDO: opaco, conforme a composição descrita.',
 'Não acrescente nomes, letras, marcas, logotipos ou marcas-d’água não solicitados. As instruções explícitas do usuário têm prioridade sobre as sugestões de acabamento e composição.'
 ].filter(Boolean).join('\n\n');
}
