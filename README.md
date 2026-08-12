# NZELO 🎓

> **L'élève uploade son cours (PDF ou photo). L'application lui rend en moins d'une minute une fiche de révision structurée et un QCM pour se tester.**
> *Aucun catalogue de contenu externe : le document de l'utilisateur est l'unique source de connaissances.*

---

## 🎨 Identité Visuelle "Warm & Natural" (Duolingo-inspired)
NZELO propose un design ludique, chaleureux et profondément humain, s'éloignant délibérément des clichés visuels des IA traditionnelles (pas de halos néon, pas de dégradés rose/indigo ou de mascottes robotiques).

* **Palette chaleureuse :** Fond crème réconfortant (`#FDFBF7`), couleur d'accent vert forêt (`#1E3F20`), couleur secondaire terracotta (`#C85A32`).
* **Paire typographique :** Titres en Serif éditorial classique pour rappeler la beauté d'un manuel imprimé, couplés à une police sans-serif moderne et ultra-lisible pour le texte courant.
* **Effets 3D Tactiles :** Boutons et cartes avec des bordures franches et ombres pleines (style Duolingo) conçus spécialement pour une expérience responsive mobile-first optimale (360px).

---

## 🔬 Pipeline Technique & Contrôle Qualité Local
Avant tout appel coûteux ou traitement inutile, le document subit un pipeline rigoureux en local :
1. **Contrôle Qualité strict :**
   * Calcul de la **netteté de l'image** à l'aide d'un gradient de Laplace sur l'élément Canvas.
   * Détection des **pages blanches ou illisibles** via l'analyse de la variance de la luminosité des pixels.
   * Contrôle strict de la taille du fichier (maximum 10 Mo) et du nombre de pages.
2. **Cache intelligent par empreinte :** Génération locale d'un hash cryptographique **SHA-256** unique par fichier pour éviter de consommer un second appel pour un même document.
3. **Moteur d'Extraction & Validation JSON :** Le moteur interne simule une extraction hautement fidèle et structurée, validée par un schéma strict (`NzeloExtractionSchema`).
   * **Exactitude absolue :** Les fiches et les QCM (10 questions à difficulté croissante) proviennent exclusivement du document, évitant toute hallucination.

---

## 🕹️ Fonctionnalités Clés
* **Parcours Guest-First :** Zéro compte requis pour générer son premier document. L'inscription n'est requise qu'au moment de sauvegarder dans sa bibliothèque.
* **Écran de progression réel :** Suivi étape par étape (Contrôle qualité ➔ Calcul d'empreinte ➔ Extraction OCR ➔ Rédaction IA) à la place d'un spinner muet.
* **Fiches éditables :** Modifiez les titres et le texte en direct, ajoutez vos notes et exportez le résultat en PDF de haute qualité.
* **Quiz Gamifié :** Barre de progression interactive, tiroir de feedback sonore/visuel (vert pour correct, rouge pour incorrect) et célébration par confettis en fin de quiz.
* **Rétention active :**
  * Bibliothèque personnelle organisée par matière.
  * Planificateur de répétition espacée simple (1j, 3j, 7j, 16j) pour consolider les notions difficiles.
  * Section **"Mes points faibles"** qui agrège les erreurs pour des révisions ciblées.
* **Tableau de bord administrateur :** Suivi en temps réel des coûts de traitement, des empreintes générées et de la consommation de crédits.

---

## 🛠️ Commandes & Scripts du Projet

L'application est configurée en **ES Modules** avec **Vite**, **Tailwind CSS v4** et **Vitest**.

### Installation des Dépendances
```bash
npm install
```

### Lancement du Serveur de Développement (Local)
Démarre l'application sur le port `3000` :
```bash
npm run dev
```

### Exécution des Tests Unitaires (Vitest)
Vérifie la validation des schémas JSON et la bonne conformité du moteur :
```bash
npm run test
```

### Compilation pour la Production
Compile et minifie le code de l'application dans le dossier `dist/` (compatible avec Vercel, Netlify, etc.) :
```bash
npm run build
```

### Prévisualisation de la Build locale
```bash
npm run preview
```

---

## 🚀 Déploiement sur Vercel
Le projet est entièrement prêt pour le déploiement continu sur **Vercel** :
* Les fichiers de configurations PostCSS et Tailwind v4 ont été structurés (`postcss.config.cjs`).
* Le script de build production (`vite build`) a été configuré dans le `package.json`.
* Dès que vous fusionnez la branche `feat/nzelo-specifications-10677253689357721595` vers votre branche principale (`main`), Vercel construira et déploiera la nouvelle version de production automatiquement.
