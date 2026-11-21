import {geometry,CANDY_DIMENSIONS} from './studio-model.mjs';
import {worldPoints} from './studio-precision.mjs';
// Interpret only connected, three-line glue tabs on the original candy seam.
// Geometry is unchanged; the shared attachment edge becomes a fold in delivery PDFs.
export function productionRules(d){
 const geo=geometry(d.structure,d.dimensions),cuts=(geo.cuts||[...geo.faces.map(f=>f.points),...geo.glue]).flatMap(ps=>ps.map((p,i)=>[p,ps[(i+1)%ps.length]])),folds=[...geo.folds],tabs=[];
 if(d.baseLines!==false&&d.structure==='candy-lab'){
 const p={...CANDY_DIMENSIONS,...d.dimensions},x=p.x,ranges=[[p.y,p.y+p.endH],[p.y+p.endH+2*p.foldH+p.bodyH,p.y+2*p.endH+2*p.foldH+p.bodyH]];
 for(const [a,b] of ranges){const paths=(d.paths||[]).filter(l=>l.kind==='line'&&l.usage==='cut').map(l=>({id:l.id,ps:worldPoints(l)})).filter(l=>l.ps.every(q=>q.x<=x+.6&&q.y>=a-.6&&q.y<=b+.6)&&l.ps.some(q=>q.x<x-1));if(paths.length!==3)continue;
 const nodes=[];for(const l of paths)for(const q of l.ps){let n=nodes.find(n=>Math.hypot(n.x-q.x,n.y-q.y)<=.6);if(n)n.degree++;else nodes.push({...q,degree:1});}
 const ends=nodes.filter(n=>n.degree===1).sort((a,b)=>a.y-b.y);if(nodes.length!==4||ends.length!==2||nodes.some(n=>n.degree>2)||ends.some(n=>Math.abs(n.x-x)>.6)||Math.abs(ends[0].y-a)>.6||Math.abs(ends[1].y-b)>.6)continue;
 const index=cuts.findIndex(([u,v])=>Math.abs(u[0]-x)<.01&&Math.abs(v[0]-x)<.01&&Math.abs(Math.min(u[1],v[1])-a)<.01&&Math.abs(Math.max(u[1],v[1])-b)<.01);if(index<0)continue;
 cuts.splice(index,1);folds.push([[x,a],[x,b]]);tabs.push({a,b,x,paths:paths.map(l=>l.id),points:[[x,a],[Math.min(...nodes.map(n=>n.x)),ends[0].y+2],[Math.min(...nodes.map(n=>n.x)),ends[1].y-2],[x,b]]});
 }
 }
 return {cuts,folds,tabs};
}
export function flatArtworkType(d){
 if((d.paths||[]).some(p=>['tag-cut','smooth-circle-cut','tag-hole'].includes(p.id)))return 'tag';
 if((d.paths||[]).some(p=>p.label?.startsWith('Topper ')))return 'toppers';
 return d.structure==='art-a4'?'cake':null;
}
export function assemblyInstructions(d){if(d.catalog?.family==='cachepot')return [['Imprima as duas partes','Imprima as partes 1 e 2 em A4 a 100%, sem ajustar à página. Confira a escala e faça uma prova em papel.'],['Recorte e vinque','Recorte somente o contorno externo. Vinque as linhas tracejadas entre as faces e nas abas inferiores.'],['Una as laterais','Cole a aba lateral por dentro da outra parte. Repita na segunda união para fechar as quatro paredes.'],['Monte o fundo','Dobre as abas inferiores para dentro e cole a aba maior sobre elas. Confira os encaixes antes de aplicar cola.'],['Valide antes de produzir','Este contorno foi reconstruído da referência visual das páginas 379 e 380. Confira medidas e montagem física antes do lote. Use embalagem interna própria para alimentos.']];const flat=flatArtworkType(d);if(flat==='tag'&&(d.paths||[]).some(p=>p.id==='tag-fold'&&p.usage==='fold'))return [
 ['Imprima as duas faces em uma folha','Imprima em 100%, sem ajustar à página. As duas faces estão na mesma peça, em sentidos opostos. Não use impressão frente e verso. Confira o quadrado de 10 mm.'],
 ['Recorte somente por fora','Recorte o contorno externo de 90 × 70 mm de cada unidade. Não separe as faces e não corte os pespontos decorativos.'],
 ['Vinque e dobre no meio','Faça um vinco leve na linha central tracejada de 90 mm, usando régua e ferramenta sem corte. Dobre com as faces impressas para fora.'],
 ['Abra e apoie na mesa','Abra a peça em formato de tenda, com 90 × 35 mm em cada face. Não precisa de cola. A altura apoiada varia com a abertura. Faça uma prova antes de produzir o lote.'],
 ['Efeito de volume','O ursinho e as folhas têm sombreamento 3D impresso. A impressão continua plana; relevo físico exige apliques separados, que não fazem parte deste molde.']
 ];if(flat==='tag'&&!(d.paths||[]).some(p=>p.id==='tag-hole'))return [
 ['Imprima em tamanho real','Imprima em 100%, sem ajustar à página. Confira o quadrado de 10 mm.'],
 ['Recorte a tag plana','Siga apenas o contorno externo. Preserve as bordas e o pesponto decorativo.'],
 ['Use como etiqueta','Este modelo é plano, sem vinco central e sem furo marcado. A aplicação depende do acabamento escolhido. Não dobre para formar uma peça de mesa.']
 ];if(flat==='tag')return [
 ['Imprima em tamanho real','Imprima em 100%, sem ajustar à página. Confira o quadrado de 10 mm. Recorte cada unidade da folha otimizada.'],
 ['Recorte a tag','Siga apenas o contorno externo de corte, mantendo a borda decorativa. Não corte o pesponto interno.'],
 ['Faça o furo','Se usar fita, perfure o círculo pequeno marcado no topo. Faça uma unidade de teste antes de furar o lote.'],
 ['Prenda na lembrancinha','Passe fita ou cordão pelo furo e prenda à embalagem. Esta arte plana não precisa de vinco, cola ou palito.']
 ];if(flat==='toppers')return [
 ['Imprima em tamanho real','Imprima em 100%, sem ajustar à página, e confira o quadrado de 10 mm. A folha repete os três modelos.'],
 ['Recorte cada topper','Siga o contorno externo de cada medalhão, preservando as curvas e a borda rosa. Os anéis internos são decorativos.'],
 ['Cole o palito no verso','Fixe um palito próprio para alimentos no verso de cada peça. Espere a cola secar antes de usar.'],
 ['Decore os doces','Insira somente o palito no cupcake ou doce. A parte impressa deve ficar fora do alimento. Não há vincos neste modelo.']
 ];if(d.structure==='art-a4'&&(d.paths||[]).some(p=>p.id.startsWith('autocut-')))return [
 ['Imprima em tamanho real','Imprima a folha de arte em 100%, sem ajustar à página. Confira o quadrado de 10 mm. Esta página é apenas um mapa reduzido.'],
 ['Siga o contorno externo','Recorte pela linha fina externa, preservando a margem branca e as ligações entre os elementos. As bordas coloridas da ilustração são decorativas.'],
 ['Mantenha a peça conectada','Não corte os espaços brancos internos nem separe as ligações estreitas: elas sustentam a composição como uma peça única. Este topo não precisa de vincos.'],
 ['Fixe os suportes','Cole palitos ou suportes próprios no verso, distribuídos nas partes largas. Não atravesse a arte. Espere a cola secar antes de posicionar no bolo.'],
 ['Confira o acabamento','Teste o equilíbrio e a firmeza. Para manusear com facilidade, recorte primeiro em volta deixando sobra e finalize a linha externa com cuidado.']
 ];if(d.structure==='brigadeiro-petal')return [
 ['Imprima em tamanho real','Imprima em A4 a 100%, sem ajustar à página. Confira o quadrado de 10 mm. Se Otimizar folha estiver ativo, recorte cada unidade completa da folha.'],
 ['Recorte o contorno','Recorte o contorno das quatro faces curvas (na versão coração, siga as duas curvas e a entrada central de cada face), da emenda lateral, das três abas inferiores das laterais e do fundo quadrado inteiro. Preserve todas as abas.'],
 ['Vinque as uniões','Vinque as linhas tracejadas entre as faces, na emenda lateral, na ligação do fundo e nas abas inferiores. Não vinque o meio das pétalas.'],
 ['Cole a emenda lateral','Aproxime a primeira e a última face e cole a aba lateral por dentro, formando as quatro faces. Modele suavemente a curvatura, sem amassar o papel.'],
 ['Feche o fundo','Dobre as três abas inferiores das faces para dentro. Aplique pouca cola nelas, dobre o fundo quadrado ligado à outra face e cole-o sobre as abas. Alinhe os cantos e espere secar.'],
 ['Coloque o brigadeiro','Use uma forminha interna própria para contato com alimentos. Confira a firmeza e a montagem de uma unidade antes de produzir o lote.']
 ];if(d.structure==='milk-a4')return [
 ['Imprima e confira','Imprima em A4 a 100%, sem ajustar à página. Confira o quadrado de 10 mm. '+(d.printLayout?.mode==='two'?'São duas partes ampliadas; recorte e una as marcas A usando as novas abas, mantendo todas as faces alinhadas.':'Esta versão ocupa uma folha.')],
 ['Recorte e vinque','Recorte apenas o contorno, os encaixes do fundo e os furos superiores. Vinque os tracejados horizontais, verticais e diagonais. Não corte os tracejados.'],
 ['Una as faces','Cole a aba lateral por dentro da borda oposta e forme o tubo de quatro faces. Nas duas folhas, una primeiro a emenda A e depois feche o tubo. Espere a cola secar.'],
 ['Encaixe o fundo','Pré-dobre as quatro abas inferiores. Sobreponha as abas estreitas e encaixe a lingueta na abertura da aba oposta. Confira a firmeza; reforce com cola se necessário.'],
 ['Feche o topo','Dobre as laterais pelas diagonais, aproxime as duas abas superiores e passe a fita pelos furos. Coloque o conteúdo embalado antes de fechar.'],
 ['Confira a montagem','Monte uma unidade de teste, confira escala, encaixe e colagem antes de produzir o lote.']
 ];return d.structure.startsWith('candy-')?[
 ['Imprima em tamanho real','Use papel A4, orientação paisagem, escala 100% ou Tamanho real. Desative Ajustar à página. Confira o quadrado: cada lado deve medir 10 mm.'],
 ['Recorte o contorno','Corte somente as linhas contínuas de corte, incluindo os seis vazados em losango. Preserve as abas laterais: elas fazem parte da peça. Não corte as linhas tracejadas de vinco.'],
 ['Faça os vincos','Com régua e ferramenta sem ponta cortante, marque os tracejados do corpo, das pontas e da união das abas. Dobre levemente antes de colar.'],
 ['Feche o corpo','Forme o tubo de quatro faces. Aplique pouca cola na aba lateral maior e una por dentro à borda oposta. Alinhe a estampa e espere secar.'],
 ['Una as pontas','Se houver abas menores nas faixas xadrez, cole-as por dentro na borda oposta de cada faixa. Preserve a união tracejada das abas; as diagonais recortadas permitem o estreitamento.'],
 ['Modele e finalize','Feche uma extremidade com fita no estreitamento, coloque o conteúdo embalado e feche a outra. Não torça o papel. Faça uma primeira montagem para conferir o encaixe antes de produzir várias unidades.']
 ]:[['Impressão','Imprima a folha em tamanho real (100%) e confira o quadrado de 10 mm.'],['Corte e acabamento','Corte as linhas de corte. Linhas de vinco são dobradas, nunca cortadas. Siga as instruções específicas do seu modelo antes de montar.']];}

export function templateProductInfo(d){if(d.catalog?.family==='cachepot')return {kind:'Cachepô · '+d.catalog.variant,stem:'cachepot-bosque'};
 const flat=flatArtworkType(d);if(flat==='tag'&&(d.paths||[]).some(p=>p.id==='tag-fold'&&p.usage==='fold'))return {kind:'Tag de mesa dobrável',stem:'tag-mesa-dobravel'};if(flat==='tag')return {kind:(d.paths||[]).some(p=>p.id==='smooth-circle-cut'||p.label?.includes('redonda'))?'Tag redonda':'Tag retangular',stem:'tag-personalizada'};if(flat==='toppers')return {kind:'Toppers para cupcake',stem:'toppers-cupcake'};
 const types={'brigadeiro-petal':['Forminha de brigadeiro','forminha-brigadeiro'],'milk-a4':['Caixa Milk','caixa-milk'],'candy-lab':['Caixa Bala','caixa-bala'],'candy-closed':['Caixa Bala','caixa-bala'],'tag-60x40':['Tag retangular','tag-retangular'],'art-a4':['Arte personalizada','arte-personalizada']};
 const [kind,stem]=types[d.structure]||['Molde digital','molde-digital'];return {kind,stem};
}
