# Arquitetura — fase B

Frontend existente em `store.html` e `public/store.js`, preservando o visual coral/rosa. `public/manage.js` implementa administração, cadastro e conta. A página raiz é servida por Vinext. APIs em `app/api/[...path]/route.ts` usam o serviço `server/api.mjs`.

## Segurança

Sites injeta identidade autenticada; o email proprietário controla a função administrativa no servidor. IDs de usuário são estáveis dentro do Site. O visualizador não recebe privilégios administrativos. Todas as mutações exigem Origin do próprio Site. Não há um endpoint público de seed, importação ou alteração de permissões.

Catálogo retorna somente produtos ativos e metadados de prévias. D1 salva usuários, produtos, relacionamentos, arquivos e pedidos. Arquivos originais em R2 nunca são servidos pelo diretório público. Endpoint de download exige pedido pago, usuário correto e arquivo do produto adquirido; devoluções revogam acesso. Administrador tem rota separada para conferir originais.

Mutações de produto/classificação são agrupadas em batch atômico do D1. Revisão e token de mutação impedem sobrescrita silenciosa e alteração cruzada em edições simultâneas. Upload valida limite e assinatura do arquivo; falha ao gravar metadados remove o novo objeto.

## Migrações

Fonte de verdade: `db/schema.ts` e migrações geradas em `drizzle/` com journal e snapshots. A migração da fase B é o primeiro schema aplicado. O SQL de `migrations/` é um documento histórico não aplicado da fase A e não deve ser executado. Novas mudanças requerem migrações incrementais.

## Pagamentos

`POST /api/checkout` e webhooks retornam indisponível. Não há método administrativo para criar pedido pago. Pedidos reais aparecem somente após implementação do provedor; cenários de compra dos testes usam exclusivamente banco efêmero local.
