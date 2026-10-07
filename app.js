/* ============================================================
   LicitaReq — app.js
   Motor de triagem baseado na Lei nº 14.133/2021
   Versão refatorada — ver correções abaixo
   ============================================================ */
'use strict';

/* -------------------- LIMITES LEGAIS -------------------- */
/* ⚠️ Valores de referência — atualize anualmente conforme decretos. */
const LIMITE_DISPENSA_BENS_SERVICOS = 50000.00;   // Art. 75, II
const LIMITE_DISPENSA_OBRAS         = 100000.00;  // Art. 75, I

/* -------------------- LIMITES OPERACIONAIS -------------------- */
const MAX_FILE_SIZE_MB  = 10;
const MAX_FILE_SIZE     = MAX_FILE_SIZE_MB * 1024 * 1024;
const MAX_QUEUE_FILES   = 20;
const MAX_PDF_PAGES     = 30;
const MAX_TEXTO_LENGTH  = 500_000;
const PDF_PARALLEL_BATCH = 5;

/* -------------------- PALAVRAS-CHAVE -------------------- */
const KEYWORDS = {
  obra: [
    'obra', 'obras', 'engenharia', 'reforma', 'construção', 'construcao',
    'edifica', 'pavimenta', 'saneamento', 'drenagem', 'hidráulica', 'hidraulica',
    'estrutural', 'alvenaria', 'fundação', 'fundacao',
    'projeto executivo', 'projeto básico', 'memorial descritivo', 'orçamento de obra'
  ],
  tic: [
    'software', 'licença de software', 'licenca de software',
    'tecnologia da informação', 'tecnologia da informacao',
    'computador', 'notebook', 'servidor de rede', 'cloud computing',
    'datacenter', 'firewall', 'switch gerenciável', 'roteador',
    'cabeamento estruturado de rede', 'desenvolvimento de sistema',
    'aplicativo móvel', 'erp', 'arquitetura de nuvem', 'consultoria em ti',
    'link de internet', 'provedor de internet'
  ],
  tecnicos: [
    'serviço técnico especializado', 'servico tecnico especializado',
    'consultoria', 'consultoria especializada', 'assessoria técnica',
    'parecer técnico', 'auditoria', 'perícia', 'pericia', 'laudo',
    'estudo técnico', 'projeto de engenharia', 'capacitação',
    'treinamento especializado', 'engenharia consultiva',
    'parecerista', 'notória especialização'
  ],
  comuns: [
    'material de escritório', 'material de escritorio',
    'material de expediente', 'papel a4', 'papel sulfite',
    'caneta', 'lápis', 'lapis', 'toner', 'cartucho', 'grampeador',
    'limpeza', 'higiene', 'copa', 'cozinha', 'gêneros', 'generos',
    'alimentício', 'alimenticio', 'uniforme', 'vestuário', 'vestuario',
    'mobiliário', 'mobiliario', 'cadeira', 'mesa', 'armário', 'armario',
    'manutenção predial', 'manutencao predial', 'vigilância', 'vigilancia',
    'transporte', 'locação de veículo', 'locacao de veiculo', 'combustível',
    'lâmpada', 'lampada', 'lâmpadas', 'lampadas', 'led',
    'ferramenta', 'ferramentas', 'parafuso', 'prego', 'martelo',
    'chave de fenda', 'alicate', 'furadeira', 'material elétrico', 'material eletrico'
  ],
  consumo: [
    'lâmpada', 'lampada', 'lâmpadas', 'lampadas',
    'papel a4', 'papel sulfite', 'material de escritório', 'material de escritorio',
    'material de expediente', 'expediente',
    'caneta', 'lápis', 'lapis', 'borracha', 'grampeador', 'clips', 'clipes',
    'toner', 'cartucho', 'ferramenta', 'ferramentas', 'parafuso', 'prego',
    'martelo', 'chave de fenda', 'alicate', 'furadeira', 'serra',
    'cabo elétrico', 'cabo eletrico', 'fio elétrico', 'fio eletrico',
    'tomada', 'interruptor', 'disjuntor', 'quadro de distribuição'
  ],
  emergencia: [
    'emergência', 'emergencia', 'emergencial', 'emergenciais',
    'calamidade', 'calamidade pública', 'calamidade publica',
    'desastre', 'desastres', 'defesa civil',
    'risco iminente', 'risco iminente à vida', 'risco a vida',
    'paralisação de serviço', 'paralisacao de servico',
    'paralisação de serviços essenciais', 'desabastecimento',
    'socorro', 'situação crítica', 'situacao critica',
    'estado de emergência', 'estado de emergencia'
  ],
  inexigibilidade: [
    'inexigibilidade', 'notória especialização', 'notoria especializacao',
    'fornecedor exclusivo', 'exclusividade', 'inviabilidade de competição',
    'inviabilidade de competicao', 'artista', 'consagrado', 'serviço singular',
    'servico singular', 'representante exclusivo', 'único fornecedor', 'unico fornecedor',
    'parecerista', 'treinamento especializado'
  ],
  justificativaExclusividade: [
    'notória especialização', 'notoria especializacao', 'exclusividade',
    'fornecedor exclusivo', 'inviabilidade de competição', 'inviabilidade de competicao',
    'representante exclusivo', 'único fornecedor', 'unico fornecedor',
    'art. 74', 'artigo 74', 'inciso iii'
  ],
  justificativaPrecoInexigivel: [
    'nota fiscal', 'notas fiscais', 'nota fiscal anterior',
    'contrato anterior', 'contratos anteriores', 'contratação anterior',
    'contratacao anterior', 'histórico de contratações', 'historico de contratacoes',
    'preços praticados', 'precos praticados', 'preço praticado', 'preco praticado',
    'art. 74, § 2', 'art. 74, §2', 'artigo 74, § 2', 'artigo 74, §2',
    'art. 74, § 2º', 'art. 74, §2º',
    'justificativa de preço', 'justificativa de preco'
  ],
  alienacao: [
    'alienação', 'alienacao', 'venda de bens', 'venda de bem',
    'bens inservíveis', 'bens inserviveis', 'inservível', 'inservivel',
    'desfazimento', 'leilão', 'leilao', 'hasta pública', 'hasta publica',
    'leiloeiro', 'maior lance', 'bens móveis inservíveis', 'bens imóveis'
  ],
  marca: [
    'marca ', 'marca:', 'da marca', 'modelo ', 'modelo:', 'fabricante',
    'referência', 'referencia', 'similar', 'ou similar', 'equivalente'
  ]
};

/* -------------------- CHECKLIST DE REQUISITOS -------------------- */
const REQUISITOS = [
  {
    id: 'justificativa',
    titulo: 'Justificativa da necessidade pública',
    desc: 'A demanda deve demonstrar a real necessidade administrativa, o interesse público e o resultado pretendido.',
    law: 'Art. 18, §1º, I — Lei 14.133/2021',
    severidade: 'alta',
    test: (t) => t.length > 200 && /(justific|necessidad|interesse público|interesse publico|finalidade|objetivo|para atender)/i.test(t)
  },
  {
    id: 'objeto',
    titulo: 'Descrição clara e precisa do objeto',
    desc: 'O objeto deve ser descrito de forma suficiente, clara e precisa, sem ambiguidades.',
    law: 'Art. 18, §1º, II — Lei 14.133/2021',
    severidade: 'alta',
    test: (t) => t.length > 80 && /(objeto|aquisição|aquisicao|contratação|contratacao|prestação|prestacao|fornecimento)/i.test(t)
  },
  {
    id: 'quantidade',
    titulo: 'Estimativa de quantidade',
    desc: 'Deve haver estimativa das quantidades a serem contratadas, com base em séries históricas ou projeções.',
    law: 'Art. 18, §1º, III — Lei 14.133/2021',
    severidade: 'media',
    test: (t) => /(\d+\s*(unid|unidade|un|pç|pc|caixa|cx|kg|litro|l|m²|m2|m³|m3|metro|pacote|resma|frasco|licen[çc]a))|quantidade\s*:?\s*\d+|\b\d{1,5}\s+(unidades?|itens?)/i.test(t)
  },
  {
    id: 'valor',
    titulo: 'Estimativa preliminar de preço / pesquisa de mercado',
    desc: 'A solicitação deve vir acompanhada de estimativa de valor ou indicação de pesquisa de preços. Em contratações diretas por Inexigibilidade, admite-se justificativa de preço baseada em notas fiscais ou contratos anteriores do contratado (Art. 74, §2º).',
    law: 'Art. 18, §1º, IV e Art. 23 — Lei 14.133/2021',
    severidade: 'media',
    test: (t, extra) => {
      if (extra?.eInexigivel) {
        const lower = t.toLowerCase();
        if (KEYWORDS.justificativaPrecoInexigivel.some(k => lower.includes(k))) return true;
      }
      return (
        /(R\$\s*[\d.,]+)|(pesquisa de (preço|preco|mercado))|(estimativa de valor)|(valor estimado)/i.test(t) ||
        (extra?.valor > 0)
      );
    }
  },
  {
    id: 'dotacao',
    titulo: 'Indicação de dotação orçamentária',
    desc: 'Deve haver indicação da dotação orçamentária ou declaração de que há previsão no orçamento.',
    law: 'Art. 18, §1º, V e Art. 150 — Lei 14.133/2021',
    severidade: 'media',
    test: (t) => /(dotação|dotacao|orçament|orcament|previsão orçament|previsao orcament|fonte de recurso|natureza de despesa)/i.test(t)
  },
  {
    id: 'prazo',
    titulo: 'Prazo de execução / entrega',
    desc: 'Deve constar prazo de execução, entrega ou vigência contratual pretendida.',
    law: 'Art. 18, §1º, VI — Lei 14.133/2021',
    severidade: 'baixa',
    test: (t) => /(prazo|vigência|vigencia|entrega em|execução em|execucao em|\d+\s*(dias|meses|anos))/i.test(t)
  },
  {
    id: 'local',
    titulo: 'Local de entrega / prestação',
    desc: 'Deve ser indicado o local de entrega do bem ou de prestação do serviço.',
    law: 'Art. 18, §1º, VII — Lei 14.133/2021',
    severidade: 'baixa',
    test: (t) => /(local de entrega|local de presta|endereço|endereco|entregue em|na sede|no almoxarifado)/i.test(t)
  },
  {
    id: 'fiscal',
    titulo: 'Indicação de fiscal / gestor do contrato',
    desc: 'É recomendável indicar o servidor responsável pela fiscalização do contrato.',
    law: 'Art. 117 — Lei 14.133/2021',
    severidade: 'baixa',
    test: (t) => /(fiscal|gestor do contrato|fiscaliza|acompanhamento do contrato)/i.test(t)
  },
  {
    id: 'marca',
    titulo: 'Ausência de indicação de marca sem justificativa',
    desc: 'É vedada a indicação de marca/modelo sem justificativa técnica que demonstre padronização ou exclusividade.',
    law: 'Art. 41, I — Lei 14.133/2021',
    severidade: 'alta',
    test: (t, extra) => {
      if (extra?.eInexigivel) return true;
      const lower = t.toLowerCase();
      const temMarca = KEYWORDS.marca.some(k => lower.includes(k));
      const temJust  = /(padroniza|justificativa técnica|justificativa tecnica|parecer técnico|parecer tecnico|similaridade|compatibilidade|exclusividade|notória especialização|notoria especializacao)/i.test(t);
      return !temMarca || temJust;
    }
  },
  {
    id: 'direcionamento',
    titulo: 'Vedação ao direcionamento de fornecedor',
    desc: 'A indicação direta de empresa específica exige justificativa técnica de exclusividade ou notória especialização, sob pena de violação ao princípio da competitividade.',
    law: 'Art. 41, I e Art. 74, III — Lei 14.133/2021',
    severidade: 'alta',
    test: (t, extra) => {
      if (!extra?.empresaDetectada) return true;
      const lower = t.toLowerCase();
      return KEYWORDS.justificativaExclusividade.some(k => lower.includes(k));
    }
  },
  {
    id: 'competicao',
    titulo: 'Preservação da competitividade',
    desc: 'A descrição não pode direcionar a contratação para fornecedor específico.',
    law: 'Art. 5º e Art. 41 — Lei 14.133/2021',
    severidade: 'alta',
    test: (t, extra) => {
      if (extra?.eInexigivel) return true;
      return !/(direcionad[oa]\s+(?:para|à|a)\s+(?:empresa|fornecedor)|exclusivamente\s+(?:a|para)\s+(?:empresa|fornecedor))/i.test(t);
    }
  }
];

/* -------------------- ESTADO -------------------- */
const state = {
  arquivos: [],
  resultado: null,
  processando: false
};

/* -------------------- DOM HELPERS -------------------- */
const $ = (sel) => document.querySelector(sel);

const els = {
  themeToggle: $('#themeToggle'),
  dropzone:    $('#dropzone'),
  fileInput:   $('#fileInput'),
  fileList:    $('#fileList'),
  texto:       $('#texto'),
  charCount:   $('#charCount'),
  unidade:     $('#unidade'),
  processo:    $('#processo'),
  natureza:    $('#natureza'),
  valor:       $('#valor'),
  orgao:       $('#orgao'),
  responsavel: $('#responsavel'),
  cargo:       $('#cargo'),
  btnAnalisar: $('#btnAnalisar'),
  btnExemplo:  $('#btnExemplo'),
  btnLimpar:   $('#btnLimpar'),
  emptyState:  $('#emptyState'),
  resultado:   $('#resultado'),
  toast:       $('#toast')
};

/* ============================================================
   UTILITÁRIOS GERAIS
   ============================================================ */

let _toastTimer = null;
function showToast(msg, tipo = '') {
  if (!els.toast) return;
  els.toast.textContent = msg;
  els.toast.className = 'toast is-visible' + (tipo ? ` toast--${tipo}` : '');
  els.toast.hidden = false;
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => {
    els.toast.classList.remove('is-visible');
    setTimeout(() => { els.toast.hidden = true; }, 250);
  }, 2800);
}

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(i ? 1 : 0)} ${sizes[i]}`;
}

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/**
 * Converte valores no formato brasileiro para número.
 * Aceita: "1.234,56", "1234.56", "1.234", "R$ 5.000,00"
 * Rejeita negativos, NaN, Infinity e strings vazias.
 */
function parseValorBR(str) {
  if (str === null || str === undefined || str === '') return 0;
  const limpo = String(str)
    .replace(/[^\d,.-]/g, '')
    .replace(/\.(?=\d{3}(\D|$))/g, '')  // remove separador de milhar
    .replace(',', '.');
  const n = Number.parseFloat(limpo);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function formatarValorBR(n) {
  if (!Number.isFinite(n) || n <= 0) return '';
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function truncarNome(nome, ext, max = 34) {
  const base = nome.slice(0, nome.length - ext.length);
  if (base.length <= max) return { base, ext };
  return { base: base.slice(0, max) + '…', ext };
}

function gerarIdArquivo() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `f_${crypto.randomUUID()}`;
  }
  return `f_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/* ============================================================
   LIMPEZA DE METADADOS
   ============================================================ */

function limparMetadados(dados) {
  let unidade = dados.unidadeRequisitante || '';
  let objeto  = dados.objeto             || '';

  unidade = unidade
    .split(/\b(?:De|Para|Ao|À|Assunto|Ref|Refer[êe]ncia|Objeto|Processo|Expediente)\s*:/i)[0]
    .replace(/[—–\-]{1,}|[:#]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (/tecnologia\s+da\s+informa[çc][ãa]o|^\s*ti\s*$|\bti\b/i.test(unidade)) {
    unidade = 'Diretoria de Tecnologia da Informação (TI)';
  } else if (/setor\s+requisitante\s*[\/\-]?\s*ti/i.test(unidade)) {
    unidade = 'Diretoria de Tecnologia da Informação (TI)';
  } else if (/coordena[çc][ãa]o[\-\s]*geral\s+de\s+tecnologia\s+da\s+informa[çc][ãa]o|cgti/i.test(unidade)) {
    unidade = 'Coordenação-Geral de Tecnologia da Informação (CGTI)';
  } else if (!unidade) {
    unidade = 'Diretoria de Tecnologia da Informação (TI)';
  }

  unidade = unidade
    .replace(/\s*(atenciosamente|att\.?|cordiais\s+sauda[çc][õo]es)[\s\S]*$/i, '')
    .replace(/[.,;:]+$/, '')
    .trim();

  objeto = objeto
    .split(/---|—{2,}|\s\d+\.\s|\s#/)[0]
    .replace(/^(?:solicita[çc][ãa]o\s+de|assunto|objeto|ref(?:er[êe]ncia)?)\s*[:\-–—]?\s*/i, '')
    .replace(/[—–]+/g, '-')
    .replace(/^[\s\-–—•*#>|]+/, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!objeto) objeto = 'Consultoria Especializada em Arquitetura de Nuvem';
  if (objeto.length > 160) objeto = objeto.slice(0, 160).trim() + '…';

  return { ...dados, unidadeRequisitante: unidade, objeto };
}

/* ============================================================
   TEMA
   ============================================================ */

function aplicarTema(tema) {
  document.documentElement.setAttribute('data-theme', tema);
  const isDark = tema === 'dark';

  els.themeToggle.setAttribute('aria-pressed', String(isDark));
  els.themeToggle.setAttribute(
    'aria-label',
    isDark ? 'Alternar para o tema claro' : 'Alternar para o tema escuro'
  );
  const iconEl = els.themeToggle.querySelector('.theme-icon');
  const labelEl = els.themeToggle.querySelector('.theme-label');
  if (iconEl)  iconEl.textContent  = isDark ? '☀️' : '🌙';
  if (labelEl) labelEl.textContent = isDark ? 'Modo claro' : 'Modo escuro';

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', isDark ? '#0f172a' : '#f1f5f9');

  try { localStorage.setItem('licitareq-tema', tema); } catch { /* storage bloqueado */ }
}

function initTema() {
  let tema = 'dark';
  try {
    const salvo = localStorage.getItem('licitareq-tema');
    if (salvo === 'light' || salvo === 'dark') tema = salvo;
  } catch { /* storage bloqueado */ }
  aplicarTema(tema);
}

/* ============================================================
   ARIA EXPANDED
   ============================================================ */
function initAccordions() {
  document.querySelectorAll('details.accordion').forEach(det => {
    const summary = det.querySelector('summary');
    if (!summary) return;
    summary.setAttribute('aria-expanded', String(det.open));
    det.addEventListener('toggle', () => {
      summary.setAttribute('aria-expanded', String(det.open));
    });
  });
}

/* ============================================================
   UPLOAD / PARSING
   ============================================================ */

function initDropzone() {
  els.dropzone.addEventListener('click', () => els.fileInput.click());
  els.dropzone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      els.fileInput.click();
    }
  });

  ['dragenter', 'dragover'].forEach(ev =>
    els.dropzone.addEventListener(ev, (e) => {
      e.preventDefault(); e.stopPropagation();
      els.dropzone.classList.add('is-dragover');
    })
  );
  ['dragleave', 'drop'].forEach(ev =>
    els.dropzone.addEventListener(ev, (e) => {
      e.preventDefault(); e.stopPropagation();
      if (ev === 'dragleave' && els.dropzone.contains(e.relatedTarget)) return;
      els.dropzone.classList.remove('is-dragover');
    })
  );
  els.dropzone.addEventListener('drop', (e) => {
    const files = Array.from(e.dataTransfer?.files || []);
    if (files.length) processarArquivos(files);
  });

  els.fileInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length) processarArquivos(files);
    e.target.value = '';
  });

  /* Event delegation — uma única vez, sobrevive aos re-renders */
  els.fileList.addEventListener('click', (e) => {
    const btn = e.target.closest('.fileitem__remove');
    if (!btn) return;
    const id = btn.getAttribute('data-id');
    state.arquivos = state.arquivos.filter(a => a.id !== id);
    renderFileList();
  });
}

async function processarArquivos(files) {
  if (state.processando) {
    showToast('Aguarde o processamento dos arquivos atuais.', 'error');
    return;
  }
  if (state.arquivos.length + files.length > MAX_QUEUE_FILES) {
    showToast(`Limite de ${MAX_QUEUE_FILES} arquivos atingido.`, 'error');
    return;
  }

  state.processando = true;
  try {
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        showToast(`"${file.name}" excede ${MAX_FILE_SIZE_MB} MB.`, 'error');
        continue;
      }
      const item = {
        id: gerarIdArquivo(),
        file,
        name: file.name,
        size: file.size,
        status: 'lendo',
        text: ''
      };
      state.arquivos.push(item);
      renderFileList();

      try {
        item.text = await extrairTexto(file);
        item.status = 'ok';

        if (item.text && item.text.trim().length > 20) {
          const atual = els.texto.value.trim();
          const novo = atual
            ? `${atual}\n\n--- ${file.name} ---\n${item.text}`
            : item.text;

          if (novo.length > MAX_TEXTO_LENGTH) {
            showToast(`Texto excede ${MAX_TEXTO_LENGTH.toLocaleString('pt-BR')} caracteres. Arquivo ignorado.`, 'error');
            item.status = 'erro';
            item.erro = 'Texto excedido';
          } else {
            els.texto.value = novo;
            atualizarContador();
            show