// ======================== TABLEAU ========================
const tbody = document.querySelector('#weekTable tbody');

// Exercice en cours de déplacement (drag interne PC). Null = drag depuis la sidebar.
let draggedExo = null;

// Enfant DIRECT devant lequel insérer, selon la position Y (sélecteur paramétrable).
function getDragAfterElement(container, y, sel) {
    sel = sel || ':scope > .placed-exo:not(.dragging)';
    const els = [...container.querySelectorAll(sel)];
    let closest = null, closestOffset = -Infinity;
    els.forEach(child => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closestOffset) { closestOffset = offset; closest = child; }
    });
    return closest; // null => insérer en fin
}
const isBoxEl = el => el && el.classList && el.classList.contains('circuit-box');

// Zone de drop de l'INTÉRIEUR d'un circuit (n'accepte que des exercices).
// Si on glisse un circuit, on laisse l'évènement remonter à la cellule (pas de circuit imbriqué).
function setupDropZone(zone) {
    zone.ondragover = e => {
        if (isBoxEl(draggedExo)) return; // circuit → géré par la cellule
        e.preventDefault(); e.stopPropagation();
        zone.classList.add('over');
        if (draggedExo) {
            e.dataTransfer.dropEffect = 'move';
            const after = getDragAfterElement(zone, e.clientY);
            if (after == null) zone.appendChild(draggedExo); else zone.insertBefore(draggedExo, after);
        }
    };
    zone.ondragleave = () => zone.classList.remove('over');
    zone.ondrop = e => {
        if (isBoxEl(draggedExo)) return; // laisse la cellule gérer le circuit
        e.preventDefault(); e.stopPropagation(); zone.classList.remove('over');
        closeFloatingSearch();
        if (draggedExo) { syncClientProgram(); return; }
        const id = e.dataTransfer.getData('text/plain');
        if (!id || id === 'box:') return;
        if (id.startsWith('run:')) createPlacedRun(zone, id.slice(4));
        else if (id.startsWith('hyrox:')) createPlacedHyrox(zone, id.slice(6));
        else if (id.startsWith('cardio:')) createPlacedCardio(zone, id.slice(7));
        else createPlacedExercise(zone, id);
        syncClientProgram();
    };
}

// ── Date par semaine ──────────────────────────────────────────────────────────
function getWeekStartLabel(idx) {
    const raw = document.getElementById('start-date').value;
    if (!raw) return '';
    const d = new Date(raw+'T00:00:00');
    d.setDate(d.getDate() + idx*7);
    return d.toLocaleDateString('fr-FR', {day:'numeric', month:'short'});
}

function updateWeekDisplay(weekCell, weekNumber, isDeload) {
    weekCell.innerHTML = '';
    const lbl = document.createElement('span');
    lbl.style.cssText = 'font-weight:800;font-size:13px;display:block;';
    lbl.textContent = 'Sem ' + weekNumber;
    weekCell.appendChild(lbl);
    const dl = getWeekStartLabel(weekNumber-1);
    if (dl) {
        const s = document.createElement('span');
        s.style.cssText = 'font-size:9px;color:var(--text-dim);font-weight:500;display:block;';
        s.textContent = dl;
        weekCell.appendChild(s);
    }
    if (isDeload) {
        const b = document.createElement('span');
        b.textContent = 'Deload';
        b.style.cssText = 'font-size:9px;font-weight:600;background:rgba(10,132,255,0.18);border-radius:10px;padding:2px 5px;color:var(--accent);display:inline-block;margin-top:2px;';
        weekCell.appendChild(b);
    }
}

function updateTableAndDeload() {
    const rowCount = tbody.rows.length;
    Array.from(tbody.rows).forEach((row, idx) => {
        const wc = row.cells[0];
        const n = idx+1;
        if (!wc.hasAttribute('data-deload')) wc.setAttribute('data-deload','false');
        const isDl = wc.getAttribute('data-deload')==='true';
        updateWeekDisplay(wc, n, isDl);
        wc.onclick = e => {
            if (e.target.closest('.week-ctx-btn')) return;
            const cur = wc.getAttribute('data-deload')==='true';
            wc.setAttribute('data-deload', cur?'false':'true');
            updateWeekDisplay(wc, n, !cur);
        };
        wc.style.cursor = 'pointer';
        wc.title = isDl ? 'Cliquer pour retirer le Deload' : 'Cliquer pour marquer Deload';
        let ctxBtn = wc.querySelector('.week-ctx-btn');
        if (!ctxBtn) {
            ctxBtn = document.createElement('button');
            ctxBtn.className = 'week-ctx-btn';
            ctxBtn.textContent = '⋮';
            ctxBtn.title = 'Options de la semaine';
            ctxBtn.onclick = e => { e.stopPropagation(); showWeekContextMenu(e, row); };
            wc.appendChild(ctxBtn);
        }
    });
    document.getElementById('btnDel').disabled = rowCount <= 1;
}

function refreshWeekDates() {
    Array.from(tbody.rows).forEach((row, idx) => {
        const wc = row.cells[0];
        updateWeekDisplay(wc, idx+1, wc.getAttribute('data-deload')==='true');
    });
}

// ── CONTEXT MENU SEMAINE ─────────────────────────────────────────────────────
function showWeekContextMenu(e, row) {
    removeContextMenu();
    const menu = document.createElement('div');
    menu.id = 'week-ctx-menu';
    menu.style.cssText = `position:fixed;z-index:9999;background:#2c2c2e;border:1px solid #48484a;border-radius:12px;padding:6px 0;min-width:170px;box-shadow:0 8px 30px rgba(0,0,0,0.5);font-size:13px;`;
    const idx = Array.from(tbody.rows).indexOf(row);
    const hasClip = !!weekClipboard;
    const items = [
        { label:'⧉  Dupliquer cette semaine', fn: ()=>{ duplicateRow(row); } },
        { label:'📋  Copier la semaine', fn: ()=>{ copyWeek(row); } },
        { label: hasClip ? '📌  Coller ici' : '📌  Coller ici', fn: ()=>{ pasteWeek(row); }, disabled: !hasClip },
        { sep: true },
        { label:'🗑  Supprimer cette ligne', fn: ()=>{ removeSpecificRow(idx); }, danger: true },
    ];
    items.forEach(item => {
        if (item.sep) { const s=document.createElement('div');s.style.cssText='height:1px;background:#48484a;margin:4px 0;';menu.appendChild(s);return; }
        const btn = document.createElement('button');
        btn.style.cssText = `width:100%;background:none;border:none;color:${item.danger?'var(--red)':item.disabled?'#555':item.label.includes('Coller')&&hasClip?'var(--green)':'var(--text)'};text-align:left;padding:9px 16px;cursor:${item.disabled?'default':'pointer'};font-size:13px;font-family:inherit;transition:background .1s;`;
        btn.textContent = item.label;
        if (!item.disabled) {
            btn.onmouseenter = () => btn.style.background='rgba(255,255,255,0.06)';
            btn.onmouseleave = () => btn.style.background='none';
            btn.onclick = () => { item.fn(); removeContextMenu(); };
        }
        menu.appendChild(btn);
    });
    const rect = e.currentTarget ? e.currentTarget.getBoundingClientRect() : {right:e.clientX,bottom:e.clientY};
    let left = rect.right + 6;
    let top = e.clientY - 10;
    document.body.appendChild(menu);
    const mw = menu.offsetWidth, mh = menu.offsetHeight;
    if (left + mw > window.innerWidth - 10) left = e.clientX - mw - 6;
    if (top + mh > window.innerHeight - 10) top = window.innerHeight - mh - 10;
    menu.style.left = left + 'px';
    menu.style.top  = top  + 'px';
    setTimeout(() => document.addEventListener('click', removeContextMenu, {once:true}), 10);
}
function removeContextMenu() {
    const m = document.getElementById('week-ctx-menu');
    if (m) m.remove();
}

// ── COPIER / COLLER SEMAINE ──────────────────────────────────────────────────
function serializeRow(row) {
    const days = {};
    for (let d=1; d<=7; d++) {
        const items = serializeDay(row.cells[d]); // box-aware
        if (items.length) days[d] = items;
    }
    return { deload: row.cells[0].getAttribute('data-deload')||'false', days };
}
function copyWeek(row) {
    weekClipboard = serializeRow(row);
    const wc = row.cells[0];
    wc.style.outline = '2px solid var(--accent)';
    setTimeout(() => wc.style.outline='', 800);
}
function clearCellContent(cell) {
    cell.querySelectorAll(':scope > .placed-exo, :scope > .circuit-box').forEach(el => el.remove());
}
function pasteWeek(targetRow) {
    if (!weekClipboard) return;
    for (let d=1; d<=7; d++) clearCellContent(targetRow.cells[d]);
    const data = weekClipboard;
    targetRow.cells[0].setAttribute('data-deload', data.deload);
    for (const [dStr, items] of Object.entries(data.days)) {
        const cell = targetRow.cells[parseInt(dStr)];
        restoreItemsInCell(cell, items);
    }
    updateTableAndDeload();
    syncClientProgram();
}
function restoreItemsInCell(cell, items) {
    items.forEach(item => {
        if (item.cardType==='box') {
            const box = createBox(cell, { name:item.name, rounds:item.rounds, restSec:item.restSec });
            restoreItemsInCell(box.querySelector('.box-drop'), item.items || []);
            return;
        }
        if (item.cardType==='muscu') {
            const exoData=exerciseLibrary.find(e=>e.id===item.id); if(!exoData)return;
            const el=document.createElement('div'); el.className='placed-exo';
            el.dataset.id=item.id; el.dataset.name=item.name; el.dataset.emoji=exoData.emoji; el.dataset.color=exoData.color;
            el.dataset.trainingMode=item.trainingMode||'normal'; el.dataset.cardType='muscu';
            if (exoData.unit) el.dataset.unit=exoData.unit;
            if (item.pyramideConfig) el.dataset.pyramideConfig=item.pyramideConfig;
            if (item.progressionConfig) el.dataset.progressionConfig=item.progressionConfig;
            el.style.backgroundColor=exoData.color+"22"; el.style.borderLeft=`3px solid ${exoData.color}`;
            el.dataset.setsData=item.setsData||'[]';
            updateExoDisplay(el); attachMuscuHandlers(el); el.draggable=true; cell.appendChild(el);
        } else if (item.cardType==='run') {
            const runData=runLibrary.find(r=>r.id===item.runId); if(!runData)return;
            const el=document.createElement('div'); el.className='placed-exo placed-run';
            el.dataset.runId=item.runId; el.dataset.cardType='run'; el.dataset.name=runData.name; el.dataset.emoji=runData.emoji; el.dataset.color=runData.color;
            el.style.backgroundColor=runData.color+"22"; el.style.borderLeft=`3px solid ${runData.color}`;
            el.dataset.runData=item.runData;
            updateRunDisplay(el); attachRunHandlers(el); el.draggable=true; cell.appendChild(el);
        } else if (item.cardType==='hyrox') {
            const hData=hyroxLibrary.find(h=>h.id===item.hyroxId); if(!hData)return;
            const el=document.createElement('div'); el.className='placed-exo placed-hyrox';
            el.dataset.hyroxId=item.hyroxId; el.dataset.cardType='hyrox'; el.dataset.name=hData.name; el.dataset.emoji=hData.emoji; el.dataset.color=hData.color;
            el.style.backgroundColor=hData.color+"22"; el.style.borderLeft=`3px solid ${hData.color}`;
            el.dataset.hyroxData=item.hyroxData;
            updateHyroxDisplay(el); attachHyroxHandlers(el); el.draggable=true; cell.appendChild(el);
        } else if (item.cardType==='cardio') {
            const cData=cardioLibrary.find(c=>c.id===item.cardioId); if(!cData)return;
            const el=document.createElement('div'); el.className='placed-exo placed-cardio';
            el.dataset.cardioId=item.cardioId; el.dataset.cardType='cardio'; el.dataset.name=cData.name; el.dataset.emoji=cData.emoji; el.dataset.color=cData.color;
            el.style.backgroundColor=cData.color+"22"; el.style.borderLeft=`3px solid ${cData.color}`;
            el.dataset.cardioData=item.cardioData;
            updateCardioDisplay(el); attachCardioHandlers(el); el.draggable=true; cell.appendChild(el);
        }
    });
}

// ── CONTEXT MENU JOUR (cellule) ──────────────────────────────────────────────
function showDayContextMenu(e, cell) {
    removeContextMenu();
    const count = cell.querySelectorAll(':scope > .placed-exo, :scope > .circuit-box').length;
    const hasClip = !!dayClipboard;
    const menu = document.createElement('div');
    menu.id = 'week-ctx-menu'; // même id → removeContextMenu / Escape le ferment
    menu.style.cssText = `position:fixed;z-index:9999;background:#2c2c2e;border:1px solid #48484a;border-radius:12px;padding:6px 0;min-width:180px;box-shadow:0 8px 30px rgba(0,0,0,0.5);font-size:13px;`;
    const items = [
        { label:'🔁  Créer un circuit', fn: ()=>{ createBox(cell, {}); syncClientProgram(); } },
        { label:'📋  Copier la journée', fn: ()=>copyDay(cell), disabled: count === 0 },
        { label:'📌  Coller la journée' + (hasClip ? ` (${dayClipboard.length})` : ''), fn: ()=>pasteDay(cell), disabled: !hasClip, paste: true },
        { label:'➕  Coller l\'exercice' + (exoClipboard ? ` · ${exoClipboard.name||''}` : ''), fn: ()=>pasteExo(cell), disabled: !exoClipboard, paste: true },
        { label:'🔁  Coller le circuit' + (boxClipboard ? ` · ${boxClipboard.name||''}` : ''), fn: ()=>pasteBox(cell), disabled: !boxClipboard, paste: true },
        { sep: true },
        { label:'🗑  Vider la journée', fn: ()=>clearDay(cell), danger: true, disabled: count === 0 },
    ];
    _renderCtxMenu(e, menu, items);
}

// Rendu commun d'un menu contextuel (boutons + positionnement).
function _renderCtxMenu(e, menu, items) {
    items.forEach(item => {
        if (item.sep) { const s=document.createElement('div');s.style.cssText='height:1px;background:#48484a;margin:4px 0;';menu.appendChild(s);return; }
        const btn = document.createElement('button');
        const col = item.disabled ? '#555' : item.danger ? 'var(--red)' : item.paste ? 'var(--green)' : 'var(--text)';
        btn.style.cssText = `width:100%;background:none;border:none;color:${col};text-align:left;padding:9px 16px;cursor:${item.disabled?'default':'pointer'};font-size:13px;font-family:inherit;transition:background .1s;`;
        btn.textContent = item.label;
        if (!item.disabled) {
            btn.onmouseenter = () => btn.style.background='rgba(255,255,255,0.06)';
            btn.onmouseleave = () => btn.style.background='none';
            btn.onclick = () => { item.fn(); removeContextMenu(); };
        }
        menu.appendChild(btn);
    });
    document.body.appendChild(menu);
    const mw = menu.offsetWidth, mh = menu.offsetHeight;
    let left = e.clientX + 4, top = e.clientY - 6;
    if (left + mw > window.innerWidth - 10) left = e.clientX - mw - 4;
    if (top + mh > window.innerHeight - 10) top = window.innerHeight - mh - 10;
    menu.style.left = left + 'px';
    menu.style.top  = top  + 'px';
    setTimeout(() => document.addEventListener('click', removeContextMenu, {once:true}), 10);
}

// ── CONTEXT MENU EXERCICE (clic droit sur une carte) ─────────────────────────
function showExoContextMenu(e, el) {
    removeContextMenu();
    const cell = el.parentElement; // conteneur direct : cellule OU intérieur d'un circuit
    const menu = document.createElement('div');
    menu.id = 'week-ctx-menu';
    menu.style.cssText = `position:fixed;z-index:9999;background:#2c2c2e;border:1px solid #48484a;border-radius:12px;padding:6px 0;min-width:190px;box-shadow:0 8px 30px rgba(0,0,0,0.5);font-size:13px;`;
    const hasClip = !!exoClipboard;
    const items = [
        { label:'📋  Copier l\'exercice', fn: ()=>copyExo(el) },
        { label:'⧉  Dupliquer ici', fn: ()=>duplicateExo(el) },
        { label:'📌  Coller ici' + (hasClip ? ` · ${exoClipboard.name||''}` : ''), fn: ()=>pasteExo(cell), disabled: !hasClip, paste: true },
        { sep: true },
        { label:'🗑  Supprimer', fn: ()=>{ el.remove(); syncClientProgram(); }, danger: true },
    ];
    _renderCtxMenu(e, menu, items);
}

// ── CONTEXT MENU CIRCUIT (clic droit sur une box) ────────────────────────────
function showBoxContextMenu(e, box) {
    removeContextMenu();
    const cell = box.parentElement;
    const menu = document.createElement('div');
    menu.id = 'week-ctx-menu';
    menu.style.cssText = `position:fixed;z-index:9999;background:#2c2c2e;border:1px solid #48484a;border-radius:12px;padding:6px 0;min-width:200px;box-shadow:0 8px 30px rgba(0,0,0,0.5);font-size:13px;`;
    const hasClip = !!boxClipboard;
    const items = [
        { label:'📋  Copier le circuit', fn: ()=>copyBox(box) },
        { label:'⧉  Dupliquer le circuit', fn: ()=>duplicateBox(box) },
        { label:'📌  Coller un circuit' + (hasClip ? ` · ${boxClipboard.name||''}` : ''), fn: ()=>pasteBox(cell), disabled: !hasClip, paste: true },
        { sep: true },
        { label:'🗑  Supprimer le circuit', fn: ()=>{ box.remove(); syncClientProgram(); }, danger: true },
    ];
    _renderCtxMenu(e, menu, items);
}

// ── SÉRIALISATION ────────────────────────────────────────────────────────────
// Sérialise UN exercice placé (avec toutes ses données) en objet réutilisable.
function serializeExoEl(el) {
    const d = el.dataset;
    if (d.cardType==='muscu') return {cardType:'muscu',id:d.id,name:d.name,emoji:d.emoji,color:d.color,trainingMode:d.trainingMode||'normal',setsData:d.setsData,pyramideConfig:d.pyramideConfig||null,progressionConfig:d.progressionConfig||null};
    if (d.cardType==='run')   return {cardType:'run',runId:d.runId,name:d.name,emoji:d.emoji,color:d.color,runData:d.runData};
    if (d.cardType==='hyrox') return {cardType:'hyrox',hyroxId:d.hyroxId,name:d.name,emoji:d.emoji,color:d.color,hyroxData:d.hyroxData};
    if (d.cardType==='cardio')return {cardType:'cardio',cardioId:d.cardioId,name:d.name,emoji:d.emoji,color:d.color,cardioData:d.cardioData};
    return null;
}

// Sérialise un circuit (box) et ses exercices.
function serializeBox(box) {
    return {
        cardType: 'box',
        name: box.dataset.boxName || 'Circuit',
        rounds: parseInt(box.dataset.rounds) || 1,
        restSec: parseInt(box.dataset.restSec) || 0,
        items: Array.from(box.querySelectorAll('.box-drop > .placed-exo')).map(serializeExoEl).filter(Boolean)
    };
}

// ── INVERSER / COPIER / COLLER / VIDER UNE JOURNÉE ───────────────────────────
// Sérialise les items de 1er niveau (exercices ET circuits) dans l'ordre.
function serializeDay(cell) {
    const out = [];
    Array.from(cell.children).forEach(ch => {
        if (ch.classList.contains('placed-exo')) { const it = serializeExoEl(ch); if (it) out.push(it); }
        else if (ch.classList.contains('circuit-box')) out.push(serializeBox(ch));
    });
    return out;
}
function copyDay(cell) {
    dayClipboard = serializeDay(cell);
    flashCell(cell);
}

// ── COPIER / COLLER UN EXERCICE SEUL (ajoute sans écraser la journée) ────────
function copyExo(el) {
    const item = serializeExoEl(el);
    if (!item) return;
    exoClipboard = item;
    el.style.outline = '2px solid var(--accent)'; el.style.outlineOffset = '-1px';
    setTimeout(() => { el.style.outline=''; el.style.outlineOffset=''; }, 600);
}
function pasteExo(cell) {
    if (!exoClipboard || !cell) return;
    restoreItemsInCell(cell, [exoClipboard]); // AJOUTE l'exercice, ne vide pas la cellule
    flashCell(cell);
    syncClientProgram();
}
function duplicateExo(el) {
    const cont = el.parentElement; if (!cont) return; // même conteneur (cellule ou box)
    restoreItemsInCell(cont, [serializeExoEl(el)].filter(Boolean));
    syncClientProgram();
}

// ── COPIER / COLLER / DUPLIQUER UN CIRCUIT (box + ses exercices) ─────────────
function copyBox(box) {
    boxClipboard = serializeBox(box);
    flashCell(box);
}
function pasteBox(cell) {
    if (!boxClipboard || !cell) return;
    restoreItemsInCell(cell, [boxClipboard]); // ajoute un nouveau circuit
    flashCell(cell);
    syncClientProgram();
}
function duplicateBox(box) {
    const cell = box.parentElement; if (!cell) return;
    restoreItemsInCell(cell, [serializeBox(box)]);
    syncClientProgram();
}
function pasteDay(cell) {
    if (!dayClipboard) return;
    clearCellContent(cell);
    restoreItemsInCell(cell, dayClipboard);
    flashCell(cell);
    syncClientProgram();
}
function clearDay(cell) {
    clearCellContent(cell);
    syncClientProgram();
}
function flashCell(cell) {
    cell.style.outline = '2px solid var(--accent)';
    cell.style.outlineOffset = '-2px';
    setTimeout(() => { cell.style.outline=''; cell.style.outlineOffset=''; }, 600);
}

// ── DUPLICATION ──────────────────────────────────────────────────────────────
// Passe par la sérialisation (box-aware) plutôt que le clonage DOM.
function duplicateRow(srcRow) {
    const data = serializeRow(srcRow);
    addRow();
    const newRow = tbody.rows[tbody.rows.length-1];
    newRow.cells[0].setAttribute('data-deload', data.deload);
    for (const [dStr, items] of Object.entries(data.days)) restoreItemsInCell(newRow.cells[parseInt(dStr)], items);
    updateTableAndDeload();
    syncClientProgram();
}

// ── AJOUT / SUPPRESSION LIGNES ───────────────────────────────────────────────
function addRow() {
    const row = tbody.insertRow();
    const weekCell = row.insertCell();
    weekCell.className = 'col-week';
    weekCell.style.cssText = 'text-align:center;vertical-align:middle;';
    weekCell.addEventListener('contextmenu', e=>{ e.preventDefault(); showWeekContextMenu(e, row); });
    for (let i=0; i<7; i++) {
        const cell = row.insertCell(); cell.className='drop-zone';
        cell.ondragover = e=>{
            e.preventDefault(); cell.classList.add('over');
            // Drag interne : on réordonne en direct (exercice OU circuit) au 1er niveau.
            if (draggedExo) {
                e.dataTransfer.dropEffect = 'move';
                const after = getDragAfterElement(cell, e.clientY, ':scope > .placed-exo:not(.dragging), :scope > .circuit-box:not(.dragging)');
                if (after == null) cell.appendChild(draggedExo);
                else cell.insertBefore(draggedExo, after);
            }
        };
        cell.ondragleave = ()=>cell.classList.remove('over');
        cell.ondrop = e=>{
            e.preventDefault(); cell.classList.remove('over');
            closeFloatingSearch();
            // Drag interne : l'élément est déjà à sa place (déplacé pendant ondragover).
            if (draggedExo) { syncClientProgram(); return; }
            // Drag depuis la sidebar : on crée un nouvel exercice.
            const id=e.dataTransfer.getData('text/plain');
            if (!id || id==='box:') return;
            if (id.startsWith('run:')) createPlacedRun(cell,id.slice(4));
            else if (id.startsWith('hyrox:')) createPlacedHyrox(cell,id.slice(6));
            else if (id.startsWith('cardio:')) createPlacedCardio(cell,id.slice(7));
            else createPlacedExercise(cell,id);
            syncClientProgram();
        };
        // Click on empty area of cell opens floating search (desktop only)
        cell.addEventListener('click', e => {
            if (window.innerWidth <= 768) return; // handled by mobile.js
            // Open if click is on the cell itself or its padding, not on a card
            if (!e.target.closest('.placed-exo') && !e.target.closest('.day-ctx-btn')) {
                openFloatingSearch(cell);
            }
        });
        // Clic droit = menu de la journée (inverser / copier / coller / vider)
        cell.addEventListener('contextmenu', e => { e.preventDefault(); showDayContextMenu(e, cell); });
        // Bouton ⋮ (visible au survol) pour la découvrabilité
        const dayBtn = document.createElement('button');
        dayBtn.className = 'day-ctx-btn';
        dayBtn.textContent = '⋮';
        dayBtn.title = 'Options de la journée';
        dayBtn.onclick = e => { e.stopPropagation(); showDayContextMenu(e, cell); };
        cell.appendChild(dayBtn);
    }
    updateTableAndDeload();
}
function removeRow() { if (tbody.rows.length>1) { tbody.deleteRow(-1); updateTableAndDeload(); syncClientProgram(); } }
function removeSpecificRow(idx) {
    if (tbody.rows.length<=1) return;
    tbody.deleteRow(idx);
    updateTableAndDeload();
    syncClientProgram();
}

// ── HANDLERS FACTORISÉS ───────────────────────────────────────────────────────
// Drag PC = DÉPLACEMENT (réordonner / changer de jour) en préservant les données.
// L'élément lui-même est déplacé pendant ondragover (voir addRow), plus de recréation.
function _makeDraggable(el, getDragId) {
    el.draggable = true;
    el.ondragstart = e => {
        e.stopPropagation();
        e.dataTransfer.setData('text/plain', getDragId());
        e.dataTransfer.effectAllowed = 'move';
        draggedExo = el;
        setTimeout(() => el.classList.add('dragging'), 0);
    };
    el.ondragend = () => { el.classList.remove('dragging'); draggedExo = null; syncClientProgram(); };
    // Clic droit = menu de l'exercice (copier / coller ici / dupliquer / supprimer)
    el.addEventListener('contextmenu', e => { e.preventDefault(); e.stopPropagation(); showExoContextMenu(e, el); });
}
function attachMuscuHandlers(el) {
    el.onclick=e=>{ if(e.target.classList.contains('delete-btn')){ el.remove(); syncClientProgram(); } else openEditModal(el); };
    _makeDraggable(el, () => el.dataset.id);
}
function attachRunHandlers(el) {
    el.onclick=e=>{ if(e.target.classList.contains('delete-btn')){ el.remove(); syncClientProgram(); } else openRunModal(el); };
    _makeDraggable(el, () => 'run:'+el.dataset.runId);
}
function attachHyroxHandlers(el) {
    el.onclick=e=>{ if(e.target.classList.contains('delete-btn')){ el.remove(); syncClientProgram(); } else openHyroxModal(el); };
    _makeDraggable(el, () => 'hyrox:'+el.dataset.hyroxId);
}
function attachCardioHandlers(el) {
    el.onclick=e=>{ if(e.target.classList.contains('delete-btn')){ el.remove(); syncClientProgram(); } else openCardioModal(el); };
    _makeDraggable(el, () => 'cardio:'+el.dataset.cardioId);
}