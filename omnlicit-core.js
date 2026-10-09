/* ============================================================
   OmniLicit · Core compartilhado
   v1.0 — SHA-256 + TAG + Hash de Integridade + Escudo vetorial
   ------------------------------------------------------------
   Expõe window.OmniLicit = {
     sha256, gerarTag, gerarHash, escudo, CORES
   }
   ============================================================ */
'use strict';

(function () {
  /* ---------- Paleta oficial ---------- */
  const CORES = Object.freeze({
    petroleo:    '#00A896',
    petroleo400: '#29B5A7',
    petroleo300: '#5CC7BC',
    petroleoD:   '#007568',
    executivo:   '#05668D',
    executivoD:  '#034462',
    ink:         '#0A0F1E',
    muted:       '#475569',
    line:        '#E2E8F0',
    bg:          '#F8FAFC',
    danger:      '#DC2626',
    warning:     '#B45309',
    success:     '#059669',
  });

  /* ============================================================
     SHA-256 — Web Crypto com fallback puro JS (para file://)
     ============================================================ */
  function strParaBytesUtf8(str) {
    return unescape(encodeURIComponent(str));
  }

  /* --- Fallback puro (compatível com navegadores sem crypto.subtle) --- */
  function sha256Fallback(ascii) {
    function rr(v, a) { return (v >>> a) | (v << (32 - a)); }
    const mp = Math.pow;
    const maxWord = mp(2, 32);
    let result = '';
    const words = [];
    const asciiBitLength = ascii.length * 8;
    let hash = sha256Fallback.h = sha256Fallback.h || [];
    const k = sha256Fallback.k = sha256Fallback.k || [];
    let primeCounter = k.length;
    const isComposite = {};
    for (let candidate = 2; primeCounter < 64; candidate++) {
      if (!isComposite[candidate]) {
        for (let i = 0; i < 313; i += candidate) isComposite[i] = candidate;
        hash[primeCounter] = (mp(candidate, 0.5) * maxWord) | 0;
        k[primeCounter++] = (mp(candidate, 1 / 3) * maxWord) | 0;
      }
    }
    ascii += '\x80';
    while (ascii.length % 64 - 56) ascii += '\x00';
    for (let i = 0; i < ascii.length; i++) {
      const j = ascii.charCodeAt(i);
      if (j >> 8) return '';
      words[i >> 2] |= j << ((3 - i) % 4) * 8;
    }
    words[words.length] = (asciiBitLength / maxWord) | 0;
    words[words.length] = asciiBitLength;
    for (let j = 0; j < words.length;) {
      const w = words.slice(j, j += 16);
      const oldHash = hash.slice(0, 8);
      hash = hash.slice(0, 8);
      for (let i = 0; i < 64; i++) {
        const w15 = w[i - 15], w2 = w[i - 2];
        const a = hash[0], e = hash[4];
        const temp1 = hash[7]
          + (rr(e, 6) ^ rr(e, 11) ^ rr(e, 25))
          + ((e & hash[5]) ^ ((~e) & hash[6]))
          + k[i]
          + (w[i] = (i < 16) ? w[i] : (
              w[i - 16]
              + (rr(w15, 7) ^ rr(w15, 18) ^ (w15 >>> 3))
              + w[i - 7]
              + (rr(w2, 17) ^ rr(w2, 19) ^ (w2 >>> 10))
            ) | 0
          );
        const temp2 = (rr(a, 2) ^ rr(a, 13) ^ rr(a, 22))
          + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
        hash = [(temp1 + temp2) | 0].concat(hash);
        hash[4] = (hash[4] + temp1) | 0;
      }
      for (let i = 0; i < 8; i++) hash[i] = (hash[i] + oldHash[i]) | 0;
    }
    for (let i = 0; i < 8; i++) {
      for (let j = 3; j + 1; j--) {
        const b = (hash[i] >> (j * 8)) & 255;
        result += (b < 16 ? '0' : '') + b.toString(16);
      }
    }
    return result.toUpperCase();
  }

  /* --- API pública: sempre 64 chars hexadecimais maiúsculos --- */
  async function sha256(input) {
    const str = typeof input === 'string' ? input : JSON.stringify(input);
    if (window.crypto && window.crypto.subtle) {
      try {
        const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
        return Array.from(new Uint8Array(buf))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('').toUpperCase();
      } catch (_) { /* fallback abaixo */ }
    }
    return sha256Fallback(strParaBytesUtf8(str));
  }

  /* ============================================================
     TAG oficial: OMNILICIT::DFD::[8-hex]::[ANO]
     ============================================================ */
  async function gerarTag(dfd, org, prefixo) {
    const ano = new Date().getFullYear();
    const base = [
      (org && (org.cnpj || org.nome)) || '',
      dfd.numero || dfd.processo || '',
      dfd.data || '',
      dfd.objeto || '',
      dfd.valor || '',
      dfd.responsavel || '',
      dfd.unidade || '',
    ].join('|');
    const h = await sha256(base);
    const tag8 = h.slice(0, 8);
    return (prefixo || 'OMNILICIT::DFD') + '::' + tag8 + '::' + ano;
  }

  /* ============================================================
     HASH de integridade (payload canônico → 64 chars)
     ============================================================ */
  async function gerarHash(payload) {
    const canonico = JSON.stringify(payload);
    return sha256(canonico);
  }

  /* ============================================================
     ESCUDO OmniLicit — desenhado com pdfMake canvas (polyline)
     ------------------------------------------------------------
     Retorna { canvas: [...], w, h } pronto para inserir em `stack`.
     ============================================================ */
  function escudo(w, h) {
    w = w || 80; h = h || 96;
    const P = (x, y) => ({ x: x * w, y: y * h });

    return {
      w, h,
      canvas: [
        /* Face esquerda (executivo escuro) */
        { type: 'polyline', closePath: true, color: CORES.executivo,
          points: [P(0, 0.18), P(0.5, 0), P(0.5, 1), P(0, 0.55)] },
        /* Face direita (petróleo) */
        { type: 'polyline', closePath: true, color: CORES.petroleo,
          points: [P(0.5, 0), P(1, 0.18), P(1, 0.55), P(0.5, 1)] },
        /* Faceta superior (highlight) */
        { type: 'polyline', closePath: true, color: CORES.petroleo400,
          points: [P(0.5, 0), P(1, 0.18), P(0.5, 0.38), P(0, 0.18)] },
        /* Faceta inferior esquerda (sombra sutil) */
        { type: 'polyline', closePath: true, color: CORES.executivoD,
          points: [P(0, 0.55), P(0.5, 0.75), P(0.5, 1)] },
        /* Contorno interno branco */
        { type: 'polyline', closePath: true, color: '#FFFFFF', lineWidth: 1.1,
          points: [P(0.16, 0.27), P(0.5, 0.13), P(0.84, 0.27),
                   P(0.84, 0.55), P(0.5, 0.86), P(0.16, 0.55)] },
      ],
    };
  }

  /* Wrapper: escudo + monograma "OL" centralizado */
  function escudoComMonograma(w, h) {
    w = w || 80; h = h || 96;
    const e = escudo(w, h);
    return {
      columns: [
        { width: w, canvas: e.canvas, alignment: 'center' },
        {
          width: w, margin: [-w, h * 0.36, 0, 0],
          text: 'OL', fontSize: h * 0.32, bold: true,
          color: '#FFFFFF', alignment: 'center',
        },
      ],
    };
  }

  window.OmniLicit = {
    CORES,
    sha256,
    gerarTag,
    gerarHash,
    escudo,
    escudoComMonograma,
  };
})();
