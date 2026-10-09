/* ============================================================
   LicitaReq — app.js
   v4.0 — OmniLicit · SHA-256 · PDF v5.0
   ============================================================ */
'use strict';

const LS_KEYS = {
  TEMA:        'licitareq-tema',
  ORG:         'licitareq-org',
  LOGO:        'licitareq-logo',
  DFD:         'licitareq-dfd',
  APROVADORES: 'licitareq-aprovadores',
};

const $  = (sel, ctx) => (ctx || document).querySelector(sel);
const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));

function escapeHTML(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
const escapeAttrHTML = escapeHTML;

function debounce(fn, ms) {
  let t;
  return function () {
    const args = arguments, ctx = this;
    clearTimeout(t);
    t = setTimeout(() => fn.apply(ctx, args), ms);
  };
}
function formatarTamanho(bytes) {
  if (!bytes && bytes !== 0) return '—';
  const u = ['B', 'KB', 'MB', 'GB'];
  let i = 0, n = bytes;
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
  return n.toFixed(n < 10 && i > 0 ? 1 : 0) + ' ' + u[i];
}

/* ==============================================================
   TOAST
   ============================================================== */
let _toastTimer = null;
function toast(msg, tipo) {
  const el = $('#toast');
  if (!el) return;
  el.textContent = msg;
  el.className = 'toast';
  if (tipo === 'success') el.classList.add('toast--success');
  if (tipo === 'error')   el.classList.add('toast--error');
  el.hidden = false;
  requestAnimationFrame(() => el.classList.add('is-visible'));
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => {
    el.classList.remove('is-visible');
    setTimeout(() => { el.hidden = true; }, 350);
  }, 3200);
}

/* ==============================================================
   TEMA
   ============================================================== */
function aplicarTema(t) {
  document.documentElement.setAttribute('data-theme', t);
  const btn = $('#themeToggle');
  if (btn) {
    const isDark = t === 'dark';
    btn.setAttribute('aria-pressed', String(isDark));
    btn.setAttribute('aria-label', isDark ? 'Alternar para o tema claro' : 'Alternar para o tema escuro');
    const icon = btn.querySelector('.theme-icon');
    const lbl  = btn.querySelector('.theme-label');
    if (icon) icon.textContent = isDark ? '☀️' : '🌙';
    if (lbl)  lbl.textContent  = isDark ? 'Modo claro' : 'Modo escuro';
  }
  try { localStorage.setItem(LS_KEYS.TEMA, t); } catch (_) {}
}
function initTema() {
  let t = 'dark';
  try { t = localStorage.getItem(LS_KEYS.TEMA) || 'dark'; } catch (_) {}
  aplicarTema(t);
  const btn = $('#themeToggle');
  if (btn) {
    btn.addEventListener('click', () => {
      const atual = document.documentElement.getAttribute('data-theme') || 'dark';
      aplicarTema(atual === 'dark' ? 'light' : 'dark');
    });
  }
}

/* ==============================================================
   APROVADORES
   ============================================================== */
const stateAprovadores = { itens: [] };
let _uidAprov = 0;
const uidAprov = () => 'apr_' + Date.now().toString(36) + '_' + (++_uidAprov);

function adicionarAprovador(dados) {
  dados = dados || {};
  stateAprovadores.itens.push({
    id: uidAprov(),
    nome:  dados.nome  || '',
    cargo: dados.cargo || '',
    orgao: dados.orgao || '',
    papel: dados.papel || 'aprovador',
  });
  renderizarAprovadores();
  salvarAprovadoresLocal();
}
function removerAprovador(id) {
  stateAprovadores.itens = stateAprovadores.itens.filter(a => a.id !== id);
  renderizarAprovadores();
  salvarAprovadoresLocal();
}
function atualizarAprovador(id, campo, valor) {
  const a = stateAprovadores.itens.find(x => x.id === id);
  if (a) a[campo] = valor;
}
function getAprovadoresValidos() {
  return stateAprovadores.itens
    .filter(a => a.nome && a.nome.trim())
    .map(a => ({ nome: a.nome.trim(), cargo: a.cargo.trim(), orgao: a.orgao.trim(), papel: a.papel }));
}
function salvarAprovadoresLocal() {
  try { localStorage.setItem(LS_KEYS.APROVADORES, JSON.stringify(stateAprovadores.itens)); } catch (_) {}
}
function carregarAprovadoresLocal() {
  try {
    const raw = localStorage.getItem(LS_KEYS.APROVADORES);
    if (!raw) return;
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) {
      stateAprovadores.itens = arr.map(a => ({
        id: a.id || uidAprov(),
        nome: a.nome || '', cargo: a.cargo || '', orgao: a.orgao || '', papel: a.papel || 'aprovador',
      }));
    }
  } catch (_) {}
}
function renderizarAprovadores() {
  const host = $('#aprovadoresList');
  const cont = $('#aprovadoresContador');
  if (!host) return;
  if (cont) cont.textContent = String(stateAprovadores.itens.length);

  if (!stateAprovadores.itens.length) {
    host.innerHTML = '<p class="aprovadores__empty">Nenhum aprovador adicionado. Clique em <strong>"Adicionar aprovador"</strong> para incluir os responsáveis pela validação deste DFD.</p>';
    return;
  }
  const papeis = (window.LicitaReqPDF && window.LicitaReqPDF.ROTULOS.papel) || {
    aprovador: 'Aprovador', validador: 'Validador', autoridade: 'Autoridade Competente',
    fiscal: 'Fiscal do Contrato', gestor: 'Gestor do Contrato', requisitante: 'Requisitante',
  };
  host.innerHTML = stateAprovadores.itens.map((a, i) => {
    const opts = Object.keys(papeis).map(v => {
      const sel = v === a.papel ? ' selected' : '';
      return '<option value="' + v + '"' + sel + '>' + escapeHTML(papeis[v]) + '</option>';
    }).join('');
    return (
      '<div class="aprovador" data-id="' + a.id + '">' +
        '<div class="aprovador__num">' + String(i + 1).padStart(2, '0') + '</div>' +
        '<div class="aprovador__grid">' +
          '<label class="field"><span class="field__label">Nome completo</span>' +
            '<input class="input" data-campo="nome" value="' + escapeAttrHTML(a.nome) + '" placeholder="Ex.: Maria Souza" /></label>' +
          '<label class="field"><span class="field__label">Cargo / Função</span>' +
            '<input class="input" data-campo="cargo" value="' + escapeAttrHTML(a.cargo) + '" placeholder="Ex.: Diretora de TI" /></label>' +
          '<label class="field"><span class="field__label">Órgão / Setor</span>' +
            '<input class="input" data-campo="orgao" value="' + escapeAttrHTML(a.orgao) + '" placeholder="Ex.: Secretaria de Administração" /></label>' +
          '<label class="field"><span class="field__label">Papel</span>' +
            '<select class="input" data-campo="papel">' + opts + '</select></label>' +
        '</div>' +
        '<button type="button" class="aprovador__remove" data-remove="' + a.id + '" aria-label="Remover aprovador">✕ Remover</button>' +
      '</div>'
    );
  }).join('');
}
function ligarEventosAprovadores() {
  const host = $('#aprovadoresList');
  if (!host || host.dataset.bound === '1') return;
  host.dataset.bound = '1';

  host.addEventListener('input', e => {
    const box = e.target.closest('.aprovador');
    if (!box || !e.target.dataset.campo) return;
    atualizarAprovador(box.dataset.id, e.target.dataset.campo, e.target.value);
    salvarAprovadoresLocal();
  });
  host.addEventListener('change', e => {
    const box = e.target.closest('.aprovador');
    if (!box || !e.target.dataset.campo) return;
    atualizarAprovador(box.dataset.id, e.target.dataset.campo, e.target.value);
    salvarAprovadoresLocal();
  });
  host.addEventListener('click', e => {
    const btn = e.target.closest('[data-remove]');
    if (btn) removerAprovador(btn.dataset.remove);
  });

  const btnAdd = $('#btnAddAprovador');
  if (btnAdd) btnAdd.addEventListener('click', () => adicionarAprovador());

  const btnAddPadrao = $('#btnAddAprovadorPadrao');
  if (btnAddPadrao) {
    btnAddPadrao.addEventListener('click', () => {
      const org = carregarOrgConfig();
      adicionarAprovador({ nome: '', cargo: org.cargoPadrao || '', orgao: org.nome || '', papel: 'aprovador' });
      adicionarAprovador({ nome: '', cargo: '', orgao: org.nome || '', papel: 'validador' });
    });
  }
}

/* ==============================================================
   DFD — Coleta / Prontidão / Persistência
   ============================================================== */
const CAMPOS_DFD = [
  'dfdNumero','dfdData','dfdUnidade','dfdResponsavel','dfdCargo','dfdOrgao',
  'dfdObjeto','dfdJustificativa','dfdQuantidades',
  'dfdPcaPrevisto','dfdPcaItem','dfdPcaJustificativa',
  'dfdModalidade','dfdNatureza','dfdCriterio','dfdRegime',
  'dfdValor','dfdMetodo','dfdDotacao','dfdFonte',
  'dfdParcelamento','dfdPrazo','dfdLocal','dfdPagamento',
  'dfdFiscalTitular','dfdFiscalSubstituto','dfdGestor','dfdVistoria',
  'dfdObservacoes',
];

function coletarDadosDFD() {
  const v = id => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
  const d = {};
  CAMPOS_DFD.forEach(id => { d[id] = v(id); });
  return {
    numero: d.dfdNumero, data: d.dfdData, unidade: d.dfdUnidade,
    responsavel: d.dfdResponsavel, cargo: d.dfdCargo, orgao: d.dfdOrgao,
    objeto: d.dfdObjeto, justificativa: d.dfdJustificativa, quantidades: d.dfdQuantidades,
    pcaPrevisto: d.dfdPcaPrevisto, pcaItem: d.dfdPcaItem, pcaJustificativa: d.dfdPcaJustificativa,
    modalidade: d.dfdModalidade, natureza: d.dfdNatureza, criterio: d.dfdCriterio, regime: d.dfdRegime,
    valor: d.dfdValor, metodo: d.dfdMetodo, dotacao: d.dfdDotacao, fonte: d.dfdFonte,
    parcelamento: d.dfdParcelamento, prazo: d.dfdPrazo, local: d.dfdLocal, pagamento: d.dfdPagamento,
    fiscalTitular: d.dfdFiscalTitular, fiscalSubstituto: d.dfdFiscalSubstituto, gestor: d.dfdGestor,
    vistoria: d.dfdVistoria, observacoes: d.dfdObservacoes,
  };
}
function preencherFormularioDFD(d) {
  if (!d) return;
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val == null ? '' : val; };
  set('dfdNumero', d.numero); set('dfdData', d.data); set('dfdUnidade', d.unidade);
  set('dfdResponsavel', d.responsavel); set('dfdCargo', d.cargo); set('dfdOrgao', d.orgao);
  set('dfdObjeto', d.objeto); set('dfdJustificativa', d.justificativa); set('dfdQuantidades', d.quantidades);
  set('dfdPcaPrevisto', d.pcaPrevisto); set('dfdPcaItem', d.pcaItem); set('dfdPcaJustificativa', d.pcaJustificativa);
  set('dfdModalidade', d.modalidade); set('dfdNatureza', d.natureza); set('dfdCriterio', d.criterio); set('dfdRegime', d.regime);
  set('dfdValor', d.valor); set('dfdMetodo', d.metodo); set('dfdDotacao', d.dotacao); set('dfdFonte', d.fonte);
  set('dfdParcelamento', d.parcelamento); set('dfdPrazo', d.prazo); set('dfdLocal', d.local); set('dfdPagamento', d.pagamento);
  set('dfdFiscalTitular', d.fiscalTitular); set('dfdFiscalSubstituto', d.fiscalSubstituto); set('dfdGestor', d.gestor);
  set('dfdVistoria', d.vistoria); set('dfdObservacoes', d.observacoes);
  atualizarContadorJustificativa();
  atualizarProntidao();
  salvarDFDLocal();
}
function limparFormularioDFD() {
  CAMPOS_DFD.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  atualizarContadorJustificativa();
  atualizarProntidao();
  salvarDFDLocal();
}
function atualizarContadorJustificativa() {
  const ta = $('#dfdJustificativa'), c = $('#dfdJustCount');
  if (ta && c) c.textContent = String(ta.value.length);
}
function atualizarProntidao() {
  const peso = {
    dfdNumero: 4, dfdData: 4, dfdUnidade: 6, dfdResponsavel: 5, dfdOrgao: 5,
    dfdObjeto: 10, dfdJustificativa: 15, dfdQuantidades: 6,
    dfdPcaPrevisto: 6, dfdPcaItem: 4,
    dfdModalidade: 8, dfdNatureza: 6, dfdCriterio: 5,
    dfdValor: 8, dfdMetodo: 6, dfdDotacao: 4,
    dfdParcelamento: 4, dfdPrazo: 3, dfdLocal: 3, dfdPagamento: 3,
    dfdFiscalTitular: 4, dfdGestor: 3, dfdVistoria: 3,
  };
  let obt = 0, tot = 0;
  Object.keys(peso).forEach(id => {
    tot += peso[id];
    const el = document.getElementById(id);
    if (el && el.value && el.value.trim()) obt += peso[id];
  });
  const pct = Math.round((obt / tot) * 100);

  const fill = $('#prontidaoFill'), val = $('#prontidaoValor'), bar = $('#prontidaoBar');
  const box = document.querySelector('.prontidao'), hint = $('#prontidaoHint');

  if (fill) fill.style.width = pct + '%';
  if (val)  val.textContent = pct + '%';
  if (bar)  bar.setAttribute('aria-valuenow', String(pct));
  if (box)  box.setAttribute('data-nivel', pct >= 80 ? 'alto' : pct >= 50 ? 'medio' : 'baixo');
  if (hint) {
    if (pct >= 80) hint.textContent = 'Documento praticamente pronto. Revise antes de gerar o PDF.';
    else if (pct >= 50) hint.textContent = 'Bom progresso. Complete os campos faltantes para atingir 80%.';
    else hint.textContent = 'Preencha os campos obrigatórios para aumentar a prontidão do DFD.';
  }
}
function salvarDFDLocal() {
  try { localStorage.setItem(LS_KEYS.DFD, JSON.stringify(coletarDadosDFD())); } catch (_) {}
}
function carregarDFDLocal() {
  try {
    const raw = localStorage.getItem(LS_KEYS.DFD);
    if (!raw) return;
    preencherFormularioDFD(JSON.parse(raw));
  } catch (_) {}
}
function carregarExemploDFD() {
  const iso = new Date().toISOString().slice(0, 10);
  preencherFormularioDFD({
    numero: 'DFD 042/2026', data: iso,
    unidade: 'Diretoria de Tecnologia da Informação',
    responsavel: 'Maria Souza', cargo: 'Diretora de TI',
    orgao: 'Prefeitura Municipal de Exemplo',
    objeto: 'Aquisição de estações de trabalho (workstations) e notebooks para modernização do parque tecnológico',
    justificativa: 'A presente demanda decorre da necessidade de substituição de equipamentos com mais de 6 anos de uso, cuja performance já não atende às rotinas administrativas. A modernização ampliará a produtividade, reduzirá custos de manutenção corretiva e garantirá segurança da informação alinhada à LGPD.',
    quantidades: '30 (trinta) workstations e 20 (vinte) notebooks',
    pcaPrevisto: 'sim', pcaItem: 'PCA-2026-ITEM-042',
    pcaJustificativa: 'Item previsto no Plano de Contratações Anual vigente.',
    modalidade: 'pregao', natureza: 'bens', criterio: 'menor-preco', regime: '',
    valor: '165.000,00', metodo: 'painel-precos',
    dotacao: 'PT 12.345.6789.0001 — ND 33.90.30', fonte: '01 — Tesouro',
    parcelamento: 'parcelado', prazo: '12 meses, contados da assinatura',
    local: 'Almoxarifado Central', pagamento: '30-dias',
    fiscalTitular: 'João Silva — matrícula 12345',
    fiscalSubstituto: 'Ana Souza — matrícula 67890',
    gestor: 'Carlos Pereira — Divisão de Contratos',
    vistoria: 'dispensada',
    observacoes: 'Documento apto para auditoria integrada ao OmniLicit Audit.',
  });
  toast('Exemplo de DFD carregado.', 'success');
}
async function baixarJSONDFD() {
  const d = coletarDadosDFD();
  const org = carregarOrgConfig();
  const core = window.OmniLicit;

  const tag  = core ? await core.gerarTag(d, org) : 'OMNILICIT::DFD::PENDING';
  const hash = core ? await core.gerarHash({ v: '4.0', tag, dfd: d, org }) : '0'.repeat(64);

  const payload = {
    meta: {
      geradoEm: new Date().toISOString(),
      versao: 'OmniLicit LicitaReq v5.0',
      tag, hash,
      emissor: 'OmniLicit · LicitaReq',
    },
    orgao: org, dfd: d,
    aprovadores: getAprovadoresValidos(),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = montarNomeArquivoPDF(d.numero).replace(/\.pdf$/i, '.json');
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast('JSON gerado: ' + a.download, 'success');
}

/* ==============================================================
   PDF — Geração DFD (ASYNC)
   ============================================================== */
async function gerarPDFDFD() {
  const btn = $('#btnDfdGerarPDF');
  if (!window.LicitaReqPDF || !window.LicitaReqPDF.buildDfdPdfDefinition) {
    toast('Módulo PDF não carregado.', 'error'); return;
  }
  if (!window.pdfMake) { toast('pdfMake não carregado.', 'error'); return; }
  if (!window.OmniLicit) { toast('Core OmniLicit não carregado.', 'error'); return; }

  const dfd = coletarDadosDFD();
  const org = carregarOrgConfig();
  const logo = carregarLogoDataUrl();

  if (!dfd.objeto || !dfd.justificativa) {
    toast('Preencha ao menos o objeto e a justificativa antes de gerar o PDF.', 'error');
    return;
  }
  const aprovadores = getAprovadoresValidos();
  if (!aprovadores.length) {
    toast('Nenhum aprovador — o PDF sairá sem bloco de assinaturas.', 'error');
  }

  const htmlOrig = btn ? btn.innerHTML : '';
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Gerando PDF…'; }

  try {
    const def = await window.LicitaReqPDF.buildDfdPdfDefinition(dfd, org, logo, {
      aprovadores, versao: 'OmniLicit LicitaReq v5.0',
    });
    const nome = montarNomeArquivoPDF(dfd.numero);
    window.pdfMake.createPdf(def).download(nome);
    toast('PDF gerado: ' + nome, 'success');
  } catch (err) {
    console.error('[OmniLicit] Erro PDF:', err);
    toast('Falha ao gerar o PDF. Veja o console.', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = htmlOrig; }
  }
}

function montarNomeArquivoPDF(numeroBruto) {
  const PREFIXO = 'DFD';
  let bruto = String(numeroBruto == null ? '' : numeroBruto).trim();
  bruto = bruto.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[ºª°]/g, '').replace(/\bn[º°o]?\.?\b/gi, '').replace(/n[uú]mero/gi, '').trim();
  bruto = bruto.replace(/[\/\\]+/g, '_').replace(/[\s\-–—.]+/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');

  if (!bruto) {
    const h = new Date();
    return PREFIXO + '_' + h.getFullYear() + '-' +
      String(h.getMonth() + 1).padStart(2, '0') + '-' +
      String(h.getDate()).padStart(2, '0') + '.pdf';
  }
  const partes = bruto.split('_');
  const primeiro = partes[0] || '';
  const temPrefixo = /^[A-Za-z]+$/.test(primeiro) && primeiro.length >= 2;
  let base;
  if (temPrefixo) {
    if (primeiro.length > 3) partes[0] = primeiro.charAt(0).toUpperCase() + primeiro.slice(1).toLowerCase();
    else partes[0] = primeiro.toUpperCase();
    base = partes.join('_');
  } else {
    base = PREFIXO + '_' + bruto;
  }
  if (base.length > 120) base = base.slice(0, 120).replace(/_+$/, '');
  return base + '.pdf';
}

/* ==============================================================
   ÓRGÃO + LOGO
   ============================================================== */
const CAMPOS_ORG = [
  'orgNome','orgSigla','orgCnpj','orgUf','orgCidade','orgEndereco',
  'orgUnidadePadrao','orgResponsavelPadrao','orgCargoPadrao',
];
function carregarOrgConfig() {
  const padrao = { nome: '', sigla: '', cnpj: '', uf: '', cidade: '', endereco: '',
    unidadePadrao: '', responsavelPadrao: '', cargoPadrao: '' };
  try {
    const raw = localStorage.getItem(LS_KEYS.ORG);
    if (!raw) return padrao;
    return Object.assign(padrao, JSON.parse(raw));
  } catch (_) { return padrao; }
}
function salvarOrgConfig(cfg) {
  try { localStorage.setItem(LS_KEYS.ORG, JSON.stringify(cfg)); } catch (_) {}
}
function preencherFormularioOrg(cfg) {
  const map = { orgNome: cfg.nome, orgSigla: cfg.sigla, orgCnpj: cfg.cnpj, orgUf: cfg.uf,
    orgCidade: cfg.cidade, orgEndereco: cfg.endereco, orgUnidadePadrao: cfg.unidadePadrao,
    orgResponsavelPadrao: cfg.responsavelPadrao, orgCargoPadrao: cfg.cargoPadrao };
  Object.keys(map).forEach(id => { const el = document.getElementById(id); if (el) el.value = map[id] || ''; });
}
function coletarFormularioOrg() {
  const g = id => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
  return { nome: g('orgNome'), sigla: g('orgSigla'), cnpj: g('orgCnpj'), uf: g('orgUf'),
    cidade: g('orgCidade'), endereco: g('orgEndereco'), unidadePadrao: g('orgUnidadePadrao'),
    responsavelPadrao: g('orgResponsavelPadrao'), cargoPadrao: g('orgCargoPadrao') };
}

let _logoDataUrl = null;
function carregarLogoDataUrl() {
  if (_logoDataUrl) return _logoDataUrl;
  try { _logoDataUrl = localStorage.getItem(LS_KEYS.LOGO) || null; } catch (_) {}
  return _logoDataUrl;
}
function salvarLogoLocal(dataUrl) {
  _logoDataUrl = dataUrl;
  try {
    if (dataUrl) localStorage.setItem(LS_KEYS.LOGO, dataUrl);
    else localStorage.removeItem(LS_KEYS.LOGO);
  } catch (_) {}
}
function atualizarBrandMark() {
  const mark = $('#brandMark');
  if (!mark) return;
  const logo = carregarLogoDataUrl();
  if (logo) {
    mark.classList.add('has-logo');
    mark.innerHTML = '<img src="' + logo + '" alt="Logomarca do órgão" />';
  } else {
    mark.classList.remove('has-logo');
    mark.textContent = 'OL';
  }
}
function mostrarPreviewLogo(nome, tamanho, dataUrl) {
  const prev = $('#logoPreview'), img = $('#logoPreviewImg');
  const nEl = $('#logoPreviewName'), sEl = $('#logoPreviewSize');
  const empty = $('#logoDropzoneEmpty');
  if (!prev || !img || !empty) return;
  img.src = dataUrl;
  nEl.textContent = nome || 'logomarca';
  sEl.textContent = formatarTamanho(tamanho);
  prev.hidden = false; empty.hidden = true;
}
function esconderPreviewLogo() {
  const prev = $('#logoPreview'), empty = $('#logoDropzoneEmpty');
  if (prev) prev.hidden = true;
  if (empty) empty.hidden = false;
}
function processarArquivoLogo(file) {
  if (!file) return;
  if (!/^image\//.test(file.type)) { toast('Envie uma imagem (PNG, JPG, SVG, WebP).', 'error'); return; }
  if (file.size > 2 * 1024 * 1024) { toast('Imagem acima de 2 MB.', 'error'); return; }
  const r = new FileReader();
  r.onload = () => {
    const durl = r.result;
    salvarLogoLocal(durl);
    mostrarPreviewLogo(file.name, file.size, durl);
    atualizarBrandMark();
    toast('Logomarca atualizada.', 'success');
  };
  r.onerror = () => toast('Falha ao ler a imagem.', 'error');
  r.readAsDataURL(file);
}
function abrirModalOrg() {
  const m = $('#modalConfigOrg');
  if (!m) return;
  preencherFormularioOrg(carregarOrgConfig());
  const logo = carregarLogoDataUrl();
  if (logo) mostrarPreviewLogo('logomarca salva', 0, logo);
  else esconderPreviewLogo();
  m.classList.remove('is-hidden');
  m.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  const first = m.querySelector('input, select, button');
  if (first) setTimeout(() => first.focus(), 60);
}
function fecharModalOrg() {
  const m = $('#modalConfigOrg');
  if (!m) return;
  m.classList.add('is-hidden');
  m.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}
function ligarModalOrg() {
  const btn = $('#btnConfigOrg');
  if (btn) btn.addEventListener('click', abrirModalOrg);
  $$('[data-close-config-org]').forEach(el => el.addEventListener('click', fecharModalOrg));
  const btnSalvar = $('#btnSalvarConfigOrg');
  if (btnSalvar) btnSalvar.addEventListener('click', () => {
    salvarOrgConfig(coletarFormularioOrg());
    fecharModalOrg();
    toast('Configuração do órgão salva.', 'success');
  });
  const btnCancelar = $('#btnCancelarConfigOrg');
  if (btnCancelar) btnCancelar.addEventListener('click', fecharModalOrg);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      const m = $('#modalConfigOrg');
      if (m && !m.classList.contains('is-hidden')) fecharModalOrg();
    }
  });
  const dz = $('#logoDropzone'), input = $('#logoInput');
  if (dz && input) {
    dz.addEventListener('click', () => input.click());
    dz.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); }
    });
    input.addEventListener('change', e => {
      const f = e.target.files && e.target.files[0];
      if (f) processarArquivoLogo(f);
      input.value = '';
    });
    ['dragenter','dragover'].forEach(ev => dz.addEventListener(ev, e => {
      e.preventDefault(); e.stopPropagation(); dz.classList.add('is-dragover');
    }));
    ['dragleave','drop'].forEach(ev => dz.addEventListener(ev, e => {
      e.preventDefault(); e.stopPropagation();
      if (ev === 'dragleave' && dz.contains(e.relatedTarget)) return;
      dz.classList.remove('is-dragover');
    }));
    dz.addEventListener('drop', e => {
      const f = e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) processarArquivoLogo(f);
    });
  }
  const btnRemover = $('#btnRemoverLogo');
  if (btnRemover) btnRemover.addEventListener('click', e => {
    e.stopPropagation();
    salvarLogoLocal(null);
    esconderPreviewLogo();
    atualizarBrandMark();
    toast('Logomarca removida.', 'success');
  });
}

/* ==============================================================
   TRIAGEM — Upload / Extração / Análise
   ============================================================== */
const arquivosTriagem = [];

function renderizarListaArquivos() {
  const ul = $('#fileList');
  if (!ul) return;
  ul.innerHTML = arquivosTriagem.map(a => {
    const cls = a.status === 'ok' ? 'fileitem__status--ok'
              : a.status === 'erro' ? 'fileitem__status--erro'
              : 'fileitem__status--load';
    const lbl = a.status === 'ok' ? 'Pronto'
              : a.status === 'erro' ? 'Falha' : 'Lendo…';
    const ext = (a.ext || '?').toUpperCase().slice(0, 4);
    return (
      '<li class="fileitem" data-id="' + a.id + '">' +
        '<span class="fileitem__icon" aria-hidden="true">' + ext + '</span>' +
        '<div class="fileitem__meta">' +
          '<span class="fileitem__title">' + escapeHTML(a.nome) + '</span>' +
          '<span class="fileitem__size">' + formatarTamanho(a.tamanho) + '</span>' +
        '</div>' +
        '<span class="fileitem__status ' + cls + '">' + lbl + '</span>' +
        '<button type="button" class="fileitem__remove" data-remove="' + a.id + '" aria-label="Remover arquivo">✕</button>' +
      '</li>'
    );
  }).join('');
}
async function extrairTextoPDF(file) {
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  let out = '';
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const tc = await page.getTextContent();
    out += tc.items.map(i => i.str).join(' ') + '\n\n';
  }
  return out;
}
async function extrairTextoDOCX(file) {
  const buf = await file.arrayBuffer();
  const r = await mammoth.extractRawText({ arrayBuffer: buf });
  return r.value || '';
}
async function extrairTexto(file) {
  const name = (file.name || '').toLowerCase();
  if (name.endsWith('.pdf')) return extrairTextoPDF(file);
  if (name.endsWith('.docx')) return extrairTextoDOCX(file);
  if (name.endsWith('.txt') || name.endsWith('.md') || (file.type && file.type.startsWith('text/'))) return await file.text();
  if (name.endsWith('.doc')) throw new Error('Formato .doc antigo não suportado. Salve como .docx ou PDF.');
  throw new Error('Formato não suportado.');
}
async function processarArquivos(files) {
  for (const f of Array.from(files || [])) {
    if (f.size > 10 * 1024 * 1024) { toast('Arquivo maior que 10 MB: ' + f.name, 'error'); continue; }
    const ext = (f.name.split('.').pop() || '').toLowerCase();
    const item = { id: 'f_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6),
      file: f, nome: f.name, tamanho: f.size, ext, status: 'load', texto: '' };
    arquivosTriagem.push(item);
    renderizarListaArquivos();
    try {
      item.texto = await extrairTexto(f);
      item.status = 'ok';
    } catch (err) {
      console.warn('[OmniLicit] Falha ao ler arquivo:', f.name, err);
      item.status = 'erro'; item.texto = '';
    }
    renderizarListaArquivos();
  }
}
function ligarDropzoneTriagem() {
  const dz = $('#dropzone'), input = $('#fileInput'), ul = $('#fileList');
  if (!dz || !input) return;
  dz.addEventListener('click', () => input.click());
  dz.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); }
  });
  input.addEventListener('change', e => {
    if (e.target.files && e.target.files.length) processarArquivos(e.target.files);
    input.value = '';
  });
  ['dragenter','dragover'].forEach(ev => dz.addEventListener(ev, e => {
    e.preventDefault(); e.stopPropagation(); dz.classList.add('is-dragover');
  }));
  ['dragleave','drop'].forEach(ev => dz.addEventListener(ev, e => {
    e.preventDefault(); e.stopPropagation();
    if (ev === 'dragleave' && dz.contains(e.relatedTarget)) return;
    dz.classList.remove('is-dragover');
  }));
  dz.addEventListener('drop', e => {
    const files = e.dataTransfer.files;
    if (files && files.length) processarArquivos(files);
  });
  if (ul) {
    ul.addEventListener('click', e => {
      const btn = e.target.closest('[data-remove]');
      if (!btn) return;
      const id = btn.dataset.remove;
      const idx = arquivosTriagem.findIndex(a => a.id === id);
      if (idx >= 0) arquivosTriagem.splice(idx, 1);
      renderizarListaArquivos();
    });
  }
  const ta = $('#texto'), cc = $('#charCount');
  if (ta && cc) ta.addEventListener('input', () => { cc.textContent = String(ta.value.length); });
}

/* ==============================================================
   MOTOR DE ANÁLISE
   ============================================================== */
const PALAVRAS_SERVICOS_COMUNS = /\b(limpeza|vigilância|vigilancia|conservação|conservacao|manutenção predial|copeira|recepção|recepcionista|jardinagem|motorista)\b/i;
const PALAVRAS_OBRAS = /\b(obra|obras|engenharia|construção|construcao|reforma|pavimentação|pavimentacao|edificação|edificacao|SINAPI|SICRO|BDI)\b/i;
const PALAVRAS_TIC = /\b(software|licença|licenca|TI|TIC|sistema|computador|notebook|servidor|datacenter|nuvem|cloud|SaaS|infraestrutura de TI)\b/i;
const PALAVRAS_TECNICOS = /\b(consultoria|parecer|auditoria|assessoria técnica|assessoria tecnica|projeto executivo|estudo técnico|estudo tecnico|laudo)\b/i;

function analisarSolicitacao(texto, meta) {
  texto = String(texto || ''); meta = meta || {};
  const norm = texto.toLowerCase();

  let natureza = meta.natureza && meta.natureza !== 'auto' ? meta.natureza : '';
  if (!natureza) {
    if (PALAVRAS_OBRAS.test(texto)) natureza = 'obra';
    else if (PALAVRAS_TIC.test(texto)) natureza = 'tic';
    else if (PALAVRAS_TECNICOS.test(texto)) natureza = 'tecnicos';
    else if (PALAVRAS_SERVICOS_COMUNS.test(texto)) natureza = 'servicos';
    else natureza = 'bens';
  }

  const temObjeto = /objeto|aquisi[çc][aã]o|contrata[çc][aã]o|presta[çc][aã]o de servi[çc]os/i.test(norm);
  const temJust  = /justificativa|motiva[çc][aã]o|necessidade|interesse p[úu]blico/i.test(norm);
  const temValor = /R\$|valor estimado|valor global|estimativa de pre[çc]o/i.test(texto);
  const temPrazo = /prazo|vig[êe]ncia|meses|dias/i.test(norm);
  const temDot   = /dota[çc][aã]o|fonte de recurso|programa de trabalho/i.test(norm);
  const temPCA   = /PCA|plano de contrata[çc][õo]es/i.test(norm);

  const req = [
    { ok: temObjeto, sev: 'alta', titulo: 'Descrição do objeto',
      desc: temObjeto ? 'Objeto devidamente descrito.' : 'Não foi possível identificar a descrição do objeto.',
      law: 'Art. 18, §1º, I' },
    { ok: temJust, sev: 'alta', titulo: 'Justificativa da necessidade',
      desc: temJust ? 'Motivação administrativa identificada.' : 'Ausente ou insuficiente.',
      law: 'Art. 18, §1º, II' },
    { ok: temValor, sev: 'media', titulo: 'Estimativa de valor',
      desc: temValor ? 'Há referência a valor estimado.' : 'Sem estimativa explícita.',
      law: 'Art. 23' },
    { ok: temDot, sev: 'media', titulo: 'Dotação orçamentária',
      desc: temDot ? 'Dotação/fonte informada.' : 'Não informada.',
      law: 'Art. 150' },
    { ok: temPCA, sev: 'baixa', titulo: 'Alinhamento ao PCA',
      desc: temPCA ? 'Referência ao PCA identificada.' : 'Sem referência ao PCA.',
      law: 'Art. 12, VII' },
    { ok: temPrazo, sev: 'baixa', titulo: 'Prazo de execução',
      desc: temPrazo ? 'Prazo/vigência referenciado.' : 'Não informado.',
      law: 'Art. 105' },
  ];

  const obrig = req.filter(r => r.sev === 'alta');
  const atendeObrig = obrig.filter(r => r.ok).length;
  const atendeTotal = req.filter(r => r.ok).length;
  const score = Math.round(((atendeObrig / Math.max(obrig.length, 1)) * 60) + ((atendeTotal / req.length) * 40));

  let veredito, vereditoCls, vereditoTexto;
  if (score >= 80 && atendeObrig === obrig.length) {
    veredito = 'Deferido para prosseguimento';
    vereditoCls = 'deferido';
    vereditoTexto = 'A solicitação apresenta elementos mínimos para prosseguimento.';
  } else if (score >= 50) {
    veredito = 'Devolvido para complementação';
    vereditoCls = 'devolvido';
    vereditoTexto = 'Há informações essenciais pendentes. Devolva à unidade requisitante.';
  } else {
    veredito = 'Indeferido — informações insuficientes';
    vereditoCls = 'indeferido';
    vereditoTexto = 'A demanda carece de elementos mínimos de instrução.';
  }

  const modalidadeSug = sugerirModalidade(natureza, meta.valor);
  const alertas = [];
  if (!temObjeto) alertas.push({ tipo: 'danger', titulo: 'Objeto ausente', texto: 'A descrição do objeto não foi identificada.' });
  if (!temJust) alertas.push({ tipo: 'warning', titulo: 'Motivação insuficiente', texto: 'A justificativa precisa demonstrar o interesse público.' });
  if (!temValor) alertas.push({ tipo: 'warning', titulo: 'Sem estimativa de valor', texto: 'Pesquisa de preços é indispensável (Art. 23).' });
  if (atendeObrig === obrig.length && !alertas.length) alertas.push({ tipo: 'success', titulo: 'Requisitos mínimos atendidos', texto: 'O documento contempla objeto e motivação — Art. 18.' });

  const minuta = gerarMinuta({ veredito, vereditoTexto, natureza, modalidadeSug, score, requisitos: req, meta });
  return { veredito, vereditoCls, vereditoTexto, score, natureza, modalidadeSug, requisitos: req, alertas, minuta, meta };
}
function sugerirModalidade(natureza, valor) {
  const v = parseFloat(String(valor || '').replace(/\./g, '').replace(',', '.')) || 0;
  if (natureza === 'obra') return { rotulo: 'Concorrência (Art. 29)', lei: 'Art. 29' };
  if (natureza === 'servicos' || natureza === 'bens' || natureza === 'tic') {
    if (v > 0 && v <= 50000) return { rotulo: 'Dispensa de Licitação (Art. 75, II)', lei: 'Art. 75' };
    return { rotulo: 'Pregão Eletrônico (Art. 29)', lei: 'Art. 29' };
  }
  if (natureza === 'tecnicos') return { rotulo: 'Concorrência ou Pregão conforme objeto', lei: 'Arts. 29 e 33' };
  return { rotulo: 'A definir conforme natureza', lei: 'Art. 28' };
}
function gerarMinuta(ctx) {
  const linhas = [];
  const hoje = new Date().toLocaleDateString('pt-BR');
  const orgao = (ctx.meta && ctx.meta.orgao) || '[ÓRGÃO / ENTIDADE]';
  const unid  = (ctx.meta && ctx.meta.unidade) || '[UNIDADE REQUISITANTE]';
  const proc  = (ctx.meta && ctx.meta.processo) || '[Nº DO PROCESSO]';
  linhas.push('MINUTA DE DEVOLUTIVA — TRIAGEM PRELIMINAR');
  linhas.push('Base legal: Lei nº 14.133/2021');
  linhas.push('');
  linhas.push('Órgão: ' + orgao);
  linhas.push('Unidade requisitante: ' + unid);
  linhas.push('Processo: ' + proc);
  linhas.push('Data da análise: ' + hoje);
  linhas.push('');
  linhas.push('1. OBJETO DA ANÁLISE');
  linhas.push('   Análise preliminar da solicitação encaminhada à unidade de licitações.');
  linhas.push('');
  linhas.push('2. RESULTADO');
  linhas.push('   Veredito: ' + ctx.veredito);
  linhas.push('   Score de conformidade: ' + ctx.score + '/100');
  linhas.push('   Natureza detectada: ' + ctx.natureza);
  linhas.push('   Modalidade sugerida: ' + ctx.modalidadeSug.rotulo + ' (' + ctx.modalidadeSug.lei + ')');
  linhas.push('');
  linhas.push('3. FUNDAMENTAÇÃO');
  linhas.push('   ' + ctx.vereditoTexto);
  linhas.push('');
  linhas.push('4. CHECKLIST DE REQUISITOS');
  ctx.requisitos.forEach(r => {
    linhas.push('   ' + (r.ok ? '[OK]  ' : '[!!]  ') + r.titulo + ' — ' + r.law);
    linhas.push('         ' + r.desc);
  });
  linhas.push('');
  linhas.push('5. ENCAMINHAMENTO');
  if (ctx.veredito.indexOf('Deferido') === 0) linhas.push('   Encaminhe-se à fase seguinte de instrução.');
  else if (ctx.veredito.indexOf('Devolvido') === 0) linhas.push('   Devolva-se à unidade requisitante para complementação.');
  else linhas.push('   Recomenda-se reformulação integral da demanda.');
  linhas.push('');
  linhas.push('6. RESSALVA');
  linhas.push('   Esta é uma análise automatizada de apoio e NÃO substitui o parecer da');
  linhas.push('   assessoria jurídica, do controle interno ou da autoridade competente.');
  return linhas.join('\n');
}

/* ==============================================================
   DASHBOARD
   ============================================================== */
function renderizarResultado(res) {
  const box = $('#resultado'), empty = $('#emptyState'), status = $('#resultado-status');
  if (!box) return;
  if (empty) empty.hidden = true;
  box.hidden = false;

  const rows = res.requisitos.map(r => {
    const cls = r.ok ? 'req-row--ok' : (r.sev === 'alta' ? 'req-row--fail' : 'req-row--warn');
    const icon = r.ok ? '✓' : (r.sev === 'alta' ? '✕' : '!');
    const sevCls = r.ok ? 'sev--ok' : r.sev === 'alta' ? 'sev--alta' : r.sev === 'media' ? 'sev--media' : 'sev--baixa';
    const sevTxt = r.ok ? 'OK' : r.sev.toUpperCase();
    return '<div class="req-row ' + cls + '"><div class="req-row__icon" aria-hidden="true">' + icon + '</div>' +
      '<div class="req-row__body"><div class="req-row__title">' + escapeHTML(r.titulo) + '</div>' +
      '<div class="req-row__desc">' + escapeHTML(r.desc) + '</div>' +
      '<span class="req-row__law">' + escapeHTML(r.law) + '</span></div>' +
      '<span class="req-row__sev ' + sevCls + '">' + sevTxt + '</span></div>';
  }).join('');

  const alertas = res.alertas.map(a => {
    const cls = a.tipo === 'danger' ? 'alert--danger' : a.tipo === 'warning' ? 'alert--warning' : a.tipo === 'success' ? 'alert--success' : '';
    const icon = a.tipo === 'danger' ? '⚠' : a.tipo === 'warning' ? '⚠' : a.tipo === 'success' ? '✓' : 'ℹ';
    return '<div class="alert ' + cls + '"><span aria-hidden="true">' + icon + '</span><div>' +
      '<div class="alert__title">' + escapeHTML(a.titulo) + '</div>' +
      '<div class="alert__text">' + escapeHTML(a.texto) + '</div></div></div>';
  }).join('');

  const meta = res.meta || {};
  box.innerHTML =
    '<div class="verdict verdict--' + res.vereditoCls + '">' +
      '<div class="verdict__head"><div>' +
        '<h3 class="verdict__title">' + escapeHTML(res.veredito) + '</h3>' +
        '<p class="verdict__sub">' + escapeHTML(res.vereditoTexto) + '</p>' +
      '</div></div>' +
      '<div class="score" aria-label="Score"><span class="score__value">' + res.score + '/100</span>' +
      '<div class="score__bar"><div class="score__fill" style="width:' + res.score + '%"></div></div></div>' +
      '<dl class="verdict__grid">' +
        '<div class="verdict__cell"><dt>Natureza do objeto</dt><dd>' + escapeHTML(res.natureza) + '</dd></div>' +
        '<div class="verdict__cell"><dt>Modalidade sugerida</dt><dd>' + escapeHTML(res.modalidadeSug.rotulo) + '</dd></div>' +
        '<div class="verdict__cell"><dt>Base legal</dt><dd>' + escapeHTML(res.modalidadeSug.lei) + '</dd></div>' +
        '<div class="verdict__cell"><dt>Unidade requisitante</dt><dd>' + escapeHTML(meta.unidade || '—') + '</dd></div>' +
      '</dl>' +
    '</div>' +
    '<section class="section"><h3 class="section__title">Checklist de requisitos</h3>' +
      '<div class="req-table">' + rows + '</div></section>' +
    '<section class="section"><h3 class="section__title">Alertas e recomendações</h3>' +
      '<div class="alerts">' + alertas + '</div></section>' +
    '<section class="section"><h3 class="section__title">Minuta de devolutiva</h3>' +
      '<pre class="minuta" aria-label="Minuta gerada">' + escapeHTML(res.minuta) + '</pre>' +
      '<div class="minuta__actions">' +
        '<button type="button" class="btn btn--primary btn--icon" id="btnBaixarMinutaPDF">📄 Baixar Minuta em PDF</button>' +
        '<button type="button" class="btn btn--ghost btn--icon" id="btnCopiarMinuta">📋 Copiar texto</button>' +
        '<button type="button" class="btn btn--ghost btn--icon" id="btnBaixarMinuta">💾 Baixar .txt</button>' +
      '</div></section>';

  const btnCopiar = $('#btnCopiarMinuta');
  if (btnCopiar) btnCopiar.addEventListener('click', () => {
    navigator.clipboard.writeText(res.minuta).then(
      () => toast('Minuta copiada.', 'success'),
      () => toast('Não foi possível copiar.', 'error')
    );
  });
  const btnBaixar = $('#btnBaixarMinuta');
  if (btnBaixar) btnBaixar.addEventListener('click', () => {
    const blob = new Blob([res.minuta], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'minuta_devolutiva.txt';
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  });
  const btnMinPDF = $('#btnBaixarMinutaPDF');
  if (btnMinPDF) btnMinPDF.addEventListener('click', () => gerarMinutaPDF(res));

  if (status) status.textContent = 'Análise concluída. Veredito: ' + res.veredito + '. Score ' + res.score + ' de 100.';
  box.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ==============================================================
   MINUTA PDF (ASYNC)
   ============================================================== */
async function gerarMinutaPDF(res) {
  const btn = $('#btnBaixarMinutaPDF');
  if (!window.LicitaReqMinutaPDF || !window.LicitaReqMinutaPDF.buildMinutaPdfDefinition) {
    toast('Módulo de Minuta PDF não carregado.', 'error'); return;
  }
  if (!window.pdfMake) { toast('pdfMake não carregado.', 'error'); return; }
  if (!window.OmniLicit) { toast('Core OmniLicit não carregado.', 'error'); return; }
  if (!res) { toast('Nenhuma análise disponível.', 'error'); return; }

  const org = carregarOrgConfig();
  const logo = carregarLogoDataUrl();
  const meta = res.meta || {};
  const texto = ($('#texto') && $('#texto').value) || '';

  const payload = {
    numero: meta.processo || '', processo: meta.processo || '',
    data: new Date().toISOString().slice(0, 10),
    unidade: meta.unidade || '', responsavel: meta.responsavel || '', cargo: meta.cargo || '',
    orgao: meta.orgao || org.nome || '',
    objeto: texto.trim().slice(0, 500),
    veredito: res.veredito, vereditoCls: res.vereditoCls, vereditoTexto: res.vereditoTexto,
    score: res.score, natureza: res.natureza, modalidadeSug: res.modalidadeSug,
    requisitos: res.requisitos, alertas: res.alertas, minuta: res.minuta, meta,
  };

  const htmlOrig = btn ? btn.innerHTML : '';
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Gerando Minuta…'; }

  try {
    const def = await window.LicitaReqMinutaPDF.buildMinutaPdfDefinition(
      payload, org, logo,
      { aprovadores: getAprovadoresValidos(), versao: 'OmniLicit LicitaReq v5.0' }
    );
    const nome = window.LicitaReqMinutaPDF.montarNomeArquivoMinuta(payload.processo || payload.numero);
    window.pdfMake.createPdf(def).download(nome);
    toast('Minuta gerada: ' + nome, 'success');
  } catch (err) {
    console.error('[OmniLicit] Erro Minuta PDF:', err);
    toast('Falha ao gerar a Minuta.', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = htmlOrig; }
  }
}

/* ==============================================================
   AÇÕES TRIAGEM
   ============================================================== */
function executarAnalise() {
  const texto = ($('#texto') && $('#texto').value.trim()) || '';
  const textoArquivos = arquivosTriagem.filter(a => a.status === 'ok' && a.texto).map(a => a.texto).join('\n\n---\n\n');
  const combinado = (texto + '\n\n' + textoArquivos).trim();
  if (combinado.length < 20) { toast('Informe o texto ou anexe ao menos um arquivo.', 'error'); return; }

  const meta = {
    unidade:     ($('#unidade')     && $('#unidade').value.trim())     || '',
    processo:    ($('#processo')    && $('#processo').value.trim())    || '',
    natureza:    ($('#natureza')    && $('#natureza').value)           || 'auto',
    valor:       ($('#valor')       && $('#valor').value.trim())       || '',
    orgao:       ($('#orgao')       && $('#orgao').value.trim())       || '',
    responsavel: ($('#responsavel') && $('#responsavel').value.trim()) || '',
    cargo:       ($('#cargo')       && $('#cargo').value.trim())       || '',
  };
  const res = analisarSolicitacao(combinado, meta);
  renderizarResultado(res);
  toast('Análise concluída.', 'success');
}
function carregarExemploTriagem() {
  const txt = 'Ofício nº 123/2026 — Coordenação de TI\n\n' +
    'Assunto: Solicitação de contratação de serviços de tecnologia da informação.\n\n' +
    'Objeto: Aquisição de 40 (quarenta) notebooks e 15 (quinze) estações de trabalho ' +
    'para modernização do parque tecnológico da Coordenação de TI, com garantia on-site de 36 meses.\n\n' +
    'Justificativa: A necessidade decorre da obsolescência dos equipamentos atuais ' +
    '(mais de 6 anos de uso) e da crescente demanda por processamento. A modernização ' +
    'ampliará a produtividade e garantirá conformidade com a LGPD.\n\n' +
    'Valor estimado: R$ 165.000,00, conforme pesquisa no Painel de Preços.\n\n' +
    'Prazo de execução: 12 meses.\n\n' +
    'Dotação: PT 12.345.6789.0001 — ND 33.90.30 — Fonte 01 (Tesouro).\n\n' +
    'Alinhamento ao PCA: item PCA-2026-ITEM-042.\n\n' +
    'Atenciosamente,\nMaria Souza — Diretora de TI.';
  const ta = $('#texto');
  if (ta) {
    ta.value = txt;
    const cc = $('#charCount'); if (cc) cc.textContent = String(txt.length);
  }
  toast('Exemplo carregado.', 'success');
}
function limparTriagem() {
  const ta = $('#texto'); if (ta) ta.value = '';
  const cc = $('#charCount'); if (cc) cc.textContent = '0';
  ['unidade','processo','valor','orgao','responsavel','cargo'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  const nat = $('#natureza'); if (nat) nat.value = 'auto';
  arquivosTriagem.length = 0;
  renderizarListaArquivos();
  const box = $('#resultado'); if (box) { box.hidden = true; box.innerHTML = ''; }
  const empty = $('#emptyState'); if (empty) empty.hidden = false;
  const status = $('#resultado-status'); if (status) status.textContent = '';
  toast('Triagem limpa.', 'success');
}
function ligarBotoesTriagem() {
  const a = $('#btnAnalisar'); if (a) a.addEventListener('click', executarAnalise);
  const e = $('#btnExemplo'); if (e) e.addEventListener('click', carregarExemploTriagem);
  const l = $('#btnLimpar');  if (l) l.addEventListener('click', limparTriagem);
}

/* ==============================================================
   BOTÕES DFD
   ============================================================== */
function ligarBotoesDFD() {
  const btnPDF = $('#btnDfdGerarPDF'); if (btnPDF) btnPDF.addEventListener('click', gerarPDFDFD);
  const btnJSON = $('#btnDfdSalvarJSON'); if (btnJSON) btnJSON.addEventListener('click', baixarJSONDFD);
  const btnEx = $('#btnDfdCarregarExemplo'); if (btnEx) btnEx.addEventListener('click', carregarExemploDFD);
  const btnLimpar = $('#btnDfdLimpar');
  if (btnLimpar) btnLimpar.addEventListener('click', () => {
    if (!confirm('Limpar todos os campos do DFD?')) return;
    limparFormularioDFD();
    toast('Formulário do DFD limpo.', 'success');
  });
  const autosave = debounce(() => { salvarDFDLocal(); atualizarProntidao(); }, 350);
  CAMPOS_DFD.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', autosave);
    el.addEventListener('change', autosave);
  });
  const taJust = $('#dfdJustificativa');
  if (taJust) taJust.addEventListener('input', atualizarContadorJustificativa);
}

/* ==============================================================
   BOOTSTRAP
   ============================================================== */
document.addEventListener('DOMContentLoaded', () => {
  initTema();
  ligarModalOrg();
  atualizarBrandMark();
  ligarEventosAprovadores();
  carregarAprovadoresLocal();
  renderizarAprovadores();
  ligarBotoesDFD();
  carregarDFDLocal();
  atualizarContadorJustificativa();
  atualizarProntidao();
  ligarDropzoneTriagem();
  ligarBotoesTriagem();

  console.info('[OmniLicit] LicitaReq v4.0 inicializado — Lei nº 14.133/2021');
  console.info('[OmniLicit] Core:', window.OmniLicit ? 'OK (SHA-256)' : 'FALHA');
});
