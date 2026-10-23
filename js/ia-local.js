/* ══════════════════════════════════════════════════════════
   MODELO NO APARELHO (opcional) — WebLLM + WebGPU

   O usuário baixa um modelo pequeno UMA vez, direto do
   navegador dele. O arquivo fica no cache do navegador; não
   passa por servidor do app e não custa nada ao publicador.

   Limites que a tela diz com todas as letras:
   - precisa de WebGPU (Chrome recente no Android/desktop;
     suporte irregular no iPhone);
   - o download vai de centenas de MB a alguns GB;
   - modelo pequeno conversa pior e NÃO calcula nada: ele
     recebe o diagnóstico já calculado pelo app;
   - ele conversa, não executa ações (ações são do assistente
     embutido e da IA por chave, que passam pela validação).

   A biblioteca é carregada só quando a pessoa pede, de esm.run
   (CDN liberada no CSP). A lista de modelos vem do catálogo da
   própria biblioteca no momento do uso, filtrada pela memória
   do aparelho, em vez de nomes fixos que envelhecem.
   ══════════════════════════════════════════════════════════ */

/* Versão fixa: "latest" trocaria a biblioteca (e a lista de modelos) por baixo do app a cada
   publicação do pacote, sem que ninguém tenha testado. 0.2.85 exporta CreateMLCEngine,
   prebuiltAppConfig.model_list, deleteModelAllInfoInCache e MLCEngine.interruptGenerate.
   Para subir de versão: conferir esses nomes no bundle novo antes de trocar o número. */
const IAL_URL = 'https://esm.run/@mlc-ai/web-llm@0.2.85';
const IAL_LIMITE_MS = 180000;    // uma resposta que passa de 3 minutos é cortada

const IAL = {
  engine: null,
  modelo: null,
  carregando: false,
  gerando: false,
  lib: null,
  historico: [],

  suportado() {
    return typeof navigator !== 'undefined' && !!navigator.gpu;
  },

  async _lib() {
    if (!this.lib) this.lib = await import(IAL_URL);
    return this.lib;
  },

  /* Modelos do catálogo, do menor para o maior, dentro do que
     o aparelho aguenta. deviceMemory (quando existe) limita. */
  async modelos() {
    const lib = await this._lib();
    const lista = (lib.prebuiltAppConfig && lib.prebuiltAppConfig.model_list) || [];
    const gb = navigator.deviceMemory || 4;
    const teto = Math.max(1500, Math.min(6000, gb * 1024 * 0.55));
    const vistos = new Set();
    return lista
      .filter(m => m && m.model_id && (m.model_type == null || m.model_type === 0))
      .filter(m => !/(embed|coder|math|vision|vl-|-vl|llava)/i.test(m.model_id))
      .filter(m => (m.vram_required_MB || 0) > 0 && m.vram_required_MB <= teto)
      .sort((a, b) => a.vram_required_MB - b.vram_required_MB)
      .filter(m => {
        // uma variante por família: evita 6 quantizações do mesmo modelo
        const fam = m.model_id.replace(/-(q\d.*|MLC.*)$/i, '');
        if (vistos.has(fam)) return false;
        vistos.add(fam); return true;
      })
      .slice(0, 8)
      .map(m => ({ id: m.model_id, rot: m.model_id.replace(/-MLC$/, '').replace(/-q\d.*$/i, ''), mb: Math.round(m.vram_required_MB) }));
  },

  async carregar(id, aoProgresso) {
    if (!this.suportado()) throw new Error('Este navegador não expõe a GPU para páginas web (WebGPU).');
    if (this.carregando) throw new Error('Já existe um download em andamento.');
    /* navigator.gpu existir não basta: alguns navegadores expõem o objeto
       mas não têm adaptador. Sem esta checagem o download inteiro seria em vão. */
    let adaptador = null;
    try { adaptador = await navigator.gpu.requestAdapter(); } catch (e) {}
    if (!adaptador) throw new Error('O aparelho não tem GPU compatível com WebGPU.');
    this.carregando = true;
    try {
      const lib = await this._lib();
      await this.interromper();
      if (this.engine) { try { await this.engine.unload(); } catch (e) {} this.engine = null; }
      this.engine = await lib.CreateMLCEngine(id, {
        initProgressCallback: r => { if (aoProgresso) aoProgresso(r && r.text, r && r.progress); }
      });
      this.modelo = id; this.historico = [];
      return true;
    } catch (e) {
      this.engine = null; this.modelo = null;
      throw new Error(traduzirErroLocal(e));
    } finally { this.carregando = false; }
  },

  pronto() { return !!this.engine; },

  /* Corta a resposta em andamento; o texto já gerado fica. Sem engine, ou numa versão da
     biblioteca sem o método, não faz nada. */
  async interromper() {
    if (this.engine && typeof this.engine.interruptGenerate === 'function') {
      try { await this.engine.interruptGenerate(); } catch (e) {}
    }
  },

  /* Conversa com streaming. `sistema` é o diagnóstico já calculado.
     Uma resposta por vez: duas gerações no mesmo engine se embaralham. */
  async conversar(sistema, pergunta, aoPedaco) {
    if (!this.engine) throw new Error('Nenhum modelo carregado.');
    if (this.gerando) throw new Error('O modelo ainda está respondendo à pergunta anterior.');
    const msgs = [{ role: 'system', content: sistema + '\n\nResponda em português do Brasil, em até 6 linhas. Use só os números do contexto acima e nunca invente valor, estudo ou dose.' }]
      .concat(this.historico.slice(-6))
      .concat([{ role: 'user', content: String(pergunta) }]);
    const eng = this.engine;
    this.gerando = true;
    const limite = setTimeout(() => this.interromper(), IAL_LIMITE_MS);
    try {
      let texto = '';
      const fluxo = await eng.chat.completions.create({ messages: msgs, stream: true, temperature: 0.4, max_tokens: 500 });
      for await (const parte of fluxo) {
        const d = (parte.choices && parte.choices[0] && parte.choices[0].delta && parte.choices[0].delta.content) || '';
        if (d) { texto += d; if (aoPedaco) aoPedaco(texto); }
      }
      if (this.engine !== eng) throw new Error('O modelo foi trocado durante a resposta.');
      texto = texto.trim();
      if (!texto) throw new Error('O modelo local respondeu vazio.');
      this.historico.push({ role: 'user', content: String(pergunta) }, { role: 'assistant', content: texto });
      return texto;
    } finally { clearTimeout(limite); this.gerando = false; }
  },

  async descarregar() {
    await this.interromper();
    if (this.engine) { try { await this.engine.unload(); } catch (e) {} }
    this.engine = null; this.modelo = null; this.historico = [];
  },

  /* Apaga o arquivo do cache do navegador. */
  async removerDoCache(id) {
    const lib = await this._lib();
    if (lib.deleteModelAllInfoInCache) await lib.deleteModelAllInfoInCache(id);
  }
};

function traduzirErroLocal(e) {
  const m = String((e && e.message) || e || '');
  if (/out of memory|OOM|memory|allocation/i.test(m)) return 'Faltou memória para este modelo. Escolha um menor da lista.';
  if (/adapter|webgpu|GPU/i.test(m)) return 'O aparelho não conseguiu iniciar a GPU para o modelo (WebGPU).';
  if (/Failed to fetch|NetworkError|Load failed|fetch/i.test(m)) return 'Falha de rede no download do modelo. Use Wi-Fi e tente de novo.';
  if (/quota|storage/i.test(m)) return 'Sem espaço de armazenamento no navegador para este modelo.';
  return 'Não foi possível carregar o modelo: ' + m.slice(0, 160);
}
