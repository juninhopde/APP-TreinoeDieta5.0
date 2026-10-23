/* ══════════════════════════════════════════════════════════
   FASES DO PLANO

   Até aqui o app tinha um estado só: perder peso. Isso o
   deixava cego justamente onde a maioria falha — depois de
   chegar. Obesidade é condição crônica, e tratamento que
   termina em doze semanas não é tratamento, é temporada.

   Três estados:

   PERDA         déficit ativo, o que já existia
   MANUTENÇÃO    meta igual ao gasto medido, faixa em vez de
                 número, registro mais leve, pesagem mantida
   RECUPERAÇÃO   acionado por reganho confirmado, déficit leve
                 com reavaliação antes

   Nada aqui usa a balança do dia. Toda decisão sai da
   tendência, porque agir sobre ruído é como a pessoa acaba
   cortando caloria numa semana em que só reteve água.
   ══════════════════════════════════════════════════════════ */

const FASES_PLANO = {
  perda: {
    rot: 'Perda', cor: 'oxido',
    desc: 'Déficit ativo. O alvo é perder gordura preservando massa magra.',
    coberturaMin: 0.60, pesagemMax: 9
  },
  manutencao: {
    rot: 'Manutenção', cor: 'sinal',
    desc: 'Meta igual ao gasto medido. O alvo deixa de ser perder e passa a ser não voltar.',
    coberturaMin: 0.40, pesagemMax: 9
  },
  recuperacao: {
    rot: 'Recuperação', cor: 'carb',
    desc: 'Reganho confirmado. Déficit leve, registro apertado de novo, por tempo definido.',
    coberturaMin: 0.70, pesagemMax: 7
  }
};

const FAIXA_PCT = 0.02;      // ±2% em torno do peso de manutenção
const ALERTA_AMARELO_SEM = 2; // semanas acima do topo da faixa
const ALERTA_LARANJA_PCT = 0.03;
const ALERTA_VERMELHO_PCT = 0.05;

/* Faixa de manutenção. Peso corporal é faixa, não ponto:
   quem persegue um número específico se frustra com 96,2 kg
   num alvo de 95 e desiste por causa de ruído. */
function faixaManutencao(pesoAlvo) {
  return {
    alvo: pesoAlvo,
    min: +(pesoAlvo * (1 - FAIXA_PCT)).toFixed(1),
    max: +(pesoAlvo * (1 + FAIXA_PCT)).toFixed(1)
  };
}

/* Estado do reganho, sempre pela tendência.
   serieTend = [{ d, tend }] em ordem cronológica. */
function estadoReganho(serieTend, faixa) {
  if (!faixa || !serieTend || serieTend.length < 2) return { nivel:'sem-dados' };

  const atual = serieTend[serieTend.length - 1].tend;
  const acimaDoTopo = atual - faixa.max;
  const pctAcima = (atual - faixa.alvo) / faixa.alvo;

  // há quantas semanas COMPLETAS a tendência está acima do topo: do primeiro
  // ponto da sequência acima da faixa até o último, em dias, dividido por 7
  // e arredondado para baixo (5 dias não são duas semanas).
  let leituras = 0;
  for (let i = serieTend.length - 1; i >= 0; i--) {
    if (serieTend[i].tend > faixa.max) leituras++;
    else break;
  }
  const diasAcima = leituras >= 2
    ? Math.round((new Date(serieTend[serieTend.length-1].d) - new Date(serieTend[serieTend.length-leituras].d)) / 86400000)
    : 0;
  const semanasAcima = Math.floor(diasAcima / 7);

  if (pctAcima >= ALERTA_VERMELHO_PCT)
    return { nivel:'vermelho', atual, pctAcima, semanasAcima, acimaDoTopo,
      txt:'O padrão mudou de verdade. Não é oscilação: são mais de 5% acima do peso de manutenção. Vale reavaliar o plano inteiro em vez de só cortar caloria.' };

  if (pctAcima >= ALERTA_LARANJA_PCT)
    return { nivel:'laranja', atual, pctAcima, semanasAcima, acimaDoTopo,
      txt:'Reganho confirmado, acima de 3%. Hora de voltar a um déficit leve — quanto antes, menor o corte necessário.' };

  if (atual > faixa.max && semanasAcima >= ALERTA_AMARELO_SEM)
    return { nivel:'amarelo', atual, pctAcima, semanasAcima, acimaDoTopo,
      txt:'Tendência acima da faixa há duas semanas. Antes de concluir qualquer coisa, confira se o registro está completo — subida de tendência com registro ralo costuma ser registro, não peso.' };

  // Passou do topo da faixa, mas ainda sem duas semanas completas: uma leitura
  // (ou uma subida curta) pode ser água e sal. Aviso brando, sem mexer em meta.
  if (atual > faixa.max)
    return { nivel:'acima', atual, pctAcima, semanasAcima, diasAcima, acimaDoTopo,
      txt:'A tendência passou do topo da faixa de manutenção. Ainda é cedo para concluir: uma subida curta costuma ser água, sal ou registro. Continue pesando e registrando; se seguir acima por duas semanas, o app avisa.' };

  if (atual < faixa.min)
    return { nivel:'abaixo', atual, pctAcima, semanasAcima,
      txt:'Você está abaixo da faixa de manutenção. Se não é intencional, suba a meta: manutenção com déficit acidental é como se perde massa magra sem perceber.' };

  return { nivel:'dentro', atual, pctAcima, semanasAcima,
    txt:'Dentro da faixa. Isso é o resultado — manter é mais difícil que perder, e quase ninguém comemora.' };
}

/* Regra de ação combinada: a pessoa decide ANTES, com a cabeça
   fria, o peso-gatilho e o que fará. Decidir na hora do problema
   é justamente o que não funciona. */
/* A ação é texto digitado pela pessoa e o app injeta `txt` em innerHTML.
   Por isso `txt` já sai ESCAPADO aqui, na origem (só & < >, que bastam em
   conteúdo de elemento); os ** continuam como marcador de negrito.
   `acao` e `txtPlano` saem SEM escape, para quem for escapar do seu lado:
   não passe `txt` por esc() de novo. */
const _escFase = s => String(s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

function regraDisparada(regra, tendAtual) {
  if (!regra || !regra.peso || tendAtual == null) return null;
  if (tendAtual < regra.peso) return null;
  const acao = regra.acao || 'voltar a registrar todos os dias por duas semanas';
  const monta = a => `Você combinou consigo mesmo: ao passar de ${String(regra.peso).replace('.',',')} kg, **${a}**. A tendência passou. Não é hora de decidir de novo — é hora de executar o que você já decidiu.`;
  return {
    peso: regra.peso,
    acao,
    def: regra.d,
    txt: monta(_escFase(acao)),
    txtPlano: monta(acao)
  };
}

/* Meta calórica por fase. Em manutenção o déficit é zero por
   definição: a meta é o gasto medido. */
function metaPorFase(fase, tdee, pesoKg, ritmoPct, pisoKcal, reganho, alturaCm) {
  if (fase === 'manutencao') {
    // O piso vale em TODAS as fases. Um gasto medido implausivelmente
    // baixo (registro incompleto, peso errado) não pode virar meta.
    const bruto = Math.round(tdee/10)*10;
    const kcal = Math.max(pisoKcal || 1500, bruto);
    return { kcal, deficit: 0, limitado: kcal > bruto, ritmoReal: 0,
             nota: kcal > bruto
               ? 'Meta elevada ao piso de segurança: o gasto medido saiu abaixo dele, o que quase sempre significa registro incompleto.'
               : 'Meta igual ao gasto medido. Sem déficit, por definição.' };
  }
  if (fase === 'recuperacao') {
    // déficit leve: no máximo 0,5% do peso por semana (o menor ritmo oferecido)
    // e nunca acima do ritmo que a pessoa escolheu. Quem escolheu 0,5% fica em
    // 0,5%; quem escolheu 0,75% ou 1% desce para 0,5%. Para não virar castigo.
    const m = metaPorRitmo(tdee, pesoKg, Math.min(ritmoPct, 0.005), pisoKcal, alturaCm);
    if (!m.bloqueado) m.nota = 'Déficit leve de recuperação. O objetivo é voltar à faixa, não recomeçar do zero.';
    return m;
  }
  return metaPorRitmo(tdee, pesoKg, ritmoPct, pisoKcal, alturaCm);
}

/* Sugere a transição quando o alvo é atingido. Só sugere:
   quem decide é a pessoa. */
function transicaoSugerida(fase, pesoTend, pesoMeta, bf, sexo) {
  if (fase !== 'perda' || pesoTend == null) return null;
  if (pesoTend > pesoMeta * 1.01) return null;
  return {
    para: 'manutencao',
    txt: `Sua tendência chegou em ${pesoTend.toFixed(1).replace('.',',')} kg, na meta que você definiu.

**Este é o momento que decide o resultado de tudo.** A maioria das pessoas perde peso; a minoria mantém. Continuar em déficit depois de chegar é como se perde massa magra e como se cansa da própria rotina.

Passar para manutenção significa: meta igual ao seu gasto medido, faixa de ±2% em vez de um número, registro exigido três dias por semana em vez de todos, e pesagem mantida — é ela que avisa se algo mudou.`
  };
}

/* Trava: perseguir número depois de chegar em faixa saudável
   deixa de ser saúde. O app questiona antes de obedecer. */
function alertaDeficitDesnecessario(bf, sexo, fase) {
  if (fase !== 'perda' || bf == null) return null;
  const limite = sexo === 'f' ? 22 : 14;
  if (bf > limite) return null;
  return `Você está em ${String(bf).replace('.',',')}% de gordura, dentro da faixa considerada atlética. Continuar em déficit a partir daqui cobra desempenho, hormônio e humor, e devolve pouco.

Se há um motivo específico — competição, foto, prazo — tudo bem, mas vale conversar com um profissional. Se o motivo é só o número da balança, o corpo já chegou; a cabeça é que ainda não.`;
}

/* Histórico: cada ciclo fechado vira registro comparável.
   `pesos` ([{d, kg}], opcional) é a lista de pesagens: com ela, o peso
   inicial e o final saem das pesagens DENTRO do ciclo (ini a fim), em vez
   dos campos gravados no ciclo — que podem trazer a primeira pesagem da
   vida e não a do começo do ciclo. Ciclo com menos de 14 dias, ou sem
   duas pesagens dentro dele, não gera resumo: ritmo de poucos dias é ruído. */
function resumoCiclo(ciclo, pesos) {
  if (!ciclo || !ciclo.fim) return null;
  const dias = Math.max(1, Math.round((new Date(ciclo.fim) - new Date(ciclo.ini)) / 86400000));
  if (dias < 14) return null;
  let pesoIni = ciclo.pesoIni, pesoFim = ciclo.pesoFim;
  if (pesos) {
    const dentro = pesos.filter(p => p.d >= ciclo.ini && p.d <= ciclo.fim).sort((a, b) => a.d < b.d ? -1 : 1);
    if (dentro.length < 2) return null;
    pesoIni = dentro[0].kg; pesoFim = dentro[dentro.length - 1].kg;
  }
  const delta = pesoFim - pesoIni;
  return {
    ini: ciclo.ini, fim: ciclo.fim, dias, semanas: +(dias/7).toFixed(1),
    delta: +delta.toFixed(1),
    ritmo: +((delta / (dias/7))).toFixed(2),
    fase: ciclo.fase, aderencia: ciclo.aderencia != null ? ciclo.aderencia : null
  };
}
