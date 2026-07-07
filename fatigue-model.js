// ======================================================================
//  MODÈLE DE FATIGUE MUSCULAIRE  —  2MAN1PUMP
// ----------------------------------------------------------------------
//  Objectif : à partir d'un programme (weeks -> days -> exercices), calculer
//  pour CHAQUE muscle et CHAQUE jour du bloc :
//    - le % de fatigue résiduelle (0 = frais, 100 = épuisé)
//    - l'intensité max qu'on peut ré-attaquer sans risque (% du 1RM)
//    - le prochain jour où le muscle sera prêt pour du lourd
//
//  Principe physiologique simplifié :
//  Chaque séance impose sur un muscle une "charge de fatigue" S0 (0..100) qui
//  décroît linéairement jusqu'à 0 sur une durée de récupération T (heures).
//  Plus l'intensité (% 1RM) et le volume sont élevés, plus S0 ET T sont grands.
//  Les fatigues de plusieurs séances s'ADDITIONNENT (plafonnées à 100).
//
//  Repères calibrés (voir README) :
//    - Développé couché LOURD (~100% 1RM)  -> ~72 h avant de re-charger lourd
//    - Développé couché à 80%              -> ~24 h pour refaire du 70%,
//                                             mais ~32 h pour refaire du 80%
//  Tous les paramètres sont regroupés dans FATIGUE_PARAMS (réglables).
// ======================================================================

const FATIGUE_PARAMS = {
    // La fatigue d'une séance décroît linéairement jusqu'à 0 en T heures.
    //
    // --- Intensité EFFECTIVE par série (formule d'Epley) ---
    // Ieff = (charge / 1RM) × (1 + reps/30), plafonné à 1 (= série menée à l'échec).
    //   80% × 1 rep  -> Ieff 0.83   ·  80% × 5 -> 0.93  ·  80% × 8 -> 1.0 (échec)
    //   Capte À LA FOIS la charge relative au max ET le nombre de reps.
    epleyRepDivisor: 30,
    intensityStimExp: 1.5,   // S0 ∝ Ieff^1.5 (part "qualité / proximité de l'échec")
    //
    // --- Durée de récupération T, pilotée par la charge de POINTE (% 1RM) ---
    // Aspect force / nerveux : plus on approche du 1RM, plus la récup est longue.
    baseRecoveryHours: 24,
    recoverySlope: 4,        // T = 24 · (1 + 4·(pctPeak − 0.5))
    minRecoveryHours: 18,
    maxRecoveryHours: 96,
    volRecoveryRef: 8,       // volume de référence (reps-équivalent-max)
    volRecoveryPerUnit: 0.02,
    volRecoveryMin: 0.9,
    volRecoveryMax: 1.35,
    //
    // --- Magnitude S0, pilotée par l'intensité effective ET le volume ---
    // Volume V = Σ (%1RM × reps) sur toutes les séries = "reps équivalent-max".
    volStimRef: 10,          // volTerm = V / ref, borné
    volStimMin: 0.3,
    volStimMax: 1.6,
    volStimWeight: 0.5,      // S0 = 100 · Ieff^1.5 · (0.5 + 0.5·volTerm)
    //
    // Charge par défaut pour exos sans 1RM ni poids (PDC / accessoire).
    defaultBodyweightPct: 0.5,
    // Semaine de deload : la fatigue générée est réduite.
    deloadStimulusFactor: 0.6,
    // Muscles synergistes : récup raccourcie (fatigue transmise au taux défini
    // dans SYNERGISTS ci-dessous).
    synergistRecoveryFactor: 0.85,
    // Seuils d'état (fatigue résiduelle en %).
    fresh: 15,      // <= : frais, prêt pour du lourd
    recovering: 40, // <= : en récup, modéré possible
    fatigued: 70,   // <= : fatigué, léger seulement ; au-dessus = épuisé
};

// Fatigue transmise aux muscles synergistes d'un mouvement.
// Ex : au développé couché, les triceps et épaules encaissent une partie de la
// charge. Clé = muscle primaire (après normalisation) -> [[synergiste, fraction]].
const SYNERGISTS = {
    'Pecs':    [['Triceps', 0.5], ['Épaules', 0.45]],
    'Dos':     [['Biceps', 0.5]],
    'Épaules': [['Triceps', 0.35]],
};

// Tags "patterns" (mouvements) — on ne les traite pas comme des muscles.
const PATTERN_TAGS = new Set([
    'Push', 'Pull', 'Legs', 'PDC Push', 'PDC Pull', 'PDC Legs', 'PDC Core', 'PDC',
    'Renfo Run', 'Hyrox Station', 'Hyrox Course', 'Cardio Machine',
    'Cardio Fonctionnel', 'Cardio Carry', 'Streetlifting', 'Sortie', 'Course',
    'Fractionné'
]);

// Normalisation des catégories de la bibliothèque vers des muscles affichés.
const MUSCLE_ALIAS = {
    'Pecs': 'Pecs',
    'Dos': 'Dos',
    'Épaules': 'Épaules',
    'Epaules': 'Épaules',
    'Biceps': 'Biceps',
    'Triceps': 'Triceps',
    'Bras': 'Bras',
    'Jambes': 'Jambes',
    'Legs': 'Jambes',
    'Abdos': 'Abdos / Core',
    'Core': 'Abdos / Core',
};

// Ordre d'affichage préféré des muscles.
const MUSCLE_ORDER = ['Pecs', 'Dos', 'Épaules', 'Biceps', 'Triceps', 'Bras',
    'Jambes', 'Abdos / Core', 'Cardio / Systémique'];

const DAY_NAMES = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

// ---------------------------------------------------------------- utils
function _clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

// Résout la liste des muscles ciblés à partir des catégories d'un exercice.
function musclesFromCategories(categories) {
    const out = new Set();
    (categories || []).forEach(c => {
        if (PATTERN_TAGS.has(c)) return;
        const m = MUSCLE_ALIAS[c] || c;
        out.add(m);
    });
    return [...out];
}

// Estimation du 1RM d'un exercice.
//  1) 1RM explicite (maxTargets) prioritaire ;
//  2) sinon Epley sur la série la plus lourde du programme : w * (1 + reps/30).
function estimate1RM(exoId, allSetsForExo, maxTargets) {
    if (maxTargets && maxTargets[exoId] > 0) return maxTargets[exoId];
    let best = 0;
    (allSetsForExo || []).forEach(s => {
        const w = s.weight || 0, r = s.reps || 1;
        if (w <= 0) return;
        const e = w * (1 + r / 30);
        if (e > best) best = e;
    });
    return best; // 0 si aucune charge (poids de corps / cardio)
}

// Analyse les séries d'un exercice -> charge de pointe, intensité effective de
// pointe et volume total. Prend en compte charge/1RM ET nombre de reps.
function computeExerciseLoad(sets, oneRM) {
    const P = FATIGUE_PARAMS;
    let pctPeak = 0, IeffPeak = 0, V = 0, any = false;
    (sets || []).forEach(s => {
        const reps = Math.max(1, s.reps || 1);
        let pct;
        if (oneRM > 0 && s.weight > 0) pct = s.weight / oneRM;
        else pct = P.defaultBodyweightPct; // PDC / accessoire sans 1RM
        pct = _clamp(pct, 0, 1.15);
        const Ieff = _clamp(pct * (1 + reps / P.epleyRepDivisor), 0, 1);
        pctPeak = Math.max(pctPeak, pct);
        IeffPeak = Math.max(IeffPeak, Ieff);
        V += pct * reps; // reps pondérées par la charge = "reps équivalent-max"
        any = true;
    });
    if (!any) return null;
    return { pctPeak, IeffPeak, V };
}

// Stimulus de fatigue (S0) + durée de récup (T) d'un exercice de force.
//  - S0 (magnitude) piloté par l'intensité effective ET le volume.
//  - T  (durée)     piloté par la charge de pointe (% 1RM) et légèrement le volume.
function strengthEvent(load, isDeload) {
    const P = FATIGUE_PARAMS;
    const intTerm = Math.pow(load.IeffPeak, P.intensityStimExp);
    const volTerm = _clamp(load.V / P.volStimRef, P.volStimMin, P.volStimMax);
    let S0 = 100 * intTerm * (P.volStimWeight + (1 - P.volStimWeight) * volTerm);
    if (isDeload) S0 *= P.deloadStimulusFactor;
    S0 = _clamp(S0, 8, 100);

    let T = P.baseRecoveryHours * (1 + P.recoverySlope * (load.pctPeak - 0.5));
    const volT = _clamp(1 + P.volRecoveryPerUnit * (load.V - P.volRecoveryRef), P.volRecoveryMin, P.volRecoveryMax);
    T = _clamp(T * volT, P.minRecoveryHours, P.maxRecoveryHours);
    return { S0, T };
}

// ---------------------------------------------------------- date helpers
function _parseStartDate(program) {
    let s = program.startDate;
    if (!s) return new Date();
    // Accepte "YYYY-MM-DD" ou ISO.
    const d = new Date(s.length <= 10 ? s + 'T00:00:00' : s);
    return isNaN(d) ? new Date() : d;
}
function _addDays(date, n) { const d = new Date(date); d.setDate(d.getDate() + n); return d; }
function _dayKey(date) { return date.toISOString().slice(0, 10); }
function _hoursBetween(a, b) { return (b - a) / 3600000; }

// ======================================================================
//  ÉTAPE 1 — Extraire tous les "évènements de fatigue" du programme.
//  Un évènement = (date, muscle, S0, T, contexte).
// ======================================================================
function extractFatigueEvents(program, library) {
    const events = [];
    if (!program || !program.weeks) return events;

    const maxTargets = program.maxTargets || {};
    const libById = {};
    (library.exercices || []).forEach(e => { libById[e.id] = e; });

    // Pré-calcul : toutes les séries par exercice (pour estimer le 1RM global).
    const setsByExo = {};
    program.weeks.forEach(w => {
        Object.values(w.days || {}).forEach(items => {
            (items || []).forEach(it => {
                if (it.cardType === 'muscu' && it.sets) {
                    (setsByExo[it.id] = setsByExo[it.id] || []).push(...it.sets);
                }
            });
        });
    });
    const oneRMcache = {};
    const get1RM = id => (oneRMcache[id] !== undefined
        ? oneRMcache[id]
        : (oneRMcache[id] = estimate1RM(id, setsByExo[id], maxTargets)));

    const start = _parseStartDate(program);

    program.weeks.forEach((week, wi) => {
        const isDeload = !!week.deload;
        DAY_NAMES.forEach((dayName, di) => {
            const items = (week.days || {})[dayName];
            if (!items || !items.length) return;
            const date = _addDays(start, wi * 7 + di);

            items.forEach(item => {
                if (item.cardType === 'muscu') {
                    const lib = libById[item.id];
                    const cats = lib ? lib.categories : (item.categories || []);
                    const muscles = musclesFromCategories(cats);
                    if (!muscles.length) return;
                    const oneRM = get1RM(item.id);
                    const load = computeExerciseLoad(item.sets, oneRM);
                    if (!load) return;
                    const { S0, T } = strengthEvent(load, isDeload);
                    // Exercice CHARGÉ sans 1RM défini -> intensité estimée (à signaler).
                    const hasMax = maxTargets[item.id] > 0;
                    const loaded = (item.sets || []).some(s => (s.weight || 0) > 0);
                    const estimated = loaded && !hasMax;
                    const meta = {
                        intensity: load.pctPeak, effIntensity: load.IeffPeak,
                        volume: Math.round(load.V), sets: (item.sets || []).length,
                        exo: item.name, exoId: item.id, emoji: item.emoji,
                        deload: isDeload, oneRM, estimated
                    };
                    muscles.forEach(m => {
                        events.push({ date, muscle: m, S0, T, primary: true, ...meta });
                        // Fatigue transmise aux muscles synergistes.
                        (SYNERGISTS[m] || []).forEach(([sm, factor]) => {
                            events.push({
                                date, muscle: sm, S0: S0 * factor,
                                T: T * FATIGUE_PARAMS.synergistRecoveryFactor,
                                primary: false, ...meta
                            });
                        });
                    });
                } else {
                    // Run / Hyrox / Cardio : fatigue systémique + jambes selon RPE.
                    const ev = enduranceEvent(item, isDeload);
                    if (ev) ev.muscles.forEach(m => events.push({
                        date, muscle: m, S0: ev.S0, T: ev.T,
                        intensity: ev.intensity, sets: 0,
                        exo: item.name, emoji: item.emoji, deload: isDeload, oneRM: 0
                    }));
                }
            });
        });
    });
    return events;
}

// Fatigue générée par une séance d'endurance / cardio (approximation via RPE).
function enduranceEvent(item, isDeload) {
    const d = item.runData || item.hyroxData || item.cardioData || {};
    let rpe = d.rpe;
    if (rpe == null) rpe = 6;
    const I = _clamp(rpe / 10, 0.3, 1);
    let S0 = 100 * Math.pow(I, FATIGUE_PARAMS.intensityExp) * 0.9;
    if (isDeload) S0 *= FATIGUE_PARAMS.deloadStimulusFactor;
    S0 = _clamp(S0, 0, 90);
    const T = _clamp(FATIGUE_PARAMS.baseRecoveryHours * (0.7 + I), 18, 72);
    let muscles = ['Cardio / Systémique'];
    if (item.cardType === 'run' || item.cardType === 'hyrox') muscles.push('Jambes');
    if (item.cardType === 'hyrox') muscles.push('Abdos / Core');
    return { muscles, S0, T, intensity: I };
}

// ======================================================================
//  ÉTAPE 2 — Fatigue résiduelle d'un muscle à un instant donné.
//  Somme des résidus linéaires de chaque évènement passé, plafonnée à 100.
// ======================================================================
function residualFatigue(events, muscle, at) {
    let f = 0;
    for (const e of events) {
        if (e.muscle !== muscle) continue;
        const h = _hoursBetween(e.date, at);
        if (h < 0 || h >= e.T) continue; // pas encore fait, ou déjà récupéré
        f += e.S0 * (1 - h / e.T);
    }
    return _clamp(f, 0, 100);
}

// Intensité max ré-attaquable (% 1RM) = complément de la fatigue résiduelle.
function safeIntensity(fatigue) { return _clamp(100 - fatigue, 0, 100); }

function statusOf(fatigue) {
    const P = FATIGUE_PARAMS;
    if (fatigue <= P.fresh) return { key: 'fresh', label: 'Frais', color: 'var(--green)' };
    if (fatigue <= P.recovering) return { key: 'recovering', label: 'Récup.', color: 'var(--orange)' };
    if (fatigue <= P.fatigued) return { key: 'fatigued', label: 'Fatigué', color: 'var(--orange)' };
    return { key: 'spent', label: 'Épuisé', color: 'var(--red)' };
}

// ======================================================================
//  ÉTAPE 3 — Construire la timeline complète du bloc.
//  Renvoie { muscles:[...], days:[{date,label,weekIndex,deload}],
//            grid: { muscle: [ {fatigue,safe,status,trained} par jour ] },
//            nextHeavy: { muscle: date|null } }
//  On échantillonne la fatigue en début de journée (08:00) = "puis-je
//  m'entraîner ce muscle aujourd'hui ?".
// ======================================================================
function buildTimeline(program, library, opts) {
    opts = opts || {};
    const sampleHour = opts.sampleHour != null ? opts.sampleHour : 8;
    const events = extractFatigueEvents(program, library);

    // Muscles réellement présents.
    const present = new Set(events.map(e => e.muscle));
    const muscles = MUSCLE_ORDER.filter(m => present.has(m))
        .concat([...present].filter(m => !MUSCLE_ORDER.includes(m)));

    // Étendue des jours : du début du programme à la fin du bloc + marge de récup.
    const start = _parseStartDate(program);
    const nbWeeks = (program.weeks || []).length || 1;
    const totalDays = nbWeeks * 7;

    const days = [];
    for (let i = 0; i < totalDays; i++) {
        const date = _addDays(start, i);
        const wi = Math.floor(i / 7);
        days.push({
            date,
            key: _dayKey(date),
            dayName: DAY_NAMES[i % 7],
            weekIndex: wi,
            deload: !!(program.weeks[wi] && program.weeks[wi].deload),
            label: date.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: '2-digit' })
        });
    }

    // Quels muscles sont travaillés quel jour (pour marquer les séances).
    const trainedByDay = {};
    events.forEach(e => {
        const k = _dayKey(e.date);
        (trainedByDay[k] = trainedByDay[k] || {});
        (trainedByDay[k][e.muscle] = trainedByDay[k][e.muscle] || []).push(e);
    });

    const grid = {};
    const nextHeavy = {};
    muscles.forEach(m => {
        grid[m] = days.map(day => {
            const at = new Date(day.date); at.setHours(sampleHour, 0, 0, 0);
            const fatigue = residualFatigue(events, m, at);
            const trained = (trainedByDay[day.key] && trainedByDay[day.key][m]) || null;
            return {
                fatigue: Math.round(fatigue),
                safe: Math.round(safeIntensity(fatigue)),
                status: statusOf(fatigue),
                trained: trained ? trained.map(e => ({
                    exo: e.exo, emoji: e.emoji, intensity: Math.round(e.intensity * 100),
                    estimated: !!e.estimated
                })) : null
            };
        });
        // Premier jour "frais" après la dernière séance de ce muscle.
        nextHeavy[m] = null;
        const idxLast = [...days.keys()].reverse().find(i => grid[m][i].trained);
        if (idxLast != null) {
            for (let i = idxLast + 1; i < days.length; i++) {
                if (grid[m][i].fatigue <= FATIGUE_PARAMS.fresh) { nextHeavy[m] = days[i]; break; }
            }
        }
    });

    // 1RM manquants : exercices chargés dont l'intensité est estimée (pas de max défini).
    const estimatedByMuscle = {};
    const missingSet = {};
    events.forEach(e => {
        if (!e.estimated) return;
        (estimatedByMuscle[e.muscle] = estimatedByMuscle[e.muscle] || new Set()).add(e.exo);
        if (e.exoId) missingSet[e.exoId] = e.exo;
    });
    muscles.forEach(m => { estimatedByMuscle[m] = estimatedByMuscle[m] ? [...estimatedByMuscle[m]] : []; });
    const missingMaxExos = Object.entries(missingSet).map(([id, name]) => ({ id, name }));

    return { muscles, days, grid, nextHeavy, events, estimatedByMuscle, missingMaxExos };
}

// Exposition globale (chargé en <script>, pas de modules ES).
if (typeof window !== 'undefined') {
    window.FatigueModel = {
        FATIGUE_PARAMS, buildTimeline, extractFatigueEvents, residualFatigue,
        safeIntensity, statusOf, estimate1RM, musclesFromCategories
    };
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { FATIGUE_PARAMS, buildTimeline, extractFatigueEvents, residualFatigue, safeIntensity, statusOf, estimate1RM, musclesFromCategories };
}
