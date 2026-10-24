/* ══════════════════════════════════════════════════════════
   OPEN FOOD FACTS + CÓDIGO DE BARRAS

   Banco aberto e gratuito, sem chave e sem cadastro, com
   versão brasileira. Substitui o cadastro manual de produto
   industrializado: aponta a câmera para o código de barras e
   o produto entra com os macros do rótulo.

   Tudo que é escaneado vira alimento próprio no aparelho, e
   por isso continua funcionando offline depois.
   ══════════════════════════════════════════════════════════ */

const OFF_BASE = 'https://br.openfoodfacts.org';
const OFF_CAMPOS = 'code,product_name,product_name_pt,brands,quantity,serving_size,serving_quantity,nutriments';
const OFF_TIMEOUT_MS = 8000;

/* Densidade do etanol: o Open Food Facts traz o teor em % vol, o app guarda g de álcool por 100 ml. */
const OFF_G_POR_PCT_VOL = 0.789;

/* Lê o registro do Open Food Facts. Devolve { item } ou { erro }:
   'faltam' (macros ausentes) ou 'inconsistente' (valores impossíveis).
   Dado de voluntário vem errado com frequência — "50 g de proteína,
   80 de carbo e 30 de gordura" por 100 g não existe — e um produto
   com macro absurdo entraria no diário como se fosse verdade. */
function _ofLer(p) {
  if (!p) return { erro: 'faltam' };
  const n = p.nutriments || {};
  const num = v => (v == null || v === '' || isNaN(+v)) ? null : +(+v).toFixed(1);

  const prot = num(n['proteins_100g']);
  const carb = num(n['carbohydrates_100g']);
  const gord = num(n['fat_100g']);
  if (prot == null || carb == null || gord == null) return { erro: 'faltam' };
  // por 100 g nenhum macro passa de 100 nem fica negativo, e a soma não passa de 100 (1 g de folga: arredondamento do rótulo)
  if (prot < 0 || carb < 0 || gord < 0 || prot > 100 || carb > 100 || gord > 100 || prot + carb + gord > 101)
    return { erro: 'inconsistente' };

  const nome = (p.product_name_pt || p.product_name || '').trim();
  if (!nome) return { erro: 'faltam' };
  const marca = (p.brands || '').split(',')[0].trim();

  const item = {
    n: marca && !nome.toLowerCase().includes(marca.toLowerCase()) ? nome + ' (' + marca + ')' : nome,
    p: prot, c: carb, g: gord,
    cat: 'Escaneados', codigo: p.code
  };
  // alcohol_100g do OFF é % vol; o app usa g de álcool por 100 ml
  const alcPct = num(n['alcohol_100g']);
  if (alcPct != null && (alcPct < 0 || alcPct > 100)) return { erro: 'inconsistente' };
  if (alcPct) item.alc = +(alcPct * OFF_G_POR_PCT_VOL).toFixed(1);

  // porção do rótulo vira medida caseira. serving_quantity já vem numérico; o texto
  // é o plano B e exige a unidade como palavra inteira: "2 gomos (30g)" não é "2 g"
  let gramas = +p.serving_quantity;
  if (!(gramas > 0)) {
    const m = String(p.serving_size || '').match(/(\d+(?:[.,]\d+)?)\s*(?:g|ml)\b/i);
    gramas = m ? parseFloat(m[1].replace(',', '.')) : 0;
  }
  if (gramas > 0 && gramas < 2000) { item.un = Math.round(gramas); item.unNome = 'porção'; }
  return { item };
}

/* Converte o registro do Open Food Facts no formato do app.
   Devolve null quando faltam os macros ou eles são impossíveis —
   produto sem rótulo preenchido é pior que produto nenhum. */
function ofParaAlimento(p) {
  return _ofLer(p).item || null;
}

/* GET com limite de tempo e erro em português. Sem isso a tela de
   "Procurando o produto…" ficava para sempre com a rede ruim, e o
   usuário via "Failed to fetch" ou "Unexpected token <" em inglês. */
async function _ofJson(url, msgHttp) {
  const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = setTimeout(() => { if (ctl) ctl.abort(); }, OFF_TIMEOUT_MS);
  const demorou = () => new Error('O banco de produtos demorou demais para responder. Tente de novo.');
  try {
    let r;
    try {
      r = await fetch(url, { headers: { 'Accept': 'application/json' }, signal: ctl ? ctl.signal : undefined });
    } catch (e) {
      throw e && e.name === 'AbortError' ? demorou()
        : new Error('Sem conexão com o banco de produtos. Confira a internet e tente de novo.');
    }
    if (!r.ok) throw new Error(msgHttp(r.status));
    try {
      return await r.json();
    } catch (e) {
      throw e && e.name === 'AbortError' ? demorou()
        : new Error('O banco de produtos devolveu uma resposta inválida. Tente de novo mais tarde.');
    }
  } finally {
    clearTimeout(timer);
  }
}

/* Busca por código de barras. */
async function ofPorCodigo(codigo) {
  const url = OFF_BASE + '/api/v2/product/' + encodeURIComponent(codigo) + '.json?fields=' + OFF_CAMPOS;
  const j = await _ofJson(url, s => 'Não consegui consultar o banco de produtos (' + s + ').');
  if (!j || j.status !== 1 || !j.product) throw new Error('Código não encontrado no banco. Cadastre o produto manualmente.');
  const r = _ofLer(j.product);
  if (r.erro === 'inconsistente')
    throw new Error('Produto encontrado, mas a tabela nutricional no banco tem valores impossíveis (o total passa de 100 g por 100 g). Cadastre manualmente com o rótulo.');
  if (!r.item) throw new Error('Produto encontrado, mas sem tabela nutricional preenchida no banco.');
  return r.item;
}

/* Busca por nome, para quando não há código à mão. */
async function ofPorNome(termo) {
  const url = OFF_BASE + '/cgi/search.pl?search_terms=' + encodeURIComponent(termo)
            + '&search_simple=1&action=process&json=1&page_size=24&fields=' + OFF_CAMPOS;
  const j = await _ofJson(url, () => 'Busca indisponível no momento.');
  return ((j && j.products) || []).map(ofParaAlimento).filter(Boolean).slice(0, 15);
}

/* ── Leitor de código de barras pela câmera ──────────────
   Usa a BarcodeDetector do próprio navegador. Onde ela não
   existe, o app cai para digitação manual do código, que
   funciona em qualquer aparelho. */

const temDetector = () => typeof window.BarcodeDetector !== 'undefined';

async function formatosSuportados() {
  if (!temDetector()) return [];
  try { return await window.BarcodeDetector.getSupportedFormats(); } catch (e) { return []; }
}

function criarLeitor(video, aoLer, aoErro) {
  let parar = false, stream = null, det = null, timer = null;

  async function iniciar() {
    if (parar) return;
    if (!temDetector()) { aoErro(new Error('sem-detector')); return; }
    try {
      det = new window.BarcodeDetector({
        formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'itf']
      });
      const obtido = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 } }, audio: false
      });
      // encerrar() pode ter vindo enquanto o navegador pedia a permissão: sem esta
      // checagem a câmera abria depois de fechada a tela e ficava ligada (luz acesa)
      if (parar) { obtido.getTracks().forEach(t => t.stop()); return; }
      stream = obtido;
      video.srcObject = stream;
      video.setAttribute('playsinline', '');
      await video.play();
      if (parar) return;
      laco();
    } catch (e) {
      if (parar) return;                 // a pessoa já fechou: erro de uma câmera que ela nem queria mais
      aoErro(e.name === 'NotAllowedError'
        ? new Error('Permissão de câmera negada.')
        : new Error('Não consegui abrir a câmera.'));
    }
  }

  async function laco() {
    if (parar) return;
    try {
      const achados = await det.detect(video);
      if (parar) return;                 // fechou durante a leitura: não dispara busca de uma tela que não existe mais
      const bom = achados.find(x => x.rawValue && /^\d{8,14}$/.test(x.rawValue));
      if (bom) { encerrar(); aoLer(bom.rawValue); return; }
    } catch (e) { /* frame ruim: segue */ }
    if (parar) return;
    timer = setTimeout(laco, 220);
  }

  /* Idempotente: pode ser chamada várias vezes e em qualquer momento
     (antes, durante ou depois de a câmera abrir). */
  function encerrar() {
    parar = true;
    clearTimeout(timer);
    if (stream) stream.getTracks().forEach(t => t.stop());
    stream = null;
    try { video.srcObject = null; } catch (e) { /* vídeo já saiu da tela */ }
  }

  return { iniciar, encerrar };
}
