// Nó "Configurar busca" do workflow "Captação de licitações 2026 - PNCP" (n8n Code node)
// Fonte da verdade: workflows/01-captacao-licitacoes-pncp.json — este arquivo é só para leitura/revisão.

const hoje = new Date();
const limite = new Date(hoje);
limite.setDate(limite.getDate() + 21);
const ymd = d => {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(d).filter(x => x.type !== 'literal').map(x => [x.type, x.value]));
  return p.year + p.month + p.day;
};
return ['SP', 'MG', 'GO', 'PR', 'SC', 'MS'].map(uf => ({ json: {
  root: '/files/PREGÕES_2026',
  uf,
  modalidade: 6,
  dataInicial: ymd(hoje),
  dataFinal: ymd(limite),
} }));
