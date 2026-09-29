// Nó "Gerar relatório Excel" do workflow "Captação de licitações 2026 - PNCP" (n8n Code node)
// Fonte da verdade: workflows/01-captacao-licitacoes-pncp.json — este arquivo é só para leitura/revisão.

// Preenche o pacote original do modelo sem reconstruir a formatação.
const fs = require('fs');
const XLSX = require('@e965/xlsx');
const CFB = XLSX.CFB;
if (!CFB) throw new Error('Biblioteca de preservação do modelo indisponível.');
// Procura o modelo em locais conhecidos (a Área de Trabalho pode ser reorganizada).
const caminhosModelo = ['/files/PREGÕES_2026/MODELO_RELATORIO_SEMANAL_OPORTUNIDADES.xlsx', '/files/MODELO_RELATORIO_SEMANAL_OPORTUNIDADES.xlsx', '/files/02_Pessoal/Financas/MODELO_RELATORIO_SEMANAL_OPORTUNIDADES.xlsx'];
const caminhoModelo = caminhosModelo.find(p => fs.existsSync(p));
if (!caminhoModelo) throw new Error('Modelo do relatório não encontrado. Coloque MODELO_RELATORIO_SEMANAL_OPORTUNIDADES.xlsx em /files/PREGÕES_2026.');
const modelo = fs.readFileSync(caminhoModelo);
const zip = CFB.read(modelo, {type:'buffer'});
const entry = path => { const i=zip.FullPaths.findIndex(p=>p.endsWith('/'+path)); if(i<0) throw new Error('Parte ausente no modelo: '+path); return zip.FileIndex[i]; };
const read = path => Buffer.from(entry(path).content).toString('utf8');
const write = (path,xml) => { const e=entry(path); e.content=Buffer.from(xml,'utf8'); e.size=e.content.length; };
const esc = v => String(v??'').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g,'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const prefix = xml => (xml.match(/<((?:\w+:)?)worksheet\b/)||[])[1]??'';
const colunas=['Status do prazo','Data limite para proposta','Data de abertura do certame','Data de publicação','UF','Modalidade','Situação','Número do processo','Número do edital/compra','Número de controle PNCP','Órgão','CNPJ do órgão','Unidade compradora','Código da unidade','Objeto','Link do sistema de origem','Fonte','Janela analisada'];
const entrada=$input.all().map(i=>i.json);
const itens=entrada.filter(i=>!i._semResultado && !/^SEM (RESULTADOS|OPORTUNIDADES)/i.test(i['Status do prazo']||''));
if(itens.length>1048568) throw new Error('Quantidade excede o limite de linhas do Excel.');
const fim=Math.max(9,itens.length+8);
const nomes=XLSX.read(modelo,{type:'buffer',bookSheets:true}).SheetNames;
if(nomes[0]!=='Resumo semanal'||nomes[1]!=='Oportunidades') throw new Error('Estrutura do modelo diferente da esperada.');
let resumo=read('xl/worksheets/sheet1.xml'), oportunidades=read('xl/worksheets/sheet2.xml');
const pr=prefix(resumo), po=prefix(oportunidades);
const cell=(p,ref,s,value,formula)=> '<'+p+'c r="'+ref+'" s="'+s+'" t="'+(typeof value==='number'?'n':'inlineStr')+'">'+(formula?'<'+p+'f>'+esc(formula)+'</'+p+'f>':'')+(typeof value==='number'?'<'+p+'v>'+value+'</'+p+'v>':'<'+p+'is><'+p+'t xml:space="preserve">'+esc(value)+'</'+p+'t></'+p+'is>')+'</'+p+'c>';
function setCell(xml,p,ref,value,formula){
 const re=new RegExp('<'+p+'c\\b(?=[^>]*\\br="'+ref+'")[^>]*?(?:/>|>[\\s\\S]*?</'+p+'c>)');
 const old=xml.match(re); if(!old)throw new Error('Célula ausente no modelo: '+ref);
 const s=(old[0].match(/\bs="(\d+)"/)||[])[1]||'0';
 return xml.replace(re,()=>cell(p,ref,s,value,formula));
}
function height(xml,p,r,h){return xml.replace(new RegExp('<'+p+'row\\b(?=[^>]*\\br="'+r+'")[^>]*>'),tag=>tag.replace(/\s(?:ht|customHeight)="[^"]*"/g,'').replace(/>$/,' ht="'+h+'" customHeight="1">'));}
const dateNumber=v=>{
 if(!v)return null;
 const m=String(v).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
 if(!m)return null;
 const t=Date.UTC(+m[3],+m[2]-1,+m[1]); const d=new Date(t);
 if(d.getUTCFullYear()!==+m[3]||d.getUTCMonth()!==+m[2]-1||d.getUTCDate()!==+m[1])return null;
 return (t-Date.UTC(1899,11,30))/86400000;
};
let styles=read('xl/styles.xml');
const ps=(styles.match(/<((?:\w+:)?)styleSheet\b/)||[])[1]||'';
const xfsRe=new RegExp('<'+ps+'cellXfs\\b[^>]*>([\\s\\S]*?)</'+ps+'cellXfs>');
const xfs=styles.match(xfsRe); if(!xfs)throw new Error('Estilos não encontrados.');
const xfList=xfs[1].match(new RegExp('<'+ps+'xf\\b[^>]*?(?:/>|>[\\s\\S]*?</'+ps+'xf>)','g'))||[];
const bodyRow=oportunidades.match(new RegExp('<'+po+'row\\b(?=[^>]*\\br="9")[^>]*>[\\s\\S]*?</'+po+'row>'))?.[0];
if(!bodyRow)throw new Error('Linha de dados ausente no modelo.');
const styleOf=letter=>+(bodyRow.match(new RegExp('<'+po+'c\\b(?=[^>]*\\br="'+letter+'9")[^>]*\\bs="(\\d+)"'))||[])[1]||0;
const wrapBase=styleOf('O');
const formatId=Math.max(163,...Array.from(styles.matchAll(/numFmtId="(\d+)"/g),m=>+m[1]))+1;
const fmt='<'+ps+'numFmt numFmtId="'+formatId+'" formatCode="dd/mm/yyyy"/>';
const numRe=new RegExp('<'+ps+'numFmts\\b[^>]*?(?:/>|>[\\s\\S]*?</'+ps+'numFmts>)');
if(numRe.test(styles)) styles=styles.replace(numRe,tag=>{const n=+(tag.match(/count="(\d+)"/)||[])[1]||0;return tag.replace(/count="\d+"/,'count="'+(n+1)+'"').replace(/\s*\/>$/, '>'+fmt+'</'+ps+'numFmts>').replace(new RegExp('</'+ps+'numFmts>$'),end=>tag.endsWith('/>')?end:fmt+end);});
else styles=styles.replace(new RegExp('(<'+ps+'styleSheet\\b[^>]*>)'),'$1<'+ps+'numFmts count="1">'+fmt+'</'+ps+'numFmts>');
const dateStyle=xfList.length;
const dateXf=xfList[wrapBase].replace(/numFmtId="\d+"/,'numFmtId="'+formatId+'"').replace(/applyNumberFormat="[^"]*"/,'').replace(new RegExp('<'+ps+'xf\\b'),'<'+ps+'xf applyNumberFormat="1"');
styles=styles.replace(xfsRe,tag=>tag.replace(/count="\d+"/,'count="'+(dateStyle+1)+'"').replace(new RegExp('</'+ps+'cellXfs>$'),dateXf+'</'+ps+'cellXfs>'));
write('xl/styles.xml',styles);
const widths=[22,20,20,18,8,22,20,19,20,25,34,18,30,17,58,46,12,22];
const rows=itens.map((item,index)=>{
 const r=index+9;
 const values=colunas.map(k=>item[k]??'');
 const lines=Math.max(3,...values.map((v,c)=>String(v).split('\n').reduce((n,s)=>n+Math.max(1,Math.ceil(s.length/(widths[c]*0.8))),0)));
 const cells=values.map((v,c)=>{const d=c>=1&&c<=3?dateNumber(v):null;return cell(po,String.fromCharCode(65+c)+r,d===null?wrapBase:dateStyle,d===null?v:d);}).join('');
 return '<'+po+'row r="'+r+'" ht="'+Math.min(409,Math.max(48,lines*15+10))+'" customHeight="1">'+cells+'</'+po+'row>';
}).join('')||'<'+po+'row r="9" ht="48" customHeight="1">'+cell(po,'A9',wrapBase,'SEM RESULTADOS')+cell(po,'O9',wrapBase,'Nenhuma oportunidade recebida do filtro nesta execução.')+'</'+po+'row>';
const sheetDataRe=new RegExp('(<'+po+'sheetData>)([\\s\\S]*?)(</'+po+'sheetData>)');
oportunidades=oportunidades.replace(sheetDataRe,(_,a,data,b)=>a+(data.match(new RegExp('<'+po+'row\\b[^>]*>[\\s\\S]*?</'+po+'row>','g'))||[]).filter(row=>+(row.match(/\br="(\d+)"/)||[])[1]<9).join('')+rows+b);
oportunidades=oportunidades.replace(/\bref="A1:R\d+"/g,'ref="A1:R'+fim+'"').replace(/\bsqref="A9:A\d+"/g,'sqref="A9:A'+fim+'"').replace(/\bref="A8:R\d+"/g,'ref="A8:R'+fim+'"');
// Mantém a legenda e destaca prazos por data, sem alterar o status recebido.
const todayBr=new Date().toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo'});
const todayNum=dateNumber(todayBr);
oportunidades=oportunidades.replace(new RegExp('<'+po+'conditionalFormatting\\b[^>]*>[\\s\\S]*?</'+po+'conditionalFormatting>','g'),'');
const cf='<'+po+'conditionalFormatting sqref="A9:B'+fim+'"><'+po+'cfRule type="expression" dxfId="0" priority="1"><'+po+'formula>AND(ISNUMBER($B9),$B9&gt;=TODAY(),$B9&lt;=TODAY()+3)</'+po+'formula></'+po+'cfRule><'+po+'cfRule type="expression" dxfId="1" priority="2"><'+po+'formula>AND(ISNUMBER($B9),$B9&gt;TODAY()+3)</'+po+'formula></'+po+'cfRule></'+po+'conditionalFormatting>';
oportunidades=oportunidades.replace(new RegExp('(</'+po+'mergeCells>)'),'$1'+cf);
const datas=itens.map(i=>dateNumber(i['Data limite para proposta'])).filter(v=>v!==null);
const fontes=[...new Set(itens.map(i=>i.Fonte).filter(Boolean))].join(', ')||'PNCP';
resumo=setCell(resumo,pr,'B4','Consulta em '+todayBr);
resumo=setCell(resumo,pr,'B5','SP, MG, GO, PR, SC e MS');
// MS usa a linha 17 do resumo com o mesmo estilo da linha de SC.
for(const col of ['A','B']){const s=(resumo.match(new RegExp('<'+pr+'c\b(?=[^>]*\br="'+col+'16")[^>]*\bs="(\d+)"'))||[])[1];if(s)resumo=resumo.replace(new RegExp('(<'+pr+'c\b(?=[^>]*\br="'+col+'17")[^>]*\bs=")\d+'),'$1'+s);}
resumo=setCell(resumo,pr,'A17','MS');
resumo=setCell(resumo,pr,'A7','OPORTUNIDADES NO RELATÓRIO');
resumo=setCell(resumo,pr,'A8',itens.length,'COUNTA(\'Oportunidades\'!$J$9:$J$'+fim+')');
resumo=setCell(resumo,pr,'C8',datas.length?new Date(Date.UTC(1899,11,30)+Math.min(...datas)*86400000).toLocaleDateString('pt-BR',{timeZone:'UTC'}):'Não informado');
resumo=setCell(resumo,pr,'E8',fontes);
for(const [i,uf] of ['SP','MG','GO','PR','SC','MS'].entries()) resumo=setCell(resumo,pr,'B'+(i+12),itens.filter(x=>x.UF===uf).length,'COUNTIF(\'Oportunidades\'!$E$9:$E$'+fim+',A'+(i+12)+')');
resumo=setCell(resumo,pr,'D12','Dados recebidos do filtro de processos nesta consulta. '+(itens.length-datas.length)+' registro(s) sem data limite válida. Confirme o prazo e as condições no edital e no portal de origem antes de participar.');
for(const [r,h] of [[4,30],[5,30],[7,34],[8,34],[11,30],[17,20],[20,32]])resumo=height(resumo,pr,r,h);
const extraMerges=['A7:B7','A8:B8','C7:D7','C8:D8','E7:H7','E8:H8','A11:B11'];
resumo=resumo.replace(new RegExp('<'+pr+'mergeCells\\b[^>]*>([\\s\\S]*?)</'+pr+'mergeCells>'),(all,body)=>{const extra=extraMerges.filter(ref=>!body.includes('ref="'+ref+'"'));const n=(body.match(new RegExp('<'+pr+'mergeCell\\b','g'))||[]).length+extra.length;return '<'+pr+'mergeCells count="'+n+'">'+body+extra.map(ref=>'<'+pr+'mergeCell ref="'+ref+'"/>').join('')+'</'+pr+'mergeCells>';});
// Limita a impressão às áreas úteis e mantém o cabeçalho em todas as páginas.
let book=read('xl/workbook.xml'); const pb=(book.match(/<((?:\w+:)?)workbook\b/)||[])[1]||'';
book=book.replace(new RegExp('<'+pb+'definedName\\b(?=[^>]*name="_xlnm.Print_(?:Area|Titles)")[^>]*>[\\s\\S]*?</'+pb+'definedName>','g'),'');
const names='<'+pb+'definedName name="_xlnm.Print_Area" localSheetId="0">\'Resumo semanal\'!$A$1:$H$20</'+pb+'definedName><'+pb+'definedName name="_xlnm.Print_Area" localSheetId="1">\'Oportunidades\'!$A$1:$R$'+fim+'</'+pb+'definedName><'+pb+'definedName name="_xlnm.Print_Titles" localSheetId="1">\'Oportunidades\'!$8:$8</'+pb+'definedName>';
if(new RegExp('</'+pb+'definedNames>').test(book))book=book.replace(new RegExp('</'+pb+'definedNames>'),names+'</'+pb+'definedNames>');
else book=book.replace(new RegExp('</'+pb+'sheets>'),'$&<'+pb+'definedNames>'+names+'</'+pb+'definedNames>');
write('xl/workbook.xml',book);
for(const [path,xml,p] of [['xl/worksheets/sheet1.xml',resumo,pr],['xl/worksheets/sheet2.xml',oportunidades,po]]){
 let s=xml;
 const setup='<'+p+'pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0"/>';
 if(new RegExp('<'+p+'pageSetup\\b').test(s))s=s.replace(new RegExp('<'+p+'pageSetup\\b[^>]*/>'),setup);
 else s=s.replace(new RegExp('(<'+p+'tableParts\\b|</'+p+'worksheet>)'),setup+'$1');
 s=s.replace(new RegExp('</'+p+'sheetPr>'),'<'+p+'pageSetUpPr fitToPage="1"/></'+p+'sheetPr>');
 write(path,s);
}
for(let i=0;i<zip.FullPaths.length;i++)if(/\/xl\/tables\/[^/]+\.xml$/.test(zip.FullPaths[i])){
 const e=zip.FileIndex[i]; let x=Buffer.from(e.content).toString('utf8');
 if(x.includes('TabelaOportunidades')){x=x.replace(/\bref="A8:R\d+"/g,'ref="A8:R'+fim+'"');e.content=Buffer.from(x);e.size=e.content.length;}
}
const bin=Buffer.from(CFB.write(zip,{type:'buffer',fileType:'zip',compression:true}));
const check=XLSX.read(bin,{type:'buffer'});
if(check.Sheets['Resumo semanal']?.A8?.v!==itens.length)throw new Error('Falha na validação da quantidade de oportunidades.');
const fileName='Relatório semanal de oportunidades - '+todayBr.replaceAll('/','.')+'.xlsx';
return [{json:{quantidadeOportunidades:itens.length,fileName,modeloPreservado:true,registrosSemData:itens.length-datas.length},binary:{data:await this.helpers.prepareBinaryData(bin,fileName,'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')}}];
