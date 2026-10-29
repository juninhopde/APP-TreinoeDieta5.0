/* ══════════════════════════════════════════════════════════
   TROCAS POR GRUPO

   Dado um item do diário, devolve os alimentos que o substituem, separados por
   grupo (proteína, carboidrato, gordura, vegetal, fruta, laticínio, outros).
   Cada opção vem com a gramagem que mantém as calorias do item original dentro
   de ±2%. A proteína pode mudar: a diferença é devolvida para a tela mostrar.

   Funções puras, como em habitos.js. Usa funcaoDe() de cardapio.js.
   ══════════════════════════════════════════════════════════ */
'use strict';

const TROCA_TOLERANCIA = 0.02;
const TROCA_POR_GRUPO = 15;

const Trocas = {
  GRUPOS: {
    proteina: 'Proteína', carboidrato: 'Carboidrato', gordura: 'Gordura',
    vegetal: 'Vegetal', fruta: 'Fruta', laticinio: 'Laticínio', misto: 'Outros'
  },

  kcal100(a) { return (+a.p || 0) * 4 + (+a.c || 0) * 4 + (+a.g || 0) * 9 + (+a.alc || 0) * 7; },

  grupoDe(a) {
    const f = funcaoDe(a);
    return Trocas.GRUPOS[f] ? f : 'misto';          // bebida e o que não se encaixa vão para "Outros"
  },

  /* Grupo do item que está no diário. Se ele veio da base, usa a base. Item de rótulo ou
     receita não tem base: o grupo sai do macro que mais pesa nas calorias dele. */
  grupoDoItem(item, base) {
    const a = (base || []).find(x => x.n === item.n);
    if (a) return Trocas.grupoDe(a);
    const p = (+item.p || 0) * 4, c = (+item.c || 0) * 4, g = (+item.g || 0) * 9;
    if (p + c + g <= 0) return 'misto';
    return p >= c && p >= g ? 'proteina' : g >= c ? 'gordura' : 'carboidrato';
  },

  /* Gramas do alimento `a` que valem `kcalAlvo` kcal (inteiro), ou null se não dá para
     ficar dentro de ±2% ou se a porção sai absurda. */
  porcao(a, kcalAlvo) {
    const k100 = Trocas.kcal100(a);
    if (!(k100 > 0) || !(kcalAlvo > 0)) return null;
    const gr = Math.round(kcalAlvo / k100 * 100);
    if (gr < 5 || gr > 1200) return null;
    const kcal = k100 * gr / 100;
    if (Math.abs(kcal - kcalAlvo) > kcalAlvo * TROCA_TOLERANCIA) return null;
    return { gr, kcal: Math.round(kcal) };
  },

  /* { atual, grupos: { grupo: [ { a, gr, kcal, p, c, g, dp } ] } }
     `evitar` = nomes que a pessoa pediu para não ver. `base` já vem filtrada pelas restrições. */
  candidatos(item, base, completa, evitar) {
    evitar = evitar || [];
    const atual = Trocas.grupoDoItem(item, completa || base);
    const orig = (completa || base || []).find(x => x.n === item.n);
    const grupos = {};
    (base || []).forEach(a => {
      if (a.n === item.n || evitar.includes(a.n)) return;
      const por = Trocas.porcao(a, item.kcal);
      if (!por) return;
      const f = por.gr / 100, k = Trocas.grupoDe(a);
      const p = +((+a.p || 0) * f).toFixed(1);
      (grupos[k] = grupos[k] || []).push({
        a, gr: por.gr, kcal: por.kcal, p, c: +((+a.c || 0) * f).toFixed(1), g: +((+a.g || 0) * f).toFixed(1),
        dp: +(p - (+item.p || 0)).toFixed(1), mesmaCat: !!(orig && a.cat === orig.cat)
      });
    });
    Object.keys(grupos).forEach(k => {
      grupos[k].sort((x, y) => (y.mesmaCat - x.mesmaCat) || (Math.abs(x.dp) - Math.abs(y.dp)));
      grupos[k] = grupos[k].slice(0, TROCA_POR_GRUPO);
    });
    return { atual, grupos };
  },

  /* Grupo que abre selecionado: o do item, se tiver opção; senão o primeiro com opção. */
  grupoInicial(res) {
    if (res.grupos[res.atual] && res.grupos[res.atual].length) return res.atual;
    const ordem = Object.keys(Trocas.GRUPOS).filter(k => res.grupos[k] && res.grupos[k].length);
    return ordem[0] || null;
  }
};
