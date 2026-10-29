/* ══════════════════════════════════════════════════════════
   SERVICE WORKER — Controle 5.0

   Por que foi reescrito:
   - antes guardava só 7 dos arquivos e o nome do cache nunca
     mudava, então o app não abria offline e quem já tinha
     instalado nunca recebia versão nova;
   - agora guarda TODOS os arquivos do app e usa rede primeiro
     (com prazo curto) e cache como reserva. Atualização chega
     sozinha; sem internet, abre do cache.

   Para publicar uma versão nova: mude VERSAO abaixo.
   Só trata GET do mesmo domínio: chamadas de IA e ao Open
   Food Facts nunca passam por aqui.
   ══════════════════════════════════════════════════════════ */

const VERSAO = '5.5.3';
const CACHE_NAME = 'ctrl-app-' + VERSAO;
const PRAZO_REDE_MS = 4000;

const ARQUIVOS = [
  './', './index.html', './manifest.webmanifest', './css/app.css',
  './js/dados.js', './js/dados-extra.js', './js/alimentos-mais.js', './js/restricoes.js', './js/treino.js', './js/perfil-core.js', './js/fotos.js',
  './js/metabolismo.js', './js/off.js', './js/analise2.js', './js/diagnostico.js', './js/cardapio.js',
  './js/coach.js', './js/registro-nl.js', './js/agente.js', './js/memoria.js', './js/fases.js',
  './js/jejum.js', './js/saber.js', './js/assistente.js', './js/ia-externa.js', './js/ia-local.js', './js/foto-prato.js', './js/habitos.js', './js/pilares.js', './js/trocas.js','./js/backup.js', './js/treino-pdf.js',
  './js/onboarding.js', './js/app.js',
  './icons/icon-v2-192.png', './icons/icon-v2-512.png', './icons/icon-v2-maskable-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      // um arquivo que falhe não derruba a instalação inteira
      Promise.all(ARQUIVOS.map(u => cache.add(u).catch(() => null)))
    )
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('ctrl-app-') && k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;          // provedores de IA, Open Food Facts, fontes

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      const resposta = await Promise.race([
        // "no-cache" revalida com o servidor (ETag) em vez de reaproveitar o cache HTTP do navegador:
        // sem isso, depois de uma publicação o app podia misturar arquivos novos e antigos por alguns minutos
        fetch(req, { cache: 'no-cache' }),
        new Promise((_, rej) => setTimeout(() => rej(new Error('prazo')), PRAZO_REDE_MS))
      ]);
      if (resposta && resposta.ok) cache.put(req, resposta.clone());
      return resposta;
    } catch (e) {
      const guardado = await cache.match(req, { ignoreSearch: true });
      if (guardado) return guardado;
      if (req.mode === 'navigate') {
        const casca = await cache.match('./index.html');
        if (casca) return casca;
      }
      return Response.error();
    }
  })());
});
