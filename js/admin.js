// ============================================================================
// MISS 17 CHIMBARONGO 2026 — SUITE DE ADMINISTRACIÓN Y CONTROL EDITORIAL
// ============================================================================

import {
  INITIAL_CANDIDATES,
  INITIAL_AUDIT_LOGS,
  createEditorialPortrait,
  STORAGE_KEYS
} from './data.js';

// Compresor y optimizador de imágenes vía Canvas HTML5 (JPEG 900x1200 ~120KB)
function resizeImageToDataUrl(file, maxWidth = 900, maxHeight = 1200, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => reject(new Error('No se pudo cargar la imagen para optimizar.'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Error al leer el archivo.'));
    reader.readAsDataURL(file);
  });
}

class Miss17AdminSuite {
  constructor() {
    this.candidates = this.loadFromStorage(STORAGE_KEYS.CANDIDATES, INITIAL_CANDIDATES);
    this.auditLogs = this.loadFromStorage(STORAGE_KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS);
    this.blockedCount = Number(localStorage.getItem(STORAGE_KEYS.BLOCKED_COUNT) || 47);

    // PIN de administración (por defecto 2026 o el guardado por el usuario)
    this.adminPin = localStorage.getItem('m17_admin_custom_pin') || '2026';
    this.isAuthenticated = sessionStorage.getItem('m17_admin_auth') === 'true';

    this.currentTab = 'candidates';
    this.viewMode = 'cards';
    this.searchQuery = '';
    this.editingCandidateId = null;
    this.tempUploadedPhotoUrl = null;

    this.init();
  }

  loadFromStorage(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : null;
      return parsed && Array.isArray(parsed) && parsed.length > 0 ? parsed : fallback;
    } catch {
      return fallback;
    }
  }

  saveState() {
    try {
      localStorage.setItem(STORAGE_KEYS.CANDIDATES, JSON.stringify(this.candidates));
      localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(this.auditLogs.slice(0, 50)));
      localStorage.setItem(STORAGE_KEYS.BLOCKED_COUNT, String(this.blockedCount));
    } catch (err) {
      console.warn('Almacenamiento local:', err);
    }
  }

  init() {
    this.renderAuthState();
    this.bindEvents();
    this.initAuroraCanvas();
  }

  // ==========================================================================
  // AUTENTICACIÓN POR PIN
  // ==========================================================================
  renderAuthState() {
    const lockScreen = document.getElementById('adminLockScreen');
    const authView = document.getElementById('adminAuthenticatedView');
    const pinDisplay = document.getElementById('currentPinDisplay');

    if (pinDisplay) {
      pinDisplay.textContent = this.adminPin;
    }

    if (this.isAuthenticated) {
      if (lockScreen) lockScreen.style.display = 'none';
      if (authView) authView.style.display = 'block';
      this.renderAll();
    } else {
      if (lockScreen) lockScreen.style.display = 'flex';
      if (authView) authView.style.display = 'none';
      const pinInput = document.getElementById('adminPinInput');
      if (pinInput) {
        pinInput.value = '';
        setTimeout(() => pinInput.focus(), 100);
      }
    }
  }

  handlePinSubmit(e) {
    e.preventDefault();
    const pinInput = document.getElementById('adminPinInput');
    const errorEl = document.getElementById('adminPinError');
    const entered = pinInput ? pinInput.value.trim() : '';

    if (entered === this.adminPin) {
      this.isAuthenticated = true;
      sessionStorage.setItem('m17_admin_auth', 'true');
      if (errorEl) errorEl.style.display = 'none';
      this.renderAuthState();
      this.showToast('🔓 Panel de administración desbloqueado correctamente.');
    } else {
      if (errorEl) errorEl.style.display = 'block';
      if (pinInput) {
        pinInput.classList.add('invalid');
        pinInput.value = '';
        setTimeout(() => pinInput.classList.remove('invalid'), 400);
      }
      this.showToast('❌ PIN incorrecto.');
    }
  }

  logout() {
    this.isAuthenticated = false;
    sessionStorage.removeItem('m17_admin_auth');
    this.renderAuthState();
    this.showToast('🔒 Panel de administración bloqueado.');
  }

  changePin(newPin) {
    if (!newPin || newPin.length < 4) {
      this.showToast('El PIN debe tener al menos 4 caracteres.');
      return;
    }
    this.adminPin = newPin;
    localStorage.setItem('m17_admin_custom_pin', newPin);
    const pinDisplay = document.getElementById('currentPinDisplay');
    if (pinDisplay) pinDisplay.textContent = newPin;
    this.showToast(`🔑 PIN de administración actualizado a: ${newPin}`);
  }

  // ==========================================================================
  // RENDERIZADO DEL DASHBOARD
  // ==========================================================================
  renderAll() {
    this.renderKPIs();
    this.renderCardsGrid();
    this.renderCandidatesTable();
    this.renderResultsTable();
    this.renderAuditTable();
  }

  getSortedRanking() {
    return [...this.candidates].sort((a, b) => b.votes - a.votes);
  }

  getTotalVotes() {
    return this.candidates.reduce((sum, c) => sum + Number(c.votes || 0), 0);
  }

  renderKPIs() {
    const sorted = this.getSortedRanking();
    const totalVotes = this.getTotalVotes();

    const leaderNameEl = document.getElementById('adminKpiLeaderName');
    const leaderVotesEl = document.getElementById('adminKpiLeaderVotes');
    const countEl = document.getElementById('adminKpiCount');
    const totalVotesEl = document.getElementById('adminKpiTotalVotes');
    const blockedEl = document.getElementById('adminKpiBlockedBots');

    if (sorted[0]) {
      if (leaderNameEl) leaderNameEl.textContent = sorted[0].name;
      if (leaderVotesEl) leaderVotesEl.textContent = `${Number(sorted[0].votes).toLocaleString('es-CL')} votos acumulados`;
    }
    if (countEl) countEl.textContent = String(this.candidates.length);
    if (totalVotesEl) totalVotesEl.textContent = totalVotes.toLocaleString('es-CL');
    if (blockedEl) blockedEl.textContent = this.blockedCount.toLocaleString('es-CL');
  }

  // Grilla Visual de Tarjetas con Fotografías
  renderCardsGrid() {
    const grid = document.getElementById('adminCandidatesVisualGrid');
    if (!grid) return;

    let list = this.getSortedRanking();
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.sector.toLowerCase().includes(q) ||
          (c.school && c.school.toLowerCase().includes(q))
      );
    }

    if (list.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 48px 20px; text-align: center; color: var(--lila);">
          <div style="font-size: 2.2rem; margin-bottom: 8px;">🔍</div>
          <p style="font-weight: 700;">No se encontraron participantes con el término "${this.searchQuery}".</p>
        </div>
      `;
      return;
    }

    const total = Math.max(this.getTotalVotes(), 1);

    grid.innerHTML = list
      .map((cand, idx) => {
        const pct = ((cand.votes / total) * 100).toFixed(1);
        const fallback = cand.fallbackAvatar || createEditorialPortrait(cand.name, cand.number);
        
        let rankBadge = `<span class="admin-cand-rank-badge">#${idx + 1} EN RANKING</span>`;
        if (idx === 0) {
          rankBadge = `<span class="admin-cand-rank-badge" style="background:var(--fucsia-miss-17);box-shadow:0 0 14px var(--rosa-pop);">👑 TOP 1 · LÍDER</span>`;
        } else if (idx < 3) {
          rankBadge = `<span class="admin-cand-rank-badge" style="background:var(--violeta-17);">TOP ${idx + 1} · PODIO</span>`;
        }

        return `
          <article class="admin-cand-card" data-id="${cand.id}">
            <div class="admin-cand-card-thumb">
              <img src="${cand.avatar}" alt="${cand.name}" onerror="this.onerror=null;this.src='${fallback}';" />
              <div class="admin-cand-card-thumb-overlay"></div>
              <div class="admin-cand-thumb-hud">
                <span class="admin-cand-num-pill">#0${cand.number}</span>
                ${rankBadge}
              </div>
            </div>

            <div class="admin-cand-card-body">
              <div>
                <h4 class="admin-cand-name">${cand.name}</h4>
                <div class="admin-cand-sector">📍 ${cand.sector} · ${cand.age} años</div>
                <div class="admin-cand-school">🏫 ${cand.school || 'Chimbarongo'}</div>
                <p class="admin-cand-quote">“${cand.quote}”</p>
              </div>

              <div>
                <div class="admin-cand-telemetry">
                  <div class="admin-cand-telemetry-row">
                    <span style="color:var(--lila);font-size:0.7rem;font-weight:700;">VOTOS REALES</span>
                    <strong style="color:var(--rosa-pop);font-size:0.96rem;">${Number(cand.votes).toLocaleString('es-CL')}</strong>
                  </div>
                  <div class="liquid-bar-track">
                    <div class="liquid-bar-fill" style="width:${Math.min(100, Math.max(10, Number(pct) * 3))}%;"></div>
                  </div>
                  <div style="font-size:0.65rem;color:var(--lila);text-align:right;margin-top:4px;">
                    ${pct}% preferencia del público
                  </div>
                </div>

                <div class="admin-cand-actions">
                  <button type="button" class="btn-magnetic-fucsia btn-edit-cand" data-id="${cand.id}">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                    <span>Editar Foto y Datos</span>
                  </button>
                  <button type="button" class="btn-glass-secondary btn-delete-cand" data-id="${cand.id}" title="Eliminar participante">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                  </button>
                </div>
              </div>
            </div>
          </article>
        `;
      })
      .join('');
  }

  // Vista de Tabla de Candidatas
  renderCandidatesTable() {
    const tbody = document.getElementById('adminCandidatesTableBody');
    if (!tbody) return;

    const list = this.getSortedRanking();
    const total = Math.max(this.getTotalVotes(), 1);

    tbody.innerHTML = list
      .map((c, index) => {
        const pct = ((c.votes / total) * 100).toFixed(1);
        const fallback = c.fallbackAvatar || createEditorialPortrait(c.name, c.number);

        return `
          <tr>
            <td><strong>#0${c.number}</strong></td>
            <td>
              <img src="${c.avatar}" alt="${c.name}" onerror="this.onerror=null;this.src='${fallback}';" style="width:40px;height:40px;border-radius:10px;object-fit:cover;border:1px solid var(--rosa-pop);" />
            </td>
            <td>
              <strong>${c.name}</strong>
              <div style="font-size:0.68rem;color:var(--lila);">Posición actual: TOP ${index + 1}</div>
            </td>
            <td>${c.age} años</td>
            <td>${c.sector}</td>
            <td>${c.school || 'Chimbarongo'}</td>
            <td><strong style="color:var(--rosa-pop);font-size:0.95rem;">${Number(c.votes).toLocaleString('es-CL')}</strong></td>
            <td><strong>${pct}%</strong></td>
            <td>
              <div style="display:flex;gap:6px;">
                <button type="button" class="btn-magnetic-fucsia btn-edit-cand" data-id="${c.id}" style="padding:6px 12px;font-size:0.7rem;border-radius:8px;">
                  Editar
                </button>
                <button type="button" class="btn-glass-secondary btn-delete-cand" data-id="${c.id}" style="padding:6px 10px;font-size:0.7rem;border-radius:8px;border-color:rgba(244,63,94,0.4);color:#FDA4AF;">
                  ✕
                </button>
              </div>
            </td>
          </tr>
        `;
      })
      .join('');
  }

  // Vista de Tabla Numérica de Resultados
  renderResultsTable() {
    const tbody = document.getElementById('adminResultsTableBody');
    if (!tbody) return;

    const sorted = this.getSortedRanking();
    const total = Math.max(this.getTotalVotes(), 1);
    const leaderVotes = sorted[0] ? sorted[0].votes : 0;

    tbody.innerHTML = sorted
      .map((c, index) => {
        const pct = ((c.votes / total) * 100).toFixed(1);
        const diff = index === 0 ? '👑 LÍDER' : `-${Number(leaderVotes - c.votes).toLocaleString('es-CL')} votos`;
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`;

        return `
          <tr>
            <td><strong>${medal} Lugar</strong></td>
            <td>
              <strong>${c.name}</strong> (#0${c.number})
            </td>
            <td>${c.sector}</td>
            <td><strong style="color:var(--rosa-pop);font-size:0.95rem;">${Number(c.votes).toLocaleString('es-CL')}</strong></td>
            <td>
              <div style="display:flex;align-items:center;gap:10px;">
                <div class="liquid-bar-track" style="width:100px;">
                  <div class="liquid-bar-fill" style="width:${Math.min(100, Math.max(10, Number(pct) * 3))}%;"></div>
                </div>
                <span>${pct}%</span>
              </div>
            </td>
            <td style="color:${index === 0 ? 'var(--rosa-pop)' : 'var(--lila)'};font-weight:700;">${diff}</td>
            <td><span style="color:#6EE7B7;font-weight:700;">${c.trendDelta || '+2.0%'}</span></td>
          </tr>
        `;
      })
      .join('');
  }

  // Vista de Auditoría
  renderAuditTable() {
    const tbody = document.getElementById('adminAuditTableBody');
    if (!tbody) return;

    tbody.innerHTML = this.auditLogs
      .map(
        (log) => `
        <tr>
          <td><code style="color:var(--rosa-pop);font-weight:700;">${log.id}</code></td>
          <td>${log.timestamp}</td>
          <td><strong>${log.maskedRut}</strong></td>
          <td><code>${log.fingerprint}</code></td>
          <td><strong>${log.candidateName}</strong></td>
          <td>
            <span class="badge-status ${log.status === 'VERIFIED' ? 'verified' : 'blocked'}">
              ${log.status === 'VERIFIED' ? 'VERIFICADO' : 'BLOQUEADO'}
            </span>
          </td>
          <td style="color:var(--lila);font-size:0.75rem;">${log.detail}</td>
        </tr>
      `
      )
      .join('');
  }

  // ==========================================================================
  // MODAL DE EDICIÓN Y GESTIÓN DE PARTICIPANTES
  // ==========================================================================
  openCandidateEditor(candId = null) {
    this.editingCandidateId = candId;
    this.tempUploadedPhotoUrl = null;

    const modal = document.getElementById('candidateEditorModalBackdrop');
    const titleEl = document.getElementById('editorModalTitle');
    const previewImg = document.getElementById('editCandPhotoPreview');
    const numBadge = document.getElementById('editCandNumberBadge');
    const quoteCounter = document.getElementById('quoteCharCounter');

    if (candId) {
      const cand = this.candidates.find((c) => c.id === candId);
      if (!cand) return;

      if (titleEl) titleEl.textContent = `Editar Participante: ${cand.name}`;
      document.getElementById('editCandId').value = cand.id;
      document.getElementById('editCandNameInput').value = cand.name;
      document.getElementById('editCandAgeInput').value = cand.age;
      document.getElementById('editCandSectorInput').value = cand.sector;
      document.getElementById('editCandSchoolInput').value = cand.school || '';
      document.getElementById('editCandQuoteInput').value = cand.quote || '';
      document.getElementById('editCandHobbiesInput').value = cand.hobbies || '';
      
      const votesDisplay = document.getElementById('editCandVotesDisplay');
      if (votesDisplay) {
        votesDisplay.textContent = `${Number(cand.votes || 0).toLocaleString('es-CL')} votos`;
      }

      const fallback = cand.fallbackAvatar || createEditorialPortrait(cand.name, cand.number);
      if (previewImg) {
        previewImg.src = cand.avatar;
        previewImg.onerror = () => { previewImg.src = fallback; };
      }
      if (numBadge) numBadge.textContent = `#0${cand.number}`;
      if (quoteCounter) quoteCounter.textContent = `${(cand.quote || '').length}/220`;

      const urlInput = document.getElementById('editCandPhotoUrlInput');
      if (urlInput) urlInput.value = cand.avatar.startsWith('http') ? cand.avatar : '';
    } else {
      if (titleEl) titleEl.textContent = '➕ Registrar Nueva Participante';
      document.getElementById('editCandId').value = '';
      document.getElementById('candidateEditorForm').reset();
      const nextNum = this.candidates.length > 0 ? Math.max(...this.candidates.map((c) => c.number)) + 1 : 1;
      const initialFallback = createEditorialPortrait('Nueva Participante', nextNum);
      if (previewImg) previewImg.src = initialFallback;
      if (numBadge) numBadge.textContent = `#0${nextNum}`;
      if (quoteCounter) quoteCounter.textContent = '0/220';
      const urlInput = document.getElementById('editCandPhotoUrlInput');
      if (urlInput) urlInput.value = '';

      const votesDisplay = document.getElementById('editCandVotesDisplay');
      if (votesDisplay) votesDisplay.textContent = '0 votos';
    }

    modal?.classList.add('open');
  }

  closeCandidateEditor() {
    document.getElementById('candidateEditorModalBackdrop')?.classList.remove('open');
    this.editingCandidateId = null;
    this.tempUploadedPhotoUrl = null;
  }

  async handleSaveCandidate(e) {
    e.preventDefault();
    const id = document.getElementById('editCandId')?.value;
    const name = document.getElementById('editCandNameInput')?.value.trim();
    const age = Number(document.getElementById('editCandAgeInput')?.value) || 17;
    const sector = document.getElementById('editCandSectorInput')?.value.trim();
    const school = document.getElementById('editCandSchoolInput')?.value.trim() || 'Chimbarongo';
    const quote = document.getElementById('editCandQuoteInput')?.value.trim();
    const hobbies = document.getElementById('editCandHobbiesInput')?.value.trim() || 'Actividades comunitarias';

    if (!name || !sector || !quote) {
      this.showToast('Por favor completa los campos obligatorios (*) de la participante.');
      return;
    }

    const previewImg = document.getElementById('editCandPhotoPreview');
    const finalAvatar = this.tempUploadedPhotoUrl || (previewImg ? previewImg.src : null);

    if (id) {
      // Edición de candidata existente (Los votos NO se tocan, se preservan intactos)
      const idx = this.candidates.findIndex((c) => c.id === id);
      if (idx !== -1) {
        const num = this.candidates[idx].number;
        const currentVotes = this.candidates[idx].votes;
        const fallbackSvg = createEditorialPortrait(name, num, '#D50078', '#32114F');
        this.candidates[idx] = {
          ...this.candidates[idx],
          name,
          age,
          sector,
          school,
          quote,
          hobbies,
          votes: currentVotes,
          avatar: finalAvatar || this.candidates[idx].avatar,
          fallbackAvatar: fallbackSvg
        };
        this.showToast(`✨ Datos y fotografía de "${name}" actualizados.`);
      }
    } else {
      // Creación de nueva participante (Inicia con 0 votos reales de los vecinos)
      const nextNum = this.candidates.length > 0 ? Math.max(...this.candidates.map((c) => c.number)) + 1 : 1;
      const fallbackSvg = createEditorialPortrait(name, nextNum, '#D50078', '#32114F');
      const newCand = {
        id: `cand-${Date.now()}`,
        number: nextNum,
        name,
        age,
        sector,
        school,
        quote,
        hobbies,
        votes: 0,
        trendDelta: '+0.0%',
        avatar: finalAvatar || fallbackSvg,
        fallbackAvatar: fallbackSvg
      };
      this.candidates.push(newCand);
      this.showToast(`✨ ¡Nueva participante "${name}" registrada exitosamente!`);
    }

    this.saveState();
    this.renderAll();
    this.closeCandidateEditor();
  }

  deleteCandidate(candId) {
    if (this.candidates.length <= 3) {
      this.showToast('Deben mantenerse al menos 3 candidatas para el podio TOP 3.');
      return;
    }
    const target = this.candidates.find((c) => c.id === candId);
    if (!target) return;

    const confirmDelete = window.confirm(`¿Estás seguro de que deseas eliminar a "${target.name}" del certamen?`);
    if (!confirmDelete) return;

    this.candidates = this.candidates.filter((c) => c.id !== candId);
    this.saveState();
    this.renderAll();
    this.showToast(`Participante "${target.name}" eliminada.`);
  }

  resetDefaultCandidates() {
    const confirmReset = window.confirm('¿Restablecer el listado oficial de candidatas iniciales? (Los datos personalizados se reemplazarán por el catálogo oficial).');
    if (!confirmReset) return;

    this.candidates = JSON.parse(JSON.stringify(INITIAL_CANDIDATES));
    this.saveState();
    this.renderAll();
    this.showToast('🔄 Lista de candidatas oficiales restablecida.');
  }

  // ==========================================================================
  // HERRAMIENTAS, SEGURIDAD Y EXPORTACIÓN
  // ==========================================================================
  resetMyDeviceVote() {
    try {
      localStorage.removeItem(STORAGE_KEYS.VOTED_DEVICES);
      this.showToast('✅ Huella de este navegador limpiada. Puedes votar nuevamente en la página pública.');
    } catch {
      this.showToast('No se pudo restablecer la huella.');
    }
  }

  exportCandidatesCsv() {
    const sorted = this.getSortedRanking();
    const total = Math.max(this.getTotalVotes(), 1);
    let csv = 'Posición,N° Oficial,Nombre,Edad,Sector,Colegio,Votos Reales,Porcentaje\n';

    sorted.forEach((c, idx) => {
      const pct = ((c.votes / total) * 100).toFixed(2);
      csv += `${idx + 1},${c.number},"${c.name}",${c.age},"${c.sector}","${c.school || 'Chimbarongo'}",${c.votes},${pct}%\n`;
    });

    this.downloadFile('reporte_votacion_miss17_chimbarongo.csv', 'text/csv', csv);
    this.showToast('📥 Reporte de candidatas descargado.');
  }

  exportAuditCsv() {
    let csv = 'Comprobante,Timestamp,RUT Enmascarado,Fingerprint,Candidata,Estado,Detalle\n';
    this.auditLogs.forEach((log) => {
      csv += `"${log.id}","${log.timestamp}","${log.maskedRut}","${log.fingerprint}","${log.candidateName}","${log.status}","${log.detail}"\n`;
    });
    this.downloadFile('bitacora_auditoria_miss17.csv', 'text/csv', csv);
    this.showToast('📥 Bitácora de auditoría descargada.');
  }

  clearAuditLogs() {
    const confirmClear = window.confirm('¿Deseas vaciar el historial de auditoría?');
    if (!confirmClear) return;
    this.auditLogs = [];
    this.saveState();
    this.renderAuditTable();
    this.showToast('Bitácora de auditoría vaciada.');
  }

  downloadFile(filename, mimeType, content) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 150);
  }

  showToast(message) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const item = document.createElement('div');
    item.className = 'toast-item';
    item.textContent = message;
    container.appendChild(item);

    setTimeout(() => {
      item.style.opacity = '0';
      item.style.transform = 'translateX(30px)';
      item.style.transition = 'all 0.3s ease';
      setTimeout(() => item.remove(), 300);
    }, 4000);
  }

  // ==========================================================================
  // EVENTOS E INTERACCIONES
  // ==========================================================================
  bindEvents() {
    // Formulario de PIN de acceso
    document.getElementById('adminPinForm')?.addEventListener('submit', (e) => {
      this.handlePinSubmit(e);
    });

    // Cerrar sesión / bloquear
    document.getElementById('btnLogoutAdmin')?.addEventListener('click', () => {
      this.logout();
    });

    // Pestañas
    document.querySelectorAll('.admin-tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        this.switchTab(tab);
      });
    });

    // Alternar modo de vista (Tarjetas vs Tabla)
    document.getElementById('btnViewCards')?.addEventListener('click', () => {
      document.getElementById('btnViewCards')?.classList.add('active');
      document.getElementById('btnViewTable')?.classList.remove('active');
      document.getElementById('adminCandidatesCardsContainer').style.display = 'block';
      document.getElementById('adminCandidatesTableContainer').style.display = 'none';
    });

    document.getElementById('btnViewTable')?.addEventListener('click', () => {
      document.getElementById('btnViewTable')?.classList.add('active');
      document.getElementById('btnViewCards')?.classList.remove('active');
      document.getElementById('adminCandidatesCardsContainer').style.display = 'none';
      document.getElementById('adminCandidatesTableContainer').style.display = 'block';
    });

    // Búsqueda en vivo
    document.getElementById('adminSearchCandInput')?.addEventListener('input', (e) => {
      this.searchQuery = e.target.value.trim();
      this.renderCardsGrid();
    });

    // Botones de acción en tarjetas y tabla
    document.addEventListener('click', (e) => {
      const editBtn = e.target.closest('.btn-edit-cand');
      if (editBtn) {
        const id = editBtn.getAttribute('data-id');
        this.openCandidateEditor(id);
      }

      const deleteBtn = e.target.closest('.btn-delete-cand');
      if (deleteBtn) {
        const id = deleteBtn.getAttribute('data-id');
        this.deleteCandidate(id);
      }
    });

    // Modal de edición de candidata
    document.getElementById('btnOpenAddCandidateModal')?.addEventListener('click', () => {
      this.openCandidateEditor(null);
    });

    document.getElementById('btnCloseEditorModal')?.addEventListener('click', () => {
      this.closeCandidateEditor();
    });

    document.getElementById('btnCancelCandEdit')?.addEventListener('click', () => {
      this.closeCandidateEditor();
    });

    document.getElementById('candidateEditorModalBackdrop')?.addEventListener('click', (e) => {
      if (e.target.id === 'candidateEditorModalBackdrop') {
        this.closeCandidateEditor();
      }
    });

    // Subir fotografía desde equipo
    document.getElementById('btnTriggerPhotoUpload')?.addEventListener('click', () => {
      document.getElementById('editCandFileInput')?.click();
    });

    document.getElementById('editCandFileInput')?.addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      if (!file.type.startsWith('image/')) {
        this.showToast('Por favor selecciona un archivo de imagen válido (JPG, PNG, WEBP).');
        return;
      }

      try {
        this.showToast('Optimizando fotografía para alta calidad...');
        const optimizedDataUrl = await resizeImageToDataUrl(file, 900, 1200, 0.85);
        this.tempUploadedPhotoUrl = optimizedDataUrl;
        const previewImg = document.getElementById('editCandPhotoPreview');
        if (previewImg) previewImg.src = optimizedDataUrl;
        const urlInput = document.getElementById('editCandPhotoUrlInput');
        if (urlInput) urlInput.value = '';
        this.showToast('✅ Fotografía cargada y optimizada.');
      } catch {
        this.showToast('Error al procesar la fotografía. Intenta con otra imagen.');
      }
    });

    // URL de imagen
    document.getElementById('editCandPhotoUrlInput')?.addEventListener('input', (e) => {
      const url = e.target.value.trim();
      if (url.startsWith('http://') || url.startsWith('https://')) {
        this.tempUploadedPhotoUrl = url;
        const previewImg = document.getElementById('editCandPhotoPreview');
        if (previewImg) previewImg.src = url;
      }
    });

    // Monograma editorial
    document.getElementById('btnUseDefaultPortrait')?.addEventListener('click', () => {
      const name = document.getElementById('editCandNameInput')?.value.trim() || 'Participante';
      const num = this.editingCandidateId
        ? this.candidates.find((c) => c.id === this.editingCandidateId)?.number || 1
        : this.candidates.length + 1;
      const svgUrl = createEditorialPortrait(name, num);
      this.tempUploadedPhotoUrl = svgUrl;
      const previewImg = document.getElementById('editCandPhotoPreview');
      if (previewImg) previewImg.src = svgUrl;
      const urlInput = document.getElementById('editCandPhotoUrlInput');
      if (urlInput) urlInput.value = '';
      this.showToast('Monograma editorial asignado a la vista previa.');
    });

    // Contador de frase
    document.getElementById('editCandQuoteInput')?.addEventListener('input', (e) => {
      const counter = document.getElementById('quoteCharCounter');
      if (counter) counter.textContent = `${e.target.value.length}/220`;
    });

    // Guardar candidata
    document.getElementById('candidateEditorForm')?.addEventListener('submit', (e) => {
      this.handleSaveCandidate(e);
    });

    // Restablecer oficiales
    document.getElementById('btnResetDefaultCandidates')?.addEventListener('click', () => {
      this.resetDefaultCandidates();
    });

    // Herramientas y pruebas
    document.getElementById('btnResetMyDeviceVote')?.addEventListener('click', () => {
      this.resetMyDeviceVote();
    });

    document.getElementById('changePinForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const newPin = document.getElementById('newPinInput')?.value.trim();
      if (newPin) {
        this.changePin(newPin);
        document.getElementById('newPinInput').value = '';
      }
    });

    // Exportaciones
    document.getElementById('btnExportCandidatesCsv')?.addEventListener('click', () => {
      this.exportCandidatesCsv();
    });

    document.getElementById('btnExportAuditCsv')?.addEventListener('click', () => {
      this.exportAuditCsv();
    });

    document.getElementById('btnClearAuditLogs')?.addEventListener('click', () => {
      this.clearAuditLogs();
    });
  }

  switchTab(tabName) {
    this.currentTab = tabName;
    document.querySelectorAll('.admin-tab-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
    });

    const paneMap = {
      candidates: 'paneCandidates',
      results: 'paneResults',
      audit: 'paneAudit',
      tools: 'paneTools'
    };

    document.querySelectorAll('.admin-pane').forEach((pane) => {
      pane.classList.remove('active');
    });

    const targetPaneId = paneMap[tabName];
    if (targetPaneId) {
      document.getElementById(targetPaneId)?.classList.add('active');
    }
  }

  initAuroraCanvas() {
    const canvas = document.getElementById('auroraCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    let t = 0;
    const animate = () => {
      t += 0.003;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const grad1 = ctx.createRadialGradient(
        canvas.width * (0.3 + Math.sin(t) * 0.15),
        canvas.height * (0.2 + Math.cos(t * 0.8) * 0.1),
        40,
        canvas.width * 0.3,
        canvas.height * 0.3,
        canvas.width * 0.65
      );
      grad1.addColorStop(0, 'rgba(213, 0, 120, 0.28)');
      grad1.addColorStop(1, 'rgba(16, 5, 24, 0)');
      ctx.fillStyle = grad1;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const grad2 = ctx.createRadialGradient(
        canvas.width * (0.75 - Math.cos(t * 0.7) * 0.15),
        canvas.height * (0.65 + Math.sin(t * 0.9) * 0.12),
        30,
        canvas.width * 0.75,
        canvas.height * 0.65,
        canvas.width * 0.6
      );
      grad2.addColorStop(0, 'rgba(91, 43, 136, 0.32)');
      grad2.addColorStop(1, 'rgba(16, 5, 24, 0)');
      ctx.fillStyle = grad2;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      requestAnimationFrame(animate);
    };
    animate();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new Miss17AdminSuite();
});

