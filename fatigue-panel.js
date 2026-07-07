// ======================================================================
//  FATIGUE PANEL — volet repliable à droite de l'éditeur.
// ----------------------------------------------------------------------
//  Module 100% autonome : s'auto-injecte dans la page, ne modifie aucune
//  fonction ni variable de l'éditeur. Il lit le programme via la fonction
//  globale exportProgramData() et la bibliothèque via exerciseLibrary, puis
//  utilise FatigueModel (fatigue-model.js) pour tous les calculs.
//
//  Mise à jour temps réel : un MutationObserver surveille le tableau du
//  programme (#weekTable) — dès qu'on ajoute/édite/supprime un exercice ou
//  une semaine, le volet se recalcule (débounce). Écoute aussi le
//  BroadcastChannel 'benchmaster_sync' pour la synchro inter-onglets.
//
//  API : window.FatiguePanel = { open, close, toggle, refresh, isOpen }
// ======================================================================
(function () {
    'use strict';
    if (window.FatiguePanel) return; // évite double init

    let drawer, body;
    let selectedDay = null;   // index du jour affiché dans les cartes
    let lastTimeline = null;
    let opened = false;
    let observer = null;
    let debounceTimer = null;
    let maxesWatcher = null;
    let lastMaxes = null;

    // ------------------------------------------------------ couleur fatigue
    function heatColor(f) {
        if (f <= 0) return 'transparent';
        let r, g, b, a;
        if (f <= 15) return `rgba(48,209,88,${0.18 + 0.6 * (f / 15)})`;
        if (f <= 40) { const t = (f - 15) / 25; r = 255; g = Math.round(209 - 50 * t); b = Math.round(88 - 78 * t); a = 0.55 + 0.2 * t; }
        else if (f <= 70) { const t = (f - 40) / 30; r = 255; g = Math.round(159 - 69 * t); b = 10; a = 0.78 + 0.1 * t; }
        else { const t = (f - 70) / 30; r = 255; g = Math.round(90 - 90 * t); b = Math.round(10 + 48 * t); a = 0.9; }
        return `rgba(${r},${g},${b},${a})`;
    }

    // ------------------------------------------------------ DOM (injection)
    function build() {
        drawer = document.createElement('aside');
        drawer.className = 'ftg-drawer';
        drawer.innerHTML =
            `<div class="ftg-head">
                <div>
                    <div class="ftg-title">Fatigue musculaire</div>
                    <div class="ftg-sub" id="ftg-sub">—</div>
                </div>
                <button class="ftg-close" title="Fermer">×</button>
             </div>
             <div class="ftg-body" id="ftg-body"></div>`;
        drawer.querySelector('.ftg-close').addEventListener('click', close);
        document.body.appendChild(drawer);
        body = drawer.querySelector('#ftg-body');
        setupSwipeToClose();
    }

    // Fermeture par swipe vers la droite (comme les autres volets/modales).
    function setupSwipeToClose() {
        let sx = 0, sy = 0, tracking = false;
        drawer.addEventListener('touchstart', e => {
            if (e.touches.length !== 1) { tracking = false; return; }
            sx = e.touches[0].clientX; sy = e.touches[0].clientY; tracking = true;
        }, { passive: true });
        drawer.addEventListener('touchend', e => {
            if (!tracking) return; tracking = false;
            const t = e.changedTouches[0];
            const dx = t.clientX - sx, dy = t.clientY - sy;
            if (dx > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) close(); // swipe droite
        }, { passive: true });
    }

    // Ferme si on clique en dehors du volet (et pas sur un déclencheur Fatigue).
    function onDocPointer(e) {
        if (!opened) return;
        if (e.target.closest('.ftg-drawer')) return;
        if (e.target.closest('#btn-fatigue-view')) return; // le bouton gère déjà le toggle
        close();
    }

    // -------------------------------------------------- récupère le programme
    function getProgram() {
        if (typeof exportProgramData === 'function') {
            try { return exportProgramData(); } catch (e) { /* ignore */ }
        }
        // Repli : programme synchronisé en localStorage.
        try { return JSON.parse(localStorage.getItem('benchmaster_client_program') || 'null'); }
        catch (e) { return null; }
    }
    function getLibrary() {
        if (typeof exerciseLibrary !== 'undefined' && exerciseLibrary && exerciseLibrary.length)
            return { exercices: exerciseLibrary };
        return { exercices: [] };
    }

    // ----------------------------------------------------------- calcul + rendu
    function refresh() {
        if (!drawer) return;
        const program = getProgram();
        const hasData = program && program.weeks && program.weeks.some(w =>
            Object.values(w.days || {}).some(items => items && items.length));
        if (!hasData) { renderEmpty(); return; }

        lastTimeline = FatigueModel.buildTimeline(program, getLibrary());
        drawer.querySelector('#ftg-sub').textContent =
            `${lastTimeline.muscles.length} muscles · ${program.weeks.length} sem.`;

        if (!lastTimeline.muscles.length) { renderEmpty(); return; }

        // Jour par défaut : première séance, ou aujourd'hui si dans le bloc.
        if (selectedDay == null || selectedDay >= lastTimeline.days.length) {
            selectedDay = defaultDayIndex(lastTimeline);
        }
        render();
    }

    function defaultDayIndex(tl) {
        const todayKey = new Date().toISOString().slice(0, 10);
        const todayIdx = tl.days.findIndex(d => d.key === todayKey);
        if (todayIdx >= 0) return todayIdx;
        // sinon 1er jour avec une séance
        for (const m of tl.muscles) {
            const i = tl.grid[m].findIndex(c => c.trained);
            if (i >= 0) return i;
        }
        return 0;
    }

    function renderEmpty() {
        body.innerHTML = `<div class="ftg-empty">Ajoute des exercices dans le programme :<br>la fatigue par muscle s'affiche ici et se met à jour en temps réel.</div>`;
    }

    function render() {
        const tl = lastTimeline;
        const P = FatigueModel.FATIGUE_PARAMS;
        const day = tl.days[selectedDay];

        // --- sélecteur de jour ---
        let html =
            `<div class="ftg-daynav">
                <button id="ftg-prev" ${selectedDay <= 0 ? 'disabled' : ''}>‹</button>
                <div class="ftg-daylabel">
                    <strong>${day.dayName} ${day.date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}</strong>
                    <span>Semaine ${day.weekIndex + 1}${day.deload ? ' · <b class="ftg-dl">deload</b>' : ''}</span>
                </div>
                <button id="ftg-next" ${selectedDay >= tl.days.length - 1 ? 'disabled' : ''}>›</button>
             </div>`;

        // --- alerte 1RM manquants (intensités estimées) ---
        if (tl.missingMaxExos && tl.missingMaxExos.length) {
            const names = tl.missingMaxExos.map(e => e.name).join(', ');
            const canOpen = typeof openMaxModal === 'function';
            html +=
                `<div class="ftg-warn" title="${names}">
                    <span>⚠️ ${tl.missingMaxExos.length} exercice(s) chargé(s) sans 1RM — intensités <b>estimées</b>.</span>
                    ${canOpen ? `<button id="ftg-setmax">Définir les 1RM</button>` : ''}
                 </div>`;
        }

        // --- légende ---
        html +=
            `<div class="ftg-legend">
                <div class="i"><span class="sw" style="background:var(--green)"></span>Frais</div>
                <div class="i"><span class="sw" style="background:var(--orange)"></span>Récup.</div>
                <div class="i"><span class="sw" style="background:#ff7b19"></span>Fatigué</div>
                <div class="i"><span class="sw" style="background:var(--red)"></span>Épuisé</div>
                <div class="i"><span class="sw" style="background:#fff;border-radius:50%;width:9px;height:9px"></span>séance</div>
             </div>`;

        // --- heatmap complète du bloc ---
        html += `<div class="ftg-section">Bloc complet — clique un jour</div>`;
        let head = '<tr><th class="ftg-mus"></th>';
        tl.days.forEach((d, i) => {
            const cls = (i % 7 === 0 ? ' wstart' : '') + (i === selectedDay ? ' sel' : '') + (d.deload ? ' dl' : '');
            head += `<th class="ftg-dth${cls}" data-day="${i}">${d.date.getDate()}</th>`;
        });
        head += '</tr>';
        let rows = '';
        tl.muscles.forEach(m => {
            rows += `<tr><td class="ftg-mus">${m}</td>`;
            tl.grid[m].forEach((c, i) => {
                const cls = (i % 7 === 0 ? ' wstart' : '') + (c.trained ? ' trained' : '') + (i === selectedDay ? ' sel' : '');
                rows += `<td class="ftg-cell${cls}" data-day="${i}" style="background:${heatColor(c.fatigue)}"><span class="v">${c.fatigue > 0 ? c.fatigue : ''}</span></td>`;
            });
            rows += '</tr>';
        });
        html += `<div class="ftg-heat-scroll"><table class="ftg-heat"><thead>${head}</thead><tbody>${rows}</tbody></table></div>`;

        // --- cartes du jour sélectionné ---
        html += `<div class="ftg-section">État au ${day.dayName} ${day.date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}</div><div class="ftg-cards">`;
        tl.muscles.forEach(m => {
            const c = tl.grid[m][selectedDay];
            const st = c.status;
            const nh = tl.nextHeavy[m];
            const readyTxt = c.fatigue <= P.fresh ? 'prêt' : (nh ? `dès ${nh.date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}` : '—');
            const trained = c.trained
                ? `<div class="ftg-trained">🏋️ ${c.trained.map(t => `${t.emoji || ''} ${t.exo} <b style="color:var(--text-2)">${t.intensity}%${t.estimated ? '≈' : ''}</b>`).join(' · ')}</div>`
                : '';
            const estList = tl.estimatedByMuscle[m] || [];
            const estBadge = estList.length
                ? `<span class="ftg-est" title="1RM estimé (pas de max défini) — ${estList.join(', ')}">≈ estimé</span>`
                : '';
            html +=
                `<div class="ftg-card">
                    <div class="ftg-crow1">
                        <span class="ftg-name">${m} ${estBadge}</span>
                        <span class="ftg-badge" style="background:${st.color}22;color:${st.color}">${st.label}</span>
                    </div>
                    <div class="ftg-bar"><span style="width:${c.fatigue}%;background:${st.color}"></span></div>
                    <div class="ftg-meta">
                        <div class="ftg-m">Fatigue <strong>${c.fatigue}%</strong></div>
                        <div class="ftg-m">Sûr jusqu'à <strong>${c.safe}% 1RM</strong></div>
                        <div class="ftg-m">Lourd OK <strong>${readyTxt}</strong></div>
                    </div>
                    ${trained}
                </div>`;
        });
        html += `</div>`;

        body.innerHTML = html;

        // --- interactions ---
        body.querySelector('#ftg-prev').onclick = () => { if (selectedDay > 0) { selectedDay--; render(); } };
        body.querySelector('#ftg-next').onclick = () => { if (selectedDay < tl.days.length - 1) { selectedDay++; render(); } };
        body.querySelectorAll('[data-day]').forEach(el => {
            el.addEventListener('click', () => { selectedDay = +el.dataset.day; render(); });
        });
        const setMaxBtn = body.querySelector('#ftg-setmax');
        if (setMaxBtn) setMaxBtn.onclick = () => { try { openMaxModal(); } catch (e) {} };
    }

    // ----------------------------------------------------------- ouvrir/fermer
    function open() {
        opened = true;
        drawer.classList.add('open');
        refresh();
        startObserving();
        // Clic en dehors du volet → fermeture (comme les autres volets).
        // setTimeout pour ne pas capter le clic d'ouverture lui-même.
        setTimeout(() => {
            document.addEventListener('mousedown', onDocPointer, true);
            document.addEventListener('touchstart', onDocPointer, true);
        }, 0);
        // Les 1RM (benchmaster_maxes) ne mutent pas toujours le tableau :
        // on surveille leur valeur pour rafraîchir dès qu'un max est défini/modifié.
        lastMaxes = localStorage.getItem('benchmaster_maxes') || '';
        maxesWatcher = setInterval(() => {
            const cur = localStorage.getItem('benchmaster_maxes') || '';
            if (cur !== lastMaxes) { lastMaxes = cur; scheduleRefresh(); }
        }, 800);
    }
    function close() {
        opened = false;
        drawer.classList.remove('open');
        document.removeEventListener('mousedown', onDocPointer, true);
        document.removeEventListener('touchstart', onDocPointer, true);
        clearInterval(maxesWatcher); maxesWatcher = null;
    }
    function toggle() { opened ? close() : open(); }

    // -------------------------------------------- surveillance temps réel
    function scheduleRefresh() {
        if (!opened) return;
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(refresh, 250);
    }
    function startObserving() {
        if (observer) { refresh(); return; }
        const table = document.getElementById('weekTable');
        if (table) {
            observer = new MutationObserver(scheduleRefresh);
            observer.observe(table, { childList: true, subtree: true, attributes: true, characterData: true });
        }
        // date de début du programme
        document.getElementById('start-date')?.addEventListener('change', scheduleRefresh);
        // synchro inter-onglets
        if (typeof BroadcastChannel !== 'undefined') {
            const ch = new BroadcastChannel('benchmaster_sync');
            ch.onmessage = e => { if (e.data && e.data.key === 'benchmaster_client_program') scheduleRefresh(); };
        }
        window.addEventListener('storage', e => { if (e.key === 'benchmaster_client_program') scheduleRefresh(); });
    }

    // ----------------------------------------------------------------- init
    function init() {
        if (typeof FatigueModel === 'undefined') { console.error('[FatiguePanel] fatigue-model.js manquant'); return; }
        build();
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();

    window.FatiguePanel = { open, close, toggle, refresh, get isOpen() { return opened; } };
})();
