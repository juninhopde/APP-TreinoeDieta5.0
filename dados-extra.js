/* ══════════════════════════════════════════════════════════
   ALIMENTOS EXTRAS 5.0 — valores por 100 g (ou 100 ml).

   Formato compacto: [nome, p, c, g, categoria, gramasDaMedida, nomeDaMedida]
   Valores aproximados, escritos a partir de tabelas de composição
   brasileiras (TACO/TBCA) e de rótulos comuns, sem consulta em
   tempo real. Margem de erro de cerca de 10%; produto de marca
   varia. Use o código de barras para o item exato.

   Categorias novas: 'Pratos' (comida pronta caseira/regional),
   'Fast-food' e 'Snacks'. Ficam fora do gerador de cardápio.
   ══════════════════════════════════════════════════════════ */

(function () {
const X = [
  // ── Carnes e aves ───────────────────────────────────
  ['Filé de frango grelhado temperado',31,0,4,'Carnes'],
  ['Peito de frango assado',30,0,3.5,'Carnes'],
  ['Sobrecoxa sem pele assada',26,0,10,'Carnes'],
  ['Asa de frango assada',26,0,18,'Carnes',40,'asa'],
  ['Coxa de frango com pele assada',24,0,15,'Carnes'],
  ['Peru assado',29,0,5,'Carnes'],
  ['Pato assado sem pele',24,0,11,'Carnes'],
  ['Coelho cozido',29,0,8,'Carnes'],
  ['Carne moída magra cozida',30,0,9,'Carnes'],
  ['Acém moído refogado',26,0,15,'Carnes'],
  ['Filé mignon grelhado',32,0,8,'Carnes'],
  ['Entrecôte grelhado',29,0,16,'Carnes'],
  ['Ancho grelhado',28,0,17,'Carnes'],
  ['Chuleta grelhada',26,0,20,'Carnes'],
  ['Rabada cozida',27,0,14,'Carnes'],
  ['Língua bovina cozida',22,0,20,'Carnes'],
  ['Bucho cozido',18,0,7,'Carnes'],
  ['Bife de fígado de frango',24,1,8,'Carnes'],
  ['Moela de frango cozida',28,0,5,'Carnes'],
  ['Carne de sol assada',29,0,14,'Carnes'],
  ['Charque cozido',30,0,10,'Carnes'],
  ['Jerked beef desfiado',30,0,9,'Carnes'],
  ['Paleta suína assada',26,0,15,'Carnes'],
  ['Copa lombo fatiada',22,1,18,'Carnes'],
  ['Lombo canadense fatiado',19,1,5,'Carnes'],
  ['Peito de peru cozido',24,1,2,'Carnes'],
  ['Blanquet de peru',15,2,3,'Carnes',15,'fatia'],
  ['Linguiça de frango grelhada',18,2,13,'Carnes'],
  ['Linguiça calabresa grelhada',20,2,28,'Carnes'],
  ['Linguiça de pernil grelhada',18,1,22,'Carnes'],
  ['Kafta grelhada',22,3,17,'Carnes'],
  ['Hambúrguer de frango grelhado',20,4,8,'Carnes'],
  ['Hambúrguer caseiro de patinho',25,2,12,'Carnes'],
  ['Carne de porco desfiada',27,0,12,'Carnes'],
  ['Pernil assado sem gordura',28,0,9,'Carnes'],
  ['Torresmo frito',26,0,50,'Carnes'],
  ['Peito bovino cozido',26,0,17,'Carnes'],
  ['Costela suína cozida',24,0,26,'Carnes'],
  ['Presunto cozido',17,1,6,'Carnes',15,'fatia'],
  ['Copa (embutido)',26,1,28,'Carnes'],
  ['Patê de fígado',12,4,25,'Carnes'],

  // ── Peixes e frutos do mar ──────────────────────────
  ['Tilápia assada',26,0,3,'Peixes'],
  ['Merluza assada',22,0,2,'Peixes'],
  ['Pescada branca cozida',22,0,1.5,'Peixes'],
  ['Salmão assado',25,0,14,'Peixes'],
  ['Atum fresco grelhado',29,0,5,'Peixes'],
  ['Atum sólido em água (lata)',26,0,1,'Peixes'],
  ['Sardinha ao molho de tomate (lata)',17,3,10,'Peixes',125,'lata'],
  ['Bacalhau cozido',29,0,1,'Peixes'],
  ['Camarão frito',22,9,14,'Peixes'],
  ['Camarão grelhado',24,0,2,'Peixes'],
  ['Lula grelhada',18,3,2,'Peixes'],
  ['Ostra crua',9,5,2,'Peixes',20,'unidade'],
  ['Caranguejo cozido',19,0,2,'Peixes'],
  ['Siri desfiado',18,0,1.5,'Peixes'],
  ['Robalo grelhado',25,0,4,'Peixes'],
  ['Pintado grelhado',24,0,6,'Peixes'],
  ['Tucunaré grelhado',24,0,3,'Peixes'],
  ['Tambaqui assado',22,0,10,'Peixes'],
  ['Cação cozido',25,0,3,'Peixes'],
  ['Kani (surimi)',10,10,1,'Peixes',15,'palito'],
  ['Peixe empanado congelado',12,17,10,'Peixes'],
  ['Truta assada',23,0,7,'Peixes'],

  // ── Ovos ────────────────────────────────────────────
  ['Ovo de codorna cozido',13,0.8,11,'Ovos',10,'ovo'],
  ['Ovo pochê',12,0.7,9,'Ovos',50,'ovo'],
  ['Ovo mexido com leite',10,2,11,'Ovos'],
  ['Clara de ovo cozida',11,0.8,0.2,'Ovos',33,'clara'],
  ['Ovo caipira cozido',13,1,10,'Ovos',50,'ovo'],
  ['Omelete de queijo',12,1.5,17,'Ovos'],
  ['Omelete de legumes',9,3,10,'Ovos'],
  ['Clara pasteurizada líquida',10,0.7,0.1,'Ovos'],

  // ── Laticínios e alternativas vegetais ──────────────
  ['Queijo minas padrão',21,3,24,'Laticínios',20,'fatia'],
  ['Queijo minas curado',26,2,30,'Laticínios'],
  ['Queijo muçarela light',27,3,17,'Laticínios',20,'fatia'],
  ['Queijo de cabra',20,1,25,'Laticínios'],
  ['Queijo do reino',27,2,28,'Laticínios'],
  ['Queijo canastra',25,2,30,'Laticínios'],
  ['Queijo suíço',27,2,28,'Laticínios',20,'fatia'],
  ['Queijo brie',21,0.5,27,'Laticínios'],
  ['Queijo boursin/cremoso temperado',7,3,36,'Laticínios'],
  ['Requeijão cremoso tradicional',9,3,25,'Laticínios',30,'colher de sopa'],
  ['Ricota light',12,3,5,'Laticínios'],
  ['Iogurte natural sem lactose',4,6,3,'Laticínios',170,'pote'],
  ['Iogurte grego natural integral',5,4,9,'Laticínios',130,'pote'],
  ['Iogurte skyr',11,4,0.3,'Laticínios',150,'pote'],
  ['Iogurte de frutas light',4,8,0.5,'Laticínios',170,'pote'],
  ['Coalhada seca',10,4,10,'Laticínios'],
  ['Leite de soja',3,2.5,1.8,'Laticínios',200,'copo'],
  ['Leite de aveia',1,7,1.5,'Laticínios',200,'copo'],
  ['Leite de arroz',0.3,9,1,'Laticínios',200,'copo'],
  ['Leite de castanha de caju',1,3,2.5,'Laticínios',200,'copo'],
  ['Leite em pó desnatado',35,52,1,'Laticínios',15,'colher de sopa'],
  ['Nata',2,3,25,'Laticínios'],
  ['Chantilly',2,12,20,'Laticínios'],
  ['Margarina',0.1,0.5,80,'Laticínios',10,'colher de sobremesa'],
  ['Queijo tipo cottage temperado',11,4,5,'Laticínios'],
  ['Queijo em tiras/snack (string cheese)',22,3,20,'Laticínios',20,'unidade'],

  // ── Suplementos e nutrição esportiva ────────────────
  ['Whey protein vegano (ervilha)',75,8,6,'Suplementos',30,'scoop'],
  ['Proteína de soja isolada',85,2,3,'Suplementos',30,'scoop'],
  ['Gel de carboidrato',0,70,0,'Suplementos',30,'sachê'],
  ['Barra de cereal proteica',22,35,10,'Suplementos',45,'barra'],
  ['Pasta de amendoim proteica',30,15,45,'Suplementos',15,'colher de sopa'],
  ['Cookie proteico',20,40,15,'Suplementos',60,'unidade'],
  ['Bebida proteica pronta (RTD)',12,5,1.5,'Suplementos',250,'garrafa'],
  ['Glutamina em pó',0,0,0,'Suplementos',5,'dose'],

  // ── Cereais, pães e massas ──────────────────────────
  ['Arroz parboilizado cozido',2.6,28,0.3,'Cereais',25,'colher de sopa'],
  ['Arroz negro cozido',3.5,30,1,'Cereais',25,'colher de sopa'],
  ['Arroz com feijão misturado',3.5,22,1,'Cereais'],
  ['Macarrão de arroz cozido',1.8,24,0.2,'Cereais'],
  ['Macarrão de grão-de-bico cozido',7,22,2,'Cereais'],
  ['Macarrão espaguete integral ao alho e óleo',6,28,6,'Cereais'],
  ['Talharim cozido',5,28,1,'Cereais'],
  ['Massa fresca cozida',6,29,2,'Cereais'],
  ['Capeletti cozido',9,26,6,'Cereais'],
  ['Lasanha (massa) cozida',5,28,1,'Cereais'],
  ['Miojo cozido',4,26,5,'Cereais'],
  ['Pão de forma sem glúten',3,50,6,'Cereais',25,'fatia'],
  ['Pão de forma 100% integral',10,42,3,'Cereais',25,'fatia'],
  ['Pão de leite',8,53,7,'Cereais',50,'unidade'],
  ['Pão sovado caseiro',8,52,3,'Cereais',50,'unidade'],
  ['Pão de batata',8,50,6,'Cereais',50,'unidade'],
  ['Pão ciabatta',9,52,3,'Cereais',60,'fatia'],
  ['Pão pita',9,55,1.5,'Cereais',60,'unidade'],
  ['Pão naan',9,50,6,'Cereais',80,'unidade'],
  ['Pão low carb',20,8,10,'Cereais',30,'fatia'],
  ['Torrada tradicional',11,71,6,'Cereais',8,'unidade'],
  ['Cracker integral',9,65,12,'Cereais',5,'unidade'],
  ['Pão de milho',6,48,5,'Cereais',50,'unidade'],
  ['Farofa de farinha de mandioca com ovo',6,58,12,'Cereais'],
  ['Cuscuz nordestino com manteiga',3,26,4,'Cereais'],
  ['Cuscuz com ovo',7,22,6,'Cereais'],
  ['Tapioca com coco',2,50,7,'Cereais'],
  ['Beiju de tapioca',0.4,86,0,'Cereais'],
  ['Farinha de milho (fubá) crua',7,79,2,'Cereais'],
  ['Flocão de milho cozido',2,20,0.5,'Cereais'],
  ['Farinha de arroz',7,80,1,'Cereais'],
  ['Farinha de amêndoas',21,20,50,'Cereais'],
  ['Farinha de coco',18,60,15,'Cereais'],
  ['Farinha de grão-de-bico',22,58,7,'Cereais'],
  ['Polvilho doce',0.2,88,0,'Cereais'],
  ['Amido de milho',0.3,88,0,'Cereais'],
  ['Granola sem açúcar',12,55,15,'Cereais',30,'porção'],
  ['Muesli',10,66,6,'Cereais',40,'porção'],
  ['Cereal matinal integral',8,72,2,'Cereais',30,'porção'],
  ['Aveia em flocos finos',14,66,8,'Cereais',15,'colher de sopa'],
  ['Aveia cozida (mingau) com água',2.5,12,1.5,'Cereais'],
  ['Overnight oats com iogurte',6,17,4,'Cereais'],
  ['Painço cozido',3.5,23,1,'Cereais'],
  ['Amaranto cozido',4,19,1.5,'Cereais'],
  ['Centeio integral cozido',3,22,0.5,'Cereais'],
  ['Cevadinha cozida',2,20,0.5,'Cereais'],
  ['Trigo em grão cozido',3,24,0.5,'Cereais'],
  ['Milho cozido na espiga',3.4,19,1.5,'Cereais',100,'meia espiga'],
  ['Pipoca estourada na panela com óleo',9,62,15,'Cereais'],
  ['Pipoca de ar (sem óleo)',12,78,4,'Cereais',20,'xícara'],

  // ── Leguminosas e proteínas vegetais ────────────────
  ['Feijão carioca cozido com caldo',5,14,0.7,'Leguminosas',80,'concha'],
  ['Feijão tropeiro',8,20,10,'Leguminosas'],
  ['Feijão verde cozido',6,15,0.5,'Leguminosas'],
  ['Feijão-de-corda cozido',6,16,0.6,'Leguminosas'],
  ['Feijão azuki cozido',8,25,0.1,'Leguminosas'],
  ['Feijão rajado cozido',7,17,0.5,'Leguminosas'],
  ['Lentilha vermelha cozida',9,20,0.4,'Leguminosas'],
  ['Grão-de-bico assado (snack)',20,55,6,'Leguminosas'],
  ['Edamame cozido',11,9,5,'Leguminosas'],
  ['Tempeh',19,9,11,'Leguminosas'],
  ['Seitan',25,14,2,'Leguminosas'],
  ['Hambúrguer vegetal de grão-de-bico',10,18,8,'Leguminosas',80,'unidade'],
  ['Hambúrguer vegetal de soja',16,10,8,'Leguminosas',80,'unidade'],
  ['Falafel assado',13,32,18,'Leguminosas',25,'unidade'],
  ['Tofu defumado',15,3,9,'Leguminosas'],
  ['Feijão preto refogado',6,16,2,'Leguminosas',80,'concha'],
  ['Ervilha em lata',4,10,0.5,'Leguminosas'],
  ['Milho e ervilha em conserva',3.5,14,1,'Leguminosas'],
  ['Pasta de grão-de-bico (homus) light',5,10,6,'Leguminosas',30,'colher de sopa'],

  // ── Tubérculos e raízes ─────────────────────────────
  ['Batata inglesa assada com casca',2.5,21,0.1,'Tubérculos',150,'unidade média'],
  ['Batata cozida com casca',2,20,0.1,'Tubérculos',130,'unidade média'],
  ['Batata sautée',2.5,17,6,'Tubérculos'],
  ['Batata-doce roxa cozida',1.5,20,0.1,'Tubérculos'],
  ['Batata-doce frita',2,32,12,'Tubérculos'],
  ['Purê de batata-doce',1.5,18,2,'Tubérculos'],
  ['Purê de mandioquinha',1,16,2,'Tubérculos'],
  ['Mandioca cozida amassada',1,30,0.3,'Tubérculos'],
  ['Aipim frito (mandioca)',1.5,40,15,'Tubérculos'],
  ['Inhame assado',2,27,0.2,'Tubérculos'],
  ['Taioba refogada',3,5,2,'Legumes'],
  ['Cará roxo cozido',2,24,0.1,'Tubérculos'],
  ['Beterraba assada',1.7,10,0.2,'Tubérculos'],
  ['Cenoura cozida',0.8,8,0.2,'Tubérculos'],
  ['Nhoque de mandioca',2,30,3,'Tubérculos'],
  ['Batata palha',5,55,30,'Snacks'],

  // ── Legumes e verduras ──────────────────────────────
  ['Brócolis no vapor',2.8,6,0.4,'Legumes'],
  ['Couve-flor assada',2.5,5,3,'Legumes'],
  ['Couve crua',3,4.3,0.7,'Legumes'],
  ['Couve manteiga refogada com alho',2.7,5,4,'Legumes'],
  ['Espinafre refogado',3,3.5,3,'Legumes'],
  ['Espinafre cru',2.9,3.6,0.4,'Legumes'],
  ['Mostarda (folha) refogada',2.5,4,3,'Legumes'],
  ['Ora-pro-nóbis refogada',5,5,1,'Legumes'],
  ['Repolho roxo cru',1.4,7,0.2,'Legumes'],
  ['Repolho cozido',1.2,5.5,0.1,'Legumes'],
  ['Alface americana',1,3,0.2,'Legumes'],
  ['Alface roxa',1.3,3,0.2,'Legumes'],
  ['Rúcula com tomate-cereja',1.5,4,0.3,'Legumes'],
  ['Mix de folhas verdes',1.5,3,0.2,'Legumes'],
  ['Radicchio',1.4,4.5,0.3,'Legumes'],
  ['Endívia',1,3.5,0.2,'Legumes'],
  ['Tomate-cereja',0.9,3.9,0.2,'Legumes',15,'unidade'],
  ['Tomate assado',1,5,3,'Legumes'],
  ['Pimentão vermelho assado',1,6,2,'Legumes'],
  ['Pimentão amarelo cru',1,6,0.2,'Legumes'],
  ['Abobrinha grelhada',1.2,3.5,3,'Legumes'],
  ['Abobrinha italiana crua',1.2,3.1,0.3,'Legumes'],
  ['Berinjela grelhada',1,6,4,'Legumes'],
  ['Berinjela assada',1,6,0.2,'Legumes'],
  ['Cogumelo shimeji refogado',3,4,3,'Legumes'],
  ['Cogumelo shiitake cozido',2,14,0.3,'Legumes'],
  ['Cogumelo paris cru',3,3.3,0.3,'Legumes'],
  ['Vagem refogada',2,7,3,'Legumes'],
  ['Ervilha torta cozida',3,7,0.2,'Legumes'],
  ['Aspargo grelhado',2.5,4,3,'Legumes'],
  ['Alcachofra cozida',3,11,0.3,'Legumes'],
  ['Erva-doce (bulbo) cru',1.2,7,0.2,'Legumes'],
  ['Salsão (aipo) cru',0.7,3,0.2,'Legumes'],
  ['Rabanete cru',0.7,3.4,0.1,'Legumes'],
  ['Beterraba crua ralada',1.6,10,0.2,'Legumes'],
  ['Cenoura ralada',0.9,9,0.2,'Legumes'],
  ['Abóbora moranga cozida',0.7,6,0.2,'Legumes'],
  ['Abóbora japonesa assada',1,10,0.2,'Legumes'],
  ['Chuchu refogado',0.7,5,3,'Legumes'],
  ['Maxixe cru',1.4,4,0.2,'Legumes'],
  ['Jiló cozido',1.4,6,0.2,'Legumes'],
  ['Quiabo cozido',1.9,7,0.2,'Legumes'],
  ['Palmito pupunha',2.5,4.5,0.2,'Legumes'],
  ['Broto de feijão (moyashi)',3,6,0.2,'Legumes'],
  ['Broto de bambu',2,5,0.3,'Legumes'],
  ['Salada de repolho e cenoura (coleslaw light)',1,7,1,'Legumes'],
  ['Vinagrete de tomate e cebola',0.8,5,3,'Legumes'],
  ['Sopa de abóbora',1,7,2,'Pratos'],
  ['Caldo de legumes caseiro',0.5,2,0.2,'Legumes'],
  ['Cebola caramelizada',1,12,4,'Legumes'],
  ['Alho-poró refogado',1.8,10,3,'Legumes'],
  ['Cebolinha',1.9,7,0.3,'Legumes'],
  ['Salsa/cheiro-verde fresco',3,6,0.8,'Legumes'],
  ['Coentro fresco',2,3.7,0.5,'Legumes'],
  ['Hortelã fresca',3.3,8,0.7,'Legumes'],
  ['Manjericão fresco',3.2,2.7,0.6,'Legumes'],
  ['Pimenta dedo-de-moça',1.9,9,0.4,'Legumes'],
  ['Gengibre cru',1.8,18,0.8,'Legumes'],
  ['Cúrcuma em pó',8,65,10,'Legumes'],

  // ── Frutas ──────────────────────────────────────────
  ['Banana da terra cozida',1,31,0.2,'Frutas',100,'unidade'],
  ['Banana da terra frita',1.5,38,10,'Frutas',100,'unidade'],
  ['Banana maçã',1.2,25,0.1,'Frutas',70,'unidade'],
  ['Banana ouro',1.2,26,0.1,'Frutas',50,'unidade'],
  ['Maçã fuji com casca',0.3,14,0.2,'Frutas',150,'unidade'],
  ['Maçã verde',0.4,14,0.2,'Frutas',150,'unidade'],
  ['Laranja-pera',1,11,0.1,'Frutas',180,'unidade'],
  ['Laranja lima',0.9,10,0.1,'Frutas',150,'unidade'],
  ['Mexerica/ponkan',0.8,10,0.1,'Frutas',120,'unidade'],
  ['Bergamota',0.9,9,0.2,'Frutas',120,'unidade'],
  ['Limão siciliano',1,9,0.3,'Frutas',80,'unidade'],
  ['Lima da pérsia',0.7,10,0.2,'Frutas',70,'unidade'],
  ['Toranja/grapefruit',0.8,8,0.1,'Frutas',200,'meia'],
  ['Pomelo',0.8,9,0.1,'Frutas'],
  ['Mamão formosa',0.5,10,0.1,'Frutas'],
  ['Manga palmer',0.8,15,0.3,'Frutas',200,'unidade'],
  ['Manga tommy',0.8,14,0.2,'Frutas',200,'unidade'],
  ['Melancia sem semente',0.6,8,0.1,'Frutas'],
  ['Melão amarelo',0.7,8,0.1,'Frutas'],
  ['Melão cantaloupe',0.8,8,0.2,'Frutas'],
  ['Uva itália',0.6,17,0.2,'Frutas',5,'uva'],
  ['Uva rubi',0.6,16,0.2,'Frutas',5,'uva'],
  ['Uva sem semente',0.7,17,0.2,'Frutas',5,'uva'],
  ['Morango congelado',0.7,8,0.3,'Frutas'],
  ['Cereja',1,16,0.2,'Frutas',8,'unidade'],
  ['Groselha',1.4,14,0.2,'Frutas'],
  ['Goiaba vermelha',2.5,13,0.7,'Frutas',170,'unidade'],
  ['Goiaba branca',1.1,13,0.4,'Frutas',170,'unidade'],
  ['Pêra williams',0.4,15,0.1,'Frutas',150,'unidade'],
  ['Nectarina',1,10,0.3,'Frutas',140,'unidade'],
  ['Ameixa fresca',0.7,11,0.3,'Frutas',65,'unidade'],
  ['Caqui chocolate',0.6,19,0.2,'Frutas',150,'unidade'],
  ['Carambola',0.9,6,0.3,'Frutas',100,'unidade'],
  ['Jaca',1.4,23,0.3,'Frutas'],
  ['Fruta-do-conde (pinha)',1.7,24,0.5,'Frutas'],
  ['Atemoia',1.5,23,0.4,'Frutas'],
  ['Lichia',0.8,16,0.4,'Frutas',10,'unidade'],
  ['Romã',1.7,19,1.2,'Frutas'],
  ['Maracujá fruta',2,13,0.7,'Frutas',40,'unidade'],
  ['Suco de maracujá concentrado (polpa)',1,10,0.2,'Frutas'],
  ['Cajá',0.9,11,0.3,'Frutas'],
  ['Caju',1,10,0.3,'Frutas',70,'unidade'],
  ['Umbu',0.8,10,0.2,'Frutas'],
  ['Seriguela',1.4,15,0.5,'Frutas'],
  ['Pitanga',0.9,8,0.2,'Frutas'],
  ['Tamarindo',2.8,62,0.6,'Frutas'],
  ['Buriti (polpa)',2,20,10,'Frutas'],
  ['Açaí polpa com guaraná (congelada)',1,13,4,'Frutas'],
  ['Cupuaçu (polpa) sem açúcar',1.2,12,1,'Frutas'],
  ['Acerola (polpa congelada)',0.5,6,0.2,'Frutas'],
  ['Polpa de goiaba congelada',0.5,8,0.2,'Frutas'],
  ['Polpa de manga congelada',0.5,10,0.2,'Frutas'],
  ['Polpa de maracujá congelada',0.6,7,0.2,'Frutas'],
  ['Abacate pequeno',1.5,6,10,'Frutas',150,'unidade'],
  ['Coco ralado sem açúcar',6.5,24,62,'Frutas',10,'colher de sopa'],
  ['Coco seco em lascas',7,24,64,'Frutas'],
  ['Água de coco (polpa)',0.5,6,0.2,'Frutas'],
  ['Uva passa preta',3,79,0.5,'Frutas',10,'colher de sopa'],
  ['Cranberry seca',0.1,82,1.4,'Frutas'],
  ['Goji berry seca',14,52,0.4,'Frutas'],
  ['Damasco fresco',1.4,11,0.4,'Frutas',35,'unidade'],
  ['Figo seco',3.3,64,0.9,'Frutas'],
  ['Abacaxi fresco',0.5,12,0.1,'Frutas',100,'fatia'],
  ['Banana congelada em rodelas',1.1,23,0.3,'Frutas'],
  ['Mix de frutas vermelhas congeladas',0.8,10,0.3,'Frutas'],
  ['Kiwi dourado',1.1,15,0.6,'Frutas',80,'unidade'],
  ['Salada de frutas com iogurte',1.5,14,1,'Frutas'],

  // ── Oleaginosas, sementes e gorduras ────────────────
  ['Castanha de caju torrada sem sal',18,30,44,'Gorduras',10,'punhado pequeno'],
  ['Amendoim cru',26,16,49,'Gorduras'],
  ['Amendoim cozido',13,17,10,'Gorduras'],
  ['Pasta de castanha de caju',18,27,49,'Gorduras',15,'colher de sopa'],
  ['Pasta de amêndoas',21,19,50,'Gorduras',15,'colher de sopa'],
  ['Pasta de avelã',13,17,60,'Gorduras',15,'colher de sopa'],
  ['Tahine (pasta de gergelim)',17,21,54,'Gorduras',15,'colher de sopa'],
  ['Nozes pecã',9,14,72,'Gorduras'],
  ['Pinhão cozido',3,34,1.5,'Gorduras'],
  ['Castanha portuguesa assada',3,44,2,'Gorduras'],
  ['Semente de abóbora',30,11,49,'Gorduras',10,'colher de sopa'],
  ['Semente de chia hidratada',2,8,2,'Gorduras'],
  ['Semente de girassol sem sal',21,20,51,'Gorduras',10,'colher de sopa'],
  ['Linhaça dourada',18,29,42,'Gorduras',10,'colher de sopa'],
  ['Farelo de trigo',15,64,4,'Cereais',10,'colher de sopa'],
  ['Cacau em pó 100%',20,58,14,'Doces',5,'colher de sopa'],
  ['Nibs de cacau',14,33,50,'Doces'],
  ['Azeite de dendê',0,0,100,'Gorduras',13,'colher de sopa'],
  ['Óleo de girassol',0,0,100,'Gorduras',13,'colher de sopa'],
  ['Óleo de canola',0,0,100,'Gorduras',13,'colher de sopa'],
  ['Óleo de abacate',0,0,100,'Gorduras',13,'colher de sopa'],
  ['Gordura de porco (banha)',0,0,100,'Gorduras',13,'colher de sopa'],
  ['Creme de amendoim tradicional (doce)',22,22,50,'Gorduras',15,'colher de sopa'],
  ['Mix de castanhas',17,22,52,'Gorduras',30,'porção'],
  ['Abacate amassado',1.5,6,14,'Gorduras',30,'colher de sopa'],
  ['Guacamole',2,8,14,'Molhos'],

  // ── Bebidas ─────────────────────────────────────────
  ['Café com açúcar (cafezinho)',0.1,8,0,'Bebidas',50,'xícara pequena'],
  ['Café com leite e açúcar',1.5,6,1.5,'Bebidas',200,'xícara'],
  ['Café coado com leite integral',1.5,2,1.5,'Bebidas',200,'xícara'],
  ['Cappuccino com leite',1.5,7,1.8,'Bebidas',200,'xícara'],
  ['Chá verde sem açúcar',0,0,0,'Bebidas',200,'xícara'],
  ['Chá mate gelado com açúcar',0,9,0,'Bebidas',300,'copo'],
  ['Chá de hibisco sem açúcar',0,0.5,0,'Bebidas',200,'xícara'],
  ['Kombucha',0,4,0,'Bebidas',300,'copo'],
  ['Guaraná natural em lata',0,10,0,'Bebidas',350,'lata'],
  ['Guaraná zero',0,0,0,'Bebidas',350,'lata'],
  ['Refrigerante de cola zero',0,0,0,'Bebidas',350,'lata'],
  ['Suco de laranja com água (diluído)',0.4,6,0.1,'Bebidas',200,'copo'],
  ['Suco de limão sem açúcar',0.3,2,0,'Bebidas',200,'copo'],
  ['Suco de abacaxi com hortelã',0.3,10,0,'Bebidas',200,'copo'],
  ['Suco de melancia natural',0.5,7,0.1,'Bebidas',200,'copo'],
  ['Suco de caju natural',0.5,9,0.1,'Bebidas',200,'copo'],
  ['Suco de maracujá adoçado',0.3,12,0.1,'Bebidas',200,'copo'],
  ['Suco de uva concentrado (diluído)',0.3,14,0,'Bebidas',200,'copo'],
  ['Suco detox (couve, limão, gengibre, maçã)',0.5,7,0.1,'Bebidas',300,'copo'],
  ['Vitamina de frutas com leite',2.5,14,2,'Bebidas',300,'copo'],
  ['Vitamina de abacate',2.5,12,7,'Bebidas',300,'copo'],
  ['Smoothie de frutas vermelhas com iogurte',2,14,1,'Bebidas',300,'copo'],
  ['Shake de whey com leite',9,6,3,'Bebidas',300,'copo'],
  ['Shake de whey com água',5,1.5,0.7,'Bebidas',300,'copo'],
  ['Água',0,0,0,'Bebidas',200,'copo'],
  ['Água com gás',0,0,0,'Bebidas',300,'copo'],
  ['Água saborizada zero',0,0,0,'Bebidas',300,'copo'],
  ['Isotônico zero',0,1,0,'Bebidas',500,'garrafa'],
  ['Energético zero',0,0.5,0,'Bebidas',250,'lata'],
  ['Achocolatado com leite integral',3,10,3,'Bebidas',200,'copo'],
  ['Leite com café e adoçante',3,4.7,3.4,'Bebidas',200,'copo'],
  ['Milk-shake',3,20,4,'Bebidas',300,'copo'],
  ['Batida de coco',1,20,5,'Bebidas',200,'copo'],
  ['Água de coco em caixinha',0.2,5,0,'Bebidas',200,'caixinha'],
  ['Mate leão com limão',0,6,0,'Bebidas',300,'copo'],
  ['Sagu com creme',1,25,2,'Doces'],

  // ── Pratos caseiros e regionais ─────────────────────
  ['Arroz com feijão e ovo',6,20,4,'Pratos'],
  ['Prato feito com bife, arroz, feijão e salada',9,17,5,'Pratos'],
  ['Marmita de frango, arroz, feijão e legumes',9,17,3,'Pratos'],
  ['Marmita de carne moída, arroz, feijão e salada',8,17,5,'Pratos'],
  ['Strogonoff de carne',10,5,10,'Pratos'],
  ['Frango ao molho de tomate',14,3,7,'Pratos'],
  ['Frango com quiabo',14,4,8,'Pratos'],
  ['Frango à cabidela',15,3,10,'Pratos'],
  ['Galinha caipira ensopada',14,2,9,'Pratos'],
  ['Carne com batata (ensopado)',9,7,6,'Pratos'],
  ['Picadinho de carne com legumes',11,5,7,'Pratos'],
  ['Bife à parmegiana',16,9,10,'Pratos'],
  ['Bife de panela com molho',17,3,9,'Pratos'],
  ['Rocambole de carne',15,6,10,'Pratos'],
  ['Carne assada com molho',20,2,10,'Pratos'],
  ['Cozido (carne com legumes)',9,5,5,'Pratos'],
  ['Maria Isabel (arroz com carne de sol)',13,22,9,'Pratos'],
  ['Paçoca de carne de sol com farinha',25,25,14,'Pratos'],
  ['Escondidinho de carne de sol',10,16,8,'Pratos'],
  ['Escondidinho de frango',9,15,6,'Pratos'],
  ['Escondidinho de camarão',8,14,7,'Pratos'],
  ['Vaca atolada',13,7,10,'Pratos'],
  ['Dobradinha',11,8,6,'Pratos'],
  ['Buchada de bode',16,4,10,'Pratos'],
  ['Sarapatel',14,3,10,'Pratos'],
  ['Tutu de feijão',5,15,6,'Pratos'],
  ['Feijão-tropeiro completo',9,17,11,'Pratos'],
  ['Feijoada completa (só feijão e carnes)',9,8,8,'Pratos'],
  ['Couve à mineira',3,5,6,'Pratos'],
  ['Torresmo de rolo',24,0,40,'Pratos'],
  ['Frango com polenta',12,10,7,'Pratos'],
  ['Polenta frita',3,22,10,'Pratos'],
  ['Angu',1,10,0.5,'Pratos'],
  ['Moqueca capixaba',12,3,7,'Pratos'],
  ['Moqueca baiana de camarão',12,3,9,'Pratos'],
  ['Vatapá',5,10,9,'Pratos'],
  ['Caruru',5,5,9,'Pratos'],
  ['Acarajé',6,25,17,'Pratos',80,'unidade'],
  ['Abará',5,25,5,'Pratos',100,'unidade'],
  ['Tacacá',8,6,2,'Pratos'],
  ['Pato no tucupi',14,3,10,'Pratos'],
  ['Maniçoba',7,5,8,'Pratos'],
  ['Tapioca com ovo',6,32,6,'Pratos'],
  ['Tapioca com frango e queijo',12,30,9,'Pratos'],
  ['Tapioca com carne seca',13,30,8,'Pratos'],
  ['Crepe de frango',9,18,8,'Pratos'],
  ['Crepe doce de banana',4,32,7,'Pratos'],
  ['Cuscuz paulista',5,17,6,'Pratos'],
  ['Sopa de ervilha',4,8,2,'Pratos'],
  ['Sopa de mandioquinha',2,10,3,'Pratos'],
  ['Sopa de carne com legumes',5,7,2,'Pratos'],
  ['Sopa de frango com macarrão',5,8,2,'Pratos'],
  ['Canja de galinha',4,8,2,'Pratos'],
  ['Caldo de feijão',3,8,1.5,'Pratos'],
  ['Caldo de cana',0,20,0,'Bebidas',300,'copo'],
  ['Omelete recheada com queijo e presunto',13,2,17,'Pratos'],
  ['Arroz de forno',8,22,9,'Pratos'],
  ['Arroz com brócolis',3,22,3,'Pratos'],
  ['Arroz com frango (arroz de galinha)',8,20,5,'Pratos'],
  ['Risoto de cogumelos',4,22,6,'Pratos'],
  ['Risoto de camarão',7,20,6,'Pratos'],
  ['Espaguete com almôndegas',9,23,6,'Pratos'],
  ['Macarronada com frango',9,20,4,'Pratos'],
  ['Macarrão com molho branco',5,22,8,'Pratos'],
  ['Macarrão alho e óleo',4,28,8,'Pratos'],
  ['Lasanha de frango',9,17,8,'Pratos'],
  ['Lasanha de berinjela',7,7,7,'Pratos'],
  ['Panqueca de espinafre com ricota',7,17,7,'Pratos'],
  ['Torta de frango caseira',9,20,11,'Pratos'],
  ['Quiche de legumes',6,15,13,'Pratos'],
  ['Quiche lorraine',9,16,18,'Pratos'],
  ['Empadão de frango',8,22,14,'Pratos'],
  ['Kibe assado',16,15,9,'Pratos',60,'unidade'],
  ['Esfiha aberta de carne assada',10,30,9,'Pratos',80,'unidade'],
  ['Esfiha de queijo assada',10,32,12,'Pratos',80,'unidade'],
  ['Pão de queijo recheado',7,32,15,'Pratos',40,'unidade'],
  ['Enroladinho de presunto e queijo',10,35,12,'Pratos',80,'unidade'],
  ['Salada de grão-de-bico com atum',13,15,7,'Pratos'],
  ['Salada de atum com batata',8,10,6,'Pratos'],
  ['Salada caesar com frango',12,7,9,'Pratos'],
  ['Salada tropical com frango',11,8,5,'Pratos'],
  ['Salada de quinoa com legumes',5,15,6,'Pratos'],
  ['Tabule',2,12,5,'Pratos'],
  ['Baba ganush',2,7,8,'Pratos'],
  ['Kafta com arroz e salada',11,18,8,'Pratos'],
  ['Bowl de frango, arroz e legumes',10,16,4,'Pratos'],
  ['Poke de salmão',9,15,7,'Pratos'],
  ['Sashimi de salmão',21,0,10,'Peixes'],
  ['Sushi (uramaki) de salmão',6,28,4,'Pratos',30,'peça'],
  ['Sushi de atum (nigiri)',7,26,1,'Pratos',35,'peça'],
  ['Hot roll',5,30,9,'Pratos',35,'peça'],
  ['Temaki de atum',6,25,3,'Pratos',150,'unidade'],
  ['Missoshiru',2,3,1,'Pratos',200,'tigela'],
  ['Yakimeshi',5,32,6,'Pratos'],
  ['Frango teriyaki',15,10,6,'Pratos'],

  // ── Fast-food e lanches ─────────────────────────────
  ['Big Mac (tipo)',13,18,12,'Fast-food',215,'unidade'],
  ['Cheeseburger simples',14,25,11,'Fast-food',120,'unidade'],
  ['Hambúrguer artesanal (pão, carne 150 g, queijo)',15,17,14,'Fast-food',300,'unidade'],
  ['Hambúrguer de frango empanado (sanduíche)',12,24,12,'Fast-food',180,'unidade'],
  ['McNuggets (tipo)',15,17,17,'Fast-food',16,'unidade'],
  ['Batata frita média de lanchonete',3.4,41,15,'Fast-food',110,'porção'],
  ['Onion rings',4,35,17,'Fast-food'],
  ['Milkshake de lanchonete',3,21,5,'Fast-food',400,'copo'],
  ['Sanduíche de frango grelhado',15,20,5,'Fast-food',200,'unidade'],
  ['Wrap de frango',12,22,7,'Fast-food',200,'unidade'],
  ['Sanduíche de atum',10,25,8,'Fast-food',180,'unidade'],
  ['Subway 15 cm frango teriyaki (tipo)',11,25,3,'Fast-food',230,'unidade'],
  ['Hot dog completo',9,22,12,'Fast-food',200,'unidade'],
  ['Pizza de calabresa, fatia',11,30,12,'Fast-food',100,'fatia'],
  ['Pizza de frango com catupiry, fatia',11,31,11,'Fast-food',100,'fatia'],
  ['Pizza margherita, fatia',11,32,9,'Fast-food',100,'fatia'],
  ['Pizza de mussarela, fatia',11,33,10,'Fast-food',100,'fatia'],
  ['Pizza quatro queijos, fatia',13,30,15,'Fast-food',100,'fatia'],
  ['Pizza brotinho de mussarela',11,33,10,'Fast-food',250,'unidade'],
  ['Calzone',10,32,12,'Fast-food',200,'unidade'],
  ['Pastel de feira de carne',8,32,17,'Fast-food',100,'unidade'],
  ['Pastel de feira de queijo',9,30,18,'Fast-food',100,'unidade'],
  ['Pastel de vento',3,38,20,'Fast-food',60,'unidade'],
  ['Coxinha de frango frita',9,27,13,'Fast-food',70,'unidade'],
  ['Coxinha assada',9,26,7,'Fast-food',70,'unidade'],
  ['Risole de presunto e queijo',8,29,15,'Fast-food',60,'unidade'],
  ['Bolinha de queijo frita',9,25,18,'Fast-food',25,'unidade'],
  ['Kibe frito (salgado)',15,20,15,'Fast-food',60,'unidade'],
  ['Empada de palmito',5,27,15,'Fast-food',60,'unidade'],
  ['Empada de camarão',6,28,15,'Fast-food',60,'unidade'],
  ['Salgado assado de frango (padaria)',9,30,9,'Fast-food',80,'unidade'],
  ['Cachorro-quente prensado',9,26,10,'Fast-food',150,'unidade'],
  ['Espetinho de churrasco com farofa',20,10,12,'Fast-food'],
  ['Pão com linguiça (lanche de rua)',13,25,17,'Fast-food',200,'unidade'],
  ['Pão com bife',15,26,8,'Fast-food',200,'unidade'],
  ['Prato de churrasco (carne, farofa, vinagrete)',20,10,15,'Pratos'],
  ['Pão de queijo grande (lanchonete)',7,32,15,'Fast-food',80,'unidade'],
  ['Açaí 300 ml com granola e leite condensado',3,38,7,'Fast-food',300,'copo'],
  ['Açaí 500 ml com banana e granola',3,35,6,'Fast-food',500,'copo'],
  ['Sorvete de creme, casquinha',3,25,6,'Fast-food',80,'unidade'],
  ['Donut/rosquinha glaceada',5,50,20,'Fast-food',60,'unidade'],
  ['Cookie de chocolate',5,60,22,'Fast-food',50,'unidade'],
  ['Waffle com sorvete',5,42,12,'Fast-food'],

  // ── Doces e sobremesas ──────────────────────────────
  ['Bolo de laranja',5,55,14,'Doces',60,'fatia'],
  ['Bolo de milho',4,50,12,'Doces',80,'fatia'],
  ['Bolo de coco',5,50,18,'Doces',70,'fatia'],
  ['Bolo de chocolate com recheio',5,55,18,'Doces',80,'fatia'],
  ['Bolo de rolo',3,55,12,'Doces',50,'fatia'],
  ['Bolo integral de banana',6,45,9,'Doces',70,'fatia'],
  ['Bolo de cenoura',5,53,15,'Doces',70,'fatia'],
  ['Bolo de aveia fit',9,30,8,'Doces',70,'fatia'],
  ['Pão de mel',4,65,10,'Doces',40,'unidade'],
  ['Brownie',5,55,25,'Doces',50,'unidade'],
  ['Cupcake',4,55,20,'Doces',60,'unidade'],
  ['Torta de chocolate',5,50,25,'Doces',100,'fatia'],
  ['Cheesecake',6,26,22,'Doces',100,'fatia'],
  ['Pavê',4,32,12,'Doces'],
  ['Manjar de coco',2,26,6,'Doces'],
  ['Pudim de leite condensado',5,45,7,'Doces',100,'fatia'],
  ['Flan',4,27,6,'Doces'],
  ['Bombom (unidade)',5,55,30,'Doces',15,'unidade'],
  ['Trufa de chocolate',5,50,30,'Doces',20,'unidade'],
  ['Beijinho',2,50,20,'Doces',20,'unidade'],
  ['Brigadeiro de colher',4,45,12,'Doces'],
  ['Barra de chocolate meio amargo',6,50,32,'Doces',25,'quadradinhos'],
  ['Chocolate branco',6,59,30,'Doces',25,'quadradinhos'],
  ['Barra de chocolate com recheio',5,58,28,'Doces',40,'barra'],
  ['Bis (chocolate)',6,60,26,'Doces',8,'unidade'],
  ['Sorvete zero açúcar',3.5,17,3,'Doces'],
  ['Picolé de fruta',0.3,20,0.2,'Doces',60,'unidade'],
  ['Picolé cremoso de chocolate',3,25,9,'Doces',70,'unidade'],
  ['Sorvete de açaí',1,25,5,'Doces'],
  ['Marshmallow',2,81,0.2,'Doces',5,'unidade'],
  ['Doce de abóbora com coco',1,40,5,'Doces'],
  ['Bananada',1,72,0.5,'Doces',20,'unidade'],
  ['Rapadura',0.4,96,0.1,'Doces',20,'pedaço'],
  ['Melado de cana',0,75,0,'Doces',20,'colher de sopa'],
  ['Açúcar mascavo',0.1,96,0,'Doces',12,'colher de sopa'],
  ['Açúcar demerara',0,99,0,'Doces',12,'colher de sopa'],
  ['Adoçante em pó (sucralose)',0,0,0,'Molhos',1,'sachê'],
  ['Xarope de bordo (maple)',0,67,0,'Doces',20,'colher de sopa'],
  ['Geleia diet',0.5,20,0.1,'Doces',15,'colher de sopa'],
  ['Doce de leite light',5,48,3,'Doces',20,'colher de sopa'],
  ['Cocada de forno',2,60,20,'Doces',30,'unidade'],
  ['Palha italiana',4,55,20,'Doces',30,'unidade'],

  // ── Snacks e barras ─────────────────────────────────
  ['Barra de cereal com frutas',5,70,8,'Snacks',22,'barra'],
  ['Barra de castanhas e frutas',9,45,25,'Snacks',30,'barra'],
  ['Barrinha de proteína (média)',20,25,10,'Snacks',45,'barra'],
  ['Chips de batata',6,53,33,'Snacks',30,'porção'],
  ['Chips de batata-doce assados',3,60,14,'Snacks',30,'porção'],
  ['Chips de mandioca',2,58,32,'Snacks',30,'porção'],
  ['Chips de banana',2,58,34,'Snacks',30,'porção'],
  ['Chips de couve assados',7,10,7,'Snacks',20,'porção'],
  ['Salgadinho de milho assado',6,60,20,'Snacks',30,'porção'],
  ['Doritos (tipo)',7,60,25,'Snacks',30,'porção'],
  ['Pipoca doce',4,72,14,'Snacks',30,'porção'],
  ['Amendoim confeitado',12,60,25,'Snacks',30,'porção'],
  ['Castanhas cobertas com chocolate',10,40,40,'Snacks',30,'porção'],
  ['Biscoito cream cracker',10,68,13,'Snacks',6,'unidade'],
  ['Biscoito de polvilho',1,80,10,'Snacks',10,'unidade'],
  ['Biscoito integral com aveia',8,66,14,'Snacks',8,'unidade'],
  ['Biscoito de leite',7,75,13,'Snacks',6,'unidade'],
  ['Biscoito wafer de chocolate',5,65,26,'Snacks',10,'unidade'],
  ['Biscoito recheado de chocolate',5,70,20,'Snacks',12,'unidade'],
  ['Torradinha com patê',8,55,10,'Snacks'],
  ['Palitinho de queijo assado',15,50,15,'Snacks'],
  ['Mix de castanhas e frutas secas (trail mix)',12,40,30,'Snacks',30,'porção'],
  ['Rolinho de peito de peru com queijo',17,3,7,'Snacks',30,'unidade'],
  ['Cubinhos de queijo',24,2,25,'Snacks'],
  ['Palitos de cenoura e pepino',0.8,6,0.2,'Snacks'],
  ['Maçã com pasta de amendoim',3,20,8,'Snacks'],
  ['Banana com aveia e mel',3,30,3,'Snacks'],
  ['Torrada com abacate e ovo',7,20,10,'Snacks'],
  ['Pão com pasta de amendoim',10,40,15,'Snacks'],
  ['Sanduíche natural de frango',10,20,6,'Snacks'],
  ['Sanduíche de queijo branco e peru',12,28,6,'Snacks'],

  // ── Molhos, temperos e complementos ─────────────────
  ['Molho de tomate caseiro',1.5,7,2,'Molhos',30,'colher de sopa'],
  ['Molho ao sugo',1.5,8,3,'Molhos',30,'colher de sopa'],
  ['Molho branco light',2,7,3,'Molhos',30,'colher de sopa'],
  ['Molho de queijo',5,7,12,'Molhos',30,'colher de sopa'],
  ['Molho de iogurte com ervas',3,5,4,'Molhos',30,'colher de sopa'],
  ['Molho de mostarda e mel',1,25,5,'Molhos',15,'colher de sopa'],
  ['Molho inglês',1,17,0,'Molhos',5,'colher de chá'],
  ['Molho shoyu light',6,4,0,'Molhos',15,'colher de sopa'],
  ['Molho sriracha',2,12,1,'Molhos',5,'colher de chá'],
  ['Maionese temperada',1,6,32,'Molhos',15,'colher de sopa'],
  ['Maionese caseira',1,2,75,'Molhos',15,'colher de sopa'],
  ['Azeite com ervas',0,0,100,'Molhos',13,'colher de sopa'],
  ['Pasta de alho',3,20,1,'Molhos'],
  ['Chimichurri',1,3,20,'Molhos',15,'colher de sopa'],
  ['Pesto de manjericão',5,4,45,'Molhos',15,'colher de sopa'],
  ['Vinagre balsâmico',0.5,17,0,'Molhos',15,'colher de sopa'],
  ['Cream de ricota temperado',8,4,12,'Molhos'],
  ['Requeijão de castanha',3,8,14,'Molhos'],
  ['Farofa pronta',2,68,14,'Cereais'],
  ['Cebola frita crocante',5,60,30,'Molhos'],
  ['Sal grosso (pitada)',0,0,0,'Molhos',1,'pitada'],
  ['Caldo de carne em cubo',10,8,25,'Molhos'],
  ['Extrato de tomate',4,20,0.5,'Molhos',20,'colher de sopa'],
  ['Catchup light',1,15,0,'Molhos',15,'colher de sopa'],
  ['Pimenta biquinho em conserva',1,5,0.3,'Molhos'],
  ['Pepino em conserva doce',0.5,12,0.1,'Molhos'],
  ['Azeitona preta',1,6,15,'Molhos',5,'unidade'],
  ['Alcaparras',2,4,0.9,'Molhos'],

  // ── Bebidas alcoólicas extras ───────────────────────
  ['Cerveja sem álcool',0.3,3,0,'Bebidas',350,'lata'],
  ['Cerveja artesanal IPA',0.5,4,0,'Bebidas',350,'copo'],
  ['Cerveja preta (stout)',0.5,4.5,0,'Bebidas',350,'copo'],
  ['Vinho rosé',0.1,2.5,0,'Bebidas',150,'taça'],
  ['Aperol spritz',0,10,0,'Bebidas',200,'taça'],
  ['Mojito',0,10,0,'Bebidas',250,'copo'],
  ['Cuba libre',0,7,0,'Bebidas',300,'copo'],
  ['Campari com laranja',0,12,0,'Bebidas',250,'copo'],
  ['Saquê',0.5,5,0,'Bebidas',50,'dose'],
  ['Licor',0,30,0,'Bebidas',30,'dose'],
  ['Batida de maracujá com vodka',0.3,18,0,'Bebidas',200,'copo']
];

/* Álcool em g/100 g dos itens que o exigem (o app soma 7 kcal/g). */
const ALCOOL = {
  'Cerveja artesanal IPA': 5.5, 'Cerveja preta (stout)': 5, 'Vinho rosé': 10.5, 'Aperol spritz': 5.5,
  'Mojito': 7, 'Cuba libre': 6, 'Campari com laranja': 6, 'Saquê': 12.5, 'Licor': 20,
  'Batida de maracujá com vodka': 7, 'Cerveja sem álcool': 0.4
};

const nomes = new Set(ALIMENTOS.map(a => a.n.toLowerCase()));
let adicionados = 0;
X.forEach(r => {
  if (nomes.has(r[0].toLowerCase())) return;           // não duplica o que já existe
  nomes.add(r[0].toLowerCase());
  const a = { n: r[0], p: r[1], c: r[2], g: r[3], cat: r[4] };
  if (r[5]) { a.un = r[5]; a.unNome = r[6]; }
  if (ALCOOL[a.n]) a.alc = ALCOOL[a.n];
  ALIMENTOS.push(a);
  adicionados++;
});
if (typeof window !== 'undefined') window.__ALIMENTOS_EXTRAS = adicionados;
})();

/* ══════════════════════════════════════════════════════════
   BUSCA: sinônimos regionais + tolerância a erro de digitação
   ══════════════════════════════════════════════════════════ */

/* Cada linha é um grupo de nomes para a mesma coisa. */
const SIN_ALIMENTOS = [
  ['mandioca','aipim','macaxeira'],
  ['tangerina','mexerica','bergamota','ponkan','poncan'],
  ['abobora','jerimum'],
  ['batata doce','batata-doce'],
  ['batata inglesa','batata'],
  ['mandioquinha','batata baroa','baroa'],
  ['beterraba','beterrada'],
  ['vagem','feijao verde'],
  ['quiabo','quimbombo'],
  ['pao frances','pao de sal','paozinho','cacetinho','pao carioquinha'],
  ['pao de forma','pao de caixa','pao sirio'],
  ['pao de queijo','chipa'],
  ['cuscuz','cuscuz nordestino'],
  ['tapioca','beiju'],
  ['fubá','fuba','farinha de milho'],
  ['refrigerante','refri','coca','coca cola','guarana'],
  ['iogurte','yogurt','iorgute'],
  ['hamburguer','hamburger','burger','x-burger'],
  ['salgado','coxinha','risole','pastel'],
  ['marmita','marmitex','prato feito','pf'],
  ['requeijao','catupiry'],
  ['leite condensado','leitinho'],
  ['amendoim','mandubi'],
  ['castanha de caju','caju'],
  ['acai','açaí'],
  ['carne moida','moida'],
  ['linguica','calabresa'],
  ['peito de frango','frango'],
  ['presunto','fiambre'],
  ['mamao','papaia','formosa'],
  ['melancia','melancia sem semente'],
  ['abacate','avocado'],
  ['gengibre','ginger'],
  ['brocolis','brócolis','brocoli'],
  ['couve flor','couve-flor'],
  ['macarrao','espaguete','massa','miojo'],
  ['ovo','ovos'],
  ['suco','sumo'],
  ['cafe','cafezinho']
];

function _semAcento(s) {
  return String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}

/* Distância de edição limitada: para no limite para ser rápida. */
function _dist(a, b, lim) {
  if (Math.abs(a.length - b.length) > lim) return lim + 1;
  let ant = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const at = [i]; let min = i;
    for (let j = 1; j <= b.length; j++) {
      const c = a[i - 1] === b[j - 1] ? 0 : 1;
      at[j] = Math.min(ant[j] + 1, at[j - 1] + 1, ant[j - 1] + c);
      if (at[j] < min) min = at[j];
    }
    if (min > lim) return lim + 1;
    ant = at;
  }
  return ant[b.length];
}

const _SIN_MAPA = (function () {
  const m = {};
  SIN_ALIMENTOS.forEach(g => g.forEach(t => { m[_semAcento(t)] = g.map(_semAcento); }));
  return m;
})();

/* Variantes da consulta: a própria frase, mais cada sinônimo. */
function expandirConsulta(q) {
  const base = _semAcento(q);
  if (!base) return [];
  const out = new Set([base]);
  Object.keys(_SIN_MAPA).forEach(t => {
    const re = new RegExp('(^| )' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '( |$)');
    // troca só a palavra inteira (antes, replace() trocava o primeiro pedaço de qualquer palavra)
    if (re.test(base)) _SIN_MAPA[t].forEach(s => { if (s !== t) out.add(base.replace(re, '$1' + s + '$2')); });
  });
  return Array.from(out);
}

/* Cada palavra da consulta tem de ser o INÍCIO de alguma palavra do nome.
   Devolve null se não casa, ou { exato, inicio }: exato = todas as palavras
   iguais (não só prefixo); inicio = a consulta abre o nome. */
function _casaConsulta(pals, toks) {
  let exato = true;
  for (let k = 0; k < toks.length; k++) {
    let ach = false, ex = false;
    for (let j = 0; j < pals.length; j++) {
      if (pals[j] === toks[k]) { ach = true; ex = true; break; }
      if (pals[j].startsWith(toks[k])) ach = true;
    }
    if (!ach) return null;
    if (!ex) exato = false;
  }
  return { exato, inicio: !!pals.length && pals[0].startsWith(toks[0]) };
}

/* Busca com sinônimos e, sem resultado, aproximada.
   Casa por PALAVRA (início de palavra), não por pedaço de texto: "coca" não
   acha "paçoca", "salgado" não acha "dessalgado". Os sinônimos entram junto
   e, como os nomes que começam pela consulta, vêm primeiro — senão "coca"
   só devolvia Cocada e nunca o refrigerante.
   Devolve { itens, via } onde via = 'exata' | 'sinonimo' | 'aproximada'
   ('sinonimo' quando o primeiro da lista só entrou por apelido). */
function buscarAlimentos(lista, q) {
  const vars = expandirConsulta(q);
  if (!vars.length) return { itens: lista, via: 'exata' };
  const nn = a => (a._nn || (a._nn = _semAcento(a.n)));

  const varToks = vars.map(v => v.split(' ').filter(Boolean));
  const achados = [];
  lista.forEach(a => {
    const pals = nn(a).split(' ');
    let melhor = 0, sin = false;
    varToks.forEach((toks, vi) => {
      const m = _casaConsulta(pals, toks);
      if (!m || (vi && !m.exato)) return;       // o apelido só vale como palavra inteira ("refri" não pode trazer "Cocada" pelo "coca")
      // palavra inteira vale mais que prefixo; abrir o nome vale mais que estar no meio.
      // Literal e apelido empatam (a ordem da base decide), e o literal é testado antes.
      const s = (m.exato ? 4 : 2) + (m.inicio ? 3 : 0) + (m.exato && pals.length === toks.length ? 1 : 0);   // nome = consulta: "Água" antes de "Água de coco"
      if (s > melhor) { melhor = s; sin = vi > 0; }
    });
    if (melhor) achados.push({ a, s: melhor, sin });
  });
  if (achados.length) {
    achados.sort((x, y) => y.s - x.s);                      // estável: empate mantém a ordem da base
    return { itens: achados.map(x => x.a), via: achados[0].sin ? 'sinonimo' : 'exata' };
  }

  // aproximada: cada palavra da consulta tem de casar com alguma palavra do nome, com até 1–2 erros
  const toks = vars[0].split(' ').filter(t => t.length >= 3);
  if (!toks.length) return { itens: [], via: 'aproximada' };
  const pontuados = [];
  lista.forEach(a => {
    const pals = nn(a).split(' ');
    let total = 0, ok = true;
    toks.forEach(t => {
      const lim = t.length >= 8 ? 2 : 1;
      let melhor = lim + 1;
      pals.forEach(p => { const d = _dist(t, p.length > t.length + lim ? p.slice(0, t.length + lim) : p, lim); if (d < melhor) melhor = d; });
      if (melhor > lim) ok = false; else total += melhor;
    });
    if (ok) pontuados.push({ a, total });
  });
  pontuados.sort((x, y) => x.total - y.total);
  return { itens: pontuados.map(x => x.a), via: 'aproximada' };
}

if (typeof module !== 'undefined') module.exports = { buscarAlimentos, expandirConsulta };
