# NZELO — CAHIER DES CHARGES ET SPÉCIFICATIONS TECHNIQUES

## 1. HYPOTHÈSES DE DÉPART
- [H1] Taille maximale autorisée pour un document PDF : [50] Mo.
- [H2] Taille maximale autorisée pour une image (JPEG/PNG) : [10] Mo.
- [H3] Plafond de caractères par traitement : [60 000] caractères, ou un maximum de [30] pages.
- [H4] Seuil minimal de la note de confiance d'extraction (`confiance_extraction`) : [0.85] sur une échelle de 0 à 1.0.
- [H5] Tarif d'un jeton de traitement de base unitaire : [1] crédit, valorisé à [0,10] € HT.
- [H6] Heure d'envoi automatique de la notification quotidienne de rappel : [18h00].

---

## 2. CONTEXTE ET VISION
NZELO est une application web et mobile d'apprentissage ciblé. L'utilisateur uploade son propre document de cours (PDF ou photo). L'application génère en moins de 60 secondes une fiche de révision hautement structurée et un questionnaire à choix multiples (QCM) d'auto-évaluation.
L'application interdit tout catalogue de contenu tiers. Le document fourni par l'utilisateur est l'unique source de vérité. L'objectif est de supprimer le bruit informationnel et de fournir un support d'apprentissage immédiatement assimilable, fidèle et exploitable.

---

## 3. UTILISATEUR ET BESOIN
L'utilisateur type est un élève du secondaire ou un étudiant universitaire confronté à une surcharge cognitive avant un examen.
Ses besoins critiques sont :
- Synthétiser un cours de manière structurée sans perte de temps.
- S'évaluer immédiatement via des questions d'entraînement ciblées.
- Réviser en situation de mobilité sur un terminal de [360] px de largeur d'écran.
- Accéder immédiatement au service sans friction d'inscription préalable pour le premier essai.

---

## 4. PARCOURS ÉCRAN PAR ÉCRAN

### Écran 1 : Accueil et Upload
- **Zone de dépôt (Drag & Drop / Sélecteur) :** Accepte le format PDF multipages et les images (JPEG, PNG). Permet la sélection de fichiers multiples pour les photos.
- **Zone d'information :** Affiche clairement les limites techniques ([30] pages ou [60 000] caractères).
- **Indicateur de crédit :** Affiche le solde actuel de l'utilisateur (initialisé par défaut pour les nouveaux utilisateurs).
- **Comportement :** Dès la sélection, l'application exécute les vérifications locales sans appel serveur.

### Écran 2 : Contrôle Qualité et Pré-traitement
- **Indicateur de progression local :** Progression visuelle des vérifications de netteté, taille et lisibilité.
- **Modale d'avertissement de dépassement de seuil :** Si le document dépasse [30] pages ou [60 000] caractères, affiche un message d'alerte. Propose un découpage automatique en sections de taille conforme. Affiche le coût total estimé en crédits et demande une validation explicite de l'utilisateur par un bouton d'action principal avant traitement.
- **Écran d'erreur :** En cas d'illisibilité ou de fichier corrompu, affiche un message d'erreur actionnable indiquant la cause exacte et un bouton de retour à l'accueil.

### Écran 3 : Attente et Progression Réelle
- **Aperçu visuel :** Affiche le nom du fichier en cours de traitement.
- **Indicateurs d'étapes synchronisés avec le backend (pas de spinner passif) :**
  1. *Extraction du texte* (avec barre de progression de lecture OCR ou extraction de couche native).
  2. *Analyse sémantique* (validation de la structure).
  3. *Génération de la fiche et du QCM* (écriture en cours).
- **Temps de transition :** Animations fluides de 200 ms entre les étapes.

### Écran 4 : Résultat (Fiche & QCM)
- **Onglet "Fiche de Révision" :** Lecture sous forme de document imprimé élégant. Affichage hiérarchisé par sections (titre, matière, résumé, notions, définitions, formules).
  - *Interactivité :* Option de modification directe du texte par l'utilisateur. Chaque élément (définition, formule, section) comporte un bouton discret de signalement d'erreur au clic.
- **Onglet "Auto-évaluation" :** Affiche le QCM de 10 questions.
  - Progression question par question. Options de réponse claires. Validation instantanée avec affichage de l'explication didactique. Bouton de signalement d'erreur sur chaque question.
- **Bouton d'Export PDF :** Génère un PDF propre et paginé contenant la fiche de révision et le QCM corrigé.
- **Bouton "Sauvegarder dans ma bibliothèque" :**
  - Si l'utilisateur n'est pas connecté, ouvre une modale d'inscription obligatoire pour conserver le document.
  - Si l'utilisateur est connecté, enregistre immédiatement dans son espace personnel.

### Écran 5 : Inscription / Connexion (Modale d'interception)
- **Formulaire simplifié :** Email et mot de passe, ou connexion via fournisseur d'identité tiers.
- **Règle stricte :** Aucune perte de données du document généré. Dès la validation du compte, la redirection s'effectue vers l'Écran 4 avec confirmation de sauvegarde automatique.

### Écran 6 : Bibliothèque Personnelle
- **Moteur de recherche interne :** Recherche textuelle indexant le titre, la matière et le contenu des fiches.
- **Organisation :** Regroupement par matière détectée automatiquement.
- **Statistiques d'apprentissage :** Taux de réussite global aux QCM, nombre de fiches assimilées.

### Écran 7 : Session "Mes Points Faibles"
- **Agrégateur d'erreurs :** Liste toutes les questions échouées lors des sessions QCM de l'ensemble des documents de l'utilisateur.
- **Répétition espacée :** Possibilité de relancer une session de test uniquement sur ces points faibles. Les questions réussies sont replacées selon le barème [1j / 3j / 7j / 16j].

### Écran 8 : Tableau de Bord Admin (Suivi des Coûts)
- **Tableau de suivi :** Affiche l'ID de transaction, l'empreinte de fichier (hash), le nombre de pages/caractères traités, la note de confiance d'extraction, le coût en API calculé en temps réel, et la réussite ou l'échec de la validation du schéma JSON.

---

## 5. PIPELINE DE TRAITEMENT

### Étape A : Contrôle Qualité Initial (Côté Client)
- **Analyse du type de fichier :** Rejet immédiat si le format n'est ni PDF, ni JPEG, ni PNG.
- **Vérification du poids :** Rejet si > [50] Mo pour un PDF ou > [10] Mo pour une image.
- **Contrôle de netteté (Images) :** Algorithme local de calcul du gradient de Laplacien pour rejeter les photos floues.
- **Détection de pages vides :** Analyse du taux de pixels blancs pour rejeter le document si vide.
- **Règle bloquante :** Aucun appel API distant n'est initié si l'un de ces contrôles échoue.

### Étape B : Couche d'Extraction Sémantique
1. **Fichiers PDF :** Extraction de la couche texte native. Si elle est vide ou contient moins de [100] caractères, bascule automatique sur l'OCR.
2. **Fichiers Image :**
   - Application d'un algorithme de redressement (skew correction) et de recadrage des contours automatique.
   - Soumission à l'OCR pour extraction brute du texte textuel.

### Étape C : Application du Plafond Dur et Découpage
- Comptage des caractères du texte extrait.
- Si le nombre de caractères est supérieur à [60 000], blocage du pipeline.
- Notification utilisateur avec proposition de découpage en [N] parties. Calcul et présentation du coût de traitement associé : `Coût = N * [1] crédit`.

### Étape D : Appel Unique au Modèle (Prompt Unique)
L'application effectue un unique appel API vers le grand modèle de langage avec un prompt système versionné (`v1.4.2`). Le prompt instruit le modèle à renvoyer exclusivement un objet JSON valide, sans préambule ni postambule textuel.

---

## 6. SCHÉMA JSON DE SORTIE

La structure de données renvoyée par le modèle doit respecter strictement le schéma JSON suivant :

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "NzeloExtractionSchema",
  "type": "object",
  "properties": {
    "titre": {
      "type": "string"
    },
    "matiere_detectee": {
      "type": "string"
    },
    "resume_structure": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "titre_section": { "type": "string" },
          "points_cles": {
            "type": "array",
            "items": { "type": "string" }
          }
        },
        "required": ["titre_section", "points_cles"]
      }
    },
    "notions_cles": {
      "type": "array",
      "items": { "type": "string" }
    },
    "definitions": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "terme": { "type": "string" },
          "definition": { "type": "string" }
        },
        "required": ["terme", "definition"]
      }
    },
    "formules": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "nom": { "type": "string" },
          "equation": { "type": "string" },
          "explication_variables": { "type": "string" }
        },
        "required": ["nom", "equation"]
      }
    },
    "qcm": {
      "type": "array",
      "minItems": 10,
      "maxItems": 10,
      "items": {
        "type": "object",
        "properties": {
          "question": { "type": "string" },
          "options": {
            "type": "array",
            "minItems": 4,
            "maxItems": 4,
            "items": { "type": "string" }
          },
          "reponse": { "type": "string" },
          "explication": { "type": "string" },
          "difficulte": {
            "type": "string",
            "enum": ["facile", "moyen", "difficile"]
          }
        },
        "required": ["question", "options", "reponse", "explication", "difficulte"]
      }
    },
    "confiance_extraction": {
      "type": "number",
      "minimum": 0,
      "maximum": 1
    }
  },
  "required": [
    "titre",
    "matiere_detectee",
    "resume_structure",
    "notions_cles",
    "definitions",
    "formules",
    "qcm",
    "confiance_extraction"
  ]
}
```

### Étape E : Validation et Mécanisme de Reprise
- Le serveur valide la structure de la réponse contre le schéma ci-dessus.
- Si le JSON est invalide, ou si `confiance_extraction` < [0.85], le système effectue une unique tentative de correction sémantique en soumettant de nouveau le résultat défaillant accompagné du message d'erreur de validation.
- En cas de second échec, le traitement est abandonné, aucun crédit n'est débité de l'utilisateur, et un message transparent est présenté à l'utilisateur décrivant l'incompatibilité de structure du cours fourni.

### Étape F : Mise en Cache par Empreinte
- Avant tout traitement, calcul d'un hash SHA-256 du fichier source brut.
- Recherche dans la table de cache d'une entrée correspondante contenant déjà le résultat d'extraction JSON valide.
- Si trouvé, récupération instantanée depuis la base de données sans appel API de traitement, évitant toute facturation inutile.

---

## 7. RÈGLES DE QUALITÉ

### Qualité sémantique de la fiche
- **Fidélité stricte au document :** Interdiction absolue pour le modèle d'injecter des notions externes non explicitement mentionnées dans le texte source. Si une information essentielle manque dans le cours de l'utilisateur, elle ne doit pas apparaître dans la fiche, ni faire l'objet d'une recherche externe automatique.
- **Hiérarchisation stricte :** Organisation logique ascendante (généralités vers les détails spécifiques).

### Qualité du QCM
- **Format standard :** Exactement 10 questions, chacune dotée de 4 options uniques. Une seule option doit être rigoureusement exacte.
- **Plausibilité des distracteurs :** Les 3 fausses réponses doivent s'appuyer sur des notions présentes dans le document pour éviter l'exclusion triviale, tout en demeurant indiscutablement inexactes sur le plan logique.
- **Progressivité pédagogique :** Structuration obligatoire avec 3 questions de niveau "facile", 4 questions de niveau "moyen", et 3 questions de niveau "difficile".
- **Traçabilité :** L'explication de la réponse doit faire référence directe à un passage sémantique ou une formule de la fiche de révision générée.

---

## 8. MODÈLE DE DONNÉES

Le modèle relationnel s'articule autour des entités suivantes :

```
[Utilisateur] 1 ----- 0..* [Document]
[Utilisateur] 1 ----- 0..* [CreditTransaction]
[Document]    1 ----- 1    [FicheRevision]
[Document]    1 ----- 1    [QCM]
[QCM]         1 ----- 10   [Question]
[Utilisateur] 1 ----- 0..* [ProgressionRevisio]
```

### Entité : Utilisateur (User)
- `id` : UUID (Clé primaire)
- `email` : String (Unique, optionnel avant conversion)
- `password_hash` : String (Optionnel avant conversion)
- `credit_solde` : Integer (Défaut : [5] crédits offerts à la création)
- `created_at` : DateTime

### Entité : Document
- `id` : UUID (Clé primaire)
- `user_id` : UUID (Clé étrangère, nullable si visiteur anonyme)
- `file_hash` : String (Index unique, SHA-256)
- `file_name` : String
- `file_size` : Integer
- `char_count` : Integer
- `created_at` : DateTime

### Entité : FicheRevision
- `id` : UUID (Clé primaire)
- `document_id` : UUID (Clé étrangère, unique)
- `titre` : String
- `matiere` : String
- `contenu_json` : JSONB (Stocke resume_structure, notions_cles, definitions, formules)
- `confiance` : Float
- `created_at` : DateTime

### Entité : Question
- `id` : UUID (Clé primaire)
- `document_id` : UUID (Clé étrangère)
- `enonce` : String
- `option_a` : String
- `option_b` : String
- `option_c` : String
- `option_d` : String
- `reponse_correcte` : String (Valeur parmi "A", "B", "C", "D")
- `explication` : String
- `difficulte` : String ("facile", "moyen", "difficile")

### Entité : ProgressionRevision
- `id` : UUID (Clé primaire)
- `user_id` : UUID (Clé étrangère)
- `question_id` : UUID (Clé étrangère)
- `dernier_statut` : Boolean (Succès / Échec)
- `prochaine_echeance` : DateTime (Calculé par récurrence d'intervalle simple)
- `intervalle_actuel` : Integer (En jours : 1, 3, 7, ou 16)
- `mis_a_jour_le` : DateTime

### Entité : CreditTransaction
- `id` : UUID (Clé primaire)
- `user_id` : UUID (Clé étrangère)
- `document_id` : UUID (Clé étrangère, nullable)
- `quantite` : Integer (Négatif pour débit, positif pour rechargement)
- `cout_api` : Float (Coût financier réel en euros pour calcul de rentabilité)
- `timestamp` : DateTime

---

## 9. SYSTÈME DE DESIGN

NZELO adopte une identité visuelle chaleureuse, naturelle et éditoriale, excluant tout élément connoté "IA générique".

### Palette de Couleurs (Ratios de contraste WCAG AA validés)
- **Fond principal :** Crème (#FCFBF7) - Contraste optimal de confort pour de longues sessions de lecture.
- **Accent principal :** Vert Forêt (#1B4332) - Utilisé pour les boutons principaux et éléments structurels importants (Contraste 7.2:1 sur fond crème).
- **Couleur secondaire :** Terracotta (#C05C3E) - Utilisé pour les alertes discrètes, éléments d'évaluation et boutons d'évaluation (Contraste 4.6:1 sur fond crème).
- **Neutre Sombre :** Fusain (#2B2D2F) - Texte de corps principal (Contraste 11.5:1 sur fond crème).
- **Neutre Moyen :** Pierre (#7A7D81) - Bordures d'éléments et textes secondaires (Contraste 4.5:1 sur fond crème).
- **Neutre Clair :** Albâtre (#F0EDE6) - Arrière-plans d'onglets inactifs ou de cartes secondaires.

### Paire Typographique et Échelle
- **Titres (H1, H2, H3) :** *Lora* (Serif éditoriale). Donne une esthétique d'ouvrage imprimé de haute qualité.
  - H1 : 32px / line-height: 1.3
  - H2 : 24px / line-height: 1.35
  - H3 : 20px / line-height: 1.4
- **Corps de texte :** *system-ui* (sans-serif neutre, hautement lisible sur écrans de petite taille).
  - Corps : 16px / line-height: 1.6
  - Légendes / Métadonnées : 14px / line-height: 1.5

### Jeu d'icônes
- Utilisation exclusive d'un jeu d'icônes vectorielles au trait (ex. Feather Icons) d'une épaisseur fixe de `2px`.
- Interdiction totale d'insérer des icônes de type emoji ou d'utiliser des couleurs différentes pour chaque icône.

### Grille et Composants Spécifiques
- **Grille de base :** 8 points (marges de 16px sur mobile, 32px sur desktop).
- **Bords arrondis :** Rayon unique de `6px` pour un aspect professionnel et sobre.
- **Ombres portées :** Uniquement `box-shadow: 0 2px 4px rgba(43, 45, 47, 0.05)`. Pas d'effet de relief prononcé ni d'effet de flou néon.
- **Bouton Principal :** Fond Vert Forêt (#1B4332), texte Crème (#FCFBF7), centré, sans bordure, padding 12px 24px, transition d'état au survol de `150ms` (modification de l'opacité à 0.9).

---

## 10. MONÉTISATION
- **Dette assumée :** Pas de module de paiement par carte bancaire ou de passerelle Stripe lors du lancement des 5 jours.
- **Mécanique interne :**
  - Tout nouvel utilisateur anonyme dispose d'un solde de départ de [5] crédits gratuits.
  - Chaque upload réussi consomme [1] crédit.
  - Attribution manuelle de crédits via l'interface d'administration ou console par l'administrateur système pour simuler l'achat de packs de crédits (ex. pack de [50] crédits pour [4,99] €).

---

## 11. PLAN DE DÉVELOPPEMENT SUR 5 JOURS

### Jour 1 : Socle Technique, Base de données et Upload Mobile-First
- **Livrable :** Interface d'upload fonctionnelle testée sur mobile à 360 px, avec calcul local de l'empreinte de fichier (SHA-256) et connexion à la base de données.
- **Tâches :**
  1. Initialisation du dépôt et configuration de la base de données relationnelle.
  2. Implémentation du moteur d'upload robuste tolérant les connexions lentes (reprise d'upload sur erreur réseau).
  3. Intégration du composant de calcul de l'empreinte numérique du document.

### Jour 2 : Pipeline de Contrôle Qualité et Extraction OCR
- **Livrable :** Système complet de validation des fichiers refusant les documents non-conformes de manière étanche avant tout appel réseau externe.
- **Tâches :**
  1. Implémentation des validations locales de taille, de format et de netteté d'image (Laplacien).
  2. Développement de la brique d'extraction de texte (parsing PDF natif et OCR pour les images avec recalage automatique).
  3. Intégration du mécanisme de cache local évitant la double analyse d'un même hash.

### Jour 3 : Intégration IA, Génération de la Fiche et du QCM
- **Livrable :** Un script d'appel unique au modèle d'IA recevant le texte extrait et retournant un JSON strict parfaitement validé par le schéma.
- **Tâches :**
  1. Rédaction et versionnage du prompt d'extraction exclusif (`v1.4.2`).
  2. Implémentation du parseur JSON avec gestion de la validation contre le schéma de sortie.
  3. Implémentation de la logique de secours à tentative unique (retry) si le schéma n'est pas validé ou si la confiance est basse.

### Jour 4 : Expérience Utilisateur UI et Système de Design
- **Livrable :** Écran d'attente animé à progression réelle et interface de lecture de la fiche de révision et du QCM conforme à la charte graphique.
- **Tâches :**
  1. Implémentation de l'écran d'attente d'analyse avec feedback synchrone en temps réel.
  2. Création de l'interface utilisateur de lecture et de modification de la fiche de révision.
  3. Développement du composant interactif du QCM de 10 questions avec correction visuelle et explicative immédiate.
  4. Intégration du module d'export PDF stylisé.

### Jour 5 : Rétention, Bibliothèque et Système de Crédits
- **Livrable :** Bibliothèque opérationnelle avec moteur de recherche interne, logique d'inscription post-génération, et gestion du solde de crédits.
- **Tâches :**
  1. Développement de la bibliothèque utilisateur avec recherche sémantique locale.
  2. Implémentation de la barrière d'inscription après la génération de la première fiche.
  3. Intégration de la logique de répétition espacée simple dans l'interface "Mes points faibles".
  4. Création du tableau de bord admin pour l'observation des coûts de traitement.

---

## 12. CRITÈRES D'ACCEPTATION
- **CA-01 (Zéro compte au départ) :** Un utilisateur non connecté doit pouvoir uploader un document conforme, voir l'analyse s'exécuter, accéder à la fiche complète et répondre au QCM sans jamais devoir saisir d'adresse email.
- **CA-02 (Préservation des données) :** L'invitation à l'inscription ne doit se déclencher qu'à l'appui sur le bouton de sauvegarde. Le document généré doit être immédiatement rattaché au compte nouvellement créé sans rechargement de page ni perte de l'état actuel de la fiche.
- **CA-03 (Pas de spinner muet) :** L'écran d'attente doit afficher explicitement l'état d'avancement de la tâche courante (ex. "Lecture du document...", "Génération du questionnaire d'évaluation..."). Le temps total d'affichage ne doit pas dépasser [60] secondes pour un document standard de [10] pages.
- **CA-04 (Étanchéité des coûts) :** Aucun appel API externe payant ne doit être déclenché si le document fourni échoue aux tests de contrôle qualité initial (taille, netteté, format, nombre de pages supérieur au plafond).
- **CA-05 (Fidélité des données de la fiche) :** La fiche produite ne doit contenir aucune information factuelle absente du document initial de l'utilisateur. Toute tentative d'explication de concepts non présents dans la source est bannie.
- **CA-06 (Conformité visuelle stricte) :** L'application ne doit présenter aucun dégradé rose/violet, aucun effet de flou néon, aucune illustration 3D ni aucun emoji dans son interface. La typographie d'affichage doit respecter l'usage de la police Serif *Lora* pour les titres et sans-serif pour le corps de texte sur fond crème (#FCFBF7).
- **CA-07 (Accessibilité) :** Toutes les pages de l'interface utilisateur doivent respecter les exigences d'accessibilité du référentiel WCAG AA, notamment en assurant un ratio de contraste supérieur à 4.5:1 sur tous les éléments de texte.

---

## 13. CE QU'IL NE FAUT SURTOUT PAS FAIRE
- **Ne pas forcer la connexion** de l'utilisateur dès la page d'accueil sous peine d'abandon immédiat du service.
- **Ne pas utiliser de spinners de chargement génériques** sans libellé textuel explicatif de l'étape courante.
- **Ne pas tolérer d'hallucinations d'IA :** ne jamais laisser le modèle ajouter ses propres connaissances encyclopédiques pour enrichir artificiellement la fiche de révision.
- **Ne pas adopter une esthétique "SaaS IA générique" :** bannir absolument les fonds noirs avec halos violets, le glassmorphism, les boutons à reflets néons et le vocabulaire galvaudé de type "Révolutionnez votre apprentissage grâce à la puissance de l'IA".
- **Ne pas omettre la validation de schéma :** ne jamais injecter directement la réponse brute de l'API d'IA dans l'interface sans avoir validé la structure et les types de données via le schéma JSON défini.
- **Ne pas facturer les doublons :** ne pas lancer d'appel d'extraction coûteux si le hash du document correspond à une analyse déjà stockée en base de données.
