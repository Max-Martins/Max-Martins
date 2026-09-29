// Nó "PNCP - buscar editais" do workflow "Captação de licitações 2026 - PNCP" (n8n Code node)
// Fonte da verdade: workflows/01-captacao-licitacoes-pncp.json — este arquivo é só para leitura/revisão.

// Busca editais com proposta aberta no PNCP (API de busca, até 500 por página).
// Cada requisição que falhar é repetida após 3, 8, 15, 30 e 45 s. O task runner encerra
// nós Code com mais de 300 s, então o tempo por UF (uma execução por UF) é limitado a 240 s.
const inicio = Date.now(), orcamento = 240000;
const espera = ms => new Promise(r => setTimeout(r, ms));
const restante = () => orcamento - (Date.now() - inicio);
const buscar = async (uf, modalidade, pagina, tam) => {
  let ultimoErro = new Error('Tempo limite da busca esgotado');
  for (const ms of [0, 3000, 8000, 15000, 30000, 45000]) {
    if (restante() < ms + 5000) break;
    if (ms) await espera(ms);
    try {
      return await this.helpers.httpRequest({
        url: 'https://pncp.gov.br/api/search/',
        qs: { tipos_documento: 'edital', ordenacao: '-data', status: 'recebendo_proposta', ufs: uf, modalidades: modalidade, pagina, tam_pagina: tam },
        json: true, timeout: 30000,
      });
    } catch (e) { ultimoErro = e; }
  }
  throw ultimoErro;
};
const saida = [];
for (const { json: b } of $input.all()) {
  let paginas;
  try {
    const r = await buscar(b.uf, b.modalidade, 1, 1);
    paginas = Math.max(1, Math.ceil((Number(r.total) || 0) / 500));
  } catch (e) {
    saida.push({ json: { uf: b.uf, pagina: 0, error: { message: e.message } } });
    continue;
  }
  for (let pagina = 1; pagina <= paginas; pagina++) {
    await espera(1500);
    try {
      const r = await buscar(b.uf, b.modalidade, pagina, 500);
      saida.push({ json: { uf: b.uf, pagina, items: r.items || [] } });
    } catch (e) {
      saida.push({ json: { uf: b.uf, pagina, error: { message: e.message } } });
    }
  }
}
return saida;

