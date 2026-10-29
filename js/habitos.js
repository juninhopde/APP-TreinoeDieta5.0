/* ══════════════════════════════════════════════════════════
   HÁBITOS: check-in de recuperação, sequências, conquistas e
   resumo da semana.

   Tudo aqui são funções puras sobre o estado `E` (o mesmo objeto que o
   app.js grava no aparelho): recebem os dados, devolvem números e textos,
   e não tocam em tela nem em armazenamento. Assim dá para testar fora do
   navegador.

   Princípios:
   - Sequência não pune: a cada 7 dias seguidos a pessoa ganha 1 folga, e
     um dia sem registro gasta a folga em vez de zerar a contagem.
   - O check-in não diagnostica nada. Ele só ajusta a sugestão do dia
     (treino mais leve, mais descanso) e mostra a tendência da semana.
   ══════════════════════════════════════════════════════════ */
'use strict';

const REFS_PRINCIPAIS = ['cafe', 'almoco', 'lanche', 'jantar'];

/* ── utilidades de data (local, nunca UTC) ───────────── */
function _iso(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function _deIso(s) { const p = String(s).split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
function _somaDias(iso, n) { const d = _deIso(iso); d.setDate(d.getDate() + n); return _iso(d); }
function _janela(fimIso, n) { const l = []; for (let i = n - 1; i >= 0; i--) l.push(_somaDias(fimIso, -i)); return l; }

/* Totais do dia a partir do diário. */
function _totaisDoDia(E, k) {
  const d = E.diario && E.diario[k];
  const t = { kcal: 0, p: 0, c: 0, g: 0, itens: 0, refs: 0 };
  if (!d || !d.refs) return t;
  Object.keys(d.refs).forEach(id => {
    const itens = d.refs[id] || [];
    if (REFS_PRINCIPAIS.includes(id) && itens.length) t.refs++;
    itens.forEach(i => {
      t.p += +i.p || 0; t.c += +i.c || 0; t.g += +i.g || 0; t.itens++;
      t.kcal += i.kcal != null ? +i.kcal : (+i.p || 0) * 4 + (+i.c || 0) * 4 + (+i.g || 0) * 9;
    });
  });
  return t;
}

/* ══ CHECK-IN DE RECUPERAÇÃO ═══════════════════════════ */

/* Campos e rótulos. Valores guardados em E.checkins[data]:
   sono (horas, número), energia (1–5), estresse (1–5), dor (0 nenhuma, 1 leve, 2 forte), fome (1–5). */
const CHECKIN_CAMPOS = [
  { id: 'sono', rot: 'Sono da noite', ops: [[4.5, 'Menos de 5 h'], [5.5, '5 a 6 h'], [6.5, '6 a 7 h'], [7.5, '7 a 8 h'], [8.5, '8 h ou mais']] },
  { id: 'energia', rot: 'Energia', ops: [[1, 'Sem energia'], [2, 'Baixa'], [3, 'Normal'], [4, 'Boa'], [5, 'Ótima']] },
  { id: 'estresse', rot: 'Estresse', ops: [[1, 'Nenhum'], [2, 'Pouco'], [3, 'Médio'], [4, 'Alto'], [5, 'Muito alto']] },
  { id: 'dor', rot: 'Dor ou peso muscular', ops: [[0, 'Nenhuma'], [1, 'Leve'], [2, 'Forte']] },
  { id: 'fome', rot: 'Fome', ops: [[1, 'Quase nenhuma'], [2, 'Pouca'], [3, 'Normal'], [4, 'Muita'], [5, 'Sem controle']] }
];

/* Avalia um check-in. Devolve { nivel: 'boa'|'media'|'baixa', pontos, motivos[], sugestao }.
   A régua é simples e explicável: cada sinal ruim tira pontos, cada bom soma. */
function avaliarRecuperacao(ci) {
  if (!ci) return null;
  let pts = 0; const motivos = [];
  if (ci.sono != null) {
    if (ci.sono < 5) { pts -= 2; motivos.push('dormiu menos de 5 horas'); }
    else if (ci.sono < 6) { pts -= 1.5; motivos.push('dormiu pouco'); }
    else if (ci.sono < 7) { pts -= 0.5; }
    else if (ci.sono >= 7.5) pts += 1;
  }
  if (ci.energia != null) {
    if (ci.energia <= 1) { pts -= 2.5; motivos.push('energia muito baixa'); }
    else if (ci.energia === 2) { pts -= 1.5; motivos.push('energia baixa'); }
    else if (ci.energia >= 4) pts += 1;
  }
  if (ci.estresse != null) {
    if (ci.estresse >= 5) { pts -= 2; motivos.push('estresse muito alto'); }
    else if (ci.estresse === 4) { pts -= 1; motivos.push('estresse alto'); }
  }
  if (ci.dor === 2) { pts -= 2; motivos.push('dor ou peso muscular forte'); }
  else if (ci.dor === 1) pts -= 0.5;

  const nivel = pts <= -3 ? 'baixa' : pts <= -1 ? 'media' : 'boa';
  const sugestao = {
    baixa: 'Recuperação baixa hoje. Faça uma versão leve do treino (uma série a menos por exercício e pare 1 a 2 repetições antes da falha) ou troque por uma caminhada. Não é fraqueza: é o que protege o resultado.',
    media: 'Recuperação mediana. Pode treinar, mas sem buscar recorde: mantenha as cargas e deixe 1 repetição de folga.',
    boa: 'Recuperação boa. É um bom dia para progredir carga, se o treino pedir.'
  }[nivel];
  return { nivel, pontos: pts, motivos, sugestao };
}

/* Médias dos últimos `n` dias que têm check-in (termina em `fimIso`). */
function tendenciaRecuperacao(E, fimIso, n) {
  const dias = _janela(fimIso, n || 7).filter(k => E.checkins && E.checkins[k]);
  if (!dias.length) return null;
  const media = c => { const v = dias.map(k => E.checkins[k][c]).filter(x => x != null && !isNaN(x)); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
  const niveis = dias.map(k => avaliarRecuperacao(E.checkins[k]).nivel);
  return {
    dias: dias.length, sono: media('sono'), energia: media('energia'), estresse: media('estresse'), fome: media('fome'),
    diasBaixa: niveis.filter(x => x === 'baixa').length
  };
}

/* Leitura em linguagem simples da tendência, ou '' quando ainda há pouco dado. */
function leituraTendencia(t) {
  if (!t || t.dias < 3) return '';
  const l = [];
  if (t.sono != null && t.sono < 6.5) l.push(`Seu sono médio está em ${String(t.sono.toFixed(1)).replace('.', ',')} h. Abaixo de 7 h, a fome sobe e a recuperação cai: dormir mais costuma ajudar mais que cortar caloria.`);
  if (t.diasBaixa >= 3) l.push(`${t.diasBaixa} dos últimos ${t.dias} dias tiveram recuperação baixa. Considere uma semana mais leve.`);
  if (t.estresse != null && t.estresse >= 4) l.push('O estresse médio está alto. Treino leve e sono regular ajudam; se persistir, vale conversar com um profissional.');
  return l.join(' ');
}

/* Interpreta frases soltas do chat ("dormi mal", "dormi 5 horas", "estou exausto") em campos de check-in. */
function checkinPorFrase(norm) {
  const r = {};
  // negação ("não dormi bem", "não estou cansado") inverte o sentido; na dúvida não grava nada
  if (/\b(nao|nunca|sem)\s+(estou|to|tou|dormi|me sinto|ando|estive)\b/.test(norm)) return null;
  let m = norm.match(/dormi\s+(\d{1,2})(?:\s?(\d))?\s*h/);
  if (m) { const h = +m[1] + (m[2] ? +m[2] / 10 : 0); if (h >= 1 && h <= 14) r.sono = h; }
  if (r.sono == null) {
    if (/dormi\s+(muito\s+)?(mal|pouco)|noite\s+(ruim|mal)|insonia/.test(norm)) r.sono = 5;
    else if (/dormi\s+(bem|muito bem)|noite\s+boa/.test(norm)) r.sono = 7.5;
  }
  if (/(exaust|sem energia|morto de cansa|muito cansad)/.test(norm)) r.energia = 1;
  else if (/(cansad|sem disposicao|indisposto|desanimad)/.test(norm)) r.energia = 2;
  else if (/(cheio de energia|\bdisposto|com energia)/.test(norm)) r.energia = 4;
  if (/(muito estressad|estresse alto|no limite d[oae] (estresse|aguento|forcas))/.test(norm)) r.estresse = 5;
  else if (/estressad/.test(norm)) r.estresse = 4;
  return Object.keys(r).length ? r : null;
}

/* ══ SEQUÊNCIAS ════════════════════════════════════════ */

/* Dia "registrado": pelo menos 2 refeições principais com alimento. É o que dá
   dado suficiente para o app calcular algo útil, sem exigir perfeição. */
function diaRegistrado(E, k) { return _totaisDoDia(E, k).refs >= 2; }

/* Sequência de dias registrados com folga: a cada 7 dias seguidos a pessoa ganha
   1 folga (no máximo 1 guardada). Um dia sem registro gasta a folga em vez de
   zerar. O dia de hoje ainda não encerrou: se não foi registrado, não conta contra. */
function calcularSequencia(E, hojeIso) {
  const diasHist = Object.keys(E.diario || {}).sort();
  if (!diasHist.length) return { atual: 0, melhor: 0, folga: 0, hojeFeito: false, folgaUsadaOntem: false };
  const ini = diasHist[0] < _somaDias(hojeIso, -180) ? _somaDias(hojeIso, -180) : diasHist[0];
  let atual = 0, melhor = 0, folga = 0, seguidos = 0, usouOntem = false;
  const hojeFeito = diaRegistrado(E, hojeIso);
  for (let k = ini; k < hojeIso; k = _somaDias(k, 1)) {
    if (diaRegistrado(E, k)) {
      atual++; seguidos++;
      if (seguidos % 7 === 0) folga = Math.min(1, folga + 1);
      usouOntem = false;
    } else if (folga > 0) { folga--; usouOntem = k === _somaDias(hojeIso, -1); }
    else { atual = 0; seguidos = 0; usouOntem = false; }
    melhor = Math.max(melhor, atual);
  }
  if (hojeFeito) { atual++; melhor = Math.max(melhor, atual); }
  return { atual, melhor, folga, hojeFeito, folgaUsadaOntem: usouOntem };
}

/* ══ CONQUISTAS ════════════════════════════════════════ */

function _sessoesForca(E) { return (E.sessoes || []).filter(s => s.rotina !== 'K'); }

const CONQUISTAS = [
  { id: 'primeiro-registro', rot: 'Primeiro passo', desc: 'Registrou sua primeira refeição.',
    ok: E => Object.keys(E.diario || {}).some(k => _totaisDoDia(E, k).itens > 0) },
  { id: 'sequencia-7', rot: 'Uma semana inteira', desc: '7 dias seguidos registrando.',
    ok: (E, h) => calcularSequencia(E, h).melhor >= 7 },
  { id: 'sequencia-30', rot: 'Hábito formado', desc: '30 dias seguidos registrando.',
    ok: (E, h) => calcularSequencia(E, h).melhor >= 30 },
  { id: 'primeiro-treino', rot: 'Primeiro treino', desc: 'Concluiu seu primeiro treino de força.',
    ok: E => _sessoesForca(E).length >= 1 },
  { id: 'treinos-10', rot: 'Dez treinos', desc: '10 treinos de força concluídos.',
    ok: E => _sessoesForca(E).length >= 10 },
  { id: 'treinos-30', rot: 'Trinta treinos', desc: '30 treinos de força concluídos.',
    ok: E => _sessoesForca(E).length >= 30 },
  { id: 'primeiro-pr', rot: 'Recorde pessoal', desc: 'Bateu um recorde de carga estimada.',
    ok: E => _sessoesForca(E).some(s => (s.ex || []).some(e => (e.series || []).some(x => x.pr))) },
  { id: 'proteina-7', rot: 'Proteína em dia', desc: 'Bateu a meta de proteína em 7 dias.',
    ok: E => { const meta = (E.cfg || {}).prot || 0; if (!meta) return false;
      return Object.keys(E.diario || {}).filter(k => _totaisDoDia(E, k).p >= meta * 0.9).length >= 7; } },
  { id: 'peso-4-semanas', rot: 'Constância na balança', desc: 'Pesou-se em 4 semanas diferentes.',
    ok: E => new Set((E.pesos || []).map(p => { const d = _deIso(p.d); d.setDate(d.getDate() - d.getDay()); return _iso(d); })).size >= 4 },
  { id: 'checkin-7', rot: 'Ouvindo o corpo', desc: '7 check-ins de recuperação feitos.',
    ok: E => Object.keys(E.checkins || {}).length >= 7 },
  { id: 'backup-feito', rot: 'Dados protegidos', desc: 'Salvou um backup dos seus dados.',
    ok: E => !!((E.cfg || {}).ultimoBackup) }
];

/* Lista com o estado de cada conquista. */
function listarConquistas(E, hojeIso) {
  // conquista já vista nunca se perde: a sequência só olha 180 dias, e quem parou por meses não pode "desfazer" o que fez
  const vistas = Array.isArray(E.conquistasVistas) ? E.conquistasVistas : [];
  return CONQUISTAS.map(c => { let feita = vistas.includes(c.id); if (!feita) { try { feita = !!c.ok(E, hojeIso); } catch (e) {} } return { id: c.id, rot: c.rot, desc: c.desc, feita }; });
}

/* ══ RESUMO DA SEMANA ══════════════════════════════════ */

/* Resumo dos últimos 7 dias (terminando em `fimIso`, inclusive). Devolve números e
   três textos prontos: destaques (o que foi bem) e um único ajuste sugerido. */
function resumoSemanal(E, fimIso) {
  const cfg = E.cfg || {};
  const dias = _janela(fimIso, 7);
  const tot = dias.map(k => Object.assign({ d: k }, _totaisDoDia(E, k)));
  const registrados = tot.filter(t => t.refs >= 2);
  const media = c => registrados.length ? registrados.reduce((a, t) => a + t[c], 0) / registrados.length : null;
  const kcalMedia = media('kcal'), protMedia = media('p');
  // em déficit "na meta" é não passar dela; em ganho, comer pouco também falha: precisa chegar perto da meta
  const ganho = cfg.fasePlano === 'ganho';
  const diasNaMeta = registrados.filter(t => (ganho ? t.kcal >= (cfg.kcal || 0) * 0.9 && t.kcal <= (cfg.kcal || 0) * 1.1 : t.kcal <= (cfg.kcal || 0) * 1.05)
    && t.p >= (cfg.prot || 0) * 0.85).length;

  const sessoes = _sessoesForca(E).filter(s => dias.includes(s.d));
  const planejados = (cfg.diasTreino || []).length || 3;

  const pesosJanela = (E.pesos || []).filter(p => p.d >= dias[0] && p.d <= fimIso).sort((a, b) => a.d < b.d ? -1 : 1);
  const pesoIni = pesosJanela.length ? pesosJanela[0].kg : null;
  const pesoFim = pesosJanela.length ? pesosJanela[pesosJanela.length - 1].kg : null;
  const variacao = pesosJanela.length >= 2 ? +(pesoFim - pesoIni).toFixed(1) : null;

  const rec = tendenciaRecuperacao(E, fimIso, 7);
  const seq = calcularSequencia(E, fimIso);
  const aguaDias = dias.filter(k => (E.diario && E.diario[k] && E.diario[k].agua) >= Math.ceil((cfg.aguaMeta || 2400) / (cfg.copoMl || 300))).length;

  // destaques: só o que é verdade e é bom
  const wins = [];
  if (registrados.length >= 5) wins.push(`Registrou ${registrados.length} dos 7 dias.`);
  if (diasNaMeta >= 3) wins.push(`${diasNaMeta} dias dentro da meta de calorias e proteína.`);
  if (sessoes.length >= planejados) wins.push(`Cumpriu os ${planejados} treinos planejados.`);
  else if (sessoes.length >= 1) wins.push(`${sessoes.length} treino${sessoes.length > 1 ? 's' : ''} feito${sessoes.length > 1 ? 's' : ''} na semana.`);
  if (seq.atual >= 3) wins.push(`Sequência de ${seq.atual} dias registrando.`);
  if (aguaDias >= 4) wins.push(`Meta de água em ${aguaDias} dias.`);
  if (!wins.length) wins.push('Você abriu o app e olhou os números. É o começo de qualquer mudança.');

  // um único ajuste, na ordem de maior retorno
  let ajuste;
  if (registrados.length < 4) ajuste = 'Registre pelo menos café e almoço (ou almoço e jantar) todos os dias. Sem registro, o app não consegue calcular nada útil.';
  else if (protMedia != null && cfg.prot && protMedia < cfg.prot * 0.85) ajuste = `Sua proteína média foi ${Math.round(protMedia)} g contra a meta de ${cfg.prot} g. Inclua uma fonte de proteína em cada refeição principal.`;
  else if (sessoes.length < Math.min(planejados, 2)) ajuste = 'Treinou menos do que o planejado. Marque os dias de treino na agenda e comece pelo mais curto.';
  else if (rec && rec.sono != null && rec.sono < 6.5) ajuste = 'O sono médio ficou abaixo de 6,5 h. Antecipar 30 minutos a hora de dormir rende mais que qualquer ajuste de dieta.';
  else ajuste = 'Mantenha o que está funcionando. Esta semana, escolha uma única coisa para melhorar um pouco.';

  return {
    de: dias[0], ate: fimIso, diasRegistrados: registrados.length, kcalMedia, protMedia, diasNaMeta,
    treinos: sessoes.length, treinosPlanejados: planejados,
    pesoIni, pesoFim, variacao, recuperacao: rec, sequencia: seq, aguaDias, destaques: wins.slice(0, 3), ajuste,
    dados: registrados.length >= 3
  };
}

if (typeof module !== 'undefined') module.exports = { avaliarRecuperacao, tendenciaRecuperacao, leituraTendencia, checkinPorFrase,
  calcularSequencia, diaRegistrado, listarConquistas, CONQUISTAS, resumoSemanal, CHECKIN_CAMPOS };
