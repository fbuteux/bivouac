// ======================== MOBILE VIEW ========================
// Activé uniquement sur écrans ≤ 768px
// Vue jour par jour : semaine sélectionnable, onglets Lun→Dim, bouton + flottant

const MOBILE_BREAKPOINT = 768;
let mobileWeekIdx = 0;   // index 0-based de la semaine affichée
let mobileDayIdx  = 0;   // index 0-based du jour affiché (0=Lun … 6=Dim)
let isMobileView  = false;

// ── INIT ──────────────────────────────────────────────────────────────────────
function initMobileView() {
    if (window.innerWidth > MOBILE_BREAKPOINT) return;
    isMobileView = true;

    // Masquer vue desktop
    document.getElementById('main-content').style.display = 'none';
    document.getElementById('toggle-btn').style.display = 'none';
    if (document.getElementById('sidebar')) document.getElementById('sidebar').style.display = 'none';

    // Créer la vue mobile si elle n'existe pas encore
    if (!document.getElementById('mobile-view')) {
        buildMobileShell();
    }
    document.getElementById('mobile-view').style.display = 'flex';
    // Start on the first day of the ordered week
    mobileDayIdx = getMobileDayOrder()[0];
    renderMobileView();
}

function destroyMobileView() {
    isMobileView = false;
    const mv = document.getElementById('mobile-view');
    if (mv) mv.style.display = 'none';
    document.getElementById('main-content').style.display = '';
    const tb = document.getElementById('toggle-btn');
    if (tb) tb.style.display = '';
    const sb = document.getElementById('sidebar');
    if (sb) sb.style.display = '';
}

// ── SHELL HTML (avec boutons supprimer semaine et vue client) ─────────────────
function buildMobileShell() {
    const shell = document.createElement('div');
    shell.id = 'mobile-view';
    shell.style.cssText = `
        display:flex; flex-direction:column;
        position:fixed; inset:0; top:var(--nav-height);
        background:var(--bg); z-index:50; overflow:hidden;
    `;
    shell.innerHTML = `
        <!-- Week selector bar -->
        <div id="mob-week-bar" style="
            display:flex; align-items:center;
            padding:8px 14px; background:var(--card);
            border-bottom:0.5px solid var(--divider-2); flex-shrink:0; gap:8px;
        ">
            <button id="mob-week-prev" onclick="mobileWeekNav(-1)" style="
                background:none;border:none;color:var(--accent);font-size:24px;
                cursor:pointer;padding:0 2px;line-height:1;flex-shrink:0;
                -webkit-tap-highlight-color:transparent;
            ">‹</button>
            <div id="mob-week-label" style="
                font-size:13px;font-weight:700;color:var(--text);text-align:center;flex:1;
                line-height:1.3;
            "></div>
            <button id="mob-week-next" onclick="mobileWeekNav(1)" style="
                background:none;border:none;color:var(--accent);font-size:24px;
                cursor:pointer;padding:0 2px;line-height:1;flex-shrink:0;
                -webkit-tap-highlight-color:transparent;
            ">›</button>
            <!-- Supprimer semaine -->
            <button onclick="mobileDeleteWeek()" id="mob-del-week" style="
                background:var(--card-2);border:0.5px solid var(--divider-2);color:var(--text-dim);
                width:32px;height:32px;border-radius:var(--radius-sm);
                cursor:pointer;flex-shrink:0;
                display:flex;align-items:center;justify-content:center;
                font-size:18px;font-weight:300;
                -webkit-tap-highlight-color:transparent;
            " title="Supprimer cette semaine">−</button>
            <!-- Ajouter semaine -->
            <button onclick="mobileAddWeek()" style="
                background:var(--card-2);border:0.5px solid var(--divider-2);color:var(--text-2);
                width:32px;height:32px;border-radius:var(--radius-sm);
                cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;
                font-size:20px;font-weight:300;
                -webkit-tap-highlight-color:transparent;
            " title="Ajouter une semaine">+</button>
            <!-- Menu déroulant (⋯) -->
            <div style="position:relative;flex-shrink:0;">
                <button id="mob-menu-btn" onclick="toggleMobMenu(event)" style="
                    background:var(--card-2);border:0.5px solid var(--divider-2);
                    color:var(--text-2);border-radius:var(--radius-sm);
                    cursor:pointer;padding:0;width:32px;height:32px;
                    display:flex;align-items:center;justify-content:center;
                    font-size:20px;font-weight:700;letter-spacing:1px;
                    -webkit-tap-highlight-color:transparent;
                " title="Menu">⋯</button>
                <div id="mob-menu-dropdown" style="
                    display:none;position:absolute;right:0;top:38px;
                    background:#2c2c2e;border:1px solid #48484a;border-radius:12px;
                    padding:6px 0;min-width:200px;box-shadow:0 8px 30px rgba(0,0,0,0.6);
                    font-size:13px;z-index:9999;
                ">
                    <button onclick="mobMenuAction('date')" style="
                        display:flex;align-items:center;gap:10px;width:100%;background:none;
                        border:none;color:var(--text);padding:12px 16px;cursor:pointer;
                        font-size:13px;font-family:inherit;text-align:left;
                        -webkit-tap-highlight-color:transparent;
                    "><span>Date de début</span></button>
                    <button onclick="mobMenuAction('client')" style="
                        display:flex;align-items:center;gap:10px;width:100%;background:none;
                        border:none;color:var(--text);padding:12px 16px;cursor:pointer;
                        font-size:13px;font-family:inherit;text-align:left;
                        -webkit-tap-highlight-color:transparent;
                    "><span>Vue client</span></button>
                    <button onclick="mobMenuAction('fatigue')" style="
                        display:flex;align-items:center;gap:10px;width:100%;background:none;
                        border:none;color:var(--text);padding:12px 16px;cursor:pointer;
                        font-size:13px;font-family:inherit;text-align:left;
                        -webkit-tap-highlight-color:transparent;
                    "><span>⚡ Fatigue musculaire</span></button>
                    <div style="height:0.5px;background:var(--divider-2);margin:4px 0;"></div>
                    <button onclick="mobMenuAction('new')" style="
                        display:flex;align-items:center;gap:10px;width:100%;background:none;
                        border:none;color:var(--red,#ff3b30);padding:12px 16px;cursor:pointer;
                        font-size:13px;font-family:inherit;text-align:left;
                        -webkit-tap-highlight-color:transparent;
                    ">✦ <span>Nouveau programme</span></button>
                </div>
            </div>
        </div>
        <!-- Date picker inline (caché par défaut) -->
        <div id="mob-date-bar" style="
            display:none; align-items:center; gap:10px;
            padding:8px 14px; background:var(--card-2);
            border-bottom:0.5px solid var(--divider-2); flex-shrink:0;
        ">
            <span style="font-size:12px;color:var(--text-dim);flex-shrink:0;">📅 Date de début :</span>
            <input id="mob-start-date" type="date" oninput="onMobStartDateChange(this.value)" style="
                flex:1;background:var(--card);border:0.5px solid var(--divider-2);
                color:var(--text);border-radius:8px;padding:6px 10px;
                font-size:13px;font-family:inherit;outline:none;
            ">
            <button onclick="document.getElementById('mob-date-bar').style.display='none'" style="
                background:none;border:none;color:var(--text-dim);font-size:20px;cursor:pointer;
                padding:0 2px;line-height:1;-webkit-tap-highlight-color:transparent;
            ">×</button>
        </div>

        <!-- Day tabs -->
        <div id="mob-day-tabs" style="
            display:flex; overflow-x:auto; background:var(--card);
            border-bottom:0.5px solid var(--divider-2); flex-shrink:0;
            scrollbar-width:none; -webkit-overflow-scrolling:touch;
        ">
        </div>

        <!-- Day content -->
        <div id="mob-day-content" style="
            flex:1; overflow-y:auto; padding:12px 14px 90px;
            overflow-x:hidden; will-change:transform;
        "></div>

        <!-- FAB -->
        <button id="mob-fab" onclick="openMobileSearch()" style="
            position:fixed; bottom:20px; right:16px; z-index:200;
            width:52px; height:52px; border-radius:50%;
            background:var(--accent); border:none; color:white;
            font-size:26px; cursor:pointer;
            box-shadow:0 4px 20px rgba(10,132,255,0.45);
            display:flex; align-items:center; justify-content:center;
            -webkit-tap-highlight-color:transparent;
        ">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
    `;
    document.body.appendChild(shell);
    // Swiper installé une seule fois sur le conteneur fixe
    setTimeout(_initDaySwiper, 0);
}

// ── RENDER ────────────────────────────────────────────────────────────────────
function renderMobileView() {
    if (!isMobileView) return;
    const totalWeeks = tbody.rows.length;
    mobileWeekIdx = Math.max(0, Math.min(mobileWeekIdx, totalWeeks - 1));
    mobileDayIdx  = Math.max(0, Math.min(mobileDayIdx, 6));

    renderMobileWeekBar(totalWeeks);
    renderMobileDayTabs();
    renderMobileDayContent();
}

function renderMobileWeekBar(totalWeeks) {
    const row   = tbody.rows[mobileWeekIdx];
    const wc    = row ? row.cells[0] : null;
    const isDl  = wc ? wc.getAttribute('data-deload') === 'true' : false;
    const label = document.getElementById('mob-week-label');
    const startLabel = getWeekStartLabel(mobileWeekIdx);
    label.innerHTML = `Semaine ${mobileWeekIdx + 1}${isDl ? ' <span style="font-size:10px;color:var(--accent);background:rgba(10,132,255,0.15);border-radius:6px;padding:2px 6px;font-weight:600;">Deload</span>' : ''}${startLabel ? `<div style="font-size:10px;color:var(--text-dim);font-weight:500;margin-top:1px;">${startLabel}</div>` : ''}`;

    document.getElementById('mob-week-prev').style.opacity = mobileWeekIdx === 0 ? '0.3' : '1';
    document.getElementById('mob-week-next').style.opacity = mobileWeekIdx >= totalWeeks - 1 ? '0.3' : '1';
    
    // Désactiver bouton supprimer s'il n'y a qu'une semaine
    const delBtn = document.getElementById('mob-del-week');
    if (delBtn) delBtn.style.opacity = totalWeeks <= 1 ? '0.3' : '1';
}

function renderMobileDayTabs() {
    const tabsEl = document.getElementById('mob-day-tabs');
    tabsEl.innerHTML = '';
    const row = tbody.rows[mobileWeekIdx];
    const dayOrder = getMobileDayOrder(); // [realIdx0, realIdx1, …]
    const shortDays = ['Lu','Ma','Me','Je','Ve','Sa','Di'];

    dayOrder.forEach((realDayIdx, tabPos) => {
        const cell = row ? row.cells[realDayIdx + 1] : null;
        const count = cell ? cell.querySelectorAll('.placed-exo').length : 0;
        const btn = document.createElement('button');
        const isActive = realDayIdx === mobileDayIdx;
        btn.style.cssText = `
            flex:1; min-width:40px; padding:10px 4px 8px;
            background:none; border:none;
            border-bottom:2px solid ${isActive ? 'var(--accent)' : 'transparent'};
            color:${isActive ? 'var(--text)' : 'var(--text-dim)'};
            font-size:12px; font-weight:${isActive ? '700' : '500'};
            cursor:pointer; font-family:inherit;
            white-space:nowrap; transition:color .12s, border-color .12s;
            -webkit-tap-highlight-color:transparent;
        `;
        btn.innerHTML = shortDays[realDayIdx] + (count > 0
            ? '<span style="display:block;margin:3px auto 0;width:4px;height:4px;border-radius:50%;background:' + (isActive ? 'var(--accent)' : 'var(--text-faint)') + ';"></span>'
            : '<span style="display:block;height:7px;"></span>');
        btn.onclick = () => { mobileDayIdx = realDayIdx; renderMobileView(); };
        tabsEl.appendChild(btn);
    });
}

function renderMobileDayContent() {
    const content = document.getElementById('mob-day-content');
    content.innerHTML = '';
    const row = tbody.rows[mobileWeekIdx];
    if (!row) return;
    const cell = row.cells[mobileDayIdx + 1];
    if (!cell) return;

    const exos = Array.from(cell.querySelectorAll('.placed-exo'));

    if (exos.length === 0) {
        content.innerHTML = `
            <div style="
                display:flex;flex-direction:column;align-items:center;justify-content:center;
                min-height:200px;color:var(--text-faint);text-align:center;gap:10px;padding:40px 24px;
            ">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="opacity:.5;"><rect x="3" y="3" width="18" height="18" rx="3"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
                <div style="font-size:14px;font-weight:500;color:var(--text-dim);">Repos ou journée libre</div>
                <div style="font-size:12px;color:var(--text-faint);">Appuie sur + pour ajouter des exercices</div>
                <div style="font-size:11px;color:var(--text-faint);opacity:.7;">ou appui long pour coller une journée</div>
            </div>`;
        // swipe aussi sur la vue vide
        _attachDaySwipe(content);
        // Appui long 0,4 s sur une journée vide → menu (permet de coller)
        _attachEmptyDayGesture(content.firstElementChild, cell);
        return;
    }

    exos.forEach(srcEl => {
        const card = document.createElement('div');
        card.style.cssText = `
            display:flex; align-items:center; gap:12px;
            background:${srcEl.style.backgroundColor};
            border-left:3px solid ${srcEl.dataset.color || '#888'};
            border-radius:12px; padding:14px 14px; margin-bottom:8px;
            cursor:pointer; -webkit-tap-highlight-color:rgba(255,255,255,0.04);
        `;

        let summary = '';
        if (srcEl.dataset.cardType === 'muscu' && srcEl.dataset.setsData) {
            try {
                const sets = JSON.parse(srcEl.dataset.setsData);
                const sr = sets.every(s => s.reps === sets[0].reps);
                const sk = sets.every(s => s.weight === sets[0].weight);
                if (sr && sk && sets[0]?.weight > 0) summary = `${sets.length}×${sets[0].reps} · ${sets[0].weight}kg`;
                else if (sr) summary = `${sets.length}×${sets[0].reps}`;
                else summary = `${sets.length} série${sets.length > 1 ? 's' : ''}`;
            } catch(e) {}
        } else if (srcEl.dataset.cardType === 'run' && srcEl.dataset.runData) {
            try {
                const d = JSON.parse(srcEl.dataset.runData);
                if (d.type === 'course') summary = `${fmtDuration(d.duration)} · ${fmtPace(d.paceMin, d.paceSec)}`;
                else summary = `${d.blocs}× @ ${fmtPace(d.effortPaceMin, d.effortPaceSec)}`;
            } catch(e) {}
        } else if (srcEl.dataset.cardType === 'hyrox' && srcEl.dataset.hyroxData) {
            try {
                const d = JSON.parse(srcEl.dataset.hyroxData);
                summary = d.distance ? `${d.distance}m` : '';
                if (d.weight) summary += ` · ${d.weight}kg`;
            } catch(e) {}
        } else if (srcEl.dataset.cardType === 'cardio' && srcEl.dataset.cardioData) {
            try {
                const d = JSON.parse(srcEl.dataset.cardioData);
                if (d.duration) summary = `${d.duration}min`;
                if (d.distance) summary += (summary ? ' · ' : '') + `${d.distance}m`;
            } catch(e) {}
        }

        const mode = srcEl.dataset.trainingMode;
        const MODE_BADGES = { force:'FORCE', pyramide:'PYRA', progressif:'PROG', degressif:'DEG' };
        const badgeLabel = MODE_BADGES[mode] || '';

        card.innerHTML = `
            <div style="font-size:22px;flex-shrink:0;line-height:1;">${srcEl.dataset.emoji || '•'}</div>
            <div style="flex:1;min-width:0;">
                <div style="font-size:14px;font-weight:600;display:flex;align-items:center;gap:6px;color:var(--text);">
                    ${srcEl.dataset.name || ''}
                    ${badgeLabel ? `<span style="font-size:9px;background:rgba(255,255,255,0.08);color:var(--text-dim);padding:2px 5px;border-radius:4px;font-weight:600;letter-spacing:.3px;">${badgeLabel}</span>` : ''}
                </div>
                <div style="font-size:12px;color:var(--text-dim);margin-top:3px;font-weight:400;">${summary}</div>
            </div>
            <button class="mob-card-del" style="
                background:none;border:none;color:var(--text-faint);
                font-size:20px;cursor:pointer;padding:6px;flex-shrink:0;line-height:1;
                -webkit-tap-highlight-color:transparent;
            ">×</button>
        `;

        card._srcEl = srcEl;
        card.addEventListener('click', e => {
            // Un geste (drag / menu) vient d'avoir lieu → on annule le clic.
            if (card._suppressClick) { card._suppressClick = false; e.stopPropagation(); e.preventDefault(); return; }
            if (e.target.classList.contains('mob-card-del')) {
                srcEl.remove();
                renderMobileView();
                return;
            }
            if (srcEl.dataset.cardType === 'muscu') openEditModal(srcEl);
            else if (srcEl.dataset.cardType === 'run') openRunModal(srcEl);
            else if (srcEl.dataset.cardType === 'hyrox') openHyroxModal(srcEl);
            else if (srcEl.dataset.cardType === 'cardio') openCardioModal(srcEl);
        });
        _attachMobileCardGestures(card, srcEl, cell);

        content.appendChild(card);
    });

    _attachDaySwipe(content);
}

// ── SWIPE JOURS ───────────────────────────────────────────────────────────────
// Swipe horizontal fiable : bloque le scroll vertical pendant le geste horizontal
// ── Swipe horizontal fiable avec animation slide CSS ─────────────────────────
// Le contenu est dans mob-day-content ; on installe le listener sur le parent
// (mob-swipe-wrapper) pour ne pas re-attacher à chaque renderMobileDayContent
function _initDaySwiper() {
    const wrapper = document.getElementById('mob-day-content');
    if (!wrapper || wrapper._swiperReady) return;
    wrapper._swiperReady = true;

    let sx = 0, sy = 0, active = false, horizontal = null;

    wrapper.addEventListener('touchstart', e => {
        if (e.touches.length !== 1) return;
        sx = e.touches[0].clientX;
        sy = e.touches[0].clientY;
        active = true;
        horizontal = null;
    }, { passive: true });

    wrapper.addEventListener('touchmove', e => {
        if (!active || e.touches.length !== 1) return;
        const dx = e.touches[0].clientX - sx;
        const dy = e.touches[0].clientY - sy;
        if (horizontal === null) {
            if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return; // pas encore déterminé
            horizontal = Math.abs(dx) >= Math.abs(dy);
        }
        if (horizontal) e.preventDefault();
    }, { passive: false });

    wrapper.addEventListener('touchend', e => {
        if (!active) return;
        active = false;
        if (!horizontal) return;
        const dx = e.changedTouches[0].clientX - sx;
        const dy = e.changedTouches[0].clientY - sy;
        if (Math.abs(dx) < 44 || Math.abs(dy) > Math.abs(dx) * 0.7) return;
        const dir = dx < 0 ? 1 : -1;
        // Navigate within ordered days
        const dayOrder = getMobileDayOrder();
        const curTabPos = dayOrder.indexOf(mobileDayIdx);
        const nextTabPos = curTabPos + dir;
        if (nextTabPos < 0 || nextTabPos > 6) return;
        const nextRealIdx = dayOrder[nextTabPos];
        // Animation slide
        const w = wrapper.offsetWidth;
        wrapper.style.transition = 'none';
        wrapper.style.transform = 'translateX(0)';
        requestAnimationFrame(() => {
            wrapper.style.transition = 'transform .22s cubic-bezier(0.25,0.46,0.45,0.94)';
            wrapper.style.transform = 'translateX(' + (dir < 0 ? w : -w) + 'px)';
            setTimeout(() => {
                mobileDayIdx = nextRealIdx;
                wrapper.style.transition = 'none';
                wrapper.style.transform = 'translateX(' + (dir < 0 ? -w : w) + 'px)';
                renderMobileDayTabs();
                renderMobileDayContent();
                requestAnimationFrame(() => {
                    wrapper.style.transition = 'transform .22s cubic-bezier(0.25,0.46,0.45,0.94)';
                    wrapper.style.transform = 'translateX(0)';
                });
            }, 180);
        });
    }, { passive: true });
}

function _attachDaySwipe(el) { /* no-op — géré par _initDaySwiper sur le conteneur fixe */ }

// ── GESTES TACTILES SUR UNE CARTE (déplacer / menu journée) ──────────────────
//  Appui 0,1 s  → l'exercice se soulève, on le glisse pour le réordonner.
//  Appui 0,4 s (immobile) → menu Copier / Coller / Vider la journée.
function _getMobileAfterCard(cont, y, dragCard) {
    const els = [...cont.children].filter(c => c !== dragCard && c._srcEl);
    let closest = null, off = -Infinity;
    els.forEach(c => { const b = c.getBoundingClientRect(); const o = y - b.top - b.height/2; if (o < 0 && o > off) { off = o; closest = c; } });
    return closest; // null => insérer en fin
}
function _attachMobileCardGestures(card, srcEl, cell) {
    let t05 = null, t15 = null, startX = 0, startY = 0, mode = null, line = null;
    const lift   = () => { card.style.transition = 'transform .12s, box-shadow .12s, opacity .12s'; card.style.transform = 'scale(0.98)'; card.style.opacity = '0.6'; card.style.boxShadow = '0 8px 24px rgba(0,0,0,0.5)'; if (navigator.vibrate) navigator.vibrate(15); };
    const unlift = () => { card.style.transform = ''; card.style.opacity = ''; card.style.boxShadow = ''; };
    const clearTimers = () => { clearTimeout(t05); clearTimeout(t15); };
    const dropLine = () => { const d = document.createElement('div'); d.className = 'mob-drop-line'; d.style.cssText = 'height:3px;background:var(--accent);border-radius:2px;margin:3px 2px;box-shadow:0 0 6px var(--accent);'; return d; };

    card.addEventListener('touchstart', e => {
        if (e.touches.length !== 1) return;
        startX = e.touches[0].clientX; startY = e.touches[0].clientY; mode = null;
        t05 = setTimeout(() => { if (mode === null) { mode = 'armed'; lift(); } }, 100);
        t15 = setTimeout(() => { if (mode === 'armed') { mode = 'menu'; unlift(); card._suppressClick = true; _showMobileDayMenu(cell); } }, 400);
    }, { passive: true });

    card.addEventListener('touchmove', e => {
        if (e.touches.length !== 1) return;
        const x = e.touches[0].clientX, y = e.touches[0].clientY;
        const dx = x - startX, dy = y - startY;
        if (mode === null) {
            if (Math.abs(dx) > 8 || Math.abs(dy) > 8) clearTimers(); // scroll/swipe : pas un appui long
            return;
        }
        if (mode === 'armed') {
            if (Math.abs(dy) > 6 || Math.abs(dx) > 6) { mode = 'dragging'; clearTimeout(t15); card._suppressClick = true; }
            else return;
        }
        if (mode === 'dragging') {
            e.preventDefault(); // bloque le scroll pendant le déplacement
            const cont = card.parentNode;
            const after = _getMobileAfterCard(cont, y, card);
            if (!line) line = dropLine();
            if (after == null) cont.appendChild(line);
            else cont.insertBefore(line, after);
        }
    }, { passive: false });

    card.addEventListener('touchend', () => {
        clearTimers();
        if (mode === 'dragging') {
            let afterCard = null;
            if (line) { afterCard = line.nextElementSibling; while (afterCard && !afterCard._srcEl) afterCard = afterCard.nextElementSibling; line.remove(); line = null; }
            unlift();
            const targetSrc = (afterCard && afterCard !== card) ? afterCard._srcEl : null;
            if (targetSrc) cell.insertBefore(srcEl, targetSrc);
            else cell.appendChild(srcEl);
            card._suppressClick = true;
            renderMobileView();
            syncClientProgram();
        } else if (mode === 'armed') {
            unlift();
        }
        mode = null;
    }, { passive: true });

    card.addEventListener('touchcancel', () => { clearTimers(); if (line) { line.remove(); line = null; } unlift(); mode = null; }, { passive: true });
}

// Appui long 0,4 s sur une journée VIDE → menu (pour coller). Pas de drag possible.
function _attachEmptyDayGesture(el, cell) {
    if (!el) return;
    let timer = null, sx = 0, sy = 0;
    const clear = () => clearTimeout(timer);
    el.addEventListener('touchstart', e => {
        if (e.touches.length !== 1) return;
        sx = e.touches[0].clientX; sy = e.touches[0].clientY;
        timer = setTimeout(() => { if (navigator.vibrate) navigator.vibrate(15); _showMobileDayMenu(cell); }, 400);
    }, { passive: true });
    el.addEventListener('touchmove', e => {
        const dx = e.touches[0].clientX - sx, dy = e.touches[0].clientY - sy;
        if (Math.abs(dx) > 8 || Math.abs(dy) > 8) clear(); // scroll/swipe : on annule
    }, { passive: true });
    el.addEventListener('touchend', clear, { passive: true });
    el.addEventListener('touchcancel', clear, { passive: true });
}

// ── MENU JOURNÉE MOBILE (action sheet) ───────────────────────────────────────
function _closeMobileDayMenu() { const m = document.getElementById('mob-day-menu'); if (m) m.remove(); }
function _showMobileDayMenu(cell) {
    _closeMobileDayMenu();
    const count = cell.querySelectorAll('.placed-exo').length;
    const hasClip = !!dayClipboard;
    const overlay = document.createElement('div');
    overlay.id = 'mob-day-menu';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,0.5);display:flex;align-items:flex-end;animation:none;';
    const sheet = document.createElement('div');
    sheet.style.cssText = 'width:100%;background:#1c1c1e;border-radius:18px 18px 0 0;padding:6px 0 calc(env(safe-area-inset-bottom,12px) + 6px);box-shadow:0 -8px 30px rgba(0,0,0,0.5);';
    const title = document.createElement('div');
    title.textContent = 'Journée';
    title.style.cssText = 'text-align:center;font-size:12px;color:var(--text-dim);padding:12px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;';
    sheet.appendChild(title);
    const mk = (label, color, fn, disabled) => {
        const b = document.createElement('button');
        b.textContent = label;
        b.style.cssText = `display:block;width:100%;background:none;border:none;border-top:0.5px solid #2c2c2e;color:${disabled ? '#555' : color};font-size:16px;padding:17px;font-family:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent;`;
        if (!disabled) b.onclick = () => { fn(); _closeMobileDayMenu(); };
        sheet.appendChild(b);
    };
    mk('📋  Copier la journée', 'var(--text)', () => copyDay(cell), count === 0);
    mk('📌  Coller ici' + (hasClip ? ` (${dayClipboard.length})` : ''), 'var(--green)', () => { pasteDay(cell); renderMobileView(); }, !hasClip);
    mk('🗑  Vider la journée', 'var(--red)', () => { clearDay(cell); renderMobileView(); }, count === 0);
    mk('Annuler', 'var(--text-dim)', () => {}, false);
    overlay.appendChild(sheet);
    overlay.addEventListener('click', e => { if (e.target === overlay) _closeMobileDayMenu(); });
    document.body.appendChild(overlay);
}

// ── NAVIGATION ET GESTION DES SEMAINES ────────────────────────────────────────
function mobileWeekNav(delta) {
    const total = tbody.rows.length;
    const next = mobileWeekIdx + delta;
    if (next < 0 || next >= total) return;
    mobileWeekIdx = next;
    renderMobileView();
}

function mobileAddWeek() {
    addRow();
    mobileWeekIdx = tbody.rows.length - 1;
    mobileDayIdx = getMobileDayOrder()[0];
    renderMobileView();
}

function mobileDeleteWeek() {
    const total = tbody.rows.length;
    if (total <= 1) {
        alert("Impossible de supprimer la dernière semaine.");
        return;
    }
    if (confirm(`Supprimer la semaine ${mobileWeekIdx + 1} ?`)) {
        tbody.deleteRow(mobileWeekIdx);
        if (mobileWeekIdx >= tbody.rows.length) mobileWeekIdx = tbody.rows.length - 1;
        if (mobileWeekIdx < 0) mobileWeekIdx = 0;
        updateTableAndDeload();
        renderMobileView();
    }
}

// ── MENU DÉROULANT ────────────────────────────────────────────────────────────
function toggleMobMenu(e) {
    e.stopPropagation();
    const dd = document.getElementById('mob-menu-dropdown');
    if (!dd) return;
    const open = dd.style.display === 'block';
    dd.style.display = open ? 'none' : 'block';
    if (!open) {
        setTimeout(() => {
            document.addEventListener('click', _closeMobMenu, { once: true });
        }, 0);
    }
}
function _closeMobMenu() {
    const dd = document.getElementById('mob-menu-dropdown');
    if (dd) dd.style.display = 'none';
}
function mobMenuAction(action) {
    _closeMobMenu();
    if (action === 'client') {
        openClientView();
    } else if (action === 'fatigue') {
        if (window.FatiguePanel) FatiguePanel.open();
    } else if (action === 'export') {
        openProgressionModal();
    } else if (action === 'import') {
        document.getElementById('modal-import-overlay').style.display = 'flex';
    } else if (action === 'date') {
        const bar = document.getElementById('mob-date-bar');
        if (!bar) return;
        const desktopVal = document.getElementById('start-date')?.value || '';
        const mobInput = document.getElementById('mob-start-date');
        if (mobInput) mobInput.value = desktopVal;
        bar.style.display = bar.style.display === 'flex' ? 'none' : 'flex';
    } else if (action === 'new') {
        if (confirm('Créer un nouveau programme ? Toutes les données non exportées seront perdues.')) {
            localStorage.removeItem('benchmaster_client_program');
            localStorage.removeItem('benchmaster_progname');
            localStorage.removeItem('benchmaster_notes');
            localStorage.removeItem('benchmaster_maxes');
            location.reload();
        }
    }
}
function onMobStartDateChange(val) {
    const di = document.getElementById('start-date');
    if (di) {
        di.value = val;
        refreshWeekDates();
        syncClientProgram();
    }
    renderMobileView();
}

// ── ORDRE DES JOURS DYNAMIQUE ─────────────────────────────────────────────────
// Retourne [0..6] réordonné selon le jour de la semaine de la date de début
// 0=Lundi, 1=Mardi, ... 6=Dimanche (convention DAYS)
function getMobileDayOrder() {
    const raw = document.getElementById('start-date')?.value;
    if (!raw) return [0,1,2,3,4,5,6];
    const d = new Date(raw + 'T00:00:00');
    const jsDay = d.getDay(); // 0=Sun
    const startDayIdx = jsDay === 0 ? 6 : jsDay - 1; // 0=Mon … 6=Sun
    return Array.from({ length: 7 }, (_, i) => (startDayIdx + i) % 7);
}

// ── MOBILE SEARCH (bottom sheet) ─────────────────────────────────────────────
let _mobSearchActiveMethod = null;

function openMobileSearch() {
    const row = tbody.rows[mobileWeekIdx];
    if (!row) return;
    floatingTargetCell = row.cells[mobileDayIdx + 1];

    const sheet = document.getElementById('mobile-search-sheet');
    if (!sheet) return;

    const inp = document.getElementById('mob-search-input');
    if (inp) inp.value = '';
    _mobSearchActiveMethod = null;
    _renderMobSearchHome();

    sheet.style.transition = 'transform .3s cubic-bezier(0.32, 0.72, 0, 1)';
    sheet.style.transform = 'translateY(0)';
    sheet.style.pointerEvents = 'auto';
    sheet.style.bottom = '0';
    document.getElementById('mob-search-backdrop').style.display = 'block';

    if (window.visualViewport) {
        const _vvFn = () => {
            const vv = window.visualViewport;
            const offset = window.innerHeight - (vv.offsetTop + vv.height);
            sheet.style.bottom = Math.max(0, offset) + 'px';
        };
        window.visualViewport.addEventListener('resize', _vvFn);
        window.visualViewport.addEventListener('scroll', _vvFn);
        sheet._vvCleanup = () => {
            window.visualViewport.removeEventListener('resize', _vvFn);
            window.visualViewport.removeEventListener('scroll', _vvFn);
        };
    }
    _attachSheetSwipeClose(sheet);
}

function closeMobileSearch() {
    const sheet = document.getElementById('mobile-search-sheet');
    if (sheet) {
        sheet.style.transition = 'transform .3s cubic-bezier(0.32, 0.72, 0, 1)';
        sheet.style.transform = 'translateY(100%)';
        sheet.style.pointerEvents = 'none';
        sheet.style.bottom = '0';
        if (sheet._vvCleanup) { sheet._vvCleanup(); sheet._vvCleanup = null; }
    }
    document.getElementById('mob-search-backdrop').style.display = 'none';
    floatingTargetCell = null;
    _mobSearchActiveMethod = null;
}

function _attachSheetSwipeClose(sheet) {
    if (sheet._swipeAttached) return;
    sheet._swipeAttached = true;
    const handle = document.getElementById('mob-sheet-handle-area');
    if (!handle) return;
    let sy = 0, dragging = false;
    handle.addEventListener('touchstart', e => {
        sy = e.touches[0].clientY; dragging = true;
        sheet.style.transition = 'none';
    }, { passive: true });
    handle.addEventListener('touchmove', e => {
        if (!dragging) return;
        const dy = e.touches[0].clientY - sy;
        if (dy > 0) sheet.style.transform = 'translateY(' + dy + 'px)';
    }, { passive: true });
    handle.addEventListener('touchend', e => {
        if (!dragging) return; dragging = false;
        const dy = e.changedTouches[0].clientY - sy;
        sheet.style.transition = 'transform .3s cubic-bezier(0.32, 0.72, 0, 1)';
        if (dy > 80) closeMobileSearch();
        else sheet.style.transform = 'translateY(0)';
    }, { passive: true });
}

const MOB_METHODS = [
    { id:'ppl',        label:'PPL'    },
    { id:'split',      label:'Split'  },
    { id:'upperlower', label:'U / L'  },
    { id:'pdc',        label:'PDC'    },
    { id:'run',        label:'Run'    },
    { id:'hyrox',      label:'Hyrox'  },
    { id:'cardio',     label:'Cardio' },
];

function _renderMobSearchHome() {
    const body = document.getElementById('mob-sheet-body');
    if (!body) return;
    body.innerHTML = '<div style="padding:16px 14px 8px;">'
        + '<div style="font-size:11px;font-weight:600;color:var(--text-dim);letter-spacing:.3px;margin-bottom:12px;">Catégorie</div>'
        + '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;">'
        + MOB_METHODS.map(m =>
            '<button onclick="_openMobMethod(\'' + m.id + '\')" style="'
            + 'background:var(--card-2);border:0.5px solid var(--divider-2);border-radius:12px;'
            + 'padding:14px 4px 12px;cursor:pointer;color:var(--text-2);'
            + 'font-size:12px;font-weight:600;font-family:inherit;'
            + 'display:flex;flex-direction:column;align-items:center;gap:4px;'
            + 'transition:background .12s,border-color .12s;'
            + '-webkit-tap-highlight-color:rgba(255,255,255,0.06);'
            + '">' + m.label + '</button>'
        ).join('')
        + '</div></div>';
}

function _openMobMethod(methodId) {
    _mobSearchActiveMethod = methodId;
    _renderMobMethodContent(methodId, '');
}

function _renderMobMethodContent(methodId, searchTerm) {
    const body = document.getElementById('mob-sheet-body');
    if (!body) return;
    const norm = normalizeString(searchTerm.toLowerCase().trim());
    const methodLabel = (MOB_METHODS.find(m => m.id === methodId) || {}).label || methodId;

    let html = '<div style="display:flex;align-items:center;gap:6px;padding:10px 14px 10px;border-bottom:0.5px solid var(--divider-2);flex-shrink:0;">'
        + '<button onclick="_backToMobHome()" style="background:none;border:none;color:var(--accent);font-size:22px;cursor:pointer;padding:0 4px;line-height:1;flex-shrink:0;-webkit-tap-highlight-color:transparent;">‹</button>'
        + '<span style="font-size:15px;font-weight:600;flex:1;">' + methodLabel + '</span>'
        + '</div>'
        + '<div style="overflow-y:auto;flex:1;">';

    const groups = _getMobGroupsForMethod(methodId, norm);
    const hasItems = groups.some(g => g.items.length > 0);

    if (!hasItems) {
        html += '<div style="padding:24px;text-align:center;color:var(--text-dim);font-size:13px;">Aucun exercice trouvé</div>';
    } else {
        groups.forEach(g => {
            if (!g.items.length) return;
            const gid = 'mob-grp-' + g.label.replace(/[^a-z0-9]/gi, '');
            html += '<div>'
                + '<button onclick="_toggleMobGrp(\'' + gid + '\',this)" style="'
                + 'width:100%;background:none;border:none;border-bottom:0.5px solid var(--divider-2);'
                + 'color:var(--text-dim);font-size:11px;font-weight:600;text-transform:uppercase;'
                + 'letter-spacing:.5px;padding:13px 14px;cursor:pointer;text-align:left;'
                + 'display:flex;justify-content:space-between;align-items:center;font-family:inherit;'
                + '-webkit-tap-highlight-color:transparent;">'
                + '<span>' + g.label + '</span>'
                + '<span style="font-size:10px;color:var(--text-faint);transform:rotate(-90deg);display:inline-block;transition:transform .2s;">▾</span></button>'
                + '<div id="' + gid + '" style="display:none;flex-direction:column;">';
            g.items.forEach(item => {
                const d = item.data;
                const sub = _getMobSubtitle(item);
                html += '<button onclick="_mobAddItem(\'' + item.type + '\',\'' + d.id + '\',event)" style="'
                    + 'display:flex;align-items:center;gap:12px;'
                    + 'width:100%;background:none;border:none;'
                    + 'border-bottom:0.5px solid rgba(255,255,255,0.05);'
                    + 'border-left:3px solid ' + d.color + ';'
                    + 'padding:13px 14px;cursor:pointer;color:var(--text);'
                    + 'font-family:inherit;text-align:left;'
                    + '-webkit-tap-highlight-color:rgba(255,255,255,0.06);"'
                    + ' onpointerdown="this.style.background=\'rgba(255,255,255,0.06)\'"'
                    + ' onpointerup="this.style.background=\'none\'"'
                    + ' onpointerleave="this.style.background=\'none\'">'
                    + '<span style="font-size:20px;flex-shrink:0;">' + d.emoji + '</span>'
                    + '<div style="flex:1;min-width:0;">'
                    + '<div style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + d.name + '</div>'
                    + '<div style="font-size:10px;color:var(--text-dim);">' + sub + '</div>'
                    + '</div>'
                    + '<span class="mob-add-icon" style="color:var(--accent);font-size:18px;flex-shrink:0;font-weight:700;">+</span>'
                    + '</button>';
            });
            html += '</div></div>';
        });
    }
    html += '</div>';
    body.innerHTML = html;
}

function _backToMobHome() {
    _mobSearchActiveMethod = null;
    const inp = document.getElementById('mob-search-input');
    if (inp) inp.value = '';
    _renderMobSearchHome();
}

function _toggleMobGrp(id, btn) {
    const el = document.getElementById(id);
    if (!el) return;
    const closed = el.style.display === 'none';
    el.style.display = closed ? 'flex' : 'none';
    el.style.flexDirection = 'column';
    const arrow = btn.querySelector('span:last-child');
    if (arrow) arrow.style.transform = closed ? 'rotate(0deg)' : 'rotate(-90deg)';
}

function _getMobGroupsForMethod(methodId, norm) {
    if (methodId === 'run') {
        return [
            { label:'Sortie', items: runLibrary.filter(r => r.type==='course' && (!norm || normalizeString(r.name.toLowerCase()).includes(norm))).map(d=>({type:'run',data:d})) },
            { label:'Fractionné', items: runLibrary.filter(r => r.type==='fractionne' && (!norm || normalizeString(r.name.toLowerCase()).includes(norm))).map(d=>({type:'run',data:d})) },
            { label:'Renfo Run', items: exerciseLibrary.filter(ex => ex.categories.includes('Renfo Run') && (!norm || normalizeString(ex.name.toLowerCase()).includes(norm))).map(d=>({type:'muscu',data:d})) },
        ];
    }
    if (methodId === 'hyrox') {
        return [
            { label:'Stations', items: hyroxLibrary.filter(h => h.categories.includes('Hyrox Station') && (!norm || normalizeString(h.name.toLowerCase()).includes(norm))).map(d=>({type:'hyrox',data:d})) },
            { label:'Course', items: hyroxLibrary.filter(h => h.categories.includes('Hyrox Course') && (!norm || normalizeString(h.name.toLowerCase()).includes(norm))).map(d=>({type:'hyrox',data:d})) },
            { label:'Renfo', items: exerciseLibrary.filter(ex => ex.categories.includes('Renfo Run') && (!norm || normalizeString(ex.name.toLowerCase()).includes(norm))).map(d=>({type:'muscu',data:d})) },
        ];
    }
    if (methodId === 'cardio') {
        const def = trainingMethods['cardio'] || {};
        return Object.entries(def).map(function(entry) {
            return { label: entry[0], items: cardioLibrary.filter(c => c.categories.some(cat => entry[1].includes(cat)) && (!norm || normalizeString(c.name.toLowerCase()).includes(norm))).map(d=>({type:'cardio',data:d})) };
        });
    }
    const key = methodId === 'pdc' ? 'pdc' : methodId;
    const def = trainingMethods[key] || {};
    return Object.entries(def).map(function(entry) {
        return { label: entry[0], items: exerciseLibrary.filter(ex => ex.categories.some(c => entry[1].includes(c)) && (!norm || normalizeString(ex.name.toLowerCase()).includes(norm) || ex.categories.some(c => normalizeString(c.toLowerCase()).includes(norm)))).map(d=>({type:'muscu',data:d})) };
    });
}

function _getMobSubtitle(item) {
    const d = item.data;
    if (item.type === 'muscu') { const mat = materiels.find(m => m.id === d.materielId); return mat ? mat.name : ''; }
    if (item.type === 'run') return d.type === 'fractionne' ? 'Fractionné' : 'Course';
    if (item.type === 'hyrox') return 'Station Hyrox';
    if (item.type === 'cardio') return 'Cardio';
    return '';
}

function _mobAddItem(type, id, evt) {
    if (!floatingTargetCell) return;
    if (type === 'muscu') createPlacedExercise(floatingTargetCell, id);
    else if (type === 'run') createPlacedRun(floatingTargetCell, id);
    else if (type === 'hyrox') createPlacedHyrox(floatingTargetCell, id);
    else if (type === 'cardio') createPlacedCardio(floatingTargetCell, id);
    syncClientProgram();
    renderMobileView();
    // Feedback ✓ sur le bouton
    if (evt && evt.currentTarget) {
        const icon = evt.currentTarget.querySelector('.mob-add-icon');
        if (icon) {
            icon.textContent = '✓';
            icon.style.color = 'var(--green)';
            setTimeout(() => { icon.textContent = '+'; icon.style.color = 'var(--accent)'; }, 900);
        }
    }
}

function _renderMobSearchResults(term) {
    const body = document.getElementById('mob-sheet-body');
    if (!body) return;
    const norm = normalizeString(term.toLowerCase().trim());
    let allItems = [];
    exerciseLibrary.forEach(ex => {
        if (normalizeString(ex.name.toLowerCase()).includes(norm) || ex.categories.some(c => normalizeString(c.toLowerCase()).includes(norm)))
            allItems.push({ type:'muscu', data:ex });
    });
    runLibrary.forEach(r => { if (normalizeString(r.name.toLowerCase()).includes(norm)) allItems.push({ type:'run', data:r }); });
    hyroxLibrary.forEach(h => { if (normalizeString(h.name.toLowerCase()).includes(norm)) allItems.push({ type:'hyrox', data:h }); });
    cardioLibrary.forEach(c => { if (normalizeString(c.name.toLowerCase()).includes(norm)) allItems.push({ type:'cardio', data:c }); });

    if (!allItems.length) {
        body.innerHTML = '<div style="padding:24px;text-align:center;color:var(--text-dim);font-size:13px;">Aucun résultat pour « ' + term + ' »</div>';
        return;
    }
    let html = '<div style="overflow-y:auto;flex:1;">';
    allItems.forEach(item => {
        const d = item.data;
        const sub = _getMobSubtitle(item);
        html += '<button onclick="_mobAddItem(\'' + item.type + '\',\'' + d.id + '\',event)" style="'
            + 'display:flex;align-items:center;gap:12px;width:100%;background:none;border:none;'
            + 'border-bottom:0.5px solid rgba(255,255,255,0.05);border-left:3px solid ' + d.color + ';'
            + 'padding:13px 14px;cursor:pointer;color:var(--text);font-family:inherit;text-align:left;'
            + '-webkit-tap-highlight-color:rgba(255,255,255,0.06);"'
            + ' onpointerdown="this.style.background=\'rgba(255,255,255,0.06)\'"'
            + ' onpointerup="this.style.background=\'none\'"'
            + ' onpointerleave="this.style.background=\'none\'">'
            + '<span style="font-size:20px;flex-shrink:0;">' + d.emoji + '</span>'
            + '<div style="flex:1;min-width:0;">'
            + '<div style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + d.name + '</div>'
            + '<div style="font-size:10px;color:var(--text-dim);">' + sub + '</div>'
            + '</div>'
            + '<span class="mob-add-icon" style="color:var(--accent);font-size:18px;flex-shrink:0;font-weight:700;">+</span>'
            + '</button>';
    });
    html += '</div>';
    body.innerHTML = html;
}

function buildMobileSearchSheet() {
    if (document.getElementById('mobile-search-sheet')) return;

    const bd = document.createElement('div');
    bd.id = 'mob-search-backdrop';
    bd.style.cssText = 'display:none;position:fixed;inset:0;z-index:500;background:rgba(0,0,0,0.55);backdrop-filter:blur(2px);';
    bd.onclick = closeMobileSearch;
    document.body.appendChild(bd);

    const sheet = document.createElement('div');
    sheet.id = 'mobile-search-sheet';
    sheet.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:501;'
        + 'background:#1c1c1e;border-radius:20px 20px 0 0;'
        + 'border-top:1px solid var(--divider);'
        + 'box-shadow:0 -8px 40px rgba(0,0,0,0.6);'
        + 'transform:translateY(100%);pointer-events:none;'
        + 'transition:transform .3s cubic-bezier(0.32, 0.72, 0, 1);'
        + 'display:flex;flex-direction:column;'
        + 'height:72vh;min-height:340px;'
        + 'padding-bottom:env(safe-area-inset-bottom, 0px);';

    sheet.innerHTML = '<div id="mob-sheet-handle-area" style="flex-shrink:0;padding:10px 14px 0;cursor:grab;">'
        + '<div style="display:flex;align-items:center;gap:8px;padding-bottom:10px;border-bottom:0.5px solid var(--divider-2);">'
        + '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8e8e93" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>'
        + '<input id="mob-search-input" type="search" placeholder="Rechercher un exercice…"'
        + ' style="flex:1;background:none;border:none;color:white;font-size:15px;font-family:inherit;outline:none;"'
        + ' autocomplete="off" autocorrect="off" spellcheck="false">'
        + '<button onclick="closeMobileSearch()" style="'
        + 'background:var(--card-2);border:0.5px solid var(--divider-2);'
        + 'color:var(--text-dim);width:28px;height:28px;border-radius:50%;'
        + 'cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;flex-shrink:0;'
        + '-webkit-tap-highlight-color:transparent;">×</button>'
        + '</div></div>'
        + '<div id="mob-sheet-body" style="flex:1;overflow-y:auto;display:flex;flex-direction:column;min-height:0;"></div>';

    document.body.appendChild(sheet);

    document.getElementById('mob-search-input').addEventListener('input', function() {
        const v = this.value.trim();
        if (v.length > 0) {
            _renderMobSearchResults(v);
        } else if (_mobSearchActiveMethod) {
            _renderMobMethodContent(_mobSearchActiveMethod, '');
        } else {
            _renderMobSearchHome();
        }
    });
}

// ── VUE CLIENT (fullscreen style view.html) ──────────────────────────────────
let clientViewActive = false;
let clientSelectedDate = new Date();

// ── VUE CLIENT (ouvre view.html avec les données du programme) ─────────────────
function getTargetDateFromMobile() {
    const startDateStr = document.getElementById('start-date').value;
    if (!startDateStr) return new Date();
    const startDate = new Date(startDateStr + 'T00:00:00');
    const weekOffset = mobileWeekIdx;
    const dayOffset = mobileDayIdx;
    const target = new Date(startDate);
    target.setDate(startDate.getDate() + weekOffset * 7 + dayOffset);
    return target;
}

// Remplacer openClientView
function openClientView() {
    const targetDate = getTargetDateFromMobile();
    localStorage.setItem('benchmaster_client_target_date', targetDate.toISOString());
    const programData = exportProgramData();
    localStorage.setItem('benchmaster_client_program', JSON.stringify(programData));
    window.open('view.html', '_blank');
}

function _exportItemFromEl(el) {
    const item = { cardType: el.dataset.cardType };
    if (el.dataset.cardType === 'muscu') {
        item.id = el.dataset.id; item.name = el.dataset.name; item.emoji = el.dataset.emoji; item.color = el.dataset.color;
        item.materielId = el.dataset.materielId; item.trainingMode = el.dataset.trainingMode || 'normal';
        if (el.dataset.unit) item.unit = el.dataset.unit;
        item.pyramideConfig = el.dataset.pyramideConfig || null;
        item.progressionConfig = el.dataset.progressionConfig ? (function(){try{return JSON.parse(el.dataset.progressionConfig);}catch(e){return null;}})() : null;
        try { item.sets = JSON.parse(el.dataset.setsData); } catch(e) { item.sets = []; }
    } else if (el.dataset.cardType === 'run') {
        item.name = el.dataset.name; item.emoji = el.dataset.emoji; item.color = el.dataset.color; item.runId = el.dataset.runId;
        try { item.runData = JSON.parse(el.dataset.runData); } catch(e) { item.runData = {}; }
    } else if (el.dataset.cardType === 'hyrox') {
        item.name = el.dataset.name; item.emoji = el.dataset.emoji; item.color = el.dataset.color; item.hyroxId = el.dataset.hyroxId;
        try { item.hyroxData = JSON.parse(el.dataset.hyroxData); } catch(e) { item.hyroxData = {}; }
    } else if (el.dataset.cardType === 'cardio') {
        item.name = el.dataset.name; item.emoji = el.dataset.emoji; item.color = el.dataset.color; item.cardioId = el.dataset.cardioId;
        try { item.cardioData = JSON.parse(el.dataset.cardioData); } catch(e) { item.cardioData = {}; }
    } else { return null; }
    return item;
}
function exportProgramData() {
    // Exporter toutes les semaines
    const weeks = [];
    for (let i = 0; i < tbody.rows.length; i++) {
        const row = tbody.rows[i];
        const days = {};
        DAYS.forEach((dayName, idx) => {
            const cell = row.cells[idx + 1];
            const items = [];
            // Items de 1er niveau, dans l'ordre : exercices ET circuits (box).
            Array.from(cell.children).forEach(ch => {
                if (ch.classList.contains('placed-exo')) {
                    const it = _exportItemFromEl(ch); if (it) items.push(it);
                } else if (ch.classList.contains('circuit-box')) {
                    items.push({
                        cardType: 'box',
                        name: ch.dataset.boxName || 'Circuit',
                        rounds: parseInt(ch.dataset.rounds) || 1,
                        restSec: parseInt(ch.dataset.restSec) || 0,
                        items: Array.from(ch.querySelectorAll('.box-drop > .placed-exo')).map(_exportItemFromEl).filter(Boolean)
                    });
                }
            });
            days[dayName] = items;
        });
        weeks.push({
            week: i + 1,
            deload: row.cells[0].getAttribute('data-deload') === 'true',
            days: days
        });
    }
    
    const startDate = document.getElementById('start-date').value;
    const maxTargetsData = JSON.parse(localStorage.getItem('benchmaster_maxes') || '{}');
    const progName = currentProgName || 'mon_programme';
    
    return {
        programName: progName,
        startDate: startDate,
        weeks: weeks,
        maxTargets: maxTargetsData,
        progressionConfig: progressionConfig || {},
        programNotes: programNotes || ''
    };
}

function renderClientView() {
    const dateLabel = document.getElementById('client-date-label');
    const dateDisplay = document.getElementById('client-date');
    const cardDiv = document.getElementById('client-card');
    
    const today = new Date();
    const diff = Math.round((clientSelectedDate - today) / 86400000);
    if (diff === 0) dateLabel.textContent = "Aujourd'hui";
    else if (diff === 1) dateLabel.textContent = "Demain";
    else if (diff === -1) dateLabel.textContent = "Hier";
    else dateLabel.textContent = clientSelectedDate.toLocaleDateString('fr-FR', { weekday: 'long' });
    dateDisplay.textContent = clientSelectedDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
    
    // Récupérer les données pour la date sélectionnée
    const workout = getWorkoutForDate(clientSelectedDate);
    if (!workout || workout.blocks.length === 0) {
        cardDiv.innerHTML = `
            <div style="text-align:center; padding:40px 0;">
                <div style="font-size:48px; margin-bottom:12px;">🧘</div>
                <div style="font-size:18px; font-weight:700;">Repos</div>
                <div style="font-size:13px; color:var(--text-dim); margin-top:4px;">Aucun exercice programmé</div>
            </div>
        `;
        return;
    }
    
    const isDeload = workout.isDeload ? '<span class="deload-chip" style="background:rgba(255,214,10,0.15); color:#ffd60a; font-size:10px; padding:2px 8px; border-radius:5px; margin-left:8px;">Deload</span>' : '';
    
    cardDiv.innerHTML = `
        <div style="margin-bottom:16px; display:flex; justify-content:space-between; align-items:center;">
            <div>
                <div style="font-size:13px; color:var(--text-dim);">Semaine ${workout.week}${isDeload}</div>
                <div style="font-size:15px; font-weight:700;">${workout.dayName}</div>
            </div>
            <div style="font-size:20px; font-weight:800; background:linear-gradient(135deg,#0a84ff,#bf5af2); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent;">
                ${workout.blocks.length} ex.
            </div>
        </div>
        <div style="display:flex; flex-direction:column; gap:12px;">
            ${workout.blocks.map(block => renderClientBlock(block)).join('')}
        </div>
    `;
}

function getWorkoutForDate(date) {
    // Extraire le programme actuel depuis le tableau
    const weeks = [];
    for (let i = 0; i < tbody.rows.length; i++) {
        const row = tbody.rows[i];
        const days = {};
        DAYS.forEach((dayName, idx) => {
            const cell = row.cells[idx + 1];
            const items = [];
            cell.querySelectorAll('.placed-exo').forEach(el => {
                const item = { cardType: el.dataset.cardType };
                if (el.dataset.cardType === 'muscu') {
                    item.id = el.dataset.id;
                    item.name = el.dataset.name;
                    item.emoji = el.dataset.emoji;
                    item.color = el.dataset.color;
                    item.trainingMode = el.dataset.trainingMode;
                    item.sets = JSON.parse(el.dataset.setsData);
                } else if (el.dataset.cardType === 'run') {
                    item.name = el.dataset.name;
                    item.emoji = el.dataset.emoji;
                    item.color = el.dataset.color;
                    item.runData = JSON.parse(el.dataset.runData);
                } else if (el.dataset.cardType === 'hyrox') {
                    item.name = el.dataset.name;
                    item.emoji = el.dataset.emoji;
                    item.color = el.dataset.color;
                    item.hyroxData = JSON.parse(el.dataset.hyroxData);
                } else if (el.dataset.cardType === 'cardio') {
                    item.name = el.dataset.name;
                    item.emoji = el.dataset.emoji;
                    item.color = el.dataset.color;
                    item.cardioData = JSON.parse(el.dataset.cardioData);
                }
                items.push(item);
            });
            days[dayName] = items;
        });
        weeks.push({
            week: i + 1,
            deload: row.cells[0].getAttribute('data-deload') === 'true',
            days: days
        });
    }
    
    const startDateStr = document.getElementById('start-date').value;
    if (!startDateStr || weeks.length === 0) return null;
    const startDate = new Date(startDateStr + 'T00:00:00');
    const diffDays = Math.floor((date - startDate) / 86400000);
    if (diffDays < 0) return null;
    const weekIndex = Math.floor(diffDays / 7) % weeks.length;
    const weekData = weeks[weekIndex];
    const dayName = DAYS_FR[date.getDay()];
    const blocks = weekData.days[dayName] || [];
    return {
        week: weekData.week,
        isDeload: weekData.deload,
        dayName: dayName,
        blocks: blocks
    };
}

function renderClientBlock(block) {
    const col = block.color || '#fff';
    const em = block.emoji || '🏋️';
    const bg = col + '10';
    
    if (block.cardType === 'muscu') {
        const rows = block.sets.map(s => {
            const wStr = s.weight != null ? `${Math.round(s.weight * 4) / 4} kg` : (s.pct ? `${s.pct}%` : '—');
            const meta = s.reps ? `${s.reps} reps` : '';
            return `<div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid rgba(255,255,255,0.05);">
                        <div><span style="font-weight:600;">${s.tech || 'Normal'}</span>${meta ? `<span style="color:var(--text-dim); margin-left:8px; font-size:11px;">${meta}</span>` : ''}</div>
                        <div style="font-weight:700; color:${col};">${wStr}</div>
                    </div>`;
        }).join('');
        const modeBadge = block.trainingMode && block.trainingMode !== 'normal' ? `<span style="font-size:9px; background:rgba(255,255,255,0.1); padding:2px 6px; border-radius:4px; margin-left:8px;">${block.trainingMode.toUpperCase()}</span>` : '';
        return `<div style="background:${bg}; border-left:4px solid ${col}; border-radius:16px; padding:12px;">
                    <div style="display:flex; align-items:center; gap:10px; margin-bottom:10px;">
                        <div style="width:32px; height:32px; background:${col}22; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:18px;">${em}</div>
                        <div><div style="font-weight:700;">${block.name}${modeBadge}</div><div style="font-size:11px; color:var(--text-dim);">${block.sets.length} série(s)</div></div>
                    </div>
                    <div>${rows}</div>
                </div>`;
    }
    
    if (block.cardType === 'run') {
        const d = block.runData;
        let info = '';
        if (d.type === 'course') {
            info = `<div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
                        <div><div style="font-size:10px; color:var(--text-dim);">Distance</div><div style="font-weight:700;">${d.distance ? d.distance + ' km' : '—'}</div></div>
                        <div><div style="font-size:10px; color:var(--text-dim);">Allure</div><div style="font-weight:700;">${fmtPace(d.paceMin, d.paceSec)}</div></div>
                        <div><div style="font-size:10px; color:var(--text-dim);">Durée</div><div style="font-weight:700;">${fmtDuration(d.duration)}</div></div>
                        ${d.zone ? `<div><div style="font-size:10px; color:var(--text-dim);">Zone</div><div style="font-weight:700;">${d.zone}</div></div>` : ''}
                    </div>`;
        } else {
            const effort = d.distMode === 'distance' ? `${d.blocs}×${d.effortDist}m` : `${d.blocs}×${fmtTime(d.effortSec)}`;
            info = `<div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
                        <div><div style="font-size:10px; color:var(--text-dim);">Structure</div><div style="font-weight:700;">${effort}</div></div>
                        <div><div style="font-size:10px; color:var(--text-dim);">Allure</div><div style="font-weight:700;">${fmtPace(d.effortPaceMin, d.effortPaceSec)}</div></div>
                        <div><div style="font-size:10px; color:var(--text-dim);">Récup</div><div style="font-weight:700;">${fmtTime(d.recupSec)}</div></div>
                        ${d.zone ? `<div><div style="font-size:10px; color:var(--text-dim);">Zone</div><div style="font-weight:700;">${d.zone}</div></div>` : ''}
                    </div>`;
        }
        return `<div style="background:${bg}; border-left:4px solid ${col}; border-radius:16px; padding:12px;">
                    <div style="display:flex; align-items:center; gap:10px; margin-bottom:10px;">
                        <div style="width:32px; height:32px; background:${col}22; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:18px;">${em}</div>
                        <div><div style="font-weight:700;">${block.name}</div><div style="font-size:11px; color:var(--text-dim);">Course</div></div>
                    </div>
                    ${info}
                    ${d.notes ? `<div style="margin-top:8px; font-size:11px; color:var(--text-dim); font-style:italic;">${d.notes}</div>` : ''}
                </div>`;
    }
    
    if (block.cardType === 'hyrox') {
        const d = block.hyroxData;
        const parts = [];
        if (d.distance) parts.push(`${d.distance}m`);
        if (d.weight) parts.push(`${d.weight}kg`);
        if (d.reps) parts.push(`${d.reps} reps`);
        if (d.targetMin != null) parts.push(`⏱ ${d.targetMin}:${String(d.targetSec||0).padStart(2,'0')}`);
        return `<div style="background:${bg}; border-left:4px solid ${col}; border-radius:16px; padding:12px;">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <div style="width:32px; height:32px; background:${col}22; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:18px;">${em}</div>
                        <div><div style="font-weight:700;">${block.name}</div><div style="font-size:11px; color:var(--text-dim);">${parts.join(' · ')}</div></div>
                    </div>
                    ${d.notes ? `<div style="margin-top:8px; font-size:11px; color:var(--text-dim); font-style:italic;">${d.notes}</div>` : ''}
                </div>`;
    }
    
    if (block.cardType === 'cardio') {
        const d = block.cardioData;
        const parts = [];
        if (d.duration) parts.push(`${d.duration}min`);
        if (d.distance) parts.push(`${d.distance}m`);
        if (d.reps) parts.push(`${d.reps} reps`);
        if (d.weight) parts.push(`${d.weight}kg`);
        if (d.resistance) parts.push(`Rés. ${d.resistance}`);
        return `<div style="background:${bg}; border-left:4px solid ${col}; border-radius:16px; padding:12px;">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <div style="width:32px; height:32px; background:${col}22; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:18px;">${em}</div>
                        <div><div style="font-weight:700;">${block.name}</div><div style="font-size:11px; color:var(--text-dim);">${parts.join(' · ')}</div></div>
                    </div>
                    ${d.notes ? `<div style="margin-top:8px; font-size:11px; color:var(--text-dim); font-style:italic;">${d.notes}</div>` : ''}
                </div>`;
    }
    return '';
}

function buildClientCalendar() {
    const calDiv = document.getElementById('client-calendar');
    if (!calDiv) return;
    const today = new Date();
    const year = clientSelectedDate.getFullYear();
    const month = clientSelectedDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startOffset = (firstDay.getDay() + 6) % 7;
    
    let html = `<div style="text-align:center; margin-bottom:12px;">
                    <button id="cal-prev-month" style="background:none; border:none; color:var(--accent); font-size:18px; cursor:pointer;">◀</button>
                    <span style="margin:0 20px; font-weight:700;">${firstDay.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</span>
                    <button id="cal-next-month" style="background:none; border:none; color:var(--accent); font-size:18px; cursor:pointer;">▶</button>
                </div>
                <div style="display:grid; grid-template-columns:repeat(7,1fr); gap:4px; text-align:center; margin-bottom:8px;">
                    ${['L','M','M','J','V','S','D'].map(d => `<div style="font-size:10px; color:var(--text-dim);">${d}</div>`).join('')}
                </div>
                <div style="display:grid; grid-template-columns:repeat(7,1fr); gap:4px;">`;
    
    for (let i = 0; i < startOffset; i++) {
        html += `<div style="aspect-ratio:1/1;"></div>`;
    }
    for (let d = 1; d <= lastDay.getDate(); d++) {
        const date = new Date(year, month, d);
        const isSelected = date.toDateString() === clientSelectedDate.toDateString();
        const isToday = date.toDateString() === today.toDateString();
        html += `<div class="client-cal-day" data-year="${year}" data-month="${month}" data-day="${d}" style="
                    aspect-ratio:1/1; display:flex; align-items:center; justify-content:center;
                    background:${isSelected ? 'var(--accent)' : (isToday ? 'rgba(255,255,255,0.1)' : 'transparent')};
                    border-radius:50%; font-weight:${isSelected ? '700' : '400'}; cursor:pointer;
                ">${d}</div>`;
    }
    html += `</div>`;
    calDiv.innerHTML = html;
    
    calDiv.querySelectorAll('.client-cal-day').forEach(day => {
        day.onclick = () => {
            const y = parseInt(day.dataset.year);
            const m = parseInt(day.dataset.month);
            const d = parseInt(day.dataset.day);
            clientSelectedDate = new Date(y, m, d);
            renderClientView();
            calDiv.style.display = 'none';
        };
    });
    const prevBtn = document.getElementById('cal-prev-month');
    const nextBtn = document.getElementById('cal-next-month');
    if (prevBtn) prevBtn.onclick = () => { clientSelectedDate.setMonth(clientSelectedDate.getMonth() - 1); renderClientView(); buildClientCalendar(); };
    if (nextBtn) nextBtn.onclick = () => { clientSelectedDate.setMonth(clientSelectedDate.getMonth() + 1); renderClientView(); buildClientCalendar(); };
}

// ── HOOK INTO MODAL CLOSE ────────────────────────────────────────────────────
const _origCloseModals = closeModals;
closeModals = function() {
    _origCloseModals();
    if (isMobileView) renderMobileView();
};

// ── SWIPE DOWN TO CLOSE MODALS ON MOBILE ─────────────────────────────────────
// Observe quand une modal-overlay s'affiche et attache le handler touch
function _attachModalSwipeClose(overlay) {
    if (overlay._swipeModalAttached) return;
    overlay._swipeModalAttached = true;

    const modal = overlay.querySelector('.modal');
    if (!modal) return;

    let sy = 0, startTranslate = 0, dragging = false;

    // Poignée = toute la modal-header (zone naturelle pour le geste)
    const header = modal.querySelector('.modal-header');
    const dragZone = header || modal;

    dragZone.addEventListener('touchstart', e => {
        if (e.touches.length !== 1) return;
        sy = e.touches[0].clientY;
        dragging = true;
        startTranslate = 0;
        modal.style.transition = 'none';
    }, { passive: true });

    dragZone.addEventListener('touchmove', e => {
        if (!dragging || e.touches.length !== 1) return;
        const dy = e.touches[0].clientY - sy;
        if (dy > 0) {
            modal.style.transform = 'translateY(' + dy + 'px)';
        }
    }, { passive: true });

    dragZone.addEventListener('touchend', e => {
        if (!dragging) return;
        dragging = false;
        const dy = e.changedTouches[0].clientY - sy;
        modal.style.transition = 'transform .28s cubic-bezier(0.25,0.46,0.45,0.94)';
        if (dy > 90) {
            // Fermer : animer vers le bas puis closeModals
            modal.style.transform = 'translateY(110%)';
            setTimeout(() => {
                modal.style.transform = '';
                modal.style.transition = '';
                closeModals();
            }, 260);
        } else {
            modal.style.transform = 'translateY(0)';
            setTimeout(() => {
                modal.style.transform = '';
                modal.style.transition = '';
            }, 280);
        }
    }, { passive: true });

    // Curseur grab sur la zone de drag
    if (dragZone) dragZone.style.cursor = 'grab';
}

// Observer les modaux qui s'affichent
function _initModalSwipes() {
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        // MutationObserver sur style.display pour détecter l'ouverture
        const obs = new MutationObserver(() => {
            if (overlay.style.display !== 'none' && overlay.style.display !== '') {
                _attachModalSwipeClose(overlay);
            }
        });
        obs.observe(overlay, { attributes: true, attributeFilter: ['style'] });
    });
}

// ── RESIZE HANDLER ────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
    if (window.innerWidth <= MOBILE_BREAKPOINT && !isMobileView) {
        initMobileView();
    } else if (window.innerWidth > MOBILE_BREAKPOINT && isMobileView) {
        destroyMobileView();
    }
});

// ── AUTO-INIT on DOM ready ────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    buildMobileSearchSheet();
    _initModalSwipes();
    if (window.innerWidth <= MOBILE_BREAKPOINT) {
        const waitLib = setInterval(() => {
            if (exerciseLibrary.length > 0) {
                clearInterval(waitLib);
                initMobileView();
            }
        }, 100);
        setTimeout(() => { clearInterval(waitLib); initMobileView(); }, 1500);
    }
});
