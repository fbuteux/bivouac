// ======================== MODAL MUSCU ========================
const PYRA_MODES = ['pyramide','progressif','degressif'];

function openEditModal(el) {
    currentEditingEl = el;
    const exoData=exerciseLibrary.find(ex=>ex.id===el.dataset.id);
    const mat=materiels.find(m=>m.id===exoData.materielId);
    document.getElementById('modal-title').innerText=`${el.dataset.emoji} ${el.dataset.name}`;
    document.getElementById('modal-materiel-desc').innerText=`Matériel : ${mat.name}${mat.step>0?' (Pas de '+mat.step+'kg)':''}`;
    const mode=el.dataset.trainingMode||'normal';
    document.getElementById('training-mode-select').value=mode;

    // Restaurer config pyramide
    const pc=el.dataset.pyramideConfig?JSON.parse(el.dataset.pyramideConfig):{kgStep:mat.step||5,repsStep:2,topRep:3};
    editingPyraKgStep = pc.kgStep ?? (mat.step||5);
    editingPyraRepsStep = pc.repsStep ?? 2;
    editingPyraTopRep = pc.topRep ?? 3;

    const kgIn=document.getElementById('pyra-kg-step');
    kgIn.value=editingPyraKgStep; kgIn.step=mat.step||1; kgIn.min=0;
    document.getElementById('pyra-reps-step-val').value=editingPyraRepsStep;
    document.getElementById('pyra-top-rep').value=editingPyraTopRep;

    refreshForcePanelInfo(exoData);
    onModeChange(mode, false);
    document.getElementById('sets-container').innerHTML='';
    JSON.parse(el.dataset.setsData).forEach(s=>addSetRow(s.reps,s.weight||0,s.tech,s.pct,s.restMin||0,s.restSec||0));
    initProgControl(exoData);
    showModalError('modal-save-error','');
    document.getElementById('modal-edit-overlay').style.display='flex';
}

function refreshForcePanelInfo(exoData) {
    const maxVal=maxTargets[exoData.id];
    const panel=document.getElementById('force-config-panel'); if(!panel) return;
    if (maxVal) {
        panel.innerHTML=`<div style="display:flex;align-items:center;gap:10px;flex:1;"><div style="font-size:11px;color:var(--text-dim);flex:1;">1RM cible : <strong style="color:var(--text);">${maxVal} kg</strong> — charges auto.</div><button onclick="clearInlineMax('${exoData.id}')" style="background:none;border:none;color:var(--text-dim);cursor:pointer;font-size:11px;text-decoration:none;padding:4px 8px;border:0.5px solid var(--divider-2);border-radius:var(--radius-sm);">Modifier</button></div>`;
    } else {
        const mat=materiels.find(m=>m.id===exoData.materielId);
        panel.innerHTML=`<div style="display:flex;flex-direction:column;gap:8px;flex:1;"><p style="margin:0;font-size:12px;color:var(--text-dim);">Aucun 1RM défini pour <strong style="color:var(--text);">${exoData.name}</strong> — requis pour le mode Force.</p><div style="display:flex;gap:8px;align-items:center;"><input type="number" id="inline-max-input" placeholder="${exoData.defaultWeight}" step="${mat.step||1}" min="0" style="width:90px;background:var(--card-2);border:0.5px solid var(--divider-2);color:var(--text);padding:6px 8px;border-radius:var(--radius-sm);font-weight:600;font-family:inherit;font-size:13px;outline:none;" onkeydown="if(event.key==='Enter') validateInlineMax('${exoData.id}')"><button onclick="validateInlineMax('${exoData.id}')" style="background:var(--accent);border:none;color:#fff;padding:6px 12px;border-radius:var(--radius-sm);font-weight:600;font-size:12px;cursor:pointer;font-family:inherit;">Valider</button></div></div>`;
    }
    refreshSaveButtonState();
}
function refreshSaveButtonState() {
    const mode=document.getElementById('training-mode-select')?.value;
    const btn=document.getElementById('btn-save-exercise');
    if (!btn||!currentEditingEl) return;
    const blocked=mode==='force'&&!maxTargets[currentEditingEl.dataset.id];
    btn.disabled=blocked; btn.style.opacity=blocked?'0.4':''; btn.title=blocked?"Définissez un 1RM avant d'enregistrer":'';
}
function validateInlineMax(exoId) {
    const input=document.getElementById('inline-max-input'); if(!input) return;
    const val=parseFloat(input.value);
    if (isNaN(val)||val<=0){input.style.borderColor='var(--red)';return;}
    maxTargets[exoId]=val; saveMaxesToStorage(); syncMaxModalRow(exoId,val);
    refreshForcePanelInfo(exerciseLibrary.find(e=>e.id===exoId));
    document.querySelectorAll('.set-pct').forEach(p=>updateKgFromPct(p));
    syncMaxModalRow(exoId,val);
    syncClientProgram();
}
function clearInlineMax(exoId){delete maxTargets[exoId];saveMaxesToStorage();syncMaxModalRow(exoId,null);refreshForcePanelInfo(exerciseLibrary.find(e=>e.id===exoId));syncMaxModalRow(exoId,null);
    syncClientProgram();}
function syncMaxModalRow(exoId,val){const i=document.querySelector(`#max-list .max-input[data-id="${exoId}"]`);if(i)i.value=val||'';}

function onModeChange(mode, regenerate=true) {
    const isPyra=PYRA_MODES.includes(mode);
    document.getElementById('pyramide-config-panel').style.display=isPyra?'block':'none';
    document.getElementById('force-config-panel').style.display=mode==='force'?'flex':'none';
    document.getElementById('modal-add-set-btn').style.display=isPyra?'none':'flex';
    updatePyraHint(mode);
    const col=document.getElementById('modal-col-header');
    const isMob = window.innerWidth <= 768;
    if (mode==='force') {
        col.innerHTML=`<span>#</span><span>Reps</span><span>%</span><span>Kg (auto)</span><span>Technique</span><span>Repos</span><span></span>`;
        col.style.gridTemplateColumns = isMob ? '22px 1fr 46px 56px 1.4fr 72px 22px' : '30px 1fr 60px 80px 1.5fr 90px 30px';
    } else {
        col.innerHTML=`<span>#</span><span>${currentEditingEl?.dataset.id&&exerciseLibrary.find(e=>e.id===currentEditingEl.dataset.id)?.unit==='sec'?'Sec':'Reps'}</span><span>Kg</span><span>Technique</span><span>Repos</span><span></span>`;
        col.style.gridTemplateColumns = isMob ? '22px 1fr 1fr 1.6fr 72px 22px' : '30px 1fr 1fr 1.5fr 90px 30px';
    }
    if (regenerate) {
        if (isPyra) regeneratePyramide(mode);
        else { document.getElementById('sets-container').innerHTML=''; JSON.parse(currentEditingEl.dataset.setsData).forEach(s=>addSetRow(s.reps,s.weight||0,s.tech,s.pct,s.restMin||0,s.restSec||0)); }
    }
    refreshSaveButtonState();
}
function updatePyraHint(mode) {
    const hint=document.getElementById('pyra-hint'); if(!hint) return;
    const map={pyramide:'Pyramide complète — ex. top 3 : 1-2-3-2-1 (5 séries)',progressif:'Montante — top = série la plus lourde/courte',degressif:'Descendante — top = première série'};
    hint.textContent=map[mode]||'';
}

// ── PYRAMIDE : séquence de reps cohérente avec le pas ────────────────────────
// Les reps varient par pas de `step`, sommet = topRep, plancher ≥ 1.
//   topRep 6, pas 1 → 1,2,3,4,5,6 (asc)   ·  pyramide : 1→6→1
//   topRep 6, pas 2 → 2,4,6 (asc)         ·  pyramide : 2→6→2
function pyraRepSequence(mode, topRep, step) {
    step = Math.max(1, Math.round(step || 1));
    topRep = Math.max(1, Math.round(topRep));
    const asc = [];
    for (let r = topRep; r >= 1; r -= step) asc.unshift(r); // [plancher … sommet]
    if (mode === 'progressif') return asc.slice().reverse();       // bcp de reps → peu (poids monte)
    if (mode === 'degressif')  return asc.slice();                 // peu de reps → bcp (poids descend)
    return asc.concat(asc.slice(0, -1).reverse());                 // pyramide : plancher→sommet→plancher
}
function pyraSetCount(mode, topRep, step) { return pyraRepSequence(mode, topRep, step).length; }

function regeneratePyramide(mode) {
    mode=mode||document.getElementById('training-mode-select').value;
    if (!currentEditingEl) return;
    const exoData=exerciseLibrary.find(e=>e.id===currentEditingEl.dataset.id);
    const mat=materiels.find(m=>m.id===exoData.materielId);
    const matStep=mat.step||1;
    const topRep=Math.max(1, parseInt(document.getElementById('pyra-top-rep')?.value)||editingPyraTopRep);
    // « Pas kg » : 0 accepté explicitement → même poids sur toutes les séries.
    const kgRaw=document.getElementById('pyra-kg-step')?.value;
    const kgStep=(kgRaw===''||kgRaw==null||isNaN(parseFloat(kgRaw))) ? (Number.isFinite(editingPyraKgStep)?editingPyraKgStep:matStep) : parseFloat(kgRaw);
    const repsStep=Math.max(1, parseFloat(document.getElementById('pyra-reps-step-val')?.value)||editingPyraRepsStep||1);
    editingPyraTopRep=topRep; editingPyraKgStep=kgStep; editingPyraRepsStep=repsStep;

    const seq=pyraRepSequence(mode, topRep, repsStep);
    const countDisplay=document.getElementById('pyra-sets-count');
    if (countDisplay) countDisplay.textContent=`→ ${seq.length} série${seq.length>1?'s':''}`;

    const saved=JSON.parse(currentEditingEl.dataset.setsData);
    const bW=saved[0]?.weight||exoData.defaultWeight;
    const bT=saved[0]?.tech||exoData.techniques[0];
    const bRestMin=saved[0]?.restMin||0;
    const bRestSec=saved[0]?.restSec||0;
    document.getElementById('sets-container').innerHTML='';

    // Poids : plus on s'éloigne du sommet (moins de reps), plus c'est lourd.
    // kgStep = 0 → poids constant = bW sur toutes les séries.
    seq.forEach(R => {
        const level=(topRep - R)/repsStep;                 // 0 au sommet
        const kg=kgStep===0 ? bW : Math.max(0, Math.round((bW + level*kgStep)/matStep)*matStep);
        addSetRow(R, kg, bT, null, bRestMin, bRestSec);
    });
}

function onPyraParamChange() {
    editingPyraTopRep=Math.max(1,parseInt(document.getElementById('pyra-top-rep')?.value)||1);
    editingPyraKgStep=parseFloat(document.getElementById('pyra-kg-step')?.value)||0;
    editingPyraRepsStep=parseFloat(document.getElementById('pyra-reps-step-val')?.value)||0;
    regeneratePyramide();
}

// ── SETS ─────────────────────────────────────────────────────────────────────
function addSetRow(reps=10, weight=60, tech="Normal", pct=null, restMin=0, restSec=0) {
    const exoData=exerciseLibrary.find(e=>e.id===currentEditingEl.dataset.id);
    const mat=materiels.find(m=>m.id===exoData.materielId);
    const mode=document.getElementById('training-mode-select').value;
    const matStep=mat.step||0;
    const isMob = window.innerWidth <= 768;
    const techniques=[...exoData.techniques];
    if (!techniques.includes('Partial/Full')&&mat.step>0) techniques.push('Partial/Full');
    // Techniques libres : on conserve une technique custom (ex. "Pyramide 1>7>1")
    // même si elle n'est pas dans la liste de l'exercice.
    if (tech && !techniques.includes(tech)) techniques.push(tech);
    const row=document.createElement('div'); row.className='set-row';

    // Rest field HTML snippet
    const restHtml=`<div class="rest-field"><input type="text" class="set-rest-min" value="${restMin||0}" min="0" max="10" placeholder="m"><span class="rest-sep">:</span><select class="set-rest-sec">${secSelect(restSec||0)}</select></div>`;

    if (mode==='force') {
        const maxT=maxTargets[exoData.id]||0;
        const cp=(pct!==null&&pct!==undefined)?pct:(maxT>0?Math.round(weight/maxT*100):75);
        const kg=maxT>0?Math.ceil((maxT*cp/100)/matStep-1e-9)*matStep:weight;
        row.style.gridTemplateColumns = isMob ? '22px 1fr 46px 56px 1.4fr 72px 22px' : '30px 1fr 60px 80px 1.5fr 90px 30px';
        row.innerHTML=`<div class="set-num">0</div><input type="number" class="set-reps" value="${reps}" min="1"><input type="number" class="set-pct" value="${cp}" min="1" max="110" step="1" style="font-weight:600;" oninput="updateKgFromPct(this)"><div class="set-kg-auto" data-kg="${kg}">${kg}</div><select class="set-tech">${techniques.map(t=>`<option value="${t}" ${t===tech?'selected':''}>${t}</option>`).join('')}</select>${restHtml}<button onclick="this.parentElement.remove();updateSetNumbers();" class="set-del-btn">×</button>`;
    } else {
        row.style.gridTemplateColumns = isMob ? '22px 1fr 1fr 1.6fr 72px 22px' : '30px 1fr 1fr 1.5fr 90px 30px';
        row.innerHTML=`<div class="set-num">0</div><input type="number" class="set-reps" value="${reps}" min="1"><input type="number" class="set-weight" value="${weight}" step="${matStep||1}"><select class="set-tech">${techniques.map(t=>`<option value="${t}" ${t===tech?'selected':''}>${t}</option>`).join('')}</select>${restHtml}<button onclick="this.parentElement.remove();updateSetNumbers();" class="set-del-btn">×</button>`;
    }
    document.getElementById('sets-container').appendChild(row);
    updateSetNumbers();
}
function updateKgFromPct(input) {
    const exo=exerciseLibrary.find(e=>e.id===currentEditingEl.dataset.id);
    const mat=materiels.find(m=>m.id===exo.materielId);
    const maxT=maxTargets[exo.id]||0; if(!maxT) return;
    const kgDiv=input.closest('.set-row').querySelector('.set-kg-auto'); if(!kgDiv) return;
    const kg=Math.ceil((maxT*(parseFloat(input.value)||0)/100)/(mat.step||1)-1e-9)*(mat.step||1);
    kgDiv.textContent=kg; kgDiv.dataset.kg=kg;
}
function updateSetNumbers() {
    Array.from(document.getElementById('sets-container').children).forEach((r,i)=>{const n=r.querySelector('.set-num');if(n)n.textContent=i+1;});
}
function saveExercise() {
    const mode=document.getElementById('training-mode-select').value;
    const rows=document.getElementById('sets-container').querySelectorAll('.set-row');
    if (rows.length===0){showModalError('modal-save-error',"Ajoutez au moins une série.");return;}
    for (const r of rows){
        const v=parseInt(r.querySelector('.set-reps')?.value);
        if (isNaN(v)||v<=0){r.querySelector('.set-reps').style.borderColor='var(--red)';r.querySelector('.set-reps').focus();showModalError('modal-save-error','Toutes les séries doivent avoir ≥ 1 répétition.');return;}
        r.querySelector('.set-reps').style.borderColor='';
    }
    if (mode==='force'&&!maxTargets[currentEditingEl.dataset.id]){showModalError('modal-save-error','Définissez un 1RM pour le mode Force.');return;}
    showModalError('modal-save-error','');
    const sets=Array.from(rows).map(r=>{
        const restMin=parseInt(r.querySelector('.set-rest-min')?.value)||0;
        const restSec=parseInt(r.querySelector('.set-rest-sec')?.value)||0;
        if (mode==='force'){const k=r.querySelector('.set-kg-auto');return{reps:parseInt(r.querySelector('.set-reps').value),pct:parseFloat(r.querySelector('.set-pct').value),weight:k?parseFloat(k.dataset.kg||0):0,tech:r.querySelector('.set-tech').value,restMin,restSec};}
        return{reps:parseInt(r.querySelector('.set-reps').value),weight:parseFloat(r.querySelector('.set-weight').value),tech:r.querySelector('.set-tech').value,restMin,restSec};
    });
    currentEditingEl.dataset.setsData=JSON.stringify(sets);
    currentEditingEl.dataset.trainingMode=mode;
    if (PYRA_MODES.includes(mode)) {
        currentEditingEl.dataset.pyramideConfig=JSON.stringify({kgStep:editingPyraKgStep,repsStep:editingPyraRepsStep,topRep:editingPyraTopRep});
    } else { delete currentEditingEl.dataset.pyramideConfig; }
    // Progression par bloc (par exercice-id, synchronisée en live).
    // On stocke AUSSI « Aucune » ({type:'none'}) pour que le choix soit mémorisé :
    // sinon la réouverture retomberait sur le défaut intelligent (Objectif / +kg).
    progressionConfig[currentEditingEl.dataset.id] = getModalProgConfig();
    saveProgressionToStorage();

    updateExoDisplay(currentEditingEl);
    closeModals();
    syncClientProgram();
}

// ── PROGRESSION PAR BLOC ─────────────────────────────────────────────────────
//  3 choix : Aucune / +kg par bloc (linéaire) / Objectif (asymptotique).
//  Défaut intelligent : si un 1RM existe → Objectif vers ce 1RM ; sinon +pas/bloc.
let editingProgType = 'none';
let _progDefaults = { step: 2.5, increment: 2.5, target: 0 };

// Charge de référence = série la plus lourde actuellement saisie dans la modale.
function currentModalBaseWeight() {
    let base = 0;
    document.querySelectorAll('#sets-container .set-row').forEach(r => {
        const w = parseFloat(r.querySelector('.set-weight')?.value ?? r.querySelector('.set-kg-auto')?.dataset.kg ?? 0) || 0;
        if (w > base) base = w;
    });
    return base;
}

function initProgControl(exoData) {
    const cfg = progressionConfig[exoData.id];
    const mat = materiels.find(m => m.id === exoData.materielId);
    const step = mat?.step || 2.5;
    editingProgType = cfg?.type ? (cfg.type === 'logarithmic' ? 'asymptotic' : cfg.type)
                                : (maxTargets[exoData.id] ? 'asymptotic' : 'linear');
    const base = currentModalBaseWeight();
    _progDefaults = {
        step,
        increment: cfg?.increment ?? step,
        target: cfg?.target ?? (maxTargets[exoData.id] || Math.round((base * 1.1) / step) * step || base + step)
    };
    renderProgSeg();
    buildProgParam();
    // Recalcule l'aperçu quand on change les charges des séries (une seule fois).
    const sc = document.getElementById('sets-container');
    if (sc && !sc._progListener) {
        sc._progListener = true;
        sc.addEventListener('input', e => {
            if (e.target.classList.contains('set-weight') || e.target.classList.contains('set-pct')) refreshProgPreview();
        });
    }
}

function renderProgSeg() {
    document.querySelectorAll('#prog-seg .seg-btn').forEach(b => b.classList.toggle('active', b.dataset.prog === editingProgType));
}
function setProgMode(type) { editingProgType = type; renderProgSeg(); buildProgParam(); }

function buildProgParam() {
    const p = document.getElementById('prog-param'); if (!p) return;
    const d = _progDefaults;
    if (editingProgType === 'linear')
        p.innerHTML = `<span class="prog-input-label">+</span><input type="number" id="prog-inc" class="prog-input" value="${d.increment}" min="0" step="${d.step}" oninput="refreshProgPreview()"><span class="prog-input-label">kg</span>`;
    else if (editingProgType === 'asymptotic')
        p.innerHTML = `<span class="prog-input-label">vers</span><input type="number" id="prog-target" class="prog-input" value="${d.target}" min="0" step="${d.step}" oninput="refreshProgPreview()"><span class="prog-input-label">kg</span>`;
    else
        p.innerHTML = `<span class="prog-input-label">Charge identique chaque bloc</span>`;
    refreshProgPreview();
}

function getModalProgConfig() {
    if (editingProgType === 'linear') return { type: 'linear', increment: parseFloat(document.getElementById('prog-inc')?.value) || _progDefaults.step };
    if (editingProgType === 'asymptotic') return { type: 'asymptotic', target: parseFloat(document.getElementById('prog-target')?.value) || _progDefaults.target, speed: 0.15 };
    return { type: 'none' };
}

function refreshProgPreview() {
    const el = document.getElementById('prog-preview'); if (!el) return;
    const cfg = getModalProgConfig();
    if (cfg.type === 'none') { el.textContent = ''; return; }
    const base = currentModalBaseWeight();
    const step = _progDefaults.step;
    const eff = cfg.type === 'asymptotic' ? { ...cfg, current: base } : cfg;
    const w = i => Math.round((base + computeProgression(eff, i, step)) * 4) / 4;
    el.textContent = `Bloc 1 → 2 → 3 :  ${w(0)} · ${w(1)} · ${w(2)} kg`;
}

// ======================== MODAL RUN ========================
function openRunModal(el) {
    currentRunEl=el;
    const data=runLibrary.find(r=>r.id===el.dataset.runId); const d=JSON.parse(el.dataset.runData);
    document.getElementById('run-modal-title').textContent=`${el.dataset.emoji} ${el.dataset.name}`;
    document.getElementById('run-modal-overlay').style.display='flex';
    const body=document.getElementById('run-modal-body'); body.innerHTML='';
    if (d.type==='course') renderCourseForm(body,data,d); else renderFractForm(body,data,d);
}
function renderCourseForm(body,data,d){
    body.innerHTML=`<div class="run-section-title">Paramètres</div><div class="run-row"><div class="run-field"><label class="run-label">Durée (min)</label><input type="number" id="run-duration" class="run-input" value="${d.duration}" min="1" step="5"></div><div class="run-field"><label class="run-label">Distance (km)</label><input type="number" id="run-distance" class="run-input" value="${d.distance}" min="0" step="0.5"></div></div><div class="run-row"><div class="run-field"><label class="run-label">Allure — min</label><input type="number" id="run-pace-min" class="run-input" value="${d.paceMin}" min="2" max="15" step="1"></div><div class="run-field"><label class="run-label">Allure — sec</label><select id="run-pace-sec" class="run-input">${secSelect(d.paceSec)}</select></div><div class="run-field"><label class="run-label">RPE</label><input type="number" id="run-rpe" class="run-input" value="${d.rpe}" min="1" max="10"></div></div><div class="run-row"><div class="run-field" style="flex:2"><label class="run-label">Zone</label><select id="run-zone" class="run-input">${data.zones.map(z=>`<option value="${z}" ${d.zone===z?'selected':''}>${z}</option>`).join('')}</select></div></div><div class="run-field"><label class="run-label">Notes</label><textarea id="run-notes" class="run-input run-textarea">${d.notes||''}</textarea></div><div class="run-preview" id="run-preview"></div>`;
    const upd=()=>updateCoursePreview({duration:parseInt(document.getElementById('run-duration').value)||0,distance:parseFloat(document.getElementById('run-distance').value)||0,paceMin:parseInt(document.getElementById('run-pace-min').value)||0,paceSec:parseInt(document.getElementById('run-pace-sec').value)||0,zone:document.getElementById('run-zone').value,rpe:document.getElementById('run-rpe').value});
    ['run-duration','run-distance','run-pace-min','run-pace-sec','run-zone','run-rpe'].forEach(id=>{document.getElementById(id)?.addEventListener('input',upd);document.getElementById(id)?.addEventListener('change',upd);});
    updateCoursePreview(d);
}
function updateCoursePreview(d){
    const el=document.getElementById('run-preview'); if(!el) return;
    const t=d.paceMin*60+d.paceSec; const est=t>0?((d.duration*60)/t).toFixed(1):'—';
    el.innerHTML=`<div class="run-preview-item"><span class="run-preview-label">Durée</span><span class="run-preview-val">${fmtDuration(d.duration)}</span></div><div class="run-preview-item"><span class="run-preview-label">Distance</span><span class="run-preview-val">${d.distance>0?d.distance+' km':est+' km est.'}</span></div><div class="run-preview-item"><span class="run-preview-label">Allure</span><span class="run-preview-val">${fmtPace(d.paceMin,d.paceSec)}</span></div><div class="run-preview-item"><span class="run-preview-label">Zone</span><span class="run-preview-val">${d.zone}</span></div><div class="run-preview-item"><span class="run-preview-label">RPE</span><span class="run-preview-val">${d.rpe}/10</span></div>`;
}
function renderFractForm(body,data,d){
    const isDist=d.distMode==='distance';
    body.innerHTML=`<div class="run-section-title">Échauff & Retour au calme</div><div class="run-row"><div class="run-field"><label class="run-label">Échauff. (min)</label><input type="number" id="run-warmup" class="run-input" value="${d.warmupMin}" min="0" step="5"></div><div class="run-field"><label class="run-label">Retour calme (min)</label><input type="number" id="run-cooldown" class="run-input" value="${d.cooldownMin}" min="0" step="5"></div></div><div class="run-section-title" style="margin-top:14px;">Structure</div><div class="run-row"><div class="run-field"><label class="run-label">Blocs</label><input type="number" id="run-blocs" class="run-input" value="${d.blocs}" min="1"></div><div class="run-field"><label class="run-label">Mode</label><select id="run-dist-mode" class="run-input"><option value="time" ${!isDist?'selected':''}>Temps</option><option value="distance" ${isDist?'selected':''}>Distance</option></select></div><div class="run-field"><label class="run-label" id="effort-label">${isDist?'Dist (m)':'Durée (sec)'}</label><input type="number" id="run-effort-val" class="run-input" value="${isDist?d.effortDist:d.effortSec}" min="0" step="${isDist?50:5}"></div></div><div class="run-section-title" style="margin-top:14px;">Effort</div><div class="run-row"><div class="run-field"><label class="run-label">Allure — min</label><input type="number" id="run-effort-pace-min" class="run-input" value="${d.effortPaceMin}" min="2" max="10" step="1"></div><div class="run-field"><label class="run-label">Allure — sec</label><select id="run-effort-pace-sec" class="run-input">${secSelect(d.effortPaceSec)}</select></div></div><div class="run-section-title" style="margin-top:14px;">Récupération</div><div class="run-row"><div class="run-field"><label class="run-label">Récup (sec)</label><input type="number" id="run-recup-sec" class="run-input" value="${d.recupSec}" min="0" step="5"></div><div class="run-field"><label class="run-label">Allure récup — min</label><input type="number" id="run-recup-pace-min" class="run-input" value="${d.recupPaceMin}" min="0" max="15" step="1"></div><div class="run-field"><label class="run-label">Allure récup — sec</label><select id="run-recup-pace-sec" class="run-input">${secSelect(d.recupPaceSec)}</select></div></div><div class="run-row"><div class="run-field" style="flex:2"><label class="run-label">Zone</label><select id="run-zone" class="run-input">${data.zones.map(z=>`<option value="${z}" ${d.zone===z?'selected':''}>${z}</option>`).join('')}</select></div></div><div class="run-field"><label class="run-label">Notes</label><textarea id="run-notes" class="run-input run-textarea">${d.notes||''}</textarea></div><div class="run-preview" id="run-preview"></div>`;
    document.getElementById('run-dist-mode').addEventListener('change',function(){const isD=this.value==='distance';document.getElementById('effort-label').textContent=isD?'Dist (m)':'Durée (sec)';document.getElementById('run-effort-val').step=isD?50:5;});
    const upd=()=>updateFractPreview();
    ['run-blocs','run-effort-val','run-recup-sec','run-effort-pace-min','run-effort-pace-sec','run-recup-pace-min','run-recup-pace-sec','run-warmup','run-cooldown'].forEach(id=>{document.getElementById(id)?.addEventListener('input',upd);document.getElementById(id)?.addEventListener('change',upd);});
    updateFractPreview();
}
function updateFractPreview(){
    const el=document.getElementById('run-preview'); if(!el) return;
    const bl=parseInt(document.getElementById('run-blocs')?.value)||0, ev=parseInt(document.getElementById('run-effort-val')?.value)||0;
    const dm=document.getElementById('run-dist-mode')?.value||'time', rs=parseInt(document.getElementById('run-recup-sec')?.value)||0;
    const epm=parseInt(document.getElementById('run-effort-pace-min')?.value)||0, eps=parseInt(document.getElementById('run-effort-pace-sec')?.value)||0;
    const wu=parseInt(document.getElementById('run-warmup')?.value)||0, cd=parseInt(document.getElementById('run-cooldown')?.value)||0;
    const zone=document.getElementById('run-zone')?.value||'';
    const eStr=dm==='distance'?`${bl}×${ev}m`:`${bl}×${fmtTime(ev)}`;
    const eSec=dm==='distance'?(epm*60+eps>0?bl*(ev/1000*(epm*60+eps)):0):bl*ev;
    const tot=Math.round(((wu+cd)*60+eSec+bl*rs)/60);
    const dk=epm*60+eps>0?(eSec/(epm*60+eps)).toFixed(2):'—';
    el.innerHTML=`<div class="run-preview-item"><span class="run-preview-label">Structure</span><span class="run-preview-val">${eStr}</span></div><div class="run-preview-item"><span class="run-preview-label">Allure effort</span><span class="run-preview-val">${fmtPace(epm,eps)}</span></div><div class="run-preview-item"><span class="run-preview-label">Récup</span><span class="run-preview-val">${fmtTime(rs)}</span></div><div class="run-preview-item"><span class="run-preview-label">Dist.</span><span class="run-preview-val">~${dk} km</span></div><div class="run-preview-item"><span class="run-preview-label">Durée totale</span><span class="run-preview-val">~${fmtDuration(tot)}</span></div><div class="run-preview-item"><span class="run-preview-label">Zone</span><span class="run-preview-val">${zone}</span></div>`;
}
function saveRunModal(){
    if(!currentRunEl) return;
    const ex=JSON.parse(currentRunEl.dataset.runData); let nd;
    if (ex.type==='course') nd={type:'course',duration:parseInt(document.getElementById('run-duration').value)||ex.duration,distance:parseFloat(document.getElementById('run-distance').value)||0,paceMin:parseInt(document.getElementById('run-pace-min').value)||ex.paceMin,paceSec:parseInt(document.getElementById('run-pace-sec').value)||0,rpe:parseInt(document.getElementById('run-rpe').value)||ex.rpe,zone:document.getElementById('run-zone').value,notes:document.getElementById('run-notes').value};
    else { const dm=document.getElementById('run-dist-mode').value; const ev=parseInt(document.getElementById('run-effort-val').value)||0; nd={type:'fractionne',distMode:dm,blocs:parseInt(document.getElementById('run-blocs').value)||ex.blocs,effortSec:dm==='time'?ev:ex.effortSec,effortDist:dm==='distance'?ev:ex.effortDist,recupSec:parseInt(document.getElementById('run-recup-sec').value)||0,effortPaceMin:parseInt(document.getElementById('run-effort-pace-min').value)||ex.effortPaceMin,effortPaceSec:parseInt(document.getElementById('run-effort-pace-sec').value)||0,recupPaceMin:parseInt(document.getElementById('run-recup-pace-min').value)||0,recupPaceSec:parseInt(document.getElementById('run-recup-pace-sec').value)||0,warmupMin:parseInt(document.getElementById('run-warmup').value)||0,cooldownMin:parseInt(document.getElementById('run-cooldown').value)||0,zone:document.getElementById('run-zone').value,notes:document.getElementById('run-notes').value}; }
    currentRunEl.dataset.runData=JSON.stringify(nd); updateRunDisplay(currentRunEl); closeModals();
}

// ======================== MODAL HYROX ========================
function openHyroxModal(el){
    currentHyroxEl=el;
    const data=hyroxLibrary.find(h=>h.id===el.dataset.hyroxId); const d=JSON.parse(el.dataset.hyroxData);
    document.getElementById('hyrox-modal-title').textContent=`${el.dataset.emoji} ${el.dataset.name}`;
    const body=document.getElementById('hyrox-modal-body'); body.innerHTML=''; const fields=[];
    if (data.type==='course_hyrox') fields.push(`<div class="run-row"><div class="run-field"><label class="run-label">Distance (m)</label><input type="number" id="hx-distance" class="run-input" value="${d.distance}" step="100" min="0"></div><div class="run-field"><label class="run-label">Allure — min</label><input type="number" id="hx-pace-min" class="run-input" value="${d.paceMin}" min="2" max="15"></div><div class="run-field"><label class="run-label">Allure — sec</label><select id="hx-pace-sec" class="run-input">${secSelect(d.paceSec)}</select></div></div>`);
    else {
        if(data.defaultDistance!==undefined) fields.push(`<div class="run-row"><div class="run-field"><label class="run-label">Distance (m)</label><input type="number" id="hx-distance" class="run-input" value="${d.distance}" step="10" min="0"></div></div>`);
        if(data.defaultWeight!==undefined&&data.type!=='machine') fields.push(`<div class="run-row"><div class="run-field"><label class="run-label">Charge (kg)</label><input type="number" id="hx-weight" class="run-input" value="${d.weight}" step="5" min="0"></div></div>`);
        if(data.type==='reps'&&data.defaultReps) fields.push(`<div class="run-row"><div class="run-field"><label class="run-label">Reps</label><input type="number" id="hx-reps" class="run-input" value="${d.reps}" min="1"></div>${data.defaultWeight!==undefined?`<div class="run-field"><label class="run-label">Charge (kg)</label><input type="number" id="hx-weight" class="run-input" value="${d.weight}" step="${data.id==='hyrox_wallballs'?1:5}" min="0"></div>`:''}</div>`);
        if(data.hasResistance) fields.push(`<div class="run-row"><div class="run-field"><label class="run-label">Résistance (1-10)</label><input type="number" id="hx-resistance" class="run-input" value="${d.resistance}" min="1" max="10"></div></div>`);
        fields.push(`<div class="run-row"><div class="run-field"><label class="run-label">Temps cible — min</label><input type="number" id="hx-target-min" class="run-input" value="${d.targetMin}" min="0"></div><div class="run-field"><label class="run-label">sec</label><select id="hx-target-sec" class="run-input">${secSelect(d.targetSec)}</select></div></div>`);
    }
    fields.push(`<div class="run-field"><label class="run-label">Notes</label><textarea id="hx-notes" class="run-input run-textarea">${d.notes||''}</textarea></div>`);
    body.innerHTML=fields.join('');
    document.getElementById('hyrox-modal-overlay').style.display='flex';
}
function saveHyroxModal(){
    if(!currentHyroxEl) return;
    const d=JSON.parse(currentHyroxEl.dataset.hyroxData);
    const get=(id,def=0)=>{const el=document.getElementById(id);return el?(parseFloat(el.value)||0):def;};
    const nd={distance:get('hx-distance',d.distance),weight:get('hx-weight',d.weight),reps:get('hx-reps',d.reps),resistance:get('hx-resistance',d.resistance),targetMin:get('hx-target-min',d.targetMin),targetSec:get('hx-target-sec',d.targetSec),paceMin:get('hx-pace-min',d.paceMin),paceSec:get('hx-pace-sec',d.paceSec),notes:document.getElementById('hx-notes')?.value||''};
    currentHyroxEl.dataset.hyroxData=JSON.stringify(nd); updateHyroxDisplay(currentHyroxEl); closeModals();
}

// ======================== MODAL CARDIO ========================
function openCardioModal(el){
    currentCardioEl=el;
    const data=cardioLibrary.find(c=>c.id===el.dataset.cardioId); const d=JSON.parse(el.dataset.cardioData);
    document.getElementById('cardio-modal-title').textContent=`${el.dataset.emoji} ${el.dataset.name}`;
    const body=document.getElementById('cardio-modal-body'); const fields=[];
    if (data.type==='machine'||data.type==='carry'){
        fields.push(`<div class="run-row">${data.defaultDuration!==undefined?`<div class="run-field"><label class="run-label">Durée (min)</label><input type="number" id="cd-duration" class="run-input" value="${d.duration}" min="0" step="1"></div>`:''} ${data.defaultDistance!==undefined?`<div class="run-field"><label class="run-label">Distance (m)</label><input type="number" id="cd-distance" class="run-input" value="${d.distance}" min="0" step="${data.type==='carry'?5:100}"></div>`:''}</div>`);
        if(data.defaultWeight!==undefined&&data.type==='carry') fields.push(`<div class="run-row"><div class="run-field"><label class="run-label">Charge (kg)</label><input type="number" id="cd-weight" class="run-input" value="${d.weight}" min="0" step="2"></div></div>`);
        if(data.hasResistance) fields.push(`<div class="run-row"><div class="run-field"><label class="run-label">Résistance (1-10)</label><input type="number" id="cd-resistance" class="run-input" value="${d.resistance}" min="1" max="10"></div></div>`);
    } else {
        fields.push(`<div class="run-row">${data.defaultReps?`<div class="run-field"><label class="run-label">Reps</label><input type="number" id="cd-reps" class="run-input" value="${d.reps}" min="0"></div>`:''} ${data.defaultDuration?`<div class="run-field"><label class="run-label">Durée (min)</label><input type="number" id="cd-duration" class="run-input" value="${d.duration}" min="0"></div>`:''} ${data.defaultWeight!==undefined?`<div class="run-field"><label class="run-label">Charge (kg)</label><input type="number" id="cd-weight" class="run-input" value="${d.weight}" min="0" step="2"></div>`:''}</div>`);
    }
    fields.push(`<div class="run-field"><label class="run-label">Notes</label><textarea id="cd-notes" class="run-input run-textarea">${d.notes||''}</textarea></div>`);
    body.innerHTML=fields.join('');
    document.getElementById('cardio-modal-overlay').style.display='flex';
}
function saveCardioModal(){
    if(!currentCardioEl) return;
    const d=JSON.parse(currentCardioEl.dataset.cardioData);
    const get=(id,def=0)=>{const el=document.getElementById(id);return el?(parseFloat(el.value)||0):def;};
    const nd={duration:get('cd-duration',d.duration),distance:get('cd-distance',d.distance),reps:get('cd-reps',d.reps),weight:get('cd-weight',d.weight),resistance:get('cd-resistance',d.resistance),notes:document.getElementById('cd-notes')?.value||''};
    currentCardioEl.dataset.cardioData=JSON.stringify(nd); updateCardioDisplay(currentCardioEl); closeModals();
}

// ======================== MODALE 1RM ========================
function openMaxModal(){document.getElementById('max-search').value='';renderMaxList('');document.getElementById('modal-max-overlay').style.display='flex';setTimeout(()=>document.getElementById('max-search').focus(),50);}
function renderMaxList(st){
    const list=document.getElementById('max-list'); list.innerHTML='';
    const norm=normalizeString(st.toLowerCase().trim()); const wm=Object.keys(maxTargets);
    if(!norm&&wm.length>0){const h=document.createElement('div');h.className='max-section-header';h.textContent='Objectifs définis';list.appendChild(h);wm.forEach(id=>{const exo=exerciseLibrary.find(e=>e.id===id);if(!exo)return;list.appendChild(buildMaxRow(exo,materiels.find(m=>m.id===exo.materielId),maxTargets[id]));});}
    if(norm){
        const r=exerciseLibrary.filter(ex=>materiels.find(m=>m.id===ex.materielId)?.step>0&&(normalizeString(ex.name.toLowerCase()).includes(norm)||ex.categories.some(c=>normalizeString(c.toLowerCase()).includes(norm))));
        const rM=r.filter(ex=>maxTargets[ex.id]),rU=r.filter(ex=>!maxTargets[ex.id]);
        if(rM.length){const h=document.createElement('div');h.className='max-section-header';h.textContent='Déjà définis';list.appendChild(h);rM.forEach(ex=>list.appendChild(buildMaxRow(ex,materiels.find(m=>m.id===ex.materielId),maxTargets[ex.id])));}
        if(rU.length){const h=document.createElement('div');h.className='max-section-header';h.textContent='Ajouter';list.appendChild(h);rU.forEach(ex=>list.appendChild(buildMaxSearchRow(ex,materiels.find(m=>m.id===ex.materielId))));}
        if(!r.length)list.innerHTML='<div style="padding:20px;text-align:center;color:var(--text-dim);font-size:13px;">Aucun exercice trouvé</div>';
    } else if(!wm.length) list.innerHTML='<div style="padding:20px;text-align:center;color:var(--text-dim);font-size:13px;">Recherche un exercice</div>';
}
function buildMaxRow(exo,mat,val){const div=document.createElement('div');div.className='prog-row';div.innerHTML=`<div><div style="font-size:13px;font-weight:600;">${exo.emoji} ${exo.name}</div><div style="font-size:11px;color:var(--text-dim);margin-top:2px;">${mat?.name||''}</div></div><div style="display:flex;gap:6px;align-items:center;"><input type="number" class="max-input set-row input" data-id="${exo.id}" value="${val||''}" placeholder="kg" step="${mat?.step||1}" min="0" style="background:var(--card-2);border:0.5px solid var(--divider-2);color:var(--text);font-weight:600;text-align:center;width:70px;padding:6px;border-radius:var(--radius-sm);font-family:inherit;outline:none;"><button onclick="removeMaxRow('${exo.id}')" style="background:none;border:none;color:var(--text-faint);cursor:pointer;font-size:18px;padding:0 2px;line-height:1;flex-shrink:0;transition:color .1s;" onmouseenter="this.style.color='var(--red)'" onmouseleave="this.style.color='var(--text-faint)'">×</button></div>`;return div;}
function buildMaxSearchRow(exo,mat){const div=document.createElement('div');div.className='prog-row';div.innerHTML=`<div><div style="font-size:13px;font-weight:600;">${exo.emoji} ${exo.name}</div><div style="font-size:11px;color:var(--text-dim);margin-top:2px;">${mat?.name||''}</div></div><button onclick="addMaxFromSearch('${exo.id}')" style="background:var(--card-2);border:0.5px solid var(--divider-2);color:var(--text-2);width:32px;height:32px;border-radius:var(--radius-sm);cursor:pointer;font-size:20px;display:flex;align-items:center;justify-content:center;flex-shrink:0;-webkit-tap-highlight-color:transparent;font-weight:300;">+</button>`;return div;}
function addMaxFromSearch(exoId){maxTargets[exoId]=0;saveMaxesToStorage();document.getElementById('max-search').value='';renderMaxList('');setTimeout(()=>{const i=document.querySelector(`#max-list .max-input[data-id="${exoId}"]`);if(i){i.value='';i.focus();}},50);}
function removeMaxRow(exoId){delete maxTargets[exoId];saveMaxesToStorage();renderMaxList(document.getElementById('max-search').value);if(currentEditingEl?.dataset.id===exoId)refreshForcePanelInfo(exerciseLibrary.find(e=>e.id===exoId));}
function filterMaxSearch(){renderMaxList(document.getElementById('max-search').value);}
function saveMaxTargets(){document.querySelectorAll('.max-input').forEach(i=>{const v=parseFloat(i.value);if(!isNaN(v)&&v>0)maxTargets[i.dataset.id]=v;else delete maxTargets[i.dataset.id];});saveMaxesToStorage();if(currentEditingEl)refreshForcePanelInfo(exerciseLibrary.find(e=>e.id===currentEditingEl.dataset.id));closeModals();syncClientProgram();}


// ======================== FLOATING SEARCH BAR ========================
let floatingTargetCell = null;

function openFloatingSearch(cell) {
    floatingTargetCell = cell;
    const bar = document.getElementById('floating-search-bar');
    const input = document.getElementById('floating-search-input');
    if (!bar) return;

    // Position the bar near the cell
    const rect = cell.getBoundingClientRect();
    const barWidth = 280;
    let left = rect.left;
    let top = rect.bottom + 4;
    if (left + barWidth > window.innerWidth - 8) left = window.innerWidth - barWidth - 8;
    if (top + 340 > window.innerHeight - 8) top = rect.top - 340 - 4;
    bar.style.left = Math.max(4, left) + 'px';
    bar.style.top = Math.max(4, top) + 'px';
    bar.style.display = 'flex';
    input.value = '';
    renderFloatingResults('');
    setTimeout(() => input.focus(), 50);
}

function closeFloatingSearch() {
    const bar = document.getElementById('floating-search-bar');
    if (bar) bar.style.display = 'none';
    floatingTargetCell = null;
}

function renderFloatingResults(term) {
    const list = document.getElementById('floating-search-list');
    if (!list) return;
    const norm = normalizeString(term.toLowerCase().trim());

    // Collect already-placed exercise IDs in the target cell to avoid duplicates
    const placedIds = new Set();
    if (floatingTargetCell) {
        floatingTargetCell.querySelectorAll('.placed-exo').forEach(el => {
            if (el.dataset.id) placedIds.add('muscu:' + el.dataset.id);
            if (el.dataset.runId) placedIds.add('run:' + el.dataset.runId);
            if (el.dataset.hyroxId) placedIds.add('hyrox:' + el.dataset.hyroxId);
            if (el.dataset.cardioId) placedIds.add('cardio:' + el.dataset.cardioId);
        });
    }

    // All exercises across all libraries
    let allItems = [];
    exerciseLibrary.forEach(ex => {
        if (!norm || normalizeString(ex.name.toLowerCase()).includes(norm) || ex.categories.some(c => normalizeString(c.toLowerCase()).includes(norm))) {
            if (!placedIds.has('muscu:' + ex.id)) allItems.push({ type: 'muscu', data: ex });
        }
    });
    runLibrary.forEach(r => {
        if (!norm || normalizeString(r.name.toLowerCase()).includes(norm)) {
            if (!placedIds.has('run:' + r.id)) allItems.push({ type: 'run', data: r });
        }
    });
    hyroxLibrary.forEach(h => {
        if (!norm || normalizeString(h.name.toLowerCase()).includes(norm)) {
            if (!placedIds.has('hyrox:' + h.id)) allItems.push({ type: 'hyrox', data: h });
        }
    });
    cardioLibrary.forEach(c => {
        if (!norm || normalizeString(c.name.toLowerCase()).includes(norm)) {
            if (!placedIds.has('cardio:' + c.id)) allItems.push({ type: 'cardio', data: c });
        }
    });

    if (!norm) allItems = allItems.slice(0, 60);

    list.innerHTML = '';
    if (!allItems.length) {
        list.innerHTML = '<div style="padding:14px;text-align:center;color:var(--text-dim);font-size:12px;">Aucun résultat</div>';
        return;
    }
    allItems.forEach(item => {
        const d = item.data;
        const btn = document.createElement('button');
        btn.className = 'float-result-item';
        btn.style.cssText = `display:flex;align-items:center;gap:8px;width:100%;background:none;border:none;border-bottom:0.5px solid var(--divider-2);padding:9px 12px;cursor:pointer;color:var(--text);font-family:inherit;text-align:left;`;
        btn.style.borderLeft = `3px solid ${d.color}`;

        let subtitle = '';
        if (item.type === 'muscu') {
            const mat = materiels.find(m => m.id === d.materielId);
            subtitle = mat ? mat.name : '';
        } else if (item.type === 'run') {
            subtitle = d.type === 'fractionne' ? 'Fractionné' : 'Course';
        } else if (item.type === 'hyrox') {
            subtitle = 'Hyrox';
        } else if (item.type === 'cardio') {
            subtitle = 'Cardio';
        }

        btn.innerHTML = `<span style="font-size:16px;">${d.emoji}</span><div><div style="font-size:12px;font-weight:600;">${d.name}</div><div style="font-size:10px;color:var(--text-dim);">${subtitle}</div></div>`;
        btn.onmouseenter = () => btn.style.background = 'rgba(255,255,255,0.06)';
        btn.onmouseleave = () => btn.style.background = 'none';
        btn.onclick = (e) => {
            e.stopPropagation();
            if (!floatingTargetCell) return;
            if (item.type === 'muscu') createPlacedExercise(floatingTargetCell, d.id);
            else if (item.type === 'run') createPlacedRun(floatingTargetCell, d.id);
            else if (item.type === 'hyrox') createPlacedHyrox(floatingTargetCell, d.id);
            else if (item.type === 'cardio') createPlacedCardio(floatingTargetCell, d.id);
            closeFloatingSearch();
        };
        list.appendChild(btn);
    });
}
