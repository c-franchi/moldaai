# Estúdio — primeira etapa

Entrada: `#/admin/estudio`. Reutiliza o menu e a autorização administrativa. APIs sob `/api/admin/studio/` são verificadas no servidor e exigem mesma origem nas mutações. D1 mantém templates, assets e snapshots aprovados; R2 mantém imagens privadas e imutáveis. Nada deste módulo ativa checkout, publica produtos ou altera pedidos.

## Conteúdo e limites

- Caixa Bala é **piloto demonstrativo**, não uma extração da página 5 do Canva. Aprovação bloqueada no servidor. A conversão fiel exige exportar a referência e conferir contornos, escala e montagem.
- Tag nativa: 60 × 40 mm em A4 vertical; arte pronta: A4 horizontal. A escala da folha não comprova as dimensões de um molde rasterizado.
- Artes PNG/JPG até 8 MB, 20 megapixels, 24 arquivos por template e 64 camadas; até 24 campos de nome/idade.
- Escolha de áreas por clique no molde ou botões. O envio aplica a imagem à face escolhida; a miniatura permite reutilizar a arte em outras faces. O formulário é capturado antes de bloquear os controles, preservando o arquivo selecionado.
- Multiseleção por clique ou teclado, com selecionar todas/limpar e contador. “Selecionar áreas” permite marcar inclusive faces já cobertas por imagens; “Mover camadas” libera o arraste dos elementos. Aplicação em lote usa `imageLayersForAreas`, compartilhado por todas as estruturas registradas: repete a arte em cada área ou mantém uma composição contínua, com arte inteira/preenchimento. Cada cópia preserva o recorte da sua área; a configuração resultante é salva nas posições das camadas. Seleção vazia, área desconhecida e excesso de camadas são rejeitados antes de qualquer aplicação parcial. Novos moldes ainda exigem cadastro e validação da geometria; não há identificação automática de arquivos arbitrários.
- O limite de inspeção multipart do Vinext está em 9 MB para acomodar a imagem de 8 MB e seus cabeçalhos. As APIs continuam aplicando os limites próprios. O teste visual cobre envio de PNG de 2,3 MB, aplicação às faces 3/4 e salvamento.
- Preview SVG e PDF vetorial usam o mesmo modelo em mm, cor, clipping por face e fonte Open Sans incorporada (licença em `public/fonts/LICENSE.txt`). PDF produzido no Worker com pdf-lib/fontkit, sem navegador ou servidor Python.
- Campos reduzem a fonte até o mínimo; textos ainda grandes são rejeitados. O PDF inclui marca de teste e quadrado de 10 × 10 mm.
- PATCH exige revisão. Aprovação exige revisão atual e declaração de impressão/teste físico. Snapshots guardam título, tema, referência, documento e nota de validação; não há edição/exclusão de snapshot nem de arte referenciada.
- PDFs são downloads administrativos de teste gerados sob demanda, sem arquivo público. Geração após pagamento, associação comercial e entrega individual por pedido permanecem para outra etapa.

## Validação

`npm test` cobre acesso, origem, revisão concorrente, isolamento de assets, imagens inválidas, snapshots imutáveis, bloqueio do piloto, PDF A4 e nomes com acentos/overflow. `tsc --noEmit` e build Sites verificam o bundle. Confira também a interface no preview e renderize o PDF de teste antes de publicar.

## Regiões da Caixa Bala

O piloto mantém os contornos originais do próprio piloto e agora oferece 20 regiões independentes: quatro pontas superiores, quatro dobras superiores, quatro painéis centrais, quatro dobras inferiores e quatro pontas inferiores. A aba de colagem é uma região opcional adicional. Os vazios dos recortes não são selecionáveis. O modelo original do Canva ainda não foi convertido. `artAreas` é compartilhado entre seleção, posicionamento, validação e recorte do PDF. Os IDs antigos de face inteira continuam válidos para templates e versões já salvos.

O painel de imagens mostra miniatura, região e nome do arquivo, com exclusão individual da aplicação e desfazer a última exclusão. A arte enviada e as versões aprovadas são preservadas. A alteração da montagem só se torna persistente ao salvar o rascunho. O limite passou a 64 aplicações (até 24 arquivos distintos) para permitir decorar todas as regiões.

## Elementos livres
Em “Adicionar imagem como”, Elemento livre insere uma única camada proporcional no centro da primeira área selecionada (ou primeira face). Pode atravessar faces e é recortada pela união do molde e aba de cola tanto na prévia quanto no PDF. Fundos continuam usando seleção múltipla, repetição e composição contínua.
Selecione na folha ou lista, arraste para mover e use o canto inferior direito para redimensionar proporcionalmente. Posição e tamanho em mm permitem ajuste preciso. Duplicar, trazer à frente, enviar ao fundo e excluir atuam nas camadas de imagem; nomes/idades continuam acima das artes. Salvar rascunho persiste a montagem.

## Editor com salvamento automático
Alterações de título, tema, geometria e camadas geram uma cópia JSON síncrona no navegador e uma gravação com debounce de 1 segundo. As gravações são serializadas e usam a revisão otimista da API; respostas atrasadas só atualizam a revisão, sem substituir edições em andamento. Falhas de rede preservam a cópia local, tentam novamente e retomam ao voltar a conexão. Um conflito 409 interrompe a sincronização. Ao reabrir, uma cópia com a mesma revisão é recuperada automaticamente; uma cópia divergente exige escolha explícita entre recuperar e manter o servidor. Sem acesso ao armazenamento local, o estado informa a falha. A cópia local não substitui o servidor e depende dos dados deste navegador não serem apagados.

O editor ocupa a tela, com barra Molde/Artes/Texto/Camadas/Posição. Painéis recolhíveis, folha com zoom e réguas em mm. O zoom não altera dimensões de impressão. A lista unifica imagens e campos de texto, em ordem inversa à ordem de pintura; alças aceitam mouse/toque e setas do teclado. Posição oferece frente/fundo, avanço/recuo, duplicação, coordenadas e rotação. A alça circular gira o objeto; Shift encaixa em intervalos de 15°. Fontes Sans, Clássica, Elegante Itálica e Caligráfica são empacotadas localmente e incorporadas ao PDF. Licenças acompanham os arquivos em public/fonts.

Geometria `candy-closed` adiciona dobras retangulares integrais (45 × 24 mm), mantendo corpo (45 × 48), pontas (45 × 16), posições e IDs de áreas. `candy-lab` preserva a geometria anterior, inclusive versões aprovadas e documentos salvos. A troca é explícita no painel Molde; ambas continuam experimentais até impressão e teste físico. Aprovações antigas continuam imutáveis.

## Medidas e desenho vetorial
O formato original com estreitamento (`candy-lab`) permanece disponível e é a primeira opção para novos moldes. Medidas opcionais `dimensions` ajustam origem, largura de cada face, altura do corpo, altura de cada dobra/ponta, entrada do recorte e aba de cola. São restritas à folha A4 e preservam os IDs das áreas. O painel Molde permite valores em mm e alças de largura, altura e estreitamento. As artes mantêm suas coordenadas, portanto devem ser conferidas após alterar o contorno. Medidas anteriores ficam no histórico de desfazer durante a sessão; nenhuma aprovação física é presumida.

Desenho adiciona retas, curvas quadráticas e retângulos, com função de corte/vinco/decoração, espessura em mm, cor e pontos normalizados editáveis. As formas participam da ordem das camadas e são vetores no PDF. Ocultar linhas originais remove somente as linhas estruturais da impressão, sem remover artes ou redefinir seus recortes. Para desenhar um molde inteiramente livre, use a estrutura Arte A4. Esta etapa não importa SVG/CDR nem exporta formatos de máquinas de corte, e não oferece operações booleanas entre formas.

Texto livre (`key: static`) complementa nome e idade dinâmicos. Bloqueio impede mover/redimensionar/girar/excluir a camada. Encaixe de 1 mm é opcional. Desfazer/refazer mantém até 50 estados do documento nesta sessão; cada gesto de arraste é uma etapa. Os botões da barra e Ctrl+Z/Ctrl+Y fora de campos editáveis controlam esse histórico.

Avisos têm botão Fechar. Configurações de texto identificam o campo e oferecem “Ajustar campos de texto” para corrigir tamanho mínimo e altura, sem remover conteúdo ou rotação. Uma tolerância de 0,01 pt evita rejeição apenas por arredondamento. Erros de validação local recebem status 400 e não são repetidos pelo temporizador de falhas de rede; a próxima edição ou ação de salvar tenta novamente. Na recuperação local, limites de texto são normalizados antes de validar a cópia, permitindo recuperar o trabalho que estava bloqueado por esse erro.

## Precisão, atalhos e medição
“Encaixar pontas” vem ativado. Ao mover um nó, ele procura vértices e segmentos do contorno, vincos e outras formas (a forma em edição é excluída). Pontas têm prioridade; segmentos recebem projeção, e curvas usam amostragem em 24 trechos. A tolerância acompanha o zoom (9 pixels); Alt suspende o magnetismo durante o gesto. O marcador azul confirma a posição encontrada. O encaixe é de posição, não cria vínculo permanente entre camadas. Pontas agora podem ultrapassar o retângulo original da forma; o retângulo e os pontos normalizados são recalculados preservando os outros nós e a rotação.

Em Posição, Estilo da linha permite Contínua, Tracejada e Pontilhada independentemente da função Corte/Vinco/Decoração. Documentos antigos sem estilo explícito mantêm vinco tracejado. O PDF aplica espessura e padrão nas unidades locais do caminho SVG, pois sua transformação já converte mm para pontos.

Fora de inputs, selects, textarea e conteúdo editável: Delete/Backspace remove o elemento selecionado; Ctrl+Z desfaz, Ctrl+Y/Ctrl+Shift+Z refaz; setas movem 0,1 mm e Shift+setas 1 mm. Funcionam após seleção pela folha ou pela lista, sem exigir foco no SVG substituído pela prévia. Camadas bloqueadas continuam protegidas. Campos de texto mantêm o comportamento nativo de edição. Nas alças de ordenação, setas continuam reordenando a lista.

“Medir 2 pontos” mede a distância reta e diferenças horizontal/vertical em mm. Dois cliques fixam a medida, o próximo inicia outra; Limpar ou Esc encerra a consulta. Usa o mesmo encaixe e pode medir entre pontos livres. Essa régua é temporária: não altera o documento, não gera autosave nem aparece no PDF. Durante a medição, Delete limpa a consulta e as setas não movem uma camada oculta.

## Copiar e colar elementos
Ctrl+C/Ctrl+V (ou Cmd no macOS) usa os eventos nativos de área de transferência para copiar o elemento selecionado na folha ou na lista. Cada colagem recebe um ID próprio, fica à frente da composição e desloca 2 mm a mais em relação à cópia anterior, limitada à folha. Preserva fonte, conteúdo, dimensões, rotação, cor, espessura, estilo e pontos; a nova camada fica desbloqueada. Colagens entram no histórico e no autosave.

Inputs, selects, textarea e campos editáveis mantêm a cópia e a colagem nativas de texto. O payload de objeto usa formato identificado, origem do site e validação do documento; imagens só são coladas no template de origem e quando o arquivo está entre as artes desse template. Não duplica uploads ou altera o original. Textos e formas podem ser colados em outro template compatível. Limites de camadas e de tamanho da folha continuam validados antes de alterar o rascunho.

### Seleção e agrupamento
- Arraste no espaço vazio ou use **Seleção por arraste** para envolver elementos num retângulo. Apenas elementos inteiramente contidos são selecionados; grupos existentes são selecionados por completo.
- **Shift+clique** acrescenta/retira elementos; **Ctrl+A** seleciona todos os elementos editáveis. Campos de texto mantêm os atalhos nativos.
- **Agrupar / Ctrl+G** e **Desagrupar / Ctrl+Shift+G**. O identificador de grupo é validado e preservado pelo autosave e pelas versões.
- Arrastar ou usar setas move o conjunto pelo mesmo deslocamento, inclusive nos limites da folha, preservando as conexões das linhas e a geometria relativa.
- Ctrl+C/V e Duplicar clonam toda a seleção com IDs e grupos independentes. Delete exclui a seleção; Ctrl+Z restaura a operação. Bloquear atua no grupo completo.
- Para editar medidas, rotação ou pontos individuais, desagrupe primeiro. As linhas estruturais originais continuam sob os controles de geometria do molde; o agrupamento atua nas camadas editáveis adicionadas.

### Pacote de entrega e preparação do produto
- `PDF com guia` usa a revisão salva para gerar o molde A4 sem alterar coordenadas, mais uma página de instruções com diagrama de corte, vinco e abas. Neste MVP, o guia de montagem atende Caixa Bala; outras estruturas retornam mensagem explícita.
- `Preparar produto` recebe nome, preço e a opção de arquivo sem nome/idade (padrão) ou com valores do teste. Cria um rascunho comercial com PDF privado e instruções; capa e ativação seguem o editor de produtos existente.
- A origem fica preservada como snapshot privado em R2: `studio-products/{product_id}/{product_file_id}-source.json`, incluindo documento, revisão, personalização e regras. O ID determinístico do produto inclui template e revisão, tornando a preparação idempotente. Edições futuras do template não alteram arquivos anteriores.
- Não aprova montagem física nem ativa pagamentos. A personalização pós-pagamento é feita pela área Meus moldes, usando a origem preservada desta revisão; o PDF base enviado para product_files é técnico e não é liberado ao comprador de produtos personalizados.
- `productionRules` reconhece duas abas opcionais das pontas apenas quando há um conjunto de três retas de corte conectado ao lado esquerdo da respectiva ponta (tolerância 0,6 mm). Só no PDF de entrega a aresta de união passa de corte a vinco. O documento do usuário permanece intacto. Linhas avulsas ou conjuntos incompletos não recebem essa interpretação.
- Testes cobrem permissão, revisão concorrente, preço, idempotência, snapshot, PDF de duas páginas e preservação da geometria. O arquivo original de teste continua disponível em Molde.

### Área de membros e personalização por compra
- `#/minha-conta` / `#/minha-conta/perfil`: dados da identidade ChatGPT, atalhos para pedidos e Meus moldes. O ícone de usuário fica visível também no cabeçalho móvel; o menu móvel tem o mesmo acesso. Não há pilha de senhas separada.
- `#/minha-conta/moldes` (alias `downloads`) usa `GET /api/me/purchases`: apenas itens da identidade autenticada. Pagamentos pendentes não liberam formulário nem download.
- `POST /api/me/purchases/:item/personalize` exige proprietário, pedido `paid`, nome válido e `confirmed: true`. Renderiza usando snapshot do momento da compra, com nome/idade nas posições do template e guia de montagem. Não aceita indicador de pagamento do navegador.
- `product_personalization_sources` referencia snapshots privados imutáveis; `order_item_sources` captura essa referência por trigger quando o item é criado. O produto já preparado na versão anterior é associado ao seu snapshot por migração. Edições futuras não alteram a origem dos pedidos existentes.
- O PDF é gravado antes da confirmação única em `item_personalizations`, cuja chave primária é o item comprado. INSERT condicionado ao pagamento atual decide concorrência; o arquivo temporário perdedor é removido. O mesmo nome/complemento retorna a confirmação existente sem gerar novamente; escolhas diferentes retornam 409. Falha de geração/gravação não consome a confirmação.
- `GET /api/me/purchases/:item/pdf` verifica proprietário e pagamento em cada download, inclusive após reembolso/cancelamento. Compradores de itens personalizáveis não recebem os PDFs técnicos via `/api/download` nem pela lista de arquivos comuns.
- O cliente pode baixar o mesmo PDF novamente, mas não alterar nome ou complemento. Uma nova compra tem seu próprio item e sua própria personalização. A quantidade atual no carrinho é um item por produto.
- Checkout e webhooks continuam desativados. A integração futura deve criar pedidos/itens autenticados e mudar `orders.status` para `paid` somente após conferir o evento e o valor com o provedor. Nenhuma compra/pagamento de teste é inserida em produção.
- Testes isolados cobrem estado pendente, conta de outra pessoa, nome inválido, confirmação, repetição, mudança de nome/idade, concorrência, falha de armazenamento, snapshot de compra e revogação após reembolso. QA visual usa compras fictícias em fixture local removida antes da publicação.

### Galeria da vitrine
`Retirar da vitrine` marca a imagem como oculta, preservando arquivo e cadastro. Só o painel administrativo recebe as imagens ocultas e permite restaurá-las; catálogo, galeria pública e biblioteca de compras usam apenas imagens visíveis. Não é permitido usar imagem oculta como capa. Ao retirar a capa, outra imagem visível passa a ser capa; retirar a última imagem retorna o produto a rascunho. Retirar imagens antigas mantendo uma capa correta conserva o produto ativo. Desativação dos arquivos digitais mantém o comportamento anterior de retornar a rascunho.
