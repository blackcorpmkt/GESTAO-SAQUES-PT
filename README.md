# Gestão de Saques

Aplicação web para controle de recebimentos de uma operação de vendas em Portugal via gateway de pagamento.

## Funcionalidades

- **Dashboard** — cards com total a receber, total recebido, próximo recebimento e cotação EUR/BRL em tempo real
- **Lançamentos** — cadastro de vendas diárias com cálculo automático de D+3 dias úteis e valor líquido
- **Relatório** — geração de texto formatado para envio ao financeiro, com cópia e exportação .txt
- **Configurações** — taxa do gateway, nome do relatório, cotação manual e backup/importação JSON

## Regras de negócio

- **D+3 dias úteis**: conta apenas dias de semana (segunda a sexta) a partir da data da venda
- **Taxa do gateway**: 32,25% por padrão (configurável)
- **Cotação EUR/BRL**: busca automática via `api.frankfurter.app`, com fallback para cache e cotação manual
- **Persistência**: 100% no `localStorage` do navegador, sem backend

## Como rodar

```bash
npm install
npm run dev
```

Acesse `http://localhost:5173`

## Build para produção

```bash
npm run build
npm run preview
```

## Cores dos lançamentos na tabela

- **Azul**: recebimento hoje ou amanhã
- **Vermelho**: vencido (data de recebimento já passou, ainda pendente)
- **Âmbar**: demais pendentes
- **Cinza**: recebido

## Estrutura

```
src/
  components/    # Dashboard, LancamentoForm, LancamentosTable, Relatorio, Configuracoes, Toast
  hooks/         # useCotacao, useLancamentos, useConfig, useToast
  utils/         # calculos, formatacao, relatorio, storage
  types/         # interfaces Lancamento, Config, Toast
```
