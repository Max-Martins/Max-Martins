// Nó "Filtrar processos abertos" do workflow "Captação de licitações 2026 - PNCP" (n8n Code node)
// Fonte da verdade: workflows/01-captacao-licitacoes-pncp.json — este arquivo é só para leitura/revisão.

// Empresa de referência: CAMARGO SCIENCE SOLUÇÕES DIAGNÓSTICAS LTDA - CNPJ 08.580.826/0001-89
// CNAE 46.45-1-01 (principal): comércio atacadista de instrumentos e materiais para uso médico, cirúrgico, hospitalar e de laboratórios
// CNAE 47.73-3-00 (secundária): comércio varejista de artigos médicos e ortopédicos
// Filtros de produto: FILTROS_PRODUTOS.csv (o_que_vendo, tipos_de_produto, o_que_nao_vendo)
const fs = require('fs');
const norm = v => String(v ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ');
const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const regexDe = lista => {
  const termos = lista.map(t => norm(t).trim()).filter(Boolean);
  if (!termos.length) return null;
  return new RegExp('(?:^|[^a-z0-9])(?:' + termos.map(t => escRe(t).replace(/ /g, '\\s+') + (t.length <= 3 ? '(?![a-z0-9])' : '')).join('|') + ')');
};
const caminhosFiltro = ['/files/PREGÕES_2026/FILTROS_PRODUTOS.csv', '/files/produtos-filtros-corrigido.csv'];
const caminhoFiltro = caminhosFiltro.find(p => fs.existsSync(p));
if (!caminhoFiltro) throw new Error('Arquivo de filtros não encontrado. Coloque FILTROS_PRODUTOS.csv em /files/PREGÕES_2026.');
const linhasCsv = fs.readFileSync(caminhoFiltro, 'utf8').replace(/^﻿/, '').split(/\r?\n/).slice(1).filter(l => l.trim());
const regras = linhasCsv.map(l => {
  const [vendo = '', tipos = '', naoVendo = ''] = l.split(',');
  return { nome: vendo.trim(), termo: regexDe(vendo.split('/')), tipos: regexDe(tipos.split(';')), exclui: regexDe(naoVendo.split(';')) };
}).filter(r => r.termo);
// Termos derivados das atividades do CNAE da empresa.
for (const t of ['material medico', 'materiais medicos', 'medico hospitalar', 'medico-hospitalar', 'material de laboratorio', 'materiais de laboratorio', 'material laboratorial', 'materiais laboratoriais', 'insumos laboratoriais', 'insumos de laboratorio', 'equipamento de laboratorio', 'equipamentos de laboratorio', 'equipamentos laboratoriais', 'instrumentos laboratoriais', 'vidraria', 'artigos medicos', 'material ortopedico', 'materiais ortopedicos'])
  regras.push({ nome: 'CNAE: ' + t, termo: regexDe([t]), tipos: null, exclui: null });
// Objetos incompatíveis com o CNAE de comércio (serviços, obras, alimentação etc.).
const foraDoCnae = regexDe(['prestacao de servico', 'prestacao de servicos', 'servicos continuados', 'servico continuado', 'servicos de engenharia', 'servicos de manutencao', 'servicos de limpeza', 'servicos de vigilancia', 'servicos medicos', 'servicos laboratoriais', 'servicos de laboratorio', 'servicos de exames', 'realizacao de exames', 'execucao de obra', 'execucao de obras', 'obra de', 'obras de', 'reforma', 'pavimentacao', 'credenciamento', 'locacao de veiculo', 'locacao de veiculos', 'locacao de imovel', 'locacao de imoveis', 'mao de obra', 'plano de saude', 'assistencia a saude', 'transporte escolar', 'transporte de pacientes', 'genero alimenticio', 'generos alimenticios', 'merenda', 'alimentacao escolar', 'refeicoes', 'combustivel', 'combustiveis', 'pneus',
  'servico de manutencao', 'servicos tecnicos', 'servicos comuns', 'manutencao corretiva', 'manutencao preventiva', 'tecnologia da informacao', 'software', 'solucao informatizada', 'sistema de gestao',
  'ultrassom', 'ultrassonografia', 'diagnostico por imagem', 'raio x', 'produtos alimenticios', 'jaleco', 'jalecos', 'uniforme', 'uniformes', 'vestuario', 'glp', 'gas liquefeito',
  'concreto', 'automotiva', 'automotivo', 'gelo seco', 'drenagem', 'layout', 'hotelaria', 'tecidos', 'larvicida', 'aterramento', 'mobiliario', 'mobiliarios', 'moveis', 'contratacao de servicos', 'servicos de recuperacao', 'servicos de implementacao', 'instalacao de sistemas', 'engenharia clinica', 'contratacao de laboratorio', 'laboratorio acreditado', 'alarme de incendio', 'georreferenciado']);
const compativel = objeto => {
  const t = norm(objeto);
  if (!t || foraDoCnae.test(t)) return null;
  const r = regras.find(r => r.termo.test(t) && (!r.tipos || r.tipos.test(t)) && (!r.exclui || !r.exclui.test(t)));
  return r ? r.nome : null;
};

// Datas da API de busca vêm sem fuso: são horário de Brasília.
const data = v => v ? new Date(/[zZ]|[+-]\d{2}:?\d{2}$/.test(v) ? v : v + '-03:00') : null;
const clean = v => String(v ?? '').replace(/[\/:*?"<>|]/g, ' ').replace(/\s+/g, ' ').trim();
const br = d => d ? d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '';
const hm = d => d ? d.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }).replace(':', 'h') : 'HORÁRIO NÃO INFORMADO';
const paginas = $input.all();
const falhas = paginas.filter(p => p.json.error).length;
if (paginas.length && falhas === paginas.length) throw new Error('O PNCP não respondeu a nenhuma consulta (' + falhas + ' página(s) com erro). Relatório não enviado para evitar um e-mail vazio.');
const ufsComFalha = [...new Set(paginas.filter(p => p.json.error).map(p => p.json.uf).filter(Boolean))];
const aviso = ufsComFalha.length ? 'ATENÇÃO: o PNCP não respondeu a parte das consultas de ' + ufsComFalha.join(', ') + '. Oportunidades desses estados podem estar incompletas neste relatório.' + String.fromCharCode(10, 10) : '';
const agora = new Date();
const limite = new Date(agora.getTime() + 21 * 86400000);
const vistos = new Set(), saida = [];
for (const entrada of paginas) {
  for (const p of entrada.json.items || []) {
    const uf = p.uf;
    const cnpj = String(p.orgao_cnpj || '').replace(/\D/g, '');
    const ano = p.ano, seq = p.numero_sequencial;
    const chave = [cnpj, ano, seq].join('-');
    if (!['SP', 'MG', 'GO', 'PR', 'SC', 'MS'].includes(uf) || p.cancelado || vistos.has(chave) || !cnpj || !ano || !seq) continue;
    const prazo = data(p.data_fim_vigencia);
    if (prazo && (prazo < agora || prazo > limite)) continue;
    const objeto = p.description || '';
    const termo = compativel(objeto);
    if (!termo) continue;
    vistos.add(chave);
    const orgao = p.orgao_nome || 'ÓRGÃO NÃO INFORMADO';
    saida.push({ json: {
      'Status do prazo': 'DENTRO DA JANELA ANALISADA',
      'Data limite para proposta': br(prazo),
      'Data de abertura do certame': br(data(p.data_inicio_vigencia)),
      'Data de publicação': br(data(p.data_publicacao_pncp)),
      UF: uf, Modalidade: p.modalidade_licitacao_nome || '', Situação: 'ABERTO',
      'Número do processo': '', 'Número do edital/compra': p.numero || (String(p.title || '').match(/n[º°o]\s*([^\s]+)/i) || [])[1] || '',
      'Número de controle PNCP': p.numero_controle_pncp || ano + '/' + seq, Órgão: orgao, 'CNPJ do órgão': cnpj,
      'Unidade compradora': p.unidade_nome || '', 'Código da unidade': p.unidade_codigo || '', Objeto: objeto,
      'Link do sistema de origem': 'https://pncp.gov.br/app/editais/' + cnpj + '/' + ano + '/' + seq, Fonte: 'PNCP', 'Janela analisada': 'Próximos 21 dias',
      _aviso: aviso, _termo: termo, _prazo: prazo ? prazo.toISOString() : '',
      _root: '/files/PREGÕES_2026', _pasta: 'EDITAIS_E_ANEXOS', _cnpj: cnpj, _ano: ano, _seq: seq,
      _filePrefix: clean(uf + ' - ' + ano + '-' + seq + ' - ' + orgao).slice(0, 120), _horario: hm(prazo)
    } });
  }
}
saida.sort((a, b) => a.json._prazo.localeCompare(b.json._prazo));
if (!saida.length) return [{ json: { 'Status do prazo': 'SEM RESULTADOS', Objeto: 'Nenhum processo compatível com o CNAE e os filtros de produto no período consultado.', Fonte: 'PNCP', _aviso: aviso, _root: '/files/PREGÕES_2026' } }];
return saida;

