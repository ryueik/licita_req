/* ============================================================
   LicitaReq — pdf-minuta.js
   v2.0 — OmniLicit Edition · SHA-256 real · Rodapé autenticado
   ============================================================ */
'use strict';

const OL_M = (window.OmniLicit && window.OmniLicit.CORES) || {
  petroleo: '#00A896', petroleoD: '#007568', executivo: '#05668D',
  ink: '#0A0F1E', muted: '#475569', line: '#E2E8F0', bg: '#F8FAFC',
};

const ROTULOS_MINUTA = Object.freeze({
  vereditoCls: {
    'deferido': 'Deferido para Prosseguimento',
    'devolvido': 'Devolvido para Complementação',
    'indeferido': 'Indeferido — Informações Insuficientes',
  },
  natureza: {
    'bens': 'Bens Comuns', 'servicos': 'Serviços Comuns', 'servicos-comuns': 'Serviços Comuns',
    'obra': 'Obras e Serviços de Engenharia', 'obras': 'Obras e Serviços de Engenharia',
    'tic': 'Tecnologia da Informação e Comunicação (TIC)',
    'tecnicos': 'Serviços Técnicos Especializados',
    'intelectual': 'Serviços Técnicos Intelectuais',
    'alienacao': 'Alienação de Bens / Concessão',
  },
  papel: {
    'aprovador': 'Aprovador', 'validador': 'Validador', 'autoridade': 'Autoridade Competente',
    'fiscal': 'Fiscal do Contrato', 'gestor': 'Gestor do Contrato',
    'requisitante': 'Requisitante', 'analista': 'Analista de Triagem',
  },
});

function rotuloMinuta(g, v) { return (ROTULOS_MINUTA[g] && ROTULOS_MINUTA[g][v]) || v || '—'; }

function formatarDataMinuta(iso) {
  if (!iso) return '—';
  const p = String(iso).split('-');
  return (p[2] && p[1] && p[0]) ? (p[2] + '/' + p[1] + '/' + p[0]) : iso;
}
function formatarDataHoraMinuta(d) {
  const dt = d instanceof Date ? d : new Date(d);
  if (isNaN(dt)) return '—';
  const pad = n => String(n).padStart(2, '0');
  return pad(dt.getDate()) + '/' + pad(dt.getMonth() + 1) + '/' + dt.getFullYear() + ' ' +
         pad(dt.getHours()) + ':' + pad(dt.getMinutes()) + ':' + pad(dt.getSeconds());
}

function montarTituloCabecalhoMinuta(minuta) {
  const bruto = String((minuta && (minuta.processo || minuta.numero)) || '').trim();
  if (!bruto) return 'Minuta de Devolutiva';
  const m = bruto.match(/^([A-Za-zÀ-ÿ]+)\s*[-–—\/]?\s*(.*)$/);
  if (!m) return 'Processo · ' + bruto;
  const pre = m[1].toUpperCase();
  const rst = (m[2] || '').trim();
  if (pre.length <= 4) return rst ? (pre + ' · ' + rst) : pre;
  const t = pre.charAt(0) + pre.slice(1).toLowerCase();
  return rst ? (t + ' · ' + rst) : t;
}

/* ==============================================================
   BUILDER PRINCIPAL — async
   ============================================================== */
async function buildMinutaPdfDefinition(minuta, org, logoDataUrl, opts) {
  opts = opts || {};
  const geradoEm = opts.geradoEm || new Date();
  const versao   = opts.versao   || 'OmniLicit LicitaReq v5.0';
  const core = window.OmniLicit;

  const tag = opts.tag || (core
    ? await core.gerarTag({ ...minuta, numero: minuta.processo || minuta.numero }, org, 'OMNILICIT::MINUTA')
    : 'OMNILICIT::MINUTA::PENDING::' + geradoEm.getFullYear());

  const hash = opts.hash || (core
    ? await core.gerarHash({ v: '2.0', tag, minuta, org: { nome: org && org.nome, cnpj: org && org.cnpj } })
    : '0'.repeat(64));

  const aprovadores = Array.isArray(opts.aprovadores) ? opts.aprovadores : [];
  const tituloCabecalho = montarTituloCabecalhoMinuta(minuta);
  const auth = { tag, hash, geradoEm, versao, org: org || {}, minuta: minuta || {} };

  return {
    pageSize: 'A4',
    pageMargins: [40, 62, 40, 78],
    info: {
      title:    (tituloCabecalho + ' — Minuta de Devolutiva').trim(),
      author:   (org && org.nome) || 'OmniLicit',
      subject:  'Minuta de Devolutiva / Parecer de Triagem Preliminar — Lei nº 14.133/2021',
      keywords: 'OmniLicit, LicitaReq, Minuta, Triagem, LicitaAudit, ' + tag,
      creator:  versao,
    },
    header: currentPage => (currentPage === 1) ? { text: '' } : {
      margin: [40, 16, 40, 0],
      columns: [
        montarMiniLogoMinuta(logoDataUrl),
        { margin: [8, 1, 0, 0], stack: [
          { text: (org && org.nome ? org.nome : 'OMNILICIT').toUpperCase(),
            fontSize: 8.5, bold: true, color: OL_M.executivo },
          { text: tituloCabecalho, fontSize: 7.5, color: OL_M.muted },
        ]},
        { alignment: 'right', stack: [
          { text: 'OMNILICIT', fontSize: 8, bold: true, color: OL_M.petroleoD },
          { text: 'LicitaReq · Minuta Oficial', fontSize: 7, color: OL_M.muted },
        ]},
      ],
    },
    footer: (page, total) => montarRodapeAutenticacaoMinuta(page, total, auth),
    content: [
      montarCapaMinuta(minuta, org, logoDataUrl, geradoEm),
      { text: '', pageBreak: 'after' },
      montarPainelConformidadeMinuta(minuta, org),
      { text: '', pageBreak: 'after' },
      montarCorpoMinuta(minuta, org),
      ...montarPaginaAprovacoesMinuta(aprovadores),
      montarPaginaAutenticacaoMinuta(auth),
    ],
    defaultStyle: { fontSize: 9.5, color: OL_M.ink, lineHeight: 1.35 },
  };
}

function montarMiniLogoMinuta(logoDataUrl) {
  if (logoDataUrl) return { width: 20, image: logoDataUrl, fit: [20, 24], alignment: 'center' };
  const core = window.OmniLicit;
  if (!core || !core.escudo) return { width: 0, text: '' };
  return { width: 20, canvas: core.escudo(20, 24).canvas };
}

/* ==============================================================
   RODAPÉ
   ============================================================== */
function montarRodapeAutenticacaoMinuta(page, total, auth) {
  const { tag, hash, geradoEm, versao } = auth;
  const dt = formatarDataHoraMinuta(geradoEm);

  if (page === 1) {
    return {
      margin: [40, 0, 40, 18],
      columns: [
        { text: versao, fontSize: 7, color: OL_M.muted },
        { text: 'Emitido em ' + dt, alignment: 'center', fontSize: 7, color: OL_M.muted },
        { text: 'Pág. ' + page + '/' + total, alignment: 'right', fontSize: 7, color: OL_M.muted },
      ],
    };
  }
  return {
    margin: [40, 6, 40, 16],
    stack: [
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: OL_M.petroleo }] },
      { margin: [0, 4, 0, 0], columns: [
        { width: '*', stack: [
          { text: tag, fontSize: 7, bold: true, color: OL_M.petroleoD, font: 'Courier' },
          { text: 'SHA-256: ' + hash, fontSize: 6.3, color: OL_M.muted, font: 'Courier', margin: [0, 2, 0, 0] },
        ]},
        { width: 'auto', alignment: 'right', stack: [
          { text: versao + ' · OmniLicit Audit', fontSize: 7, color: OL_M.muted },
          { text: dt + ' · Pág. ' + page + '/' + total, fontSize: 7, color: OL_M.muted },
        ]},
      ]},
      { margin: [0, 3, 0, 0],
        text: '• Minuta íntegra · Autenticidade verificável via OmniLicit Audit',
        fontSize: 6, italics: true, color: OL_M.muted },
    ],
  };
}

/* ==============================================================
   CAPA
   ============================================================== */
function montarCapaMinuta(minuta, org, logoDataUrl, geradoEm) {
  const cls = minuta.vereditoCls || 'devolvido';
  const corV = cls === 'deferido' ? '#059669' : cls === 'devolvido' ? '#B45309' : '#DC2626';
  const fundoV = cls === 'deferido' ? '#ECFDF5' : cls === 'devolvido' ? '#FFFBEB' : '#FEF2F2';
  const core = window.OmniLicit;
  const escudoCol = (core && core.escudo) ? core.escudo(64, 76) : null;

  return {
    stack: [
      { table: { widths: ['*'], body: [[{
          stack: [
            { text: 'OMNILICIT · LICITAREQ', fontSize: 8, bold: true,
              color: '#C2ECE7', alignment: 'center' },
            { text: 'MINUTA DE DEVOLUTIVA · PARECER DE TRIAGEM PRELIMINAR',
              fontSize: 9, bold: true, color: '#FFFFFF', alignment: 'center', margin: [0, 4, 0, 0] },
          ],
          fillColor: OL_M.petroleo, margin: [0, 10, 0, 10],
        }]]},
        layout: 'noBorders', margin: [0, 0, 0, 22],
      },

      logoDataUrl
        ? { image: logoDataUrl, fit: [90, 90], alignment: 'center', margin: [0, 0, 0, 12] }
        : (escudoCol ? { width: 64, canvas: escudoCol.canvas, alignment: 'center', margin: [0, 0, 0, 14] }
                     : { text: '', margin: [0, 0, 0, 26] }),

      { text: (org && org.nome ? org.nome : 'ÓRGÃO / ENTIDADE').toUpperCase(),
        fontSize: 15, bold: true, alignment: 'center', color: OL_M.executivo, margin: [0, 0, 0, 4] },
      { text: [org && org.sigla ? 'Sigla: ' + org.sigla : '',
               org && org.cnpj  ? 'CNPJ: '  + org.cnpj  : ''].filter(Boolean).join(' · '),
        fontSize: 8.5, alignment: 'center', color: OL_M.muted },

      { text: '', margin: [0, 0, 0, 20] },
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1.2, lineColor: OL_M.petroleo }],
        margin: [0, 0, 0, 16] },
      { text: 'MINUTA DE DEVOLUTIVA', fontSize: 18, bold: true, alignment: 'center', color: OL_M.ink },
      { text: 'Parecer de Triagem Preliminar · Lei nº 14.133/2021',
        fontSize: 11, alignment: 'center', color: OL_M.petroleoD, margin: [0, 6, 0, 0] },
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1.2, lineColor: OL_M.petroleo }],
        margin: [0, 16, 0, 20] },

      { text: 'IDENTIFICAÇÃO DO PROCEDIMENTO', fontSize: 10, bold: true,
        color: OL_M.petroleoD, alignment: 'center', margin: [0, 0, 0, 10] },

      { table: {
          widths: ['*', '*'],
          body: [
            [cartaoMinuta('Nº do Processo / Expediente', minuta.processo || minuta.numero || '—'),
             cartaoMinuta('Data da Análise', formatarDataMinuta(minuta.data) || formatarDataMinuta(geradoEm))],
            [cartaoMinuta('Unidade Requisitante', minuta.unidade || (minuta.meta && minuta.meta.unidade) || '—'),
             cartaoMinuta('Órgão / Entidade', minuta.orgao || (org && org.nome) || '—')],
            [cartaoMinuta('Responsável pela Triagem', minuta.responsavel || (minuta.meta && minuta.meta.responsavel) || '—'),
             cartaoMinuta('Cargo / Função', minuta.cargo || (minuta.meta && minuta.meta.cargo) || '—')],
          ],
        },
        layout: layoutCartoesMinuta(), margin: [0, 0, 0, 18],
      },

      { table: { widths: ['*'], body: [[{
          stack: [
            { text: 'VEREDITO PRELIMINAR', fontSize: 9, bold: true, alignment: 'center',
              color: corV, margin: [0, 0, 0, 6] },
            { text: rotuloMinuta('vereditoCls', cls), fontSize: 18, bold: true,
              alignment: 'center', color: corV, margin: [0, 0, 0, 4] },
            { text: 'Score de Conformidade: ' + (minuta.score != null ? minuta.score : '—') + '/100',
              fontSize: 9.5, alignment: 'center', color: '#334155', margin: [0, 4, 0, 0] },
          ],
          fillColor: fundoV, margin: [20, 16, 20, 16],
        }]]},
        layout: {
          hLineColor: () => corV, vLineColor: () => corV,
          hLineWidth: () => 0.8, vLineWidth: () => 0.8,
          paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 0, paddingBottom: () => 0,
        },
        margin: [0, 0, 0, 20],
      },

      minuta.objeto ? {
        table: { widths: ['*'], body: [[{
          stack: [
            { text: 'OBJETO DA ANÁLISE', fontSize: 8, bold: true,
              color: OL_M.petroleoD, margin: [0, 0, 0, 6] },
            { text: minuta.objeto, fontSize: 10, color: OL_M.ink, lineHeight: 1.5, alignment: 'justify' },
          ],
          fillColor: OL_M.bg, margin: [16, 12, 16, 12],
        }]]},
        layout: 'noBorders', margin: [0, 0, 0, 20],
      } : null,

      { text: 'Documento emitido em ' + formatarDataHoraMinuta(geradoEm),
        fontSize: 8, alignment: 'center', color: OL_M.muted, margin: [0, 10, 0, 0] },
    ].filter(Boolean),
  };
}

function cartaoMinuta(label, valor) {
  return { stack: [
    { text: label.toUpperCase(), fontSize: 7, bold: true, color: OL_M.muted, margin: [0, 0, 0, 3] },
    { text: valor || '—', fontSize: 9.5, bold: true, color: OL_M.ink, lineHeight: 1.4 },
  ], margin: [12, 9, 12, 9] };
}
function layoutCartoesMinuta() {
  return {
    hLineColor: () => OL_M.line, vLineColor: () => OL_M.line,
    hLineWidth: () => 0.4, vLineWidth: () => 0.4,
    fillColor: i => (i % 2 === 0 ? OL_M.bg : '#FFFFFF'),
    paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 0, paddingBottom: () => 0,
  };
}

/* ==============================================================
   PAINEL DE CONFORMIDADE
   ============================================================== */
function montarPainelConformidadeMinuta(minuta, org) {
  const req = Array.isArray(minuta.requisitos) ? minuta.requisitos : [];
  const linhasMeta = [
    ['Nº do Processo',        minuta.processo || minuta.numero || '—'],
    ['Data da Análise',       formatarDataMinuta(minuta.data)],
    ['Órgão / Entidade',      minuta.orgao || (org && org.nome) || '—'],
    ['Unidade Requisitante',  minuta.unidade || (minuta.meta && minuta.meta.unidade) || '—'],
    ['Responsável',           minuta.responsavel || (minuta.meta && minuta.meta.responsavel) || '—'],
    ['Objeto',                minuta.objeto || '—'],
    ['Natureza Detectada',    rotuloMinuta('natureza', minuta.natureza)],
    ['Modalidade Sugerida',   (minuta.modalidadeSug && minuta.modalidadeSug.rotulo) || '—'],
    ['Base Legal',            (minuta.modalidadeSug && minuta.modalidadeSug.lei) || 'Art. 28'],
    ['Score de Conformidade', (minuta.score != null ? minuta.score : '—') + '/100'],
    ['Status da Triagem',     rotuloMinuta('vereditoCls', minuta.vereditoCls)],
    ['Veredito',              minuta.veredito || rotuloMinuta('vereditoCls', minuta.vereditoCls)],
  ];
  const bodyMeta = linhasMeta.map(par => [
    { text: par[0] + ':', fontSize: 8.5, bold: true, color: OL_M.executivo, margin: [8, 5, 8, 5] },
    { text: par[1] || '—', fontSize: 8.5, color: OL_M.ink, margin: [8, 5, 8, 5] },
  ]);
  const bodyChk = req.map(r => {
    const marc = r.ok ? '[ OK ]' : '[ -- ]';
    const cor = r.ok ? '#059669' : '#DC2626';
    const sev = (r.sev || '').toUpperCase() || '—';
    return [
      { text: marc, fontSize: 9, bold: true, color: cor, margin: [8, 5, 8, 5], alignment: 'center' },
      { text: r.titulo + (r.law ? '  (' + r.law + ')' : ''),
        fontSize: 9, bold: true, color: OL_M.executivo, margin: [8, 5, 8, 5] },
      { text: r.desc || '—', fontSize: 8.5, color: '#334155', margin: [8, 5, 8, 5] },
      { text: sev, fontSize: 8, bold: true,
        color: r.sev === 'alta' ? '#DC2626' : r.sev === 'media' ? '#B45309' : '#0284C7',
        margin: [8, 5, 8, 5], alignment: 'center' },
    ];
  });

  return {
    stack: [
      { text: 'PAINEL DE CONFORMIDADE — LEI Nº 14.133/2021', fontSize: 12, bold: true,
        color: OL_M.petroleoD, alignment: 'center', margin: [0, 0, 0, 4] },
      { text: 'Bloco de leitura automatizada para o OmniLicit Audit', fontSize: 8, italics: true,
        color: OL_M.muted, alignment: 'center', margin: [0, 0, 0, 14] },

      { unbreakable: true, stack: [
        { text: '1. METADADOS DO PROCESSO', fontSize: 9.5, bold: true,
          color: OL_M.executivo, margin: [0, 0, 0, 8] },
        { table: { widths: ['38%', '*'], body: bodyMeta },
          layout: {
            hLineColor: () => OL_M.line, vLineColor: () => OL_M.line,
            hLineWidth: (i, n) => (i === 0 || i === n.table.body.length) ? 0.8 : 0.3,
            vLineWidth: () => 0.3,
            fillColor: i => (i % 2 === 0 ? OL_M.bg : null),
            paddingLeft: () => 4, paddingRight: () => 4, paddingTop: () => 0, paddingBottom: () => 0,
          },
          dontBreakRows: true },
      ], margin: [0, 0, 0, 16] },

      req.length ? {
        stack: [
          { text: '2. CHECKLIST DE REQUISITOS VALIDADOS', fontSize: 9.5, bold: true,
            color: OL_M.executivo, margin: [0, 0, 0, 8] },
          { table: {
              widths: ['10%', '35%', '*', '10%'],
              body: [
                [
                  { text: 'STATUS', fontSize: 8, bold: true, color: '#FFFFFF',
                    fillColor: OL_M.petroleo, margin: [4, 5, 4, 5], alignment: 'center' },
                  { text: 'REQUISITO', fontSize: 8, bold: true, color: '#FFFFFF',
                    fillColor: OL_M.petroleo, margin: [8, 5, 8, 5] },
                  { text: 'DESCRIÇÃO', fontSize: 8, bold: true, color: '#FFFFFF',
                    fillColor: OL_M.petroleo, margin: [8, 5, 8, 5] },
                  { text: 'SEV.', fontSize: 8, bold: true, color: '#FFFFFF',
                    fillColor: OL_M.petroleo, margin: [4, 5, 4, 5], alignment: 'center' },
                ],
                ...bodyChk,
              ],
            },
            layout: {
              hLineColor: () => OL_M.line, vLineColor: () => OL_M.line,
              hLineWidth: () => 0.3, vLineWidth: () => 0.3,
              fillColor: i => (i === 0 ? null : (i % 2 === 0 ? OL_M.bg : null)),
              paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 0, paddingBottom: () => 0,
            },
            dontBreakRows: true },
        ],
      } : null,

      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: OL_M.petroleo }],
        margin: [0, 14, 0, 4] },
    ].filter(Boolean),
  };
}

/* ==============================================================
   CORPO DA MINUTA
   ============================================================== */
function montarCorpoMinuta(minuta, org) {
  return {
    stack: [
      secaoMinuta('1. Objeto da Análise', [
        parDuploMinuta(campoMinuta('Nº do Processo', minuta.processo || minuta.numero),
                       campoMinuta('Data da Análise', formatarDataMinuta(minuta.data))),
        parDuploMinuta(campoMinuta('Unidade Requisitante', minuta.unidade || (minuta.meta && minuta.meta.unidade)),
                       campoMinuta('Órgão / Entidade', minuta.orgao || (org && org.nome))),
        campoMinuta('Objeto da Contratação', minuta.objeto, { full: true, bloco: true }),
      ]),
      secaoMinuta('2. Veredito Preliminar', [
        parDuploMinuta(campoMinuta('Veredito', rotuloMinuta('vereditoCls', minuta.vereditoCls)),
                       campoMinuta('Score', (minuta.score != null ? minuta.score : '—') + '/100')),
        campoMinuta('Fundamentação',
                    minuta.vereditoTexto ||
                    'A análise considerou o disposto nos Arts. 18 e 23 da Lei nº 14.133/2021.',
                    { full: true, bloco: true }),
      ]),
      secaoMinuta('3. Enquadramento e Natureza', [
        parDuploMinuta(campoMinuta('Natureza Detectada', rotuloMinuta('natureza', minuta.natureza)),
                       campoMinuta('Modalidade Sugerida', (minuta.modalidadeSug && minuta.modalidadeSug.rotulo) || '—')),
        campoMinuta('Base Legal', (minuta.modalidadeSug && minuta.modalidadeSug.lei) || 'Art. 28', { full: true }),
      ]),
      montarChecklistDetalhado(minuta),
      montarAlertasMinuta(minuta),
      secaoMinuta('6. Encaminhamento', [
        campoMinuta('Providências',
          minuta.vereditoCls === 'deferido'
            ? 'Encaminhe-se o processo à fase seguinte de instrução, nos termos do Art. 18 da Lei nº 14.133/2021, com elaboração de ETP e TR.'
            : minuta.vereditoCls === 'devolvido'
            ? 'Devolva-se o expediente à unidade requisitante para complementação dos itens apontados no checklist.'
            : 'Recomenda-se a reformulação integral da demanda, com reapresentação devidamente instruída.',
          { full: true, bloco: true }),
      ]),
      montarMinutaTextual(minuta),
      secaoMinuta('8. Ressalva Institucional', [
        { table: { widths: ['*'], body: [[{
            stack: [
              { text: '[!]  RESSALVA', fontSize: 9, bold: true, color: '#92400E', margin: [0, 0, 0, 4] },
              { text: 'Esta é uma análise automatizada de apoio e NÃO substitui o parecer da ' +
                      'assessoria jurídica, do controle interno ou da autoridade competente.',
                fontSize: 8.5, color: '#78350F', lineHeight: 1.5, alignment: 'justify' },
            ],
            fillColor: '#FEF3C7', margin: [14, 12, 14, 12],
          }]]},
          layout: 'noBorders' },
      ]),
    ],
  };
}

function montarChecklistDetalhado(minuta) {
  const req = Array.isArray(minuta.requisitos) ? minuta.requisitos : [];
  if (!req.length) return { text: '' };
  const rows = req.map(r => {
    const icon = r.ok ? 'V' : (r.sev === 'alta' ? 'X' : '!');
    const cor = r.ok ? '#059669' : r.sev === 'alta' ? '#DC2626' : '#B45309';
    return [
      { text: icon, fontSize: 11, bold: true, color: cor, margin: [6, 5, 6, 5], alignment: 'center' },
      { text: r.titulo, fontSize: 9.5, bold: true, color: OL_M.executivo, margin: [8, 5, 8, 5] },
      { text: r.desc || '—', fontSize: 8.5, color: '#334155', margin: [8, 5, 8, 5] },
      { text: r.law || '—', fontSize: 8, italics: true, color: OL_M.petroleoD, margin: [8, 5, 8, 5], alignment: 'center' },
    ];
  });
  return {
    stack: [
      { text: '4. Checklist Detalhado de Requisitos', fontSize: 11, bold: true,
        color: OL_M.executivo, margin: [0, 12, 0, 10] },
      { table: {
          widths: ['8%', '28%', '*', '15%'],
          body: [[
            { text: '', fontSize: 8, fillColor: OL_M.petroleo, margin: [4, 5, 4, 5] },
            { text: 'REQUISITO', fontSize: 8, bold: true, color: '#FFFFFF', fillColor: OL_M.petroleo, margin: [8, 5, 8, 5] },
            { text: 'OBSERVAÇÃO', fontSize: 8, bold: true, color: '#FFFFFF', fillColor: OL_M.petroleo, margin: [8, 5, 8, 5] },
            { text: 'BASE LEGAL', fontSize: 8, bold: true, color: '#FFFFFF', fillColor: OL_M.petroleo, margin: [8, 5, 8, 5], alignment: 'center' },
          ], ...rows],
        },
        layout: {
          hLineColor: () => OL_M.line, vLineColor: () => OL_M.line,
          hLineWidth: () => 0.3, vLineWidth: () => 0.3,
          fillColor: i => (i === 0 ? null : (i % 2 === 0 ? OL_M.bg : null)),
          paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 0, paddingBottom: () => 0,
        },
        dontBreakRows: true },
    ],
  };
}

function montarAlertasMinuta(minuta) {
  const alertas = Array.isArray(minuta.alertas) ? minuta.alertas : [];
  if (!alertas.length) return { text: '' };
  const blocks = alertas.map(a => {
    const c = a.tipo === 'danger'  ? { bg: '#FEF2F2', br: '#DC2626', tx: '#450A0A', ic: '[!]' }
            : a.tipo === 'warning' ? { bg: '#FFFBEB', br: '#B45309', tx: '#451A03', ic: '[!]' }
            : a.tipo === 'success' ? { bg: '#ECFDF5', br: '#059669', tx: '#052E1F', ic: '[OK]' }
            :                        { bg: '#F0F9FF', br: '#0284C7', tx: '#082F49', ic: '[i]' };
    return {
      table: { widths: ['*'], body: [[{
        stack: [
          { text: c.ic + '  ' + (a.titulo || 'Alerta'), fontSize: 9.5, bold: true, color: c.tx, margin: [0, 0, 0, 4] },
          { text: a.texto || '—', fontSize: 8.5, color: c.tx, lineHeight: 1.5, alignment: 'justify' },
        ],
        fillColor: c.bg, margin: [14, 10, 14, 10],
      }]]},
      layout: {
        hLineColor: () => c.br, vLineColor: () => c.br,
        hLineWidth: () => 0.4, vLineWidth: () => 0.4,
        paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 0, paddingBottom: () => 0,
      },
      margin: [0, 0, 0, 8],
    };
  });
  return {
    stack: [
      { text: '5. Alertas e Recomendações', fontSize: 11, bold: true, color: OL_M.executivo, margin: [0, 12, 0, 10] },
      ...blocks,
    ],
  };
}

function montarMinutaTextual(minuta) {
  if (!minuta.minuta) return { text: '' };
  return {
    stack: [
      { text: '7. Minuta Textual de Devolutiva', fontSize: 11, bold: true,
        color: OL_M.executivo, margin: [0, 12, 0, 10] },
      { table: { widths: ['*'], body: [[{
          text: String(minuta.minuta), fontSize: 8.5, color: OL_M.ink,
          lineHeight: 1.6, alignment: 'justify', fillColor: OL_M.bg, margin: [14, 12, 14, 12],
        }]]},
        layout: {
          hLineColor: () => '#CBD5E1', vLineColor: () => '#CBD5E1',
          hLineWidth: () => 0.4, vLineWidth: () => 0.4,
          paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 0, paddingBottom: () => 0,
        },
      },
    ],
  };
}

function secaoMinuta(titulo, corpo) {
  return {
    unbreakable: true,
    stack: [
      { text: titulo, fontSize: 11, bold: true, color: OL_M.executivo, margin: [0, 12, 0, 10] },
      ...corpo,
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.4, lineColor: OL_M.line }],
        margin: [0, 10, 0, 4] },
    ],
  };
}
function campoMinuta(label, valor, opts) {
  opts = opts || {};
  return {
    full: opts.full || false,
    stack: [
      { text: label + ':', fontSize: 8, bold: true, color: OL_M.muted, margin: [0, 0, 0, 2] },
      { text: valor || '—', fontSize: opts.bloco ? 9 : 9.5, color: OL_M.ink, lineHeight: 1.4 },
    ],
    margin: [0, 0, 0, 10],
  };
}
function parDuploMinuta(c1, c2) {
  if (c1.full || c2.full) return { unbreakable: true, stack: [c1, c2] };
  return {
    unbreakable: true,
    columns: [{ width: '50%', stack: c1.stack }, { width: '50%', stack: c2.stack }],
    columnGap: 20,
  };
}
function chunkMinuta(arr, n) {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

/* ==============================================================
   APROVAÇÕES
   ============================================================== */
function montarPaginaAprovacoesMinuta(aprovadores) {
  aprovadores = aprovadores || [];
  if (!aprovadores.length) {
    return [{
      pageBreak: 'before',
      stack: [
        cabecalhoAprovacoesMinuta(true, 1, 1, 0, 0),
        { table: { widths: ['*'], body: [[{
            stack: [
              { text: '[!]', fontSize: 26, alignment: 'center', color: '#F59E0B', margin: [0, 0, 0, 8] },
              { text: 'Nenhum aprovador ou validador foi informado',
                fontSize: 12, bold: true, alignment: 'center', color: '#78350F' },
              { text: 'Preencha os aprovadores no LicitaReq antes de gerar a Minuta.',
                fontSize: 9, alignment: 'center', color: '#92400E', lineHeight: 1.55, margin: [0, 6, 0, 0] },
            ],
            fillColor: '#FEF3C7', margin: [20, 20, 20, 20],
          }]]},
          layout: 'noBorders' },
      ],
    }];
  }
  const MAX = 6;
  const grupos = distribuirAprovadoresMinuta(aprovadores, MAX);
  return grupos.map((grupo, idx) => {
    const ehPrimeira = idx === 0, ehUltima = idx === grupos.length - 1;
    return {
      pageBreak: 'before',
      stack: [
        cabecalhoAprovacoesMinuta(ehPrimeira, idx + 1, grupos.length, aprovadores.length, grupo.length),
        ...montarLinhasAprovadoresMinuta(grupo),
        ehUltima ? rodapeAprovacoesMinuta(aprovadores.length, grupos.length) : { text: '', margin: [0, 20, 0, 0] },
      ],
    };
  });
}
function distribuirAprovadoresMinuta(aprovadores, max) {
  const n = aprovadores.length;
  if (n <= max) return [aprovadores];
  const pags = Math.ceil(n / max);
  const base = Math.floor(n / pags), resto = n % pags;
  const out = []; let idx = 0;
  for (let i = 0; i < pags; i++) {
    const tam = base + (i < resto ? 1 : 0);
    out.push(aprovadores.slice(idx, idx + tam));
    idx += tam;
  }
  return out;
}
function cabecalhoAprovacoesMinuta(ehPrimeira, pag, tot, totAss, noGrupo) {
  const stack = [
    { text: 'APROVAÇÃO E VALIDAÇÃO', fontSize: ehPrimeira ? 15 : 13, bold: true,
      alignment: 'center', color: OL_M.executivo, margin: [0, 0, 0, 4] },
    { text: 'Minuta de Devolutiva · Lei nº 14.133/2021', fontSize: 9,
      alignment: 'center', color: OL_M.petroleoD, margin: [0, 0, 0, 8] },
    { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1.2, lineColor: OL_M.petroleo }],
      margin: [0, 0, 0, 10] },
  ];
  if (tot > 1) {
    stack.push({
      text: 'Página ' + pag + ' de ' + tot + ' · ' + noGrupo + ' de ' + totAss + ' assinaturas',
      fontSize: 8, italics: true, alignment: 'center', color: OL_M.muted, margin: [0, 0, 0, 10],
    });
  }
  if (ehPrimeira) {
    stack.push({
      text: 'Os responsáveis abaixo identificados aprovam e validam o presente Parecer de Triagem Preliminar.',
      fontSize: 9, color: '#334155', lineHeight: 1.5, alignment: 'justify', margin: [0, 0, 0, 18],
    });
  }
  return { unbreakable: true, stack: stack };
}
function montarLinhasAprovadoresMinuta(grupo) {
  const linhas = chunkMinuta(grupo, 2);
  const ult = linhas.length - 1;
  return linhas.map((par, idx) => ({
    stack: [{
      unbreakable: true,
      columns: [
        { width: '50%', stack: blocoAssinaturaMinuta(par[0]) },
        par[1] ? { width: '50%', stack: blocoAssinaturaMinuta(par[1]) } : { width: '50%', text: '' },
      ],
      columnGap: 26,
    }],
    margin: [0, 0, 0, idx === ult ? 0 : 22],
  }));
}
function rodapeAprovacoesMinuta(total, totPags) {
  return {
    unbreakable: true,
    stack: [
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.6, lineColor: OL_M.line }],
        margin: [0, 30, 0, 10] },
      { text: 'Total de assinaturas: ' + total + (totPags > 1 ? ' · distribuídas em ' + totPags + ' páginas' : ''),
        fontSize: 8, italics: true, alignment: 'center', color: OL_M.muted },
    ],
  };
}
function blocoAssinaturaMinuta(p) {
  const linhas = [
    { text: '', margin: [0, 32, 0, 0] },
    { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 225, y2: 0, lineWidth: 0.9,
                 lineColor: OL_M.executivo, dash: { length: 3, space: 2 } }], margin: [0, 0, 0, 5] },
    { text: 'Assinatura / Carimbo', fontSize: 7, italics: true,
      alignment: 'center', color: OL_M.muted, margin: [0, 0, 0, 8] },
    { text: p.nome || '—', fontSize: 10.5, bold: true, alignment: 'center', color: OL_M.ink },
  ];
  if (p.cargo) linhas.push({ text: p.cargo, fontSize: 8.5, alignment: 'center', color: '#334155', margin: [0, 2, 0, 0] });
  if (p.orgao) linhas.push({ text: p.orgao, fontSize: 8, alignment: 'center', color: OL_M.muted, margin: [0, 2, 0, 0] });
  if (p.papel) linhas.push({ text: rotuloMinuta('papel', p.papel).toUpperCase(), fontSize: 7, bold: true,
    alignment: 'center', color: OL_M.petroleoD, margin: [0, 6, 0, 0] });
  return [{
    table: { widths: ['*'], body: [[{ stack: linhas, margin: [12, 8, 12, 10] }]] },
    layout: {
      hLineColor: () => OL_M.line, vLineColor: () => OL_M.line,
      hLineWidth: () => 0.4, vLineWidth: () => 0.4,
      paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 0, paddingBottom: () => 0,
    },
  }];
}

/* ==============================================================
   PÁGINA FINAL — AUTENTICAÇÃO
   ============================================================== */
function montarPaginaAutenticacaoMinuta(auth) {
  const { tag, hash, geradoEm, versao, org, minuta } = auth;
  return {
    pageBreak: 'before',
    stack: [{
      unbreakable: true,
      stack: [
        { text: '', margin: [0, 4, 0, 0] },
        { text: '[SEG]', fontSize: 14, bold: true, alignment: 'center',
          color: OL_M.petroleoD, letterSpacing: 2, margin: [0, 0, 0, 10] },
        { text: 'AUTENTICAÇÃO E RASTREABILIDADE', fontSize: 14, bold: true,
          alignment: 'center', color: OL_M.petroleoD, margin: [0, 0, 0, 3] },
        { text: 'Minuta Oficial OmniLicit · Integração LicitaAudit',
          fontSize: 8.5, alignment: 'center', color: OL_M.muted, margin: [0, 0, 0, 14] },

        { table: { widths: ['*'], body: [[{
            stack: [
              { text: 'TAG DE AUTENTICAÇÃO', fontSize: 8, bold: true,
                alignment: 'center', color: '#C2ECE7', margin: [0, 0, 0, 3] },
              { text: tag, fontSize: 12, bold: true, alignment: 'center', color: '#FFFFFF' },
            ],
            fillColor: OL_M.petroleo, margin: [16, 12, 16, 12],
          }]]},
          layout: 'noBorders', margin: [0, 0, 0, 12] },

        { table: {
            widths: ['35%', '*'],
            body: [
              linhaMetaMinuta('Hash SHA-256', hash),
              linhaMetaMinuta('Emitido em',          formatarDataHoraMinuta(geradoEm)),
              linhaMetaMinuta('Sistema Emissor',     versao),
              linhaMetaMinuta('Órgão Emissor',       (org && org.nome) || '—'),
              linhaMetaMinuta('Expediente',          (minuta && (minuta.processo || minuta.numero)) || '—'),
              linhaMetaMinuta('Veredito',            rotuloMinuta('vereditoCls', minuta && minuta.vereditoCls)),
              linhaMetaMinuta('Tag de Integração',   'PREFIRO_TAG: OmniLicit_Minuta_Oficial'),
            ],
          },
          layout: layoutMetaMinuta(), margin: [0, 0, 0, 12] },

        { table: { widths: ['*'], body: [[{
            stack: [
              { text: '[!]  AVISO IMPORTANTE', fontSize: 8.5, bold: true, color: '#92400E', margin: [0, 0, 0, 4] },
              { text: 'Esta Minuta foi gerada automaticamente pelo sistema LicitaReq (OmniLicit) e possui ' +
                      'TAG de autenticação única rastreável pelo OmniLicit Audit.',
                fontSize: 8, color: '#78350F', lineHeight: 1.4, alignment: 'justify' },
            ],
            fillColor: '#FEF3C7', margin: [14, 10, 14, 10],
          }]]},
          layout: 'noBorders', margin: [0, 0, 0, 12] },

        { table: { widths: ['*'], body: [[{
            stack: [
              { text: '•  SELO DIGITAL OMNILICIT', fontSize: 8, bold: true,
                alignment: 'center', color: OL_M.petroleoD, margin: [0, 0, 0, 3] },
              { text: 'Documento íntegro · Não adulterado · Rastreável', fontSize: 7,
                alignment: 'center', color: OL_M.muted, margin: [0, 3, 0, 0] },
              { text: tag, fontSize: 7, alignment: 'center',
                color: OL_M.muted, font: 'Courier', margin: [0, 4, 0, 0] },
            ],
            fillColor: '#E6F7F5', margin: [14, 10, 14, 10],
          }]]},
          layout: 'noBorders' },
      ],
    }],
  };
}
function linhaMetaMinuta(chave, valor) {
  return [
    { text: chave + ':', fontSize: 8, bold: true, color: '#334155',
      fillColor: '#F1F5F9', margin: [8, 5, 8, 5] },
    { text: valor || '—', fontSize: 8, color: OL_M.ink,
      font: /^[A-F0-9]{64}$/.test(valor || '') ? 'Courier' : undefined,
      margin: [8, 5, 8, 5] },
  ];
}
function layoutMetaMinuta() {
  return {
    hLineColor: () => '#CBD5E1', vLineColor: () => '#CBD5E1',
    hLineWidth: () => 0.4, vLineWidth: () => 0.4,
    paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 0, paddingBottom: () => 0,
  };
}

/* ==============================================================
   NOME DO ARQUIVO
   ============================================================== */
function montarNomeArquivoMinuta(processoBruto) {
  const PREFIXO = 'Minuta_Parecer';
  let bruto = String(processoBruto == null ? '' : processoBruto).trim();
  bruto = bruto.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[ºª°]/g, '').replace(/\bn[º°o]?\.?\b/gi, '').replace(/n[uú]mero/gi, '').trim();
  bruto = bruto.replace(/[\/\\]+/g, '_').replace(/[\s\-–—.]+/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
  if (!bruto) {
    const d = new Date();
    return PREFIXO + '_' + d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') +
           '-' + String(d.getDate()).padStart(2, '0') + '.pdf';
  }
  bruto = bruto.replace(/^(DFD|OF|MEMO|PROCESSO|PROC|MINUTA)_+/i, '');
  const base = PREFIXO + '_' + bruto;
  return (base.length > 120 ? base.slice(0, 120).replace(/_+$/, '') : base) + '.pdf';
}

window.LicitaReqMinutaPDF = {
  buildMinutaPdfDefinition,
  montarNomeArquivoMinuta,
  ROTULOS: ROTULOS_MINUTA,
  rotulo: rotuloMinuta,
  formatarData: formatarDataMinuta,
  formatarDataHora: formatarDataHoraMinuta,
};
