# Doce Encanto · Confeitaria Artesanal

Loja online completa para confeitaria: cardápio com fotos, carrinho, checkout com entrega/retirada, cupons de desconto, acompanhamento de pedidos e painel administrativo com gestão total da loja.

## Acesso ao painel

- Endereço: `#/admin` (botão "Área do administrador" no rodapé do site)
- PIN inicial: `1234` — altere em **Configurações › Segurança**

## O que o painel oferece

- **Visão geral**: faturamento, pedidos, ticket médio, itens vendidos, gráfico da semana e mais vendidos
- **Pedidos**: quadro por status (novo → preparo → pronto → entrega → concluído), impressão de comanda
- **Cardápio**: criar, editar, pausar e excluir produtos, com tamanhos, adicionais, ofertas e destaque
- **Categorias**: criar, renomear e reordenar as seções da loja
- **Cupons**: percentual, valor fixo ou frete grátis, com validade, pedido mínimo e limite de uso
- **Relatórios**: período personalizável com exportação em CSV, Excel e PDF
- **Avaliações**: moderação dos comentários dos clientes
- **Configurações**: identidade da loja, horários, entrega, pagamentos, segurança e backup dos dados

## Banco online (Supabase)

Os pedidos, o cardápio e as avaliações ficam sincronizados na nuvem, então aparecem em qualquer aparelho — inclusive para o administrador. Se a conexão falhar, o site continua funcionando no modo local daquele navegador.

Para ativar (uma única vez):

1. Entre em <https://supabase.com/dashboard> com a conta GitHub `sistemaamiapp-coder`.
2. Abra o projeto `uanrqgnsrfvcxdwtenjy`.
3. Vá em **SQL Editor → New query**, cole todo o conteúdo de `scripts/supabase-setup.sql` e clique em **Run**.
4. Abra o site, entre no painel com o PIN `1234` e o cardápio inicial será publicado automaticamente na nuvem.

O PIN é verificado no servidor. Recomendamos trocá-lo por 6 a 8 dígitos em **Configurações › Segurança**.

## Como publicar alterações

Qualquer alteração enviada para a branch `main` é publicada automaticamente pelo GitHub Pages. Basta fazer commit e `git push`.

## Tecnologia

Site estático (HTML, CSS e JavaScript puro), sem build, com banco online no Supabase para pedidos, cardápio e avaliações. O carrinho e os dados de contato do cliente ficam salvos no navegador. Fontes e bibliotecas são hospedadas localmente, então o site funciona offline após o primeiro acesso.