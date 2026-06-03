/**
 * firebase-config.js
 * ------------------
 * Firebase uygulamasını başlatır ve temel servisleri dışa aktarır.
 *
 * NASIL DOLDURULUR:
 *   1. Firebase Console'a gir: https://console.firebase.google.com
 *   2. Projeyi seç (veya yeni proje oluştur)
 *   3. Sol menüden "Project Settings" (Proje Ayarları) tıkla
 *   4. Aşağı kaydır → "Your apps" bölümü → Web uygulamasını seç
 *   5. "SDK setup and configuration" → "Config" seçeneği
 *   6. Oradaki değerleri aşağıdaki firebaseConfig objesine yapıştır
 *
 * Firebase Console > Project Settings > Your apps > SDK setup
 */

import { initializeApp }     from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth }           from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getFirestore }      from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// ─── Firebase Yapılandırması ───────────────────────────────────────────────────
// Bu değerleri Firebase Console > Project Settings > Your apps > SDK setup'tan al
const firebaseConfig = {
  apiKey:            'AIzaSyAIrDwTqtk9aTe-BTwSTg7EJfL-NhmKC0M',
  authDomain:        'dark-space-ajans.firebaseapp.com',
  projectId:         'dark-space-ajans',
  storageBucket:     'dark-space-ajans.firebasestorage.app',
  messagingSenderId: '626647834953',
  appId:             '1:626647834953:web:6057e0a200b7e2f2de7a98',
};

// ─── Uygulamayı Başlat ─────────────────────────────────────────────────────────
const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

export { app, auth, db };
