/* ══════════════════════════════════════════════════════════
   RESTRIÇÕES ALIMENTARES — classificação da base de alimentos
   Carregar DEPOIS de dados.js / dados-extra.js / alimentos-mais.js.

   API global:
     RESTRICOES            lista {id, rot, desc}
     AVISO_RESTRICOES      texto fixo de aviso para a UI
     etiquetasDoAlimento(a)        -> tags que o alimento CONTÉM ou PODE CONTER
     alimentoPermitido(a, ids)     -> boolean
     avisosDoAlimento(a, ids)      -> ['contém lactose', ...] (para avisar em vez de esconder)
     filtrarBase(base, ids)        -> base sem os itens proibidos

   Tags: carne, ave, peixe, frutos_do_mar, laticinio, lactose, ovo, mel,
         gelatina, gluten, porco, amendoim, oleaginosas

   PRINCÍPIO: classificação por NOME (sem acento, por palavra/prefixo) + categoria
   + conhecimento culinário. Na dúvida, MARCA a tag (falso positivo só esconde um
   item; falso negativo expõe quem tem alergia). Decisões documentadas:
     - Aveia = glúten (contaminação cruzada). Trigo sarraceno NÃO é trigo.
     - Pão de queijo, tapioca, polvilho, milho, arroz, mandioca = sem glúten.
     - Queijos curados longos (parmesão, pecorino, emmental, suíço, gouda,
       provolone, cheddar, do reino, canastra, minas curado) e manteiga ghee:
       são laticínio (proteína do leite) mas NÃO levam a tag 'lactose' (teor ~0).
     - "sem lactose"/"zero lactose" no nome: laticínio sem a tag 'lactose'.
     - "sem glúten" no nome: remove a tag 'gluten' (confia no nome/rótulo).
     - Nomes com vegano/vegetal/plant-based removem as tags de origem animal.
     - Pães comuns (exceto francês, sírio, pita, ciabatta, baguete, centeio) podem
       conter leite; "macarrão" pode conter ovo; empanados levam ovo; sanduíches
       levam maionese (ovo); bolos/tortas/biscoitos doces levam ovo e leite.
     - Gelatina pode ser suína: gelatina/marshmallow/bala de goma/cápsulas = porco.
       Vinho/cerveja = 'gelatina' (clarificantes de origem animal).
     - Pratos sem ingrediente no nome herdam o que costumam levar.
     - Coco NÃO é oleaginosa; pinhão e castanha portuguesa SÃO marcados.
     - Feijão refogado/com caldo/sopa/tropeiro/tutu = porco (bacon/linguiça);
       feijão cozido simples NÃO é marcado.
   ══════════════════════════════════════════════════════════ */

const RESTRICOES = [
  { id: 'vegetariano',       rot: 'Vegetariano',        desc: 'Sem carne, aves, peixe e frutos do mar' },
  { id: 'vegano',            rot: 'Vegano',             desc: 'Também sem laticínios, ovos, mel e gelatina' },
  { id: 'sem_lactose',       rot: 'Sem lactose',        desc: 'Sem leite e derivados com lactose' },
  { id: 'sem_gluten',        rot: 'Sem glúten',         desc: 'Sem trigo, centeio, cevada e aveia' },
  { id: 'sem_ovo',           rot: 'Sem ovo',            desc: 'Sem ovos e preparos com ovo' },
  { id: 'sem_porco',         rot: 'Sem porco',          desc: 'Sem carne suína, embutidos e gelatina suína' },
  { id: 'sem_frutos_do_mar', rot: 'Sem peixe/frutos do mar', desc: 'Sem peixes, crustáceos e moluscos' },
  { id: 'sem_amendoim',      rot: 'Sem amendoim',       desc: 'Sem amendoim e derivados' },
  { id: 'sem_oleaginosas',   rot: 'Sem oleaginosas',    desc: 'Sem castanhas, nozes, amêndoas, avelã etc.' }
];

const AVISO_RESTRICOES = 'Filtro automático por nome do alimento e categoria: ajuda a escolher, mas não substitui ler o rótulo. Para alergia grave, não confie só neste filtro.';

const _RS = (function () {
  // Remove acentos e passa para minúsculas
  function norm(s) {
    s = String(s == null ? '' : s).toLowerCase();
    try { s = s.normalize('NFD').replace(/[̀-ͯ]/g, ''); } catch (e) { /* ambiente sem normalize */ }
    return s;
  }
  // W: casa no INÍCIO de uma palavra (prefixo); use \b no fim para palavra inteira
  // O prefixo opcional "mc" cobre marcas coladas ao nome ("McNuggets", "McFish"), que o início de palavra não pegava
  function W(re) { return new RegExp('(?:^|[^a-z0-9])(?:mc)?(?:' + re.source + ')'); }

  // Tags que cada restrição proíbe
  var VEGETARIANO = ['carne', 'ave', 'peixe', 'frutos_do_mar'];
  var PROIBE = {
    vegetariano: VEGETARIANO,
    vegano: VEGETARIANO.concat(['laticinio', 'lactose', 'ovo', 'mel', 'gelatina']),
    sem_lactose: ['lactose'],
    sem_gluten: ['gluten'],
    sem_ovo: ['ovo'],
    sem_porco: ['porco'],
    sem_frutos_do_mar: ['peixe', 'frutos_do_mar'],
    sem_amendoim: ['amendoim'],
    sem_oleaginosas: ['oleaginosas']
  };
  var TEXTO_TAG = {
    carne: 'contém carne', ave: 'contém ave', peixe: 'contém peixe',
    frutos_do_mar: 'contém frutos do mar', laticinio: 'contém laticínios',
    lactose: 'contém lactose', ovo: 'contém ovo', mel: 'contém mel',
    gelatina: 'pode conter gelatina/derivado animal', gluten: 'pode conter glúten',
    porco: 'contém porco', amendoim: 'pode conter amendoim',
    oleaginosas: 'pode conter oleaginosas (castanhas/nozes)'
  };
  var ORDEM = ['carne', 'ave', 'peixe', 'frutos_do_mar', 'laticinio', 'lactose', 'ovo', 'mel',
               'gelatina', 'gluten', 'porco', 'amendoim', 'oleaginosas'];
  var ANIMAL = ['carne', 'ave', 'peixe', 'frutos_do_mar', 'laticinio', 'lactose', 'ovo', 'mel', 'gelatina', 'porco'];

  // Versão vegetal/vegana declarada no nome: remove as tags de origem animal
  var VEGANO_NOME = /vegan|vegetal|plant.?based|requeijao de castanha|iogurte de soja|queijo de castanha/;

  // ── REGRAS: [tags separadas por '+', regex (início de palavra), exceção opcional] ──
  var REGRAS = [

    // ═════════ CARNE (bovina, caça, vísceras, embutidos, pratos de carne)
    // Cortes, vísceras, embutidos e pratos que levam carne por definição
    ['carne', W(/carne|bife|patinho|alcatra|coxao|contrafile|file mignon|picanha|costela|maminha|fraldinha|cupim|acem|musculo|lagarto|rabada|lingua\b|bucho|dobradinha|mocoto|figado|coracao|moela|rosbife|carpaccio|churrasc|espet|kafta|kibe|quibe|steak|entrecote|ancho|chuleta|almondega|bolonhesa|ragu|strogon|estrogon|chilli|ropa vieja|osso buco|vaca atolada|buchada|sarapatel|charque|jerked|rocambole|caldo de carne|picadinho|cozido \(carne|feijoada|carreteiro|tropeiro|tutu|baiao|manicoba|virado|salsicha|mortadela|salame|linguica|calabresa|bacon|presunto|apresuntado|prosciutto|lombo|pernil|paleta|costelinha|torresmo|joelho|banha|toucinho|pate\b|beef|cordeiro|cabrito|carneiro|coelho|bode|charuto|quibebe|colageno|hot dog|cachorro|misto quente|bauru|beirute|shawarma|big mac|x-|pizza congelada|pao de alho|burrito|taco\b|fajita|enchilada|empadinha|pimentao recheado/,
      ),
      /carne de soja|carne vegetal|kibe de abobora|quibe de abobora|vegan|x-frango/],
    // Hambúrguer (menos os vegetais)
    ['carne', W(/hamburguer|cheeseburger|burger/), /hamburguer (vegetal|vegetariano|de (soja|lentilha|grao|legume|cogumelo))|burger (vegetal|vegetariano)|vegan/],
    // Marmita / prato feito genérico: leva carne e/ou frango
    ['carne+ave', W(/marmita|prato feito|executiv|prato de churrasco/), /tilapia|peixe|salmao|atum|vegeta|vegan/],
    // Massas recheadas (recheio de carne comum) e risotos/sopas feitos com caldo de carne
    ['carne', W(/capeletti|ravioli|tortellini|canelone/), /queijo|ricota|espinafre|abobora|legume|vegetal|vegetariano/],
    ['carne', W(/risoto|yakimeshi|sopa de (cebola|macarrao|lentilha)/), /vegetariano|vegan/],
    // Pratos mistos que herdam carne (salvo versões com recheio vegetal explícito)
    ['carne', W(/lasanha|yakisoba|gyoza|guioza|rolinho primavera|harumaki|lamen/), /berinjela|legume|abobrinha|espinafre|ricota|\(massa\)|frango|presunto|vegetal|vegetariano/],

    // ═════════ AVE
    ['ave', W(/frango|galinh|galo\b|peru\b|pato\b|codorna|chester|nugget|mcnugget|coxinha|canja|cabidela|fricasse|salpicao|chicken|moela|coxa\b|sobrecoxa|asa de|teriyaki|shawarma|empadao de frango|steak de frango/,
      ),
      /^ovos?\b|ovos? de codorna|tilapia|peixe|salmao|atum|vegeta|vegan/],
    // Yakisoba: carne/frango, salvo versão de legumes
    ['carne+ave', W(/yakisoba/), /legume|vegetal|vegetariano/],

    // ═════════ PORCO (carne suína, embutidos, banha, gelatina suína, feijão com bacon)
    ['porco+carne', W(/porc|suin|bacon|presunto|apresuntado|prosciutto|linguica|calabresa|lombo|pernil|paleta|costelinha|torresmo|joelho|banha|toucinho|mortadela|salame|salsicha|cachorro|hot dog|copa\b|pancetta|carbonara|lorraine|feijoada|tropeiro|tutu|virado|carreteiro|baiao|caldo verde|dobradinha|sarapatel|manicoba|pate\b|gyoza|guioza|misto quente|bauru|beirute|x-tudo|x-bacon|portuguesa|pizza congelada|saltimbocca|katsudon|pork|ham\b|feijao com|feijao [a-z -]*(refogado|refrito|com caldo|tropeiro)|sopa de (feijao|ervilha)|caldo de feijao|enroladinho de salsicha|arroz de forno/,
      ),
      /vegan/],
    ['porco', W(/gelatina|marshmallow|bala de goma|gomas\b|panna cotta|capsula|multivitaminico|termogenico|omega|colageno/)],

    // ═════════ PEIXE
    ['peixe', W(/peixe|tilapia|merluza|salmao|atum\b|sardinha|bacalhau|pescada|robalo|pintado|tucunare|tambaqui|cacao\b|truta|kani|surimi|anchova|sashimi|ceviche|arenque|dourado|cavala|linguado|namorado|badejo|pirarucu|tainha|corvina|omega|fish|tuna|salmon|missoshiru|pirao de peixe|cuscuz paulista|molho ingles|molho barbecue|caesar|azeitona verde recheada|moqueca/,
      ),
      /moqueca de (banana|palmito)|vegan/],
    // Sushi e afins: peixe, salvo versões de legume
    ['peixe', W(/sushi|temaki|nigiri|niguiri|uramaki|hossomaki|hot roll|joe\b|poke\b|onigiri|combinado|sunomono/), /pepino|legume|vegetal|palmito|vegetar/],

    // ═════════ FRUTOS DO MAR (crustáceos e moluscos)
    ['frutos_do_mar', W(/camarao|lagosta|caranguejo|siri\b|lula\b|polvo\b|mexilhao|ostra|marisco|vieira|sururu|vatapa|caruru|acaraje|abara\b|arroz de cuxa|tacaca|paella|frutos do mar|crustaceo|molusco|shrimp|crab|lobster|oyster|squid|mussel|combinado|sunomono/,
      ),
      /vegan/],
    ['frutos_do_mar', W(/moqueca/), /moqueca de (banana|palmito)|moqueca capixaba|vegan/],

    // ═════════ OVO
    // Ovo explícito e derivados
    ['ovo', W(/ovos?\b|omelete|gema|clara|albumina|merengue|egg|crepioca|bife a cavalo|virado|tortilha espanhola|salpicao|cuscuz paulista|bacalhau a gomes|ovos moles/,
      ),
      /vegan|vegetal/],
    // Maionese e molhos à base de maionese/ovo
    ['ovo', W(/maionese|molho tartaro|caesar|molho de alho\b|bolinho de bacalhau/), /vegan|vegetal|\(toum\)/],
    // Massas e preparos de massa com ovo
    ['ovo', W(/panqueca|crepe\b|waffle|nhoque|gnocchi|massa fresca|talharim|fettuccine|capeletti|ravioli|tortellini|canelone|lasanha|macarrao|miojo|lamen|katsudon|yakimeshi/),
      /macarrao (de arroz|de lentilha|de grao|shirataki)|shirataki|vegan|vegetal/],
    // Bolos, doces e sobremesas
    ['ovo', W(/bolo\b|bolos\b|bolinho|pudim|flan\b|mousse|musse|quindim|petit gateau|brownie|cupcake|cookie|profiterole|eclair|macaron|alfajor|pave|cheesecake|creme brulee|creme de baunilha|tiramisu|cannoli|panetone|rabanada|pao de mel|torta|biscoito (champanhe|amanteigado|de nata|de queijo|de polvilho|maisena|de maizena)|creme de ovos|cuca/),
      /vegan|vegetal/],
    // Pães enriquecidos e massas doces
    ['ovo', W(/pao de leite|pao doce|bisnaguinha|brioche|croissant|sonho|rosquinha|donut|churros|pao de batata|pao low|pao com ovo|pao de queijo|rosca\b|marzipa|biscoito (integral|de gengibre)|naan\b|pao sovado|maria-mole|maria mole|hot roll|pizza de frigideira/), /vegan|vegetal/],
    // Salgados: massa/recheio/empanado com ovo
    ['ovo', W(/salgado\b|pescada frita|camarao frito|passarinho|quiche|empada|empadao|coxinha|risole|croquete|bolinha de queijo|bolinho de arroz|nugget|empanad|milanesa|dore|tempura|parmegiana|onion rings|almondega|hamburguer caseiro|rocambole|steak de frango/), /vegan|vegetal/],
    // Lanches (maionese comum)
    ['ovo', W(/x-|cheeseburger|burger|hamburguer|sanduiche|wrap|hot dog|cachorro|shawarma|subway|big mac|misto|bauru|beirute/), /vegan|vegetal|wrap de couve/],
    // Sorvetes cremosos costumam levar gema (exceto sorbet/picolé de fruta)
    ['ovo', W(/sorvete|gelato/), /sorbet|sorvete de limao|vegan/],

    // ═════════ MEL
    ['mel', W(/mel\b|biscoito de gengibre|granola|muesli|barra de cereal|barrinha de cereal|barra de castanhas|baklava|australiano|honey/), /vegan/],

    // ═════════ GELATINA / clarificantes de origem animal
    ['gelatina', W(/gelatina|marshmallow|bala de goma|gomas\b|em gomas|panna cotta|mousse|musse|manjar|maria-mole|maria mole|cheesecake|capsula|multivitaminico|termogenico|omega|colageno|vinho|espumante|cerveja|chopp|stout|ipa\b|gominha/), /vegan/],

    // ═════════ LATICÍNIOS (+ lactose; exceções no código: curados, ghee, "sem lactose")
    // Laticínios propriamente ditos
    ['laticinio+lactose', W(/leite|queij|requeij|catupiry|cream cheese|cottage|ricota|mussarela|mucarela|mozzarella|mozarela|parmesao|provolone|gorgonzola|brie\b|camembert|gouda|emmental|feta\b|halloumi|mascarpone|pecorino|coalho|cheddar|burrata|bufala|coalhada|labneh|kefir|skyr|iogurte|yogurt|yakult|danoninho|petit suisse|lactea|nata\b|chantilly|manteiga|ghee|margarina|whey|caseina|lactose|soro de leite|milk|cheese|butter|creme de ricota|creme de queijo|alfredo|quatro queijos/),
      /vegan|vegetal|manteiga de (cacau|karite|coco)|peanut butter|almond butter|cocoa butter/],
    // Sorvetes e gelados (menos sorbet/picolé de fruta)
    ['laticinio+lactose', W(/sorvete|gelato|picole|sundae|banana split|frozen|casquinha|milk-shake|milkshake|affogato/), /sorbet|picole de (limao|uva|fruta)|sorvete de limao|vegan/],
    // Doces, sobremesas e massas com leite/manteiga
    ['laticinio+lactose', W(/olho de sogra|casadinho|camafeu|surpresa de uva|rosca\b|biscoito (integral|de gengibre)|tipo club|creme de avela|nutella|licor|doritos|salgadinho de pacote|arroz de forno|brigadeiro|beijinho|cajuzinho|trufa|bombom|bis\b|palha italiana|doce de leite|cocada cremosa|cocada de forno|romeu|tiramisu|panna cotta|cannoli|profiterole|eclair|petit gateau|pave|pudim|flan\b|mousse|musse|manjar|creme brulee|creme de baunilha|brownie|cupcake|cookie|alfajor|panetone|churros com|caramelo|waffle|panqueca|crepe\b|bolo\b|bolos\b|torta|quiche|empada|empadao|folhado|massa folhada|pastelao|pao de queijo|pao de leite|pao doce|brioche|croissant|bisnaguinha|sonho|rosquinha|donut|rabanada|cuca|biscoito (amanteigado|de nata|de queijo|de leite|recheado|maisena|de maizena|champanhe|wafer|tipo oreo)|wafer|pamonha|curau|canjica|arroz doce|sagu com creme|mingau|baklava|pipoca de micro|cheesecake/), /vegan|vegetal/],
    // Molhos e pratos que levam queijo/creme/manteiga
    ['laticinio+lactose', W(/molho (branco|de queijo|quatro queijos|pesto|tartaro)|caesar|gratinad|churros|bolinho de chuva|big mac|subway|hot dog|cachorro|burrito|taco\b|fajita|nachos|quindim|pimentao recheado|barra de (cereal|castanha)|pesto|bruschetta de queijo|caprese|strogon|estrogon|carbonara|risoto|pizza|calzone|lasanha|canelone|ravioli|capeletti|tortellini|nhoque ao|polenta cremosa|cuscuz com queijo|farofa|pure\b|creme de (milho|espinafre|palmito|frango)|sopa de cebola|bacalhau com natas|camarao na moranga|escondidinho|parmegiana|frango com catupiry|enchilada|quesadilla|nachos com queijo|misto quente|bauru|beirute|x-|cheeseburger|hamburguer (artesanal|de fast|simples|congelado)|batata frita (de fast|de lanchonete|media de lanchonete)/), /vegan|vegetal/],
    // Bebidas e preparos com leite
    ['laticinio+lactose', W(/vitamina|smoothie|shake|overnight oats|cappuccino|capuccino|latte|mocha|macchiato|frappe|cafe gelado|cafe com (leite|chantilly)|cafe bulletproof|bulletproof|batida|achocolatado|ovomaltine|chocolate quente/), /vegan|vegetal|shake de whey com agua/],
    // Pães: a maioria pode conter leite (exceto os tradicionais)
    ['laticinio+lactose', W(/pao\b|paes\b|sanduiche|hamburguer|burger/),
      /pao (frances|sirio|de centeio|integral com graos|de queijo)|baguete|ciabatta|pita\b|focaccia|grissini|centeio|vegan|vegetal/],
    // Chocolates (exceto teor alto de cacau): podem conter leite
    ['laticinio+lactose', W(/chocolate|calda de chocolate|cobertura de chocolate/),
      /(7|8|9)\d ?% cacau|meio amargo|amargo|100 ?%|nibs|em po 50|granulado|vegan/],
    // Suplementos/barras com proteína do leite
    ['laticinio+lactose', W(/barra de proteina|barrinha de proteina|barra de cereal proteica|cookie proteico|brownie proteico|wafer proteico|bolacha proteica|sorvete proteico|mousse proteico|hipercalorico|blend de proteinas|bebida proteica|rtd|proteica|proteico|barra proteica/), /vegan|vegetal|ervilha|soja/],

    // ═════════ GLÚTEN (trigo, centeio, cevada, malte, aveia e preparos)
    // Cereais e ingredientes com glúten
    ['gluten', W(/trigo|centeio|cevad|malte|maltine|ovomaltine|achocolatado|hipercalorico|aveia|oats?\b|granola|muesli|cereal matinal|corn flakes|sucrilhos|flocos de milho com|seitan|gluten|cuscuz marroquino|cuscuz de trigo|panko|farinha de rosca|cerveja|chopp|stout|ipa\b/), /sarraceno/],
    // Pães e massas assadas
    ['gluten', W(/pao\b|paes\b|bisnaguinha|baguete|ciabatta|focaccia|grissini|pita\b|naan\b|brioche|croissant|torrada|bruschetta|torradinha|broa|cuca|rosca\b|rosquinha|biscoito|bolacha|cookie|wafer|cracker/), /pao de queijo|biscoito (de arroz|de polvilho|de queijo)|vegan.*sem gluten/],
    // Massas, pizzas e sobremesas de massa
    ['gluten', W(/macarrao|espaguete|spaghetti|penne|talharim|fettuccine|parafuso|lasanha|capeletti|ravioli|tortellini|canelone|nhoque|gnocchi|miojo|lamen|yakisoba|massa\b|pizza|calzone|bolo\b|bolos\b|bolinho|panetone|brownie|cupcake|alfajor|profiterole|eclair|cannoli|tiramisu|pave|cheesecake|petit gateau|casquinha|churros|waffle|panqueca|crepe\b|rabanada|sonho|donut|macarronada|sopa de macarrao/), /macarrao (de arroz|de lentilha|de grao|shirataki)|shirataki/],
    // Salgados e empanados
    ['gluten', W(/salgado\b|pescada frita|camarao frito|passarinho|baklava|palha italiana|torta|quiche|folhado|pastelao|pastel|empada|empadao|coxinha|risole|croquete|bolinha de queijo|bolinho de arroz|quibe|kibe|esfiha|enroladinho|salsicha|mortadela|nugget|empanad|milanesa|dore|tempura|parmegiana|onion rings|cebola frita crocante|tabule|fatuche|salgadinho|doritos|bis\b|almondega|steak de frango|falafel|farofa pronta|caldo de carne|pao de alho/)],
    // Sanduíches e lanches
    ['gluten', W(/cheeseburger|wrap|burrito|quesadilla|fajita|taco\b|enchilada|burger|hamburguer|x-|sanduiche|cachorro|hot dog|misto|bauru|beirute|shawarma|subway|big mac/), /wrap de couve|tortilla de milho/],
    // Molhos, pratos orientais e cremosos (shoyu, roux, kani, miso)
    ['gluten', W(/caesar|shoyu|teriyaki|molho tare|molho ingles|molho agridoce|molho branco|molho (de queijo|quatro queijos)|strogon|estrogon|creme de (milho|espinafre|palmito|frango)|frango xadrez|yakimeshi|katsudon|rolinho primavera|harumaki|gyoza|guioza|missoshiru|kani|surimi|sushi|temaki|nigiri|niguiri|uramaki|hossomaki|hot roll|joe\b|poke\b|onigiri|combinado|sunomono|sopa de cebola/), /vegan.*sem gluten/],
    // Barras e cereais de barra
    ['gluten', W(/barra de (cereal|proteina|castanha)|barrinha/)],

    // ═════════ AMENDOIM
    ['amendoim', W(/amendoim|pacoca|pe de moleque|cajuzinho|peanut|trail mix|mix de castanhas|granola|muesli|barra de (cereal|proteina|castanha)|barrinha|cookie proteico|bombom|bis\b|frango xadrez|satay|castanhas cobertas/), /pacoca de carne/],

    // ═════════ OLEAGINOSAS
    ['oleaginosas', W(/castanh|noz\b|nozes|amendoa|avel|pistache|macadamia|pecan|peca\b|pinhao|pinoli|marzipa|macaron|nutella|pesto|baklava|halawi|trail mix|mix de frutas secas|granola|muesli|barra de (cereal|proteina|castanha)|barrinha|panetone|bombom|bis\b|pao low carb|almond|walnut|hazelnut|cashew|pistachio|nuts\b|frango xadrez/), /pacoca de carne/]
  ];

  // Queijos curados: laticínio sem lactose relevante
  var CURADO = /^(queijo )?(parmesao|pecorino|emmental|suico|gouda|provolone|cheddar|do reino|canastra|minas curado)\b[^,]*$/;
  var OUTROS_LATICINIOS = /molho|creme|requeij|catupiry|leite|iogurte|manteiga|pizza|risoto|pao|sanduiche|cream/;

  // Texto de trabalho: nome + ingredientes, normalizado e "limpo"
  function preparar(a) {
    var t = norm((a && a.n) || '');
    if (a && typeof a.ingredientes === 'string') t += ' | ' + norm(a.ingredientes);
    var f = { semLactose: false, semGluten: false };
    // ingredientes que parecem laticínio mas não são
    t = t.replace(/manteiga de (cacau|cacao|karite|coco)/g, ' ');
    t = t.replace(/leite de (coco|soja|arroz|aveia|amendoas?|castanhas?( de caju| do para)?)/g, function (m) { return 'vegleite ' + m.slice(9); });
    // negações no nome/rótulo
    var reLac = /(sem|zero|0 ?%|isento de|livre de|nao contem) lactose|lactose free/g;
    if (reLac.test(t)) { f.semLactose = true; t = t.replace(reLac, ' '); }
    var reGlu = /(sem|livre de|isento de|nao contem|zero) gluten|gluten free/g;
    if (reGlu.test(t)) { f.semGluten = true; t = t.replace(reGlu, ' '); }
    return { t: t, f: f };
  }

  function etiquetas(a) {
    if (!a) return [];
    var p = preparar(a), t = p.t, tags = {};
    var cat = norm(a.cat || '');
    for (var i = 0; i < REGRAS.length; i++) {
      var r = REGRAS[i];
      if (r[1].test(t) && !(r[2] && r[2].test(t))) {
        var ts = r[0].split('+');
        for (var k = 0; k < ts.length; k++) tags[ts[k]] = true;
      }
    }
    // Exceções de lactose: curados, ghee, "sem lactose"
    if (tags.lactose) {
      var nome = norm(a.n || '');
      if (/\bghee\b/.test(t) || p.f.semLactose || (CURADO.test(nome) && !OUTROS_LATICINIOS.test(nome.replace(/^queijo /, '')))) {
        delete tags.lactose;
      }
    }
    if (p.f.semGluten) delete tags.gluten;
    // Categoria como reforço
    if (/^carnes/.test(cat) && !tags.carne && !tags.ave && !tags.porco) tags.carne = true;
    if (/^peixes/.test(cat) && !tags.peixe && !tags.frutos_do_mar) tags.peixe = true;
    if (/^ovos/.test(cat)) tags.ovo = true;
    if (/^latic/.test(cat) && !tags.laticinio && !/soja|amendoa|coco|aveia|arroz|castanha|vegetal|vegano/.test(t)) {
      tags.laticinio = true; if (!p.f.semLactose) tags.lactose = true;
    }
    // Itens declarados veganos/vegetais por nome: sem origem animal
    // só o NOME declara versão vegetal: "gordura vegetal" na lista de ingredientes não faz o produto virar vegano
    if (VEGANO_NOME.test(t.split(' | ')[0])) ANIMAL.forEach(function (x) { delete tags[x]; });
    return ORDEM.filter(function (x) { return tags[x]; });
  }

  var memo = {};
  function etiquetasCache(a) {
    if (!a) return [];
    var k = (a.n || '') + '\u0001' + (a.cat || '') + '\u0001' + (typeof a.ingredientes === 'string' ? a.ingredientes : '');
    var v = memo[k];
    if (!v) { v = etiquetas(a); memo[k] = v; }
    return v;
  }

  function tagsProibidas(ids) {
    var set = {};
    (ids || []).forEach(function (id) {
      var l = PROIBE[id];
      if (l) l.forEach(function (x) { set[x] = true; });
    });
    return set;
  }

  return { etiquetas: etiquetasCache, proibidas: tagsProibidas, texto: TEXTO_TAG };
})();

function etiquetasDoAlimento(a) {
  return _RS.etiquetas(a).slice();
}

function alimentoPermitido(a, ids) {
  if (!ids || !ids.length) return true;
  var proib = _RS.proibidas(ids), tags = _RS.etiquetas(a);
  for (var i = 0; i < tags.length; i++) if (proib[tags[i]]) return false;
  return true;
}

function avisosDoAlimento(a, ids) {
  if (!ids || !ids.length) return [];
  var proib = _RS.proibidas(ids), tags = _RS.etiquetas(a), out = [];
  for (var i = 0; i < tags.length; i++) {
    if (!proib[tags[i]]) continue;
    // lactose e laticínio dizem quase a mesma coisa: evita aviso duplicado
    if (tags[i] === 'laticinio' && proib.lactose && tags.indexOf('lactose') >= 0) continue;
    var tx = _RS.texto[tags[i]];
    if (tx && out.indexOf(tx) < 0) out.push(tx);
  }
  return out;
}

function filtrarBase(base, ids) {
  if (!ids || !ids.length) return base;
  return (base || []).filter(function (a) { return alimentoPermitido(a, ids); });
}
