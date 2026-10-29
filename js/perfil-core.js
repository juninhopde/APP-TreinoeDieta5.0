/* ══════════════════════════════════════════════════════════
   PERFIL-CORE 5.0 — cálculo puro, sem DOM.

   Tudo o que o onboarding decide (metas, divisão de treino,
   volume por músculo) sai daqui, para poder ser testado em
   Node sem abrir navegador.

   Referências de método (adaptadas, não copiadas):
   - Gasto: Mifflin-St Jeor × fator de atividade. É ponto de
     partida; o motor adaptativo (metabolismo.js) substitui
     pelo gasto medido quando há dado suficiente.
   - Ritmo de perda: 0,5–1,0 % do peso por semana. Quem já é
     mais magro perde mais devagar para preservar massa magra.
   - Proteína: 1,6–2,2 g/kg. Em déficit, o topo da faixa.
   - Volume: conceito de MEV / MAV / MRV (Israetel). Os números
     abaixo são faixas de trabalho do app, não lei.
   ══════════════════════════════════════════════════════════ */

const PC = (function () {

const PISO = { m: 1500, f: 1200 };
const KCAL_KG = 7700;

/* Limites de segurança compartilhados. Ficam aqui, e só aqui: o
   onboarding (planoNutricao) e a meta adaptativa (metabolismo.js)
   leem a mesma regra e não têm como divergir. */
const TETO_DEFICIT = 0.25;                      // o déficit nunca passa de 25% do gasto
const DEFICIT_MIN_UTIL = 100;                   // kcal/dia: abaixo disso não há déficit que valha o nome
const IMC_MIN_PERDA = 19;                       // IMC abaixo disso: nenhuma fase de déficit
const IMC_META_MIN = 18.5;                      // a meta de peso nunca fica abaixo deste IMC
const PESO_VALIDO = { min: 40, max: 350 };      // kg — UMA faixa para onboarding, pesagem e assistente
const ALTURA_VALIDA = { min: 120, max: 230 };   // cm
const CARB_MIN = 60;                            // g: carboidrato mínimo do plano, enquanto as calorias deixarem

/* Ganho de massa (superávit controlado). Mesma regra de "uma fonte só" dos limites acima.
   CONVENÇÃO DE SINAL, em todo o app: deficit, ritmoPct e ritmoReal são positivos quando o
   balanço é de PERDA e NEGATIVOS quando é de GANHO. `superavit` é sempre positivo. */
const TETO_SUPERAVIT = 0.15;                    // o superávit nunca passa de 15% do gasto
const TETO_SUPERAVIT_KCAL = 500;                // nem de 500 kcal/dia
const IMC_MAX_GANHO = 27;                       // IMC a partir daqui: sem superávit, plano de recomposição em manutenção
const IMC_AVISO_BAIXO = 17;                     // IMC abaixo disso pode ganhar, mas com acompanhamento profissional
const RITMO_GANHO = { iniciante: 0.004, intermediario: 0.0025 };   // fração do peso por semana

const arred10 = n => Math.round(n / 10) * 10;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/* ── 1. NUTRIÇÃO ───────────────────────────────────── */

function imcDe(kg, cm) { const m = cm / 100; return kg / (m * m); }

function tmbMifflin(sexo, kg, cm, idade) {
  return 10 * kg + 6.25 * cm - 5 * idade + (sexo === 'm' ? 5 : -161);
}

/* Fator de atividade a partir dos dias de treino. Base 1,30
   (rotina sentada + vida comum) e +0,035 por sessão semanal.
   É estimativa: por isso a primeira meta é chamada de
   "inicial" e o app troca pelo gasto medido depois. */
function fatorAtividade(dias) { return +(1.30 + 0.035 * clamp(dias, 0, 7)).toFixed(3); }

function validarPerfil(p) {
  const e = [];
  if (!p.nome || !String(p.nome).trim()) e.push('nome');
  if (!(p.idade >= 10 && p.idade <= 100)) e.push('idade');
  if (!(p.kg >= PESO_VALIDO.min && p.kg <= PESO_VALIDO.max)) e.push('peso');
  if (!(p.cm >= ALTURA_VALIDA.min && p.cm <= ALTURA_VALIDA.max)) e.push('altura');
  if (p.sexo !== 'm' && p.sexo !== 'f') e.push('sexo');
  return e;
}

/* A pessoa pode entrar (ou continuar) em fase de déficit? Abaixo de
   IMC 19 não: tirar caloria de quem já é magro cobra massa magra e
   saúde, não gordura. Usado pelo onboarding e, com a altura em mãos,
   pela meta por fase (metabolismo.js / fases.js). */
function perdaPermitida(kg, cm) {
  const imc = imcDe(kg, cm);
  // `!(x >= y)` também barra NaN: na dúvida, sem déficit
  if (!(imc >= IMC_MIN_PERDA))
    return { ok: false, motivo: 'imc', imc: isNaN(imc) ? null : +imc.toFixed(1),
      texto: 'Seu IMC' + (isNaN(imc) ? '' : ' (' + String(imc.toFixed(1)).replace('.', ',') + ')') + ' está abaixo de ' + IMC_MIN_PERDA +
             '. O app não monta déficit calórico nessa faixa; o plano segue em manutenção. Vale conversar com um profissional.' };
  return { ok: true, imc: +imc.toFixed(1) };
}

/* A pessoa pode entrar (ou continuar) em superávit? Com IMC a partir de 27 não:
   o ganho viria em boa parte como gordura, e o caminho indicado é manutenção com
   treino de força e proteína alta (recomposição). IMC baixo PODE ganhar; abaixo de 17
   o texto manda acompanhar com profissional. Na dúvida (NaN), sem superávit. */
function ganhoPermitido(kg, cm) {
  const imc = imcDe(kg, cm);
  if (!(imc < IMC_MAX_GANHO))
    return { ok: false, motivo: 'imc_alto', imc: isNaN(imc) ? null : +imc.toFixed(1),
      texto: 'Com IMC acima de ' + IMC_MAX_GANHO + (isNaN(imc) ? '' : ' (o seu é ' + String(imc.toFixed(1)).replace('.', ',') + ')') +
             ', ganhar massa em superávit não é indicado; o plano segue em manutenção, com treino de força e proteína alta — recomposição.' };
  return { ok: true, imc: +imc.toFixed(1),
    texto: imc < IMC_AVISO_BAIXO ? 'Seu IMC (' + String(imc.toFixed(1)).replace('.', ',') + ') está abaixo de ' + IMC_AVISO_BAIXO + '. Ganhar peso nessa faixa deve ser acompanhado por médico ou nutricionista.' : '' };
}

/* Peso em que o IMC fica em `imc`, arredondado PARA CIMA em 0,1 kg
   (arredondar para baixo deixaria a meta um tico abaixo do limite). */
const pesoDeImc = (imc, cm) => Math.ceil(imc * Math.pow(cm / 100, 2) * 10) / 10;

function planoNutricao(p) {
  const erros = validarPerfil(p);
  if (erros.length) return { ok: false, motivo: 'invalido', campos: erros };
  if (p.idade < 18) return { ok: false, motivo: 'menor',
    texto: 'O app não gera meta de calorias para menores de 18 anos. Nessa idade o plano precisa de acompanhamento de pediatra ou nutricionista.' };

  const avisos = [];
  const imc = imcDe(p.kg, p.cm);
  let objetivo = p.objetivo || 'emagrecer';
  let forcado = null;                              // por que o pedido de emagrecer/ganhar virou manutenção

  const tmb = tmbMifflin(p.sexo, p.kg, p.cm, p.idade);
  const dias = p.dias || 3;
  const fat = fatorAtividade(dias);
  const tdee = tmb * fat;
  const piso = PISO[p.sexo];

  if (objetivo === 'emagrecer') {
    const pp = perdaPermitida(p.kg, p.cm);
    if (!pp.ok) {
      objetivo = 'manter'; forcado = 'imc';
      avisos.push(pp.texto);
    } else if (tdee - piso < DEFICIT_MIN_UTIL) {
      // Gasto colado no piso (ou abaixo): qualquer "déficit" cairia no piso e
      // viraria superávit. Sem folga real, o plano é de manutenção.
      objetivo = 'manter'; forcado = 'piso';
      avisos.push('Seu gasto estimado (' + Math.round(tdee) + ' kcal por dia) está no piso de segurança do app (' + piso +
                  ' kcal) ou a menos de ' + DEFICIT_MIN_UTIL + ' kcal dele. Não há espaço seguro para déficit, então o plano foi ajustado para manutenção. Vale conversar com um profissional.');
    }
  }
  if (objetivo === 'ganhar') {
    const gp = ganhoPermitido(p.kg, p.cm);
    if (!gp.ok) {
      objetivo = 'manter'; forcado = 'imc_alto';
      avisos.push(gp.texto);
    } else if (tdee * (1 + TETO_SUPERAVIT) < piso) {
      // Gasto tão baixo que o piso de segurança já passaria do teto de superávit.
      objetivo = 'manter'; forcado = 'piso';
      avisos.push('Seu gasto estimado (' + Math.round(tdee) + ' kcal por dia) é tão baixo que o piso de segurança do app (' + piso +
                  ' kcal) já passaria do teto de superávit. O plano foi ajustado para manutenção. Vale conversar com um profissional.');
    } else if (gp.texto) avisos.push(gp.texto);
  }
  if (p.idade >= 65) avisos.push(objetivo === 'ganhar'
    ? 'Acima de 65 anos, proteína e treino de força importam ainda mais, mas vale avaliar com o médico antes de aumentar calorias.'
    : 'Acima de 65 anos, proteína e treino de força importam ainda mais, mas vale avaliar com o médico antes de cortar calorias.');

  // O piso vale em TODOS os objetivos: manutenção também não desce dele.
  let kcal = Math.max(piso, arred10(tdee)), ritmo = 0, deficit = 0, limitado = false, ritmoPretendido = 0.005, superavit = 0;
  if (objetivo !== 'emagrecer' && !forcado && tdee < piso)
    avisos.push('Seu gasto estimado (' + Math.round(tdee) + ' kcal por dia) está abaixo do piso de segurança do app. A meta fica no piso (' + piso + ' kcal).');
  if (objetivo === 'emagrecer') {
    ritmo = imc >= 30 ? 0.0075 : 0.005;
    ritmoPretendido = ritmo;
    const bruto = ritmo * p.kg * KCAL_KG / 7;
    const teto = tdee * TETO_DEFICIT;
    deficit = Math.min(bruto, teto);
    kcal = Math.max(piso, arred10(tdee - deficit));
    limitado = bruto > teto || (tdee - deficit) < piso;
    if (limitado) avisos.push('O déficit foi limitado para não passar de ' + Math.round(TETO_DEFICIT * 100) + '% do gasto nem ficar abaixo do piso de segurança.');
    ritmo = +(((tdee - kcal) * 7) / (KCAL_KG * p.kg)).toFixed(4);
    deficit = Math.round(tdee - kcal);
  }
  if (objetivo === 'ganhar') {
    // Lean bulk: ritmo por nível, limitado a 15% do gasto e a 500 kcal/dia. O arredondamento
    // para 10 kcal nunca pode empurrar o superávit para cima do teto.
    ritmoPretendido = RITMO_GANHO[p.nivel === 'intermediario' ? 'intermediario' : 'iniciante'];
    const bruto = ritmoPretendido * p.kg * KCAL_KG / 7;
    const teto = Math.min(tdee * TETO_SUPERAVIT, TETO_SUPERAVIT_KCAL);
    const sup = Math.min(bruto, teto);
    let k = arred10(tdee + sup);
    if (k - tdee > sup + 1e-9) k -= 10;
    kcal = Math.max(piso, k);
    limitado = bruto > teto;
    if (limitado) avisos.push('O superávit foi limitado para não passar de ' + Math.round(TETO_SUPERAVIT * 100) + '% do gasto nem de ' + TETO_SUPERAVIT_KCAL + ' kcal por dia.');
    superavit = Math.floor(kcal - tdee + 1e-9);      // nunca acima do teto
    deficit = -superavit;
    ritmo = +(((tdee - kcal) * 7) / (KCAL_KG * p.kg)).toFixed(4);   // negativo: ganho
  }

  const ideal = 25 * Math.pow(p.cm / 100, 2);
  const ajust = p.kg > ideal ? ideal + 0.25 * (p.kg - ideal) : p.kg;
  // Em ganho, g/kg sobre o peso real (IMC < 27 por construção); só acima de IMC 30 usaria o ajustado.
  const base = objetivo === 'ganhar' ? (imc > 30 ? ajust : p.kg) : ajust;
  const gProt = objetivo === 'emagrecer' ? 1.9 : objetivo === 'ganhar' ? 1.8 : forcado === 'imc_alto' ? 1.8 : 1.7;
  const prot = Math.round(gProt * base);
  let gord = Math.round((objetivo === 'ganhar' ? 0.9 : 0.8) * base);
  let carb = Math.round((kcal - prot * 4 - gord * 9) / 4);
  if (carb < CARB_MIN) {
    // Sem folga para o carboidrato mínimo. Forçá-lo faria os macros somarem mais
    // que a meta; tira gordura (até o mínimo essencial), nunca proteína, para a
    // soma continuar batendo com as calorias.
    const gMin = Math.round(0.5 * base);
    gord = clamp(Math.floor((kcal - prot * 4 - CARB_MIN * 4) / 9), gMin, gord);
    carb = Math.max(0, Math.round((kcal - prot * 4 - gord * 9) / 4));
  }
  const agua = clamp(Math.round(p.kg * 35 / 100) * 100, 1800, 3500);

  return {
    ok: true, objetivo, imc: +imc.toFixed(1), tmb: Math.round(tmb), fator: fat,
    tdee: Math.round(tdee), kcal, prot, carb, gord, agua,
    fibra: Math.round(14 * kcal / 1000),
    deficit, superavit, ritmoPct: ritmo, ritmoAlvo: ritmoPretendido, limitado, forcado, pesoAjust: Math.round(ajust), avisos,
    // perda: 5% do peso, mas nunca abaixo do peso de IMC 18,5 · ganho: +4% do peso
    // em ganho a meta (+4%) nunca passa do peso em que o IMC chega ao limite que o próprio app bloqueia (IMC 27)
    metaInicial: objetivo === 'ganhar' ? +Math.min(p.kg * 1.04, Math.max(p.kg, pesoDeImc(IMC_MAX_GANHO - 0.1, p.cm))).toFixed(1) : objetivo === 'emagrecer' ? +Math.max(p.kg * (1 - 0.05), pesoDeImc(IMC_META_MIN, p.cm)).toFixed(1)
               : p.kg
  };
}

/* ── 2. MÚSCULOS E VOLUME ──────────────────────────── */

/* p = músculo principal (conta 1 série); s = sinergistas (contam 0,5).
   Sem contar o indireto, tríceps e bíceps sempre pareceriam
   abaixo do mínimo em quem faz supino e remada. */
const MUSCULO = {
  'Leg press 45°':{p:'quadriceps',s:['gluteos']}, 'Leg press horizontal':{p:'quadriceps',s:['gluteos']},
  'Cadeira extensora':{p:'quadriceps'}, 'Cadeira flexora':{p:'posterior'}, 'Mesa flexora':{p:'posterior'},
  'Agachamento no Smith':{p:'quadriceps',s:['gluteos']}, 'Agachamento livre':{p:'quadriceps',s:['gluteos']},
  'Agachamento goblet':{p:'quadriceps',s:['gluteos']}, 'Cadeira adutora':{p:'adutores'},
  'Cadeira abdutora':{p:'gluteos'}, 'Elevação pélvica':{p:'gluteos'}, 'Glúteo na máquina':{p:'gluteos'},
  'Panturrilha em pé':{p:'panturrilha'}, 'Panturrilha sentado':{p:'panturrilha'},
  'Stiff com halteres':{p:'posterior',s:['gluteos']}, 'Afundo com halteres':{p:'quadriceps',s:['gluteos']},
  'Supino máquina':{p:'peito',s:['triceps']}, 'Supino reto com halteres':{p:'peito',s:['triceps']},
  'Supino reto com barra':{p:'peito',s:['triceps']}, 'Supino inclinado máquina':{p:'peito',s:['triceps']},
  'Supino inclinado halteres':{p:'peito',s:['triceps']}, 'Crucifixo máquina (voador)':{p:'peito'},
  'Crossover na polia':{p:'peito'}, 'Flexão de braço':{p:'peito',s:['triceps']},
  'Puxada alta frontal':{p:'costas',s:['biceps']}, 'Puxada supinada':{p:'costas',s:['biceps']},
  'Remada baixa':{p:'costas',s:['biceps']}, 'Remada máquina':{p:'costas',s:['biceps']},
  'Remada curvada com barra':{p:'costas',s:['biceps','posterior']}, 'Remada unilateral halter':{p:'costas',s:['biceps']},
  'Pulldown na polia':{p:'costas'}, 'Levantamento terra':{p:'costas',s:['posterior','gluteos']},
  'Desenvolvimento máquina':{p:'ombros',s:['triceps']}, 'Desenvolvimento halteres':{p:'ombros',s:['triceps']},
  'Elevação lateral':{p:'ombros'}, 'Elevação frontal':{p:'ombros'}, 'Crucifixo inverso':{p:'ombros'},
  'Encolhimento de ombros':{p:'trapezio'},
  'Rosca direta':{p:'biceps'}, 'Rosca alternada':{p:'biceps'}, 'Rosca martelo':{p:'biceps'}, 'Rosca scott':{p:'biceps'},
  'Tríceps corda':{p:'triceps'}, 'Tríceps barra reta':{p:'triceps'}, 'Tríceps francês':{p:'triceps'},
  'Tríceps testa':{p:'triceps'}, 'Mergulho no banco':{p:'triceps',s:['peito']},
  'Prancha frontal':{p:'core'}, 'Prancha lateral':{p:'core'}, 'Abdominal máquina':{p:'core'},
  'Abdominal supra':{p:'core'}, 'Elevação de pernas':{p:'core'}
};

const MUSCULOS_ROT = {
  peito:'Peito', costas:'Costas', ombros:'Ombros', biceps:'Bíceps', triceps:'Tríceps',
  quadriceps:'Quadríceps', posterior:'Posterior de coxa', gluteos:'Glúteos',
  panturrilha:'Panturrilha', core:'Core'
};

/* [mev, alvoMin, alvoMax, mrv] — séries diretas por semana.
   mev: abaixo disso o estímulo tende a não compensar.
   alvo: faixa de trabalho. mrv: acima disso recupera mal. */
const LM = {
  peito:      [8, 10, 16, 22],
  costas:     [8, 10, 18, 25],
  ombros:     [6,  8, 16, 26],
  biceps:     [6,  8, 14, 26],
  triceps:    [4,  6, 12, 18],
  quadriceps: [6,  8, 14, 20],
  posterior:  [4,  6, 12, 20],
  gluteos:    [0,  4, 10, 16],
  panturrilha:[6,  8, 12, 20],
  core:       [0,  4, 12, 25]
};

/* Em déficit calórico a recuperação é o fator limitante:
   o teto útil da faixa de trabalho cai 15%. */
function faixaDe(musculo, emDeficit) {
  const f = LM[musculo]; if (!f) return null;
  return { mev: f[0], min: f[1], max: Math.round(f[2] * (emDeficit ? 0.85 : 1)), mrv: f[3] };
}

function zonaDe(n, musculo, emDeficit) {
  const f = faixaDe(musculo, emDeficit); if (!f) return 'sem';
  if (n < f.mev) return 'abaixo';
  if (n < f.min) return 'minimo';
  if (n <= f.max) return 'produtivo';
  if (n <= f.mrv) return 'alto';
  return 'excesso';
}

/* ── 3. DIVISÕES DE TREINO ─────────────────────────── */

const R = (n, series, repMin, repMax, descanso) => ({ n, series, repMin, repMax, descanso: descanso || 90 });

const SPLITS = {
  full: {
    id: 'full', nome: 'Full Body', letras: ['A', 'B'],
    resumo: 'Corpo inteiro em cada sessão, alternando A e B.',
    diasIdeais: [3], ancora: 'Cada músculo é treinado 2 a 3 vezes por semana com 3 dias.',
    rotinas: {
      A: { nome: 'Full Body A', ex: [
        R('Leg press 45°',3,10,15), R('Supino máquina',3,10,15), R('Remada baixa',3,10,15),
        R('Desenvolvimento máquina',2,10,15,75), R('Cadeira flexora',3,10,15,75),
        R('Tríceps corda',2,10,15,60), R('Prancha frontal',3,20,40,60) ] },
      B: { nome: 'Full Body B', ex: [
        R('Cadeira extensora',3,10,15), R('Puxada alta frontal',3,10,15), R('Supino inclinado máquina',3,10,15),
        R('Elevação lateral',2,12,15,60), R('Elevação pélvica',3,10,15,75),
        R('Panturrilha em pé',3,12,20,60), R('Rosca direta',2,10,15,60) ] }
    }
  },
  abc: {
    id: 'abc', nome: 'ABC (Empurrar · Puxar · Pernas)', letras: ['A', 'B', 'C'],
    resumo: 'Três sessões distintas. Rende quando cada uma se repete duas vezes na semana.',
    diasIdeais: [5, 6], ancora: 'Com 6 dias, cada músculo é treinado 2 vezes por semana.',
    rotinas: {
      A: { nome: 'A · Empurrar (peito, ombro, tríceps)', ex: [
        R('Supino reto com halteres',3,8,12), R('Supino inclinado máquina',3,10,15),
        R('Desenvolvimento máquina',2,10,15), R('Elevação lateral',3,12,15,60),
        R('Tríceps corda',3,10,15,60), R('Tríceps francês',1,10,15,60) ] },
      B: { nome: 'B · Puxar (costas, bíceps)', ex: [
        R('Puxada alta frontal',3,10,15), R('Remada máquina',3,10,15), R('Remada baixa',2,10,15),
        R('Crucifixo inverso',2,12,15,60), R('Rosca direta',3,10,15,60), R('Rosca martelo',1,10,15,60) ] },
      C: { nome: 'C · Pernas e glúteos', ex: [
        R('Leg press 45°',4,10,15,120), R('Cadeira extensora',3,10,15), R('Mesa flexora',3,10,15),
        R('Stiff com halteres',3,10,12,120), R('Elevação pélvica',3,10,15,75),
        R('Panturrilha em pé',4,12,20,60), R('Prancha frontal',3,20,40,60) ] }
    }
  },
  abcd: {
    id: 'abcd', nome: 'ABCD (Superior · Inferior ×2)', letras: ['A', 'B', 'C', 'D'],
    resumo: 'Quatro dias alternando superior e inferior: cada músculo 2 vezes por semana.',
    diasIdeais: [4], ancora: 'Superior e inferior duas vezes cada, com 4 dias.',
    rotinas: {
      A: { nome: 'A · Superior 1', ex: [
        R('Supino máquina',3,8,12), R('Puxada alta frontal',3,8,12), R('Desenvolvimento máquina',2,10,15),
        R('Remada baixa',3,10,15), R('Tríceps corda',2,10,15,60), R('Rosca direta',2,10,15,60) ] },
      B: { nome: 'B · Inferior 1', ex: [
        R('Leg press 45°',4,10,15,120), R('Mesa flexora',3,10,15), R('Stiff com halteres',3,10,12,120),
        R('Panturrilha em pé',3,12,20,60), R('Prancha frontal',3,20,40,60) ] },
      C: { nome: 'C · Superior 2', ex: [
        R('Supino inclinado halteres',3,10,15), R('Remada unilateral halter',3,10,15),
        R('Elevação lateral',3,12,15,60), R('Puxada supinada',2,10,15), R('Crucifixo inverso',2,12,15,60),
        R('Tríceps francês',2,10,15,60), R('Rosca martelo',2,10,15,60) ] },
      D: { nome: 'D · Inferior 2', ex: [
        R('Cadeira extensora',3,10,15), R('Cadeira flexora',3,10,15), R('Elevação pélvica',3,10,15,75),
        R('Panturrilha sentado',3,12,20,60), R('Abdominal máquina',3,12,20,60), R('Cadeira abdutora',2,12,20,60) ] }
    }
  },
  abcd_classico: {
    id: 'abcd_classico', nome: 'ABCD clássico (um grupo por dia)', letras: ['A', 'B', 'C', 'D'],
    resumo: 'Peito e tríceps, costas e bíceps, pernas, ombros e core. Cada músculo 1 vez por semana.',
    diasIdeais: [4], ancora: 'Frequência de 1 vez por semana: funciona, mas é a divisão com menos respaldo.',
    rotinas: {
      A: { nome: 'A · Peito e tríceps', ex: [
        R('Supino reto com halteres',4,8,12), R('Supino inclinado máquina',3,10,15), R('Crucifixo máquina (voador)',3,12,15,60),
        R('Tríceps corda',3,10,15,60), R('Tríceps francês',3,10,15,60) ] },
      B: { nome: 'B · Costas e bíceps', ex: [
        R('Puxada alta frontal',4,8,12), R('Remada máquina',3,10,15), R('Remada baixa',3,10,15),
        R('Rosca direta',3,10,15,60), R('Rosca martelo',3,10,15,60) ] },
      C: { nome: 'C · Pernas', ex: [
        R('Leg press 45°',4,10,15,120), R('Cadeira extensora',3,10,15), R('Mesa flexora',3,10,15),
        R('Stiff com halteres',3,10,12,120), R('Panturrilha em pé',4,12,20,60) ] },
      D: { nome: 'D · Ombros, glúteos e core', ex: [
        R('Desenvolvimento máquina',3,10,15), R('Elevação lateral',4,12,15,60), R('Crucifixo inverso',3,12,15,60),
        R('Elevação pélvica',3,10,15,75), R('Abdominal máquina',3,12,20,60), R('Prancha frontal',3,20,40,60) ] }
    }
  }
};

const CARDIO = { nome: 'Cardio (dias livres)', ex: [ R('Esteira inclinada',1,20,30,0) ] };

/* Dias da semana (0=dom) por quantidade de sessões. */
const DIAS_SEMANA = { 2:[2,5], 3:[1,3,5], 4:[1,2,4,5], 5:[1,2,3,5,6], 6:[1,2,3,4,5,6] };

/* ── 4. VOLUME SEMANAL DO PLANO ────────────────────── */

/* Quantas vezes por semana, em média, cada letra do ciclo cai.
   Ciclo de 3 letras em 4 dias: cada uma cai 4/3 vez por semana. */
const vezesPorSemana = (split, dias) => dias / split.letras.length;

function seriesDaRotina(rot) {
  const acc = {};
  rot.ex.forEach(e => {
    const m = MUSCULO[e.n]; if (!m) return;
    acc[m.p] = (acc[m.p] || 0) + e.series;
    (m.s || []).forEach(s => { acc[s] = (acc[s] || 0) + e.series * 0.5; });
  });
  return acc;
}

function volumeSemanal(rotinas, letras, dias) {
  const v = dias / letras.length;
  const tot = {}, freq = {};
  letras.forEach(l => {
    const rot = rotinas[l]; if (!rot) return;
    const ac = seriesDaRotina(rot);
    Object.keys(ac).forEach(m => { tot[m] = (tot[m] || 0) + ac[m] * v; });
    const diretos = {};
    rot.ex.forEach(e => { const m = MUSCULO[e.n]; if (m) diretos[m.p] = 1; });
    Object.keys(diretos).forEach(m => { freq[m] = (freq[m] || 0) + v; });
  });
  Object.keys(tot).forEach(m => { tot[m] = +tot[m].toFixed(1); freq[m] = +(freq[m] || 0).toFixed(1); });
  return { series: tot, freq };
}

/* Escolha do usuário contra o que a evidência favorece. */
function avaliarEscolha(splitId, dias) {
  const s = SPLITS[splitId], avisos = [];
  let nivel = 'ok';
  const freqMedia = dias / s.letras.length;
  if (splitId === 'abc' && dias <= 3) {
    nivel = 'atencao';
    avisos.push('ABC com ' + dias + ' dias treina cada músculo só 1 vez por semana. Funciona, mas o volume por sessão sobe para compensar. Com 3 dias, Full Body costuma render mais.');
  }
  if (splitId === 'abc' && dias === 4) { nivel = 'atencao'; avisos.push('ABC com 4 dias deixa alguns músculos com 1 e outros com 2 sessões na semana, alternando.'); }
  if (splitId === 'abcd_classico') { nivel = 'atencao'; avisos.push('Um grupo por dia dá frequência de 1 vez por semana. Superior/Inferior ×2 costuma render mais com o mesmo número de dias.'); }
  if (splitId === 'abcd' && dias !== 4) { nivel = 'atencao'; avisos.push('O ABCD foi desenhado para 4 dias. Com ' + dias + ', o ciclo gira e a frequência varia de semana para semana.'); }
  if (splitId === 'full' && dias >= 5) { nivel = 'atencao'; avisos.push('Full Body em ' + dias + ' dias seguidos limita a recuperação. Acima de 4 dias, uma divisão em blocos costuma ser mais sustentável.'); }
  if (dias < 2) { nivel = 'atencao'; avisos.push('Com 1 dia por semana o ganho existe, mas é o mínimo. 2 a 3 dias já muda bastante o resultado.'); }
  return { nivel, avisos, freqMedia: +freqMedia.toFixed(2) };
}

function recomendarSplit(dias) {
  if (dias <= 3) return 'full';
  if (dias === 4) return 'abcd';
  return 'abc';
}

const copia = o => JSON.parse(JSON.stringify(o));

/* Ajusta o volume do plano antes de entregar. Para cada músculo
   abaixo do alvo, soma 1 série no exercício certo, respeitando
   teto por exercício e por sessão. Iniciante mira o mínimo
   efetivo; quem já treina, o início da faixa produtiva. */
function montarPlano(splitId, dias, nivel, emDeficit) {
  const s = SPLITS[splitId];
  const rotinas = copia(s.rotinas);
  const alvoDe = m => { const f = faixaDe(m, emDeficit); if (!f || f.mev === 0) return f ? f.min : 0; return nivel === 'iniciante' ? f.mev : f.min; };
  const TETO_EX = 5, TETO_SESSAO = 24;
  const ajustes = [];

  for (let volta = 0; volta < 40; volta++) {
    const vol = volumeSemanal(rotinas, s.letras, dias).series;
    let mexeu = false;
    Object.keys(LM).forEach(m => {
      if ((vol[m] || 0) >= alvoDe(m)) return;
      // procura o exercício direto do músculo, na rotina com menos séries totais
      let melhor = null;
      s.letras.forEach(l => rotinas[l].ex.forEach(e => {
        const mm = MUSCULO[e.n];
        if (!mm || mm.p !== m || e.series >= TETO_EX) return;
        const totSessao = rotinas[l].ex.reduce((t, x) => t + x.series, 0);
        if (totSessao >= TETO_SESSAO) return;
        if (!melhor || totSessao < melhor.tot) melhor = { e, l, tot: totSessao };
      }));
      if (melhor) { melhor.e.series += 1; mexeu = true; ajustes.push({ musculo: m, ex: melhor.e.n, rotina: melhor.l }); }
    });
    if (!mexeu) break;
  }

  /* Corte: nenhum músculo fica acima do teto de recuperação (MRV).
     Tira 1 série do exercício direto com mais séries (mínimo de 2,
     ou 1 se já for o único). */
  for (let volta = 0; volta < 40; volta++) {
    const vol = volumeSemanal(rotinas, s.letras, dias).series;
    let cortou = false;
    Object.keys(LM).forEach(m => {
      if ((vol[m] || 0) <= LM[m][3]) return;
      let pior = null;
      s.letras.forEach(l => rotinas[l].ex.forEach(e => {
        const mm = MUSCULO[e.n];
        if (!mm || mm.p !== m || e.series <= 1) return;
        if (!pior || e.series > pior.e.series) pior = { e, l };
      }));
      if (pior) { pior.e.series -= 1; cortou = true; ajustes.push({ musculo: m, ex: pior.e.n, rotina: pior.l, corte: true }); }
    });
    if (!cortou) break;
  }

  const vol = volumeSemanal(rotinas, s.letras, dias);
  const painel = Object.keys(LM).map(m => ({
    musculo: m, rot: MUSCULOS_ROT[m], series: vol.series[m] || 0, freq: vol.freq[m] || 0,
    zona: zonaDe(vol.series[m] || 0, m, emDeficit), faixa: faixaDe(m, emDeficit)
  }));
  const naoTreinados = painel.filter(x => x.series === 0 && LM[x.musculo][0] > 0).map(x => x.rot);
  return { split: s.id, nome: s.nome, letras: s.letras.slice(), rotinas, cardio: copia(CARDIO),
           dias, diasSemana: (DIAS_SEMANA[dias] || DIAS_SEMANA[3]).slice(), painel, ajustes, naoTreinados,
           avaliacao: avaliarEscolha(splitId, dias) };
}

/* ── 5. AUTORREGULAÇÃO DE VOLUME (estilo RP) ───────── */

/* Depois da sessão a pessoa responde 3 coisas por músculo:
     pump:   'fraco' | 'bom' | 'otimo'
     dor:    'nenhuma' | 'leve' | 'forte'   (dor muscular residual)
     junta:  true se sentiu dor articular
   e o app decide o que fazer com as séries da semana seguinte. */
function decidirSeries(fb, atual, musculo, emDeficit) {
  const f = faixaDe(musculo, emDeficit);
  if (fb.junta) return { delta: -2, motivo: 'Dor articular: reduzir 2 séries e trocar por uma variação mais amigável à articulação.', trocar: true };
  if (fb.dor === 'forte') return { delta: -1, motivo: 'Dor muscular forte ainda presente: recuperação abaixo do volume atual. Reduzir 1 série.' };
  if (f && atual >= f.mrv) return { delta: -1, motivo: 'Você chegou ao teto de recuperação do músculo. Reduzir 1 série.' };
  if (f && atual >= f.max) return { delta: 0, motivo: 'Já está no topo da faixa de trabalho para o seu momento. Manter.' };
  if (fb.dor === 'leve' && fb.pump !== 'fraco') return { delta: 0, motivo: 'Ainda com dor leve: manter o volume e deixar o músculo terminar de recuperar.' };
  if (fb.pump === 'fraco' && fb.dor === 'nenhuma') return { delta: 2, motivo: 'Sem dor e sem estímulo: o volume está baixo. Subir 2 séries.' };
  if (fb.dor === 'nenhuma' && fb.pump !== 'fraco') return { delta: 1, motivo: 'Recuperado e com bom estímulo: subir 1 série.' };
  return { delta: 0, motivo: 'Manter.' };
}

/* ── 6. GASTO: transição suave fórmula → medido ────── */

/* metabolismo.js devolve `pontos` (0–100) de confiança. Em vez de
   trocar de uma vez a fórmula pelo medido, mistura pelo peso da
   confiança, com teto de 90%: uma leitura, por melhor que seja,
   nunca apaga por completo o que a fórmula sabe. */
function gastoMisto(tdeeFormula, medido) {
  if (!medido || !medido.ok) return { tdee: Math.round(tdeeFormula), peso: 0, fonte: 'formula' };
  const w = clamp((medido.pontos || 0) / 100, 0, 0.9);
  return { tdee: Math.round(w * medido.tdee + (1 - w) * tdeeFormula), peso: +w.toFixed(2), fonte: 'misto' };
}

/* ── 7. PERFIL COMPLETO → CONFIG DO APP ────────────── */

function gerarPerfil(p) {
  const nutri = planoNutricao(p);
  if (!nutri.ok) return { ok: false, nutri };
  const dias = p.dias || 3;
  const splitId = p.split || recomendarSplit(dias);
  const plano = montarPlano(splitId, dias, p.nivel || 'iniciante', nutri.objetivo === 'emagrecer');
  const cfg = {
    nome: String(p.nome).trim(), sexo: p.sexo, idade: p.idade, altura: p.cm,
    pesoInicial: p.kg, pesoMeta: nutri.metaInicial,
    // deficit é NEGATIVO em ganho (= −superavit). Em ganho, ritmoAlvo vai nulo de propósito: no
    // app ele é a preferência de ritmo de PERDA (RITMOS); o ritmo de ganho vai em ritmoGanho.
    atividade: nutri.fator, deficit: nutri.deficit, superavit: nutri.superavit,
    ritmoAlvo: nutri.objetivo === 'ganhar' ? null : nutri.ritmoAlvo,
    ritmoGanho: nutri.objetivo === 'ganhar' ? nutri.ritmoAlvo : null,
    kcal: nutri.kcal, prot: nutri.prot, carb: nutri.carb, gord: nutri.gord,
    aguaMeta: nutri.agua, diasTreino: plano.diasSemana,
    fasePlano: nutri.objetivo === 'emagrecer' ? 'perda' : nutri.objetivo === 'ganhar' ? 'ganho' : 'manutencao',
    splitId: plano.split, nivel: p.nivel || 'iniciante', objetivo: nutri.objetivo,
    perfilFeito: true
  };
  return { ok: true, nutri, plano, cfg };
}

return { PISO, TETO_DEFICIT, DEFICIT_MIN_UTIL, IMC_MIN_PERDA, IMC_META_MIN, PESO_VALIDO, ALTURA_VALIDA,
         TETO_SUPERAVIT, TETO_SUPERAVIT_KCAL, IMC_MAX_GANHO, RITMO_GANHO,
         LM, MUSCULO, MUSCULOS_ROT, SPLITS, CARDIO, DIAS_SEMANA,
         imcDe, pesoDeImc, perdaPermitida, ganhoPermitido, tmbMifflin, fatorAtividade, validarPerfil, planoNutricao,
         faixaDe, zonaDe, volumeSemanal, avaliarEscolha, recomendarSplit,
         montarPlano, decidirSeries, gastoMisto, gerarPerfil };
})();

if (typeof module !== 'undefined') module.exports = PC;
