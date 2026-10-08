/* ============================================================
   LicitaReq — app.js (v1.3)
   Motor de triagem + Módulo DFD Inteligente (Lei nº 14.133/2021)
   ------------------------------------------------------------
   Novidades v1.3:
     - Painel DFD com formulário completo
     - Indicador de Prontidão em tempo real
     - Gerador de PDF DFD rotulado para LicitaAudit
     - Persistência local (JSON) do DFD
   ============================================================ */
'use strict';

/* -------------------- LIMITES LEGAIS -------------------- */
const LIMITE_DISPENSA_BENS_SERVICOS =  50000.00;
const LIMITE_DISPENSA_OBRAS         = 100000.00;
const LIMITE_OBRA_ENG               = LIMITE_DISPENSA_OBRAS;
const LIMITE_BENS_SERVICOS          = LIMITE_DISPENSA_BENS_SERVICOS;

/* Tag de autenticação reconhecida pelo LicitaAudit */
const TAG_LICITAREQ_PDF = 'PREFIRO_TAG: LicitaReq_Documento_Oficial';
const ASSINATURA_PDF_LICITAREQ = 'Documento gerado eletronicamente pelo sistema LicitaReq';

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
  { id:'justificativa', titulo:'Justificativa da necessidade pública', desc:'A demanda deve demonstrar a real necessidade administrativa, o interesse público e o resultado pretendido.', law:'Art. 18, §1º, I — Lei 14.133/2021', severidade:'alta', test:(t)=>t.length > 200 && /(justific|necessidad|interesse público|interesse publico|finalidade|objetivo|para atender)/i.test(t) },
  { id:'objeto', titulo:'Descrição clara e precisa do objeto', desc:'O objeto deve ser descrito de forma suficiente, clara e precisa, sem ambiguidades.', law:'Art. 18, §1º, II — Lei 14.133/2021', severidade:'alta', test:(t)=>t.length > 80 && /(objeto|aquisição|aquisicao|contratação|contratacao|prestação|prestacao|fornecimento)/i.test(t) },
  { id:'quantidade', titulo:'Estimativa de quantidade', desc:'Deve haver estimativa das quantidades a serem contratadas, com base em séries históricas ou projeções.', law:'Art. 18, §1º, III — Lei 14.133/2021', severidade:'media', test:(t)=>/(\d+\s*(unid|unidade|un|pç|pc|caixa|cx|kg|litro|l|m²|m2|m³|m3|metro|pacote|resma|frasco|licen[çc]a))|quantidade\s*:?\s*\d+|\b\d{1,5}\s+(unidades?|itens?)/i.test(t) },
  { id:'valor', titulo:'Estimativa preliminar de preço / pesquisa de mercado', desc:'A solicitação deve vir acompanhada de estimativa de valor ou indicação de pesquisa de preços.', law:'Art. 18, §1º, IV e Art. 23 — Lei 14.133/2021', severidade:'media', test:(t, extra)=>{ if (extra && extra.eInexigivel) { if (KEYWORDS.justificativaPrecoInexigivel.some(k => t.toLowerCase().includes(k))) return true; } return (/(R\$\s*[\d.,]+)|(pesquisa de (preço|preco|mercado))|(estimativa de valor)|(valor estimado)/i.test(t) || (extra && extra.valor && extra.valor > 0)); } },
  { id:'dotacao', titulo:'Indicação de dotação orçamentária', desc:'Deve haver indicação da dotação orçamentária ou declaração de que há previsão no orçamento.', law:'Art. 18, §1º, V e Art. 150 — Lei 14.133/2021', severidade:'media', test:(t)=>/(dotação|dotacao|orçament|orcament|previsão orçament|previsao orcament|fonte de recurso|natureza de despesa)/i.test(t) },
  { id:'prazo', titulo:'Prazo de execução / entrega', desc:'Deve constar prazo de execução, entrega ou vigência contratual pretendida.', law:'Art. 18, §1º, VI — Lei 14.133/2021', severidade:'baixa', test:(t)=>/(prazo|vigência|vigencia|entrega em|execução em|execucao em|\d+\s*(dias|meses|anos))/i.test(t) },
  { id:'local', titulo:'Local de entrega / prestação', desc:'Deve ser indicado o local de entrega do bem ou de prestação do serviço.', law:'Art. 18, §1º, VII — Lei 14.133/2021', severidade:'baixa', test:(t)=>/(local de entrega|local de presta|endereço|endereco|entregue em|na sede|no almoxarifado)/i.test(t) },
  { id:'fiscal', titulo:'Indicação de fiscal / gestor do contrato', desc:'É recomendável indicar o servidor responsável pela fiscalização do contrato.', law:'Art. 117 — Lei 14.133/2021', severidade:'baixa', test:(t)=>/(fiscal|gestor do contrato|fiscaliza|acompanhamento do contrato)/i.test(t) },
  { id:'marca', titulo:'Ausência de indicação de marca sem justificativa', desc:'É vedada a indicação de marca/modelo sem justificativa técnica que demonstre padronização ou exclusividade.', law:'Art. 41, I — Lei 14.133/2021', severidade:'alta', test:(t, extra)=>{ const temMarca = KEYWORDS.marca.some(k => t.toLowerCase().includes(k)); const temJust = /(padroniza|justificativa técnica|justificativa tecnica|parecer técnico|parecer tecnico|similaridade|compatibilidade|exclusividade|notória especialização|notoria especializacao)/i.test(t); if (extra && extra.eInexigivel) return true; return !temMarca || temJust; } },
  { id:'direcionamento', titulo:'Vedação ao direcionamento de fornecedor', desc:'A indicação direta de empresa específica exige justificativa técnica de exclusividade ou notória especialização, sob pena de violação ao princípio da competitividade.', law:'Art. 41, I e Art. 74, III — Lei 14.133/2021', severidade:'alta', test:(t, extra)=>{ if (!extra || !extra.empresaDetectada) return true; return KEYWORDS.justificativaExclusividade.some(k => t.toLowerCase().includes(k)); } },
  { id:'competicao', titulo:'Preservação da competitividade', desc:'A descrição não pode direcionar a contratação para fornecedor específico.', law:'Art. 5º e Art. 41 — Lei 14.133/2021', severidade:'alta', test:(t, extra)=>{ if (extra && extra.eInexigivel) return true; return !/(direcionad[oa]\s+(?:para|à|a)\s+(?:empresa|fornecedor)|exclusivamente\s+(?:a|para)\s+(?:empresa|fornecedor))/i.test(t); } }
];

/* -------------------- ESTADO -------------------- */
const state = {
  arquivos: [],
  resultado: null,
  dfd: criarEstadoDFD()
};

function criarEstadoDFD() {
  return {
    numero: '',
    data: new Date().toISOString().slice(0, 10),
    unidade: '',
    responsavel: '',
    cargo: '',
    orgao: '',
    objeto: '',
    justificativa: '',
    quantidades: '',
    pcaPrevisto: '',
    pcaItem: '',
    pcaJustificativa: '',
    modalidade: '',
    natureza: '',
    criterio: '',
    regime: '',
    valor: '',
    metodo: '',
    dotacao: '',
    fonte: '',
    parcelamento: '',
    prazo: '',
    local: '',
    pagamento: '',
    fiscalTitular: '',
    fiscalSubstituto: '',
    gestor: '',
    vistoria: '',
    observacoes: ''
  };
}

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
  toast:       $('#toast'),
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
  const limpo = String(str).replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3})/g, '').replace(',', '.');
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
   LIMPEZA DE METADADOS
   ============================================================ */
function limparMetadados(dados) {
  let unidade = dados.unidadeRequisitante || '';
  let objeto  = dados.objeto || '';

  unidade = unidade
    .split(/\b(?:De|Para|Ao|À|Assunto|Ref|Refer[êe]ncia|Objeto|Processo|Expediente)\s*:/i)[0]
    .replace(/[—–\-]{1,}|[:#]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (/tecnologia\s+da\s+informa[çc][ãa]o|^\s*ti\s*$|\bti\b/i.test(unidade)) unidade = 'Diretoria de Tecnologia da Informação (TI)';
  else if (!unidade) unidade = 'Diretoria de Tecnologia da Informação (TI)';

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
  els.themeToggle.setAttribute('aria-label', isDark ? 'Alternar para o tema claro' : 'Alternar para o tema escuro');
  els.themeToggle.querySelector('.theme-icon').textContent = isDark ? '☀️' : '🌙';
  els.themeToggle.querySelector('.theme-label').textContent = isDark ? 'Modo claro' : 'Modo escuro';
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', isDark ? '#0f172a' : '#f1f5f9');
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
   ARIA EXPANDED
   ============================================================ */
function initAccordions() {
  document.querySelectorAll('details.accordion').forEach(det => {
    const summary = det.querySelector('summary');
    if (!summary) return;
    summary.setAttribute('aria-expanded', String(det.open));
    det.addEventListener('toggle', () => summary.setAttribute('aria-expanded', String(det.open)));
  });
}

/* ============================================================
   UPLOAD / PARSING (módulo de triagem)
   ============================================================ */
function initDropzone() {
  els.dropzone.addEventListener('click', () => els.fileInput.click());
  els.dropzone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); els.fileInput.click(); }
  });
  ['dragenter', 'dragover'].forEach(ev =>
    els.dropzone.addEventListener(ev, (e) => { e.preventDefault(); e.stopPropagation(); els.dropzone.classList.add('is-dragover'); })
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
    if (file.size > 10 * 1024 * 1024) { showToast(`Arquivo "${file.name}" excede 10 MB.`, 'error'); continue; }
    const id = `f_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const item = { id, file, name: file.name, size: file.size, status: 'lendo', text: '' };
    state.arquivos.push(item);
    renderFileList();
    try {
      item.text = await extrairTexto(file);
      item.status = 'ok';
      if (item.text && item.text.trim().length > 20) {
        const atual = els.texto.value.trim();
        els.texto.value = atual ? `${atual}\n\n--- ${file.name} ---\n${item.text}` : item.text;
        atualizarContador();
      }
      showToast(`"${file.name}" processado.`, 'success');
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
  if (ext === '.txt' || ext === '.md' || file.type === 'text/plain') return await file.text();
  if (ext === '.pdf' || file.type === 'application/pdf') return await extrairPdf(file);
  if (ext === '.docx') return await extrairDocx(file);
  if (ext === '.doc') throw new Error('Formato .doc legado não suportado. Converta para .docx ou .pdf.');
  try { return await file.text(); } catch (e) { return ''; }
}

async function extrairPdf(file) {
  if (!window.pdfjsLib) throw new Error('Biblioteca PDF.js não carregada.');
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  const buffer = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: buffer }).promise;
  let texto = '';
  const maxPag = Math.min(pdf.numPages, 30);
  for (let i = 1; i <= maxPag; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    texto += content.items.map(it => it.str).join(' ') + '\n';
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
    const statusMap = { lendo:{cls:'fileitem__status--load',label:'Lendo…'}, ok:{cls:'fileitem__status--ok',label:'Pronto'}, erro:{cls:'fileitem__status--erro',label:'Erro'} };
    const st = statusMap[item.status] || statusMap.lendo;
    const li = document.createElement('li');
    li.className = 'fileitem';
    li.innerHTML = `
      <div class="fileitem__icon" aria-hidden="true">${escapeHtml(ext.replace('.', '').toUpperCase() || 'ARQ')}</div>
      <div class="fileitem__meta">
        <span class="fileitem__title" title="${escapeHtml(item.name)}"><bdi>${escapeHtml(base)}</bdi><bdi>${escapeHtml(ext)}</bdi></span>
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
  const padraoRazaoSocial = /\b([A-ZÀ-Ú][\wÀ-ú&.'-]*(?:\s+(?:[A-ZÀ-Ú][\wÀ-ú&.'-]*|de|da|do|das|dos|e)){0,7}\s+(?:Ltda\.?|LTDA\.?|S\.A\.?|S\/A|S\.A|ME|EIRELI|EPP))\b/g;
  const encontradas = [];
  let m;
  while ((m = padraoRazaoSocial.exec(texto)) !== null) {
    const nome = m[1].replace(/\s+/g, ' ').trim();
    if (nome.length > 4 && !encontradas.includes(nome)) encontradas.push(nome);
  }
  if (encontradas.length === 0) {
    const padraoContexto = /(?:empresa|fornecedor|contrata[çc][aã]o\s+d[aeo]|aquisi[çc][aã]o\s+d[aeo]|junto\s+[àa])\s+([A-ZÀ-Ú][\wÀ-ú&.'-]*(?:\s+(?:[A-ZÀ-Ú][\wÀ-ú&.'-]*|de|da|do|e)){0,6})/g;
    while ((m = padraoContexto.exec(texto)) !== null) {
      const nome = m[1].replace(/\s+/g, ' ').trim();
      if (nome.length > 4 && !encontradas.includes(nome)) encontradas.push(nome);
    }
  }
  return encontradas.length ? encontradas[0] : null;
}

/* ============================================================
   SINAIS ESPECÍFICOS
   ============================================================ */
function detectarAlienacao(texto, objeto) {
  const base = `${texto || ''} ${objeto || ''}`.toLowerCase();
  return KEYWORDS.alienacao.some(k => base.includes(k));
}
function detectarInexigibilidade(texto) {
  const t = (texto || '').toLowerCase();
  return KEYWORDS.inexigibilidade.some(k => t.includes(k)) || KEYWORDS.justificativaExclusividade.some(k => t.includes(k));
}
function detectarEmergencia(texto) {
  const t = (texto || '').toLowerCase();
  return /emerg[êe]ncial?|calamidade|desastre|defesa\s+civil|risco\s+iminente|paralisa[çc][ãa]o\s+de\s+servi[çc]o|desabastecimento/i.test(t);
}
function detectarObraEngenharia(objeto) {
  return /obra|obras|engenharia|reforma|constru[çc][ãa]o|pavimenta|saneamento|drenagem|edifica|estrutural/i.test((objeto || '').toLowerCase());
}
function detectarServicoIntelectual(objeto) {
  return /consultoria|arquitetura|projeto|estudo\s+t[ée]cnico|intelectual|parecer|auditoria|per[íi]cia|laudo|assessoria\s+t[ée]cnica|parecerista/i.test((objeto || '').toLowerCase());
}

/* ============================================================
   ÁRVORE DE DECISÃO JURÍDICA — Lei 14.133/2021
   ============================================================ */
function determinarModalidadeEJustificativa(metadados) {
  const { objeto = '', valor = 0, eInexigivel = false, eAlienacao = false, eEmergencial = false, empresaDirecionada = '', natureza = 'comuns' } = metadados;
  const valorFmt = valor > 0 ? valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'não informado';

  if (eAlienacao || /aliena[çc][ãa]o|venda\s+de\s+bens|inserv[íi]ve(is|l)|desfazimento|leil[ãa]o/i.test(objeto)) {
    return { modalidade:'Leilão Eletrônico', baseLegal:'Art. 6º, XL e Art. 31 — Lei 14.133/2021', cor:'warning', motivo:'Processo voltado à alienação de bens móveis inservíveis ou de bens imóveis da Administração Pública. O critério é MAIOR LANCE e a modalidade obrigatória é o Leilão (Art. 31).', descricao:'Modalidade obrigatória para alienação de bens.', observacao:'Exige avaliação prévia, autorização da autoridade competente e, para imóveis, autorização legislativa.' };
  }
  if (eEmergencial) {
    return { modalidade:'Dispensa de Licitação Emergencial', baseLegal:'Art. 75, VIII — Lei 14.133/2021', cor:'danger', motivo:`A emergência autoriza a contratação direta para atendimento de risco iminente à vida, à segurança pública ou à paralisação de serviços essenciais (Art. 75, VIII). Prazo máximo de 1 ano, vedada prorrogação. Valor estimado: ${valorFmt}.`, descricao:'Contratação direta em razão de emergência.', observacao:'A emergência NÃO pode decorrer de falta de planejamento.' };
  }
  if (eInexigivel) {
    return { modalidade:'Inexigibilidade de Licitação', baseLegal:'Art. 74 — Lei 14.133/2021', cor:'danger', motivo:'Há inviabilidade de competição caracterizada. Admite-se justificativa de preço com base em notas fiscais ou contratos anteriores (Art. 74, §2º).' + (empresaDirecionada ? ` ⚠ Empresa mencionada: ${empresaDirecionada}.` : ''), descricao:'Contratação direta por inviabilidade de competição.', observacao:'Instruir com parecer técnico circunstanciado.' };
  }
  const eObraEng = detectarObraEngenharia(objeto) || natureza === 'obra';
  if (eObraEng && valor > 0 && valor <= LIMITE_DISPENSA_OBRAS) {
    return { modalidade:'Dispensa de Licitação por Valor', baseLegal:'Art. 75, I — Lei 14.133/2021', cor:'success', motivo:`O valor da obra/engenharia (${valorFmt}) está dentro do limite de R$ ${LIMITE_DISPENSA_OBRAS.toLocaleString('pt-BR')} (Art. 75, I).`, descricao:`Obras e serviços de engenharia até R$ ${LIMITE_DISPENSA_OBRAS.toLocaleString('pt-BR')}.`, observacao:'Exige orçamento detalhado e razão de escolha (Art. 72).' };
  }
  if (!eObraEng && valor > 0 && valor <= LIMITE_DISPENSA_BENS_SERVICOS) {
    return { modalidade:'Dispensa de Licitação por Valor', baseLegal:'Art. 75, II — Lei 14.133/2021', cor:'success', motivo:`O valor total (${valorFmt}) está abaixo do limite de R$ ${LIMITE_DISPENSA_BENS_SERVICOS.toLocaleString('pt-BR')} (Art. 75, II).`, descricao:`Bens e serviços comuns até R$ ${LIMITE_DISPENSA_BENS_SERVICOS.toLocaleString('pt-BR')}.`, observacao:'Aplicável a objetos comuns, com pesquisa de preços.' };
  }
  if (detectarServicoIntelectual(objeto) || eObraEng || natureza === 'tecnicos' || natureza === 'obra') {
    const tipo = detectarServicoIntelectual(objeto) ? 'serviço técnico especializado de natureza predominantemente intelectual' : 'obra ou serviço de engenharia de complexidade relevante';
    return { modalidade:'Concorrência', baseLegal:'Art. 6º, XXXVIII e Art. 36 — Lei 14.133/2021', cor:'info', motivo:`Trata-se de ${tipo}. A complexidade recomenda julgamento por "Melhor Técnica" ou "Técnica e Preço" (Art. 36, §1º).`, descricao:'Modalidade obrigatória para serviços especializados e obras de valor superior à dispensa.', observacao:'Admite menor preço, melhor técnica ou técnica e preço.' };
  }
  const comRessalva = !!empresaDirecionada;
  return { modalidade: comRessalva ? 'Pregão Eletrônico (com ressalva)' : 'Pregão Eletrônico', baseLegal:'Art. 6º, XLI e Art. 29 — Lei 14.133/2021', cor: comRessalva ? 'warning' : 'brand', motivo:'Objeto comum com padrões objetivos definíveis no edital (Art. 6º, XLI). O Pregão Eletrônico é a modalidade OBRIGATÓRIA.' + (comRessalva ? ` ⚠ Menção direta ao fornecedor "${empresaDirecionada}" — afastar por violação ao Art. 41, I.` : ''), descricao:'Modalidade obrigatória para bens e serviços comuns.', observacao:'Padrões de desempenho objetivamente definíveis pelo edital.' };
}

/* ============================================================
   EXTRAÇÃO DE METADADOS
   ============================================================ */
function extrairMetadados(texto) {
  const t = texto || '';
  const raw = { valor:0, valorTexto:'', processo:'', unidadeRequisitante:'', orgao:'', empresa:'', objeto:'' };

  const mValor = t.match(/R\$\s*([\d]{1,3}(?:\.\d{3})*(?:,\d{1,2})?)/i);
  if (mValor) { raw.valorTexto = `R$ ${mValor[1]}`; raw.valor = parseValorBR(mValor[1]); }

  const mProc = t.match(/\b(memorando|of[íi]cio|processo|requerimento|expediente|dfd|documento\s+de\s+formaliza[çc][ãa]o)\s*(?:n[º°.]?|n[úu]mero)?\s*([\d][\d.\/\-\w]*)/i);
  if (mProc) raw.processo = `${mProc[1]} nº ${mProc[2]}`.replace(/\s+/g, ' ');

  const mUnidadeRotulo = t.match(/(?:[àa]\s+unidade\s+requisitante|unidade\s+requisitante|setor\s+requisitante|remetente|origem|de)\s*[:\-–—]\s*([^\n]{3,90})/i);
  if (mUnidadeRotulo) raw.unidadeRequisitante = mUnidadeRotulo[1];

  const mOrgao = t.match(/\b(Minist[ée]rio[^\n,.;]{0,60}|Prefeitura[^\n,.;]{0,60}|Tribunal[^\n,.;]{0,60}|Universidade[^\n,.;]{0,60}|Instituto[^\n,.;]{0,60})/i);
  if (mOrgao) raw.orgao = mOrgao[1].replace(/\s+/g, ' ').trim();

  raw.empresa = detectarEmpresaDirecionada(t) || '';

  const mObjeto = t.match(/(?:objeto|assunto|refer[êe]ncia)\s*[:\-–—]\s*([^\n]{6,180})/i);
  if (mObjeto) raw.objeto = mObjeto[1];
  else {
    const linhas = t.split('\n').map(s => s.trim()).filter(Boolean);
    const candidata = linhas.find(s => s.length > 20 && !/^(de|para|ao|à|assunto|ref|memorando|of[íi]cio|processo|dfd)\s*[:\-–—]?/i.test(s));
    if (candidata) raw.objeto = candidata.slice(0, 160);
  }

  const limpos = limparMetadados(raw);
  return { valor:limpos.valor, valorTexto:limpos.valorTexto, processo:limpos.processo, unidade:limpos.unidadeRequisitante, orgao:limpos.orgao, empresa:limpos.empresa, objeto:limpos.objeto };
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
  const scoreConsumo = contemScore(t, KEYWORDS.consumo);
  if (scoreConsumo >= 1) {
    const scoreTicForte = contemScore(t, ['software','licença de software','datacenter','firewall','servidor de rede','desenvolvimento de sistema','erp','aplicativo','cloud computing']);
    const scoreObraForte = contemScore(t, ['obra','reforma','pavimenta','saneamento','edificação','fundação','estrutural']);
    if (scoreTicForte === 0 && scoreObraForte === 0) return 'comuns';
  }
  const scores = { obra: contemScore(t, KEYWORDS.obra), tic: contemScore(t, KEYWORDS.tic), tecnicos: contemScore(t, KEYWORDS.tecnicos), comuns: contemScore(t, KEYWORDS.comuns), servicos: contemScore(t, ['serviço','servico','prestação','prestacao']) };
  let melhor = 'comuns', max = 0;
  for (const [k, v] of Object.entries(scores)) if (v > max) { max = v; melhor = k; }
  return max === 0 ? 'comuns' : melhor;
}
function analisarRequisitos(texto, extra) {
  const t = texto || '';
  return REQUISITOS.map(req => {
    let ok = false;
    try { ok = !!req.test(t, extra); } catch (e) { ok = false; }
    return { id:req.id, titulo:req.titulo, desc:req.desc, law:req.law, severidade:req.severidade, conforme:ok };
  });
}
function calcularScore(requisitos) {
  if (!requisitos.length) return 0;
  const pesos = { alta: 3, media: 2, baixa: 1 };
  let total = 0, obtido = 0;
  requisitos.forEach(r => { const p = pesos[r.severidade] || 1; total += p; if (r.conforme) obtido += p; });
  return Math.round((obtido / total) * 100);
}
function gerarParecer(requisitos) {
  const criticos = requisitos.filter(r => !r.conforme && r.severidade === 'alta');
  const medios   = requisitos.filter(r => !r.conforme && r.severidade === 'media');
  const todos    = requisitos.filter(r => !r.conforme);
  if (criticos.length > 0) return { status:'DEVOLVIDO PARA ADEQUAÇÃO', classe:'devolvido', badge:'warning', justificativa:`Existem ${criticos.length} inconformidade(s) de severidade ALTA.` };
  if (medios.length > 0)   return { status:'DEVOLVIDO PARA ADEQUAÇÃO', classe:'devolvido', badge:'warning', justificativa:`Foram identificadas ${medios.length} pendência(s) de severidade MÉDIA.` };
  if (todos.length > 0)    return { status:'DEFERIDO COM RECOMENDAÇÕES', classe:'deferido', badge:'info', justificativa:`Atende aos requisitos essenciais, restando ${todos.length} recomendação(ões) de baixa severidade.` };
  return { status:'DEFERIDO', classe:'deferido', badge:'success', justificativa:'A solicitação atende integralmente aos requisitos formais.' };
}

/* ============================================================
   ANÁLISE PRINCIPAL (triagem)
   ============================================================ */
function analisar() {
  const textoArquivos = state.arquivos.map(a => a.text).filter(Boolean).join('\n\n');
  const textoManual   = els.texto.value || '';
  const textoCompleto = [textoManual, textoArquivos].filter(Boolean).join('\n\n').trim();

  if (!textoCompleto || textoCompleto.length < 30) { showToast('Insira o texto da solicitação ou anexe um arquivo.', 'error'); return; }

  const meta = extrairMetadados(textoCompleto);
  const eInexigivel = detectarInexigibilidade(textoCompleto);
  const eAlienacao  = detectarAlienacao(textoCompleto, meta.objeto);
  const eEmergencial = detectarEmergencia(textoCompleto);

  const extra = {
    unidade: els.unidade.value.trim() || meta.unidade,
    processo: els.processo.value.trim() || meta.processo,
    natureza: els.natureza.value,
    valor: parseValorBR(els.valor.value) || meta.valor,
    valorTexto: els.valor.value.trim() || meta.valorTexto,
    orgao: els.orgao.value.trim() || meta.orgao,
    responsavel: els.responsavel.value.trim(),
    cargo: els.cargo.value.trim(),
    empresaDetectada: meta.empresa,
    objeto: meta.objeto,
    eInexigivel, eAlienacao, eEmergencial
  };

  const natureza = detectarNatureza(textoCompleto, extra.natureza);
  const enquadramento = determinarModalidadeEJustificativa({ objeto:extra.objeto, valor:extra.valor, eInexigivel, eAlienacao, eEmergencial, empresaDirecionada:extra.empresaDetectada, natureza });
  const requisitos = analisarRequisitos(textoCompleto, extra);
  const score      = calcularScore(requisitos);
  const parecer    = gerarParecer(requisitos);

  state.resultado = { texto:textoCompleto, extra, natureza, modalidade:enquadramento, requisitos, score, parecer, dataAnalise:new Date() };

  els.emptyState.hidden = true;
  els.emptyState.setAttribute('aria-hidden', 'true');
  els.emptyState.style.display = 'none';

  renderResultado();

  els.resultado.hidden = false;
  els.resultado.removeAttribute('aria-hidden');
  els.resultado.style.display = '';
  els.resultado.setAttribute('tabindex', '-1');
  try { els.resultado.focus({ preventScroll: false }); } catch (e) {}
  const status = $('#resultado-status');
  if (status) status.textContent = `Análise concluída. Modalidade sugerida: ${enquadramento.modalidade}.`;

  showToast('Análise concluída.', 'success');
}

/* ============================================================
   RENDERIZAÇÃO DO RESULTADO
   ============================================================ */
const LABELS_NATUREZA = {
  bens:'Aquisição de bens',
  servicos:'Serviços comuns',
  obra:'Obras e serviços de engenharia',
  tecnicos:'Serviços técnicos especializados',
  tic:'Tecnologia da Informação e Comunicação (TIC)',
  comuns:'Bens e Serviços Comuns / Consumo'
};

function renderResultado() {
  const r = state.resultado;
  if (!r) return;
  const valorFmt = r.extra.valor > 0 ? formatarValorBR(r.extra.valor) : 'Não informado';
  const naturezaLabel = LABELS_NATUREZA[r.natureza] || r.natureza;

  const reqDir = r.requisitos.find(x => x.id === 'direcionamento');
  const temAlertaDirecionamento = r.extra.empresaDetectada && reqDir && !reqDir.conforme;

  const alertaDirecionamentoHtml = temAlertaDirecionamento ? `
    <div class="section" style="border-left:5px solid var(--danger);background:var(--danger-bg);">
      <h3 class="section__title" style="color:var(--danger);">🚨 Alerta Crítico — Vedação ao Direcionamento</h3>
      <div class="alert alert--danger" style="background:transparent;border-left:0;padding:0;">
        <div>
          <div class="alert__title" style="color:var(--danger);font-size:.95rem;">Violação ao Art. 41, I e ausência de fundamentação do Art. 74, III</div>
          <div class="alert__text" style="font-size:.9rem;line-height:1.7;">
            A indicação direta da empresa <strong>${escapeHtml(r.extra.empresaDetectada)}</strong> exige justificativa técnica de exclusividade ou notória especialização (Art. 74, III).
          </div>
        </div>
      </div>
    </div>` : '';

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
        <div class="verdict__cell"><dt>Modalidade sugerida</dt><dd><span class="badge badge--${r.modalidade.cor}">${escapeHtml(r.modalidade.modalidade)}</span></dd></div>
        <div class="verdict__cell"><dt>Base legal</dt><dd>${escapeHtml(r.modalidade.baseLegal)}</dd></div>
        <div class="verdict__cell"><dt>Natureza do objeto</dt><dd>${escapeHtml(naturezaLabel)}</dd></div>
        <div class="verdict__cell"><dt>Valor estimado</dt><dd>${escapeHtml(valorFmt)}</dd></div>
        <div class="verdict__cell"><dt>Unidade requisitante</dt><dd>${escapeHtml(r.extra.unidade || 'Não informada')}</dd></div>
        <div class="verdict__cell"><dt>Processo / Expediente</dt><dd>${escapeHtml(r.extra.processo || 'Não informado')}</dd></div>
        ${r.extra.empresaDetectada ? `<div class="verdict__cell"><dt>Empresa mencionada</dt><dd style="color:var(--danger);">${escapeHtml(r.extra.empresaDetectada)}</dd></div>` : ''}
      </div>
      <div class="score">
        <span style="font-size:.8rem;color:var(--text-soft);font-weight:700;">Conformidade</span>
        <div class="score__bar" role="progressbar" aria-valuenow="${r.score}" aria-valuemin="0" aria-valuemax="100"><div class="score__fill" style="width:${r.score}%"></div></div>
        <span class="score__value">${r.score}%</span>
      </div>
    </div>`;

  const motivacaoHtml = `
    <div class="section motivacao" style="border-left:5px solid var(--brand-400);">
      <h3 class="section__title">⚖ Motivação do Enquadramento Legal</h3>
      <div class="motivacao-grid">
        <div class="motivacao-item"><dt>Modalidade Sugerida</dt><dd><span class="badge badge--${r.modalidade.cor}">${escapeHtml(r.modalidade.modalidade)}</span></dd></div>
        <div class="motivacao-item"><dt>Base Legal</dt><dd>${escapeHtml(r.modalidade.baseLegal)}</dd></div>
        <div class="motivacao-item motivacao-item--full"><dt>Motivação do Enquadramento</dt><dd>${escapeHtml(r.modalidade.motivo)}</dd></div>
      </div>
    </div>`;

  const requisitosHtml = r.requisitos.map(req => {
    let cls = 'req-row--ok', icone = '✓', sevCls = 'sev--ok', sevLabel = 'Conforme';
    if (!req.conforme) {
      icone = '!';
      if (req.severidade === 'alta') { cls = 'req-row--fail'; sevCls = 'sev--alta'; sevLabel = 'Alta'; }
      else if (req.severidade === 'media') { cls = 'req-row--warn'; sevCls = 'sev--media'; sevLabel = 'Média'; }
      else { cls = 'req-row--warn'; sevCls = 'sev--baixa'; sevLabel = 'Baixa'; }
    }
    return `<div class="req-row ${cls}"><div class="req-row__icon" aria-hidden="true">${icone}</div><div class="req-row__body"><div class="req-row__title">${escapeHtml(req.titulo)}</div><div class="req-row__desc">${escapeHtml(req.desc)}</div><div class="req-row__law">${escapeHtml(req.law)}</div></div><span class="req-row__sev ${sevCls}">${sevLabel}</span></div>`;
  }).join('');

  const naoConformes = r.requisitos.filter(x => !x.conforme);
  const alertasHtml = naoConformes.length === 0
    ? `<div class="alert alert--success"><div><div class="alert__title">✓ Nenhuma inconformidade identificada</div><div class="alert__text">A solicitação atende a todos os requisitos formais analisados.</div></div></div>`
    : naoConformes.map(item => {
        const tipo = item.severidade === 'alta' ? 'danger' : item.severidade === 'media' ? 'warning' : '';
        const titulo = item.severidade === 'alta' ? 'Inconformidade crítica' : item.severidade === 'media' ? 'Pendência relevante' : 'Recomendação';
        return `<div class="alert ${tipo ? 'alert--' + tipo : ''}"><div><div class="alert__title">${titulo}: ${escapeHtml(item.titulo)}</div><div class="alert__text">${escapeHtml(item.desc)}<br><strong>Fundamento:</strong> ${escapeHtml(item.law)}.</div></div></div>`;
      }).join('');

  const minuta = gerarMinuta(r);

  els.resultado.innerHTML = `
    ${alertaDirecionamentoHtml}
    ${veredictoHtml}
    ${motivacaoHtml}
    <div class="section">
      <h3 class="section__title">Observações técnicas complementares</h3>
      <p style="font-size:.86rem;color:var(--text-muted);margin-bottom:12px;">${escapeHtml(r.modalidade.descricao)}</p>
      <div class="alert"><div><div class="alert__title">Orientação técnica</div><div class="alert__text">${escapeHtml(r.modalidade.observacao)}</div></div></div>
    </div>
    <div class="section"><h3 class="section__title">Checklist de requisitos da instrução</h3><div class="req-table">${requisitosHtml}</div></div>
    <div class="section"><h3 class="section__title">Inconformidades e recomendações</h3><div class="alerts">${alertasHtml}</div></div>
    <div class="section">
      <h3 class="section__title">Minuta de resposta oficial (Devolutiva)</h3>
      <pre id="minutaTexto" class="minuta" aria-label="Minuta de despacho oficial">${escapeHtml(minuta)}</pre>
      <div class="minuta__actions">
        <button id="btnBaixarPDF" class="btn btn--secondary btn--sm" type="button">📄 Baixar Minuta em PDF</button>
        <button id="btnCopiar" class="btn btn--primary btn--sm" type="button">📋 Copiar Minuta</button>
        <button id="btnBaixar" class="btn btn--ghost btn--sm" type="button">⬇ Baixar .txt</button>
        <button id="btnImprimir" class="btn btn--ghost btn--sm" type="button">🖨 Imprimir</button>
      </div>
    </div>`;

  $('#btnBaixarPDF')?.addEventListener('click', gerarPDFDevolutiva);
  $('#btnCopiar')?.addEventListener('click', () => copiarTexto(minuta));
  $('#btnBaixar')?.addEventListener('click', () => baixarTxt(minuta));
  $('#btnImprimir')?.addEventListener('click', () => imprimirMinuta(minuta));
}

/* ============================================================
   MINUTA OFICIAL
   ============================================================ */
function gerarMinuta(r) {
  const d = r.dataAnalise;
  const dataFmt = d.toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' });
  const numDespacho = String(Math.floor(Math.random() * 900) + 100);
  const anoAtual = d.getFullYear();
  const orgao = (r.extra.orgao || 'ÓRGÃO / ENTIDADE PÚBLICA').toUpperCase();
  const unidade = r.extra.unidade || 'Unidade Requisitante';
  const processo = r.extra.processo || 'Expediente não identificado';
  const objeto = r.extra.objeto || (LABELS_NATUREZA[r.natureza] || 'Contratação pública');
  const valor = r.extra.valor > 0 ? formatarValorBR(r.extra.valor) : (r.extra.valorTexto || 'Não informado');
  const responsavel = r.extra.responsavel || '________________________________';
  const cargo = r.extra.cargo || 'Autoridade Competente';
  const empresa = r.extra.empresaDetectada || '';
  const pendentes = r.requisitos.filter(x => !x.conforme);
  const pendenciasTxt = pendentes.length === 0
    ? '    Não foram identificadas pendências formais.'
    : pendentes.map((p, i) => {
        const sev = p.severidade === 'alta' ? 'ALTA' : p.severidade === 'media' ? 'MÉDIA' : 'BAIXA';
        return `    ${i + 1}. [Severidade ${sev}] ${p.titulo}\n       Fundamento: ${p.law}\n       Providência: ${p.desc}`;
      }).join('\n\n');

  return `DESPACHO DE TRIAGEM E ENQUADRAMENTO LEGAL Nº ${numDespacho}/${anoAtual}

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
contratação encaminhada pela unidade requisitante, fundamentada na
Lei Federal nº 14.133/2021.

    Natureza preliminar: ${LABELS_NATUREZA[r.natureza] || r.natureza}.
    Valor estimado: ${valor}.

========================================================================
2. ENQUADRAMENTO E PARECER DA TRIAGEM
========================================================================

    SITUAÇÃO: ${r.parecer.status}
    Modalidade Sugerida: ${r.modalidade.modalidade}
    Base Legal: ${r.modalidade.baseLegal}
    Índice de Conformidade Formal: ${r.score}%

    MOTIVAÇÃO DO ENQUADRAMENTO:

${r.modalidade.motivo}

    FUNDAMENTAÇÃO DO PARECER:

${r.parecer.justificativa}

========================================================================
3. EXIGÊNCIAS E PENDÊNCIAS A SANAR
========================================================================

${pendenciasTxt}
${empresa && pendentes.some(p => p.id === 'direcionamento') ? `

    VEDAÇÃO AO DIRECIONAMENTO (Art. 41, I e Art. 5º):
    Constatou-se indicação direta da empresa "${empresa}", o que configura,
    em princípio, direcionamento vedado, salvo se fundamentado em
    inexigibilidade (Art. 74, III).
` : ''}
========================================================================
4. CONCLUSÃO E ENCAMINHAMENTO
========================================================================

    Diante do exposto, restituam-se os autos à unidade requisitante para
saneamento dos apontamentos do item 3, no prazo de 5 (cinco) dias úteis.

    Atenciosamente,

    _______________________________________________
    ${responsavel}
    ${cargo}
    ${orgao}

    ${ASSINATURA_PDF_LICITAREQ}
    Motor de regras — Lei nº 14.133/2021
`;
}

/* ============================================================
   AÇÕES DA MINUTA
   ============================================================ */
async function copiarTexto(texto) {
  try {
    if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(texto);
    else {
      const ta = document.createElement('textarea');
      ta.value = texto; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); document.body.removeChild(ta);
    }
    showToast('Minuta copiada.', 'success');
  } catch (e) { showToast('Não foi possível copiar.', 'error'); }
}

function baixarTxt(texto) {
  const blob = new Blob([texto], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const proc = (state.resultado?.extra.processo || 'sem-processo').replace(/[^\w.-]/g, '_');
  a.download = `Despacho_Triagem_${proc}.txt`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Arquivo baixado.', 'success');
}

function imprimirMinuta(texto) {
  const win = window.open('', '_blank', 'width=800,height=900');
  if (!win) { showToast('Bloqueio de pop-up detectado.', 'error'); return; }
  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8" /><title>Despacho de Triagem</title>
    <style>body{font-family:'Times New Roman',Georgia,serif;font-size:12pt;line-height:1.6;padding:40px;color:#000;max-width:800px;margin:0 auto;}pre{white-space:pre-wrap;font-family:inherit;font-size:12pt;}@media print{body{padding:20mm;}}</style></head>
    <body><pre>${escapeHtml(texto)}</pre><script>window.onload=()=>setTimeout(()=>window.print(),300);<\/script></body></html>`;
  win.document.write(html); win.document.close();
}

/* ============================================================
   EXPORTAÇÃO PDF — DESPACHO TIMBRADO (pdfMake)
   ============================================================ */
function gerarPDFDevolutiva() {
  const r = state.resultado;
  if (!r) { showToast('Realize uma análise antes de exportar o PDF.', 'error'); return; }
  if (!window.pdfMake) { showToast('pdfMake não carregado.', 'error'); return; }

  const d = r.dataAnalise || new Date();
  const dataFmt = d.toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' });
  const numeroDespacho = String(Math.floor(Math.random() * 900) + 100) + '/' + d.getFullYear();
  const orgao = (r.extra.orgao || 'Órgão / Entidade Pública').toUpperCase();
  const processo = r.extra.processo || 'Expediente não identificado';
  const unidade = r.extra.unidade || 'Unidade Requisitante';
  const objeto = r.extra.objeto || 'Contratação pública';
  const valorFmt = r.extra.valor > 0 ? formatarValorBR(r.extra.valor) : 'Não informado';
  const responsavel = r.extra.responsavel || '';
  const cargo = r.extra.cargo || 'Autoridade Competente';
  const empresa = r.extra.empresaDetectada || '';
  const naturezaTxt = LABELS_NATUREZA[r.natureza] || r.natureza;
  const deferido = r.parecer.classe === 'deferido';
  const statusColor = deferido ? '#059669' : '#dc2626';
  const scoreColor = r.score >= 80 ? '#10b981' : r.score >= 60 ? '#f59e0b' : '#ef4444';

  const pendentes = r.requisitos.filter(x => !x.conforme);
  const pendenciasBody = pendentes.length === 0
    ? [[{ text:'—', alignment:'center', color:'#94a3b8' }, { text:'Nenhuma pendência formal identificada.', italics:true, color:'#059669', colSpan:2 }, {}]]
    : pendentes.map(p => {
        const sev = (p.severidade || 'baixa').toUpperCase();
        const sevBg = sev === 'ALTA' ? '#fee2e2' : (sev === 'MÉDIA' || sev === 'MEDIA') ? '#fef3c7' : '#e0f2fe';
        const sevFg = sev === 'ALTA' ? '#991b1b' : (sev === 'MÉDIA' || sev === 'MEDIA') ? '#92400e' : '#075985';
        return [
          { text:sev, color:sevFg, fillColor:sevBg, bold:true, fontSize:8, alignment:'center' },
          { stack:[{ text:p.titulo, bold:true, fontSize:9 }, { text:p.desc, fontSize:8.5, color:'#475569', margin:[0,2,0,0] }] },
          { text:p.law, fontSize:7.5, color:'#0284c7', italics:true }
        ];
      });

  const docDefinition = {
    pageSize:'A4', pageMargins:[40, 60, 40, 60],
    defaultStyle:{ font:'Roboto', fontSize:10, color:'#1e293b', lineHeight:1.4 },
    header: (currentPage) => currentPage === 1 ? null : {
      margin:[40, 20, 40, 0],
      columns: [
        { text:'LicitaReq · Despacho de Triagem', fontSize:8, color:'#94a3b8' },
        { text:orgao, fontSize:8, color:'#94a3b8', alignment:'right' }
      ]
    },
    footer: (currentPage, pageCount) => ({
      margin:[40, 10, 40, 0],
      columns: [
        { text:ASSINATURA_PDF_LICITAREQ, fontSize:7.5, color:'#94a3b8' },
        { text:`Página ${currentPage} de ${pageCount}`, fontSize:7.5, color:'#94a3b8', alignment:'right' }
      ]
    }),
    content: [
      { columns:[
        { width:55, table:{ body:[[{ text:'LR', color:'white', bold:true, fontSize:22, alignment:'center', fillColor:'#6366f1', margin:[0, 8, 0, 8] }]] }, layout:'noBorders' },
        { width:'*', stack:[
          { text:orgao, fontSize:13, bold:true, color:'#0f172a' },
          { text:'SISTEMA DE TRIAGEM DE CONTRATAÇÕES PÚBLICAS', fontSize:8.5, color:'#64748b', characterSpacing:0.5 },
          { text:'Lei nº 14.133/2021  ·  Decreto nº 11.871/2024', fontSize:8, color:'#94a3b8', italics:true }
        ], margin:[14, 4, 0, 0] }
      ]},
      { canvas:[{ type:'line', x1:0, y1:0, x2:515, y2:0, lineWidth:1.5, lineColor:'#6366f1' }], margin:[0, 12, 0, 0] },
      { text:'DESPACHO DE TRIAGEM E ENQUADRAMENTO LEGAL', fontSize:12, bold:true, alignment:'center', color:'#0f172a', margin:[0, 16, 0, 2] },
      { text:`Nº ${numeroDespacho}  ·  ${dataFmt}`, fontSize:9, alignment:'center', color:'#64748b', margin:[0, 0, 0, 18] },
      { table:{
        widths:['32%', '68%'],
        body:[
          [{ text:'Processo / Expediente', style:'metaLabel' }, { text:processo, style:'metaValue' }],
          [{ text:'Unidade Requisitante', style:'metaLabel' }, { text:unidade, style:'metaValue' }],
          [{ text:'Objeto', style:'metaLabel' }, { text:objeto, style:'metaValue' }],
          [{ text:'Natureza do Objeto', style:'metaLabel' }, { text:naturezaTxt, style:'metaValue' }],
          [{ text:'Valor Estimado', style:'metaLabel' }, { text:valorFmt, style:'metaValue' }],
          [{ text:'Modalidade Sugerida', style:'metaLabel' }, { stack:[{ text:r.modalidade.modalidade, style:'metaValue' }, { text:r.modalidade.baseLegal, fontSize:8, color:'#64748b', italics:true, margin:[0, 2, 0, 0] }] }],
          [{ text:'Parecer da Triagem', style:'metaLabel' }, { text:r.parecer.status, color:statusColor, bold:true, fontSize:10.5 }],
          [{ text:'Índice de Conformidade', style:'metaLabel' }, { stack:[{ text:`${r.score}%`, bold:true, fontSize:12, color:scoreColor }, { canvas:[{ type:'rect', x:0, y:0, w:200, h:5, r:2.5, color:'#e2e8f0' }, { type:'rect', x:0, y:0, w:200 * r.score / 100, h:5, r:2.5, color:scoreColor }], margin:[0, 4, 0, 0] }] }],
          ...(empresa ? [[{ text:'Empresa mencionada', style:'metaLabel' }, { text:empresa, color:'#dc2626', bold:true, fontSize:10 }]] : [])
        ]
      }, layout:{ fillColor:(i) => i % 2 === 0 ? '#f8fafc' : '#ffffff', hLineWidth:(i, node) => (i === 0 || i === node.table.body.length) ? 1 : 0.5, vLineWidth:() => 0, hLineColor:() => '#e2e8f0', paddingTop:() => 8, paddingBottom:() => 8, paddingLeft:() => 10, paddingRight:() => 10 }, margin:[0, 0, 0, 20] },

      { text:'1. RESUMO EXECUTIVO', style:'sectionTitle' },
      { text:[ 'Trata-se de análise técnica e jurídica preliminar da solicitação de contratação encaminhada pela unidade requisitante, instruída nos autos do processo ', { text:processo, bold:true }, ', fundamentada na Lei Federal nº 14.133/2021.' ], style:'bodyText' },
      { text:[ 'Natureza preliminar: ', { text:naturezaTxt, bold:true }, '. Valor estimado: ', { text:valorFmt, bold:true }, '.' ], style:'bodyText' },

      { text:'2. ENQUADRAMENTO E MOTIVAÇÃO JURÍDICA', style:'sectionTitle' },
      { table:{ widths:['*'], body:[[{ stack:[
        { text:'MODALIDADE SUGERIDA', fontSize:8, bold:true, color:'#64748b', characterSpacing:0.5 },
        { text:r.modalidade.modalidade, fontSize:12, bold:true, color:'#0f172a', margin:[0, 3, 0, 10] },
        { text:'BASE LEGAL', fontSize:8, bold:true, color:'#64748b', characterSpacing:0.5 },
        { text:r.modalidade.baseLegal, fontSize:10, color:'#0284c7', bold:true, margin:[0, 3, 0, 10] },
        { text:'MOTIVAÇÃO DO ENQUADRAMENTO', fontSize:8, bold:true, color:'#64748b', characterSpacing:0.5 },
        { text:r.modalidade.motivo, fontSize:10, color:'#334155', margin:[0, 3, 0, 0], alignment:'justify' }
      ], margin:[12, 12, 12, 12], fillColor:'#f1f5f9' }]] }, layout:'noBorders', margin:[0, 0, 0, 20] },

      { text:'3. EXIGÊNCIAS E PENDÊNCIAS A SANAR', style:'sectionTitle' },
      { table:{
        headerRows:1, dontBreakRows:true, widths:['12%', '58%', '30%'],
        body:[
          [{ text:'GRAU', style:'tableHeader', alignment:'center' }, { text:'PENDÊNCIA', style:'tableHeader' }, { text:'FUNDAMENTO LEGAL', style:'tableHeader' }],
          ...pendenciasBody
        ]
      }, layout:{ fillColor:(i) => i === 0 ? '#1e293b' : null, hLineWidth:() => 0.5, vLineWidth:() => 0.5, hLineColor:() => '#cbd5e1', vLineColor:() => '#cbd5e1', paddingTop:() => 6, paddingBottom:() => 6, paddingLeft:() => 8, paddingRight:() => 8 }, margin:[0, 0, 0, 20] },

      { text:'4. CONCLUSÃO E ENCAMINHAMENTO', style:'sectionTitle' },
      { text: deferido ? 'Diante da conformidade formal verificada nos autos, OPINA-SE pelo DEFERIMENTO do prosseguimento instrucional, com elaboração do ETP e do TR/Projeto Básico.' : 'Diante do exposto, RESTITUAM-SE os autos à unidade requisitante para saneamento dos apontamentos do item 3, no prazo de 5 (cinco) dias úteis.', style:'bodyText' },
      { text:'Após a regularização, os autos deverão retornar a esta unidade de planejamento para prosseguimento da instrução processual.', style:'bodyText' },

      { table:{ dontBreakRows:true, widths:['*'], body:[[{ stack:[
        { text:' ', margin:[0, 20, 0, 0] },
        { canvas:[{ type:'line', x1:130, y1:0, x2:385, y2:0, lineWidth:0.8, lineColor:'#334155' }] },
        { text:responsavel || '____________________________', fontSize:10, bold:true, alignment:'center', margin:[0, 6, 0, 2] },
        { text:cargo, fontSize:9, alignment:'center', color:'#475569' },
        { text:orgao, fontSize:8.5, alignment:'center', color:'#64748b', italics:true, margin:[0, 2, 0, 0] }
      ], margin:[0, 10, 0, 10] }]] }, layout:'noBorders', margin:[0, 20, 0, 0] },

      { text:TAG_LICITAREQ_PDF, fontSize:7, color:'#94a3b8', alignment:'center', margin:[0, 20, 0, 0] }
    ],
    styles: {
      metaLabel: { fontSize:8.5, bold:true, color:'#475569' },
      metaValue: { fontSize:9.5, color:'#0f172a' },
      sectionTitle: { fontSize:11, bold:true, color:'#0f172a', margin:[0, 14, 0, 8] },
      bodyText: { fontSize:10, color:'#334155', lineHeight:1.5, margin:[0, 0, 0, 8], alignment:'justify' },
      tableHeader: { fontSize:8.5, bold:true, color:'#ffffff' }
    }
  };

  const procSafe = (processo || 'LicitaReq').replace(/[/\\?%*:|"<>]/g, '_');
  const filename = `Despacho_Triagem_${procSafe}_${d.getFullYear()}.pdf`;
  try { pdfMake.createPdf(docDefinition).download(filename); showToast('PDF gerado.', 'success'); }
  catch (err) { console.error('[LicitaReq]', err); showToast('Erro ao gerar PDF.', 'error'); }
}

/* ============================================================
   ★★★ MÓDULO DFD INTELIGENTE ★★★
   ============================================================ */

/* Mapeamento de campos do formulário */
const DFD_FIELDS = [
  'numero', 'data', 'unidade', 'responsavel', 'cargo', 'orgao',
  'objeto', 'justificativa', 'quantidades',
  'pcaPrevisto', 'pcaItem', 'pcaJustificativa',
  'modalidade', 'natureza', 'criterio', 'regime',
  'valor', 'metodo', 'dotacao', 'fonte',
  'parcelamento', 'prazo', 'local', 'pagamento',
  'fiscalTitular', 'fiscalSubstituto', 'gestor', 'vistoria',
  'observacoes'
];

const DFD_INPUTS = {
  numero: '#dfdNumero', data: '#dfdData', unidade: '#dfdUnidade', responsavel: '#dfdResponsavel',
  cargo: '#dfdCargo', orgao: '#dfdOrgao', objeto: '#dfdObjeto', justificativa: '#dfdJustificativa',
  quantidades: '#dfdQuantidades', pcaPrevisto: '#dfdPcaPrevisto', pcaItem: '#dfdPcaItem',
  pcaJustificativa: '#dfdPcaJustificativa', modalidade: '#dfdModalidade', natureza: '#dfdNatureza',
  criterio: '#dfdCriterio', regime: '#dfdRegime', valor: '#dfdValor', metodo: '#dfdMetodo',
  dotacao: '#dfdDotacao', fonte: '#dfdFonte', parcelamento: '#dfdParcelamento', prazo: '#dfdPrazo',
  local: '#dfdLocal', pagamento: '#dfdPagamento', fiscalTitular: '#dfdFiscalTitular',
  fiscalSubstituto: '#dfdFiscalSubstituto', gestor: '#dfdGestor', vistoria: '#dfdVistoria',
  observacoes: '#dfdObservacoes'
};

/* --- Leitura do formulário --- */
function lerDFDFormulario() {
  const dfd = {};
  DFD_FIELDS.forEach(f => {
    const el = $(DFD_INPUTS[f]);
    if (el) dfd[f] = (el.value || '').trim();
  });
  return dfd;
}

/* --- Preenchimento do formulário --- */
function preencherDFDFormulario(dfd) {
  DFD_FIELDS.forEach(f => {
    const el = $(DFD_INPUTS[f]);
    if (el && dfd[f] !== undefined) el.value = dfd[f];
  });
}

/* --- Regras de prontidão (o que a Lei 14.133/2021 exige) --- */
const DFD_REGRA_PRONTIDAO = [
  { campo:'numero',       peso:5,  label:'Nº do DFD' },
  { campo:'unidade',      peso:8,  label:'Unidade requisitante' },
  { campo:'responsavel',  peso:5,  label:'Responsável' },
  { campo:'objeto',       peso:10, label:'Objeto', valida:(v) => v.length >= 15 },
  { campo:'justificativa',peso:15, label:'Justificativa', valida:(v) => v.length >= 100 },
  { campo:'quantidades',  peso:6,  label:'Quantidades' },
  { campo:'pcaPrevisto',  peso:8,  label:'Alinhamento ao PCA' },
  { campo:'modalidade',   peso:8,  label:'Modalidade' },
  { campo:'natureza',     peso:8,  label:'Natureza do objeto' },
  { campo:'criterio',     peso:6,  label:'Critério de julgamento' },
  { campo:'valor',        peso:8,  label:'Valor estimado', valida:(v) => parseValorBR(v) > 0 },
  { campo:'metodo',       peso:5,  label:'Método de estimativa' },
  { campo:'dotacao',      peso:8,  label:'Dotação orçamentária' },
  { campo:'parcelamento', peso:4,  label:'Decisão de parcelamento' },
  { campo:'prazo',        peso:4,  label:'Prazo de execução' },
  { campo:'local',        peso:3,  label:'Local de entrega' },
  { campo:'pagamento',    peso:3,  label:'Condições de pagamento' },
  { campo:'fiscalTitular',peso:5,  label:'Fiscal titular' },
  { campo:'fiscalSubstituto',peso:3, label:'Fiscal substituto' },
  { campo:'gestor',       peso:3,  label:'Gestor do contrato' },
];

function calcularProntidaoDFD() {
  const dfd = lerDFDFormulario();
  let total = 0, obtido = 0;
  const faltantes = [];

  DFD_REGRA_PRONTIDAO.forEach(r => {
    total += r.peso;
    const valor = dfd[r.campo] || '';
    let preenchido = valor.length > 0;
    if (preenchido && typeof r.valida === 'function') preenchido = r.valida(valor);
    if (preenchido) obtido += r.peso;
    else faltantes.push(r.label);
  });

  const pct = Math.round((obtido / total) * 100);
  const nivel = pct >= 90 ? 'alto' : pct >= 60 ? 'medio' : 'baixo';

  /* Campos sensíveis por modalidade */
  if (dfd.modalidade === 'concorrencia' && !dfd.regime && dfd.natureza === 'obras') {
    faltantes.push('Regime de execução (obras)');
  }
  if (dfd.natureza === 'obras' && !dfd.metodo) {
    faltantes.push('Referência SINAPI/SICRO');
  }
  if (dfd.modalidade === 'inexigibilidade' && !dfd.justificativa.includes('notória')) {
    // apenas hint
  }

  return { pct, nivel, faltantes };
}

function renderProntidaoDFD() {
  const { pct, nivel, faltantes } = calcularProntidaoDFD();
  const val = $('#prontidaoValor');
  const bar = $('#prontidaoBar');
  const fill = $('#prontidaoFill');
  const hint = $('#prontidaoHint');
  const wrap = $('.prontidao');

  if (val) val.textContent = pct + '%';
  if (bar) bar.setAttribute('aria-valuenow', pct);
  if (fill) fill.style.width = pct + '%';
  if (wrap) wrap.setAttribute('data-nivel', nivel);

  if (hint) {
    if (pct === 100) hint.textContent = '✅ DFD completo e pronto para geração e auditoria.';
    else if (faltantes.length === 0) hint.textContent = `Prontidão ${pct}% — refinamentos opcionais podem elevar ainda mais o índice.`;
    else hint.textContent = `Faltam preencher: ${faltantes.slice(0, 4).join(', ')}${faltantes.length > 4 ? ` (+${faltantes.length - 4})` : ''}.`;
  }
}

/* --- Bind do formulário --- */
function bindFormDFD() {
  /* Atualiza prontidão ao digitar/mudar */
  DFD_FIELDS.forEach(f => {
    const el = $(DFD_INPUTS[f]);
    if (!el) return;
    el.addEventListener('input', () => { state.dfd = lerDFDFormulario(); renderProntidaoDFD(); });
    el.addEventListener('change', () => { state.dfd = lerDFDFormulario(); renderProntidaoDFD(); });
  });

  /* Contador da justificativa */
  const justEl = $('#dfdJustificativa');
  const justCount = $('#dfdJustCount');
  if (justEl && justCount) {
    const upd = () => { justCount.textContent = justEl.value.length; };
    justEl.addEventListener('input', upd);
    upd();
  }

  /* Botões */
  $('#btnDfdGerarPDF')?.addEventListener('click', gerarDFDPdf);
  $('#btnDfdSalvarJSON')?.addEventListener('click', salvarDFDJSON);
  $('#btnDfdCarregarExemplo')?.addEventListener('click', carregarExemploDFD);
  $('#btnDfdLimpar')?.addEventListener('click', limparDFD);
}

/* --- Validação para PDF --- */
function validarDFDParaPDF(dfd) {
  const erros = [];
  if (!dfd.objeto || dfd.objeto.length < 15) erros.push('Objeto deve ter pelo menos 15 caracteres.');
  if (!dfd.justificativa || dfd.justificativa.length < 100) erros.push('Justificativa deve ter pelo menos 100 caracteres.');
  if (!dfd.unidade) erros.push('Unidade requisitante é obrigatória.');
  if (!dfd.modalidade) erros.push('Modalidade é obrigatória.');
  if (!dfd.natureza) erros.push('Natureza do objeto é obrigatória.');
  if (!dfd.criterio) erros.push('Critério de julgamento é obrigatório.');
  if (!dfd.valor || parseValorBR(dfd.valor) <= 0) erros.push('Valor estimado deve ser maior que zero.');
  if (!dfd.dotacao) erros.push('Dotação orçamentária é obrigatória.');
  if (!dfd.pcaPrevisto) erros.push('Alinhamento ao PCA é obrigatório (Art. 12, VII).');
  return erros;
}

/* ============================================================
   ★ GERADOR DO PDF DFD ROTULADO PARA LICITAAUDIT ★
   ============================================================ */
function gerarDFDPdf() {
  const dfd = lerDFDFormulario();

  const erros = validarDFDParaPDF(dfd);
  if (erros.length) {
    showToast('Corrija antes de gerar o PDF: ' + erros[0], 'error');
    return;
  }
  if (!window.pdfMake) { showToast('pdfMake não carregado.', 'error'); return; }

  /* Determina modalidade/natureza/critério legíveis */
  const LBL_MOD = {
    pregao:'Pregão Eletrônico', concorrencia:'Concorrência', concurso:'Concurso',
    leilao:'Leilão', dialogo:'Diálogo Competitivo',
    dispensa:'Dispensa de Licitação', inexigibilidade:'Inexigibilidade de Licitação'
  };
  const LBL_NAT = {
    bens:'Bens comuns', 'servicos-comuns':'Serviços comuns', 'servicos-especiais':'Serviços especiais',
    obras:'Obras e serviços de engenharia', intelectual:'Serviços técnicos intelectuais',
    alienacao:'Alienação de bens / Concessão'
  };
  const LBL_CRIT = {
    'menor-preco':'Menor preço', 'maior-desconto':'Maior desconto',
    'melhor-tecnica':'Melhor técnica ou conteúdo artístico',
    'tecnica-preco':'Técnica e preço', 'maior-lance':'Maior lance',
    'maior-retorno':'Maior retorno econômico'
  };
  const LBL_PCA = {
    sim:'Contratação prevista no PCA',
    nao:'Inclusão extraordinária no PCA',
    revisao:'Contratação em revisão no PCA'
  };
  const LBL_PARC = {
    parcelado:'Parcelado em lotes (Art. 47)',
    indivisivel:'Indivisível (Art. 47)',
    'lote-unico':'Lote único por compatibilidade técnica (Art. 47)'
  };
  const LBL_PGTO = {
    '30-dias':'Até 30 dias após NF e aceite (Art. 141)',
    'parcelado-mensal':'Mensal, mediante medição',
    'entrega-unica':'Pagamento único contra entrega'
  };
  const LBL_VIST = {
    dispensada:'Dispensada (não aplicável)',
    'declaracao-substituicao':'Declaração em substituição (Art. 63)',
    obrigatoria:'Obrigatória (com justificativa técnica)'
  };

  const modalidadeTxt = LBL_MOD[dfd.modalidade] || dfd.modalidade;
  const naturezaTxt   = LBL_NAT[dfd.natureza] || dfd.natureza;
  const criterioTxt   = LBL_CRIT[dfd.criterio] || dfd.criterio;
  const pcaTxt        = LBL_PCA[dfd.pcaPrevisto] || dfd.pcaPrevisto;
  const parcelTxt     = LBL_PARC[dfd.parcelamento] || dfd.parcelamento || 'Não declarado';
  const pgtoTxt       = LBL_PGTO[dfd.pagamento] || dfd.pagamento || 'Não declarado';
  const vistoriaTxt   = LBL_VIST[dfd.vistoria] || dfd.vistoria || 'Não declarado';

  const valorNum = parseValorBR(dfd.valor);
  const valorFmt = formatarValorBR(valorNum) || dfd.valor;
  const dataFmt = dfd.data
    ? new Date(dfd.data + 'T12:00:00').toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' })
    : new Date().toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' });

  const numeroDFD = dfd.numero || `DFD-${Date.now().toString().slice(-6)}`;

  /* ---------- PDF DEFINITION ---------- */
  const docDefinition = {
    pageSize: 'A4',
    pageMargins: [40, 50, 40, 50],
    defaultStyle: { font: 'Roboto', fontSize: 9.5, color: '#1e293b', lineHeight: 1.4 },

    header: (currentPage) => currentPage === 1 ? {
  margin: [40, 20, 40, 0],
  columns: [
    { text: 'SISTEMA LICITAREQ · DFD OFICIAL', fontSize: 8, bold: true, color: '#4338ca' },
    { text: 'Lei nº 14.133/2021', fontSize: 8, color: '#64748b', alignment: 'right' }
  ]
} : {
  margin: [40, 20, 40, 0],
  columns: [
    { text: `DFD ${numeroDFD}`, fontSize: 8, color: '#94a3b8' },
    { text: dfd.orgao || 'LicitaReq', fontSize: 8, color: '#94a3b8', alignment: 'right' }
  ]
},
    footer: (currentPage, pageCount) => ({
      margin: [40, 20, 40, 0],
      columns: [
        { text: 'Gerado via LicitaReq · Compatível com LicitaAudit (Lei 14.133/21)', fontSize: 8, color: '#94a3b8' },
        { text: `Página ${currentPage} de ${pageCount}`, alignment: 'right', fontSize: 8, color: '#94a3b8' }
      ]
    }),

    content: [
      /* ---------- CAPA ---------- */
      {
        table: { widths: ['*'], body: [[{
          text: 'DOCUMENTO DE FORMALIZAÇÃO DE DEMANDA (DFD)',
          fillColor: '#4338ca', color: '#ffffff', fontSize: 13, bold: true,
          alignment: 'center', margin: [0, 10, 0, 10]
        }]] }, layout: 'noBorders', margin: [0, 0, 0, 4]
      },
      {
        text: `Nº ${numeroDFD}  ·  ${dataFmt}`,
        fontSize: 9, alignment: 'center', color: '#64748b', margin: [0, 0, 0, 16]
      },

      /* ---------- IDENTIFICAÇÃO ---------- */
      { text: '1. IDENTIFICAÇÃO', style: 'sectionTitle' },
      {
        table: {
          widths: ['32%', '68%'],
          body: [
            [ { text: 'Órgão / Entidade', style: 'metaLabel' }, { text: dfd.orgao || 'Universidade de Taubaté (UNITAU)', style: 'metaValue' } ],
            [ { text: 'Unidade Requisitante', style: 'metaLabel' }, { text: dfd.unidade || '—', style: 'metaValue' } ],
            [ { text: 'Responsável', style: 'metaLabel' }, { text: (dfd.responsavel || '—') + (dfd.cargo ? ' — ' + dfd.cargo : ''), style: 'metaValue' } ],
            [ { text: 'Nº do DFD', style: 'metaLabel' }, { text: numeroDFD, style: 'metaValue' } ]
          ]
        },
        layout: {
          hLineWidth: () => 0.5, vLineWidth: () => 0, hLineColor: () => '#e2e8f0',
          paddingTop: () => 6, paddingBottom: () => 6, paddingLeft: () => 10, paddingRight: () => 10,
          fillColor: (i) => i % 2 === 0 ? '#f8fafc' : null
        },
        margin: [0, 0, 0, 16]
      },

      /* ---------- OBJETO E JUSTIFICATIVA ---------- */
      { text: '2. OBJETO E JUSTIFICATIVA (Art. 18, §1º, I e II)', style: 'sectionTitle' },
      { text: 'Objeto:', style: 'miniLabel' },
      { text: dfd.objeto, fontSize: 10, color: '#0f172a', margin: [0, 3, 0, 8] },
      { text: 'Justificativa da necessidade pública:', style: 'miniLabel' },
      { text: dfd.justificativa, fontSize: 9.5, color: '#334155', margin: [0, 3, 0, 8], alignment: 'justify', lineHeight: 1.5 },
      dfd.quantidades ? { text: 'Estimativa de quantidades:', style: 'miniLabel' } : { text: '' },
      dfd.quantidades ? { text: dfd.quantidades, fontSize: 9.5, color: '#334155', margin: [0, 3, 0, 12], alignment: 'justify' } : { text: '' },

      /* ---------- PCA ---------- */
      { text: '3. ALINHAMENTO AO PLANO DE CONTRATAÇÕES ANUAL — PCA (Art. 12, VII)', style: 'sectionTitle' },
      { text: [
        { text: 'Situação: ', bold: true, color: '#475569' },
        { text: pcaTxt, color: '#0f172a' },
        dfd.pcaItem ? { text: `  ·  Item: ${dfd.pcaItem}`, color: '#4338ca', bold: true } : { text: '' }
      ], fontSize: 9.5, margin: [0, 0, 0, 6] },
      dfd.pcaJustificativa
        ? { text: dfd.pcaJustificativa, fontSize: 9, color: '#475569', italics: true, margin: [0, 0, 0, 12], alignment: 'justify' }
        : { text: '', margin: [0, 0, 0, 12] },

      /* ---------- ENQUADRAMENTO ---------- */
      { text: '4. ENQUADRAMENTO LEGAL (Arts. 28, 6º e 33)', style: 'sectionTitle' },
      {
        table: {
          widths: ['50%', '50%'],
          body: [
            [ { text: 'Modalidade Pretendida', style: 'metaLabel' }, { text: 'Base legal', style: 'metaLabel' } ],
            [ { text: modalidadeTxt, style: 'metaValueBig', color: '#4338ca' }, { text: 'Art. 28 — Lei 14.133/2021', fontSize: 9, color: '#64748b' } ],
            [ { text: 'Natureza do Objeto', style: 'metaLabel' }, { text: 'Critério de Julgamento', style: 'metaLabel' } ],
            [ { text: naturezaTxt, style: 'metaValueBig' }, { text: criterioTxt, style: 'metaValueBig' } ],
            dfd.regime
              ? [ { text: 'Regime de Execução', style: 'metaLabel' }, { text: 'Nº do DFD', style: 'metaLabel' } ]
              : [ { text: '', style: 'metaLabel' }, { text: '', style: 'metaLabel' } ],
            dfd.regime
              ? [ { text: dfd.regime, style: 'metaValue' }, { text: numeroDFD, style: 'metaValue' } ]
              : [ { text: '', style: 'metaValue' }, { text: '', style: 'metaValue' } ]
          ]
        },
        layout: {
          hLineWidth: () => 0.5, vLineWidth: () => 0.5,
          hLineColor: () => '#e2e8f0', vLineColor: () => '#e2e8f0',
          paddingTop: () => 6, paddingBottom: () => 6, paddingLeft: () => 8, paddingRight: () => 8
        },
        margin: [0, 0, 0, 16]
      },

      /* ---------- ORÇAMENTO ---------- */
      { text: '5. ESTIMATIVA ORÇAMENTÁRIA (Arts. 23 e 150)', style: 'sectionTitle' },
      {
        table: {
          widths: ['32%', '68%'],
          body: [
            [ { text: 'Valor Estimado', style: 'metaLabel' }, { text: valorFmt, style: 'metaValueBig', color: '#059669' } ],
            [ { text: 'Método de Estimativa', style: 'metaLabel' }, { text: dfd.metodo || '—', style: 'metaValue' } ],
            [ { text: 'Dotação Orçamentária', style: 'metaLabel' }, { text: dfd.dotacao || '—', style: 'metaValue' } ],
            [ { text: 'Fonte de Recurso', style: 'metaLabel' }, { text: dfd.fonte || '—', style: 'metaValue' } ]
          ]
        },
        layout: {
          hLineWidth: () => 0.5, vLineWidth: () => 0, hLineColor: () => '#e2e8f0',
          paddingTop: () => 6, paddingBottom: () => 6, paddingLeft: () => 10, paddingRight: () => 10,
          fillColor: (i) => i % 2 === 0 ? '#f8fafc' : null
        },
        margin: [0, 0, 0, 16]
      },

      /* ---------- PARCELAMENTO / ENTREGA ---------- */
      { text: '6. PARCELAMENTO, PRAZO E ENTREGA (Art. 47)', style: 'sectionTitle' },
      {
        table: {
          widths: ['32%', '68%'],
          body: [
            [ { text: 'Parcelamento', style: 'metaLabel' }, { text: parcelTxt, style: 'metaValue' } ],
            [ { text: 'Prazo de Execução', style: 'metaLabel' }, { text: dfd.prazo || '—', style: 'metaValue' } ],
            [ { text: 'Local de Entrega', style: 'metaLabel' }, { text: dfd.local || '—', style: 'metaValue' } ],
            [ { text: 'Condições de Pagamento', style: 'metaLabel' }, { text: pgtoTxt, style: 'metaValue' } ]
          ]
        },
        layout: {
          hLineWidth: () => 0.5, vLineWidth: () => 0, hLineColor: () => '#e2e8f0',
          paddingTop: () => 6, paddingBottom: () => 6, paddingLeft: () => 10, paddingRight: () => 10,
          fillColor: (i) => i % 2 === 0 ? '#f8fafc' : null
        },
        margin: [0, 0, 0, 16]
      },

      /* ---------- FISCALIZAÇÃO ---------- */
      { text: '7. FISCALIZAÇÃO E GESTÃO CONTRATUAL (Art. 117)', style: 'sectionTitle' },
      {
        table: {
          widths: ['32%', '68%'],
          body: [
            [ { text: 'Fiscal Titular', style: 'metaLabel' }, { text: dfd.fiscalTitular || '—', style: 'metaValue' } ],
            [ { text: 'Fiscal Substituto', style: 'metaLabel' }, { text: dfd.fiscalSubstituto || '—', style: 'metaValue' } ],
            [ { text: 'Gestor do Contrato', style: 'metaLabel' }, { text: dfd.gestor || '—', style: 'metaValue' } ],
            [ { text: 'Vistoria Técnica', style: 'metaLabel' }, { text: vistoriaTxt, style: 'metaValue' } ]
          ]
        },
        layout: {
          hLineWidth: () => 0.5, vLineWidth: () => 0, hLineColor: () => '#e2e8f0',
          paddingTop: () => 6, paddingBottom: () => 6, paddingLeft: () => 10, paddingRight: () => 10,
          fillColor: (i) => i % 2 === 0 ? '#f8fafc' : null
        },
        margin: [0, 0, 0, 16]
      },

      /* ---------- OBSERVAÇÕES ---------- */
      dfd.observacoes ? { text: '8. OBSERVAÇÕES COMPLEMENTARES', style: 'sectionTitle' } : { text: '' },
      dfd.observacoes ? { text: dfd.observacoes, fontSize: 9, color: '#334155', margin: [0, 0, 0, 16], alignment: 'justify' } : { text: '' },

      /* ---------- ASSINATURA ---------- */
      { text: '9. APROVAÇÃO E VALIDAÇÃO', style: 'sectionTitle' },
      {
        table: { widths: ['*'], body: [[{
          stack: [
            { text: ' ', margin: [0, 18, 0, 0] },
            { canvas: [{ type: 'line', x1: 130, y1: 0, x2: 385, y2: 0, lineWidth: 0.8, lineColor: '#334155' }] },
            { text: dfd.responsavel || '______________________________', fontSize: 10, bold: true, alignment: 'center', margin: [0, 6, 0, 2] },
            { text: dfd.cargo || 'Responsável pela Demanda', fontSize: 9, alignment: 'center', color: '#475569' },
            { text: dfd.orgao || 'Universidade de Taubaté (UNITAU)', fontSize: 8.5, alignment: 'center', color: '#64748b', italics: true, margin: [0, 2, 0, 20] },
            { canvas: [{ type: 'line', x1: 130, y1: 0, x2: 385, y2: 0, lineWidth: 0.8, lineColor: '#334155' }] },
            { text: '________________________________', fontSize: 10, bold: true, alignment: 'center', margin: [0, 6, 0, 2] },
            { text: 'ORDENADOR DE DESPESAS', fontSize: 9, alignment: 'center', color: '#475569' },
            { text: 'Aprovação institucional — LicitaReq', fontSize: 8.5, alignment: 'center', color: '#64748b', italics: true, margin: [0, 2, 0, 0] }
          ], margin: [0, 6, 0, 6]
        }]] },
        layout: 'noBorders',
        margin: [0, 0, 0, 20]
      },

      /* ---------- TAG DE AUTENTICAÇÃO (reconhecida pelo LicitaAudit) ---------- */
      {
        table: { widths: ['*'], body: [[{
          stack: [
            { text: 'TAG DE AUTENTICAÇÃO E INTEROPERABILIDADE', fontSize: 7.5, bold: true, color: '#4338ca', alignment: 'center', characterSpacing: 0.6 },
            { text: TAG_LICITAREQ_PDF, fontSize: 8.5, bold: true, color: '#4338ca', alignment: 'center', margin: [0, 4, 0, 4] },
            { text: ASSINATURA_PDF_LICITAREQ, fontSize: 7.5, italics: true, color: '#64748b', alignment: 'center' },
            { text: 'Documento de Formalização de Demanda (DFD) — Motor de regras Lei nº 14.133/2021', fontSize: 7, color: '#94a3b8', alignment: 'center', margin: [0, 3, 0, 0] }
          ], fillColor: '#eef2ff', margin: [10, 8, 10, 8]
        }]] },
        layout: {
          hLineWidth: () => 0.5, vLineWidth: () => 0.5,
          hLineColor: () => '#c7d2fe', vLineColor: () => '#c7d2fe'
        },
        margin: [0, 0, 0, 0]
      }
    ],

    styles: {
      sectionTitle: { fontSize: 11, bold: true, color: '#4338ca', margin: [0, 4, 0, 8], characterSpacing: 0.4, keepWithNext: true },
      metaLabel: { fontSize: 8.5, bold: true, color: '#475569' },
      metaValue: { fontSize: 9.5, color: '#0f172a' },
      metaValueBig: { fontSize: 11, bold: true, color: '#0f172a' },
      miniLabel: { fontSize: 8.5, bold: true, color: '#64748b', margin: [0, 6, 0, 0], characterSpacing: 0.4, textTransform: 'uppercase' }
    }
  };

  const safeName = `LicitaReq_DFD_${numeroDFD.replace(/[^\w-]/g, '_')}_${dfd.data || new Date().toISOString().slice(0, 10)}.pdf`;
  try {
    pdfMake.createPdf(docDefinition).download(safeName);
    showToast(`PDF DFD gerado: ${safeName}`, 'success');
  } catch (err) {
    console.error('[LicitaReq] Erro ao gerar DFD PDF:', err);
    showToast('Erro ao gerar o PDF DFD.', 'error');
  }
}

/* ============================================================
   PERSISTÊNCIA DO DFD
   ============================================================ */
function salvarDFDJSON() {
  const dfd = lerDFDFormulario();
  const payload = {
    ferramenta: 'LicitaReq',
    versao: '1.3.0',
    tipo: 'DFD',
    tag: TAG_LICITAREQ_PDF,
    exportadoEm: new Date().toISOString(),
    dfd
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `LicitaReq_DFD_${(dfd.numero || Date.now()).toString().replace(/[^\w-]/g, '_')}.json`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('DFD salvo em JSON.', 'success');
}

/* ============================================================
   EXEMPLO DFD
   ============================================================ */
function carregarExemploDFD() {
  const exemplo = {
    numero: 'DFD 042/2026',
    data: new Date().toISOString().slice(0, 10),
    unidade: 'Diretoria de Tecnologia da Informação (TI)',
    responsavel: 'Maria Souza',
    cargo: 'Diretora de Tecnologia da Informação',
    orgao: 'Universidade de Taubaté (UNITAU)',
    objeto: 'Aquisição de Workstations e Notebooks para modernização do parque tecnológico',
    justificativa: 'A presente demanda visa modernizar o parque tecnológico da UNITAU, garantindo a continuidade, a segurança e a eficiência dos serviços prestados à comunidade acadêmica. O parque atual apresenta obsolescência técnica, com equipamentos fora do período de garantia e com desempenho insuficiente para as demandas atuais de pesquisa, ensino e extensão. A renovação contribuirá diretamente para a melhoria do desempenho dos serviços de TI, redução de custos com manutenção corretiva e adequação às normas de segurança da informação.',
    quantidades: '30 (trinta) workstations e 20 (vinte) notebooks',
    pcaPrevisto: 'sim',
    pcaItem: 'PCA-2026-ITEM-042',
    pcaJustificativa: 'A contratação está expressamente prevista no Plano de Contratações Anual de 2026, no item 042, vinculada à ação de modernização da infraestrutura de TI.',
    modalidade: 'pregao',
    natureza: 'bens',
    criterio: 'menor-preco',
    regime: '',
    valor: '165.000,00',
    metodo: 'painel-precos',
    dotacao: 'PT 12.345.6789.0001 — ND 33.90.30',
    fonte: '01 — Tesouro',
    parcelamento: 'parcelado',
    prazo: '12 meses, contados da assinatura do contrato',
    local: 'Almoxarifado Central — Campus UNITAU',
    pagamento: '30-dias',
    fiscalTitular: 'João Silva — matrícula 12345',
    fiscalSubstituto: 'Ana Souza — matrícula 67890',
    gestor: 'Carlos Pereira — Divisão de Contratos',
    vistoria: 'declaracao-substituicao',
    observacoes: 'Os equipamentos deverão ser entregues com garantia de 36 meses on-site. Treinamento operacional incluído para equipe de TI.'
  };
  preencherDFDFormulario(exemplo);
  state.dfd = exemplo;
  renderProntidaoDFD();
  showToast('Exemplo de DFD carregado.', 'success');
}

function limparDFD() {
  if (!confirm('Limpar todos os campos do DFD?')) return;
  const vazio = criarEstadoDFD();
  preencherDFDFormulario(vazio);
  state.dfd = vazio;
  renderProntidaoDFD();
  showToast('Formulário DFD limpo.', 'success');
}

/* ============================================================
   EXEMPLO E LIMPEZA (triagem)
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
da infraestrutura tecnológica desta Diretoria.

3. O valor estimado da contratação é de R$ 85.000,00 (oitenta e cinco mil
reais), conforme pesquisa de preços realizada junto a fornecedores do ramo.

4. Informamos que há dotação orçamentária específica prevista na Lei
Orçamentária Anual para o exercício corrente.

5. O prazo de execução dos serviços é de 6 (seis) meses.

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
  const status = $('#resultado-status');
  if (status) status.textContent = '';
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

  /* Inicializa DFD */
  bindFormDFD();
  preencherDFDFormulario(state.dfd);
  renderProntidaoDFD();

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
