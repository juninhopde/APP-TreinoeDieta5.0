/* ══════════════════════════════════════════════════════════
   FOTO DO PRATO (opcional, com a chave do próprio usuário)

   Manda a foto a um provedor de IA com visão e recebe de volta só uma
   lista de alimentos com gramas estimadas. O app NUNCA mostra o texto
   bruto do modelo: a lista vira uma frase, passa pelo mesmo leitor do
   registro por texto (registro-nl.js) e cai numa prévia editável, que a
   pessoa confere antes de gravar.

   Só provedores com modelo de visão: Gemini, OpenAI e Anthropic.
   Groq e OpenRouter ficam de fora porque os modelos padrão deles não
   leem imagem.
   ══════════════════════════════════════════════════════════ */
'use strict';

const PROVEDORES_VISAO = ['gemini', 'openai', 'anthropic'];

const _PROMPT_PRATO =
  'Você é um nutricionista olhando a foto de uma refeição. Liste os alimentos visíveis e estime a ' +
  'quantidade de cada um em gramas (ou mililitros para bebidas), pelo tamanho no prato. ' +
  'Use nomes comuns em português do Brasil, como "arroz branco", "feijão", "frango grelhado", "salada de alface". ' +
  'No máximo 12 itens. Se a foto não mostrar comida, devolva a lista vazia. ' +
  'Responda SOMENTE com JSON, sem texto fora dele, neste formato: ' +
  '{"alimentos":[{"nome":"arroz branco","gramas":150}]}';

/* Primeiro provedor com visão e chave salva, começando pelo escolhido em Ajustes. */
function provedorDeVisao(preferido) {
  const ordem = [preferido].concat(PROVEDORES_VISAO).filter((p, i, a) => p && a.indexOf(p) === i);
  return ordem.find(p => PROVEDORES_VISAO.includes(p) && IAChave.ler(p)) || null;
}

function _blobParaBase64(blob) {
  return new Promise((ok, erro) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result).split(',')[1] || '');
    r.onerror = () => erro(new Error('Não consegui ler a imagem.'));
    r.readAsDataURL(blob);
  });
}

/* Extrai { alimentos:[{nome, gramas}] } da resposta, tolerando cerca de ```json e texto em volta.
   Descarta o que não tem nome ou quantidade plausível. */
function lerListaDoPrato(texto) {
  const t = String(texto || '');
  if (!/[{[]/.test(t)) throw new Error('A IA não devolveu uma lista de alimentos.');
  // aceita o objeto pedido ({alimentos:[...]}) e também uma lista solta ([...]), que alguns modelos devolvem
  const ini = Math.min(...['{', '['].map(c => t.indexOf(c)).filter(x => x >= 0));
  const fim = Math.max(t.lastIndexOf('}'), t.lastIndexOf(']'));
  let obj;
  try { obj = JSON.parse(t.slice(ini, fim + 1)); } catch (e) { throw new Error('A resposta da IA veio num formato que não consegui ler.'); }
  const lista = Array.isArray(obj) ? obj : Array.isArray(obj && obj.alimentos) ? obj.alimentos : [];
  // gramas podem vir como número, "150" ou "150 g"; "1.500" e "1,5" não são lidos como 1,5
  const gramasDe = v => {
    if (typeof v === 'number') return Math.round(v);
    const m = String(v == null ? '' : v).match(/\d[\d.,]*/); if (!m) return NaN;
    let s = m[0];
    s = /^\d{1,3}(\.\d{3})+$/.test(s) ? s.replace(/\./g, '') : s.replace(',', '.');
    return Math.round(parseFloat(s));
  };
  return lista.slice(0, 12).map(a => ({
    // só texto: objeto não vira "object Object"; vírgula e número saem do nome, para não criarem itens falsos na frase
    nome: (a && typeof a.nome === 'string' ? a.nome : '').replace(/[^\p{L} ()\-]/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 60),
    gramas: gramasDe(a && a.gramas)
  })).filter(a => a.nome && a.gramas >= 5 && a.gramas <= 2000);
}

/* Frase no formato que o leitor de refeições entende: "150g de arroz branco, 120g de frango". */
function frasePeloPrato(itens) {
  return 'comi ' + itens.map(a => a.gramas + 'g de ' + a.nome).join(', ');
}

/* Envia a foto (Blob JPEG já reduzido) e devolve a lista estimada. */
async function visaoPratoIA(prov, modelo, blob) {
  const p = IA_PROVEDORES[prov];
  if (!p || !PROVEDORES_VISAO.includes(prov)) throw new Error('Esse provedor não lê imagens.');
  const chave = IAChave.ler(prov); if (!chave) throw new Error('Nenhuma chave salva para ' + p.rot + '.');
  const dados = await _blobParaBase64(blob);
  const mime = 'image/jpeg';
  modelo = modeloIAEfetivo(prov, modelo);
  let texto = '';

  if (p.tipo === 'gemini') {
    const j = await _fetchIA(prov, p.base + '/models/' + encodeURIComponent(modelo) + ':generateContent', {
      method: 'POST', headers: _headersIA(prov, chave),
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: _PROMPT_PRATO }, { inline_data: { mime_type: mime, data: dados } }] }],
                             generationConfig: { responseMimeType: 'application/json' } })
    });
    if (j.promptFeedback && j.promptFeedback.blockReason) throw new Error('O Gemini bloqueou a imagem (' + j.promptFeedback.blockReason + ').');
    const c = (j.candidates || [])[0];
    texto = c && c.content && c.content.parts ? c.content.parts.map(x => x.text || '').join('') : '';
  } else if (p.tipo === 'anthropic') {
    const j = await _fetchIA(prov, p.base + '/messages', {
      method: 'POST', headers: _headersIA(prov, chave),
      body: JSON.stringify({ model: modelo, max_tokens: 900, temperature: 0.2,
        messages: [{ role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: mime, data: dados } }, { type: 'text', text: _PROMPT_PRATO }] }] })
    });
    texto = (j.content || []).map(x => x.text || '').join('');
  } else {
    const j = await _fetchIA(prov, p.base + '/chat/completions', {
      method: 'POST', headers: _headersIA(prov, chave),
      body: JSON.stringify({ model: modelo, max_completion_tokens: 900,
        messages: [{ role: 'user', content: [{ type: 'text', text: _PROMPT_PRATO }, { type: 'image_url', image_url: { url: 'data:' + mime + ';base64,' + dados } }] }] })
    });
    texto = (j.choices || [])[0] && j.choices[0].message && j.choices[0].message.content || '';
  }
  if (!String(texto).trim()) throw new Error(p.rot + ' respondeu vazio.');
  return lerListaDoPrato(texto);
}

if (typeof module !== 'undefined') module.exports = { lerListaDoPrato, frasePeloPrato, provedorDeVisao };
