/* ══════════════════════════════════════════════════════════
   PRIMEIRO ACESSO 5.0

   Só interface. Todo cálculo vem de perfil-core.js (PC) e a
   gravação dos dados é do app.js, que recebe o resultado em
   `aoConcluir`.

   Tela cheia com rodapé fixo: os botões Voltar e Continuar
   ficam sempre à vista, em qualquer altura de tela e com o
   teclado aberto. Nada de botão perdido no fim de um scroll.
   ══════════════════════════════════════════════════════════ */

const Onboarding = (function () {
'use strict';

const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const br = n => String(n).replace('.', ',');
const DIAS_ROT = ['dom','seg','ter','qua','qui','sex','sáb'];
const ZONA_ROT = { abaixo:'abaixo do mínimo', minimo:'no mínimo', produtivo:'faixa produtiva', alto:'alto', excesso:'acima do teto', sem:'—' };

const FUNDO = ['#raiz', '#nav', '#fab-ia', '#cron'];
let D = null, passo = 0, modo = 'novo', cb = {}, abridor = null;
const TOTAL = 6;                    // 5 perguntas + resumo
const ROTULOS = ['Boas-vindas','Sobre você','Seu corpo','Objetivo','Treino','Seu plano'];
/* Título de cada etapa: é ele que dá nome ao diálogo (aria-labelledby) e que
   recebe o foco quando a etapa não tem campo de texto. */
const TIT = ' id="onb-tit" tabindex="-1" style="outline:none"';

/* Número digitado em pt-BR: vírgula ou ponto decimal, unidade opcional no fim
   ("82,5", "82.5 kg"). null se não for um número inteiro ou decimal simples. */
function num(txt) {
  const s = String(txt == null ? '' : txt).trim().toLowerCase().replace(/\s*(kg|cm|m)$/, '').replace(',', '.');
  return /^\d+(\.\d+)?$/.test(s) ? parseFloat(s) : null;
}
/* Altura em cm. Vale "172", "172,5" (arredonda para 173) e "1,72" (metros):
   de 1 a 2,5 é metro, de 100 para cima é centímetro. O que cair no meio ou
   fora de PC.ALTURA_VALIDA é recusado na validação, com mensagem. */
function lerAltura(txt) {
  const v = num(txt);
  if (v == null) return null;
  return Math.round(v >= 1 && v <= 2.5 ? v * 100 : v);
}

function prog() {
  return '<div class="onb-prog" role="progressbar" aria-label="Progresso do cadastro" aria-valuetext="Etapa ' + (passo + 1) + ' de ' + TOTAL + '" aria-valuemin="1" aria-valuemax="' + TOTAL + '" aria-valuenow="' + (passo + 1) + '">'
    + Array.from({ length: TOTAL }, (_, i) => '<i class="' + (i <= passo ? 'on' : '') + '"></i>').join('') + '</div>';
}

function opt(attr, val, ativo, titulo, sub, extra) {
  return '<button type="button" class="onb-opt" ' + attr + '="' + val + '" aria-pressed="' + (ativo ? 'true' : 'false') + '"><b>'
    + esc(titulo) + (extra || '') + '</b>' + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</button>';
}

/* ── conteúdo de cada passo ─────────────────────────── */
function corpo() {
  if (passo === 0) return `
    <h2 class="onb-h"${TIT}>${modo === 'novo' ? 'Bem-vindo' : 'Refazer o perfil'}</h2>
    <p class="onb-sub">${modo === 'novo'
      ? 'Cinco perguntas rápidas, uma única vez. Com as respostas o app abre já montado para você.'
      : 'Suas refeições, treinos e pesagens continuam salvos. O que muda são as metas e a divisão de treino.'}</p>
    <label class="campo"><span>Como você se chama?</span>
      <input type="text" id="onb-nome" value="${esc(D.nome)}" placeholder="Seu primeiro nome" autocomplete="given-name" maxlength="30"></label>
    ${modo === 'novo' ? `
    <div class="alerta ocre"><div class="alerta-tit">Isto não é orientação médica</div>
      <p>O app calcula metas a partir do que você informa. Não diagnostica e não substitui médico, nutricionista ou educador físico.
      Procure um profissional antes se você tem condição de saúde diagnosticada, usa medicação contínua, está grávida ou amamentando,
      ou já teve dificuldade na relação com comida ou com o peso.</p></div>
    <div class="alerta"><div class="alerta-tit">Seus dados</div>
      <p>Tudo fica só neste aparelho. Não existe conta nem servidor. Sai daqui apenas a consulta ao Open Food Facts (quando você
      usa código de barras ou busca online) e, se você ativar, as conversas com a IA do provedor que escolher.</p></div>
    <label class="onb-check" for="onb-ok"><input type="checkbox" id="onb-ok" aria-describedby="onb-ok-t"${D.aceite ? ' checked' : ''}>
      <span id="onb-ok-t">Confirmo que tenho 18 anos ou mais e li o aviso acima.</span></label>` : ''}`;

  if (passo === 1) return `
    <h2 class="onb-h"${TIT}>Sobre você</h2>
    <p class="onb-sub">Sexo e idade entram no cálculo do gasto de energia em repouso.</p>
    <div class="onb-grade2" role="group" aria-label="Sexo">${opt('data-sexo', 'm', D.sexo === 'm', 'Homem')}${opt('data-sexo', 'f', D.sexo === 'f', 'Mulher')}</div>
    <label class="campo"><span>Qual a sua idade?</span>
      <input type="number" id="onb-idade" value="${esc(D.idade)}" inputmode="numeric" placeholder="anos completos" min="10" max="100" step="1"></label>`;

  if (passo === 2) return `
    <h2 class="onb-h"${TIT}>Seu corpo hoje</h2>
    <p class="onb-sub">Use o peso de hoje, de manhã e em jejum se puder. A altura é necessária: sem ela a meta sai errada.</p>
    <div class="onb-grade2">
      <label class="campo"><span>Qual o seu peso? (kg)</span>
        <input type="text" id="onb-kg" value="${esc(br(D.kg))}" inputmode="decimal" placeholder="ex.: 82,5"></label>
      <label class="campo"><span>Altura (cm)</span>
        <input type="text" id="onb-cm" value="${esc(br(D.cm))}" inputmode="decimal" placeholder="ex.: 172"></label></div>`;

  if (passo === 3) {
    const pp = (D.kg && D.cm) ? PC.perdaPermitida(+D.kg, +D.cm) : null;
    const aviso = (pp && !pp.ok && D.objetivo === 'emagrecer')
      ? `<div class="alerta ocre"><div class="alerta-tit">Atenção</div><p>${esc(pp.texto)}</p></div>` : '';
    return `
    <h2 class="onb-h"${TIT}>Seu objetivo</h2>
    <p class="onb-sub">Define se o plano começa com déficit calórico ou em manutenção.</p>
    <div class="onb-lista">
      ${opt('data-obj', 'emagrecer', D.objetivo === 'emagrecer', 'Emagrecer', 'Déficit moderado, com proteína alta para preservar músculo.')}
      ${opt('data-obj', 'manter', D.objetivo === 'manter', 'Manter e ganhar força', 'Calorias no nível do gasto. Bom para recomposição corporal.')}
      <button type="button" class="onb-opt" disabled><b>Ganhar massa <span class="onb-tag off">em breve</span></b><small>Ainda não disponível. Por enquanto o app monta planos para emagrecer ou para manter.</small></button>
    </div>${aviso}`;
  }

  if (passo === 4) {
    const rec = PC.recomendarSplit(D.dias);
    const esc_ = D.split || rec;
    const av = PC.avaliarEscolha(esc_, D.dias);
    const cards = ['full', 'abc', 'abcd', 'abcd_classico'].map(id => {
      const s = PC.SPLITS[id];
      return opt('data-split', id, esc_ === id, s.nome, s.resumo,
        id === rec ? '<span class="onb-tag">indicado para ' + D.dias + ' dias</span>' : '');
    }).join('');
    return `
    <h2 class="onb-h"${TIT}>Seu treino</h2>
    <p class="onb-sub">O app monta exercícios, séries e progressão. Você pode trocar tudo depois.</p>
    <div class="onb-rot">Experiência</div>
    <div class="onb-grade2">${opt('data-nivel', 'iniciante', D.nivel === 'iniciante', 'Iniciante', 'Menos de 6 meses')}${opt('data-nivel', 'intermediario', D.nivel === 'intermediario', 'Já treino', '6 meses ou mais')}</div>
    <div class="onb-rot">Dias por semana</div>
    <div class="onb-dias">${[2,3,4,5,6].map(d => '<button type="button" class="onb-opt onb-dia" data-dias="' + d + '" aria-pressed="' + (D.dias === d) + '">' + d + '</button>').join('')}</div>
    <div class="onb-rot">Divisão</div>
    <div class="onb-lista">${cards}</div>
    ${av.avisos.map(a => '<div class="alerta ocre"><div class="alerta-tit">Considere</div><p>' + esc(a) + '</p></div>').join('')}`;
  }

  /* resumo */
  const r = RES;
  if (!r || !r.ok) return '<h2 class="onb-h"' + TIT + '>Plano não gerado</h2><div class="alerta ocre"><p>' + esc((r && r.nutri && r.nutri.texto) || 'Confira os dados informados.') + '</p></div>';
  const n = r.nutri, pl = r.plano;
  const seq = pl.diasSemana.map((d, i) => ({ d, l: pl.letras[i % pl.letras.length] }));
  const dias = [0,1,2,3,4,5,6].map(d => { const s = seq.find(x => x.d === d); return '<div class="onb-d ' + (s ? 'on' : '') + '"><b>' + (s ? s.l : '·') + '</b>' + DIAS_ROT[d] + '</div>'; }).join('');
  const ritmo = n.objetivo === 'emagrecer' ? 'déficit de ' + n.deficit + ' kcal/dia (' + br((n.ritmoPct * 100).toFixed(2)) + '% do peso por semana)' : 'sem déficit';
  const barra = x => {
    const f = x.faixa, topo = Math.max(f.mrv * 1.15, x.series * 1.05, 10), pc = v => Math.min(100, v / topo * 100);
    const seg = (a, b, cor) => b > a ? '<i style="left:' + pc(a) + '%;width:' + (pc(b) - pc(a)) + '%;background:' + cor + '"></i>' : '';
    return '<div class="onb-vol"><div class="onb-vol-t"><span>' + esc(x.rot) + '</span><span class="z-' + x.zona + '">' + br(x.series) + ' séries · ' + ZONA_ROT[x.zona] + '</span></div>'
      + '<div class="onb-trilho">' + seg(0, f.mev, 'color-mix(in srgb,var(--oxido) 35%,var(--linha))') + seg(f.mev, f.min, 'color-mix(in srgb,var(--carb) 55%,var(--linha))')
      + seg(f.min, f.max, 'var(--sinal)') + seg(f.max, f.mrv, 'color-mix(in srgb,var(--carb) 55%,var(--linha))') + seg(f.mrv, topo, 'color-mix(in srgb,var(--oxido) 55%,var(--linha))')
      + '<b style="left:' + pc(x.series) + '%"></b></div></div>';
  };
  return `
    <h2 class="onb-h"${TIT}>${esc(r.cfg.nome)}, seu plano está pronto</h2>
    <p class="onb-sub">Estimativa inicial. Com cerca de três semanas de registro o app troca a fórmula pelo seu gasto medido.</p>
    ${n.avisos.map(a => '<div class="alerta ocre"><div class="alerta-tit">Atenção</div><p>' + esc(a) + '</p></div>').join('')}
    <div class="bloco"><div class="bloco-tit"><span>Metas do dia</span><b>${n.kcal} kcal</b></div>
      <div class="grade3">
        <div><div class="kpi-num" style="color:var(--prot)">${n.prot}<small>g</small></div><div class="kpi-rot">Proteína</div></div>
        <div><div class="kpi-num" style="color:var(--carb)">${n.carb}<small>g</small></div><div class="kpi-rot">Carboidrato</div></div>
        <div><div class="kpi-num" style="color:var(--gord)">${n.gord}<small>g</small></div><div class="kpi-rot">Gordura</div></div></div>
      <p class="nota">Água ${br((n.agua / 1000).toFixed(1))} L · fibra ${n.fibra} g · IMC ${br(n.imc)}<br>
      Repouso ${n.tmb} kcal × atividade ${br(n.fator)} = ${n.tdee} kcal · ${ritmo}${n.objetivo === 'emagrecer' ? ' · meta inicial ' + br(n.metaInicial) + ' kg' : ''}</p></div>
    <div class="bloco"><div class="bloco-tit"><span>${esc(pl.nome)}</span><b>${pl.dias} dias</b></div>
      <div class="onb-semana">${dias}</div>
      ${pl.avaliacao.avisos.map(a => '<div class="alerta ocre" style="margin-top:8px"><div class="alerta-tit">Considere</div><p>' + esc(a) + '</p></div>').join('')}
      ${pl.letras.map(l => '<p class="onb-rotina"><b>' + esc(pl.rotinas[l].nome) + '</b><br>' + pl.rotinas[l].ex.map(e => esc(e.n) + ' ' + e.series + '×' + e.repMin + (e.repMax !== e.repMin ? '–' + e.repMax : '')).join(' · ') + '</p>').join('')}</div>
    <div class="bloco"><div class="bloco-tit"><span>Volume por músculo</span><b>séries/semana</b></div>
      ${pl.painel.map(barra).join('')}
      <p class="nota">Sinergistas contam meia série (o supino conta para o tríceps). Em déficit, o topo da faixa produtiva cai 15%. São faixas de trabalho, não lei.</p></div>
    <div class="bloco"><div class="bloco-tit"><span>Base do plano</span></div>
      <p class="nota" style="margin:0">Proteína de 1,6 a 2,2 g/kg (mais alta em déficit); cada músculo 2× por semana rende mais que 1×; mais séries semanais até um teto geram mais hipertrofia; perda de 0,5–1% do peso por semana. Déficit limitado a ${Math.round(PC.TETO_DEFICIT * 100)}% do gasto e piso de calorias por sexo são regras de segurança do app. Esses valores são referências de literatura, não uma prescrição individual.</p></div>`;
}

/* ── ciclo de tela ──────────────────────────────────── */
let RES = null;

/* `refoco`: seletor do controle que deve voltar a ter o foco (e a rolagem
   preservada) quando a tela é repintada por um clique numa opção. Sem ele,
   é troca de etapa: foco no primeiro campo de texto ou, se a etapa não tem,
   no título; rolagem no topo. */
function pintar(refoco) {
  const el = $('#onb'); if (!el) return;
  const ult = passo === TOTAL - 1;
  const rolagem = (refoco && $('#onb-corpo')) ? $('#onb-corpo').scrollTop : 0;
  el.innerHTML = `
    <div class="onb-cab"><span class="onb-etapa">${modo === 'novo' ? 'Primeiro acesso' : 'Perfil'} · ${passo + 1} de ${TOTAL} · ${ROTULOS[passo]}</span>
      ${modo !== 'novo' ? '<button type="button" class="onb-x" id="onb-cancelar" aria-label="Cancelar">×</button>' : ''}</div>
    ${prog()}
    <div class="onb-corpo" id="onb-corpo">${corpo()}<div class="onb-erro" id="onb-erro" role="alert"></div></div>
    <div class="onb-rod">
      ${passo > 0 ? '<button type="button" class="btn vazado" id="onb-voltar">Voltar</button>' : ''}
      <button type="button" class="btn" id="onb-seguir"${ult && (!RES || !RES.ok) ? ' disabled' : ''}>${ult ? (modo === 'novo' ? 'Começar' : 'Aplicar plano') : 'Continuar'}</button>
    </div>`;
  $('#onb-corpo').scrollTop = rolagem;
  const alvo = (refoco && $('#onb ' + refoco)) || (passo === 0 ? $('#onb-nome') : passo === 2 ? $('#onb-kg') : $('#onb-tit'));
  if (alvo) { try { alvo.focus({ preventScroll: true }); } catch (e) {} }
}

/* Controles que o Tab pode alcançar dentro do diálogo. */
function focaveis() {
  const el = $('#onb'); if (!el) return [];
  return Array.from(el.querySelectorAll('button, input, select, textarea, a[href], [tabindex]'))
    .filter(x => !x.disabled && x.tabIndex >= 0 && x.getClientRects().length);
}

/* Seletor do botão de opção clicado (data-sexo="f", data-dias="4", ...). */
function seletorDe(b) {
  const k = Object.keys(b.dataset)[0];
  return k ? '[data-' + k.replace(/[A-Z]/g, m => '-' + m.toLowerCase()) + '="' + b.dataset[k] + '"]' : null;
}

function lerCampos() {
  const v = id => { const e = $(id); return e ? e.value : null; };
  if (passo === 0) { D.nome = (v('#onb-nome') || '').trim(); const c = $('#onb-ok'); if (c) D.aceite = c.checked; }
  if (passo === 1) { D.idade = v('#onb-idade'); }
  if (passo === 2) { D.kg = v('#onb-kg'); D.cm = v('#onb-cm'); }
}

/* Mostra o erro no alerta (role="alert", lido na hora) e leva o foco ao campo
   com problema, marcado como inválido e ligado à mensagem. */
function erro(t, campo) {
  const e = $('#onb-erro');
  limparErro();
  if (e) { e.textContent = t; e.scrollIntoView({ block: 'nearest' }); }
  const c = campo ? $('#onb ' + campo) : null;
  if (c) {
    if (c.tagName === 'INPUT') { c.setAttribute('aria-invalid', 'true'); c.setAttribute('aria-describedby', 'onb-erro'); }
    try { c.focus({ preventScroll: true }); } catch (x) {}
  }
  return false;
}
function limparErro() {
  const e = $('#onb-erro'); if (e && e.textContent) e.textContent = '';
  document.querySelectorAll('#onb [aria-invalid]').forEach(x => { x.removeAttribute('aria-invalid'); x.removeAttribute('aria-describedby'); });
}

function validar() {
  lerCampos();
  if (passo === 0) {
    if (!D.nome) return erro('Diga como quer ser chamado.', '#onb-nome');
    if (modo === 'novo' && !D.aceite) return erro('Confirme a leitura do aviso para seguir.', '#onb-ok');
  }
  if (passo === 1) {
    const txt = String(D.idade).trim();
    if (!D.sexo) return erro('Escolha Homem ou Mulher para continuar.', '[data-sexo]');
    if (!/^\d{1,3}$/.test(txt)) return erro('Informe a idade em anos completos, sem decimais (por exemplo, 34).', '#onb-idade');
    const i = parseInt(txt, 10);
    if (i < 1 || i > 100) return erro('Informe uma idade válida, em anos completos.', '#onb-idade');
    if (i < 18) return erro('O Controle é para maiores de 18 anos. Nessa idade, metas de calorias precisam de acompanhamento de pediatra ou nutricionista.', '#onb-idade');
    D.idade = i;
  }
  if (passo === 2) {
    const kg = num(D.kg), cm = lerAltura(D.cm), P = PC.PESO_VALIDO, H = PC.ALTURA_VALIDA;
    if (kg == null || !(kg >= P.min && kg <= P.max)) return erro('Informe o peso em quilos, entre ' + P.min + ' e ' + P.max + ' kg (por exemplo, 82,5).', '#onb-kg');
    if (cm == null || !(cm >= H.min && cm <= H.max)) return erro('Informe a altura em centímetros, entre ' + H.min + ' e ' + H.max + ' cm (por exemplo, 172 ou 1,72).', '#onb-cm');
    D.kg = Math.round(kg * 10) / 10; D.cm = cm;
  }
  return true;
}

function gerar() {
  RES = PC.gerarPerfil({
    nome: D.nome, sexo: D.sexo, idade: +D.idade, kg: +D.kg, cm: +D.cm, objetivo: D.objetivo,
    nivel: D.nivel, dias: D.dias, split: D.split || PC.recomendarSplit(D.dias)
  });
}

function seguir() {
  if (!validar()) return;
  if (passo === TOTAL - 2) gerar();
  if (passo === TOTAL - 1) {
    if (!RES || !RES.ok) return;
    const fim = cb.aoConcluir; fechar();
    if (fim) fim(RES, D);
    return;
  }
  passo++; pintar();
}

function voltar() { lerCampos(); if (passo > 0) { passo--; pintar(); } }

function fechar() {
  const el = $('#onb'); if (!el) return;
  el.hidden = true; el.innerHTML = '';
  document.body.classList.remove('onb-on');
  FUNDO.forEach(sel => { const x = $(sel); if (x) { x.inert = false; x.removeAttribute('aria-hidden'); } });
  document.removeEventListener('keydown', teclas);
  el.removeEventListener('input', limparErro);
  // devolve o foco a quem abriu o perfil (se ainda está na tela)
  if (abridor && abridor.isConnected && abridor.focus) { try { abridor.focus({ preventScroll: true }); } catch (e) {} }
  abridor = null;
}

function teclas(e) {
  if (e.key === 'Enter' && e.target && e.target.tagName === 'INPUT' && e.target.type !== 'checkbox') { e.preventDefault(); seguir(); }
  if (e.key === 'Escape' && modo !== 'novo') { fechar(); if (cb.aoCancelar) cb.aoCancelar(); }
  /* Foco preso no diálogo: Tab no último controle volta ao primeiro, e
     Shift+Tab no primeiro vai ao último. Cobre também navegador sem `inert`. */
  if (e.key === 'Tab') {
    const f = focaveis(); if (!f.length) return;
    const i = f.indexOf(document.activeElement);
    if (e.shiftKey) { if (i <= 0) { e.preventDefault(); f[f.length - 1].focus(); } }
    else if (i === -1 || i === f.length - 1) { e.preventDefault(); f[0].focus(); }
  }
}

function clique(e) {
  const b = e.target.closest('button'); if (!b || !$('#onb').contains(b)) return;
  if (b.id === 'onb-seguir') return seguir();
  if (b.id === 'onb-voltar') return voltar();
  if (b.id === 'onb-cancelar') { fechar(); if (cb.aoCancelar) cb.aoCancelar(); return; }
  lerCampos();
  limparErro();
  const sel = seletorDe(b);          // o botão é recriado ao repintar: o foco volta ao equivalente
  if (b.dataset.sexo) { D.sexo = b.dataset.sexo; pintar(sel); return; }
  if (b.dataset.obj) { D.objetivo = b.dataset.obj; pintar(sel); return; }
  if (b.dataset.nivel) { D.nivel = b.dataset.nivel; pintar(sel); return; }
  if (b.dataset.dias) { D.dias = +b.dataset.dias; D.diasTocado = true; pintar(sel); return; }
  if (b.dataset.split) {
    D.split = b.dataset.split;
    if (!D.diasTocado) D.dias = PC.SPLITS[D.split].diasIdeais[0];
    pintar(sel); return;
  }
}

/* opts: { modo:'novo'|'refazer', inicial:{...}, aoConcluir(res, dados), aoCancelar() } */
function abrir(opts) {
  opts = opts || {};
  modo = opts.modo || 'novo'; cb = opts;
  D = Object.assign({ nome: '', aceite: modo !== 'novo', sexo: null, idade: '', kg: '', cm: '',
                      objetivo: 'emagrecer', nivel: 'iniciante', dias: 3, diasTocado: false, split: null }, opts.inicial || {});
  if (modo !== 'novo' && D.split) D.diasTocado = true;
  passo = 0; RES = null;
  const el = $('#onb');
  abridor = document.activeElement && document.activeElement !== document.body ? document.activeElement : null;
  el.hidden = false; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-labelledby', 'onb-tit');
  document.body.classList.add('onb-on');
  // `inert` tira o fundo do foco e do leitor de tela; aria-hidden cobre navegador sem suporte
  FUNDO.forEach(sel => { const x = $(sel); if (x) { x.inert = true; x.setAttribute('aria-hidden', 'true'); } });
  el.removeEventListener('click', clique); el.addEventListener('click', clique);
  el.removeEventListener('input', limparErro); el.addEventListener('input', limparErro);
  document.removeEventListener('keydown', teclas); document.addEventListener('keydown', teclas);
  pintar();
}

return { abrir, fechar };
})();
