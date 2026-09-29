// Nó "PNCP - consulta reserva" do workflow "Captação de licitações 2026 - PNCP" (n8n Code node)
// Fonte da verdade: workflows/01-captacao-licitacoes-pncp.json — este arquivo é só para leitura/revisão.

// Consulta reserva: para cada UF em que a busca do PNCP falhou, baixa as contratações com
// proposta aberta pela API oficial de consulta (50 por página) e converte para o formato da busca.
// O task runner encerra nós Code com mais de 300 s, então o tempo total é limitado a 240 s.
const inicio = Date.now(), orcamento = 240000;
const espera = ms => new Promise(r => setTimeout(r, ms));
const restante = () => orcamento - (Date.now() - inicio);
const paginas = $input.all();
const ufsComFalha = [...new Set(paginas.filter(p => p.json.error).map(p => p.json.uf).filter(Boolean))];
if (!ufsComFalha.length) return paginas;

const busca = Object.fromEntries($('Configurar busca').all().map(i => [i.json.uf, i.json]));
const consultar = async (b, pagina) => {
  let ultimoErro = new Error('Tempo limite da consulta reserva esgotado');
  for (const ms of [0, 3000, 8000, 15000]) {
    if (restante() < ms + 5000) break;
    if (ms) await espera(ms);
    try {
      const r = await this.helpers.httpRequest({
        url: 'https://pncp.gov.br/api/consulta/v1/contratacoes/proposta',
        qs: { dataFinal: b.dataFinal, codigoModalidadeContratacao: b.modalidade, uf: b.uf, pagina, tamanhoPagina: 50 },
        json: true, timeout: 30000, returnFullResponse: true,
      });
      return r.statusCode === 204 || !r.body ? { data: [], paginasRestantes: 0 } : r.body;
    } catch (e) { ultimoErro = e; }
  }
  throw ultimoErro;
};
const converter = p => ({
  uf: p.unidadeOrgao?.ufSigla, orgao_cnpj: p.orgaoEntidade?.cnpj, orgao_nome: p.orgaoEntidade?.razaoSocial,
  ano: p.anoCompra, numero_sequencial: p.sequencialCompra, numero: p.numeroCompra, numero_controle_pncp: p.numeroControlePNCP,
  description: p.objetoCompra, unidade_nome: p.unidadeOrgao?.nomeUnidade, unidade_codigo: p.unidadeOrgao?.codigoUnidade,
  modalidade_licitacao_nome: p.modalidadeNome, data_publicacao_pncp: p.dataPublicacaoPncp,
  data_inicio_vigencia: p.dataAberturaProposta, data_fim_vigencia: p.dataEncerramentoProposta, cancelado: false,
});

const recuperadas = new Set(), extras = [];
for (const uf of ufsComFalha) {
  const b = busca[uf];
  if (!b) continue;
  const itens = [];
  let completa = false;
  try {
    for (let pagina = 1; ; pagina++) {
      if (restante() < 5000) break;
      const r = await consultar(b, pagina);
      itens.push(...(r.data || []).map(converter));
      if (!r.paginasRestantes) { completa = true; break; }
      await espera(1500);
    }
  } catch (e) { /* mantém o aviso de falha para esta UF */ }
  if (itens.length) extras.push({ json: { uf, pagina: 'reserva', items: itens } });
  if (completa) recuperadas.add(uf);
}
// UFs recuperadas por completo deixam de constar como falha; as demais mantêm o aviso.
return [...paginas.filter(p => !(p.json.error && recuperadas.has(p.json.uf))), ...extras];

