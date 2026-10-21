# RAPPORT DE TRAVAUX PRATIQUES : COHÉRENCE DES MÉMOIRES CACHES
## Cours : Systèmes à Multiprocesseurs et Machines Parallèles

---

### **Informations Générales**
- **Auteur / Étudiant** : Benjamin Mugangu (`benjaminmugangu`)
- **Projet** : Simulateur Graphique & Interactif de Cohérence de Caches (MEF Snoopy MSI, MESI & Protocole par Répertoire)
- **Environnement & Technologies** : HTML5, CSS3 Moderne (Dark Glassmorphism, Responsive), JavaScript ES6+ modulaire, SVG dynamique, Node.js / Vite.

---

## 1. Introduction & Contexte du Projet

Dans les architectures multiprocesseurs à mémoire partagée (SMP / NUMA), chaque processeur possède son propre cache de niveau L1 afin de réduire le temps de latence d'accès aux données et de désengorger l'accès à la mémoire principale. Cependant, la réplication locale des données introduit le **problème de la cohérence de cache** : si plusieurs cœurs conservent une copie d'un même bloc mémoire et que l'un d'eux effectue une modification, les autres processeurs risquent de consommer des données périmées (*stale data*).

L'objectif de ce travail pratique est de modéliser, d'implémenter et de visualiser de manière interactive les machines à états finis (MEF) des protocoles de cohérence de cache, en partant du cahier des charges initial (Snoopy MSI) et en étendant l'étude aux protocoles industriels et distribués majeurs (**MESI** et **Protocole basé sur le Répertoire**).

---

## 2. Spécifications & Architecture du Système

Le simulateur reproduit fidèlement les spécifications du cours et les notes de séance :

1. **Architecture Matérielle Simulée** :
   - **3 Processeurs** : $P_1$, $P_2$, $P_3$.
   - **Caches L1 dédiés** : chaque processeur dispose de sa propre table de cache comprenant pour chaque bloc :
     - Le **Tag** (adresse mémoire du bloc).
     - L'**État de cohérence** (*State*).
     - La **Valeur courante** (*Data Value*).
     - Des boutons d'action rapide pour déclencher des lectures (**R**) ou écritures (**W**).
   - **Mémoire Centrale (RAM)** : 4 blocs mémoires adressables (Tags `00`, `02`, `04`, `08`) avec synchronisation dynamique.
   - **Médium d'interconnexion** : Bus système partagé (pour les protocoles Snoopy) ou réseau point-à-point avec contrôleur centralisé (pour le protocole par Répertoire).

---

## 3. Détail des Protocoles Implémentés

### 3.1. Protocole Snoopy MSI (3 États)
C'est le protocole de référence fourni dans le support de cours. Il repose sur l'écoute passive permanente du bus (*Bus Snooping*) :
- **Invalide (I)** : La ligne de cache ne contient pas de donnée valide ou a été invalidée.
- **Partagé (Shared - S)** : La donnée est valide, propre (identique à la RAM), et peut être présente dans plusieurs caches en lecture seule.
- **Modifié (Modified - M)** : La donnée est valide, exclusive à ce cache, et sale (*dirty* : différente de la RAM).

**Transitions & Actions Bus** :
- **CPU Read Miss** ($I \to S$) : Émission de `BusRd` (Read Miss). Si un autre processeur détient le bloc en état `Modifié`, celui-ci réalise un **Write-Back** vers la RAM avant de transiter vers `Partagé`.
- **CPU Write Hit sur Partagé** ($S \to M$) : Émission de `BusUpgr` (Write Invalidate). Tous les autres processeurs ayant ce bloc le passent à l'état `Invalide`.
- **CPU Write Miss** ($I \to M$) : Émission de `BusRdX` (Write Miss) assurant l'invalidation globale et la récupération de l'exclusivité.

### 3.2. Protocole Snoopy MESI (Protocole de l'Illinois - 4 États)
Pour remédier au surcoût des invalidations sur le bus lorsqu'un seul processeur utilise une variable, le protocole **MESI** introduit un 4ème état :
- **Exclusif (Exclusive - E)** : La donnée est propre (identique à la RAM) et présente dans **un seul et unique cache**.
- **Gain majeur de MESI** : Lorsqu'un processeur effectue un `CPU Write Hit` sur un bloc à l'état **Exclusif**, la transition vers **Modifié** s'effectue **SANS AUCUN MESSAGE SUR LE BUS**. Cela permet une économie substantielle de bande passante par rapport à MSI (qui aurait émis un `BusUpgr`).

### 3.3. Protocole basé sur le Répertoire (*Directory-Based Protocol*)
Dans les systèmes multiprocesseurs à grande échelle (plusieurs dizaines ou centaines de cœurs), le *Snooping Broadcast* saturerait le bus. Le protocole par Répertoire résout ce problème en remplaçant la diffusion générale par des messages **Point-à-Point (Unicast)** :
- **Table du Répertoire Centralisé** : pour chaque bloc mémoire, le répertoire enregistre :
  - L'état global du bloc : `Uncached`, `Shared`, `Modified`.
  - Le **Vecteur de Présence (Presence Bit Vector)** : indique exactement quels cœurs ($[P_1, P_2, P_3]$) possèdent une copie valide.
  - Le **Propriétaire (Owner)** : processeur détenant l'exclusivité.
- **Invalidation Ciblée** : lors d'une écriture, le répertoire consulte le vecteur de présence et n'envoie les messages d'invalidation **qu'aux processeurs réellement détenteurs** de la donnée.
- **Fetch-Forward & Write-Back** : lors d'une lecture d'un bloc à l'état `Modified`, le répertoire relaie la requête au propriétaire qui réécrit la donnée en RAM et la transmet au demandeur.

---

## 4. Fonctionnalités de l'Application Graphique

1. **Sélecteur Dynamique de Protocole** :
   - Bascule instantanée entre **Répertoire**, **MESI** et **MSI** sans rechargement de page.
   - Adaptation automatique de l'interface : affichage conditionnel de la Table du Répertoire et mise à jour du graphe MEF.

2. **Diagramme MEF SVG Interactif** :
   - Schémas vectoriels précis représentant fidèlement les nœuds et toutes les flèches de transition.
   - **Animation Lumineuse** : illumination néon de l'état précédent, de l'état courant et de l'arc de transition actif lors de chaque transaction.

3. **Panneau de Commande CPU & Déclencheurs Rapides** :
   - Choix du processeur ($P_1, P_2, P_3$), du bloc d'adresse (Tags `00`, `02`, `04`, `08`) et de la valeur à injecter.
   - Boutons `Lire (Read)` et `Écrire (Write)`.
   - Boutons d'actions rapides individuels intégrés sur chaque ligne des caches.

4. **Moniteur de Bus & Réseau en Temps Réel** :
   - Bandeau dynamique détaillant les requêtes émises sur le bus ou les séquences de paquets Unicast acheminés.

5. **Journal d'Historique Complet** :
   - Table traçant chronologiquement chaque étape : numéro de transaction, processeur, opération, tag, changements d'états et impacts de Snooping / RAM.

6. **Scénarios de Démonstration Pré-configurés** :
   - 4 boutons dédiés permettant d'exécuter en un clic les cas d'école (Lecture initiale, partage multi-cœurs, invalidation par écriture, conflits avec Write-Back).

---

## 5. Validation & Tests du Système

Le projet intègre une suite de tests automatisée sous Node.js (`test_all_protocols.js`) validant l'exactitude de toutes les règles logiques :

| Protocole | Test Réalisé | Résultat Attendu | Résultat Obtenu | Statut |
| :--- | :--- | :--- | :--- | :---: |
| **Directory** | Lecture initiale $P_1$ Tag `00` | État Répertoire: `Shared`, Vecteur: `[P1]` | `Shared`, `[P1=true, P2=false, P3=false]` | **Validé** |
| **Directory** | Lecture partagée $P_2$ Tag `00` | Vecteur: `[P1, P2]` | `Shared`, `[P1=true, P2=true, P3=false]` | **Validé** |
| **Directory** | Écriture $P_1$ sur Tag `00` | Invalidation ciblée $P_2$ uniquement, $P_1 \to M$ | $P_2$ Invalidé, Owner=$P_1$, Vecteur=`[P1]` | **Validé** |
| **Directory** | Lecture $P_3$ sur bloc Modifié | Fetch-Forward, Write-Back RAM, Vecteur: `[P1, P3]` | RAM mise à jour, $P_1 \to S$, $P_3 \to S$ | **Validé** |
| **MESI** | Lecture initiale $P_1$ | Transition $I \to E$ (Exclusif) | $P_1$ passe en état `Exclusif` | **Validé** |
| **MESI** | Écriture $P_1$ sur bloc Exclusif | Transition $E \to M$ **SANS trafic bus** | $P_1$ passe en `Modifié` (0 message bus) | **Validé** |
| **MESI** | Lecture partagée $P_2$ | $P_1$ rétrograde $E \to S$, $P_2 \to S$ | $P_1$ et $P_2$ passent en état `Partagé` | **Validé** |
| **MSI** | Lecture initiale $P_1$ | Transition $I \to S$ avec émission `BusRd` | $P_1$ passe en état `Partagé` | **Validé** |
| **MSI** | Écriture $P_1$ sur Partagé | Émission `BusUpgr`, Invalidation de $P_2$ | $P_1 \to M$, $P_2 \to I$ avec message bus | **Validé** |

---

## 6. Structure du Dépôt de Code

```
e:\MEF\
│── index.html                  # Interface utilisateur Web principale
│── style.css                   # Feuilles de style (Thème moderne Dark Glassmorphism)
│── package.json                # Configuration du projet et scripts Vite
│── test_all_protocols.js       # Suite de tests automatisés (Node.js)
│── cours_coherence_cache_msi.tex # Support de cours complet en LaTeX (prêt pour Overleaf)
│── RAPPORT_TP_COHERENCE.md     # Le présent rapport académique
│── README.md                   # Guide d'utilisation et présentation GitHub
└── src/
    ├── msi_engine.js           # Moteur logique de cohérence (MSI, MESI, Répertoire)
    ├── fsm_diagram.js          # Rendu SVG et animations des machines à états finis
    └── app.js                  # Contrôleur applicatif et gestion des événements UI
```

---

## 7. Guide d'Exécution

### Option A : Exécution Directe (Navigateur)
Double-cliquez simplement sur le fichier `index.html` ou ouvrez-le avec n'importe quel navigateur moderne (Chrome, Firefox, Edge).

### Option B : Serveur de Développement Local (Vite)
Pour lancer le serveur de développement local :
```bash
npm install
npm run dev
```
L'application s'ouvrira automatiquement à l'adresse `http://localhost:5173`.

---

## 8. Conclusion

Ce travail pratique a permis de concrétiser de façon visuelle et interactive les mécanismes complexes régissant la cohérence des mémoires caches dans les multiprocesseurs. En partant du modèle élémentaire **MSI**, l'extension vers **MESI** a illustré l'optimisation cruciale de la bande passante bus lors d'écritures locales. Enfin, l'implémentation du **protocole basé sur le Répertoire** a mis en lumière la solution adoptée par les architectures massivement parallèles modernes pour éliminer les goulots d'étranglement inhérents aux bus partagés.
