# Central de Produtos Afiliados — Moldaê

## Diagnóstico e escopo

Base: GPT Sites versão 106, commit aae61d21c00e84c33a16abbaec2ec83cf73567b6. O cadastro original exige arquivos digitais, formatos e licença; não atende compra externa. A central é independente de products, orders, carrinho, pagamentos e Estúdio. Identidade e autorização do servidor foram reutilizadas.

## Funcionalidades

- Menu administrativo: visão geral, produtos, adicionar, marketplaces, categorias, relatórios e configurações.
- Cadastro manual por link: identifica marketplace pelos domínios permitidos e preserva a URL fornecida integralmente; não consulta páginas externas nem contorna bloqueios.
- Produtos: rascunho, ativo, inativo, arquivado, exclusão lógica, edição com revisão, duplicação em rascunho, marca/modelo, descrição, características, categoria, avaliação documentada, preço/promocional de referência, data da conferência, destaque e ordem numérica.
- Galeria: até 12 PNG/JPG/WebP de até 8 MB, upload múltiplo, imagem principal e remoção. Galerias de cópias mantêm IDs independentes; objetos imutáveis podem ser compartilhados sem custos de cópia desnecessários. Fotografias de rascunhos são restritas ao administrador.
- Vitrine /#/recomendados, detalhes /#/recomendados/epson-l3250, busca, filtros, ordenação, relacionados e recomendações em moldes escolhidos no cadastro.
- Links externos com sponsored/noopener/noreferrer; não passam pelo checkout interno. Falha da métrica não impede abrir a loja.
- Relatórios agregados por dia UTC, produto e marketplace. São eventos de clique, não visitantes únicos, vendas ou comissões. Não armazenam IP, nome, e-mail ou cookies.
- Configuração do prazo de preço antigo e aviso de comissão visível. Preços não são apresentados como tempo real.
- Mercado Livre, Amazon, Shopee e Magalu predefinidos; outras lojas podem ser cadastradas com seus domínios. Cadastros em uso não podem ser apagados; desativação oculta ofertas correspondentes. Ausência de integração não impede o cadastro manual.

## Primeiro produto

Epson EcoTank L3250, link exato https://meli.la/1EJzL9T, referência R$ 976,78, avaliação 4,9 da captura. Fotografia: captura original do anúncio fornecida pelo administrador (image(20261121-020616).png); arquivo preservado, com enquadramento apenas visual para exibir a área da fotografia. A data do preço não foi inventada e aparece como não confirmada. Não há afirmação de estoque atual. O cadastro inicial é idempotente e não reaparece após exclusão.

## Integrações

Não há conector de afiliados disponível neste ambiente. Nenhuma conta foi conectada, nenhuma senha/cookie foi solicitada e nenhum token foi criado. O painel informa “Integração automática indisponível”. Integrações oficiais futuras exigem implementação e credenciais autorizadas separadas; o MVP não depende de conta de desenvolvedor ou serviço pago.

## Dados e segurança

Tabelas aditivas affiliate_products, affiliate_refs, affiliate_media e affiliate_clicks, criadas idempotentemente na primeira utilização de cada instância. Não há migração destrutiva. Uploads em R2 no prefixo affiliates. Validação de assinaturas dos arquivos, tamanho, quantidade, URLs HTTPS, credenciais embutidas, portas, domínios e conflitos de revisão. Conteúdo exibido é escapado; prévia valida as URLs antes de criar botões. Todas as mutações exigem origem correta e identidade administrativa verificada pelo servidor.

## Verificações

175 testes na suíte completa, incluindo nove verificações novas (oito de integração D1/R2 e uma de renderização): acesso anônimo/visitante bloqueado no ADM, CSRF, seed idempotente, URL exata, hosts maliciosos, resolução manual, cliques sem pedidos, categorias/lojas, CRUD/conflitos, uploads multipart válidos/inválidos, privacidade de rascunho, duplicação, arquivamento/exclusão, desativação de loja e rotas públicas/administrativas. Sintaxe e git diff --check verificados. Build de produção executado no empacotamento.

Limites: não houve teste visual/interativo em navegador autenticado, dispositivo móvel real ou conferência de atribuição de comissão no marketplace. A responsividade foi implementada com grades fluidas e breakpoint de 700px; o teste de upload multipart não equivale a teste de toque/câmera em aparelho real. Não há integração de vendas/comissões, atualização automática de preço ou verificação automática de elegibilidade dos produtos em programas de afiliados. Links externos são configurados pelo administrador e não são visitados pelo servidor.

## Fontes e sincronização

GitHub c-franchi/moldaai estava em 2f145908aa66194ec52ead2f4b119d75b79a16ad, com sete commits de protótipo/admin inicial e histórico separado do Sites. Nenhum arquivo exclusivo do GitHub ausente no Sites foi encontrado. Foram conferidos os arquivos compartilhados alterados: extensões do schema, novas dependências PDF, limites de upload, navegação e conta, catálogo real em lugar de demonstração e funcionalidades novas do Estúdio. Os scripts diferiam apenas em permissão de execução. Sites permanece a origem principal; a atualização do GitHub deve preservar seu histórico e validar a igualdade das árvores de arquivos, sem force push. A autenticação Git pela linha de comando não está disponível; a sincronização utiliza o conector autenticado quando possível.

## Arquivos

Novos: server/affiliate-api.mjs, public/affiliates.js, public/affiliates.css, public/assets/affiliates/epson-l3250-announcement.png, tests/affiliate-api.test.mjs, tests/affiliate-ui.test.mjs e este relatório.
Integração: server/api.mjs, public/manage.js, public/store.js, public/admin-navigation.js e store.html. Nenhuma alteração nas rotinas de pagamento, autenticação, pedidos, personalização ou geometria dos moldes.

## Importação adicional solicitada — papel Report

Adicionado o produto report-premium-a4-75g-500 (Report Premium A4, branco, 75 g/m², pacote com 500 folhas), na categoria Papéis e Materiais. Seis fotografias originais foram identificadas exclusivamente na galeria do anúncio MLB21590318 / MLB4340413944 e copiadas sem alteração para assets/affiliates/report-a4-01.webp até report-a4-06.webp; fontes registradas no cadastro de importação. O link social completo fornecido pelo administrador é preservado. Preço e avaliação ficam sem valor fixo. A importação é aditiva/idempotente e nunca sobrescreve edições ou exclusões do administrador. Imagens importadas podem ser administradas pelo formulário existente. O cadastro continua independente do checkout interno e não ativa rotina de monitoramento de preço.
