// ======================== TABLEAU ========================
const tbody = document.querySelector('#weekTable tbody');

// Exercice en cours de déplacement (drag interne PC). Null = drag depuis la sidebar.
let draggedExo = null;

// Élément .placed-exo devant lequel insérer, selon la position verticale du curseur.
function getDragAfterElement(cell, y) {
    const els = [...cell.querySelectorAll('.placed-exo:not(.dragging)')];
    let closest = null, closestOffset = -Infinity;
    els.forEach(child => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closestOffset) { closestOffset = offset; closest = child; }
    });
    return closest; // null => insérer en fin
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
        const cell = row.cells[d];
        const items = [];
        Array.from(cell.querySelectorAll('.placed-exo')).forEach(el => {
            if (el.dataset.cardType==='muscu') items.push({cardType:'muscu',id:el.dataset.id,name:el.dataset.name,emoji:el.dataset.emoji,color:el.dataset.color,trainingMode:el.dataset.trainingMode||'normal',setsData:el.dataset.setsData,pyramideConfig:el.dataset.pyramideConfig||null,progressionConfig:el.dataset.progressionConfig||null});
            else if (el.dataset.cardType==='run') items.push({cardType:'run',runId:el.dataset.runId,name:el.dataset.name,emoji:el.dataset.emoji,color:el.dataset.color,runData:el.dataset.runData});
            else if (el.dataset.cardType==='hyrox') items.push({cardType:'hyrox',hyroxId:el.dataset.hyroxId,name:el.dataset.name,emoji:el.dataset.emoji,color:el.dataset.color,hyroxData:el.dataset.hyroxData});
            else if (el.dataset.cardType==='cardio') items.push({cardType:'cardio',cardioId:el.dataset.cardioId,name:el.dataset.name,emoji:el.dataset.emoji,color:el.dataset.color,cardioData:el.dataset.cardioData});
        });
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
function pasteWeek(targetRow) {
    if (!weekClipboard) return;
    for (let d=1; d<=7; d++) {
        targetRow.cells[d].querySelectorAll('.placed-exo').forEach(el=>el.remove());
    }
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
        if (item.cardType==='muscu') {
            const exoData=exerciseLibrary.find(e=>e.id===item.id); if(!exoData)return;
            const el=document.createElement('div'); el.className='placed-exo';
            el.dataset.id=item.id; el.dataset.name=item.name; el.dataset.emoji=exoData.emoji; el.dataset.color=exoData.color;
            el.dataset.trainingMode=item.trainingMode||'normal'; el.dataset.cardType='muscu';
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
    const count = cell.querySelectorAll('.placed-exo').length;
    const hasClip = !!dayClipboard;
    const menu = document.createElement('div');
    menu.id = 'week-ctx-menu'; // même id → removeContextMenu / Escape le ferment
    menu.style.cssText = `position:fixed;z-index:9999;background:#2c2c2e;border:1px solid #48484a;border-radius:12px;padding:6px 0;min-width:180px;box-shadow:0 8px 30px rgba(0,0,0,0.5);font-size:13px;`;
    const items = [
        { label:'📋  Copier la journée', fn: ()=>copyDay(cell), disabled: count === 0 },
        { label:'📌  Coller ici' + (hasClip ? ` (${dayClipboard.length})` : ''), fn: ()=>pasteDay(cell), disabled: !hasClip, paste: true },
        { sep: true },
        { label:'🗑  Vider la journée', fn: ()=>clearDay(cell), danger: true, disabled: count === 0 },
    ];
    items.forEach(item => {
        if (item.sep) { const s=document.createElement('div');s.style.cssText='height:1px;background:#48484a;margin:4px 0;';menu.appendChild(s);return; }
        const btn = document.createElement('button');
        const col = item.disabled ? '#555' : item.danger ? 'var(--red)' : (item.paste && hasClip) ? 'var(--green)' : 'var(--text)';
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

// ── INVERSER / COPIER / COLLER / VIDER UNE JOURNÉE ───────────────────────────
function serializeDay(cell) {
    const items = [];
    Array.from(cell.querySelectorAll('.placed-exo')).forEach(el => {
        if (el.dataset.cardType==='muscu') items.push({cardType:'muscu',id:el.dataset.id,name:el.dataset.name,emoji:el.dataset.emoji,color:el.dataset.color,trainingMode:el.dataset.trainingMode||'normal',setsData:el.dataset.setsData,pyramideConfig:el.dataset.pyramideConfig||null,progressionConfig:el.dataset.progressionConfig||null});
        else if (el.dataset.cardType==='run') items.push({cardType:'run',runId:el.dataset.runId,name:el.dataset.name,emoji:el.dataset.emoji,color:el.dataset.color,runData:el.dataset.runData});
        else if (el.dataset.cardType==='hyrox') items.push({cardType:'hyrox',hyroxId:el.dataset.hyroxId,name:el.dataset.name,emoji:el.dataset.emoji,color:el.dataset.color,hyroxData:el.dataset.hyroxData});
        else if (el.dataset.cardType==='cardio') items.push({cardType:'cardio',cardioId:el.dataset.cardioId,name:el.dataset.name,emoji:el.dataset.emoji,color:el.dataset.color,cardioData:el.dataset.cardioData});
    });
    return items;
}
function copyDay(cell) {
    dayClipboard = serializeDay(cell);
    flashCell(cell);
}
function pasteDay(cell) {
    if (!dayClipboard) return;
    cell.querySelectorAll('.placed-exo').forEach(el => el.remove());
    restoreItemsInCell(cell, dayClipboard);
    flashCell(cell);
    syncClientProgram();
}
function clearDay(cell) {
    cell.querySelectorAll('.placed-exo').forEach(el => el.remove());
    syncClientProgram();
}
function flashCell(cell) {
    cell.style.outline = '2px solid var(--accent)';
    cell.style.outlineOffset = '-2px';
    setTimeout(() => { cell.style.outline=''; cell.style.outlineOffset=''; }, 600);
}

// ── DUPLICATION ──────────────────────────────────────────────────────────────
function duplicateRow(srcRow) {
    addRow();
    const newRow = tbody.rows[tbody.rows.length-1];
    pasteWeek_fromRow(srcRow, newRow);
    updateTableAndDeload();
}
function pasteWeek_fromRow(srcRow, dstRow) {
    dstRow.cells[0].setAttribute('data-deload', srcRow.cells[0].getAttribute('data-deload')||'false');
    for (let d=1; d<=7; d++) {
        const srcCell=srcRow.cells[d]; const dstCell=dstRow.cells[d];
        dstCell.querySelectorAll('.placed-exo').forEach(el=>el.remove());
        Array.from(srcCell.querySelectorAll('.placed-exo')).forEach(srcEl=>{
            const clone=srcEl.cloneNode(true);
            if (srcEl.dataset.cardType==='muscu') attachMuscuHandlers(clone);
            else if (srcEl.dataset.cardType==='run') attachRunHandlers(clone);
            else if (srcEl.dataset.cardType==='hyrox') attachHyroxHandlers(clone);
            else if (srcEl.dataset.cardType==='cardio') attachCardioHandlers(clone);
            dstCell.appendChild(clone);
        });
    }
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
            // Drag interne : on réordonne en direct (l'exercice suit le curseur).
            if (draggedExo) {
                e.dataTransfer.dropEffect = 'move';
                const after = getDragAfterElement(cell, e.clientY);
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