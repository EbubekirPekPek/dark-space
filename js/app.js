/**
 * app.js
 * ------
 * Ortak yardımcılar, UI bileşenleri ve sayfa başlatma.
 * Her sayfada yüklenir. Firebase auth koruması burada tetiklenir.
 *
 * Kullanım:
 *   import { formatDate, formatDateFull, truncateText, showToast, initSidebar } from './app.js';
 */

import { authGuard } from './auth.js';

// ─────────────────────────────────────────────────────────────────────────────
//  TARİH FORMATLAMA
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Tarihi Türkçe göreceli zamana çevirir.
 * Örnek: "3 saat önce", "2 gün önce", "az önce"
 *
 * @param {string|Date} dateString
 * @returns {string}
 */
function formatDate(dateString) {
  if (!dateString) return '';

  const tarih = new Date(dateString);
  if (isNaN(tarih.getTime())) return '';

  const fark = Math.floor((Date.now() - tarih.getTime()) / 1000); // saniye

  if (fark < 60)       return 'az önce';
  if (fark < 3_600)    return `${Math.floor(fark / 60)} dakika önce`;
  if (fark < 86_400)   return `${Math.floor(fark / 3_600)} saat önce`;
  if (fark < 604_800)  return `${Math.floor(fark / 86_400)} gün önce`;
  if (fark < 2_592_000) return `${Math.floor(fark / 604_800)} hafta önce`;
  if (fark < 31_536_000) return `${Math.floor(fark / 2_592_000)} ay önce`;

  return `${Math.floor(fark / 31_536_000)} yıl önce`;
}

/**
 * Tarihi Türkçe tam formata çevirir.
 * Örnek: "3 Haziran 2026"
 *
 * @param {string|Date} dateString
 * @returns {string}
 */
function formatDateFull(dateString) {
  if (!dateString) return '';

  const tarih = new Date(dateString);
  if (isNaN(tarih.getTime())) return '';

  return tarih.toLocaleDateString('tr-TR', {
    day:   'numeric',
    month: 'long',
    year:  'numeric',
  });
}

/**
 * Tarih ve saati Türkçe tam formatta gösterir.
 * Örnek: "3 Haziran 2026, 14:30"
 *
 * @param {string|Date} dateString
 * @returns {string}
 */
function formatDateTime(dateString) {
  if (!dateString) return '';

  const tarih = new Date(dateString);
  if (isNaN(tarih.getTime())) return '';

  return tarih.toLocaleDateString('tr-TR', {
    day:    'numeric',
    month:  'long',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  METİN YARDIMCILARI
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Metni belirtilen uzunlukta kırpar ve "..." ekler.
 *
 * @param {string} text
 * @param {number} maxLength
 * @returns {string}
 */
function truncateText(text, maxLength) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + '…';
}

/**
 * Debounce — fonksiyonu belirtilen süre sonra çalıştırır.
 * Süre dolmadan tekrar çağrılırsa önceki çağrıyı iptal eder.
 * Arama kutuları için idealdir.
 *
 * @param {Function} fn
 * @param {number} delay - Milisaniye
 * @returns {Function}
 */
function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// ─────────────────────────────────────────────────────────────────────────────
//  TOAST BİLDİRİMLERİ
// ─────────────────────────────────────────────────────────────────────────────

// Toast container — DOM'a bir kez eklenir
let _toastContainer = null;

function _getToastContainer() {
  if (_toastContainer) return _toastContainer;

  _toastContainer = document.createElement('div');
  _toastContainer.id = 'toast-container';
  _toastContainer.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    gap: 8px;
    pointer-events: none;
  `;
  document.body.appendChild(_toastContainer);
  return _toastContainer;
}

/**
 * Kullanıcıya geçici bildirim gösterir.
 *
 * @param {string} message          - Gösterilecek mesaj
 * @param {'success'|'error'|'info'} [type='info'] - Bildirim türü
 * @param {number} [sure=3000]      - Milisaniye cinsinden süre
 */
function showToast(message, type = 'info', sure = 3000) {
  const container = _getToastContainer();

  const renkler = {
    success: { bg: '#22c55e', icon: '✓' },
    error:   { bg: '#ef4444', icon: '✕' },
    info:    { bg: '#3b82f6', icon: 'ℹ' },
  };
  const { bg, icon } = renkler[type] || renkler.info;

  const toast = document.createElement('div');
  toast.style.cssText = `
    background: ${bg};
    color: #fff;
    padding: 12px 16px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    pointer-events: auto;
    opacity: 0;
    transform: translateY(8px);
    transition: opacity 0.2s ease, transform 0.2s ease;
    max-width: 320px;
    word-break: break-word;
  `;
  toast.innerHTML = `<span style="flex-shrink:0;font-size:16px;">${icon}</span><span>${message}</span>`;

  container.appendChild(toast);

  // Giriş animasyonu
  requestAnimationFrame(() => {
    toast.style.opacity   = '1';
    toast.style.transform = 'translateY(0)';
  });

  // Çıkış animasyonu ve kaldırma
  setTimeout(() => {
    toast.style.opacity   = '0';
    toast.style.transform = 'translateY(8px)';
    setTimeout(() => toast.remove(), 250);
  }, sure);
}

// ─────────────────────────────────────────────────────────────────────────────
//  SIDEBAR
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sidebar açma/kapama ve aktif link vurgulama.
 *
 * HTML beklentisi:
 *   <aside id="sidebar" class="sidebar">...</aside>
 *   <button id="sidebar-toggle">...</button>  (opsiyonel — mobil hamburger)
 *   <div id="sidebar-overlay">...</div>       (opsiyonel — mobil overlay)
 *
 * Aktif link tespiti: <a href="..." class="nav-link"> — URL ile karşılaştırılır.
 */
function initSidebar() {
  const sidebar  = document.getElementById('sidebar');
  const toggle   = document.getElementById('sidebar-toggle');
  const overlay  = document.getElementById('sidebar-overlay');

  if (!sidebar) return;

  // ─── Aktif link vurgulama ───────────────────────────────────────────────
  const mevcutSayfa = window.location.pathname.split('/').pop() || 'index.html';

  sidebar.querySelectorAll('a.nav-link').forEach(link => {
    const linkSayfa = link.getAttribute('href')?.split('/').pop() || '';
    if (linkSayfa === mevcutSayfa) {
      link.classList.add('active');
      // Üst kategori açık olsun (opsiyonel accordion mantığı)
      const parent = link.closest('.nav-group');
      if (parent) parent.classList.add('open');
    }
  });

  // ─── Mobil: hamburger aç/kapat ────────────────────────────────────────────
  function sidebarAc() {
    sidebar.classList.add('is-open');
    overlay?.classList.add('is-visible');
    toggle?.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }

  function sidebarKapat() {
    sidebar.classList.remove('is-open');
    overlay?.classList.remove('is-visible');
    toggle?.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  toggle?.addEventListener('click', () => {
    sidebar.classList.contains('is-open') ? sidebarKapat() : sidebarAc();
  });

  overlay?.addEventListener('click', sidebarKapat);

  // Escape ile kapat
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') sidebarKapat();
  });

  // Sidebar linklerine tıklayınca mobilde kapat
  sidebar.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      if (window.innerWidth < 768) sidebarKapat();
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  MOBİL ALT BAR
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Mobil alt navigasyon barını yönetir.
 * Aktif ikonu vurgular, sekme değişimini izler.
 *
 * HTML beklentisi:
 *   <nav id="mobile-nav" class="mobile-nav">
 *     <a href="..." class="mobile-nav-item" data-page="index">...</a>
 *     ...
 *   </nav>
 */
function initMobileNav() {
  const nav = document.getElementById('mobile-nav');
  if (!nav) return;

  const mevcutSayfa = window.location.pathname.split('/').pop() || 'index.html';

  nav.querySelectorAll('.mobile-nav-item').forEach(item => {
    const itemHref = item.getAttribute('href')?.split('/').pop() || '';
    if (itemHref === mevcutSayfa) {
      item.classList.add('active');
    }

    // Tıklamada animasyon
    item.addEventListener('click', () => {
      nav.querySelectorAll('.mobile-nav-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  SAYFA BAŞLATMA — AUTH KORUMASI
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Korunan her sayfada çağrılır.
 * Giriş kontrolü yapar, başarılıysa UI'ı başlatır.
 *
 * Kullanım (her sayfanın sonunda):
 *   initApp((user) => {
 *     // Sayfa mantığını burada başlat
 *     console.log('Giriş yapan:', user.email);
 *   });
 *
 * @param {Function} [sayfaBaslat] - Giriş doğrulandıktan sonra çalışacak callback
 */
function initApp(sayfaBaslat) {
  // Sidebar ve mobil nav'ı başlat
  initSidebar();
  initMobileNav();

  // Auth koruması — giriş yoksa login.html'e yönlendirir
  authGuard((user) => {
    // Kullanıcı bilgisini ekle (varsa profil alanı)
    const userEmailEl = document.getElementById('user-email');
    if (userEmailEl) userEmailEl.textContent = user.email || '';

    // Çıkış butonunu dinle
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        const { logout } = await import('./auth.js');
        const sonuc = await logout();
        if (sonuc.hata) {
          showToast(sonuc.hata, 'error');
        } else {
          const _p = new URL(import.meta.url).pathname.split('/');
          const _i = _p.lastIndexOf('js');
          const _base = _i > 0 ? _p.slice(0, _i).join('/') + '/' : '/';
          window.location.href = _base + 'login.html';
        }
      });
    }

    // Sayfa özel kodu
    if (typeof sayfaBaslat === 'function') {
      sayfaBaslat(user);
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  DİĞER YARDIMCILAR
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Basit UUID / ID üreteci (Firestore kendi ID'sini üretir ama bazen gerekli)
 * @returns {string}
 */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

/**
 * Sayıyı Türkçe para formatına çevirir.
 * Örnek: 1500 → "1.500 ₺"
 * @param {number} sayi
 * @returns {string}
 */
function formatPara(sayi) {
  if (sayi === null || sayi === undefined) return '';
  return new Intl.NumberFormat('tr-TR', {
    style:    'currency',
    currency: 'TRY',
    minimumFractionDigits: 0,
  }).format(sayi);
}

/**
 * Yüzde değişimini formatlar.
 * Örnek: 25 → "+25%", -10 → "-10%"
 * @param {number} deger
 * @returns {{text: string, positive: boolean}}
 */
function formatYuzde(deger) {
  if (deger === null || deger === undefined) return { text: '—', positive: true };
  const text     = `${deger > 0 ? '+' : ''}${deger.toFixed(1)}%`;
  const positive = deger >= 0;
  return { text, positive };
}

/**
 * KPI sapmasını hesaplar ve formatlar.
 * Örnek: hedef 50, gerçekleşen 65 → %30 sapma (kötü — CPA için)
 * @param {number} hedef
 * @param {number} gerceklesen
 * @param {boolean} [dusukIyi=false] - true: düşük değer iyidir (CPA, maliyet)
 * @returns {{sapma: number, text: string, durum: 'iyi'|'orta'|'kotu'}}
 */
function kpiSapma(hedef, gerceklesen, dusukIyi = false) {
  if (!hedef || gerceklesen === null || gerceklesen === undefined) {
    return { sapma: 0, text: '—', durum: 'orta' };
  }

  const sapma   = ((gerceklesen - hedef) / hedef) * 100;
  const absSap  = Math.abs(sapma);
  const text    = `${sapma > 0 ? '+' : ''}${sapma.toFixed(1)}%`;

  let durum;
  if (dusukIyi) {
    // CPA, maliyet vb. için: düşük iyi
    durum = sapma < -5 ? 'iyi' : sapma < 15 ? 'orta' : 'kotu';
  } else {
    // ROAS, CTR vb. için: yüksek iyi
    durum = sapma > 5 ? 'iyi' : sapma > -15 ? 'orta' : 'kotu';
  }

  return { sapma, text, durum };
}

export {
  // Tarih
  formatDate,
  formatDateFull,
  formatDateTime,
  // Metin
  truncateText,
  debounce,
  // Bildirim
  showToast,
  // UI
  initSidebar,
  initMobileNav,
  // Sayfa başlatma
  initApp,
  // Yardımcılar
  generateId,
  formatPara,
  formatYuzde,
  kpiSapma,
};
