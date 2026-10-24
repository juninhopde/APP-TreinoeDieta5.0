# Controle 5.0 — Dieta, Treino e Coach

PWA de dieta, treino e coach, com perfil próprio, periodização de treino, gasto energético medido, coach
com cobrança calibrável e assistente de conhecimento embutido. Funciona offline.
Os dados ficam no aparelho.


---

## Versão 5.2.0 — ganho de massa, recuperação, hábitos e backup

- **Ganhar massa.** Nova opção no primeiro acesso e nova fase do plano: superávit pequeno e controlado
  (0,25% a 0,4% do peso por semana, no máximo 15% do gasto e 500 kcal), proteína 1,8 g/kg e diagnóstico
  próprio de ritmo ("rápido demais" vira gordura). Com IMC acima de 27 o app não monta superávit e segue
  em manutenção com treino de força (recomposição).
- **Check-in de recuperação.** Sono, energia, estresse, dor e fome em 10 segundos (também por frase no
  chat: "dormi mal"). Com recuperação baixa, o coach sugere a versão leve do treino (uma série a menos).
- **Sequências, conquistas e revisão da semana.** A sequência dá 1 folga a cada 7 dias seguidos. A revisão
  mostra o que foi bem e um único ajuste, e o relatório sai em PDF (impressão do navegador) ou texto.
- **Backup.** Cópia automática diária no aparelho (7 mais recentes, com restauração), aviso de backup em
  arquivo vencido e compartilhamento pelo menu do celular. A cópia automática não protege de limpar os
  dados do navegador: para isso vale o arquivo.
- **Lembretes no calendário.** Um app web sem servidor não notifica com o app fechado. O botão "Levar para
  o calendário do celular (.ics)" em Ajustes leva os lembretes para o calendário, com alarme na hora certa.
- **Atualização sempre fresca.** O service worker revalida os arquivos a cada abertura, sem misturar versões.

## Versão 5.1.0 — foto do prato e base maior

- **Foto do prato (IA).** Botão na tela Hoje: a foto vai ao provedor de IA da própria pessoa (Gemini, OpenAI
  ou Claude, com a chave dela, e só depois de um aviso de privacidade) e volta como lista de alimentos com
  gramas estimadas, numa prévia editável. Nada é gravado sem conferência. Arquivo: `js/foto-prato.js`.
- **Mais de 660 alimentos novos** em `js/alimentos-mais.js` (pratos, marmitas, suplementos, bebidas, doces,
  padaria, fast-food). Valores aproximados (margem de cerca de 10%); suplementos, marmitas e itens de
  restaurante variam por marca e porção, confira no rótulo.

## Versão 5.0.1 — correções, segurança e acabamento

- **Segurança.** O Safety Engine passou a reconhecer autolesão e suicídio (CVV 188, SAMU 192), dieta e
  jejum extremos, sinais clínicos e variações de frase; antes só casava a frase exata. Falsos alarmes
  ("meu ciclo de treino", "tenho 15 anos de treino") deixaram de travar o app. Meta manual respeita o
  piso calórico e o teto de déficit. Quem tem IMC abaixo de 19 não entra em fase de déficit.
- **Dados.** Importar backup e "Apagar tudo" não são mais desfeitos pelo salvamento da saída; backup é
  validado antes de gravar e o estado anterior fica guardado. O app abre mesmo com dados corrompidos.
  Se ficar aberto de um dia para o outro, passa para o dia novo sozinho.
- **Registro por texto.** Vírgula decimal ("1,5"), plurais, medidas ("colher de sopa"), "ovo, pão, café"
  e quantidade depois do nome ("arroz 150g") passaram a funcionar. Unidade sem peso cadastrado ("meio
  abacate") pede gramas em vez de gravar 1 g.
- **Cálculos.** Gordura corporal para mulheres (com quadril), gasto medido sem dias incompletos,
  diagnóstico sem alarme para quem começou agora e sem cobrança de déficit em manutenção, carga do
  deload, jejum antes da primeira refeição do dia, álcool em g/100 ml.
- **Interface.** Janelas com foco, Esc e leitor de tela; tema do aparelho; layout para tablet e desktop;
  textos de desenvolvedor removidos; números com vírgula; atalhos do ícone do app funcionando.

## Novidades da 5.0

- **Primeiro acesso, uma vez só.** Nome, sexo, idade, peso, altura, objetivo e treino (full body, ABC ou ABCD).
  O app abre com metas, rotinas e volume por músculo já montados. Quem já usava a 4.x **não** passa por isso;
  pode refazer em Plano ou Ajustes, sem perder histórico.
- **Divisões de treino.** Full body, ABC, ABCD (Superior/Inferior ×2) e ABCD clássico (com aviso de frequência 1×/semana).
  O cardio agora é a rotina **K** (antes era "C", que virou treino de verdade). O histórico migra sozinho.
- **Volume por músculo (estilo RP).** Painel de séries feitas × plano × faixa produtiva, e questionário de 3 toques
  depois de cada treino que ajusta as séries da rotina (no máximo 1 ajuste a cada 5 dias por músculo; dor articular reduz; deload não muda).
- **Registro de treino (estilo Hevy).** "Última vez" por exercício, recorde pessoal (1RM estimado), descanso por exercício.
- **Gasto medido (estilo MacroFactor).** A meta passa a misturar fórmula e gasto medido pelo peso da confiança (teto de 90%).
- **Base de alimentos:** mais de 600 itens novos (pratos, regionais, fast-food, snacks), sinônimos regionais,
  tolerância a erro de digitação e busca online no Open Food Facts.
- **IA em três camadas, todas opcionais.** (1) Assistente embutido: offline, sem chave, agora com correção de digitação
  e ações de treino. (2) Chave própria: Gemini, OpenAI, Claude, Groq e OpenRouter, com "Listar modelos" direto do provedor.
  (3) Modelo no aparelho (WebLLM, precisa de WebGPU). Se qualquer uma falhar, o embutido responde.
- **Offline de verdade.** O service worker agora guarda todos os arquivos e atualiza sozinho.

### Como atualizar quem já publicou
Substitua **todos** os arquivos do repositório por estes, mantendo as pastas. Quem já instalou recebe a versão nova
ao abrir o app com internet (se não vier, feche e abra de novo). Para publicar versões futuras, mude `VERSAO` em `sw.js`.

### O que conferir antes de confiar
- Valores nutricionais dos alimentos novos são **aproximados** (erro de cerca de 10%), escritos a partir de tabelas
  brasileiras sem consulta em tempo real. Para produto de marca, use o código de barras.
- As faixas de volume e de proteína são referências de literatura (por exemplo Schoenfeld, Morton, Garthe), citadas de memória.
  **Confira as fontes.** São faixas de trabalho, não prescrição individual.
- Nomes de modelo de IA mudam com frequência: depois de salvar a chave, use **Listar modelos**.
- O modelo no aparelho e as chamadas reais aos provedores dependem do seu aparelho e da sua chave; foram testados com simulação.
- O painel de **Análise** ainda usa os 8 grupos musculares antigos e pode diferir do painel de volume da aba Treino.
- O registro por texto livre (chat) ainda não usa os sinônimos regionais da busca por toque.
- Este app não é orientação médica. Para menores de 18 anos ele não monta plano.

---

## Onde publicar

| Host | Funciona? |
|---|---|
| **Netlify** | Sim |
| **Vercel** | Sim |
| **Cloudflare Pages** | Sim |
| **GitHub Pages** | Sim |

O app é estático puro e **não precisa de servidor para nada**. Escolha o que
preferir: todos funcionam igual, com https e instalação na tela inicial.

### Publicando

1. Suba o conteúdo desta pasta num repositório do GitHub, mantendo as pastas.
2. **Vercel / Netlify / Cloudflare:** importe o repositório. Framework Preset
   **Other**. Não há build. Deploy.
3. **GitHub Pages:** Settings → Pages → branch `main`, pasta `/ (root)`.

Para um teste rápido sem repositório: arraste a pasta em
[app.netlify.com/drop](https://app.netlify.com/drop).

### Instalar no celular

Abra o endereço no Chrome do Android → menu ⋮ → **Instalar app**.

---

## Nenhuma chave sua no projeto

**Você não configura chave nenhuma para publicar.** Nada de `.env`, nada de
variável de ambiente, nada de função serverless. Publicar com uma chave do dono
significaria que todo visitante consumiria aquela cota.

Cada usuário pode, **se quiser**, colar a própria chave em Ajustes para ter
conversa livre com um modelo de linguagem. A chave fica no `localStorage` do
aparelho dele, em espaço separado (`ctrl_ia_keys`), **nunca entra no
backup exportado**, é apagada junto com "Apagar todos os dados" e sai dali apenas
para o provedor que ele escolheu.

O `index.html` traz um CSP justamente por isso: `connect-src` libera só os
provedores de IA e o banco público de alimentos, e o único script embutido na
página é autorizado por hash (não há `unsafe-inline` em `script-src`). O que
sobra é `unsafe-eval` e a CDN, que existem só para o modelo opcional no aparelho
(WebLLM): sem essa função, os dois podem ser removidos do CSP.

### Isso é opcional de verdade

O app inteiro funciona sem chave: seis telas, registro por texto livre, cardápio,
coach, jejum e 85 tópicos de conhecimento. Se a IA externa falhar por qualquer
motivo — chave errada, cota estourada, provedor fora, sem internet — o assistente
embutido **responde a mesma pergunta** e avisa o que houve.

---

## A IA como agente

O assistente não só responde: **executa**. São 20 ferramentas declaradas, 17
utilizáveis e 3 proibidas — registrar refeição, peso, passos e cardio; gerar
cardápio e lista de compras; mudar fase, intensidade e divisão de treino; iniciar
treino e ajustar volume; definir a regra combinada; ensinar e lembrar.

Cada ferramenta tem validação de argumentos (com limite de tamanho) e política de
confirmação. Ação que grava dado do usuário **pede confirmação**, inclusive quando
nasce de uma frase solta do chat ("estou com 83 kg", "quero entrar em
manutenção"); ação reversível executa direto. Tudo vai para um log auditável
visível em Ajustes.

### O que a IA não pode fazer

Três ferramentas existem apenas para que o modelo saiba que são proibidas — um
modelo que não conhece o limite tenta contorná-lo:

- `alterar_codigo` — o código do app não é editável em tempo de execução. Um erro
  silencioso ali viraria meta calórica errada sem revisão humana.
- `ajustar_meta_livre` — meta abaixo do piso ou déficit acima de 30% do gasto não
  são permitidos por nenhum caminho, inclusive por pedido direto.
- `apagar_dados` — ação destrutiva não fica ao alcance de interpretação de linguagem.

### Memórias com evidência

O app observa os próprios dados e escreve o que aprendeu: refeição que costuma
pular, dia da semana mais fraco, diferença de consumo no fim de semana, base
alimentar, dias de treino, padrão de proteína, janela de jejum habitual.

Toda memória carrega a **evidência** (quantas ocorrências, em que janela) e é
visível e apagável em Ajustes. Isso é personalização, não treinamento: o modelo
não muda, o contexto muda.

## A IA embutida

**Assistente embutido, determinístico, offline.** Sem chave, sem servidor, sem custo.

- **85 tópicos** de nutrição, treino e método, escritos e revisados
- Interpreta intenção e **executa**: registra refeição por texto livre, monta
  cardápio, gera lista de compras, liga o modo HARD, marca tarefa
- Consulta o que **você ensinou** em Ajustes, com prioridade sobre o de fábrica
- Ícone flutuante em todas as telas, com badge do número de pontos críticos

Ordem do raciocínio, e ela importa:

```
segurança → ação pedida → conhecimento próprio → conhecimento de fábrica
          → dados do usuário → escopo
```

Cada resposta da base já vem com os números da pessoa injetados.

Opcionalmente, quem quiser conversa livre com modelo pode baixar um via WebGPU
pelo próprio navegador. É download do usuário, não custo do publicador.

**Por que não um LLM embutido:** um modelo pequeno o bastante para caber offline
sabe menos nutrição que esta base e inventa dose, macro e estudo. Aqui nada é
gerado — tudo foi escrito, conferido e ligado ao dado real.

---

## Arquitetura

```
js/dados.js         460 alimentos + 57 exercícios (js/dados-extra.js leva a base a mais de 1.000)
js/treino.js        mesociclo, progressão dupla, técnica, % gordura Navy
js/metabolismo.js   gasto adaptativo por balanço energético
js/analise2.js      séries por músculo, peso-tendência, micros, padrões cruzados
js/diagnostico.js   variáveis de diagnóstico (cobertura, ritmo, déficit real, massa magra...)
js/cardapio.js      gerador de cardápio, modos, troca por função, lista de compras
js/coach.js         missão do dia, intensidade, cobrança, Safety Engine
js/agente.js        ferramentas que a IA pode executar, com validação e log
js/memoria.js       observador de padrões: memórias com evidência
js/fases.js         perda, manutenção e recuperação; faixa, reganho, regra combinada
js/jejum.js         janela de jejum pelos horários reais das refeições
js/saber.js         base de conhecimento de nutrição, treino e método
js/registro-nl.js   registro por linguagem natural
js/assistente.js    interpretação de intenção e memória offline
js/off.js           Open Food Facts + código de barras
js/ia-externa.js    conversa livre com a chave do próprio usuário (opcional)
js/ia-local.js      modelo no navegador (opcional, WebGPU)
js/app.js           estado, telas e eventos
```

Sem framework, sem build, sem dependência. HTML, CSS e JavaScript.

---

## Segurança

O `Safety Engine` (`js/coach.js`) intercepta toda mensagem **antes** de qualquer
interpretação, inclusive antes da base de conhecimento. Dez grupos: emergência,
autolesão e suicídio (com CVV 188 e SAMU 192), saúde mental, lesão aguda,
comportamento alimentar de risco, meta ou dieta extrema, dúvida sobre medicação,
condição clínica (diabetes, pressão, tireoide), gestação e usuário menor de idade.
O reconhecimento é por radical e tolera acento, caixa e palavras no meio da frase.

Quando dispara: encaminha para o profissional adequado, rebaixa a intensidade do
coach para Normal e **trava os modos HARD por até 14 dias** (qualquer relato de
risco nesse período mantém a trava, não só o último). Segurança vence cobrança em
todos os níveis, sem exceção. A resposta de um modelo de IA também é conferida:
dose de medicamento é barrada.

O app não diagnostica, não prescreve e não substitui médico, nutricionista,
psicólogo ou educador físico.

---

## Testes

Oito suítes em Playwright, fora do repositório do app, cobrindo: migração entre
versões, app zerado nas seis telas, fluxo completo do zero, as variáveis de
diagnóstico, registro por linguagem natural, roteamento de intenção e de
conhecimento, missão do dia, os quatro níveis de intensidade, justificativa com
replanejamento, sete cenários do Safety Engine, cardápio nos três modos, troca
por função nutricional, lista de compras, jejum, ajustes do assistente,
exportações e tema escuro.
