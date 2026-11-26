# AGENTS.md — Par Odin Web 3D

Application web solo en 3D, 100 % côté client, permettant de jouer à **Par Odin** dans le périmètre exact du livret Print & Play officiel (`Par-OdinPNP.pdf` à la racine du dépôt).

---

## 1. Commandes essentielles

Environnement requis : **Node.js ≥ 24** (exécution native des fichiers `.ts` pour les tests sans runner externe) et **npm**.

| Commande | Action |
| :--- | :--- |
| `npm install` | Installe les dépendances (`three`, `cannon-es`, `typescript`, `vite`, `@types/three`). |
| `npm run dev` | Démarre le serveur de développement Vite (`http://localhost:5173`). |
| `npm test` | Exécute la suite unitaire native Node 24 (`node --test tests/rules.test.ts`). |
| `npm run build` | Vérifie le typage strict (`tsc --noEmit`) puis génère le bundle de production (`dist/`). |
| `npm run preview` | Prévisualise le build de production généré dans `dist/`. |

> Sous Windows PowerShell 5.1, enchaîner les vérifications avec `npm test; if ($?) { npm run build }`.

---

## 2. Règles du jeu & Invariants métier

Toute la logique doit respecter strictement `Par-OdinPNP.pdf` (vérifié sur les 18 solutions de la page 22) :

### Matériel
- **7 dés blancs** identiques portant les **6 guerriers** sur leurs 6 faces :
  - **Héros (`3`)** — casque violet (`H`)
  - **Capitaine (`2`)** — épées croisées grises (`C`)
  - **Soldat (`1`)** — bouclier vert (`S`)
  - **Traître (`1`)** — capuche rouge (`T`) : réduit à `0` la force d'**un seul** *Héros* présent dans la même armée.
  - **Maudit (`-1`)** — anneau jaune (`M`) : force négative `-1`.
  - **Mage (`?`)** — chapeau bleu (`G`) : force égale au nombre de **faces blanches non-mages** de son armée (*un Héros réduit à `0` par un Traître compte toujours comme face non-mage ; un dé noir ne compte pas*).
- **0 ou 1 dé noir** portant **Fenrir le Loup (`×2`)** sur ses 6 faces (`F`) :
  - Intervient **après** le calcul de toutes les faces blanches.
  - Multiplie par `2` la force d'**une seule** occurrence de la face blanche la plus forte de son armée (cas prouvé par le Défi 18 où quatre faces à `1` donnent `2 + 1 + 1 + 1 = 5`, et si l'armée ne contient que des Maudits `-1`, un seul passe à `-2`).

### Définition mathématique d'une solution
1. **Tous les dés** du défi (`7` blancs + `0` ou `1` noir) doivent être répartis entre Armée Gauche et Armée Droite (aucun dé en réserve).
2. **Aucune armée vide** : chaque armée doit contenir **au moins 1 dé blanc (guerrier)** (`evaluateArmy().valid === true`). Un Fenrir seul est invalide.
3. **Symétrie Gauche / Droite ignorée** : permuter les deux armées compte pour une seule solution.
4. **Dés identiques indiscernables** : une solution est identifiée par la composition (multi-ensemble de faces) de chaque camp.

Sur cet espace de **1 584** configurations canoniques (`792` sans Fenrir + `792` avec Fenrir) :
- Sans Fenrir : **245** défis à solution unique, **279** à solutions multiples (2 à 6), **268** impossibles (`19,6 %` d'un jet aléatoire équiprobable).
- Avec Fenrir : **177** défis à solution unique, **508** à solutions multiples (2 à 10), **107** impossibles (`7,9 %` d'un jet aléatoire).

---

## 3. Architecture du dépôt

Architecture plate sans framework UI, ni gestionnaire d'état tiers, ni bibliothèque audio :

| Fichier | Responsabilité |
| :--- | :--- |
| `index.html` | Structure DOM unique : `<canvas id="board-canvas">`, calques projetés (`#aid-links`, `#aid-badges`, `#zone-banners`), `#top-hud`, `#solution-bar`, `#action-bar`, `#modal-backdrop`. |
| `src/rules.ts` | Moteur pur (sans DOM ni WebGL) : `FACE_INFO` (source unique de vérité des couleurs, badges et règles), `evaluateArmy()`, `fastArmyScore()`, `solveChallenge()`, catalogue mis en cache `getCatalog()`, `filterCatalog()`, `generateChallenge()`, `encodeSeed()`/`decodeSeed()`, `pickHintPlacement()`, `mapSolutionToDice()`. |
| `src/campaign.ts` | Données des **18 défis officiels** regroupés en 3 chapitres (**Brokk** 1–5, **Loki** 6–15, **Frigg** 16–18), rappels de règles et citations du livret. |
| `src/physics.ts` | Pré-simulation rigide `cannon-es` (`simulatePhysicsRoll()`) et table des normales/quaternions `WHITE_FACE_SLOTS` / `FACE_UP_QUAT`. Exécutable en pur Node. |
| `src/textures.ts` | Dessin vectoriel `<canvas>` (`512×512`) des 7 faces gravées (albedo + `bumpMap`) en lisant couleurs et badges depuis `FACE_INFO`, plus la texture chêne et runes Elder Futhark de la table. |
| `src/board3d.ts` | Scène Three.js (`Board3D`) : table Valhalla, dés biseautés (`RoundedBoxGeometry` + 6 plans de faces), `OrbitControls` bornés, glisser-déposer 3D, clic/tap rapide (`reserve → left → right → reserve`), clic droit PC (`→ right`), halos d'indice et calque projeté d'aide. |
| `src/audio.ts` | Synthétiseur Web Audio API (`SoundEngine`) : chocs bois modulés par la vélocité d'impact, pose, indice, erreur, accord de victoire ; déverrouillage différé au premier geste utilisateur. |
| `src/main.ts` | Orchestration des **3 modes** (`campaign`, `generator`, `freeroll`), machine d'états, persistance `localStorage` (`par-odin-3d-v1`), synchronisation URL `?seed=ODIN-XXXXXXX-F0/F1` et rendu DOM du HUD. |
| `src/style.css` | Styles nordiques responsives PC et mobile portrait (`@media (max-width: 720px)`). |
| `tests/rules.test.ts` | Suite de 5 tests natifs `node:test` couvrant les 18 défis, les cas limites, le catalogue, la parité des deux moteurs de score et l'orientation 3D de `simulatePhysicsRoll()`. |

---

## 4. Fonctionnement des mécanismes critiques

### Lancer physique guidé (`src/physics.ts`)
- Un jet `cannon-es` complet est simulé en mémoire (~3 ms) dans l'enceinte du plateau (jusqu'à 6 tentatives si un dé repose en équilibre instable `alignment < 0.96`).
- En mode **Campagne** ou **Générateur** (lancer guidé), on calcule pour chaque dé la rotation de symétrie exacte du cube $R_{\text{perm}} = q_{\text{landed}}^{-1} \cdot q_{\text{target}}$ qui mappe la face finale simulée sur la face cible. Multiplier toute la trajectoire par $R_{\text{perm}}$ conserve des rebonds et collisions 100 % physiques sans aimantation en fin de course.
- En mode **Lancer libre** sans filtre, $R_{\text{perm}} = I$ : les faces qui se retrouvent en haut (`+Y`) à la fin de la physique deviennent le défi.
- **Invariant de couplage** : l'ordre et les orientations des 6 faces dans `WHITE_FACE_SLOTS` (`src/physics.ts`) et `FACE_PLANE_SPECS` (`src/board3d.ts`) doivent toujours rester strictement alignés.

### Machine d'états & Modes de jeu (`src/main.ts`)
- États possibles : `status: 'rolling' | 'playing' | 'won' | 'solution'`.
- **Mode Puriste par défaut (`aidMode = false`)** : aucun total ni badge n'est affiché pendant la recherche. En cas d'échec de *Vérifier la bataille*, les scores chiffrés ne sont **jamais** divulgués en Mode Puriste.
- **Mode Aide (`aidMode = true`)** ou états `won` / `solution` : affiche les totaux des deux camps et les badges/arcs 3D (`3 → 0`, `? → N`, `×2`).
- **Validation stricte** : *Vérifier la bataille*, *Déclarer impossible !* et *Indice* ne sont actifs que lorsque `status === 'playing'`. Consulter *Voir la solution* passe en `status = 'solution'` et ne valide jamais un défi en Campagne.
- **Lancer libre** : si l'utilisateur coche *Garantir ≥ 1 solution* alors que le tirage actuel a `0` solution, un nouveau lancer solvable est immédiatement déclenché.
- **Performance HUD** : `syncBoardAndUI(refreshContext)` ne reconstruit `#context-bar` (et ne réexécute `filterCatalog`) que si `refreshContext === true`, jamais lors d'un simple déplacement de dé.

### Rendu 3D & Perf WebGL (`src/board3d.ts`)
- **Matériaux partagés** : `whiteBodyMat`, `blackBodyMat`, `haloMat` et `faceMats` sont créés **une seule fois** dans le constructeur de `Board3D` et réutilisés à chaque `createDieMesh()` afin d'éviter toute fuite mémoire GPU entre les lancers.
- **Ordre d'appel au lancer** : appeler `board.rollDice(...)` avant `syncBoardAndUI(true)` pour ne pas créer deux fois les meshes lors d'un changement 7 ↔ 8 dés.
- **Delta `requestAnimationFrame`** : toujours borner `dt = Math.max(0, Math.min(0.05, ...))` (la première frame rAF peut produire un delta négatif par rapport à `performance.now()`).
- **Overlays projetés** : `projectToScreen()` arrondit à `0,5 px` et `setOverlayHtml()` met en cache les chaînes HTML/SVG pour ne muter le DOM que lors d'un changement réel.
- **Orientation mobile** : `resize()` détecte le basculement portrait ↔ paysage (`wasPortrait`) et appelle `resetCamera()` pour ajuster la distance de la caméra.

---

## 5. Règles et garde-fous pour les agents IA

1. **Vérification obligatoire avant livraison** : exécuter `npm test` puis `npm run build` après toute modification. Tout changement de règle ou d'orientation doit être couvert dans `tests/rules.test.ts`.
2. **Parité des moteurs de score** : `evaluateArmy()` (utilisé par l'interface et la validation) et `fastArmyScore()` (utilisé par le solveur et le catalogue des 1 584 états) dans `src/rules.ts` doivent toujours produire des résultats identiques. Ne jamais modifier l'un sans mettre à jour l'autre et vérifier le test de parité.
3. **Conventions TypeScript & Node 24** :
   - `tsconfig.json` impose `strict: true`, `noUnusedLocals: true`, `noUnusedParameters: true`, `allowImportingTsExtensions: true` et `erasableSyntaxOnly: true` (pas d'`enum`, pas de `namespace`, pas de propriétés de paramètre de constructeur).
   - Tous les imports locaux doivent conserver l'extension `.ts` pour rester exécutables directement par `node --test`.
   - `src/rules.ts`, `src/campaign.ts` et `src/physics.ts` ne doivent jamais dépendre du DOM ni de WebGL afin que `npm test` reste 100 % autonome en Node.
4. **Discipline minimaliste (Ponytail)** :
   - N'ajouter aucune dépendance runtime ou de test (pas de framework UI, pas de bundler/CSS tiers, pas de runner de tests supplémentaire) sans accord explicite de l'utilisateur.
   - Conserver la structure plate de `src/`, éviter les abstractions spéculatives et réutiliser les matériaux WebGL et constantes partagées (`FACE_INFO`).
5. **Respect du périmètre validé** : ne jamais casser la sauvegarde `localStorage` (`par-odin-3d-v1`), la compatibilité des seeds `?seed=ODIN-XXXXXXX-F0/F1`, ni la distinction Mode Puriste (défaut) / Mode Aide (facultatif).
