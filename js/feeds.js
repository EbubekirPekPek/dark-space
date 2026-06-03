/**
 * feeds.js
 * --------
 * RSS besleme çekimi, çeviri cache sistemi ve içerik yönetimi.
 * Mevcut app.js'deki feed mantığının temiz, modüler yeniden yazımı.
 *
 * Kullanım:
 *   import { fetchAllFeeds, sortByDate, filterItems, translateWithCache, translateBatch } from './feeds.js';
 */

// ─── Sabitler ─────────────────────────────────────────────────────────────────
const RSS_PROXY      = 'https://api.rss2json.com/v1/api.json?rss_url=';
const TR_CACHE_KEY   = 'ajans_tr_cache_v1';
const TR_TTL_MS      = 86_400_000; // 24 saat (milisaniye)
const TR_MAX_ENTRIES = 800;        // Cache'de tutulacak max çeviri sayısı
const TR_TEMIZLE_N   = 200;        // Dolunca en eski 200 kayıt silinir
const TR_PARALEL_MAX = 3;          // Aynı anda max 3 çeviri isteği

// ─────────────────────────────────────────────────────────────────────────────
//  RSS ÇEKME
// ─────────────────────────────────────────────────────────────────────────────

/**
 * HTML entity ve tag'leri temizler, özet metni hazırlar.
 * @param {string} html
 * @returns {string}
 */
function stripHtml(html) {
  if (!html) return '';
  const d  = document.createElement('div');
  d.innerHTML = html.replace(/<[^>]*>/g, '');
  return (d.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 220);
}

/**
 * HTML entity'leri çözümler (örn: &amp; → &)
 * @param {string} html
 * @returns {string}
 */
function decodeHtml(html) {
  if (!html) return '';
  const d = document.createElement('div');
  d.innerHTML = html;
  return d.textContent || '';
}

/**
 * Tek bir RSS kaynağını çeker ve parse eder.
 * Hata durumunda boş dizi döner (sessizce atlar).
 *
 * @param {string|{url: string, name: string}} feed
 *   String ise sadece URL, obje ise {url, name}
 * @returns {Promise<Array<FeedItem>>}
 *
 * @typedef {object} FeedItem
 * @property {string} link
 * @property {string} title
 * @property {string} pubDate
 * @property {string} description
 * @property {string} _src     - Kaynak adı
 * @property {string} _id      - Benzersiz ID (URL hash'i)
 */
async function fetchFeed(feed) {
  const url  = typeof feed === 'string' ? feed : feed.url;
  const name = typeof feed === 'string' ? new URL(url).hostname : feed.name;

  try {
    const res = await fetch(`${RSS_PROXY}${encodeURIComponent(url)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    if (data.status !== 'ok') throw new Error('RSS parse hatası');

    return (data.items || []).slice(0, 15).map(item => ({
      link:        item.link    || '',
      title:       decodeHtml(item.title    || ''),
      pubDate:     item.pubDate || '',
      description: stripHtml(item.description || item.content || ''),
      _src:        name,
      // Çeviri cache key'i için kararlı ID
      _id:         item.link || (name + item.title),
    }));
  } catch {
    // Hataları sessizce atla — diğer kaynaklar etkilenmesin
    return [];
  }
}

/**
 * Birden fazla RSS kaynağını paralel çeker.
 * Başarısız kaynaklar sonucu bozmaz.
 *
 * @param {Array<string|{url: string, name: string}>} feedUrls
 * @returns {Promise<Array<FeedItem>>}
 */
async function fetchAllFeeds(feedUrls) {
  if (!feedUrls?.length) return [];

  const results = await Promise.allSettled(feedUrls.map(feed => fetchFeed(feed)));

  const items = [];
  results.forEach(r => {
    if (r.status === 'fulfilled' && Array.isArray(r.value)) {
      items.push(...r.value);
    }
  });

  return items;
}

// ─────────────────────────────────────────────────────────────────────────────
//  SIRALAMA VE FİLTRELEME
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Feed itemlarını yayın tarihine göre sıralar (en yeni başta).
 * @param {Array<FeedItem>} items
 * @returns {Array<FeedItem>}
 */
function sortByDate(items) {
  return [...items].sort((a, b) => {
    const dateA = a.pubDate ? new Date(a.pubDate).getTime() : 0;
    const dateB = b.pubDate ? new Date(b.pubDate).getTime() : 0;
    return dateB - dateA;
  });
}

/**
 * Listeyi ilk N itemla kırpar.
 * @param {Array<FeedItem>} items
 * @param {number} maxCount
 * @returns {Array<FeedItem>}
 */
function filterItems(items, maxCount) {
  if (!maxCount || maxCount <= 0) return items;
  return items.slice(0, maxCount);
}

// ─────────────────────────────────────────────────────────────────────────────
//  ÇEVİRİ CACHE SİSTEMİ — localStorage tabanlı, 24 saat TTL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Cache'den çeviriyi okur. Süresi dolmuşsa null döner.
 * @param {string} key
 * @returns {string|null}
 */
function cacheOku(key) {
  try {
    const store = JSON.parse(localStorage.getItem(TR_CACHE_KEY) || '{}');
    const entry = store[key];
    if (entry && Date.now() - entry.t < TR_TTL_MS) return entry.v;
  } catch {}
  return null;
}

/**
 * Çeviriyi cache'e yazar. Dolduğunda eski kayıtları temizler.
 * @param {string} key
 * @param {string} value
 */
function cacheYaz(key, value) {
  try {
    const store = JSON.parse(localStorage.getItem(TR_CACHE_KEY) || '{}');
    store[key]  = { v: value, t: Date.now() };

    // Cache sınırını aştıysa eski kayıtları temizle
    const keys = Object.keys(store);
    if (keys.length > TR_MAX_ENTRIES) {
      keys
        .sort((a, b) => store[a].t - store[b].t)
        .slice(0, TR_TEMIZLE_N)
        .forEach(k => delete store[k]);
    }

    localStorage.setItem(TR_CACHE_KEY, JSON.stringify(store));
  } catch {}
}

/**
 * Tek metni cache kullanarak Türkçeye çevirir.
 * Cache'de varsa API'ye gitmez.
 *
 * @param {string} text   - Çevrilecek metin
 * @param {string} [key]  - Cache anahtarı (belirtilmezse text'in kendisi kullanılır)
 * @returns {Promise<string>} - Çevrilmiş metin (hata durumunda orijinal döner)
 */
async function translateWithCache(text, key) {
  if (!text || text.length < 4) return text;

  const cacheKey = key || text;
  const cached   = cacheOku(cacheKey);
  if (cached !== null) return cached;

  try {
    const url    = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=tr&dt=t&q=${encodeURIComponent(text)}`;
    const res    = await fetch(url);
    if (!res.ok) return text;
    const data   = await res.json();
    const result = data[0].map(s => s[0]).join('');
    if (result) cacheYaz(cacheKey, result);
    return result || text;
  } catch {
    return text;
  }
}

// ─── Paralel Çeviri Kuyruğu ───────────────────────────────────────────────────
const _trQueue  = [];
let   _trActive = 0;

function _kuyrukCalistir() {
  if (_trActive >= TR_PARALEL_MAX || !_trQueue.length) return;
  _trActive++;
  _trQueue.shift()().finally(() => {
    _trActive--;
    _kuyrukCalistir();
  });
}

function _kuyrugaEkle(fn) {
  return new Promise(resolve => {
    _trQueue.push(async () => resolve(await fn()));
    _kuyrukCalistir();
  });
}

/**
 * Birden fazla metni toplu çevirir.
 * Max TR_PARALEL_MAX eşzamanlı istek ile kuyruk sistemi kullanır.
 *
 * @param {Array<{text: string, key?: string}>} items
 *   Her eleman: { text: 'çevrilecek metin', key: 'opsiyonel cache key' }
 * @returns {Promise<Array<string>>} - Aynı sırada çevrilmiş metinler
 */
async function translateBatch(items) {
  if (!items?.length) return [];

  const gorevler = items.map(item =>
    _kuyrugaEkle(() => translateWithCache(item.text, item.key))
  );

  return Promise.all(gorevler);
}

export {
  fetchFeed,
  fetchAllFeeds,
  sortByDate,
  filterItems,
  translateWithCache,
  translateBatch,
  // Yardımcılar (sayfa tarafından gerekirse)
  stripHtml,
  decodeHtml,
};
