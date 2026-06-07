/**
 * auth.js
 * -------
 * Firebase Authentication işlemleri.
 * E-posta/şifre ve Google ile giriş, çıkış, oturum takibi.
 *
 * Kullanım:
 *   import { emailPasswordLogin, googleLogin, logout, getCurrentUser, initLoginPage } from './auth.js';
 */

import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged as _onAuthStateChanged,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

import { auth } from './firebase-config.js';

// ─── Base URL — auth.js'in kendi URL'inden güvenilir şekilde hesaplanır ──────
// Örn: localhost:3000/js/auth.js → BASE = '/'
// Örn: github.io/dark-space/js/auth.js → BASE = '/dark-space/'
const _scriptParts = new URL(import.meta.url).pathname.split('/');
const _jsIndex = _scriptParts.lastIndexOf('js');
const BASE = _jsIndex > 0
  ? _scriptParts.slice(0, _jsIndex).join('/') + '/'
  : '/';

// ─── Türkçe Hata Mesajları ─────────────────────────────────────────────────────
const HATA_MESAJLARI = {
  'auth/invalid-email':           'Geçersiz e-posta adresi.',
  'auth/user-disabled':           'Bu hesap devre dışı bırakılmış.',
  'auth/user-not-found':          'Kullanıcı bulunamadı. E-posta adresini kontrol et.',
  'auth/wrong-password':          'Şifre hatalı. Tekrar dene.',
  'auth/invalid-credential':      'E-posta veya şifre hatalı.',
  'auth/too-many-requests':       'Çok fazla başarısız deneme. Bir süre bekle.',
  'auth/network-request-failed':  'İnternet bağlantısı yok veya bağlantı kesildi.',
  'auth/popup-closed-by-user':    'Giriş penceresi kapatıldı. Tekrar dene.',
  'auth/popup-blocked':           'Tarayıcı açılır pencereyi engelledi. İzin ver ve tekrar dene.',
  'auth/cancelled-popup-request': 'Giriş işlemi iptal edildi.',
  'auth/email-already-in-use':    'Bu e-posta adresi zaten kayıtlı.',
  'auth/weak-password':           'Şifre çok zayıf. En az 6 karakter kullan.',
  'auth/operation-not-allowed':   'Bu giriş yöntemi etkinleştirilmemiş.',
  'auth/expired-action-code':     'Bağlantının süresi dolmuş. Yeni bağlantı talep et.',
  'auth/invalid-action-code':     'Geçersiz bağlantı. Yeni bağlantı talep et.',
};

/**
 * Firebase hata kodunu Türkçe mesaja çevirir.
 * @param {Error} err - Firebase auth hatası
 * @returns {string} Türkçe hata mesajı
 */
function hataMesaji(err) {
  return HATA_MESAJLARI[err?.code] || `Bir hata oluştu: ${err?.message || 'Bilinmeyen hata'}`;
}

// ─── E-posta / Şifre ile Giriş ─────────────────────────────────────────────────
/**
 * E-posta ve şifre ile Firebase'e giriş yapar.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{user: object}|{hata: string}>}
 */
async function emailPasswordLogin(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { user: userCredential.user };
  } catch (err) {
    return { hata: hataMesaji(err) };
  }
}

// ─── Google ile Giriş ──────────────────────────────────────────────────────────
/**
 * Google hesabıyla popup açarak giriş yapar.
 * @returns {Promise<{user: object}|{hata: string}>}
 */
async function googleLogin() {
  try {
    const provider = new GoogleAuthProvider();
    // Hesap seçme ekranı her seferinde gösterilsin
    provider.setCustomParameters({ prompt: 'select_account' });
    const userCredential = await signInWithPopup(auth, provider);
    return { user: userCredential.user };
  } catch (err) {
    // Kullanıcı pencereyi kapattıysa sessizce geç
    if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
      return { hata: null };
    }
    return { hata: hataMesaji(err) };
  }
}

// ─── Çıkış ────────────────────────────────────────────────────────────────────
/**
 * Kullanıcı oturumunu kapatır.
 * @returns {Promise<{basarili: boolean}|{hata: string}>}
 */
async function logout() {
  try {
    await signOut(auth);
    return { basarili: true };
  } catch (err) {
    return { hata: hataMesaji(err) };
  }
}

// ─── Mevcut Kullanıcı ─────────────────────────────────────────────────────────
/**
 * O an giriş yapmış kullanıcıyı döndürür.
 * Giriş yoksa null döner.
 * @returns {object|null}
 */
function getCurrentUser() {
  return auth.currentUser;
}

// ─── Oturum Durumu Takibi ─────────────────────────────────────────────────────
/**
 * Giriş yapılmamışsa login.html'e yönlendirir.
 * Giriş yapılmışsa callback'i çağırır.
 *
 * Kullanım (korunan sayfalarda):
 *   authGuard((user) => {
 *     // Kullanıcı giriş yapmış, sayfayı başlat
 *   });
 *
 * @param {Function} onGiris - Giriş varsa çalışacak fonksiyon (user objesi parametre alır)
 */
function authGuard(onGiris) {
  _onAuthStateChanged(auth, (user) => {
    if (!user) {
      // Giriş yok — login sayfasına yönlendir
      // Zaten login.html'deysek döngüye girme
      if (!window.location.pathname.includes('login.html')) {
        window.location.href = BASE + 'login.html';
      }
    } else {
      // Giriş var — callback'i çalıştır
      if (typeof onGiris === 'function') onGiris(user);
    }
  });
}

// ─── Login Sayfası Başlatma ────────────────────────────────────────────────────
/**
 * login.html sayfasındaki formu ve Google butonunu dinler.
 * Sadece login.html'de çağrılmalı.
 *
 * HTML beklentisi:
 *   <form id="login-form">
 *     <input id="login-email" type="email" />
 *     <input id="login-password" type="password" />
 *     <button type="submit">Giriş Yap</button>
 *   </form>
 *   <button id="google-login-btn">Google ile Giriş</button>
 *   <div id="login-error"></div>
 */
function initLoginPage() {
  // Zaten giriş yapılmışsa dashboard'a yönlendir
  _onAuthStateChanged(auth, (user) => {
    if (user) {
      window.location.href = BASE + 'index.html';
    }
  });

  const form      = document.getElementById('login-form');
  const googleBtn = document.getElementById('google-login-btn');
  const errorDiv  = document.getElementById('login-error');

  // Hata mesajı gösterici
  function gosterHata(mesaj) {
    if (!errorDiv) return;
    errorDiv.textContent = mesaj || '';
    errorDiv.style.display = mesaj ? 'block' : 'none';
  }

  // Yükleniyor durumu (butonu devre dışı bırak)
  function setYukleniyor(form, durum) {
    const btn = form?.querySelector('button[type="submit"]');
    if (btn) {
      btn.disabled = durum;
      btn.textContent = durum ? 'Giriş yapılıyor...' : 'Giriş Yap';
    }
    if (googleBtn) googleBtn.disabled = durum;
  }

  // E-posta/şifre formu
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      gosterHata('');

      const email    = document.getElementById('login-email')?.value?.trim();
      const password = document.getElementById('login-password')?.value;

      if (!email || !password) {
        gosterHata('E-posta ve şifre zorunlu.');
        return;
      }

      setYukleniyor(form, true);
      const sonuc = await emailPasswordLogin(email, password);
      setYukleniyor(form, false);

      if (sonuc.hata) {
        gosterHata(sonuc.hata);
      }
      // Başarılıysa onAuthStateChanged otomatik yönlendiriyor
    });
  }

  // Google butonu
  if (googleBtn) {
    googleBtn.addEventListener('click', async () => {
      gosterHata('');
      googleBtn.disabled = true;
      googleBtn.textContent = 'Yönlendiriliyor...';

      const sonuc = await googleLogin();

      googleBtn.disabled = false;
      googleBtn.textContent = 'Google ile Giriş';

      if (sonuc.hata) {
        gosterHata(sonuc.hata);
      }
      // Başarılıysa onAuthStateChanged otomatik yönlendiriyor
    });
  }
}

export { emailPasswordLogin, googleLogin, logout, getCurrentUser, authGuard, initLoginPage };
