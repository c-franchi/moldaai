# Criação de imagens no Estúdio

Em Artes → Criar imagem com IA: descrição, referência por arquivo ou imagem da biblioteca, edição por instrução, estilo, formato, fundo transparente/opaco e direção de arte, qualidade máxima e resolução ampliada. O resultado fica em prévia até salvar em Artes, adicionar à área ou substituir a imagem selecionada. A substituição participa do desfazer do documento.

## Configuração de produção

Cadastrar `OPENAI_KEY_SECRET` (ou `OPENAI_API_KEY`, por compatibilidade) como segredo de runtime do Site usando o fluxo seguro de credenciais. A conexão OpenAI Developers não recupera o valor de chaves já existentes. Sem o segredo, a interface informa ativação pendente e o servidor recusa geração sem chamar o provedor.

Modelo padrão: `gpt-image-2.6-sunburst`, complexidade `high`, qualidade `max`, PNG original, uma imagem por pedido. Resolução ampliada: 2048×2048, 2048×3072 ou 3072×2048. A opção padrão usa 1024×1024, 1024×1536 ou 1536×1024. Há seleção explícita do modelo de compatibilidade `gpt-image-1.5`, limitado à resolução padrão e qualidade até `high`; nunca há troca automática de modelo em falhas. `MOLDAE_AI_ENABLED=false` desativa geração. Limites opcionais: `MOLDAE_AI_DAILY_LIMIT` (padrão 5, máximo 20) e `MOLDAE_AI_MONTHLY_LIMIT` (padrão 30, máximo 100). Os limites são globais do Site e seguem o horário de São Paulo; contam tentativas, incluindo falhas e descartes, e não representam orçamento monetário.

Cada pedido exige confirmação de envio e cobrança. Reservas atômicas serializam chamadas pagas e limitam consumo. O identificador do pedido é idempotente; não há repetição automática da chamada ao provedor. Em queda de conexão, a interface consulta o mesmo pedido. Pedidos interrompidos expiram após cinco minutos (a chamada tem timeout de quatro minutos) e permanecem contabilizados. Prompts e referências não são gravados no histórico de trabalhos; prévias e imagens aceitas ficam no armazenamento privado. Descartar uma prévia remove seus bytes. Imagens salvas usam as proteções normais de exclusão de Artes.

Os endpoints exigem administrador, origem válida nas escritas, imagem de referência pertencente ao molde ou upload decodificável, limites de tamanho e acesso ao trabalho pelo administrador que o criou. Segredos e erros internos do provedor não são retornados ao navegador.

## Validação

Testes automatizados usam respostas simuladas, sem custos reais. Cobrem configuração, permissões, confirmação, geração, edição, referência, prévia, salvamento idempotente, descarte, quota, concorrência e falhas. Verificação visual do formulário, prévia e edição foi feita com um provedor simulado local. A geração real requer chave válida e acesso ao modelo e não foi executada.

## Saldo e consumo

Artes → Saldo e consumo da API abre um painel administrativo com custo estimado de cada imagem, consumo desta arte, total do mês e total registrado no Moldaê, além do histórico dos últimos 50 pedidos (desta arte ou de todas). A janela de geração também mostra o custo ao concluir e dá acesso ao painel.

A resposta `usage` é persistida no servidor antes de validar/salvar os bytes. O cálculo usa tarifas por modelo, verificadas em 2026-11-18: GPT Image 2.6 Sunburst com texto de entrada US$ 5/M, imagem de entrada US$ 8/M e saída de imagem US$ 30/M; GPT Image 1.5 mantém saída de imagem US$ 32/M. Valores históricos persistidos não são recalculados após mudar o modelo. São estimativas, sem impostos, descontos ou eventuais benefícios de cache. Ausência de dados válidos permanece como custo desconhecido; não é convertida em zero. Pedidos anteriores à implementação não têm consumo retroativo recuperável. Descartar/salvar/reabrir uma imagem não duplica nem remove sua despesa. Não se fazem chamadas pagas para consultar estes dados.

A integração atual não consulta saldo pré-pago da OpenAI. O administrador pode informar o saldo em USD que consta no painel oficial e, opcionalmente, a cotação USD/BRL. O saldo de referência é reduzido pelos custos registrados após a atualização. Atualizar o saldo cria uma nova base sem apagar o histórico nem o total acumulado. Gastos de outros apps, tentativas sem usage, taxas e mudanças de preço podem causar divergências. Os rótulos identificam saldo manual e custos estimados. A recarga é feita na página oficial da OpenAI, acessível por link; salvar o saldo no Estúdio não compra créditos.

Tabelas aditivas `studio_ai_costs`, `studio_ai_render` e `studio_ai_balance` são inicializadas com CREATE TABLE IF NOT EXISTS; não alteram registros existentes. Rotas `GET /api/admin/studio/ai/finance?template=<id>` e `PUT /api/admin/studio/ai/balance` reutilizam autorização administrativa e proteção de origem do módulo. Valores e tamanho do corpo são validados no servidor. Segredos não entram no histórico nem nas respostas.

## Acabamento e impressão

O formulário inclui composição (elemento inteiro, moldura com centro livre, cena ou descrição livre), paleta, detalhes obrigatórios e elementos a evitar. O prompt completo, montado pela mesma função no cliente e servidor, pode ser conferido antes da cobrança. Em referência e edição, a direção preserva os traços não alterados; o Estúdio não recebe contexto das conversas no ChatGPT. Preferir arquivos originais em vez de fotos de tela. Nenhum modelo ou parâmetro garante perfeição.

A geração registra modelo, qualidade, tamanho solicitado e dimensões reais retornadas. A prévia permite baixar/abrir o PNG original e informa o tamanho aproximado em cm a 300 dpi, sem aumentar pixels nem declarar que uma imagem pequena é adequada para A4. Salvar em Artes não recomprime a imagem. O PDF já incorpora os bytes originais. Saídas PNG de até 16 MB e 20 MP são aceitas; uploads de referência continuam limitados a 8 MB. A API é lida com limite de 24 MB, sem repetição paga automática. Os limites não foram ampliados em outras rotas.

A nova qualidade e o acesso ao modelo foram validados com provedor simulado. O acesso da conta e o acabamento visual de uma geração real ainda dependem da primeira chamada confirmada pelo administrador. Não gerar imagens reais automaticamente para testar, nem voltar silenciosamente a um modelo antigo.

## Downloads e remoção em Artes

Cada miniatura de Artes (uploads ou IA) oferece Baixar imagem e Remover de Artes. `GET /api/admin/studio/assets/:id/download` exige administrador e entrega os bytes originais com Content-Disposition attachment e nome UTF-8 sanitizado, sem recompressão. Remover reutiliza a exclusão administrativa, após confirmação no cliente e sincronização do rascunho. Aplicações na folha e versões aprovadas impedem a exclusão; devem ser preservadas. Cópias de moldes que compartilham o objeto e prévias de gerações salvas retêm seus bytes. Registros de consumo não são excluídos ou estornados ao remover uma imagem de Artes.
