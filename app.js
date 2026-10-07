/* ============================================================
   LicitaReq — app.js
   Motor de triagem baseado na Lei nº 14.133/2021
   Correções: limpeza de metadados (De:/Para:/---/numeração),
   normalização de unidade requisitante e objeto.
   ============================================================ */
'use strict';

/* -------------------- LIMITES LEGAIS -------------------- */
const LIMITE_OBRA_ENG      = 119812.02;   // Art. 75, I
const LIMITE_BENS_SERVICOS =  59906.02;   // Art. 75, II

/* -------------------- PALAVRAS-CHAVE -------------------- */
const KEYWORDS = {
  obra: [
    'obra', 'obras', 'engenharia', 'reforma', 'construção', 'construcao',
    'edifica', 'pavimenta', 'saneamento', 'drenagem', 'elétrica', 'eletrica',
    'hidráulica', 'hidraulica', 'estrutural', 'alvenaria', 'fundação', 'fundacao',
    'projeto executivo', 'projeto básico', 'memorial descritivo', 'orçamento de obra'
  ],
  tic: [
    'software', 'sistema', 'licença', 'licenca', 'tecnologia da informação',
    'tecnologia da informacao', 'computador', 'notebook', 'servidor', 'cloud',
    'nuvem', 'datacenter', 'firewall', 'switch', 'roteador', 'cabeamento estruturado',
    'suporte técnico de ti', 'desenvolvimento de sistema', 'aplicativo', 'erp',
    'arquitetura de nuvem', 'consultoria em ti'
  ],
  tecnicos: [
    'serviço técnico especializado', 'servico tecnico especializado',
    'consultoria', 'consultoria especializada', 'assessoria técnica',
    'parecer técnico', 'auditoria', 'perícia', 'pericia', 'laudo',
    'estudo técnico', 'projeto de engenharia', 'capacitação',
    'treinamento especializado', 'arquitetura', 'engenharia consultiva'
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
  justificativaExclusividade: [
    'notória especialização', 'notoria especializacao', 'exclusividade',
    'fornecedor exclusivo', 'inviabilidade de competição', 'inviabilidade de competicao',
    'representante exclusivo', 'único fornecedor', 'unico fornecedor',
    'art. 74', 'artigo 74', 'inciso iii'
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
    desc: 'É vedada a indicação de marca/modelo sem justificativa técnica que demonstre padronização ou exclusividade.',
    law: 'Art. 41, I — Lei 14.133/2021',
    severidade: 'alta',
    test: (t) => {
      const temMarca = KEYWORDS.marca.some(k => t.toLowerCase().includes(k));
      const temJust  = /(padroniza|justificativa técnica|justificativa tecnica|parecer técnico|parecer tecnico|similaridade|compatibilidade|exclusividade)/i.test(t);
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
      if (!extra || !extra.empresaDetectada) return true;
      const temJustificativa = KEYWORDS.justificativaExclusividade
        .some(k => t.toLowerCase().includes(k));
      return temJustificativa;
    }
  },
  {
    id: 'competicao',
    titulo: 'Preservação da competitividade',
    desc: 'A descrição não pode direcionar a contratação para fornecedor específico.',
    law: 'Art. 5º e Art. 41 — Lei 14.133/2021',
    severidade: 'alta',
    test: (t) => !/(direcionad[oa]\s+(?:para|à|a)\s+(?:empresa|fornecedor)|exclusivamente\s+(?:a|para)\s+(?:empresa|fornecedor))/i.test(t)
  }
];

/* -------------------- ESTADO -------------------- */
const state = {
  arquivos: [],
  resultado: null
};

/* -------------------- DOM HELPERS -------------------- */
const $  = (sel) => document.querySelector(sel);

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
  const limpo = String(str)
    .replace(/[^\d,.-]/g, '')
    .replace(/\.(?=\d{3})/g, '')
    .replace(',', '.');
  const n = parseFloat(limpo);
  return isNaN(n) ? 0 : n;
}

function formatarValorBR(n) {
  if (!n || n <= 0) return '';
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function truncarNome(nome, ext, max = 34) {
  const base = nome.slice(0, nome.length - ext.length);
  if (base.length <= max) return { base, ext };
  return { base: base.slice(0, max) + '…', ext };
}

/* ============================================================
   ✨ FUNÇÕES DE LIMPEZA DE METADADOS  (NOVAS)
   ============================================================ */

/**
 * Remove prefixos típicos de cabeçalho/rodapé de e-mail ou ofício:
 *   "De:", "Para:", "Ao:", "À:", "Assunto:", "Ref:", "Referência:",
 *   "Unidade Requisitante:", "Setor Requisitante:", além de bullets
 *   e marcadores (-, –, —, •, *, #, >) no início da string.
 */
function limparPrefixoCabecalho(str) {
  if (!str) return '';
  return String(str)
    // bullets/traços/cerquilhas no início
    .replace(/^[\s\-–—•*#>|]+/, '')
    // prefixos de cabeçalho conhecidos
    .replace(
      /^(?:de|para|ao|à|aos|às|assunto|ref|referência|referencia|unidade\s+requisitante|setor\s+requisitante|requisitante|destinat[áa]rio|remetente|origem|objeto|processo|expediente)\s*[:\-–—]\s*/i,
      ''
    )
    // normaliza espaços
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Remove marcadores estruturais, numeração e artefatos de seção:
 *   "---", "###", "1.", "1. ", "**", "__", numeração romana, etc.
 * Aplica também o `.split('---')[0]` solicitado.
 */
function limparMarcadores(str) {
  if (!str) return '';
  return String(str)
    .split('---')[0]                                    // corta a partir do primeiro "---"
    .replace(/(---|#{1,6}|\*\*|__)/g, '')               // remove marcadores Markdown
    .replace(/\b\d{1,3}\.\s+/g, '')                     // remove numeração "1. ", "12. "
    .replace(/^[\s\-–—•*#>|]+/, '')                     // remove bullets iniciais
    .replace(/\s+/g, ' ')                               // normaliza espaços
    .trim();
}

/* Dicionário de normalização de unidades conhecidas */
const UNIDADES_CONHECIDAS = [
  {
    // "Setor Requisitante / TI", "Setor Requisitante - TI",
    // "Diretoria de TI", "Diretoria de Tecnologia da Informação"
    match: /(setor\s+requisitante\s*[\/\-]\s*ti|diretoria\s+de\s+(?:tecnologia\s+da\s+informa[çc][ãa]o|ti))/i,
    canonico: 'Diretoria de Tecnologia da Informação (TI)'
  },
  {
    match: /(coordena[çc][ãa]o[\-\s]*geral\s+de\s+tecnologia\s+da\s+informa[çc][ãa]o|cgti)/i,
    canonico: 'Coordenação-Geral de Tecnologia da Informação (CGTI)'
  },
  {
    match: /(setor\s+de\s+compras|divis[ãa]o\s+de\s+compras|coordena[çc][ãa]o\s+de\s+compras)/i,
    canonico: 'Divisão de Compras'
  }
];

/**
 * Aplica limpeza de prefixo + normalização de nome canônico.
 */
function normalizarUnidade(str) {
  if (!str) return '';
  const limpa = limparPrefixoCabecalho(str);
  for (const u of UNIDADES_CONHECIDAS) {
    if (u.match.test(limpa)) return u.canonico;
  }
  // Remove rodapés comuns que possam ter vazado (ex.: "atenciosamente, fulano")
  return limpa
    .replace(/\s*(atenciosamente|att\.?|cordiais\s+sauda[çc][õo]es)[\s\S]*$/i, '')
    .replace(/[.,;:]+$/, '')
    .trim();
}

/* ============================================================
   TEMA — DARK COMO PADRÃO
   ============================================================ */

function aplicarTema(tema) {
  document.documentElement.setAttribute('data-theme', tema);
  const isDark = tema === 'dark';

  els.themeToggle.setAttribute('aria-pressed', String(isDark));
  els.themeToggle.setAttribute(
    'aria-label',
    isDark ? 'Alternar para o tema claro' : 'Alternar para o tema escuro'
  );
  els.themeToggle.querySelector('.theme-icon').textContent = isDark ? '☀️' : '🌙';
  els.themeToggle.querySelector('.theme-label').textContent = isDark ? 'Modo claro' : 'Modo escuro';

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', isDark ? '#0a0f1a' : '#f1f5f9');

  try { localStorage.setItem('licitareq-tema', tema); } catch (e) {}
}

function initTema() {
  let tema = 'dark';
  try {
    const salvo = localStorage.getItem('licitareq-tema');
    if (salvo === 'light' || salvo === 'dark') tema = salvo;
  } catch (e) {}
  aplicarTema(tema);
}

els.themeToggle.addEventListener('click', () => {
  const atual = document.documentElement.getAttribute('data-theme');
  aplicarTema(atual === 'dark' ? 'light' : 'dark');
});

/* ============================================================
   ARIA EXPANDED em <details>
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

      if (item.text && item.text.trim().length > 20) {
        const atual = els.texto.value.trim();
        els.texto.value = atual
          ? `${atual}\n\n--- ${file.name} ---\n${item.text}`
          : item.text;
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
    throw new Error('Formato .doc legado não suportado. Converta para .docx ou .pdf.');
  }
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
      erro:   { cls: 'fileitem__status--erro', label: 'Erro' }
    };
    const st = statusMap[item.status] || statusMap.lendo;

    const li = document.createElement('li');
    li.className = 'fileitem';
    li.innerHTML = `
      <div class="fileitem__icon" aria-hidden="true">${escapeHtml(ext.replace('.', '').toUpperCase() || 'ARQ')}</div>
      <div class="fileitem__meta">
        <span class="fileitem__title" title="${escapeHtml(item.name)}">
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
   DETECÇÃO DE EMPRESA DIRECIONADA
   ============================================================ */

function detectarEmpresaDirecionada(texto) {
  if (!texto) return null;

  // Padrão 1 — Razão social com sufixo societário
  const padraoRazaoSocial =
    /\b([A-ZÀ-Ú][\wÀ-ú&.'-]*(?:\s+(?:[A-ZÀ-Ú][\wÀ-ú&.'-]*|de|da|do|das|dos|e)){0,7}\s+(?:Ltda\.?|LTDA\.?|S\.A\.?|S\/A|S\.A|ME|EIRELI|EPP))\b/g;

  const encontradas = [];
  let m;
  while ((m = padraoRazaoSocial.exec(texto)) !== null) {
    const nome = m[1].replace(/\s+/g, ' ').trim();
    if (nome.length > 4 && !encontradas.includes(nome)) encontradas.push(nome);
  }

  // Padrão 2 — "empresa X", "fornecedor X", "contratação da X"
  if (encontradas.length === 0) {
    const padraoContexto =
      /(?:empresa|fornecedor|contrata[çc][aã]o\s+d[aeo]|aquisi[çc][aã]o\s+d[aeo]|junto\s+[àa])\s+([A-ZÀ-Ú][\wÀ-ú&.'-]*(?:\s+(?:[A-ZÀ-Ú][\wÀ-ú&.'-]*|de|da|do|e)){0,6})/g;
    while ((m = padraoContexto.exec(texto)) !== null) {
      const nome = m[1].replace(/\s+/g, ' ').trim();
      if (nome.length > 4 && !encontradas.includes(nome)) encontradas.push(nome);
    }
  }

  return encontradas.length ? encontradas[0] : null;
}

/* ============================================================
   ✨ EXTRAÇÃO DE METADADOS — COM LIMPEZA APLICADA
   ============================================================ */
function extrairMetadados(texto) {
  const t = texto || '';
  const out = {
    valor: 0,
    valorTexto: '',
    processo: '',
    unidade: '',
    orgao: '',
    empresa: '',
    objeto: ''
  };

  /* --- Valor: R$ 85.000,00 --- */
  const mValor = t.match(/R\$\s*([\d]{1,3}(?:\.\d{3})*(?:,\d{1,2})?)/i);
  if (mValor) {
    out.valorTexto = `R$ ${mValor[1]}`;
    out.valor = parseValorBR(mValor[1]);
  }

  /* --- Processo / Expediente --- */
  const mProc = t.match(
    /\b(memorando|of[íi]cio|processo|requerimento|expediente|dfd|documento\s+de\s+formaliza[çc][ãa]o)\s*(?:n[º°.]?|n[úu]mero)?\s*([\d][\d.\/\-\w]*)/i
  );
  if (mProc) {
    const rotuloBase = mProc[1]
      .replace(/^dfd$/i, 'DFD')
      .replace(/^documento de formaliza[çc][ãa]o$/i, 'Documento de Formalização');
    const rotulo = rotuloBase.charAt(0).toUpperCase() + rotuloBase.slice(1).toLowerCase();
    out.processo = `${rotulo} nº ${mProc[2]}`;
  } else {
    const mProc2 = t.match(/\bn[º°.]?\s*(\d{1,6}[\/\-]\d{2,4})/i);
    if (mProc2) out.processo = `Expediente nº ${mProc2[1]}`;
  }

  /* ============================================================
     UNIDADE REQUISITANTE — extração em cascata + normalização
     ============================================================ */

  // Tenta 1: rótulo explícito "À Unidade Requisitante:", "Setor Requisitante:", "De:"
  const mUnidadeRotulo = t.match(
    /(?:[àa]\s+unidade\s+requisitante|unidade\s+requisitante|setor\s+requisitante|remetente|origem|de)\s*[:\-–—]\s*([^\n]{3,90})/i
  );
  if (mUnidadeRotulo) {
    out.unidade = normalizarUnidade(mUnidadeRotulo[1]);
  }

  // Tenta 2: nomes compostos conhecidos diretamente no corpo do texto
  if (!out.unidade) {
    const mUnidadeNomes = t.match(
      /\b(Diretoria\s+de\s+Tecnologia\s+da\s+Informa[çc][ãa]o|Coordena[çc][ãa]o[\-\s]*Geral\s+de\s+Tecnologia\s+da\s+Informa[çc][ãa]o|Setor\s+Requisitante\s*[\/\-]\s*TI|Departamento\s+de\s+[A-ZÀ-Ú][\wÀ-ú\s]{2,50}|Secretaria\s+de\s+[A-ZÀ-Ú][\wÀ-ú\s]{2,50}|Ger[êe]ncia\s+de\s+[A-ZÀ-Ú][\wÀ-ú\s]{2,50})\b/i
    );
    if (mUnidadeNomes) out.unidade = normalizarUnidade(mUnidadeNomes[1]);
  }

  // Tenta 3: linha "Setor Requisitante / TI" isolada
  if (!out.unidade) {
    const mLinhaSetor = t.match(/^\s*(Setor\s+Requisitante\s*[\/\-]\s*TI)\s*$/im);
    if (mLinhaSetor) out.unidade = normalizarUnidade(mLinhaSetor[1]);
  }

  /* ============================================================
     ÓRGÃO / ENTIDADE — com limpeza
     ============================================================ */
  const mOrgao = t.match(
    /\b(Minist[ée]rio[^\n,.;]{0,60}|Prefeitura[^\n,.;]{0,60}|Tribunal[^\n,.;]{0,60}|Universidade[^\n,.;]{0,60}|Instituto[^\n,.;]{0,60}|C[âa]mara\s+Municipal[^\n,.;]{0,60}|Assembleia[^\n,.;]{0,60})/i
  );
  if (mOrgao) out.orgao = limparPrefixoCabecalho(mOrgao[1]);

  /* --- Empresa direcionada --- */
  out.empresa = detectarEmpresaDirecionada(t) || '';

  /* ============================================================
     OBJETO — split('---')[0] + limpeza agressiva
     ============================================================ */

  const mObjeto = t.match(
    /(?:objeto|assunto|refer[êe]ncia)\s*[:\-–—]\s*([^\n]{6,180})/i
  );
  if (mObjeto) {
    out.objeto = limparMarcadores(mObjeto[1]);
  } else {
    // Fallback: primeira linha "significativa" (ignora cabeçalhos)
    const linhas = t.split('\n').map(s => s.trim()).filter(Boolean);
    const candidata = linhas.find(s =>
      s.length > 20 &&
      !/^(de|para|ao|à|assunto|ref|referência|referencia|memorando|of[íi]cio|processo|dfd)\s*[:\-–—]?/i.test(s)
    );
    if (candidata) out.objeto = limparMarcadores(candidata).slice(0, 160);
  }

  // Limita tamanho final do objeto
  if (out.objeto.length > 160) {
    out.objeto = out.objeto.slice(0, 160).trim() + '…';
  }

  return out;
}

/* ============================================================
   MOTOR DE TRIAGEM
   ============================================================ */

function contemScore(texto, palavras) {
  let s = 0;
  palavras.forEach(p => { if (texto.includes(p)) s++; });
  return s;
}

function detectarNatureza(texto, naturezaSelecionada) {
  if (naturezaSelecionada && naturezaSelecionada !== 'auto') return naturezaSelecionada;
  const t = texto.toLowerCase();

  const scores = {
    obra:     contemScore(t, KEYWORDS.obra),
    tic:      contemScore(t, KEYWORDS.tic),
    tecnicos: contemScore(t, KEYWORDS.tecnicos),
    comuns:   contemScore(t, KEYWORDS.comuns),
    servicos: contemScore(t, ['serviço', 'servico', 'prestação', 'prestacao'])
  };

  let melhor = 'comuns', max = 0;
  for (const [k, v] of Object.entries(scores)) {
    if (v > max) { max = v; melhor = k; }
  }
  return max === 0 ? 'comuns' : melhor;
}

function detectarModalidade(texto, natureza, valor, empresaDirecionada) {
  const t = texto.toLowerCase();

  const temJustificativaExclusividade = KEYWORDS.justificativaExclusividade
    .some(k => t.includes(k));

  if (contemScore(t, KEYWORDS.inexigibilidade) >= 1 ||
      temJustificativaExclusividade) {
    return {
      modalidade: 'Inexigibilidade de Licitação',
      baseLegal: 'Art. 74 — Lei 14.133/2021',
      cor: 'danger',
      descricao: 'Contratação direta por inviabilidade de competição (notória especialização, fornecedor exclusivo, artista consagrado etc.).',
      observacao: 'Verifique se há comprovação documental da exclusividade ou notória especialização, com parecer técnico circunstanciado (Art. 74, III).'
    };
  }

  if (contemScore(t, KEYWORDS.emergencia) >= 1 &&
      /(emergência|emergencia|calamidade|desastre|risco iminente|situação crítica)/i.test(t)) {
    return {
      modalidade: 'Dispensa Emergencial',
      baseLegal: 'Art. 75, VIII — Lei 14.133/2021',
      cor: 'danger',
      descricao: 'Contratação direta em razão de emergência ou calamidade pública, com risco à continuidade do serviço público.',
      observacao: 'A emergência não pode decorrer de falta de planejamento. Prazo máximo de 1 ano, vedada prorrogação.'
    };
  }

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

  if (empresaDirecionada) {
    return {
      modalidade: 'Pregão Eletrônico (com ressalva)',
      baseLegal: 'Art. 6º, XLI e Art. 29 — Lei 14.133/2021',
      cor: 'warning',
      descricao: 'Modalidade obrigatória para aquisição de bens e contratação de serviços comuns.',
      observacao: 'Atenção: foi identificada menção direta a fornecedor específico. Caso não se trate de inexigibilidade (Art. 74), a indicação deve ser afastada por violação ao Art. 41, I.'
    };
  }
  return {
    modalidade: 'Pregão Eletrônico',
    baseLegal: 'Art. 6º, XLI e Art. 29 — Lei 14.133/2021',
    cor: 'brand',
    descricao: 'Modalidade obrigatória para aquisição de bens e contratação de serviços comuns.',
    observacao: 'A modalidade é obrigatória para objetos comuns, cujos padrões de desempenho possam ser objetivamente definidos pelo edital.'
  };
}

function analisarRequisitos(texto, extra) {
  const t = texto || '';
  return REQUISITOS.map(req => {
    let ok = false;
    try { ok = !!req.test(t, extra); } catch (e) { ok = false; }
    return {
      id: req.id,
      titulo: req.titulo,
      desc: req.desc,
      law: req.law,
      severidade: req.severidade,
      conforme: ok
    };
  });
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

function gerarParecer(requisitos) {
  const criticos = requisitos.filter(r => !r.conforme && r.severidade === 'alta');
  const medios   = requisitos.filter(r => !r.conforme && r.severidade === 'media');
  const todos    = requisitos.filter(r => !r.conforme);

  if (criticos.length > 0) {
    return {
      status: 'DEVOLVIDO PARA ADEQUAÇÃO',
      classe: 'devolvido',
      badge: 'warning',
      justificativa: `Existem ${criticos.length} inconformidade(s) de severidade ALTA que impedem o prosseguimento da instrução processual.`
    };
  }
  if (medios.length > 0) {
    return {
      status: 'DEVOLVIDO PARA ADEQUAÇÃO',
      classe: 'devolvido',
      badge: 'warning',
      justificativa: `Foram identificadas ${medios.length} pendência(s) de severidade MÉDIA. Recomenda-se a complementação antes do prosseguimento.`
    };
  }
  if (todos.length > 0) {
    return {
      status: 'DEFERIDO COM RECOMENDAÇÕES',
      classe: 'deferido',
      badge: 'info',
      justificativa: `A solicitação atende aos requisitos essenciais, restando ${todos.length} recomendação(ões) de baixa severidade.`
    };
  }
  return {
    status: 'DEFERIDO',
    classe: 'deferido',
    badge: 'success',
    justificativa: 'A solicitação atende integralmente aos requisitos formais de instrução processual.'
  };
}

/* ============================================================
   ANÁLISE PRINCIPAL
   ============================================================ */
function analisar() {
  const textoArquivos = state.arquivos.map(a => a.text).filter(Boolean).join('\n\n');
  const textoManual   = els.texto.value || '';
  const textoCompleto = [textoManual, textoArquivos].filter(Boolean).join('\n\n').trim();

  if (!textoCompleto || textoCompleto.length < 30) {
    showToast('Insira o texto da solicitação ou anexe um arquivo.', 'error');
    return;
  }

  /* --- Extração automática de metadados (já com limpeza) --- */
  const meta = extrairMetadados(textoCompleto);

  /* --- Merge: formulário tem prioridade; senão usa o extraído --- */
  const extra = {
    unidade:          els.unidade.value.trim()      || meta.unidade,
    processo:         els.processo.value.trim()     || meta.processo,
    natureza:         els.natureza.value,
    valor:            parseValorBR(els.valor.value) || meta.valor,
    valorTexto:       els.valor.value.trim()        || meta.valorTexto,
    orgao:            els.orgao.value.trim()        || meta.orgao,
    responsavel:      els.responsavel.value.trim(),
    cargo:            els.cargo.value.trim(),
    empresaDetectada: meta.empresa,
    objeto:           meta.objeto
  };

  const natureza   = detectarNatureza(textoCompleto, extra.natureza);
  const modalidade = detectarModalidade(textoCompleto, natureza, extra.valor, extra.empresaDetectada);
  const requisitos = analisarRequisitos(textoCompleto, extra);
  const score      = calcularScore(requisitos);
  const parecer    = gerarParecer(requisitos);

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

  els.emptyState.hidden = true;
  els.emptyState.setAttribute('aria-hidden', 'true');
  els.emptyState.style.display = 'none';

  renderResultado();

  els.resultado.hidden = false;
  els.resultado.removeAttribute('aria-hidden');
  els.resultado.style.display = '';
  els.resultado.setAttribute('tabindex', '-1');
  try { els.resultado.focus({ preventScroll: false }); } catch (e) {}

  showToast('Análise concluída.', 'success');
}

/* ============================================================
   RENDERIZAÇÃO DO RESULTADO
   ============================================================ */
const LABELS_NATUREZA = {
  bens:     'Aquisição de bens',
  servicos: 'Serviços comuns',
  obra:     'Obras e serviços de engenharia',
  tecnicos: 'Serviços técnicos especializados',
  tic:      'Tecnologia da Informação e Comunicação (TIC)',
  comuns:   'Bens e serviços comuns'
};

function renderResultado() {
  const r = state.resultado;
  if (!r) return;

  const valorFmt = r.extra.valor > 0
    ? formatarValorBR(r.extra.valor)
    : 'Não informado';

  const naturezaLabel = LABELS_NATUREZA[r.natureza] || r.natureza;

  /* ---------- Alerta crítico de direcionamento ---------- */
  const requisitoDirecionamento = r.requisitos.find(x => x.id === 'direcionamento');
  const temAlertaDirecionamento =
    r.extra.empresaDetectada && requisitoDirecionamento && !requisitoDirecionamento.conforme;

  const alertaDirecionamentoHtml = temAlertaDirecionamento
    ? `
      <div class="section" style="border-left:5px solid var(--danger);background:var(--danger-bg);">
        <h3 class="section__title" style="color:var(--danger);">
          🚨 Alerta Crítico — Vedação ao Direcionamento
        </h3>
        <div class="alert alert--danger" style="background:transparent;border-left:0;padding:0;">
          <div>
            <div class="alert__title" style="color:var(--danger);font-size:.95rem;">
              Violação ao Art. 41, I e ausência de fundamentação do Art. 74, III
            </div>
            <div class="alert__text" style="font-size:.9rem;line-height:1.7;">
              A indicação direta da empresa <strong>${escapeHtml(r.extra.empresaDetectada)}</strong>
              exige justificativa técnica de exclusividade ou notória especialização nos termos do
              <strong>Art. 74, III da Lei 14.133/2021</strong>, sob pena de violação ao princípio
              da competitividade (<strong>Art. 5º</strong>).
            </div>
          </div>
        </div>
      </div>
    ` : '';

  /* ---------- Veredicto ---------- */
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
          <dt>Processo / Expediente</dt>
          <dd>${escapeHtml(r.extra.processo || 'Não informado')}</dd>
        </div>
        ${r.extra.empresaDetectada ? `
        <div class="verdict__cell">
          <dt>Empresa mencionada</dt>
          <dd style="color:var(--danger);">${escapeHtml(r.extra.empresaDetectada)}</dd>
        </div>` : ''}
      </div>

      <div class="score">
        <span style="font-size:.8rem;color:var(--text-soft);font-weight:700;">Conformidade</span>
        <div class="score__bar" role="progressbar" aria-valuenow="${r.score}" aria-valuemin="0" aria-valuemax="100" aria-label="Índice de conformidade">
          <div class="score__fill" style="width:${r.score}%"></div>
        </div>
        <span class="score__value">${r.score}%</span>
      </div>
    </div>
  `;

  /* ---------- Checklist ---------- */
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

  /* ---------- Alertas de pendências ---------- */
  const naoConformes = r.requisitos.filter(x => !x.conforme);
  const alertasHtml = naoConformes.length === 0
    ? `<div class="alert alert--success">
         <div>
           <div class="alert__title">✓ Nenhuma inconformidade identificada</div>
           <div class="alert__text">A solicitação atende a todos os requisitos formais analisados. Prossiga com a instrução processual.</div>
         </div>
       </div>`
    : naoConformes.map(item => {
        const tipo = item.severidade === 'alta' ? 'danger'
                   : item.severidade === 'media' ? 'warning' : '';
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

  /* ---------- Minuta ---------- */
  const minuta = gerarMinuta(r);

  els.resultado.innerHTML = `
    ${alertaDirecionamentoHtml}
    ${veredictoHtml}

    <div class="section">
      <h3 class="section__title">Enquadramento legal e observações</h3>
      <p style="font-size:.86rem;color:var(--text-muted);margin-bottom:12px;">
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
      <h3 class="section__title">Minuta de resposta oficial (Devolutiva)</h3>
      <pre id="minutaTexto" class="minuta" aria-label="Minuta de despacho oficial">${escapeHtml(minuta)}</pre>
      <div class="minuta__actions">
        <button id="btnCopiar" class="btn btn--primary btn--sm" type="button">📋 Copiar Minuta Completa</button>
        <button id="btnBaixar" class="btn btn--ghost btn--sm" type="button">⬇ Baixar .txt</button>
        <button id="btnImprimir" class="btn btn--ghost btn--sm" type="button">🖨 Imprimir</button>
      </div>
    </div>
  `;

  $('#btnCopiar')?.addEventListener('click', () => copiarTexto(minuta));
  $('#btnBaixar')?.addEventListener('click', () => baixarTxt(minuta));
  $('#btnImprimir')?.addEventListener('click', () => imprimirMinuta(minuta));
}

/* ============================================================
   GERADOR DA MINUTA OFICIAL — Devolutiva SEI
   ============================================================ */
function gerarMinuta(r) {
  const d = r.dataAnalise;
  const dataFmt = d.toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric'
  });
  const numDespacho = String(Math.floor(Math.random() * 900) + 100);
  const anoAtual = d.getFullYear();

  /* --- Dados interpolados (já limpos por extrairMetadados) --- */
  const orgao       = (r.extra.orgao     || 'ÓRGÃO / ENTIDADE PÚBLICA').toUpperCase();
  const unidade     = r.extra.unidade    || 'Unidade Requisitante';
  const processo    = r.extra.processo   || 'Expediente não identificado';
  const objeto      = r.extra.objeto     || (LABELS_NATUREZA[r.natureza] || 'Contratação pública');
  const valor       = r.extra.valor > 0
                      ? formatarValorBR(r.extra.valor)
                      : (r.extra.valorTexto || 'Não informado pelo requisitante');
  const responsavel = r.extra.responsavel || '________________________________';
  const cargo       = r.extra.cargo       || 'Autoridade Competente';
  const empresa     = r.extra.empresaDetectada || '';

  const pendentes = r.requisitos.filter(x => !x.conforme);
  const pendenciasTxt = pendentes.length === 0
    ? '    Não foram identificadas pendências formais. Prossegue-se com a instrução processual.'
    : pendentes.map((p, i) => {
        const sev = p.severidade === 'alta' ? 'ALTA'
                  : p.severidade === 'media' ? 'MÉDIA' : 'BAIXA';
        return `    ${i + 1}. [Severidade ${sev}] ${p.titulo}
       Fundamento: ${p.law}
       Providência: ${p.desc}`;
      }).join('\n\n');

  const blocoDirecionamento = empresa && pendentes.some(p => p.id === 'direcionamento')
    ? `

    5. VEDAÇÃO AO DIRECIONAMENTO DE FORNECEDOR (Art. 41, I e Art. 5º)

    Constatou-se a indicação direta da empresa "${empresa}" no expediente
    encaminhado. Tal indicação configura, em princípio, direcionamento vedado
    pelo Art. 41, I da Lei nº 14.133/2021, salvo se devidamente fundamentada
    em hipótese de inexigibilidade (Art. 74, III), com demonstração técnica
    de exclusividade ou notória especialização do fornecedor.

    Providência exigida: apresentar parecer técnico circunstanciado que
    comprove a exclusividade ou notória especialização, OU retificar o
    expediente para afastar a indicação direta de marca/fornecedor,
    preservando-se o princípio da competitividade (Art. 5º).
`
    : '';

  const minuta = `DESPACHO DE TRIAGEM E ENQUADRAMENTO LEGAL Nº ${numDespacho}/${anoAtual}

${orgao}
${unidade.toUpperCase()}

À Unidade Requisitante: ${unidade}
Processo/Expediente: ${processo}
Objeto: ${objeto}
Valor Estimado: ${valor}
Data de Análise: ${dataFmt}

========================================================================
1. RESUMO EXECUTIVO
========================================================================

    Trata-se de análise técnica e jurídica preliminar da solicitação de
contratação encaminhada pela unidade requisitante acima identificada,
instruída nos autos do ${processo}, fundamentada na Lei Federal
nº 14.133, de 1º de abril de 2021, e demais normas aplicáveis.

    A demanda foi classificada, preliminarmente, com a seguinte natureza:
${LABELS_NATUREZA[r.natureza] || r.natureza}.
Valor estimado informado pelo requisitante: ${valor}.

========================================================================
2. ENQUADRAMENTO E PARECER DA TRIAGEM
========================================================================

    SITUAÇÃO: ${r.parecer.status}
    Modalidade Sugerida: ${r.modalidade.modalidade}
    Base Legal: ${r.modalidade.baseLegal}
    Índice de Conformidade Formal: ${r.score}%

    Fundamentação: ${r.parecer.justificativa}

    Descrição da modalidade: ${r.modalidade.descricao}

    Orientação complementar: ${r.modalidade.observacao}

========================================================================
3. EXIGÊNCIAS E PENDÊNCIAS A SANAR
========================================================================

${pendenciasTxt}
${blocoDirecionamento}
========================================================================
4. CONCLUSÃO E ENCAMINHAMENTO
========================================================================

    Diante do exposto, e considerando o resultado da triagem preliminar
realizada nos termos da Lei nº 14.133/2021, restituam-se os autos à
unidade requisitante para saneamento dos apontamentos relacionados no
item 3, no prazo de 5 (cinco) dias úteis, contados do recebimento
deste despacho.

    Após a regularização, os autos deverão retornar a esta unidade de
planejamento para prosseguimento da instrução processual, com a
elaboração do Estudo Técnico Preliminar (ETP) e do Termo de Referência
ou Projeto Básico, conforme o caso.

    Permanece esta equipe à disposição para os esclarecimentos que se
fizerem necessários.


    Atenciosamente,

    _______________________________________________
    ${responsavel}
    ${cargo}
    ${orgao}

    Documento gerado eletronicamente pelo sistema LicitaReq
    Motor de regras — Lei nº 14.133/2021
`;

  return minuta;
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
    showToast('Minuta copiada para a área de transferência.', 'success');
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
  els.unidade.value = '';
  els.processo.value = '';
  els.orgao.value = '';
  els.responsavel.value = 'João Pereira da Silva';
  els.cargo.value = 'Chefe da Divisão de Licitações';
  els.natureza.value = 'auto';
  els.valor.value = '';

  els.texto.value =
`DIRETORIA DE TECNOLOGIA DA INFORMAÇÃO
Memorando nº 042/2026

De: Setor Requisitante / TI
Para: Divisão de Licitações
Assunto: Consultoria Especializada em Arquitetura de Nuvem --- 1

1. Solicitamos a contratação da empresa TechCloud Soluções Avançadas Ltda.
para prestação de serviços de consultoria especializada em arquitetura de
nuvem, incluindo migração de workloads e otimização de custos em ambiente
multicloud.

2. Justifica-se a presente demanda em razão da necessidade de modernização
da infraestrutura tecnológica desta Diretoria, visando a continuidade e a
segurança dos serviços prestados à sociedade.

3. O valor estimado da contratação é de R$ 85.000,00 (oitenta e cinco mil
reais), conforme pesquisa de preços realizada junto a fornecedores do ramo.

4. Informamos que há dotação orçamentária específica prevista na Lei
Orçamentária Anual para o exercício corrente.

5. O prazo de execução dos serviços é de 6 (seis) meses, contados da
assinatura do contrato.

6. O fiscal do contrato será designado por portaria específica.

Atenciosamente,
Diretoria de Tecnologia da Informação`;

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
  els.emptyState.removeAttribute('aria-hidden');
  els.emptyState.style.display = '';

  els.resultado.hidden = true;
  els.resultado.setAttribute('aria-hidden', 'true');
  els.resultado.style.display = 'none';
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
  initAccordions();
  initDropzone();
  renderFileList();

  els.emptyState.hidden = false;
  els.emptyState.style.display = '';
  els.resultado.hidden = true;
  els.resultado.style.display = 'none';

  els.texto.addEventListener('input', atualizarContador);
  els.btnAnalisar.addEventListener('click', analisar);
  els.btnExemplo.addEventListener('click', carregarExemplo);
  els.btnLimpar.addEventListener('click', limparTudo);

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
