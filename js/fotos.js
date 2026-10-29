/* ══════════════════════════════════════════════════════════
   IndexedDB — apenas para imagens.

   Por que só imagens: o estado em texto (diário, treinos,
   pesos) cabe folgado em localStorage e é muito mais simples
   de auditar e exportar. Imagens estouram o limite de ~5 MB
   em poucos registros, então vão para cá.
   ══════════════════════════════════════════════════════════ */

const FotoDB = (function () {
  const NOME = 'controle-fotos';
  const LOJA = 'fotos';
  let db = null, abrindo = null;

  function abrir() {
    if (db) return Promise.resolve(db);
    if (abrindo) return abrindo;                     // duas chamadas seguidas dividem uma abertura só
    abrindo = new Promise((ok, erro) => {
      if (!window.indexedDB) return erro(new Error('IndexedDB indisponível'));
      const req = indexedDB.open(NOME, 1);
      req.onupgradeneeded = ev => {
        const d = ev.target.result;
        if (!d.objectStoreNames.contains(LOJA)) {
          const loja = d.createObjectStore(LOJA, { keyPath: 'id' });
          loja.createIndex('data', 'data');
          loja.createIndex('tipo', 'tipo');
        }
      };
      req.onsuccess = () => {
        db = req.result;
        // O navegador pode fechar a conexão sozinho (limpeza de dados, pouco espaço)
        // e outra aba pode pedir atualização do banco. Em ambos os casos o cache
        // em `db` ficaria apontando para uma conexão morta: descarta e reabre.
        db.onclose = () => { db = null; };
        db.onversionchange = () => { db.close(); db = null; };
        ok(db);
      };
      req.onerror = () => erro(req.error);
    });
    abrindo.then(() => { abrindo = null; }, () => { abrindo = null; });
    return abrindo;
  }

  /* Transação nova. Se a conexão em cache morreu entre a abertura e o uso,
     reabre uma vez em vez de falhar. */
  function tx(modo) {
    return abrir().then(d => {
      try { return d.transaction(LOJA, modo); }
      catch (e) { db = null; return abrir().then(d2 => d2.transaction(LOJA, modo)); }
    });
  }

  /* Erro de gravação com texto de usuário. Disco cheio (QuotaExceededError)
     precisa ser dito: gravar sem espaço e fingir que deu certo perde a foto. */
  function erroGravacao(e) {
    if (e && e.name === 'QuotaExceededError') {
      const x = new Error('Sem espaço no aparelho para guardar a foto. Apague fotos antigas ou libere armazenamento e tente de novo.');
      x.name = 'QuotaExceededError'; x.cota = true;
      return x;
    }
    return e || new Error('Não foi possível gravar a foto.');
  }

  /* Escrita: só vale quando a TRANSAÇÃO termina (oncomplete). O onsuccess do
     pedido vem antes do commit, e uma falha de cota depois dele abortaria a
     transação sem ninguém ficar sabendo. Erro de pedido que ninguém trata
     aborta a transação, então o onabort cobre todos os casos (com a causa
     verdadeira em t.error, em vez do AbortError genérico dos pedidos). */
  function escrever(fazer, resultado) {
    return tx('readwrite').then(t => new Promise((ok, erro) => {
      t.oncomplete = () => ok(resultado);
      t.onabort = () => erro(erroGravacao(t.error));
      fazer(t.objectStore(LOJA));
    }));
  }

  return {
    /* registro: { id, data:'YYWW-MM-DD', tipo:'frente'|'lado'|'costas'|'refeicao', blob, peso } */
    salvar(reg) {
      return escrever(loja => { loja.put(reg); }, reg.id);
    },

    obter(id) {
      return tx('readonly').then(t => new Promise((ok, erro) => {
        const r = t.objectStore(LOJA).get(id);
        r.onsuccess = () => ok(r.result || null);
        r.onerror = () => erro(r.error);
      }));
    },

    listar(tipo) {
      return tx('readonly').then(t => new Promise((ok, erro) => {
        const r = t.objectStore(LOJA).getAll();
        r.onsuccess = () => {
          let v = r.result || [];
          if (tipo) v = v.filter(x => x.tipo === tipo);
          v.sort((a, b) => a.data < b.data ? -1 : 1);
          ok(v);
        };
        r.onerror = () => erro(r.error);
      }));
    },

    apagar(id) {
      return escrever(loja => { loja.delete(id); }, true);
    },

    tamanho() {
      if (navigator.storage && navigator.storage.estimate) {
        return navigator.storage.estimate().then(e => ({ uso: e.usage || 0, cota: e.quota || 0 }));
      }
      return Promise.resolve(null);
    }
  };
})();

/* ══════════════════════════════════════════════════════════
   Compressão de imagem antes de guardar ou enviar.
   Reduz o lado maior para `lado` px e recodifica em JPEG.
   ══════════════════════════════════════════════════════════ */

function comprimirImagem(arquivo, lado, qualidade) {
  lado = lado || 1024;
  qualidade = qualidade || 0.82;
  return new Promise((ok, erro) => {
    const img = new Image();
    const url = URL.createObjectURL(arquivo);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width: w, height: h } = img;
      const escala = Math.min(1, lado / Math.max(w, h));
      w = Math.round(w * escala); h = Math.round(h * escala);
      const cv = document.createElement('canvas');
      cv.width = w; cv.height = h;
      cv.getContext('2d').drawImage(img, 0, 0, w, h);
      cv.toBlob(b => b ? ok(b) : erro(new Error('falha ao comprimir')), 'image/jpeg', qualidade);
    };
    img.onerror = () => { URL.revokeObjectURL(url); erro(new Error('imagem inválida')); };
    img.src = url;
  });
}

/* Compara duas fotos de progresso. A mais antiga vira "antes", seja qual for a ordem em que
   a pessoa as escolheu. Devolve { antes, depois, dias, kg } ou { erro }. `kg` só existe se as
   duas fotos têm peso gravado. */
function compararFotos(a, b) {
  if (!a || !b) return { erro: 'Escolha duas fotos.' };
  if (a.id === b.id) return { erro: 'Escolha duas fotos diferentes.' };
  const [antes, depois] = String(a.data) <= String(b.data) ? [a, b] : [b, a];
  const d0 = new Date(antes.data + 'T12:00'), d1 = new Date(depois.data + 'T12:00');
  const dias = Math.round((d1 - d0) / 86400000);
  const p0 = +antes.peso, p1 = +depois.peso;
  const kg = p0 > 0 && p1 > 0 ? +(p1 - p0).toFixed(1) : null;
  return { antes, depois, dias: isNaN(dias) ? null : dias, kg };
}
