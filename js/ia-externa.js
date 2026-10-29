/* =====================================================================
   ia-externa.js — Controle 5.0 | IA externa (BYOK: chave do próprio usuário)

   REGRAS DE ARQUITETURA (não quebrar):
   1) fetch direto, SEM SDK de terceiros.
   2) O service worker só trata GET do mesmo domínio. Chamadas aos
      provedores nunca passam por ele.
   3) Chave guardada no localStorage 'ctrl_ia_keys' = { gemini, openai,
      anthropic, groq, openrouter }. Nunca entra no backup exportado.
   4) Os nomes de modelo mudam com frequência. Os "padrões" abaixo são
      só ponto de partida: depois de salvar a chave, o botão "Listar
      modelos" pergunta ao provedor o que existe de fato.
   5) Assinaturas usadas pelo app.js:
        IAChave.ler(prov) / gravar(prov, valor) / algumaConfigurada()
        perguntarIA(prov, modelo, sistema, pergunta, intensidade, {permitirBusca})
        testarIA(prov, modelo)
        listarModelosIA(prov)   // novo na 5.0

   Se qualquer chamada falhar, o app.js cai no assistente embutido.
   ===================================================================== */
'use strict';

const IA_TIMEOUT_MS = (typeof window !== 'undefined' && window.__IA_TIMEOUT_MS) || 35000;   // o gancho existe só para os testes

const IA_PROVEDORES = {
  gemini: {
    rot: 'Google Gemini', tipo: 'gemini',
    base: 'https://generativelanguage.googleapis.com/v1beta',
    etiqueta: 'Gratuito / Chave própria',
    modeloPadrao: 'gemini-3.5-flash-lite',    // o que comprovadamente funcionou na conta do dono do app
    modelos: ['gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-flash-latest', 'gemini-flash-lite-latest'],
    ondePegar: 'aistudio.google.com → Get API key',
    custo: 'Existe camada gratuita, com limites que o Google muda. Não pede cartão.',
    privacidade: 'Na camada gratuita o Google pode usar as conversas para melhorar seus produtos. Não envie o que não quer que seja lido. Confira os termos vigentes.'
  },
  openai: {
    rot: 'OpenAI', tipo: 'openai',
    base: 'https://api.openai.com/v1',
    etiqueta: 'Pago / Chave própria',
    modeloPadrao: 'gpt-4o-mini',
    modelos: ['gpt-4o-mini', 'gpt-4o'],
    ondePegar: 'platform.openai.com → API keys',
    custo: 'Pago, com crédito pré-pago. Assinatura do ChatGPT não dá acesso à API.',
    privacidade: 'Por padrão, dados enviados pela API não são usados para treinar modelos. Confira os termos vigentes.'
  },
  anthropic: {
    rot: 'Anthropic (Claude)', tipo: 'anthropic',
    base: 'https://api.anthropic.com/v1',
    etiqueta: 'Pago / Chave própria',
    modeloPadrao: 'claude-haiku-4-5-20251001',
    modelos: ['claude-haiku-4-5-20251001'],
    ondePegar: 'console.anthropic.com → API keys',
    custo: 'Pago, com crédito pré-pago. Assinatura do Claude.ai não dá acesso à API.',
    privacidade: 'Os dados enviados pela API seguem a política de retenção da Anthropic. Confira os termos vigentes.'
  },
  groq: {
    rot: 'Groq', tipo: 'openai',
    base: 'https://api.groq.com/openai/v1',
    etiqueta: 'Gratuito / Chave própria',
    modeloPadrao: 'llama-3.3-70b-versatile',
    modelos: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'],
    ondePegar: 'console.groq.com → API Keys',
    custo: 'Existe camada gratuita com limite de uso por minuto e por dia.',
    privacidade: 'Confira a política do provedor antes de enviar dados pessoais.'
  },
  openrouter: {
    rot: 'OpenRouter', tipo: 'openai',
    base: 'https://openrouter.ai/api/v1',
    etiqueta: 'Gratuito e pago / Chave própria',
    modeloPadrao: 'meta-llama/llama-3.3-70b-instruct:free',
    modelos: ['meta-llama/llama-3.3-70b-instruct:free'],
    ondePegar: 'openrouter.ai → Keys',
    custo: 'Alguns modelos são gratuitos (terminam em :free), outros pagos. Os gratuitos têm limite baixo.',
    privacidade: 'Cada modelo é servido por um fornecedor diferente, com política própria. Modelos gratuitos podem registrar as conversas.'
  }
};

/* ── chave ─────────────────────────────────────────── */
const IAChave = {
  _k: 'ctrl_ia_keys',
  _tudo() { try { return JSON.parse(localStorage.getItem(this._k) || '{}') || {}; } catch (e) { return {}; } },
  ler(prov) { return (this._tudo()[prov] || '').trim(); },
  gravar(prov, valor) {
    const t = this._tudo();
    valor = String(valor || '').trim();
    if (valor) t[prov] = valor; else delete t[prov];
    try { localStorage.setItem(this._k, JSON.stringify(t)); } catch (e) {}
  },
  algumaConfigurada() { return Object.keys(IA_PROVEDORES).some(p => !!this.ler(p)); }
};

/* ── erros em português ────────────────────────────── */
function _erroIA(prov, status, corpo, e) {
  const nome = (IA_PROVEDORES[prov] || {}).rot || prov;
  if (e) {
    if (e.name === 'AbortError') return new Error(nome + ' não respondeu em ' + Math.round(IA_TIMEOUT_MS / 1000) + ' segundos.');
    return new Error('Sem conexão com ' + nome + ' (ou bloqueio de rede). Verifique a internet.');
  }
  let det = '';
  try {
    const j = typeof corpo === 'string' ? JSON.parse(corpo) : corpo;
    det = (j && (j.error && (j.error.message || j.error) || j.message)) || '';
    if (typeof det !== 'string') det = JSON.stringify(det);
  } catch (x) { det = String(corpo || '').slice(0, 160); }
  det = String(det).replace(/\s+/g, ' ').slice(0, 220);
  const E = (m) => { const er = new Error(m); er.status = status; er.detalhe = det; return er; };
  if (status === 401 || status === 403) return E('Chave recusada por ' + nome + ' (' + status + '). Confira se copiou inteira, sem espaço, e se a chave está ativa. ' + det);
  if (status === 404) return E('O modelo escolhido não existe em ' + nome + ' (404). Use "Listar modelos" para ver os disponíveis. ' + det);
  if (status === 429) return E('Limite de uso de ' + nome + ' atingido (429). Espere um pouco ou troque de modelo. ' + det);
  if (status === 400) return E('Pedido recusado por ' + nome + ' (400): ' + (det || 'parâmetro inválido') + '. Se o problema for o modelo, use "Listar modelos".');
  if (status >= 500) return E(nome + ' está com problema (' + status + '). Tente de novo mais tarde.');
  return E(nome + ' respondeu ' + status + '. ' + det);
}

async function _fetchIA(prov, url, opts) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), IA_TIMEOUT_MS);
  let r;
  try { r = await fetch(url, Object.assign({}, opts, { signal: ctl.signal })); }
  catch (e) { clearTimeout(t); throw _erroIA(prov, 0, null, e); }
  clearTimeout(t);
  const txt = await r.text();
  if (!r.ok) throw _erroIA(prov, r.status, txt);
  try { return JSON.parse(txt); } catch (e) { throw new Error('Resposta inesperada do provedor (não é JSON).'); }
}

function _headersIA(prov, chave) {
  const p = IA_PROVEDORES[prov];
  if (p.tipo === 'gemini') return { 'Content-Type': 'application/json', 'x-goog-api-key': chave };
  if (p.tipo === 'anthropic') return {
    'Content-Type': 'application/json', 'x-api-key': chave, 'anthropic-version': '2023-06-01',
    'anthropic-dangerous-direct-browser-access': 'true'
  };
  return { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + chave };
}

/* ── lista de modelos do provedor ──────────────────── */
async function listarModelosIA(prov) {
  const p = IA_PROVEDORES[prov]; if (!p) throw new Error('Provedor desconhecido.');
  const chave = IAChave.ler(prov);
  if (!chave && prov !== 'openrouter') throw new Error('Salve a chave primeiro.');
  let ids = [];

  if (p.tipo === 'gemini') {
    const j = await _fetchIA(prov, p.base + '/models?pageSize=200', { headers: _headersIA(prov, chave) });
    ids = (j.models || [])
      .filter(m => (m.supportedGenerationMethods || []).includes('generateContent'))
      .map(m => String(m.name || '').replace(/^models\//, ''))
      .filter(id => /^gemini/.test(id) && !/(embedding|aqa|image|tts|live|audio|robotics|vision-only|thinking-exp)/i.test(id));
  } else if (p.tipo === 'anthropic') {
    const j = await _fetchIA(prov, p.base + '/models?limit=100', { headers: _headersIA(prov, chave) });
    ids = (j.data || []).map(m => m.id).filter(Boolean);
  } else if (prov === 'openrouter') {
    const j = await _fetchIA(prov, p.base + '/models', { headers: chave ? _headersIA(prov, chave) : {} });
    const todos = (j.data || []).map(m => m.id).filter(Boolean);
    ids = todos.filter(id => /:free$/.test(id)).concat(todos.filter(id => !/:free$/.test(id))).slice(0, 80);
  } else {
    const j = await _fetchIA(prov, p.base + '/models', { headers: _headersIA(prov, chave) });
    ids = (j.data || []).map(m => m.id).filter(Boolean);
    if (prov === 'openai') ids = ids.filter(id => /^(gpt|o\d|chatgpt)/.test(id) && !/(audio|realtime|transcribe|tts|image|embedding|moderation|search|instruct|codex|vision)/.test(id));
    if (prov === 'groq') ids = ids.filter(id => !/(whisper|tts|guard|playai|distil-whisper)/i.test(id));
  }

  ids = Array.from(new Set(ids)).sort();
  if (!ids.length) throw new Error('O provedor respondeu, mas não listou nenhum modelo de conversa.');
  try {
    const c = JSON.parse(localStorage.getItem('ctrl_ia_modelos') || '{}');
    c[prov] = { t: Date.now(), ids };
    localStorage.setItem('ctrl_ia_modelos', JSON.stringify(c));
  } catch (e) {}
  return ids;
}

function modelosIACache(prov) {
  try { const c = JSON.parse(localStorage.getItem('ctrl_ia_modelos') || '{}'); return (c[prov] && c[prov].ids) || null; }
  catch (e) { return null; }
}


/* ── modelo aposentado: descobrir o que existe na conta ─────────
   Os provedores aposentam modelos (o Gemini 2.5 Flash, por exemplo,
   deixou de estar disponível para contas novas). Em vez de o usuário
   ficar preso a um nome velho, quando o provedor diz 404/"no longer
   available" o app lista os modelos da chave, escolhe o Flash mais novo,
   guarda a troca e repete o pedido uma vez. */
function _versaoDe(id) { const m = String(id).match(/gemini-(\d+(?:\.\d+)?)/); return m ? parseFloat(m[1]) : 0; }
function _melhorGemini(ids) {
  const limpo = ids.filter(id => /^gemini-/.test(id) && !/(preview|exp|image|tts|live|audio|embedding|thinking|vision|robotics|customtools)/i.test(id));
  const flash = limpo.filter(id => /-flash$/.test(id));
  const porVersao = l => l.slice().sort((a, b) => _versaoDe(b) - _versaoDe(a) || a.length - b.length);
  if (flash.length) return porVersao(flash)[0];
  const lite = limpo.filter(id => /flash-lite$/.test(id)); if (lite.length) return porVersao(lite)[0];
  const alias = ids.find(id => /^gemini-flash-latest$/.test(id)); if (alias) return alias;
  return limpo.length ? porVersao(limpo)[0] : null;
}
const _SUBST_K = 'ctrl_ia_subst';
function _substLer(prov, modelo) {
  try { const t = JSON.parse(localStorage.getItem(_SUBST_K) || '{}'); return (t[prov] && t[prov][modelo]) || modelo; } catch (e) { return modelo; }
}
function _substGravar(prov, de, para) {
  try { const t = JSON.parse(localStorage.getItem(_SUBST_K) || '{}'); (t[prov] = t[prov] || {})[de] = para; localStorage.setItem(_SUBST_K, JSON.stringify(t)); } catch (e) {}
}
/* Último modelo que RESPONDEU, lembrado por 6 h: se o preferido está sobrecarregado (503),
   as próximas perguntas não perdem tempo batendo nele de novo. */
const _OK_K = 'ctrl_ia_ok', _OK_TTL = 6 * 3600 * 1000;
function _okLer(prov) {
  try { const t = JSON.parse(localStorage.getItem(_OK_K) || '{}')[prov]; return t && Date.now() - t.t < _OK_TTL ? t.m : null; } catch (e) { return null; }
}
function _okGravar(prov, m) {
  try { const t = JSON.parse(localStorage.getItem(_OK_K) || '{}'); t[prov] = { m, t: Date.now() }; localStorage.setItem(_OK_K, JSON.stringify(t)); } catch (e) {}
}
const _TRANSITORIO = st => st === 503 || st === 500 || st === 502 || st === 504 || st === 429;

/* O modelo efetivamente usado na última conversa (para a tela mostrar). */
function modeloIAEfetivo(prov, modelo) { return _substLer(prov, modelo || (IA_PROVEDORES[prov] || {}).modeloPadrao); }

/* ── conversa ──────────────────────────────────────── */
const _TOM_IA = {
  normal: 'Tom acolhedor e direto.', firme: 'Tom firme e objetivo.',
  hard: 'Tom duro, sem rodeio, mas sempre respeitoso.', hardmax: 'Resposta curtíssima, só o essencial.'
};

async function perguntarIA(prov, modelo, sistema, pergunta, intensidade, opts) {
  opts = opts || {};
  const p = IA_PROVEDORES[prov]; if (!p) throw new Error('Provedor desconhecido.');
  const chave = IAChave.ler(prov); if (!chave) throw new Error('Nenhuma chave salva para ' + p.rot + '.');
  modelo = modelo || p.modeloPadrao;
  const sis = String(sistema || '') + '\n\nResponda em português do Brasil, em texto simples e curto. ' + (_TOM_IA[intensidade] || '');
  const max = opts.maxTokens || 1200;

  if (p.tipo === 'gemini') {
    const ler = j => {
      if (j.promptFeedback && j.promptFeedback.blockReason) throw new Error('O Gemini bloqueou o pedido (' + j.promptFeedback.blockReason + ').');
      const c = (j.candidates || [])[0];
      return c && c.content && c.content.parts ? c.content.parts.map(x => x.text || '').join('').trim() : '';
    };
    /* Corpo mínimo, igual ao da versão que funcionou: sem limite de tokens nem temperatura
       (modelos com raciocínio podem gastar o limite pensando e devolver texto vazio). */
    const chamar = async (mod, comBusca) => {
      const url = p.base + '/models/' + encodeURIComponent(mod) + ':generateContent';
      const corpo = { systemInstruction: { parts: [{ text: sis }] },
                      contents: [{ role: 'user', parts: [{ text: String(pergunta) }] }] };
      if (comBusca) corpo.tools = [{ google_search: {} }];
      return ler(await _fetchIA(prov, url, { method: 'POST', headers: _headersIA(prov, chave), body: JSON.stringify(corpo) }));
    };
    const tentar = async (mod) => {
      if (opts.permitirBusca === true) {
        try { const t = await chamar(mod, true); if (t) return t; }
        catch (e) { if (e && e.status === 404) throw e; /* busca indisponível ou modelo instável: repete sem ela */ }
      }
      const t = await chamar(mod, false);
      if (!t) throw new Error('O Gemini respondeu vazio.');
      return t;
    };

    /* Ordem de tentativa: o último que respondeu, o pedido (com troca de aposentado), e os
       conhecidos. Modelo sobrecarregado (503/429) passa para o próximo na hora; se nenhum
       responder, uma última tentativa no primeiro, após uma pausa curta. */
    const fila = [];
    const poe = m => { if (m && !fila.includes(m)) fila.push(m); };
    poe(_okLer(prov)); poe(_substLer(prov, modelo)); poe(p.modeloPadrao); poe('gemini-3.5-flash');
    let descobriu = false, ultimoErro = null;
    for (let i = 0; i < fila.length; i++) {
      const mod = fila[i];
      try {
        const t = await tentar(mod);
        _okGravar(prov, mod);
        if (i > 0 && ultimoErro && ultimoErro.status === 404 && mod !== modelo) _substGravar(prov, modelo, mod);
        return t;
      } catch (e) {
        ultimoErro = e;
        if (!e || !e.status) throw e;                                  // rede, bloqueio, resposta vazia: outro modelo não ajuda
        if (e.status === 401 || e.status === 403 || e.status === 400) throw e;   // chave ou pedido: trocar de modelo não resolve
        if (e.status === 404 && !descobriu) {                          // aposentado: acrescenta o que a chave realmente tem
          descobriu = true;
          try { const ids = await listarModelosIA(prov); const nv = _melhorGemini(ids); poe(nv); poe(ids.find(x => /flash-lite$/.test(x) && !/(preview|exp)/.test(x))); } catch (e2) {}
        }
        if (!(e.status === 404 || _TRANSITORIO(e.status))) throw e;
      }
    }
    if (ultimoErro && _TRANSITORIO(ultimoErro.status)) {
      await new Promise(r => setTimeout(r, 2500));
      try { const t = await tentar(fila[0]); _okGravar(prov, fila[0]); return t; } catch (e) { ultimoErro = e; }
    }
    const tentados = fila.join(', ');
    const er = new Error((ultimoErro && ultimoErro.message || 'Falha ao consultar o Gemini.') + ' (modelos tentados: ' + tentados + ')');
    er.status = ultimoErro && ultimoErro.status; throw er;
  }

  if (p.tipo === 'anthropic') {
    const j = await _fetchIA(prov, p.base + '/messages', {
      method: 'POST', headers: _headersIA(prov, chave),
      body: JSON.stringify({ model: modelo, max_tokens: max, temperature: 0.4, system: sis,
                             messages: [{ role: 'user', content: String(pergunta) }] })
    });
    const t = (j.content || []).map(x => x.text || '').join('').trim();
    if (!t) throw new Error('O Claude respondeu vazio.');
    return t;
  }

  // OpenAI, Groq, OpenRouter (formato compatível)
  const corpo = { model: modelo, messages: [{ role: 'system', content: sis }, { role: 'user', content: String(pergunta) }] };
  if (prov === 'openai') corpo.max_completion_tokens = max;     // modelos novos recusam max_tokens
  else { corpo.max_tokens = max; corpo.temperature = 0.4; }
  const j = await _fetchIA(prov, p.base + '/chat/completions', { method: 'POST', headers: _headersIA(prov, chave), body: JSON.stringify(corpo) });
  const t = ((j.choices || [])[0] && j.choices[0].message && j.choices[0].message.content || '').trim();
  if (!t) throw new Error(p.rot + ' respondeu vazio.');
  return t;
}

/* Teste de conexão: uma pergunta mínima, sem busca. */
async function testarIA(prov, modelo) {
  const r = await perguntarIA(prov, modelo, 'Você é um teste de conexão.', 'Responda somente a palavra: ok', 'normal',
                              { permitirBusca: false, maxTokens: 300 });
  return r.slice(0, 60);
}
