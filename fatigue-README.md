# Module Fatigue musculaire

Calcule, pour **chaque muscle** et **chaque jour** d'un bloc, la **fatigue résiduelle**
et l'**intensité max ré-attaquable sans risque** — pour savoir quand retravailler un
muscle sans se blesser.

## Fichiers

| Fichier | Rôle |
|---|---|
| `fatigue-model.js` | Le modèle (fonctions pures, aucune dépendance DOM). Exposé via `window.FatigueModel`. |
| `fatigue-panel.js` | **Volet repliable** injecté à droite de l'éditeur. Autonome, exposé via `window.FatiguePanel`. |
| `fatigue-panel.css` | Styles du volet (tout préfixé `.ftg-`). |
| `fatigue.html` | Visualiseur plein écran autonome (bonus, même modèle). |

## Le volet dans l'éditeur

Clique sur **Fatigue** (barre du haut) ou sur la poignée verticale à droite. Le volet :

- s'**auto-injecte** dans la page — il ne modifie aucune fonction/variable de l'éditeur ;
- lit le programme via la fonction globale `exportProgramData()` et la bibliothèque via
  `exerciseLibrary`, puis calcule tout avec `FatigueModel` ;
- affiche la **heatmap du bloc complet** (muscles × jours) + un **sélecteur de jour**
  (clique une colonne) + des **cartes d'état** par muscle pour le jour choisi ;
- se met à jour **en temps réel** : un `MutationObserver` surveille `#weekTable`, donc
  tout ajout / édition / suppression d'exercice ou de semaine recalcule le volet
  (débounce 250 ms). Écoute aussi `BroadcastChannel 'benchmaster_sync'` pour la synchro
  inter-onglets ;
- la poignée affiche un **badge** = pire fatigue du jour courant.

Intégration (déjà faite dans `editor.html`) :

```html
<link rel="stylesheet" href="fatigue-panel.css">   <!-- dans <head> -->
...
<script src="fatigue-model.js"></script>            <!-- après mobile.js -->
<script src="fatigue-panel.js"></script>
<!-- bouton : onclick="FatiguePanel.toggle()" -->
```

> Les fichiers du module sont désormais à la **racine de `enhanced/`** (plus de sous-dossier `fatigue/`).

## Le modèle

Chaque séance impose sur un muscle une **charge de fatigue `S0`** (0–100) qui décroît
linéairement jusqu'à 0 sur une **durée de récupération `T`** (heures). Les fatigues de
plusieurs séances **s'additionnent** (plafond 100).

Le calcul part de **chaque série** et prend en compte **la charge relative au 1RM ET
le nombre de reps** :

```
Pour chaque série :
  pct  = charge / 1RM                       (charge relative au max — aspect force)
  Ieff = pct · (1 + reps/30)   plafonné à 1  (Epley : capte charge + reps + échec)
Agrégats de l'exercice :
  pctPeak  = plus grosse charge (% 1RM)     → pilote la DURÉE T
  IeffPeak = série la plus dure              → pilote la MAGNITUDE S0
  V        = Σ (pct · reps)  = "reps équivalent-max"  → volume

S0 = 100 · IeffPeak^1.5 · (0.5 + 0.5 · V/10)          borné [8, 100]
T  = 24 · (1 + 4·(pctPeak − 0.5)) · ajustVolume       borné [18 h, 96 h]

fatigue(t)     = Σ  S0ₑ · (1 − Δtₑ / Tₑ)   sur les séances passées, plafonné à 100
intensité sûre = 100 − fatigue             (% du 1RM ré-attaquable sans risque)
```

Pourquoi `Ieff` (Epley) : à charge égale, **plus de reps = plus dur** (80 %×8 mène à
l'échec, 80 %×1 non). `Ieff` capte cette proximité de l'échec ; `pctPeak` capte le
stress nerveux (un single à 100 % récupère lentement même à faible volume).

- **1RM — sur quoi on se base** (3 niveaux, meilleur signal disponible) :
  1. `maxTargets[id]` défini → `pct = charge / 1RM` (**exact**, la vraie base force) ;
  2. chargé mais **sans 1RM** → 1RM **estimé** par Epley `w·(1 + reps/30)` sur la série
     la plus lourde du programme (**relatif** — signalé dans le volet, voir ci-dessous) ;
  3. sans charge (PDC/cardio) → `pct = 0.5` par défaut (muscu) ou RPE (course/hyrox).
- **Alerte 1RM manquant** : tout exercice **chargé sans 1RM défini** est signalé dans le
  volet — bannière « ⚠️ N exercices sans 1RM » (+ bouton *Définir les 1RM* qui ouvre la
  modale) et badge « ≈ estimé » sur les muscles concernés. Dès qu'un 1RM est saisi, le
  volet se rafraîchit tout seul (surveillance de `benchmaster_maxes`). `buildTimeline`
  renvoie `estimatedByMuscle` et `missingMaxExos` pour ça. Les exercices au **poids de
  corps ne sont pas signalés** (un 1RM n'y a pas de sens).
- **Synergistes** (`SYNERGISTS`) : un mouvement transmet une fraction de sa fatigue aux
  muscles assistants — DC → Triceps (50 %) + Épaules (45 %) ; Tirage/Dos → Biceps (50 %).
- **Semaine deload** : `S0` réduit de 40 %.
- **Cardio / course / hyrox** : fatigue systémique (+ jambes/core) approximée via le RPE.

### Sensibilité (validée numériquement)

Reps à charge fixe **80 %** (3 séries) — le nombre de reps compte enfin :

| Séance | S0 | sûr @24 h |
|---|---|---|
| 80 % × 1 | 49 | 76 % |
| 80 % × 3 | 71 | 62 % |
| 80 % × 5 | 99 | 43 % |
| 80 % × 8 (échec) | 100 | 37 % |

Charge à reps fixes **×3 (3 séries)** — la charge/max compte :

| 60 % | 70 % | 80 % | 90 % |
|---|---|---|---|
| S0 41 | S0 55 | S0 71 | S0 89 |

### Repères de calibration

| Séance | Récup. complète | sûr @24 h |
|---|---|---|
| **Lourd** 90 % × 3 × 5 | **~69 h (3 j)** | 35 % 1RM |
| Singles **100 %** × 1 × 3 | ~65 h | 59 % 1RM |
| **80 %** top-set × 3 × 3 | ~52 h | 62 % → 70 % à +28 h |
| 80 % × 5 × 4 (gros volume) | ~61 h | 39 % 1RM |

→ Après un 80 % en top-set, on peut refaire du ~70 % le lendemain mais pas du 80 %, et
il faut ~3 jours pleins avant de recharger du lourd. Conforme à l'exemple.

## Réglage

Tous les paramètres sont dans `FATIGUE_PARAMS` en haut de `fatigue-model.js`
(exposant d'intensité, pentes de récup, seuils d'état, facteur deload…). Le biais est
volontairement **prudent** (« sans peur de se blesser »).

## API

```js
const tl = FatigueModel.buildTimeline(program, library);
// tl.muscles : string[]
// tl.days    : [{date, key, dayName, weekIndex, deload, label}]
// tl.grid[muscle][i] : {fatigue, safe, status, trained}
// tl.nextHeavy[muscle] : premier jour "frais" après la dernière séance (ou null)

FatigueModel.residualFatigue(tl.events, 'Pecs', new Date()); // 0..100
FatigueModel.safeIntensity(fatigue);                         // % 1RM sûr
FatigueModel.statusOf(fatigue);                              // {key,label,color}
```

### Codes couleur (états)

| Fatigue | État | Reco |
|---|---|---|
| 0–15 % | Frais 🟢 | lourd OK |
| 15–40 % | Récup. 🟠 | modéré |
| 40–70 % | Fatigué 🟠 | léger seulement |
| 70–100 % | Épuisé 🔴 | repos |
