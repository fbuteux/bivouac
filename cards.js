// ======================== CARTES ========================
function createPlacedExercise(parent, exoId) {
    const data=exerciseLibrary.find(e=>e.id===exoId); if(!data) return;
    const el=document.createElement('div'); el.className='placed-exo';
    el.dataset.id=exoId; el.dataset.name=data.name; el.dataset.emoji=data.emoji; el.dataset.color=data.color;
    el.dataset.trainingMode='normal'; el.dataset.cardType='muscu';
    el.style.backgroundColor=data.color+"22"; el.style.borderLeft=`3px solid ${data.color}`;
    el.dataset.setsData=JSON.stringify(Array.from({length:data.defaultSets},()=>({reps:data.defaultReps,weight:data.defaultWeight,tech:data.techniques[0]})));
    updateExoDisplay(el); attachMuscuHandlers(el); el.draggable=true;
    parent.appendChild(el);
}
const MODE_BADGES={
    force:     {label:'FORCE', bg:'rgba(255,159,10,0.25)',color:'#ff9f0a'},
    pyramide:  {label:'PYRA',  bg:'rgba(10,132,255,0.2)', color:'var(--accent)'},
    progressif:{label:'PROG',  bg:'rgba(50,215,75,0.2)',  color:'var(--green)'},
    degressif: {label:'DEG',   bg:'rgba(255,69,58,0.2)',  color:'var(--red)'},
};
function updateExoDisplay(el) {
    const sets=JSON.parse(el.dataset.setsData); const mode=el.dataset.trainingMode||'normal';
    const b=MODE_BADGES[mode];
    const badge=b?` <span style="font-size:8px;background:${b.bg};color:${b.color};padding:1px 4px;border-radius:4px;font-weight:700">${b.label}</span>`:'';
    let summary='';
    if (sets.length>0) {
        const sr=sets.every(s=>s.reps===sets[0].reps), sk=sets.every(s=>s.weight===sets[0].weight);
        if (sr&&sk&&sets[0].weight>0) summary=`${sets.length}×${sets[0].reps} · ${sets[0].weight}kg`;
        else if (sr) summary=`${sets.length}×${sets[0].reps}`;
        else summary=`${sets.length} série${sets.length>1?'s':''}`;
    }
    el.innerHTML=`<span>${el.dataset.emoji} ${el.dataset.name}${badge}</span><span class="card-summary">${summary}</span><span class="delete-btn">×</span>`;
}

function createPlacedRun(parent, runId) {
    const data=runLibrary.find(r=>r.id===runId); if(!data) return;
    const el=document.createElement('div'); el.className='placed-exo placed-run';
    el.dataset.runId=runId; el.dataset.cardType='run'; el.dataset.name=data.name; el.dataset.emoji=data.emoji; el.dataset.color=data.color;
    el.style.backgroundColor=data.color+"22"; el.style.borderLeft=`3px solid ${data.color}`;
    if (data.type==='course')
        el.dataset.runData=JSON.stringify({type:'course',duration:data.defaultDuration,distance:data.defaultDistance,paceMin:data.defaultPaceMin,paceSec:data.defaultPaceSec,rpe:data.defaultRPE,zone:data.zones[0],notes:''});
    else
        el.dataset.runData=JSON.stringify({type:'fractionne',blocs:data.defaultBlocs,distMode:data.defaultDistMode||'time',effortSec:data.defaultEffortSec,effortDist:data.defaultEffortDist||0,recupSec:data.defaultRecupSec,effortPaceMin:data.defaultEffortPaceMin,effortPaceSec:data.defaultEffortPaceSec,recupPaceMin:data.defaultRecupPaceMin,recupPaceSec:data.defaultRecupPaceSec,warmupMin:data.defaultWarmupMin,cooldownMin:data.defaultCooldownMin,zone:data.zones[0],notes:''});
    updateRunDisplay(el); attachRunHandlers(el); el.draggable=true;
    parent.appendChild(el);
}
function updateRunDisplay(el) {
    const d=JSON.parse(el.dataset.runData); let info='';
    if (d.type==='course') { info=`${fmtDuration(d.duration)} · ${fmtPace(d.paceMin,d.paceSec)}`; if(d.distance) info+=` · ${d.distance}km`; }
    else { const es=d.distMode==='distance'?`${d.effortDist}m`:fmtTime(d.effortSec); info=`${d.blocs}×${es} @ ${fmtPace(d.effortPaceMin,d.effortPaceSec)}`; }
    const nh=d.notes?` <span style="font-size:8px;background:rgba(255,255,255,0.1);padding:1px 4px;border-radius:4px;">📝</span>`:'';
    el.innerHTML=`<span>${el.dataset.emoji} ${el.dataset.name}${nh}</span><span class="card-summary">${info}</span><span class="delete-btn">×</span>`;
}

function createPlacedHyrox(parent, hyroxId) {
    const data=hyroxLibrary.find(h=>h.id===hyroxId); if(!data) return;
    const el=document.createElement('div'); el.className='placed-exo placed-hyrox';
    el.dataset.hyroxId=hyroxId; el.dataset.cardType='hyrox'; el.dataset.name=data.name; el.dataset.emoji=data.emoji; el.dataset.color=data.color;
    el.style.backgroundColor=data.color+"22"; el.style.borderLeft=`3px solid ${data.color}`;
    el.dataset.hyroxData=JSON.stringify({distance:data.defaultDistance,weight:data.defaultWeight||0,targetMin:data.defaultTargetMin,targetSec:data.defaultTargetSec||0,resistance:data.defaultResistance||0,reps:data.defaultReps||0,paceMin:data.defaultPaceMin||5,paceSec:data.defaultPaceSec||0,notes:''});
    updateHyroxDisplay(el); attachHyroxHandlers(el); el.draggable=true;
    parent.appendChild(el);
}
function updateHyroxDisplay(el) {
    const d=JSON.parse(el.dataset.hyroxData); const hd=hyroxLibrary.find(h=>h.id===el.dataset.hyroxId); let info='';
    if (hd?.type==='course_hyrox') info=`${d.distance}m · ${fmtPace(d.paceMin,d.paceSec)}`;
    else if (hd?.type==='reps') { info=d.reps?`${d.reps} reps`:`${d.distance}m`; if(d.weight) info+=` · ${d.weight}kg`; }
    else { info=`${d.distance}m`; if(d.weight) info+=` · ${d.weight}kg`; }
    if (d.targetMin) info+=` (cible ${d.targetMin}:${String(d.targetSec||0).padStart(2,'0')})`;
    el.innerHTML=`<span>${el.dataset.emoji} ${el.dataset.name}</span><span class="card-summary">${info}</span><span class="delete-btn">×</span>`;
}

function createPlacedCardio(parent, cardioId) {
    const data=cardioLibrary.find(c=>c.id===cardioId); if(!data) return;
    const el=document.createElement('div'); el.className='placed-exo placed-cardio';
    el.dataset.cardioId=cardioId; el.dataset.cardType='cardio'; el.dataset.name=data.name; el.dataset.emoji=data.emoji; el.dataset.color=data.color;
    el.style.backgroundColor=data.color+"22"; el.style.borderLeft=`3px solid ${data.color}`;
    el.dataset.cardioData=JSON.stringify({duration:data.defaultDuration||0,distance:data.defaultDistance||0,reps:data.defaultReps||0,weight:data.defaultWeight||0,resistance:data.defaultResistance||0,notes:''});
    updateCardioDisplay(el); attachCardioHandlers(el); el.draggable=true;
    parent.appendChild(el);
}
function updateCardioDisplay(el) {
    const d=JSON.parse(el.dataset.cardioData); const cd=cardioLibrary.find(c=>c.id===el.dataset.cardioId); let info='';
    if (d.duration) info+=`${d.duration}min`;
    if (d.distance) info+=(info?' · ':'')+`${d.distance}m`;
    if (d.reps) info+=(info?' · ':'')+`${d.reps} reps`;
    if (d.weight&&cd?.type!=='machine') info+=` · ${d.weight}kg`;
    el.innerHTML=`<span>${el.dataset.emoji} ${el.dataset.name}</span><span class="card-summary">${info||'—'}</span><span class="delete-btn">×</span>`;
}