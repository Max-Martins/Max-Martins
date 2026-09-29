// Nó "PNCP - detalhar compras" do workflow "Captação de licitações 2026 - PNCP" (n8n Code node)
// Fonte da verdade: workflows/01-captacao-licitacoes-pncp.json — este arquivo é só para leitura/revisão.

// Completa processo, número da compra e link do sistema de origem com o detalhe da compra no PNCP.
// Roda em lotes (Loop de detalhes); cada requisição que falhar é repetida após 3 e 8 s.
// O ritmo de uma consulta a cada 2,5 s evita o bloqueio por excesso de requisições.
const espera = ms => new Promise(r => setTimeout(r, ms));
const inicio = Date.now(), orcamento = 200000;
const saida = [];
for (const item of $input.all()) {
  const linha = { ...item.json };
  if (linha._cnpj && Date.now() - inicio < orcamento) {
    for (const ms of [0, 3000, 8000]) {
      if (Date.now() - inicio + ms > orcamento + 30000) break;
      if (ms) await espera(ms);
      try {
        // O tempo de cada consulta nunca passa do limite do lote.
        const timeout = Math.max(5000, Math.min(20000, orcamento + 50000 - (Date.now() - inicio)));
        const d = await this.helpers.httpRequest({ url: 'https://pncp.gov.br/api/consulta/v1/orgaos/' + linha._cnpj + '/compras/' + linha._ano + '/' + linha._seq, json: true, timeout });
        if (d?.processo) linha['Número do processo'] = d.processo;
        if (d?.numeroCompra) linha['Número do edital/compra'] = d.numeroCompra;
        if (d?.linkSistemaOrigem) linha['Link do sistema de origem'] = d.linkSistemaOrigem;
        break;
      } catch (e) { /* tenta de novo; se não der, a linha segue com os dados da busca */ }
    }
    await espera(2500);
  }
  saida.push({ json: linha });
}
return saida;

