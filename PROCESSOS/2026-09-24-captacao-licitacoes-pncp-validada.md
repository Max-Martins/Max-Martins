# Processo validado — Captação de Licitações PNCP
**Data de validação:** 24/09/2026  
**Responsável pela arquitetura do processo:** Max Marinho  
**Status:** Validado com sucesso em ambiente n8n
## Objetivo
Automatizar a captação e a triagem inicial de oportunidades licitatórias, com foco nos estados de São Paulo, Minas Gerais, Goiás, Paraná e Santa Catarina, reunindo informações para avaliação comercial e gerando um relatório Excel estruturado.
## Arquitetura implementada
O fluxo foi estruturado com múltiplas etapas coordenadas no n8n:
- consulta de fontes oficiais por API do PNCP;
- regras de tratamento, normalização e filtragem das oportunidades;
- priorização por abrangência geográfica e prazo de proposta em aberto;
- geração automatizada do relatório em Excel;
- consulta, seleção, download e salvamento de editais e anexos;
- validação de arquivos binários antes da gravação, evitando falhas causadas por registros sem conteúdo;
- preparação para expansão por conectores e integrações baseadas em MCP;
- remessa automatizada do relatório por SMTP seguro.
## Evidências da validação
A validação do processo confirmou:
1. geração do relatório Excel de oportunidades;
2. filtragem de anexos com conteúdo binário e salvamento bem-sucedido dos arquivos válidos;
3. autenticação segura do canal de e-mail;
4. envio do relatório Excel aceito pelo servidor de mensagens, sem rejeições de destinatários.
## Observação operacional
A automação acelera a triagem e centraliza evidências, mas a decisão de participação continua condicionada à conferência do edital, anexos, habilitação, requisitos técnicos e prazo final de cada processo.
