/* ══════════════════════════════════════════════════════════
   BACKUP, LEMBRETES NO CALENDÁRIO E RELATÓRIO SEMANAL

   Sem servidor e sem custo, três coisas que protegem a pessoa:

   1. CÓPIAS AUTOMÁTICAS: uma cópia por dia dos dados, guardada no próprio
      aparelho (IndexedDB, as 7 mais recentes). Protege de erro, de dado
      corrompido e de importação ruim. NÃO protege de apagar os dados do
      navegador ou trocar de celular: para isso existe o backup em arquivo,
      que o app lembra de fazer.
   2. BACKUP EM ARQUIVO: compartilha (Drive, WhatsApp, e-mail) ou baixa o JSON.
   3. LEMBRETES NO CALENDÁRIO (.ics): um app web não consegue notificar com
      o app fechado sem servidor. O calendário do celular consegue. O arquivo
      .ics leva os lembretes do app para lá, com alarme.

   Também monta o relatório da semana (HTML pronto para "Salvar como PDF").
   ══════════════════════════════════════════════════════════ */
'use strict';

/* ── 1. cópias automáticas no aparelho ───────────────── */
const CopiasDB = (function () {
  const NOME = 'ctrl-copias', LOJA = 'copias', MAX = 7;
  let db = null;
  function abrir() {
    if (db) return Promise.resolve(db);
    return new Promise((ok, erro) => {
      if (typeof indexedDB === 'undefined') { erro(new Error('sem IndexedDB')); return; }
      const rq = indexedDB.open(NOME, 1);
      rq.onupgradeneeded = () => { rq.result.createObjectStore(LOJA, { keyPath: 'd' }); };
      rq.onsuccess = () => { db = rq.result; db.onclose = () => { db = null; }; db.onversionchange = () => { db.close(); db = null; }; ok(db); };
      rq.onerror = () => erro(rq.error);
    });
  }
  const tx = (modo, fn) => abrir().then(d => new Promise((ok, erro) => {
    const t = d.transaction(LOJA, modo), r = fn(t.objectStore(LOJA));
    t.oncomplete = () => ok(r && r.result !== undefined ? r.result : undefined);
    t.onabort = () => erro(t.error || new Error('cópia abortada'));
  }));
  return {
    /* Guarda a cópia do dia e apaga as mais antigas além de MAX. */
    salvar(dataIso, texto) {
      return tx('readwrite', s => s.put({ d: dataIso, tam: texto.length, json: texto }))
        .then(() => this.listar())
        .then(l => Promise.all(l.slice(MAX).map(c => tx('readwrite', s => s.delete(c.d)))));
    },
    /* Datas e tamanhos, da mais nova para a mais antiga (sem trazer o conteúdo). */
    listar() {
      return tx('readonly', s => s.getAll()).then(l => (l || []).map(c => ({ d: c.d, tam: c.tam })).sort((a, b) => a.d < b.d ? 1 : -1));
    },
    obter(dataIso) { return tx('readonly', s => s.get(dataIso)); }
  };
})();

/* Quantos dias passaram desde `dataIso` até `hojeIso`; null se não há data. */
function diasDesde(dataIso, hojeIso) {
  if (!dataIso) return null;
  const a = dataIso.split('-'), b = hojeIso.split('-');
  return Math.round((new Date(+b[0], +b[1] - 1, +b[2]) - new Date(+a[0], +a[1] - 1, +a[2])) / 86400000);
}

/* O app deve lembrar de fazer backup em arquivo? Só depois de alguns dias de uso real,
   e não antes de 3 dias do último "agora não". */
function backupVencido(E, hojeIso) {
  const dias = Object.keys(E.diario || {}).filter(k => ((E.diario[k] || {}).refs) && Object.keys(E.diario[k].refs).some(r => (E.diario[k].refs[r] || []).length)).length;
  if (dias < 3) return { vencido: false };
  const cfg = E.cfg || {};
  const adiado = diasDesde(cfg.backupAdiado, hojeIso);
  if (adiado != null && adiado < 3) return { vencido: false };
  const desde = diasDesde(cfg.ultimoBackup, hojeIso);
  // data ausente, ilegível ou no futuro (relógio errado uma vez) conta como "sem backup": nunca silencia o aviso
  if (desde == null || isNaN(desde) || desde < 0) return { vencido: true, desde: null, dias };
  return { vencido: desde >= 7, desde, dias };
}

/* Conteúdo do backup: o estado sem a sessão de treino em andamento e sem resquício de configuração antiga. */
function textoDoBackup(E) {
  const copia = JSON.parse(JSON.stringify(E));
  delete copia.sessaoAtiva;
  if (copia.cfg) delete copia.cfg.proxyUrl;
  return JSON.stringify(copia);
}

/* ── 3. lembretes no calendário (.ics) ───────────────── */
const _DIAS_ICS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
const _icsTxt = s => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
/* Linhas do .ics não podem passar de 75 OCTETOS: dobra com CRLF + espaço. Conta bytes UTF-8 (acento vale 2,
   emoji 4) e anda por caractere inteiro, para nunca partir um emoji no meio. */
function _dobrar(l) {
  const bytes = ch => { const c = ch.codePointAt(0); return c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4; };
  const o = []; let atual = '', n = 0;
  for (const ch of String(l)) {
    const b = bytes(ch);
    if (n + b > 74) { o.push(atual); atual = ' '; n = 1; }
    atual += ch; n += b;
  }
  o.push(atual);
  return o.join('\r\n');
}

/* `lembretes`: [{ id, hora:'HH:MM', txt, dias:[0..6] }]. Cada um vira um evento semanal com alarme
   na hora exata. Hora "flutuante" (sem fuso): o calendário usa o fuso do aparelho. */
function gerarICS(lembretes, hojeIso) {
  const pad = n => String(n).padStart(2, '0');
  const hoje = new Date(+hojeIso.slice(0, 4), +hojeIso.slice(5, 7) - 1, +hojeIso.slice(8, 10));
  const agora = new Date();
  const carimbo = agora.getUTCFullYear() + pad(agora.getUTCMonth() + 1) + pad(agora.getUTCDate()) + 'T' + pad(agora.getUTCHours()) + pad(agora.getUTCMinutes()) + pad(agora.getUTCSeconds()) + 'Z';
  const linhas = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Controle//Lembretes//PT-BR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:Controle'];
  let n = 0;
  (lembretes || []).forEach(l => {
    const m = /^(\d{1,2}):(\d{2})$/.exec(String(l.hora || ''));
    const dias = (l.dias || []).filter(d => d >= 0 && d <= 6);
    if (!m || +m[1] > 23 || +m[2] > 59 || !dias.length || !l.txt) return;      // hora inexistente ("25:99") não vira evento
    // primeiro dia: o próximo (ou hoje) que cai num dos dias escolhidos
    const ini = new Date(hoje);
    for (let i = 0; i < 7 && !dias.includes(ini.getDay()); i++) ini.setDate(ini.getDate() + 1);
    const dt = ini.getFullYear() + pad(ini.getMonth() + 1) + pad(ini.getDate()) + 'T' + pad(+m[1]) + m[2] + '00';
    linhas.push('BEGIN:VEVENT',
      // UID estável (só o id): exportar de novo em outro dia atualiza o evento em vez de duplicá-lo
      'UID:controle-' + String(l.id || n) + '@controle.local',
      'DTSTAMP:' + carimbo,
      'DTSTART:' + dt,
      'DURATION:PT10M',
      'RRULE:FREQ=WEEKLY;BYDAY=' + dias.map(d => _DIAS_ICS[d]).join(','),
      _dobrar('SUMMARY:' + _icsTxt('Controle: ' + l.txt)),
      'BEGIN:VALARM', 'ACTION:DISPLAY', _dobrar('DESCRIPTION:' + _icsTxt(l.txt)), 'TRIGGER:PT0M', 'END:VALARM',
      'END:VEVENT');
    n++;
  });
  linhas.push('END:VCALENDAR');
  return { texto: linhas.join('\r\n') + '\r\n', eventos: n };
}

/* ── relatório da semana (HTML autônomo para imprimir ou salvar em PDF) ── */
const _e = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const _br = (n, d) => n == null ? '—' : String(Number(n).toFixed(d == null ? 1 : d)).replace('.', ',');
const _dataBr = s => s ? s.slice(8) + '/' + s.slice(5, 7) + '/' + s.slice(0, 4) : '';

/* `r` é o resultado de resumoSemanal; `ctx` traz o nome, as metas e a leitura da recuperação. */
function htmlRelatorioSemanal(r, ctx) {
  const c = ctx || {};
  const linha = (rot, val) => `<tr><th>${_e(rot)}</th><td>${val}</td></tr>`;
  const rec = r.recuperacao;
  return `<div class="rel">
  <h1>Relatório da semana</h1>
  <p class="rel-sub">${_e(c.nome || '')}${c.nome ? ' · ' : ''}${_dataBr(r.de)} a ${_dataBr(r.ate)}</p>
  <table>
    ${linha('Dias com registro', `${r.diasRegistrados} de 7`)}
    ${linha('Calorias (média nos dias registrados)', `${r.kcalMedia == null ? '—' : Math.round(r.kcalMedia)} kcal · meta ${_e(c.kcal)} kcal`)}
    ${linha('Proteína (média)', `${r.protMedia == null ? '—' : Math.round(r.protMedia)} g · meta ${_e(c.prot)} g`)}
    ${linha('Dias dentro da meta', `${r.diasNaMeta}`)}
    ${linha('Treinos de força', `${r.treinos} de ${r.treinosPlanejados} planejados`)}
    ${linha('Peso', r.pesoIni == null ? 'sem pesagem na semana' : r.variacao == null ? `${_br(r.pesoFim)} kg (uma pesagem)` : `${_br(r.pesoIni)} kg → ${_br(r.pesoFim)} kg (${r.variacao > 0 ? '+' : ''}${_br(r.variacao)} kg)`)}
    ${linha('Sequência de registro', `${r.sequencia.atual} dias (melhor: ${r.sequencia.melhor})`)}
    ${rec ? linha('Recuperação (média)', `sono ${_br(rec.sono)} h · energia ${_br(rec.energia)}/5 · estresse ${_br(rec.estresse)}/5 · ${rec.dias} check-ins`) : ''}
  </table>
  <h2>O que foi bem</h2>
  <ul>${r.destaques.map(d => `<li>${_e(d)}</li>`).join('')}</ul>
  <h2>Um ajuste para a próxima semana</h2>
  <p>${_e(r.ajuste)}</p>
  ${c.fase ? `<p class="rel-nota">Fase do plano: ${_e(c.fase)}.</p>` : ''}
  <p class="rel-nota">Este relatório organiza o que a pessoa registrou no app. Não é avaliação clínica e não substitui médico, nutricionista ou educador físico. Os dados são auto-registrados e podem estar incompletos.</p>
</div>`;
}

/* Versão em texto para compartilhar por mensagem. */
function textoRelatorioSemanal(r, ctx) {
  const c = ctx || {};
  return ['Controle · semana de ' + _dataBr(r.de) + ' a ' + _dataBr(r.ate),
    `Registro: ${r.diasRegistrados}/7 dias · Treinos: ${r.treinos}/${r.treinosPlanejados}`,
    r.kcalMedia == null ? '' : `Média: ${Math.round(r.kcalMedia)} kcal (meta ${c.kcal}) e ${Math.round(r.protMedia)} g de proteína (meta ${c.prot})`,
    r.pesoIni == null ? '' : r.variacao == null ? `Peso: ${_br(r.pesoFim)} kg` : `Peso: ${_br(r.pesoIni)} → ${_br(r.pesoFim)} kg`,
    'Bem: ' + r.destaques.join(' '), 'Ajuste: ' + r.ajuste].filter(Boolean).join('\n');
}

if (typeof module !== 'undefined') module.exports = { backupVencido, textoDoBackup, gerarICS, htmlRelatorioSemanal, textoRelatorioSemanal, diasDesde };
