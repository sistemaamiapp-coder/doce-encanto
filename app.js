/* ============================================================
   Amor em Pedaços — loja + painel administrativo
   Dados persistidos em localStorage. Publicação estática (GitHub Pages).
   ============================================================ */
'use strict';

/* ------------------------------------------------------------
   1. Helpers
   ------------------------------------------------------------ */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));

const icon = (name, cls = '') => `<svg class="${cls}" aria-hidden="true"><use href="#i-${name}"></use></svg>`;
const money = (n) => (Number(n) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const num = (v, fallback = 0) => {
  if (typeof v === 'number' && isFinite(v)) return v;
  const parsed = parseFloat(String(v ?? '').replace(',', '.'));
  return isFinite(parsed) ? parsed : fallback;
};
const uid = (prefix = 'id') => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
const pad = (n) => String(n).padStart(2, '0');
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
const digits = (v) => String(v || '').replace(/\D/g, '');
const dateKey = (v) => {
  const d = new Date(v);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const todayKey = () => dateKey(new Date());
const fmtDateTime = (v) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(v));
const fmtTime = (v) => new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(v));
const fmtDate = (v) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(v));
const fmtDayLong = (v) => new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }).format(new Date(v));
const dateInput = (v) => {
  const d = new Date(v);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d; };
const pct = (a, b) => (b > 0 ? ((a - b) / b) * 100 : (a > 0 ? 100 : 0));
const starRow = (rating, max = 5) => {
  let html = '';
  for (let i = 1; i <= max; i += 1) html += icon('star', i <= Math.round(rating) ? '' : 'off');
  return `<span class="stars">${html}</span>`;
};

const DB_KEY = 'doceEncanto.db.v1';
const CART_KEY = 'doceEncanto.cart.v1';
const FAV_KEY = 'doceEncanto.favs.v1';
const MY_KEY = 'doceEncanto.myorders.v1';
const CUST_KEY = 'doceEncanto.customer.v1';
const SESSION_KEY = 'doceEncanto.session.v1';
const PIN_KEY = 'doceEncanto.pin.v1';
const ADMIN_TAB_KEY = 'doceEncanto.adminTab.v1';
const GEO_KEY = 'doceEncanto.geo.v1';

/* Banco online (Supabase). A chave publicável é pública por design. */
const CLOUD_URL = 'https://uanrqgnsrfvcxdwtenjy.supabase.co';
const CLOUD_KEY = 'sb_publishable_fG0B8csKs73RiZwcEQoOAg_zT_Jx2jE';

const APP_IMAGES = [
  'assets/img/hero-amor.jpg', 'assets/img/bolo-morango.jpg', 'assets/img/bolo-natal.jpg',
  'assets/img/torta-nozes.jpg', 'assets/img/doces-finos.jpg', 'assets/img/torta-holandesa.jpg',
  'assets/img/torta-limao.jpg', 'assets/img/cheesecake.jpg', 'assets/img/brigadeiro.jpg',
  'assets/img/hero-confeitaria.jpg', 'assets/img/bolo-chocolate.jpg', 'assets/img/bolo-redvelvet.jpg',
  'assets/img/bolo-cenoura.jpg', 'assets/img/naked-cake.jpg', 'assets/img/fatia-chocolate.jpg',
  'assets/img/fatia-redvelvet.jpg', 'assets/img/empadao-frango.jpg', 'assets/img/empadao-palmito.jpg',
  'assets/img/empadinha.jpg', 'assets/img/coxinha.jpg', 'assets/img/bebida.jpg'
];
const DEFAULT_GALLERY = APP_IMAGES.slice(0, 12);

const PAY_LABEL = { pix: 'Pix', card: 'Cartão (débito ou crédito)', cash: 'Dinheiro' };
const TYPE_LABEL = { delivery: 'Entrega', pickup: 'Retirada' };
const STATUS_LABEL = {
  novo: 'Novo', preparo: 'Em preparo', pronto: 'Pronto', entrega: 'Em rota',
  concluido: 'Concluído', cancelado: 'Cancelado'
};
const STATUS_LIST = ['novo', 'preparo', 'pronto', 'entrega', 'concluido', 'cancelado'];
const WEEK = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

/* ------------------------------------------------------------
   2. Dados iniciais
   ------------------------------------------------------------ */
const DEFAULT_HOURS = [null, ['09:00', '19:00'], ['09:00', '19:00'], ['09:00', '19:00'], ['09:00', '19:00'], ['09:00', '19:00'], ['09:00', '19:00']];

function seedData() {
  const at = (d, h, m) => {
    const x = new Date();
    x.setDate(x.getDate() - d);
    x.setHours(h, m, 0, 0);
    return x.toISOString();
  };

  const categories = [
    { id: 'tortas', name: 'Tortas', icon: 'pie' },
    { id: 'bolos', name: 'Bolos', icon: 'cake' },
    { id: 'cheesecakes', name: 'Cheesecakes', icon: 'slice' },
    { id: 'docesfinos', name: 'Doces finos', icon: 'candy' },
    { id: 'natal', name: 'Especial de Natal', icon: 'spark' }
  ];

  const boloSizes = [
    { name: 'Pequeno · serve 8', delta: -20 },
    { name: 'Médio · serve 12', delta: 0 },
    { name: 'Grande · serve 20', delta: 35 }
  ];
  const boloExtras = [
    { name: 'Velas + pratinhos', price: 0 },
    { name: 'Recheio extra de brigadeiro', price: 12 },
    { name: 'Morangos frescos', price: 15 }
  ];
  const tortaSizes = [
    { name: 'Inteira · serve 10', delta: 0 },
    { name: 'Grande · serve 16', delta: 30 }
  ];

  const products = [
    {
      id: 'p-torta-chocolate', cat: 'tortas', name: 'Torta de Chocolate Belga',
      desc: 'Ganache 70% cacau, biscuit de amêndoas e flor de sal.',
      price: 89.9, promo: null, img: 'assets/img/torta-holandesa.jpg',
      active: true, featured: true, badge: 'Mais pedida', sold: 148,
      sizes: tortaSizes,
      extras: [{ name: 'Calda extra de chocolate', price: 8 }, { name: 'Embalagem de presente', price: 6 }]
    },
    {
      id: 'p-bolo-morango', cat: 'bolos', name: 'Bolo de Morango com Chantilly',
      desc: 'Massa fofinha, morangos frescos e chantilly artesanal.',
      price: 119, promo: null, img: 'assets/img/bolo-morango.jpg',
      active: true, featured: true, badge: 'Destaque', sold: 96,
      sizes: boloSizes, extras: boloExtras
    },
    {
      id: 'p-torta-limao', cat: 'tortas', name: 'Torta de Limão Merengada',
      desc: 'Creme de limão siciliano com merengue maçaricado.',
      price: 79.9, promo: null, img: 'assets/img/torta-limao.jpg',
      active: true, featured: false, badge: 'Novidade', sold: 74,
      sizes: tortaSizes,
      extras: [{ name: 'Embalagem de presente', price: 6 }]
    },
    {
      id: 'p-cheesecake', cat: 'cheesecakes', name: 'Cheesecake de Frutas Vermelhas',
      desc: 'Base crocante, creme aveludado e compota de frutas vermelhas.',
      price: 95, promo: null, img: 'assets/img/cheesecake.jpg',
      active: true, featured: true, badge: 'Novidade', sold: 112,
      sizes: tortaSizes,
      extras: [{ name: 'Calda extra de frutas vermelhas', price: 7 }]
    },
    {
      id: 'p-bolo-natal', cat: 'natal', name: 'Bolo de Natal com Frutas Cristalizadas',
      desc: 'Especiarias, frutas maceradas e glacê de laranja. Edição limitada.',
      price: 139, promo: null, img: 'assets/img/bolo-natal.jpg',
      active: true, featured: true, badge: 'Sazonal', sold: 43,
      sizes: boloSizes,
      extras: [{ name: 'Embalagem de presente', price: 0 }, { name: 'Cartão escrito à mão', price: 0 }]
    },
    {
      id: 'p-torta-nozes', cat: 'natal', name: 'Torta de Nozes com Doce de Leite',
      desc: 'Nozes caramelizadas e doce de leite artesanal. Só no cardápio de Natal.',
      price: 149, promo: null, img: 'assets/img/torta-nozes.jpg',
      active: true, featured: false, badge: 'Novidade', sold: 38,
      sizes: tortaSizes,
      extras: [{ name: 'Embalagem de presente', price: 6 }]
    },
    {
      id: 'p-caixa-doces', cat: 'docesfinos', name: 'Caixa de Doces Finos',
      desc: 'Seleção artesanal de brigadeiro belga, beijinho e casadinho de amêndoas.',
      price: 72, promo: null, img: 'assets/img/doces-finos.jpg',
      active: true, featured: false, badge: 'Para presentear', sold: 57,
      sizes: [],
      extras: [{ name: 'Cartão com mensagem', price: 0 }, { name: 'Laço de cetim', price: 5 }]
    },
    {
      id: 'p-brigadeiro', cat: 'docesfinos', name: 'Brigadeiro Belga',
      desc: 'Ganache 70% cacau enrolada à mão e granulado belga.',
      price: 6.5, promo: null, img: 'assets/img/brigadeiro.jpg',
      active: true, featured: false, badge: '', sold: 186,
      sizes: [],
      extras: [{ name: 'Caixa com 6', price: 32 }, { name: 'Caixa com 12', price: 58 }]
    }
  ];

  const item = (productId, name, qty, price, options = '') => ({ productId, name, qty, price, options });

  const mkOrder = (code, d, h, m, status, name, phone, type, payment, items, extra = {}) => {
    const subtotal = +(items.reduce((a, i) => a + i.price * i.qty, 0)).toFixed(2);
    const deliveryFee = extra.deliveryFee !== undefined ? extra.deliveryFee : (type === 'delivery' ? (subtotal >= 150 ? 0 : 12) : 0);
    const discount = extra.discount || 0;
    const total = +(subtotal + deliveryFee - discount).toFixed(2);
    return {
      id: `o-${code}`, code, createdAt: at(d, h, m), status, type, payment,
      customer: { name, phone, address: extra.address || '' },
      items, subtotal, deliveryFee, discount, coupon: extra.coupon || null, total,
      note: extra.note || '', changeFor: extra.changeFor || null, rated: !!extra.rated,
      statusHistory: [{ status, at: at(d, h, m) }]
    };
  };

  const orders = [
    mkOrder(1042, 0, 11, 42, 'preparo', 'Mariana Costa', '(11) 98812-4477', 'delivery', 'pix', [
      item('p-torta-chocolate', 'Torta de Chocolate Belga', 1, 89.9, 'Inteira · serve 10'),
      item('p-brigadeiro', 'Brigadeiro Belga', 2, 6.5, '')
    ], { address: 'Rua Harmonia, 214 · apto 32 — Vila Madalena' }),
    mkOrder(1041, 0, 10, 15, 'novo', 'Rafael Lima', '(11) 99120-3388', 'pickup', 'card', [
      item('p-bolo-morango', 'Bolo de Morango com Chantilly', 1, 119, 'Médio · serve 12'),
      item('p-brigadeiro', 'Brigadeiro Belga', 2, 6.5, '')
    ], { deliveryFee: 0 }),
    mkOrder(1040, 1, 18, 20, 'concluido', 'Rafael Souza', '(11) 99745-1020', 'delivery', 'pix', [
      item('p-torta-chocolate', 'Torta de Chocolate Belga', 1, 89.9, 'Inteira · serve 10')
    ], { address: 'Rua Girassol, 88 — Vila Madalena', rated: true }),
    mkOrder(1039, 2, 16, 5, 'concluido', 'Camila Prado', '(11) 98444-7781', 'delivery', 'card', [
      item('p-bolo-morango', 'Bolo de Morango com Chantilly', 1, 119, 'Médio · serve 12')
    ], { address: 'Rua Fradique Coutinho, 502 — Pinheiros', rated: true }),
    mkOrder(1038, 3, 12, 30, 'concluido', 'Marina Alves', '(11) 98330-5591', 'pickup', 'pix', [
      item('p-torta-limao', 'Torta de Limão Merengada', 1, 79.9, 'Inteira · serve 10')
    ], { deliveryFee: 0, rated: true }),
    mkOrder(1037, 4, 19, 5, 'cancelado', 'Bruna Alves', '(11) 99012-6633', 'delivery', 'card', [
      item('p-cheesecake', 'Cheesecake de Frutas Vermelhas', 1, 95, 'Inteira · serve 10')
    ], { address: 'Rua dos Pinheiros, 120 — Pinheiros' }),
    mkOrder(1036, 5, 15, 40, 'concluido', 'Juliana Melo', '(11) 99227-9090', 'delivery', 'pix', [
      item('p-torta-nozes', 'Torta de Nozes com Doce de Leite', 1, 149, 'Inteira · serve 10'),
      item('p-brigadeiro', 'Brigadeiro Belga', 1, 6.5, '')
    ], { address: 'Rua Purpurina, 45 — Vila Madalena', rated: true }),
    mkOrder(1035, 6, 10, 50, 'concluido', 'Renata Silva', '(11) 98821-3344', 'delivery', 'pix', [
      item('p-bolo-natal', 'Bolo de Natal com Frutas Cristalizadas', 1, 139, 'Médio · serve 12'),
      item('p-caixa-doces', 'Caixa de Doces Finos', 1, 72, '')
    ], { deliveryFee: 0, address: 'Rua Aspicuelta, 310 — Vila Madalena' })
  ];

  const reviews = [
    { id: 'r1', orderId: 'o-1040', name: 'Rafael Souza', rating: 5, text: 'A torta de chocolate belga é de outro mundo. Dá para sentir o cuidado em cada detalhe — chegou no dia, fresquinha e linda.', date: at(1, 20, 10) },
    { id: 'r2', orderId: 'o-1039', name: 'Camila Prado', rating: 5, text: 'Pedi o bolo de morango para o aniversário da minha mãe e foi o maior sucesso. Chantilly leve, morangos fresquinhos e uma embalagem impecável.', date: at(2, 19, 0) },
    { id: 'r3', orderId: 'o-1038', name: 'Marina Alves', rating: 4, text: 'A torta de limão merengada virou favorita da família. Equilíbrio perfeito entre o doce e o cítrico. Já encomendei de novo.', date: at(3, 14, 15) }
  ];

  return {
    version: 2,
    meta: { seq: 1043, createdAt: new Date().toISOString() },
    settings: {
      storeName: 'Amor em Pedaços',
      tagline: 'confeitaria artesanal',
      phone: '(11) 99999-0000',
      whatsapp: '5511999990000',
      instagram: '@amorempedacos',
      address: 'Rua das Flores, 128 — Vila Madalena, São Paulo/SP',
      deliveryFee: 12,
      freeFrom: 150,
      minOrder: 40,
      deliveryEnabled: true,
      deliveryRadiusKm: 8,
      storeLat: null,
      storeLng: null,
      geoAddress: '',
      etaMin: 60,
      etaMax: 120,
      openMode: 'open',
      hours: DEFAULT_HOURS.map((h) => (h ? [...h] : null)),
      payment: { pix: true, card: true, cash: true },
      pixKey: 'pedidos@amorempedacos.com.br',
      adminPin: '1234',
      hero: {
        badge: 'feito no dia',
        title: 'Cada fatia, um pedaço de amor.',
        subtitle: 'Começamos na cozinha de casa, com as receitas da vó Cida. Hoje assamos em pequenas fornadas todos os dias, com ingredientes frescos e sem conservantes.',
        image: 'assets/img/hero-amor.jpg',
        gallery: DEFAULT_GALLERY.slice()
      }
    },
    categories,
    products,
    coupons: [
      { id: 'c1', code: 'BEMVINDA10', type: 'percent', value: 10, minOrder: 40, active: true, uses: 38, limit: 0, expires: '2027-12-31' },
      { id: 'c2', code: 'FRETEGRATIS', type: 'shipping', value: 0, minOrder: 150, active: true, uses: 21, limit: 0, expires: '2027-12-31' },
      { id: 'c3', code: 'NATAL15', type: 'fixed', value: 15, minOrder: 120, active: true, uses: 9, limit: 50, expires: '2026-12-24' }
    ],
    orders,
    reviews
  };
}

/* ------------------------------------------------------------
   3. Estado
   ------------------------------------------------------------ */
let data = null;
const state = {
  cart: [],
  couponCode: null,
  search: '',
  favs: new Set(),
  customer: {},
  adminAuthed: false,
  adminTab: 'visao',
  orderFilter: 'todos',
  menuFilter: { q: '', cat: 'all' },
  chart: null,
  pendingConfirm: null,
  cloud: false,
  cloudCatalogEmpty: false,
  adminPin: '',
  cloudSyncTimer: null,
  adminTimer: null,
  report: { from: dateInput(daysAgo(30)), to: dateInput(new Date()) }
};

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) { return fallback; }
}

function normalizeSettings(s) {
  if (!s || typeof s !== 'object') return s;
  s.hero = s.hero || {};
  if (!Array.isArray(s.hero.gallery) || !s.hero.gallery.length) s.hero.gallery = DEFAULT_GALLERY.slice();
  s.hero.gallery = s.hero.gallery.filter((src) => typeof src === 'string' && src);
  if (!s.hero.gallery.length) s.hero.gallery = DEFAULT_GALLERY.slice();
  if (s.hero.image && !s.hero.gallery.includes(s.hero.image)) s.hero.gallery.unshift(s.hero.image);
  if (typeof s.deliveryEnabled !== 'boolean') s.deliveryEnabled = true;
  const radius = Number(s.deliveryRadiusKm);
  s.deliveryRadiusKm = Number.isFinite(radius) && radius >= 0 ? radius : 8;
  s.storeLat = s.storeLat == null || !Number.isFinite(Number(s.storeLat)) ? null : Number(s.storeLat);
  s.storeLng = s.storeLng == null || !Number.isFinite(Number(s.storeLng)) ? null : Number(s.storeLng);
  if (typeof s.geoAddress !== 'string') s.geoAddress = '';
  return s;
}

function loadData() {
  const stored = loadJSON(DB_KEY, null);
  if (stored && stored.version === 2 && Array.isArray(stored.products) && stored.settings) {
    normalizeSettings(stored.settings);
    return stored;
  }
  const fresh = seedData();
  normalizeSettings(fresh.settings);
  try { localStorage.setItem(DB_KEY, JSON.stringify(fresh)); } catch (e) { /* ignore */ }
  return fresh;
}

function saveData() {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(data));
  } catch (e) {
    toast('Não foi possível salvar: o armazenamento do navegador está cheio.', 'error');
    return false;
  }
  if (state.cloud && state.adminAuthed) scheduleCatalogSync();
  return true;
}

/* ------------------------------------------------------------
   3.1 Banco online
   ------------------------------------------------------------ */
async function cloudRpc(fn, args) {
  const res = await fetch(`${CLOUD_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: {
      apikey: CLOUD_KEY,
      Authorization: `Bearer ${CLOUD_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(args || {})
  });
  if (!res.ok) {
    let msg = `cloud-${res.status}`;
    try { const j = await res.json(); msg = j.message || j.hint || msg; } catch (e) { /* ignore */ }
    throw new Error(msg);
  }
  if (res.status === 204) return null;
  const txt = await res.text();
  return txt ? JSON.parse(txt) : null;
}

function adminPin() {
  return state.adminPin || sessionStorage.getItem(PIN_KEY) || '';
}

async function cloudBootstrap() {
  try {
    const cat = await cloudRpc('de_public_catalog');
    if (!cat) throw new Error('empty');
    state.cloud = true;
    const hasCatalog = Array.isArray(cat.products) && cat.products.length > 0;
    state.cloudCatalogEmpty = !hasCatalog;
    if (hasCatalog) {
      data.settings = normalizeSettings({ ...data.settings, ...cat.settings, adminPin: data.settings.adminPin });
      data.categories = Array.isArray(cat.categories) ? cat.categories : data.categories;
      data.products = cat.products;
      data.coupons = Array.isArray(cat.coupons) ? cat.coupons : data.coupons;
      data.reviews = Array.isArray(cat.reviews) ? cat.reviews : data.reviews;
      try { localStorage.setItem(DB_KEY, JSON.stringify(data)); } catch (e) { /* ignore */ }
    }
    return true;
  } catch (e) {
    state.cloud = false;
    return false;
  }
}

async function cloudLoadAdmin(silent = false) {
  const pin = adminPin();
  if (!state.cloud || !pin) return false;
  try {
    const d = await cloudRpc('de_admin_data', { p_pin: pin });
    if (!d) return false;
    data.orders = Array.isArray(d.orders) ? d.orders : [];
    data.reviews = Array.isArray(d.reviews) ? d.reviews : [];
    return true;
  } catch (e) {
    if (!silent) toast('Não foi possível carregar os pedidos online.', 'error');
    return false;
  }
}

async function pushCatalog() {
  const pin = adminPin();
  if (!state.cloud || !pin) return false;
  try {
    await cloudRpc('de_admin_save_catalog', {
      p_pin: pin,
      p_categories: data.categories,
      p_products: data.products,
      p_coupons: data.coupons,
      p_settings: data.settings
    });
    state.cloudCatalogEmpty = false;
    return true;
  } catch (e) {
    toast('Não foi possível publicar as alterações online.', 'error');
    return false;
  }
}

function scheduleCatalogSync() {
  clearTimeout(state.cloudSyncTimer);
  state.cloudSyncTimer = setTimeout(() => { pushCatalog(); }, 700);
}

async function adminLogin(pin) {
  let ok = false;
  if (state.cloud) {
    try { ok = !!(await cloudRpc('de_admin_check', { p_pin: pin })); }
    catch (e) { ok = false; }
  } else {
    ok = pin === String(data.settings.adminPin);
  }
  if (!ok) return false;
  state.adminAuthed = true;
  state.adminPin = pin;
  data.settings.adminPin = pin;
  sessionStorage.setItem(SESSION_KEY, '1');
  sessionStorage.setItem(PIN_KEY, pin);
  if (state.cloud) {
    const seeded = state.cloudCatalogEmpty;
    state.cloudCatalogEmpty = false;
    await cloudLoadAdmin(true);
    if (seeded) await pushCatalog();
  }
  return true;
}

async function ensureMyOrders() {
  if (!state.cloud) return;
  const ids = myOrderIds();
  const missing = ids.filter((id) => !data.orders.some((o) => o.id === id));
  if (!missing.length) return;
  const results = await Promise.all(missing.map((id) =>
    cloudRpc('de_order_track', { p_id: id }).catch(() => null)
  ));
  results.filter(Boolean).forEach((o) => {
    if (!data.orders.some((x) => x.id === o.id)) data.orders.push(o);
  });
}

function saveCart() {
  try { localStorage.setItem(CART_KEY, JSON.stringify(state.cart)); } catch (e) { /* ignore */ }
}
function saveFavs() {
  try { localStorage.setItem(FAV_KEY, JSON.stringify([...state.favs])); } catch (e) { /* ignore */ }
}
function myOrderIds() { return loadJSON(MY_KEY, []); }
function addMyOrder(id) {
  const ids = myOrderIds();
  if (!ids.includes(id)) ids.unshift(id);
  try { localStorage.setItem(MY_KEY, JSON.stringify(ids.slice(0, 40))); } catch (e) { /* ignore */ }
}

/* ------------------------------------------------------------
   4. Regras da loja
   ------------------------------------------------------------ */
const timeToMin = (t) => {
  const [h, m] = String(t || '00:00').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

function storeStatus() {
  const s = data.settings;
  if (s.openMode === 'closed') return { open: false, text: 'Pausada', detail: 'A loja está pausada pelo administrador.' };
  if (s.openMode === 'open') return { open: true, text: 'Aberta agora', detail: 'Pedidos abertos — fechamento manual.' };
  const now = new Date();
  const h = s.hours[now.getDay()];
  if (h && h[0] && h[1]) {
    const cur = now.getHours() * 60 + now.getMinutes();
    const start = timeToMin(h[0]);
    const end = timeToMin(h[1]);
    const open = end >= start ? (cur >= start && cur < end) : (cur >= start || cur < end);
    if (open) return { open: true, text: 'Aberta agora', detail: `Fecha hoje às ${h[1]}.` };
    return { open: false, text: 'Fechada', detail: `Abre hoje às ${h[0]}.` };
  }
  const next = nextOpening();
  return { open: false, text: 'Fechada', detail: next ? `Abre ${next}.` : 'Confira os horários de funcionamento.' };
}

function nextOpening() {
  const now = new Date();
  for (let i = 0; i < 7; i += 1) {
    const day = (now.getDay() + i) % 7;
    const h = data.settings.hours[day];
    if (h && h[0]) {
      if (i === 0 && now.getHours() * 60 + now.getMinutes() < timeToMin(h[0])) {
        return `hoje às ${h[0]}`;
      }
      if (i > 0) return `${i === 1 ? 'amanhã' : WEEK[day].toLowerCase()} às ${h[0]}`;
    }
  }
  return '';
}

function todayHoursLabel() {
  const h = data.settings.hours[new Date().getDay()];
  return h && h[0] && h[1] ? `${h[0]} – ${h[1]}` : 'Fechado hoje';
}

const effectivePrice = (p) => (p.promo && p.promo > 0 ? p.promo : p.price);
const categoryName = (id) => (data.categories.find((c) => c.id === id) || {}).name || 'Outros';

function findCoupon(code) {
  const c = String(code || '').trim().toUpperCase();
  return data.coupons.find((x) => x.code.toUpperCase() === c) || null;
}

function couponProblem(coupon, subtotal) {
  if (!coupon) return 'Cupom não encontrado.';
  if (!coupon.active) return 'Este cupom não está mais ativo.';
  if (coupon.expires && coupon.expires < todayKey()) return 'Este cupom expirou.';
  if (coupon.limit > 0 && coupon.uses >= coupon.limit) return 'Este cupom já atingiu o limite de uso.';
  if (subtotal < (coupon.minOrder || 0)) return `Cupom válido a partir de ${money(coupon.minOrder)}.`;
  return '';
}

function cartSubtotal() {
  return +state.cart.reduce((a, i) => a + i.unitPrice * i.qty, 0).toFixed(2);
}

function cartSummary(type = 'delivery') {
  const s = data.settings;
  const subtotal = cartSubtotal();
  const coupon = state.couponCode ? findCoupon(state.couponCode) : null;
  const problem = state.couponCode ? couponProblem(coupon, subtotal) : '';
  const validCoupon = problem ? null : coupon;
  let delivery = type === 'pickup' || s.deliveryEnabled === false ? 0 : (subtotal >= (s.freeFrom || 0) ? 0 : s.deliveryFee);
  let discount = 0;
  if (validCoupon) {
    if (validCoupon.type === 'percent') discount = (subtotal * validCoupon.value) / 100;
    else if (validCoupon.type === 'fixed') discount = Math.min(validCoupon.value, subtotal);
    else if (validCoupon.type === 'shipping') delivery = 0;
  }
  discount = +discount.toFixed(2);
  const total = Math.max(0, +(subtotal + delivery - discount).toFixed(2));
  return { subtotal, delivery, discount, total, coupon: validCoupon, couponProblem: problem };
}

/* ------------------------------------------------------------
   4.1 Entrega por distância
   ------------------------------------------------------------ */
let lastGeoAt = 0;

function haversineKm(a, b) {
  const rad = (v) => (v * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function geocodeQueryVariants(query) {
  const base = String(query || '').trim();
  const clean = base.replace(/[—–|]/g, ',').replace(/\s*,\s*/g, ', ').replace(/\s+/g, ' ').trim();
  const variants = clean ? [clean] : [];
  const noNumber = clean.replace(/,?\s*\d{1,6}\b/g, ' ').replace(/\s*,\s*/g, ', ').replace(/\s+/g, ' ').trim();
  if (noNumber && noNumber !== clean) variants.push(noNumber);
  const parts = clean.split(',').map((x) => x.trim()).filter(Boolean);
  if (parts.length > 2) variants.push(parts.slice(-2).join(', '));
  return [...new Set(variants)].slice(0, 3);
}

async function geocodeFetch(term) {
  const wait = 1100 - (Date.now() - lastGeoAt);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastGeoAt = Date.now();

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const url = 'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&addressdetails=0&accept-language=pt-BR&q=' + encodeURIComponent(term);
    const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    const list = await res.json();
    if (!Array.isArray(list) || !list.length) return null;
    const lat = Number(list[0].lat);
    const lng = Number(list[0].lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng, label: String(list[0].display_name || term) };
  } catch (e) {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function geocodeAddress(query) {
  const q = String(query || '').trim();
  if (q.length < 5) return null;
  const key = q.toLowerCase().replace(/\s+/g, ' ');
  const cache = loadJSON(GEO_KEY, {}) || {};
  if (cache[key] && Date.now() - cache[key].at < 90 * 24 * 60 * 60 * 1000) return cache[key];

  const variants = geocodeQueryVariants(q);
  for (const term of variants) {
    const hit = await geocodeFetch(term);
    if (!hit) continue;
    const point = { ...hit, at: Date.now() };
    try {
      const c = loadJSON(GEO_KEY, {}) || {};
      c[key] = point;
      const keys = Object.keys(c);
      if (keys.length > 60) delete c[keys[0]];
      localStorage.setItem(GEO_KEY, JSON.stringify(c));
    } catch (e) { /* ignore */ }
    return point;
  }
  return null;
}

async function ensureStoreCoords() {
  const s = data.settings;
  if (!s.address) return null;
  if (s.storeLat != null && s.storeLng != null && s.geoAddress === s.address) {
    return { lat: s.storeLat, lng: s.storeLng };
  }
  const point = await geocodeAddress(s.address);
  if (!point) return null;
  s.storeLat = point.lat;
  s.storeLng = point.lng;
  s.geoAddress = s.address;
  saveData();
  return point;
}

async function deliveryDistanceInfo(address) {
  const s = data.settings;
  if (s.deliveryEnabled === false) return { status: 'off' };
  const max = Number(s.deliveryRadiusKm) || 0;
  if (max <= 0) return { status: 'no-limit' };
  const origin = await ensureStoreCoords();
  if (!origin) return { status: 'unknown', reason: 'store' };
  const dest = await geocodeAddress(address);
  if (!dest) return { status: 'unknown', reason: 'address' };
  const km = haversineKm(origin, dest);
  return { status: km <= max ? 'inside' : 'outside', km, max };
}

/* ------------------------------------------------------------
   5. UI base
   ------------------------------------------------------------ */
function toast(message, kind = 'ok') {
  const wrap = $('#toastWrap');
  const el = document.createElement('div');
  el.className = `toast ${kind === 'error' ? 'error' : ''}`;
  el.innerHTML = `${icon(kind === 'error' ? 'x' : 'check')}<span>${esc(message)}</span>`;
  wrap.appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 320); }, 3200);
}

function openModal(html, cls = '') {
  $('#modalContent').innerHTML = html;
  $('#modalBox').className = `modal ${cls}`;
  const layer = $('#modalLayer');
  layer.hidden = false;
  document.body.classList.add('no-scroll');
}
function closeModal() {
  $('#modalLayer').hidden = true;
  $('#modalBox').className = 'modal';
  $('#modalContent').innerHTML = '';
  document.body.classList.remove('no-scroll');
}
function openDrawer() {
  $('#drawerLayer').hidden = false;
  document.body.classList.add('no-scroll');
}
function closeDrawer() {
  $('#drawerLayer').hidden = true;
  document.body.classList.remove('no-scroll');
}

function confirmDialog(title, text, label, onConfirm) {
  state.pendingConfirm = onConfirm;
  openModal(`
    <button class="modal-close" type="button" data-act="close-modal" aria-label="Fechar">${icon('x')}</button>
    <div class="modal-body-pad">
      <span class="eyebrow">${icon('lock')} confirmação</span>
      <h2 style="margin:8px 0 6px;font-size:22px;">${esc(title)}</h2>
      <p style="font-size:13px;color:var(--muted);line-height:1.6;">${esc(text)}</p>
    </div>
    <div class="modal-foot">
      <button type="button" class="btn btn-soft" data-act="close-modal">Cancelar</button>
      <button type="button" class="btn btn-danger" data-act="confirm-yes">${esc(label)}</button>
    </div>`, 'narrow');
}

function emptyState(ico, title, text, action = '') {
  return `<div class="empty-state">${icon(ico)}<strong>${esc(title)}</strong><p>${esc(text)}</p>${action}</div>`;
}

/* ------------------------------------------------------------
   6. Loja — render
   ------------------------------------------------------------ */
function heroTitleHTML(title) {
  const text = String(title || '').trim();
  const idx = text.indexOf(',');
  if (idx > 0) {
    return `${esc(text.slice(0, idx + 1))}<br><em>${esc(text.slice(idx + 1).trim())}</em>`;
  }
  return esc(text);
}

function waLink(message) {
  const phone = digits(data.settings.whatsapp);
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

function applySettings() {
  const s = data.settings;
  document.title = `${s.storeName} · Confeitaria artesanal`;
  $('#brandName').textContent = s.storeName;
  $('#brandTag').textContent = s.tagline;
  $('#footerName').textContent = s.storeName;
  $('#footerAddress').textContent = s.address;
  $('#adminBrandName').textContent = s.storeName;

  $('#heroBadge').textContent = s.hero.badge;
  $('#heroTitle').innerHTML = heroTitleHTML(s.hero.title);
  $('#heroSubtitle').textContent = s.hero.subtitle;
  if (s.hero.image) $('#heroImage').src = s.hero.image;
  $('#heroWhats').href = waLink(`Olá! Vim pelo site da ${s.storeName} e gostaria de fazer um pedido 💗`);
  $('#menuHours').textContent = todayHoursLabel();
  $('#infoPhone').textContent = s.phone;
  $('#infoMin').textContent = money(s.minOrder);
  const infoDelivery = $('#infoDelivery');
  if (infoDelivery) {
    infoDelivery.innerHTML = s.deliveryEnabled === false
      ? 'No momento, pedidos apenas para <b>retirada no balcão</b>.'
      : `Enviamos em até <b>${s.etaMax} min</b> na região. Frete <b>${money(s.deliveryFee)}</b>${s.freeFrom > 0 ? `, grátis acima de ${money(s.freeFrom)}` : ''}.`;
  }
  const insta = String(s.instagram || '').replace(/^@/, '');
  $('#infoInstagram').textContent = s.instagram || '';
  $('#infoInstagram').href = insta ? `https://instagram.com/${insta}` : '#';
  $('#floatEta').textContent = s.deliveryEnabled === false ? 'retirada' : `${s.etaMin}–${s.etaMax} min`;
  $('#floatEtaLabel').textContent = s.deliveryEnabled === false ? 'no balcão' : 'entrega no mesmo dia';
  $('#footerYear').textContent = new Date().getFullYear();

  const reviews = data.reviews || [];
  const avg = reviews.length ? reviews.reduce((a, r) => a + r.rating, 0) / reviews.length : 5;
  $('#statRating').textContent = avg.toFixed(1).replace('.', ',');
  $('#ratingAvg').textContent = avg.toFixed(1).replace('.', ',');
  $('#ratingCount').textContent = `${reviews.length} avaliações`;
  $('#ratingStars').innerHTML = starRow(avg);

  const st = storeStatus();
  const pill = $('#storeStatus');
  pill.classList.toggle('closed', !st.open);
  pill.innerHTML = `<span>${esc(st.open ? 'Aberta agora' : 'Fechada')}</span>`;
  pill.title = st.detail;

  const storeOpen = $('#storeOpenToggle');
  if (storeOpen) storeOpen.checked = st.open;
  const label = $('#storeOpenLabel');
  if (label) label.textContent = st.open ? 'Loja aberta' : 'Loja pausada';
}

function renderCategoryNav() {
  const nav = $('#catNav');
  const cats = data.categories.filter((c) => data.products.some((p) => p.cat === c.id && p.active));
  nav.innerHTML = `<button class="cat-btn active" type="button" data-act="go-cat" data-cat="all">${icon('grid')} Tudo</button>` +
    cats.map((c) => `<button class="cat-btn" type="button" data-act="go-cat" data-cat="${esc(c.id)}">${icon(c.icon || 'cake')} ${esc(c.name)}</button>`).join('');
}

function productCard(p) {
  const price = effectivePrice(p);
  const fav = state.favs.has(p.id);
  return `
  <article class="product-card">
    <button class="product-media" type="button" data-act="open-product" data-id="${esc(p.id)}" aria-label="Ver ${esc(p.name)}">
      <img src="${esc(p.img)}" alt="${esc(p.name)}" loading="lazy">
      ${p.badge ? `<span class="product-tag ${p.featured ? 'hot' : ''}">${esc(p.badge)}</span>` : ''}
      <span class="fav-btn ${fav ? 'on' : ''}" role="button" tabindex="0" data-act="fav" data-id="${esc(p.id)}" aria-label="Favoritar">${icon('heart')}</span>
    </button>
    <div class="product-body">
      <h4>${esc(p.name)}</h4>
      <p class="product-desc">${esc(p.desc)}</p>
      <div class="product-meta">${starRow(5)} <span>4.9</span><span class="dot"></span><span>${p.sold || 0} vendidos</span></div>
      <div class="product-foot">
        <div class="price-block">
          <span class="price ${p.promo ? 'promo' : ''}">${money(price)}</span>
          ${p.promo ? `<span class="old">${money(p.price)}</span>` : ''}
        </div>
        <button class="add-btn" type="button" data-act="add-cart" data-id="${esc(p.id)}" aria-label="Adicionar ${esc(p.name)}">${icon('plus')}</button>
      </div>
    </div>
  </article>`;
}

function productMatches(p, term) {
  const t = term.trim().toLowerCase();
  if (!t) return true;
  return `${p.name} ${p.desc} ${categoryName(p.cat)}`.toLowerCase().includes(t);
}

function renderMenu() {
  const wrap = $('#menuSections');
  const term = state.search.trim();
  const activeProducts = data.products.filter((p) => p.active);
  const matched = activeProducts.filter((p) => productMatches(p, term));

  if (term) {
    wrap.innerHTML = `
      <section class="menu-section">
        <div class="section-head">
          <span class="section-icon">${icon('search')}</span>
          <h3>Resultados para “${esc(term)}”</h3>
          <small>${matched.length} ${matched.length === 1 ? 'item' : 'itens'}</small>
          <span class="section-line"></span>
        </div>
        ${matched.length ? `<div class="product-grid">${matched.map(productCard).join('')}</div>` : emptyState('search', 'Nenhum item encontrado', 'Tente buscar por torta, bolo, cheesecake ou doce.')}
      </section>`;
  } else {
    const sections = data.categories
      .map((c) => ({ cat: c, prods: matched.filter((p) => p.cat === c.id) }))
      .filter((s) => s.prods.length);
    wrap.innerHTML = sections.length
      ? sections.map(({ cat, prods }) => `
        <section class="menu-section" id="cat-${esc(cat.id)}">
          <div class="section-head">
            <span class="section-icon">${icon(cat.icon || 'cake')}</span>
            <h3>${esc(cat.name)}</h3>
            <small>${prods.length} ${prods.length === 1 ? 'item' : 'itens'}</small>
            <span class="section-line"></span>
          </div>
          <div class="product-grid">${prods.map(productCard).join('')}</div>
        </section>`).join('')
      : emptyState('cake', 'Cardápio em preparo', 'Em breve novidades deliciosas por aqui.');
  }

  $('#menuCount').textContent = `${matched.length} ${matched.length === 1 ? 'item' : 'itens'}`;
}

function renderReviews() {
  const reviews = [...(data.reviews || [])].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 6);
  const grid = $('#reviewGrid');
  if (!reviews.length) {
    grid.innerHTML = emptyState('heart2', 'Nenhuma avaliação ainda', 'As avaliações dos clientes aparecerão aqui.');
    return;
  }
  grid.innerHTML = reviews.map((r) => `
    <article class="review-card">
      ${starRow(r.rating)}
      <p class="quote">“${esc(r.text)}”</p>
      <div class="review-who">
        <span class="review-avatar">${esc(String(r.name || 'C').trim().slice(0, 2).toUpperCase())}</span>
        <div>
          <strong>${esc(r.name)}</strong>
          <small>${esc(fmtDateTime(r.date))}</small>
        </div>
      </div>
    </article>`).join('');
}

/* ------------------------------------------------------------
   7. Carrinho
   ------------------------------------------------------------ */
function cartCount() {
  return state.cart.reduce((a, i) => a + i.qty, 0);
}

function cartLineOptions(item) {
  const parts = [];
  if (item.size) parts.push(item.size);
  if (item.extras && item.extras.length) parts.push(item.extras.map((e) => e.name).join(', '));
  return parts.join(' · ');
}

function updateCartBadges() {
  const count = cartCount();
  const badge = $('#cartCount');
  badge.textContent = count;
  badge.hidden = count === 0;
  badge.classList.remove('bump');
  void badge.offsetWidth;
  badge.classList.add('bump');
  const fab = $('#cartFab');
  if (fab) {
    const summary = cartSummary('delivery');
    fab.classList.toggle('visible', count > 0);
    if (count > 0) {
      fab.innerHTML = `<span class="cf-count">${count}</span><span>Ver carrinho</span><span class="cf-total">${money(summary.total)}</span>`;
    }
  }
}

function renderCart() {
  updateCartBadges();
  const body = $('#cartBody');
  const foot = $('#cartFoot');
  if (!state.cart.length) {
    body.innerHTML = `<div class="cart-empty">${icon('cart')}<h3>Seu carrinho está vazio</h3><p>Escolha uma doçura no cardápio e ela aparece aqui.</p></div>`;
    foot.innerHTML = `<button class="btn btn-soft btn-block" type="button" data-act="close-drawer">Explorar cardápio</button>`;
    return;
  }

  body.innerHTML = state.cart.map((i) => `
    <div class="cart-item">
      <img src="${esc(i.img)}" alt="${esc(i.name)}">
      <div class="cart-item-info">
        <strong>${esc(i.name)}</strong>
        ${cartLineOptions(i) ? `<small>${esc(cartLineOptions(i))}</small>` : ''}
        ${i.note ? `<small class="ci-note">“${esc(i.note)}”</small>` : ''}
      </div>
      <div class="cart-item-side">
        <span class="cart-item-price">${money(i.unitPrice * i.qty)}</span>
        <div class="qty">
          <button type="button" data-act="cart-dec" data-uid="${esc(i.uid)}" aria-label="Diminuir">${icon('minus')}</button>
          <b>${i.qty}</b>
          <button type="button" data-act="cart-inc" data-uid="${esc(i.uid)}" aria-label="Aumentar">${icon('plus')}</button>
        </div>
      </div>
    </div>`).join('');

  const canDeliver = data.settings.deliveryEnabled !== false;
  const s = cartSummary(canDeliver ? 'delivery' : 'pickup');
  const applied = s.coupon;
  const st = storeStatus();
  const freeRemaining = Math.max(0, (data.settings.freeFrom || 0) - s.subtotal);
  const belowMin = s.subtotal < data.settings.minOrder;

  foot.innerHTML = `
    ${applied
      ? `<div class="coupon-applied">${icon('tag')} <span>Cupom <b>${esc(applied.code)}</b> aplicado</span><button type="button" data-act="remove-coupon" aria-label="Remover cupom">${icon('x')}</button></div>`
      : `<div class="coupon-box">
          <input class="input" id="couponInput" placeholder="Cupom de desconto" autocomplete="off">
          <button class="btn btn-soft" type="button" data-act="apply-coupon">Aplicar</button>
        </div>`}
    ${s.couponProblem && !applied ? `<div class="min-warn">${esc(s.couponProblem)}</div>` : ''}
    ${canDeliver
      ? (freeRemaining > 0
        ? `<div class="delivery-progress"><small>Faltam ${money(freeRemaining)} para frete grátis</small><div class="progress-bar"><i style="width:${clamp((s.subtotal / (data.settings.freeFrom || 1)) * 100, 0, 100)}%"></i></div></div>`
        : `<div class="delivery-progress"><small>Você ganhou frete grátis!</small><div class="progress-bar"><i style="width:100%"></i></div></div>`)
      : `<div class="min-warn">No momento, pedidos apenas para retirada no balcão.</div>`}
    <div class="summary">
      <div class="summary-row"><span>Subtotal</span><b>${money(s.subtotal)}</b></div>
      <div class="summary-row"><span>${canDeliver ? 'Entrega' : 'Retirada'}</span><b>${s.delivery === 0 ? 'Grátis' : money(s.delivery)}</b></div>
      ${s.discount > 0 ? `<div class="summary-row discount"><span>Desconto</span><b>− ${money(s.discount)}</b></div>` : ''}
      <div class="summary-row total"><span>Total</span><b>${money(s.total)}</b></div>
    </div>
    ${belowMin ? `<div class="min-warn">Pedido mínimo de ${money(data.settings.minOrder)}. Adicione mais ${money(data.settings.minOrder - s.subtotal)}.</div>` : ''}
    ${!st.open ? `<div class="min-warn">${esc(st.detail)} Você pode finalizar quando reabrir.</div>` : ''}
    <button class="btn btn-primary btn-block btn-lg" type="button" data-act="checkout" ${belowMin ? 'disabled' : ''}>
      Finalizar pedido ${icon('arrow')}
    </button>
  `;
}

function addToCart(product, config = {}) {
  const size = config.size || '';
  const sizeDelta = num(config.sizeDelta, 0);
  const extras = config.extras || [];
  const note = String(config.note || '').trim().slice(0, 180);
  const qty = clamp(Math.round(num(config.qty, 1)), 1, 30);
  const unitPrice = +(effectivePrice(product) + sizeDelta + extras.reduce((a, e) => a + num(e.price), 0)).toFixed(2);
  const signature = `${product.id}|${size}|${extras.map((e) => e.name).sort().join(',')}|${note}`;
  const existing = state.cart.find((i) => i.signature === signature);
  if (existing) existing.qty = clamp(existing.qty + qty, 1, 60);
  else {
    state.cart.push({
      uid: uid('ci'), signature, productId: product.id, name: product.name, img: product.img,
      qty, size, extras, note, unitPrice
    });
  }
  saveCart();
  renderCart();
}

/* ------------------------------------------------------------
   8. Modal de produto
   ------------------------------------------------------------ */
function openProductModal(id) {
  const p = data.products.find((x) => x.id === id);
  if (!p) return;
  const sizes = p.sizes || [];
  const extras = p.extras || [];
  const base = effectivePrice(p);
  const firstSize = sizes.length ? sizes[0] : null;
  let selectedSize = firstSize ? firstSize.name : '';
  const selectedExtras = new Set();
  let qty = 1;

  openModal(`
    <button class="modal-close" type="button" data-act="close-modal" aria-label="Fechar">${icon('x')}</button>
    <div class="pm-hero"><img src="${esc(p.img)}" alt="${esc(p.name)}"></div>
    <div class="pm-body">
      <div class="pm-top">
        <div>
          <span class="eyebrow">${icon('cake')} ${esc(categoryName(p.cat))}</span>
          <h2>${esc(p.name)}</h2>
          <p class="pm-desc">${esc(p.desc)}</p>
        </div>
        <div class="pm-price">
          <b id="pmUnit">${money(base)}</b>
          ${p.promo ? `<small>de ${money(p.price)}</small>` : '<small>preço base</small>'}
        </div>
      </div>
      <div class="pm-options">
        ${sizes.length ? `
          <div class="opt-group">
            <div class="opt-group-head"><strong>Escolha o tamanho</strong><span>obrigatório</span></div>
            <div class="opt-list">
              ${sizes.map((s, idx) => `
                <label class="opt-row">
                  <input type="radio" name="pmSize" value="${esc(s.name)}" data-delta="${num(s.delta)}" ${idx === 0 ? 'checked' : ''}>
                  <span>${esc(s.name)}</span>
                  <span class="opt-price">${num(s.delta) === 0 ? 'incluso' : (num(s.delta) > 0 ? '+ ' + money(num(s.delta)) : '− ' + money(Math.abs(num(s.delta))))}</span>
                </label>`).join('')}
            </div>
          </div>` : ''}
        ${extras.length ? `
          <div class="opt-group">
            <div class="opt-group-head"><strong>Adicionais</strong><span>opcional</span></div>
            <div class="opt-list">
              ${extras.map((e, idx) => `
                <label class="opt-row">
                  <input type="checkbox" name="pmExtra" value="${esc(e.name)}" data-price="${num(e.price)}" id="pmExtra${idx}">
                  <span>${esc(e.name)}</span>
                  <span class="opt-price">${num(e.price) === 0 ? 'grátis' : '+ ' + money(num(e.price))}</span>
                </label>`).join('')}
            </div>
          </div>` : ''}
        <div class="opt-group pm-note">
          <div class="opt-group-head"><strong>Alguma observação?</strong><span>opcional</span></div>
          <textarea class="input" id="pmNote" maxlength="180" placeholder="Ex.: escrever “Parabéns, Ana” no bolo"></textarea>
        </div>
      </div>
      <div class="pm-foot">
        <div class="qty">
          <button type="button" data-pm-qty="-1" aria-label="Diminuir">${icon('minus')}</button>
          <b id="pmQty">1</b>
          <button type="button" data-pm-qty="1" aria-label="Aumentar">${icon('plus')}</button>
        </div>
        <button class="btn btn-primary btn-lg" type="button" id="pmAdd">Adicionar · ${money(base)}</button>
      </div>
    </div>`);

  const recalc = () => {
    let total = base + qty * 0;
    const size = sizes.find((s) => s.name === selectedSize);
    let unit = base + (size ? num(size.delta) : 0);
    extras.forEach((e) => { if (selectedExtras.has(e.name)) unit += num(e.price); });
    total = +(unit * qty).toFixed(2);
    $('#pmUnit').textContent = money(unit);
    $('#pmQty').textContent = qty;
    $('#pmAdd').innerHTML = `Adicionar · ${money(total)}`;
  };

  $$('input[name="pmSize"]').forEach((el) => el.addEventListener('change', () => {
    selectedSize = el.value;
    recalc();
  }));
  $$('input[name="pmExtra"]').forEach((el) => el.addEventListener('change', () => {
    if (el.checked) selectedExtras.add(el.value); else selectedExtras.delete(el.value);
    recalc();
  }));
  $$('[data-pm-qty]').forEach((btn) => btn.addEventListener('click', () => {
    qty = clamp(qty + Number(btn.dataset.pmQty), 1, 30);
    recalc();
  }));
  $('#pmAdd').addEventListener('click', () => {
    addToCart(p, {
      size: selectedSize,
      sizeDelta: (sizes.find((s) => s.name === selectedSize) || {}).delta || 0,
      extras: extras.filter((e) => selectedExtras.has(e.name)),
      note: $('#pmNote').value,
      qty
    });
    closeModal();
    toast(`${p.name} adicionado ao carrinho`);
  });
  recalc();
}

function quickAdd(id) {
  const p = data.products.find((x) => x.id === id);
  if (!p) return;
  if ((p.sizes && p.sizes.length) || (p.extras && p.extras.length)) {
    openProductModal(id);
    return;
  }
  addToCart(p, {});
  toast(`${p.name} adicionado ao carrinho`);
}

/* ------------------------------------------------------------
   9. Checkout e pedidos do cliente
   ------------------------------------------------------------ */
function openCheckout() {
  if (!state.cart.length) return;
  const canDeliver = data.settings.deliveryEnabled !== false;
  const s = cartSummary(canDeliver ? 'delivery' : 'pickup');
  if (s.subtotal < data.settings.minOrder) { toast(`Pedido mínimo de ${money(data.settings.minOrder)}.`, 'error'); return; }
  const pay = data.settings.payment;
  const customer = state.customer || {};

  openModal(`
    <button class="modal-close" type="button" data-act="close-modal" aria-label="Fechar">${icon('x')}</button>
    <div class="co-head">
      <span class="eyebrow">${icon('bag')} checkout seguro</span>
      <h2>Finalizar pedido</h2>
      <p>Confirme os dados e escolha como quer receber.</p>
    </div>
    <form id="checkoutForm">
      <div class="co-grid">
        <div class="co-form">
          <div class="field">
            <span class="field-label">Como você quer receber?</span>
            <div class="co-type">
              ${canDeliver ? `<label class="type-card on">
                <input type="radio" name="type" value="delivery" checked>
                ${icon('bike')}
                <span><strong>Entrega</strong><small>${data.settings.deliveryFee > 0 ? money(data.settings.deliveryFee) : 'Grátis'} · ${data.settings.etaMin}–${data.settings.etaMax} min</small></span>
              </label>` : ''}
              <label class="type-card ${canDeliver ? '' : 'on'}">
                <input type="radio" name="type" value="pickup" ${canDeliver ? '' : 'checked'}>
                ${icon('bag')}
                <span><strong>Retirada</strong><small>Grátis · pronto no balcão</small></span>
              </label>
            </div>
            ${canDeliver ? '' : '<p class="min-warn" style="margin-top:8px;">A entrega está desativada no momento. Seu pedido será preparado para retirada.</p>'}
          </div>
          <div class="form-grid">
            <div class="field">
              <label for="coName">Seu nome</label>
              <input id="coName" name="name" required maxlength="60" placeholder="Como podemos te chamar?" value="${esc(customer.name || '')}">
            </div>
            <div class="field">
              <label for="coPhone">WhatsApp</label>
              <input id="coPhone" name="phone" required inputmode="tel" maxlength="20" placeholder="(21) 99999-0000" value="${esc(customer.phone || '')}">
            </div>
            <div class="field span-2" id="coAddressGroup">
              <label for="coAddress">Endereço de entrega</label>
              <input id="coAddress" name="address" required maxlength="140" placeholder="Rua, número, bairro e complemento" value="${esc(customer.address || '')}">
            </div>
            <div class="field span-2">
              <label for="coNote">Observações do pedido</label>
              <input id="coNote" name="note" maxlength="140" placeholder="Ex.: entregar na portaria, escrever no bolo...">
            </div>
          </div>
          <div class="field">
            <span class="field-label">Forma de pagamento</span>
            <div class="pay-grid">
              ${pay.pix ? `<label class="pay-card on"><input type="radio" name="payment" value="pix" checked>${icon('pix')}<span>Pix</span></label>` : ''}
              ${pay.card ? `<label class="pay-card"><input type="radio" name="payment" value="card">${icon('card')}<span>Cartão</span></label>` : ''}
              ${pay.cash ? `<label class="pay-card"><input type="radio" name="payment" value="cash">${icon('cash')}<span>Dinheiro</span></label>` : ''}
            </div>
          </div>
          <div class="field hidden" id="coChangeGroup">
            <label for="coChange">Troco para quanto?</label>
            <input id="coChange" name="changeFor" type="number" min="0" step="0.01" placeholder="Ex.: 100,00">
          </div>
        </div>
        <aside class="co-summary">
          <h3>Resumo do pedido</h3>
          <div class="co-items">
            ${state.cart.map((i) => `
              <div class="co-item">
                <span>${i.qty}× ${esc(i.name)}<small>${esc(cartLineOptions(i))}</small></span>
                <b>${money(i.unitPrice * i.qty)}</b>
              </div>`).join('')}
          </div>
          <div class="summary" id="coTotals"></div>
          ${state.couponCode ? `<div class="coupon-applied">${icon('tag')} Cupom <b>${esc(state.couponCode)}</b></div>` : ''}
          <button class="btn btn-primary btn-block btn-lg" type="submit" id="coSubmit">${icon('check')} Confirmar pedido</button>
          <p class="mono" style="text-align:center;color:var(--muted-2);margin-top:10px;">pagamento na entrega · sem cadastro</p>
        </aside>
      </div>
    </form>`, 'wide');

  const form = $('#checkoutForm');
  const updateTotals = () => {
    const type = form.querySelector('input[name="type"]:checked').value;
    const s2 = cartSummary(type);
    const totals = $('#coTotals');
    totals.innerHTML = `
      <div class="summary-row"><span>Subtotal</span><b>${money(s2.subtotal)}</b></div>
      <div class="summary-row"><span>${type === 'delivery' ? 'Entrega' : 'Retirada'}</span><b>${s2.delivery === 0 ? 'Grátis' : money(s2.delivery)}</b></div>
      ${s2.discount > 0 ? `<div class="summary-row discount"><span>Desconto</span><b>− ${money(s2.discount)}</b></div>` : ''}
      <div class="summary-row total"><span>Total</span><b>${money(s2.total)}</b></div>`;
    $('#coAddressGroup').classList.toggle('hidden', type !== 'delivery');
    $('#coAddress').required = type === 'delivery';
  };

  form.addEventListener('change', (e) => {
    if (e.target.name === 'type') {
      $$('.type-card', form).forEach((l) => l.classList.toggle('on', l.querySelector('input').checked));
      updateTotals();
    }
    if (e.target.name === 'payment') {
      $$('.pay-card', form).forEach((l) => l.classList.toggle('on', l.querySelector('input').checked));
      $('#coChangeGroup').classList.toggle('hidden', e.target.value !== 'cash');
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const type = fd.get('type');
    const payment = fd.get('payment') || 'pix';
    const name = String(fd.get('name') || '').trim();
    const phone = String(fd.get('phone') || '').trim();
    const address = String(fd.get('address') || '').trim();
    const note = String(fd.get('note') || '').trim();
    const changeFor = num(fd.get('changeFor'), 0);

    const st = storeStatus();
    if (!st.open) { toast(`A loja está fechada agora. ${st.detail}`, 'error'); return; }
    if (name.length < 2) { toast('Informe seu nome.', 'error'); return; }
    if (digits(phone).length < 10) { toast('Informe um WhatsApp válido com DDD.', 'error'); return; }
    if (type === 'delivery' && address.length < 5) { toast('Informe o endereço completo para entrega.', 'error'); return; }

    const submitBtn = $('#coSubmit');
    const submitLabel = submitBtn ? submitBtn.innerHTML : '';
    let deliveryKm = null;
    if (type === 'delivery') {
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Verificando endereço...'; }
      const info = await deliveryDistanceInfo(address);
      if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = submitLabel; }
      if (info.status === 'outside') {
        toast(`Endereço fora da área de entrega: ${info.km.toFixed(1).replace('.', ',')} km de distância. O raio máximo é de ${info.max} km.`, 'error');
        return;
      }
      if (info.km != null) deliveryKm = +info.km.toFixed(1);
    }

    const summary = cartSummary(type);
    const order = {
      id: uid('o'), createdAt: new Date().toISOString(), status: 'novo', type, payment,
      customer: { name, phone, address: type === 'delivery' ? address : '' },
      items: state.cart.map((i) => ({
        productId: i.productId, name: i.name, qty: i.qty, price: i.unitPrice,
        options: cartLineOptions(i), note: i.note || ''
      })),
      subtotal: summary.subtotal, deliveryFee: summary.delivery, discount: summary.discount,
      coupon: summary.coupon ? summary.coupon.code : null, total: summary.total,
      note, changeFor: payment === 'cash' && changeFor ? changeFor : null, rated: false,
      deliveryKm,
      statusHistory: [{ status: 'novo', at: new Date().toISOString() }]
    };

    if (state.cloud) {
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Enviando pedido...'; }
      try {
        const created = await cloudRpc('de_create_order', { payload: order });
        order.code = created.code;
        order.createdAt = created.createdAt || order.createdAt;
        order.status = created.status || 'novo';
      } catch (err) {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = submitLabel; }
        toast('Não foi possível enviar o pedido. Verifique sua conexão e tente novamente.', 'error');
        return;
      }
    } else {
      order.code = (data.meta.seq = (data.meta.seq || 1000) + 1);
    }

    data.orders.unshift(order);
    if (summary.coupon) {
      summary.coupon.uses = (summary.coupon.uses || 0) + 1;
      if (state.cloud) cloudRpc('de_coupon_used', { p_code: summary.coupon.code }).catch(() => {});
    }
    state.customer = { name, phone, address };
    try { localStorage.setItem(CUST_KEY, JSON.stringify(state.customer)); } catch (e) { /* ignore */ }
    saveData();
    addMyOrder(order.id);

    state.cart = [];
    state.couponCode = null;
    saveCart();
    renderCart();
    refreshStorefront();
    showOrderSuccess(order);
  });

  updateTotals();
}

function orderSteps(order) {
  const delivery = order.type === 'delivery';
  return [
    { key: 'novo', label: 'Pedido recebido', hint: 'Seu pedido chegou na cozinha' },
    { key: 'preparo', label: 'Em preparo', hint: 'Tudo sendo feito com carinho' },
    { key: delivery ? 'entrega' : 'pronto', label: delivery ? 'Saiu para entrega' : 'Pronto para retirada', hint: delivery ? 'A caminho da sua casa' : 'Pode vir buscar no balcão' },
    { key: 'concluido', label: delivery ? 'Entregue' : 'Retirado', hint: 'Bom apetite!' }
  ];
}

function orderProgressHTML(order) {
  if (order.status === 'cancelado') {
    return `<div class="coupon-applied" style="background:#fff1f4;border-color:#ffd0d8;color:#c81e3c;">${icon('x')} Pedido cancelado</div>`;
  }
  const steps = orderSteps(order);
  const rank = { novo: 0, preparo: 1, pronto: 2, entrega: 2, concluido: 3 }[order.status] ?? 0;
  return `<div class="track">
    ${steps.map((s, i) => `
      <div class="track-step ${i < rank ? 'done' : ''} ${i === rank ? 'current' : ''}">
        <span class="track-dot">${i < rank ? icon('check') : icon(i === rank ? 'clock' : 'package')}</span>
        <div><strong>${s.label}</strong><small>${s.hint}</small></div>
      </div>`).join('')}
  </div>`;
}

function showOrderSuccess(order) {
  openModal(`
    <button class="modal-close" type="button" data-act="close-modal" aria-label="Fechar">${icon('x')}</button>
    <div class="ok-hero">
      <span class="ok-check">${icon('check')}</span>
      <h2>Pedido confirmado!</h2>
      <p>${order.type === 'delivery' ? 'Já estamos preparando tudo com carinho.' : 'Já estamos preparando para a retirada.'}</p>
      <span class="ok-code">${icon('bag')} PEDIDO #${order.code}</span>
    </div>
    <div class="ok-body">
      ${orderProgressHTML(order)}
      <div class="summary">
        <div class="summary-row"><span>${TYPE_LABEL[order.type]} · ${PAY_LABEL[order.payment]}</span><b>${money(order.total)}</b></div>
      </div>
      <div style="display:flex;gap:9px;flex-wrap:wrap;">
        <button class="btn btn-primary" type="button" data-act="track-order" data-id="${esc(order.id)}">${icon('bag')} Acompanhar pedido</button>
        <a class="btn btn-ghost" href="${waLink(`Olá! Acabei de fazer o pedido #${order.code} pelo site 💗`)}" target="_blank" rel="noopener">${icon('whatsapp')} WhatsApp</a>
        <button class="btn btn-soft" type="button" data-act="close-modal">Continuar comprando</button>
      </div>
    </div>`, 'narrow');
}

async function openTrackOrder(id) {
  let order = data.orders.find((o) => o.id === id);
  if (!order && state.cloud) {
    try {
      order = await cloudRpc('de_order_track', { p_id: id });
      if (order) data.orders.push(order);
    } catch (e) { order = null; }
  }
  if (!order) { toast('Não foi possível carregar o pedido.', 'error'); return; }
  openModal(`
    <button class="modal-close" type="button" data-act="close-modal" aria-label="Fechar">${icon('x')}</button>
    <div class="co-head">
      <span class="eyebrow">${icon('bag')} pedido #${order.code}</span>
      <h2>${esc(STATUS_LABEL[order.status])}</h2>
      <p>${esc(fmtDayLong(order.createdAt))} · ${esc(fmtTime(order.createdAt))} · ${TYPE_LABEL[order.type]}</p>
    </div>
    <div class="ok-body">
      ${orderProgressHTML(order)}
      <div class="summary">
        ${order.items.map((i) => `<div class="summary-row"><span>${i.qty}× ${esc(i.name)}</span><b>${money(i.price * i.qty)}</b></div>`).join('')}
        <div class="summary-row total"><span>Total</span><b>${money(order.total)}</b></div>
      </div>
      <div style="display:flex;gap:9px;flex-wrap:wrap;margin-top:14px;">
        ${order.status === 'concluido' && !order.rated ? `<button class="btn btn-primary" type="button" data-act="rate-order" data-id="${esc(order.id)}">${icon('star')} Avaliar pedido</button>` : ''}
        <a class="btn btn-ghost" href="${waLink(`Olá! Gostaria de falar sobre o pedido #${order.code}.`)}" target="_blank" rel="noopener">${icon('whatsapp')} Falar com a loja</a>
        <button class="btn btn-soft" type="button" data-act="close-modal">Fechar</button>
      </div>
    </div>`, 'narrow');
}

async function openMyOrders() {
  if (state.cloud) await ensureMyOrders();
  const ids = myOrderIds();
  const orders = ids.map((id) => data.orders.find((o) => o.id === id)).filter(Boolean);
  openModal(`
    <button class="modal-close" type="button" data-act="close-modal" aria-label="Fechar">${icon('x')}</button>
    <div class="co-head">
      <span class="eyebrow">${icon('bag')} histórico</span>
      <h2>Meus pedidos</h2>
      <p>Acompanhe o status dos seus pedidos a qualquer momento.</p>
    </div>
    <div class="my-orders">
      ${orders.length ? orders.map((o) => `
        <div class="my-order">
          <div class="my-order-info">
            <strong>#${o.code} · <span class="status-chip s-${o.status}">${STATUS_LABEL[o.status]}</span></strong>
            <small>${fmtDateTime(o.createdAt)} · ${TYPE_LABEL[o.type]} · ${o.items.reduce((a, i) => a + i.qty, 0)} itens</small>
          </div>
          <span class="my-order-total">${money(o.total)}</span>
          <button class="btn btn-soft btn-sm" type="button" data-act="track-order" data-id="${esc(o.id)}">Ver</button>
        </div>`).join('')
      : emptyState('bag', 'Nenhum pedido ainda', 'Quando você fizer seu primeiro pedido, ele aparecerá aqui.')}
    </div>`, 'narrow');
}

function openRating(orderId) {
  const order = data.orders.find((o) => o.id === orderId);
  if (!order) return;
  let rating = 5;
  openModal(`
    <button class="modal-close" type="button" data-act="close-modal" aria-label="Fechar">${icon('x')}</button>
    <div class="co-head" style="text-align:center;">
      <span class="eyebrow" style="justify-content:center;">${icon('heart2')} sua opinião</span>
      <h2>Como foi seu pedido?</h2>
      <p>Pedido #${order.code} · ${esc(order.items.map((i) => i.name).join(', '))}</p>
    </div>
    <div class="ok-body">
      <div class="rate-stars" id="rateStars">
        ${[1, 2, 3, 4, 5].map((n) => `<button type="button" data-rate="${n}" class="${n <= rating ? 'on' : ''}" aria-label="${n} estrelas">${icon('star')}</button>`).join('')}
      </div>
      <div class="field" style="margin-top:8px;">
        <label for="rateName">Seu nome</label>
        <input id="rateName" maxlength="50" value="${esc(order.customer.name || '')}">
      </div>
      <div class="field" style="margin-top:10px;">
        <label for="rateText">Conte como foi</label>
        <textarea id="rateText" maxlength="240" placeholder="O que você mais gostou?"></textarea>
      </div>
      <button class="btn btn-primary btn-block btn-lg" type="button" id="rateSubmit" style="margin-top:16px;">${icon('check')} Enviar avaliação</button>
    </div>`, 'narrow');

  $$('#rateStars [data-rate]').forEach((btn) => btn.addEventListener('click', () => {
    rating = Number(btn.dataset.rate);
    $$('#rateStars [data-rate]').forEach((b) => b.classList.toggle('on', Number(b.dataset.rate) <= rating));
  }));
  $('#rateSubmit').addEventListener('click', async () => {
    const name = $('#rateName').value.trim() || order.customer.name || 'Cliente';
    const text = $('#rateText').value.trim() || 'Adorei o pedido! Tudo feito com muito carinho.';
    const review = { id: uid('r'), orderId: order.id, name, rating, text, date: new Date().toISOString() };
    if (state.cloud) {
      const btn = $('#rateSubmit');
      if (btn) { btn.disabled = true; btn.textContent = 'Enviando...'; }
      try {
        await cloudRpc('de_rate_order', { p_order_id: order.id, p_review: review });
      } catch (err) {
        if (btn) { btn.disabled = false; btn.innerHTML = 'Enviar avaliação'; }
        toast('Não foi possível enviar a avaliação. Tente novamente.', 'error');
        return;
      }
    }
    data.reviews.unshift(review);
    order.rated = true;
    try { localStorage.setItem(DB_KEY, JSON.stringify(data)); } catch (e) { /* ignore */ }
    closeModal();
    renderReviews();
    applySettings();
    toast('Obrigado pela sua avaliação!');
  });
}

/* ------------------------------------------------------------
   10. Administração — navegação
   ------------------------------------------------------------ */
const ADMIN_TITLES = {
  visao: ['Visão geral', 'Acompanhe o movimento da sua confeitaria.'],
  pedidos: ['Pedidos', 'Gerencie os pedidos em tempo real.'],
  cardapio: ['Cardápio', 'Adicione, edite e organize os produtos.'],
  categorias: ['Categorias', 'Organize as seções do seu cardápio.'],
  cupons: ['Cupons', 'Crie promoções para atrair mais pedidos.'],
  relatorios: ['Relatórios', 'Vendas, produtos e formas de pagamento.'],
  avaliacoes: ['Avaliações', 'Veja e modere o que os clientes dizem.'],
  config: ['Configurações', 'Identidade, operação e segurança da loja.']
};

function openAdmin() {
  if (location.hash !== '#/admin') location.hash = '#/admin';
  else applyRoute();
}
function goStore() {
  location.hash = '#/';
}

function startAdminPolling() {
  stopAdminPolling();
  if (!state.cloud) return;
  state.adminTimer = setInterval(async () => {
    if ($('#viewAdmin').hidden || !state.adminAuthed || !state.cloud) return;
    if (!$('#modalLayer').hidden) return;
    if (!['visao', 'pedidos', 'avaliacoes'].includes(state.adminTab)) return;
    const ok = await cloudLoadAdmin(true);
    if (ok) renderAdmin();
  }, 20000);
}
function stopAdminPolling() {
  clearInterval(state.adminTimer);
  state.adminTimer = null;
}

function applyRoute() {
  const isAdmin = location.hash.startsWith('#/admin');
  $('#viewLoja').hidden = isAdmin;
  $('#viewAdmin').hidden = !isAdmin;
  const fab = $('#cartFab');
  if (fab) fab.style.display = isAdmin ? 'none' : '';
  if (isAdmin) {
    if (state.adminAuthed) {
      $('#adminLock').hidden = true;
      renderAdmin();
      startAdminPolling();
    } else {
      $('#adminLock').hidden = false;
      stopAdminPolling();
      setTimeout(() => $('#pinInput').focus(), 80);
    }
  } else {
    stopAdminPolling();
    applySettings();
    renderCategoryNav();
    renderMenu();
    renderReviews();
    renderCart();
  }
  window.scrollTo(0, 0);
}

function renderAdmin() {
  const t = state.adminTab;
  const [title, sub] = ADMIN_TITLES[t] || ADMIN_TITLES.visao;
  $('#adminPageTitle').textContent = title;
  $('#adminPageSub').textContent = sub;
  $$('#adminNav button').forEach((b) => b.classList.toggle('active', b.dataset.tab === t));
  const newCount = data.orders.filter((o) => o.status === 'novo').length;
  const badge = $('#navBadgeOrders');
  badge.textContent = newCount;
  badge.classList.toggle('show', newCount > 0);
  $('#adminBrandName').textContent = data.settings.storeName;
  const st = storeStatus();
  $('#storeOpenToggle').checked = st.open;
  $('#storeOpenLabel').textContent = st.open ? 'Loja aberta' : 'Loja pausada';
  if (state.chart) { state.chart.destroy(); state.chart = null; }

  const content = $('#adminContent');
  if (t === 'visao') content.innerHTML = adminDashboardHTML();
  else if (t === 'pedidos') content.innerHTML = adminOrdersHTML();
  else if (t === 'cardapio') content.innerHTML = adminMenuHTML();
  else if (t === 'categorias') content.innerHTML = adminCategoriesHTML();
  else if (t === 'cupons') content.innerHTML = adminCouponsHTML();
  else if (t === 'relatorios') content.innerHTML = adminReportsHTML();
  else if (t === 'avaliacoes') content.innerHTML = adminReviewsHTML();
  else content.innerHTML = adminSettingsHTML();

  if (t === 'visao') renderChart();
  if (t === 'config') bindSettingsForm();
  if (t === 'cardapio') bindAdminMenuEvents();
  if (t === 'relatorios') bindReportEvents();
}

function ordersInRange(from, to) {
  return data.orders.filter((o) => {
    const k = dateKey(o.createdAt);
    return k >= from && k <= to;
  });
}

function adminDashboardHTML() {
  const today = todayKey();
  const yKey = dateKey(daysAgo(1));
  const valid = data.orders.filter((o) => o.status !== 'cancelado');
  const todayOrders = data.orders.filter((o) => dateKey(o.createdAt) === today);
  const todayValid = valid.filter((o) => dateKey(o.createdAt) === today);
  const yValid = valid.filter((o) => dateKey(o.createdAt) === yKey);
  const revenue = todayValid.reduce((a, o) => a + o.total, 0);
  const yRevenue = yValid.reduce((a, o) => a + o.total, 0);
  const ticket = todayValid.length ? revenue / todayValid.length : 0;
  const itemsSold = todayValid.reduce((a, o) => a + o.items.reduce((b, i) => b + i.qty, 0), 0);
  const newOrders = todayOrders.filter((o) => o.status === 'novo').length;
  const change = pct(revenue, yRevenue);

  const agg = {};
  valid.forEach((o) => o.items.forEach((i) => {
    const key = i.productId || i.name;
    if (!agg[key]) agg[key] = { name: i.name, qty: 0, revenue: 0, img: (data.products.find((p) => p.id === i.productId) || {}).img };
    agg[key].qty += i.qty;
    agg[key].revenue += i.price * i.qty;
  }));
  const top = Object.values(agg).sort((a, b) => b.qty - a.qty).slice(0, 5);
  const maxQty = top.length ? top[0].qty : 1;

  const recent = [...data.orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 6);

  return `
    <div class="kpi-grid">
      <div class="kpi-card">
        <span class="kpi-icon">${icon('cash')}</span>
        <span class="kpi-value">${money(revenue)}</span>
        <span class="kpi-label">Faturamento hoje</span>
        <span class="kpi-foot"><span class="trend ${change >= 0 ? 'up' : 'down'}">${change >= 0 ? '▲' : '▼'} ${Math.abs(change).toFixed(0)}%</span> vs. ontem</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-icon violet">${icon('bag')}</span>
        <span class="kpi-value">${todayOrders.length}</span>
        <span class="kpi-label">Pedidos hoje</span>
        <span class="kpi-foot">${newOrders ? `<b>${newOrders} novo${newOrders > 1 ? 's' : ''}</b> aguardando` : 'Nenhum pedido pendente'}</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-icon mint">${icon('chart')}</span>
        <span class="kpi-value">${money(ticket)}</span>
        <span class="kpi-label">Ticket médio</span>
        <span class="kpi-foot">entre os pedidos de hoje</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-icon amber">${icon('cake')}</span>
        <span class="kpi-value">${itemsSold}</span>
        <span class="kpi-label">Itens vendidos</span>
        <span class="kpi-foot">${data.products.filter((p) => p.active).length} produtos ativos</span>
      </div>
    </div>

    <div class="dash-grid">
      <section class="panel">
        <div class="panel-head">
          <div><h2>Faturamento dos últimos 7 dias</h2><p>Pedidos concluídos e em andamento, exceto cancelados.</p></div>
          <div class="panel-actions">
            <button class="btn btn-soft btn-sm" type="button" data-act="goto-orders">Ver pedidos</button>
          </div>
        </div>
        <div class="panel-body"><div class="chart-wrap"><canvas id="salesChart"></canvas></div></div>
      </section>
      <section class="panel">
        <div class="panel-head"><div><h2>Mais vendidos</h2><p>Por unidades vendidas</p></div></div>
        <div class="panel-body">
          ${top.length ? `<div class="top-list">${top.map((p, i) => `
            <div class="top-item">
              <span class="rank ${i === 0 ? 'r1' : ''}">${i + 1}</span>
              <div class="top-item-info">
                <strong>${esc(p.name)}</strong>
                <div class="bar"><i style="width:${clamp((p.qty / maxQty) * 100, 8, 100)}%"></i></div>
              </div>
              <b>${p.qty} un.</b>
            </div>`).join('')}</div>`
            : emptyState('chart', 'Sem vendas ainda', 'Os produtos mais vendidos aparecerão aqui.')}
        </div>
      </section>
    </div>

    <section class="panel">
      <div class="panel-head">
        <div><h2>Últimos pedidos</h2><p>Atualizado em tempo real</p></div>
        <div class="panel-actions"><button class="btn btn-soft btn-sm" type="button" data-act="goto-orders">Abrir painel de pedidos</button></div>
      </div>
      <div class="panel-body">
        ${recent.length ? `<div class="table-wrap"><table class="data-table">
          <thead><tr><th>Pedido</th><th>Cliente</th><th>Itens</th><th>Total</th><th>Status</th><th></th></tr></thead>
          <tbody>${recent.map((o) => `
            <tr>
              <td><b class="mono-strong">#${o.code}</b><br><small>${fmtDateTime(o.createdAt)}</small></td>
              <td>${esc(o.customer.name)}<br><small>${TYPE_LABEL[o.type]}</small></td>
              <td>${o.items.reduce((a, i) => a + i.qty, 0)} itens</td>
              <td><b>${money(o.total)}</b></td>
              <td><span class="status-chip s-${o.status}">${STATUS_LABEL[o.status]}</span></td>
              <td><div class="row-actions"><button class="icon-btn" type="button" data-act="open-admin-order" data-id="${esc(o.id)}" title="Detalhes">${icon('arrow')}</button></div></td>
            </tr>`).join('')}</tbody>
        </table></div>` : emptyState('bag', 'Nenhum pedido', 'Os pedidos aparecerão aqui assim que chegarem.')}
      </div>
    </section>`;
}

function renderChart() {
  const canvas = $('#salesChart');
  if (!canvas || typeof Chart === 'undefined') return;
  const labels = [];
  const values = [];
  for (let i = 6; i >= 0; i -= 1) {
    const d = daysAgo(i);
    const k = dateKey(d);
    labels.push(new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(d).replace('.', ''));
    values.push(data.orders.filter((o) => o.status !== 'cancelado' && dateKey(o.createdAt) === k).reduce((a, o) => a + o.total, 0));
  }
  const ctx = canvas.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, 230);
  grad.addColorStop(0, 'rgba(192, 38, 211, .85)');
  grad.addColorStop(1, 'rgba(255, 46, 136, .35)');
  Chart.defaults.font.family = 'Inter, sans-serif';
  Chart.defaults.color = '#8c6fa0';
  state.chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{ data: values, backgroundColor: grad, borderRadius: 9, maxBarThickness: 34, borderSkipped: false }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#260f38', padding: 10, cornerRadius: 10, displayColors: false,
          callbacks: { label: (c) => money(c.parsed.y) }
        }
      },
      scales: {
        x: { grid: { display: false }, border: { display: false }, ticks: { font: { size: 10, weight: '600' } } },
        y: { beginAtZero: true, grid: { color: 'rgba(91,33,120,.07)' }, border: { display: false }, ticks: { font: { size: 10 }, callback: (v) => 'R$ ' + v } }
      }
    }
  });
}

/* ------------------------------------------------------------
   11. Administração — pedidos
   ------------------------------------------------------------ */
function adminOrdersHTML() {
  const filter = state.orderFilter;
  const counts = {};
  STATUS_LIST.forEach((s) => { counts[s] = data.orders.filter((o) => o.status === s).length; });
  const filtered = [...data.orders]
    .filter((o) => filter === 'todos' || o.status === filter)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const cols = filter === 'todos' ? STATUS_LIST : [filter];

  return `
    <section class="panel">
      <div class="panel-head">
        <div><h2>Central de pedidos</h2><p>${data.orders.length} pedidos no total · ${counts.novo || 0} aguardando aceite</p></div>
        <div class="panel-actions">
          <div class="segmented" id="orderFilters">
            <button type="button" class="${filter === 'todos' ? 'active' : ''}" data-act="order-filter" data-filter="todos">Todos</button>
            ${STATUS_LIST.map((s) => `<button type="button" class="${filter === s ? 'active' : ''}" data-act="order-filter" data-filter="${s}">${STATUS_LABEL[s]}${counts[s] ? ` (${counts[s]})` : ''}</button>`).join('')}
          </div>
        </div>
      </div>
      <div class="panel-body">
        <div class="kanban">
          ${cols.map((s) => {
            const list = filtered.filter((o) => o.status === s);
            return `<div class="kanban-col ${s}">
              <div class="kanban-head"><strong>${STATUS_LABEL[s]}</strong><span>${list.length}</span></div>
              ${list.length ? list.map(orderCardHTML).join('') : `<div class="kanban-empty">Nenhum pedido</div>`}
            </div>`;
          }).join('')}
        </div>
      </div>
    </section>`;
}

function orderCardHTML(o) {
  const itemsLabel = o.items.map((i) => `${i.qty}× ${i.name}`).join(' · ');
  return `
    <article class="order-card" data-act="open-admin-order" data-id="${esc(o.id)}">
      <div class="order-card-top">
        <strong>#${o.code}</strong>
        <small>${fmtTime(o.createdAt)}</small>
      </div>
      <div class="order-card-client">${esc(o.customer.name)} · ${TYPE_LABEL[o.type]}</div>
      <div class="order-card-items">${esc(itemsLabel.length > 70 ? itemsLabel.slice(0, 70) + '…' : itemsLabel)}</div>
      <div class="order-card-foot">
        <b>${money(o.total)}</b>
        <span class="status-chip s-${o.status}">${STATUS_LABEL[o.status]}</span>
      </div>
    </article>`;
}

function openAdminOrder(id) {
  const o = data.orders.find((x) => x.id === id);
  if (!o) return;
  const flow = o.type === 'delivery' ? ['novo', 'preparo', 'pronto', 'entrega', 'concluido'] : ['novo', 'preparo', 'pronto', 'concluido'];
  const idx = flow.indexOf(o.status);
  const next = idx >= 0 && idx < flow.length - 1 ? flow[idx + 1] : null;
  const nextLabel = next ? (next === 'preparo' ? 'Aceitar e preparar' : next === 'pronto' ? 'Marcar como pronto' : next === 'entrega' ? 'Saiu para entrega' : 'Concluir pedido') : '';

  openModal(`
    <button class="modal-close" type="button" data-act="close-modal" aria-label="Fechar">${icon('x')}</button>
    <div class="modal-head">
      <div>
        <span class="eyebrow">${icon('bag')} pedido</span>
        <h2>#${o.code}</h2>
        <p>${fmtDayLong(o.createdAt)} · ${fmtTime(o.createdAt)} · ${TYPE_LABEL[o.type]} · ${PAY_LABEL[o.payment]}</p>
      </div>
      <span class="status-chip s-${o.status}">${STATUS_LABEL[o.status]}</span>
    </div>
    <div class="modal-body-pad">
      <div class="stat-row" style="margin-bottom:14px;">
        <div class="mini-stat"><small>Cliente</small><strong style="font-size:13px;margin-top:5px;">${esc(o.customer.name)}</strong><small>${esc(o.customer.phone)}</small></div>
        <div class="mini-stat"><small>Endereço</small><strong style="font-size:12px;margin-top:5px;font-family:Inter;">${o.type === 'delivery' ? esc(o.customer.address || '—') : 'Retirada no balcão'}</strong>${o.type === 'delivery' && o.deliveryKm ? `<small>${String(o.deliveryKm).replace('.', ',')} km da loja</small>` : ''}</div>
        <div class="mini-stat"><small>Total</small><strong>${money(o.total)}</strong><small>${o.coupon ? 'cupom ' + esc(o.coupon) : 'sem cupom'}</small></div>
      </div>
      <div class="panel" style="box-shadow:none;">
        <div class="panel-body">
          <div class="table-wrap"><table class="data-table" style="min-width:0;">
            <thead><tr><th>Item</th><th>Obs.</th><th style="text-align:center;">Qtd</th><th style="text-align:right;">Valor</th></tr></thead>
            <tbody>${o.items.map((i) => `
              <tr>
                <td><b>${esc(i.name)}</b>${i.options ? `<br><small>${esc(i.options)}</small>` : ''}</td>
                <td><small>${esc(i.note || '—')}</small></td>
                <td style="text-align:center;">${i.qty}</td>
                <td style="text-align:right;"><b>${money(i.price * i.qty)}</b></td>
              </tr>`).join('')}</tbody>
          </table></div>
          <div class="summary" style="margin-top:14px;">
            <div class="summary-row"><span>Subtotal</span><b>${money(o.subtotal)}</b></div>
            <div class="summary-row"><span>Entrega</span><b>${o.deliveryFee === 0 ? 'Grátis' : money(o.deliveryFee)}</b></div>
            ${o.discount ? `<div class="summary-row discount"><span>Desconto</span><b>− ${money(o.discount)}</b></div>` : ''}
            <div class="summary-row total"><span>Total</span><b>${money(o.total)}</b></div>
          </div>
          ${o.note ? `<div class="min-warn" style="background:#fcf7ff;color:var(--ink-2);">Observação: ${esc(o.note)}</div>` : ''}
          ${o.payment === 'cash' && o.changeFor ? `<p style="font-size:12px;color:var(--muted);margin-top:8px;">Troco para ${money(o.changeFor)}</p>` : ''}
        </div>
      </div>
    </div>
    <div class="modal-foot" style="justify-content:space-between;flex-wrap:wrap;">
      <div style="display:flex;gap:7px;flex-wrap:wrap;">
        <button class="btn btn-soft btn-sm" type="button" data-act="print-order" data-id="${esc(o.id)}">${icon('print')} Imprimir comanda</button>
        <a class="btn btn-soft btn-sm" href="${waLink(`Olá, ${o.customer.name}! Sobre o pedido #${o.code}:`)}" target="_blank" rel="noopener">${icon('whatsapp')} Cliente</a>
      </div>
      <div style="display:flex;gap:7px;flex-wrap:wrap;">
        ${o.status !== 'cancelado' && o.status !== 'concluido' ? `<button class="btn btn-danger btn-sm" type="button" data-act="set-status" data-id="${esc(o.id)}" data-status="cancelado">Cancelar</button>` : ''}
        ${next ? `<button class="btn btn-primary btn-sm" type="button" data-act="set-status" data-id="${esc(o.id)}" data-status="${next}">${icon('check')} ${nextLabel}</button>` : ''}
      </div>
    </div>`, 'wide');
}

async function setOrderStatus(id, status) {
  const o = data.orders.find((x) => x.id === id);
  if (!o) return;
  if (state.cloud) {
    try {
      await cloudRpc('de_admin_set_status', { p_pin: adminPin(), p_id: id, p_status: status });
    } catch (e) {
      toast('Não foi possível atualizar o pedido online.', 'error');
      return;
    }
  }
  o.status = status;
  o.statusHistory = o.statusHistory || [];
  o.statusHistory.push({ status, at: new Date().toISOString() });
  try { localStorage.setItem(DB_KEY, JSON.stringify(data)); } catch (e) { /* ignore */ }
  closeModal();
  renderAdmin();
  toast(`Pedido #${o.code}: ${STATUS_LABEL[status]}`);
}

function printOrder(id) {
  const o = data.orders.find((x) => x.id === id);
  if (!o) return;
  const area = $('#printArea');
  area.innerHTML = `
    <h1>${esc(data.settings.storeName)} — Comanda #${o.code}</h1>
    <p class="pr-sub">${esc(fmtDayLong(o.createdAt))} · ${esc(fmtTime(o.createdAt))} · ${TYPE_LABEL[o.type]} · ${PAY_LABEL[o.payment]}</p>
    <p><b>Cliente:</b> ${esc(o.customer.name)} · ${esc(o.customer.phone)}</p>
    ${o.type === 'delivery' ? `<p><b>Endereço:</b> ${esc(o.customer.address || '—')}</p>` : '<p><b>Retirada no balcão</b></p>'}
    <table>
      <thead><tr><th>Item</th><th>Qtd</th><th>Valor</th></tr></thead>
      <tbody>${o.items.map((i) => `<tr><td>${esc(i.name)}${i.options ? `<br><small>${esc(i.options)}</small>` : ''}${i.note ? `<br><small>Obs: ${esc(i.note)}</small>` : ''}</td><td>${i.qty}</td><td>${money(i.price * i.qty)}</td></tr>`).join('')}</tbody>
    </table>
    <p class="pr-total">Total: ${money(o.total)}</p>
    ${o.changeFor ? `<p>Troco para: ${money(o.changeFor)}</p>` : ''}
    ${o.note ? `<p class="pr-note"><b>Observações:</b> ${esc(o.note)}</p>` : ''}
    <p class="pr-note">${esc(data.settings.storeName)} · ${esc(data.settings.phone)} · ${esc(data.settings.address)}</p>`;
  window.print();
  setTimeout(() => { area.innerHTML = ''; }, 800);
}

/* ------------------------------------------------------------
   12. Administração — cardápio
   ------------------------------------------------------------ */
function adminMenuHTML() {
  const q = state.menuFilter.q.toLowerCase();
  const cat = state.menuFilter.cat;
  const list = data.products.filter((p) =>
    (cat === 'all' || p.cat === cat) &&
    (!q || `${p.name} ${p.desc}`.toLowerCase().includes(q))
  );
  return `
    <section class="panel">
      <div class="panel-head">
        <div><h2>Produtos do cardápio</h2><p>${data.products.filter((p) => p.active).length} ativos · ${data.products.length} no total</p></div>
        <div class="panel-actions">
          <button class="btn btn-primary btn-sm" type="button" data-act="new-product">${icon('plus')} Novo produto</button>
        </div>
      </div>
      <div class="panel-body">
        <div class="toolbar" style="margin-bottom:16px;">
          <div class="search-inline">
            ${icon('search')}
            <input class="input" id="adminMenuSearch" placeholder="Buscar produto..." value="${esc(state.menuFilter.q)}">
          </div>
          <select class="input" id="adminMenuCat" style="max-width:200px;">
            <option value="all"${cat === 'all' ? ' selected' : ''}>Todas as categorias</option>
            ${data.categories.map((c) => `<option value="${esc(c.id)}"${cat === c.id ? ' selected' : ''}>${esc(c.name)}</option>`).join('')}
          </select>
        </div>
        ${list.length ? `<div class="menu-admin-grid">
          ${list.map((p) => `
            <article class="admin-prod ${p.active ? '' : 'off'}">
              <div class="admin-prod-img">
                <img src="${esc(p.img)}" alt="${esc(p.name)}" loading="lazy">
                <div class="prod-flags">
                  ${p.promo ? '<span class="flag hot">Oferta</span>' : ''}
                  ${p.featured ? '<span class="flag">Destaque</span>' : ''}
                  ${!p.active ? '<span class="flag off">Pausado</span>' : ''}
                </div>
              </div>
              <div class="admin-prod-body">
                <strong>${esc(p.name)}</strong>
                <small>${esc(categoryName(p.cat))} · ${p.sold || 0} vendidos</small>
                <span class="price">${money(effectivePrice(p))}${p.promo ? ` <small style="color:var(--muted-2);text-decoration:line-through;">${money(p.price)}</small>` : ''}</span>
                <div class="admin-prod-actions">
                  <button class="btn btn-soft" type="button" data-act="edit-product" data-id="${esc(p.id)}">${icon('edit')} Editar</button>
                  <button class="btn btn-soft" type="button" data-act="toggle-product" data-id="${esc(p.id)}">${p.active ? 'Pausar' : 'Ativar'}</button>
                  <button class="btn btn-soft" type="button" data-act="del-product" data-id="${esc(p.id)}" aria-label="Excluir">${icon('trash')}</button>
                </div>
              </div>
            </article>`).join('')}
        </div>` : emptyState('cake', 'Nenhum produto encontrado', 'Ajuste a busca ou crie um novo produto.', `<button class="btn btn-primary btn-sm" type="button" data-act="new-product">${icon('plus')} Novo produto</button>`)}
      </div>
    </section>`;
}

function bindAdminMenuEvents() {
  const search = $('#adminMenuSearch');
  if (search) {
    search.addEventListener('input', () => {
      state.menuFilter.q = search.value;
      const focused = document.activeElement === search;
      $('#adminContent').innerHTML = adminMenuHTML();
      bindAdminMenuEvents();
      if (focused) { const s = $('#adminMenuSearch'); s.focus(); s.setSelectionRange(s.value.length, s.value.length); }
    });
  }
  const cat = $('#adminMenuCat');
  if (cat) cat.addEventListener('change', () => { state.menuFilter.cat = cat.value; renderAdmin(); });
}

function imagePickerHTML(selected) {
  return `
    <div class="image-picker">
      ${APP_IMAGES.map((src) => `
        <button type="button" class="image-opt ${src === selected ? 'on' : ''}" data-act="pick-image" data-src="${esc(src)}" title="Usar esta imagem">
          <img src="${esc(src)}" alt="" loading="lazy">
          <span class="sel">${icon('check')}</span>
        </button>`).join('')}
    </div>
    <label class="upload-zone">${icon('upload')} Enviar imagem do computador
      <input type="file" accept="image/*" id="prodImgUpload">
    </label>
    <input type="hidden" name="image" id="prodImage" value="${esc(selected || APP_IMAGES[0])}">`;
}

function heroImageOptHTML(src, selected) {
  return `<div class="image-opt-wrap">
    <button type="button" class="image-opt ${src === selected ? 'on' : ''}" data-act="pick-hero" data-src="${esc(src)}" title="Usar esta imagem">
      <img src="${esc(src)}" alt="" loading="lazy">
      <span class="sel">${icon('check')}</span>
    </button>
    <button type="button" class="image-del" data-act="del-hero-image" data-src="${esc(src)}" title="Remover da galeria" aria-label="Remover imagem da galeria">${icon('x')}</button>
  </div>`;
}

function heroGalleryHTML(gallery, selected) {
  return (Array.isArray(gallery) ? gallery : DEFAULT_GALLERY).map((src) => heroImageOptHTML(src, selected)).join('');
}

function heroGalleryFromInput() {
  try {
    const parsed = JSON.parse($('#heroGalleryInput').value || '[]');
    return Array.isArray(parsed) ? parsed.filter((src) => typeof src === 'string' && src) : DEFAULT_GALLERY.slice();
  } catch (e) {
    return DEFAULT_GALLERY.slice();
  }
}

function setHeroGallery(gallery, selected) {
  $('#heroGalleryInput').value = JSON.stringify(gallery);
  $('#heroImageInput').value = selected;
  $('#heroPicker').innerHTML = heroGalleryHTML(gallery, selected);
}

function imageFileToDataUrl(file, maxSize = 1400, quality = 0.82) {
  return new Promise((resolve, reject) => {
    if (!file || !/^image\//.test(file.type)) { reject(new Error('type')); return; }
    if (file.size > 6 * 1024 * 1024) { reject(new Error('size')); return; }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/jpeg', quality));
      } catch (e) { URL.revokeObjectURL(url); reject(e); }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('read')); };
    img.src = url;
  });
}

function openProductForm(id) {
  const p = id ? data.products.find((x) => x.id === id) : null;
  const sizes = p ? (p.sizes || []) : [];
  const extras = p ? (p.extras || []) : [];
  openModal(`
    <button class="modal-close" type="button" data-act="close-modal" aria-label="Fechar">${icon('x')}</button>
    <div class="modal-head">
      <div>
        <span class="eyebrow">${icon('cake')} cardápio</span>
        <h2>${p ? 'Editar produto' : 'Novo produto'}</h2>
        <p>${p ? 'Atualize as informações do item.' : 'Preencha os dados do novo item do cardápio.'}</p>
      </div>
    </div>
    <form id="productForm">
      <div class="modal-body-pad">
        <div class="form-grid">
          <div class="field span-2">
            <label for="pfName">Nome do produto</label>
            <input id="pfName" name="name" required maxlength="70" value="${esc(p ? p.name : '')}" placeholder="Ex.: Bolo de morango com chantilly">
          </div>
          <div class="field">
            <label for="pfCat">Categoria</label>
            <select id="pfCat" name="cat" required>
              ${data.categories.map((c) => `<option value="${esc(c.id)}"${p && p.cat === c.id ? ' selected' : ''}>${esc(c.name)}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label for="pfBadge">Selo (opcional)</label>
            <input id="pfBadge" name="badge" maxlength="20" value="${esc(p ? p.badge : '')}" placeholder="Ex.: Mais pedido">
          </div>
          <div class="field">
            <label for="pfPrice">Preço base (R$)</label>
            <input id="pfPrice" name="price" type="number" min="0" step="0.01" required value="${p ? p.price : ''}" placeholder="0,00">
          </div>
          <div class="field">
            <label for="pfPromo">Preço promocional (R$)</label>
            <input id="pfPromo" name="promo" type="number" min="0" step="0.01" value="${p && p.promo ? p.promo : ''}" placeholder="Opcional">
          </div>
          <div class="field span-2">
            <label for="pfDesc">Descrição</label>
            <textarea id="pfDesc" name="desc" maxlength="240" required placeholder="Descreva os ingredientes e o que torna esse item especial.">${esc(p ? p.desc : '')}</textarea>
          </div>
          <div class="field span-2">
            <label>Imagem</label>
            ${imagePickerHTML(p ? p.img : APP_IMAGES[1])}
            <small>Use uma foto da galeria ou envie do seu computador (até 300 KB).</small>
          </div>
          <div class="field span-2">
            <label>Tamanhos (opcional)</label>
            <div class="option-builder" id="sizeRows">
              ${sizes.map((s) => sizeRowHTML(s.name, s.delta)).join('')}
            </div>
            <button class="btn btn-soft btn-sm" type="button" data-act="add-size" style="align-self:flex-start;">${icon('plus')} Adicionar tamanho</button>
          </div>
          <div class="field span-2">
            <label>Adicionais (opcional)</label>
            <div class="option-builder" id="extraRows">
              ${extras.map((e) => extraRowHTML(e.name, e.price)).join('')}
            </div>
            <button class="btn btn-soft btn-sm" type="button" data-act="add-extra" style="align-self:flex-start;">${icon('plus')} Adicionar adicional</button>
          </div>
          <div class="field span-2">
            <div class="field-row" style="gap:22px;">
              <label class="check-line"><input type="checkbox" name="active" ${!p || p.active ? 'checked' : ''}> Disponível no cardápio</label>
              <label class="check-line"><input type="checkbox" name="featured" ${p && p.featured ? 'checked' : ''}> Destacar na loja</label>
            </div>
          </div>
        </div>
      </div>
      <div class="modal-foot">
        <button class="btn btn-soft" type="button" data-act="close-modal">Cancelar</button>
        <button class="btn btn-primary" type="submit">${icon('check')} ${p ? 'Salvar alterações' : 'Criar produto'}</button>
      </div>
    </form>`, 'wide');

  const form = $('#productForm');
  $('#prodImgUpload').addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (file.size > 320 * 1024) { toast('A imagem deve ter até 300 KB. Escolha uma foto menor.', 'error'); e.target.value = ''; return; }
    const reader = new FileReader();
    reader.onload = () => {
      $('#prodImage').value = reader.result;
      $$('#productForm .image-opt').forEach((b) => b.classList.remove('on'));
      toast('Imagem carregada — salve para aplicar.');
    };
    reader.readAsDataURL(file);
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const name = String(fd.get('name') || '').trim();
    const price = num(fd.get('price'));
    if (!name || price <= 0) { toast('Informe nome e preço válidos.', 'error'); return; }
    const sizesArr = $$('#sizeRows .option-row').map((row) => ({
      name: row.querySelector('[data-size-name]').value.trim(),
      delta: num(row.querySelector('[data-size-delta]').value)
    })).filter((s) => s.name);
    const extrasArr = $$('#extraRows .option-row').map((row) => ({
      name: row.querySelector('[data-extra-name]').value.trim(),
      price: num(row.querySelector('[data-extra-price]').value)
    })).filter((x) => x.name);

    const payload = {
      name, cat: String(fd.get('cat')), desc: String(fd.get('desc') || '').trim(),
      price, promo: fd.get('promo') ? num(fd.get('promo')) : null,
      badge: String(fd.get('badge') || '').trim(),
      img: String(fd.get('image') || APP_IMAGES[1]),
      active: !!fd.get('active'), featured: !!fd.get('featured'),
      sizes: sizesArr, extras: extrasArr
    };
    if (p) {
      Object.assign(p, payload);
    } else {
      data.products.unshift({ id: uid('p'), sold: 0, ...payload });
    }
    if (!saveData()) return;
    closeModal();
    renderAdmin();
    refreshStorefront();
    toast(p ? 'Produto atualizado!' : 'Produto criado!');
  });
}

function sizeRowHTML(name = '', delta = 0) {
  return `<div class="option-row">
    <input class="input" placeholder="Nome do tamanho" data-size-name value="${esc(name)}">
    <input class="input" type="number" step="0.01" placeholder="+ R$" data-size-delta value="${esc(delta)}">
    <button class="icon-btn" type="button" data-act="remove-row" aria-label="Remover">${icon('trash')}</button>
  </div>`;
}
function extraRowHTML(name = '', price = 0) {
  return `<div class="option-row">
    <input class="input" placeholder="Nome do adicional" data-extra-name value="${esc(name)}">
    <input class="input" type="number" step="0.01" placeholder="R$" data-extra-price value="${esc(price)}">
    <button class="icon-btn" type="button" data-act="remove-row" aria-label="Remover">${icon('trash')}</button>
  </div>`;
}

/* ------------------------------------------------------------
   13. Administração — categorias
   ------------------------------------------------------------ */
function adminCategoriesHTML() {
  return `
    <section class="panel">
      <div class="panel-head">
        <div><h2>Categorias do cardápio</h2><p>A ordem abaixo define a ordem das seções na loja.</p></div>
        <div class="panel-actions">
          <button class="btn btn-primary btn-sm" type="button" data-act="new-cat">${icon('plus')} Nova categoria</button>
        </div>
      </div>
      <div class="panel-body">
        <div class="table-wrap"><table class="data-table">
          <thead><tr><th>Categoria</th><th>Produtos</th><th>Ordem</th><th></th></tr></thead>
          <tbody>${data.categories.map((c, i) => `
            <tr>
              <td><div class="cell-prod"><span class="section-icon" style="width:34px;height:34px;">${icon(c.icon || 'cake')}</span><strong>${esc(c.name)}</strong></div></td>
              <td>${data.products.filter((p) => p.cat === c.id).length}</td>
              <td><span class="mono-strong">${i + 1}º</span></td>
              <td><div class="row-actions">
                <button class="icon-btn" type="button" data-act="move-cat" data-id="${esc(c.id)}" data-dir="-1" ${i === 0 ? 'disabled' : ''} title="Subir">↑</button>
                <button class="icon-btn" type="button" data-act="move-cat" data-id="${esc(c.id)}" data-dir="1" ${i === data.categories.length - 1 ? 'disabled' : ''} title="Descer">↓</button>
                <button class="icon-btn" type="button" data-act="edit-cat" data-id="${esc(c.id)}" title="Editar">${icon('edit')}</button>
                <button class="icon-btn" type="button" data-act="del-cat" data-id="${esc(c.id)}" title="Excluir">${icon('trash')}</button>
              </div></td>
            </tr>`).join('')}</tbody>
        </table></div>
      </div>
    </section>`;
}

function openCategoryForm(id) {
  const c = id ? data.categories.find((x) => x.id === id) : null;
  const iconsList = [['cake', 'Bolo'], ['pie', 'Torta'], ['slice', 'Fatia'], ['cupcake', 'Cupcake'], ['candy', 'Doce'], ['spark', 'Especial'], ['snack', 'Salgado'], ['drink', 'Bebida'], ['heart', 'Coração']];
  openModal(`
    <button class="modal-close" type="button" data-act="close-modal" aria-label="Fechar">${icon('x')}</button>
    <div class="modal-head">
      <div><span class="eyebrow">${icon('tag')} cardápio</span><h2>${c ? 'Editar categoria' : 'Nova categoria'}</h2><p>Defina o nome e o ícone da seção.</p></div>
    </div>
    <form id="catForm">
      <div class="modal-body-pad">
        <div class="form-grid">
          <div class="field span-2"><label for="cfName">Nome</label><input id="cfName" name="name" required maxlength="30" value="${esc(c ? c.name : '')}" placeholder="Ex.: Kits para festa"></div>
          <div class="field span-2"><label for="cfIcon">Ícone</label>
            <select id="cfIcon" name="icon">${iconsList.map(([v, l]) => `<option value="${v}"${c && c.icon === v ? ' selected' : ''}>${l}</option>`).join('')}</select>
          </div>
        </div>
      </div>
      <div class="modal-foot">
        <button class="btn btn-soft" type="button" data-act="close-modal">Cancelar</button>
        <button class="btn btn-primary" type="submit">${icon('check')} Salvar</button>
      </div>
    </form>`, 'narrow');
  $('#catForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = $('#cfName').value.trim();
    const ic = $('#cfIcon').value;
    if (!name) return;
    if (c) { c.name = name; c.icon = ic; }
    else data.categories.push({ id: uid('cat'), name, icon: ic });
    saveData();
    closeModal();
    renderAdmin();
    refreshStorefront();
    toast('Categoria salva!');
  });
}

/* ------------------------------------------------------------
   14. Administração — cupons
   ------------------------------------------------------------ */
function couponRuleLabel(c) {
  if (c.type === 'percent') return `${c.value}% de desconto`;
  if (c.type === 'fixed') return `${money(c.value)} de desconto`;
  return 'Frete grátis';
}

function adminCouponsHTML() {
  return `
    <section class="panel">
      <div class="panel-head">
        <div><h2>Cupons de desconto</h2><p>${data.coupons.filter((c) => c.active).length} cupons ativos</p></div>
        <div class="panel-actions"><button class="btn btn-primary btn-sm" type="button" data-act="new-coupon">${icon('plus')} Novo cupom</button></div>
      </div>
      <div class="panel-body">
        ${data.coupons.length ? `<div class="coupon-grid">
          ${data.coupons.map((c) => `
            <article class="coupon-card">
              <span class="coupon-status status-chip ${c.active ? 's-concluido' : 's-cancelado'}">${c.active ? 'Ativo' : 'Inativo'}</span>
              <div class="coupon-code">${esc(c.code)}</div>
              <div class="coupon-meta">
                ${esc(couponRuleLabel(c))} · mínimo ${money(c.minOrder)}<br>
                ${c.limit ? `${c.uses}/${c.limit} usos` : `${c.uses} usos`} · validade ${esc(c.expires || 'sem prazo')}
              </div>
              <div class="admin-prod-actions">
                <button class="btn btn-soft" type="button" data-act="edit-coupon" data-id="${esc(c.id)}">${icon('edit')} Editar</button>
                <button class="btn btn-soft" type="button" data-act="toggle-coupon" data-id="${esc(c.id)}">${c.active ? 'Pausar' : 'Ativar'}</button>
                <button class="btn btn-soft" type="button" data-act="del-coupon" data-id="${esc(c.id)}" aria-label="Excluir">${icon('trash')}</button>
              </div>
            </article>`).join('')}
        </div>` : emptyState('tag', 'Nenhum cupom criado', 'Crie um cupom para sua primeira promoção.', `<button class="btn btn-primary btn-sm" type="button" data-act="new-coupon">${icon('plus')} Novo cupom</button>`)}
      </div>
    </section>`;
}

function openCouponForm(id) {
  const c = id ? data.coupons.find((x) => x.id === id) : null;
  openModal(`
    <button class="modal-close" type="button" data-act="close-modal" aria-label="Fechar">${icon('x')}</button>
    <div class="modal-head"><div><span class="eyebrow">${icon('tag')} promoções</span><h2>${c ? 'Editar cupom' : 'Novo cupom'}</h2><p>Defina a regra e a validade da promoção.</p></div></div>
    <form id="couponForm">
      <div class="modal-body-pad">
        <div class="form-grid">
          <div class="field"><label for="cfCode">Código</label><input id="cfCode" name="code" required maxlength="20" value="${esc(c ? c.code : '')}" placeholder="Ex.: BEMVINDA10" style="text-transform:uppercase;"></div>
          <div class="field"><label for="cfType">Tipo</label>
            <select id="cfType" name="type">
              <option value="percent"${c && c.type === 'percent' ? ' selected' : ''}>Percentual (%)</option>
              <option value="fixed"${c && c.type === 'fixed' ? ' selected' : ''}>Valor fixo (R$)</option>
              <option value="shipping"${c && c.type === 'shipping' ? ' selected' : ''}>Frete grátis</option>
            </select>
          </div>
          <div class="field"><label for="cfValue">Valor</label><input id="cfValue" name="value" type="number" min="0" step="0.01" value="${c ? c.value : 10}"></div>
          <div class="field"><label for="cfMin">Pedido mínimo (R$)</label><input id="cfMin" name="minOrder" type="number" min="0" step="0.01" value="${c ? c.minOrder : 40}"></div>
          <div class="field"><label for="cfExp">Validade</label><input id="cfExp" name="expires" type="date" value="${c ? c.expires : ''}"></div>
          <div class="field"><label for="cfLimit">Limite de usos (0 = ilimitado)</label><input id="cfLimit" name="limit" type="number" min="0" step="1" value="${c ? c.limit : 0}"></div>
          <div class="field span-2"><label class="check-line"><input type="checkbox" name="active" ${!c || c.active ? 'checked' : ''}> Cupom ativo</label></div>
        </div>
      </div>
      <div class="modal-foot">
        <button class="btn btn-soft" type="button" data-act="close-modal">Cancelar</button>
        <button class="btn btn-primary" type="submit">${icon('check')} Salvar cupom</button>
      </div>
    </form>`, 'narrow');

  $('#couponForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const code = $('#cfCode').value.trim().toUpperCase();
    if (!code) return;
    if (data.coupons.some((x) => x.code.toUpperCase() === code && (!c || x.id !== c.id))) {
      toast('Já existe um cupom com esse código.', 'error');
      return;
    }
    const payload = {
      code, type: $('#cfType').value, value: num($('#cfValue').value),
      minOrder: num($('#cfMin').value), expires: $('#cfExp').value, limit: Math.max(0, Math.round(num($('#cfLimit').value)))
    };
    if (c) Object.assign(c, payload);
    else data.coupons.unshift({ id: uid('c'), uses: 0, active: true, ...payload });
    if (!c) {
      const created = data.coupons[0];
      created.active = $('#couponForm input[name="active"]').checked;
    } else {
      c.active = $('#couponForm input[name="active"]').checked;
    }
    saveData();
    closeModal();
    renderAdmin();
    toast('Cupom salvo!');
  });
}

/* ------------------------------------------------------------
   15. Administração — relatórios
   ------------------------------------------------------------ */
function computeReport() {
  const { from, to } = state.report;
  const all = ordersInRange(from, to);
  const valid = all.filter((o) => o.status !== 'cancelado');
  const revenue = valid.reduce((a, o) => a + o.total, 0);
  const items = valid.reduce((a, o) => a + o.items.reduce((b, i) => b + i.qty, 0), 0);
  const payments = { pix: 0, card: 0, cash: 0 };
  valid.forEach((o) => { payments[o.payment] = (payments[o.payment] || 0) + o.total; });
  const agg = {};
  valid.forEach((o) => o.items.forEach((i) => {
    const key = i.productId || i.name;
    if (!agg[key]) agg[key] = { name: i.name, qty: 0, revenue: 0 };
    agg[key].qty += i.qty;
    agg[key].revenue += i.price * i.qty;
  }));
  const top = Object.values(agg).sort((a, b) => b.revenue - a.revenue).slice(0, 8);
  const byDay = {};
  valid.forEach((o) => {
    const k = dateKey(o.createdAt);
    if (!byDay[k]) byDay[k] = { orders: 0, revenue: 0 };
    byDay[k].orders += 1;
    byDay[k].revenue += o.total;
  });
  return { all, valid, revenue, items, payments, top, byDay, ticket: valid.length ? revenue / valid.length : 0 };
}

function adminReportsHTML() {
  const r = computeReport();
  const totalPay = Object.values(r.payments).reduce((a, b) => a + b, 0) || 1;
  const days = Object.keys(r.byDay).sort().reverse();
  return `
    <section class="panel">
      <div class="panel-head">
        <div><h2>Relatório de vendas</h2><p>Escolha o período e exporte os dados.</p></div>
      </div>
      <div class="panel-body">
        <div class="report-filters">
          <div class="field"><label for="repFrom">De</label><input id="repFrom" type="date" value="${esc(state.report.from)}"></div>
          <div class="field"><label for="repTo">Até</label><input id="repTo" type="date" value="${esc(state.report.to)}"></div>
          <button class="btn btn-primary btn-sm" type="button" data-act="apply-report">${icon('search')} Aplicar</button>
          <div style="flex:1;"></div>
          <button class="btn btn-soft btn-sm" type="button" data-act="export-csv">${icon('download')} CSV</button>
          <button class="btn btn-soft btn-sm" type="button" data-act="export-xlsx">${icon('download')} Excel</button>
          <button class="btn btn-soft btn-sm" type="button" data-act="export-pdf">${icon('download')} PDF</button>
        </div>
        <div class="stat-row" style="margin-top:18px;">
          <div class="mini-stat"><small>Faturamento</small><strong>${money(r.revenue)}</strong></div>
          <div class="mini-stat"><small>Pedidos válidos</small><strong>${r.valid.length}</strong></div>
          <div class="mini-stat"><small>Ticket médio</small><strong>${money(r.ticket)}</strong></div>
        </div>
      </div>
    </section>

    <div class="dash-grid">
      <section class="panel">
        <div class="panel-head"><div><h2>Vendas por dia</h2><p>${esc(state.report.from)} até ${esc(state.report.to)}</p></div></div>
        <div class="panel-body"><div class="table-wrap"><table class="data-table">
          <thead><tr><th>Dia</th><th>Pedidos</th><th style="text-align:right;">Faturamento</th></tr></thead>
          <tbody>${days.length ? days.map((k) => `<tr><td>${esc(new Date(k + 'T12:00:00').toLocaleDateString('pt-BR'))}</td><td>${r.byDay[k].orders}</td><td style="text-align:right;"><b>${money(r.byDay[k].revenue)}</b></td></tr>`).join('') : '<tr><td colspan="3">Nenhuma venda no período.</td></tr>'}</tbody>
        </table></div></div>
      </section>
      <section class="panel">
        <div class="panel-head"><div><h2>Formas de pagamento</h2><p>Participação no faturamento</p></div></div>
        <div class="panel-body">
          <div class="pay-list">
            ${['pix', 'card', 'cash'].map((k) => `
              <div class="pay-line">
                <span>${PAY_LABEL[k]}</span>
                <span class="bar"><i style="width:${(r.payments[k] / totalPay) * 100}%"></i></span>
                <b>${money(r.payments[k] || 0)}</b>
              </div>`).join('')}
          </div>
        </div>
      </section>
    </div>

    <section class="panel">
      <div class="panel-head"><div><h2>Produtos vendidos</h2><p>Ranking por faturamento no período</p></div></div>
      <div class="panel-body">
        ${r.top.length ? `<div class="table-wrap"><table class="data-table">
          <thead><tr><th>Produto</th><th>Unidades</th><th style="text-align:right;">Faturamento</th></tr></thead>
          <tbody>${r.top.map((p) => `<tr><td>${esc(p.name)}</td><td>${p.qty}</td><td style="text-align:right;"><b>${money(p.revenue)}</b></td></tr>`).join('')}</tbody>
        </table></div>` : emptyState('chart', 'Sem vendas no período', 'Escolha outro intervalo de datas.')}
      </div>
    </section>`;
}

function bindReportEvents() {
  // inputs read on "Aplicar" via data-act handler
}

function exportRows() {
  const { from, to } = state.report;
  const orders = ordersInRange(from, to).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  return orders.map((o) => ({
    Pedido: `#${o.code}`,
    Data: fmtDateTime(o.createdAt),
    Cliente: o.customer.name,
    Telefone: o.customer.phone,
    Tipo: TYPE_LABEL[o.type],
    Pagamento: PAY_LABEL[o.payment],
    Status: STATUS_LABEL[o.status],
    Itens: o.items.map((i) => `${i.qty}x ${i.name}`).join(' | '),
    Subtotal: o.subtotal,
    Entrega: o.deliveryFee,
    Desconto: o.discount,
    Total: o.total
  }));
}

function downloadFile(filename, content, mime) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime || 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportCSV() {
  const rows = exportRows();
  if (!rows.length) { toast('Nenhum pedido no período.', 'error'); return; }
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(';')].concat(rows.map((r) => headers.map((h) => `"${String(r[h]).replace(/"/g, '""')}"`).join(';')));
  downloadFile(`relatorio-${state.report.from}-a-${state.report.to}.csv`, '\uFEFF' + lines.join('\r\n'), 'text/csv;charset=utf-8');
  toast('Relatório CSV exportado.');
}

function exportXLSX() {
  const rows = exportRows();
  if (!rows.length) { toast('Nenhum pedido no período.', 'error'); return; }
  if (typeof XLSX === 'undefined') { toast('Biblioteca de Excel indisponível.', 'error'); return; }
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Pedidos');
  XLSX.writeFile(wb, `relatorio-${state.report.from}-a-${state.report.to}.xlsx`);
  toast('Planilha Excel exportada.');
}

function exportPDF() {
  const rows = exportRows();
  if (!rows.length) { toast('Nenhum pedido no período.', 'error'); return; }
  const jsPDFCtor = window.jspdf && window.jspdf.jsPDF;
  if (!jsPDFCtor) { toast('Biblioteca de PDF indisponível.', 'error'); return; }
  const r = computeReport();
  const doc = new jsPDFCtor({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  doc.setFontSize(18);
  doc.text(`${data.settings.storeName} — Relatório de vendas`, 40, 46);
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(`Período: ${state.report.from} até ${state.report.to}  ·  Faturamento: ${money(r.revenue)}  ·  Pedidos: ${r.valid.length}  ·  Ticket médio: ${money(r.ticket)}`, 40, 64);
  doc.autoTable({
    startY: 80,
    head: [['Pedido', 'Data', 'Cliente', 'Tipo', 'Pagamento', 'Status', 'Total']],
    body: rows.map((x) => [x.Pedido, x.Data, x.Cliente, x.Tipo, x.Pagamento, x.Status, money(x.Total)]),
    styles: { fontSize: 8, cellPadding: 5 },
    headStyles: { fillColor: [192, 38, 211], textColor: 255 },
    alternateRowStyles: { fillColor: [252, 247, 255] },
    margin: { left: 40, right: 40 }
  });
  doc.save(`relatorio-${state.report.from}-a-${state.report.to}.pdf`);
  toast('Relatório PDF exportado.');
}

/* ------------------------------------------------------------
   16. Administração — avaliações
   ------------------------------------------------------------ */
function adminReviewsHTML() {
  const reviews = [...data.reviews].sort((a, b) => new Date(b.date) - new Date(a.date));
  const avg = reviews.length ? reviews.reduce((a, r) => a + r.rating, 0) / reviews.length : 0;
  return `
    <section class="panel">
      <div class="panel-head">
        <div><h2>Avaliações dos clientes</h2><p>${reviews.length} avaliações · média ${avg.toFixed(1).replace('.', ',')}</p></div>
      </div>
      <div class="panel-body">
        ${reviews.length ? `<div class="review-admin-list">
          ${reviews.map((r) => `
            <article class="rev-admin">
              <div class="rev-admin-body">
                <strong>${esc(r.name)}</strong><small>${esc(fmtDateTime(r.date))} ${r.orderId ? '· pedido ' + esc(r.orderId).replace('o-', '#') : ''}</small>
                ${starRow(r.rating)}
                <p>${esc(r.text)}</p>
              </div>
              <button class="icon-btn" type="button" data-act="del-review" data-id="${esc(r.id)}" title="Excluir avaliação">${icon('trash')}</button>
            </article>`).join('')}
        </div>` : emptyState('star', 'Nenhuma avaliação', 'As avaliações dos clientes aparecerão aqui.')}
      </div>
    </section>`;
}

/* ------------------------------------------------------------
   17. Administração — configurações
   ------------------------------------------------------------ */
function adminSettingsHTML() {
  const s = data.settings;
  return `
    <form id="settingsForm">
      <div class="settings-grid">
          <section class="settings-card">
            <div class="settings-card-head">
              <div><h3>Identidade da loja</h3><p>Como sua marca aparece para os clientes.</p></div>
              <button class="btn btn-soft btn-sm" type="submit" data-save="Identidade da loja">Salvar</button>
            </div>
            <div class="form-grid">
              <div class="field"><label for="stName">Nome da loja</label><input id="stName" name="storeName" required maxlength="40" value="${esc(s.storeName)}"></div>
              <div class="field"><label for="stTag">Slogan</label><input id="stTag" name="tagline" maxlength="40" value="${esc(s.tagline)}"></div>
              <div class="field"><label for="stPhone">Telefone</label><input id="stPhone" name="phone" maxlength="20" value="${esc(s.phone)}"></div>
              <div class="field"><label for="stWhats">WhatsApp (só números)</label><input id="stWhats" name="whatsapp" maxlength="20" value="${esc(s.whatsapp)}" placeholder="5521999990000"></div>
              <div class="field"><label for="stInsta">Instagram</label><input id="stInsta" name="instagram" maxlength="40" value="${esc(s.instagram)}"></div>
              <div class="field"><label for="stPix">Chave Pix</label><input id="stPix" name="pixKey" maxlength="80" value="${esc(s.pixKey)}"></div>
            </div>
          </section>

          <section class="settings-card">
            <div class="settings-card-head">
              <div><h3>Pagamentos</h3><p>Formas aceitas no checkout.</p></div>
              <button class="btn btn-soft btn-sm" type="submit" data-save="Pagamentos">Salvar</button>
            </div>
            <div class="check-row">
              <label class="check-line"><input type="checkbox" name="payPix" ${s.payment.pix ? 'checked' : ''}> Pix</label>
              <label class="check-line"><input type="checkbox" name="payCard" ${s.payment.card ? 'checked' : ''}> Cartão (débito ou crédito)</label>
              <label class="check-line"><input type="checkbox" name="payCash" ${s.payment.cash ? 'checked' : ''}> Dinheiro</label>
            </div>
            <p style="font-size:11px;color:var(--muted-2);margin-top:10px;">Deixe pelo menos uma forma ativa.</p>
          </section>

          <section class="settings-card">
            <div class="settings-card-head">
              <div><h3>Entrega e operação</h3><p>Defina como o cliente recebe o pedido e a área atendida.</p></div>
              <button class="btn btn-soft btn-sm" type="submit" data-save="Entrega e operação">Salvar</button>
            </div>
            <div class="form-grid grid-3">
              <div class="field"><label for="stMode">Status</label>
                <select id="stMode" name="openMode">
                  <option value="auto"${s.openMode === 'auto' ? ' selected' : ''}>Seguir horário</option>
                  <option value="open"${s.openMode === 'open' ? ' selected' : ''}>Sempre aberta</option>
                  <option value="closed"${s.openMode === 'closed' ? ' selected' : ''}>Pausada</option>
                </select>
              </div>
              <div class="field"><label for="stEtaMin">Tempo mínimo (min)</label><input id="stEtaMin" name="etaMin" type="number" min="0" value="${s.etaMin}"></div>
              <div class="field"><label for="stEtaMax">Tempo máximo (min)</label><input id="stEtaMax" name="etaMax" type="number" min="0" value="${s.etaMax}"></div>
            </div>
            <div class="form-grid">
              <div class="field span-2">
                <label class="check-line"><input type="checkbox" name="deliveryEnabled" ${s.deliveryEnabled !== false ? 'checked' : ''}> Oferecer entrega nos pedidos</label>
                <p style="font-size:11px;color:var(--muted-2);margin-top:4px;">Se desativar, o checkout aceita apenas retirada no balcão.</p>
              </div>
              <div class="field"><label for="stFee">Taxa de entrega (R$)</label><input id="stFee" name="deliveryFee" type="number" min="0" step="0.01" value="${s.deliveryFee}"></div>
              <div class="field"><label for="stFree">Frete grátis acima de (R$)</label><input id="stFree" name="freeFrom" type="number" min="0" step="0.01" value="${s.freeFrom}"></div>
              <div class="field"><label for="stMin">Pedido mínimo (R$)</label><input id="stMin" name="minOrder" type="number" min="0" step="0.01" value="${s.minOrder}"></div>
              <div class="field"><label for="stRadius">Raio máximo de entrega (km)</label><input id="stRadius" name="deliveryRadiusKm" type="number" min="0" step="0.5" value="${s.deliveryRadiusKm}"><small style="font-size:10.5px;color:var(--muted-2);">Use 0 para não limitar.</small></div>
              <div class="field span-2"><label for="stAddr">Endereço da loja (origem do raio)</label><input id="stAddr" name="address" maxlength="140" value="${esc(s.address)}" placeholder="Rua, número, bairro, cidade"></div>
              <div class="geo-status">${s.storeLat != null && s.geoAddress === s.address
                ? `Origem do raio localizada (${s.storeLat.toFixed(4)}, ${s.storeLng.toFixed(4)}). Ao alterar o endereço, a localização é atualizada automaticamente.`
                : 'O endereço será localizado automaticamente ao salvar. O limite por distância fica ativo somente depois da localização.'}</div>
            </div>
          </section>

          <section class="settings-card">
            <div class="settings-card-head">
              <div><h3>Horário de funcionamento</h3><p>Usado quando o status está em “Seguir horário”.</p></div>
              <button class="btn btn-soft btn-sm" type="submit" data-save="Horário de funcionamento">Salvar</button>
            </div>
            <div class="hours-grid">
              ${WEEK.map((day, i) => {
                const h = s.hours[i];
                return `<div class="hour-row ${h ? '' : 'closed'}" data-day="${i}">
                  <span><label class="check-line" style="gap:6px;"><input type="checkbox" class="h-on" ${h ? 'checked' : ''}> ${day}</label></span>
                  <input type="time" class="h-open" value="${h ? esc(h[0]) : '09:00'}" ${h ? '' : 'disabled'}>
                  <input type="time" class="h-close" value="${h ? esc(h[1]) : '19:00'}" ${h ? '' : 'disabled'}>
                </div>`;
              }).join('')}
            </div>
          </section>

          <section class="settings-card">
            <div class="settings-card-head">
              <div><h3>Segurança</h3><p>PIN de acesso ao painel, verificado na nuvem.</p></div>
              <button class="btn btn-soft btn-sm" type="submit" data-save="Segurança">Salvar</button>
            </div>
            <div class="field"><label for="stPin">Novo PIN (4 a 8 dígitos)</label><input id="stPin" name="newPin" inputmode="numeric" maxlength="8" placeholder="Deixe vazio para manter ${'•'.repeat(4)}"></div>
            <p style="font-size:11px;color:var(--muted-2);margin-top:8px;">Recomendamos um PIN de 6 a 8 dígitos. Ele protege o painel e as alterações do cardápio em todos os aparelhos.</p>
          </section>

          <section class="settings-card">
            <h3>Dados do sistema</h3>
            <p>Backup e manutenção.</p>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <button class="btn btn-soft btn-sm" type="button" data-act="backup">${icon('download')} Baixar backup</button>
              <label class="btn btn-soft btn-sm" style="cursor:pointer;">${icon('upload')} Restaurar backup<input type="file" id="importFile" accept="application/json" hidden></label>
              <button class="btn btn-danger btn-sm" type="button" data-act="restore-demo">${icon('trash')} Restaurar demonstração</button>
            </div>
            <p style="font-size:11px;color:var(--muted-2);margin-top:10px;">${state.cloud ? 'Pedidos, cardápio e avaliações ficam salvos na nuvem e aparecem em qualquer aparelho.' : 'Modo local: sem conexão com a nuvem no momento. Os dados ficam apenas neste navegador.'}</p>
          </section>

        <section class="settings-card full">
          <div class="settings-card-head">
            <div><h3>Destaque da loja</h3><p>Textos e imagem da página inicial.</p></div>
            <button class="btn btn-soft btn-sm" type="submit" data-save="Destaque da loja">Salvar</button>
          </div>
          <div class="form-grid">
            <div class="field"><label for="stHeroBadge">Selo do destaque</label><input id="stHeroBadge" name="heroBadge" maxlength="40" value="${esc(s.hero.badge)}"></div>
            <div class="field"><label for="stHeroTitle">Título</label><input id="stHeroTitle" name="heroTitle" maxlength="80" value="${esc(s.hero.title)}"></div>
            <div class="field span-2"><label for="stHeroSub">Subtítulo</label><textarea id="stHeroSub" name="heroSubtitle" maxlength="200" style="min-height:58px;">${esc(s.hero.subtitle)}</textarea></div>
            <div class="field span-2">
              <label>Imagem do destaque</label>
              <div class="image-picker" id="heroPicker">${heroGalleryHTML(s.hero.gallery, s.hero.image)}</div>
              <label class="upload-zone">${icon('upload')} Adicionar imagem da galeria
                <input type="file" accept="image/*" id="heroImgUpload">
              </label>
              <p style="font-size:11px;color:var(--muted-2);margin-top:7px;">Use o × em cada foto para removê-la da galeria. As imagens enviadas ficam salvas na sua loja.</p>
              <input type="hidden" name="heroImage" id="heroImageInput" value="${esc(s.hero.image)}">
              <input type="hidden" name="heroGallery" id="heroGalleryInput" value="${esc(JSON.stringify(s.hero.gallery))}">
            </div>
          </div>
        </section>
      </div>

      <div class="settings-actions" style="margin-top:18px;">
        <button class="btn btn-primary btn-lg" type="submit">${icon('check')} Salvar todas as alterações</button>
      </div>
    </form>`;
}

function bindSettingsForm() {
  const form = $('#settingsForm');
  if (!form) return;
  $$('.hour-row .h-on').forEach((chk) => chk.addEventListener('change', () => {
    const row = chk.closest('.hour-row');
    row.classList.toggle('closed', !chk.checked);
    row.querySelector('.h-open').disabled = !chk.checked;
    row.querySelector('.h-close').disabled = !chk.checked;
  }));

  const heroUpload = $('#heroImgUpload');
  if (heroUpload) {
    heroUpload.addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const gallery = heroGalleryFromInput();
      if (gallery.length >= 20) { toast('A galeria já tem 20 imagens. Remova alguma antes de adicionar outra.', 'error'); e.target.value = ''; return; }
      try {
        const dataUrl = await imageFileToDataUrl(file, 1280, 0.8);
        const used = gallery.reduce((sum, src) => sum + src.length, 0);
        if (dataUrl.length > 500 * 1024 || used + dataUrl.length > 3.5 * 1024 * 1024) {
          toast('Imagem pesada demais para a galeria. Use uma foto menor.', 'error');
          return;
        }
        gallery.push(dataUrl);
        setHeroGallery(gallery, dataUrl);
        toast('Imagem adicionada — clique em Salvar para aplicar.');
      } catch (err) {
        toast('Não foi possível usar essa imagem. Escolha um JPG ou PNG de até 6 MB.', 'error');
      } finally {
        e.target.value = '';
      }
    });
  }

  const importInput = $('#importFile');
  if (importInput) {
    importInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(reader.result);
          if (!parsed || ![1, 2].includes(parsed.version) || !Array.isArray(parsed.products)) throw new Error('invalid');
          normalizeSettings(parsed.settings);
          data = parsed;
          saveData();
          toast('Backup restaurado com sucesso.');
          setTimeout(() => location.reload(), 700);
        } catch (err) {
          toast('Arquivo de backup inválido.', 'error');
        }
      };
      reader.readAsText(file);
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const saveLabel = e.submitter && e.submitter.dataset ? String(e.submitter.dataset.save || '') : '';
    const s = data.settings;
    const prevAddress = s.address;
    s.storeName = String(fd.get('storeName') || s.storeName).trim();
    s.tagline = String(fd.get('tagline') || '').trim();
    s.phone = String(fd.get('phone') || '').trim();
    s.whatsapp = digits(fd.get('whatsapp'));
    s.instagram = String(fd.get('instagram') || '').trim();
    s.pixKey = String(fd.get('pixKey') || '').trim();
    s.address = String(fd.get('address') || '').trim();
    s.openMode = fd.get('openMode') || 'auto';
    s.etaMin = num(fd.get('etaMin'), 40);
    s.etaMax = num(fd.get('etaMax'), 60);
    s.deliveryFee = num(fd.get('deliveryFee'), 0);
    s.freeFrom = num(fd.get('freeFrom'), 0);
    s.minOrder = num(fd.get('minOrder'), 0);
    s.deliveryEnabled = !!fd.get('deliveryEnabled');
    s.deliveryRadiusKm = Math.max(0, num(fd.get('deliveryRadiusKm'), 8));
    s.payment = { pix: !!fd.get('payPix'), card: !!fd.get('payCard'), cash: !!fd.get('payCash') };
    s.hero.badge = String(fd.get('heroBadge') || '').trim();
    s.hero.title = String(fd.get('heroTitle') || '').trim();
    s.hero.subtitle = String(fd.get('heroSubtitle') || '').trim();
    const heroImage = String(fd.get('heroImage') || s.hero.image);
    let gallery = [];
    try { gallery = JSON.parse(String(fd.get('heroGallery') || '[]')); } catch (e) { /* ignore */ }
    gallery = Array.isArray(gallery) ? gallery.filter((src) => typeof src === 'string' && src) : [];
    if (!gallery.length) gallery = DEFAULT_GALLERY.slice();
    if (heroImage && !gallery.includes(heroImage)) gallery.unshift(heroImage);
    s.hero.image = heroImage || gallery[0];
    s.hero.gallery = [...new Set(gallery)];

    s.hours = WEEK.map((_, i) => {
      const row = form.querySelector(`.hour-row[data-day="${i}"]`);
      if (!row || !row.querySelector('.h-on').checked) return null;
      return [row.querySelector('.h-open').value || '09:00', row.querySelector('.h-close').value || '19:00'];
    });

    const pin = String(fd.get('newPin') || '').trim();
    if (pin) {
      if (!/^\d{4,8}$/.test(pin)) { toast('O PIN deve ter de 4 a 8 dígitos.', 'error'); return; }
    }
    if (!s.payment.pix && !s.payment.card && !s.payment.cash) {
      toast('Ative pelo menos uma forma de pagamento.', 'error');
      return;
    }
    if (s.whatsapp.length < 10) { toast('Informe o WhatsApp com DDI e DDD, ex.: 5521999990000.', 'error'); return; }
    if (s.etaMax < s.etaMin) s.etaMax = s.etaMin;

    let geoFailed = false;
    const addressChanged = prevAddress !== s.address;
    if (!s.address) {
      s.storeLat = null;
      s.storeLng = null;
      s.geoAddress = '';
    } else if (addressChanged || s.geoAddress !== s.address || s.storeLat == null) {
      const submit = form.querySelector('button[type="submit"]');
      const label = submit ? submit.innerHTML : '';
      if (submit) { submit.disabled = true; submit.textContent = 'Localizando endereço...'; }
      let point = null;
      try { point = await geocodeAddress(s.address); } catch (err) { point = null; }
      if (submit) { submit.disabled = false; submit.innerHTML = label; }
      if (point) {
        s.storeLat = point.lat;
        s.storeLng = point.lng;
        s.geoAddress = s.address;
      } else {
        s.storeLat = null;
        s.storeLng = null;
        s.geoAddress = '';
        geoFailed = true;
      }
    }

    if (pin && state.cloud) {
      try {
        await cloudRpc('de_admin_change_pin', { p_pin: adminPin(), p_new: pin });
      } catch (err) {
        toast('Não foi possível alterar o PIN online.', 'error');
        return;
      }
    }
    if (pin) {
      s.adminPin = pin;
      state.adminPin = pin;
      sessionStorage.setItem(PIN_KEY, pin);
    }

    saveData();
    if (state.cloud) {
      const ok = await pushCatalog();
      if (!ok) return;
    }
    applySettings();
    renderCart();
    renderAdmin();
    if (geoFailed) {
      toast(`${saveLabel ? saveLabel + ': ' : ''}configurações salvas, mas não foi possível localizar o endereço. Confira o endereço da loja ou tente salvar novamente.`, 'error');
    } else if (saveLabel === 'Entrega e operação' && s.deliveryEnabled && s.deliveryRadiusKm > 0 && s.storeLat != null) {
      toast(`Entrega e operação — Configurações salvas! Raio de ${String(s.deliveryRadiusKm).replace('.', ',')} km ativo a partir do endereço da loja.`);
    } else {
      toast(saveLabel ? `${saveLabel} — alterações salvas.` : 'Configurações salvas!');
    }
  });
}

/* ------------------------------------------------------------
   18. Eventos
   ------------------------------------------------------------ */
function refreshStorefront() {
  applySettings();
  renderCategoryNav();
  renderMenu();
  renderReviews();
  renderCart();
}

function handleAction(act, el) {
  const id = el.dataset.id;
  const product = id ? data.products.find((p) => p.id === id) : null;

  switch (act) {
    case 'go-cat': {
      const cat = el.dataset.cat;
      if (state.search) { state.search = ''; $('#searchInput').value = ''; renderMenu(); }
      $$('.cat-btn').forEach((b) => b.classList.toggle('active', b.dataset.cat === cat));
      if (cat === 'all') {
        $('.menu-head').scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        const section = $(`#cat-${cat}`);
        if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      break;
    }
    case 'scroll-menu': {
      $('.menu-head').scrollIntoView({ behavior: 'smooth', block: 'start' });
      break;
    }
    case 'open-product': if (product) openProductModal(product.id); break;
    case 'add-cart': if (product) quickAdd(product.id); break;
    case 'fav': {
      if (!id) break;
      if (state.favs.has(id)) state.favs.delete(id); else state.favs.add(id);
      saveFavs();
      el.classList.toggle('on', state.favs.has(id));
      break;
    }
    case 'open-cart': openDrawer(); break;
    case 'close-drawer': closeDrawer(); break;
    case 'close-modal': closeModal(); break;
    case 'confirm-yes': {
      const cb = state.pendingConfirm;
      state.pendingConfirm = null;
      closeModal();
      if (typeof cb === 'function') cb();
      break;
    }
    case 'cart-inc': {
      const item = state.cart.find((i) => i.uid === el.dataset.uid);
      if (item) { item.qty = clamp(item.qty + 1, 1, 60); saveCart(); renderCart(); }
      break;
    }
    case 'cart-dec': {
      const item = state.cart.find((i) => i.uid === el.dataset.uid);
      if (item) {
        item.qty -= 1;
        if (item.qty <= 0) state.cart = state.cart.filter((x) => x.uid !== item.uid);
        saveCart();
        renderCart();
      }
      break;
    }
    case 'apply-coupon': {
      const input = $('#couponInput');
      if (!input) break;
      const code = input.value.trim();
      if (!code) { toast('Digite o código do cupom.', 'error'); break; }
      const c = findCoupon(code);
      const problem = couponProblem(c, cartSubtotal());
      if (problem) { toast(problem, 'error'); break; }
      state.couponCode = c.code;
      renderCart();
      toast(`Cupom ${c.code} aplicado!`);
      break;
    }
    case 'remove-coupon': state.couponCode = null; renderCart(); break;
    case 'checkout': openCheckout(); break;
    case 'my-orders': openMyOrders(); break;
    case 'track-order': openTrackOrder(id); break;
    case 'rate-order': openRating(id); break;
    case 'open-admin-order': openAdminOrder(id); break;
    case 'set-status': setOrderStatus(id, el.dataset.status); break;
    case 'print-order': printOrder(id); break;
    case 'order-filter': state.orderFilter = el.dataset.filter; renderAdmin(); break;
    case 'goto-orders': state.adminTab = 'pedidos'; renderAdmin(); break;
    case 'new-product': openProductForm(null); break;
    case 'edit-product': openProductForm(id); break;
    case 'toggle-product': {
      const p = data.products.find((x) => x.id === id);
      if (!p) break;
      p.active = !p.active;
      saveData(); renderAdmin(); refreshStorefront();
      toast(p.active ? 'Produto ativado.' : 'Produto pausado.');
      break;
    }
    case 'del-product': {
      const p = data.products.find((x) => x.id === id);
      if (!p) break;
      confirmDialog('Excluir produto?', `“${p.name}” será removido do cardápio. Essa ação não pode ser desfeita.`, 'Excluir produto', () => {
        data.products = data.products.filter((x) => x.id !== id);
        saveData(); renderAdmin(); refreshStorefront(); toast('Produto excluído.');
      });
      break;
    }
    case 'pick-image': {
      const src = el.dataset.src;
      const input = $('#prodImage');
      if (input) input.value = src;
      $$('#productForm .image-opt').forEach((b) => b.classList.toggle('on', b === el));
      break;
    }
    case 'pick-hero': {
      const src = el.dataset.src;
      const input = $('#heroImageInput');
      if (input) input.value = src;
      $$('#settingsForm .image-opt').forEach((b) => b.classList.toggle('on', b === el));
      break;
    }
    case 'del-hero-image': {
      const src = el.dataset.src;
      const gallery = heroGalleryFromInput().filter((x) => x !== src);
      if (!gallery.length) { toast('Mantenha pelo menos uma imagem na galeria.', 'error'); break; }
      const current = $('#heroImageInput') ? $('#heroImageInput').value : '';
      setHeroGallery(gallery, current !== src && gallery.includes(current) ? current : gallery[0]);
      toast('Imagem removida — clique em Salvar para aplicar.');
      break;
    }
    case 'add-size': {
      const rows = $('#sizeRows');
      if (rows) rows.insertAdjacentHTML('beforeend', sizeRowHTML('', 0));
      break;
    }
    case 'add-extra': {
      const rows = $('#extraRows');
      if (rows) rows.insertAdjacentHTML('beforeend', extraRowHTML('', 0));
      break;
    }
    case 'remove-row': {
      const row = el.closest('.option-row');
      if (row) row.remove();
      break;
    }
    case 'new-cat': openCategoryForm(null); break;
    case 'edit-cat': openCategoryForm(id); break;
    case 'del-cat': {
      const c = data.categories.find((x) => x.id === id);
      if (!c) break;
      if (data.products.some((p) => p.cat === id)) {
        toast('Mova ou exclua os produtos dessa categoria antes.', 'error');
        break;
      }
      confirmDialog('Excluir categoria?', `A categoria “${c.name}” será removida.`, 'Excluir', () => {
        data.categories = data.categories.filter((x) => x.id !== id);
        saveData(); renderAdmin(); refreshStorefront(); toast('Categoria excluída.');
      });
      break;
    }
    case 'move-cat': {
      const idx = data.categories.findIndex((x) => x.id === id);
      const dir = Number(el.dataset.dir);
      const target = idx + dir;
      if (idx < 0 || target < 0 || target >= data.categories.length) break;
      const tmp = data.categories[idx];
      data.categories[idx] = data.categories[target];
      data.categories[target] = tmp;
      saveData(); renderAdmin(); refreshStorefront();
      break;
    }
    case 'new-coupon': openCouponForm(null); break;
    case 'edit-coupon': openCouponForm(id); break;
    case 'toggle-coupon': {
      const c = data.coupons.find((x) => x.id === id);
      if (!c) break;
      c.active = !c.active;
      saveData(); renderAdmin();
      toast(c.active ? 'Cupom ativado.' : 'Cupom pausado.');
      break;
    }
    case 'del-coupon': {
      confirmDialog('Excluir cupom?', 'O cupom deixará de funcionar imediatamente.', 'Excluir', () => {
        data.coupons = data.coupons.filter((x) => x.id !== id);
        saveData(); renderAdmin(); toast('Cupom excluído.');
      });
      break;
    }
    case 'apply-report': {
      const from = $('#repFrom').value;
      const to = $('#repTo').value;
      if (!from || !to) { toast('Escolha as datas do período.', 'error'); break; }
      if (from > to) { toast('A data inicial deve ser menor que a final.', 'error'); break; }
      state.report = { from, to };
      renderAdmin();
      break;
    }
    case 'export-csv': exportCSV(); break;
    case 'export-xlsx': exportXLSX(); break;
    case 'export-pdf': exportPDF(); break;
    case 'del-review': {
      confirmDialog('Excluir avaliação?', 'A avaliação será removida da loja.', 'Excluir', async () => {
        if (state.cloud) {
          try { await cloudRpc('de_admin_delete_review', { p_pin: adminPin(), p_id: id }); }
          catch (e) { toast('Não foi possível excluir a avaliação online.', 'error'); return; }
        }
        data.reviews = data.reviews.filter((r) => r.id !== id);
        try { localStorage.setItem(DB_KEY, JSON.stringify(data)); } catch (e) { /* ignore */ }
        renderAdmin(); renderReviews(); applySettings(); toast('Avaliação excluída.');
      });
      break;
    }
    case 'backup': {
      downloadFile(`backup-${data.settings.storeName.toLowerCase().replace(/\s+/g, '-')}-${todayKey()}.json`, JSON.stringify(data, null, 2), 'application/json');
      toast('Backup baixado.');
      break;
    }
    case 'restore-demo': {
      confirmDialog('Restaurar demonstração?', 'Todos os pedidos, produtos e configurações atuais serão substituídos pelos dados de exemplo.', 'Restaurar', () => {
        data = seedData();
        saveData();
        state.adminAuthed = true;
        state.cart = [];
        saveCart();
        toast('Dados de demonstração restaurados.');
        setTimeout(() => location.reload(), 500);
      });
      break;
    }
    default: break;
  }
}

function bindGlobal() {
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    if (el.tagName === 'A' || el.tagName === 'BUTTON' || el.tagName === 'INPUT') {
      if (el.tagName === 'A' && el.getAttribute('href') && !el.dataset.act) return;
    }
    e.preventDefault();
    handleAction(el.dataset.act, el);
  });

  $('#modalLayer').addEventListener('click', (e) => {
    if (e.target.matches('[data-close-modal]')) closeModal();
    if (e.target.matches('[data-close-drawer]')) closeDrawer();
  });
  $('#drawerLayer').addEventListener('click', (e) => {
    if (e.target.matches('[data-close-drawer]')) closeDrawer();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!$('#modalLayer').hidden) closeModal();
      else if (!$('#drawerLayer').hidden) closeDrawer();
    }
    const tag = (document.activeElement && document.activeElement.tagName) || '';
    if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) {
      e.preventDefault();
      const s = $('#searchInput');
      if (s && !$('#viewLoja').hidden) s.focus();
    }
  });

  $('#searchInput').addEventListener('input', (e) => {
    state.search = e.target.value;
    renderMenu();
  });

  $('#btnCart').addEventListener('click', () => { renderCart(); openDrawer(); });
  $('#btnMeusPedidos').addEventListener('click', openMyOrders);
  $('#btnAdmin').addEventListener('click', openAdmin);
  $('#btnAdminFooter').addEventListener('click', openAdmin);
  $('#btnVerLoja').addEventListener('click', goStore);
  $('#btnAdminLoja').addEventListener('click', goStore);
  $('#btnLockBack').addEventListener('click', goStore);
  $('#btnSairAdmin').addEventListener('click', () => {
    state.adminAuthed = false;
    state.adminPin = '';
    state.adminTab = 'visao';
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(PIN_KEY);
    sessionStorage.removeItem(ADMIN_TAB_KEY);
    goStore();
    toast('Você saiu do painel.');
  });
  $('#storeOpenToggle').addEventListener('change', (e) => {
    data.settings.openMode = e.target.checked ? 'open' : 'closed';
    saveData();
    applySettings();
    $('#storeOpenLabel').textContent = e.target.checked ? 'Loja aberta' : 'Loja pausada';
    toast(e.target.checked ? 'Loja aberta para pedidos.' : 'Loja pausada.');
  });

  $$('#adminNav button').forEach((btn) => btn.addEventListener('click', async () => {
    state.adminTab = btn.dataset.tab;
    sessionStorage.setItem(ADMIN_TAB_KEY, state.adminTab);
    renderAdmin();
    if (state.cloud && ['visao', 'pedidos', 'avaliacoes'].includes(state.adminTab)) {
      const ok = await cloudLoadAdmin(true);
      if (ok && state.adminTab === btn.dataset.tab) renderAdmin();
    }
  }));

  $('#lockForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const pin = $('#pinInput').value.trim();
    if (!pin) return;
    const btn = $('#lockForm button[type="submit"]');
    const label = btn ? btn.innerHTML : '';
    if (btn) { btn.disabled = true; btn.textContent = 'Verificando...'; }
    const ok = await adminLogin(pin);
    if (btn) { btn.disabled = false; btn.innerHTML = label; }
    if (ok) {
      $('#lockError').textContent = '';
      $('#pinInput').value = '';
      $('#adminLock').hidden = true;
      renderAdmin();
      startAdminPolling();
      toast('Bem-vinda ao seu painel!');
    } else {
      $('#lockError').textContent = 'PIN incorreto. Tente novamente.';
      $('#pinInput').select();
    }
  });

  window.addEventListener('hashchange', applyRoute);
  window.addEventListener('storage', (e) => {
    if (e.key === DB_KEY) {
      data = loadData();
      refreshStorefront();
      if (!$('#viewAdmin').hidden && state.adminAuthed) renderAdmin();
    }
  });
}

/* ------------------------------------------------------------
   19. Inicialização
   ------------------------------------------------------------ */
async function init() {
  data = loadData();
  state.cart = loadJSON(CART_KEY, []);
  if (!Array.isArray(state.cart)) state.cart = [];
  state.cart = state.cart.filter((i) => i && i.productId && i.qty > 0);
  state.couponCode = null;
  state.favs = new Set(loadJSON(FAV_KEY, []));
  state.customer = loadJSON(CUST_KEY, {}) || {};
  state.adminAuthed = sessionStorage.getItem(SESSION_KEY) === '1';
  state.adminPin = sessionStorage.getItem(PIN_KEY) || '';
  const savedTab = sessionStorage.getItem(ADMIN_TAB_KEY);
  if (savedTab && ADMIN_TITLES[savedTab]) state.adminTab = savedTab;

  const fab = document.createElement('button');
  fab.id = 'cartFab';
  fab.className = 'cart-fab';
  fab.type = 'button';
  fab.addEventListener('click', () => { renderCart(); openDrawer(); });
  $('#viewLoja').appendChild(fab);

  bindGlobal();
  await cloudBootstrap();

  if (state.adminAuthed && state.cloud && !state.adminPin) {
    state.adminAuthed = false;
    sessionStorage.removeItem(SESSION_KEY);
  }
  if (state.adminAuthed && state.cloud) await cloudLoadAdmin(true);

  refreshStorefront();
  applyRoute();
}

document.addEventListener('DOMContentLoaded', init);