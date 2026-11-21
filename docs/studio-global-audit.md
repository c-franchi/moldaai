# Estúdio compartilhado — revisão de 20/11/2026

Estado: alterações preparadas para revisão, sem publicação. Validação funcional pela interface e em aparelho móvel permanece pendente.

## Origem e diagnóstico

Fonte: repositório atual do GPT Sites, HEAD inicial daac4679c6a965b0766af473c78d8eed425e1dd7. Não foi usado o repositório GitHub externo.

O endpoint de nova arte em modo blank remove imagens, textos e caminhos decorativos, mantendo cortes e vincos. Os toppers possuem contornos poligonais ondulados. O reconhecimento compartilhado de áreas aceitava formas preenchidas ou cortes circulares, deixando os contornos desses toppers sem área após a limpeza. O Jardim funcionava porque conservava bases preenchidas.

A inclusão de peças usava exclusivamente cortes circulares e o botão era condicionado à mesma restrição. A replicação existente vinculava continuamente as faces, sem um comando de cópia independente.

## Alterações

- studio-model.mjs: áreas compartilhadas para contornos fechados poligonais, elípticos e retangulares, inclusive sem preenchimento. Mantidos IDs shape-, coordenadas e geometria.
- studio-tags.mjs: reutilização da inclusão de tags para peças planas com contorno fechado; reconhecimento pela geometria, sem tema ou catálogo. Cópia de composição, remapeamento de máscaras e grupos, busca de espaço A4 e remoção atômica de peça com suas camadas. Pelo menos uma peça permanece. Limites de camadas continuam validados.
- studio-face-links.mjs: conjuntos de peças por dimensões compatíveis, excluindo contornos internos e furos da lista de peças. Mantida transformação existente de coordenadas.
- studio.js: botão + Adicionar peça com opção de copiar arte; remover peça selecionada com confirmação e desfazer; Aplicar às demais faces como cópia independente, preservando o comando de vínculo contínuo.
- Testes de regressão adicionados em studio-shared-pieces.test.mjs.

Nenhuma migração, registro de produção, arquivo de usuário, serviço de IA, autenticação, permissão ou pagamento foi alterado. A estrutura de salvamento, upload, gestos, histórico e exportação existente foi reutilizada. Não há implantação automática.

## Verificação

| Cenário | Evidência e resultado |
| --- | --- |
| A — Topper sem arte | Fixture usa o mesmo gerador Jardim e remove as mesmas coleções do endpoint blank. Três contornos reconhecidos, seleção por ponto e grupo de três faces aprovados. Fluxo visual completo pendente. |
| B — Replicação | Teste de cópia em três faces mantém cortes, deslocamento relativo de 46 mm e edição independente; suíte de vínculos cobre imagens, máscaras, grupos, ângulos e PDF. Aprovado em testes automatizados. |
| C — Adicionar / duplicar / remover | Quarta peça com cópia de texto; remoção restaura as três composições anteriores. Tag testa falta de espaço e limites sem mutação parcial. Aprovado em testes automatizados. |
| D — Tag redonda | Suíte existente: cópias, bases, máscaras, guias, texto legado e PDF A4 com três composições. Aprovada. |
| E — Molde existente | Suítes existentes de Jardim, moldes, vínculos, seleção e exportação aprovadas; nenhuma arte real foi aberta ou modificada. |
| F — Novo molde | Fixture com novos IDs e contornos retangulares recebe seleção e inclusão de peças sem configuração específica. Aprovada. |
| G — Mobile | Testes existentes de cálculo de zoom e pinch aprovados. Toque, arraste e upload em aparelho real NÃO executados. |
| H — Salvamento | Round-trip JSON do novo conjunto e testes existentes de API/autosave aprovados. Fechar/reabrir pela interface autenticada NÃO executado. |

Execuções: npm test — 135 testes aprovados, zero falhas; build-site.mjs — build de produção concluído; node --check nos módulos alterados e git diff --check aprovados.

Prévia local abriu, mas a rota administrativa apresentou login ChatGPT e ausência de sessão local. Não se contornou autenticação nem se conectou a prévia aos dados de produção. Assim, não se declara conclusão integral dos critérios de aceite.

## Limites e revisão pendente

A inclusão de peças atua em art-a4 sem vincos e com contornos fechados não rotacionados de pelo menos 8 mm em cada dimensão. Contornos internos contidos em outra peça são tratados como parte dela. Moldes dobráveis continuam com seus controles de geometria próprios. A replicação entre peças usa dimensões iguais (tolerância 0,1 mm); demais estruturas mantêm os grupos existentes.

Revisar em sessão autenticada os cenários A–H pela interface, especialmente upload, seleção por toque e zoom com dois dedos no celular. Somente após essa revisão e autorização deve ser publicada uma versão.

## Complemento — vitrine por molde e exclusão recuperável

- Vitrine inicial e catálogo agrupam os produtos pelo tipo de molde cadastrado. O cartão destaca o molde, indica opções e mostra o menor preço do grupo com “A partir de”. O botão abre a escolha de temas.
- A página do produto contém o seletor “Tema do molde”, restrito a produtos do mesmo tipo. Ao trocar, navega para o produto real correspondente, preservando preço, imagens, arquivos e identificação usados no carrinho.
- Classificação visual dos produtos padronizada como Moldes. Os temas continuam disponíveis nos filtros e no seletor, sem alteração dos registros cadastrados. Produtos antigos sem classificação usam identificação pelo título quando reconhecida; produtos desconhecidos não são agrupados entre si. Recomenda-se cadastrar corretamente os tipos no painel.
- Biblioteca e editor têm Excluir / Excluir molde com confirmação. A exclusão envia à Lixeira; Restaurar molde desfaz. A consulta normal e a lista de novos projetos omitem os excluídos. Documentos, assets, versões, produtos e compras permanecem intactos. Não há exclusão definitiva.
- A tabela auxiliar studio_trash é criada de forma aditiva quando o recurso é utilizado. Nenhuma alteração foi aplicada ao banco publicado durante este trabalho.
- Validação: 138 testes aprovados, zero falhas, incluindo agrupamento, seletor restrito por tipo, proteção administrativa, revisão conflitante, ocultação, preservação do documento e restauração.
- Mantida a pendência de validação visual autenticada e em celular. Versão preparada sem implantação.

## Correção de classificação — seleção de temas misturava produtos

Causa confirmada no código: moldType priorizava is_kit e retornava a chave genérica “Kit de moldes”; moldKey usava essa chave para todos os produtos. Assim, marcações de kit incorretas reuniam tag, topper e caixa. O teste anterior de kit consolidava justamente essa prioridade, que foi corrigida.

Correção: classificador compartilhado entre navegador e servidor, com identidade de tipo/variante. Marcação de kit isolada não sobrepõe uma identificação de molde individual. Tags redondas e retangulares ficam em chaves distintas. Contradições ou identidades desconhecidas ficam isoladas por produto, sem inferir compatibilidade. Kits reais também ficam isolados por produto; não existe uma chave genérica que misture todos os kits.

Travas no cadastro de produto:

- seleção única e obrigatória de tipo de molde e tema no formulário;
- marcação de kit acompanha a escolha do tipo e é conferida no navegador e no servidor;
- rejeição de múltiplos tipos ou múltiplos temas, tipo incompatível com nome reconhecível e formato inválido do indicador de kit;
- criação manual exige tipo e tema; produtos existentes incompletos podem permanecer como rascunho pelo servidor, mas não podem ser ativados sem classificação;
- rascunhos gerados pelo Estúdio continuam preservados e precisam de classificação no painel antes da ativação.

Não se alterou em lote nenhum cadastro existente. A separação segura vale na exibição dos produtos antigos; informações contraditórias precisam ser corrigidas ao editar o cadastro. Não foram alterados arquivos privados, compras, pagamentos nem autenticação.

Validação: 141 testes aprovados, incluindo reprodução do caso Tag retangular / Topper / Caixa Bala com is_kit=1, isolamento de kits, separação de variantes de tag e recusas de cadastro incompatível, múltiplos temas, ausência de classificação e indicador inválido. Cadastro válido de molde individual e kit permanece permitido. Validação visual autenticada permanece pendente.

## Exclusão de produtos arquivados — Meus moldes

A tela do print usa produtos do catálogo, uma lista separada dos templates do Estúdio. Adicionado Excluir nos itens arquivados de Meus moldes, com confirmação, e a aba Lixeira com Restaurar molde. A restauração mantém o estado Arquivado, sem republicar o produto.

A API restringe o envio à lixeira a produtos já arquivados, exige revisão atual e autorização administrativa. Produtos na lixeira não podem ser editados ou reativados sem restauração. A marcação é recuperável e usa tabela auxiliar product_trash criada de forma aditiva; produtos, arquivos originais, mídias, fontes de personalização e compras não são apagados. Nenhum registro real foi excluído durante o desenvolvimento.

Validação: 142 testes aprovados, zero falhas. O novo teste cobre recusa para rascunho, recusa de usuário sem permissão, revisão desatualizada, envio à lixeira, bloqueio de edição, preservação e download do arquivo original e restauração ao estado arquivado. A conferência visual autenticada continua pendente. Preparado sem publicação automática, incluindo a correção de classificação da versão anterior.

## Organização visual do Estúdio — 20/11/2026

Diagnóstico de código: biblioteca misturava criação, busca, importações de modelos e operações de manutenção no mesmo bloco; editor apresentava cerca de vinte comandos contextuais simultâneos com textos pequenos e ações destrutivas junto ao salvamento.

Mudanças: biblioteca com introdução, ações principais, filtros e cartões organizados por família. Importações recolhidas em seção própria; arquivar/excluir recolhidos em Opções do molde. Editor com título e estado de salvamento legíveis, Salvar destacado, Exportar e mais separado; seleção, áreas e movimentação visíveis; comandos preservados em Editar elementos, Guias e medidas e Peças. Navegação lateral com Imagens e Ajustes, campos maiores e folha central sobre fundo pontilhado. Cabeçalho e menus receberam regras próprias para telas menores.

Validação: 142 testes existentes aprovados, checagem de sintaxe JavaScript, análise sintática do CSS e comparação dos comandos renderizados com a versão anterior confirmam a preservação das ações de biblioteca e editor. A comparação usa o mesmo molde de teste nas duas versões. Build de produção executado no empacotamento.

Limite: a prévia local iniciou após remover um bloqueio de processo antigo, mas o navegador conectado retornou ERR_CONNECTION_REFUSED ao tentar acessá-la. Assim, aparência final, sobreposições e interação responsiva NÃO foram validadas visualmente. As páginas temporárias de QA, geradas com dados fictícios, foram removidas antes do empacotamento. Nenhuma arte, geometria, autenticação ou regra de banco foi alterada. Versão salva sem implantação automática.

## Biblioteca por tipo, formato e tema; prévias uniformes

A biblioteca agora agrupa tipo de molde → formato/modelo → artes e temas. O formato combina estrutura, geometria de cortes/vincos, medidas efetivas e referência do modelo. Mudanças decorativas não alteram o grupo; cortes ou dimensões diferentes o separam, inclusive quando alguém reutilizou o mesmo identificador-base. O novo campo opcional Nome do formato permite nomes como “Retangular com cantos arredondados”; o campo antigo Variação passa a ser apresentado como Descrição desta arte, preservando seus valores.

Criar nova arte mostra a lista por formato e arte de origem. O modo Somente molde remove a decoração; Cópia das artes preserva camadas para edição independente. Não foram alterados documentos existentes em lote.

Todos os cartões usam o mesmo endpoint privado de prévia SVG, derivada do documento salvo, com cortes, imagens e texto simplificado. A prévia se ajusta aos limites do desenho; não substitui a prova de impressão. Textos de personalização usam Nome/Idade; fontes e efeitos não são uma reprodução exata do PDF. Imagens maiores que 1 MB ou acima de 3 MB por prévia são omitidas apenas na miniatura, preservando os originais; o desenho estrutural permanece. As imagens carregam sob demanda, com fallback explícito se houver falha. O endpoint exige administrador e só lê assets pertencentes ao template; não expõe URLs privadas de storage.

A seção antes chamada Importar modelos e artes agora é Adicionar modelos prontos do sistema. Ela informa que contém modelos Bosque fornecidos pelo Moldaê e não é upload de arquivo. A criação de novo tema direciona para Criar nova arte. Os atalhos existentes foram preservados.

A lista do Estúdio informa produtos vinculados que usam revisão anterior. O painel de produto mostra a versão salva e a versão do Estúdio, com aviso e botão existente de atualização. A atualização não é automática e compras anteriores continuam imutáveis. Na vitrine, produtos derivados do Estúdio com identidade de formato atual usam essa identidade para separar variantes; produtos com fonte desatualizada ficam isolados até a atualização, evitando mistura de formatos incompatíveis. Produtos manuais continuam usando a classificação existente.

Validação: 148 testes aprovados, zero falhas. Incluem agrupamento por geometria, separação de formatos com referência repetida, persistência do nome do formato, prévia para cinco estruturas, escape de texto, limites de imagens, autorização, revisão da URL de prévia, aviso de produto desatualizado e isolamento na vitrine. Build de produção no empacotamento. A validação visual autenticada e em aparelho móvel permanece pendente. Nenhuma alteração em pagamentos, login, arquivos originais ou dados de compra. O GitHub externo não foi sincronizado nesta etapa.

Documentos A4 antigos sem cortes/vincos reconhecíveis ficam isolados por template até que sua geometria seja definida, impedindo agrupamento presumido a partir de uma imagem.

## Padronização de ações, confirmações e categoria incorreta

Corrigida a prioridade de classificação: estruturas conhecidas (forminha, Milk, Bala e tag retangular padrão) prevalecem sobre o catálogo legado. Título explícito de forminha também corrige a família de documentos livres. A classificação corrigida é usada no agrupamento e nos filtros; validação do documento normaliza a família de estruturas conhecidas no próximo salvamento, sem modificar cortes ou artes. Isso cobre o caso do print: estrutura de brigadeiro com catalog.family=tag.

Botões Editar arte, Excluir, Arquivar e Restaurar dos cartões receberam controles compactos, bordas e cores consistentes com o site, eliminando o botão cinza nativo e a largura exagerada. Confirmações de exclusão, remoção, arquivamento, recarga e saída com alterações usam diálogo compartilhado com título, texto seguro, cancelar em foco inicial e restauração de foco. A saída por mudança de rota também foi adaptada para confirmação assíncrona. O aviso de fechamento da aba continua sendo o mecanismo nativo do navegador, necessário para proteger alterações ao sair da página.

Adicionado Voltar ao topo, com seta e rótulo acessível, visível após rolar a página. Respeita preferência por movimento reduzido e não ocupa a tela de edição fixa do Estúdio.

Validação: 151 testes aprovados, zero falhas. Casos novos cobrem classificação legado tag/brigadeiro e normalização sem mutação do original, aceite/cancelamento de confirmação, bloqueio de diálogos simultâneos, texto tratado sem HTML e aparecimento/ação do botão voltar ao topo. Sintaxe dos scripts e diff verificados; build no empacotamento. Validação visual autenticada permanece pendente. Nenhum molde real, arquivo ou compra foi excluído.

## Classificações integradas à criação

Causa: o Estúdio guardava família e tema nos documentos, enquanto Classificações consultava o cadastro de taxonomias dos produtos. Os dois conjuntos não eram atualizados juntos.

Implementado registro compartilhado de classificações: normaliza nomes e reaproveita o mesmo ID por grupo e slug, inclusive quando variam caixa, espaços e acentos. A abertura administrativa sincroniza, de forma aditiva e em lote, os tipos identificáveis e temas válidos dos templates existentes. Entradas anteriores e associações manuais não são apagadas.

Criar nova arte exige tema (2–80 caracteres), apresenta sugestões da lista compartilhada e herda o tipo do molde. Estruturas novas abrem formulário antes da criação e exigem nome, tipo e tema; para estruturas conhecidas, o tipo acompanha a geometria. O servidor valida os novos fluxos classificados. Rascunhos internos de instalação continuam compatíveis com preparação em etapas; não há destruição nem migração de documentos antigos.

Criação/salvamento de templates registra tipos e temas válidos. A preparação de produto pelo Estúdio já associa essas classificações ao produto novo, na mesma transação de criação de produto/arquivo/fonte. Produtos antigos mantêm suas associações para evitar substituição de escolhas manuais.

No cadastro de produto, cada grupo permite + Criar classificação no próprio formulário. O diálogo cria ou reutiliza a entrada e a seleciona sem renderizar novamente o formulário, preservando título, preço e demais campos digitados. Tipo e tema continuam obrigatórios e exclusivos; ocasiões e festas aceitam múltiplas opções.

Validação: 153 testes aprovados, zero falhas. Casos novos verificam reuso normalizado, autorização da sincronização, sincronização repetida sem duplicação, recusa de criação e clone classificados sem tema e associação de tipo/tema ao produto gerado. Build de produção no empacotamento. Conferência visual autenticada permanece pendente. O cadastro existente será complementado ao abrir o painel, sem executar alterações manuais em lote nesta sessão.

## Navegação compacta por tipo e modelo

A biblioteca deixou de exibir todos os grupos de formatos e artes abertos. Agora mostra uma categoria recolhida por tipo, com os nomes Tags redondas, Tags retangulares e Tags dobráveis. Ao abrir a categoria, há uma grade compacta de modelos com prévias clicáveis. Ao selecionar um modelo, apenas suas artes/temas são renderizados abaixo, mantendo disponíveis as outras escolhas do mesmo tipo. Uma categoria fica aberta por vez; o modelo selecionado é preservado nas renderizações da sessão.

As artes dos modelos não selecionados não são renderizadas inicialmente, reduzindo elementos e imagens da página. Os modelos, classificações e documentos permanecem os mesmos; nenhuma geometria, arte ou registro foi alterado.

Validação: 155 testes aprovados, zero falhas. Dois testes novos verificam categorias inicialmente recolhidas e únicas, opções de modelos preservadas e renderização somente das artes do modelo escolhido. Sintaxe JavaScript e diff verificados; build no empacotamento. A conferência visual autenticada e em celular permanece pendente.

## Cachepô: faces editáveis, guias durante arraste e inclinação superior

Causas: as guias de centro eram renderizadas permanentemente; o contorno externo, desenhado depois das faces, capturava cliques; e Criar nova arte → Sem arte removia os caminhos decorativos que também serviam de máscaras das faces.

Correções compartilhadas: áreas personalizadas são ordenadas com as menores sobre contornos maiores na seleção. Introduzida marcação de região estrutural editableFace, preservada pelo validador e pelo fluxo comum de arte sem decoração. O Estúdio prioriza faces declaradas na seleção, nas guias e na replicação; os identificadores de recorte continuam válidos. Formas fechadas personalizadas podem ser marcadas como face editável em Ajustes. Regiões sem preenchimento não desenham linhas extras no editor, miniatura ou PDF, mas continuam disponíveis como máscaras. Moldes de estrutura conhecida mantêm suas faces existentes.

Compatibilidade: cachepôs legados reconhecidos recebem a marcação das máscaras existentes. Quando a limpeza antiga removeu as máscaras, elas são recuperadas apenas se o contorno e os quatro vincos compatíveis permitem reconstruir as duas regiões usando os próprios vértices. O corte externo e os vincos não são substituídos. Casos sem geometria reconhecível não são adivinhados.

Guias azuis de alinhamento aparecem somente durante movimentação por arraste, próximas ao alinhamento da face, quando a opção de guias está ativa. A seleção de área continua com realce sólido discreto; foi removido o contorno tracejado de seleção e as linhas de centro permanentes.

Cachepôs compatíveis têm controle Molde → Borda superior do cachepô → Inclinação da borda (graus). O ajuste muda a altura dos pontos superiores, mantendo a largura e a linha inferior; atualiza as duas faces, o corte e os inícios dos vincos correspondentes. Textos, imagens e ordem de camadas não são reposicionados. 0° nivela as extremidades superiores. Operação validada atomicamente, limitada a −20° a 20° e à folha A4; contornos previamente girados/refletidos não são alterados por esse controle. Requer prova física de montagem. Ctrl+Z utiliza o histórico existente.

Validação: 159 testes aprovados, zero falhas. Casos novos cobrem seleção das duas faces, aplicação de imagens, grupos de faces, preservação e recuperação de máscaras sem mudar cortes/vincos, inclinação nas duas partes com base e artes preservadas, round-trip de salvamento e um molde futuro com faces declaradas sem código específico do cachepô. Sintaxe e diff verificados; build no empacotamento. Validação visual autenticada, toque em aparelho real e montagem física continuam pendentes. Nenhum registro real foi apagado.

## Formato das curvas superiores — substitui o controle de inclinação

Correção de interpretação: o pedido era editar os arcos/ondulações da borda, não inclinar o topo. O controle de inclinação foi removido da interface e substituído por Formato da borda superior: reta, arcos ovais ou ondas suaves; 1 a 12 curvas por face; altura de 0 a 20 mm. Menos curvas produzem arcos mais largos; menor altura deixa a forma achatada/oval. As ondas suaves usam transição arredondada nos encontros, sem o vale pontiagudo dos arcos.

A nova geração divide o segmento superior de cada face em partes iguais e usa a mesma altura em todos os arcos. Os pontos de união às laterais e aos vincos são preservados; somente o perfil entre esses pontos muda. O contorno externo e as máscaras das duas faces são atualizados juntos. Fundo, abas, vincos, textos, imagens e ordem de camadas não são reposicionados. O perfil pode voltar de reto para curvo e seus parâmetros são salvos no documento. Moldes existentes não são redesenhados automaticamente: é necessário aplicar o formato escolhido. A operação é atômica e mantém o histórico de desfazer.

Validação: 162 testes aprovados, zero falhas. Testes novos verificam espaçamento e altura uniformes para 1/2/6 arcos em ambas as faces; mudança reta→suave→oval nas duas partes com vértices inferiores, vincos e artes preservados; salvamento/reabertura; recusa de parâmetros inválidos sem mutação; exportação do contorno com 12 ondas para PDF. Sintaxe e diff verificados; build no empacotamento. Conferência visual autenticada e montagem física permanecem pendentes.

## Contraste dos menus e início do painel Elementos

Corrigido o conflito entre os estilos ativos da barra contextual e os menus: ações ativas agora têm texto escuro sobre rosa claro, em vez de texto branco sobre fundo branco/claro. Estados normais, hover, foco e exclusão recebem cores explícitas dentro do menu, mantendo o restante da barra.

Menus rápidos usam o mesmo grupo nativo de details e uma proteção de compatibilidade por evento toggle. Ao abrir um, os anteriores fecham, inclusive entre a barra e Exportar e mais. Os comandos existentes foram preservados.

Ao abrir qualquer painel lateral, sua rolagem é reiniciada no topo, inclusive após o próximo quadro de layout. Elementos abre na busca e no bloco Cores, sem herdar a posição inferior de outro painel. Desativado o ancoramento automático de rolagem no corpo do painel.

Validação: 162 testes existentes aprovados, zero falhas; checagem direta da função openPanel confirma scrollTop=0 ao abrir Elementos; verificação do manipulador toggle confirma que o menu anterior fecha e o novo permanece aberto; JavaScript, CSS e diff verificados. Build no empacotamento. A conferência visual autenticada permanece pendente.

## Abertura entre os arcos da borda

Adicionado Abertura entre curvas (mm), com precisão de entrada de 0,01 mm, no controle de formato superior do cachepô. Valor zero mantém o perfil anterior. Valor positivo cria entalhe em V entre os arcos, cortando somente suas extremidades ao longo da mesma curva parametrizada: não achata nem redimensiona os arcos definidos pela quantidade e altura atuais.

A largura é a distância entre as duas pontas do vão. Dentro de uma face, o corte simétrico preserva a mesma elipse/onda dos trechos restantes. Na união de faces com eixos diferentes, um cálculo geométrico ajusta os recuos para obter a distância solicitada sem mover o vértice do vinco. Mantidos os pontos de união, partes inferiores, vincos, textos e imagens. As máscaras e o corte externo continuam sendo atualizados juntos. Parâmetro salvo no documento; desenhos existentes não são alterados sem aplicar o formato. Vãos incompatíveis com a largura dos arcos são recusados atomicamente. Borda reta não usa abertura.

Validação: 164 testes aprovados, zero falhas. Casos novos verificam vão de 4,51 mm nas duas partes, dentro de cada face e na união, equação da elipse preservada nos pontos remanescentes, persistência no salvamento, equivalência do valor zero e recusa de valores inválidos/abertura excessiva sem mutação. Sintaxe e diff verificados; build no empacotamento. Conferência visual autenticada e prova física continuam pendentes.


## Revisão do vão curvo e menu de contexto

- Removidas as ligações retas em V da abertura da borda do cachepô. Transições quadráticas seguem a tangente do arco e a normal da face no encontro, inclusive na união inclinada das faces. Altura e núcleo elíptico são preservados; a abertura controla a largura das transições. Valor zero mantém o perfil anterior.
- Clique direito seleciona imagens, textos, formas e linhas, mesmo fora de uma face ou com a ferramenta de áreas ativa. O menu usa as ações compartilhadas existentes; recorte e IA aparecem somente para imagens. Elementos bloqueados mantêm a proteção.
- Verificação: suíte automatizada (164 testes), sintaxe e compilação. Teste geométrico cobre as duas partes do cachepô, largura de 4,51 mm, transições não retas, altura, núcleo oval, vincos/artes inalterados e persistência.
- Limites: não foi feita validação visual autenticada dos menus nem prova física de corte/montagem nesta revisão.

## Borda padrão por quantidade de arcos

- Diagnóstico: o vão alterava somente uma pequena transição de meia elipse, mantendo as extremidades quase verticais. Isso não reproduzia os arcos rasos desenhados pelo usuário sobre a linha inclinada da face.
- Novo padrão circular: cada arco é um segmento de circunferência completo, com inclinação calculada na base da própria face e altura automática (16% da menor largura dos arcos, limitada a 20 mm). Sem recorte em V e sem transições de meia elipse.
- Interface: altura e vão removidos. Quantidade e acabamento aplicam imediatamente; botão Aplicar padrão converte bordas antigas explicitamente. Reta e ondas suaves permanecem disponíveis. Documentos anteriores mantêm seus parâmetros e pontos até uma edição deliberada; não há migração de dados.
- Validação: 166 testes aprovados; casos novos verificam raio constante até as extremidades, encontros na linha inclinada, contagem 1/2/4/12 nas duas partes, persistência, conversão idempotente e preservação de artes, vincos e vértices inferiores. Conferência visual de gráfico gerado diretamente das coordenadas novas com 1 e 4 arcos por face; não equivale a teste do editor autenticado. Prova impressa continua pendente.
