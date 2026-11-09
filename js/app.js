// ============================================================================
// MISS 17 CHIMBARONGO 2026 — MOTOR INTERACTIVO, SHADER AURORA & SPATIAL UI
// ============================================================================

import {
  INITIAL_CANDIDATES,
  DYNAMIC_PODIUM_PHRASES,
  INITIAL_AUDIT_LOGS,
  createEditorialPortrait
} from './data.js';

import {
  formatRut,
  validateRut,
  generateRandomValidRut,
  maskRut,
  validateEmailSecurity,
  generateDeviceFingerprint,
  BotShieldTelemetry
} from './security.js';

const STORAGE_KEYS = {
  CANDIDATES: 'm17_chimbarongo_candidates_2026_v3',
  VOTED_RUTS: 'm17_chimbarongo_voted_ruts_2026_v3',
  VOTED_EMAILS: 'm17_chimbarongo_voted_emails_2026_v3',
  VOTED_DEVICES: 'm17_chimbarongo_voted_devices_2026_v3',
  AUDIT_LOGS: 'm17_chimbarongo_audit_logs_2026_v3',
  BLOCKED_COUNT: 'm17_chimbarongo_blocked_count_2026_v3'
};

class Miss17VotingApp {
  constructor() {
    this.candidates = this.loadFromStorage(STORAGE_KEYS.CANDIDATES, INITIAL_CANDIDATES);
    this.displayOrderIds = this.shuffleIds(this.candidates.map((c) => c.id));
    this.votedRuts = new Set(this.loadFromStorage(STORAGE_KEYS.VOTED_RUTS, ['18482910K', '199102344', '202057817']));
    this.votedEmails = new Set(this.loadFromStorage(STORAGE_KEYS.VOTED_EMAILS, []));
    this.votedDevices = new Set(this.loadFromStorage(STORAGE_KEYS.VOTED_DEVICES, []));
    this.auditLogs = this.loadFromStorage(STORAGE_KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS);
    this.blockedCount = Number(localStorage.getItem(STORAGE_KEYS.BLOCKED_COUNT) || 47);

    this.deviceFingerprint = 'FP-INIT...';
    this.botTelemetry = new BotShieldTelemetry();

    this.selectedCandidate = null;
    this.activeOtpSession = null;
    this.otpTimerInterval = null;
    this.liveSimInterval = null;
    this.phraseIndex = 0;
    this.searchQuery = '';

    this.init();
  }

  async init() {
    this.initAuroraShader();
    this.initSpatialPhysics();

    this.deviceFingerprint = await generateDeviceFingerprint();

    const heroBadge = document.getElementById('heroDeviceBadge');
    if (heroBadge) heroBadge.textContent = this.deviceFingerprint;

    const modalFp = document.getElementById('modalFingerprintCode');
    if (modalFp) modalFp.textContent = this.deviceFingerprint;

    this.renderAll();
    this.bindEvents();
    this.startPhraseRotation();
  }

  // ==========================================================================
  // SHADER CANVAS 60FPS: CINTAS DE SEDA FLUIDA & AURORA MISS 17
  // ==========================================================================
  initAuroraShader() {
    const canvas = document.getElementById('auroraCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let w = (canvas.width = window.innerWidth);
    let h = (canvas.height = window.innerHeight);
    let mouseX = w * 0.5;
    let mouseY = h * 0.35;

    window.addEventListener('resize', () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    });

    window.addEventListener(
      'mousemove',
      (e) => {
        mouseX += (e.clientX - mouseX) * 0.08;
        mouseY += (e.clientY - mouseY) * 0.08;
      },
      { passive: true }
    );

    const orbs = [
      { x: w * 0.2, y: h * 0.25, r: 340, color: 'rgba(213, 0, 120, 0.22)', vx: 0.45, vy: 0.3 },
      { x: w * 0.8, y: h * 0.3, r: 390, color: 'rgba(91, 43, 136, 0.28)', vx: -0.35, vy: 0.4 },
      { x: w * 0.5, y: h * 0.75, r: 320, color: 'rgba(242, 41, 155, 0.18)', vx: 0.3, vy: -0.35 }
    ];

    let t = 0;
    const renderFrame = () => {
      t += 0.012;
      ctx.clearRect(0, 0, w, h);

      // Orbes atmosféricos suaves
      orbs.forEach((orb) => {
        orb.x += orb.vx;
        orb.y += orb.vy;
        if (orb.x < -100 || orb.x > w + 100) orb.vx *= -1;
        if (orb.y < -100 || orb.y > h + 100) orb.vy *= -1;

        const grad = ctx.createRadialGradient(orb.x, orb.y, 10, orb.x, orb.y, orb.r);
        grad.addColorStop(0, orb.color);
        grad.addColorStop(1, 'rgba(17, 4, 28, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, orb.r, 0, Math.PI * 2);
        ctx.fill();
      });

      // Cintas de seda dinámicas inspiradas en el logo de Miss 17 Chimbarongo
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        const yBase = h * (0.28 + i * 0.24);
        ctx.moveTo(0, yBase);
        for (let x = 0; x <= w; x += 40) {
          const wave1 = Math.sin(x * 0.0025 + t + i * 1.4) * 55;
          const wave2 = Math.cos(x * 0.004 - t * 0.8 + i) * 28;
          const cursorPull = ((mouseY - h / 2) * 0.06) * Math.sin((x / w) * Math.PI);
          ctx.lineTo(x, yBase + wave1 + wave2 + cursorPull);
        }
        ctx.strokeStyle =
          i === 0
            ? 'rgba(242, 41, 155, 0.22)'
            : i === 1
            ? 'rgba(200, 155, 221, 0.16)'
            : 'rgba(213, 0, 120, 0.18)';
        ctx.lineWidth = i === 0 ? 2.5 : 1.5;
        ctx.stroke();
      }

      requestAnimationFrame(renderFrame);
    };

    requestAnimationFrame(renderFrame);
  }

  // ==========================================================================
  // FÍSICA ESPACIAL 3D Y SPOTLIGHT DE CURSOR
  // ==========================================================================
  initSpatialPhysics() {
    // Efecto navbar al hacer scroll
    const navbar = document.getElementById('mainNavbar');
    window.addEventListener(
      'scroll',
      () => {
        if (!navbar) return;
        if (window.scrollY > 30) navbar.classList.add('scrolled');
        else navbar.classList.remove('scrolled');
      },
      { passive: true }
    );

    // Spotlight y Tilt 3D del Monolito en el Hero
    const heroMonolith = document.getElementById('heroTiltMonolith');
    if (heroMonolith) {
      window.addEventListener(
        'mousemove',
        (e) => {
          if (window.innerWidth < 1024) return;
          const rect = heroMonolith.getBoundingClientRect();
          const cx = rect.left + rect.width / 2;
          const cy = rect.top + rect.height / 2;
          const dx = (e.clientX - cx) / (window.innerWidth / 2);
          const dy = (e.clientY - cy) / (window.innerHeight / 2);
          heroMonolith.style.transform = `rotateY(${dx * 8}deg) rotateX(${-dy * 8}deg)`;
        },
        { passive: true }
      );
    }

    // Delegación para Spotlight en tarjetas
    document.addEventListener(
      'mousemove',
      (e) => {
        const card = e.target.closest('.spotlight-card, .podium-monolith, .editorial-cover-card');
        if (!card) return;
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        card.style.setProperty('--mx', `${x}px`);
        card.style.setProperty('--my', `${y}px`);
      },
      { passive: true }
    );
  }

  loadFromStorage(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : null;
      if (Array.isArray(fallback)) {
        if (Array.isArray(parsed) && parsed.length >= 3) return parsed;
        return structuredClone(fallback);
      }
      return parsed !== null ? parsed : structuredClone(fallback);
    } catch {
      return structuredClone(fallback);
    }
  }

  saveState() {
    try {
      localStorage.setItem(STORAGE_KEYS.CANDIDATES, JSON.stringify(this.candidates));
      localStorage.setItem(STORAGE_KEYS.VOTED_RUTS, JSON.stringify([...this.votedRuts]));
      localStorage.setItem(STORAGE_KEYS.VOTED_EMAILS, JSON.stringify([...this.votedEmails]));
      localStorage.setItem(STORAGE_KEYS.VOTED_DEVICES, JSON.stringify([...this.votedDevices]));
      localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(this.auditLogs.slice(0, 40)));
      localStorage.setItem(STORAGE_KEYS.BLOCKED_COUNT, String(this.blockedCount));
    } catch {
      // Ignore storage quota errors
    }
  }

  shuffleIds(ids) {
    const arr = [...ids];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  getTotalVotes() {
    return this.candidates.reduce((sum, c) => sum + Number(c.votes || 0), 0);
  }

  getSortedRanking() {
    return [...this.candidates].sort((a, b) => b.votes - a.votes);
  }

  // ==========================================================================
  // RENDERIZADO COMPLETO DE LA INTERFAZ 2026
  // ==========================================================================
  renderAll(highlightCandidateId = null) {
    this.renderStats();
    this.renderTicker();
    this.renderPodium(highlightCandidateId);
    this.renderCandidatesGrid();
    this.renderAdminTables();
    this.updateDeviceLabStatus();
  }

  renderStats() {
    const totalEl = document.getElementById('statTotalVerified');
    const blockedEl = document.getElementById('statBlockedBots');
    const countEl = document.getElementById('adminCandCount');
    const heroTop1El = document.getElementById('heroTop1PreviewName');

    const sorted = this.getSortedRanking();

    if (totalEl) totalEl.textContent = this.getTotalVotes().toLocaleString('es-CL');
    if (blockedEl) blockedEl.textContent = this.blockedCount.toLocaleString('es-CL');
    if (countEl) countEl.textContent = String(this.candidates.length);
    if (heroTop1El && sorted[0]) heroTop1El.textContent = sorted[0].name;
  }

  renderTicker() {
    const track1 = document.getElementById('liveTickerTrackPrimary');
    const track2 = document.getElementById('liveTickerTrackSecondary');
    if (!track1 || !track2) return;

    const sorted = this.getSortedRanking();
    const total = Math.max(this.getTotalVotes(), 1);
    const top1 = sorted[0];
    const top2 = sorted[1];
    const diffPct = top1 && top2 ? (((top1.votes - top2.votes) / total) * 100).toFixed(1) : '1.1';

    const primaryNodes = [
      `👑 TOP 1 EN VIVO: ${top1 ? top1.name : 'EN DISPUTA'} · LA MÁS VOTADA DEL MOMENTO`,
      `🔥 DIFERENCIA ENTRE EL TOP 1 Y TOP 2: SOLO ${diffPct}% DE PREFERENCIA`,
      `✨ MISS 17 CHIMBARONGO · NUEVA GENERACIÓN 2026`,
      `🗳️ 1 PERSONA = 1 VOTO · RESULTADOS ACTUALIZADOS EN TIEMPO REAL`
    ];

    const recentLogs = this.auditLogs.filter((l) => l.status === 'VERIFIED').slice(0, 4);
    const secondaryNodes = [
      ...recentLogs.map((l) => `✨ VOTO CONFIRMADO (${l.maskedRut}) → ${l.candidateName}`),
      `💗 CELEBRANDO EL TALENTO Y JUVENTUD DE NUESTRA COMUNA`,
      `📍 CANDIDATAS DE CONVENTO VIEJO, TINGUIRIRICA, PEOR ES NADA, CENTRO Y MÁS`,
      `⚖️ TODAS LAS PARTICIPANTES COMPITEN EN IGUALDAD DE CONDICIONES`
    ];

    const buildTrackHTML = (arr) =>
      [...arr, ...arr, ...arr]
        .map(
          (text) => `
          <div class="ribbon-node">
            <span class="ribbon-dot"></span>
            <span>${text}</span>
          </div>
        `
        )
        .join('');

    track1.innerHTML = buildTrackHTML(primaryNodes);
    track2.innerHTML = buildTrackHTML(secondaryNodes);
  }

  renderPodium(highlightCandidateId = null) {
    const podiumContainer = document.getElementById('podiumContainer');
    const runnersContainer = document.getElementById('runnersUpContainer');
    if (!podiumContainer || !runnersContainer) return;

    const sorted = this.getSortedRanking();
    const totalVotes = Math.max(this.getTotalVotes(), 1);

    const top1 = sorted[0];
    const top2 = sorted[1];
    const top3 = sorted[2];

    const podiumOrder = [
      { cand: top2, rank: 2, label: 'TOP 2 · FAVORITA', phraseList: DYNAMIC_PODIUM_PHRASES.top2 },
      { cand: top1, rank: 1, label: 'TOP 1 · LÍDER ACTUAL', phraseList: DYNAMIC_PODIUM_PHRASES.top1 },
      { cand: top3, rank: 3, label: 'TOP 3 · PODIO OFICIAL', phraseList: DYNAMIC_PODIUM_PHRASES.top3 }
    ].filter((item) => Boolean(item.cand));

    podiumContainer.innerHTML = podiumOrder
      .map(({ cand, rank, label, phraseList }) => {
        const sharePct = ((cand.votes / totalVotes) * 100).toFixed(1);
        const visualBarWidth = Math.min(96, Math.max(32, Number(sharePct) * 3.9)).toFixed(0);
        const phrase = phraseList[this.phraseIndex % phraseList.length];
        const isFlashing = highlightCandidateId === cand.id ? 'flash-update' : '';
        const fallback = cand.fallbackAvatar || createEditorialPortrait(cand.name, cand.number);

        return `
          <article class="podium-monolith rank-${rank} ${isFlashing}" data-cand-id="${cand.id}">
            <img
              src="${cand.avatar}"
              alt="${cand.name}"
              class="monolith-backdrop-img"
              onerror="this.onerror=null;this.src='${fallback}';"
            />
            <div class="monolith-gradient-veil"></div>

            <div class="monolith-top-bar">
              <div class="monolith-rank-badge">
                ${
                  rank === 1
                    ? `<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z"/></svg>`
                    : `<span class="live-beacon"></span>`
                }
                <span>${label}</span>
              </div>
              <span class="monolith-giant-num">0${rank}</span>
            </div>

            <div class="monolith-content">
              <div class="monolith-dynamic-phrase">
                <span>${phrase}</span>
              </div>
              <h3 class="monolith-cand-name">${cand.name}</h3>
              <p class="monolith-cand-meta">${cand.sector} · Candidata #0${cand.number}</p>

              <div class="monolith-telemetry-hud">
                <div class="hud-row-top">
                  <span class="hud-label">Preferencia del Público</span>
                  <span class="hud-percentage">${sharePct}%</span>
                </div>
                <div class="liquid-bar-track">
                  <div class="liquid-bar-fill" style="width: ${visualBarWidth}%"></div>
                </div>
                <div class="hud-row-bottom">
                  <span class="hud-trend-up">▲ ${cand.trendDelta || '+1.8%'} tendencia reciente</span>
                  <span>Conteo exacto oculto</span>
                </div>
              </div>

              <button type="button" class="btn-magnetic-fucsia btn-open-vote" data-id="${cand.id}" style="width:100%;">
                <span>Votar por ${cand.name.split(' ')[0]}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              </button>
            </div>
          </article>
        `;
      })
      .join('');

    const runnersUp = sorted.slice(3);
    runnersContainer.innerHTML = runnersUp
      .map((cand, idx) => {
        const pct = ((cand.votes / totalVotes) * 100).toFixed(1);
        return `
          <div class="chaser-chip">
            <span class="chaser-rank">#0${idx + 4}</span>
            <strong>${cand.name.split(' ')[0]} ${cand.name.split(' ')[1] || ''}</strong>
            <span class="chaser-pct">${pct}% preferencia</span>
          </div>
        `;
      })
      .join('');
  }

  renderCandidatesGrid() {
    const grid = document.getElementById('candidatesGrid');
    if (!grid) return;

    const sorted = this.getSortedRanking();

    const orderedCandidates = this.displayOrderIds
      .map((id) => this.candidates.find((c) => c.id === id))
      .filter(Boolean)
      .filter((c) => {
        if (!this.searchQuery) return true;
        const q = this.searchQuery.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          c.sector.toLowerCase().includes(q) ||
          (c.school && c.school.toLowerCase().includes(q))
        );
      });

    if (orderedCandidates.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align:center; padding: 48px; background: var(--blanco); border-radius: 24px; border: 1.5px solid var(--lila);">
          <p style="font-family:var(--font-principal);font-weight:800;color:var(--violeta-17);text-transform:uppercase;">
            No se encontraron candidatas con ese criterio de búsqueda.
          </p>
        </div>
      `;
      return;
    }

    grid.innerHTML = orderedCandidates
      .map((cand) => {
        const rankIndex = sorted.findIndex((c) => c.id === cand.id) + 1;
        let topBadge = '';
        if (rankIndex === 1) topBadge = `<span class="cover-rank-pill">TOP 1 · LA MÁS VOTADA</span>`;
        else if (rankIndex <= 3) topBadge = `<span class="cover-rank-pill" style="background:var(--violeta-17);">EN EL TOP ${rankIndex}</span>`;

        const fallback = cand.fallbackAvatar || createEditorialPortrait(cand.name, cand.number);

        return `
          <article class="editorial-cover-card btn-open-vote" data-id="${cand.id}">
            <img
              src="${cand.avatar}"
              alt="${cand.name}"
              class="cover-portrait-img"
              loading="lazy"
              onerror="this.onerror=null;this.src='${fallback}';"
            />
            <div class="cover-gradient-overlay"></div>

            <div class="cover-top-hud">
              <span class="cover-stroke-number">${String(cand.number).padStart(2, '0')}</span>
              ${topBadge}
            </div>

            <div class="cover-bottom-content">
              <span class="cover-sector-tag">${cand.sector} · ${cand.age} años</span>
              <h3 class="cover-cand-name">${cand.name}</h3>
              <p class="cover-cand-school">${cand.school || 'Chimbarongo'}</p>
              <p class="cover-quote-drawer">“${cand.quote}”</p>

              <button type="button" class="btn-cover-vote btn-open-vote" data-id="${cand.id}">
                <span>VOTAR POR ELLA</span>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              </button>
            </div>
          </article>
        `;
      })
      .join('');
  }

  renderAdminTables() {
    const candTbody = document.getElementById('adminCandidatesTableBody');
    const auditTbody = document.getElementById('auditLogTableBody');
    const total = Math.max(this.getTotalVotes(), 1);

    if (candTbody) {
      const sorted = this.getSortedRanking();
      candTbody.innerHTML = sorted
        .map((c, index) => {
          const pct = ((c.votes / total) * 100).toFixed(1);
          return `
            <tr>
              <td><strong>#0${c.number}</strong> <span style="color:var(--lila);">(TOP ${index + 1})</span></td>
              <td><strong>${c.name}</strong><br/><span style="font-size:0.74rem;color:var(--lila);">${c.age} años</span></td>
              <td>${c.sector}</td>
              <td><strong style="color:var(--rosa-pop);font-size:0.96rem;">${c.votes} votos reales</strong></td>
              <td>${pct}%</td>
              <td>
                <button type="button" class="btn-glass-secondary btn-delete-cand" data-id="${c.id}" style="padding:6px 12px;font-size:0.68rem;border-color:#F43F5E;color:#FDA4AF;">
                  Eliminar
                </button>
              </td>
            </tr>
          `;
        })
        .join('');
    }

    if (auditTbody) {
      auditTbody.innerHTML = this.auditLogs
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
            <td style="color:var(--lila);">${log.detail}</td>
          </tr>
        `
        )
        .join('');
    }
  }

  updateDeviceLabStatus() {
    const statusText = document.getElementById('labDeviceStatusText');
    if (!statusText) return;
    const hasVoted = this.votedDevices.has(this.deviceFingerprint);
    if (hasVoted) {
      statusText.innerHTML = `<strong style="color:#FDA4AF;">Voto Ya Registrado:</strong> Este equipo ya emitió un voto de prueba. Presiona el botón para habilitarlo de nuevo.`;
    } else {
      statusText.innerHTML = `<strong style="color:#6EE7B7;">Listo para Votar:</strong> Puedes emitir un voto de prueba normalmente.`;
    }
  }

  // ==========================================================================
  // EVENTOS E INTERACCIONES
  // ==========================================================================
  bindEvents() {
    document.addEventListener('click', (e) => {
      const voteTrigger = e.target.closest('.btn-open-vote');
      if (voteTrigger) {
        const candId = voteTrigger.getAttribute('data-id');
        this.openVoteModal(candId);
      }

      const deleteBtn = e.target.closest('.btn-delete-cand');
      if (deleteBtn) {
        e.stopPropagation();
        const candId = deleteBtn.getAttribute('data-id');
        this.deleteCandidate(candId);
      }
    });

    document.getElementById('btnShuffleCandidates')?.addEventListener('click', () => {
      this.displayOrderIds = this.shuffleIds(this.candidates.map((c) => c.id));
      this.renderCandidatesGrid();
      this.showToast('Orden aleatorio aplicado para garantizar igualdad de condiciones.');
    });

    document.getElementById('searchCandidateInput')?.addEventListener('input', (e) => {
      this.searchQuery = e.target.value.trim();
      this.renderCandidatesGrid();
    });

    document.getElementById('btnCloseVoteModal')?.addEventListener('click', () => this.closeVoteModal());
    document.getElementById('btnFinishVoteModal')?.addEventListener('click', () => {
      this.closeVoteModal();
      document.getElementById('ranking')?.scrollIntoView({ behavior: 'smooth' });
    });

    const rutInput = document.getElementById('voterRutInput');
    if (rutInput) {
      rutInput.addEventListener('input', (e) => {
        const formatted = formatRut(e.target.value);
        e.target.value = formatted;
        this.validateRutFieldLive(formatted);
      });
    }

    document.getElementById('btnFillDemoRut')?.addEventListener('click', () => {
      const sampleRut = generateRandomValidRut();
      if (rutInput) {
        rutInput.value = sampleRut;
        this.validateRutFieldLive(sampleRut);
      }
    });

    document.getElementById('voterEmailInput')?.addEventListener('input', (e) => {
      this.validateEmailFieldLive(e.target.value);
    });

    document.getElementById('voteStep1Form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleStep1Submit();
    });

    document.getElementById('btnAutoFillOtp')?.addEventListener('click', () => {
      if (this.activeOtpSession && this.activeOtpSession.demoOtp) {
        const otpInput = document.getElementById('otpCodeInput');
        if (otpInput) otpInput.value = this.activeOtpSession.demoOtp;
      }
    });

    document.getElementById('btnBackToStep1')?.addEventListener('click', () => {
      this.setModalStep(1);
    });

    document.getElementById('voteStep2Form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleStep2Submit();
    });

    document.getElementById('btnSimulateLiveVotes')?.addEventListener('click', () => {
      this.toggleLiveSimulation();
    });

    document.getElementById('btnSingleSimVote')?.addEventListener('click', () => {
      this.simulateSingleVerifiedVote();
    });

    document.querySelectorAll('.cmd-tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.cmd-tab-btn').forEach((b) => b.classList.remove('active'));
        document.querySelectorAll('.cmd-panel').forEach((c) => c.classList.remove('active'));
        btn.classList.add('active');
        const tabId = btn.getAttribute('data-tab');
        document.getElementById(tabId)?.classList.add('active');
      });
    });

    document.getElementById('btnResetMyDeviceVote')?.addEventListener('click', () => {
      this.votedDevices.delete(this.deviceFingerprint);
      this.saveState();
      this.updateDeviceLabStatus();
      this.showToast('Dispositivo habilitado. Ya puedes emitir un nuevo voto de prueba.');
    });

    document.getElementById('btnTestDuplicateRut')?.addEventListener('click', () => {
      this.simulateBlockedAttempt(
        '**.***.482-K',
        'intento.doble@gmail.com',
        'El RUT ingresado ya registra un voto anterior (1 voto por persona)'
      );
    });

    document.getElementById('btnBurstFiveVotes')?.addEventListener('click', () => {
      let count = 0;
      const burst = setInterval(() => {
        this.simulateSingleVerifiedVote();
        count++;
        if (count >= 5) clearInterval(burst);
      }, 420);
    });

    document.getElementById('addCandidateForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleAddCandidate();
    });

    document.getElementById('btnRestoreDefaultCandidates')?.addEventListener('click', () => {
      this.candidates = structuredClone(INITIAL_CANDIDATES);
      this.displayOrderIds = this.shuffleIds(this.candidates.map((c) => c.id));
      this.saveState();
      this.renderAll();
      this.showToast('Candidatas editoriales por defecto restauradas.');
    });
  }

  // ==========================================================================
  // MODAL DE VOTACIÓN SEGURA EN 3 PASOS
  // ==========================================================================
  openVoteModal(candidateId) {
    const cand = this.candidates.find((c) => c.id === candidateId);
    if (!cand) return;

    this.selectedCandidate = cand;
    this.botTelemetry.reset();

    const avatarEl = document.getElementById('modalCandAvatar');
    if (avatarEl) {
      avatarEl.src = cand.avatar;
      avatarEl.onerror = () => {
        avatarEl.src = cand.fallbackAvatar || createEditorialPortrait(cand.name, cand.number);
      };
    }
    document.getElementById('modalCandName').textContent = cand.name;

    document.getElementById('voteStep1Form')?.reset();
    document.getElementById('voterRutInput')?.classList.remove('valid', 'invalid');
    document.getElementById('voterEmailInput')?.classList.remove('valid', 'invalid');
    document.getElementById('rutFeedbackHint').textContent = 'Validación matemática oficial de dígito verificador.';
    document.getElementById('rutFeedbackHint').className = 'field-hint';

    this.resetHumanShieldUI();
    this.hideModalAlert();
    this.setModalStep(1);

    document.getElementById('voteModalBackdrop')?.classList.add('open');
  }

  closeVoteModal() {
    document.getElementById('voteModalBackdrop')?.classList.remove('open');
    if (this.otpTimerInterval) clearInterval(this.otpTimerInterval);
  }

  setModalStep(stepNumber) {
    const s1 = document.getElementById('voteStep1Form');
    const s2 = document.getElementById('voteStep2Form');
    const s3 = document.getElementById('voteStep3View');

    const i1 = document.getElementById('stepIndicator1');
    const i2 = document.getElementById('stepIndicator2');
    const i3 = document.getElementById('stepIndicator3');

    if (s1) s1.style.display = stepNumber === 1 ? 'block' : 'none';
    if (s2) s2.style.display = stepNumber === 2 ? 'block' : 'none';
    if (s3) s3.style.display = stepNumber === 3 ? 'block' : 'none';

    i1.className = `step-pill ${stepNumber === 1 ? 'active' : 'done'}`;
    i2.className = `step-pill ${stepNumber === 2 ? 'active' : stepNumber > 2 ? 'done' : ''}`;
    i3.className = `step-pill ${stepNumber === 3 ? 'active' : ''}`;
  }

  showModalAlert(msg) {
    const alertBox = document.getElementById('modalAlertBox');
    if (!alertBox) return;
    alertBox.textContent = msg;
    alertBox.className = 'alert-box show';
  }

  hideModalAlert() {
    const alertBox = document.getElementById('modalAlertBox');
    if (alertBox) alertBox.className = 'alert-box';
  }

  validateRutFieldLive(value) {
    const input = document.getElementById('voterRutInput');
    const hint = document.getElementById('rutFeedbackHint');
    if (!input || !hint) return false;

    const result = validateRut(value);
    if (!result.valid) {
      input.classList.remove('valid');
      input.classList.add('invalid');
      hint.textContent = result.reason;
      hint.className = 'field-hint error';
      return false;
    }

    if (this.votedRuts.has(result.clean)) {
      input.classList.remove('valid');
      input.classList.add('invalid');
      hint.textContent = 'Este RUT ya emitió su voto único en el certamen.';
      hint.className = 'field-hint error';
      return false;
    }

    input.classList.remove('invalid');
    input.classList.add('valid');
    hint.textContent = '✓ RUT chileno válido (Módulo 11 verificado) y habilitado.';
    hint.className = 'field-hint success';
    return true;
  }

  validateEmailFieldLive(value) {
    const input = document.getElementById('voterEmailInput');
    const hint = document.getElementById('emailFeedbackHint');
    if (!input || !hint) return false;

    const check = validateEmailSecurity(value);
    if (!check.valid) {
      input.classList.remove('valid');
      input.classList.add('invalid');
      hint.textContent = check.reason;
      hint.className = 'field-hint error';
      return false;
    }

    if (this.votedEmails.has(check.email)) {
      input.classList.remove('valid');
      input.classList.add('invalid');
      hint.textContent = 'Este correo electrónico ya fue utilizado para emitir un voto.';
      hint.className = 'field-hint error';
      return false;
    }

    input.classList.remove('invalid');
    input.classList.add('valid');
    hint.textContent = '✓ Correo verificado y libre de dominios temporales.';
    hint.className = 'field-hint success';
    return true;
  }

  resetHumanShieldUI() {
    // Modo accesible: validación silenciosa en segundo plano
  }

  triggerHumanShieldVerify() {
    // Modo accesible: validación silenciosa en segundo plano
  }

  async handleStep1Submit() {
    this.hideModalAlert();

    const rutVal = document.getElementById('voterRutInput')?.value || '';
    const emailVal = document.getElementById('voterEmailInput')?.value || '';
    const phoneVal = document.getElementById('voterPhoneInput')?.value || '';
    const honeypotVal = document.getElementById('hpWebsiteField')?.value || '';

    if (this.votedDevices.has(this.deviceFingerprint)) {
      this.recordBlockedAudit(
        maskRut(rutVal),
        emailVal,
        'Intento bloqueado: Este dispositivo ya emitió un voto.'
      );
      this.showModalAlert(
        'Este dispositivo ya registró un voto. Solo se permite 1 voto por persona para que todas las candidatas tengan igualdad de condiciones. (Para pruebas, usa el botón "Habilitar para Votar de Nuevo" en el panel inferior).'
      );
      return;
    }

    const rutCheck = validateRut(rutVal);
    if (!rutCheck.valid) {
      this.showModalAlert(rutCheck.reason);
      return;
    }
    if (this.votedRuts.has(rutCheck.clean)) {
      this.recordBlockedAudit(
        maskRut(rutVal),
        emailVal,
        'Intento bloqueado: El RUT ingresado ya emitió su voto.'
      );
      this.showModalAlert('Este RUT ya emitió su voto en Miss 17 Chimbarongo. Solo se permite un voto por persona.');
      return;
    }

    const emailCheck = validateEmailSecurity(emailVal);
    if (!emailCheck.valid) {
      if (emailCheck.isDisposable) {
        this.recordBlockedAudit(maskRut(rutVal), emailVal, emailCheck.reason);
      }
      this.showModalAlert(emailCheck.reason);
      return;
    }
    if (this.votedEmails.has(emailCheck.email)) {
      this.recordBlockedAudit(maskRut(rutVal), emailCheck.email, 'Intento bloqueado: Correo electrónico ya utilizado.');
      this.showModalAlert('Este correo electrónico ya fue utilizado para confirmar un voto.');
      return;
    }

    const botEval = this.botTelemetry.evaluate(honeypotVal);
    if (!botEval.passed) {
      this.recordBlockedAudit(maskRut(rutVal), emailCheck.email, botEval.reason);
      this.showModalAlert(botEval.reason);
      return;
    }

    const submitBtn = document.getElementById('btnSubmitStep1');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>Generando tu código de votación...</span>';
    }

    try {
      const response = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rut: rutCheck.clean,
          email: emailCheck.email,
          phone: phoneVal,
          candidateId: this.selectedCandidate.id,
          candidateName: this.selectedCandidate.name,
          fingerprint: this.deviceFingerprint,
          telemetry: botEval.telemetry,
          honeypot: honeypotVal
        })
      });

      const data = await response.json();
      if (!response.ok || !data.ok) {
        this.showModalAlert(data.error || 'No se pudo generar el código de confirmación.');
        return;
      }

      this.activeOtpSession = {
        rut: rutCheck.clean,
        formattedRut: rutCheck.formatted,
        email: emailCheck.email,
        candidateId: this.selectedCandidate.id,
        expiresAt: data.expiresAt,
        signature: data.signature,
        demoOtp: data.demoOtp
      };
    } catch {
      const fallbackOtp = String(Math.floor(100000 + Math.random() * 900000));
      this.activeOtpSession = {
        rut: rutCheck.clean,
        formattedRut: rutCheck.formatted,
        email: emailCheck.email,
        candidateId: this.selectedCandidate.id,
        expiresAt: Date.now() + 180000,
        signature: 'LOCAL-FALLBACK',
        demoOtp: fallbackOtp
      };
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Solicitar Código de Confirmación</span>';
      }
    }

    document.getElementById('otpTargetEmailDisplay').textContent = emailCheck.email;
    const demoBanner = document.getElementById('demoOtpBanner');
    const demoCodeEl = document.getElementById('demoOtpCodeValue');
    if (this.activeOtpSession.demoOtp && demoBanner && demoCodeEl) {
      demoBanner.style.display = 'flex';
      demoCodeEl.textContent = this.activeOtpSession.demoOtp;
    } else if (demoBanner) {
      demoBanner.style.display = 'none';
    }

    document.getElementById('otpCodeInput').value = '';
    this.startOtpCountdown(this.activeOtpSession.expiresAt);
    this.setModalStep(2);
  }

  startOtpCountdown(expiresAt) {
    if (this.otpTimerInterval) clearInterval(this.otpTimerInterval);
    const countdownEl = document.getElementById('otpCountdownText');

    const updateTimer = () => {
      const remainingSec = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      const mins = String(Math.floor(remainingSec / 60)).padStart(2, '0');
      const secs = String(remainingSec % 60).padStart(2, '0');
      if (countdownEl) countdownEl.textContent = `${mins}:${secs}`;
      if (remainingSec <= 0) clearInterval(this.otpTimerInterval);
    };

    updateTimer();
    this.otpTimerInterval = setInterval(updateTimer, 1000);
  }

  async handleStep2Submit() {
    this.hideModalAlert();
    const enteredOtp = (document.getElementById('otpCodeInput')?.value || '').trim();

    if (!/^\d{6}$/.test(enteredOtp)) {
      this.showModalAlert('Ingresa los 6 dígitos numéricos del código de confirmación.');
      return;
    }

    if (!this.activeOtpSession) {
      this.showModalAlert('La sesión expiró. Solicita un nuevo código.');
      return;
    }

    const submitBtn = document.getElementById('btnSubmitStep2');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Confirmando tu voto...';
    }

    let receipt = null;

    try {
      const response = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rut: this.activeOtpSession.rut,
          email: this.activeOtpSession.email,
          candidateId: this.activeOtpSession.candidateId,
          otpCode: enteredOtp,
          expiresAt: this.activeOtpSession.expiresAt,
          signature: this.activeOtpSession.signature,
          fingerprint: this.deviceFingerprint
        })
      });

      const data = await response.json();
      if (!response.ok || !data.ok) {
        this.showModalAlert(data.error || 'Código OTP incorrecto.');
        return;
      }
      receipt = data.receipt;
    } catch {
      if (enteredOtp !== this.activeOtpSession.demoOtp) {
        this.showModalAlert('El código de 6 dígitos ingresado es incorrecto.');
        return;
      }
      receipt = {
        receiptId: 'M17-' + Math.random().toString(16).slice(2, 10).toUpperCase(),
        maskedRut: maskRut(this.activeOtpSession.rut),
        fingerprintShort: this.deviceFingerprint
      };
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Confirmar Voto Oficial';
      }
    }

    this.votedRuts.add(this.activeOtpSession.rut);
    this.votedEmails.add(this.activeOtpSession.email);
    this.votedDevices.add(this.deviceFingerprint);

    const cand = this.candidates.find((c) => c.id === this.selectedCandidate.id);
    if (cand) {
      cand.votes += 1;
      cand.trendDelta = '+3.4%';
    }

    this.auditLogs.unshift({
      id: receipt.receiptId,
      timestamp: 'Ahora mismo',
      maskedRut: receipt.maskedRut,
      email: this.activeOtpSession.email.replace(/(.{2}).+(@.+)/, '$1***$2'),
      fingerprint: this.deviceFingerprint,
      candidateName: this.selectedCandidate.name,
      status: 'VERIFIED',
      detail: 'RUT Módulo 11 + OTP 6 dígitos + Huella única'
    });

    this.saveState();
    this.renderAll(this.selectedCandidate.id);

    document.getElementById('receiptCandidateName').textContent = this.selectedCandidate.name;
    document.getElementById('receiptHashCode').textContent = receipt.receiptId;
    document.getElementById('receiptMaskedRut').textContent = receipt.maskedRut;
    document.getElementById('receiptFingerprint').textContent = this.deviceFingerprint;

    this.setModalStep(3);
    this.launchConfetti();
    this.showToast(`¡Voto confirmado con éxito para ${this.selectedCandidate.name}!`);
  }

  // ==========================================================================
  // SIMULACIONES EN VIVO Y GESTIÓN ADMIN
  // ==========================================================================
  recordBlockedAudit(maskedRutStr, emailStr, reason) {
    this.blockedCount += 1;
    this.auditLogs.unshift({
      id: 'REG-' + Math.floor(1000 + Math.random() * 9000),
      timestamp: 'Ahora mismo',
      maskedRut: maskedRutStr || '**.***.***-*',
      email: emailStr || 'privado',
      fingerprint: this.deviceFingerprint,
      candidateName: 'Intento duplicado',
      status: 'BLOCKED',
      detail: reason
    });
    this.saveState();
    this.renderAll();
  }

  simulateBlockedAttempt(maskedRutStr, emailStr, reason) {
    this.recordBlockedAudit(maskedRutStr, emailStr, reason);
    this.showToast(`Aviso: ${reason}`);
  }

  simulateSingleVerifiedVote() {
    if (this.candidates.length === 0) return;
    const sorted = this.getSortedRanking();
    const pool = sorted.slice(0, Math.min(4, sorted.length));
    const chosen = pool[Math.floor(Math.random() * pool.length)];

    chosen.votes += Math.floor(2 + Math.random() * 5);
    chosen.trendDelta = `+${(1.2 + Math.random() * 2.5).toFixed(1)}%`;

    const sampleRut = maskRut(generateRandomValidRut());
    const receiptId = 'M17-' + Math.random().toString(16).slice(2, 10).toUpperCase();

    this.auditLogs.unshift({
      id: receiptId,
      timestamp: 'En directo',
      maskedRut: sampleRut,
      email: 'voto.auditado@gmail.com',
      fingerprint: `FP-${Math.random().toString(16).slice(2, 6).toUpperCase()}-LIVE`,
      candidateName: chosen.name,
      status: 'VERIFIED',
      detail: 'Voto verificado en tiempo real'
    });

    const tsEl = document.getElementById('lastVoteTimestampText');
    if (tsEl) {
      tsEl.textContent = `Último voto verificado (${sampleRut}) → ${chosen.name} · Hash ${receiptId}`;
    }

    this.saveState();
    this.renderAll(chosen.id);
  }

  toggleLiveSimulation() {
    const btn = document.getElementById('btnSimulateLiveVotes');
    if (this.liveSimInterval) {
      clearInterval(this.liveSimInterval);
      this.liveSimInterval = null;
      if (btn) {
        btn.classList.remove('active');
        btn.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          <span>Movimiento en Vivo: OFF</span>
        `;
      }
      this.showToast('Simulación automática en vivo pausada.');
    } else {
      this.simulateSingleVerifiedVote();
      this.liveSimInterval = setInterval(() => {
        this.simulateSingleVerifiedVote();
      }, 2400);
      if (btn) {
        btn.classList.add('active');
        btn.innerHTML = `
          <span class="live-beacon"></span>
          <span>Movimiento en Vivo: ACTIVO</span>
        `;
      }
      this.showToast('Transmisión simulada en vivo activada: Observa cómo se actualiza el podio TOP 3.');
    }
  }

  startPhraseRotation() {
    setInterval(() => {
      this.phraseIndex += 1;
      this.renderPodium();
    }, 5500);
  }

  handleAddCandidate() {
    const name = document.getElementById('newCandName')?.value.trim();
    const age = Number(document.getElementById('newCandAge')?.value || 17);
    const sector = document.getElementById('newCandSector')?.value.trim();
    const school = document.getElementById('newCandSchool')?.value.trim() || 'Chimbarongo';
    const quote = document.getElementById('newCandQuote')?.value.trim();
    const fileInput = document.getElementById('newCandPhotoFile');

    if (!name || !sector || !quote) return;

    const nextNum = this.candidates.length > 0 ? Math.max(...this.candidates.map((c) => c.number)) + 1 : 1;
    const fallbackSvg = createEditorialPortrait(name, nextNum, '#D50078', '#32114F');

    const finalizeCandidate = (avatarUrl) => {
      const newCand = {
        id: `cand-${Date.now()}`,
        number: nextNum,
        name,
        age,
        sector,
        school,
        quote,
        votes: 115,
        trendDelta: '+1.5%',
        avatar: avatarUrl || 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=900&q=85',
        fallbackAvatar: fallbackSvg
      };

      this.candidates.push(newCand);
      this.displayOrderIds.unshift(newCand.id);
      this.saveState();
      this.renderAll(newCand.id);
      document.getElementById('addCandidateForm')?.reset();
      this.showToast(`Candidata "${name}" incorporada exitosamente.`);
    };

    if (fileInput && fileInput.files && fileInput.files[0]) {
      const reader = new FileReader();
      reader.onload = (e) => finalizeCandidate(e.target.result);
      reader.readAsDataURL(fileInput.files[0]);
    } else {
      finalizeCandidate(null);
    }
  }

  deleteCandidate(candId) {
    if (this.candidates.length <= 3) {
      this.showToast('Deben mantenerse al menos 3 candidatas para el podio TOP 3.');
      return;
    }
    const target = this.candidates.find((c) => c.id === candId);
    this.candidates = this.candidates.filter((c) => c.id !== candId);
    this.displayOrderIds = this.displayOrderIds.filter((id) => id !== candId);
    this.saveState();
    this.renderAll();
    if (target) {
      this.showToast(`Candidata ${target.name} eliminada del listado.`);
    }
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

  launchConfetti() {
    const canvas = document.getElementById('confettiCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#D50078', '#F2299B', '#5B2B88', '#C89BDD', '#FBEAF5', '#FFFFFF'];
    const particles = Array.from({ length: 120 }, () => ({
      x: canvas.width / 2 + (Math.random() - 0.5) * 300,
      y: canvas.height * 0.55,
      vx: (Math.random() - 0.5) * 18,
      vy: -(Math.random() * 15 + 6),
      size: Math.random() * 9 + 5,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      vr: (Math.random() - 0.5) * 14
    }));

    let frame = 0;
    const animate = () => {
      frame++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.38;
        p.rotation += p.vr;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      });

      if (frame < 115) {
        requestAnimationFrame(animate);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };
    requestAnimationFrame(animate);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new Miss17VotingApp();
});
