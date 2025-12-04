
import { Category, StoreSettings, WeeklySchedule } from './types';

const DEFAULT_SCHEDULE: WeeklySchedule = {
  monday: { isOpen: true, intervals: [{ start: '18:00', end: '23:00' }] },
  tuesday: { isOpen: true, intervals: [{ start: '18:00', end: '23:00' }] },
  wednesday: { isOpen: true, intervals: [{ start: '18:00', end: '23:00' }] },
  thursday: { isOpen: true, intervals: [{ start: '18:00', end: '23:00' }] },
  friday: { isOpen: true, intervals: [{ start: '18:00', end: '23:59' }] },
  saturday: { isOpen: true, intervals: [{ start: '18:00', end: '23:59' }] },
  sunday: { isOpen: true, intervals: [{ start: '18:00', end: '23:00' }] },
};

// Default Settings (Fallback)
export const DEFAULT_SETTINGS: StoreSettings = {
  name: 'Spagnolli Pizzaria',
  logoUrl: '/logo.png',
  faviconUrl: '',
  whatsapp: '5511999147399',
  address: 'Av. Itália, 112 - Centro, Itupeva - SP',
  cnpj: '',
  openingHours: 'Aberto todos os dias das 18h às 23h', // Fallback text
  schedule: DEFAULT_SCHEDULE,
  phones: ['4496-4188', '4496-4186', '(11) 99914-7399'],
  paymentMethods: ['Dinheiro', 'PIX', 'Cartão de Crédito', 'Cartão de Débito'],
  deliveryRegions: [
    { 
      id: 'itupeva-geral', 
      name: 'Itupeva (Geral)', 
      price: 7.00, 
      zipRules: ['13295'],
      zipExclusions: [],
      neighborhoods: ['Jardim Primavera', 'Santa Fé']
    },
    { 
      id: 'centro', 
      name: 'Centro (Itupeva)', 
      price: 5.00,
      zipRules: ['13295000-13295299'], 
      zipExclusions: [],
      neighborhoods: ['Centro', 'Jardim São Vicente']
    }
  ],
  enableGuide: true,
  freeShipping: false,
  
  // New Phase 1 & 2 Defaults
  currencySymbol: 'R$',
  timezone: 'America/Sao_Paulo',
  colors: {
    primary: '#C8102E', // Standard Italian Red
    secondary: '#008C45', // Standard Italian Green
    
    // Independent Modes
    modes: {
      light: {
        background: '#f5f5f4', // Stone 100
        cardBackground: '#ffffff',
        text: '#292524', // Stone 800
        cardText: '#1c1917', // Stone 900
        border: '#e7e5e4' // Stone 200
      },
      dark: {
        background: '#0c0a09', // Stone 950
        cardBackground: '#1c1917', // Stone 900
        text: '#f5f5f4', // Stone 100
        cardText: '#ffffff',
        border: '#292524' // Stone 800
      }
    }
  },

  seoTitle: 'Spagnolli Pizzaria - Cardápio Digital',
  seoDescription: 'Peça as melhores pizzas e esfihas de Itupeva diretamente pelo nosso cardápio digital. Rápido, fácil e delicioso!',
  seoBannerUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=1200&auto=format&fit=crop',
  
  // Social Media Defaults
  instagram: '',
  facebook: '',
  youtube: '',
  googleBusiness: '',
  
  enableTableOrder: true, 

  openaiApiKey: '',
  aiSystemPrompt: ''
};

export const WHATSAPP_NUMBER = DEFAULT_SETTINGS.whatsapp; 
export const LOGO_URL = DEFAULT_SETTINGS.logoUrl; 

// Image Constants
const IMG_PROMO = 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?q=80&w=800&auto=format&fit=crop';
const IMG_ESFIHA_MEAT = 'https://images.unsplash.com/photo-1613564834361-9436948817d1?q=80&w=800&auto=format&fit=crop';
const IMG_ESFIHA_CHEESE = 'https://images.unsplash.com/photo-1528137871618-79d2761e3fd5?q=80&w=800&auto=format&fit=crop';
const IMG_PIZZA_TRADITIONAL = 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?q=80&w=800&auto=format&fit=crop';
const IMG_PIZZA_PEPPERONI = 'https://images.unsplash.com/photo-1628840042765-356cda07504e?q=80&w=800&auto=format&fit=crop';
const IMG_PIZZA_VEGGIE = 'https://images.unsplash.com/photo-1566843972021-9530525c3f1a?q=80&w=800&auto=format&fit=crop';
const IMG_PIZZA_CHICKEN = 'https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=800&auto=format&fit=crop';
const IMG_BEIRUTE = 'https://images.unsplash.com/photo-1559466273-d95e71deb17d?q=80&w=800&auto=format&fit=crop';
const IMG_SWEET = 'https://images.unsplash.com/photo-1605436247078-f0ef43ee8d5c?q=80&w=800&auto=format&fit=crop';
const IMG_SWEET_PIZZA = 'https://images.unsplash.com/photo-1588315029754-2dd089d39a1a?q=80&w=800&auto=format&fit=crop';
const IMG_DRINKS = 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?q=80&w=800&auto=format&fit=crop';

// Fallback images for categories
export const CATEGORY_IMAGES: Record<string, string> = {
  'promocoes': 'https://cdn-icons-png.flaticon.com/512/726/726476.png', 
  'esfihas': IMG_ESFIHA_MEAT,
  'esfihas-doces': IMG_SWEET,
  'beirutes': IMG_BEIRUTE,
  'pizzas-salgadas': IMG_PIZZA_PEPPERONI,
  'pizzas-doces': IMG_SWEET_PIZZA,
  'bebidas': IMG_DRINKS
};

export const MENU_DATA: Category[] = [
  {
    id: 'promocoes',
    name: 'Promoções',
    image: 'https://images.unsplash.com/photo-1607082349566-187342175e2f?q=80&w=400&auto=format&fit=crop', // Gift/Promo box
    items: [
      {
        id: 999,
        name: 'Promoção do Dia',
        description: 'Consulte nossas promoções de Segunda a Quinta-feira (Exceto feriados).',
        price: 0,
        category: 'promocoes',
        image: IMG_PROMO
      }
    ]
  },
  {
    id: 'esfihas',
    name: 'Esfihas',
    image: IMG_ESFIHA_MEAT,
    items: [
      { id: 901, code: '901', name: 'Carne', description: 'Tradicional de carne', price: 8.00, category: 'esfihas', image: IMG_ESFIHA_MEAT },
      { id: 902, code: '902', name: 'Carne e Mussarela', description: 'Carne com cobertura de mussarela', price: 9.00, category: 'esfihas', image: IMG_ESFIHA_MEAT },
      { id: 903, code: '903', name: 'Carne e Catupiry', description: 'Carne com cobertura de catupiry', price: 9.00, category: 'esfihas', image: IMG_ESFIHA_MEAT },
      { id: 944, code: '944', name: 'Carne e Cheddar', description: 'Carne com cobertura de cheddar', price: 9.00, category: 'esfihas', image: IMG_ESFIHA_MEAT },
      { id: 904, code: '904', name: 'Calabresa', description: 'Calabresa moída', price: 8.00, category: 'esfihas', image: IMG_ESFIHA_MEAT },
      { id: 905, code: '905', name: 'Calabresa e Mussarela', description: 'Calabresa com cobertura de mussarela', price: 9.00, category: 'esfihas', image: IMG_ESFIHA_MEAT },
      { id: 907, code: '907', name: 'Frango', description: 'Frango temperado', price: 8.00, category: 'esfihas', image: IMG_ESFIHA_MEAT },
      { id: 908, code: '908', name: 'Frango e Mussarela', description: 'Frango com mussarela', price: 9.00, category: 'esfihas', image: IMG_ESFIHA_MEAT },
      { id: 909, code: '909', name: 'Frango e Catupiry', description: 'Frango com catupiry', price: 9.00, category: 'esfihas', image: IMG_ESFIHA_MEAT },
      { id: 910, code: '910', name: 'Mussarela', description: 'Queijo mussarela derretido', price: 8.00, category: 'esfihas', image: IMG_ESFIHA_CHEESE },
      { id: 911, code: '911', name: 'Catupiry', description: 'Requeijão cremoso', price: 9.00, category: 'esfihas', image: IMG_ESFIHA_CHEESE },
      { id: 914, code: '914', name: 'Brócolis', description: 'Brócolis temperado', price: 8.00, category: 'esfihas', image: IMG_ESFIHA_CHEESE },
      { id: 915, code: '915', name: 'Brócolis, Bacon e Mussarela', description: 'Brócolis, bacon e mussarela', price: 9.00, category: 'esfihas', image: IMG_ESFIHA_CHEESE },
      { id: 917, code: '917', name: 'Palmito c/ Mussarela', description: 'Palmito coberto com mussarela', price: 9.00, category: 'esfihas', image: IMG_ESFIHA_CHEESE },
      { id: 919, code: '919', name: 'Bacon', description: 'Bacon crocante', price: 9.00, category: 'esfihas', image: IMG_ESFIHA_MEAT },
      { id: 925, code: '925', name: 'Atum com cebola', description: 'Atum sólido com cebola', price: 9.00, category: 'esfihas', image: IMG_ESFIHA_MEAT },
      { id: 939, code: '939', name: 'Escarola', description: 'Escarola refogada', price: 8.00, category: 'esfihas', image: IMG_ESFIHA_CHEESE },
      { id: 940, code: '940', name: 'Escarola, Bacon e Mussarela', description: 'Escarola, bacon e mussarela', price: 9.00, category: 'esfihas', image: IMG_ESFIHA_CHEESE },
    ]
  },
  {
    id: 'esfihas-doces',
    name: 'Esfihas Doces',
    image: IMG_SWEET,
    items: [
      { id: 920, code: '920', name: 'Chocolate', description: 'Esfiha de chocolate', price: 10.00, category: 'esfihas-doces', image: IMG_SWEET },
      { id: 921, code: '921', name: 'Chocolate c/ Confete', description: 'Chocolate com confetes coloridos', price: 10.00, category: 'esfihas-doces', image: IMG_SWEET },
      { id: 922, code: '922', name: 'Doce de Leite', description: 'Doce de leite cremoso', price: 10.00, category: 'esfihas-doces', image: IMG_SWEET },
      { id: 923, code: '923', name: 'Banana', description: 'Banana, leite condensado e canela', price: 10.00, category: 'esfihas-doces', image: IMG_SWEET },
      { id: 924, code: '924', name: 'Prestígio', description: 'Chocolate com coco ralado', price: 10.00, category: 'esfihas-doces', image: IMG_SWEET },
      { id: 935, code: '935', name: 'Chocolate c/ Morango', description: 'Chocolate com pedaços de morango', price: 10.00, category: 'esfihas-doces', image: IMG_SWEET },
      { id: 942, code: '942', name: 'Romeu e Julieta', description: 'Mussarela ou catupiry com goiabada', price: 10.00, category: 'esfihas-doces', image: IMG_SWEET },
      { id: 943, code: '943', name: 'Chocolate c/ Banana', description: 'Chocolate com banana', price: 10.00, category: 'esfihas-doces', image: IMG_SWEET },
    ]
  },
  {
    id: 'beirutes',
    name: 'Beirutes',
    image: IMG_BEIRUTE,
    items: [
      { id: 94, code: '94', name: 'Calabresa', description: 'Calabresa, ovo, alface, tomate, mussarela e catupiry', price: 54.00, category: 'beirutes', image: IMG_BEIRUTE },
      { id: 95, code: '95', name: 'Peito de Peru', description: 'Peito de peru, ovo, alface, tomate, mussarela e catupiry', price: 54.00, category: 'beirutes', image: IMG_BEIRUTE },
      { id: 96, code: '96', name: 'Lombo', description: 'Lombo, ovo, alface, tomate, mussarela e catupiry', price: 54.00, category: 'beirutes', image: IMG_BEIRUTE },
      { id: 97, code: '97', name: 'Presunto', description: 'Presunto, ovo, alface, tomate, mussarela e catupiry', price: 54.00, category: 'beirutes', image: IMG_BEIRUTE },
      { id: 98, code: '98', name: 'Frango', description: 'Frango desfiado, ovo, alface, tomate, mussarela e catupiry', price: 54.00, category: 'beirutes', image: IMG_BEIRUTE },
      { id: 99, code: '99', name: 'Filé Mignon', description: 'Tiras de filé mignon, ovo, alface, tomate, mussarela e catupiry', price: 69.00, category: 'beirutes', image: IMG_BEIRUTE },
    ]
  },
  {
    id: 'pizzas-salgadas',
    name: 'Pizzas Salgadas',
    image: IMG_PIZZA_PEPPERONI,
    items: [
      // Queijos
      { id: 2, code: '02', name: 'Mussarela', description: 'Mussarela e orégano', price: 57.00, category: 'pizzas-salgadas', image: IMG_PIZZA_TRADITIONAL },
      { id: 3, code: '03', name: '2 Queijos', description: 'Mussarela coberta com catupiry', price: 64.00, category: 'pizzas-salgadas', image: IMG_PIZZA_TRADITIONAL },
      { id: 4, code: '04', name: '3 Queijos', description: 'Mussarela, catupiry e parmesão ralado', price: 67.00, category: 'pizzas-salgadas', image: IMG_PIZZA_TRADITIONAL },
      { id: 6, code: '06', name: '5 Queijos', description: 'Mussarela, catupiry, parmesão, provolone e gorgonzola', price: 71.00, category: 'pizzas-salgadas', image: IMG_PIZZA_TRADITIONAL },
      { id: 9, code: '09', name: 'Marguerita', description: 'Mussarela, manjericão, tomate em rodelas e parmesão ralado', price: 65.00, category: 'pizzas-salgadas', image: IMG_PIZZA_TRADITIONAL },
      { id: 10, code: '10', name: 'Milho Verde', description: 'Mussarela e milho', price: 63.00, category: 'pizzas-salgadas', image: IMG_PIZZA_VEGGIE },
      
      // Calabresa
      { id: 12, code: '12', name: 'Calabresa', description: 'Calabresa fatiada e cebola', price: 57.00, category: 'pizzas-salgadas', image: IMG_PIZZA_PEPPERONI },
      { id: 13, code: '13', name: 'Calabresa com Catupiry', description: 'Calabresa fatiada, cebola e catupiry', price: 65.00, category: 'pizzas-salgadas', image: IMG_PIZZA_PEPPERONI },
      { id: 14, code: '14', name: 'Baiana', description: 'Calabresa moída apimentada, ovos e cebola', price: 60.00, category: 'pizzas-salgadas', image: IMG_PIZZA_PEPPERONI },
      { id: 15, code: '15', name: 'Baianinha', description: 'Calabresa moída, mussarela e ovos', price: 62.00, category: 'pizzas-salgadas', image: IMG_PIZZA_PEPPERONI },
      { id: 16, code: '16', name: 'Toscana', description: 'Calabresa fatiada, mussarela, alho frito e cebola', price: 65.00, category: 'pizzas-salgadas', image: IMG_PIZZA_PEPPERONI },
      
      // Bacon
      { id: 20, code: '20', name: 'Bacon', description: 'Bacon, ovos cozidos, coberto com mussarela', price: 64.00, category: 'pizzas-salgadas', image: IMG_PIZZA_TRADITIONAL },
      { id: 21, code: '21', name: 'Siciliana', description: 'Bacon, mussarela, champignon e palmito', price: 65.00, category: 'pizzas-salgadas', image: IMG_PIZZA_TRADITIONAL },

      // Frango
      { id: 22, code: '22', name: 'Frango', description: 'Frango desfiado coberto com catupiry', price: 65.00, category: 'pizzas-salgadas', image: IMG_PIZZA_CHICKEN },
      { id: 23, code: '23', name: 'Frangó', description: 'Frango desfiado, milho verde coberto com mussarela', price: 66.00, category: 'pizzas-salgadas', image: IMG_PIZZA_CHICKEN },
      { id: 24, code: '24', name: 'Carijó', description: 'Frango desfiado, milho verde coberto com catupiry', price: 66.00, category: 'pizzas-salgadas', image: IMG_PIZZA_CHICKEN },
      { id: 25, code: '25', name: 'Caipira', description: 'Frango desfiado, palmito, ovos, ervilha coberto com mussarela', price: 68.00, category: 'pizzas-salgadas', image: IMG_PIZZA_CHICKEN },

      // Lombo & Presunto
      { id: 26, code: '26', name: 'Lombo Canadense', description: 'Lombo canadense e cebola', price: 57.00, category: 'pizzas-salgadas', image: IMG_PIZZA_TRADITIONAL },
      { id: 37, code: '37', name: 'Portuguesa', description: 'Presunto, mussarela, ovos, palmito, ervilha e cebola', price: 66.00, category: 'pizzas-salgadas', image: IMG_PIZZA_TRADITIONAL },
      { id: 38, code: '38', name: 'Francesa', description: 'Presunto, mussarela, ovos, cebola coberta com catupiry', price: 66.00, category: 'pizzas-salgadas', image: IMG_PIZZA_TRADITIONAL },
      
      // Especiais
      { id: 43, code: '43', name: 'Pepperoni', description: 'Salame tipo pepperoni, mussarela e provolone', price: 68.00, category: 'pizzas-salgadas', image: IMG_PIZZA_PEPPERONI },
      { id: 44, code: '44', name: 'Aliche', description: 'Aliche e mussarela', price: 68.00, category: 'pizzas-salgadas', image: IMG_PIZZA_TRADITIONAL },
      { id: 47, code: '47', name: 'Modinha', description: 'Atum, palmito, ovos, cebola, coberta com mussarela', price: 68.00, category: 'pizzas-salgadas', image: IMG_PIZZA_TRADITIONAL },
      { id: 49, code: '49', name: 'Tomate Seco', description: 'Tomate seco, mussarela de búfala e rúcula', price: 67.00, category: 'pizzas-salgadas', image: IMG_PIZZA_VEGGIE },
      { id: 50, code: '50', name: 'Escarola', description: 'Escarola, bacon, coberta com mussarela', price: 65.00, category: 'pizzas-salgadas', image: IMG_PIZZA_VEGGIE },
      { id: 93, code: '93', name: 'Moda do Pizzaiolo', description: 'Presunto, palmito, ervilha, cebola, bacon, catupiry e parmesão', price: 76.00, category: 'pizzas-salgadas', image: IMG_PIZZA_TRADITIONAL },
    ]
  },
  {
    id: 'pizzas-doces',
    name: 'Pizzas Doces',
    image: IMG_SWEET_PIZZA,
    items: [
      { id: 56, code: '56', name: 'Chocolate', description: 'Creme de chocolate coberto com chocolate granulado', price: 67.00, category: 'pizzas-doces', image: IMG_SWEET_PIZZA },
      { id: 57, code: '57', name: 'Chocolate com Morango', description: 'Creme de chocolate coberto com morangos (da época)', price: 67.00, category: 'pizzas-doces', image: IMG_SWEET_PIZZA },
      { id: 58, code: '58', name: 'Prestígio', description: 'Creme de chocolate coberto com coco ralado', price: 67.00, category: 'pizzas-doces', image: IMG_SWEET_PIZZA },
      { id: 60, code: '60', name: 'Romeu e Julieta', description: 'Mussarela ou catupiry, coberto com goiabada cremosa', price: 67.00, category: 'pizzas-doces', image: IMG_SWEET_PIZZA },
      { id: 68, code: '68', name: 'Doce de Leite', description: 'Doce de leite, banana e canela', price: 67.00, category: 'pizzas-doces', image: IMG_SWEET_PIZZA },
      { id: 73, code: '73', name: 'Chocolate com Banana', description: 'Creme de chocolate com banana', price: 67.00, category: 'pizzas-doces', image: IMG_SWEET_PIZZA },
      { id: 74, code: '74', name: 'Chocolate com Confete', description: 'Creme de chocolate com confetes', price: 67.00, category: 'pizzas-doces', image: IMG_SWEET_PIZZA },
      { id: 67, code: '67', name: 'Chocolate com Avelã', description: 'Creme de chocolate com avelã e leite ninho', price: 72.00, category: 'pizzas-doces', image: IMG_SWEET_PIZZA },
    ]
  },
  {
    id: 'bebidas',
    name: 'Bebidas',
    image: IMG_DRINKS,
    items: [
      { id: 1001, name: 'Refrigerante 2L', description: 'Coca-Cola, Guaraná, Fanta (Sabor a escolher)', price: 16.00, category: 'bebidas', image: IMG_DRINKS },
      { id: 1002, name: 'Refrigerante Lata', description: '350ml - Variados', price: 7.00, category: 'bebidas', image: IMG_DRINKS },
      { id: 1003, name: 'Água Mineral', description: '500ml', price: 4.00, category: 'bebidas', image: IMG_DRINKS },
      { id: 1004, name: 'Cerveja Lata', description: '350ml - Variadas', price: 8.00, category: 'bebidas', image: IMG_DRINKS },
    ]
  }
];