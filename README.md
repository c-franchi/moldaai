# Moldaê — Moldes Digitais

Fase A do projeto, baseada no MVP fornecido. **Demonstração sem vendas reais.**

## Executar

`python3 -m http.server 8000 --directory dist`

Abra http://localhost:8000. Não exige instalação de dependências.

## Funcionalidades

- Home coral/rosa com nove moldes ilustrativos.
- Busca com acentos, filtros combináveis de categoria, tema, tipo, formato e preço.
- Produto, favoritos, carrinho local (uma licença por molde), cupom demonstrativo MOLDAE10 e checkout bloqueado para compras reais.
- Informações de conta, pedidos, downloads e administração explicitamente demonstrativas.
- Rotas de termos, privacidade, licenças e contato em preparação, sem identidade comercial inventada.
- Schema SQL preparado para D1; arquitetura R2 e autorização documentadas.

## Rotas

Use `/#/` seguido de moldes, produto/safari, carrinho, checkout, entrar, minha-conta, minha-conta/pedidos, minha-conta/downloads, admin, termos, privacidade, licencas ou contato. Coleções: ocasiao/pascoa, festas/casamento, temas/biblico, tipos/caixinhas.

## Próximas etapas

Veja docs/ARCHITECTURE.md. D1/R2, autenticação pública, administração persistente, Mercado Pago e downloads protegidos ainda precisam ser implementados. Não há Supabase ou compartilhamento de dados com outras lojas. Não publicar como loja operacional.

## Validação

`node --check dist/app.js` valida a sintaxe. A migração é compatível com SQLite/D1; validar em banco novo antes de aplicar.
