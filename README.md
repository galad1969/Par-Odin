# Par Odin — Web 3D

Application web solo en 3D, **100 % côté client**, permettant de jouer au jeu de casse-tête **Par Odin** dans le respect strict des règles du livret Print & Play officiel (7 dés blancs gravés + le dé noir **Fenrir**).

---

## Fonctionnalités

- **Plateau 3D Valhalla & lancer physique** : dés biseautés gravés en relief (textures HD procédurales + `bumpMap`), lancer rigide simulé avec `cannon-es` et table en chêne gravée de runes nordiques.
- **3 modes de jeu** :
  1. **Campagne officielle (18 défis)** : les 3 chapitres du livret (**Brokk le Nain** 1–5, **Loki** 6–15, **Frigg** 16–18), rappels de règles, citations mythologiques et progression sauvegardée dans le navigateur (`localStorage`).
  2. **Générateur de défis** : filtrage instantané sur les **1 584** configurations canoniques (solution unique `1`, multiples `2–10` ou solvable `≥ 1` ; filtres `Interdit / Autorisé / Requis` sur *Traître*, *Maudit*, *Mage* ; activation de *Fenrir* ; préréglages *Brokk / Loki / Frigg*), affichage du nombre exact de solutions et partage par lien/code (`?seed=ODIN-XXXXXXX-F0/F1`).
  3. **Lancer libre** : vrai lancer aléatoire des dés 3D, bouton **« Déclarer impossible ! »** pour gagner sur les tirages à `0` solution (`19,6 %` sans Fenrir, `7,9 %` avec Fenrir) et option *« Garantir ≥ 1 solution »*.
- **Mode Puriste par défaut + Mode Aide facultatif** : aucun score intermédiaire n'est affiché par défaut pour préserver le calcul mental ; l'interrupteur **Mode Aide** révèle en temps réel les totaux des deux camps et les effets directement sur les dés 3D (`3 → 0`, `? → N`, `×2`).
- **Indices & navigateur de solutions** : bouton *Indice* (verrouille 2 dés clés avec un halo doré) et *Voir la solution* avec rangement animé en 3D, équation détaillée et sélecteur **`◀ Solution 1 / N ▶`**.
- **Audio synthétisé** : chocs bois modulés par la vélocité des impacts et accord nordique de victoire via Web Audio API, avec bouton muet.

---

## Règles résumées

Répartis **tous les dés** en **deux armées de force strictement égale**, avec **au moins 1 guerrier blanc dans chaque armée**.

| Dé | Face | Valeur | Effet |
| :--- | :--- | :---: | :--- |
| Blanc | **Héros** (casque violet) | `3` | Force fixe de `3`. |
| Blanc | **Capitaine** (épées grises) | `2` | Force fixe de `2`. |
| Blanc | **Soldat** (bouclier vert) | `1` | Force fixe de `1`. |
| Blanc | **Traître** (capuche rouge) | `1` | Réduit à `0` la force d'**un seul** *Héros* de son armée. |
| Blanc | **Maudit** (anneau jaune) | `-1` | Force négative de `-1`. |
| Blanc | **Mage** (chapeau bleu) | `?` | Force égale au nombre de **faces blanches non-mages** de son armée (*Héros annulé inclus, hors dé noir*). |
| Noir | **Loup Fenrir** (loup bleu) | `×2` | Intervient **après** les faces blanches et double **une seule** occurrence de la face blanche la plus forte de son armée. |

---

## Contrôles 3D (PC & Mobile)

- **Glisser-déposer** un dé directement vers *Armée Gauche*, *Réserve* ou *Armée Droite*.
- **Clic gauche / Tap rapide** sur un dé : cycle `Réserve → Armée Gauche → Armée Droite → Réserve`.
- **Clic droit (PC)** sur un dé : envoi direct dans *Armée Droite* (ou retour en *Réserve*).
- **Glisser sur le fond** : orienter la caméra autour de la table (bouton `⌖` pour recentrer).

---

## Démarrage rapide

Prérequis : **Node.js ≥ 24** et **npm**.

```bash
npm install
npm run dev
```

Puis ouvre `http://localhost:5173` dans ton navigateur.

### Commandes disponibles

| Commande | Description |
| :--- | :--- |
| `npm run dev` | Lance le serveur de développement Vite. |
| `npm test` | Exécute les tests unitaires natifs (`node:test`) : 18 défis officiels, cas limites, catalogue des 1 584 états, parité de score et physique 3D. |
| `npm run build` | Vérifie le typage strict (`tsc --noEmit`) et génère le bundle statique dans `dist/`. |
| `npm run preview` | Prévisualise le build de production généré dans `dist/`. |

---

## Architecture

Stack volontairement minimaliste (**TypeScript + Vite + Three.js + cannon-es**, sans framework UI ni runner externe) :

- `index.html`, `src/main.ts`, `src/style.css` — Interface responsive, 3 modes, `localStorage` et partage `?seed=...`.
- `src/rules.ts`, `src/campaign.ts` — Moteur de règles pur, solveur canonique, catalogue et les 18 défis officiels.
- `src/physics.ts`, `src/board3d.ts`, `src/textures.ts`, `src/audio.ts` — Simulation rigide, plateau 3D, faces gravées `<canvas>` et audio Web Audio API.
- `tests/rules.test.ts` — Suite de vérification automatisée.

Pour les détails techniques, invariants et consignes de contribution, voir [AGENTS.md](AGENTS.md).

---

## Crédits

Projet fan **non officiel** à but ludique et éducatif, inspiré du jeu **Par Odin** créé par **Antonin Boccara**, illustré par **Michel Verdu** et édité par **OldChap Games**. Le livret Print & Play officiel (`Par-OdinPNP.pdf`) n'est pas redistribué dans ce dépôt.
