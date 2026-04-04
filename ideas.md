# Brainstorming de Design - AchaShop (Loja Estilo Shopee)

<response>
<text>

## Ideia 1: "Bazaar Digital" — Maximalismo Vibrante

**Design Movement:** Maximalismo Pop com influência de marketplaces asiáticos (Shopee, Taobao). Energia visual alta, muita informação na tela, sensação de "feira digital" onde tudo é uma oportunidade.

**Core Principles:**
1. Densidade informacional controlada — muitos produtos visíveis, mas com hierarquia clara
2. Urgência visual — elementos que comunicam escassez e oportunidade (timers, badges, selos)
3. Navegação por descoberta — o usuário "passeia" pela loja como num bazar

**Color Philosophy:** Laranja Shopee (#EE4D2D) como cor dominante que transmite energia, urgência e acessibilidade. Branco (#FFFFFF) como respiro visual nos cards. Cinza claro (#F5F5F5) como fundo neutro. Amarelo (#FFD700) para estrelas e destaques de promoção. Verde (#00BFA5) para selos de frete grátis. A paleta é quente e convidativa, evocando a sensação de "achado imperdível".

**Layout Paradigm:** Layout em cascata vertical com seções empilhadas — carrossel hero full-width, faixa de categorias horizontal scrollável, seção de flash sale com scroll horizontal, e grid de produtos denso (2 cols mobile, 5 cols desktop). Cada seção tem identidade visual própria mas flui naturalmente.

**Signature Elements:**
1. Badges flutuantes nos cards (% OFF, Frete Grátis) com cantos arredondados e cores vibrantes
2. Barra de pesquisa oversized no header com sugestões animadas
3. Sticky bottom bar no mobile com ícones de Home, Categorias, Carrinho

**Interaction Philosophy:** Tudo é clicável e responsivo. Hover nos cards eleva com sombra. Transições rápidas (150ms) para sensação de agilidade. Feedback visual imediato ao adicionar ao carrinho (badge pulsa).

**Animation:** Cards aparecem com fade-in escalonado ao scroll. Carrossel com transição suave de slide. Badge do carrinho faz "bounce" ao adicionar item. Botões de CTA têm micro-animação de scale no hover. Timer de ofertas pulsa sutilmente.

**Typography System:** Fonte principal Nunito Sans (bold para títulos, regular para corpo) — arredondada e amigável. Preços em fonte extra-bold e tamanho grande. Hierarquia: H1 (28px bold), H2 (22px semibold), preço (20px extrabold), corpo (14px regular), meta (12px light).

</text>
<probability>0.08</probability>
</response>

<response>
<text>

## Ideia 2: "Clean Commerce" — Minimalismo Funcional com Sotaque Laranja

**Design Movement:** Minimalismo Escandinavo aplicado ao e-commerce, com a cor laranja Shopee usada cirurgicamente como acento. Menos é mais, mas cada elemento tem propósito.

**Core Principles:**
1. Clareza absoluta — cada elemento tem uma função clara e nada é decorativo sem propósito
2. Espaço como luxo — whitespace generoso que dá respiro e destaca os produtos
3. Hierarquia tipográfica forte — a informação se organiza pela tipografia, não por boxes

**Color Philosophy:** Fundo branco puro (#FFFFFF) dominante. Laranja (#EE4D2D) usado apenas em CTAs, preços e o header — funciona como "farol" que guia o olho. Cinza escuro (#333333) para textos. Cinza médio (#999999) para informações secundárias. A contenção cromática faz o laranja "gritar" onde importa.

**Layout Paradigm:** Grid assimétrico com hero section ocupando 60% da tela e sidebar de categorias em 40%. Produtos em grid uniforme com espaçamento generoso (gap-6). Seções separadas por linhas finas, não por backgrounds coloridos. Mobile usa layout de lista vertical com cards largos.

**Signature Elements:**
1. Header ultra-limpo com logo minimalista, search bar com bordas finas e ícones outline
2. Cards de produto sem borda, apenas sombra sutil, com hover que revela botão "Adicionar"
3. Preços em tipografia display bold sem decoração — o número fala por si

**Interaction Philosophy:** Interações sutis e elegantes. Hover revela informações extras com transição suave. Micro-interações discretas. A experiência é calma e confiável, como uma loja premium.

**Animation:** Transições de página com fade (200ms). Cards com hover lift sutil (translateY -2px). Carrossel com transição crossfade. Skeleton loading para produtos. Sem animações chamativas.

**Typography System:** DM Sans para headings (geométrica, moderna) e Inter para corpo. Preços em DM Sans Black. Hierarquia baseada em peso e tamanho, sem cores extras. H1 (32px bold), preço (24px black), corpo (15px regular).

</text>
<probability>0.04</probability>
</response>

<response>
<text>

## Ideia 3: "Neon Bazaar" — E-commerce Gamificado com Energia Shopee

**Design Movement:** Neo-Brutalism misturado com estética de app gaming/reward. Bordas marcadas, cores saturadas, sensação de que comprar é um jogo e cada produto é um "drop".

**Core Principles:**
1. Gamificação visual — comprar parece colecionar, cada ação tem recompensa visual
2. Contraste máximo — elementos se destacam com bordas grossas e sombras duras
3. Dinamismo constante — a página nunca parece estática, sempre há movimento

**Color Philosophy:** Laranja (#EE4D2D) como base energética. Preto (#1A1A1A) para bordas e contrastes brutais. Amarelo (#FFE135) para highlights e "coins". Branco para cards. Rosa (#FF6B81) para badges de "novo". A paleta é ousada e jovem, targeting Gen Z.

**Layout Paradigm:** Blocos empilhados com bordas visíveis (2px solid black). Hero section com texto oversized e imagem recortada. Grid de produtos com tamanhos variados (masonry-like). Seções com backgrounds alternando entre branco e laranja claro. Mobile-first com cards full-width empilhados.

**Signature Elements:**
1. Badges com borda preta grossa e rotação sutil (-2deg) — estilo "sticker"
2. Botões com sombra dura (4px offset, preto) que "afundam" ao clicar
3. Contador de "coins/pontos" no header como elemento de gamificação

**Interaction Philosophy:** Cliques são satisfatórios — botões "afundam" com transform. Adicionar ao carrinho dispara confetti sutil. Scroll revela produtos com animação de "drop". A experiência é divertida e viciante.

**Animation:** Entrance animations com slide-up + fade para cada card. Botões com active state que simula "press" (translateY 2px, sombra reduz). Carrossel com efeito de "card stack". Números de preço com animação de contagem. Shake sutil no ícone do carrinho ao adicionar.

**Typography System:** Space Grotesk para headings (geométrica, bold, moderna) e Outfit para corpo. Preços em Space Grotesk Black com tamanho oversized. Tags em uppercase com letter-spacing. H1 (36px black), preço (26px black), corpo (14px medium).

</text>
<probability>0.03</probability>
</response>

---

## Decisão: Ideia 1 — "Bazaar Digital" (Maximalismo Vibrante)

A Ideia 1 é a que mais se aproxima da experiência real da Shopee e do conceito de "achadinhos" solicitado pelo usuário. O maximalismo controlado, a densidade de produtos, os badges vibrantes e a sensação de "feira digital" são exatamente o que define a Shopee. A paleta quente com laranja dominante e os elementos de urgência (timers, selos) criam a atmosfera perfeita de marketplace de ofertas.
