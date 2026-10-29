/* ══════════════════════════════════════════════════════════
   PILARES DO DIA: dieta, treino, água, suplementos e check-in.

   Funções puras, como em habitos.js: recebem números e o estado `E`, devolvem
   números e listas, e não tocam em tela nem em armazenamento. O percentual do
   dia sai só daqui: o cabeçalho, a linha do tempo e o relatório leem o mesmo
   resultado, então os números nunca divergem.

   Suplementos ficam em E.suplementos:
     { lista: [{ id, nome, hora, dose }], tomados: { 'AAAA-MM-DD': [id, ...] } }
   O campo começa vazio: quem já usava o app não perde nada ao atualizar.
   ══════════════════════════════════════════════════════════ */
'use strict';

const PILARES_DOMINIOS = {
  dieta:       { rot: 'Dieta',       cor: '#4FBF95' },
  treino:      { rot: 'Treino',      cor: '#E0703F' },
  agua:        { rot: 'Água',        cor: '#6E9AD6' },
  suplementos: { rot: 'Suplementos', cor: '#B79CE8' },
  checkin:     { rot: 'Check-in',    cor: '#D6B535' }
};
const PILARES_MAX_SUP = 20;
const PILARES_HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
const PILARES_DATA = /^\d{4}-\d{2}-\d{2}$/;

const Pilares = {
  DOMINIOS: PILARES_DOMINIOS,

  /* Deixa E.suplementos no formato esperado. Chamada ao carregar, então um backup
     editado à mão ou de versão antiga nunca derruba as telas. */
  normalizar(E) {
    const s = E.suplementos && typeof E.suplementos === 'object' && !Array.isArray(E.suplementos) ? E.suplementos : {};
    const vistos = {};
    const lista = (Array.isArray(s.lista) ? s.lista : []).filter(x => {
      if (!x || typeof x !== 'object' || typeof x.id !== 'string' || !x.id || vistos[x.id]) return false;
      if (typeof x.nome !== 'string' || !x.nome.trim()) return false;
      vistos[x.id] = 1; return true;
    }).slice(0, PILARES_MAX_SUP).map(x => ({
      id: x.id, nome: x.nome.trim().slice(0, 40),
      hora: PILARES_HORA.test(x.hora) ? x.hora : '',
      dose: typeof x.dose === 'string' ? x.dose.trim().slice(0, 30) : ''
    }));
    const tomados = {};
    const bruto = s.tomados && typeof s.tomados === 'object' && !Array.isArray(s.tomados) ? s.tomados : {};
    Object.keys(bruto).forEach(k => {
      if (!PILARES_DATA.test(k) || !Array.isArray(bruto[k])) return;
      const ids = bruto[k].filter(id => vistos[id]);
      if (ids.length) tomados[k] = ids.filter((id, i) => ids.indexOf(id) === i);
    });
    E.suplementos = { lista, tomados };
    return E.suplementos;
  },

  /* Suplementos do dia, com a marca de "tomei". */
  doDia(E, k) {
    const s = Pilares.normalizar(E), ids = s.tomados[k] || [];
    return s.lista.map(x => Object.assign({}, x, { tomado: ids.includes(x.id) }));
  },

  /* Marca ou desmarca. Devolve true se ficou marcado. */
  alternar(E, k, id) {
    const s = Pilares.normalizar(E);
    if (!s.lista.some(x => x.id === id)) return false;
    const ids = s.tomados[k] || (s.tomados[k] = []);
    const i = ids.indexOf(id);
    if (i >= 0) { ids.splice(i, 1); if (!ids.length) delete s.tomados[k]; return false; }
    ids.push(id); return true;
  },

  /* Devolve o suplemento criado, ou { erro } com o motivo. */
  adicionar(E, nome, hora, dose) {
    const s = Pilares.normalizar(E);
    nome = String(nome || '').trim().slice(0, 40);
    if (!nome) return { erro: 'Escreva o nome do suplemento.' };
    if (s.lista.length >= PILARES_MAX_SUP) return { erro: 'Limite de ' + PILARES_MAX_SUP + ' suplementos.' };
    if (s.lista.some(x => x.nome.toLowerCase() === nome.toLowerCase())) return { erro: 'Esse suplemento já está na lista.' };
    hora = String(hora || '').trim();
    if (hora && !PILARES_HORA.test(hora)) return { erro: 'Horário inválido. Use o formato 08:00.' };
    let id, n = s.lista.length + 1;
    do { id = 's' + Date.now().toString(36) + n++; } while (s.lista.some(x => x.id === id));
    const item = { id, nome, hora, dose: String(dose || '').trim().slice(0, 30) };
    s.lista.push(item);
    return item;
  },

  remover(E, id) {
    const s = Pilares.normalizar(E);
    s.lista = s.lista.filter(x => x.id !== id);
    Object.keys(s.tomados).forEach(k => {
      s.tomados[k] = s.tomados[k].filter(x => x !== id);
      if (!s.tomados[k].length) delete s.tomados[k];
    });
  },

  /* Os cinco pilares de um dia.
     e = { kcal, metaKcal, treinoAplica, treinou, aguaMl, aguaMeta, supTotal, supTomados, checkin }
     Cada pilar aplicável vale o mesmo; o dia é a média deles.
     - dieta: calorias consumidas / meta, até 100%. Passar de 105% não dá "bônus":
       o anel fica cheio e marcado como estourado (excesso).
     - treino: só conta em dia de treino (ou se a pessoa treinou fora do dia).
     - suplementos: só conta se a pessoa cadastrou algum. */
  calcular(e) {
    const lim = x => Math.min(1, Math.max(0, x));
    const itens = [];
    const meta = +e.metaKcal || 0, kcal = +e.kcal || 0;
    itens.push({
      id: 'dieta', aplica: meta > 0, pct: meta > 0 ? lim(kcal / meta) : 0,
      det: kcal + ' de ' + meta + ' kcal', excesso: meta > 0 && kcal > meta * 1.05
    });
    const treina = !!(e.treinoAplica || e.treinou);
    itens.push({ id: 'treino', aplica: treina, pct: e.treinou ? 1 : 0, det: e.treinou ? 'feito' : 'pendente', excesso: false });
    const am = +e.aguaMl || 0, aMeta = +e.aguaMeta || 0;
    itens.push({
      id: 'agua', aplica: aMeta > 0, pct: aMeta > 0 ? lim(am / aMeta) : 0,
      det: (am / 1000).toFixed(1).replace('.', ',') + ' de ' + (aMeta / 1000).toFixed(1).replace('.', ',') + ' L', excesso: false
    });
    const st = +e.supTotal || 0, sk = Math.min(st, +e.supTomados || 0);
    itens.push({ id: 'suplementos', aplica: st > 0, pct: st > 0 ? sk / st : 0, det: sk + ' de ' + st, excesso: false });
    itens.push({ id: 'checkin', aplica: true, pct: e.checkin ? 1 : 0, det: e.checkin ? 'feito' : 'pendente', excesso: false });

    const ap = itens.filter(i => i.aplica);
    const media = ap.length ? ap.reduce((t, i) => t + i.pct, 0) / ap.length : 0;
    /* "Cumprido" é o que a adesão conta: dieta e água a partir de 80% (dieta sem estourar),
       os demais só quando completos. */
    const MIN = { dieta: 0.8, agua: 0.8 };
    itens.forEach(i => {
      i.pctInt = Math.round(i.pct * 100); i.rot = PILARES_DOMINIOS[i.id].rot; i.cor = PILARES_DOMINIOS[i.id].cor;
      i.cumprido = i.aplica && i.pct >= (MIN[i.id] || 1) - 1e-9 && !i.excesso;
    });
    return { itens, dia: Math.round(media * 100), exato: media * 100, aplicaveis: ap.length };
  },

  /* Adesão por pilar numa lista de dias. `leitor(k)` devolve a entrada de calcular() para o
     dia k, ou null se o dia não conta (antes de a pessoa começar, por exemplo).
     Por pilar: dias em que ele se aplicava, dias cumpridos e o percentual (null sem dias). */
  aderencia(dias, leitor) {
    const por = {};
    Object.keys(PILARES_DOMINIOS).forEach(id => { por[id] = { aplic: 0, ok: 0, pct: null }; });
    let n = 0, soma = 0;
    dias.forEach(k => {
      const e = leitor(k);
      if (!e) return;
      const r = Pilares.calcular(e);
      n++; soma += r.exato;      // média dos dias sem acumular arredondamento
      r.itens.forEach(i => { if (i.aplica) { por[i.id].aplic++; if (i.cumprido) por[i.id].ok++; } });
    });
    Object.keys(por).forEach(id => { if (por[id].aplic) por[id].pct = Math.round(por[id].ok / por[id].aplic * 100); });
    return { dias: n, media: n ? Math.round(soma / n) : null, porPilar: por };
  },

  /* Resumo do gráfico de água: média por dia, dias na meta (≥ 100%) e maior valor.
     `ml` = lista de ml por dia, na ordem do gráfico. */
  resumoAgua(ml, meta) {
    const v = ml.map(x => Math.max(0, +x || 0));
    const n = v.length;
    return {
      dias: n, media: n ? Math.round(v.reduce((t, x) => t + x, 0) / n) : 0,
      naMeta: meta > 0 ? v.filter(x => x >= meta).length : 0,
      maximo: n ? Math.max.apply(null, v) : 0
    };
  },

  /* Rótulo da meta calórica em relação ao gasto: Déficit, Superávit ou Manutenção.
     Dentro de 3% do gasto é manutenção. `diff` = gasto − meta (positivo = déficit). */
  balanco(gasto, meta) {
    gasto = +gasto || 0; meta = +meta || 0;
    if (gasto <= 0 || meta <= 0) return { rot: '', diff: 0 };
    const diff = Math.round(gasto - meta);
    if (Math.abs(diff) <= gasto * 0.03) return { rot: 'Manutenção', diff, tipo: 'manutencao' };
    return diff > 0 ? { rot: 'Déficit', diff, tipo: 'deficit' } : { rot: 'Superávit', diff, tipo: 'superavit' };
  },

  /* Monta a linha do tempo: tarefas da missão do dia + suplementos, por horário.
     Quem não tem horário vem no fim. `agora` = minutos desde 00:00 (para marcar atrasados).
     Cada item: { chave, dom, titulo, detalhe, hora, status, motivo, sup } */
  linhaDoTempo(tarefas, sups, agora) {
    const DOM = t => t.tipo === 'nutricao' ? 'dieta' : t.tipo === 'treino' ? 'treino' : t.id === 'agua' ? 'agua' : 'outro';
    const min = h => { const p = String(h).split(':'); return +p[0] * 60 + +p[1]; };
    const itens = (tarefas || []).map(t => ({
      chave: t.id, dom: DOM(t), titulo: t.titulo, detalhe: t.detalhe || '', hora: t.hora || '',
      status: t.status, motivo: t.motivo || null, sup: false
    }));
    (sups || []).forEach(s => {
      const atrasado = s.hora && agora != null && agora > min(s.hora) + 60;
      itens.push({
        chave: s.id, dom: 'suplementos', titulo: s.nome, detalhe: s.dose || '', hora: s.hora || '',
        status: s.tomado ? 'concluida' : (atrasado ? 'perdida' : 'pendente'), motivo: null, sup: true
      });
    });
    const ordem = { perdida: 0, pendente: 1, reagendada: 2, concluida: 3 };
    return itens.map((x, i) => [x, i]).sort((a, b) => {
      const ha = a[0].hora, hb = b[0].hora;
      if (ha && hb) return (min(ha) - min(hb)) || (a[1] - b[1]);
      if (ha) return -1;
      if (hb) return 1;
      return (ordem[a[0].status] - ordem[b[0].status]) || (a[1] - b[1]);
    }).map(p => p[0]);
  },

  /* Filtros da linha do tempo. */
  filtrar(itens, filtro) {
    if (filtro === 'pendentes') return itens.filter(i => i.status !== 'concluida');
    if (PILARES_DOMINIOS[filtro]) return itens.filter(i => i.dom === filtro);
    return itens;
  }
};
