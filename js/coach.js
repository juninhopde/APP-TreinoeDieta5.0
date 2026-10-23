/* ══════════════════════════════════════════════════════════
   COACH ENGINE — missão do dia, cobrança e segurança

   Implementa as seções 20 a 28 do documento mestre:
   tarefas com status, níveis de intensidade, captura de
   justificativa, replanejamento e Safety Engine.

   Princípio que atravessa tudo: a cobrança é sobre
   COMPORTAMENTO e PROCESSO, nunca sobre o valor da pessoa.
   E a segurança vence a cobrança sempre — sem exceção,
   inclusive no nível mais duro.
   ══════════════════════════════════════════════════════════ */

const INTENSIDADES = [
  { id:'normal', rot:'Normal',   desc:'Avisa o que falta e sai do caminho.' },
  { id:'firme',  rot:'Firme',    desc:'Cobra o que ficou para trás e propõe a próxima ação.' },
  { id:'hard',   rot:'HARD',     desc:'Exige justificativa de tarefa perdida e replaneja em cima dela.' },
  { id:'hardmax',rot:'HARD MAX', desc:'Conversa mínima. Replaneja sozinho e entrega só a próxima ação.' }
];

/* A escala controla FREQUÊNCIA e OBJETIVIDADE da cobrança —
   nunca a dureza da linguagem. Subir de nível não autoriza
   humilhar, culpar nem empurrar para extremos. */
const NIVEL = { normal:0, firme:1, hard:2, hardmax:3 };

/* ── 1. MISSÃO DO DIA ─────────────────────────────────── */

const PRIORIDADE = { alta:0, media:1, baixa:2 };

/* Gera as tarefas do dia a partir do estado real.
   ctx = { hoje, cfg, dia, sessoesHoje, ehDiaDeTreino, REFS,
           pesagemDevida, rotinaProx, fase } */
function missaoDoDia(ctx) {
  const t = [], d = ctx.dia, c = ctx.cfg;
  const feito = id => (ctx.concluidas || []).includes(id);
  const justif = id => (ctx.justificativas || {})[id];

  const add = (id, titulo, detalhe, prio, hora, tipo) => {
    const done = feito(id);
    const passou = hora && horaPassou(hora, 60);
    t.push({
      id, titulo, detalhe, prio, hora, tipo,
      status: done ? 'concluida' : (justif(id) ? 'reagendada' : (passou ? 'perdida' : 'pendente')),
      motivo: justif(id) || null
    });
  };

  // refeições
  (ctx.REFS || []).slice(0, 4).forEach(r => {
    const tem = ((d.refs || {})[r.id] || []).length > 0;
    const passou = horaPassou(r.hora, 90);
    t.push({
      id: 'ref:' + r.id, titulo: r.nome, detalhe: tem ? 'registrada' : 'sem registro',
      prio: 'alta', hora: r.hora, tipo: 'nutricao',
      status: tem ? 'concluida' : (justif('ref:'+r.id) ? 'reagendada' : (passou ? 'perdida' : 'pendente')),
      motivo: justif('ref:'+r.id) || null
    });
  });

  // treino
  if (ctx.ehDiaDeTreino) {
    const fez = ctx.sessoesHoje > 0;
    const passou = horaPassou('21:00', 0);
    t.push({
      id: 'treino', titulo: 'Treino ' + (ctx.rotinaProx || ''),
      detalhe: fez ? 'concluído' : (ctx.fase ? ctx.fase.series + ' séries · ' + ctx.fase.repMin + '–' + ctx.fase.repMax + ' reps' : ''),
      prio: 'alta', hora: '18:30', tipo: 'treino',
      status: fez ? 'concluida' : (justif('treino') ? 'reagendada' : (passou ? 'perdida' : 'pendente')),
      motivo: justif('treino') || null
    });
  }

  // água
  const aguaOk = (d.agua || 0) * c.copoMl >= c.aguaMeta;
  t.push({
    id: 'agua', titulo: 'Água',
    detalhe: ((d.agua||0)*c.copoMl/1000).toFixed(1).replace('.',',') + ' L de ' + (c.aguaMeta/1000).toFixed(1).replace('.',',') + ' L',
    prio: 'media', hora: null, tipo: 'habito',
    status: aguaOk ? 'concluida' : 'pendente', motivo: null
  });

  // passos
  if (c.passosMeta) {
    const p = d.passos || 0;
    t.push({
      id: 'passos', titulo: 'Passos', detalhe: p ? p + ' de ' + c.passosMeta : 'não registrado',
      prio: 'media', hora: null, tipo: 'habito',
      status: p >= c.passosMeta ? 'concluida' : 'pendente', motivo: null
    });
  }

  // pesagem
  if (ctx.pesagemDevida) {
    add('pesagem', 'Pesagem', 'em jejum, com cintura e pescoço', 'alta', '08:00', 'progresso');
  }

  t.sort((a, b) => {
    const ordS = { perdida:0, pendente:1, reagendada:2, concluida:3 };
    return (ordS[a.status] - ordS[b.status]) || (PRIORIDADE[a.prio] - PRIORIDADE[b.prio]);
  });
  return t;
}

function horaPassou(hhmm, tolMin) {
  if (!hhmm) return false;
  const [h, m] = hhmm.split(':').map(Number);
  const agora = new Date();
  const alvo = new Date(agora); alvo.setHours(h, m + (tolMin || 0), 0, 0);
  return agora > alvo;
}

/* ── 2. ADERÊNCIA ──────────────────────────────────────
   Média móvel de 7 dias. Nada de sequência que zera: streak
   quebrada é o gatilho nº 1 de abandono, e o item 22 do
   documento já alerta contra transformar isso em competição. */

function aderencia(diasStatus) {
  if (!diasStatus.length) return { pct: 0, rot: 'sem dados', tend: 0 };
  const pct = Math.round(diasStatus.reduce((a, b) => a + b, 0) / diasStatus.length * 100);
  const metade = Math.floor(diasStatus.length / 2);
  const ant = diasStatus.slice(0, metade), rec = diasStatus.slice(metade);
  const tend = rec.length && ant.length
    ? Math.round((rec.reduce((a,b)=>a+b,0)/rec.length - ant.reduce((a,b)=>a+b,0)/ant.length) * 100) : 0;
  const rot = pct >= 85 ? 'Excelente' : pct >= 70 ? 'Consistente' : pct >= 45 ? 'Instável' : 'Precisa de ajuste';
  return { pct, rot, tend };
}

/* ── 3. COBRANÇA COM JUSTIFICATIVA ─────────────────────
   Perdeu tarefa → pergunta o que houve → classifica a causa
   → replaneja em cima dela. Disciplina realista, não punição. */

const CAUSAS = [
  { id:'tempo',       rot:'Faltou tempo' },
  { id:'esqueci',     rot:'Esqueci' },
  { id:'cansaco',     rot:'Cansaço' },
  { id:'imprevisto',  rot:'Imprevisto' },
  { id:'trabalho',    rot:'Trabalho' },
  { id:'dor',         rot:'Dor ou desconforto' },
  { id:'desanimo',    rot:'Sem motivação' },
  { id:'outro',       rot:'Outro' }
];

/* Resposta operacional para cada causa. Nunca julgamento. */
function replanejar(tarefa, causa, ctx) {
  const treino = tarefa.tipo === 'treino';
  const mapa = {
    tempo: treino
      ? { acao:'encurtar', txt:'Versão curta: só os 3 primeiros exercícios, 2 séries cada. Dá 18 minutos e preserva o estímulo principal.' }
      : { acao:'simplificar', txt:'Refeição de emergência: uma fonte de proteína pronta e uma fruta. Registra em 20 segundos.' },
    esqueci: { acao:'lembrete', txt:'Vou deixar essa tarefa no topo da missão amanhã. Se você usa os alarmes do celular, esse é o horário para ajustar.' },
    cansaco: treino
      ? { acao:'reduzir', txt:'Reduza a carga em 20% e mantenha as séries. Treino leve feito vale mais que treino pesado adiado — e em déficit a recuperação é o gargalo.' }
      : { acao:'simplificar', txt:'Come algo simples e registra. Cansaço não é motivo para pular refeição em déficit — é justamente quando a proteína importa mais.' },
    imprevisto: { acao:'reagendar', txt:'Acontece. Reagendado para amanhã, sem dívida acumulada.' },
    trabalho: treino
      ? { acao:'encurtar', txt:'Versão de 20 minutos, ou remarca para o próximo dia livre. Duas sessões por semana ainda sustentam massa magra.' }
      : { acao:'simplificar', txt:'Deixa uma opção pronta na mochila. O problema aqui é logística, não disciplina.' },
    dor: { acao:'seguranca', txt:'Dor muda a conversa. Não force: se persistir mais de alguns dias, piorar ou limitar movimento, procure avaliação profissional antes de voltar.' },
    desanimo: { acao:'minimo', txt:'Meta mínima hoje: 10 minutos de caminhada e uma refeição registrada. Começar pequeno é o que quebra a inércia — voltar com tudo é o que faz abandonar de novo.' },
    outro: { acao:'reagendar', txt:'Registrado. Reagendado para amanhã.' }
  };
  return mapa[causa] || mapa.outro;
}

/* Mensagem de cobrança, calibrada pelo nível de intensidade. */
function cobrar(tarefas, intensidade, nome, seguranca) {
  const n = NIVEL[intensidade] != null ? NIVEL[intensidade] : 1;
  const voc = nome || 'chefe';
  const perdidas = tarefas.filter(t => t.status === 'perdida');
  const pend = tarefas.filter(t => t.status === 'pendente');

  // segurança desliga a cobrança, em qualquer nível
  if (seguranca && seguranca.bloqueia) {
    return { txt: seguranca.mensagem, pedirJustificativa: null, bloqueado: true };
  }

  if (!perdidas.length) {
    if (!pend.length) return { txt: `${voc}, missão do dia fechada. Nada pendente.`, pedirJustificativa: null };
    const p = pend[0];
    if (n >= 3) return { txt: `Próxima: **${p.titulo}**. ${p.detalhe || ''}`, pedirJustificativa: null };
    return { txt: `${voc}, ${pend.length} ${pend.length===1?'tarefa pendente':'tarefas pendentes'}. A próxima é **${p.titulo}**${p.hora ? ' (' + p.hora + ')' : ''}.`, pedirJustificativa: null };
  }

  const alvo = perdidas[0];
  if (n === 0)
    return { txt: `${voc}, **${alvo.titulo}** passou do horário. Ainda dá para recuperar hoje.`, pedirJustificativa: null };
  if (n === 1)
    return { txt: `${voc}, **${alvo.titulo}** não foi cumprida${perdidas.length>1 ? ` — e mais ${perdidas.length-1}` : ''}. O que dá para fazer agora?`, pedirJustificativa: null };
  if (n === 2)
    return { txt: `${voc}, **${alvo.titulo}** não foi concluída. Sem rodeio: o que aconteceu? Eu ajusto o plano em cima da resposta.`, pedirJustificativa: alvo.id };
  return { txt: `**${alvo.titulo}** — não concluída. Motivo?`, pedirJustificativa: alvo.id };
}

/* ── 4. SAFETY ENGINE (seções 26 a 28) ─────────────────
   Erra sempre para o lado de mandar procurar ajuda. Detecção
   por palavra-chave é frágil, mas falso positivo aqui custa
   uma mensagem — falso negativo custa muito mais.

   Cada grupo casa por frase (kw), por expressão regular (re),
   por expressão que perde o valor se vier negada (reN) ou por
   função, quando o critério é numérico (fn). Tudo roda sobre o
   texto já passado por norm(): minúsculas, sem acento e sem
   pontuação. Por isso os padrões não levam acento, usam \s entre
   as palavras, \w* para a flexão ("vomit\w*") e (\w+\s+){0,3}
   para tolerar palavras no meio ("dor forte no peito").       */

const SINAIS = [
  { g:'autolesao',
    re:[/suicid\w*/, /auto\s?(?:lesao|mutil\w*)/, /kill\s+myself/,
        // "me matar de treinar" é força de expressão, não risco
        /me\s+(?:matar|matei|mataria|matarei|mato)\b(?!\s+(?:de|na|no|nas|nos|em|pra|para)\s+(?:treinar|treino|trabalhar|trabalho|correr|estudar|malhar|malhacao|academia|esteira|dieta|tanto|cansaco|fome|rir|sono|calor|frio|vergonha|fazer|cardio|musculacao|perna|pernas)\b)(?!\s+(?:treinando|trabalhando|correndo|estudando|malhando)\b)/,
        /vou\s+me\s+(?:cortar|ferir|queimar)\b/,
        /me\s+(?:machucar|cortar|ferir|machuco|corto|firo|machuquei|cortei|feri)\s+(?:de\s+)?proposito/,
        /tenho\s+me\s+(?:machucado|cortado|ferido|cortando|machucando)\b/,
        /\beu\s+me\s+(?:corto|firo)\b/,
        /nao\s+(?:quero|aguento|consigo)\s+mais\s+(?:viver|existir|estar\s+(?:vivo|viva|aqui)|continuar\s+(?:vivo|viva))/,
        /(?:cansei|cansado|cansada)\s+(?:de\s+viver|da\s+vida)\b(?!\s+(?:de|fitness|saudavel|fit)\b)/,
        /(?:quero|queria|vontade\s+de|desejo\s+de|penso\s+em|pensando\s+em|prefiro|melhor)\s+(?:\w+\s+)?morrer\b(?!\s+(?:de\s+(?:fome|cansaco|sono|rir|calor|frio|vergonha|dor|sede|preguica|saudade|raiva|medo|tanto|vontade|inveja)|depois|apos|nesse|neste|nessa|nesta|durante|no|na|com|ao|ate)\b)/,
        /(?:acabar|acabo|acabando)\s+com\s+(?:(?:a|minha|a\s+minha)\s+)?(?:propria\s+)?vida/,
        /(?:tirar|tiro|tirando)\s+(?:a|minha|a\s+minha)\s+(?:propria\s+)?vida/,
        /(?:dar|por)\s+fim\s+(?:a|na|em)\s+(?:minha\s+)?vida/,
        /(?:quero|vou|penso\s+em|pensando\s+em)\s+acabar\s+com\s+tudo/,
        /desistir\s+de\s+viver/,
        /(?:queria|quero)\s+(?:sumir|desaparecer)\s+(?:do\s+mundo|para\s+sempre|pra\s+sempre)/,
        /(?:queria|quero)\s+(?:nao\s+existir|nunca\s+ter\s+nascido|nao\s+ter\s+nascido)/,
        /nao\s+ve[jr]o\s+(?:mais\s+)?sentido\s+(?:em|na|de|pra|para)\s+(?:viver|vida|continuar)/,
        /me\s+enforc\w+|me\s+jogar\s+(?:da|de|do)\s+(?:janela|ponte|predio|varanda|viaduto)/,
        /overdose\s+(?:de\s+)?(?:remedio|comprimido|medicamento|insulina|laxante)\w*/],
    // "não quero me machucar no treino" é cuidado, não intenção: negação anula estes
    reN:[/(?:quero|queria|vontade\s+de|penso\s+em|pensando\s+em|pensei\s+em|ideia\s+de|preciso)\s+(?:\w+\s+){0,2}me\s+(?:machucar|cortar|ferir|queimar)\b/],
    msg:'Sinto muito que você esteja passando por isso. Você não precisa lidar com isso sem apoio.\n\nSe quiser conversar com alguém agora, o **CVV atende no 188**, 24 horas por dia, de graça (cvv.org.br). Se houver risco imediato para você, ligue para o **SAMU 192** ou vá ao pronto-socorro mais próximo.\n\nVou deixar a cobrança de lado. Dieta e treino esperam; o que importa agora é você estar bem.' },

  { g:'emergencia', kw:['dor toracica','dor torácica','falta de ar',
      'nao consigo respirar','não consigo respirar','desmaiei','desmaio','perdi a consciencia',
      'formigamento no braco','boca torta','nao sinto o braco','visao turva de repente','confusao mental',
      'sangramento','vomitando sangue','batimento acelerado em repouso','taquicardia forte'],
    re:[/dor\s+(?:\w+\s+){0,3}(?:peito(?!\s+do\s+pe\b)|coracao|braco\s+esquerdo)/,
        /(?:aperto|pressao|queimacao)\s+(?:\w+\s+){0,2}peito(?!\s+do\s+pe\b)/,
        /peito\s+(?:\w+\s+){0,2}(?:apertad\w*|doendo|doi|doe)\b/,
        /dificuldade\s+(?:\w+\s+)?(?:para|pra|de)\s+respirar|respirar\s+com\s+dificuldade/,
        /desmai\w*|desfalec\w*|perdi\s+a\s+(?:visao|fala)/,
        // "apaguei o registro" não é desmaio
        /apaguei(?!\s+(?:o|a|os|as|um|uma|tudo|meu|minha|isso|esse|essa|aquele|aquela|ele|ela|do|da|dos|das|de)\b)/,
        /sangr(?:ando|ou|ei|ar|aram|amento\w*)\b/,
        /(?:vomit\w*|cuspi\w*|tossi\w*|fezes|urina|xixi)\s+(?:\w+\s+)?(?:com\s+)?sangue/,
        /sangue\s+(?:nas?\s+|no\s+|nos\s+|pelo\s+|pela\s+)?(?:fezes|urina|vomito|escarro|tosse|xixi)/,
        /convuls\w*|ataque\s+cardiaco|parada\s+cardiaca/,
        /(?:tendo|tive|acho\s+que\s+(?:estou\s+tendo|to\s+tendo|tive))\s+(?:um\s+)?(?:infarto|avc|derrame)/,
        /(?:formigamento|dormencia)\s+(?:\w+\s+){0,2}(?:braco|rosto|face)/,
        /nao\s+(?:sinto|consigo\s+mexer)\s+(?:o\s+|meu\s+)?(?:braco|rosto|face)/,
        /fala\s+(?:arrastada|enrolada)|visao\s+(?:\w+\s+){0,2}(?:turva|dupla|embacada)|tontura\s+(?:forte|intensa)|vista\s+(?:\w+\s+){0,2}escur\w+/,
        /taquicardia|(?:batimentos?|coracao)\s+(?:\w+\s+){0,3}(?:acelerad\w*|disparad\w*)\s+(?:\w+\s+){0,3}repouso/],
    msg:'Pare o que está fazendo. Esses sinais podem indicar algo que precisa de avaliação **agora**, não de um app.\n\n**Procure atendimento médico imediatamente.** Em emergência no Brasil: **SAMU 192** ou **Bombeiros 193**.\n\nNão vou te passar treino nem dieta enquanto isso não for avaliado.' },

  { g:'lesao', kw:['luxei','estalou','nao consigo levantar o braco','não consigo andar','inchou muito',
      'dor forte no joelho','dor forte na coluna','dor que nao passa','dor que não passa','travou as costas',
      'senti um estalo','dor aguda'],
    re:[/torci(?!\s+(?:pra|para|pro|pelo|pela|por)\b)/,    // "torci pro meu time" não é entorse
        /luxacao|luxou/,
        /dor\s+(?:\w+\s+){0,4}(?:joelho|coluna|costas|lombar|ombro|tornozelo|quadril|pescoco|cotovelo|punho|pulso|virilha|tendao)\s+(?:\w+\s+){0,2}(?:forte|aguda|intensa|insuportavel)/,
        /dor\s+(?:forte|aguda|intensa|insuportavel)\s+(?:\w+\s+){0,2}(?:joelho|coluna|costas|lombar|ombro|tornozelo|quadril|pescoco|cotovelo|punho|pulso|virilha|tendao)/,
        /travou\s+(?:a\s+|as\s+|o\s+|minha\s+|meu\s+)?(?:costas|coluna|lombar|pescoco|joelho|ombro)/,
        /romp\w+\s+(?:\w+\s+){0,2}(?:ligamento|tendao|menisco|cruzado|musculo)|fratur\w+/,
        /nao\s+consigo\s+(?:apoiar|dobrar|esticar)\s+(?:\w+\s+){0,2}(?:pe|perna|joelho|tornozelo|braco)/],
    msg:'Dor aguda ou estalo não se resolve treinando por cima. **Não force o movimento.**\n\nProcure avaliação de médico ou fisioterapeuta antes de voltar à carga. Enquanto isso, suspendi a cobrança do treino — não vou te empurrar para uma lesão maior.' },

  { g:'alimentar', kw:['vomitar','provoquei vomito','provoquei vômito','laxante','nao como ha dias',
      'não como há dias','fiquei 3 dias sem comer','me odeio quando como','nojo do meu corpo',
      'compulsao','compulsão','descontei na comida e vomitei','purguei','jejum de 5 dias'],
    re:[/vomit\w*|laxante\w*|compuls\w*|\bpurg(?:uei|ar|o|ando)\b|dedo\s+na\s+garganta/,
        /anorexi\w*|bulimi\w*|binge\b|transtorno\s+alimentar/,
        /nao\s+(?:como|comi)\s+(?:nada\s+)?(?:ha|faz|fazem)\s+(?:\w+\s+)?(?:dias|semanas)/,
        /(?:faz|fazem|ha)\s+(?:\w+\s+)?(?:dias|semanas)\s+que\s+nao\s+(?:como|comi)\b/,
        // "sem comer doce" é dieta; só vale quando não vem objeto depois
        /(?:fiquei|passei|estou|to|tou)\s+(?:\w+\s+){0,3}sem\s+comer(?:\s+nada)?(?=\s+(?:por|durante|ate|e|mas|porque|pq|desde|ha|o\s+dia)\b|$)/,
        /me\s+odeio\s+(?:\w+\s+){0,3}(?:como|comer|comi|comendo)\b|nojo\s+(?:\w+\s+){0,2}corpo|odeio\s+(?:meu\s+|o\s+meu\s+)?corpo/],
    msg:'O que você descreveu merece cuidado de um profissional, e não de um app de dieta.\n\nProcure um médico, nutricionista ou psicólogo com experiência nessa área. Se quiser conversar com alguém agora, o **CVV atende no 188**, 24 horas, de graça.\n\nVou desligar a cobrança aqui. Nesse momento ela atrapalha em vez de ajudar.' },

  { g:'extremo', kw:['quero perder 10 kg em um mes','perder 10kg em 1 mes','so agua por uma semana',
      'só água por uma semana','comer 500 calorias','800 calorias por dia',
      'jejum de 7 dias','nao vou comer nada hoje','dieta do liquido'],
    re:[/so\s+(?:agua|suco|cha|liquidos?|shake\w*)\s+(?:por|durante)\s+(?:\w+\s+){0,2}(?:dia|dias|semana|semanas)/,
        /dieta\s+(?:do\s+liquido|liquida|da\s+sopa)|jejum\s+prolongado/,
        /nao\s+(?:vou|quero|pretendo)\s+comer\s+nada/],
    // intenção declarada: "não vou ficar sem comer" anula; "sem comer doce" nunca casa
    reN:[/parar\s+de\s+comer(?:\s+(?:nada|tudo|completamente|de\s+vez))?(?=\s+(?:por|ate|porque|pq)\b|$)/,
         /(?:vou|quero|pretendo|decidi|preciso|planejo|queria)\s+(?:\w+\s+){0,2}(?:ficar|passar)\s+(?:\w+\s+){0,3}sem\s+comer(?:\s+nada)?(?=\s+(?:por|durante|ate|desde|hoje|amanha|porque|pq|o\s+dia|a\s+semana)\b|\s+\d|$)/,
         /(?:vou|quero|pretendo|decidi|preciso|planejo|queria)\s+(?:\w+\s+){0,2}passar\s+fome/],
    fn:[kcalExtrema, jejumLongo, perdaRapida],
    msg:'Isso não é agressivo, é insustentável — e o custo vem em massa magra, queda de desempenho e recuperação do peso depois.\n\nA faixa que preserva músculo é de 0,5% a 1% do peso corporal por semana. Não vou montar nada abaixo do piso de segurança do app.\n\nSe a pressa tem um motivo específico (data, evento, exame), me diga qual que eu ajudo dentro do que é seguro.' },

  { g:'medicacao', kw:['posso parar o remedio','trocar meu remedio','qual remedio devo tomar',
      'posso tomar ozempic','mounjaro','anabolizante','testosterona','hormonio'],
    // "parar de tomar café", "meu ciclo de treino" e "me receita uma dieta" não são medicação: exige o remédio no contexto
    re:[/(?:parar|parei|pare|interromper|suspender|largar|deixar)\s+de\s+tomar\s+(?:o\s+|a\s+|os\s+|as\s+|meu\s+|minha\s+|meus\s+|minhas\s+|um\s+|uma\s+)?(?:\w+\s+)?(?:remedio\w*|medicamento\w*|medicacao|comprimido\w*|pilula\w*|insulina|ozempic|mounjaro|metformina|levotiroxina|puran|anticoncepcional\w*|antidepressivo\w*|ansiolitico\w*|hormonio\w*|anabolizante\w*|testosterona|tratamento)/,
        /(?:dobrar|aumentar|diminuir|reduzir|pular|esquecer)\s+(?:a\s+|minha\s+|uma\s+|as\s+|o\s+)?(?:\w+\s+)?doses?\b(?!\s+de\s+(?:creatina|whey|proteina|cafeina|suplemento|pre\s*treino|vitamina|bcaa|colageno|omega|magnesio|agua))/,
        /(?:trocar|mudar|substituir)\s+(?:de\s+|o\s+|meu\s+|minha\s+)?(?:remedio|medicamento|medicacao)/,
        /qual\s+(?:remedio|medicamento)\s+(?:\w+\s+){0,2}(?:tomar|usar|devo|posso)/,
        /me\s+(?:receit\w+|indic\w+|recomend\w+)\s+(?:um\s+|uma\s+|algum\s+|alguma\s+)?(?:remedio|medicamento|comprimido|pilula|hormonio|anabolizante|ozempic)/,
        /ozempic|wegovy|mounjaro|monjaro|saxenda|victoza|rybelsus|tirzepatida|semaglutida|liraglutida/,
        /anabolizante\w*|esteroide\w*|testosterona|hormonio\w*|trembolona|oxandrolona|stanozolol|nandrolona|clembuterol|sarms?/,
        /ciclo\s+(?:de\s+)?(?:anabolizante\w*|esteroide\w*|testosterona|hormonio\w*|hormonal|deca|trembolona|oxandrolona)/,
        /(?:inibidor|moderador|supressor)\s+de\s+apetite|sibutramina|(?:tomo|tomei|uso|usei|tomando|usando|tomar|usar)\s+(?:\w+\s+){0,2}diuretic\w*/],
    msg:'Não posso orientar início, troca, dose ou suspensão de medicação — nem por chat, nem com os melhores dados do mundo.\n\nEssa conversa é com **médico ou farmacêutico**. Leve o CSV que o app exporta em Ajustes: seu histórico organizado torna a consulta muito mais produtiva.\n\nO que eu posso fazer é registrar o que o profissional te orientar.' },

  /* Condições que vinham só do assistente embutido (intenção "clinico"): sem passar por aqui,
     a conversa com a IA externa as respondia livremente. Não travam o HARD, como a medicação. */
  { g:'clinico',
    // "insulina engorda?" é pergunta de conhecimento (saber.js); só vale quem usa ou depende dela
    re:[/diabet\w+|glicemia|hipoglicemia|hiperglicemia/,
        /(?:tomo|tomei|uso|usei|usando|tomando|aplico|aplicando|injeto|dependo\s+de)\s+(?:\w+\s+){0,2}insulina|(?:minha|meu)\s+(?:\w+\s+)?insulina/,
        /pressao\s+(?:\w+\s+)?alta|hipertens\w+|pressao\s+arterial\s+alta/,
        /tireoid\w+|hipo\s?tireoid\w*|hiper\s?tireoid\w*|hashimoto/,
        /cardiopat\w+|arritmia|problema\s+(?:\w+\s+)?(?:no\s+)?coracao|doenca\s+(?:renal|cardiaca|hepatica)|insuficiencia\s+(?:renal|cardiaca)/],
    msg:'Diabetes, insulina, pressão alta, tireoide e problemas do coração ou dos rins mudam o que é seguro em dieta, jejum e treino. Isso eu não consigo avaliar com os dados do app, e um palpite aqui faz mal.\n\nFale com seu **médico ou nutricionista** antes de seguir com déficit, jejum ou treino intenso. Leve o CSV que o app exporta em Ajustes: seu histórico organizado poupa tempo na consulta.\n\nO que eu posso fazer é registrar o que o profissional te orientar.' },

  { g:'saude_mental',
    re:[/depress\w+|deprimid\w+/,
        /(?:crise|ataque)\s+de\s+(?:ansiedade|panico)|sindrome\s+do\s+panico|transtorno\s+(?:de\s+)?(?:ansiedade|panico|humor)|bipolar\w*/],
    msg:'Sinto muito que esteja pesado.\n\nDepressão, ansiedade intensa e crises de pânico merecem o acompanhamento de um **médico ou psicólogo**, e um app de dieta não substitui isso.\n\nSe quiser conversar com alguém agora, o **CVV atende no 188**, 24 horas, de graça (cvv.org.br).\n\nVou deixar a cobrança leve enquanto isso. Dá para manter o registro no seu ritmo, sem meta de desempenho.' },

  { g:'gestacao', kw:['estou gravida','estou grávida','gestante','amamentando','pos parto','pós-parto',
      'descobri que estou gravida'],
    // primeira pessoa: "minha esposa está grávida" não é sobre a pessoa que usa o app
    re:[/(?:to|tou|fiquei|sou)\s+(?:\w+\s+){0,2}(?:gravida|gravido)/,
        /(?:minha|na|durante\s+a|em)\s+(?:\w+\s+)?gravidez|semanas\s+de\s+(?:gestacao|gravidez)|gestacao|lactante|amament\w+|puerper\w+|pos\s?parto/],
    msg:'Gestação e amamentação mudam completamente as necessidades de energia e nutrientes, e déficit calórico nesse período exige acompanhamento.\n\n**Fale com seu obstetra ou nutricionista antes de seguir com qualquer plano do app.** Vou deixar a cobrança de lado até lá, e não recomendo seguir metas de déficit sem essa orientação.' },

  { g:'menor', kw:['sou menor de idade'],
    // "tenho 15 anos de treino" é tempo de prática: só vale idade, e "de idade" é idade
    re:[/(?:tenho|to\s+com|tou\s+com|estou\s+com|completei|fiz)\s+(?:1[0-7]|dez|onze|doze|treze|catorze|quatorze|quinze|dezesseis|dezessete)\s+anos(?!\s+(?:de\s+(?!idade\b)|treinando|malhando|na|no|em|casad\w*|aqui|trabalhando|praticando|correndo|fazendo|lutando|jogando|dentro|como|nesse|neste|que)\b)/,
        /sou\s+(?:um\s+|uma\s+)?adolescente/],
    msg:'Este app foi desenhado para adultos, e o cálculo de metas que ele faz não serve para quem ainda está em crescimento.\n\nProcure um pediatra ou nutricionista. Eles vão considerar coisas que nenhum app genérico considera.' }
];

/* Critérios numéricos do grupo "extremo". Recebem o texto normalizado
   e devolvem o trecho que casou, ou null. */
const NUM_EXT = { um:1, uma:1, dois:2, duas:2, tres:3, quatro:4, cinco:5, seis:6, sete:7, oito:8, nove:9, dez:10, quinze:15, vinte:20 };
const numDe = s => NUM_EXT[s] || +s;

/* Meta diária abaixo de ~1000 kcal. Só conta quando é plano ("800 kcal por dia",
   "quero comer 600 calorias"): "comi 800 kcal no almoço" é relato, não meta. */
function kcalExtrema(q) {
  const re = /(\d{3,4})\s*(?:kcal|calorias?|cal)\b/g;
  let m;
  while ((m = re.exec(q))) {
    const n = +m[1];
    if (n < 100 || n >= 1000) continue;
    const antes = q.slice(Math.max(0, m.index - 60), m.index);
    const depois = q.slice(m.index + m[0].length, m.index + m[0].length + 30);
    if (/^\s*(?:por\s+|ao\s+|no\s+)?dia\b|^\s*diari\w+/.test(depois)) return m[0];
    const refeicao = /^\s*(?:de|do|da|em|no|na|num|numa)\s+\w+/.test(depois);
    const plano = /(?:quero|vou|pretendo|decidi|planejo|queria|preciso|comer|consumir|ingerir|ficar\s+(?:com|em)|viver\s+de|limitar|manter|dieta\s+de|plano\s+de|meta\s+(?:de\s+|e\s+)?)\s*(?:\w+\s+){0,3}$/.test(antes);
    if (n >= 300 && plano && !refeicao) return m[0];
  }
  return null;
}

/* Jejum de 48 h ou mais ("jejum de 72 horas", "jejum de 3 dias", "60h em jejum"). */
function jejumLongo(q) {
  const U = '(\\d{1,3}|um|uma|dois|duas|tres|quatro|cinco|seis|sete|oito|nove|dez)\\s*(h|hs|horas?|dias?|semanas?)\\b';
  const m = q.match(new RegExp('jejum\\s+(?:(?:intermitente|prolongado|seco|total)\\s+)?(?:de\\s+|por\\s+|ate\\s+|com\\s+)?(?:mais\\s+de\\s+|uns\\s+)?' + U))
         || q.match(new RegExp(U + '\\s+(?:de\\s+|em\\s+)jejum'));
  if (!m) return null;
  const n = numDe(m[1]);
  const horas = /^h/.test(m[2]) ? n : /^d/.test(m[2]) ? n * 24 : n * 168;
  return horas >= 48 ? m[0] : null;
}

/* Perda acima de ~1,5 kg por semana, em pelo menos 3 kg ("10 kg em 1 semana"). */
function perdaRapida(q) {
  const m = q.match(/(?:perder|emagrecer|secar|eliminar|queimar)\s+(?:\w+\s+){0,2}?(\d{1,2}|um|uma|dois|duas|tres|quatro|cinco|seis|sete|oito|nove|dez|quinze|vinte)\s*(?:kg|kgs|quilos?|kilos?)\s+(?:\w+\s+){0,2}?(?:em|numa|num|dentro\s+de|durante|so\s+em)\s+(?:(?:uma|um)\s+)?(?:(\d{1,2}|dois|duas|tres|quatro|cinco|seis|sete|dez|quinze)\s+)?(dias?|semanas?|mes|meses)\b/);
  if (!m) return null;
  const kg = numDe(m[1]), qtd = m[2] ? numDe(m[2]) : 1;
  const semanas = /^d/.test(m[3]) ? qtd / 7 : /^s/.test(m[3]) ? qtd : qtd * 4.345;
  return kg >= 3 && kg / semanas > 1.5 ? m[0] : null;
}

/* Compila na primeira chamada: norm() vive em assistente.js, que carrega depois deste arquivo. */
function compilarSinal(s) {
  const junta = ps => ps.length ? new RegExp('\\b(?:' + ps.map(p => '(?:' + p + ')').join('|') + ')\\b', 'g') : null;
  const frases = (s.kw || []).map(k => norm(k).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+'));
  s.rx = junta(frases.concat((s.re || []).map(r => r.source)));
  s.rxN = junta((s.reN || []).map(r => r.source));
}

function acharSinal(s, q) {
  if (s.rx === undefined) compilarSinal(s);
  for (const rx of [s.rx, s.rxN]) {
    if (!rx) continue;
    rx.lastIndex = 0;
    let m;
    while ((m = rx.exec(q))) {
      if (rx === s.rxN && /(?:^|\s)(?:nao|nunca|jamais)\s+(?:\w+\s+)?$/.test(q.slice(0, m.index))) continue;
      return m[0];
    }
  }
  for (const f of (s.fn || [])) { const t = f(q); if (t) return t; }
  return null;
}

function checarSeguranca(texto) {
  const q = norm(texto || '');
  if (!q) return null;
  for (const s of SINAIS) {
    const termo = acharSinal(s, q);
    if (termo) return { grupo: s.g, bloqueia: true, mensagem: s.msg, termo };
  }
  return null;
}

/* Filtro da RESPOSTA do modelo externo. Só barra o caso objetivo: dose numérica de
   medicamento. O aviso certo ("não coma 800 kcal", "dor no peito: procure o SAMU") usa
   as mesmas palavras do risco, então checarSeguranca não serve para a resposta. */
function checarRespostaIA(texto) {
  const q = norm(texto || '');
  const dose = '\\d+(?:\\s\\d+)?\\s*(?:mg|mcg|ug|ui|comprimidos?|capsulas?|gotas)\\b';
  const med = '(?:remedio|medicamento|insulina|ozempic|mounjaro|semaglutida|tirzepatida|metformina|levotiroxina|anabolizante|testosterona|hormonio|antibiotico|antidepressivo|corticoide|diuretico|laxante|sibutramina)\\w*';
  const ate = '(?:\\s+\\w+){0,8}\\s+';
  if (!new RegExp(dose + ate + med + '|' + med + ate + dose).test(q)) return null;
  const s = SINAIS.find(x => x.g === 'medicacao');
  return { grupo: 'medicacao', bloqueia: true, mensagem: s.msg, termo: 'dose de medicamento' };
}

/* Situações que travam o modo HARD enquanto durarem. */
const GRUPOS_TRAVAM_HARD = ['emergencia','lesao','alimentar','gestacao','menor','autolesao','saude_mental'];

/* Qualquer registro que trava, dentro de 14 dias, mantém a trava — não só o último:
   um aviso posterior de outro grupo (ex.: medicação) não pode liberar o HARD. Devolve o
   mais recente. Data com formato inválido é ignorada, senão a trava nunca venceria. */
function travaCobranca(historicoSeguranca) {
  const hist = historicoSeguranca || [];
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  for (let i = hist.length - 1; i >= 0; i--) {
    const rec = hist[i];
    if (!rec || !GRUPOS_TRAVAM_HARD.includes(rec.grupo)) continue;
    const p = String(rec.d || '').slice(0, 10).split('-');
    const dias = Math.round((hoje - new Date(+p[0], +p[1] - 1, +p[2])) / 86400000);
    if (isNaN(dias) || dias > 14) continue;
    return rec;
  }
  return null;
}
