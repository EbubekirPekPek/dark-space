/**
 * firestore.js
 * ------------
 * Firestore veritabanı CRUD işlemleri.
 * Notlar, müşteriler, KPI'lar, hedefler, günlük loglar,
 * beceri puanları ve yapılacaklar yönetimi.
 *
 * Koleksiyon isimleri: 'notes', 'clients', 'goals', 'dailyLogs', 'skills', 'todos'
 * Her döküman userId field'ı ile kullanıcıya bağlıdır.
 */

import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

import { db }           from './firebase-config.js';
import { getCurrentUser } from './auth.js';

// ─── Yardımcı: Mevcut Kullanıcı UID'si ────────────────────────────────────────
/**
 * Giriş yapmış kullanıcının UID'sini döndürür.
 * Giriş yoksa hata fırlatır.
 */
function uid() {
  const user = getCurrentUser();
  if (!user) throw new Error('Kullanıcı giriş yapmamış.');
  return user.uid;
}

// ─────────────────────────────────────────────────────────────────────────────
//  NOTLAR
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Bir haber/içerik kartına not ekler.
 * @param {string} contentId   - İçeriğin benzersiz kimliği (genellikle URL veya hash)
 * @param {string} contentType - İçerik türü: 'feed' | 'bilgi' | 'genel'
 * @param {string} noteText    - Not metni
 * @returns {Promise<{id: string}|{hata: string}>}
 */
async function saveNote(contentId, contentType, noteText) {
  try {
    const userId = uid();
    const ref = await addDoc(collection(db, 'notes'), {
      userId,
      contentId,
      contentType,
      noteText,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { id: ref.id };
  } catch (err) {
    return { hata: `Not kaydedilemedi: ${err.message}` };
  }
}

/**
 * Bir içeriğe ait tüm notları getirir.
 * @param {string} contentId
 * @returns {Promise<Array|{hata: string}>}
 */
async function getNotes(contentId) {
  try {
    const userId = uid();
    // orderBy kaldırıldı — composite index gerektirir; istemci tarafında sıralanır
    const q = query(
      collection(db, 'notes'),
      where('userId', '==', userId),
      where('contentId', '==', contentId)
    );
    const snap = await getDocs(q);
    const results = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return results.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
  } catch (err) {
    return { hata: `Notlar getirilemedi: ${err.message}` };
  }
}

/**
 * Bir notu siler.
 * @param {string} noteId
 * @returns {Promise<{basarili: boolean}|{hata: string}>}
 */
async function deleteNote(noteId) {
  try {
    await deleteDoc(doc(db, 'notes', noteId));
    return { basarili: true };
  } catch (err) {
    return { hata: `Not silinemedi: ${err.message}` };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  MÜŞTERİLER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Müşteri profili kaydeder veya günceller.
 * clientId varsa günceller, yoksa yeni oluşturur.
 * @param {object} clientData - { name, sector, targetAudience, budget, socialLinks }
 * @param {string} [clientId] - Güncelleme için mevcut döküman ID'si
 * @returns {Promise<{id: string}|{hata: string}>}
 */
async function saveClient(clientData, clientId = null) {
  try {
    const userId = uid();
    const veri = {
      userId,
      name:           clientData.name           || '',
      sector:         clientData.sector         || '',
      targetAudience: clientData.targetAudience || '',
      budget:         clientData.budget         || '',
      status:         clientData.status         || 'aktif',
      brief:          clientData.brief          || '',
      socialLinks:    clientData.socialLinks    || {},
      updatedAt:      serverTimestamp(),
    };

    if (clientId) {
      // Güncelle
      await updateDoc(doc(db, 'clients', clientId), veri);
      return { id: clientId };
    } else {
      // Yeni kayıt
      veri.createdAt = serverTimestamp();
      const ref = await addDoc(collection(db, 'clients'), veri);
      return { id: ref.id };
    }
  } catch (err) {
    return { hata: `Müşteri kaydedilemedi: ${err.message}` };
  }
}

/**
 * Tüm müşterileri getirir.
 * @returns {Promise<Array|{hata: string}>}
 */
async function getClients() {
  try {
    const userId = uid();
    // orderBy kaldırıldı — where+orderBy(farklı alan) Firestore composite index gerektirir.
    // İstemci tarafında Türkçe sıralama yapılır.
    const q = query(
      collection(db, 'clients'),
      where('userId', '==', userId)
    );
    const snap = await getDocs(q);
    const results = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return results.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'tr'));
  } catch (err) {
    return { hata: `Müşteriler getirilemedi: ${err.message}` };
  }
}

/**
 * Tek bir müşteriyi ID ile getirir.
 * @param {string} clientId
 * @returns {Promise<object|null|{hata: string}>}
 */
async function getClient(clientId) {
  try {
    const snap = await getDoc(doc(db, 'clients', clientId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
  } catch (err) {
    return { hata: `Müşteri getirilemedi: ${err.message}` };
  }
}

/**
 * Bir müşteriye not ekler.
 * @param {string} clientId
 * @param {object} noteData - { text, category } (category: 'kreatif' | 'teknik' | 'genel')
 * @returns {Promise<{id: string}|{hata: string}>}
 */
async function saveClientNote(clientId, noteData) {
  try {
    const userId = uid();
    const ref = await addDoc(
      collection(db, 'clients', clientId, 'clientNotes'),
      {
        userId,
        text:      noteData.text     || '',
        category:  noteData.category || 'genel',
        createdAt: serverTimestamp(),
      }
    );
    return { id: ref.id };
  } catch (err) {
    return { hata: `Müşteri notu kaydedilemedi: ${err.message}` };
  }
}

/**
 * Bir müşterinin notlarını getirir.
 * @param {string} clientId
 * @returns {Promise<Array|{hata: string}>}
 */
async function getClientNotes(clientId) {
  try {
    const q = query(
      collection(db, 'clients', clientId, 'clientNotes'),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    return { hata: `Müşteri notları getirilemedi: ${err.message}` };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  KPI VE RAPORLAMA
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Bir müşteri için KPI hedefi kaydeder.
 * @param {string} clientId
 * @param {object} kpiData - { name, target, unit, period }
 *   Örnek: { name: 'CPA', target: 50, unit: 'TL', period: 'haftalık' }
 * @returns {Promise<{id: string}|{hata: string}>}
 */
async function saveKPI(clientId, kpiData) {
  try {
    const userId = uid();
    const ref = await addDoc(
      collection(db, 'clients', clientId, 'kpis'),
      {
        userId,
        name:      kpiData.name   || '',
        target:    kpiData.target ?? 0,
        unit:      kpiData.unit   || '',
        period:    kpiData.period || 'aylık',
        actual:    null, // başlangıçta boş
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }
    );
    return { id: ref.id };
  } catch (err) {
    return { hata: `KPI kaydedilemedi: ${err.message}` };
  }
}

/**
 * KPI'ın gerçekleşen değerini günceller.
 * @param {string} clientId
 * @param {string} kpiId
 * @param {number} actualValue - Gerçekleşen değer
 * @returns {Promise<{basarili: boolean}|{hata: string}>}
 */
async function updateKPIActual(clientId, kpiId, actualValue) {
  try {
    await updateDoc(doc(db, 'clients', clientId, 'kpis', kpiId), {
      actual:    actualValue,
      updatedAt: serverTimestamp(),
    });
    return { basarili: true };
  } catch (err) {
    return { hata: `KPI güncellenemedi: ${err.message}` };
  }
}

/**
 * Bir müşterinin tüm KPI'larını getirir.
 * @param {string} clientId
 * @returns {Promise<Array|{hata: string}>}
 */
async function getKPIs(clientId) {
  try {
    const q = query(
      collection(db, 'clients', clientId, 'kpis'),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    return { hata: `KPI'lar getirilemedi: ${err.message}` };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  HEDEFLER VE KİŞİSEL GELİŞİM
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Kişisel hedef kaydeder.
 * @param {object} goalData - { title, description, deadline, status, category }
 *   status: 'bekliyor' | 'devam_ediyor' | 'tamamlandi'
 *   category: 'teknik' | 'kreatif' | 'kariyer' | 'diger'
 * @returns {Promise<{id: string}|{hata: string}>}
 */
async function saveGoal(goalData) {
  try {
    const userId = uid();
    const ref = await addDoc(collection(db, 'goals'), {
      userId,
      title:       goalData.title       || '',
      description: goalData.description || '',
      deadline:    goalData.deadline    || null,
      status:      goalData.status      || 'bekliyor',
      category:    goalData.category    || 'diger',
      createdAt:   serverTimestamp(),
      updatedAt:   serverTimestamp(),
    });
    return { id: ref.id };
  } catch (err) {
    return { hata: `Hedef kaydedilemedi: ${err.message}` };
  }
}

/**
 * Hedefin durumunu günceller.
 * @param {string} goalId
 * @param {string} status - 'bekliyor' | 'devam_ediyor' | 'tamamlandi'
 * @returns {Promise<{basarili: boolean}|{hata: string}>}
 */
async function updateGoalStatus(goalId, status) {
  try {
    await updateDoc(doc(db, 'goals', goalId), {
      status,
      updatedAt: serverTimestamp(),
    });
    return { basarili: true };
  } catch (err) {
    return { hata: `Hedef durumu güncellenemedi: ${err.message}` };
  }
}

/**
 * Kullanıcının tüm hedeflerini getirir.
 * @returns {Promise<Array|{hata: string}>}
 */
async function getGoals() {
  try {
    const userId = uid();
    // orderBy kaldırıldı — composite index gerektirir; istemci tarafında sıralanır
    const q = query(
      collection(db, 'goals'),
      where('userId', '==', userId)
    );
    const snap = await getDocs(q);
    const results = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return results.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
  } catch (err) {
    return { hata: `Hedefler getirilemedi: ${err.message}` };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  GÜNLÜK LOG
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Günlük not kaydeder. Tarih otomatik eklenir.
 * @param {string} logText - "Bugün şunu öğrendim, şunu denedim..."
 * @returns {Promise<{id: string}|{hata: string}>}
 */
async function saveDailyLog(logText) {
  try {
    const userId = uid();
    // Tarih: YYYY-MM-DD formatında (aynı güne ait logları gruplamak için)
    const bugun = new Date().toISOString().split('T')[0];

    const ref = await addDoc(collection(db, 'dailyLogs'), {
      userId,
      logText,
      date:      bugun,
      createdAt: serverTimestamp(),
    });
    return { id: ref.id };
  } catch (err) {
    return { hata: `Günlük log kaydedilemedi: ${err.message}` };
  }
}

/**
 * Son N günlük logu getirir.
 * @param {number} [limitSayisi=30] - Kaç kayıt getirilsin
 * @returns {Promise<Array|{hata: string}>}
 */
async function getDailyLogs(limitSayisi = 30) {
  try {
    const userId = uid();
    // orderBy+limit kaldırıldı — composite index gerektirir; istemci tarafında sıralanır
    const q = query(
      collection(db, 'dailyLogs'),
      where('userId', '==', userId)
    );
    const snap = await getDocs(q);
    const results = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return results
      .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0))
      .slice(0, limitSayisi);
  } catch (err) {
    return { hata: `Günlük loglar getirilemedi: ${err.message}` };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  BECERİ HARİTASI
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Bir becerinin öz değerlendirme puanını kaydeder.
 * Skill başına tek döküman (upsert) — her güncellemede üzerine yazar.
 * @param {string} skill  - Beceri adı (örn: 'Meta Ads', 'Kreatif', 'Google Ads')
 * @param {number} rating - Puan (1-10)
 * @returns {Promise<{basarili: boolean}|{hata: string}>}
 */
async function saveSkillRating(skill, rating) {
  try {
    const userId  = uid();
    // Skill adını döküman ID olarak kullan (boşluk → alt çizgi)
    const docId = `${userId}_${skill.replace(/\s+/g, '_').toLowerCase()}`;

    await setDoc(doc(db, 'skills', docId), {
      userId,
      skill,
      rating:    Math.min(10, Math.max(1, rating)), // 1-10 aralığı zorunlu
      updatedAt: serverTimestamp(),
    }, { merge: true });

    // İlk kayıtta createdAt ekle, güncellememede değiştirme
    const snap = await getDoc(doc(db, 'skills', docId));
    if (!snap.data()?.createdAt) {
      await updateDoc(doc(db, 'skills', docId), { createdAt: serverTimestamp() });
    }

    return { basarili: true };
  } catch (err) {
    return { hata: `Beceri puanı kaydedilemedi: ${err.message}` };
  }
}

/**
 * Kullanıcının tüm beceri puanlarını getirir.
 * @returns {Promise<Array|{hata: string}>}
 */
async function getSkillRatings() {
  try {
    const userId = uid();
    // orderBy kaldırıldı — composite index gerektirir; istemci tarafında sıralanır
    const q = query(
      collection(db, 'skills'),
      where('userId', '==', userId)
    );
    const snap = await getDocs(q);
    const results = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return results.sort((a, b) => (a.skill || '').localeCompare(b.skill || '', 'tr'));
  } catch (err) {
    return { hata: `Beceri puanları getirilemedi: ${err.message}` };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  YAPILACAKLAR
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Yapılacak ekler.
 * @param {object} todoData - { title, clientId?, dueDate?, priority }
 *   priority: 'dusuk' | 'orta' | 'yuksek'
 * @returns {Promise<{id: string}|{hata: string}>}
 */
async function saveTodo(todoData) {
  try {
    const userId = uid();
    const ref = await addDoc(collection(db, 'todos'), {
      userId,
      title:    todoData.title    || '',
      clientId: todoData.clientId || null,  // opsiyonel — müşteriye bağlı
      dueDate:  todoData.dueDate  || null,
      priority: todoData.priority || 'orta',
      done:     false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { id: ref.id };
  } catch (err) {
    return { hata: `Yapılacak kaydedilemedi: ${err.message}` };
  }
}

/**
 * Yapılacağın tamamlandı/tamamlanmadı durumunu günceller.
 * @param {string} todoId
 * @param {boolean} done
 * @returns {Promise<{basarili: boolean}|{hata: string}>}
 */
async function updateTodoStatus(todoId, done) {
  try {
    await updateDoc(doc(db, 'todos', todoId), {
      done,
      updatedAt: serverTimestamp(),
    });
    return { basarili: true };
  } catch (err) {
    return { hata: `Yapılacak güncellenemedi: ${err.message}` };
  }
}

/**
 * Yapılacakları filtreli getirir.
 * @param {object} [filters] - { clientId?, done?, priority? }
 * @returns {Promise<Array|{hata: string}>}
 */
async function getTodos(filters = {}) {
  try {
    const userId = uid();
    // orderBy kaldırıldı — composite index gerektirir; istemci tarafında sıralanır
    const q = query(
      collection(db, 'todos'),
      where('userId', '==', userId)
    );

    const snap  = await getDocs(q);
    let results = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    results.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));

    // Filtreleri uygula
    if (filters.clientId !== undefined) {
      results = results.filter(t => t.clientId === filters.clientId);
    }
    if (filters.done !== undefined) {
      results = results.filter(t => t.done === filters.done);
    }
    if (filters.priority !== undefined) {
      results = results.filter(t => t.priority === filters.priority);
    }

    return results;
  } catch (err) {
    return { hata: `Yapılacaklar getirilemedi: ${err.message}` };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  MÜŞTERİ GÜNLÜK GÖREVLER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Müşteri için tekrar eden günlük görev ekler.
 * @param {string} clientId
 * @param {{ title: string, time?: string }} taskData - time: "HH:MM" opsiyonel
 */
async function saveDailyTask(clientId, taskData) {
  try {
    const userId = uid();
    const ref = await addDoc(
      collection(db, 'clients', clientId, 'dailyTasks'),
      {
        userId,
        title:             taskData.title || '',
        time:              taskData.time  || '',  // "09:30" hatırlatıcı saati
        lastCompletedDate: null,                  // YYYY-MM-DD veya null
        createdAt:         serverTimestamp(),
      }
    );
    return { id: ref.id };
  } catch (err) {
    return { hata: `Günlük görev eklenemedi: ${err.message}` };
  }
}

/**
 * Müşterinin tüm günlük görevlerini getirir.
 * @param {string} clientId
 */
async function getDailyTasks(clientId) {
  try {
    const q = query(
      collection(db, 'clients', clientId, 'dailyTasks'),
      orderBy('createdAt', 'asc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    return { hata: `Günlük görevler getirilemedi: ${err.message}` };
  }
}

/**
 * Günlük görevin tamamlanma durumunu günceller.
 * tamamlandi=true → lastCompletedDate = bugün (YYYY-MM-DD)
 * tamamlandi=false → lastCompletedDate = null
 */
async function toggleDailyTask(clientId, taskId, tamamlandi) {
  try {
    const today = new Date().toISOString().split('T')[0];
    await updateDoc(doc(db, 'clients', clientId, 'dailyTasks', taskId), {
      lastCompletedDate: tamamlandi ? today : null,
    });
    return { basarili: true };
  } catch (err) {
    return { hata: `Günlük görev güncellenemedi: ${err.message}` };
  }
}

/**
 * Günlük görevi siler.
 */
async function deleteDailyTask(clientId, taskId) {
  try {
    await deleteDoc(doc(db, 'clients', clientId, 'dailyTasks', taskId));
    return { basarili: true };
  } catch (err) {
    return { hata: `Günlük görev silinemedi: ${err.message}` };
  }
}

export {
  // Notlar
  saveNote, getNotes, deleteNote,
  // Müşteriler
  saveClient, getClients, getClient, saveClientNote, getClientNotes,
  // KPI
  saveKPI, updateKPIActual, getKPIs,
  // Hedefler
  saveGoal, updateGoalStatus, getGoals,
  // Günlük log
  saveDailyLog, getDailyLogs,
  // Beceriler
  saveSkillRating, getSkillRatings,
  // Yapılacaklar
  saveTodo, updateTodoStatus, getTodos,
  // Günlük Görevler (müşteri bazlı)
  saveDailyTask, getDailyTasks, toggleDailyTask, deleteDailyTask,
};
