# Simulateur Visuel de Cohérence des Mémoires Caches (Snoopy MSI, MESI & Protocole par Répertoire)

> **Cours** : Systèmes à Multiprocesseurs et Machines Parallèles  
> **Auteur** : Benjamin Mugangu ([@benjaminmugangu](https://github.com/benjaminmugangu))

---

## 🌟 Présentation du Projet

Cette application web interactive est un simulateur complet des protocoles de cohérence de mémoire cache pour architectures multiprocesseurs. Elle offre une interface visuelle animée permettant d'observer en temps réel les transitions d'états de la Machine à États Finis (MEF), les messages circulant sur le bus/réseau, ainsi que les modifications apportées aux mémoires caches L1 et à la RAM centrale.

Le simulateur intègre **3 protocoles majeurs** :
1. **Snoopy MSI** (3 États : Modifié, Partagé, Invalide - Diffusion sur bus)
2. **Snoopy MESI** (4 États : Modifié, Exclusif, Partagé, Invalide - Optimisation d'écriture sans bus)
3. **Protocole basé sur le Répertoire** (*Directory-Based* : Messages Point-à-Point Unicast avec vecteurs de présence)

---

## 🚀 Fonctionnalités Clés

- **Architecture Multiprocesseur Simulée** :
  - **3 Processeurs** ($P_1, P_2, P_3$) dotés chacun de leur propre cache L1.
  - **Mémoire Principale (RAM)** comportant 4 blocs (Tags `00`, `02`, `04`, `08`).
  - **Table du Répertoire Centralisé** (en mode Répertoire) affichant l'état et les vecteurs de présence dynamiques (`[P1] [P2] [P3]`).
- **Diagrammes MEF SVG Interactifs** :
  - Rendu vectoriel dynamique des 3 graphes de MEF.
  - Animation lumineuse néon des états et des arcs de transition actifs lors de chaque opération.
- **Panneau de Commande CPU** :
  - Sélection libre du processeur cible, de l'adresse et injection de données.
  - Boutons de lecture (*Read*) et d'écriture (*Write*).
  - Boutons d'action rapide intégrés directement sur chaque ligne de cache.
- **Moniteur de Bus & Réseau** :
  - Visualisation en temps réel des requêtes (`BusRd`, `BusRdX`, `BusUpgr`, ou séquences Unicast `Read-Req`, `Fetch-Forward`, etc.).
- **Historique Chronologique des Transactions** :
  - Journal de bord exhaustif retraçant chaque action avec les états avant/après et les effets de Snooping / Write-Back.
- **Scénarios de Démonstration (TP)** :
  - Déclenchement en un clic des cas d'école pour chaque protocole.

---

## 💻 Structure du Dépôt

```
.
├── index.html                  # Interface Web principale
├── style.css                   # Styles CSS modernes (Dark Glassmorphism)
├── package.json                # Configuration et dépendances Vite
├── RAPPORT_TP_COHERENCE.md     # Rapport académique complet du TP
├── cours_coherence_cache_msi.tex # Polycopié de cours complet en LaTeX (Overleaf)
├── test_all_protocols.js       # Suite de tests automatisés Node.js
└── src/
    ├── msi_engine.js           # Moteur logique de cohérence (MSI, MESI, Répertoire)
    ├── fsm_diagram.js          # Rendu graphique et animation SVG des MEF
    └── app.js                  # Contrôleur d'interface utilisateur
```

---

## 🛠️ Installation et Exécution

### 1. Exécution Directe (Sans installation)
Ouvrez directement le fichier `index.html` dans n'importe quel navigateur moderne (Google Chrome, Firefox, Edge).

### 2. Avec Serveur de Développement Local (Vite)
Assurez-vous d'avoir [Node.js](https://nodejs.org/) installé, puis exécutez :
```bash
# Installation des dépendances
npm install

# Lancement du serveur de développement local
npm run dev
```
L'application sera accessible sur `http://localhost:5173`.

### 3. Exécution des Tests Automatisés
Pour vérifier l'exactitude des transitions d'états et de la cohérence mémoire :
```bash
node test_all_protocols.js
```

---

## 📖 Rapport Académique & Support de Cours

- 📄 Le rapport complet des travaux pratiques est disponible dans le fichier [RAPPORT_TP_COHERENCE.md](RAPPORT_TP_COHERENCE.md).
- 📜 Le document LaTeX complet pour Overleaf est disponible dans le fichier [cours_coherence_cache_msi.tex](cours_coherence_cache_msi.tex).
