// ======================== APP — INIT ========================
function closeModals() { document.querySelectorAll('.modal-overlay').forEach(m=>m.style.display='none'); }
function toggleSidebar() {
    const sb=document.getElementById('sidebar'), main=document.getElementById('main-content'), btn=document.getElementById('toggle-btn');
    if (!sb || !main || !btn) return;
    const open=sb.classList.toggle('open'); main.classList.toggle('main-shifted');
    btn.textContent=open?'❮':'❯'; btn.style.left=open?'calc(20% + 8px)':'15px';
}
function openDesktopClientView() {
    const programData = exportProgramData();
    localStorage.setItem('benchmaster_client_program', JSON.stringify(programData));
    const startDateStr = document.getElementById('start-date').value;
    if (startDateStr) {
        localStorage.setItem('benchmaster_client_target_date', new Date(startDateStr+'T00:00:00').toISOString());
    }
    window.open('view.html', '_blank');
}

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.method-tab').forEach(tab=>tab.addEventListener('click',()=>setMethod(tab.dataset.method)));
    const today=new Date(); const di=document.getElementById('start-date');
    if (di) {
        di.value=`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
        di.addEventListener('change', () => { refreshWeekDates(); syncClientProgram(); });
    }

    const modeSelect = document.getElementById('training-mode-select');
    if (modeSelect) modeSelect.addEventListener('change',function(){onModeChange(this.value,true);});

    // Pyramide — écouter les 3 champs en temps réel
    document.getElementById('pyra-top-rep')?.addEventListener('input', onPyraParamChange);
    document.getElementById('pyra-kg-step')?.addEventListener('input', onPyraParamChange);
    document.getElementById('pyra-reps-step-val')?.addEventListener('input', onPyraParamChange);

    setProgName(currentProgName);
    // Ouvrir la modale de nom uniquement si c'est encore le nom par défaut
    if (currentProgName === 'mon_programme') {
        setTimeout(() => openNameModal(), 200);
    }

    // Escape ferme modales + barre flottante
    document.addEventListener('keydown', e=>{
        if(e.key==='Escape'){
            closeModals();
            removeContextMenu();
            closeFloatingSearch();
        }
    });
    document.querySelectorAll('.modal-overlay').forEach(ov=>ov.addEventListener('click',e=>{ if(e.target===ov) closeModals(); }));

    // Clic hors de la barre flottante la ferme
    document.addEventListener('click', e => {
        const bar = document.getElementById('floating-search-bar');
        if (bar && bar.style.display !== 'none' && !bar.contains(e.target)) {
            closeFloatingSearch();
        }
    });

    // Floating search input
    document.getElementById('floating-search-input')?.addEventListener('input', function() {
        renderFloatingResults(this.value);
    });

    const dz=document.getElementById('import-dropzone');
    if (dz) {
        dz.addEventListener('dragover',e=>{e.preventDefault();dz.classList.add('dz-over');});
        dz.addEventListener('dragleave',()=>dz.classList.remove('dz-over'));
        dz.addEventListener('drop',e=>{e.preventDefault();dz.classList.remove('dz-over');handleImportFile(e.dataTransfer.files[0]);});
        dz.addEventListener('click',()=>{const inp=document.createElement('input');inp.type='file';inp.accept='.json';inp.onchange=e=>handleImportFile(e.target.files[0]);inp.click();});
    }
    document.getElementById('prog-name-input')?.addEventListener('keydown',e=>{if(e.key==='Enter')saveProgName();});
});

loadLibrary();
addRow();

// Ouvrir la sidebar par défaut sur desktop
if (window.innerWidth > 768) {
    const sb = document.getElementById('sidebar');
    const main = document.getElementById('main-content');
    const btn = document.getElementById('toggle-btn');
    if (sb && main && btn) {
        sb.classList.add('open');
        main.classList.add('main-shifted');
        btn.textContent = '❮';
        btn.style.left = 'calc(20% + 8px)';
    }
}