/* ══════════════════════════════════════════════════════════
   REGISTRO POR LINGUAGEM NATURAL

   Transforma "comi 100g de arroz, 100g de feijão, 1 bife e
   salada de tomate com um copo de coca" em itens do diário,
   com gramagem resolvida e macros da tabela.

   Três regras de projeto:
   1. Nunca grava sozinho. Sempre mostra o que entendeu e
      espera confirmação — errar para mais no registro é o
      mesmo que mentir para o próprio déficit.
   2. Quando não acha o alimento, diz qual não achou em vez
      de inventar um parecido.
   3. Medida informal ("um bife", "uma concha") vira gramagem
      explícita e editável, nunca um chute escondido.

   Contrato de saída de interpretarRefeicao:
     itens    cada um com `aviso` (texto) quando a gramagem é
              suposição ou fora do comum — a tela deve mostrar
     perdidos { dito, sugestoes, motivo? } — o que não entrou
              e por quê (não achou, quantidade negativa/absurda…)
   ══════════════════════════════════════════════════════════ */

const NUM_PALAVRA = {
  'um':1,'uma':1,'hum':1,'dois':2,'duas':2,'tres':3,'três':3,'quatro':4,'cinco':5,
  'seis':6,'sete':7,'oito':8,'nove':9,'dez':10,'onze':11,'doze':12,
  'meio':0.5,'meia':0.5,'metade':0.5,'um quarto':0.25
};

/* Medidas informais → gramas. Quando o alimento tem porção
   própria cadastrada, ela tem prioridade sobre esta tabela. */
const MEDIDA_INFORMAL = {
  'g':1,'grama':1,'gramas':1,'gr':1,
  'kg':1000,'quilo':1000,'quilos':1000,
  'ml':1,'mililitro':1,'mililitros':1,'l':1000,'litro':1000,'litros':1000,
  'colher':15,'colheres':15,'colher de sopa':15,'colheres de sopa':15,
  'colher de cha':5,'colheres de cha':5,'colher de chá':5,
  'colher de sobremesa':10,'colheres de sobremesa':10,
  'concha':80,'conchas':80,
  'fatia':25,'fatias':25,
  'copo':200,'copos':200,'copao':350,
  'xicara':200,'xicaras':200,'xícara':200,
  'lata':350,'latas':350,
  'garrafa':500,'garrafas':500,
  'taca':150,'tacas':150,'taça':150,
  'prato':400,'pratos':400,'pratinho':250,
  'bife':150,'bifes':150,'file':150,'filé':150,'files':150,'filés':150,
  'posta':150,'postas':150,'peito':180,'coxa':100,'sobrecoxa':130,'asa':45,
  'pedaco':100,'pedaço':100,'pedacos':100,'pedaços':100,
  'porcao':120,'porção':120,'porcoes':120,'porções':120,
  'punhado':30,'punhados':30,'pitada':1,
  'unidade':100,'unidades':100,'un':100,
  'scoop':30,'scoops':30,'dose':50,'doses':50,'pote':170,'potes':170,
  'espeto':80,'espetos':80,'concha cheia':100,'tigela':300,
  'pacote':null                       // medida reconhecida, mas sem peso próprio: vale o do alimento (ou 100 g, avisando)
};

/* Como as pessoas realmente falam. Sem isto, "coca" e "miojo"
   simplesmente não existem na base. */
const SINONIMOS = {
  'coca':'Refrigerante comum','coca cola':'Refrigerante comum','refri':'Refrigerante comum',
  'guarana':'Refrigerante comum','refrigerante':'Refrigerante comum',
  'coca zero':'Refrigerante zero','refri zero':'Refrigerante zero','guarana zero':'Refrigerante zero',
  'miojo':'Macarrão instantâneo','macarrao instantaneo':'Macarrão instantâneo',
  'paozinho':'Pão francês','pao':'Pão francês','pao frances':'Pão francês',
  'pao integral':'Pão de forma integral','pao de forma':'Pão de forma branco',
  'frango':'Peito de frango grelhado','peito de frango':'Peito de frango grelhado',
  'carne':'Bife acebolado','bife':'Bife acebolado','bife de carne':'Bife acebolado',
  'patinho':'Patinho moído cozido','carne moida':'Carne moída refogada',
  'arroz':'Arroz branco cozido','feijao':'Feijão carioca cozido',
  'salada':'Alface','salada de tomate':'Tomate','salada verde':'Alface',
  'batata':'Batata inglesa cozida','batata doce':'Batata doce cozida',
  'macarrao':'Macarrão cozido','ovo':'Ovo de galinha inteiro','ovos':'Ovo de galinha inteiro',
  'whey':'Whey protein concentrado','iogurte':'Iogurte natural integral',
  'leite':'Leite integral','queijo':'Queijo mussarela','presunto':'Presunto magro',
  'banana':'Banana prata','maca':'Maçã','cafe':'Café sem açúcar',
  'cerveja':'Cerveja','suco':'Suco de laranja natural','agua de coco':'Água de coco',
  'agua':'Água','agua mineral':'Água','agua natural':'Água','agua gelada':'Água','agua sem gas':'Água',
  'agua com gas':'Água com gás','acucar':'Açúcar refinado',
  'aveia':'Aveia em flocos','tapioca':'Tapioca (goma hidratada)','cuscuz':'Cuscuz de milho cozido',
  'farofa':'Farofa','mandioca':'Mandioca cozida','peixe':'Tilápia grelhada','tilapia':'Tilápia grelhada',
  'atum':'Atum em água (lata)','azeite':'Azeite de oliva','manteiga':'Manteiga',
  'pizza':'Pizza calabresa','hamburguer':'X-burger','lanche':'X-salada','marmita':'Marmita executiva média',
  'chocolate':'Chocolate ao leite','sorvete':'Sorvete de massa','bolacha':'Biscoito água e sal',
  'pao de queijo':'Pão de queijo','requeijao':'Requeijão light','brocolis':'Brócolis cozido'
};

const VERBOS_REG = ['comi','comer','almocei','jantei','lanchei','ceei','tomei','bebi','ingeri',
  'devorei','registra','registrar','registre','anota','anotar','anote','adiciona','adicionar',
  'adicione','lanca','lancar','lance','coloca','colocar','poe','põe','marca','marcar'];

/* Refeição: o verbo manda mais que o substantivo solto. "almocei
   arroz e um café" é almoço, não café da manhã. */
const REF_POR_VERBO = { almocei:'almoco', jantei:'jantar', lanchei:'lanche', ceei:'extra' };
const REF_POR_PALAVRA = {
  'cafe da manha':'cafe','café da manhã':'cafe','manha':'cafe','manhã':'cafe',
  'almoco':'almoco','almoço':'almoco','almocei':'almoco',
  'lanche':'lanche','tarde':'lanche','lanchei':'lanche',
  'janta':'jantar','jantar':'jantar','jantei':'jantar','noite':'jantar',
  'ceia':'extra','extra':'extra','madrugada':'extra',
  'cafe':'cafe'                       // "café" solto é a pista mais fraca: só vale sem verbo nem expressão
};


/* ── 0. TEXTO: acento, plural e decimal ─────────────────────
   Tudo que o parser compara passa por aqui, para "pães" = "pão",
   "colheres" = "colher" e "1,5" continuar 1,5 (o `norm` do
   assistente apagava vírgula e ponto e virava 15).            */

const _PLURAL_FIXO = new Set(['tres','seis','dois','duas','mais','menos','pais','gas','tenis',
  'lapis','reis','onibus','uns']);

const _MARCAS_ACENTO = new RegExp('[' + String.fromCharCode(0x300) + '-' + String.fromCharCode(0x36f) + ']', 'g');   // acentos soltos após o NFD
const _nlSemAcento = s => String(s).toLowerCase().normalize('NFD').replace(_MARCAS_ACENTO, '');

/* Singular de uma palavra já sem acento. Não precisa ser gramática
   perfeita, precisa ser a MESMA nos dois lados da comparação. */
function _singPal(w) {
  if (w.length <= 3 || _PLURAL_FIXO.has(w) || /\d/.test(w)) return w;
  if (/(?:oes|aes)$/.test(w)) return w.slice(0, -3) + 'ao';      // pães, limões
  if (/(?:ai|ei|ui)s$/.test(w)) return w.slice(0, -2) + 'l';     // integrais, pastéis
  if (/ns$/.test(w)) return w.slice(0, -2) + 'm';                // bombons
  if (/(?:res|zes)$/.test(w)) return w.slice(0, -2);             // colheres, nozes
  if (/(?:ss|us|is)$/.test(w)) return w;
  if (/s$/.test(w)) return w.slice(0, -1);
  return w;
}

/* Palavras do texto. O "_" é a vírgula decimal já resolvida ("1_5"),
   e número colado em letra se separa ("150g" → "150" "g"). */
function _tokens(t) {
  return String(t).replace(/(\d+(?:_\d+)?)\s*%/g, ' pct$1 ')       // "100%" é parte do nome ("pão 100% integral"), não quantidade
    .replace(/[^a-z0-9_\s]/g, ' ').replace(/(\d)([a-z])/g, '$1 $2').split(/\s+/).filter(Boolean);
}
const _canonTokens = t => _tokens(t).map(_singPal);

/* Palavras que aparecem em frases de comida e não são alimento. */
const RUIDO = (function () {
  // "sem" NÃO é ruído: "água sem gás" ≠ "água com gás" e "café sem açúcar" é um item da base
  const base = ['de','do','da','dos','das','com','e','mais','um','uma','o','a','os','as',
    'no','na','nos','nas','pra','para','hoje','agora','ontem','cedo','tarde','noite','manha','manhã',
    'meu','minha','eu','ja','já','tambem','também','acabei','acabo','tipo','uns','umas','só','so',
    'pouco','pouquinho','bastante','muito','algum','alguns','varios'];
  const s = new Set();
  base.forEach(w => { const n = _nlSemAcento(w); s.add(n); s.add(_singPal(n)); s.add(_singPal(n + 's')); });
  return s;
})();

/* Palavras genéricas que não definem o alimento: "salada de alface"
   é alface, a cabeça da frase é a palavra depois de "salada". */
const GENERICAS = new Set(['salada','prato','porcao','pedaco','mix']);

const _VERBOS = new Set(VERBOS_REG.map(v => _singPal(_nlSemAcento(v))));
const _UNID_DIRETA = { g:1, gr:1, grama:1, kg:1000, quilo:1000, ml:1, mililitro:1, l:1000, litro:1000 };
const _tem = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

/* Chave única de uma medida: singular, sem acento e sem "de" —
   "colheres de sopa", "colher sopa" e "colher de sopa" são a mesma. */
function _chaveMedida(m) {
  return _canonTokens(_nlSemAcento(m)).filter(w => w !== 'de' && w !== 'do' && w !== 'da').join(' ');
}

/* Medidas fixas: pesam o mesmo para qualquer alimento. A mesma chave
   cobre plural e variações de grafia, e a mais longa é testada primeiro
   (ver _lerQtd), então "colher de sopa" nunca perde para "colher". */
const _MEDIDAS_FIXAS = (function () {
  const m = Object.create(null);
  Object.keys(MEDIDA_INFORMAL).forEach(k => {
    const c = _chaveMedida(k);
    if (c && !_tem(_UNID_DIRETA, c) && m[c] === undefined) m[c] = MEDIDA_INFORMAL[k];
  });
  return m;
})();

/* Apelidos na mesma chave dos nomes: sem "de", "da"… e no singular.
   Antes, "pao de queijo" e "agua de coco" nunca casavam porque o
   "de" era apagado do nome dito mas não da chave. */
const _chaveNome = t => _canonTokens(_nlSemAcento(t)).filter(w => !RUIDO.has(w)).join(' ');
const _SIN_CANON = (function () {
  const m = Object.create(null);
  Object.keys(SINONIMOS).forEach(k => { const c = _chaveNome(k); if (c && m[c] === undefined) m[c] = SINONIMOS[k]; });
  return m;
})();


/* ── 1. PREPARO DO TEXTO ────────────────────────────────────
   Minúsculas, sem acento, decimal resolvido e quantidades por
   extenso virando número — SEM apagar vírgula, ponto-e-vírgula,
   "+" nem quebra de linha, que ainda separam os alimentos.   */

const _fmtNum = x => String(+(+x).toFixed(2)).replace('.', '_');
const _valNum = n => /^\d/.test(n) ? parseFloat(n.replace('_', '.')) : NUM_PALAVRA[n];

function _preparar(frase) {
  let t = ' ' + _nlSemAcento(frase) + ' ';
  t = t.replace(/\b(\d{1,2})\s+(\d+)\s*\/\s*(\d+)/g, (m, a, b, c) => +c ? _fmtNum(+a + (+b) / (+c)) : m);   // "1 1/2"
  t = t.replace(/(\d+)\s*\/\s*(\d+)/g, (m, a, b) => +b ? _fmtNum(+a / +b) : m);                              // "1/2"
  t = t.replace(/(\d)[.,](\d)/g, '$1_$2');                                                                   // "1,5" e "1.5"
  t = t.replace(/\b(\d+(?:_\d+)?|um|uma|dois|duas|tres|quatro|cinco|seis|sete|oito|nove|dez)\s+e\s+(?:meio|meia)\b/g,
    (m, n) => _fmtNum(_valNum(n) + 0.5));                                                                    // "dois e meio"
  t = t.replace(/\b(?:um|uma)\s+quarto\b/g, '0_25').replace(/\btres\s+quartos\b/g, '0_75');
  t = t.replace(/(^|[\s(])-+\s*(\d)/g, '$1 negativo $2');                                                   // "-3": rejeitado adiante
  return t;
}

/* O que a pessoa leu de volta na prévia: sem os marcadores internos. */
const _exibir = s => String(s).replace(/\bnegativo\s+/g, '-').replace(/(\d)_(\d)/g, '$1,$2').trim();

/* Nome da base em palavras canônicas (com cache: 1000+ itens por frase). */
const _CN = new WeakMap();
function _canonNome(a) {
  let c = _CN.get(a);
  if (!c || c.n !== a.n) {
    const toks = _canonTokens(_nlSemAcento(a.n));
    c = { n: a.n, toks, chave: toks.join(' '), exato: toks.filter(w => !RUIDO.has(w)).join(' '),
          uteis: toks.filter(w => w.length > 2 && !RUIDO.has(w)) };
    _CN.set(a, c);
  }
  return c;
}

function _indiceNomes(base) {
  const m = new Map();
  (base || []).forEach(a => { const k = _canonNome(a).chave; if (!m.has(k)) m.set(k, a); });
  return m;
}

/* Medidas da frase = fixas + as medidas que a própria base usa
   ("taça", "barra", "pacote"). Medida da base que também é palavra de
   nome de alimento ("ovo", "asa", "lanche") fica de fora: "2 ovos
   mexidos" é número + alimento, não número + medida "ovo". */
function _montarMedidas(base) {
  const m = Object.assign(Object.create(null), _MEDIDAS_FIXAS);
  if (!base) return m;
  const palavras = new Set();
  base.forEach(a => _canonNome(a).toks.forEach(w => palavras.add(w)));
  base.forEach(a => {
    if (!a.unNome) return;
    const c = _chaveMedida(a.unNome);
    if (!c || m[c] !== undefined || _tem(_UNID_DIRETA, c) || _tem(NUM_PALAVRA, c)) return;
    if (c.split(' ').some(w => palavras.has(w))) return;
    m[c] = null;                       // sem peso fixo: vale o `un` do próprio alimento
  });
  return m;
}


/* ── 2. QUANTIDADE ──────────────────────────────────────────
   Lê, a partir da palavra i, uma quantidade completa:
     "150 g" / "1,5 kg" (direta) · "2 colheres de sopa" (medida) · "2" / "meio" (número puro).
   Devolve { len, qtd, tipo, unid|chave } ou null.             */

function _lerQtd(can, i, M) {
  const w = can[i];
  let qtd;
  if (/^\d+(?:_\d+)?$/.test(w)) qtd = parseFloat(w.replace('_', '.'));
  else if (_tem(NUM_PALAVRA, w) && w.indexOf(' ') < 0) qtd = NUM_PALAVRA[w];
  else return null;
  if (w === 'meio' && can[i + 1] === 'amargo') return null;        // "chocolate meio amargo"
  if (can[i - 1] === 'de' && !/^\d/.test(w)) return null;          // "baião de dois": número por extenso depois de "de" é nome

  if (i + 1 < can.length && _tem(_UNID_DIRETA, can[i + 1])) return { len: 2, qtd, tipo: 'direta', unid: can[i + 1] };
  for (let k = 3; k >= 1; k--) {                                   // medida caseira: a mais longa primeiro
    const fr = can.slice(i + 1, i + 1 + k);
    if (fr.length < k || fr[0] === 'de') continue;
    const chave = fr.filter(x => x !== 'de').join(' ');
    if (chave && M[chave] !== undefined) return { len: 1 + k, qtd, tipo: 'medida', chave };
  }
  return { len: 1, qtd, tipo: 'num' };
}

/* Corta um trecho (já sem conectivos) em um alimento por pedaço.

   Quantidade ANTES do nome ("100g de arroz 100g de feijão") e DEPOIS
   ("arroz 150g feijão 100g") são as duas formas comuns. Regra: uma
   quantidade nova só abre item novo se o trecho atual já tem
   quantidade; uma palavra nova só abre item novo se o trecho já é
   "nome + quantidade" e a palavra vem seguida de outra quantidade.
   Assim nenhuma quantidade é arrastada para o item vizinho.      */
function _segmentarQtd(orig, M) {
  const can = orig.map(_singPal);
  const segs = [];
  for (let i = 0; i < can.length; ) {
    const q = _lerQtd(can, i, M);
    if (q) { segs.push({ t: 'Q', i, j: i + q.len }); i += q.len; continue; }
    const u = segs[segs.length - 1];
    if (u && u.t === 'W') u.j = i + 1; else segs.push({ t: 'W', i, j: i + 1 });
    if (!RUIDO.has(can[i]) && !_VERBOS.has(can[i])) segs[segs.length - 1].nome = true;   // "comi" e "de" não são nome
    i++;
  }

  const pedacos = [];
  let cur = null;
  const fecha = () => { if (cur) pedacos.push(orig.slice(cur.ini, cur.fim).join(' ')); cur = null; };
  segs.forEach((s, k) => {
    if (s.t === 'Q') {
      if (cur && cur.q) fecha();
      if (!cur) cur = { ini: s.i, fim: s.j, q: false, antes: false };
      cur.q = true; cur.fim = s.j;
    } else {
      const proxQ = !!segs[k + 1] && segs[k + 1].t === 'Q';
      if (cur && cur.q && cur.antes && proxQ) fecha();
      if (!cur) cur = { ini: s.i, fim: s.j, q: false, antes: false };
      if (!cur.q && s.nome) cur.antes = true;
      cur.fim = s.j;
    }
  });
  fecha();
  return pedacos;
}

/* Divide a frase em pedaços que representam um alimento cada.

   1. [,;+ quebra de linha] ANTES de qualquer limpeza — a vírgula
      decimal já foi protegida em _preparar;
   2. conectivos "e" / "mais";
   3. "com" separa ("arroz com feijão"), a não ser que o prato
      inteiro exista na base ("café com leite", "pão com ovo");
   4. início/fim de quantidade (_segmentarQtd).                 */
function fatiarItens(frase, base, M, idx) {
  M = M || _MEDIDAS_FIXAS;
  idx = idx || (base ? _indiceNomes(base) : null);
  const fino = [];

  _preparar(frase).split(/[,;+\n]/).forEach(bloco => {
    const orig = _tokens(bloco);
    if (!orig.length) return;
    const can = orig.map(_singPal);

    const partes = [[]];
    for (let i = 0; i < can.length; i++) {
      if (can[i] === 'e' || can[i] === 'mais') {
        if (can[i] === 'e' && can[i + 1] === 'mais') i++;
        partes.push([]);
        continue;
      }
      partes[partes.length - 1].push(i);
    }

    partes.forEach(ix => {
      if (!ix.length) return;
      let grupos = [ix];
      if (ix.some(i => can[i] === 'com')) {
        const inteiro = idx && idx.has(lerPedaco(ix.map(i => orig[i]).join(' '), M).completo);
        if (!inteiro) {
          grupos = [[]];
          ix.forEach(i => { if (can[i] === 'com') grupos.push([]); else grupos[grupos.length - 1].push(i); });
        }
      }
      grupos.forEach(g => {
        if (!g.length) return;
        _segmentarQtd(g.map(i => orig[i]), M).forEach(x => { if (x.length > 1) fino.push(x); });
      });
    });
  });
  return fino;
}

/* Extrai quantidade, medida e nome de um pedaço.
   Devolve { nome, qtd, medida, negativo, extras, completo }:
     nome      palavras do alimento, sem ruído (é o que se procura na base)
     completo  o mesmo com "de/com/sem" — para reconhecer pratos inteiros
     extras    outras quantidades no mesmo pedaço (o parser usou uma só) */
function lerPedaco(txt, M) {
  M = M || _MEDIDAS_FIXAS;
  const orig = _tokens(_preparar(txt));
  const can = orig.map(_singPal);
  const n = orig.length;
  const fora = new Array(n).fill(false);
  let negativo = false;
  can.forEach((w, i) => { if (w === 'negativo') { negativo = true; fora[i] = true; } });

  // quantidades: peso/volume > medida caseira > número puro
  const cands = [];
  for (let i = 0; i < n; ) {
    if (fora[i]) { i++; continue; }
    const q = _lerQtd(can, i, M);
    if (q) { q.i = i; cands.push(q); i += q.len; } else i++;
  }
  const ordem = { direta: 0, medida: 1, num: 2 };
  let esc = null;
  cands.forEach(c => { if (!esc || ordem[c.tipo] < ordem[esc.tipo]) esc = c; });
  const extras = [];
  cands.forEach(c => {
    for (let k = 0; k < c.len; k++) fora[c.i + k] = true;
    if (c !== esc && /^\d/.test(can[c.i])) extras.push(_exibir(orig.slice(c.i, c.i + c.len).join(' ')));
  });

  // verbo de registro, e "no almoço"/"no jantar"/"café da manhã": dizem a refeição, não o alimento
  can.forEach((w, i) => { if (_VERBOS.has(w)) fora[i] = true; });
  const PREP = ['no', 'na', 'pro', 'pra', 'para', 'de', 'do', 'da', 'ao'];
  const PAL_REF = ['almoco', 'jantar', 'janta', 'lanche', 'lanchinho', 'ceia', 'manha', 'tarde', 'noite', 'madrugada'];
  for (let i = 0; i < n; i++) {
    if (can[i] === 'cafe' && can[i + 1] === 'da' && can[i + 2] === 'manha') { fora[i] = fora[i + 1] = fora[i + 2] = true; continue; }
    if (['almoco', 'jantar', 'janta', 'ceia'].indexOf(can[i]) >= 0) fora[i] = true;
    if (PREP.indexOf(can[i]) < 0) continue;
    let j = i + 1;
    if (can[j] === 'o' || can[j] === 'a') j++;
    if (PAL_REF.indexOf(can[j]) >= 0 || (can[j] === 'cafe' && ['no', 'pro', 'pra', 'para'].indexOf(can[i]) >= 0))
      for (let k = i; k <= j; k++) fora[k] = true;
  }

  const nome = [], completo = [];
  orig.forEach((w, i) => {
    if (fora[i] || /^\d/.test(w)) return;
    if (['um', 'uma', 'o', 'a', 'os', 'as', 'uns', 'umas'].indexOf(w) < 0) completo.push(can[i]);
    if (!RUIDO.has(can[i])) nome.push(w);
  });

  let medida = null;
  if (esc && esc.tipo === 'direta') medida = orig[esc.i + 1];
  else if (esc && esc.tipo === 'medida') medida = orig.slice(esc.i + 1, esc.i + esc.len).filter((w, k, a) => !(w === 'de' && k === a.length - 1)).join(' ');
  return { nome: nome.join(' ').trim(), qtd: esc ? esc.qtd : null, medida, negativo, extras, completo: completo.join(' ') };
}


/* ── 3. CASAMENTO COM A BASE ────────────────────────────────  */

/* 2 = igual (ou só muda o gênero: grelhado/grelhada); 1 = só o começo
   é parecido (serve para sugerir, nunca para aceitar); 0 = nada. */
function _casaPalavra(t, w) {
  if (w === t) return 2;
  if (t.length >= 5 && w.length === t.length && w.slice(0, -1) === t.slice(0, -1)) return 2;
  if (w.length > 3 && t.length > 3 && (w.startsWith(t.slice(0, 4)) || t.startsWith(w.slice(0, 4)))) return 1;
  return 0;
}

/* Pontua todos os candidatos da base contra o nome dito, do mais
   parecido ao menos. Usada tanto para achar com confiança
   (acharAlimento) quanto para sugerir parecidos quando nada bate
   o piso de confiança (sugerirAlimentos) — a mesma régua nos dois casos.
   `cabecaOk`: a primeira palavra que define o alimento ("pão" em
   "pão de queijo") casou de verdade. Sem isso o casamento é só
   sugestão: "5 pães de queijo" não vira "Queijo cottage".          */
function _pontuarCandidatos(nomeDito, base) {
  const toks = _canonTokens(_nlSemAcento(nomeDito)).filter(t => t.length > 2 && !RUIDO.has(t));
  if (!toks.length) return [];
  const cabeca = toks.find(t => !GENERICAS.has(t)) || toks[0];
  const alvoExato = _chaveNome(nomeDito);

  const out = [];
  base.forEach(a => {
    const c = _canonNome(a);
    if (!c.uteis.length) return;
    let p = 0, cabecaOk = false;
    if (c.exato === alvoExato) { p = 1000; cabecaOk = true; }
    else {
      toks.forEach(t => {
        let melhor = 0;
        c.uteis.forEach(w => { const m = _casaPalavra(t, w); if (m > melhor) melhor = m; });
        if (melhor === 2) { p += 40; if (t === cabeca) cabecaOk = true; }
        else if (melhor === 1) p += 22;
      });
      if (!p) return;
      // Penaliza palavra do candidato que a pessoa NÃO disse.
      // Sem isso "salada de tomate" casava com "Salada de maionese".
      p -= c.uteis.filter(w => w !== 'sem' && !toks.some(t => _casaPalavra(t, w))).length * 14;
    }
    if (p > 0) out.push({ a, p, cabecaOk });
  });
  return out.sort((x, y) => y.p - x.p);
}

/* Casa com a base, priorizando quem tem mais palavras em comum. */
function acharAlimento(nome, base) {
  const alvo = _chaveNome(nome);
  if (!alvo) return null;

  // apelido do dia a dia tem prioridade sobre qualquer busca
  const apelido = _SIN_CANON[alvo];
  if (apelido) {
    const direto = base.find(a => a.n === apelido);
    if (direto) return direto;
  }

  // só aceita quem casou a cabeça da frase, e que não esteja muito atrás do melhor
  // (o melhor sem cabeça é só sugestão: ver sugerirAlimentos)
  const cands = _pontuarCandidatos(nome, base);
  const certo = cands.find(x => x.cabecaOk);
  return certo && certo.p >= 20 && certo.p >= cands[0].p - 14 ? certo.a : null;
}

/* Quando NÃO acha com confiança, sugere os alimentos REAIS mais
   próximos do banco — nunca inventa um novo nem chuta macro. A regra
   do topo deste arquivo continua valendo: dizer o que não achou, não
   fabricar um parecido. Isto só aponta para o que já existe e já foi
   conferido. */
function sugerirAlimentos(nome, base, n) {
  n = n || 3;
  return _pontuarCandidatos(nome, base).slice(0, n).map(x => x.a.n);
}


/* ── 4. GRAMAGEM ────────────────────────────────────────────  */

/* Medidas que também são o próprio alimento (cortes de carne). */
const CORTES = new Set(['bife', 'file', 'posta', 'peito', 'coxa', 'sobrecoxa', 'asa', 'espeto']);

/* Fração de um alimento que se compra inteiro: "meia pizza" são 4 fatias. */
const FRACAO_DE_INTEIRO = [{ re: /^pizza\b/, unidade: 'fatia', n: 8 }];

/* Resolve a gramagem final de um item. Devolve { gramas, q, u, aviso? };
   `aviso` aparece sempre que a gramagem é suposição, nunca em silêncio. */
function resolverGramas(a, qtd, medida) {
  const R = (gramas, q, u, aviso) => { const r = { gramas, q, u }; if (aviso) r.aviso = aviso; return r; };

  // sem quantidade: usa a porção do alimento, senão 100 g
  if (qtd == null) {
    return a.un ? R(a.un, 1, a.unNome, 'sem quantidade: usei 1 ' + a.unNome + ' (' + a.un + ' g)')
                : R(100, 100, 'g', 'sem quantidade: usei 100 g');
  }
  if (!medida) {
    // número puro + alimento que tem unidade → "2 ovos"
    if (a.un) {
      const fr = qtd < 1 && FRACAO_DE_INTEIRO.find(f => f.re.test(_canonNome(a).chave) && _chaveMedida(a.unNome || '') === f.unidade);
      if (fr) return R(qtd * fr.n * a.un, qtd * fr.n, a.unNome, 'contei ' + fr.n + ' ' + fr.unidade + 's por inteira');
      return R(qtd * a.un, qtd, a.unNome);
    }
    // Contagem ("meio abacate", "6 morangos") de alimento sem unidade cadastrada:
    // não há peso de unidade para multiplicar, e 0,5 g ou 600 g seriam chute escondido.
    // Pede o peso em vez de gravar errado.
    if (qtd < 10) {
      const r = R(0, qtd, 'unidade');
      r.recusa = 'sem peso de unidade cadastrado para ' + a.n + ': diga em gramas (ex.: 150 g)';
      return r;
    }
    return R(qtd, qtd, 'g');
  }

  const m = _chaveMedida(medida);
  // peso ou volume direto
  if (_tem(_UNID_DIRETA, m)) return R(qtd * _UNID_DIRETA[m], qtd * _UNID_DIRETA[m], 'g');

  // Medida caseira. A porção cadastrada do alimento só vale quando é a
  // MESMA medida que a pessoa falou — senão "um copo de coca" virava
  // uma lata de 350 ml só porque a lata é a porção cadastrada.
  const un = a.unNome ? _chaveMedida(a.unNome).split(' ') : [];
  const mesmaMedida = !!(a.un && un.length &&
    (m === 'unidade' || m === 'un' || m.split(' ').every(w => un.indexOf(w) >= 0)));
  const fixo = _MEDIDAS_FIXAS[m];
  const fator = mesmaMedida ? a.un : (fixo != null ? fixo : (a.un || 100));
  return R(qtd * fator, qtd, mesmaMedida ? a.unNome : medida,
    mesmaMedida || fixo != null ? '' : 'medida sem peso conhecido: usei ' + fator + ' g por ' + medida);
}

/* Qual refeição: verbo > expressão ("no almoço", "café da manhã") >
   "café" solto > hora. */
function inferirRefeicao(frase, hora) {
  const q = ' ' + _canonTokens(_nlSemAcento(frase)).join(' ') + ' ';
  const tem = k => q.indexOf(' ' + _canonTokens(_nlSemAcento(k)).join(' ') + ' ') >= 0;
  for (const v in REF_POR_VERBO) if (tem(v)) return REF_POR_VERBO[v];
  if (/ (?:tomei|tomando|tomo) (?:o )?cafe /.test(q)) return 'cafe';          // "tomei café": é a refeição
  for (const k in REF_POR_PALAVRA) {
    if (_nlSemAcento(k) !== 'cafe' && tem(k)) return REF_POR_PALAVRA[k];
  }
  if (tem('cafe')) return 'cafe';
  if (hora == null) hora = new Date().getHours();
  if (hora < 10) return 'cafe';
  if (hora < 15) return 'almoco';
  if (hora < 18) return 'lanche';
  if (hora < 23) return 'jantar';
  return 'extra';
}

/* Ponto de entrada. `base` = ALIMENTOS + customizados. */
function interpretarRefeicao(frase, base, hora) {
  // O custo do casamento cresce mais que linearmente com o texto: um colar de milhares de
  // caracteres travava a tela por segundos. Uma refeição cabe com folga em 600.
  frase = String(frase == null ? '' : frase).slice(0, 600);
  const M = _montarMedidas(base);
  const pedacos = fatiarItens(frase, base, M, _indiceNomes(base));
  const itens = [], perdidos = [];
  const recusa = (p, motivo) => perdidos.push({ dito: _exibir(p), sugestoes: [], motivo });

  pedacos.forEach(p => {
    const { nome, qtd, medida, negativo, extras } = lerPedaco(p, M);
    if (negativo) { recusa(p, 'quantidade negativa'); return; }
    // "1 bife de carne", "2 coxas de frango": "bife"/"coxa" é medida E é alimento.
    // Tenta as duas leituras; quando a medida é um corte, ela vem primeiro
    // (senão "2 coxas de frango" virava peito de frango).
    const candidatos = [nome];
    if (medida && !_tem(_UNID_DIRETA, _chaveMedida(medida))) {
      const junto = (medida + ' ' + nome).trim();
      if (CORTES.has(_chaveMedida(medida))) candidatos.unshift(junto); else candidatos.push(junto);
    }
    let a = null;
    candidatos.forEach(cn => { if (!a && cn && cn.length >= 3) a = acharAlimento(cn, base); });
    if (!a) {
      if (nome && nome.length >= 3) perdidos.push({ dito: nome, sugestoes: sugerirAlimentos(nome, base, 3) });
      else if (qtd != null) recusa(p, 'quantidade sem alimento');      // nunca descarta quantidade em silêncio
      return;
    }
    const g = resolverGramas(a, qtd, medida);
    if (g.recusa) { recusa(p, g.recusa); return; }
    if (g.gramas <= 0) { recusa(p, 'quantidade zero'); return; }
    if (g.gramas > 5000) { recusa(p, 'mais de 5 kg: confira a quantidade'); return; }
    const f = g.gramas / 100;
    const avisos = [];
    if (g.aviso) avisos.push(g.aviso);
    if (extras.length) avisos.push('mais de uma quantidade no mesmo trecho (' + extras.join(', ') + '): usei só a primeira');
    if (g.gramas >= 1500 && (a.p * 4 + a.c * 4 + a.g * 9 + (a.alc || 0) * 7) > 0)
      avisos.push(Math.round(g.gramas) + ' g é muito para um item só: confira');
    const item = {
      alimento: a, nome: a.n, gramas: Math.round(g.gramas), q: g.q, u: g.u,
      p: +(a.p*f).toFixed(1), c: +(a.c*f).toFixed(1), g: +(a.g*f).toFixed(1),
      alc: a.alc ? +(a.alc*f).toFixed(1) : 0,
      dito: _exibir(p)
    };
    if (avisos.length) item.aviso = avisos.join('; ');
    itens.push(item);
  });

  return { itens, perdidos, refeicao: inferirRefeicao(frase, hora) };
}
