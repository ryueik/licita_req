/* ============================================================
   LicitaReq — pdf-dfd.js
   v4.4 — Correções cirúrgicas de layout
   ------------------------------------------------------------
   • Header limpo (sem "DFD DFD")
   • Nota de Apresentação em página própria (isolada da capa)
   • Seção 6 inquebrável (sem corte entre páginas)
   • Autenticação em página única (mantida)
   ============================================================ */

/* --------------------------------------------------------------
   DICIONÁRIO DE RÓTULOS
   -------------------------------------------------------------- */
const ROTULOS = Object.freeze({
  modalidade: {
    'pregao':          'Pregão Eletrônico (Art. 29)',
    'concorrencia':    'Concorrência (Art. 29)',
    'concurso':        'Concurso (Art. 30)',
    'leilao':          'Leilão (Art. 31)',
    'dialogo':         'Diálogo Competitivo (Art. 32)',
    'dispensa':        'Dispensa de Licitação (Art. 75)',
    'inexigibilidade': 'Inexigibilidade de Licitação (Art. 74)'
  },
  natureza: {
    'bens':               'Bens Comuns',
    'servicos-comuns':    'Serviços Comuns',
    'servicos-especiais': 'Serviços Especiais',
    'obras':              'Obras e Serviços de Engenharia',
    'intelectual':        'Serviços Técnicos Intelectuais',
    'alienacao':          'Alienação de Bens / Concessão'
  },
  criterio: {
    'menor-preco':    'Menor Preço',
    'maior-desconto': 'Maior Desconto',
    'melhor-tecnica': 'Melhor Técnica ou Conteúdo Artístico',
    'tecnica-preco':  'Técnica e Preço',
    'maior-lance':    'Maior Lance',
    'maior-retorno':  'Maior Retorno Econômico'
  },
  regime: {
    'empreitada-preco-unitario': 'Empreitada por Preço Unitário',
    'empreitada-preco-global':   'Empreitada por Preço Global',
    'empreitada-integral':       'Empreitada Integral',
    'tarefa':                    'Tarefa',
    '':                          'Não Aplicável / Não Declarado'
  },
  metodo: {
    'painel-precos':          'Painel de Preços (Gov.br)',
    'pesquisa-mercado':       'Pesquisa de Mercado (três ou mais fornecedores)',
    'contratacoes-similares': 'Contratações Similares',
    'sinapi':                 'SINAPI / SICRO (Obras)',
    'midia':                  'Mídia Especializada / Sítios Eletrônicos'
  },
  parcelamento: {
    'parcelado':   'Parcelado em Lotes (devidamente justificado)',
    'indivisivel': 'Indivisível (devidamente justificado)',
    'lote-unico':  'Lote Único (por compatibilidade técnica)'
  },
  pagamento: {
    '30-dias':          'Até 30 dias após a Nota Fiscal e o Aceite (Art. 141)',
    'parcelado-mensal': 'Mensal, mediante medição',
    'entrega-unica':    'Pagamento único contra entrega'
  },
  vistoria: {
    'dispensada':              'Dispensada (não aplicável)',
    'declaracao-substituicao': 'Declaração em Substituição (Art. 63)',
    'obrigatoria':             'Obrigatória (com justificativa técnica)'
  },
  pca: {
    'sim':     'Sim — contratação prevista no PCA',
    'nao':     'Não — inclusão extraordinária',
    'revisao': 'Sim — em revisão do PCA',
    '':        'Não informado'
  },
  papel: {
    'aprovador':   'Aprovador',
    'validador':   'Validador',
    'autoridade':  'Autoridade Competente',
    'fiscal':      'Fiscal do Contrato',
    'gestor':      'Gestor do Contrato',
    'requisitante':'Requisitante'
  }
});

function rotulo(grupo, valor) {
  return (ROTULOS[grupo] && ROTULOS[grupo][valor]) || valor || '—';
}

/* ==============================================================
   NORMALIZAÇÃO DE VALOR MONETÁRIO
   ============================================================== */
function normalizarValorMonetario(v) {
  if (v == null || v === '') return '—';
  const s = String(v).trim();
  if (/^R\$/i.test(s)) return s;
  return 'R$ ' + s;
}

/* ==============================================================
   ⭐ [FIX 1] HEADER LIMPO — sem "DFD DFD"
   --------------------------------------------------------------
   Recebe dfd.numero (ex.: "DFD 042/2026", "042/2026", "Requerimento 12")
   e devolve um título padronizado:
     "DFD 042/2026"       → "DFD · 042/2026"
     "042/2026"           → "DFD · 042/2026"
     "DFD-042/2026"       → "DFD · 042/2026"
     "Requerimento 12"    → "Requerimento · 12"
     ""                   → "Documento de Formalização de Demanda"
   ============================================================== */
function montarTituloCabecalho(dfd) {
  const bruto = String((dfd && dfd.numero) || '').trim();
  if (!bruto) return 'Documento de Formalização de Demanda';

  // Detecta prefixo alfabético (DFD, OF, MEMO, Requerimento…)
  const match = bruto.match(/^([A-Za-zÀ-ÿ]+)\s*[-–—\/]?\s*(.*)$/);
  if (!match) return 'DFD · ' + bruto;

  const prefixo = match[1].toUpperCase();
  const resto   = (match[2] || '').trim();

  // Se o prefixo já é "DFD" e há resto, retorna "DFD · <resto>"
  if (prefixo === 'DFD') {
    return resto ? ('DFD · ' + resto) : 'DFD';
  }

  // Siglas curtas (2-4 letras) → mantém em maiúsculas
  if (prefixo.length <= 4) {
    return resto ? (prefixo + ' · ' + resto) : prefixo;
  }

  // Palavras longas → Title Case
  const titulo = prefixo.charAt(0) + prefixo.slice(1).toLowerCase();
  return resto ? (titulo + ' · ' + resto) : titulo;
}

/* ==============================================================
   FUNÇÃO PRINCIPAL
   ============================================================== */
function buildDfdPdfDefinition(dfd, org, logoDataUrl, opts = {}) {
  const geradoEm = opts.geradoEm || new Date();
  const tag      = opts.tag      || gerarTagAutenticacao(dfd, org);
  const hash     = opts.hash     || gerarHashDocumento(dfd, org);
  const versao   = opts.versao   || 'LicitaReq v4.4';

  const aprovadores = Array.isArray(opts.aprovadores) ? opts.aprovadores : [];

  const capa               = montarCapaExecutiva(dfd, org, logoDataUrl, geradoEm);
  const notaApresentacao   = montarNotaApresentacao(geradoEm);   /* ⭐ [FIX 2] isolada */
  const corpoTecnico       = montarCorpoTecnico(dfd, org);
  const paginasAprovacoes  = montarPaginaAprovacoes(aprovadores);
  const paginaAutenticacao = montarPaginaAutenticacao({
    tag, hash, geradoEm, versao, org, dfd
  });

  const tituloCabecalho = montarTituloCabecalho(dfd);   /* ⭐ [FIX 1] */

  return {
    pageSize: 'A4',
    pageMargins: [40, 45, 40, 50],

    info: {
      title:    (tituloCabecalho + ' — ' + ((org && org.nome) || 'LicitaReq')).trim(),
      author:   (org && org.nome) || 'LicitaReq',
      subject:  'Documento de Formalização de Demanda — Lei nº 14.133/2021',
      keywords: 'LicitaReq, DFD, LicitaAudit, ' + tag,
      creator:  versao
    },

    /* ---- Header (a partir da página 2) ---- */
    header: function (currentPage) {
      if (currentPage === 1) return { text: '' };
      return {
        margin: [40, 14, 40, 0],
        columns: [
          { text: (org && org.nome) || 'LicitaReq',
            fontSize: 8, color: '#94a3b8' },
          { text: tituloCabecalho,               /* ⭐ usa helper */
            alignment: 'right', fontSize: 8, color: '#94a3b8' }
        ]
      };
    },

    footer: function (currentPage, pageCount) {
      return {
        margin: [40, 6, 40, 0],
        columns: [
          { text: 'LicitaReq · Documento Oficial · ' + formatarDataHora(geradoEm),
            fontSize: 7.5, color: '#94a3b8' },
          { text: 'Página ' + currentPage + ' de ' + pageCount,
            alignment: 'right', fontSize: 7.5, color: '#94a3b8' }
        ]
      };
    },

    content: [
      capa,                 /* Página 1 */
      notaApresentacao,     /* Página 2 (isolada) — ⭐ [FIX 2] */
      corpoTecnico,         /* Páginas 3..N */
      ...(Array.isArray(paginasAprovacoes) ? paginasAprovacoes : [paginasAprovacoes]),
      paginaAutenticacao
    ],

    defaultStyle: { fontSize: 9.5, color: '#0f172a', lineHeight: 1.35 }
  };
}

/* ==============================================================
   CAPA EXECUTIVA (Página 1)
   ============================================================== */
function montarCapaExecutiva(dfd, org, logoDataUrl, geradoEm) {
  return {
    stack: [
      {
        table: {
          widths: ['*'],
          body: [[{
            stack: [
              { text: 'SISTEMA LICITAREQ', fontSize: 8, bold: true,
                color: '#c7d2fe', alignment: 'center' },
              { text: 'DOCUMENTO OFICIAL DE CONTRATAÇÃO PÚBLICA',
                fontSize: 9, bold: true, color: '#ffffff',
                alignment: 'center', margin: [0, 4, 0, 0] }
            ],
            fillColor: '#4f46e5',
            margin: [0, 10, 0, 10]
          }]]
        },
        layout: 'noBorders',
        margin: [0, 0, 0, 26]
      },

      logoDataUrl
        ? { image: logoDataUrl, fit: [100, 100], alignment: 'center',
            margin: [0, 0, 0, 14] }
        : { text: '', margin: [0, 0, 0, 26] },

      { text: (org && org.nome ? org.nome : 'ÓRGÃO / ENTIDADE').toUpperCase(),
        fontSize: 15, bold: true, alignment: 'center',
        color: '#1e1b4b', margin: [0, 0, 0, 4] },
      { text: [
          org && org.sigla ? 'Sigla: ' + org.sigla : '',
          org && org.cnpj  ? 'CNPJ: '  + org.cnpj  : ''
        ].filter(Boolean).join(' · '),
        fontSize: 8.5, alignment: 'center', color: '#64748b',
        margin: [0, 0, 0, 2] },
      org && org.endereco
        ? { text: org.endereco, fontSize: 8, alignment: 'center',
            color: '#94a3b8', margin: [0, 0, 0, 2] }
        : null,
      org && (org.cidade || org.uf)
        ? { text: [org.cidade, org.uf].filter(Boolean).join('/'),
            fontSize: 8, alignment: 'center', color: '#94a3b8' }
        : null,

      { text: '', margin: [0, 0, 0, 22] },

      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0,
                   lineWidth: 1.2, lineColor: '#4f46e5' }],
        margin: [0, 0, 0, 16] },
      { text: 'DOCUMENTO DE FORMALIZAÇÃO DE DEMANDA',
        fontSize: 18, bold: true, alignment: 'center',
        color: '#1e1b4b', margin: [0, 0, 0, 6] },
      { text: 'Lei nº 14.133/2021 · Art. 18, § 1º',
        fontSize: 11, alignment: 'center', color: '#4f46e5',
        margin: [0, 0, 0, 4] },
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0,
                   lineWidth: 1.2, lineColor: '#4f46e5' }],
        margin: [0, 16, 0, 20] },

      { text: 'IDENTIFICAÇÃO GERAL', fontSize: 10, bold: true,
        color: '#4f46e5', alignment: 'center', margin: [0, 0, 0, 10] },

      {
        table: {
          widths: ['*', '*'],
          body: [
            [ cartaoIdentificacao('Nº do DFD', dfd.numero || '—'),
              cartaoIdentificacao('Data', formatarData(dfd.data) || formatarData(geradoEm)) ],
            [ cartaoIdentificacao('Unidade Requisitante', dfd.unidade || '—'),
              cartaoIdentificacao('Órgão / Entidade', dfd.orgao || (org && org.nome) || '—') ],
            [ cartaoIdentificacao('Responsável pela Demanda', dfd.responsavel || '—'),
              cartaoIdentificacao('Cargo / Função', dfd.cargo || '—') ]
          ]
        },
        layout: layoutCartoes(),
        margin: [0, 0, 0, 18]
      },

      {
        table: {
          widths: ['*'],
          body: [[{
            stack: [
              { text: 'VALOR ESTIMADO DA CONTRATAÇÃO',
                fontSize: 9, bold: true, alignment: 'center',
                color: '#4f46e5', margin: [0, 0, 0, 6] },
              { text: normalizarValorMonetario(dfd.valor),
                fontSize: 22, bold: true, alignment: 'center',
                color: '#1e1b4b', margin: [0, 0, 0, 4] },
              { text: 'Estimativa baseada em: ' + rotulo('metodo', dfd.metodo),
                fontSize: 8, alignment: 'center', color: '#64748b' }
            ],
            fillColor: '#eef2ff',
            margin: [20, 14, 20, 14]
          }]]
        },
        layout: 'noBorders',
        margin: [0, 0, 0, 20]
      },

      dfd.objeto
        ? {
            table: {
              widths: ['*'],
              body: [[{
                stack: [
                  { text: 'OBJETO DA CONTRATAÇÃO',
                    fontSize: 8, bold: true, color: '#4f46e5',
                    margin: [0, 0, 0, 6] },
                  { text: dfd.objeto, fontSize: 10,
                    color: '#0f172a', lineHeight: 1.5 }
                ],
                fillColor: '#f8fafc',
                margin: [16, 12, 16, 12]
              }]]
            },
            layout: 'noBorders',
            margin: [0, 0, 0, 20]
          }
        : null,

      { text: 'Emitido em ' + formatarDataHora(geradoEm),
        fontSize: 8, alignment: 'center', color: '#94a3b8',
        margin: [0, 10, 0, 0] },

      /* 🔒 QUEBRA APÓS A CAPA — a Nota de Apresentação inicia na página 2 */
      { text: '', pageBreak: 'after' }
    ]
  };
}

/* ==============================================================
   ⭐ [FIX 2] NOTA DE APRESENTAÇÃO — página própria (página 2)
   --------------------------------------------------------------
   Bloco separado, com pageBreak: 'before' garantindo isolamento.
   Ao final, um pageBreak: 'after' empurra o corpo técnico para a pág. 3.
   ============================================================== */
function montarNotaApresentacao(geradoEm) {
  return {
    /* Força início em página nova (a capa já quebra com 'after',
       mas 'before' aqui é redundância de segurança) */
    pageBreak: 'before',
    stack: [
      { text: '', margin: [0, 20, 0, 0] },

      { text: 'NOTA DE APRESENTAÇÃO INSTITUCIONAL',
        fontSize: 14, bold: true, alignment: 'center',
        color: '#1e1b4b', margin: [0, 0, 0, 6] },

      { text: 'Termo de Abertura do Procedimento Administrativo',
        fontSize: 9.5, alignment: 'center', color: '#4f46e5',
        margin: [0, 0, 0, 12] },

      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0,
                   lineWidth: 1.2, lineColor: '#4f46e5' }],
        margin: [0, 0, 0, 20] },

      /* Bloco I — Contextualização */
      {
        table: {
          widths: ['*'],
          body: [[{
            stack: [
              { text: 'I. CONTEXTUALIZAÇÃO',
                fontSize: 9, bold: true, color: '#4f46e5',
                margin: [0, 0, 0, 6] },
              { text:
                'O presente Documento de Formalização de Demanda (DFD) formaliza o início ' +
                'do procedimento administrativo de contratação pública no âmbito deste órgão, ' +
                'em conformidade com a Lei nº 14.133/2021, seu Art. 18, § 1º, e demais normas ' +
                'correlatas. O documento é instruído com a identificação da necessidade, ' +
                'a devida motivação administrativa, a estimativa de valor e o enquadramento ' +
                'legal aplicável, servindo de base para as etapas subsequentes de planejamento ' +
                'da contratação e elaboração do Estudo Técnico Preliminar (ETP) e do Termo ' +
                'de Referência (TR).',
                fontSize: 10, color: '#334155', lineHeight: 1.7,
                alignment: 'justify' }
            ],
            fillColor: '#ffffff',
            margin: [20, 16, 20, 16]
          }]]
        },
        layout: layoutBordaFina(),
        margin: [0, 0, 0, 16]
      },

      /* Bloco II — Finalidade */
      {
        table: {
          widths: ['*'],
          body: [[{
            stack: [
              { text: 'II. FINALIDADE E FUNDAMENTAÇÃO LEGAL',
                fontSize: 9, bold: true, color: '#4f46e5',
                margin: [0, 0, 0, 6] },
              { text:
                'Este documento tem por finalidade instruir o processo administrativo ' +
                'de contratação, garantindo a motivação e o planejamento previstos no ' +
                'Art. 18 da Lei nº 14.133/2021. A instrução processual observa ainda os ' +
                'princípios do Art. 5º da mesma lei — legalidade, impessoalidade, moralidade, ' +
                'publicidade, eficiência, interesse público, motivação, segurança jurídica, ' +
                'razoabilidade, competitividade e eficácia — bem como as diretrizes do ' +
                'Art. 11 (objetivo, resultado pretendido, ciclo de vida do objeto).',
                fontSize: 10, color: '#334155', lineHeight: 1.7,
                alignment: 'justify' }
            ],
            fillColor: '#f8fafc',
            margin: [20, 16, 20, 16]
          }]]
        },
        layout: layoutBordaFina(),
        margin: [0, 0, 0, 16]
      },

      /* Bloco III — Autenticidade */
      {
        table: {
          widths: ['*'],
          body: [[{
            stack: [
              { text: 'III. AUTENTICIDADE E RASTREABILIDADE',
                fontSize: 9, bold: true, color: '#4f46e5',
                margin: [0, 0, 0, 6] },
              { text:
                'Este documento foi gerado eletronicamente pelo sistema LicitaReq, possui ' +
                'TAG de autenticação única rastreável pelo LicitaAudit e está apto à auditoria ' +
                'interna e aos órgãos de controle. Sua validade jurídica está condicionada à ' +
                'conferência pela assessoria jurídica, pelo controle interno e pela autoridade ' +
                'competente, conforme preconiza a legislação vigente.',
                fontSize: 10, color: '#334155', lineHeight: 1.7,
                alignment: 'justify' }
            ],
            fillColor: '#eef2ff',
            margin: [20, 16, 20, 16]
          }]]
        },
        layout: {
          hLineColor: function () { return '#c7d2fe'; },
          vLineColor: function () { return '#c7d2fe'; },
          hLineWidth: function () { return 0.6; },
          vLineWidth: function () { return 0.6; },
          paddingLeft:   function () { return 0; },
          paddingRight:  function () { return 0; },
          paddingTop:    function () { return 0; },
          paddingBottom: function () { return 0; }
        },
        margin: [0, 0, 0, 24]
      },

      /* Bloco de encerramento */
      { canvas: [{ type: 'line', x1: 150, y1: 0, x2: 365, y2: 0,
                   lineWidth: 0.8, lineColor: '#cbd5e1' }],
        margin: [0, 0, 0, 10] },
      { text: 'Documento emitido em ' + formatarDataHora(geradoEm),
        fontSize: 8.5, italics: true, alignment: 'center',
        color: '#94a3b8' },

      /* 🔒 QUEBRA APÓS A NOTA — corpo técnico inicia na página 3 */
      { text: '', pageBreak: 'after' }
    ]
  };
}

function cartaoIdentificacao(label, valor) {
  return {
    stack: [
      { text: label.toUpperCase(), fontSize: 7, bold: true,
        color: '#64748b', margin: [0, 0, 0, 3] },
      { text: valor || '—', fontSize: 9.5, bold: true,
        color: '#0f172a', lineHeight: 1.4 }
    ],
    margin: [12, 9, 12, 9]
  };
}

function layoutCartoes() {
  return {
    hLineColor: function () { return '#e2e8f0'; },
    vLineColor: function () { return '#e2e8f0'; },
    hLineWidth: function () { return 0.4; },
    vLineWidth: function () { return 0.4; },
    fillColor: function (i) {
      return (i % 2 === 0) ? '#f8fafc' : '#ffffff';
    },
    paddingLeft:   function () { return 0; },
    paddingRight:  function () { return 0; },
    paddingTop:    function () { return 0; },
    paddingBottom: function () { return 0; }
  };
}

function layoutBordaFina() {
  return {
    hLineColor: function () { return '#4f46e5'; },
    vLineColor: function () { return '#4f46e5'; },
    hLineWidth: function () { return 0.6; },
    vLineWidth: function () { return 0.6; },
    paddingLeft:   function () { return 0; },
    paddingRight:  function () { return 0; },
    paddingTop:    function () { return 0; },
    paddingBottom: function () { return 0; }
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
      ...montarSecoesTecnicas(dfd, org)
    ]
  };
}

function montarPainelConformidade(dfd, org) {
  const linhas = [
    ['Nº do DFD',                  dfd.numero        || '—'],
    ['Data da Formalização',       formatarData(dfd.data)],
    ['Órgão / Entidade',           dfd.orgao || (org && org.nome) || '—'],
    ['Unidade Requisitante',       dfd.unidade       || '—'],
    ['Responsável pela Demanda',   dfd.responsavel   || '—'],
    ['Cargo / Função',             dfd.cargo         || '—'],
    ['Objeto da Contratação',      dfd.objeto        || '—'],
    ['Estimativa de Quantidades',  dfd.quantidades   || '—'],
    ['Valor Estimado',             normalizarValorMonetario(dfd.valor)],
    ['Método de Estimativa',       rotulo('metodo', dfd.metodo)],
    ['Dotação Orçamentária',       dfd.dotacao       || '—'],
    ['Fonte de Recurso',           dfd.fonte         || '—'],
    ['Previsão no PCA',            rotulo('pca', dfd.pcaPrevisto)],
    ['Item / Código no PCA',       dfd.pcaItem       || '—'],
    ['Modalidade Pretendida',      rotulo('modalidade', dfd.modalidade)],
    ['Natureza do Objeto',         rotulo('natureza',   dfd.natureza)],
    ['Critério de Julgamento',     rotulo('criterio',   dfd.criterio)],
    ['Regime de Execução',         rotulo('regime',     dfd.regime)],
    ['Decisão de Parcelamento',    rotulo('parcelamento', dfd.parcelamento)],
    ['Prazo de Execução',          dfd.prazo         || '—'],
    ['Local de Entrega',           dfd.local         || '—'],
    ['Condições de Pagamento',     rotulo('pagamento', dfd.pagamento)],
    ['Fiscal Titular',             dfd.fiscalTitular || '—'],
    ['Fiscal Substituto',          dfd.fiscalSubstituto || '—'],
    ['Gestor do Contrato',         dfd.gestor        || '—'],
    ['Vistoria Técnica',           rotulo('vistoria', dfd.vistoria)]
  ];

  const body = linhas.map(function (par) {
    return [
      { text: par[0] + ':', fontSize: 8.5, bold: true,
        color: '#1e1b4b', margin: [8, 5, 8, 5] },
      { text: par[1] || '—', fontSize: 8.5,
        color: '#0f172a', margin: [8, 5, 8, 5] }
    ];
  });

  return {
    stack: [
      { text: 'PAINEL DE CONFORMIDADE — LEI Nº 14.133/2021',
        fontSize: 10.5, bold: true, color: '#4f46e5',
        alignment: 'center', margin: [0, 0, 0, 4] },
      { text: 'Bloco de leitura automatizada para o LicitaAudit',
        fontSize: 8, italics: true, color: '#64748b',
        alignment: 'center', margin: [0, 0, 0, 10] },
      {
        table: { widths: ['38%', '*'], body: body },
        layout: {
          hLineColor: function () { return '#e2e8f0'; },
          vLineColor: function () { return '#e2e8f0'; },
          hLineWidth: function (i, node) {
            return (i === 0 || i === node.table.body.length) ? 0.8 : 0.3;
          },
          vLineWidth: function () { return 0.3; },
          fillColor: function (i) { return i % 2 === 0 ? '#f8fafc' : null; },
          paddingLeft:   function () { return 4; },
          paddingRight:  function () { return 4; },
          paddingTop:    function () { return 0; },
          paddingBottom: function () { return 0; }
        }
      },
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0,
                   lineWidth: 1, lineColor: '#4f46e5' }],
        margin: [0, 12, 0, 4] }
    ]
  };
}

function montarSecoesTecnicas(dfd, org) {
  return [
    secao('1. Identificação', [
      parDuplo(
        campo('Nº do DFD / Expediente', dfd.numero),
        campo('Data da Formalização',   formatarData(dfd.data))
      ),
      parDuplo(
        campo('Unidade Requisitante',   dfd.unidade),
        campo('Órgão / Entidade',       dfd.orgao || (org && org.nome))
      ),
      parDuplo(
        campo('Responsável pela Demanda', dfd.responsavel),
        campo('Cargo / Função',           dfd.cargo)
      )
    ]),

    secao('2. Objeto e Justificativa', [
      campo('Descrição Resumida do Objeto', dfd.objeto, { full: true }),
      campo('Justificativa da Necessidade Pública (Fundamentada)', dfd.justificativa,
            { full: true, bloco: true }),
      campo('Estimativa de Quantidades', dfd.quantidades, { full: true })
    ]),

    secao('3. Alinhamento ao Plano de Contratações Anual (PCA)', [
      parDuplo(
        campo('Previsão no PCA',      rotulo('pca', dfd.pcaPrevisto)),
        campo('Item / Código no PCA', dfd.pcaItem)
      ),
      campo('Justificativa do Alinhamento', dfd.pcaJustificativa,
            { full: true, bloco: true })
    ]),

    secao('4. Enquadramento Legal', [
      parDuplo(
        campo('Modalidade Pretendida (Art. 28)', rotulo('modalidade', dfd.modalidade)),
        campo('Natureza do Objeto (Art. 6º)',    rotulo('natureza',   dfd.natureza))
      ),
      parDuplo(
        campo('Critério de Julgamento (Art. 33)', rotulo('criterio', dfd.criterio)),
        campo('Regime de Execução (Art. 46)',     rotulo('regime',   dfd.regime))
      )
    ]),

    secao('5. Estimativa Orçamentária', [
      parDuplo(
        campo('Valor Estimado', normalizarValorMonetario(dfd.valor)),
        campo('Método de Estimativa', rotulo('metodo', dfd.metodo))
      ),
      parDuplo(
        campo('Dotação Orçamentária', dfd.dotacao),
        campo('Fonte de Recurso',     dfd.fonte)
      )
    ]),

    /* ⭐ [FIX 3] Seção 6 inquebrável — não corta entre páginas */
    secao('6. Parcelamento, Prazo e Entrega', [
      parDuplo(
        campo('Decisão de Parcelamento (Art. 47)', rotulo('parcelamento', dfd.parcelamento)),
        campo('Prazo de Execução / Vigência',      dfd.prazo)
      ),
      parDuplo(
        campo('Local de Entrega / Prestação', dfd.local),
        campo('Condições de Pagamento',       rotulo('pagamento', dfd.pagamento))
      )
    ], { unbreakable: true, pageBreakBefore: true }),   /* ← bloqueia quebra */

    secao('7. Fiscalização e Gestão Contratual (Art. 117)', [
      parDuplo(
        campo('Fiscal Titular',     dfd.fiscalTitular),
        campo('Fiscal Substituto',  dfd.fiscalSubstituto)
      ),
      parDuplo(
        campo('Gestor do Contrato', dfd.gestor),
        campo('Vistoria Técnica',   rotulo('vistoria', dfd.vistoria))
      )
    ]),

    secao('8. Observações Complementares', [
      campo('Observações Adicionais',
            dfd.observacoes || 'Sem observações adicionais.',
            { full: true, bloco: true })
    ])
  ];
}

/* ==============================================================
   PÁGINAS DE APROVAÇÕES
   ============================================================== */
function montarPaginaAprovacoes(aprovadores) {
  aprovadores = aprovadores || [];

  if (!aprovadores.length) {
    return [{
      pageBreak: 'before',
      stack: [
        montarCabecalhoAprovacoes(true, 1, 1, 0, 0),
        {
          table: {
            widths: ['*'],
            body: [[{
              stack: [
                { text: '⚠', fontSize: 26, alignment: 'center',
                  color: '#f59e0b', margin: [0, 0, 0, 8] },
                { text: 'Nenhum aprovador ou validador foi informado',
                  fontSize: 12, bold: true, alignment: 'center',
                  color: '#78350f', margin: [0, 0, 0, 6] },
                { text:
                  'Preencha o Bloco 7A (Aprovadores e Validadores) no formulário ' +
                  'do LicitaReq antes de gerar o PDF para que esta página seja ' +
                  'preenchida com os blocos de assinatura.',
                  fontSize: 9, alignment: 'center',
                  color: '#92400e', lineHeight: 1.55 }
              ],
              fillColor: '#fef3c7',
              margin: [20, 20, 20, 20]
            }]]
          },
          layout: 'noBorders'
        }
      ]
    }];
  }

  const MAX_POR_PAGINA = 6;
  const grupos = distribuirAprovadores(aprovadores, MAX_POR_PAGINA);

  return grupos.map(function (grupo, idx) {
    const ehPrimeira = idx === 0;
    const ehUltima   = idx === grupos.length - 1;
    const linhas     = montarLinhasAprovadores(grupo);

    return {
      pageBreak: 'before',
      stack: [
        montarCabecalhoAprovacoes(ehPrimeira, idx + 1, grupos.length,
                                   aprovadores.length, grupo.length),
        ...linhas,
        ehUltima
          ? montarRodapeAprovacoes(aprovadores.length, grupos.length)
          : { text: '', margin: [0, 20, 0, 0] }
      ]
    };
  });
}

function distribuirAprovadores(aprovadores, maxPorPagina) {
  const n = aprovadores.length;
  if (n <= maxPorPagina) return [aprovadores];

  const numPaginas = Math.ceil(n / maxPorPagina);
  const base  = Math.floor(n / numPaginas);
  const resto = n % numPaginas;

  const paginas = [];
  let idx = 0;
  for (let i = 0; i < numPaginas; i++) {
    const tam = base + (i < resto ? 1 : 0);
    paginas.push(aprovadores.slice(idx, idx + tam));
    idx += tam;
  }
  return paginas;
}

function montarCabecalhoAprovacoes(ehPrimeira, pagina, totalPaginas, totalSignatarios, nestaGrupo) {
  const stack = [
    { text: 'APROVAÇÃO E VALIDAÇÃO',
      fontSize: ehPrimeira ? 15 : 13, bold: true,
      alignment: 'center', color: '#1e1b4b', margin: [0, 0, 0, 4] },
    { text: 'Lei nº 14.133/2021 · Art. 18, § 1º',
      fontSize: 9, alignment: 'center', color: '#4f46e5', margin: [0, 0, 0, 8] },
    { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0,
                 lineWidth: 1.2, lineColor: '#4f46e5' }],
      margin: [0, 0, 0, 10] }
  ];

  if (totalPaginas > 1) {
    stack.push({
      text: 'Página ' + pagina + ' de ' + totalPaginas +
            ' · ' + nestaGrupo + ' de ' + totalSignatarios + ' assinaturas',
      fontSize: 8, italics: true, alignment: 'center',
      color: '#94a3b8', margin: [0, 0, 0, 10]
    });
  }

  if (ehPrimeira) {
    stack.push({
      text: 'Os responsáveis abaixo identificados aprovam e validam o presente ' +
            'Documento de Formalização de Demanda, atestando a veracidade das ' +
            'informações e a conformidade com a legislação vigente. O documento ' +
            'deve ser assinado eletronicamente ou de próprio punho, no espaço ' +
            'reservado para assinatura e/ou carimbo.',
      fontSize: 9, color: '#334155', lineHeight: 1.5,
      alignment: 'justify', margin: [0, 0, 0, 18]
    });
  }

  return { unbreakable: true, stack: stack };
}

function montarLinhasAprovadores(grupo) {
  const linhas = chunk(grupo, 2);
  const ultimoIdx = linhas.length - 1;

  return linhas.map(function (par, idx) {
    const margemInferior = idx === ultimoIdx ? 0 : 22;

    return {
      stack: [{
        unbreakable: true,
        columns: [
          { width: '50%', stack: blocoAssinatura(par[0]) },
          par[1]
            ? { width: '50%', stack: blocoAssinatura(par[1]) }
            : { width: '50%', text: '' }
        ],
        columnGap: 26
      }],
      margin: [0, 0, 0, margemInferior]
    };
  });
}

function montarRodapeAprovacoes(total, totalPaginas) {
  return {
    unbreakable: true,
    stack: [
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0,
                   lineWidth: 0.6, lineColor: '#cbd5e1' }],
        margin: [0, 30, 0, 10] },
      { text: 'Total de assinaturas: ' + total +
              (totalPaginas > 1 ? ' · distribuídas em ' + totalPaginas + ' páginas' : ''),
        fontSize: 8, italics: true, alignment: 'center', color: '#94a3b8' }
    ]
  };
}

function blocoAssinatura(p) {
  const linhas = [
    { text: '', margin: [0, 32, 0, 0] },
    { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 225, y2: 0,
                 lineWidth: 0.9, lineColor: '#475569',
                 dash: { length: 3, space: 2 } }],
      margin: [0, 0, 0, 5] },
    { text: 'Assinatura / Carimbo', fontSize: 7, italics: true,
      alignment: 'center', color: '#94a3b8', margin: [0, 0, 0, 8] },
    { text: p.nome || '—', fontSize: 10.5, bold: true,
      alignment: 'center', color: '#0f172a' }
  ];

  if (p.cargo) linhas.push({
    text: p.cargo, fontSize: 8.5, alignment: 'center',
    color: '#334155', margin: [0, 2, 0, 0]
  });
  if (p.orgao) linhas.push({
    text: p.orgao, fontSize: 8, alignment: 'center',
    color: '#64748b', margin: [0, 2, 0, 0]
  });
  if (p.papel) linhas.push({
    text: rotulo('papel', p.papel).toUpperCase(),
    fontSize: 7, bold: true, alignment: 'center',
    color: '#4f46e5', margin: [0, 6, 0, 0]
  });

  return [{
    table: {
      widths: ['*'],
      body: [[{ stack: linhas, margin: [12, 8, 12, 10] }]]
    },
    layout: {
      hLineColor: function () { return '#e2e8f0'; },
      vLineColor: function () { return '#e2e8f0'; },
      hLineWidth: function () { return 0.4; },
      vLineWidth: function () { return 0.4; },
      paddingLeft:   function () { return 0; },
      paddingRight:  function () { return 0; },
      paddingTop:    function () { return 0; },
      paddingBottom: function () { return 0; }
    }
  }];
}

/* ==============================================================
   PÁGINA FINAL — AUTENTICAÇÃO (página única)
   ============================================================== */
function montarPaginaAutenticacao(ctx) {
  const tag      = ctx.tag;
  const hash     = ctx.hash;
  const geradoEm = ctx.geradoEm;
  const versao   = ctx.versao;
  const org      = ctx.org  || {};
  const dfd      = ctx.dfd  || {};

  return {
    pageBreak: 'before',
    stack: [{
      unbreakable: true,
      stack: [
        { text: '', margin: [0, 4, 0, 0] },
        { text: '🔐', fontSize: 28, alignment: 'center', margin: [0, 0, 0, 4] },
        { text: 'AUTENTICAÇÃO E RASTREABILIDADE',
          fontSize: 14, bold: true, alignment: 'center',
          color: '#4f46e5', margin: [0, 0, 0, 3] },
        { text: 'Documento Oficial LicitaReq · Integração LicitaAudit',
          fontSize: 8.5, alignment: 'center', color: '#64748b',
          margin: [0, 0, 0, 14] },

        {
          table: {
            widths: ['*'],
            body: [[{
              stack: [
                { text: 'TAG DE AUTENTICAÇÃO',
                  fontSize: 8, bold: true, alignment: 'center',
                  color: '#c7d2fe', margin: [0, 0, 0, 3] },
                { text: tag,
                  fontSize: 12, bold: true, alignment: 'center',
                  color: '#ffffff', margin: [0, 3, 0, 0] }
              ],
              fillColor: '#4f46e5',
              margin: [16, 12, 16, 12]
            }]]
          },
          layout: 'noBorders',
          margin: [0, 0, 0, 12]
        },

        {
          table: {
            widths: ['35%', '*'],
            body: [
              linhaMeta('Hash de Integridade', hash),
              linhaMeta('Emitido em',          formatarDataHora(geradoEm)),
              linhaMeta('Sistema Emissor',     versao),
              linhaMeta('Órgão Emissor',       org.nome || '—'),
              linhaMeta('Expediente',          dfd.numero || '—'),
              linhaMeta('Tag de Integração',   'PREFIRO_TAG: LicitaReq_Documento_Oficial')
            ]
          },
          layout: layoutTabelaMeta(),
          margin: [0, 0, 0, 12]
        },

        {
          table: {
            widths: ['*'],
            body: [[{
              stack: [
                { text: '⚠  AVISO IMPORTANTE',
                  fontSize: 8.5, bold: true, color: '#92400e',
                  margin: [0, 0, 0, 4] },
                { text:
                  'Este documento foi gerado automaticamente pelo sistema LicitaReq e possui ' +
                  'TAG de autenticação única rastreável pelo LicitaAudit. A validade jurídica ' +
                  'do presente DFD está condicionada à conferência pela assessoria jurídica, ' +
                  'pelo controle interno e pela autoridade competente, nos termos da Lei nº 14.133/2021.',
                  fontSize: 8, color: '#78350f', lineHeight: 1.4 }
              ],
              fillColor: '#fef3c7',
              margin: [14, 10, 14, 10]
            }]]
          },
          layout: 'noBorders',
          margin: [0, 0, 0, 12]
        },

        {
          table: {
            widths: ['*'],
            body: [[{
              stack: [
                { text: '◆  SELO DIGITAL LICITAREQ',
                  fontSize: 8, bold: true, alignment: 'center',
                  color: '#4f46e5', margin: [0, 0, 0, 3] },
                { text: 'Documento íntegro · Não adulterado · Rastreável',
                  fontSize: 7, alignment: 'center',
                  color: '#64748b', margin: [0, 3, 0, 0] },
                { text: tag,
                  fontSize: 7, alignment: 'center',
                  color: '#94a3b8', margin: [0, 4, 0, 0] }
              ],
              fillColor: '#eef2ff',
              margin: [14, 10, 14, 10]
            }]]
          },
          layout: 'noBorders',
          margin: [0, 0, 0, 0]
        }
      ]
    }]
  };
}

function linhaMeta(chave, valor) {
  return [
    { text: chave + ':', fontSize: 8, bold: true, color: '#334155',
      fillColor: '#f1f5f9', margin: [8, 5, 8, 5] },
    { text: valor || '—', fontSize: 8, color: '#0f172a',
      margin: [8, 5, 8, 5] }
  ];
}

function layoutTabelaMeta() {
  return {
    hLineColor: function () { return '#cbd5e1'; },
    vLineColor: function () { return '#cbd5e1'; },
    hLineWidth: function () { return 0.4; },
    vLineWidth: function () { return 0.4; },
    paddingLeft:   function () { return 0; },
    paddingRight:  function () { return 0; },
    paddingTop:    function () { return 0; },
    paddingBottom: function () { return 0; }
  };
}

/* ==============================================================
   ⭐ [FIX 3] SECAO — agora aceita opts
   --------------------------------------------------------------
   opts.unbreakable      → envolve a seção em stack unbreakable
   opts.pageBreakBefore  → insere { text: '', pageBreak: 'before' }
                            como primeiro elemento do wrapper
   ============================================================== */
function secao(titulo, corpo, opts) {
  opts = opts || {};

  const conteudoInterno = {
    stack: [
      { text: titulo, fontSize: 11, bold: true, color: '#1e1b4b',
        margin: [0, 12, 0, 10] },
      ...corpo,
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0,
                   lineWidth: 0.4, lineColor: '#e2e8f0' }],
        margin: [0, 10, 0, 4] }
    ]
  };

  /* Caso especial: unbreakable + pageBreakBefore → envelope completo */
  if (opts.unbreakable) {
    const stackExterno = [];
    if (opts.pageBreakBefore) {
      stackExterno.push({ text: '', pageBreak: 'before' });
    }
    stackExterno.push({
      unbreakable: true,
      stack: conteudoInterno.stack
    });
    return { stack: stackExterno };
  }

  /* Caso padrão */
  return conteudoInterno;
}

function campo(label, valor, options) {
  options = options || {};
  const bloco = options.bloco || false;
  return {
    full: options.full || false,
    stack: [
      { text: label + ':', fontSize: 8, bold: true,
        color: '#64748b', margin: [0, 0, 0, 2] },
      { text: valor || '—', fontSize: bloco ? 9 : 9.5,
        color: '#0f172a', lineHeight: 1.4 }
    ],
    margin: [0, 0, 0, 10]
  };
}

function parDuplo(c1, c2) {
  if (c1.full || c2.full) {
    return { stack: [c1, c2] };
  }
  return {
    unbreakable: true,
    columns: [
      { width: '50%', stack: c1.stack },
      { width: '50%', stack: c2.stack }
    ],
    columnGap: 20
  };
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function formatarData(iso) {
  if (!iso) return '—';
  const p = String(iso).split('-');
  return p[2] && p[1] && p[0] ? (p[2] + '/' + p[1] + '/' + p[0]) : iso;
}

function formatarDataHora(d) {
  const dt = d instanceof Date ? d : new Date(d);
  if (isNaN(dt)) return '—';
  const pad = function (n) { return String(n).padStart(2, '0'); };
  return pad(dt.getDate()) + '/' + pad(dt.getMonth() + 1) + '/' + dt.getFullYear() + ' ' +
         pad(dt.getHours()) + ':' + pad(dt.getMinutes()) + ':' + pad(dt.getSeconds());
}

function gerarTagAutenticacao(dfd, org) {
  const base = [
    (org && (org.cnpj || org.nome)) || '',
    dfd && dfd.numero || '',
    dfd && dfd.data   || '',
    dfd && dfd.objeto || '',
    dfd && dfd.valor  || ''
  ].join('|');
  const h = hash32(base).toString(36).toUpperCase().padStart(8, '0');
  return 'LICITAREQ::DFD::' + h + '::' + new Date().getFullYear();
}

function gerarHashDocumento(dfd, org) {
  return hash32(JSON.stringify({ dfd: dfd, org: org }))
    .toString(16).toUpperCase().padStart(16, '0');
}

function hash32(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/* ==============================================================
   EXPORTAÇÃO GLOBAL
   ============================================================== */
window.LicitaReqPDF = {
  buildDfdPdfDefinition: buildDfdPdfDefinition,
  montarTituloCabecalho: montarTituloCabecalho,   /* exposto para testes */
  ROTULOS: ROTULOS,
  rotulo: rotulo,
  normalizarValorMonetario: normalizarValorMonetario,
  formatarData: formatarData,
  formatarDataHora: formatarDataHora
};
