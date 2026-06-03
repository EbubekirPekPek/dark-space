// ── Navigation ───────────────────────────────────────────────────────────────

const NAV = [
  { id: 'reklam',       href: 'index.html',       label: 'Reklam',           icon: '◎' },
  { id: 'pazarlama',    href: 'pazarlama.html',    label: 'Pazarlama',        icon: '◇' },
  { id: 'sosyal-medya', href: 'sosyal-medya.html', label: 'Sosyal Medya',     icon: '◈' },
  { id: 'yapay-zeka',   href: 'yapay-zeka.html',   label: 'Yapay Zeka',       icon: '⚡' },
  { id: 'turkce',       href: 'turkce.html',        label: 'Türkçe',           icon: '◉' },
  { id: 'resmi',        href: 'resmi.html',         label: 'Resmi',            icon: '◆' },
];

// ── Translation ──────────────────────────────────────────────────────────────

const TR_CACHE = 'fh_tr3';
const TR_TTL   = 86400000; // 24h

function trGet(key) {
  try {
    const s = JSON.parse(localStorage.getItem(TR_CACHE) || '{}');
    const e = s[key];
    if (e && Date.now() - e.t < TR_TTL) return e.v;
  } catch {}
  return null;
}

function trSet(key, val) {
  try {
    const s = JSON.parse(localStorage.getItem(TR_CACHE) || '{}');
    s[key] = { v: val, t: Date.now() };
    const keys = Object.keys(s);
    if (keys.length > 800) {
      keys.sort((a, b) => s[a].t - s[b].t).slice(0, 200).forEach(k => delete s[k]);
    }
    localStorage.setItem(TR_CACHE, JSON.stringify(s));
  } catch {}
}

async function translate(text, cacheKey) {
  if (!text || text.length < 4) return text;
  const hit = trGet(cacheKey);
  if (hit !== null) return hit;
  try {
    const res = await fetch(
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=tr&dt=t&q=${encodeURIComponent(text)}`
    );
    if (!res.ok) return text;
    const d = await res.json();
    const result = d[0].map(s => s[0]).join('');
    trSet(cacheKey, result);
    return result;
  } catch {
    return text;
  }
}

const trQueue = [];
let trActive  = 0;

function enqueue(fn) {
  return new Promise(resolve => {
    trQueue.push(async () => resolve(await fn()));
    flushQueue();
  });
}

function flushQueue() {
  if (trActive >= 3 || !trQueue.length) return;
  trActive++;
  trQueue.shift()().finally(() => { trActive--; flushQueue(); });
}

// ── Utils ────────────────────────────────────────────────────────────────────

function timeAgo(str) {
  if (!str) return '';
  const diff = Math.floor((Date.now() - new Date(str)) / 1000);
  if (diff < 60)     return 'az önce';
  if (diff < 3600)   return `${Math.floor(diff / 60)} dk önce`;
  if (diff < 86400)  return `${Math.floor(diff / 3600)} sa önce`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} gün önce`;
  return new Date(str).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}

function decodeHtml(html) {
  const d = document.createElement('div');
  d.innerHTML = html || '';
  return d.textContent || '';
}

function strip(html) {
  const d = document.createElement('div');
  d.innerHTML = (html || '').replace(/<[^>]*>/g, '');
  return (d.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 200);
}

function skeletons(n) {
  return `<div class="skeleton-wrap">${'<div class="skeleton-card"></div>'.repeat(n)}</div>`;
}

// ── Feed Fetching ─────────────────────────────────────────────────────────────

const RSS = 'https://api.rss2json.com/v1/api.json?rss_url=';

async function fetchFeed(feed) {
  try {
    const res = await fetch(`${RSS}${encodeURIComponent(feed.url)}`);
    if (!res.ok) throw 0;
    const d = await res.json();
    if (d.status !== 'ok') throw 0;
    return (d.items || []).slice(0, 12).map(item => ({
      link:    item.link || '',
      title:   decodeHtml(item.title || ''),
      pubDate: item.pubDate || '',
      _src:    feed.name,
      _desc:   strip(item.description || item.content || ''),
    }));
  } catch {
    return [];
  }
}

// ── Card ─────────────────────────────────────────────────────────────────────

function buildCard(item, doTranslate) {
  const a = document.createElement('a');
  a.className = 'card';
  a.href = item.link || '#';
  a.target = '_blank';
  a.rel = 'noopener noreferrer';

  const srcDiv = document.createElement('div');
  srcDiv.className = 'card-source';
  srcDiv.innerHTML = `<span class="card-dot"></span><span class="card-src">${item._src}</span>`;

  const titleDiv = document.createElement('div');
  titleDiv.className = 'card-title';
  titleDiv.textContent = item.title;

  const footer = document.createElement('div');
  footer.className = 'card-footer';
  footer.innerHTML = `<span class="card-date">${timeAgo(item.pubDate)}</span><span class="card-link">Oku →</span>`;

  a.appendChild(srcDiv);
  a.appendChild(titleDiv);

  let descDiv = null;
  if (item._desc) {
    descDiv = document.createElement('div');
    descDiv.className = 'card-desc';
    descDiv.textContent = item._desc;
    a.appendChild(descDiv);
  }

  a.appendChild(footer);

  if (doTranslate && item.link) {
    enqueue(() => translate(item.title, item.link + ':t')).then(t => {
      if (t && t !== item.title) titleDiv.textContent = t;
    });
    if (descDiv && item._desc) {
      enqueue(() => translate(item._desc, item.link + ':d')).then(t => {
        if (t && t !== item._desc) descDiv.textContent = t;
      });
    }
  }

  return a;
}

// ── Render ────────────────────────────────────────────────────────────────────

let _items     = [];
let _activeSet = new Set();
let _config    = null;

function renderCards(items, activeSet, doTranslate) {
  const grid = document.getElementById('feed-grid');
  if (!grid) return;
  grid.innerHTML = '';

  const list = activeSet.size === 0 ? items : items.filter(i => activeSet.has(i._src));

  if (!list.length) {
    const msg = document.createElement('div');
    msg.className = 'empty-state';
    msg.textContent = 'İçerik yüklenemedi — kaynaklar geçici olarak erişilemez olabilir.';
    grid.appendChild(msg);
    return;
  }

  list.forEach(item => grid.appendChild(buildCard(item, doTranslate)));
}

function buildSourceTags(feeds, activeSet, items, doTranslate) {
  const wrap = document.getElementById('source-tags');
  if (!wrap) return;
  wrap.innerHTML = '';

  feeds.forEach(f => {
    const tag = document.createElement('span');
    tag.className = 'source-tag';
    tag.textContent = f.name;
    tag.addEventListener('click', () => {
      activeSet.has(f.name) ? activeSet.delete(f.name) : activeSet.add(f.name);
      tag.classList.toggle('active', activeSet.has(f.name));
      renderCards(items, activeSet, doTranslate);
    });
    wrap.appendChild(tag);
  });
}

// ── Load ──────────────────────────────────────────────────────────────────────

function updateTimestamp() {
  const el = document.getElementById('last-updated');
  if (el) el.textContent = 'Son güncelleme: ' + new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

async function loadFeeds(config) {
  const btn = document.querySelector('.refresh-btn');
  btn?.classList.add('spinning');

  const grid = document.getElementById('feed-grid');
  if (grid) grid.innerHTML = skeletons(9);
  const countEl = document.getElementById('total-count');
  if (countEl) countEl.textContent = '—';

  const results = await Promise.allSettled(config.feeds.map(fetchFeed));
  _items = [];
  results.forEach(r => r.status === 'fulfilled' && _items.push(...r.value));
  _items.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

  if (countEl) countEl.textContent = _items.length;

  _activeSet = new Set();
  buildSourceTags(config.feeds, _activeSet, _items, config.translate);
  renderCards(_items, _activeSet, config.translate);

  updateTimestamp();
  btn?.classList.remove('spinning');
}

function refreshPage() {
  if (_config) loadFeeds(_config);
}

// ── Init ──────────────────────────────────────────────────────────────────────

function initPage(config) {
  _config = config;

  document.documentElement.style.setProperty('--page-clr',  config.clr);
  document.documentElement.style.setProperty('--page-glow', config.glow);
  document.title = `${config.title} — Feed Hub`;

  const nav = NAV.map(p => `
    <a href="${p.href}" class="nav-link${p.id === config.page ? ' active' : ''}">
      <span class="nav-icon">${p.icon}</span>${p.label}
    </a>
  `).join('');

  document.getElementById('app').innerHTML = `
    <header>
      <div class="header-inner">
        <div class="brand">
          <span class="dot pulse"></span>
          <span class="brand-name">Feed Hub</span>
          <span class="brand-sep">·</span>
          <span class="brand-sub">Ajans Paneli</span>
        </div>
        <div class="header-right">
          <span id="last-updated">Yükleniyor...</span>
          <button class="refresh-btn" onclick="refreshPage()">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"/>
              <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14"/>
            </svg>
            Yenile
          </button>
        </div>
      </div>
      <nav class="page-nav">
        <div class="nav-inner">${nav}</div>
      </nav>
    </header>

    <main>
      <div class="page-top">
        <div class="page-title-row">
          <span class="page-icon">${config.icon}</span>
          <div class="page-title-text">
            <h1 class="page-title">${config.title}</h1>
            <p class="page-subtitle">${config.subtitle || ''}</p>
          </div>
          <span class="badge" id="total-count">—</span>
        </div>
        <div class="source-tags" id="source-tags"></div>
      </div>
      <div class="feed-grid" id="feed-grid">${skeletons(9)}</div>

      ${config.platforms ? `
      <div class="platform-section">
        <div class="platform-section-header">
          <span class="platform-section-title">Resmi Sayfalara Hızlı Erişim</span>
          <span class="platform-section-note">GitHub Actions kurulumundan sonra bu kartlar canlı RSS'e dönüşecek</span>
        </div>
        <div class="platform-grid">
          ${config.platforms.map(p => `
            <a href="${p.url}" target="_blank" rel="noopener noreferrer" class="platform-card">
              <div class="platform-card-top">
                <span class="platform-card-icon">${p.icon}</span>
                <span class="platform-card-name">${p.name}</span>
                <span class="platform-badge">${p.badge}</span>
              </div>
              <p class="platform-card-desc">${p.desc}</p>
              <span class="platform-card-link">Resmi sayfaya git →</span>
            </a>
          `).join('')}
        </div>
      </div>
      ` : ''}
    </main>

    <footer>Feed Hub · Ajans Paneli · ${config.title}</footer>
  `;

  loadFeeds(config);
}
