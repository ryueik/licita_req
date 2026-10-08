/* ============================================================
   LicitaReq — pdf-dfd.js
   Módulo de geração de PDF (DFD)
   v3.1 — Auditoria otimizada + Painel de Conformidade
   ------------------------------------------------------------
   • Painel de conformidade com pares "Chave: Valor" em linha única
     (compatível com o extrator regex do LicitaAudit)
   • Labels sem characterSpacing e sem uppercase forçado
   • Nome do arquivo sem redundância (DFD_042_2026.pdf)
   • Quebra de página obrigatória para a TAG de autenticação
   ============================================================ */

/* --------------------------------------------------------------
   DICIONÁRIO DE RÓTULOS REVISADOS
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
   Converte qualquer entrada em "R$ 165.000,00" legível ao regex
   ============================================================== */
function normalizarValorMonetario(v) {
  if (v == null || v === '') return '—';
  const s = String(v).trim();
  // Se já tem "R$", mantém
  if (/^R\$/i.test(s)) return s;
  // Se for só número com pontos/vírgula, prefixa
  return 'R$ ' + s;
}

/* ==============================================================
   PAINEL DE CONFORMIDADE — Chave: Valor em linha única
   Bloco que o LicitaAudit lê ANTES das seções numeradas
   ============================================================== */
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
      {
        text: par[0] + ':',
        fontSize: 9,
        bold: true,
        color: '#1e1b4b',
        // SEM characterSpacing — leitura regex limpa
        margin: [8, 5, 8, 5]
      },
      {
        text: par[1] || '—',
        fontSize: 9,
        color: '#0f172a',
        margin: [8, 5, 8, 5]
      }
    ];
  });

  return {
    unbreakable: true,
    stack: [
      {
        text: 'PAINEL DE CONFORMIDADE — LEI Nº 14.133/2021',
        fontSize: 10.5,
        bold: true,
        color: '#4f46e5',
        alignment: 'center',
        margin: [0, 0, 0, 4]
      },
      {
        text: 'Bloco de leitura automatizada para o LicitaAudit',
        fontSize: 8,
        italics: true,
        color: '#64748b',
        alignment: 'center',
        margin: [0, 0, 0, 10]
      },
      {
        table: {
          widths: ['38%', '*'],
          body: body
        },
        layout: {
          hLineColor: function () { return '#e2e8f0'; },
          vLineColor: function () { return '#e2e8f0'; },
          hLineWidth: function (i, node) {
            // linha superior e inferior mais fortes
            return (i === 0 || i === node.table.body.length) ? 0.8 : 0.3;
          },
          vLineWidth: function () { return 0.3; },
          fillColor: function (i) {
            // zebra striping leve
            return i % 2 === 0 ? '#f8fafc' : null;
          },
          paddingLeft:   function () { return 4; },
          paddingRight:  function () { return 4; },
          paddingTop:    function () { return 0; },
          paddingBottom: function () { return 0; }
        }
      },
      {
        canvas: [{
          type: 'line', x1: 0, y1: 0, x2: 495, y2: 0,
          lineWidth: 1, lineColor: '#4f46e5'
        }],
        margin: [0, 12, 0, 4]
      }
    ]
  };
}

/* ==============================================================
   FUNÇÃO PRINCIPAL — Monta o docDefinition do pdfMake
   ============================================================== */
function buildDfdPdfDefinition(dfd, org, logoDataUrl, opts = {}) {
  const geradoEm = opts.geradoEm || new Date();
  const tag      = opts.tag      || gerarTagAutenticacao(dfd, org);
  const hash     = opts.hash     || gerarHashDocumento(dfd, org);
  const versao   = opts.versao   || 'LicitaReq v3.1';

  const aprovadores = Array.isArray(opts.aprovadores) ? opts.aprovadores : [];

  /* ---------- Cabeçalho institucional ---------- */
  const cabecalho = {
    columns: [
      logoDataUrl
        ? { width: 70, image: logoDataUrl, fit: [64, 64] }
        : { width: 70, text: '' },
      {
        width: '*',
        stack: [
          { text: (org && org.nome ? org.nome : 'ÓRGÃO / ENTIDADE').toUpperCase(),
            fontSize: 12, bold: true, color: '#0f172a' },
          { text: [
              org && org.sigla ? 'Sigla: ' + org.sigla : '',
              org && org.cnpj  ? 'CNPJ: '  + org.cnpj  : '',
              org && org.cidade && org.uf ? org.cidade + '/' + org.uf : ''
            ].filter(Boolean).join(' · '),
            fontSize: 8.5, color: '#475569', margin: [0, 2, 0, 0] },
          org && org.endereco
            ? { text: org.endereco, fontSize: 8, color: '#64748b', margin: [0, 1, 0, 0] }
            : null
        ].filter(Boolean)
      }
    ],
    margin: [0, 0, 0, 14]
  };

  const linhaDivisoria = {
    canvas: [{ type: 'line', x1: 0, y1: 0, x2: 495, y2: 0, lineWidth: 1, lineColor: '#4f46e5' }],
    margin: [0, 0, 0, 16]
  };

  /* ---------- Título ---------- */
  const titulo = {
    stack: [
      { text: 'DOCUMENTO DE FORMALIZAÇÃO DE DEMANDA',
        fontSize: 14, bold: true, alignment: 'center', color: '#1e1b4b' },
      { text: 'DFD — Lei nº 14.133/2021, Art. 18, § 1º',
        fontSize: 9.5, alignment: 'center', color: '#4f46e5', margin: [0, 4, 0, 14] }
    ]
  };

  /* ---------- PAINEL DE CONFORMIDADE (topo, para o LicitaAudit) ---------- */
  const painelConformidade = montarPainelConformidade(dfd, org);

  /* ---------- Blocos 1 a 8 ---------- */
  const blocos = [
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
        campo('Previsão no PCA',        rotulo('pca', dfd.pcaPrevisto)),
        campo('Item / Código no PCA',   dfd.pcaItem)
      ),
      campo('Justificativa do Alinhamento', dfd.pcaJustificativa, { full: true, bloco: true })
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

    secao('6. Parcelamento, Prazo e Entrega', [
      parDuplo(
        campo('Decisão de Parcelamento (Art. 47)', rotulo('parcelamento', dfd.parcelamento)),
        campo('Prazo de Execução / Vigência',      dfd.prazo)
      ),
      parDuplo(
        campo('Local de Entrega / Prestação', dfd.local),
        campo('Condições de Pagamento',       rotulo('pagamento', dfd.pagamento))
      )
    ]),

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

  /* ---------- Bloco de assinaturas (dinâmico) ---------- */
  const blocoAssinaturas = montarBlocoAprovadores(aprovadores);

  /* ---------- Página exclusiva de autenticação ---------- */
  const paginaAutenticacao = montarPaginaAutenticacao({
    tag, hash, geradoEm, versao, org, dfd
  });

  /* ---------- Documento final ---------- */
  return {
    pageSize: 'A4',
    pageMargins: [50, 60, 50, 70],
    info: {
      title:    ('DFD ' + (dfd.numero || '') + ' — ' + ((org && org.nome) || 'LicitaReq')).trim(),
      author:   (org && org.nome) || 'LicitaReq',
      subject:  'Documento de Formalização de Demanda — Lei nº 14.133/2021',
      keywords: 'LicitaReq, DFD, LicitaAudit, ' + tag,
      creator:  versao
    },
    header: function (currentPage) {
      if (currentPage === 1) return { text: '' };
      return {
        margin: [50, 20, 50, 0],
        columns: [
          { text: (org && org.nome) || 'LicitaReq', fontSize: 8, color: '#94a3b8' },
          { text: ('DFD ' + (dfd.numero || '')).trim(),
            alignment: 'right', fontSize: 8, color: '#94a3b8' }
        ]
      };
    },
    footer: function (currentPage, pageCount) {
      return {
        margin: [50, 20, 50, 0],
        columns: [
          { text: 'LicitaReq · Documento Oficial · ' + formatarDataHora(geradoEm),
            fontSize: 7.5, color: '#94a3b8' },
          { text: 'Página ' + currentPage + ' de ' + pageCount,
            alignment: 'right', fontSize: 7.5, color: '#94a3b8' }
        ]
      };
    },
    content: [
      cabecalho,
      linhaDivisoria,
      titulo,
      // ⭐ PAINEL DE CONFORMIDADE — topo da página 1
      painelConformidade,
      { text: '', margin: [0, 8, 0, 0] },
      ...blocos,
      blocoAssinaturas,
      // 🔒 PÁGINA FINAL EXCLUSIVA — TAG DE AUTENTICAÇÃO
      paginaAutenticacao
    ],
    defaultStyle: { fontSize: 9.5, color: '#0f172a', lineHeight: 1.35 }
  };
}

/* ==============================================================
   APROVADORES — grade 2 colunas com quebra limpa
   ============================================================== */
function montarBlocoAprovadores(aprovadores) {
  aprovadores = aprovadores || [];

  if (!aprovadores.length) {
    return {
      unbreakable: true,
      stack: [
        { text: 'APROVAÇÃO E VALIDAÇÃO', fontSize: 11, bold: true,
          color: '#1e1b4b', margin: [0, 26, 0, 8] },
        { text: 'Nenhum aprovador foi informado no momento da geração deste documento.',
          fontSize: 9, italics: true, color: '#64748b' }
      ]
    };
  }

  const linhas = chunk(aprovadores, 2).map(function (par, idx, arr) {
    return {
      columns: [
        { width: '50%', stack: blocoAssinatura(par[0]) },
        par[1]
          ? { width: '50%', stack: blocoAssinatura(par[1]) }
          : { width: '50%', text: '' }
      ],
      columnGap: 24,
      margin: [0, 0, 0, idx === arr.length - 1 ? 0 : 34]
    };
  });

  return {
    stack: [
      {
        unbreakable: true,
        stack: [
          { text: 'APROVAÇÃO E VALIDAÇÃO', fontSize: 11, bold: true,
            color: '#1e1b4b', margin: [0, 26, 0, 4] },
          { text: 'Assinam eletronicamente ou de próprio punho os responsáveis abaixo identificados.',
            fontSize: 8.5, color: '#64748b', margin: [0, 0, 0, 22] }
        ]
      },
      ...linhas
    ]
  };
}

function blocoAssinatura(p) {
  const linhas = [
    { text: '', margin: [0, 42, 0, 0] },
    {
      canvas: [{
        type: 'line', x1: 0, y1: 0, x2: 215, y2: 0,
        lineWidth: 0.8, lineColor: '#475569'
      }],
      margin: [0, 0, 0, 6]
    },
    { text: 'Assinatura / Carimbo', fontSize: 7.5, italics: true,
      alignment: 'center', color: '#94a3b8', margin: [0, 0, 0, 8] },
    { text: p.nome || '—', fontSize: 10.5, bold: true,
      alignment: 'center', color: '#0f172a' }
  ];

  if (p.cargo) linhas.push({
    text: p.cargo, fontSize: 9, alignment: 'center',
    color: '#334155', margin: [0, 2, 0, 0]
  });
  if (p.orgao) linhas.push({
    text: p.orgao, fontSize: 8.5, alignment: 'center',
    color: '#64748b', margin: [0, 1, 0, 0]
  });
  if (p.papel) linhas.push({
    text: rotulo('papel', p.papel).toUpperCase(),
    fontSize: 7.5, bold: true, alignment: 'center',
    color: '#4f46e5', margin: [0, 6, 0, 0]
  });

  return linhas;
}

/* ==============================================================
   PÁGINA EXCLUSIVA DE AUTENTICAÇÃO
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
    stack: [
      { text: '', margin: [0, 30, 0, 0] },
      { text: '🔐', fontSize: 44, alignment: 'center', margin: [0, 0, 0, 10] },
      { text: 'AUTENTICAÇÃO E RASTREABILIDADE',
        fontSize: 17, bold: true, alignment: 'center',
        color: '#4f46e5', margin: [0, 0, 0, 6] },
      { text: 'Documento Oficial LicitaReq · Integração LicitaAudit',
        fontSize: 10, alignment: 'center', color: '#64748b',
        margin: [0, 0, 0, 34] },

      {
        table: {
          widths: ['*'],
          body: [[{
            stack: [
              { text: 'TAG DE AUTENTICAÇÃO',
                fontSize: 9, bold: true, alignment: 'center',
                color: '#c7d2fe', margin: [0, 0, 0, 4] },
              { text: tag,
                fontSize: 15, bold: true, alignment: 'center',
                color: '#ffffff', margin: [0, 4, 0, 0] }
            ],
            fillColor: '#4f46e5',
            margin: [22, 20, 22, 20]
          }]]
        },
        layout: 'noBorders',
        margin: [0, 0, 0, 26]
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
        margin: [0, 0, 0, 26]
      },

      {
        table: {
          widths: ['*'],
          body: [[{
            stack: [
              { text: '⚠  AVISO IMPORTANTE',
                fontSize: 9.5, bold: true, color: '#92400e',
                margin: [0, 0, 0, 6] },
              { text:
                'Este documento foi gerado automaticamente pelo sistema LicitaReq e possui ' +
                'TAG de autenticação única rastreável pelo LicitaAudit. A validade jurídica ' +
                'do presente DFD está condicionada à conferência pela assessoria jurídica, ' +
                'pelo controle interno e pela autoridade competente, nos termos da Lei nº 14.133/2021.',
                fontSize: 8.5, color: '#78350f', lineHeight: 1.45 }
            ],
            fillColor: '#fef3c7',
            margin: [16, 14, 16, 14]
          }]]
        },
        layout: 'noBorders',
        margin: [0, 0, 0, 26]
      },

      {
        table: {
          widths: ['*'],
          body: [[{
            stack: [
              { text: '◆  SELO DIGITAL LICITAREQ',
                fontSize: 9, bold: true, alignment: 'center',
                color: '#4f46e5', margin: [0, 0, 0, 4] },
              { text: 'Documento íntegro · Não adulterado · Rastreável',
                fontSize: 8, alignment: 'center',
                color: '#64748b', margin: [0, 4, 0, 0] },
              { text: tag,
                fontSize: 8, alignment: 'center',
                color: '#94a3b8', margin: [0, 6, 0, 0] }
            ],
            fillColor: '#eef2ff',
            margin: [16, 12, 16, 12]
          }]]
        },
        layout: 'noBorders',
        margin: [0, 0, 0, 0]
      }
    ]
  };
}

function linhaMeta(chave, valor) {
  return [
    { text: chave + ':', fontSize: 8.5, bold: true, color: '#334155',
      fillColor: '#f1f5f9', margin: [10, 7, 10, 7] },
    { text: valor || '—', fontSize: 8.5, color: '#0f172a',
      margin: [10, 7, 10, 7] }
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
   HELPERS DE LAYOUT
   ============================================================== */
function secao(titulo, corpo) {
  return {
    stack: [
      { text: titulo, fontSize: 11, bold: true, color: '#1e1b4b',
        margin: [0, 12, 0, 10] },
      ...corpo,
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 495, y2: 0,
                   lineWidth: 0.4, lineColor: '#e2e8f0' }],
        margin: [0, 10, 0, 4] }
    ]
  };
}

/* --------------------------------------------------------------
   CAMPO — agora com "Label: Valor" em parágrafos contíguos
   Sem characterSpacing (preserva leitura regex)
   -------------------------------------------------------------- */
function campo(label, valor, options) {
  options = options || {};
  const bloco = options.bloco || false;
  return {
    full: options.full || false,
    stack: [
      // Label legível: mantém case original (Title Case)
      { text: label + ':',
        fontSize: 8,
        bold: true,
        color: '#64748b',
        margin: [0, 0, 0, 2] },
      // Valor em texto contínuo — o extrator lê "Valor Estimado:\nR$ 165.000,00"
      { text: valor || '—',
        fontSize: bloco ? 9 : 9.5,
        color: '#0f172a',
        lineHeight: 1.4 }
    ],
    margin: [0, 0, 0, 10]
  };
}

function parDuplo(c1, c2) {
  if (c1.full || c2.full) {
    return { stack: [c1, c2] };
  }
  return {
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

/* ==============================================================
   HELPERS DE FORMATAÇÃO
   ============================================================== */
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
  ROTULOS: ROTULOS,
  rotulo: rotulo,
  normalizarValorMonetario: normalizarValorMonetario,
  formatarData: formatarData,
  formatarDataHora: formatarDataHora
};
