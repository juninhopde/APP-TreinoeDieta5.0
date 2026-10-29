/* ══════════════════════════════════════════════════════════
   TREINO PARA PDF E PARA COMPARTILHAR

   Funções puras, como em backup.js: recebem um objeto com os dados do treino e
   devolvem HTML (para a impressão do navegador, "Salvar como PDF") ou texto
   (para o compartilhar do celular). Nada aqui toca em tela ou armazenamento.

   d = { nome, data, rotina, titulo, fase: { nome, series, repMin, repMax, rirAlvo },
         exercicios: [{ n, series, gm, tempo, kg, reps }], cardio }
   ══════════════════════════════════════════════════════════ */
'use strict';

const _et = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const _nt = n => String(n).replace('.', ',');
const _dt = s => s ? String(s).slice(8) + '/' + String(s).slice(5, 7) + '/' + String(s).slice(0, 4) : '';

/* O que a tela chama de "reps" é segundos nos exercícios por tempo. */
function _repsDoTreino(e) {
  if (e.alvo) return e.alvo;                          // texto pronto (cardio: "20–30 min")
  if (e.reps == null || e.reps === '') return '—';
  return e.reps + (e.tempo ? ' s' : '');
}
function _cargaDoTreino(e) { return e.kg ? _nt(e.kg) + ' kg' : '—'; }

function htmlTreino(d) {
  const f = d.fase || {};
  const ex = d.exercicios || [];
  const linhas = ex.map((e, i) => `<tr><td class="rel-n">${i + 1}</td><td>${_et(e.n)}${e.gm ? `<br><span class="rel-gm">${_et(e.gm)}</span>` : ''}</td>
    <td>${d.cardio ? '—' : e.series}</td><td>${_et(_repsDoTreino(e))}</td><td>${d.cardio ? '—' : _et(_cargaDoTreino(e))}</td></tr>`).join('');
  return `<div class="rel rel-treino">
  <h1>${_et(d.titulo || 'Treino')}</h1>
  <p class="rel-sub">${_et(d.nome || '')}${d.nome ? ' · ' : ''}${_dt(d.data)}${f.nome ? ' · ' + _et(f.nome) : ''}</p>
  ${d.cardio ? '' : `<p>Fase atual: <b>${_et(f.series)} séries</b> por exercício · <b>${_et(f.repMin)}–${_et(f.repMax)} repetições</b> · parar com <b>${_et(f.rirAlvo)}</b> repetições de folga (RIR).</p>`}
  <table>
    <thead><tr><th class="rel-n">#</th><th>Exercício</th><th>Séries</th><th>${d.cardio ? 'Tempo' : 'Reps'}</th><th>Carga sugerida</th></tr></thead>
    <tbody>${linhas || '<tr><td colspan="5">Esta rotina não tem exercícios.</td></tr>'}</tbody>
  </table>
  <p class="rel-nota">A carga sugerida sobe só quando todas as séries fecham o topo da faixa de repetições com a folga indicada. Plano gerado pelo app Controle: não substitui a orientação de um profissional.</p>
</div>`;
}

function textoTreino(d) {
  const f = d.fase || {};
  const ex = d.exercicios || [];
  const cab = [(d.titulo || 'Treino') + (d.nome ? ' — ' + d.nome : ''), _dt(d.data) + (f.nome ? ' · ' + f.nome : '')];
  if (!d.cardio && f.series) cab.push(`${f.series} séries · ${f.repMin}–${f.repMax} reps · RIR ${f.rirAlvo}`);
  const itens = ex.map((e, i) => {
    const alvo = d.cardio ? _repsDoTreino(e) : `${e.series} × ${_repsDoTreino(e)}${e.kg ? ' · ' + _nt(e.kg) + ' kg' : ''}`;
    return `${i + 1}. ${e.n} — ${alvo}`;
  });
  return cab.join('\n') + '\n\n' + itens.join('\n') + '\n\nGerado no Controle.';
}
