<div align="center">

<img src="./assets/cabecalho.svg" width="100%" alt="Max Marinho · Licitações, automação e IA"/>

<a href="https://www.linkedin.com/in/maxx-marinho/"><img src="https://img.shields.io/badge/LinkedIn-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white" alt="LinkedIn"/></a>
<a href="https://www.instagram.com/maxx.marinho/"><img src="https://img.shields.io/badge/Instagram-E4405F?style=for-the-badge&logo=instagram&logoColor=white" alt="Instagram"/></a>
<a href="https://github.com/Max-Martins?tab=repositories"><img src="https://img.shields.io/badge/Reposit%C3%B3rios-161B22?style=for-the-badge&logo=github&logoColor=white" alt="Repositórios"/></a>
<a href="https://max-martins.github.io/Max-Martins/apoie/"><img src="https://img.shields.io/badge/Apoie%20com%20PIX-2dd4a8?style=for-the-badge&logo=pix&logoColor=white" alt="Apoie com PIX"/></a>

</div>

## Sobre mim

Sou **Analista de Licitação** e trabalho com **compras públicas e automação**. Meu dia a dia é edital, termo de referência, proposta e prazo. Meu foco é tirar o trabalho repetitivo desse ciclo e transformar em fluxo automatizado, auditável e versionado.

- 🎯 **Foco atual:** captação e triagem de pregões pela API do PNCP
- 🛠️ **Construindo:** fluxos em n8n com JavaScript e Python, rodando em Docker
- 🤖 **Explorando:** IA (Claude, Codex, MCP) para ler editais e cruzar itens com tabelas de preço
- ⚖️ **Base:** Lei nº 14.133/2021 e a rotina real de quem participa de licitação

> **Menos tarefa repetitiva. Mais automação. Mais tempo para as decisões que importam.**

---

## Projetos

<table>
<tr>
<td width="50%" valign="top">

<a href="https://github.com/Max-Martins/licitacoes-pncp-ia"><img src="./assets/capa-licitacoes-pncp-ia.png" width="100%" alt="licitacoes-pncp-ia"/></a>

### 📡 licitacoes-pncp-ia
<img src="https://img.shields.io/badge/open_source-MIT-34D399?style=flat-square" alt="open source"/>

Captação de licitações de ponta a ponta: busca no PNCP, filtra, lê o edital com IA, cruza os itens com a sua tabela de preços e entrega Excel, proposta prévia e declarações por e-mail.

- Instalação com 2 cliques (Windows) ou 1 comando (macOS/Linux)
- Adaptável a qualquer ramo, sem programar
- Testado a cada atualização, inclusive no Docker

`n8n` `Python` `Docker` `Claude` `Gemini`

[**Repositório →**](https://github.com/Max-Martins/licitacoes-pncp-ia)

</td>
<td width="50%" valign="top">

<a href="https://github.com/Max-Martins/compras-publicas-mcp"><img src="./assets/capa-compras-publicas-mcp.png" width="100%" alt="compras-publicas-mcp"/></a>

### 🤖 compras-publicas-mcp
<img src="https://img.shields.io/badge/open_source-MIT-34D399?style=flat-square" alt="open source"/>

Servidor MCP que dá à sua IA acesso ao PNCP e ao Compras.gov.br: propostas abertas, itens, documentos, atas, CATMAT e pesquisa de preços, direto da conversa.

- Somente leitura, com fonte e data em cada resposta
- Zero dependências, sem chave de API
- Claude, ChatGPT/Codex, Cursor e VS Code

`MCP` `Node.js` `PNCP` `CATMAT`

[**Repositório →**](https://github.com/Max-Martins/compras-publicas-mcp)

</td>
</tr>
<tr>
<td width="50%" valign="top">

<a href="https://github.com/Max-Martins/pncp-consulta"><img src="./assets/capa-pncp-consulta.png" width="100%" alt="pncp-consulta"/></a>

### 🔎 pncp-consulta
<img src="https://img.shields.io/badge/open_source-MIT-34D399?style=flat-square" alt="open source"/>

Cliente leve em Python para a **API pública do PNCP**: lista licitações com proposta aberta, filtra pelo objeto e exporta para planilha, direto do terminal.

- Zero dependências (biblioteca padrão)
- Paginação automática e novas tentativas
- CSV pronto para o Excel em português

`Python` `API PNCP` `CLI`

[**Repositório →**](https://github.com/Max-Martins/pncp-consulta)

</td>
<td width="50%" valign="top">

<img src="./assets/capa-profile-cards.png" width="100%" alt="Profile Cards: painéis do perfil desenhados por código próprio"/>

### 📊 Profile Cards
<img src="https://img.shields.io/badge/status-automatizado-0066ff?style=flat-square" alt="automatizado"/>

Gerador próprio dos painéis deste perfil. Coleta os dados pela **API GraphQL do GitHub** e desenha os SVGs de métricas, sequência, atividade e conquistas, sem serviços de terceiros.

- Python puro (biblioteca padrão)
- Atualização diária via GitHub Actions

`Python` `GraphQL` `SVG`

[**Código →**](./scripts/generate_cards.py)

</td>
</tr>
</table>

---

## Automação no ciclo da licitação

Onde cada ferramenta entra, do edital publicado ao pós-contrato:

```mermaid
flowchart LR
    A["📡 Captação<br/>API PNCP"] --> B["🔎 Triagem<br/>filtros + IA"]
    B --> C["🧠 Análise<br/>IA sobre edital e TR"]
    C --> D["💰 Proposta<br/>tabela de preços"]
    D --> E["📦 Pós-contrato<br/>atas · empenhos · faturamento"]

    classDef done fill:#2dd4a8,stroke:#2dd4a8,color:#071018
    classDef next fill:#0d1117,stroke:#3b82f6,color:#ffffff
    class A,B,C,D done
    class E next
```

<sub>🟩 já automatizado no <a href="https://github.com/Max-Martins/licitacoes-pncp-ia">licitacoes-pncp-ia</a> &nbsp;·&nbsp; 🟦 próximo passo</sub>

---

## Stack

<div align="center">

<img src="https://img.shields.io/badge/n8n-EA4B71?style=flat-square&logo=n8n&logoColor=white" alt="n8n"/>
<img src="https://img.shields.io/badge/Python-3776AB?style=flat-square&logo=python&logoColor=white" alt="Python"/>
<img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black" alt="JavaScript"/>
<img src="https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white" alt="Docker"/>
<img src="https://img.shields.io/badge/GitHub_Actions-2088FF?style=flat-square&logo=githubactions&logoColor=white" alt="GitHub Actions"/>
<img src="https://img.shields.io/badge/API_PNCP-0066FF?style=flat-square" alt="API PNCP"/>
<img src="https://img.shields.io/badge/MCP-6B4FBB?style=flat-square" alt="MCP"/>
<img src="https://img.shields.io/badge/Claude-D97757?style=flat-square&logo=anthropic&logoColor=white" alt="Claude"/>
<img src="https://img.shields.io/badge/Excel-217346?style=flat-square&logo=microsoftexcel&logoColor=white" alt="Excel"/>
<img src="https://img.shields.io/badge/Lei_14.133%2F2021-FF6B00?style=flat-square" alt="Lei 14.133/2021"/>

</div>

---

## GitHub em números

<div align="center">

<img src="https://raw.githubusercontent.com/Max-Martins/Max-Martins/metrics/stats.svg" width="100%" alt="Estatísticas do GitHub"/>
<img src="https://raw.githubusercontent.com/Max-Martins/Max-Martins/metrics/streak.svg" width="100%" alt="Sequência de contribuições"/>
<img src="https://raw.githubusercontent.com/Max-Martins/Max-Martins/metrics/activity.svg" width="100%" alt="Atividade"/>

<details>
<summary><b>🏆 Ver conquistas</b></summary>
<br/>
<img src="https://raw.githubusercontent.com/Max-Martins/Max-Martins/metrics/trophies.svg" width="100%" alt="Conquistas"/>
</details>

<br/>

<a href="https://max-martins.github.io/Max-Martins/jogo/?v=2" title="Jogar a cobrinha"><img src="https://raw.githubusercontent.com/Max-Martins/Max-Martins/output/github-contribution-grid-snake.svg" width="100%" alt="Cobrinha comendo o gráfico de contribuições"/></a>

<a href="https://max-martins.github.io/Max-Martins/jogo/?v=2"><img src="https://img.shields.io/badge/%E2%96%B6%20Jogar%20a%20cobrinha-8b5cf6?style=for-the-badge" alt="Jogar a cobrinha"/></a>

<sub>Painéis gerados diariamente por <a href="./scripts/generate_cards.py">generate_cards.py</a>. Animação da cobrinha gerada com <a href="https://github.com/Platane/snk">Platane/snk</a>; o <a href="./jogo/index.html">jogo</a> é próprio.</sub>

</div>

---

## Apoie

<div align="center">

Os projetos são gratuitos e abertos. Se algum deles economizou o seu tempo, deixe uma ⭐ ou apoie com um PIX de qualquer valor.

<a href="https://max-martins.github.io/Max-Martins/apoie/"><img src="https://img.shields.io/badge/Apoiar%20com%20PIX-2dd4a8?style=for-the-badge&logo=pix&logoColor=white" alt="Apoiar com PIX"/></a>

</div>

---

## Vamos conversar

<div align="center">

Quer trocar ideias sobre automação de licitações, integração com o PNCP, n8n ou IA aplicada?

<br/>

<a href="https://www.linkedin.com/in/maxx-marinho/"><img src="https://img.shields.io/badge/LinkedIn-Maxx%20Marinho-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white" alt="LinkedIn"/></a>
<a href="https://www.instagram.com/maxx.marinho/"><img src="https://img.shields.io/badge/Instagram-@maxx.marinho-E4405F?style=for-the-badge&logo=instagram&logoColor=white" alt="Instagram"/></a>

<br/><br/>

<img src="./assets/rodape.svg" width="100%" alt="Automatizar é transformar processos."/>

</div>
