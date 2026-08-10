/**
 * Simulateur d'IA locale qui génère le JSON strict validé par le schéma NzeloExtractionSchema
 * basé sur le texte extrait.
 */
export async function generateRevisionData(extractedText) {
  // Simule une latence de traitement réaliste
  await new Promise(resolve => setTimeout(resolve, 800));

  const textLower = extractedText.toLowerCase();

  if (textLower.includes('physique') || textLower.includes('gravitation')) {
    return {
      titre: "Les Forces, la Gravitation Universelle et l'Énergie Cinétique",
      matiere_detectee: "Physique et Chimie",
      resume_structure: [
        {
          titre_section: "Introduction à la Gravitation Universelle",
          points_cles: [
            "La gravitation maintient les corps célestes en orbite.",
            "C'est une force purement attractive s'exerçant entre deux corps dotés d'une masse.",
            "La force agit le long de la ligne droite reliant les centres des deux objets."
          ]
        },
        {
          titre_section: "Compréhension de l'Énergie Cinétique",
          points_cles: [
            "C'est l'énergie d'un corps liée uniquement à sa vitesse de déplacement.",
            "L'énergie augmente de manière quadratique avec la vitesse.",
            "L'unité de mesure légale internationale est le Joule (J)."
          ]
        },
        {
          titre_section: "Applications et Calculs de Forces",
          points_cles: [
            "La force de pesanteur ou poids s'applique à la surface de tout astre.",
            "La constante gravitationnelle universelle G vaut 6.67 x 10^-11 N m^2 kg^-2."
          ]
        }
      ],
      notions_cles: [
        "Force attractive",
        "Masse inertielle",
        "Constante gravitationnelle G",
        "Pesanteur",
        "Énergie de mouvement"
      ],
      definitions: [
        {
          terme: "Gravitation Universelle",
          definition: "Force d'attraction mutuelle qui s'exerce entre deux corps massifs séparés par une distance d."
        },
        {
          terme: "Énergie Cinétique",
          definition: "Énergie que possède un objet en mouvement, proportionnelle à sa masse et au carré de sa vitesse."
        }
      ],
      formules: [
        {
          nom: "Force Gravitationnelle de Newton",
          equation: "F = G * (mA * mB) / d^2",
          explication_variables: "F représente la force en Newtons (N), G est la constante de gravitation, mA et mB sont les masses des corps en kg, d est la distance entre les centres en mètres (m)."
        },
        {
          nom: "Énergie Cinétique",
          equation: "Ec = 0.5 * m * v^2",
          explication_variables: "Ec est l'énergie cinétique en Joules (J), m est la masse de l'objet en kg, v est sa vitesse en m/s."
        },
        {
          nom: "Poids d'un Corps",
          equation: "P = m * g",
          explication_variables: "P est le poids en Newtons (N), m est la masse du corps en kg, g est l'intensité de la pesanteur (N/kg ou m/s^2)."
        }
      ],
      qcm: [
        {
          question: "Quelle est la nature de la force de gravitation universelle ?",
          options: [
            "Uniquement attractive",
            "Uniquement répulsive",
            "Alternativement attractive et répulsive",
            "Électromagnétique"
          ],
          reponse: "Uniquement attractive",
          explication: "La gravitation est une force qui attire toujours les masses les unes vers les autres, sans effet de répulsion.",
          difficulte: "facile"
        },
        {
          question: "Quelle est l'unité légale internationale de l'énergie cinétique ?",
          options: [
            "Le Watt (W)",
            "Le Newton (N)",
            "Le Joule (J)",
            "Le Volt (V)"
          ],
          reponse: "Le Joule (J)",
          explication: "L'énergie, quelle que soit sa forme (cinétique, potentielle, thermique), s'exprime en Joules (J) dans le Système International.",
          difficulte: "facile"
        },
        {
          question: "Quel physicien a formulé la loi de la gravitation universelle ?",
          options: [
            "Albert Einstein",
            "Isaac Newton",
            "Galilée",
            "René Descartes"
          ],
          reponse: "Isaac Newton",
          explication: "C'est Isaac Newton qui a énoncé la loi de la gravitation universelle à la fin du XVIIe siècle.",
          difficulte: "facile"
        },
        {
          question: "Si la vitesse d'un objet double, par combien est multipliée son énergie cinétique ?",
          options: [
            "Par deux",
            "Par trois",
            "Par quatre",
            "Par huit"
          ],
          reponse: "Par quatre",
          explication: "L'énergie cinétique est proportionnelle au carré de la vitesse (v^2). Si la vitesse double (2v), l'énergie est multipliée par 2^2 = 4.",
          difficulte: "moyen"
        },
        {
          question: "Quelle est la valeur approximative de la constante de gravitation universelle G ?",
          options: [
            "9.81 N/kg",
            "6.67 x 10^-11 N m^2 kg^-2",
            "3 x 10^8 m/s",
            "1.6 x 10^-19 C"
          ],
          reponse: "6.67 x 10^-11 N m^2 kg^-2",
          explication: "La constante G introduite par Newton vaut environ 6.67 x 10^-11 N m^2 kg^-2.",
          difficulte: "moyen"
        },
        {
          question: "Quelle est la formule correcte du poids d'un corps sur Terre ?",
          options: [
            "P = m / g",
            "P = m * g",
            "P = g / m",
            "P = 0.5 * m * g^2"
          ],
          reponse: "P = m * g",
          explication: "Le poids P est le produit de la masse m de l'objet par l'intensité de la pesanteur g locale.",
          difficulte: "moyen"
        },
        {
          question: "Sur quoi s'exerce la force de gravitation entre deux sphères ?",
          options: [
            "Sur leurs surfaces en contact",
            "Uniquement sur les bords extérieurs",
            "Sur la ligne reliant leurs centres de gravité",
            "Au hasard"
          ],
          reponse: "Sur la ligne reliant leurs centres de gravité",
          explication: "La force de gravitation universelle s'applique le long de la droite imaginaire passant par les centres de gravité des deux corps.",
          difficulte: "moyen"
        },
        {
          question: "Comment varie la pesanteur sur la Lune comparée à la Terre ?",
          options: [
            "Elle est identique",
            "Elle est deux fois plus forte",
            "Elle est environ six fois plus faible",
            "Elle est nulle"
          ],
          reponse: "Elle est environ six fois plus faible",
          explication: "En raison de sa masse plus faible, l'intensité de la pesanteur g sur la Lune est d'environ 1.6 N/kg, soit six fois moins que sur Terre.",
          difficulte: "difficile"
        },
        {
          question: "Dans la formule Ec = 0.5 * m * v^2, quelle unité doit obligatoirement avoir la vitesse v ?",
          options: [
            "Kilomètres par heure (km/h)",
            "Mètres par seconde (m/s)",
            "Centimètres par seconde (cm/s)",
            "Miles par heure (mph)"
          ],
          reponse: "Mètres par seconde (m/s)",
          explication: "Pour que l'énergie Ec soit obtenue en Joules, toutes les unités doivent appartenir au Système International. La vitesse s'exprime donc en mètres par seconde (m/s).",
          difficulte: "difficile"
        },
        {
          question: "Si la distance d'éloignement entre deux corps est triplée, comment varie la force d'attraction gravitationnelle ?",
          options: [
            "Elle est divisée par trois",
            "Elle est multipliée par neuf",
            "Elle est divisée par neuf",
            "Elle reste identique"
          ],
          reponse: "Elle est divisée par neuf",
          explication: "La force de gravitation est inversement proportionnelle au carré de la distance d^2. Si la distance est multipliée par 3, la force est divisée par 3^2 = 9.",
          difficulte: "difficile"
        }
      ],
      confiance_extraction: 0.96
    };
  } else if (textLower.includes('histoire') || textLower.includes('guerre')) {
    return {
      titre: "La Première Guerre Mondiale : Causes, Déroulement et Conséquences",
      matiere_detectee: "Histoire et Géographie",
      resume_structure: [
        {
          titre_section: "Les origines et alliances militaires",
          points_cles: [
            "Tensions nationalistes et impérialistes croissantes en Europe.",
            "Attentat de Sarajevo le 28 juin 1914 tuant l'archiduc François-Ferdinand.",
            "Système d'alliances automatiques déclenchant la guerre : Triple-Entente vs Triple-Alliance."
          ]
        },
        {
          titre_section: "Les phases majeures du conflit",
          points_cles: [
            "Guerre de mouvement rapide en 1914 se transformant en guerre d'usure.",
            "Guerre de position ou des tranchées de 1915 à 1917 avec de terribles conditions de vie.",
            "Bataille de Verdun en 1916 et entrée en guerre décisive des États-Unis en 1917."
          ]
        },
        {
          titre_section: "Le dénouement et le bilan géopolitique",
          points_cles: [
            "Signature de l'Armistice le 11 novembre 1918.",
            "Signature du Traité de Versailles en juin 1919 pénalisant lourdement l'Allemagne.",
            "Bilan humain catastrophique avec près de 10 millions de soldats tués."
          ]
        }
      ],
      notions_cles: [
        "Tranchées",
        "Triple-Entente",
        "Triple-Alliance",
        "Armistice",
        "Société des Nations"
      ],
      definitions: [
        {
          terme: "Armistice",
          definition: "Accord par lequel des pays en guerre décident d'arrêter temporairement ou définitivement les combats militaires."
        },
        {
          terme: "Tranchées",
          definition: "Fossés creusés et aménagés dans le sol pour abriter les soldats des tirs d'artillerie et stabiliser le front."
        }
      ],
      formules: [],
      qcm: [
        {
          question: "Quel événement a déclenché l'engrenage de la Première Guerre Mondiale ?",
          options: [
            "Le Traité de Versailles",
            "L'attentat de Sarajevo le 28 juin 1914",
            "L'invasion de la Pologne",
            "La révolution bolchévique"
          ],
          reponse: "L'attentat de Sarajevo le 28 juin 1914",
          explication: "L'assassinat de l'héritier d'Autriche-HONGRIE, l'archiduc François-Ferdinand à Sarajevo, a mis le feu aux poudres.",
          difficulte: "facile"
        },
        {
          question: "Quels pays composaient initialement la Triple-Entente ?",
          options: [
            "Allemagne, Autriche-Hongrie, Italie",
            "France, Royaume-Uni, Empire Russe",
            "France, États-Unis, Italie",
            "Allemagne, Empire Ottoman, Autriche"
          ],
          reponse: "France, Royaume-Uni, Empire Russe",
          explication: "La Triple-Entente unissait la France, la Grande-Bretagne et la Russie impériale.",
          difficulte: "facile"
        },
        {
          question: "À quelle date précise a été signé l'Armistice mettant fin aux combats ?",
          options: [
            "14 juillet 1914",
            "11 novembre 1918",
            "28 juin 1919",
            "8 mai 1945"
          ],
          reponse: "11 novembre 1918",
          explication: "L'Armistice suspendant les hostilités de la Grande Guerre a été signé à Rethondes le 11 novembre 1918.",
          difficulte: "facile"
        },
        {
          question: "Quel type de guerre caractérise les années 1915 à 1917 ?",
          options: [
            "Guerre éclair",
            "Guerre de mouvement",
            "Guerre de position ou de tranchées",
            "Guerre d'escarmouches maritimes"
          ],
          reponse: "Guerre de position ou de tranchées",
          explication: "Le front s'étant stabilisé, les armées se sont enterrées dans des réseaux de tranchées durant plus de 3 ans.",
          difficulte: "moyen"
        },
        {
          question: "Quelle bataille de 1916 est devenue le symbole ultime de la guerre d'usure ?",
          options: [
            "La bataille de la Marne",
            "La bataille de Verdun",
            "La bataille de Waterloo",
            "La bataille de Sedan"
          ],
          reponse: "La bataille de Verdun",
          explication: "La bataille de Verdun, ayant duré 10 mois en 1916, a causé plus de 300 000 morts français et allemands.",
          difficulte: "moyen"
        },
        {
          question: "En quelle année les États-Unis sont-ils entrés en guerre aux côtés de l'Entente ?",
          options: [
            "1914",
            "1915",
            "1917",
            "1918"
          ],
          reponse: "1917",
          explication: "Les États-Unis rejoignent officiellement le conflit en avril 1917, apportant un soutien matériel et humain crucial.",
          difficulte: "moyen"
        },
        {
          question: "Quel traité de paix règle le sort de l'Allemagne en juin 1919 ?",
          options: [
            "Le Traité de Paris",
            "Le Traité de Vienne",
            "Le Traité de Versailles",
            "Le Traité de Berlin"
          ],
          reponse: "Le Traité de Versailles",
          explication: "Le Traité de Versailles, signé dans la galerie des Glaces le 28 juin 1919, impose de très lourdes compensations à l'Allemagne.",
          difficulte: "moyen"
        },
        {
          question: "Quelle organisation internationale fut créée pour préserver la paix future ?",
          options: [
            "L'Organisation des Nations Unies (ONU)",
            "La Société des Nations (SDN)",
            "L'OTAN",
            "L'Union Européenne"
          ],
          reponse: "La Société des Nations (SDN)",
          explication: "La Société des Nations (SDN) est l'ancêtre de l'ONU, imaginée à la suite du Traité de Versailles sous l'impulsion de Woodrow Wilson.",
          difficulte: "difficile"
        },
        {
          question: "Quel pays s'est retiré du conflit dès 1917 à la suite d'une révolution interne ?",
          options: [
            "L'Empire Russe",
            "L'Italie",
            "L'Empire Ottoman",
            "Le Royaume-Uni"
          ],
          reponse: "L'Empire Russe",
          explication: "La révolution bolchévique de 1917 a poussé la Russie à signer une paix séparée avec l'Allemagne (Brest-Litovsk).",
          difficulte: "difficile"
        },
        {
          question: "Quel pays de la Triple-Alliance a changé de camp en mai 1915 ?",
          options: [
            "L'Autriche-Hongrie",
            "L'Italie",
            "L'Allemagne",
            "L'Espagne"
          ],
          reponse: "L'Italie",
          explication: "Bien qu'alliée de l'Allemagne et de l'Autriche au début, l'Italie est restée neutre en 1914 avant de s'allier à l'Entente en 1915.",
          difficulte: "difficile"
        }
      ],
      confiance_extraction: 0.95
    };
  } else {
    // Biologie cellulaire par défaut
    return {
      titre: "La Cellule Humaine : Structure, Organites et Fonctions Vitales",
      matiere_detectee: "Biologie et SVT",
      resume_structure: [
        {
          titre_section: "La Cellule comme unité de base",
          points_cles: [
            "Tous les organismes vivants sont composés d'au moins une cellule.",
            "La membrane plasmique sépare le milieu intracellulaire de l'extérieur.",
            "Le noyau abrite l'ADN, support physique de l'hérédité."
          ]
        },
        {
          titre_section: "Les Organites cellulaires essentiels",
          points_cles: [
            "Les mitochondries fabriquent l'ATP (respiration cellulaire).",
            "Les ribosomes assemblent les protéines indispensables à la vie cellulaire.",
            "L'appareil de Golgi trie et distribue les molécules synthétisées."
          ]
        },
        {
          titre_section: "Mécanismes énergétiques",
          points_cles: [
            "L'oxydation du glucose consomme de l'oxygène et rejette du CO2.",
            "La formule chimique bilan met en jeu de l'eau et de l'énergie utilisable."
          ]
        }
      ],
      notions_cles: [
        "ADN",
        "ATP",
        "Mitochondrie",
        "Membrane plasmique",
        "Ribosome"
      ],
      definitions: [
        {
          terme: "Cellule",
          definition: "Unité structurelle, fonctionnelle et reproductive minimale constituant tout ou partie d'un être vivant."
        },
        {
          terme: "Mitochondrie",
          definition: "Organite à double membrane impliqué dans la respiration cellulaire et la synthèse de l'énergie (ATP)."
        }
      ],
      formules: [
        {
          nom: "Respiration Cellulaire Aérobie",
          equation: "C6H12O6 + 6 O2 -> 6 CO2 + 6 H2O + ATP",
          explication_variables: "C6H12O6 est le glucose, O2 est le dioxygène nécessaire, CO2 est le dioxyde de carbone rejeté, H2O représente les molécules d'eau créées."
        }
      ],
      qcm: [
        {
          question: "Quelle structure délimite l'intérieur de la cellule du milieu extérieur ?",
          options: [
            "La paroi cellulosique",
            "La membrane plasmique",
            "L'appareil de Golgi",
            "Le noyau"
          ],
          reponse: "La membrane plasmique",
          explication: "La membrane plasmique est la barrière semi-perméable entourant le cytoplasme de toute cellule.",
          difficulte: "facile"
        },
        {
          question: "Quel organite est qualifié de 'centrale énergétique' de la cellule ?",
          options: [
            "Le noyau",
            "Le ribosome",
            "La mitochondrie",
            "Le lysosome"
          ],
          reponse: "La mitochondrie",
          explication: "C'est dans la mitochondrie que se produit la respiration cellulaire, générant l'énergie sous forme d'ATP.",
          difficulte: "facile"
        },
        {
          question: "Où est stockée l'information génétique (ADN) dans une cellule humaine ?",
          options: [
            "Dans le noyau",
            "Dans le cytoplasme",
            "Dans les mitochondries uniquement",
            "Dans les ribosomes"
          ],
          reponse: "Dans le noyau",
          explication: "Chez les eucaryotes, l'ADN est protégé et confiné au sein de l'enveloppe nucléaire (noyau).",
          difficulte: "facile"
        },
        {
          question: "Quelle est la molécule énergétique universelle produite par la mitochondrie ?",
          options: [
            "L'ADN",
            "L'ATP",
            "Le glucose",
            "L'ARN"
          ],
          reponse: "L'ATP",
          explication: "L'Adénosine Triphosphate (ATP) est la devise énergétique utilisée pour toutes les réactions chimiques de la cellule.",
          difficulte: "moyen"
        },
        {
          question: "Quel est le rôle principal des ribosomes ?",
          options: [
            "La production de lipides",
            "La synthèse des protéines",
            "La digestion des déchets",
            "La division cellulaire"
          ],
          reponse: "La synthèse des protéines",
          explication: "Les ribosomes traduisent l'ARN messager pour assembler des chaînes d'acides aminés formant les protéines.",
          difficulte: "moyen"
        },
        {
          question: "Quelle formule chimique correspond au glucose ?",
          options: [
            "CO2",
            "H2O",
            "C6H12O6",
            "NaCl"
          ],
          reponse: "C6H12O6",
          explication: "Le glucose est un sucre simple de formule brute C6H12O6.",
          difficulte: "moyen"
        },
        {
          question: "Quel organite trie, emballe et expédie les protéines fabriquées ?",
          options: [
            "L'appareil de Golgi",
            "Le noyau",
            "Le réticulum endoplasmique",
            "La mitochondrie"
          ],
          reponse: "L'appareil de Golgi",
          explication: "L'appareil de Golgi sert de centre d'aiguillage des protéines synthétisées dans la cellule.",
          difficulte: "moyen"
        },
        {
          question: "Parmi les gaz suivants, lequel est consommé durant la respiration cellulaire ?",
          options: [
            "Le dioxyde de carbone (CO2)",
            "Le diazote (N2)",
            "Le dioxygène (O2)",
            "Le méthane (CH4)"
          ],
          reponse: "Le dioxygène (O2)",
          explication: "La respiration aérobie nécessite l'oxydation des nutriments par le dioxygène (O2).",
          difficulte: "difficile"
        },
        {
          question: "Comment appelle-t-on le milieu gélatineux à l'intérieur de la cellule ?",
          options: [
            "Le suc nucléaire",
            "Le cytoplasme ou cytosol",
            "Le plasma sanguin",
            "Le liquide interstitiel"
          ],
          reponse: "Le cytoplasme ou cytosol",
          explication: "Le cytosol est la phase liquide du cytoplasme dans laquelle baignent les différents organites.",
          difficulte: "difficile"
        },
        {
          question: "Quel est le produit final de la transcription de l'ADN dans le noyau ?",
          options: [
            "Une protéine",
            "Un lipide",
            "L'ARN messager (ARNm)",
            "Un autre brin d'ADN identique"
          ],
          reponse: "L'ARN messager (ARNm)",
          explication: "La transcription est le processus de copie d'un gène d'ADN sous forme d'ARN messager transportable hors du noyau.",
          difficulte: "difficile"
        }
      ],
      confiance_extraction: 0.94
    };
  }
}
export function validateSchema(data) {
  // Simple validation de conformité des champs obligatoires
  const requiredFields = ["titre", "matiere_detectee", "resume_structure", "notions_cles", "definitions", "formules", "qcm", "confiance_extraction"];
  for (const field of requiredFields) {
    if (data[field] === undefined) return false;
  }
  if (!Array.isArray(data.qcm) || data.qcm.length !== 10) return false;
  return true;
}
