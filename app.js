/* ============================================================
   LicitaReq — app.js
   Motor de triagem baseado na Lei nº 14.133/2021
   ============================================================ */
'use strict';

/* -------------------- LIMITES LEGAIS (valores de referência) -------------------- */
/* Atualize anualmente conforme decretos de atualização monetária.               */
const LIMITE_OBRA_ENG        = 119812.02;   // Art. 75, I  — obras e engenharia
const LIMITE_BENS_SERVICOS   =  59906.02;   // Art. 75, II — bens e serviços comuns
const LIMITE_DISPENSA_EMER   = Infinity;    // Emergência não tem teto legal

/* -------------------- DICIONÁRIOS DE PALAVRAS-CHAVE -------------------- */
const KEYWORDS = {
  obra: [
    'obra', 'obras', 'engenharia', 'reforma', 'construção', 'construcao',
    'edifica', 'pavimenta', 'saneamento', 'drenagem', 'elétrica', 'eletrica',
    'hidráulica', 'hidraulica', 'estrutural', 'alvenaria', 'fundação', 'fundacao',
    'projeto executivo', 'projeto básico', 'memorial descritivo', 'orçamento de obra'
  ],
  tic: [
    'software', 'sistema', 'licença', 'licenca', 'ti ', 'tecnologia da informação',
    'tecnologia da informacao', 'computador', 'notebook', 'servidor', 'cloud',
    'nuvem', 'datacenter', 'firewall', 'switch', 'roteador', 'cabeamento estruturado',
    'suporte técnico de ti', 'desenvolvimento de sistema', 'aplicativo', 'erp'
  ],
  tecnicos: [
    'serviço técnico especializado', 'servico tecnico especializado',
    'consultoria', 'assessoria técnica', 'parecer técnico', 'auditoria',
    'perícia', 'pericia', 'laudo', 'estudo técnico', 'projeto de engenharia',
    'capacitação', 'treinamento especializado', 'arquitetura', 'engenharia consultiva'
  ],
  comuns: [
    'material de escritório', 'material de escritorio', 'papel', 'caneta',
    'toner', 'cartucho', 'limpeza', 'higiene', 'copa', 'cozinha', 'gêneros',
    'generos', 'alimentício', 'alimenticio', 'uniforme', 'vestuário', 'vestuario',
    'mobiliário', 'mobiliario', 'cadeira', 'mesa', 'armário', 'armario',
    'manutenção predial', 'manutencao predial', 'vigilância', 'vigilancia',
    'transporte', 'locação de veículo', 'locacao de veiculo', 'combustível'
  ],
  emergencia: [
    'emergência', 'emergencia', 'calamidade', 'urgência', 'urgencia',
    'risco iminente', 'desabastecimento', 'paralisação', 'paralisacao',
    'socorro', 'desastre', 'defesa civil', 'situação crítica', 'situacao critica'
  ],
  inexigibilidade: [
    'inexigibilidade', 'notória especialização', 'notoria especializacao',
    'fornecedor exclusivo', 'exclusividade', 'inviabilidade de competição',
    'inviabilidade de competicao', 'artista', 'consagrado', 'serviço singular',
    'servico singular', 'representante exclusivo', 'único fornecedor', 'unico fornecedor'
  ],
  marca: [
    'marca ', 'marca:', 'da marca', 'modelo ', 'modelo:', 'fabricante',
    'referência', 'referencia', 'similar', 'ou similar', 'equivalente'
  ],
  urgencia: [
    'urgente', 'prazo curto', 'o quanto antes', 'imediat', 'sem demora'
  ]
};

/* -------------------- REQUISITOS OBRIGATÓRIOS (checklist) -------------------- */
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
    test: (t) => /(\d+\s*(unid|unidade|un|pç|pc|caixa|cx|kg|litro|l|m²|m2|m³|m3|metro|caixa|pacote|resma|frasco))|quantidade\s*:?\s*\d+|\b\d{1,5}\s+(unidades?|itens?)/i.test(t)
  },
  {
    id: 'valor',
    titulo: 'Estimativa preliminar de preço / pesquisa de mercado',
    desc: 'A solicitação deve vir acompanhada de estimativa de valor ou indicação de pesquisa de preços.',
    law: 'Art. 18, §1º, IV e Art. 23 — Lei 14.133/2021',
    severidade: 'media',
    test: (t, extra) => /(R\$\s*[\d.,]+)|(pesquisa de (preço|preco|mercado))|(estimativa de valor)|(valor estimado)/i.test(t) || (extra.valor && extra.valor > 0)
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
    desc: 'É vedada a indicação de marca/modelo sem justificativa técnica que demonstre a padronização ou exclusividade.',
    law: 'Art. 41, I — Lei 14.133/2021',
    severidade: 'alta',
    test: (t) => {
      const temMarca = KEYWORDS.marca.some(k => t.toLowerCase().includes(k));
      const temJust  = /(padroniza|justificativa técnica|justificativa tecnica|parecer técnico|parecer tecnico|similaridade|compatibilidade|exclusividade)/i.test(t);
      return !temMarca || temJust;
    }
  },
  {
    id: 'competicao',
    titulo: 'Preservação da competitividade',
    desc: 'A descrição não pode direcionar a contratação para fornecedor específico.',
    law: 'Art. 5º e Art. 41 — Lei 14.133/2021',
    severidade: 'alta',
    test: (t) => !/(exclusiv|único fornecedor|unico fornecedor|direcionad|exclusivo para)/i.test(t)
  }
];

/* -------------------- ESTADO -------------------- */
const state = {
  arquivos: [],   // { id, file, name, size, status, text }
  resultado: null
};

/* -------------------- REFERÊNCIAS DOM -------------------- */
const $  = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

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
   UTILITÁRIOS
   ============================================================ */

function showToast(msg, tipo = '') {
  els.toast.textContent = msg;
  els.toast.className = 'toast is-visible' + (tipo ? ` toast--${tipo}` : '');
  els.toast.hidden = false;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => {
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

function parseValorBR(str) {
  if (!str) return 0;
  const limpo = String(str).replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3})/g, '').replace(',', '.');
  const n = parseFloat(limpo);
  return isNaN(n) ? 0 : n;
}

function truncarNome(nome, ext, max = 40) {
  const base = nome.slice(0, nome.length - ext.length);
  if (base.length <= max) return { base, ext };
  return { base: base.slice(0, max) + '…', ext };
}

/* ============================================================
   TEMA CLARO / ESCURO
   ============================================================ */

function aplicarTema(tema) {
  document.documentElement.setAttribute('data-theme', tema);
  const isDark = tema === 'dark';
  els.themeToggle.setAttribute('aria-pressed', String(isDark));
  els.themeToggle.querySelector('.theme-icon').textContent = isDark ? '☀️' : '🌙';
  els.themeToggle.querySelector('.theme-label').textContent = isDark ? 'Modo claro' : 'Modo escuro';
  try { localStorage.setItem('licitareq-tema', tema); } catch (e) {}
}

function initTema() {
  let tema = 'light';
  try {
    const salvo = localStorage.getItem('licitareq-tema');
    if (salvo) tema = salvo;
    else if (window.matchMedia('(prefers-color-scheme: dark)').matches) tema = 'dark';
  } catch (e) {}
  aplicarTema(tema);
}

els.themeToggle.addEventListener('click', () => {
  const atual = document.documentElement.getAttribute('data-theme');
  aplicarTema(atual === 'dark' ? 'light' : 'dark');
});

/* ============================================================
   UPLOAD E PARSING DE ARQUIVOS
   ============================================================ */

function initDropzone() {
  els.dropzone.addEventListener('click', () => els.fileInput.click());
  els.dropzone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); els.fileInput.click(); }
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
}

async function processarArquivos(files) {
  for (const file of files) {
    if (file.size > 10 * 1024 * 1024) {
      showToast(`Arquivo "${file.name}" excede 10 MB.`, 'error');
      continue;
    }
    const id = `f_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const item = { id, file, name: file.name, size: file.size, status: 'lendo', text: '' };
    state.arquivos.push(item);
    renderFileList();

    try {
      item.text = await extrairTexto(file);
      item.status = 'ok';
      // Concatena automaticamente no textarea se estiver vazio ou quase
      if (item.text && item.text.trim().length > 20) {
        const atual = els.texto.value.trim();
        els.texto.value = atual ? `${atual}\n\n--- ${file.name} ---\n${item.text}` : item.text;
        atualizarContador();
      }
      showToast(`"${file.name}" processado com sucesso.`, 'success');
    } catch (err) {
      console.error(err);
      item.status = 'erro';
      item.erro = err.message || 'Falha ao ler arquivo';
      showToast(`Falha ao ler "${file.name}".`, 'error');
    }
    renderFileList();
  }
}

async function extrairTexto(file) {
  const nome = file.name.toLowerCase();
  const ext  = nome.includes('.') ? nome.slice(nome.lastIndexOf('.')) : '';

  if (ext === '.txt' || ext === '.md' || file.type === 'text/plain') {
    return await file.text();
  }

  if (ext === '.pdf' || file.type === 'application/pdf') {
    return await extrairPdf(file);
  }

  if (ext === '.docx') {
    return await extrairDocx(file);
  }

  if (ext === '.doc') {
    // DOC legado: navegadores não parseiam nativamente. Avisa o usuário.
    throw new Error('Formato .doc legado não suportado para parsing. Converta para .docx ou .pdf.');
  }

  // Fallback: tenta ler como texto
  try { return await file.text(); } catch (e) { return ''; }
}

async function extrairPdf(file) {
  if (!window.pdfjsLib) throw new Error('Biblioteca PDF.js não carregada.');
  window.pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

  const buffer = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: buffer }).promise;
  let texto = '';
  const maxPag = Math.min(pdf.numPages, 30);
  for (let i = 1; i <= maxPag; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const linha = content.items.map(it => it.str).join(' ');
    texto += linha + '\n';
  }
  return texto.trim();
}

async function extrairDocx(file) {
  if (!window.mammoth) throw new Error('Biblioteca Mammoth.js não carregada.');
  const buffer = await file.arrayBuffer();
  const result = await window.mammoth.extractRawText({ arrayBuffer: buffer });
  return (result.value || '').trim();
}

function renderFileList() {
  els.fileList.innerHTML = '';
  state.arquivos.forEach((item) => {
    const dotIdx = item.name.lastIndexOf('.');
    const ext = dotIdx > -1 ? item.name.slice(dotIdx) : '';
    const { base } = truncarNome(item.name, ext, 34);

    const statusMap = {
      lendo:  { cls: 'fileitem__status--load', label: 'Lendo…' },
      ok:     { cls: 'fileitem__status--ok',   label: 'Pronto' },
      erro:   { cls: 'fileitem__status--err',  label: 'Erro' }
    };
    const st = statusMap[item.status] || statusMap.lendo;

    const li = document.createElement('li');
    li.className = 'fileitem';
    li.innerHTML = `
      <div class="fileitem__icon" aria-hidden="true">${escapeHtml(ext.replace('.', '').toUpperCase() || 'ARQ')}</div>
      <div class="fileitem__meta">
        <span class="fileitem__name" title="${escapeHtml(item.name)}">
          <bdi>${escapeHtml(base)}</bdi><bdi>${escapeHtml(ext)}</bdi>
        </span>
        <span class="fileitem__size">${formatBytes(item.size)}</span>
      </div>
      <span class="fileitem__status ${st.cls}">${st.label}</span>
      <button class="fileitem__remove" type="button" aria-label="Remover ${escapeHtml(item.name)}" data-id="${item.id}">✕</button>
    `;
    els.fileList.appendChild(li);
  });

  els.fileList.querySelectorAll('.fileitem__remove').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      state.arquivos = state.arquivos.filter(a => a.id !== id);
      renderFileList();
    });
  });
}

/* ============================================================
   MOTOR DE TRIAGEM — Lei 14.133/2021
   ============================================================ */

function detectarNatureza(texto, naturezaSelecionada) {
  if (naturezaSelecionada && naturezaSelecionada !== 'auto') return naturezaSelecionada;
  const t = texto.toLowerCase();

  const scores = {
    obra:      contemScore(t, KEYWORDS.obra),
    tic:       contemScore(t, KEYWORDS.tic),
    tecnicos:  contemScore(t, KEYWORDS.tecnicos),
    comuns:    contemScore(t, KEYWORDS.comuns),
    servicos:  contemScore(t, ['serviço', 'servico', 'prestação', 'prestacao'])
  };

  let melhor = 'comuns', max = 0;
  for (const [k, v] of Object.entries(scores)) {
    if (v > max) { max = v; melhor = k; }
  }
  return max === 0 ? 'comuns' : melhor;
}

function contemScore(texto, palavras) {
  let s = 0;
  palavras.forEach(p => { if (texto.includes(p)) s++; });
  return s;
}

function detectarModalidade(texto, natureza, valor, naturezaSelecionada) {
  const t = texto.toLowerCase();

  // 1) Inexigibilidade (Art. 74)
  const scoreInex = contemScore(t, KEYWORDS.inexigibilidade);
  if (scoreInex >= 1 || /notória especialização|notoria especializacao|fornecedor exclusivo|inviabilidade de competição/i.test(t)) {
    return {
      modalidade: 'Inexigibilidade de Licitação',
      baseLegal: 'Art. 74 — Lei 14.133/2021',
      cor: 'danger',
      descricao: 'Contratação direta por inviabilidade de competição (notória especialização, fornecedor exclusivo, artista consagrado etc.).',
      observacao: 'Verifique se há comprovação documental da exclusividade ou notória especialização, com parecer técnico circunstanciado.'
    };
  }

  // 2) Dispensa emergencial (Art. 75, VIII)
  const scoreEmer = contemScore(t, KEYWORDS.emergencia);
  if (scoreEmer >= 1 && /(emergência|emergencia|calamidade|desastre|risco iminente|situação crítica)/i.test(t)) {
    return {
      modalidade: 'Dispensa Emergencial',
      baseLegal: 'Art. 75, VIII — Lei 14.133/2021',
      cor: 'danger',
      descricao: 'Contratação direta em razão de emergência ou calamidade pública, com risco à continuidade do serviço público.',
      observacao: 'A emergência não pode decorrer de falta de planejamento. Prazo máximo de 1 ano, vedada prorrogação.'
    };
  }

  // 3) Dispensa por valor (Art. 75, I e II)
  if (natureza === 'obra' || natureza === 'engenharia') {
    if (valor > 0 && valor <= LIMITE_OBRA_ENG) {
      return {
        modalidade: 'Dispensa de Licitação por Valor',
        baseLegal: 'Art. 75, I — Lei 14.133/2021',
        cor: 'success',
        descricao: `Obras e serviços de engenharia com valor estimado de até R$ ${LIMITE_OBRA_ENG.toLocaleString('pt-BR')}.`,
        observacao: 'Exige orçamento detalhado, pesquisa de preços e razão de escolha do fornecedor.'
      };
    }
  } else {
    if (valor > 0 && valor <= LIMITE_BENS_SERVICOS) {
      return {
        modalidade: 'Dispensa de Licitação por Valor',
        baseLegal: 'Art. 75, II — Lei 14.133/2021',
        cor: 'success',
        descricao: `Bens e serviços comuns com valor estimado de até R$ ${LIMITE_BENS_SERVICOS.toLocaleString('pt-BR')}.`,
        observacao: 'Aplicável a objetos comuns. Exige pesquisa de preços e justificativa de escolha do fornecedor.'
      };
    }
  }

  // 4) Concorrência (Art. 6º, XXXVIII) — obras, engenharia e serviços técnicos especializados
  const scoreObra = contemScore(t, KEYWORDS.obra);
  const scoreTec  = contemScore(t, KEYWORDS.tecnicos);
  if (natureza === 'obra' || scoreObra >= 2) {
    return {
      modalidade: 'Concorrência',
      baseLegal: 'Art. 6º, XXXVIII e Art. 29 — Lei 14.133/2021',
      cor: 'info',
      descricao: 'Modalidade obrigatória para obras e serviços de engenharia de valor superior ao limite da dispensa.',
      observacao: 'Admite os tipos de licitação: menor preço, melhor técnica ou técnica e preço.'
    };
  }
  if (natureza === 'tecnicos' || scoreTec >= 2) {
    return {
      modalidade: 'Concorrência (serviços técnicos especializados)',
      baseLegal: 'Art. 6º, XXXVIII e Art. 36, §1º — Lei 14.133/2021',
      cor: 'info',
      descricao: 'Serviços técnicos especializados de natureza predominantemente intelectual, quando a competição for restrita.',
      observacao: 'Pode ser adotado o tipo "melhor técnica" ou "técnica e preço".'
    };
  }

  // 5) Pregão (Art. 6º, XLI) — bens e serviços comuns
  return {
    modalidade: 'Pregão Eletrônico',
    baseLegal: 'Art. 6º, XLI e Art. 29 — Lei 14.133/2021',
    cor: 'brand',
    descricao: 'Modalidade obrigatória para aquisição de bens e contratação de serviços comuns.',
    observacao: 'A modalidade é obrigatória para objetos comuns, cujos padrões de desempenho possam ser objetivamente definidos pelo edital.'
  };
}

function analisarRequisitos(texto, extra) {
  const resultados = [];
  const t = texto || '';

  REQUISITOS.forEach(req => {
    let ok = false;
    try { ok = !!req.test(t, extra); } catch (e) { ok = false; }
    resultados.push({
      id: req.id,
      titulo: req.titulo,
      desc: req.desc,
      law: req.law,
      severidade: req.severidade,
      conforme: ok
    });
  });

  return resultados;
}

function calcularScore(requisitos) {
  if (!requisitos.length) return 0;
  const pesos = { alta: 3, media: 2, baixa: 1 };
  let total = 0, obtido = 0;
  requisitos.forEach(r => {
    const p = pesos[r.severidade] || 1;
    total += p;
    if (r.conforme) obtido += p;
  });
  return Math.round((obtido / total) * 100);
}

function gerarParecer(requisitos, modalidade) {
  const criticos = requisitos.filter(r => !r.conforme && r.severidade === 'alta');
  const medios   = requisitos.filter(r => !r.conforme && r.severidade === 'media');
  const todos    = requisitos.filter(r => !r.conforme);

  if (criticos.length > 0) {
    return {
      status: 'Devolvido para Adequação',
      classe: 'devolvido',
      badge: 'warning',
      justificativa: `Existem ${criticos.length} inconformidade(s) de severidade ALTA que impedem o prosseguimento da instrução processual.`
    };
  }
  if (medios.length > 0) {
    return {
      status: 'Devolvido para Adequação',
      classe: 'devolvido',
      badge: 'warning',
      justificativa: `Foram identificadas ${medios.length} pendência(s) de severidade MÉDIA. Recomenda-se a complementação antes do prosseguimento.`
    };
  }
  if (todos.length > 0) {
    return {
      status: 'Deferido com Recomendações',
      classe: 'deferido',
      badge: 'info',
      justificativa: `A solicitação atende aos requisitos essenciais, restando ${todos.length} recomendação(ões) de baixa severidade.`
    };
  }
  return {
    status: 'Deferido',
    classe: 'deferido',
    badge: 'success',
    justificativa: 'A solicitação atende integralmente aos requisitos formais de instrução processual.'
  };
}

function analisar() {
  const textoArquivos = state.arquivos.map(a => a.text).filter(Boolean).join('\n\n');
  const textoManual   = els.texto.value || '';
  const textoCompleto = [textoManual, textoArquivos].filter(Boolean).join('\n\n').trim();

  if (!textoCompleto || textoCompleto.length < 30) {
    showToast('Insira o texto da solicitação ou anexe um arquivo.', 'error');
    return;
  }

  const extra = {
    unidade:    els.unidade.value.trim(),
    processo:   els.processo.value.trim(),
    natureza:   els.natureza.value,
    valor:      parseValorBR(els.valor.value),
    orgao:      els.orgao.value.trim(),
    responsavel: els.responsavel.value.trim(),
    cargo:      els.cargo.value.trim()
  };

  const natureza = detectarNatureza(textoCompleto, extra.natureza);
  const modalidade = detectarModalidade(textoCompleto, natureza, extra.valor, extra.natureza);
  const requisitos = analisarRequisitos(textoCompleto, extra);
  const score = calcularScore(requisitos);
  const parecer = gerarParecer(requisitos, modalidade);

  state.resultado = {
    texto: textoCompleto,
    extra,
    natureza,
    modalidade,
    requisitos,
    score,
    parecer,
    dataAnalise: new Date()
  };

  renderResultado();
  els.emptyState.hidden = true;
  els.resultado.hidden = false;
  showToast('Análise concluída.', 'success');
}

/* ============================================================
   RENDERIZAÇÃO DO RESULTADO
   ============================================================ */

const LABELS_NATUREZA = {
  bens: 'Aquisição de bens',
  servicos: 'Serviços comuns',
  obra: 'Obras e serviços de engenharia',
  tecnicos: 'Serviços técnicos especializados',
  tic: 'Tecnologia da Informação e Comunicação (TIC)',
  comuns: 'Bens e serviços comuns'
};

function renderResultado() {
  const r = state.resultado;
  if (!r) return;

  const valorFmt = r.extra.valor > 0
    ? r.extra.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : 'Não informado';

  const naturezaLabel = LABELS_NATUREZA[r.natureza] || r.natureza;

  // A) Veredicto
  const veredictoHtml = `
    <div class="verdict verdict--${r.parecer.classe}">
      <div class="verdict__head">
        <div>
          <div class="verdict__title">${escapeHtml(r.parecer.status)}</div>
          <div class="verdict__sub">${escapeHtml(r.parecer.justificativa)}</div>
        </div>
        <span class="badge badge--${r.parecer.badge}">${escapeHtml(r.parecer.status)}</span>
      </div>

      <div class="verdict__grid">
        <div class="verdict__cell">
          <dt>Modalidade sugerida</dt>
          <dd><span class="badge badge--${r.modalidade.cor}">${escapeHtml(r.modalidade.modalidade)}</span></dd>
        </div>
        <div class="verdict__cell">
          <dt>Base legal</dt>
          <dd>${escapeHtml(r.modalidade.baseLegal)}</dd>
        </div>
        <div class="verdict__cell">
          <dt>Natureza do objeto</dt>
          <dd>${escapeHtml(naturezaLabel)}</dd>
        </div>
        <div class="verdict__cell">
          <dt>Valor estimado</dt>
          <dd>${escapeHtml(valorFmt)}</dd>
        </div>
        <div class="verdict__cell">
          <dt>Unidade requisitante</dt>
          <dd>${escapeHtml(r.extra.unidade || 'Não informada')}</dd>
        </div>
        <div class="verdict__cell">
          <dt>Nº do processo</dt>
          <dd>${escapeHtml(r.extra.processo || 'Não informado')}</dd>
        </div>
      </div>

      <div class="score">
        <span style="font-size:.8rem;color:var(--text-soft);font-weight:600;">Conformidade</span>
        <div class="score__bar"><div class="score__fill" style="width:${r.score}%"></div></div>
        <span class="score__value">${r.score}%</span>
      </div>
    </div>
  `;

  // B) Tabela de requisitos
  const requisitosHtml = r.requisitos.map(req => {
    let cls = 'req-row--ok', icone = '✓', sevCls = 'sev--ok', sevLabel = 'Conforme';
    if (!req.conforme) {
      icone = '!';
      if (req.severidade === 'alta')       { cls = 'req-row--fail'; sevCls = 'sev--alta';  sevLabel = 'Alta'; }
      else if (req.severidade === 'media') { cls = 'req-row--warn'; sevCls = 'sev--media'; sevLabel = 'Média'; }
      else                                 { cls = 'req-row--warn'; sevCls = 'sev--baixa'; sevLabel = 'Baixa'; }
    }
    return `
      <div class="req-row ${cls}">
        <div class="req-row__icon" aria-hidden="true">${icone}</div>
        <div class="req-row__body">
          <div class="req-row__title">${escapeHtml(req.titulo)}</div>
          <div class="req-row__desc">${escapeHtml(req.desc)}</div>
          <div class="req-row__law">${escapeHtml(req.law)}</div>
        </div>
        <span class="req-row__sev ${sevCls}">${sevLabel}</span>
      </div>
    `;
  }).join('');

  // C) Alertas e recomendações
  const naoConformes = r.requisitos.filter(x => !x.conforme);
  const alertasHtml = naoConformes.length === 0
    ? `<div class="alert alert--success">
         <div>
           <div class="alert__title">✓ Nenhuma inconformidade identificada</div>
           <div class="alert__text">A solicitação atende a todos os requisitos formais analisados. Prossiga com a instrução processual.</div>
         </div>
       </div>`
    : naoConformes.map(item => {
        const tipo = item.severidade === 'alta' ? 'danger' : item.severidade === 'media' ? 'warning' : '';
        const titulo = item.severidade === 'alta' ? 'Inconformidade crítica'
                     : item.severidade === 'media' ? 'Pendência relevante'
                     : 'Recomendação';
        return `
          <div class="alert ${tipo ? 'alert--' + tipo : ''}">
            <div>
              <div class="alert__title">${titulo}: ${escapeHtml(item.titulo)}</div>
              <div class="alert__text">
                ${escapeHtml(item.desc)}<br>
                <strong>Fundamento:</strong> ${escapeHtml(item.law)}.
              </div>
            </div>
          </div>
        `;
      }).join('');

  // D) Minuta de resposta oficial
  const minuta = gerarMinuta(r);

  els.resultado.innerHTML = `
    ${veredictoHtml}

    <div class="section">
      <h3 class="section__title">Enquadramento legal e observações</h3>
      <p style="font-size:.86rem;color:var(--text-muted);margin-bottom:10px;">
        ${escapeHtml(r.modalidade.descricao)}
      </p>
      <div class="alert">
        <div>
          <div class="alert__title">Orientação técnica</div>
          <div class="alert__text">${escapeHtml(r.modalidade.observacao)}</div>
        </div>
      </div>
    </div>

    <div class="section">
      <h3 class="section__title">Checklist de requisitos da instrução</h3>
      <div class="req-table">${requisitosHtml}</div>
    </div>

    <div class="section">
      <h3 class="section__title">Inconformidades e recomendações</h3>
      <div class="alerts">${alertasHtml}</div>
    </div>

    <div class="section">
      <h3 class="section__title">Minuta de resposta oficial (devolutiva)</h3>
      <pre id="minutaTexto" class="minuta">${escapeHtml(minuta)}</pre>
      <div class="minuta__actions">
        <button id="btnCopiar" class="btn btn--primary btn--sm" type="button">📋 Copiar despacho</button>
        <button id="btnBaixar" class="btn btn--ghost btn--sm" type="button">⬇ Baixar .txt</button>
        <button id="btnImprimir" class="btn btn--ghost btn--sm" type="button">🖨 Imprimir</button>
      </div>
    </div>
  `;

  // Handlers dos botões da minuta
  $('#btnCopiar')?.addEventListener('click', () => copiarTexto(minuta));
  $('#btnBaixar')?.addEventListener('click', () => baixarTxt(minuta));
  $('#btnImprimir')?.addEventListener('click', () => imprimirMinuta(minuta));
}

/* ============================================================
   GERADOR DA MINUTA OFICIAL
   ============================================================ */

function gerarMinuta(r) {
  const d = r.dataAnalise;
  const dataFmt = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  const valorFmt = r.extra.valor > 0
    ? r.extra.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : 'a ser indicado pelo requisitante';

  const unidade = r.extra.unidade || 'Unidade Requisitante';
  const orgao   = r.extra.orgao || 'Órgão/Entidade';
  const processo = r.extra.processo || '_______________';
  const responsavel = r.extra.responsavel || '____________________';
  const cargo = r.extra.cargo || 'Autoridade Competente';

  const pend = r.requisitos.filter(x => !x.conforme);
  const pendenciasTxt = pend.length === 0
    ? '  (Não foram identificadas pendências formais.)'
    : pend.map((p, i) => {
        const sev = p.severidade === 'alta' ? 'ALTA' : p.severidade === 'media' ? 'MÉDIA' : 'BAIXA';
        return `  ${i + 1}. [Severidade ${sev}] ${p.titulo}\n     Fundamentação: ${p.law}\n     Providência: ${p.desc}`;
      }).join('\n\n');

  const cabecalho = `
${orgao.toUpperCase()}
${unidade.toUpperCase()}

Processo nº: ${processo}
Assunto: Triagem de solicitação de contratação pública — Devolutiva ao setor requisitante
Data: ${dataFmt}
    `.trim();

  const corpo = `
DESPACHO DE TRIAGEM E ENQUADRAMENTO LEGAL

1. RESUMO EXECUTIVO DA SOLICITAÇÃO

Trata-se de solicitação encaminhada pela unidade requisitante acima identificada,
tendo por objeto demanda de contratação pública cuja natureza foi classificada
como: ${LABELS_NATUREZA[r.natureza] || r.natureza}.
Valor estimado informado: ${valorFmt}.
Após análise preliminar desta unidade de planejamento, foi realizada triagem
técnica e jurídica com base na Lei nº 14.133, de 1º de abril de 2021, e demais
normas aplicáveis.

2. ENQUADRAMENTO LEGAL PRELIMINAR

Modalidade sugerida: ${r.modalidade.modalidade}
Base legal: ${r.modalidade.baseLegal}
Fundamento: ${r.modalidade.descricao}

Orientação complementar: ${r.modalidade.observacao}

Índice de conformidade formal apurado: ${r.score}%.

3. PARECER DA TRIAGEM

Situação: ${r.parecer.status.toUpperCase()}
${r.parecer.justificativa}

4. RELAÇÃO DE PENDÊNCIAS A SANAR

${pendenciasTxt}

5. ORIENTAÇÕES AO REQUISITANTE

Solicita-se que a unidade requisitante, no prazo de 5 (cinco) dias úteis, adote
as providências necessárias à regularização das pendências acima relacionadas,
encaminhando a este setor o expediente complementado com a documentação
comprobatória correspondente.

Permanece à disposição para os esclarecimentos que se fizerem necessários.


Atenciosamente,

_______________________________________________
${responsavel}
${cargo}
${orgao}
    `.trim();

  return `${cabecalho}\n\n${corpo}`;
}

/* ============================================================
   AÇÕES DA MINUTA
   ============================================================ */

async function copiarTexto(texto) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(texto);
    } else {
      const ta = document.createElement('textarea');
      ta.value = texto;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    showToast('Despacho copiado para a área de transferência.', 'success');
  } catch (e) {
    showToast('Não foi possível copiar automaticamente.', 'error');
  }
}

function baixarTxt(texto) {
  const blob = new Blob([texto], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const proc = (state.resultado?.extra.processo || 'sem-processo').replace(/[^\w.-]/g, '_');
  a.download = `Despacho_Triagem_${proc}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Arquivo baixado.', 'success');
}

function imprimirMinuta(texto) {
  const win = window.open('', '_blank', 'width=800,height=900');
  if (!win) { showToast('Bloqueio de pop-up detectado.', 'error'); return; }
  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR"><head><meta charset="UTF-8" />
    <title>Despacho de Triagem</title>
    <style>
      body { font-family: 'Times New Roman', Georgia, serif; font-size: 12pt;
             line-height: 1.6; padding: 40px; color: #000; max-width: 800px; margin: 0 auto; }
      pre { white-space: pre-wrap; font-family: inherit; font-size: 12pt; }
      @media print { body { padding: 20mm; } }
    </style></head>
    <body><pre>${escapeHtml(texto)}</pre>
    <script>window.onload=()=>setTimeout(()=>window.print(),300);<\/script>
    </body></html>
  `;
  win.document.write(html);
  win.document.close();
}

/* ============================================================
   EXEMPLO E LIMPEZA
   ============================================================ */

function carregarExemplo() {
  els.unidade.value = 'Coordenação-Geral de Tecnologia da Informação';
  els.processo.value = '00000.000123/2025-10';
  els.orgao.value = 'Ministério Público do Estado';
  els.responsavel.value = 'João Pereira da Silva';
  els.cargo.value = 'Chefe da Divisão de Licitações';
  els.natureza.value = 'tic';
  els.valor.value = '185.400,00';

  els.texto.value =
`Assunto: Solicitação de contratação — Renovação de licenças de software de segurança.

Senhor Chefe da Divisão de Licitações,

1. A Coordenação-Geral de Tecnologia da Informação (CGTI) solicita a contratação de renovação de licenças do software de segurança "SecureX Enterprise", da marca SecureX Inc., na quantidade de 250 (duzentas e cinquenta) licenças anuais, pelo prazo de 12 (doze) meses, para atendimento das necessidades de proteção do ambiente computacional desta instituição.

2. Justifica-se a presente contratação em razão da necessidade de manutenção da continuidade dos serviços de segurança da informação, tendo em vista a proximidade do vencimento das licenças atualmente em uso, previsto para o dia 30 de dezembro de 2025.

3. O valor estimado da contratação é de R$ 185.400,00 (cento e oitenta e cinco mil e quatrocentos reais), conforme pesquisa de preços realizada junto a fornecedores do ramo.

4. Informamos que há dotação orçamentária específica prevista na Lei Orçamentária Anual para o exercício corrente, na natureza de despesa 33.90.40 — Serviços de Tecnologia da Informação.

5. O prazo de entrega das licenças é de 10 (dez) dias corridos contados do recebimento da nota de empenho, com ativação remota.

6. O fiscal do contrato será o servidor designado pela Portaria nº 145/2025.

7. Diante do exposto, solicitamos o prosseguimento da instrução processual para a devida contratação.

Atenciosamente,
Coordenação-Geral de Tecnologia da Informação`;

  atualizarContador();
  showToast('Exemplo carregado.', 'success');
}

function limparTudo() {
  els.texto.value = '';
  els.unidade.value = '';
  els.processo.value = '';
  els.natureza.value = 'auto';
  els.valor.value = '';
  els.orgao.value = '';
  els.responsavel.value = '';
  els.cargo.value = '';
  state.arquivos = [];
  state.resultado = null;
  renderFileList();
  atualizarContador();
  els.emptyState.hidden = false;
  els.resultado.hidden = true;
  els.resultado.innerHTML = '';
  showToast('Formulário limpo.', 'success');
}

function atualizarContador() {
  els.charCount.textContent = els.texto.value.length;
}

/* ============================================================
   INICIALIZAÇÃO
   ============================================================ */

function init() {
  initTema();
  initDropzone();
  renderFileList();

  els.texto.addEventListener('input', atualizarContador);
  els.btnAnalisar.addEventListener('click', analisar);
  els.btnExemplo.addEventListener('click', carregarExemplo);
  els.btnLimpar.addEventListener('click', limparTudo);

  // Atalho: Ctrl/Cmd + Enter para analisar
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      analisar();
    }
  });

  atualizarContador();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
