// ======================== CHARGEMENT JSON ========================
async function loadLibrary() {
    try {
        const resp = await fetch('bibliotheque.json');
        const data = await resp.json();
        exerciseLibrary = data.exercices;
        runLibrary = data.runExercices || [];
        hyroxLibrary = data.hyroxExercices || [];
        cardioLibrary = data.cardioExercices || [];
        materiels = data.materiels;
        trainingMethods = data.trainingMethods;
        renderSidebarByMethod(currentMethod);
    } catch(e) { console.error("Erreur chargement JSON", e); }
}

// ======================== SIDEBAR ========================
function renderSidebarByMethod(method, searchTerm="") {
    const cont = document.getElementById('exercise-container');
    cont.innerHTML = '';
    const norm = normalizeString(searchTerm.toLowerCase());
    if (method==='run') { renderRunSidebar(norm); return; }
    if (method==='hyrox') { renderHyroxSidebar(norm); return; }
    if (method==='cardio') { renderCardioSidebar(norm); return; }
    if (method==='pdc') { renderPdcSidebar(norm); return; }
    let exos = exerciseLibrary;
    if (norm) exos = exos.filter(ex=>normalizeString(ex.name.toLowerCase()).includes(norm)||ex.categories.some(c=>normalizeString(c.toLowerCase()).includes(norm)));
    const def = trainingMethods[method]; if (!def) return;
    for (let [g,cats] of Object.entries(def)) {
        const list = exos.filter(ex=>ex.categories.some(c=>cats.includes(c)));
        if (!list.length) continue;
        buildAccordion(cont, g, list, norm, item=>buildMuscuTile(item));
    }
    if (!cont.children.length) cont.innerHTML='<div style="padding:20px;text-align:center;color:var(--text-dim);">Aucun exercice trouvé</div>';
}
function buildAccordion(cont, groupName, items, norm, tileFn) {
    const d=document.createElement('div'); d.className='category-container';
    if (!norm) d.classList.add('closed');
    const h=document.createElement('button'); h.className='category-header';
    h.innerText=groupName.toUpperCase(); h.onclick=()=>d.classList.toggle('closed');
    const c=document.createElement('div'); c.className='category-content';
    items.forEach(i=>c.appendChild(tileFn(i)));
    d.appendChild(h); d.appendChild(c); cont.appendChild(d);
}
function buildMuscuTile(exo) {
    const mat=materiels.find(m=>m.id===exo.materielId);
    const t=document.createElement('div'); t.className='ex-tile';
    t.innerHTML=`${exo.emoji} ${exo.name}<br><small style="opacity:0.6;font-weight:400">${mat.name}</small>`;
    t.style.borderLeftColor=exo.color; t.draggable=true;
    t.addEventListener('dragstart',e=>e.dataTransfer.setData('text/plain',exo.id));
    return t;
}
function renderRunSidebar(norm="") {
    const cont=document.getElementById('exercise-container');
    const groups=[
        {name:'SORTIE',items:runLibrary.filter(r=>r.type==='course'),isRun:true},
        {name:'FRACTIONNÉ',items:runLibrary.filter(r=>r.type==='fractionne'),isRun:true},
        {name:'RENFO',items:exerciseLibrary.filter(ex=>ex.categories.includes('Renfo Run')),isRun:false},
    ];
    groups.forEach(g=>{
        let items=norm?g.items.filter(i=>normalizeString(i.name.toLowerCase()).includes(norm)):g.items;
        if (!items.length) return;
        buildAccordion(cont,g.name,items,norm,item=>{
            if (!g.isRun) return buildMuscuTile(item);
            const t=document.createElement('div'); t.className='ex-tile';
            const hint=item.type==='fractionne'
                ?(item.defaultDistMode==='distance'?`${item.defaultBlocs}×${item.defaultEffortDist}m`:`${item.defaultBlocs}×${fmtTime(item.defaultEffortSec)}`)
                :`${item.defaultDuration}min · ${fmtPace(item.defaultPaceMin,item.defaultPaceSec)}`;
            t.innerHTML=`${item.emoji} ${item.name}<br><small style="opacity:0.6;font-weight:400">${hint}</small>`;
            t.style.borderLeftColor=item.color; t.draggable=true;
            t.addEventListener('dragstart',e=>e.dataTransfer.setData('text/plain','run:'+item.id));
            return t;
        });
    });
    if (!cont.children.length) cont.innerHTML='<div style="padding:20px;text-align:center;color:var(--text-dim);">Aucun exercice trouvé</div>';
}
function renderHyroxSidebar(norm="") {
    const cont=document.getElementById('exercise-container');
    const groups=[
        {name:'STATIONS',items:hyroxLibrary.filter(h=>h.categories.includes('Hyrox Station'))},
        {name:'COURSE',items:hyroxLibrary.filter(h=>h.categories.includes('Hyrox Course'))},
        {name:'RENFO',items:exerciseLibrary.filter(ex=>ex.categories.includes('Renfo Run'))},
    ];
    groups.forEach(g=>{
        let items=norm?g.items.filter(i=>normalizeString(i.name.toLowerCase()).includes(norm)):g.items;
        if (!items.length) return;
        const isR=g.name==='RENFO';
        buildAccordion(cont,g.name,items,norm,item=>{
            if (isR) return buildMuscuTile(item);
            const t=document.createElement('div'); t.className='ex-tile';
            const hint=item.type==='sled'||item.type==='carry'?`${item.defaultDistance}m · ${item.defaultWeight}kg`:item.type==='reps'&&item.defaultReps?`${item.defaultReps} reps`:`${item.defaultDistance}m`;
            t.innerHTML=`${item.emoji} ${item.name}<br><small style="opacity:0.6;font-weight:400">${hint}</small>`;
            t.style.borderLeftColor=item.color; t.draggable=true;
            t.addEventListener('dragstart',e=>e.dataTransfer.setData('text/plain','hyrox:'+item.id));
            return t;
        });
    });
    if (!cont.children.length) cont.innerHTML='<div style="padding:20px;text-align:center;color:var(--text-dim);">Aucun exercice trouvé</div>';
}
function renderCardioSidebar(norm="") {
    const cont=document.getElementById('exercise-container');
    const def=trainingMethods['cardio'];
    for (let [g,cats] of Object.entries(def)) {
        let items=cardioLibrary.filter(c=>c.categories.some(cat=>cats.includes(cat)));
        if (norm) items=items.filter(i=>normalizeString(i.name.toLowerCase()).includes(norm));
        if (!items.length) continue;
        buildAccordion(cont,g,items,norm,item=>{
            const t=document.createElement('div'); t.className='ex-tile';
            const hint=item.type==='carry'?`${item.defaultDistance}m · ${item.defaultWeight}kg`:item.defaultDuration?`${item.defaultDuration}min`:item.defaultReps?`${item.defaultReps} reps`:'';
            t.innerHTML=`${item.emoji} ${item.name}<br><small style="opacity:0.6;font-weight:400">${hint}</small>`;
            t.style.borderLeftColor=item.color; t.draggable=true;
            t.addEventListener('dragstart',e=>e.dataTransfer.setData('text/plain','cardio:'+item.id));
            return t;
        });
    }
    if (!cont.children.length) cont.innerHTML='<div style="padding:20px;text-align:center;color:var(--text-dim);">Aucun exercice trouvé</div>';
}
function renderPdcSidebar(norm="") {
    const cont=document.getElementById('exercise-container');
    const def=trainingMethods['pdc'];
    for (let [g,cats] of Object.entries(def)) {
        let exos=exerciseLibrary.filter(ex=>ex.categories.some(c=>cats.includes(c)));
        if (norm) exos=exos.filter(ex=>normalizeString(ex.name.toLowerCase()).includes(norm));
        if (!exos.length) continue;
        buildAccordion(cont,g,exos,norm,buildMuscuTile);
    }
    if (!cont.children.length) cont.innerHTML='<div style="padding:20px;text-align:center;color:var(--text-dim);">Aucun exercice trouvé</div>';
}
function setMethod(method) {
    currentMethod=method;
    document.querySelectorAll('.method-tab').forEach(t=>t.classList.toggle('active',t.dataset.method===method));
    renderSidebarByMethod(method, document.getElementById('exercise-search').value);
}
function filterExercises() { renderSidebarByMethod(currentMethod, document.getElementById('exercise-search').value); }