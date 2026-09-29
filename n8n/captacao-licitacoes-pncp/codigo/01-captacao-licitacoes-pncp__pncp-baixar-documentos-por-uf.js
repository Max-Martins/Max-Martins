// Nó "PNCP - baixar documentos por UF" do workflow "Captação de licitações 2026 - PNCP" (n8n Code node)
// Fonte da verdade: workflows/01-captacao-licitacoes-pncp.json — este arquivo é só para leitura/revisão.

// Baixa todos os documentos publicados no PNCP (edital, anexos, termo de referência etc.) de cada processo em
// PREGÕES_2026/<UF>/<DD.MM.AAAA - HHhMM - ÓRGÃO - PE Nº>/, usando a data e o horário da sessão (encerramento das propostas).
// Arquivos que já existem na pasta não são baixados de novo, então uma execução seguinte completa o que faltou.
// Roda em lotes (Loop de documentos) e limita o tempo por lote porque o task runner encerra nós Code com mais de 300 s.
const fs = require('fs');
const raiz = '/files/PREGÕES_2026';
const inicio = Date.now(), orcamento = 240000;
const espera = ms => new Promise(r => setTimeout(r, ms));
const restante = () => orcamento - (Date.now() - inicio);
const limpar = v => String(v ?? '').normalize('NFC').replace(/[\\/:*?"<>|\x00-\x1F]/g, ' ').replace(/\s+/g, ' ').trim().replace(/[. ]+$/, '');
const pedir = async opcoes => {
  let ultimoErro = new Error('Tempo do lote esgotado');
  for (const ms of [0, 3000, 8000]) {
    if (restante() < ms + 15000) break;
    if (ms) await espera(ms);
    // O tempo de cada requisição nunca passa do que resta do orçamento do lote.
    const timeout = Math.min(opcoes.timeout || 60000, restante() - 5000);
    try { return await this.helpers.httpRequest({ ...opcoes, timeout }); } catch (e) { ultimoErro = e; }
  }
  throw ultimoErro;
};
const extensaoPorTipo = { 'application/pdf': 'pdf', 'application/zip': 'zip', 'application/x-zip-compressed': 'zip', 'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx', 'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx', 'application/vnd.oasis.opendocument.text': 'odt',
  'application/vnd.oasis.opendocument.spreadsheet': 'ods', 'application/x-rar-compressed': 'rar', 'application/vnd.rar': 'rar',
  'application/x-7z-compressed': '7z', 'text/plain': 'txt', 'text/csv': 'csv', 'image/jpeg': 'jpg', 'image/png': 'png' };
const nomeDoServidor = cabecalho => {
  const c = String(cabecalho || '');
  const utf8 = c.match(/filename\*\s*=\s*UTF-8''([^;]+)/i);
  if (utf8) { try { return decodeURIComponent(utf8[1].replace(/"/g, '')); } catch (e) { /* usa o nome simples */ } }
  const simples = c.match(/filename\s*=\s*"?([^";]+)"?/i);
  return simples ? Buffer.from(simples[1], 'latin1').toString('utf8') : '';
};
const extensaoDe = nome => (String(nome).match(/\.([A-Za-z0-9]{2,5})$/) || [])[1]?.toLowerCase() || '';
const dataHora = iso => {
  if (!iso) return 'SEM DATA - SEM HORARIO';
  const p = Object.fromEntries(new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
    .formatToParts(new Date(iso)).map(x => [x.type, x.value]));
  return p.day + '.' + p.month + '.' + p.year + ' - ' + p.hour + 'H' + p.minute;
};

const saida = [];
for (const { json: p } of $input.all()) {
  if (!p._cnpj) continue;
  // Número no formato 104.2026: troca barras por pontos, inclui o ano se faltar e remove ano repetido.
  // Tira prefixos como "PE" ou "Pregão Eletrônico nº" que alguns órgãos já colocam no número.
  let numero = limpar(String(p['Número do edital/compra'] || p._seq).replace(/\//g, '.'))
    .replace(/^(PE|PREG[AÃ]O(\s+ELETR[OÔ]NICO)?)\s*(N[º°O]?\.?)?\s*/i, '') || String(p._seq);
  if (!/\.\d{4}$/.test(numero)) numero += '.' + p._ano;
  numero = numero.replace(/(\.\d{4})\1+$/, '$1');
  // Encurta só o nome do órgão, para data, horário e número do pregão nunca serem cortados.
  const inicioNome = dataHora(p._prazo) + ' - ', fimNome = ' - PE ' + numero;
  const orgao = limpar(p['Órgão']).slice(0, Math.max(20, 110 - inicioNome.length - fimNome.length)).trim();
  const pasta = raiz + '/' + p.UF + '/' + limpar(inicioNome + orgao + fimNome);
  const resumo = { UF: p.UF, pasta: pasta.replace('/files/', ''), documentos: 0, baixados: 0, jaExistiam: 0, falhas: 0 };
  if (restante() < 30000) { saida.push({ json: { ...resumo, situacao: 'adiado para a próxima execução' } }); continue; }
  let docs;
  try {
    docs = await pedir({ url: 'https://pncp.gov.br/api/pncp/v1/orgaos/' + p._cnpj + '/compras/' + p._ano + '/' + p._seq + '/arquivos', json: true, timeout: 30000 });
  } catch (e) {
    saida.push({ json: { ...resumo, situacao: 'falha ao listar documentos: ' + e.message } });
    continue;
  }
  docs = (Array.isArray(docs) ? docs : docs?.data || []).filter(d => d.statusAtivo !== false && (d.url || d.uri));
  resumo.documentos = docs.length;
  if (!docs.length) { saida.push({ json: { ...resumo, situacao: 'sem documentos publicados' } }); continue; }
  fs.mkdirSync(pasta, { recursive: true });
  const existentes = fs.readdirSync(pasta);
  const usados = new Map();
  for (const [indice, d] of docs.entries()) {
    let base = limpar(d.titulo || d.tipoDocumentoNome || 'Documento ' + (indice + 1)).slice(0, 90).trim() || 'Documento ' + (indice + 1);
    const extTitulo = extensaoDe(base);
    if (extTitulo) base = base.slice(0, -(extTitulo.length + 1)).trim();
    const repeticoes = (usados.get(base) || 0) + 1;
    usados.set(base, repeticoes);
    if (repeticoes > 1) base += ' (' + repeticoes + ')';
    if (existentes.some(f => f === base || f.startsWith(base + '.'))) { resumo.jaExistiam++; continue; }
    if (restante() < 30000) { resumo.falhas++; continue; }
    await espera(2500);
    try {
      const r = await pedir({ url: d.url || d.uri, encoding: 'arraybuffer', returnFullResponse: true, timeout: 120000 });
      const tipo = String(r.headers?.['content-type'] || '').split(';')[0].trim().toLowerCase();
      const ext = extTitulo || extensaoDe(nomeDoServidor(r.headers?.['content-disposition'])) || extensaoPorTipo[tipo] || 'pdf';
      fs.writeFileSync(pasta + '/' + base + '.' + ext, Buffer.from(r.body));
      resumo.baixados++;
    } catch (e) { resumo.falhas++; }
  }
  if (!fs.readdirSync(pasta).length) fs.rmdirSync(pasta);
  saida.push({ json: { ...resumo, situacao: resumo.falhas ? 'incompleto (será completado na próxima execução)' : 'ok' } });
}
return saida.length ? saida : [{ json: { situacao: 'nenhum processo neste lote' } }];

