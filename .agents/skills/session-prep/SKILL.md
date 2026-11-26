---
name: session-prep
description: >-
  À utiliser lorsque l'utilisateur demande de « préparer la session »,
  « prépare la prochaine séance », « prépa de session », « audit de
  pré-séance », « fiche MJ », « fiche de séance », « sommes-nous prêts à
  jouer », « prep for session », « review before game night », « session
  checklist », « pre-session review », « GM prep », ou indique qu'une partie a
  lieu bientôt (« on joue ce soir », « session demain », « running tonight »).
  Exécute un audit pré-séance Daggerheart inspiré du Lazy GM pour L'Âge de
  l'Umbre et génère un tableau de bord MJ Obsidian prêt à jouer en croisant le
  coffre local et, s'il est disponible, le serveur MCP heart-of-daggers. Ne pas
  utiliser pour résumer ou rédiger un compte-rendu après séance, créer un PJ ou
  répondre à une simple question de règles.
---

# Audit & Préparation de Session Daggerheart (*L'Âge de l'Umbre*)

## Objectif

Réaliser un **audit pré-séance ciblé** et produire un **tableau de bord MJ Obsidian prêt à jouer**, calibré sur le **SRD Daggerheart** et les principes *Lazy GM* (*play to find out* plutôt qu'un scénario linéaire).

---

## Étape 0 : Ancrage, Session Cible & Cas Limites

Avant de lire la campagne ou d'appeler des outils externes, sécurisez le cadre :

1. **Vérifier `AGENTS.md` (à la racine du dépôt) :** Il constitue la source unique du lexique Daggerheart VF, des conventions Obsidian, des **Gabarits 5, 6 et 7** (`Daggerheart Adversary`, `Daggerheart Environment`, `Daggerheart Encounter`) et du protocole §7. S'il est absent ou illisible, prévenez le MJ avant d'écrire dans le coffre.
2. **Déterminer la session cible dans `Age of Umbra/Campagne/` :**
   * Si le dernier dossier `Session X/` contient une ébauche ou un scénario sans compte-rendu de fin de séance → c'est la session cible.
   * Sinon → préparez `Session X+1`.
3. **Traiter les cas limites :**
   * **Session 1 (aucun `Compte-rendu.md` ni ébauche) :** Appuyez-vous sur `Age of Umbra/Session Zéro.md`, `Age of Umbra/Aperçu.md` et les fiches PJ ; initialisez la Peur MJ reportée à `1 / PJ` (SRD, *Using Fear*).
   * **Fiche `Préparation MJ - Session X.md` déjà existante :** Lisez-la et proposez une **mise à jour incrémentale** (ajouts, corrections, rééquilibrages) plutôt qu'un écrasement complet.
   * **Serveur MCP `heart-of-daggers` indisponible :** Exécutez l'audit sur le coffre seul et marquez `Non vérifié (MCP indisponible)` sur les éléments qui dépendent du SRD, des BP ou des suppléments PDF.

---

## Sources de Données & Routage

Séparez le **canon vivant de la campagne** de la **bibliothèque de règles et suppléments** :

### 1. Coffre Obsidian local (Source de vérité primaire — Lecture ciblée)
Pour éviter de saturer le contexte, ne chargez pas des dossiers entiers à l'aveugle :
* **Socle minimal à lire :** `AGENTS.md`, `Age of Umbra/Aperçu.md`, `Age of Umbra/Mécanismes de la campagne.md`, `Age of Umbra/PJ/Personnages Joueurs.md` (et les fiches des PJ présents ce soir), le dernier `Compte-rendu.md` (ou la fiche de préparation précédente pour récupérer `peur_reportee`), ainsi que l'ébauche de la séance à venir.
* **Suivi par liens :** Ouvrez ensuite uniquement les notes `[[wikilinks]]` (PNJ, lieux, adversaires) réellement impliquées dans cette séance.
* **Zones préservées en lecture seule :** Laissez intactes `Age of Umbra/PJ/Raw/` (questionnaires originaux des joueurs) et `Adversaires/Adversaires Daggerheart/` (archive officielle Demiplane) afin de ne pas altérer les données sources ; les créatures propres à la campagne vont dans `Age of Umbra/Adversaires/`.

### 2. Serveur MCP `heart-of-daggers` (Bibliothèque PDF, SRD & Homebrew Kit — Lecture seule)
N'interrogez le MCP qu'après le triage du coffre, pour vérifier une règle, équilibrer une rencontre, rescaler un adversaire, adapter un supplément PDF ou combler un manque précis.

**Outils disponibles :**
* **Navigation PDF & adaptation :** `list_documents(filter_text, lang)` *(PDF indexés uniquement, jamais les notes Obsidian)*, `get_document_toc(filename)`, `read_pdf_pages(filename, start_page, end_page)` *(max 6 pages par appel)*, `extract_campaign_frame(document, lang)`, `convert_to_session_prep(document, chapter_or_pages, campaign_context)` *(lire d'abord les pages concernées via `get_document_toc` + `read_pdf_pages`)*.
* **Règles & rencontres :** `search_srd(query, limit)`, `search_documents(query, filename, lang, limit)`, `build_encounter(party_size, party_tier, difficulty, theme, document, lang)`, `get_homebrew_benchmarks(target_tier, role, source_adversary, document)`.
* **Extraction de fiches & tables :** `search_adversaries`, `extract_adversary_card`, `search_environments`, `extract_environment_card`, `search_loot`, `extract_item_card`, `search_player_options`, `build_npc_profile`, `compile_theme_tables`.

> **Pourquoi s'en tenir à cette liste :** seuls ces outils existent sur `heart-of-daggers`. Il n'héberge ni gestionnaire VTT (`list_maps`, `get_map`, `list_characters`) ni écriture de documents (`create_document`), il est donc inutile de chercher ou d'appeler de tels outils.

* **Astuce bilingue :** La majorité des PDF indexés étant en anglais, formulez les requêtes MCP (`query`, `theme`, `role`, `env_type`) avec les **mots-clés VO du SRD** (ex. `Skulk`, `Exploration`, `undead shadow`), puis rédigez toutes les sorties en français avec le lexique VF de `AGENTS.md`.
* **Traçabilité des sources :** Notez la provenance `(document, p. X)` pour chaque statblock, environnement, objet ou règle tiré du MCP (et `Coffre` ou `[Suggestion]` sinon) afin que chaque donnée reste vérifiable.

---

## Principes Directeurs

1. **Ancrage & zéro invention silencieuse :** Appuyez tout élément de lore, statistique ou intrigue sur les notes du coffre ou sur des pages vérifiées du MCP. Préfixez toute proposition nouvelle (piste, complication, *Fear Move*, adaptation de stats) par `[Suggestion]`. Si une donnée canonique manque dans le coffre, signalez-le et proposez 2 à 3 options cohérentes au MJ (règle `AGENTS.md`).
2. **Triage en deux niveaux :**
   * **Essentiel (bloquant si absent) :** Ouverture *In Media Res*, effectif & Tier réels des PJ présents, Peur reportée, motivation des PNJ centraux, adversaires/BP vérifiés au bon Tier pour les combats attendus.
   * **Confort (enrichissement) :** Question d'ouverture, scènes potentielles secondaires, second environnement, rumeurs d12, butin additionnel, compteurs secondaires.
3. **Tri anti-bloat :**
   * Un PNJ purement social n'a besoin ni de statblock de combat ni d'inventaire — nom, description et motivation suffisent (SRD, *Running GM NPCs*). Un PNJ allié en combat n'a pas non plus besoin d'un statblock complet : une simple *NPC Feature* (déclencheur + effet) suffit.
   * Une battlemap ou des tokens VTT ne sont une lacune que si le MJ joue sur VTT (par défaut, Daggerheart utilise des portées abstraites : *Mêlée, Très Proche, Proche, Lointain, Très Lointain*).

---

## Checklist de Pré-Séance

### 1. Continuité, *Peur* Reportée, Cadre & Ouverture *(Essentiel)*
* **Continuité & Peur reportée :** Identifiez le cliffhanger, les conséquences actives et la réserve de **Peur du MJ reportée** (`1/PJ` en Session 1, max `12` — SRD, *Using Fear*). Cherchez la valeur dans le champ `peur_reportee` de la fiche précédente ou dans le dernier `Compte-rendu.md` ; si elle est introuvable, incluez-la dans le bloc de cadrage au MJ.
* **Mécaniques de cadre actives :** Vérifiez les règles en jeu depuis `Age of Umbra/Mécanismes de la campagne.md` (état du [[Bûcher sacré]] / [[Branche bénie]], exposition aux [[Ténèbres qui rôdent]] et *Monter la garde*, créatures [[Touché par l’Umbre]], risque de [[Pourriture de l’âme]]) sans recopier le texte complet des règles dans la fiche.
* **Ouverture *In Media Res* :** Une situation immédiate qui appelle un premier jet d'action ou de réaction dans les 2 à 5 premières minutes.
* **Scènes potentielles (`3–5`, non linéaires — *Confort*) :** Quelques situations modulaires vers lesquelles la séance peut naturellement pivoter selon les choix des joueurs.
* **Comptes à rebours (`1–2` — SRD, *Countdowns*) :** Au moins 1 *Consequence* et/ou 1 *Progress* (valeur de départ, décompte vers `0`, mode **Standard** ou **Dynamique**, ou *Boucle / Lié / Long terme*, et effet déclenché à `0`).

### 2. *Spotlights* PJ, Tier & Cicatrices *(Essentiel)*
Pour chaque PJ présent ce soir (en vérifiant au besoin une carte de Domaine via `search_player_options`) :
* **Niveau, Tier & Cicatrices :** Confirmez le nombre de PJ présents (`party_size`) et leur Tier réel (`1–4`), ainsi que leurs **Cicatrices** (rappel dans `Mécanismes de la campagne.md`).
* **Expérience & Liens :** Mettez en avant 1 *Expérience* chiffrée (`+bonus`) ou arc personnel et 1 *Lien* exploitable en *Tag Team Roll*.
* **Question d'ouverture *(Confort)* :** 1 question courte ciblant 1–2 joueurs avant le premier jet.

### 3. PNJ Minimalistes *(Essentiel pour les figures centrales, Confort pour les secondaires)*
Pour chaque PNJ attendu (**plafond : 5 PNJ clés**) — ou improvisé via `build_npc_profile` :
* **Identité & motivation :** Nom, lieu et objectif clair.
* **Levier / information :** 1 secret, service ou tension exploitable.
* **Statblock ou *NPC Feature* (conditionnel) :** Statblock uniquement si un affrontement est crédible (pensez à vérifier/adapter via `search_adversaries` ou `get_homebrew_benchmarks`, car `build_npc_profile` peut renvoyer un bloc combat vide). Pour un allié, privilégiez une *NPC Feature* (SRD, *Running GM NPCs*).

### 4. Environnements, Rencontres en *Battle Points* & Butin *(Essentiel pour les conflits prévus)*
* **Environnements actifs (`1–2`, `0 BP` — SRD, *Adapting Environments*) :** Tier, Type (*Exploration / Social / Traversal / Event*), Difficulté (repères SRD : `11 / 14 / 17 / 20` pour Tiers 1 à 4), Impulsions, capacités ordonnées (*Passifs → Actions → Réactions*), dépenses de *Peur* et 1–2 *Feature Questions*.
* **Rencontres modulaires (`1–2`, budget BP vérifié — SRD, *Building Balanced Encounters*) :**
  * Formule : `(3 × nombre de PJ en combat) + 2`, ajustée selon le SRD (`-1` combat plus facile/court, `-2` si ≥ 2 Solos, `-2` si `+1d4` ou `+2` aux dégâts globaux, `+1` si adversaire d'un Tier inférieur, `+1` si aucun *Brute / Horde / Meneur / Solo*, `+2` combat plus dur/long).
  * Coûts par rôle : *Sbires* (escouade = taille du groupe) = `1 BP` ; *Social / Soutien* = `1 BP` ; *Horde / À distance / Rôdeur (Skulk) / Standard* = `2 BP` ; *Meneur (Leader)* = `3 BP` ; *Brute* = `4 BP` ; *Solo* = `5 BP`.
  * **Contrôle du Tier réel :** Sur un thème restreint, `build_encounter` peut proposer des adversaires d'un autre Tier. Vérifiez toujours le Tier réel via `read_pdf_pages` ou `extract_adversary_card`, et rescalez explicitement avec `get_homebrew_benchmarks` si besoin.
* **Butin & Reliques (`1–2` — *Confort*) :** Objets, consommables ou reliques de Tier adapté (ex. [[Branche bénie]]).

### 5. Indices Flottants, Rumeurs, Accroches & *Fear Moves* Hors Combat *(Confort)*
Distinguez bien ce qui est **vrai** de ce qui peut être **déformé** :
* **Indices flottants (`4–6`) :** Vérités établies, non rattachées à une pièce fixe, révélables lors d'une enquête ou d'une dépense d'*Espoir* sur une *Expérience*.
* **Rumeurs (`2–3`, optionnel) :** Bruits de couloir potentiellement incomplets ou biaisés (tirés du coffre ou de `compile_theme_tables(..., table_type: "rumors")`).
* **Accroches / Dilemmes (`1–2`) :** Tensions branchées sur les objectifs ou *Liens* des PJ.
* **3 *Fear Moves* hors combat :** Dépenses de *Peur* calibrées sur la grille officielle du SRD (*Using Fear* : *Accessoire `0–1`, Mineure `1–3`, Standard `2–4`, Majeure `4–8`, Climatique `6–12` Peurs*).

---

## Format de Sortie (Tableau de Bord MJ Obsidian)

Respectez les `[[wikilinks]]` courts, les callouts Obsidian et le lexique VF de `AGENTS.md`. En section 3, le **tableau sert uniquement d'index de synthèse** ; les **blocs `statblock` détaillés** (`Daggerheart Environment` et `Daggerheart Encounter`) vont directement dessous pour rester lisibles et interactifs dans Obsidian.

```markdown
---
aliases:
  - "Préparation MJ - Session X"
  - "Préparation Session X"
tags:
  - age-of-umbra
  - campagne
  - session-X
  - preparation
  - mj
tier: X
peur_reportee: Y
---

# 🎲 Préparation MJ — Session X : [Titre]

> **Sources MCP utilisées :** [Liste synthétique `(Document, p. X)` ou `Coffre seul` / `Non vérifié (MCP indisponible)`]

## Statut de Triage
* **Groupe :** [N] PJ présents (Tier [X]) | **Peur MJ reportée :** [Y/12] | **Durée / VTT :** [Ex. 3h30, sans VTT]
* **Cadre actif :** [Résumé court renvoyant à [[Mécanismes de la campagne]]]

### Prêt
* [Éléments complets vérifiés dans le coffre]

### À compléter *(Confort)*
* [Élément mince ou optionnel] → `[Suggestion]` [Correctif rapide]

### Lacunes critiques *(Essentiel)*
* [Élément bloquant la partie] → [Action immédiate]

---

## 1. PJ, *Spotlights* & Question d'Ouverture
* **Question d'ouverture :** `[Suggestion ou issue des notes]` [Question ciblée pour 1–2 PJ avant les dés]
* **[[Nom PJ]]** (*[Classe, Tier X, Cicatrices : Y]*) : Mettre en lumière **[Expérience (+Z)]** via [opportunité] ; Lien actif avec **[[Autre PJ]]**.

## 2. Ouverture *In Media Res* & Scènes Potentielles
* **Situation de départ :** [Accroche immédiate sans temps mort]
* **Premier jet (< 2–5 min) :** [Menace ou tension déclenchant le premier jet]
* **Scènes potentielles (3–5, non linéaires) :**
  1. **[Titre scène 1] :** [Enjeu / tension en 1 phrase]
  2. **[Titre scène 2] :** [Enjeu / tension en 1 phrase]
  3. **[Titre scène 3] :** [Enjeu / tension en 1 phrase]

## 3. Environnements, Rencontres & Butin

### Synthèse rapide
| Élément | Tier / Type / Rôle | BP / Difficulté | Prêt ? | Source |
| :--- | :--- | :--- | :---: | :--- |
| [[Environnement]] | Tier X *(Exploration/...)* | `0 BP` / Diff [X] | [OK/WARN] | `(Doc, p. X)` / `Coffre` |
| [Rencontre 1] | [Rôles et effectifs] | `[X/Y BP]` | [OK/WARN] | `(Doc, p. X)` / `Coffre` |

### Environnements actifs (`1–2`, `0 BP`)
> Insérer ici les blocs `statblock` au format `layout: Daggerheart Environment` (Gabarit 6 de `AGENTS.md`), suivis de `1–2` *Feature Questions*.

### Rencontres modulaires (`1–2`)
> Insérer ici les blocs `statblock` au format `layout: Daggerheart Encounter` (Gabarit 7 de `AGENTS.md`, indentation en espaces uniquement).

* **Récompenses & Reliques (`1–2`) :** [Objet ou relique — Source `(Doc, p. X)` ou `Coffre`]

## 4. PNJ Clés *(max 5)*

| PNJ | Localisation | Motivation | Info / Levier clé | Statblock / *NPC Feature* | Source |
| :--- | :--- | :--- | :--- | :---: | :--- |
| [[Nom PNJ]] | [[Lieu]] | [Objectif] | [Secret / Faveur] | [Social / *NPC Feature* / Lié] | `Coffre` / `(Doc, p. X)` |

## 5. Indices Flottants, Rumeurs & Accroches
* **Indices flottants (`4–6`, vérités établies) :**
  * [Vérité 1 — indépendante d'un lieu figé]
* **Rumeurs (`2–3`, partielles ou faillibles — optionnel) :**
  * [Rumeur 1 — Source `Coffre` ou `(Doc, p. X)`]
* **Accroches & Dilemmes (`1–2`) :**
  * [Tension reliée aux objectifs ou Liens des PJ]

## 6. Comptes à Rebours & *Fear Moves* Hors Combat
* **Compte de Conséquence (`[X] → 0`, Standard/Dynamique) :** *[Nom]* — Décrémente sur [déclencheur] ; à `0` : [conséquence].
* **Compte de Progression (`[Y] → 0`, Standard/Dynamique) :** *[Nom]* — Décrémente sur [déclencheur] ; à `0` : [percée].
* **3 *Fear Moves* hors combat :**
  1. **`[Nom]` (`[X]` Peur) :** [Complication narrative/mécanique]
  2. **`[Nom]` (`[X]` Peur) :** [Complication narrative/mécanique]
  3. **`[Nom]` (`[X]` Peur) :** [Complication narrative/mécanique]

---

## Voir aussi
* [[Session X - Titre]] • [[Lieu principal]] • [[Mécanismes de la campagne]]
```

---

## Flux d'Exécution & Sauvegarde dans le Coffre

1. **Triage coffre seul :** Appliquez l'Étape 0 et la lecture ciblée du coffre pour inférer un maximum d'informations (session cible, PJ actifs, Tier, Peur reportée, ébauche) et dresser le triage *Essentiel / Confort*.
2. **Enrichissement MCP ciblé :** Appelez `heart-of-daggers` uniquement pour combler les lacunes identifiées, vérifier les BP/Tiers, extraire des fiches ou adapter un PDF. Si le serveur est indisponible, poursuivez en mode dégradé.
3. **Restitution & bloc de cadrage unique :** Présentez le diagnostic et la fiche générée en distinguant le canon vérifié des `[Suggestion]`. Si des données clés manquent encore (ex. Peur reportée absente, PJ absent ce soir, durée/intensité, VTT) ou avant d'écrire/mettre à jour les fichiers, posez **un seul bloc de 3 questions maximum**.
4. **Finalisation sur validation du MJ** *(en cohérence avec `AGENTS.md` §7 Temps 2)* :
   * Enregistrez ou mettez à jour `Age of Umbra/Campagne/Session X/Préparation MJ - Session X.md` (avec `peur_reportee` dans le frontmatter).
   * Créez les statblocks d'adversaires manquants dans `Age of Umbra/Adversaires/[Nom].md` (Gabarit 5 de `AGENTS.md` : `layout: Daggerheart Adversary`, clé `feats:` avec `desc:` et `text:`).
   * Utilisez les Gabarits 6 (`Daggerheart Environment`) et 7 (`Daggerheart Encounter`, espaces uniquement) de `AGENTS.md` dans la fiche de préparation.
   * Mettez à jour `Age of Umbra/Aperçu.md` si un nouvel élément majeur (séance, PNJ, lieu, créature) est introduit.
