
    // import removed
    // import removed

    // ─── Durum ──────────────────────────────────────────────────────────────────
    let aktifMusteri = null; // Şu an açık müşteri objesi

    // ─── Başlatma ───────────────────────────────────────────────────────────────
    initApp(async (user) => {
      if (user) {
        const avatar = document.getElementById('userAvatar');
        const name   = document.getElementById('userName');
        if (user.displayName) {
          name.textContent   = user.displayName;
          avatar.textContent = user.displayName[0].toUpperCase();
        } else if (user.email) {
          name.textContent   = user.email.split('@')[0];
          avatar.textContent = user.email[0].toUpperCase();
        }
      }
      await musteriListesiYukle();
      await bugunPanelGuncelle();
      hatirlaticiIzniAl();   // bildirim izni iste (sessizce, reddetse de devam et)
    });

    // ─── Müşteri Listesi ─────────────────────────────────────────────────────────
    async function musteriListesiYukle() {
      const grid = document.getElementById('customerGrid');
      grid.innerHTML = '<div style="color:var(--color-text-muted);font-size:var(--text-sm);padding:var(--space-4);">Yükleniyor...</div>';
      try {
        const musteriler = await getClients();
        if (musteriler.hata) throw new Error(musteriler.hata);
        renderMusteriler(musteriler);
      } catch (err) {
        showToast('Müşteriler yüklenemedi: ' + err.message, 'error');
        document.getElementById('customerGrid').innerHTML = '<div class="empty-state">Müşteriler yüklenemedi. Sayfayı yenileyin.</div>';
      }
    }

    function renderMusteriler(musteriler) {
      const grid = document.getElementById('customerGrid');
      grid.innerHTML = '';

      if (!musteriler.length) {
        grid.innerHTML = '<div class="empty-state" style="padding:var(--space-8);color:var(--color-text-muted);font-size:var(--text-sm);">Henüz müşteri eklenmedi. Yeni müşteri ekle →</div>';
        // Placeholder'ı yeniden ekle
        const placeholder = document.createElement('div');
        placeholder.className = 'add-customer-placeholder';
        placeholder.id = 'addCustomerPlaceholder';
        placeholder.tabIndex = 0;
        placeholder.setAttribute('role', 'button');
        placeholder.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:32px;height:32px;">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M19 8v6"/><path d="M22 11h-6"/>
          </svg>
          <span style="font-size:var(--text-sm);font-weight:var(--font-weight-medium);">Yeni Müşteri Ekle</span>
        `;
        placeholder.addEventListener('click', addCustomerModalAc);
        grid.appendChild(placeholder);
        return;
      }

      musteriler.forEach(m => {
        const card = document.createElement('div');
        card.className = 'customer-card';
        card.setAttribute('tabindex', '0');
        card.setAttribute('role', 'button');
        card.innerHTML = `
          <div class="customer-card-top">
            <div class="customer-avatar">${(m.name || '?')[0].toUpperCase()}</div>
            <div class="customer-info">
              <div class="customer-name">${escHtml(m.name)}</div>
              <div class="customer-sector">${escHtml(m.sector || '')}</div>
            </div>
            <span class="badge ${m.status === 'aktif' ? 'badge-success' : ''}">
              ${m.status === 'aktif' ? 'Aktif' : 'Pasif'}
            </span>
          </div>
          ${m.brief ? `<div style="font-size:var(--text-xs);color:var(--color-text-muted);margin:var(--space-1) 0 var(--space-2);line-height:1.4;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">${escHtml(m.brief)}</div>` : ''}
          <div class="customer-card-footer">
            <span class="text-xs text-muted">Bütçe: ${escHtml(m.budget || '—')}</span>
          </div>
        `;
        card.addEventListener('click',   () => musteriDetay(m));
        card.addEventListener('keydown', e => { if (e.key === 'Enter') musteriDetay(m); });
        grid.appendChild(card);
      });

      // Placeholder her zaman sona ekle
      const placeholder = document.createElement('div');
      placeholder.className = 'add-customer-placeholder';
      placeholder.tabIndex = 0;
      placeholder.setAttribute('role', 'button');
      placeholder.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:32px;height:32px;">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M19 8v6"/><path d="M22 11h-6"/>
        </svg>
        <span style="font-size:var(--text-sm);font-weight:var(--font-weight-medium);">Yeni Müşteri Ekle</span>
      `;
      placeholder.addEventListener('click',   addCustomerModalAc);
      placeholder.addEventListener('keydown', e => { if (e.key === 'Enter') addCustomerModalAc(); });
      grid.appendChild(placeholder);
    }

    // ─── Yeni Müşteri Modal ──────────────────────────────────────────────────────
    function addCustomerModalAc() {
      document.getElementById('addCustomerModal').classList.add('is-open');
      document.body.style.overflow = 'hidden';
      document.getElementById('newClientName').focus();
    }

    function addCustomerModalKapat() {
      document.getElementById('addCustomerModal').classList.remove('is-open');
      document.body.style.overflow = '';
      document.getElementById('newClientName').value      = '';
      document.getElementById('newClientSector').value    = '';
      document.getElementById('newClientAudience').value  = '';
      document.getElementById('newClientBudget').value    = '';
      document.getElementById('newClientBrief').value     = '';
    }

    document.getElementById('addCustomerBtn').addEventListener('click', addCustomerModalAc);
    document.getElementById('addModalClose').addEventListener('click', addCustomerModalKapat);
    document.getElementById('cancelNewClientBtn').addEventListener('click', addCustomerModalKapat);
    document.getElementById('addCustomerModal').addEventListener('click', e => {
      if (e.target === document.getElementById('addCustomerModal')) addCustomerModalKapat();
    });

    document.getElementById('saveNewClientBtn').addEventListener('click', async () => {
      const ad = document.getElementById('newClientName').value.trim();
      if (!ad) { showToast('Müşteri adı zorunludur', 'error'); return; }
      const btn = document.getElementById('saveNewClientBtn');
      btn.disabled = true;
      try {
        const sonuc = await saveClient({
          name:           ad,
          sector:         document.getElementById('newClientSector').value.trim(),
          targetAudience: document.getElementById('newClientAudience').value.trim(),
          budget:         document.getElementById('newClientBudget').value.trim(),
          brief:          document.getElementById('newClientBrief').value.trim(),
          status:         'aktif',
        });
        if (sonuc.hata) throw new Error(sonuc.hata);
        showToast('Müşteri eklendi', 'success');
        addCustomerModalKapat();
        await musteriListesiYukle();
      } catch (err) {
        showToast('Müşteri kaydedilemedi: ' + err.message, 'error');
      } finally {
        btn.disabled = false;
      }
    });

    // ─── Müşteri Detay Modal ─────────────────────────────────────────────────────
    async function musteriDetay(musteri) {
      aktifMusteri = musteri;

      document.getElementById('modalCustomerName').textContent   = musteri.name;
      document.getElementById('modalCustomerSector').textContent = musteri.sector || '';
      const statusBadge = document.getElementById('modalCustomerStatus');
      statusBadge.textContent  = musteri.status === 'aktif' ? 'Aktif' : 'Pasif';
      statusBadge.className    = 'badge ' + (musteri.status === 'aktif' ? 'badge-success' : '');

      // Genel sekme doldur
      document.getElementById('tab-genel').innerHTML = `
        <div class="info-row">
          <div class="info-label">Müşteri Adı</div>
          <div class="info-value">${escHtml(musteri.name)}</div>
        </div>
        <div class="info-row">
          <div class="info-label">Sektör</div>
          <div class="info-value">${escHtml(musteri.sector || '—')}</div>
        </div>
        <div class="info-row">
          <div class="info-label">Hedef Kitle</div>
          <div class="info-value">${escHtml(musteri.targetAudience || '—')}</div>
        </div>
        <div class="info-row">
          <div class="info-label">Aylık Bütçe</div>
          <div class="info-value">${escHtml(musteri.budget || '—')}</div>
        </div>
        <div class="info-row">
          <div class="info-label">Durum</div>
          <div class="info-value">
            <span class="badge ${musteri.status === 'aktif' ? 'badge-success' : ''}">
              ${musteri.status === 'aktif' ? 'Aktif' : 'Pasif'}
            </span>
          </div>
        </div>
      `;

      // Brief göster
      const briefEl = document.getElementById('briefDisplay');
      briefEl.textContent = musteri.brief || '';
      briefEl.style.color = musteri.brief ? 'var(--color-text-secondary)' : 'var(--color-text-muted)';
      if (!musteri.brief) briefEl.textContent = 'Brief eklenmedi — Düzenle tuşuna bas.';
      // Brief edit alanını sıfırla
      document.getElementById('briefEditSection').style.display = 'none';
      document.getElementById('briefView').style.display = 'flex';

      document.getElementById('customerModal').classList.add('is-open');
      document.body.style.overflow = 'hidden';
      switchTab('genel');
    }

    function closeCustomerModal() {
      document.getElementById('customerModal').classList.remove('is-open');
      document.body.style.overflow = '';
      aktifMusteri = null;
    }

    document.getElementById('customerModalClose').addEventListener('click', closeCustomerModal);
    document.getElementById('customerModal').addEventListener('click', e => {
      if (e.target === document.getElementById('customerModal')) closeCustomerModal();
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeCustomerModal(); addCustomerModalKapat(); kpiModalKapat(); } });

    // ─── Brief Düzenleme ─────────────────────────────────────────────────────────
    document.getElementById('editBriefBtn').addEventListener('click', () => {
      document.getElementById('briefView').style.display = 'none';
      document.getElementById('briefEditSection').style.display = 'block';
      document.getElementById('briefTextarea').value = aktifMusteri?.brief || '';
      document.getElementById('briefTextarea').focus();
    });

    document.getElementById('cancelBriefBtn').addEventListener('click', () => {
      document.getElementById('briefEditSection').style.display = 'none';
      document.getElementById('briefView').style.display = 'flex';
    });

    document.getElementById('saveBriefBtn').addEventListener('click', async () => {
      if (!aktifMusteri) return;
      const yeniBrief = document.getElementById('briefTextarea').value.trim();
      const btn = document.getElementById('saveBriefBtn');
      btn.disabled = true;
      try {
        const sonuc = await saveClient({
          name:           aktifMusteri.name,
          sector:         aktifMusteri.sector,
          targetAudience: aktifMusteri.targetAudience,
          budget:         aktifMusteri.budget,
          status:         aktifMusteri.status,
          brief:          yeniBrief,
          socialLinks:    aktifMusteri.socialLinks,
        }, aktifMusteri.id);
        if (sonuc.hata) throw new Error(sonuc.hata);
        // Lokal state güncelle
        aktifMusteri.brief = yeniBrief;
        // Brief gösterimi güncelle
        const briefEl = document.getElementById('briefDisplay');
        briefEl.textContent = yeniBrief || 'Brief eklenmedi — Düzenle tuşuna bas.';
        briefEl.style.color = yeniBrief ? 'var(--color-text-secondary)' : 'var(--color-text-muted)';
        document.getElementById('briefEditSection').style.display = 'none';
        document.getElementById('briefView').style.display = 'flex';
        showToast('Brief kaydedildi', 'success');
        // Kart önizlemesini de güncelle
        await musteriListesiYukle();
      } catch (err) {
        showToast('Brief kaydedilemedi: ' + err.message, 'error');
      } finally {
        btn.disabled = false;
      }
    });

    // Ctrl+Enter ile brief kaydet
    document.getElementById('briefTextarea').addEventListener('keydown', e => {
      if (e.key === 'Enter' && e.ctrlKey) document.getElementById('saveBriefBtn').click();
    });

    // ─── Sekmeler ────────────────────────────────────────────────────────────────
    function switchTab(tabId) {
      document.querySelectorAll('.customer-tab').forEach(t => t.classList.remove('is-active'));
      document.querySelectorAll('.tab-panel').forEach(p  => p.classList.remove('is-active'));
      document.querySelector(`.customer-tab[data-tab="${tabId}"]`)?.classList.add('is-active');
      document.getElementById(`tab-${tabId}`)?.classList.add('is-active');

      if (tabId === 'kpi')    kpiSekmeYukle();
      if (tabId === 'notlar') notlarSekmeYukle();
      if (tabId === 'todo')   todoSekmeYukle();
      if (tabId === 'gunluk') gunlukSekmeYukle();
    }

    document.querySelectorAll('.customer-tab').forEach(tab => {
      tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });

    // ─── KPI Sekmesi ─────────────────────────────────────────────────────────────
    async function kpiSekmeYukle() {
      if (!aktifMusteri) return;
      const panel = document.getElementById('tab-kpi');
      panel.innerHTML = '<div style="color:var(--color-text-muted);font-size:var(--text-sm);">Yükleniyor...</div>';
      try {
        const kpiler = await getKPIs(aktifMusteri.id);
        if (kpiler.hata) throw new Error(kpiler.hata);
        renderKpiler(kpiler, panel);
      } catch (err) {
        showToast('KPI\'lar yüklenemedi: ' + err.message, 'error');
        panel.innerHTML = '<div style="color:var(--color-error);font-size:var(--text-sm);">KPI\'lar yüklenemedi.</div>';
      }
    }

    function renderKpiler(kpiler, panel) {
      panel.innerHTML = '';

      if (!kpiler.length) {
        panel.innerHTML = '<p style="font-size:var(--text-sm);color:var(--color-text-muted);margin-bottom:var(--space-4);">Henüz KPI eklenmedi.</p>';
      } else {
        const liste = document.createElement('div');
        liste.style.cssText = 'display:flex;flex-direction:column;gap:var(--space-3);margin-bottom:var(--space-5);';
        kpiler.forEach(kpi => {
          const sapmaHtml = kpiSapmaBadge(kpi);
          const kart = document.createElement('div');
          kart.style.cssText = 'background:var(--color-bg-inset);border:1px solid var(--color-border-default);border-radius:var(--radius-lg);padding:var(--space-4);display:flex;align-items:center;justify-content:space-between;gap:var(--space-3);flex-wrap:wrap;';
          kart.innerHTML = `
            <div>
              <div style="font-size:var(--text-sm);font-weight:var(--font-weight-semibold);color:var(--color-text-primary);">${escHtml(kpi.name)}</div>
              <div style="font-size:var(--text-xs);color:var(--color-text-muted);margin-top:2px;">Hedef: ${kpi.target} ${escHtml(kpi.unit || '')} / ${escHtml(kpi.period || 'aylık')}</div>
            </div>
            <div style="display:flex;align-items:center;gap:var(--space-3);">
              ${sapmaHtml}
              <input
                type="number"
                placeholder="Gerçekleşen"
                value="${kpi.actual !== null && kpi.actual !== undefined ? kpi.actual : ''}"
                data-kpi-id="${kpi.id}"
                style="width:110px;background:var(--color-bg-surface);border:1px solid var(--color-border-default);border-radius:var(--radius-md);padding:var(--space-1) var(--space-2);font-size:var(--text-sm);color:var(--color-text-primary);font-family:var(--font-family-base);"
              >
              <button class="btn btn-primary btn-sm kpi-guncelle-btn" data-kpi-id="${kpi.id}">Güncelle</button>
            </div>
          `;
          liste.appendChild(kart);
        });
        panel.appendChild(liste);

        // Gerçekleşen güncelle butonları
        panel.querySelectorAll('.kpi-guncelle-btn').forEach(btn => {
          btn.addEventListener('click', async () => {
            const kpiId = btn.dataset.kpiId;
            const inp   = panel.querySelector(`input[data-kpi-id="${kpiId}"]`);
            const val   = parseFloat(inp.value);
            if (isNaN(val)) { showToast('Geçerli bir değer girin', 'error'); return; }
            btn.disabled = true;
            try {
              const sonuc = await updateKPIActual(aktifMusteri.id, kpiId, val);
              if (sonuc.hata) throw new Error(sonuc.hata);
              showToast('KPI güncellendi', 'success');
              await kpiSekmeYukle();
            } catch (err) {
              showToast('KPI güncellenemedi: ' + err.message, 'error');
            } finally {
              btn.disabled = false;
            }
          });
        });
      }

      // KPI Ekle butonu
      const ekleBtn = document.createElement('button');
      ekleBtn.className = 'btn btn-primary btn-sm';
      ekleBtn.textContent = '+ Yeni KPI Ekle';
      ekleBtn.addEventListener('click', kpiModalAc);
      panel.appendChild(ekleBtn);
    }

    function kpiSapmaBadge(kpi) {
      if (kpi.actual === null || kpi.actual === undefined || !kpi.target) return '';
      const sapma = ((kpi.actual - kpi.target) / kpi.target) * 100;
      const renk  = sapma <= 0 ? 'var(--color-success)' : 'var(--color-error)';
      const isaret = sapma > 0 ? '+' : '';
      return `<span style="font-size:var(--text-xs);font-weight:var(--font-weight-semibold);color:${renk};background:${renk}22;padding:2px 8px;border-radius:4px;">${isaret}${sapma.toFixed(1)}%</span>`;
    }

    // ─── KPI Modal ───────────────────────────────────────────────────────────────
    function kpiModalAc() {
      document.getElementById('addKpiModal').classList.add('is-open');
      document.getElementById('kpiName').focus();
    }

    function kpiModalKapat() {
      document.getElementById('addKpiModal').classList.remove('is-open');
      ['kpiName','kpiTarget','kpiUnit'].forEach(id => { document.getElementById(id).value = ''; });
      document.getElementById('kpiPeriod').value = 'aylık';
    }

    document.getElementById('addKpiModalClose').addEventListener('click', kpiModalKapat);
    document.getElementById('cancelKpiBtn').addEventListener('click', kpiModalKapat);
    document.getElementById('addKpiModal').addEventListener('click', e => {
      if (e.target === document.getElementById('addKpiModal')) kpiModalKapat();
    });

    document.getElementById('saveKpiBtn').addEventListener('click', async () => {
      if (!aktifMusteri) return;
      const ad = document.getElementById('kpiName').value.trim();
      const hedef = parseFloat(document.getElementById('kpiTarget').value);
      if (!ad)          { showToast('KPI adı zorunludur', 'error');   return; }
      if (isNaN(hedef)) { showToast('Hedef değer zorunludur', 'error'); return; }
      const btn = document.getElementById('saveKpiBtn');
      btn.disabled = true;
      try {
        const sonuc = await saveKPI(aktifMusteri.id, {
          name:   ad,
          target: hedef,
          unit:   document.getElementById('kpiUnit').value.trim(),
          period: document.getElementById('kpiPeriod').value,
        });
        if (sonuc.hata) throw new Error(sonuc.hata);
        showToast('KPI eklendi', 'success');
        kpiModalKapat();
        await kpiSekmeYukle();
      } catch (err) {
        showToast('KPI kaydedilemedi: ' + err.message, 'error');
      } finally {
        btn.disabled = false;
      }
    });

    // ─── Notlar Sekmesi ──────────────────────────────────────────────────────────
    async function notlarSekmeYukle() {
      if (!aktifMusteri) return;
      const panel = document.getElementById('tab-notlar');
      panel.innerHTML = `
        <div style="margin-bottom:var(--space-4);">
          <textarea id="yeniNotTextarea" style="width:100%;min-height:120px;background:var(--color-bg-inset);border:1px solid var(--color-border-default);border-radius:var(--radius-md);padding:var(--space-3);font-size:var(--text-sm);color:var(--color-text-primary);font-family:var(--font-family-base);resize:vertical;box-sizing:border-box;" placeholder="Bu müşteriye dair notlar, gözlemler, stratejiler..."></textarea>
          <button class="btn btn-primary btn-sm" id="saveNotBtn" style="margin-top:var(--space-2);">Not Kaydet</button>
        </div>
        <hr class="divider">
        <div style="margin-top:var(--space-4);">
          <div style="font-size:var(--text-xs);color:var(--color-text-muted);text-transform:uppercase;letter-spacing:var(--tracking-widest);margin-bottom:var(--space-3);">Geçmiş Notlar</div>
          <div id="notListesi" style="display:flex;flex-direction:column;gap:var(--space-2);">
            <div style="color:var(--color-text-muted);font-size:var(--text-sm);">Yükleniyor...</div>
          </div>
        </div>
      `;

      document.getElementById('saveNotBtn').addEventListener('click', async () => {
        const metin = document.getElementById('yeniNotTextarea').value.trim();
        if (!metin) { showToast('Not boş olamaz', 'error'); return; }
        const btn = document.getElementById('saveNotBtn');
        btn.disabled = true;
        try {
          const sonuc = await saveClientNote(aktifMusteri.id, { text: metin });
          if (sonuc.hata) throw new Error(sonuc.hata);
          showToast('Not kaydedildi', 'success');
          document.getElementById('yeniNotTextarea').value = '';
          await notlariRenderEt();
        } catch (err) {
          showToast('Not kaydedilemedi: ' + err.message, 'error');
        } finally {
          btn.disabled = false;
        }
      });

      await notlariRenderEt();
    }

    async function notlariRenderEt() {
      const liste = document.getElementById('notListesi');
      if (!liste) return;
      try {
        const notlar = await getClientNotes(aktifMusteri.id);
        if (notlar.hata) throw new Error(notlar.hata);
        if (!notlar.length) {
          liste.innerHTML = '<div style="color:var(--color-text-muted);font-size:var(--text-sm);">Henüz not eklenmedi.</div>';
          return;
        }
        liste.innerHTML = '';
        notlar.forEach(not => {
          const tarih = not.createdAt?.toDate ? not.createdAt.toDate().toLocaleDateString('tr-TR', { year:'numeric', month:'long', day:'numeric' }) : '—';
          const el = document.createElement('div');
          el.style.cssText = 'background:var(--color-bg-inset);border:1px solid var(--color-border-subtle);border-radius:var(--radius-md);padding:var(--space-3);';
          el.innerHTML = `
            <div style="font-size:var(--text-xs);color:var(--color-text-muted);margin-bottom:var(--space-1);">${tarih}</div>
            <div style="font-size:var(--text-sm);color:var(--color-text-secondary);">${escHtml(not.text)}</div>
          `;
          liste.appendChild(el);
        });
      } catch (err) {
        liste.innerHTML = '<div style="color:var(--color-error);font-size:var(--text-sm);">Notlar yüklenemedi.</div>';
      }
    }

    // ─── Todo Sekmesi ─────────────────────────────────────────────────────────────
    async function todoSekmeYukle() {
      if (!aktifMusteri) return;
      const panel = document.getElementById('tab-todo');
      panel.innerHTML = `
        <div class="todo-list" id="todoList">
          <div style="color:var(--color-text-muted);font-size:var(--text-sm);">Yükleniyor...</div>
        </div>
        <div class="todo-add-row" style="margin-top:var(--space-3);">
          <input type="text" id="newTodoInput" placeholder="Yeni yapılacak ekle..." maxlength="120">
          <button class="btn btn-primary btn-sm" id="addTodoBtn">Ekle</button>
        </div>
      `;

      document.getElementById('addTodoBtn').addEventListener('click', todoEkle);
      document.getElementById('newTodoInput').addEventListener('keydown', e => { if (e.key === 'Enter') todoEkle(); });

      await todolariRenderEt();
    }

    async function todolariRenderEt() {
      const liste = document.getElementById('todoList');
      if (!liste) return;
      try {
        const todolar = await getTodos({ clientId: aktifMusteri.id });
        if (todolar.hata) throw new Error(todolar.hata);
        liste.innerHTML = '';
        if (!todolar.length) {
          liste.innerHTML = '<div style="color:var(--color-text-muted);font-size:var(--text-sm);">Henüz yapılacak eklenmedi.</div>';
          return;
        }
        todolar.forEach(todo => {
          const el = document.createElement('div');
          el.className = 'todo-item';
          el.innerHTML = `
            <div class="todo-checkbox ${todo.done ? 'is-done' : ''}" data-todo-id="${todo.id}" tabindex="0" role="checkbox" aria-checked="${todo.done}">
              ${todo.done ? checkSvg() : ''}
            </div>
            <span class="todo-text ${todo.done ? 'is-done' : ''}">${escHtml(todo.title)}</span>
          `;
          const checkbox = el.querySelector('.todo-checkbox');
          checkbox.addEventListener('click',   () => todoToggle(todo.id, !todo.done));
          checkbox.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') todoToggle(todo.id, !todo.done); });
          liste.appendChild(el);
        });
      } catch (err) {
        console.error('[todolariRenderEt]', err);
        showToast('Yapılacaklar yüklenemedi: ' + err.message, 'error');
        liste.innerHTML = '<div style="color:var(--color-error);font-size:var(--text-sm);">Yapılacaklar yüklenemedi.</div>';
      }
    }

    async function todoEkle() {
      const input = document.getElementById('newTodoInput');
      const metin = input.value.trim();
      if (!metin) return;
      if (!aktifMusteri) { showToast('Müşteri seçili değil', 'error'); return; }
      const btn = document.getElementById('addTodoBtn');
      btn.disabled = true;
      try {
        const sonuc = await saveTodo({ title: metin, clientId: aktifMusteri.id });
        if (sonuc.hata) throw new Error(sonuc.hata);
        showToast('Yapılacak eklendi', 'success');
        input.value = '';
        await todolariRenderEt();
      } catch (err) {
        console.error('[todoEkle]', err);
        showToast('Yapılacak eklenemedi: ' + err.message, 'error');
      } finally {
        btn.disabled = false;
      }
    }

    async function todoToggle(todoId, yeniDurum) {
      try {
        const sonuc = await updateTodoStatus(todoId, yeniDurum);
        if (sonuc.hata) throw new Error(sonuc.hata);
        await todolariRenderEt();
      } catch (err) {
        showToast('Durum güncellenemedi: ' + err.message, 'error');
      }
    }

    // ─── Günlük Sekmesi ──────────────────────────────────────────────────────────
    const BUGUN = () => new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"

    async function gunlukSekmeYukle() {
      if (!aktifMusteri) return;
      const panel = document.getElementById('tab-gunluk');
      panel.innerHTML = '<div style="color:var(--color-text-muted);font-size:var(--text-sm);">Yükleniyor...</div>';
      try {
        const gorevler = await getDailyTasks(aktifMusteri.id);
        if (gorevler.hata) throw new Error(gorevler.hata);
        renderGunlukGorevler(gorevler, panel);
        gunlukBadgeGuncelle(gorevler);
      } catch (err) {
        console.error('[gunlukSekme]', err);
        showToast('Günlük görevler yüklenemedi: ' + err.message, 'error');
        panel.innerHTML = '<div style="color:var(--color-error);font-size:var(--text-sm);">Yüklenemedi.</div>';
      }
    }

    function renderGunlukGorevler(gorevler, panel) {
      const bugun = BUGUN();
      const tamamlanan = gorevler.filter(g => g.lastCompletedDate === bugun).length;
      const toplam = gorevler.length;

      panel.innerHTML = '';

      // İlerleme çubuğu
      const progressDiv = document.createElement('div');
      progressDiv.style.cssText = 'margin-bottom:var(--space-4);';
      const yuzde = toplam ? Math.round((tamamlanan / toplam) * 100) : 0;
      const renkClass = yuzde === 100 ? 'var(--color-success)' : yuzde >= 50 ? 'var(--color-accent)' : 'var(--color-warning, #f59e0b)';
      progressDiv.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-1);">
          <span style="font-size:var(--text-xs);font-weight:var(--font-weight-semibold);color:var(--color-text-muted);text-transform:uppercase;letter-spacing:var(--tracking-wider);">Bugün</span>
          <span style="font-size:var(--text-xs);color:var(--color-text-muted);">${tamamlanan}/${toplam} tamamlandı</span>
        </div>
        <div style="height:4px;background:var(--color-bg-inset);border-radius:2px;overflow:hidden;">
          <div style="height:100%;width:${yuzde}%;background:${renkClass};border-radius:2px;transition:width 0.3s ease;"></div>
        </div>
      `;
      panel.appendChild(progressDiv);

      // Görev listesi
      if (!gorevler.length) {
        const bos = document.createElement('div');
        bos.style.cssText = 'color:var(--color-text-muted);font-size:var(--text-sm);padding:var(--space-4) 0;';
        bos.textContent = 'Henüz günlük görev eklenmedi.';
        panel.appendChild(bos);
      } else {
        const liste = document.createElement('div');
        liste.style.cssText = 'display:flex;flex-direction:column;gap:var(--space-2);margin-bottom:var(--space-4);';
        gorevler.forEach(g => {
          const tamamli = g.lastCompletedDate === bugun;
          const el = document.createElement('div');
          el.style.cssText = `display:flex;align-items:center;gap:var(--space-3);padding:var(--space-2) var(--space-3);background:var(--color-bg-inset);border:1px solid ${tamamli ? 'var(--color-success)22' : 'var(--color-border-subtle)'};border-radius:var(--radius-md);transition:opacity 0.2s;${tamamli ? 'opacity:0.65;' : ''}`;
          el.innerHTML = `
            <div class="todo-checkbox ${tamamli ? 'is-done' : ''}" data-id="${g.id}" tabindex="0" role="checkbox" aria-checked="${tamamli}" style="flex-shrink:0;">
              ${tamamli ? checkSvg() : ''}
            </div>
            <div style="flex:1;min-width:0;">
              <div style="font-size:var(--text-sm);color:var(--color-text-${tamamli ? 'muted' : 'primary'});${tamamli ? 'text-decoration:line-through;' : ''}">${escHtml(g.title)}</div>
              ${g.time ? `<div style="font-size:var(--text-xs);color:var(--color-accent);margin-top:1px;">⏰ ${g.time}</div>` : ''}
            </div>
            <button class="gunluk-sil-btn" data-id="${g.id}" style="background:none;border:none;color:var(--color-text-muted);cursor:pointer;padding:4px;border-radius:var(--radius-sm);font-size:12px;opacity:0;transition:opacity 0.15s;" title="Sil">✕</button>
          `;
          // Hover'da sil butonu göster
          el.addEventListener('mouseenter', () => el.querySelector('.gunluk-sil-btn').style.opacity = '1');
          el.addEventListener('mouseleave', () => el.querySelector('.gunluk-sil-btn').style.opacity = '0');
          // Checkbox toggle
          const cb = el.querySelector('.todo-checkbox');
          const toggle = async () => {
            cb.style.pointerEvents = 'none';
            const sonuc = await toggleDailyTask(aktifMusteri.id, g.id, !tamamli);
            cb.style.pointerEvents = '';
            if (sonuc.hata) { showToast('Güncellenemedi: ' + sonuc.hata, 'error'); return; }
            await gunlukSekmeYukle();
            await bugunPanelGuncelle();
          };
          cb.addEventListener('click', toggle);
          cb.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') toggle(); });
          // Sil
          el.querySelector('.gunluk-sil-btn').addEventListener('click', async (e) => {
            e.stopPropagation();
            if (!confirm(`"${g.title}" silinsin mi?`)) return;
            const sonuc = await deleteDailyTask(aktifMusteri.id, g.id);
            if (sonuc.hata) { showToast('Silinemedi: ' + sonuc.hata, 'error'); return; }
            await gunlukSekmeYukle();
            await bugunPanelGuncelle();
          });
          liste.appendChild(el);
        });
        panel.appendChild(liste);
      }

      // Yeni görev ekleme formu
      const form = document.createElement('div');
      form.style.cssText = 'border-top:1px solid var(--color-border-subtle);padding-top:var(--space-4);';
      form.innerHTML = `
        <div style="font-size:var(--text-xs);font-weight:var(--font-weight-semibold);color:var(--color-text-muted);text-transform:uppercase;letter-spacing:var(--tracking-wider);margin-bottom:var(--space-2);">Yeni Günlük Görev</div>
        <div style="display:flex;gap:var(--space-2);">
          <input type="text" id="gunlukGorevAdi" placeholder="Görev adı..." maxlength="100"
            style="flex:1;background:var(--color-bg-inset);border:1px solid var(--color-border-default);border-radius:var(--radius-md);padding:var(--space-2) var(--space-3);font-size:var(--text-sm);color:var(--color-text-primary);font-family:var(--font-family-base);">
          <input type="time" id="gunlukGorevSaat"
            style="width:90px;background:var(--color-bg-inset);border:1px solid var(--color-border-default);border-radius:var(--radius-md);padding:var(--space-2) var(--space-3);font-size:var(--text-sm);color:var(--color-text-primary);font-family:var(--font-family-base);">
          <button class="btn btn-primary btn-sm" id="gunlukGorevEkleBtn">Ekle</button>
        </div>
        <div style="font-size:var(--text-xs);color:var(--color-text-muted);margin-top:var(--space-1);">Saat seçersen hatırlatıcı kurulur (bildirim izni gerekli).</div>
      `;
      panel.appendChild(form);

      // Görev ekleme handler
      const ekleBtn = panel.querySelector('#gunlukGorevEkleBtn');
      const adInp   = panel.querySelector('#gunlukGorevAdi');
      const saatInp = panel.querySelector('#gunlukGorevSaat');
      const gunlukEkle = async () => {
        const baslik = adInp.value.trim();
        if (!baslik) { showToast('Görev adı zorunludur', 'error'); return; }
        ekleBtn.disabled = true;
        const sonuc = await saveDailyTask(aktifMusteri.id, { title: baslik, time: saatInp.value });
        ekleBtn.disabled = false;
        if (sonuc.hata) { showToast('Eklenemedi: ' + sonuc.hata, 'error'); return; }
        adInp.value = ''; saatInp.value = '';
        showToast('Günlük görev eklendi', 'success');
        await gunlukSekmeYukle();
        await bugunPanelGuncelle();  // bugunPanel içinde hatirlaticiKur() çağrılır
      };
      ekleBtn.addEventListener('click', gunlukEkle);
      adInp.addEventListener('keydown', e => { if (e.key === 'Enter') gunlukEkle(); });
    }

    function gunlukBadgeGuncelle(gorevler) {
      const bugun = BUGUN();
      const bekleyen = gorevler.filter(g => g.lastCompletedDate !== bugun).length;
      const badge = document.getElementById('gunlukBadge');
      if (badge) badge.style.display = bekleyen > 0 ? 'block' : 'none';
    }

    // ─── Bugünkü Takipler Paneli (tüm müşteriler) ───────────────────────────────
    async function bugunPanelGuncelle() {
      const panel  = document.getElementById('bugunPanel');
      const liste  = document.getElementById('bugunGorevler');
      const ozet   = document.getElementById('bugunOzet');
      if (!panel || !liste) return;

      try {
        const musteriler = await getClients();
        if (musteriler.hata || !musteriler.length) { panel.style.display = 'none'; return; }

        const bugun = BUGUN();
        const satirlar = [];
        let toplamBekleyen = 0;
        let toplamToplam = 0;

        for (const m of musteriler) {
          const gorevler = await getDailyTasks(m.id);
          if (gorevler.hata || !gorevler.length) continue;
          const bekleyen = gorevler.filter(g => g.lastCompletedDate !== bugun);
          toplamToplam += gorevler.length;
          toplamBekleyen += bekleyen.length;
          if (gorevler.length > 0) {
            satirlar.push({ musteri: m, gorevler, bekleyen: bekleyen.length });
          }
        }

        if (toplamToplam === 0) { panel.style.display = 'none'; return; }

        panel.style.display = 'block';
        ozet.textContent = `${toplamBekleyen} bekliyor / ${toplamToplam} toplam`;
        ozet.style.color = toplamBekleyen > 0 ? 'var(--color-warning, #f59e0b)' : 'var(--color-success)';

        liste.innerHTML = '';
        satirlar.forEach(({ musteri: m, gorevler, bekleyen }) => {
          const satir = document.createElement('div');
          satir.style.cssText = 'background:var(--color-bg-surface);border:1px solid var(--color-border-subtle);border-radius:var(--radius-md);padding:var(--space-3) var(--space-4);';
          const tamamlanan = gorevler.length - bekleyen;
          satir.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-2);">
              <div style="display:flex;align-items:center;gap:var(--space-2);">
                <div style="width:24px;height:24px;background:var(--color-accent);border-radius:var(--radius-sm);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;">${(m.name||'?')[0].toUpperCase()}</div>
                <span style="font-size:var(--text-sm);font-weight:var(--font-weight-semibold);color:var(--color-text-primary);">${escHtml(m.name)}</span>
              </div>
              <span style="font-size:var(--text-xs);color:${bekleyen > 0 ? 'var(--color-warning,#f59e0b)' : 'var(--color-success)'};">${tamamlanan}/${gorevler.length}</span>
            </div>
            <div style="display:flex;flex-direction:column;gap:4px;">
              ${gorevler.map(g => {
                const tam = g.lastCompletedDate === bugun;
                return `<div style="display:flex;align-items:center;gap:var(--space-2);${tam ? 'opacity:0.5;' : ''}">
                  <div style="width:14px;height:14px;border:2px solid ${tam ? 'var(--color-success)' : 'var(--color-border-strong)'};border-radius:3px;background:${tam ? 'var(--color-success)' : 'transparent'};flex-shrink:0;display:flex;align-items:center;justify-content:center;">
                    ${tam ? '<svg viewBox="0 0 10 10" style="width:8px;height:8px;"><polyline points="1.5,5 4,7.5 8.5,2.5" stroke="#fff" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>' : ''}
                  </div>
                  <span style="font-size:var(--text-xs);color:var(--color-text-secondary);${tam ? 'text-decoration:line-through;' : ''}">${escHtml(g.title)}</span>
                  ${g.time ? `<span style="font-size:10px;color:var(--color-accent);margin-left:auto;">${g.time}</span>` : ''}
                </div>`;
              }).join('')}
            </div>
          `;
          // Müşteriye tıklayınca detay aç
          satir.style.cursor = 'pointer';
          satir.addEventListener('click', () => musteriDetay(m));
          liste.appendChild(satir);
        });

        // Hatırlatıcıları güncelle
        hatirlaticiKur();
      } catch (err) {
        console.error('[bugunPanel]', err);
      }
    }

    // ─── Tarayıcı Bildirimleri ────────────────────────────────────────────────────
    const _hatirlaticiTimers = [];

    async function hatirlaticiIzniAl() {
      if (!('Notification' in window)) return false;
      if (Notification.permission === 'granted') return true;
      if (Notification.permission === 'denied') return false;
      const izin = await Notification.requestPermission();
      return izin === 'granted';
    }

    async function hatirlaticiKur() {
      // Önceki timer'ları temizle
      _hatirlaticiTimers.forEach(t => clearTimeout(t));
      _hatirlaticiTimers.length = 0;

      if (!('Notification' in window) || Notification.permission !== 'granted') return;

      const musteriler = await getClients();
      if (musteriler.hata) return;
      const bugun = BUGUN();
      const simdi = new Date();

      for (const m of musteriler) {
        const gorevler = await getDailyTasks(m.id);
        if (gorevler.hata) continue;
        gorevler.forEach(g => {
          if (!g.time || g.lastCompletedDate === bugun) return;
          const [saat, dakika] = g.time.split(':').map(Number);
          const hedef = new Date();
          hedef.setHours(saat, dakika, 0, 0);
          const fark = hedef - simdi;
          if (fark > 0 && fark < 12 * 3600 * 1000) {  // en fazla 12 saat ilerisi
            const t = setTimeout(() => {
              new Notification(`⏰ ${m.name}`, {
                body: g.title,
                tag:  `daily-${m.id}-${g.id}`,
              });
            }, fark);
            _hatirlaticiTimers.push(t);
          }
        });
      }
    }

    // Paneli gizle/göster toggle
    document.getElementById('bugunPanelToggle').addEventListener('click', () => {
      const liste = document.getElementById('bugunGorevler');
      const btn   = document.getElementById('bugunPanelToggle');
      const gizli = liste.style.display === 'none';
      liste.style.display = gizli ? 'flex' : 'none';
      if (gizli) liste.style.flexDirection = 'column';
      btn.textContent = gizli ? 'Gizle' : 'Göster';
    });

    function checkSvg() {
      return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="width:10px;height:10px;"><polyline points="20 6 9 17 4 12"/></svg>';
    }

    // ─── Yardımcılar ─────────────────────────────────────────────────────────────
    function escHtml(str) {
      return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

  