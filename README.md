# Analyse des Départs à la Retraite en France

Visualisation interactive des âges de départ à la retraite par catégorie socioprofessionnelle (CSP) en France, sur la période **2013–2020**.

## Aperçu

Le projet propose un tableau de bord interactif à trois onglets :

| Tâche | Description |
|-------|-------------|
| **Tâche 1 — Tendances** | Évolution globale de l'âge moyen de départ et comparaison par CSP |
| **Tâche 2 — Profils CSP** | Scatter plot comparatif des catégories socioprofessionnelles |
| **Tâche 3 — Analyse croisée** | Corrélation entre limitations fonctionnelles et trajectoires professionnelles (heatmap + bulles) |

---

## Structure du projet

```
Analyse-departs-retraite/
├── index.html                    # Page principale (navigation + structure)
├── tache1_1.js                   # Courbe d'évolution globale + panneau détails
├── tache1_2.js                   # Graphique en barres par CSP et par année
├── tache2.js                     # Scatter plot des profils CSP
├── tache3.js                     # Scatter santé/précarité + heatmap
└── departretraite_parcsp.csv     # Données source (statistiques publiques françaises)
```


## 🚀 Lancer le projet

Aucune installation requise. Il suffit d'ouvrir le projet avec un serveur local (nécessaire pour charger le fichier CSV).

### Avec Python

```bash
# Python 3
python -m http.server 8000
```

Puis ouvrir [http://localhost:8000](http://localhost:8000) dans votre navigateur.

### Avec VS Code

Installer l'extension **Live Server**, puis clic droit sur `index.html` → *Open with Live Server*.

## Technologies utilisées

- **HTML / CSS** — Structure et mise en page responsive
- **JavaScript (Vanilla)** — Logique d'interaction et navigation par onglets
- **[D3.js v7](https://d3js.org/)** — Visualisations (courbes, barres, scatter plots, heatmap)
- **[DM Sans & DM Serif Display](https://fonts.google.com/)** — Typographie (Google Fonts)

## Données

Le fichier `departretraite_parcsp.csv` est issu des **statistiques publiques françaises**.  
Il contient pour chaque année et chaque CSP :
- L'âge conjoncturel de départ à la retraite
- La durée moyenne passée en emploi / sans emploi
- La proportion de personnes fortement limitées fonctionnellement en première année de retraite

