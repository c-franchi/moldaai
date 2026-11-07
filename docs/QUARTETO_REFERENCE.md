# Referência de navegação — Quarteto Kids

Inspecionado o código do Site Quarteto Kids versão 170, commit 4cf05f19f3d6cddb25a3f05b6707b8f4e3a0d486, em modo de leitura. Fontes: src/routes/_authenticated/admin/route.tsx, src/components/ui/sidebar.tsx e src/components/admin/AdminUI.tsx. Nenhuma alteração foi feita naquele projeto.

## Padrão adaptado

- Menu fixo no computador, recolhível para ícones, com item ativo e nomes acessíveis.
- Menu móvel sobreposto com bloqueio de foco no painel e fechamento por navegação, Escape, botão ou fundo.
- Grupos Visão geral, Catálogo e Loja; marca acima, conta e saída abaixo.
- Cabeçalho fixo, ação Novo molde, cartões de resumo e atalhos rápidos.
- Identidade própria coral/rosa do Moldaê e alvos de toque de 44px.

## Recursos aproveitados nesta entrega

Filtros de cadastro por situação, contador de rascunhos no menu e visão geral dos arquivos digitais. Todos usam os endpoints existentes e respeitam a autorização administrativa já implantada. Nenhum arquivo original virou público.

## Próximas oportunidades

| Recurso do Quarteto Kids | Adaptação ao Moldaê | Etapa sugerida |
| --- | --- | --- |
| Página inicial e banners editáveis | Escolher destaques, texto do hero e coleções sem editar código | Próxima implementação |
| Biblioteca de imagens | Reaproveitar capas e mockups por coleção, sem misturar originais privados | Após organizar produtos reais |
| Dashboard por período e indicadores | Pedidos pagos, receita, ticket médio e downloads autorizados | Após Mercado Pago |
| Cupons | Percentual/valor fixo com validade e limites | Junto do checkout real |
| Depoimentos e avaliações | Avaliação vinculada à compra confirmada | Após vendas reais |

Entrega rápida, frete, estoque físico e envio não se aplicam a uma loja exclusivamente digital. Recursos de indicação, raspadinha e marketplaces não foram incorporados nesta etapa.

## Validação

Revisão do layout e das interações em navegador com fixtures locais sintéticas, sem gravação no servidor. Testados menu expandido/recolhido, navegação entre seções, filtro de rascunhos, retorno à vitrine e menu móvel em viewport de 390px. Formulário móvel sem overflow horizontal. Fixtures removidas antes de build e publicação. Backend e permissões não sofreram alteração nesta entrega.
