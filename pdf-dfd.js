/* ============================================================
   LicitaReq — pdf-dfd.js
   v5.0 — OmniLicit Edition · SHA-256 real · Rodapé autenticado
   ============================================================ */
'use strict';

const OL = (window.OmniLicit && window.OmniLicit.CORES) || {
  petroleo: '#00A896', petroleo400: '#29B5A7', petroleo300: '#5CC7BC',
  petroleoD: '#007568', executivo: '#05668D', executivoD: '#034462',
  ink: '#0A0F1E', muted: '#475569', line: '#E2E8F0', bg: '#F8FAFC',
};

const ROTULOS = Object.freeze({
  modalidade: {
    'pregao': 'Pregão Eletrônico (Art. 29)',
    'concorrencia': 'Concorrência (Art. 29)',
    'concurso': 'Concurso (Art. 30)',
    'leilao': 'Leilão (Art. 31)',
    'dialogo': 'Diálogo Competitivo (Art. 32)',
    'dispensa': 'Dispensa de Licitação (Art. 75)',
    'inexigibilidade': 'Inexigibilidade de Licitação (Art. 74)',
  },
  natureza: {
    'bens': 'Bens Comuns',
    'servicos-comuns': 'Serviços Comuns',
    'servicos-especiais': 'Serviços Especiais',
    'obras': 'Obras e Serviços de Engenharia',
    'intelectual': 'Serviços Técnicos Intelectuais',
    'alienacao': 'Alienação de Bens / Concessão',
  },
  criterio: {
    'menor-preco': 'Menor Preço',
    'maior-desconto': 'Maior Desconto',
    'melhor-tecnica': 'Melhor Técnica ou Conteúdo Artístico',
    'tecnica-preco': 'Técnica e Preço',
    'maior-lance': 'Maior Lance',
    'maior-retorno': 'Maior Retorno Econômico',
  },
  regime: {
    'empreitada-preco-unitario': 'Empreitada por Preço Unitário',
    'empreitada-preco-global': 'Empreitada por Preço Global',
    'empreitada-integral': 'Empreitada Integral',
    'tarefa': 'Tarefa',
    '': 'Não Aplicável / Não Declarado',
  },
  metodo: {
    'painel-precos': 'Painel de Preços (Gov.br)',
    'pesquisa-mercado': 'Pesquisa de Mercado (3+ fornecedores)',
    'contratacoes-similares': 'Contratações Similares',
    'sinapi': 'SINAPI / SICRO (Obras)',
    'midia': 'Mídia Especializada / Sítios Eletrônicos',
  },
  parcelamento: {
    'parcelado': 'Parcelado em Lotes (justificado)',
    'indivisivel': 'Indivisível (justificado)',
    'lote-unico': 'Lote Único (compatibilidade técnica)',
  },
  pagamento: {
    '30-dias': 'Até 30 dias após NF e Aceite (Art. 141)',
    'parcelado-mensal': 'Mensal, mediante medição',
    'entrega-unica': 'Pagamento único contra entrega',
  },
  vistoria: {
    'dispensada': 'Dispensada (não aplicável)',
    'declaracao-substituicao': 'Declaração em Substituição (Art. 63)',
    'obrigatoria': 'Obrigatória (com justificativa técnica)',
  },
  pca: {
    'sim': 'Sim — contratação prevista no PCA',
    'nao': 'Não — inclusão extraordinária',
    'revisao': 'Sim — em revisão do PCA',
    '': 'Não informado',
  },
  papel: {
    'aprovador': 'Aprovador',
    'validador': 'Validador',
    'autoridade': 'Autoridade Competente',
    'fiscal': 'Fiscal do Contrato',
    'gestor': 'Gestor do Contrato',
    'requisitante': 'Requisitante',
  },
});

function rotulo(g, v) { return (ROTULOS[g] && ROTULOS[g][v]) || v || '—'; }

function normalizarValorMonetario(v) {
  if (v == null || v === '') return 'R$ —';
  const s = String(v).trim();
  const n = parseFloat(s.replace(/\./g, '').replace(',', '.'));
  if (isNaN(n)) return /^R\$/i.test(s) ? s : 'R$ ' + s;
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarData(iso) {
  if (!iso) return '—';
  const p = String(iso).split('-');
  return (p[2] && p[1] && p[0]) ? (p[2] + '/' + p[1] + '/' + p[0]) : iso;
}
function formatarDataHora(d) {
  const dt = d instanceof Date ? d : new Date(d);
  if (isNaN(dt)) return '—';
  const pad = n => String(n).padStart(2, '0');
  return pad(dt.getDate()) + '/' + pad(dt.getMonth() + 1) + '/' + dt.getFullYear() +
    ' ' + pad(dt.getHours()) + ':' + pad(dt.getMinutes()) + ':' + pad(dt.getSeconds());
}

function montarTituloCabecalho(dfd) {
  const bruto = String((dfd && dfd.numero) || '').trim();
  if (!bruto) return 'Documento de Formalização de Demanda';
  const m = bruto.match(/^([A-Za-zÀ-ÿ]+)\s*[-–—\/]?\s*(.*)$/);
  if (!m) return 'DFD · ' + bruto;
  const pre = m[1].toUpperCase();
  const rst = (m[2] || '').trim();
  if (pre === 'DFD') return rst ? ('DFD · ' + rst) : 'DFD';
  if (pre.length <= 4) return rst ? (pre + ' · ' + rst) : pre;
  const t = pre.charAt(0) + pre.slice(1).toLowerCase();
  return rst ? (t + ' · ' + rst) : t;
}

/* ==============================================================
   BUILDER PRINCIPAL — async
   ============================================================== */
async function buildDfdPdfDefinition(dfd, org, logoDataUrl, opts) {
  opts = opts || {};
  const geradoEm = opts.geradoEm || new Date();
  const versao   = opts.versao   || 'OmniLicit LicitaReq v5.0';

  const core = window.OmniLicit;
  const tag  = opts.tag  || (core ? await core.gerarTag(dfd, org) : 'OMNILICIT::DFD::PENDING::' + geradoEm.getFullYear());
  const hash = opts.hash || (core ? await core.gerarHash({ v: '5.0', tag, dfd, org: { nome: org && org.nome, cnpj: org && org.cnpj, sigla: org && org.sigla } })
                                 : '0'.repeat(64));

  const aprovadores = Array.isArray(opts.aprovadores) ? opts.aprovadores : [];
  const tituloCabecalho = montarTituloCabecalho(dfd);
  const auth = { tag, hash, geradoEm, versao, org: org || {}, dfd: dfd || {} };

  return {
    pageSize: 'A4',
    pageMargins: [40, 62, 40, 78],

    info: {
      title:    (tituloCabecalho + ' — ' + ((org && org.nome) || 'OmniLicit')).trim(),
      author:   (org && org.nome) || 'OmniLicit',
      subject:  'Documento de Formalização de Demanda — Lei nº 14.133/2021',
      keywords: 'OmniLicit, LicitaReq, DFD, LicitaAudit, ' + tag,
      creator:  versao,
    },

    header: function (currentPage) {
      if (currentPage === 1) return { text: '' };
      return {
        margin: [40, 16, 40, 0],
        columns: [
          montarMiniLogoCabecalho(logoDataUrl),
          {
            margin: [8, 1, 0, 0],
            stack: [
              { text: (org && org.nome ? org.nome : 'OMNILICIT').toUpperCase(),
                fontSize: 8.5, bold: true, color: OL.executivo },
              { text: tituloCabecalho, fontSize: 7.5, color: OL.muted },
            ],
          },
          {
            alignment: 'right',
            stack: [
              { text: 'OMNILICIT', fontSize: 8, bold: true, color: OL.petroleoD },
              { text: 'LicitaReq · Documento Oficial', fontSize: 7, color: OL.muted },
            ],
          },
        ],
      };
    },

    footer: function (currentPage, pageCount) {
      return montarRodapeAutenticacao(currentPage, pageCount, auth);
    },

    content: [
      montarCapaExecutiva(dfd, org, logoDataUrl, geradoEm),
      { text: '', pageBreak: 'after' },
      montarNotaApresentacao(geradoEm),
      { text: '', pageBreak: 'after' },
      montarCorpoTecnico(dfd, org),
      ...(aprovadores.length ? montarPaginaAprovacoes(aprovadores) : []),
      montarPaginaAutenticacaoFinal(auth),
    ],

    defaultStyle: { fontSize: 9.5, color: OL.ink, lineHeight: 1.35 },
  };
}

/* ==============================================================
   MINI LOGO (cabeçalho)
   ============================================================== */
function montarMiniLogoCabecalho(logoDataUrl) {
  if (logoDataUrl) {
    return { width: 20, image: logoDataUrl, fit: [20, 24], alignment: 'center' };
  }
  const core = window.OmniLicit;
  if (!core || !core.escudo) return { width: 0, text: '' };
  return { width: 20, canvas: core.escudo(20, 24).canvas };
}

/* ==============================================================
   RODAPÉ FIXO — Autenticação OmniLicit
   ============================================================== */
function montarRodapeAutenticacao(page, total, auth) {
  const { tag, hash, geradoEm, versao } = auth;
  const dt = formatarDataHora(geradoEm);

  if (page === 1) {
    return {
      margin: [40, 0, 40, 18],
      columns: [
        { text: versao, fontSize: 7, color: OL.muted },
        { text: 'Emitido em ' + dt, alignment: 'center', fontSize: 7, color: OL.muted },
        { text: 'Pág. ' + page + '/' + total, alignment: 'right', fontSize: 7, color: OL.muted },
      ],
    };
  }

  return {
    margin: [40, 6, 40, 16],
    stack: [
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: OL.petroleo }] },
      {
        margin: [0, 4, 0, 0],
        columns: [
          {
            width: '*',
            stack: [
              { text: tag, fontSize: 7, bold: true, color: OL.petroleoD, font: 'Courier' },
              { text: 'SHA-256: ' + hash, fontSize: 6.3, color: OL.muted, font: 'Courier', margin: [0, 2, 0, 0] },
            ],
          },
          {
            width: 'auto',
            alignment: 'right',
            stack: [
              { text: versao + ' · OmniLicit Audit', fontSize: 7, color: OL.muted },
              { text: dt + ' · Pág. ' + page + '/' + total, fontSize: 7, color: OL.muted },
            ],
          },
        ],
      },
      {
        margin: [0, 3, 0, 0],
                text: '• Documento íntegro · Autenticidade verificável via OmniLicit Audit',
        fontSize: 6, italics: true, color: OL.muted,
      },
    ],
  };
}

/* ==============================================================
   CAPA EXECUTIVA
   ============================================================== */
function montarCapaExecutiva(dfd, org, logoDataUrl, geradoEm) {
  const core = window.OmniLicit;
  const escudoCol = (core && core.escudo) ? core.escudo(70, 84) : null;

  return {
    stack: [
      {
        table: { widths: ['*'], body: [[{
          stack: [
            { text: 'OMNILICIT · LICITAREQ', fontSize: 8, bold: true,
              color: '#C2ECE7', alignment: 'center' },
            { text: 'DOCUMENTO OFICIAL DE CONTRATAÇÃO PÚBLICA',
              fontSize: 9.5, bold: true, color: '#FFFFFF',
              alignment: 'center', margin: [0, 4, 0, 0] },
          ],
          fillColor: OL.petroleo,
          margin: [0, 11, 0, 11],
        }]]},
        layout: 'noBorders',
        margin: [0, 0, 0, 22],
      },

      logoDataUrl
        ? { image: logoDataUrl, fit: [90, 90], alignment: 'center', margin: [0, 0, 0, 12] }
        : (escudoCol
            ? { width: 70, canvas: escudoCol.canvas, alignment: 'center', margin: [0, 0, 0, 14] }
            : { text: '', margin: [0, 0, 0, 26] }),

      { text: (org && org.nome ? org.nome : 'ÓRGÃO / ENTIDADE').toUpperCase(),
        fontSize: 15, bold: true, alignment: 'center', color: OL.executivo,
        margin: [0, 0, 0, 4] },
      { text: [
          org && org.sigla ? 'Sigla: ' + org.sigla : '',
          org && org.cnpj  ? 'CNPJ: '  + org.cnpj  : '',
        ].filter(Boolean).join(' · '),
        fontSize: 8.5, alignment: 'center', color: OL.muted },
      org && org.endereco
        ? { text: org.endereco, fontSize: 8, alignment: 'center', color: OL.muted, margin: [0, 2, 0, 0] }
        : null,
      org && (org.cidade || org.uf)
        ? { text: [org.cidade, org.uf].filter(Boolean).join('/'),
            fontSize: 8, alignment: 'center', color: OL.muted, margin: [0, 2, 0, 0] }
        : null,

      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1.2, lineColor: OL.petroleo }],
        margin: [0, 24, 0, 16] },

      { text: 'DOCUMENTO DE FORMALIZAÇÃO DE DEMANDA',
        fontSize: 18, bold: true, alignment: 'center', color: OL.ink },
      { text: 'Lei nº 14.133/2021 · Art. 18, § 1º',
        fontSize: 11, alignment: 'center', color: OL.executivo, margin: [0, 4, 0, 0] },

      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1.2, lineColor: OL.petroleo }],
        margin: [0, 16, 0, 20] },

      {
        table: {
          widths: ['*', '*'],
          body: [
            [ cartao('Nº do DFD', dfd.numero || '—'),
              cartao('Data', formatarData(dfd.data) || formatarData(geradoEm)) ],
            [ cartao('Unidade Requisitante', dfd.unidade || '—'),
              cartao('Órgão / Entidade', dfd.orgao || (org && org.nome) || '—') ],
            [ cartao('Responsável pela Demanda', dfd.responsavel || '—'),
              cartao('Cargo / Função', dfd.cargo || '—') ],
          ],
        },
        layout: layoutCartoes(),
        margin: [0, 0, 0, 18],
      },

      {
        table: { widths: ['*'], body: [[{
          stack: [
            { text: 'VALOR ESTIMADO DA CONTRATAÇÃO',
              fontSize: 9, bold: true, alignment: 'center', color: OL.petroleoD },
            { text: normalizarValorMonetario(dfd.valor),
              fontSize: 22, bold: true, alignment: 'center', color: OL.ink,
              margin: [0, 6, 0, 3] },
            { text: 'Estimativa baseada em: ' + rotulo('metodo', dfd.metodo),
              fontSize: 8, alignment: 'center', color: OL.muted },
          ],
          fillColor: '#E6F7F5',
          margin: [20, 14, 20, 14],
        }]]},
        layout: {
          hLineColor: () => OL.petroleo, vLineColor: () => OL.petroleo,
          hLineWidth: () => 0.8, vLineWidth: () => 0.8,
          paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 0, paddingBottom: () => 0,
        },
        margin: [0, 0, 0, 20],
      },

      dfd.objeto ? {
        table: { widths: ['*'], body: [[{
          stack: [
            { text: 'OBJETO DA CONTRATAÇÃO',
              fontSize: 8, bold: true, color: OL.petroleoD, margin: [0, 0, 0, 5] },
            { text: dfd.objeto, fontSize: 10, color: OL.ink, lineHeight: 1.5, alignment: 'justify' },
          ],
          fillColor: OL.bg,
          margin: [16, 12, 16, 12],
        }]]},
        layout: 'noBorders',
        margin: [0, 0, 0, 18],
      } : null,

      { text: 'Emitido em ' + formatarDataHora(geradoEm),
        fontSize: 8, alignment: 'center', color: OL.muted, margin: [0, 12, 0, 0] },
    ].filter(Boolean),
  };
}

function cartao(label, valor) {
  return {
    stack: [
      { text: String(label).toUpperCase(), fontSize: 7, bold: true, color: OL.muted, margin: [0, 0, 0, 3] },
      { text: valor || '—', fontSize: 9.5, bold: true, color: OL.ink, lineHeight: 1.35 },
    ],
    margin: [12, 9, 12, 9],
  };
}
function layoutCartoes() {
  return {
    hLineColor: () => OL.line, vLineColor: () => OL.line,
    hLineWidth: () => 0.4, vLineWidth: () => 0.4,
    fillColor: i => (i % 2 === 0 ? OL.bg : '#FFFFFF'),
    paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 0, paddingBottom: () => 0,
  };
}

/* ==============================================================
   NOTA DE APRESENTAÇÃO
   ============================================================== */
function montarNotaApresentacao(geradoEm) {
  return {
    stack: [
      { text: '', margin: [0, 20, 0, 0] },
      { text: 'NOTA DE APRESENTAÇÃO INSTITUCIONAL',
        fontSize: 14, bold: true, alignment: 'center', color: OL.executivo,
        margin: [0, 0, 0, 6] },
      { text: 'Termo de Abertura do Procedimento Administrativo',
        fontSize: 9.5, alignment: 'center', color: OL.petroleoD, margin: [0, 0, 0, 12] },
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1.2, lineColor: OL.petroleo }],
        margin: [0, 0, 0, 20] },

      blocoNota('I. CONTEXTUALIZAÇÃO',
        'O presente Documento de Formalização de Demanda (DFD) formaliza o início ' +
        'do procedimento administrativo de contratação pública no âmbito deste órgão, ' +
        'em conformidade com a Lei nº 14.133/2021, seu Art. 18, § 1º, e demais normas ' +
        'correlatas. O documento é instruído com a identificação da necessidade, ' +
        'a devida motivação administrativa, a estimativa de valor e o enquadramento ' +
        'legal aplicável, servindo de base para as etapas subsequentes de planejamento ' +
        'da contratação.', '#FFFFFF'),

      blocoNota('II. FINALIDADE E FUNDAMENTAÇÃO LEGAL',
        'Este documento tem por finalidade instruir o processo administrativo ' +
        'de contratação, garantindo a motivação e o planejamento previstos no ' +
        'Art. 18 da Lei nº 14.133/2021. A instrução processual observa ainda os ' +
        'princípios do Art. 5º — legalidade, impessoalidade, moralidade, publicidade, ' +
        'eficiência, interesse público, motivação, segurança jurídica, razoabilidade, ' +
        'competitividade e eficácia — bem como as diretrizes do Art. 11.', OL.bg),

      blocoNota('III. AUTENTICIDADE E RASTREABILIDADE',
        'Este documento foi gerado eletronicamente pelo sistema LicitaReq (OmniLicit), ' +
        'possui TAG única rastreável pelo OmniLicit Audit e hash SHA-256 de integridade ' +
        'impresso no rodapé de cada página. Sua validade jurídica está condicionada à ' +
        'conferência pela assessoria jurídica, pelo controle interno e pela autoridade ' +
        'competente, conforme preconiza a legislação vigente.', '#E6F7F5'),

      { text: 'Documento emitido em ' + formatarDataHora(geradoEm),
        fontSize: 8.5, italics: true, alignment: 'center', color: OL.muted, margin: [0, 14, 0, 0] },
    ],
  };
}

function blocoNota(titulo, texto, bg) {
  return {
    table: { widths: ['*'], body: [[{
      stack: [
        { text: titulo, fontSize: 9, bold: true, color: OL.petroleoD, margin: [0, 0, 0, 6] },
        { text: texto, fontSize: 10, color: '#334155', lineHeight: 1.7, alignment: 'justify' },
      ],
      fillColor: bg, margin: [20, 16, 20, 16],
    }]]},
    layout: {
      hLineColor: () => OL.petroleo, vLineColor: () => OL.petroleo,
      hLineWidth: () => 0.6, vLineWidth: () => 0.6,
      paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 0, paddingBottom: () => 0,
    },
    margin: [0, 0, 0, 16],
  };
}

/* ==============================================================
   CORPO TÉCNICO
   ============================================================== */
function montarCorpoTecnico(dfd, org) {
  return {
    stack: [
      montarPainelConformidade(dfd, org),
      { text: '', margin: [0, 10, 0, 0] },
      ...montarSecoesTecnicas(dfd, org),
    ],
  };
}

function montarPainelConformidade(dfd, org) {
  const linhas = [
    ['Nº do DFD', '—'],['Data da Formalização', '—'],
    ['Órgão / Entidade', '—'],['Unidade Requisitante', '—'],
    ['Responsável pela Demanda', '—'],['Cargo / Função', '—'],
    ['Objeto da Contratação', '—'],['Estimativa de Quantidades', '—'],
    ['Valor Estimado', '—'],['Método de Estimativa', '—'],
    ['Dotação Orçamentária', '—'],['Fonte de Recurso', '—'],
    ['Previsão no PCA', '—'],['Item / Código no PCA', '—'],
    ['Modalidade Pretendida', '—'],['Natureza do Objeto', '—'],
    ['Critério de Julgamento', '—'],['Regime de Execução', '—'],
    ['Decisão de Parcelamento', '—'],['Prazo de Execução', '—'],
    ['Local de Entrega', '—'],['Condições de Pagamento', '—'],
    ['Fiscal Titular', '—'],['Fiscal Substituto', '—'],
    ['Gestor do Contrato', '—'],['Vistoria Técnica', '—'],
  ];
  const valores = [
    dfd.numero || '—',
    formatarData(dfd.data),
    dfd.orgao || (org && org.nome) || '—',
    dfd.unidade || '—',
    dfd.responsavel || '—',
    dfd.cargo || '—',
    dfd.objeto || '—',
    dfd.quantidades || '—',
    normalizarValorMonetario(dfd.valor),
    rotulo('metodo', dfd.metodo),
    dfd.dotacao || '—',
    dfd.fonte || '—',
    rotulo('pca', dfd.pcaPrevisto),
    dfd.pcaItem || '—',
    rotulo('modalidade', dfd.modalidade),
    rotulo('natureza', dfd.natureza),
    rotulo('criterio', dfd.criterio),
    rotulo('regime', dfd.regime),
    rotulo('parcelamento', dfd.parcelamento),
    dfd.prazo || '—',
    dfd.local || '—',
    rotulo('pagamento', dfd.pagamento),
    dfd.fiscalTitular || '—',
    dfd.fiscalSubstituto || '—',
    dfd.gestor || '—',
    rotulo('vistoria', dfd.vistoria),
  ];
  const body = linhas.map((par, i) => [
    { text: par[0] + ':', fontSize: 8.5, bold: true, color: OL.executivoD, margin: [8, 5, 8, 5] },
    { text: valores[i], fontSize: 8.5, color: OL.ink, margin: [8, 5, 8, 5] },
  ]);

  return {
    unbreakable: true,
    stack: [
      { text: 'PAINEL DE CONFORMIDADE — LEI Nº 14.133/2021',
        fontSize: 10.5, bold: true, color: OL.petroleoD,
        alignment: 'center', margin: [0, 0, 0, 4] },
      { text: 'Bloco de leitura automatizada para o OmniLicit Audit',
        fontSize: 8, italics: true, color: OL.muted,
        alignment: 'center', margin: [0, 0, 0, 10] },
      {
        table: { widths: ['38%', '*'], body: body },
        layout: {
          hLineColor: () => OL.line, vLineColor: () => OL.line,
          hLineWidth: (i, n) => (i === 0 || i === n.table.body.length) ? 0.8 : 0.3,
          vLineWidth: () => 0.3,
          fillColor: i => (i % 2 === 0 ? OL.bg : null),
          paddingLeft: () => 4, paddingRight: () => 4,
          paddingTop: () => 0, paddingBottom: () => 0,
        },
        dontBreakRows: true,
      },
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: OL.petroleo }],
        margin: [0, 12, 0, 4] },
    ],
  };
}

function montarSecoesTecnicas(dfd, org) {
  return [
    secao('1. Identificação', [
      parDuplo(campo('Nº do DFD / Expediente', dfd.numero),
               campo('Data da Formalização',   formatarData(dfd.data))),
      parDuplo(campo('Unidade Requisitante',   dfd.unidade),
               campo('Órgão / Entidade',       dfd.orgao || (org && org.nome))),
      parDuplo(campo('Responsável pela Demanda', dfd.responsavel),
               campo('Cargo / Função',           dfd.cargo)),
    ]),
    secao('2. Objeto e Justificativa', [
      campo('Descrição Resumida do Objeto', dfd.objeto, { full: true }),
      campo('Justificativa da Necessidade Pública (Fundamentada)', dfd.justificativa, { full: true, bloco: true }),
      campo('Estimativa de Quantidades', dfd.quantidades, { full: true }),
    ]),
    secao('3. Alinhamento ao Plano de Contratações Anual (PCA)', [
      parDuplo(campo('Previsão no PCA', rotulo('pca', dfd.pcaPrevisto)),
               campo('Item / Código no PCA', dfd.pcaItem)),
      campo('Justificativa do Alinhamento', dfd.pcaJustificativa, { full: true, bloco: true }),
    ]),
    secao('4. Enquadramento Legal', [
      parDuplo(campo('Modalidade Pretendida (Art. 28)', rotulo('modalidade', dfd.modalidade)),
               campo('Natureza do Objeto (Art. 6º)',    rotulo('natureza',   dfd.natureza))),
      parDuplo(campo('Critério de Julgamento (Art. 33)', rotulo('criterio', dfd.criterio)),
               campo('Regime de Execução (Art. 46)',     rotulo('regime',   dfd.regime))),
    ]),
    secao('5. Estimativa Orçamentária', [
      parDuplo(campo('Valor Estimado', normalizarValorMonetario(dfd.valor)),
               campo('Método de Estimativa', rotulo('metodo', dfd.metodo))),
      parDuplo(campo('Dotação Orçamentária', dfd.dotacao),
               campo('Fonte de Recurso',     dfd.fonte)),
    ]),
    secao('6. Parcelamento, Prazo e Entrega', [
      parDuplo(campo('Decisão de Parcelamento (Art. 47)', rotulo('parcelamento', dfd.parcelamento)),
               campo('Prazo de Execução / Vigência',      dfd.prazo)),
      parDuplo(campo('Local de Entrega / Prestação', dfd.local),
               campo('Condições de Pagamento',       rotulo('pagamento', dfd.pagamento))),
    ]),
    secao('7. Fiscalização e Gestão Contratual (Art. 117)', [
      parDuplo(campo('Fiscal Titular',     dfd.fiscalTitular),
               campo('Fiscal Substituto',  dfd.fiscalSubstituto)),
      parDuplo(campo('Gestor do Contrato', dfd.gestor),
               campo('Vistoria Técnica',   rotulo('vistoria', dfd.vistoria))),
    ]),
    secao('8. Observações Complementares', [
      campo('Observações Adicionais',
            dfd.observacoes || 'Sem observações adicionais.',
            { full: true, bloco: true }),
    ]),
  ];
}

function secao(titulo, corpo) {
  return {
    unbreakable: true,
    stack: [
      { text: titulo, fontSize: 11, bold: true, color: OL.executivo, margin: [0, 12, 0, 10] },
      ...corpo,
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.4, lineColor: OL.line }],
        margin: [0, 10, 0, 4] },
    ],
  };
}
function campo(label, valor, options) {
  options = options || {};
  const bloco = options.bloco || false;
  return {
    full: options.full || false,
    stack: [
      { text: label + ':', fontSize: 8, bold: true, color: OL.muted, margin: [0, 0, 0, 2] },
      { text: valor || '—', fontSize: bloco ? 9 : 9.5, color: OL.ink, lineHeight: 1.4 },
    ],
    margin: [0, 0, 0, 10],
  };
}
function parDuplo(c1, c2) {
  if (c1.full || c2.full) return { unbreakable: true, stack: [c1, c2] };
  return {
    unbreakable: true,
    columns: [
      { width: '50%', stack: c1.stack },
      { width: '50%', stack: c2.stack },
    ],
    columnGap: 20,
  };
}
function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/* ==============================================================
   PÁGINA DE APROVAÇÕES
   ============================================================== */
function montarPaginaAprovacoes(aprovadores) {
  aprovadores = aprovadores || [];

  if (!aprovadores.length) {
    return [{
      pageBreak: 'before',
      stack: [
        cabecalhoAprovacoes(true, 1, 1, 0, 0),
        {
          table: { widths: ['*'], body: [[{
            stack: [
              { text: '[!]', fontSize: 26, alignment: 'center', color: '#F59E0B', margin: [0, 0, 0, 8] },
              { text: 'Nenhum aprovador ou validador foi informado',
                fontSize: 12, bold: true, alignment: 'center', color: '#78350F', margin: [0, 0, 0, 6] },
              { text: 'Preencha o Bloco 7A (Aprovadores e Validadores) no formulário do LicitaReq antes de gerar o PDF.',
                fontSize: 9, alignment: 'center', color: '#92400E', lineHeight: 1.55 },
            ],
            fillColor: '#FEF3C7', margin: [20, 20, 20, 20],
          }]]},
          layout: 'noBorders',
        },
      ],
    }];
  }

  const MAX = 6;
  const grupos = distribuir(aprovadores, MAX);
  return grupos.map((grupo, idx) => {
    const ehPrimeira = idx === 0;
    const ehUltima   = idx === grupos.length - 1;
    return {
      pageBreak: 'before',
      stack: [
        cabecalhoAprovacoes(ehPrimeira, idx + 1, grupos.length, aprovadores.length, grupo.length),
        ...montarLinhas(grupo),
        ehUltima ? rodapeAprovacoes(aprovadores.length, grupos.length) : { text: '', margin: [0, 20, 0, 0] },
      ],
    };
  });
}

function distribuir(aprovadores, max) {
  const n = aprovadores.length;
  if (n <= max) return [aprovadores];
  const pags = Math.ceil(n / max);
  const base = Math.floor(n / pags);
  const resto = n % pags;
  const out = [];
  let idx = 0;
  for (let i = 0; i < pags; i++) {
    const tam = base + (i < resto ? 1 : 0);
    out.push(aprovadores.slice(idx, idx + tam));
    idx += tam;
  }
  return out;
}

function cabecalhoAprovacoes(ehPrimeira, pag, tot, totAss, noGrupo) {
  const stack = [
    { text: 'APROVAÇÃO E VALIDAÇÃO',
      fontSize: ehPrimeira ? 15 : 13, bold: true, alignment: 'center', color: OL.executivo,
      margin: [0, 0, 0, 4] },
    { text: 'Lei nº 14.133/2021 · Art. 18, § 1º',
      fontSize: 9, alignment: 'center', color: OL.petroleoD, margin: [0, 0, 0, 8] },
    { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1.2, lineColor: OL.petroleo }],
      margin: [0, 0, 0, 10] },
  ];
  if (tot > 1) {
    stack.push({
      text: 'Página ' + pag + ' de ' + tot + ' · ' + noGrupo + ' de ' + totAss + ' assinaturas',
      fontSize: 8, italics: true, alignment: 'center', color: OL.muted, margin: [0, 0, 0, 10],
    });
  }
  if (ehPrimeira) {
    stack.push({
      text: 'Os responsáveis abaixo identificados aprovam e validam o presente Documento ' +
            'de Formalização de Demanda, atestando a veracidade das informações e a ' +
            'conformidade com a legislação vigente.',
      fontSize: 9, color: '#334155', lineHeight: 1.5, alignment: 'justify',
      margin: [0, 0, 0, 18],
    });
  }
  return { unbreakable: true, stack: stack };
}

function montarLinhas(grupo) {
  const linhas = chunk(grupo, 2);
  const ult = linhas.length - 1;
  return linhas.map((par, idx) => ({
    stack: [{
      unbreakable: true,
      columns: [
        { width: '50%', stack: blocoAssinatura(par[0]) },
        par[1] ? { width: '50%', stack: blocoAssinatura(par[1]) } : { width: '50%', text: '' },
      ],
      columnGap: 26,
    }],
    margin: [0, 0, 0, idx === ult ? 0 : 22],
  }));
}

function blocoAssinatura(p) {
  const linhas = [
    { text: '', margin: [0, 32, 0, 0] },
    { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 225, y2: 0, lineWidth: 0.9,
                 lineColor: OL.executivo, dash: { length: 3, space: 2 } }],
      margin: [0, 0, 0, 5] },
    { text: 'Assinatura / Carimbo', fontSize: 7, italics: true,
      alignment: 'center', color: OL.muted, margin: [0, 0, 0, 8] },
    { text: p.nome || '—', fontSize: 10.5, bold: true, alignment: 'center', color: OL.ink },
  ];
  if (p.cargo) linhas.push({ text: p.cargo, fontSize: 8.5, alignment: 'center', color: '#334155', margin: [0, 2, 0, 0] });
  if (p.orgao) linhas.push({ text: p.orgao, fontSize: 8, alignment: 'center', color: OL.muted, margin: [0, 2, 0, 0] });
  if (p.papel) linhas.push({ text: rotulo('papel', p.papel).toUpperCase(), fontSize: 7, bold: true,
    alignment: 'center', color: OL.petroleoD, margin: [0, 6, 0, 0] });

  return [{
    table: { widths: ['*'], body: [[{ stack: linhas, margin: [12, 8, 12, 10] }]] },
    layout: {
      hLineColor: () => OL.line, vLineColor: () => OL.line,
      hLineWidth: () => 0.4, vLineWidth: () => 0.4,
      paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 0, paddingBottom: () => 0,
    },
  }];
}

function rodapeAprovacoes(total, totPags) {
  return {
    unbreakable: true,
    stack: [
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.6, lineColor: OL.line }],
        margin: [0, 30, 0, 10] },
      { text: 'Total de assinaturas: ' + total + (totPags > 1 ? ' · distribuídas em ' + totPags + ' páginas' : ''),
        fontSize: 8, italics: true, alignment: 'center', color: OL.muted },
    ],
  };
}

/* ==============================================================
   PÁGINA FINAL — AUTENTICAÇÃO
   ============================================================== */
function montarPaginaAutenticacaoFinal(auth) {
  const { tag, hash, geradoEm, versao, org, dfd } = auth;
  return {
    pageBreak: 'before',
    stack: [{
      unbreakable: true,
      stack: [
         { text: '', margin: [0, 4, 0, 0] },
        { text: '[SEG]', fontSize: 14, bold: true, alignment: 'center',
          color: OL.petroleoD, letterSpacing: 2, margin: [0, 0, 0, 10] },
        { text: 'AUTENTICAÇÃO E RASTREABILIDADE',,
          fontSize: 14, bold: true, alignment: 'center', color: OL.petroleoD,
          margin: [0, 0, 0, 3] },
        { text: 'Documento Oficial OmniLicit · Integração LicitaAudit',
          fontSize: 8.5, alignment: 'center', color: OL.muted, margin: [0, 0, 0, 14] },

        {
          table: { widths: ['*'], body: [[{
            stack: [
              { text: 'TAG DE AUTENTICAÇÃO', fontSize: 8, bold: true,
                alignment: 'center', color: '#C2ECE7', margin: [0, 0, 0, 3] },
              { text: tag, fontSize: 12, bold: true, alignment: 'center', color: '#FFFFFF' },
            ],
            fillColor: OL.petroleo, margin: [16, 12, 16, 12],
          }]]},
          layout: 'noBorders', margin: [0, 0, 0, 12],
        },

        {
          table: {
            widths: ['35%', '*'],
            body: [
              linhaMeta('Hash SHA-256', hash),
              linhaMeta('Emitido em',          formatarDataHora(geradoEm)),
              linhaMeta('Sistema Emissor',     versao),
              linhaMeta('Órgão Emissor',       (org && org.nome) || '—'),
              linhaMeta('Expediente',          (dfd && dfd.numero) || '—'),
              linhaMeta('Tag de Integração',   'PREFIRO_TAG: OmniLicit_DFD_Oficial'),
            ],
          },
          layout: layoutMeta(), margin: [0, 0, 0, 12],
        },

        {
          table: { widths: ['*'], body: [[{
            stack: [
              { text: '[!]  AVISO IMPORTANTE', fontSize: 8.5, bold: true,
                color: '#92400E', margin: [0, 0, 0, 4] },
              { text: 'Este documento foi gerado automaticamente pelo sistema LicitaReq (OmniLicit) ' +
                      'e possui TAG de autenticação única rastreável pelo OmniLicit Audit. A validade ' +
                      'jurídica do presente DFD está condicionada à conferência pela assessoria ' +
                      'jurídica, pelo controle interno e pela autoridade competente.',
                fontSize: 8, color: '#78350F', lineHeight: 1.4, alignment: 'justify' },
            ],
            fillColor: '#FEF3C7', margin: [14, 10, 14, 10],
          }]]},
          layout: 'noBorders', margin: [0, 0, 0, 12],
        },

        {
          table: { widths: ['*'], body: [[{
            stack: [
              { text: '•  SELO DIGITAL OMNILICIT', fontSize: 8, bold: true,
                alignment: 'center', color: OL.petroleoD, margin: [0, 0, 0, 3] },
              { text: 'Documento íntegro · Não adulterado · Rastreável', fontSize: 7,
                alignment: 'center', color: OL.muted, margin: [0, 3, 0, 0] },
              { text: tag, fontSize: 7, alignment: 'center',
                color: OL.muted, font: 'Courier', margin: [0, 4, 0, 0] },
            ],
            fillColor: '#E6F7F5', margin: [14, 10, 14, 10],
          }]]},
          layout: 'noBorders',
        },
      ],
    }],
  };
}

function linhaMeta(chave, valor) {
  return [
    { text: chave + ':', fontSize: 8, bold: true, color: '#334155',
      fillColor: '#F1F5F9', margin: [8, 5, 8, 5] },
    { text: valor || '—', fontSize: 8, color: OL.ink,
      font: /^[A-F0-9]{64}$/.test(valor || '') ? 'Courier' : undefined,
      margin: [8, 5, 8, 5] },
  ];
}
function layoutMeta() {
  return {
    hLineColor: () => '#CBD5E1', vLineColor: () => '#CBD5E1',
    hLineWidth: () => 0.4, vLineWidth: () => 0.4,
    paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 0, paddingBottom: () => 0,
  };
}

/* ==============================================================
   EXPORT
   ============================================================== */
window.LicitaReqPDF = {
  buildDfdPdfDefinition,
  montarTituloCabecalho,
  ROTULOS,
  rotulo,
  normalizarValorMonetario,
  formatarData,
  formatarDataHora,
};
