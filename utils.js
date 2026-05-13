// ======================== DONNÉES GLOBALES ========================
const DAYS = ["Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi","Dimanche"];
let exerciseLibrary = [];
let runLibrary = [];
let hyroxLibrary = [];
let cardioLibrary = [];
let materiels = [];
let trainingMethods = {};
let currentEditingEl = null;
let currentRunEl = null;
let currentHyroxEl = null;
let currentCardioEl = null;
let currentMethod = "ppl";
// Pyramide — état local pendant l'édition (jamais écrit dans le DOM avant Enregistrer)
let editingPyraTopRep = 3; // reps max du sommet
let editingPyraKgStep = 5;
let editingPyraRepsStep = 2;
let maxTargets = JSON.parse(localStorage.getItem('benchmaster_maxes') || '{}');
let currentProgName = localStorage.getItem('benchmaster_progname') || 'mon_programme';
let programNotes = localStorage.getItem('benchmaster_notes') || '';
// Clipboard pour copier/coller semaines
let weekClipboard = null; // { deload, days: [{cardType,…}] }

// ======================== UTILS ========================
function normalizeString(str) { return str.normalize("NFD").replace(/[\u0300-\u036f]/g,""); }
function saveMaxesToStorage() { localStorage.setItem('benchmaster_maxes', JSON.stringify(maxTargets)); }
function saveProgramNotes(notes) { programNotes = notes; localStorage.setItem('benchmaster_notes', notes); }
function fmtPace(min, sec) { return `${min}:${String(sec).padStart(2,'0')}/km`; }
function fmtDuration(totalMin) {
    if (totalMin >= 60) { const h=Math.floor(totalMin/60),m=totalMin%60; return m>0?`${h}h${String(m).padStart(2,'0')}`:`${h}h`; }
    return `${totalMin}min`;
}
function fmtTime(totalSec) {
    if (totalSec >= 60) return `${Math.floor(totalSec/60)}min${totalSec%60>0?String(totalSec%60).padStart(2,'0'):''}`;
    return `${totalSec}s`;
}
function secSelect(selectedVal) {
    return [0,5,10,15,20,25,30,35,40,45,50,55]
        .map(s=>`<option value="${s}" ${selectedVal===s?'selected':''}>${String(s).padStart(2,'0')}</option>`)
        .join('');
}
function showModalError(containerId, msg) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.textContent = msg;
    el.style.display = msg ? 'block' : 'none';
}
// Calcule le nombre de séries total d'une pyramide à partir du rep max du sommet et du pas
// Mode pyramide complète : 1-2-…-topRep-…-2-1  → totalSets = 2*topRep - 1
// Mode progressif/dégressif : demi-pyramide → totalSets = topRep
function pyraFullSets(topRep) { return Math.max(1, 2 * topRep - 1); }
function pyraHalfSets(topRep) { return Math.max(1, topRep); }

// ======================== SYNC CLIENT PROGRAM ========================
// Canal de diffusion temps réel entre onglets (BroadcastChannel)
const _bmChannel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('benchmaster_sync') : null;

function syncClientProgram() {
    if (typeof exportProgramData !== 'function') return;
    const programData = exportProgramData();
    if (!programData) return;
    const json = JSON.stringify(programData);
    localStorage.setItem('benchmaster_client_program', json);
    // BroadcastChannel : instantané, cross-tab, même origine
    if (_bmChannel) _bmChannel.postMessage({ key: 'benchmaster_client_program', value: json });
}