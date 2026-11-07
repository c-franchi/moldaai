# Moldaê — loja de moldes digitais

Fase B: catálogo persistente, painel administrativo e arquivos privados, com D1/R2 nativos do Sites. Sem Supabase. Mercado Pago permanece desativado e nenhum pedido é aprovado por formulário ou URL.

## Administração

Abra `/#/admin` autenticado com a conta proprietária configurada no servidor. A autorização é verificada em todas as APIs no servidor. Acesso de visualização não permite editar produtos, enviar arquivos ou conferir originais. A sessão é gerenciada pelo Sites, sem senhas no aplicativo. Os administradores são definidos como uma lista de e-mails separados por vírgula em `MOLDAE_ADMIN_EMAIL` nas variáveis privadas de runtime; não há email administrativo fixo no código.

1. Em Classificações, crie ocasiões, festas, temas e tipos. Os nomes podem ser alterados.
2. Cadastre o molde como rascunho. Informe valores em reais, medidas, conteúdo, formatos, licença e instruções.
3. Após salvar, envie capa e imagens (PNG/JPG/WebP até 8 MB) e originais (PDF/ZIP/SVG seguro/DXF/PNG/JPG até 25 MB; Studio dentro de ZIP).
4. Selecione No catálogo quando o cadastro estiver completo. Isso exibe o produto, sem habilitar compras.
5. Arquivar oculta o produto preservando o cadastro. Desativar um original não apaga seu objeto; retira-o dos downloads e retorna o produto a rascunho.

O catálogo de nove exemplos continua identificado como demonstrativo e não é gravado como produto real. A lista administrativa inicia vazia; preços e licenças reais devem ser definidos pelo responsável.

## Execução

Node 22+, `npm ci`, `npm run db:generate` somente após mudanças de schema e `npm run build`. O starter inclui os helpers Sites de build e preview. Veja `drizzle/` para as migrações geradas e a documentação do starter em `docs/STARTER.md` quando disponível. Não aplique `migrations/0001_initial.sql`: é a proposta histórica da fase visual, substituída pela migração Drizzle nunca aplicada anteriormente.

## Dados e arquivos

`.openai/hosting.json` declara DB (D1) e BUCKET (R2). O deploy aplica as migrações Drizzle. Prévia local e produção têm dados separados. As chaves R2 privadas não são retornadas ao catálogo. Usuários possuem biblioteca e pedidos individuais; downloads exigem compra paga vinculada ao mesmo usuário. O administrador pode conferir arquivos no painel.

## Validação

`npm test` executa testes com D1 e R2 locais: autorização, origem, cadastro e edição, duplicidade, classificação, conflito de revisão, uploads, sigilo de originais, pedidos pendentes/pagos/estornados, isolamento de usuários e arquivamento. `npm run build` gera o Worker.

## Próxima fase

Mercado Pago Checkout Pro, webhook validado e idempotente, reconciliação, envio de e-mail e autenticação do público comprador serão tratados antes da abertura comercial. A loja continua com acesso restrito no Sites e pagamento desativado. Não cadastrar dados de cartão.
