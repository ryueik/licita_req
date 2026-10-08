/* ============================================================
   LicitaReq — pdf-minuta.js
   v1.0 — Minuta de Devolutiva / Parecer de Triagem Preliminar
   ------------------------------------------------------------
   • Página 1 ............ Capa Executiva (com Veredito em destaque)
   • Página 2 ............ Painel de Conformidade para o LicitaAudit
   • Páginas 3..N ........ Corpo da Minuta (análise + checklist)
   • Página N+1 .......... Aprovação e Validação (dinâmica)
   • Página N+2 .......... TAG de Autenticação (isolada, final)
   • Nome do arquivo: Minuta_Parecer_042_2026.pdf
   ============================================================ */

/* --------------------------------------------------------------
   RÓTULOS (compartilhados conceitualmente com pdf-dfd.js)
   -------------------------------------------------------------- */
const ROTULOS_MINUTA = Object.freeze({
  vereditoCls: {
    'deferido':   'Deferido para Prosseguimento',
    'devolvido':  'Devolvido para Complementação',
    'indeferido': 'Indeferido — Informações Insuficientes'
  },
  natureza: {
    'bens':       'Bens Comuns',
    'servicos':   'Serviços Comuns',
    'servicos-comuns': 'Serviços Comuns',
    'obra':       'Obras e Serviços de Engenharia',
    'obras':      'Obras e Serviços de Engenharia',
    'tic':        'Tecnologia da Informação e Comunicação (TIC)',
    'tecnicos':   'Serviços Técnicos Especializados',
    'intelectual':'Serviços Técnicos Intelectuais',
    'alienacao':  'Alienação de Bens / Concessão'
  },
  papel: {
    'aprovador':   'Aprovador',
    'validador':   'Validador',
    'autoridade':  'Autoridade Competente',
    'fiscal':      'Fiscal do Contrato',
    'gestor':      'Gestor do Contrato',
    'requisitante':'Requisitante',
    'analista':    'Analista de Triagem'
  }
});

function rotuloMinuta(grupo, valor) {
  return (ROTULOS_MINUTA[grupo] && ROTULOS_MINUTA[grupo][valor]) || valor || '—';
}

/* ==============================================================
   HELPERS DE FORMATAÇÃO (isolados neste módulo)
   ============================================================== */
function normalizarValorMinuta(v) {
  if (v == null || v === '') return '—';
  const s = String(v).trim();
  if (/^R\$/i.test(s)) return s;
  return 'R$ ' + s;
}

function formatarDataMinuta(iso) {
  if (!iso) return '—';
  const p = String(iso).split('-');
  return p[2] && p[1] && p[0] ? (p[2] + '/' + p[1] + '/' + p[0]) : iso;
}

function formatarDataHoraMinuta(d) {
  const dt = d instanceof Date ? d : new Date(d);
  if (isNaN(dt)) return '—';
  const pad = function (n) { return String(n).padStart(2, '0'); };
  return pad(dt.getDate()) + '/' + pad(dt.getMonth() + 1) + '/' + dt.getFullYear() + ' ' +
         pad(dt.getHours()) + ':' + pad(dt.getMinutes()) + ':' + pad(dt.getSeconds());
}

function hash32Minuta(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function gerarTagMinuta(minuta, org) {
  const base = [
    (org && (org.cnpj || org.nome)) || '',
    minuta && minuta.processo || minuta && minuta.numero || '',
    minuta && minuta.data || '',
    minuta && minuta.veredito || '',
    minuta && minuta.score != null ? String(minuta.score) : ''
  ].join('|');
  const h = hash32Minuta(base).toString(36).toUpperCase().padStart(8, '0');
  return 'LICITAREQ::MINUTA::' + h + '::' + new Date().getFullYear();
}

function gerarHashMinuta(minuta, org) {
  return hash32Minuta(JSON.stringify({ minuta: minuta, org: org }))
    .toString(16).toUpperCase().padStart(16, '0');
}

/* ==============================================================
   TÍTULO DO CABEÇALHO (limpo, sem duplicação)
   ============================================================== */
function montarTituloCabecalhoMinuta(minuta) {
  const bruto = String((minuta && (minuta.processo || minuta.numero)) || '').trim();
  if (!bruto) return 'Minuta de Devolutiva';

  const match = bruto.match(/^([A-Za-zÀ-ÿ]+)\s*[-–—\/]?\s*(.*)$/);
  if (!match) return 'Processo · ' + bruto;

  const prefixo = match[1].toUpperCase();
  const resto   = (match[2] || '').trim();

  if (prefixo.length <= 4) {
    return resto ? (prefixo + ' · ' + resto) : prefixo;
  }
  const titulo = prefixo.charAt(0) + prefixo.slice(1).toLowerCase();
  return resto ? (titulo + ' · ' + resto) : titulo;
}

/* ==============================================================
   FUNÇÃO PRINCIPAL — buildMinutaPdfDefinition
   --------------------------------------------------------------
   @param {Object} minuta  Resultado da análise + metadados
       {
         numero, processo, data, unidade, responsavel, cargo, orgao,
         objeto, veredito, vereditoCls, vereditoTexto, score,
         natureza, modalidadeSug: { rotulo, lei },
         requisitos: [ { ok, sev, titulo, desc, law } ],
         alertas:    [ { tipo, titulo, texto } ],
         minuta:     'texto corrido da minuta',
         meta:       { unidade, processo, orgao, ... }
       }
   @param {Object} org       Configuração do órgão
   @param {String} logoDataUrl  Data URL da logomarca
   @param {Object} opts      { aprovadores, geradoEm, versao, tag, hash }
   ============================================================== */
function buildMinutaPdfDefinition(minuta, org, logoDataUrl, opts = {}) {
  const geradoEm = opts.geradoEm || new Date();
  const tag      = opts.tag      || gerarTagMinuta(minuta, org);
  const hash     = opts.hash     || gerarHashMinuta(minuta, org);
  const versao   = opts.versao   || 'LicitaReq v4.5';

  const aprovadores = Array.isArray(opts.aprovadores) ? opts.aprovadores : [];
  const tituloCabecalho = montarTituloCabecalhoMinuta(minuta);

  /* ---------- Camada 1: CAPA ---------- */
  const capa = montarCapaMinuta(minuta, org, logoDataUrl, geradoEm);

  /* ---------- Camada 2: PAINEL DE CONFORMIDADE (LicitaAudit) ---------- */
  const painelAudit = montarPainelConformidadeMinuta(minuta, org);

  /* ---------- Camada 3: CORPO DA MINUTA ---------- */
  const corpoMinuta = montarCorpoMinuta(minuta, org);

  /* ---------- Camada 4: APROVAÇÕES ---------- */
  const paginasAprovacoes = montarPaginaAprovacoesMinuta(aprovadores);

  /* ---------- Camada 5: AUTENTICAÇÃO ---------- */
  const paginaAutenticacao = montarPaginaAutenticacaoMinuta({
    tag, hash, geradoEm, versao, org, minuta
  });

  return {
    pageSize: 'A4',
    pageMargins: [40, 45, 40, 50],

    info: {
      title:    (tituloCabecalho + ' — Minuta de Devolutiva').trim(),
      author:   (org && org.nome) || 'LicitaReq',
      subject:  'Minuta de Devolutiva / Parecer de Triagem Preliminar — Lei nº 14.133/2021',
      keywords: 'LicitaReq, Minuta, Parecer, Triagem, LicitaAudit, ' + tag,
      creator:  versao
    },

    header: function (currentPage) {
      if (currentPage === 1) return { text: '' };
      return {
        margin: [40, 14, 40, 0],
        columns: [
          { text: (org && org.nome) || 'LicitaReq',
            fontSize: 8, color: '#94a3b8' },
          { text: tituloCabecalho,
            alignment: 'right', fontSize: 8, color: '#94a3b8' }
        ]
      };
    },

    footer: function (currentPage, pageCount) {
      return {
        margin: [40, 6, 40, 0],
        columns: [
          { text: 'LicitaReq · Minuta de Devolutiva · ' + formatarDataHoraMinuta(geradoEm),
            fontSize: 7.5, color: '#94a3b8' },
          { text: 'Página ' + currentPage + ' de ' + pageCount,
            alignment: 'right', fontSize: 7.5, color: '#94a3b8' }
        ]
      };
    },

    content: [
      capa,                /* Página 1 */
      painelAudit,         /* Página 2 (com pageBreak: 'after' interno) */
      corpoMinuta,         /* Páginas 3..N */
      ...(Array.isArray(paginasAprovacoes) ? paginasAprovacoes : [paginasAprovacoes]),
      paginaAutenticacao   /* Última página isolada */
    ],

    defaultStyle: { fontSize: 9.5, color: '#0f172a', lineHeight: 1.35 }
  };
}

/* ==============================================================
   CAMADA 1 — CAPA EXECUTIVA DA MINUTA
   ============================================================== */
function montarCapaMinuta(minuta, org, logoDataUrl, geradoEm) {
  const cls         = minuta.vereditoCls || 'devolvido';
  const corVeredito = cls === 'deferido'  ? '#059669'
                    : cls === 'devolvido' ? '#b45309'
                    :                       '#dc2626';
  const fundoVeredito = cls === 'deferido'  ? '#ecfdf5'
                      : cls === 'devolvido' ? '#fffbeb'
                      :                       '#fef2f2';

  return {
    stack: [
      /* Faixa institucional */
      {
        table: {
          widths: ['*'],
          body: [[{
            stack: [
              { text: 'SISTEMA LICITAREQ', fontSize: 8, bold: true,
                color: '#c7d2fe', alignment: 'center' },
              { text: 'MINUTA DE DEVOLUTIVA · PARECER DE TRIAGEM PRELIMINAR',
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

      /* Logo + Órgão */
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

      /* Título principal */
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0,
                   lineWidth: 1.2, lineColor: '#4f46e5' }],
        margin: [0, 0, 0, 16] },
      { text: 'MINUTA DE DEVOLUTIVA',
        fontSize: 18, bold: true, alignment: 'center',
        color: '#1e1b4b', margin: [0, 0, 0, 6] },
      { text: 'Parecer de Triagem Preliminar · Lei nº 14.133/2021',
        fontSize: 11, alignment: 'center', color: '#4f46e5',
        margin: [0, 0, 0, 4] },
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0,
                   lineWidth: 1.2, lineColor: '#4f46e5' }],
        margin: [0, 16, 0, 20] },

      /* Identificação Geral */
      { text: 'IDENTIFICAÇÃO DO PROCEDIMENTO', fontSize: 10, bold: true,
        color: '#4f46e5', alignment: 'center', margin: [0, 0, 0, 10] },

      {
        table: {
          widths: ['*', '*'],
          body: [
            [ cartaoMinuta('Nº do Processo / Expediente',
                           minuta.processo || minuta.numero || '—'),
              cartaoMinuta('Data da Análise',
                           formatarDataMinuta(minuta.data) || formatarDataMinuta(geradoEm)) ],
            [ cartaoMinuta('Unidade Requisitante',
                           minuta.unidade || (minuta.meta && minuta.meta.unidade) || '—'),
              cartaoMinuta('Órgão / Entidade',
                           minuta.orgao || (org && org.nome) || '—') ],
            [ cartaoMinuta('Responsável pela Triagem',
                           minuta.responsavel || (minuta.meta && minuta.meta.responsavel) || '—'),
              cartaoMinuta('Cargo / Função',
                           minuta.cargo || (minuta.meta && minuta.meta.cargo) || '—') ]
          ]
        },
        layout: layoutCartoesMinuta(),
        margin: [0, 0, 0, 18]
      },

      /* Destaque: VEREDITO */
      {
        table: {
          widths: ['*'],
          body: [[{
            stack: [
              { text: 'VEREDITO PRELIMINAR',
                fontSize: 9, bold: true, alignment: 'center',
                color: corVeredito, margin: [0, 0, 0, 6] },
              { text: rotuloMinuta('vereditoCls', cls),
                fontSize: 18, bold: true, alignment: 'center',
                color: corVeredito, margin: [0, 0, 0, 4] },
              { text: 'Score de Conformidade: ' + (minuta.score != null ? minuta.score : '—') + '/100',
                fontSize: 9.5, alignment: 'center',
                color: '#334155', margin: [0, 4, 0, 0] }
            ],
            fillColor: fundoVeredito,
            margin: [20, 16, 20, 16]
          }]]
        },
        layout: {
          hLineColor: function () { return corVeredito; },
          vLineColor: function () { return corVeredito; },
          hLineWidth: function () { return 0.8; },
          vLineWidth: function () { return 0.8; },
          paddingLeft:   function () { return 0; },
          paddingRight:  function () { return 0; },
          paddingTop:    function () { return 0; },
          paddingBottom: function () { return 0; }
        },
        margin: [0, 0, 0, 20]
      },

      /* Objeto resumido */
      minuta.objeto
        ? {
            table: {
              widths: ['*'],
              body: [[{
                stack: [
                  { text: 'OBJETO DA ANÁLISE',
                    fontSize: 8, bold: true, color: '#4f46e5',
                    margin: [0, 0, 0, 6] },
                  { text: minuta.objeto, fontSize: 10,
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

      { text: 'Documento emitido em ' + formatarDataHoraMinuta(geradoEm),
        fontSize: 8, alignment: 'center', color: '#94a3b8',
        margin: [0, 10, 0, 0] },

      { text: '', pageBreak: 'after' }
    ]
  };
}

function cartaoMinuta(label, valor) {
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

function layoutCartoesMinuta() {
  return {
    hLineColor: function () { return '#e2e8f0'; },
    vLineColor: function () { return '#e2e8f0'; },
    hLineWidth: function () { return 0.4; },
    vLineWidth: function () { return 0.4; },
    fillColor: function (i) { return (i % 2 === 0) ? '#f8fafc' : '#ffffff'; },
    paddingLeft:   function () { return 0; },
    paddingRight:  function () { return 0; },
    paddingTop:    function () { return 0; },
    paddingBottom: function () { return 0; }
  };
}

/* ==============================================================
   CAMADA 2 — PAINEL DE CONFORMIDADE PARA O LicitaAudit
   --------------------------------------------------------------
   Bloco de leitura automatizada com pares "Chave: Valor" limpos.
   Ocorre em página própria (pageBreak: 'after' no final).
   ============================================================== */
function montarPainelConformidadeMinuta(minuta, org) {
  const req = Array.isArray(minuta.requisitos) ? minuta.requisitos : [];

  /* Pares "Chave: Valor" essenciais ao regex do LicitaAudit */
  const linhasMeta = [
    ['Nº do Processo',      minuta.processo || minuta.numero || '—'],
    ['Data da Análise',     formatarDataMinuta(minuta.data)],
    ['Órgão / Entidade',    minuta.orgao || (org && org.nome) || '—'],
    ['Unidade Requisitante',minuta.unidade || (minuta.meta && minuta.meta.unidade) || '—'],
    ['Responsável',         minuta.responsavel || (minuta.meta && minuta.meta.responsavel) || '—'],
    ['Objeto',              minuta.objeto || '—'],
    ['Natureza Detectada',  rotuloMinuta('natureza', minuta.natureza)],
    ['Modalidade Sugerida', (minuta.modalidadeSug && minuta.modalidadeSug.rotulo) || '—'],
    ['Base Legal',          (minuta.modalidadeSug && minuta.modalidadeSug.lei) || 'Art. 28'],
    ['Score de Conformidade', (minuta.score != null ? minuta.score : '—') + '/100'],
    ['Status da Triagem',   rotuloMinuta('vereditoCls', minuta.vereditoCls)],
    ['Veredito',            minuta.veredito || rotuloMinuta('vereditoCls', minuta.vereditoCls)]
  ];

  const bodyMeta = linhasMeta.map(function (par) {
    return [
      { text: par[0] + ':', fontSize: 8.5, bold: true,
        color: '#1e1b4b', margin: [8, 5, 8, 5] },
      { text: par[1] || '—', fontSize: 8.5,
        color: '#0f172a', margin: [8, 5, 8, 5] }
    ];
  });

  /* Checklist detalhado */
  const bodyChecklist = req.map(function (r) {
    const marcador = r.ok ? '[ OK ]' : '[ -- ]';
    const corMarcador = r.ok ? '#059669' : '#dc2626';
    const sev = (r.sev || '').toUpperCase() || '—';
    return [
      { text: marcador, fontSize: 9, bold: true,
        color: corMarcador, margin: [8, 5, 8, 5], alignment: 'center' },
      { text: r.titulo + (r.law ? '  (' + r.law + ')' : ''),
        fontSize: 9, bold: true, color: '#1e1b4b',
        margin: [8, 5, 8, 5] },
      { text: r.desc || '—', fontSize: 8.5,
        color: '#334155', margin: [8, 5, 8, 5] },
      { text: sev, fontSize: 8, bold: true,
        color: r.sev === 'alta' ? '#dc2626'
             : r.sev === 'media' ? '#b45309'
             : '#0284c7',
        margin: [8, 5, 8, 5], alignment: 'center' }
    ];
  });

  return {
    unbreakable: false,
    stack: [
      { text: 'PAINEL DE CONFORMIDADE — LEI Nº 14.133/2021',
        fontSize: 12, bold: true, color: '#4f46e5',
        alignment: 'center', margin: [0, 0, 0, 4] },
      { text: 'Bloco de leitura automatizada para o LicitaAudit',
        fontSize: 8, italics: true, color: '#64748b',
        alignment: 'center', margin: [0, 0, 0, 14] },

      /* ---- Metadados (chave: valor) ---- */
      {
        unbreakable: true,
        stack: [
          { text: '1. METADADOS DO PROCESSO', fontSize: 9.5, bold: true,
            color: '#1e1b4b', margin: [0, 0, 0, 8] },
          {
            table: { widths: ['38%', '*'], body: bodyMeta },
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
            },
            dontBreakRows: true
          }
        ],
        margin: [0, 0, 0, 16]
      },

      /* ---- Checklist ---- */
      req.length
        ? {
            stack: [
              { text: '2. CHECKLIST DE REQUISITOS VALIDADOS',
                fontSize: 9.5, bold: true, color: '#1e1b4b',
                margin: [0, 0, 0, 8] },
              {
                table: {
                  widths: ['10%', '35%', '*', '10%'],
                  body: [
                    /* Cabeçalho */
                    [
                      { text: 'STATUS', fontSize: 8, bold: true,
                        color: '#ffffff', fillColor: '#4f46e5',
                        margin: [4, 5, 4, 5], alignment: 'center' },
                      { text: 'REQUISITO', fontSize: 8, bold: true,
                        color: '#ffffff', fillColor: '#4f46e5',
                        margin: [8, 5, 8, 5] },
                      { text: 'DESCRIÇÃO / OBSERVAÇÃO', fontSize: 8, bold: true,
                        color: '#ffffff', fillColor: '#4f46e5',
                        margin: [8, 5, 8, 5] },
                      { text: 'SEV.', fontSize: 8, bold: true,
                        color: '#ffffff', fillColor: '#4f46e5',
                        margin: [4, 5, 4, 5], alignment: 'center' }
                    ],
                    ...bodyChecklist
                  ]
                },
                layout: {
                  hLineColor: function () { return '#e2e8f0'; },
                  vLineColor: function () { return '#e2e8f0'; },
                  hLineWidth: function () { return 0.3; },
                  vLineWidth: function () { return 0.3; },
                  fillColor: function (i) {
                    return i === 0 ? null : (i % 2 === 0 ? '#f8fafc' : null);
                  },
                  paddingLeft:   function () { return 0; },
                  paddingRight:  function () { return 0; },
                  paddingTop:    function () { return 0; },
                  paddingBottom: function () { return 0; }
                },
                dontBreakRows: true
              }
            ]
          }
        : null,

      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0,
                   lineWidth: 1, lineColor: '#4f46e5' }],
        margin: [0, 14, 0, 4] },

      /* Quebra após o painel — corpo da minuta inicia em nova página */
      { text: '', pageBreak: 'after' }
    ]
  };
}

/* ==============================================================
   CAMADA 3 — CORPO DA MINUTA
   ============================================================== */
function montarCorpoMinuta(minuta, org) {
  return {
    stack: [
      /* ---- 1. Objeto da Análise ---- */
      secaoMinuta('1. Objeto da Análise', [
        parDuploMinuta(
          campoMinuta('Nº do Processo', minuta.processo || minuta.numero),
          campoMinuta('Data da Análise', formatarDataMinuta(minuta.data))
        ),
        parDuploMinuta(
          campoMinuta('Unidade Requisitante',
                      minuta.unidade || (minuta.meta && minuta.meta.unidade)),
          campoMinuta('Órgão / Entidade',
                      minuta.orgao || (org && org.nome))
        ),
        campoMinuta('Objeto da Contratação', minuta.objeto,
                    { full: true, bloco: true })
      ]),

      /* ---- 2. Veredito ---- */
      secaoMinuta('2. Veredito Preliminar', [
        parDuploMinuta(
          campoMinuta('Veredito', rotuloMinuta('vereditoCls', minuta.vereditoCls)),
          campoMinuta('Score', (minuta.score != null ? minuta.score : '—') + '/100')
        ),
        campoMinuta('Fundamentação',
                    minuta.vereditoTexto ||
                    'A análise considerou o disposto nos Arts. 18 e 23 da Lei nº 14.133/2021.',
                    { full: true, bloco: true })
      ]),

      /* ---- 3. Enquadramento Legal ---- */
      secaoMinuta('3. Enquadramento e Natureza', [
        parDuploMinuta(
          campoMinuta('Natureza Detectada', rotuloMinuta('natureza', minuta.natureza)),
          campoMinuta('Modalidade Sugerida',
                      (minuta.modalidadeSug && minuta.modalidadeSug.rotulo) || '—')
        ),
        campoMinuta('Base Legal',
                    (minuta.modalidadeSug && minuta.modalidadeSug.lei) || 'Art. 28',
                    { full: true })
      ]),

      /* ---- 4. Checklist Detalhado ---- */
      montarChecklistDetalhado(minuta),

      /* ---- 5. Alertas e Recomendações ---- */
      montarAlertasMinuta(minuta),

      /* ---- 6. Encaminhamento ---- */
      secaoMinuta('6. Encaminhamento', [
        campoMinuta(
          'Providências',
          minuta.vereditoCls === 'deferido'
            ? 'Encaminhe-se o processo à fase seguinte de instrução, nos termos do Art. 18 da Lei nº 14.133/2021, com elaboração de Estudo Técnico Preliminar (ETP) e Termo de Referência (TR).'
            : minuta.vereditoCls === 'devolvido'
            ? 'Devolva-se o expediente à unidade requisitante para complementação dos itens apontados no checklist desta minuta, antes de novo encaminhamento à unidade de licitações.'
            : 'Recomenda-se a reformulação integral da demanda, com reapresentação devidamente instruída, antes de nova submissão à triagem.',
          { full: true, bloco: true }
        )
      ]),

      /* ---- 7. Minuta Textual ---- */
      montarMinutaTextual(minuta),

      /* ---- 8. Ressalva ---- */
      secaoMinuta('8. Ressalva Institucional', [
        {
          table: {
            widths: ['*'],
            body: [[{
              stack: [
                { text: '⚠  RESSALVA',
                  fontSize: 9, bold: true, color: '#92400e',
                  margin: [0, 0, 0, 4] },
                { text:
                  'Esta é uma análise automatizada de apoio e NÃO substitui o parecer ' +
                  'da assessoria jurídica, do controle interno ou da autoridade competente. ' +
                  'Nos termos dos Arts. 52 a 54 da Lei nº 14.133/2021, a decisão final ' +
                  'cabe à autoridade competente, após manifestação das áreas técnicas.',
                  fontSize: 8.5, color: '#78350f', lineHeight: 1.5,
                  alignment: 'justify' }
              ],
              fillColor: '#fef3c7',
              margin: [14, 12, 14, 12]
            }]]
          },
          layout: 'noBorders'
        }
      ])
    ]
  };
}

function montarChecklistDetalhado(minuta) {
  const req = Array.isArray(minuta.requisitos) ? minuta.requisitos : [];
  if (!req.length) return { text: '' };

  const rows = req.map(function (r) {
    const icon = r.ok ? '✓' : (r.sev === 'alta' ? '✕' : '!');
    const cor  = r.ok ? '#059669'
              : r.sev === 'alta' ? '#dc2626'
              : '#b45309';
    return [
      { text: icon, fontSize: 11, bold: true,
        color: cor, margin: [6, 5, 6, 5], alignment: 'center' },
      { text: r.titulo, fontSize: 9.5, bold: true,
        color: '#1e1b4b', margin: [8, 5, 8, 5] },
      { text: r.desc || '—', fontSize: 8.5,
        color: '#334155', margin: [8, 5, 8, 5] },
      { text: r.law || '—', fontSize: 8, italics: true,
        color: '#4f46e5', margin: [8, 5, 8, 5], alignment: 'center' }
    ];
  });

  return {
    unbreakable: false,
    stack: [
      { text: '4. Checklist Detalhado de Requisitos',
        fontSize: 11, bold: true, color: '#1e1b4b',
        margin: [0, 12, 0, 10] },
      {
        table: {
          widths: ['8%', '28%', '*', '15%'],
          body: [
            [
              { text: '', fontSize: 8, fillColor: '#4f46e5',
                margin: [4, 5, 4, 5] },
              { text: 'REQUISITO', fontSize: 8, bold: true,
                color: '#ffffff', fillColor: '#4f46e5',
                margin: [8, 5, 8, 5] },
              { text: 'OBSERVAÇÃO', fontSize: 8, bold: true,
                color: '#ffffff', fillColor: '#4f46e5',
                margin: [8, 5, 8, 5] },
              { text: 'BASE LEGAL', fontSize: 8, bold: true,
                color: '#ffffff', fillColor: '#4f46e5',
                margin: [8, 5, 8, 5], alignment: 'center' }
            ],
            ...rows
          ]
        },
        layout: {
          hLineColor: function () { return '#e2e8f0'; },
          vLineColor: function () { return '#e2e8f0'; },
          hLineWidth: function () { return 0.3; },
          vLineWidth: function () { return 0.3; },
          fillColor: function (i) {
            return i === 0 ? null : (i % 2 === 0 ? '#f8fafc' : null);
          },
          paddingLeft:   function () { return 0; },
          paddingRight:  function () { return 0; },
          paddingTop:    function () { return 0; },
          paddingBottom: function () { return 0; }
        },
        dontBreakRows: true
      },
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0,
                   lineWidth: 0.4, lineColor: '#e2e8f0' }],
        margin: [0, 10, 0, 4] }
    ]
  };
}

function montarAlertasMinuta(minuta) {
  const alertas = Array.isArray(minuta.alertas) ? minuta.alertas : [];
  if (!alertas.length) return { text: '' };

  const blocks = alertas.map(function (a) {
    const cor = a.tipo === 'danger'  ? { bg: '#fef2f2', br: '#dc2626', tx: '#450a0a', ic: '⚠' }
              : a.tipo === 'warning' ? { bg: '#fffbeb', br: '#b45309', tx: '#451a03', ic: '⚠' }
              : a.tipo === 'success' ? { bg: '#ecfdf5', br: '#059669', tx: '#052e1f', ic: '✓' }
              :                       { bg: '#f0f9ff', br: '#0284c7', tx: '#082f49', ic: 'ℹ' };

    return {
      table: {
        widths: ['*'],
        body: [[{
          stack: [
            { text: cor.ic + '  ' + (a.titulo || 'Alerta'),
              fontSize: 9.5, bold: true, color: cor.tx,
              margin: [0, 0, 0, 4] },
            { text: a.texto || '—', fontSize: 8.5,
              color: cor.tx, lineHeight: 1.5, alignment: 'justify' }
          ],
          fillColor: cor.bg,
          margin: [14, 10, 14, 10]
        }]]
      },
      layout: {
        hLineColor: function () { return cor.br; },
        vLineColor: function () { return cor.br; },
        hLineWidth: function () { return 0.4; },
        vLineWidth: function () { return 0.4; },
        paddingLeft:   function () { return 0; },
        paddingRight:  function () { return 0; },
        paddingTop:    function () { return 0; },
        paddingBottom: function () { return 0; }
      },
      margin: [0, 0, 0, 8]
    };
  });

  return {
    unbreakable: false,
    stack: [
      { text: '5. Alertas e Recomendações',
        fontSize: 11, bold: true, color: '#1e1b4b',
        margin: [0, 12, 0, 10] },
      ...blocks,
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0,
                   lineWidth: 0.4, lineColor: '#e2e8f0' }],
        margin: [0, 10, 0, 4] }
    ]
  };
}

function montarMinutaTextual(minuta) {
  if (!minuta.minuta) return { text: '' };
  return {
    unbreakable: false,
    stack: [
      { text: '7. Minuta Textual de Devolutiva',
        fontSize: 11, bold: true, color: '#1e1b4b',
        margin: [0, 12, 0, 10] },
      {
        table: {
          widths: ['*'],
          body: [[{
            stack: [
              { text: String(minuta.minuta),
                fontSize: 8.5, color: '#0f172a',
                lineHeight: 1.6, alignment: 'justify' }
            ],
            fillColor: '#f8fafc',
            margin: [14, 12, 14, 12]
          }]]
        },
        layout: {
          hLineColor: function () { return '#cbd5e1'; },
          vLineColor: function () { return '#cbd5e1'; },
          hLineWidth: function () { return 0.4; },
          vLineWidth: function () { return 0.4; },
          paddingLeft:   function () { return 0; },
          paddingRight:  function () { return 0; },
          paddingTop:    function () { return 0; },
          paddingBottom: function () { return 0; }
        }
      },
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0,
                   lineWidth: 0.4, lineColor: '#e2e8f0' }],
        margin: [0, 10, 0, 4] }
    ]
  };
}

/* ==============================================================
   HELPERS DE SEÇÃO / CAMPO (mesmos padrões do pdf-dfd)
   ============================================================== */
function secaoMinuta(titulo, corpo) {
  return {
    unbreakable: true,
    stack: [
      { text: titulo, fontSize: 11, bold: true, color: '#1e1b4b',
        margin: [0, 12, 0, 10] },
      ...corpo,
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0,
                   lineWidth: 0.4, lineColor: '#e2e8f0' }],
        margin: [0, 10, 0, 4] }
    ]
  };
}

function campoMinuta(label, valor, options) {
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

function parDuploMinuta(c1, c2) {
  if (c1.full || c2.full) {
    return { unbreakable: true, stack: [c1, c2] };
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

function chunkMinuta(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/* ==============================================================
   CAMADA 4 — PÁGINAS DE APROVAÇÕES (reutiliza padrões)
   ============================================================== */
function montarPaginaAprovacoesMinuta(aprovadores) {
  aprovadores = aprovadores || [];

  if (!aprovadores.length) {
    return [{
      pageBreak: 'before',
      stack: [
        cabecalhoAprovacoesMinuta(true, 1, 1, 0, 0),
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
                  'Preencha os aprovadores no LicitaReq antes de gerar a Minuta ' +
                  'para que esta página seja preenchida com os blocos de assinatura.',
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
  const grupos = distribuirAprovadoresMinuta(aprovadores, MAX_POR_PAGINA);

  return grupos.map(function (grupo, idx) {
    const ehPrimeira = idx === 0;
    const ehUltima   = idx === grupos.length - 1;
    const linhas     = montarLinhasAprovadoresMinuta(grupo);

    return {
      pageBreak: 'before',
      stack: [
        cabecalhoAprovacoesMinuta(ehPrimeira, idx + 1, grupos.length,
                                   aprovadores.length, grupo.length),
        ...linhas,
        ehUltima
          ? rodapeAprovacoesMinuta(aprovadores.length, grupos.length)
          : { text: '', margin: [0, 20, 0, 0] }
      ]
    };
  });
}

function distribuirAprovadoresMinuta(aprovadores, maxPorPagina) {
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

function cabecalhoAprovacoesMinuta(ehPrimeira, pagina, totalPaginas, totalSignatarios, nestaGrupo) {
  const stack = [
    { text: 'APROVAÇÃO E VALIDAÇÃO',
      fontSize: ehPrimeira ? 15 : 13, bold: true,
      alignment: 'center', color: '#1e1b4b', margin: [0, 0, 0, 4] },
    { text: 'Minuta de Devolutiva · Lei nº 14.133/2021',
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
            'Parecer de Triagem Preliminar, atestando a veracidade das informações ' +
            'e a conformidade com a legislação vigente. O documento deve ser assinado ' +
            'eletronicamente ou de próprio punho, no espaço reservado para assinatura ' +
            'e/ou carimbo.',
      fontSize: 9, color: '#334155', lineHeight: 1.5,
      alignment: 'justify', margin: [0, 0, 0, 18]
    });
  }

  return { unbreakable: true, stack: stack };
}

function montarLinhasAprovadoresMinuta(grupo) {
  const linhas = chunkMinuta(grupo, 2);
  const ultimoIdx = linhas.length - 1;

  return linhas.map(function (par, idx) {
    const margemInferior = idx === ultimoIdx ? 0 : 22;

    return {
      stack: [{
        unbreakable: true,
        columns: [
          { width: '50%', stack: blocoAssinaturaMinuta(par[0]) },
          par[1]
            ? { width: '50%', stack: blocoAssinaturaMinuta(par[1]) }
            : { width: '50%', text: '' }
        ],
        columnGap: 26
      }],
      margin: [0, 0, 0, margemInferior]
    };
  });
}

function rodapeAprovacoesMinuta(total, totalPaginas) {
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

function blocoAssinaturaMinuta(p) {
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
    text: rotuloMinuta('papel', p.papel).toUpperCase(),
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
   CAMADA 5 — PÁGINA FINAL EXCLUSIVA DE AUTENTICAÇÃO
   ============================================================== */
function montarPaginaAutenticacaoMinuta(ctx) {
  const tag      = ctx.tag;
  const hash     = ctx.hash;
  const geradoEm = ctx.geradoEm;
  const versao   = ctx.versao;
  const org      = ctx.org    || {};
  const minuta   = ctx.minuta || {};

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
        { text: 'Minuta de Devolutiva · Integração LicitaAudit',
          fontSize: 8.5, alignment: 'center', color: '#64748b',
          margin: [0, 0, 0, 14] },

        /* TAG principal */
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

        /* Metadados */
        {
          table: {
            widths: ['35%', '*'],
            body: [
              linhaMetaMinuta('Hash de Integridade', hash),
              linhaMetaMinuta('Emitido em',          formatarDataHoraMinuta(geradoEm)),
              linhaMetaMinuta('Sistema Emissor',     versao),
              linhaMetaMinuta('Órgão Emissor',       org.nome || '—'),
              linhaMetaMinuta('Expediente',          minuta.processo || minuta.numero || '—'),
              linhaMetaMinuta('Veredito',            rotuloMinuta('vereditoCls', minuta.vereditoCls)),
              linhaMetaMinuta('Tag de Integração',   'PREFIRO_TAG: LicitaReq_Minuta_Oficial')
            ]
          },
          layout: layoutTabelaMetaMinuta(),
          margin: [0, 0, 0, 12]
        },

        /* Aviso legal */
        {
          table: {
            widths: ['*'],
            body: [[{
              stack: [
                { text: '⚠  AVISO IMPORTANTE',
                  fontSize: 8.5, bold: true, color: '#92400e',
                  margin: [0, 0, 0, 4] },
                { text:
                  'Esta Minuta foi gerada automaticamente pelo sistema LicitaReq e possui ' +
                  'TAG de autenticação única rastreável pelo LicitaAudit. A validade jurídica ' +
                  'está condicionada à conferência pela assessoria jurídica, pelo controle ' +
                  'interno e pela autoridade competente, nos termos da Lei nº 14.133/2021.',
                  fontSize: 8, color: '#78350f', lineHeight: 1.4 }
              ],
              fillColor: '#fef3c7',
              margin: [14, 10, 14, 10]
            }]]
          },
          layout: 'noBorders',
          margin: [0, 0, 0, 12]
        },

        /* Selo digital */
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
          layout: 'noBorders'
        }
      ]
    }]
  };
}

function linhaMetaMinuta(chave, valor) {
  return [
    { text: chave + ':', fontSize: 8, bold: true, color: '#334155',
      fillColor: '#f1f5f9', margin: [8, 5, 8, 5] },
    { text: valor || '—', fontSize: 8, color: '#0f172a',
      margin: [8, 5, 8, 5] }
  ];
}

function layoutTabelaMetaMinuta() {
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
   NOME DO ARQUIVO — Minuta_Parecer_042_2026.pdf
   ============================================================== */
function montarNomeArquivoMinuta(processoBruto) {
  const PREFIXO = 'Minuta_Parecer';
  let bruto = String(processoBruto == null ? '' : processoBruto).trim();

  /* Remove acentos e ruídos */
  bruto = bruto
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[ºª°]/g, '')
    .replace(/\bn[º°o]?\.?\b/gi, '')
    .replace(/n[uú]mero/gi, '')
    .trim();

  /* Normaliza separadores */
  bruto = bruto
    .replace(/[\/\\]+/g, '_')
    .replace(/[\s\-–—.]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

  if (!bruto) {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return PREFIXO + '_' + y + '-' + m + '-' + dd + '.pdf';
  }

  /* Remove prefixos redundantes (DFD, OF, MEMO, Processo, Minuta…) */
  bruto = bruto.replace(/^(DFD|OF|MEMO|PROCESSO|PROC|MINUTA)_+/i, '');

  const base = PREFIXO + '_' + bruto;
  const MAX = 120;
  const truncado = base.length > MAX
    ? base.slice(0, MAX).replace(/_+$/, '')
    : base;

  return truncado + '.pdf';
}

/* ==============================================================
   EXPORTAÇÃO GLOBAL
   ============================================================== */
window.LicitaReqMinutaPDF = {
  buildMinutaPdfDefinition: buildMinutaPdfDefinition,
  montarNomeArquivoMinuta:  montarNomeArquivoMinuta,
  ROTULOS: ROTULOS_MINUTA,
  rotulo: rotuloMinuta,
  formatarData: formatarDataMinuta,
  formatarDataHora: formatarDataHoraMinuta
};
