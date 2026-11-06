# Moldaê — etapas de implementação

## Entrega atual: fase A

Site estático independente, reaproveitando o MVP fornecido. HTML, CSS e JavaScript sem dependências de compilação. Catálogo demonstrativo de nove produtos. Nenhum endpoint de pagamento, autenticação ou download é exposto. Conta e administração são prévias identificadas. O carrinho e favoritos usam armazenamento local; não representam registros comerciais.

As rotas são navegadas por fragmento (`/#/moldes`) nesta fase. Os caminhos públicos também são reconhecidos pelo roteador quando a hospedagem fornece fallback para index.html. Não depende de fallback para a navegação principal. Rotas de categorias por ocasião, festa, tema e tipo convergem ao mesmo catálogo. Filtros combináveis: categoria, tema, tipo, formato, preço e busca; ordenação por nome e preço.

## Fase B: D1 e R2 do Sites

Aplicar migrations/0001_initial.sql somente depois de vincular o banco D1. Não há dados pessoais ou contas administrativas no seed. `previews/` conterá prévias públicas; `digital-products/` conterá arquivos privados. Implementar autenticação pública independente de conta ChatGPT, sessões HttpOnly/Secure/SameSite e validação de role no servidor. Visitantes não poderão atribuir role ou consultar pedidos de terceiros. CRUD, arquivos e permissões ainda não estão implementados.

## Fase C: Mercado Pago Checkout Pro

Preços e cupons são recalculados exclusivamente no servidor, em centavos. Criar pedido pendente e snapshots de itens em transação; confirmar pagamento por webhook assinado e consulta ao provedor, comparando referência, valor e moeda. Registrar eventos únicos por provedor/evento. Retorno da URL nunca muda status. Credenciais ficam em segredos de runtime. Integração ainda não implementada; não há cobranças nesta versão.

`GET /api/download/:fileId` deverá exigir sessão, pertencimento do pedido, status pago e vínculo entre arquivo/produto/item. Entrega privada controlada; negar estornos, pendências e arquivos de outro usuário. Não colocar originais no dist ou em URLs permanentes.

## Lançamento

Antes de vendas: produtos e arquivos reais, identidade comercial e canais, políticas revisadas, autenticação pública, CRUD persistente e compra sandbox completa com testes de idempotência, cupom, autorização e estorno. Manter site privado e salvar a primeira versão para revisão conforme o projeto.
