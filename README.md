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

## Como publicar alterações

Qualquer alteração enviada para a branch `main` é publicada automaticamente via GitHub Actions (workflow **Publicar site**). Basta fazer commit e `git push`.

## Tecnologia

Site estático (HTML, CSS e JavaScript puro), sem build. Dados da loja e pedidos ficam salvos no navegador (localStorage). Fontes e bibliotecas são hospedadas localmente, então o site funciona offline após o primeiro acesso.