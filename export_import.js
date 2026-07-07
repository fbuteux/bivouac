// ======================== EXPORT ========================
function computeProgression(config, blocIndex, step) {
    const s=step||1; const round=v=>Math.round(v/s)*s;
    if (!config||config.type==='none') return 0;
    if (config.type==='linear') return round(blocIndex*(config.increment||s));
    if (config.type==='logarithmic'){const A=config.amplitude||(config.target-config.current)*0.5;const k=config.speed||0.5;return round(A*Math.log(1+k*blocIndex));}
    if (config.type==='asymptotic'){const tg=config.target||(config.current*1.2);const cur=config.current||0;const sp=config.speed||0.15;return round((tg-(tg-cur)*Math.exp(-sp*blocIndex))-cur);}
    return 0;
}

function openProgressionModal() {
    const muscuIds=[...new Set(Array.from(document.querySelectorAll('.placed-exo[data-card-type="muscu"]')).map(el=>el.dataset.id))];
    const hasOther=document.querySelectorAll('.placed-run,.placed-hyrox,.placed-cardio').length>0;
    const totalWeeks=tbody.rows.length;
    const totalDays=Array.from(tbody.rows).reduce((a,row)=>{for(let d=1;d<=7;d++)if(row.cells[d].querySelectorAll('.placed-exo').length)a++;return a;},0);
    const totalExos=document.querySelectorAll('.placed-exo').length;
    const list=document.getElementById('prog-list'); list.innerHTML='';
    if (!muscuIds.length&&!hasOther){
        list.innerHTML='<div style="color:var(--text-dim);text-align:center;padding:30px;font-size:13px;">Le tableau est vide. Ajoutez des exercices avant d\'exporter.</div>';
        document.getElementById('modal-prog-overlay').style.display='flex'; return;
    }
    const sumDiv=document.createElement('div');
    sumDiv.style.cssText='display:flex;gap:10px;padding:12px 0 16px 0;border-bottom:1px solid var(--divider);margin-bottom:16px;flex-wrap:wrap;';
    sumDiv.innerHTML=[{label:'Semaines',val:totalWeeks,color:'var(--accent)'},{label:'Séances',val:totalDays,color:'var(--green)'},{label:'Séances/sem.',val:(totalDays/totalWeeks).toFixed(1),color:'var(--text-dim)'},{label:'Exercices',val:totalExos,color:'var(--orange)'}].map(s=>`<div style="flex:1;min-width:80px;background:var(--bg-2);border-radius:var(--radius);padding:10px;text-align:center;"><div style="font-size:18px;font-weight:800;color:${s.color}">${s.val}</div><div style="font-size:10px;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.4px;margin-top:3px;">${s.label}</div></div>`).join('');
    list.appendChild(sumDiv);
    document.getElementById('modal-prog-overlay').style.display='flex';
}

// ======================== EXPORT COMPLET DU PROGRAMME ========================
function exportProgramData() {
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
                    item.trainingMode = el.dataset.trainingMode || 'normal';
                    item.pyramideConfig = el.dataset.pyramideConfig || null;
                    try { item.sets = JSON.parse(el.dataset.setsData); } catch(e) { item.sets = []; }
                } else if (el.dataset.cardType === 'run') {
                    item.name = el.dataset.name;
                    item.emoji = el.dataset.emoji;
                    item.color = el.dataset.color;
                    item.runId = el.dataset.runId;
                    try { item.runData = JSON.parse(el.dataset.runData); } catch(e) { item.runData = {}; }
                } else if (el.dataset.cardType === 'hyrox') {
                    item.name = el.dataset.name;
                    item.emoji = el.dataset.emoji;
                    item.color = el.dataset.color;
                    item.hyroxId = el.dataset.hyroxId;
                    try { item.hyroxData = JSON.parse(el.dataset.hyroxData); } catch(e) { item.hyroxData = {}; }
                } else if (el.dataset.cardType === 'cardio') {
                    item.name = el.dataset.name;
                    item.emoji = el.dataset.emoji;
                    item.color = el.dataset.color;
                    item.cardioId = el.dataset.cardioId;
                    try { item.cardioData = JSON.parse(el.dataset.cardioData); } catch(e) { item.cardioData = {}; }
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

function confirmExport(){
    const pC=progressionConfig||{}; // progression définie par exercice (plus dans l'export)
    const sdi=document.getElementById('start-date').value;const sd=sdi?new Date(sdi+'T00:00:00'):null;
    const program={exportDate:new Date().toISOString(),programName:currentProgName,programNotes,startDate:sd?sd.toISOString():null,maxTargets,progressionConfig:pC,
        weeks:Array.from(tbody.rows).map((row,idx)=>{
            const wc=row.cells[0];const isDl=wc.getAttribute('data-deload')==='true';
            let wsd=null;if(sd){wsd=new Date(sd);wsd.setDate(wsd.getDate()+idx*7);}
            const days={};
            for(let d=1;d<=7;d++){
                const cell=row.cells[d];const di=[];
                Array.from(cell.querySelectorAll('.placed-exo[data-card-type="muscu"]')).forEach(el=>{const em=exerciseLibrary.find(e=>e.id===el.dataset.id);const mt=em?materiels.find(m=>m.id===em.materielId):null;di.push({cardType:'muscu',id:el.dataset.id,name:el.dataset.name,emoji:el.dataset.emoji,color:el.dataset.color,materielId:em?em.materielId:null,step:mt?mt.step:1,trainingMode:el.dataset.trainingMode||'normal',pyramideConfig:el.dataset.pyramideConfig?JSON.parse(el.dataset.pyramideConfig):null,progressionConfig:pC[el.dataset.id]||{type:'none'},sets:JSON.parse(el.dataset.setsData)});});
                Array.from(cell.querySelectorAll('.placed-run')).forEach(el=>{const rm=runLibrary.find(r=>r.id===el.dataset.runId);di.push({cardType:'run',runId:el.dataset.runId,name:el.dataset.name,emoji:el.dataset.emoji,color:el.dataset.color,type:rm?rm.type:'course',zones:rm?rm.zones:[],runData:JSON.parse(el.dataset.runData)});});
                Array.from(cell.querySelectorAll('.placed-hyrox')).forEach(el=>{const hm=hyroxLibrary.find(h=>h.id===el.dataset.hyroxId);di.push({cardType:'hyrox',hyroxId:el.dataset.hyroxId,name:el.dataset.name,emoji:el.dataset.emoji,color:el.dataset.color,type:hm?hm.type:null,hyroxData:JSON.parse(el.dataset.hyroxData)});});
                Array.from(cell.querySelectorAll('.placed-cardio')).forEach(el=>{const cm=cardioLibrary.find(c=>c.id===el.dataset.cardioId);di.push({cardType:'cardio',cardioId:el.dataset.cardioId,name:el.dataset.name,emoji:el.dataset.emoji,color:el.dataset.color,type:cm?cm.type:null,cardioData:JSON.parse(el.dataset.cardioData)});});
                if(di.length)days[DAYS[d-1]]=di;
            }
            const wd={week:idx+1,deload:isDl,days};if(wsd)wd.startDate=wsd.toISOString().split('T')[0];return wd;
        })
    };
    const sn=currentProgName.replace(/[^a-z0-9_\-]/gi,'_').toLowerCase()||'programme';
    const blob=new Blob([JSON.stringify(program,null,4)],{type:'application/json'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=sn+'.json';a.click();
    closeModals();
    syncClientProgram(); // Mise à jour après export
}

// ======================== IMPORT ========================
function importProgram(){openImportModal();}
function openImportModal(){document.getElementById('import-error').style.display='none';document.getElementById('import-modal-overlay').style.display='flex';}
function handleImportFile(file){
    if(!file||!file.name.endsWith('.json')){const e=document.getElementById('import-error');e.textContent='Fichier invalide.';e.style.display='block';return;}
    const bn=file.name.replace(/\.json$/i,'');
    const r=new FileReader();
    r.onload=ev=>{try{const p=JSON.parse(ev.target.result);setProgName(bn);document.getElementById('import-modal-overlay').style.display='none';loadProgramIntoTable(p);}catch(err){const e=document.getElementById('import-error');e.textContent='Fichier JSON invalide.';e.style.display='block';}};
    r.readAsText(file);
}
function loadProgramIntoTable(program){
    while(tbody.rows.length>0)tbody.deleteRow(0);
    if(program.programName)setProgName(program.programName);
    if(program.programNotes)saveProgramNotes(program.programNotes);
    if(program.maxTargets){Object.assign(maxTargets,program.maxTargets);saveMaxesToStorage();}
    if(program.progressionConfig){Object.assign(progressionConfig,program.progressionConfig);saveProgressionToStorage();}
    if(program.startDate){const d=new Date(program.startDate);document.getElementById('start-date').value=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
    const iPC=program.progressionConfig||{};
    program.weeks.forEach((wd,idx)=>{
        addRow();
        const row=tbody.rows[idx];const wc=row.cells[0];
        wc.setAttribute('data-deload',wd.deload?'true':'false');
        updateWeekDisplay(wc,wd.week,wd.deload);
        DAYS.forEach((dayName,dIdx)=>{
            const cell=row.cells[dIdx+1];const items=wd.days[dayName]||[];
            restoreItemsInCell(cell, items.map(item=>{
                if (item.cardType==='muscu'||(!item.cardType&&item.id)) return {...item, cardType:'muscu', setsData:JSON.stringify(item.sets||[]), progressionConfig:JSON.stringify(item.progressionConfig||iPC[item.id]||{type:'none'}), pyramideConfig:item.pyramideConfig?JSON.stringify(item.pyramideConfig):null};
                if (item.cardType==='run') return {...item, runData:JSON.stringify(item.runData)};
                if (item.cardType==='hyrox') return {...item, hyroxData:JSON.stringify(item.hyroxData)};
                if (item.cardType==='cardio') return {...item, cardioData:JSON.stringify(item.cardioData)};
                return item;
            }));
        });
    });
    updateTableAndDeload();
    syncClientProgram(); // Mise à jour après import
}

// ======================== NOM DU PROGRAMME ========================
function setProgName(name){currentProgName=name||'mon_programme';localStorage.setItem('benchmaster_progname',currentProgName);const el=document.getElementById('prog-name-display');if(el)el.textContent=currentProgName; syncClientProgram();}
function openNameModal(){const inp=document.getElementById('prog-name-input');if(inp)inp.value=currentProgName;document.getElementById('modal-name-overlay').style.display='flex';setTimeout(()=>{if(inp)inp.select();},80);}
function saveProgName(){const val=(document.getElementById('prog-name-input')?.value||'').trim();if(val)setProgName(val);document.getElementById('modal-name-overlay').style.display='none'; syncClientProgram();}