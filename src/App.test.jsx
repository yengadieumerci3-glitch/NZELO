import { describe, it, expect } from 'vitest';
import { validateSchema } from '../src/utils/engine';

describe('Validation du schéma JSON strict', () => {
  it('doit valider un objet conforme au schéma', () => {
    const validData = {
      titre: "Cours d'Histoire",
      matiere_detectee: "Histoire",
      resume_structure: [
        { titre_section: "Introduction", points_cles: ["Point 1"] }
      ],
      notions_cles: ["Tranchées"],
      definitions: [
        { terme: "Armistice", definition: "Arrêt des combats" }
      ],
      formules: [],
      qcm: Array(10).fill({
        question: "Question ?",
        options: ["A", "B", "C", "D"],
        reponse: "A",
        explication: "Explication",
        difficulte: "facile"
      }),
      confiance_extraction: 0.95
    };

    expect(validateSchema(validData)).toBe(true);
  });

  it('doit rejeter un objet incomplet ou non-conforme', () => {
    const invalidData = {
      titre: "Cours d'Histoire",
      matiere_detectee: "Histoire"
      // manque les autres champs
    };

    expect(validateSchema(invalidData)).toBe(false);
  });

  it('doit rejeter un QCM qui ne contient pas exactement 10 questions', () => {
    const invalidQcmData = {
      titre: "Cours d'Histoire",
      matiere_detectee: "Histoire",
      resume_structure: [],
      notions_cles: [],
      definitions: [],
      formules: [],
      qcm: Array(5).fill({ // Seulement 5 questions
        question: "Question ?",
        options: ["A", "B", "C", "D"],
        reponse: "A",
        explication: "Explication",
        difficulte: "facile"
      }),
      confiance_extraction: 0.9
    };

    expect(validateSchema(invalidQcmData)).toBe(false);
  });
});
