/* ══════════════════════════════════════════════════════════
   AGENTE — ferramentas que a IA pode executar

   O assistente deixa de só responder e passa a agir. Cada
   ação é uma FERRAMENTA declarada: nome, parâmetros, validação
   e política de confirmação.

   Três regras que não mudam:

   1. A IA nunca toca em código. Ela chama ferramentas que já
      existem, escritas e revisadas. Um modelo reescrevendo um
      app que calcula meta calórica é como se cria um erro
      silencioso que ninguém revisa.
   2. Ação que grava dado do usuário PEDE CONFIRMAÇÃO. Ação
      que só lê ou é trivialmente reversível executa direto.
      Sobrescrever, zerar ou acrescentar dado da pessoa (passos,
      cardio, memória, lista de evitados, lista de compras) conta
      como gravar: o cartão de confirmação mostra o que muda.
   3. Tudo fica no log. Se o app mudou algo, dá para ver o quê,
      quando e por quê.
   ══════════════════════════════════════════════════════════ */

const POLITICA = {
  direto:     'direto',      // reversível e de baixo impacto
  confirma:   'confirma',    // grava dado ou muda meta
  proibido:   'proibido'     // existe só para a IA saber que não pode
};

/* O que o modelo manda é texto solto. "80,5" é número; null, '' e true não são zero,
   são ausência. Texto longo demais estoura o localStorage, então tem teto. */
const temChave = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

function argNum(v) {
  if (typeof v === 'number') return v;
  if (typeof v !== 'string') return NaN;
  const s = v.trim().replace(',', '.');
  return /^[+-]?\d+(\.\d+)?$/.test(s) ? parseFloat(s) : NaN;
}
// opcional: ausente, vazio ou 0 significam "não informado"
const argOpc = v => (v == null || v === '' || argNum(v) === 0) ? null : argNum(v);
// passos: aceita separador de milhar ("8.500", "8 500"); só inteiro
function argInt(v) {
  if (typeof v === 'string') v = v.trim().replace(/^(\d{1,3})(?:[. ]\d{3})+$/, m => m.replace(/[. ]/g, ''));
  const n = argNum(v);
  return Number.isInteger(n) ? n : NaN;
}
const argTxt = v => typeof v === 'string' ? v.trim() : '';
const LIM_ARG = { frase: 500, nome: 80, pergunta: 200, resposta: 500, fato: 300, acao: 300 };
const textoLongo = (v, max) => argTxt(v).length > max ? 'Texto longo demais (máximo ' + max + ' caracteres).' : null;

const pesoValido = () => (typeof PC !== 'undefined' && PC.PESO_VALIDO) || { min: 40, max: 300 };
const pesoFora = kg => (kg >= pesoValido().min && kg <= pesoValido().max) ? null : 'Peso fora de faixa plausível.';

/* A atividade precisa existir na tabela de MET: o app tem um padrão (caminhada leve, 3 MET)
   que, para nome desconhecido, gravaria uma estimativa de gasto sem relação com o que foi feito. */
function opcoesCardio() {
  return Object.keys(MET).map(k => k.replace(/\s*\(.*\)/, '')).join(', ');
}
function atividadeConhecida(nome) {
  if (typeof MET === 'undefined' || typeof norm !== 'function') return true;   // sem a tabela, não há o que conferir
  const n = norm(nome);
  return !!n && Object.keys(MET).some(k => norm(k).includes(n));
}

/* `exec` recebe (args, api). `api` é o conjunto de funções do
   app que a ferramenta pode usar — nada além disso fica ao
   alcance da IA. */
const FERRAMENTAS = {

  registrar_refeicao: {
    desc: 'Registra alimentos no diário a partir de uma frase em linguagem natural.',
    args: { frase: 'texto do que a pessoa comeu' },
    politica: POLITICA.confirma,
    valida: a => argTxt(a.frase).length > 3 ? textoLongo(a.frase, LIM_ARG.frase) : 'Preciso saber o que você comeu.',
    exec: (a, api) => api.registrarPorFrase(argTxt(a.frase))
  },

  registrar_peso: {
    desc: 'Grava a pesagem do dia, opcionalmente com cintura e pescoço.',
    args: { kg: 'número', cintura: 'número opcional', pescoco: 'número opcional' },
    politica: POLITICA.confirma,
    valida: a => {
      const c = argOpc(a.cintura), p = argOpc(a.pescoco);
      return pesoFora(argNum(a.kg))
        || (c !== null && !(c >= 40 && c <= 250) ? 'Cintura fora de faixa plausível (40 a 250 cm).' : null)
        || (p !== null && !(p >= 20 && p <= 80) ? 'Pescoço fora de faixa plausível (20 a 80 cm).' : null);
    },
    exec: (a, api) => api.registrarPeso(argNum(a.kg), argOpc(a.cintura), argOpc(a.pescoco))
  },

  registrar_passos: {
    desc: 'Grava os passos do dia, no lugar do valor já registrado.',
    args: { passos: 'número' },
    politica: POLITICA.confirma,
    valida: a => {
      if (a.passos == null || a.passos === '') return 'Quantos passos?';
      const n = argInt(a.passos);
      return (n >= 0 && n <= 100000) ? null : 'Número de passos implausível.';
    },
    exec: (a, api) => api.registrarPassos(argInt(a.passos))
  },

  registrar_cardio: {
    desc: 'Registra uma sessão de cardio com atividade e minutos.',
    args: { atividade: 'caminhada, esteira, bicicleta, elíptico, natação ou musculação', minutos: 'número' },
    politica: POLITICA.confirma,
    valida: a => {
      const m = argNum(a.minutos);
      if (!(m > 0 && m <= 300)) return 'Duração implausível.';
      return atividadeConhecida(argTxt(a.atividade)) ? null : 'Não reconheci essa atividade. Opções: ' + opcoesCardio() + '.';
    },
    exec: (a, api) => api.registrarCardio(argTxt(a.atividade), argNum(a.minutos))
  },

  concluir_tarefa: {
    desc: 'Marca uma tarefa da missão do dia como concluída.',
    args: { id: 'identificador da tarefa' },
    politica: POLITICA.confirma,
    valida: a => /^[a-z0-9:_-]{1,40}$/i.test(argTxt(a.id)) ? null : 'Qual tarefa?',
    exec: (a, api) => api.concluirTarefa(argTxt(a.id))
  },

  gerar_cardapio: {
    desc: 'Monta o cardápio do dia. Modo: padrao, economico ou roca.',
    args: { modo: 'padrao | economico | roca' },
    politica: POLITICA.direto,
    valida: a => !a.modo || ['padrao','economico','roca'].includes(a.modo) ? null : 'Modo desconhecido.',
    exec: (a, api) => api.gerarCardapio(a.modo)
  },

  gerar_lista_compras: {
    desc: 'Gera a lista de compras de 7 dias do cardápio atual (os itens já marcados como comprados voltam a ficar pendentes).',
    args: {},
    politica: POLITICA.confirma,
    valida: () => null,
    exec: (a, api) => api.gerarCompras()
  },

  evitar_alimento: {
    desc: 'Adiciona um alimento à lista de evitados e descarta o cardápio de hoje, para refazê-lo sem ele.',
    args: { nome: 'nome do alimento' },
    politica: POLITICA.confirma,
    valida: a => argTxt(a.nome).length > 2 ? textoLongo(a.nome, LIM_ARG.nome) : 'Qual alimento?',
    exec: (a, api) => api.evitarAlimento(argTxt(a.nome))
  },

  mudar_fase: {
    desc: 'Muda a fase do plano: perda, manutencao, recuperacao ou ganho (ganho de massa, em superávit controlado).',
    args: { fase: 'perda | manutencao | recuperacao | ganho' },
    politica: POLITICA.confirma,
    valida: a => ['perda','manutencao','recuperacao','ganho'].includes(a.fase) ? null : 'Fase desconhecida.',
    exec: (a, api) => api.mudarFase(a.fase)
  },

  mudar_intensidade: {
    desc: 'Muda o nível de cobrança do coach: normal, firme, hard ou hardmax.',
    args: { nivel: 'normal | firme | hard | hardmax' },
    politica: POLITICA.direto,
    valida: a => ['normal','firme','hard','hardmax'].includes(a.nivel) ? null : 'Nível desconhecido.',
    exec: (a, api) => api.mudarIntensidade(a.nivel)
  },

  definir_regra_acao: {
    desc: 'Define o peso-gatilho e a ação combinada para reganho.',
    args: { peso: 'número', acao: 'texto' },
    politica: POLITICA.confirma,
    valida: a => {
      if (a.acao != null && typeof a.acao !== 'string') return 'A ação combinada precisa ser um texto.';
      return (!(argNum(a.peso) >= pesoValido().min && argNum(a.peso) <= pesoValido().max) ? 'Peso-gatilho fora de faixa.' : null)
        || textoLongo(a.acao, LIM_ARG.acao);
    },
    exec: (a, api) => api.definirRegra(argNum(a.peso), argTxt(a.acao) || undefined)
  },

  ensinar: {
    desc: 'Guarda uma pergunta e resposta que o assistente deve usar no futuro.',
    args: { pergunta: 'texto', resposta: 'texto' },
    politica: POLITICA.confirma,
    valida: a => argTxt(a.pergunta).length > 3 && argTxt(a.resposta).length > 3
      ? (textoLongo(a.pergunta, LIM_ARG.pergunta) || textoLongo(a.resposta, LIM_ARG.resposta))
      : 'Preciso da pergunta e da resposta.',
    exec: (a, api) => api.ensinar(argTxt(a.pergunta), argTxt(a.resposta))
  },

  lembrar_fato: {
    desc: 'Guarda um fato sobre a pessoa na memória do assistente.',
    args: { fato: 'texto' },
    politica: POLITICA.confirma,
    valida: a => argTxt(a.fato).length > 3 ? textoLongo(a.fato, LIM_ARG.fato) : 'O que devo lembrar?',
    exec: (a, api) => api.lembrarFato(argTxt(a.fato))
  },

  /* ── 5.0: treino ─────────────────────────────────────── */
  iniciar_treino: {
    desc: 'Inicia a sessão de treino de hoje (a próxima rotina do ciclo), ou uma rotina específica pela letra.',
    args: { rotina: 'letra da rotina, opcional (A, B, C, D ou K para cardio)' },
    politica: POLITICA.direto,
    valida: a => !a.rotina || /^[A-Da-dKk]$/.test(String(a.rotina)) ? null : 'Rotina desconhecida.',
    exec: (a, api) => api.iniciarTreino(a.rotina ? String(a.rotina).toUpperCase() : null)
  },

  ajustar_volume: {
    desc: 'Soma ou tira 1 série por semana de um músculo, dentro da faixa de segurança.',
    args: { musculo: 'peito | costas | ombros | biceps | triceps | quadriceps | posterior | gluteos | panturrilha | core',
            delta: '+1 ou -1' },
    politica: POLITICA.confirma,
    // hasOwnProperty: "constructor" e "__proto__" existem em qualquer objeto e não são músculo
    valida: a => (typeof PC !== 'undefined' && typeof a.musculo === 'string' && temChave(PC.LM, a.musculo) && [1, -1, 2, -2].includes(argNum(a.delta)))
      ? null : 'Preciso do músculo e de +1 ou -1 série.',
    exec: (a, api) => api.ajustarVolume(a.musculo, argNum(a.delta))
  },

  mudar_divisao: {
    desc: 'Troca a divisão de treino (full, abc, abcd) e/ou os dias por semana. Refaz as rotinas e mantém o histórico.',
    args: { split: 'full | abc | abcd, opcional', dias: 'número de 2 a 6, opcional' },
    politica: POLITICA.confirma,
    valida: a => {
      const dias = argOpc(a.dias);
      if (!a.split && dias === null) return 'Diga a divisão ou os dias por semana.';
      if (a.split && !['full','abc','abcd','abcd_classico'].includes(a.split)) return 'Divisão desconhecida.';
      if (dias !== null && !(Number.isInteger(dias) && dias >= 2 && dias <= 6)) return 'Dias por semana entre 2 e 6.';
      return null;
    },
    exec: (a, api) => api.mudarDivisao(a.split || null, argOpc(a.dias))
  },

  abrir_perfil: {
    desc: 'Abre as perguntas de perfil (nome, idade, peso, altura, objetivo, treino) para refazer o plano.',
    args: {},
    politica: POLITICA.direto,
    valida: () => null,
    exec: (a, api) => api.abrirPerfil()
  },

  /* Declaradas para que a IA saiba que existem e que são proibidas.
     Modelo que não conhece o limite tenta contorná-lo. */
  alterar_codigo: {
    desc: 'NÃO EXISTE. O assistente não altera o código do app.',
    politica: POLITICA.proibido,
    motivo: 'Código do app não é editável em tempo de execução. Um erro silencioso aqui viraria meta calórica errada sem revisão humana.'
  },
  ajustar_meta_livre: {
    desc: 'NÃO EXISTE. A meta calórica sai do motor de gasto e dos limites de segurança.',
    politica: POLITICA.proibido,
    motivo: 'Meta abaixo do piso, déficit acima de 25% do gasto ou superávit acima de 15% do gasto (ou de 500 kcal) não são permitidos por nenhum caminho, inclusive por pedido direto.'
  },
  apagar_dados: {
    desc: 'NÃO EXISTE para o assistente. Só a pessoa apaga dados, em Ajustes.',
    politica: POLITICA.proibido,
    motivo: 'Ação destrutiva e irreversível não fica ao alcance de interpretação de linguagem.'
  }
};

/* Catálogo em texto, para entregar ao modelo externo. */
function catalogoFerramentas() {
  return Object.keys(FERRAMENTAS)
    .filter(k => FERRAMENTAS[k].politica !== POLITICA.proibido)
    .map(k => {
      const f = FERRAMENTAS[k];
      const args = f.args && Object.keys(f.args).length
        ? Object.keys(f.args).map(x => `${x} (${f.args[x]})`).join(', ') : 'sem parâmetros';
      return `- ${k}: ${f.desc} · parâmetros: ${args}`;
    }).join('\n');
}

/* Executa uma ferramenta com validação e política.
   Devolve { ok, precisaConfirmar, msg, resultado }. */
function executarFerramenta(nome, args, api, jaConfirmado) {
  // hasOwnProperty: FERRAMENTAS['constructor'] existe e não é ferramenta
  const f = (typeof nome === 'string' && temChave(FERRAMENTAS, nome)) ? FERRAMENTAS[nome] : null;
  if (!f) return { ok:false, msg:'Não existe uma ferramenta chamada "' + String(nome).slice(0, 40) + '".' };
  if (f.politica === POLITICA.proibido)
    return { ok:false, msg: f.motivo, proibido:true };

  if (!args || typeof args !== 'object' || Array.isArray(args)) args = {};
  const erro = f.valida ? f.valida(args) : null;
  if (erro) return { ok:false, msg: erro };

  if (f.politica === POLITICA.confirma && !jaConfirmado)
    return { ok:false, precisaConfirmar:true, nome, args, msg: f.desc };

  try {
    const r = f.exec(args, api);
    return { ok:true, resultado:r, nome, args };
  } catch (e) {
    return { ok:false, msg:'A ação falhou: ' + (e && e.message ? e.message : e) };
  }
}

/* Log auditável. Sem isto, "o app mudou sozinho" vira mistério. */
function registrarNoLog(log, entrada) {
  // hora LOCAL: toISOString() é UTC, e 21h30 em Brasília viraria o dia seguinte no log
  const n = new Date(), p2 = x => String(x).padStart(2, '0');
  const d = n.getFullYear() + '-' + p2(n.getMonth() + 1) + '-' + p2(n.getDate()) + ' ' + p2(n.getHours()) + ':' + p2(n.getMinutes());
  log.unshift(Object.assign({ d }, entrada));
  return log.slice(0, 120);
}

/* Extrai uma chamada de ferramenta da resposta de um modelo
   externo. O modelo propõe; o app valida e executa. Nunca o
   contrário. */
function extrairAcao(texto) {
  const t = String(texto || '');
  if (t.indexOf('"ferramenta"') < 0) return null;

  /* Parte de cada "{" do texto, do primeiro ao último, e fica com o primeiro objeto
     JSON completo que tem a chave "ferramenta". Partir da chave para trás (lastIndexOf)
     pegava o objeto de dentro quando "argumentos" vinha antes dela. */
  for (let ini = t.indexOf('{'); ini >= 0; ini = t.indexOf('{', ini + 1)) {
    /* Contagem de chaves, não regex. O argumento pode ser um objeto
       aninhado, e um match preguiçoso fecharia no "}" interno —
       produzindo JSON inválido e ação silenciosamente ignorada. */
    let nivel = 0, fim = -1, dentroStr = false, escapa = false;
    for (let k = ini; k < t.length; k++) {
      const ch = t[k];
      if (escapa) { escapa = false; continue; }
      if (ch === '\\') { escapa = true; continue; }
      if (ch === '"') { dentroStr = !dentroStr; continue; }
      if (dentroStr) continue;
      if (ch === '{') nivel++;
      else if (ch === '}') { nivel--; if (nivel === 0) { fim = k; break; } }
    }
    if (fim < 0) continue;

    let j;
    try { j = JSON.parse(t.slice(ini, fim + 1)); } catch (e) { continue; }
    if (!j || typeof j !== 'object' || Array.isArray(j) || !j.ferramenta) continue;
    let args = j.argumentos || j.args || {};
    if (typeof args === 'string') { try { args = JSON.parse(args); } catch (e) { args = {}; } }   // alguns modelos mandam os argumentos como texto
    return { nome: j.ferramenta, args,
             resto: (t.slice(0, ini) + t.slice(fim + 1)).trim() };
  }
  return null;
}
