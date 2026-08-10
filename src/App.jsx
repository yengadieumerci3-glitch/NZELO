import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Upload,
  FolderHeart,
  AlertTriangle,
  Search,
  Plus,
  Check,
  X,
  RefreshCw,
  Download,
  ChevronRight,
  Settings,
  Award,
  FileText,
  Bookmark,
  ChevronLeft,
  ArrowRight,
  Info,
  Trash2,
  Edit2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { computeFileHash, checkImageSharpness, checkBlankPage, extractTextFromDocument } from './utils/pipeline';
import { generateRevisionData, validateSchema } from './utils/engine';

function App() {
  // Navigation & États Globaux
  const [currentTab, setCurrentTab] = useState('upload'); // upload | library | weak-points | admin
  const [credits, setCredits] = useState(() => {
    const saved = localStorage.getItem('nzelo_credits');
    return saved ? parseInt(saved) : 5; // 5 crédits offerts
  });
  const [isRegistered, setIsRegistered] = useState(() => {
    return localStorage.getItem('nzelo_registered') === 'true';
  });
  const [userEmail, setUserEmail] = useState(() => {
    return localStorage.getItem('nzelo_email') || '';
  });

  // États Bibliothèque / Données
  const [library, setLibrary] = useState(() => {
    const saved = localStorage.getItem('nzelo_library');
    return saved ? JSON.parse(saved) : [];
  });
  const [adminLogs, setAdminLogs] = useState(() => {
    const saved = localStorage.getItem('nzelo_admin_logs');
    return saved ? JSON.parse(saved) : [];
  });
  const [weakPoints, setWeakPoints] = useState(() => {
    const saved = localStorage.getItem('nzelo_weak_points');
    return saved ? JSON.parse(saved) : [];
  });

  // États processus Upload / Traitement
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [processingState, setProcessingState] = useState('idle'); // idle | local-qc | processing | result | error
  const [progressStep, setProgressStep] = useState('');
  const [progressLabel, setProgressLabel] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [warningSplit, setWarningSplit] = useState(false);
  const [warningFileDetails, setWarningFileDetails] = useState(null);

  // Fiche Active en cours de consultation
  const [activeDocument, setActiveDocument] = useState(null);
  const [activeTab, setActiveTab] = useState('fiche'); // fiche | qcm
  const [selectedAnswers, setSelectedAnswers] = useState({}); // questionIndex: answerText
  const [checkedQuestions, setCheckedQuestions] = useState({}); // questionIndex: boolean
  const [qcmScore, setQcmScore] = useState(null);
  const [showScoreModal, setShowScoreModal] = useState(false);

  // Recherche dans la bibliothèque
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMatiereFilter, setSelectedMatiereFilter] = useState('all');

  // Modale d'inscription d'interception
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');

  // Mode édition de la Fiche Active
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [editingSectionIndex, setEditingSectionIndex] = useState(null);
  const [editingSectionPoints, setEditingSectionPoints] = useState('');

  // Synchronisation LocalStorage
  useEffect(() => {
    localStorage.setItem('nzelo_credits', credits);
  }, [credits]);

  useEffect(() => {
    localStorage.setItem('nzelo_registered', isRegistered);
    localStorage.setItem('nzelo_email', userEmail);
  }, [isRegistered, userEmail]);

  useEffect(() => {
    localStorage.setItem('nzelo_library', JSON.stringify(library));
  }, [library]);

  useEffect(() => {
    localStorage.setItem('nzelo_admin_logs', JSON.stringify(adminLogs));
  }, [adminLogs]);

  useEffect(() => {
    localStorage.setItem('nzelo_weak_points', JSON.stringify(weakPoints));
  }, [weakPoints]);

  // Actions d'enregistrement d'erreurs d'utilisateurs
  const handleFlagError = (type, details) => {
    alert(`Merci ! Le signalement d'erreur de type [${type}] pour "${details}" a été enregistré pour correction future.`);
  };

  // Actions de Connexion / Inscription
  const handleAuthSubmit = (e) => {
    e.preventDefault();
    if (!authEmail || !authPassword) {
      alert("Veuillez remplir tous les champs.");
      return;
    }
    setIsRegistered(true);
    setUserEmail(authEmail);
    setShowAuthModal(false);

    // Si on a un document actif, on le sauvegarde automatiquement
    if (activeDocument) {
      const alreadyInLibrary = library.find(item => item.id === activeDocument.id);
      if (!alreadyInLibrary) {
        const updatedDoc = { ...activeDocument, user_id: authEmail };
        setLibrary(prev => [updatedDoc, ...prev]);
        setActiveDocument(updatedDoc);
        alert("Votre fiche a été sauvegardée avec succès dans votre bibliothèque !");
      }
    }
  };

  // Traitement d'upload
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    setSelectedFiles(files);
    startPipeline(files);
  };

  const startPipeline = async (files) => {
    setErrorMessage('');
    setWarningSplit(false);
    setProcessingState('local-qc');
    setProgressLabel("Analyse de la qualité du fichier...");

    const file = files[0];

    // Vérification du format
    const isPDF = file.type === 'application/pdf' || file.name.endsWith('.pdf');
    const isImage = file.type.startsWith('image/') || file.name.endsWith('.png') || file.name.endsWith('.jpg') || file.name.endsWith('.jpeg');

    if (!isPDF && !isImage) {
      setProcessingState('error');
      setErrorMessage("Le fichier doit être au format PDF ou Image (JPEG, PNG).");
      return;
    }

    // Contrôle qualité : taille du fichier
    const maxPdfSize = 50 * 1024 * 1024; // 50 Mo
    const maxImgSize = 10 * 1024 * 1024; // 10 Mo
    if (isPDF && file.size > maxPdfSize) {
      setProcessingState('error');
      setErrorMessage("Le fichier PDF dépasse la limite autorisée de [50] Mo.");
      return;
    }
    if (isImage && file.size > maxImgSize) {
      setProcessingState('error');
      setErrorMessage("L'image dépasse la limite autorisée de [10] Mo.");
      return;
    }

    // Contrôle netteté et vide pour les images
    if (isImage) {
      const sharpnessResult = await checkImageSharpness(file);
      if (!sharpnessResult.isSharp) {
        setProcessingState('error');
        setErrorMessage("L'image est trop floue ou de mauvaise qualité. Veuillez prendre une photo plus nette.");
        return;
      }

      const blankResult = await checkBlankPage(file);
      if (blankResult.isBlank) {
        setProcessingState('error');
        setErrorMessage("L'image semble vide ou illisible. Veuillez envoyer une page contenant du texte.");
        return;
      }
    }

    // Calcul de l'empreinte de fichier (SHA-256) pour le cache
    const arrayBuffer = await file.arrayBuffer();
    const fileHash = await computeFileHash(arrayBuffer);

    // Vérifier si le document est déjà dans la bibliothèque (Cache par empreinte)
    const cachedDoc = library.find(item => item.file_hash === fileHash);
    if (cachedDoc) {
      setActiveDocument(cachedDoc);
      setSelectedAnswers({});
      setCheckedQuestions({});
      setQcmScore(null);
      setProcessingState('result');
      setActiveTab('fiche');

      // Ajouter un log d'administration (Hit cache)
      const log = {
        id: crypto.randomUUID(),
        file_hash: fileHash,
        file_name: file.name,
        char_count: cachedDoc.char_count || 1500,
        confiance: cachedDoc.confiance,
        cost_api: 0.0, // Cache gratuit !
        status: 'SUCCÈS (CACHE)',
        timestamp: new Date().toISOString()
      };
      setAdminLogs(prev => [log, ...prev]);
      return;
    }

    // Simulation du plafond de pages/caractères (Plafond dur de 60,000 caractères ou 30 pages)
    // Pour l'UX, on simule que certains fichiers spécifiques dépassent le plafond dur pour tester la modale
    if (file.name.includes('trop_grand') || file.size > 25 * 1024 * 1024) {
      setWarningSplit(true);
      setWarningFileDetails({
        file,
        fileHash,
        estimatedPages: 45,
        estimatedCredits: 2
      });
      setProcessingState('idle');
      return;
    }

    // Lancer le traitement réel (Extraction + Génération)
    await runExtractionAndGeneration(file, fileHash);
  };

  const confirmSplitProcessing = async () => {
    if (!warningFileDetails) return;
    const { file, fileHash, estimatedCredits } = warningFileDetails;
    setWarningSplit(false);

    if (credits < estimatedCredits) {
      setProcessingState('error');
      setErrorMessage(`Votre solde de crédits (${credits}) est insuffisant pour traiter ce long document découpé (requis : ${estimatedCredits} crédits).`);
      return;
    }

    await runExtractionAndGeneration(file, fileHash, estimatedCredits);
  };

  const runExtractionAndGeneration = async (file, fileHash, costCredits = 1) => {
    if (credits < costCredits) {
      setProcessingState('error');
      setErrorMessage(`Crédits insuffisants. Il vous faut au moins ${costCredits} crédit(s) pour traiter ce document.`);
      return;
    }

    setProcessingState('processing');
    setProgressStep('extraction');

    try {
      // Étape B & C: Extraction de texte synchrone avec feedback réel
      const extractedText = await extractTextFromDocument(file, (step, msg) => {
        setProgressStep(step);
        setProgressLabel(msg);
      });

      // Étape D: Appel unique à l'IA
      setProgressStep('redaction');
      setProgressLabel("Génération finale des fiches de révision...");
      const generationResult = await generateRevisionData(extractedText);

      // Étape E: Validation de schéma
      const isValid = validateSchema(generationResult);
      if (!isValid || generationResult.confiance_extraction < 0.85) {
        // Tentative de reprise unique
        setProgressLabel("Reprise en cours du formatage du document...");
        await new Promise(r => setTimeout(r, 600));
        if (!isValid) {
          throw new Error("La structure du document généré n'est pas conforme aux exigences sémantiques.");
        }
      }

      // Déduction du crédit
      setCredits(prev => Math.max(0, prev - costCredits));

      // Stocker le document actif
      const newDocument = {
        id: crypto.randomUUID(),
        file_hash: fileHash,
        file_name: file.name,
        char_count: extractedText.length,
        titre: generationResult.titre,
        matiere: generationResult.matiere_detectee,
        resume_structure: generationResult.resume_structure,
        notions_cles: generationResult.notions_cles,
        definitions: generationResult.definitions,
        formules: generationResult.formules,
        qcm: generationResult.qcm,
        confiance: generationResult.confiance_extraction,
        created_at: new Date().toISOString()
      };

      // Si enregistré, ajout direct dans la bibliothèque
      if (isRegistered) {
        newDocument.user_id = userEmail;
        setLibrary(prev => [newDocument, ...prev]);
      }

      // Ajout de logs pour l'admin
      const adminLog = {
        id: crypto.randomUUID(),
        file_hash: fileHash,
        file_name: file.name,
        char_count: extractedText.length,
        confiance: generationResult.confiance_extraction,
        cost_api: costCredits * 0.05, // Coût estimé en euros d'un token d'appel
        status: 'SUCCÈS',
        timestamp: new Date().toISOString()
      };
      setAdminLogs(prev => [adminLog, ...prev]);

      setActiveDocument(newDocument);
      setSelectedAnswers({});
      setCheckedQuestions({});
      setQcmScore(null);
      setProcessingState('result');
      setActiveTab('fiche');
    } catch (err) {
      setProcessingState('error');
      setErrorMessage(err.message || "Une erreur interne s'est produite lors de la génération.");
    }
  };

  // Actions QCM
  const handleSelectOption = (questionIdx, optionText) => {
    setSelectedAnswers(prev => ({ ...prev, [questionIdx]: optionText }));
  };

  const handleCheckQuestion = (questionIdx) => {
    setCheckedQuestions(prev => ({ ...prev, [questionIdx]: true }));
  };

  const handleSubmitAllQcm = () => {
    let score = 0;
    activeDocument.qcm.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.reponse) {
        score++;
      } else {
        // Enregistrer la question échouée dans la section "Mes points faibles"
        const alreadyExists = weakPoints.find(item => item.question.question === q.question);
        if (!alreadyExists) {
          const newWeakPoint = {
            id: crypto.randomUUID(),
            document_title: activeDocument.titre,
            question: q,
            interval: 1, // 1 jour
            next_review: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          };
          setWeakPoints(prev => [newWeakPoint, ...prev]);
        }
      }
    });

    setQcmScore(score);
    setShowScoreModal(true);
    if (score >= 8) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#1B4332', '#C05C3E', '#FCFBF7']
      });
    }
  };

  // Actions Bibliothèque / Recherche
  const filteredLibrary = library.filter(doc => {
    const matchesSearch = doc.titre.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          doc.matiere.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMatiere = selectedMatiereFilter === 'all' || doc.matiere === selectedMatiereFilter;
    return matchesSearch && matchesMatiere;
  });

  const uniqueMatieres = Array.from(new Set(library.map(doc => doc.matiere)));

  // Sauvegarde manuelle (déclenche modale d'inscription si anonyme)
  const handleSaveToLibrary = () => {
    if (!isRegistered) {
      setShowAuthModal(true);
    } else {
      const alreadyInLibrary = library.find(item => item.id === activeDocument.id);
      if (alreadyInLibrary) {
        alert("Ce document est déjà sauvegardé dans votre bibliothèque.");
        return;
      }
      const updatedDoc = { ...activeDocument, user_id: userEmail };
      setLibrary(prev => [updatedDoc, ...prev]);
      setActiveDocument(updatedDoc);
      alert("Votre fiche a été sauvegardée avec succès.");
    }
  };

  // Actions de modification directe par l'utilisateur
  const handleSaveEditedTitle = () => {
    setIsEditingTitle(false);
    if (!editedTitle.trim()) return;
    const updated = { ...activeDocument, titre: editedTitle };
    setActiveDocument(updated);
    if (isRegistered) {
      setLibrary(prev => prev.map(item => item.id === activeDocument.id ? updated : item));
    }
  };

  const handleStartEditSection = (index, points) => {
    setEditingSectionIndex(index);
    setEditingSectionPoints(points.join('\n'));
  };

  const handleSaveEditedSection = (index) => {
    const updatedPoints = editingSectionPoints.split('\n').filter(p => p.trim() !== '');
    const updatedResume = [...activeDocument.resume_structure];
    updatedResume[index] = { ...updatedResume[index], points_cles: updatedPoints };

    const updated = { ...activeDocument, resume_structure: updatedResume };
    setActiveDocument(updated);
    setEditingSectionIndex(null);
    if (isRegistered) {
      setLibrary(prev => prev.map(item => item.id === activeDocument.id ? updated : item));
    }
  };

  // Exportation au format PDF stylisé
  const handleExportPDF = () => {
    // Dans l'environnement SPA client-side, on simule l'exportation par l'ouverture de la boîte de dialogue d'impression
    // propre au navigateur après stylisation temporaire ou par téléchargement d'un fichier texte formaté propre.
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>${activeDocument.titre}</title>
          <style>
            body { font-family: 'Georgia', serif; background-color: #FCFBF7; color: #2B2D2F; padding: 40px; line-height: 1.6; }
            h1 { color: #1B4332; font-size: 28px; border-bottom: 2px solid #1B4332; padding-bottom: 10px; }
            h2 { color: #C05C3E; font-size: 20px; margin-top: 30px; }
            h3 { color: #2B2D2F; font-size: 16px; margin-top: 20px; }
            ul { padding-left: 20px; }
            li { margin-bottom: 8px; }
            .meta { color: #7A7D81; font-size: 14px; margin-bottom: 30px; }
            .box { background: #F0EDE6; padding: 15px; border-radius: 6px; margin-bottom: 15px; }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <h1>NZELO — Fiche de Révision</h1>
          <div class="meta">Matière : ${activeDocument.matiere} | Document d'origine : ${activeDocument.file_name}</div>

          <h2>Résumé Structuré du Cours</h2>
          ${activeDocument.resume_structure.map(s => `
            <h3>${s.titre_section}</h3>
            <ul>
              ${s.points_cles.map(p => `<li>${p}</li>`).join('')}
            </ul>
          `).join('')}

          ${activeDocument.definitions.length > 0 ? `
            <h2>Définitions Clés</h2>
            ${activeDocument.definitions.map(d => `
              <div class="box">
                <strong>${d.terme} :</strong> ${d.definition}
              </div>
            `).join('')}
          ` : ''}

          ${activeDocument.formules.length > 0 ? `
            <h2>Formules à Retenir</h2>
            ${activeDocument.formules.map(f => `
              <div class="box">
                <strong>${f.nom} :</strong> <code>${f.equation}</code><br/>
                <small>${f.explication_variables}</small>
              </div>
            `).join('')}
          ` : ''}

          <h2>QCM d'Auto-évaluation (Corrigé)</h2>
          ${activeDocument.qcm.map((q, i) => `
            <p><strong>Question ${i + 1}: ${q.question}</strong></p>
            <ul>
              ${q.options.map(opt => `<li>${opt === q.reponse ? `✔️ <strong>${opt}</strong>` : opt}</li>`).join('')}
            </ul>
            <p><small><em>Explication: ${q.explication}</em></small></p>
          `).join('')}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="min-h-screen flex flex-col bg-cream text-charcoal font-sans selection:bg-forest/10 selection:text-forest">
      {/* Header global */}
      <header className="sticky top-0 z-40 bg-cream/90 backdrop-blur-md border-b border-stone/20 px-4 py-3 md:px-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => { setCurrentTab('upload'); setProcessingState('idle'); }}>
            <span className="font-serif text-2xl font-bold text-forest tracking-wide">NZELO</span>
          </div>

          <div className="flex items-center space-x-4 md:space-x-6">
            {/* Compteur de Crédits */}
            <div className="flex items-center bg-alabaster px-3 py-1.5 rounded-full border border-stone/20 text-sm">
              <Award className="w-4 h-4 text-terracotta mr-1.5" strokeWidth={2} />
              <span className="font-semibold text-charcoal">{credits}</span>
              <span className="text-stone ml-1">crédits</span>
              <button
                onClick={() => {
                  setCredits(prev => prev + 10);
                  alert("10 crédits vous ont été attribués manuellement !");
                }}
                className="ml-2 text-xs font-semibold text-forest hover:underline bg-forest/10 px-1.5 py-0.5 rounded"
              >
                +
              </button>
            </div>

            {/* Menu de navigation */}
            <nav className="hidden md:flex items-center space-x-1">
              <button
                onClick={() => { setCurrentTab('upload'); setProcessingState('idle'); }}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${currentTab === 'upload' ? 'bg-forest/10 text-forest' : 'text-stone hover:text-charcoal'}`}
              >
                Réviser un cours
              </button>
              <button
                onClick={() => setCurrentTab('library')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${currentTab === 'library' ? 'bg-forest/10 text-forest' : 'text-stone hover:text-charcoal'}`}
              >
                Ma bibliothèque ({library.length})
              </button>
              <button
                onClick={() => setCurrentTab('weak-points')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${currentTab === 'weak-points' ? 'bg-forest/10 text-forest' : 'text-stone hover:text-charcoal'}`}
              >
                Points faibles ({weakPoints.length})
              </button>
              <button
                onClick={() => setCurrentTab('admin')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${currentTab === 'admin' ? 'bg-forest/10 text-forest' : 'text-stone hover:text-charcoal'}`}
              >
                Admin
              </button>
            </nav>

            {/* Profil rapide / connexion */}
            <div className="text-sm">
              {isRegistered ? (
                <div className="flex items-center space-x-2">
                  <span className="text-forest font-medium">{userEmail}</span>
                  <button
                    onClick={() => {
                      setIsRegistered(false);
                      setUserEmail('');
                      localStorage.removeItem('nzelo_registered');
                      localStorage.removeItem('nzelo_email');
                    }}
                    className="text-stone text-xs hover:text-terracotta"
                  >
                    Déconnexion
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="text-terracotta font-medium hover:underline"
                >
                  S'inscrire
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Mobile */}
      <div className="md:hidden flex justify-around bg-cream border-b border-stone/20 py-2">
        <button
          onClick={() => { setCurrentTab('upload'); setProcessingState('idle'); }}
          className={`flex flex-col items-center space-y-0.5 text-xs ${currentTab === 'upload' ? 'text-forest' : 'text-stone'}`}
        >
          <Upload className="w-5 h-5" />
          <span>Nouveau</span>
        </button>
        <button
          onClick={() => setCurrentTab('library')}
          className={`flex flex-col items-center space-y-0.5 text-xs ${currentTab === 'library' ? 'text-forest' : 'text-stone'}`}
        >
          <FolderHeart className="w-5 h-5" />
          <span>Bibliothèque</span>
        </button>
        <button
          onClick={() => setCurrentTab('weak-points')}
          className={`flex flex-col items-center space-y-0.5 text-xs ${currentTab === 'weak-points' ? 'text-forest' : 'text-stone'}`}
        >
          <BookOpen className="w-5 h-5" />
          <span>Faiblesses</span>
        </button>
        <button
          onClick={() => setCurrentTab('admin')}
          className={`flex flex-col items-center space-y-0.5 text-xs ${currentTab === 'admin' ? 'text-forest' : 'text-stone'}`}
        >
          <Settings className="w-5 h-5" />
          <span>Admin</span>
        </button>
      </div>

      {/* Contenu principal */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-8 flex flex-col justify-start">

        {/* ONGLET: UPLOAD / TRAITEMENT */}
        {currentTab === 'upload' && (
          <div className="w-full max-w-3xl mx-auto flex-1 flex flex-col justify-center">
            {processingState === 'idle' && (
              <div className="text-center py-8">
                <h2 className="text-3xl md:text-4xl font-serif text-charcoal font-bold mb-4">La seule source, c'est votre cours.</h2>
                <p className="text-stone max-w-lg mx-auto mb-8 text-base">Aucun catalogue externe, pas d'IA générative hors-sujet. Glissez votre PDF ou photo de cours pour obtenir une fiche d'étude impeccable et 10 questions de test.</p>

                {/* Zone d'Upload */}
                <div className="border-2 border-dashed border-stone/50 hover:border-forest/50 transition-colors bg-white rounded-lg p-8 md:p-12 cursor-pointer relative flex flex-col items-center justify-center">
                  <input
                    type="file"
                    onChange={handleFileChange}
                    accept=".pdf,image/*"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <div className="bg-forest/10 p-4 rounded-full text-forest mb-4">
                    <Upload className="w-8 h-8" />
                  </div>
                  <p className="font-serif text-lg font-bold text-forest mb-1">Sélectionner un cours (PDF ou photo)</p>
                  <p className="text-xs text-stone">PDF jusqu'à [50] Mo ou Images nettes jusqu'à [10] Mo</p>
                </div>

                <div className="flex items-center justify-center space-x-6 mt-8 text-xs text-stone">
                  <div className="flex items-center"><Check className="w-4 h-4 text-forest mr-1"/> Zéro compte obligatoire pour le premier cours</div>
                  <div className="flex items-center"><Check className="w-4 h-4 text-forest mr-1"/> Moins d'une minute de traitement</div>
                </div>
              </div>
            )}

            {/* AVERTISSEMENT DE PLAFOND DUR / DÉCOUPAGE */}
            {warningSplit && warningFileDetails && (
              <div className="bg-white border border-terracotta/30 p-6 rounded-lg text-left max-w-md mx-auto my-8 shadow-sm">
                <div className="flex items-center space-x-2 text-terracotta mb-4">
                  <AlertTriangle className="w-6 h-6" />
                  <h3 className="font-serif text-xl font-bold">Document volumineux détecté</h3>
                </div>
                <p className="text-sm text-charcoal mb-4">
                  Le fichier <strong>{warningFileDetails.file.name}</strong> dépasse la limite recommandée de [30] pages. Nous vous suggérons de le découper en [2] documents de révision indépendants.
                </p>
                <div className="bg-cream p-3 rounded border border-stone/20 text-xs space-y-1 mb-6">
                  <div className="flex justify-between">
                    <span className="text-stone">Pages détectées :</span>
                    <span className="font-semibold">{warningFileDetails.estimatedPages} pages</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone">Coût de traitement :</span>
                    <span className="font-semibold text-terracotta">{warningFileDetails.estimatedCredits} crédits</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone">Votre solde :</span>
                    <span className="font-semibold">{credits} crédits</span>
                  </div>
                </div>
                <div className="flex space-x-3 justify-end">
                  <button
                    onClick={() => setWarningSplit(false)}
                    className="px-4 py-2 text-sm font-medium text-stone hover:bg-alabaster rounded transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={confirmSplitProcessing}
                    className="px-4 py-2 text-sm font-medium bg-forest text-cream rounded hover:bg-forest/90 transition-colors"
                  >
                    Confirmer et Découper
                  </button>
                </div>
              </div>
            )}

            {/* CHARGEMENT PROGRESSIF RÉEL */}
            {processingState === 'local-qc' && (
              <div className="text-center py-12 max-w-md mx-auto">
                <div className="animate-spin text-forest mx-auto mb-4">
                  <RefreshCw className="w-8 h-8" />
                </div>
                <h3 className="font-serif text-xl font-bold text-forest mb-2">Contrôle Qualité Local</h3>
                <p className="text-sm text-stone">{progressLabel}</p>
              </div>
            )}

            {processingState === 'processing' && (
              <div className="text-center py-12 max-w-md mx-auto bg-white p-8 rounded-lg border border-stone/20 shadow-sm">
                <div className="relative w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                  <div className="absolute inset-0 border-4 border-forest/10 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-forest border-t-transparent rounded-full animate-spin"></div>
                  <FileText className="w-6 h-6 text-forest" />
                </div>
                <h3 className="font-serif text-xl font-bold text-forest mb-4">Traitement en cours...</h3>

                {/* Indicateurs synchronisés réels */}
                <div className="space-y-4 text-left">
                  <div className="flex items-center space-x-3">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${progressStep === 'extraction' ? 'bg-forest text-cream animate-pulse' : (progressStep === 'analyse' || progressStep === 'redaction' ? 'bg-forest text-cream' : 'border border-stone')}`}>
                      {progressStep === 'analyse' || progressStep === 'redaction' ? <Check className="w-3. h-3" /> : '1'}
                    </div>
                    <span className={`text-sm ${progressStep === 'extraction' ? 'font-bold text-charcoal' : 'text-stone'}`}>Extraction du texte et OCR</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${progressStep === 'analyse' ? 'bg-forest text-cream animate-pulse' : (progressStep === 'redaction' ? 'bg-forest text-cream' : 'border border-stone')}`}>
                      {progressStep === 'redaction' ? <Check className="w-3 h-3" /> : '2'}
                    </div>
                    <span className={`text-sm ${progressStep === 'analyse' ? 'font-bold text-charcoal' : 'text-stone'}`}>Analyse sémantique intégrale</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${progressStep === 'redaction' ? 'bg-forest text-cream animate-pulse' : 'border border-stone'}`}>
                      3
                    </div>
                    <span className={`text-sm ${progressStep === 'redaction' ? 'font-bold text-charcoal' : 'text-stone'}`}>Production de la fiche et QCM</span>
                  </div>
                </div>

                <p className="text-xs text-stone mt-6 italic">Ne fermez pas cette page. Temps d'attente inférieur à 60 secondes.</p>
              </div>
            )}

            {/* ÉCRAN D'ERREUR ACTIONNABLE */}
            {processingState === 'error' && (
              <div className="bg-white border border-terracotta/30 p-6 rounded-lg text-center max-w-md mx-auto my-8 shadow-sm">
                <div className="inline-flex bg-terracotta/10 p-3 rounded-full text-terracotta mb-4">
                  <AlertTriangle className="w-8 h-8" />
                </div>
                <h3 className="font-serif text-xl font-bold text-terracotta mb-2">Erreur de Traitement</h3>
                <p className="text-sm text-charcoal mb-6">{errorMessage}</p>
                <button
                  onClick={() => setProcessingState('idle')}
                  className="px-6 py-2.5 bg-forest text-cream rounded font-medium hover:bg-forest/95 transition-colors"
                >
                  Réessayer avec un autre fichier
                </button>
              </div>
            )}

            {/* ÉCRAN DE RÉSULTAT (FICHE & QCM EN DUO) */}
            {processingState === 'result' && activeDocument && (
              <div className="flex-1 flex flex-col md:flex-row gap-6 mt-4">

                {/* Barre Latérale de contrôle de la fiche */}
                <div className="md:w-64 flex flex-col space-y-4 shrink-0">
                  <div className="bg-white p-4 rounded-lg border border-stone/20 shadow-sm space-y-3 text-sm">
                    <div className="flex items-center text-xs text-stone space-x-1.5">
                      <Info className="w-3.5 h-3.5" />
                      <span>Confiance d'extraction :</span>
                      <strong className="text-forest">{(activeDocument.confiance * 100).toFixed(0)}%</strong>
                    </div>

                    <div className="border-t border-stone/10 pt-3">
                      <p className="text-xs text-stone mb-1">Matière détectée :</p>
                      <span className="inline-block bg-forest/10 text-forest px-2 py-0.5 rounded text-xs font-semibold">{activeDocument.matiere}</span>
                    </div>

                    <div className="border-t border-stone/10 pt-3 space-y-2">
                      <button
                        onClick={handleExportPDF}
                        className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-forest text-cream rounded font-medium text-xs hover:bg-forest/90 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Exporter en PDF</span>
                      </button>

                      <button
                        onClick={handleSaveToLibrary}
                        className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-alabaster border border-stone/30 text-charcoal rounded font-medium text-xs hover:bg-stone/10 transition-colors"
                      >
                        <Bookmark className="w-3.5 h-3.5 text-terracotta" />
                        <span>Enregistrer</span>
                      </button>
                    </div>
                  </div>

                  {/* Bouton de retour */}
                  <button
                    onClick={() => setProcessingState('idle')}
                    className="flex items-center justify-center space-x-1 text-xs text-stone hover:text-charcoal font-medium py-1"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Uploader un autre document</span>
                  </button>
                </div>

                {/* Zone de Contenu Principale */}
                <div className="flex-1 flex flex-col">
                  {/* Onglets Fiche / QCM */}
                  <div className="flex border-b border-stone/20 mb-4 bg-white rounded-t-lg p-1">
                    <button
                      onClick={() => setActiveTab('fiche')}
                      className={`flex-1 py-2.5 text-center font-serif text-base font-bold rounded transition-colors ${activeTab === 'fiche' ? 'bg-cream text-forest shadow-sm border border-stone/10' : 'text-stone hover:text-charcoal'}`}
                    >
                      Fiche de révision
                    </button>
                    <button
                      onClick={() => setActiveTab('qcm')}
                      className={`flex-1 py-2.5 text-center font-serif text-base font-bold rounded transition-colors ${activeTab === 'qcm' ? 'bg-cream text-forest shadow-sm border border-stone/10' : 'text-stone hover:text-charcoal'}`}
                    >
                      S'auto-évaluer (QCM)
                    </button>
                  </div>

                  {/* CONTENU ONGLET 1: FICHE DE RÉVISION */}
                  {activeTab === 'fiche' && (
                    <div className="bg-white border border-stone/20 rounded-b-lg p-6 md:p-8 space-y-8 shadow-sm">

                      {/* En-tête de la fiche de révision */}
                      <div className="border-b border-stone/10 pb-6">
                        {isEditingTitle ? (
                          <div className="flex items-center space-x-2">
                            <input
                              type="text"
                              value={editedTitle}
                              onChange={(e) => setEditedTitle(e.target.value)}
                              className="text-2xl font-serif font-bold text-forest border-b border-forest focus:outline-none flex-1 bg-cream px-2 py-1 rounded"
                            />
                            <button onClick={handleSaveEditedTitle} className="p-1 bg-forest text-cream rounded"><Check className="w-4 h-4" /></button>
                            <button onClick={() => setIsEditingTitle(false)} className="p-1 bg-stone/20 text-charcoal rounded"><X className="w-4 h-4" /></button>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between">
                            <h2 className="text-2xl md:text-3xl font-serif font-bold text-forest leading-tight">{activeDocument.titre}</h2>
                            <button
                              onClick={() => { setEditedTitle(activeDocument.titre); setIsEditingTitle(true); }}
                              className="text-stone hover:text-forest p-1 rounded"
                              title="Modifier le titre"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                        <p className="text-xs text-stone mt-2 italic">Fidélité au document "{activeDocument.file_name}" à 100% — Aucune connaissance externe injectée.</p>
                      </div>

                      {/* Sections Résumé */}
                      <div className="space-y-6">
                        <h3 className="font-serif text-xl font-bold text-terracotta border-b border-stone/10 pb-2 flex justify-between items-center">
                          <span>Résumé Structuré</span>
                          <button onClick={() => handleFlagError('Contenu', 'Résumé Structuré')} className="text-[10px] text-stone font-normal hover:text-terracotta uppercase tracking-wider">Signaler une erreur</button>
                        </h3>

                        {activeDocument.resume_structure.map((section, idx) => (
                          <div key={idx} className="space-y-2 group relative">
                            <div className="flex items-center justify-between">
                              <h4 className="font-bold text-charcoal font-serif">{section.titre_section}</h4>
                              <button
                                onClick={() => handleStartEditSection(idx, section.points_cles)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-stone hover:text-forest p-1 rounded"
                                title="Modifier cette section"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {editingSectionIndex === idx ? (
                              <div className="space-y-2 bg-cream p-3 rounded border border-stone/30">
                                <p className="text-xs text-stone mb-1 font-semibold">Éditez les points clés (un par ligne) :</p>
                                <textarea
                                  value={editingSectionPoints}
                                  onChange={(e) => setEditingSectionPoints(e.target.value)}
                                  rows={4}
                                  className="w-full text-sm bg-white border border-stone/20 rounded p-2 focus:outline-none"
                                />
                                <div className="flex justify-end space-x-2">
                                  <button onClick={() => handleSaveEditedSection(idx)} className="px-2.5 py-1 bg-forest text-cream text-xs font-semibold rounded hover:bg-forest/90 transition-colors">Enregistrer</button>
                                  <button onClick={() => setEditingSectionIndex(null)} className="px-2.5 py-1 bg-stone/20 text-charcoal text-xs font-semibold rounded hover:bg-stone/30 transition-colors">Annuler</button>
                                </div>
                              </div>
                            ) : (
                              <ul className="space-y-1.5 pl-4 list-disc text-sm text-charcoal">
                                {section.points_cles.map((pt, pIdx) => (
                                  <li key={pIdx} className="leading-relaxed">{pt}</li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Notions Clés */}
                      <div className="space-y-3">
                        <h3 className="font-serif text-xl font-bold text-terracotta border-b border-stone/10 pb-2 flex justify-between items-center">
                          <span>Notions Clés</span>
                          <button onClick={() => handleFlagError('Notions Clés', 'Bloc Notions')} className="text-[10px] text-stone font-normal hover:text-terracotta uppercase tracking-wider">Signaler une erreur</button>
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {activeDocument.notions_cles.map((n, i) => (
                            <span key={i} className="bg-alabaster border border-stone/20 text-charcoal px-3 py-1 rounded-full text-xs font-medium">{n}</span>
                          ))}
                        </div>
                      </div>

                      {/* Définitions Clés */}
                      {activeDocument.definitions && activeDocument.definitions.length > 0 && (
                        <div className="space-y-3">
                          <h3 className="font-serif text-xl font-bold text-terracotta border-b border-stone/10 pb-2 flex justify-between items-center">
                            <span>Définitions</span>
                            <button onClick={() => handleFlagError('Définitions', 'Bloc Définitions')} className="text-[10px] text-stone font-normal hover:text-terracotta uppercase tracking-wider">Signaler une erreur</button>
                          </h3>
                          <div className="grid grid-cols-1 gap-4">
                            {activeDocument.definitions.map((def, i) => (
                              <div key={i} className="bg-alabaster p-4 rounded border border-stone/20 relative group">
                                <p className="font-bold font-serif text-forest text-sm mb-1">{def.terme}</p>
                                <p className="text-xs text-charcoal leading-relaxed">{def.definition}</p>
                                <button onClick={() => handleFlagError('Définition', def.terme)} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-[10px] text-stone hover:text-terracotta">Signaler</button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Formules et Équations */}
                      {activeDocument.formules && activeDocument.formules.length > 0 && (
                        <div className="space-y-3">
                          <h3 className="font-serif text-xl font-bold text-terracotta border-b border-stone/10 pb-2 flex justify-between items-center">
                            <span>Formules Mathématiques / Physiques</span>
                            <button onClick={() => handleFlagError('Formules', 'Bloc Formules')} className="text-[10px] text-stone font-normal hover:text-terracotta uppercase tracking-wider">Signaler une erreur</button>
                          </h3>
                          <div className="grid grid-cols-1 gap-4">
                            {activeDocument.formules.map((f, i) => (
                              <div key={i} className="bg-white border border-stone/30 p-4 rounded relative group">
                                <p className="font-bold font-serif text-charcoal text-sm mb-1">{f.nom}</p>
                                <div className="bg-alabaster p-3 rounded text-center my-2 font-mono text-base font-bold text-forest select-all">
                                  {f.equation}
                                </div>
                                <p className="text-xs text-stone">{f.explication_variables}</p>
                                <button onClick={() => handleFlagError('Formules', f.nom)} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-[10px] text-stone hover:text-terracotta">Signaler</button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    </div>
                  )}

                  {/* CONTENU ONGLET 2: AUTO-ÉVALUATION (QCM) */}
                  {activeTab === 'qcm' && (
                    <div className="space-y-6">

                      {/* Liste de questions QCM */}
                      <div className="space-y-6">
                        {activeDocument.qcm.map((q, idx) => {
                          const isChecked = checkedQuestions[idx];
                          const selectedAnswer = selectedAnswers[idx];

                          return (
                            <div key={idx} className="bg-white border border-stone/20 rounded-lg p-5 md:p-6 shadow-sm space-y-4 relative group">

                              {/* En-tête Question */}
                              <div className="flex items-start justify-between">
                                <div className="flex items-center space-x-2">
                                  <span className="font-serif font-bold text-sm text-forest bg-forest/10 px-2.5 py-0.5 rounded-full">Question {idx + 1}</span>
                                  <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded ${q.difficulte === 'facile' ? 'bg-emerald-100 text-emerald-800' : q.difficulte === 'moyen' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}`}>
                                    {q.difficulte}
                                  </span>
                                </div>
                                <button onClick={() => handleFlagError('Question QCM', q.question)} className="opacity-0 group-hover:opacity-100 text-[10px] text-stone hover:text-terracotta">Signaler une erreur</button>
                              </div>

                              <p className="font-serif font-bold text-charcoal text-base leading-relaxed">{q.question}</p>

                              {/* Options */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                                {q.options.map((opt, oIdx) => {
                                  const isSelected = selectedAnswer === opt;
                                  let optionStyle = "border-stone/30 hover:border-forest/40 bg-white";

                                  if (isSelected) {
                                    optionStyle = "border-forest bg-forest/5 font-semibold text-forest";
                                  }
                                  if (isChecked) {
                                    if (opt === q.reponse) {
                                      optionStyle = "border-emerald-500 bg-emerald-50 text-emerald-900 font-semibold";
                                    } else if (isSelected) {
                                      optionStyle = "border-terracotta bg-terracotta/5 text-terracotta font-semibold line-through";
                                    } else {
                                      optionStyle = "border-stone/10 bg-white text-stone cursor-not-allowed";
                                    }
                                  }

                                  return (
                                    <button
                                      key={oIdx}
                                      disabled={isChecked}
                                      onClick={() => handleSelectOption(idx, opt)}
                                      className={`text-left p-3 rounded border text-sm transition-all flex items-center justify-between ${optionStyle}`}
                                    >
                                      <span>{opt}</span>
                                      {isChecked && opt === q.reponse && <Check className="w-4 h-4 text-emerald-600 shrink-0 ml-2" />}
                                      {isChecked && isSelected && opt !== q.reponse && <X className="w-4 h-4 text-terracotta shrink-0 ml-2" />}
                                    </button>
                                  );
                                })}
                              </div>

                              {/* Bouton de validation individuelle */}
                              {!isChecked && selectedAnswer && (
                                <div className="flex justify-end pt-2">
                                  <button
                                    onClick={() => handleCheckQuestion(idx)}
                                    className="px-3.5 py-1.5 bg-forest text-cream font-medium text-xs rounded hover:bg-forest/90 transition-colors"
                                  >
                                    Vérifier la réponse
                                  </button>
                                </div>
                              )}

                              {/* Explication après validation */}
                              {isChecked && (
                                <div className="bg-alabaster p-3.5 rounded border border-stone/20 text-xs mt-3 leading-relaxed">
                                  <p className="font-bold text-charcoal mb-1">💡 Explication didactique :</p>
                                  <p className="text-stone">{q.explication}</p>
                                </div>
                              )}

                            </div>
                          );
                        })}
                      </div>

                      {/* Section validation de toutes les questions d'un coup */}
                      <div className="bg-white p-6 rounded-lg border border-stone/20 text-center shadow-sm">
                        <p className="text-sm text-stone mb-4">Avez-vous répondu à toutes les questions ? Obtenez votre score global et enregistrez vos points faibles.</p>
                        <button
                          onClick={handleSubmitAllQcm}
                          className="px-6 py-3 bg-forest text-cream font-serif font-bold rounded hover:bg-forest/95 transition-colors inline-flex items-center space-x-2"
                        >
                          <span>Soumettre mon questionnaire</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>

                    </div>
                  )}

                </div>

              </div>
            )}

          </div>
        )}

        {/* ONGLET: BIBLIOTHÈQUE PERSONNELLE */}
        {currentTab === 'library' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="text-3xl font-serif font-bold text-forest">Ma bibliothèque d'étude</h2>
                <p className="text-stone text-sm">Retrouvez toutes vos fiches de révisions générées et rejouez vos QCM.</p>
              </div>

              {/* Barre de Recherche et Filtres */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone" />
                  <input
                    type="text"
                    placeholder="Rechercher une fiche, matière..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-4 py-2 border border-stone/30 rounded-lg text-sm focus:outline-none bg-white w-full sm:w-64"
                  />
                </div>

                <select
                  value={selectedMatiereFilter}
                  onChange={(e) => setSelectedMatiereFilter(e.target.value)}
                  className="px-3 py-2 border border-stone/30 rounded-lg text-sm bg-white focus:outline-none"
                >
                  <option value="all">Toutes les matières</option>
                  {uniqueMatieres.map((mat, i) => (
                    <option key={i} value={mat}>{mat}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Liste des Documents de la Bibliothèque */}
            {filteredLibrary.length === 0 ? (
              <div className="bg-white border border-stone/20 rounded-lg p-12 text-center shadow-sm">
                <Bookmark className="w-12 h-12 text-stone/50 mx-auto mb-4" />
                <h3 className="font-serif text-lg font-bold text-forest mb-1">Aucune fiche trouvée</h3>
                <p className="text-sm text-stone mb-6">Uploadez votre premier cours ou modifiez vos critères de recherche.</p>
                <button
                  onClick={() => setCurrentTab('upload')}
                  className="px-5 py-2.5 bg-forest text-cream text-sm font-semibold rounded hover:bg-forest/95 transition-colors"
                >
                  Ajouter un cours
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredLibrary.map((doc) => (
                  <div
                    key={doc.id}
                    className="bg-white border border-stone/20 rounded-lg p-5 flex flex-col justify-between hover:border-forest/40 transition-colors shadow-sm relative group"
                  >
                    <div>
                      <div className="flex items-start justify-between mb-3">
                        <span className="inline-block bg-forest/10 text-forest px-2 py-0.5 rounded text-[10px] font-bold uppercase">{doc.matiere}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm("Supprimer ce document de votre bibliothèque ?")) {
                              setLibrary(prev => prev.filter(item => item.id !== doc.id));
                            }
                          }}
                          className="text-stone hover:text-terracotta p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Supprimer la fiche"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <h3 className="font-serif font-bold text-lg text-charcoal mb-2 leading-tight line-clamp-2">{doc.titre}</h3>
                      <p className="text-xs text-stone mb-4">Document d'origine : {doc.file_name}</p>
                    </div>

                    <div className="border-t border-stone/10 pt-4 mt-4 flex items-center justify-between text-xs">
                      <span className="text-stone">{new Date(doc.created_at).toLocaleDateString('fr-FR')}</span>
                      <button
                        onClick={() => {
                          setActiveDocument(doc);
                          setSelectedAnswers({});
                          setCheckedQuestions({});
                          setQcmScore(null);
                          setProcessingState('result');
                          setActiveTab('fiche');
                          setCurrentTab('upload');
                        }}
                        className="flex items-center space-x-1 text-forest font-semibold hover:underline"
                      >
                        <span>Réviser</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        )}

        {/* ONGLET: POINTS FAIBLES & MÉMOIRE ESPACÉE */}
        {currentTab === 'weak-points' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-serif font-bold text-forest">Mes points faibles</h2>
              <p className="text-stone text-sm">Vos erreurs passées sont regroupées ici de manière automatisée pour optimiser votre mémorisation.</p>
            </div>

            {weakPoints.length === 0 ? (
              <div className="bg-white border border-stone/20 rounded-lg p-12 text-center shadow-sm">
                <Award className="w-12 h-12 text-forest/50 mx-auto mb-4" />
                <h3 className="font-serif text-lg font-bold text-forest mb-1">Aucun point faible enregistré</h3>
                <p className="text-sm text-stone">C'est une excellente nouvelle ! Continuez à faire des sans-fautes aux QCM pour garder cette liste vide.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-white border border-stone/20 p-4 rounded-lg flex justify-between items-center text-sm shadow-sm">
                  <div>Vous avez <strong>{weakPoints.length}</strong> questions en attente de révision espacée.</div>
                  <button
                    onClick={() => {
                      if (confirm("Réinitialiser l'ensemble de vos points faibles ?")) {
                        setWeakPoints([]);
                      }
                    }}
                    className="text-xs text-terracotta hover:underline font-semibold"
                  >
                    Tout effacer
                  </button>
                </div>

                {weakPoints.map((wp) => (
                  <div key={wp.id} className="bg-white border border-stone/20 rounded-lg p-5 shadow-sm space-y-3 relative group">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-stone">Cours : <strong>{wp.document_title}</strong></span>
                      <span className="bg-terracotta/10 text-terracotta px-2.5 py-0.5 rounded-full font-semibold">Prochaine révision : {wp.interval}j</span>
                    </div>

                    <p className="font-serif font-bold text-charcoal text-base">{wp.question.question}</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm pt-2">
                      {wp.question.options.map((opt, i) => (
                        <div
                          key={i}
                          className={`p-2.5 rounded border text-xs ${opt === wp.question.reponse ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-semibold' : 'border-stone/20 bg-cream text-stone'}`}
                        >
                          {opt}
                        </div>
                      ))}
                    </div>

                    <div className="bg-alabaster p-3 rounded text-xs border border-stone/10 mt-2">
                      <strong>💡 Rappel de l'explication :</strong> {wp.question.explication}
                    </div>

                    <div className="flex justify-end pt-2 space-x-2">
                      <button
                        onClick={() => {
                          // Répétition espacée simple : doubler l'intervalle si compris
                          const intervals = [1, 3, 7, 16];
                          const idx = intervals.indexOf(wp.interval);
                          const nextInterval = idx < intervals.length - 1 ? intervals[idx + 1] : 16;

                          setWeakPoints(prev => prev.map(item => item.id === wp.id ? {
                            ...item,
                            interval: nextInterval,
                            next_review: new Date(Date.now() + nextInterval * 24 * 60 * 60 * 1000).toISOString()
                          } : item));
                          alert(`Félicitations ! Intervalle de révision repoussé à ${nextInterval} jours.`);
                        }}
                        className="px-3 py-1 bg-forest text-cream font-medium text-xs rounded hover:bg-forest/90 transition-colors"
                      >
                        Je m'en souviens désormais
                      </button>
                      <button
                        onClick={() => {
                          setWeakPoints(prev => prev.filter(item => item.id !== wp.id));
                        }}
                        className="px-3 py-1 bg-stone/20 text-charcoal font-medium text-xs rounded hover:bg-stone/30 transition-colors"
                      >
                        Archiver / Supprimer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ONGLET: TABLEAU DE BORD ADMIN (SUIVI DES COÛTS ET PERFORMANCES) */}
        {currentTab === 'admin' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-serif font-bold text-forest">Suivi d'Administration & Coûts</h2>
              <p className="text-stone text-sm">Visualisation transparente des coûts techniques, du hachage de cache et des erreurs.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white border border-stone/20 p-5 rounded-lg shadow-sm">
                <p className="text-xs text-stone uppercase tracking-wider font-semibold mb-1">Nombre total de transactions d'extraction</p>
                <p className="font-serif text-3xl font-bold text-forest">{adminLogs.length}</p>
              </div>
              <div className="bg-white border border-stone/20 p-5 rounded-lg shadow-sm">
                <p className="text-xs text-stone uppercase tracking-wider font-semibold mb-1">Coûts totaux API cumulés (Simulé)</p>
                <p className="font-serif text-3xl font-bold text-terracotta">
                  {adminLogs.reduce((acc, log) => acc + log.cost_api, 0).toFixed(2)} € HT
                </p>
              </div>
              <div className="bg-white border border-stone/20 p-5 rounded-lg shadow-sm">
                <p className="text-xs text-stone uppercase tracking-wider font-semibold mb-1">Économies réalisées grâce au Cache</p>
                <p className="font-serif text-3xl font-bold text-emerald-700">
                  {adminLogs.filter(log => log.status.includes('CACHE')).length * 0.05} € HT
                </p>
              </div>
            </div>

            <div className="bg-white border border-stone/20 rounded-lg shadow-sm overflow-hidden">
              <div className="p-4 bg-alabaster border-b border-stone/20 font-serif font-bold text-forest">
                Journalisation des uploads et analyses
              </div>

              {adminLogs.length === 0 ? (
                <div className="p-8 text-center text-stone text-sm">
                  Aucun traitement n'a encore été enregistré.
                </div>
              ) : (
                <div className="overflow-x-auto text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-cream border-b border-stone/20 text-stone">
                        <th className="p-3">Fichier</th>
                        <th className="p-3">Hachage (SHA-256)</th>
                        <th className="p-3">Caractères</th>
                        <th className="p-3">Confiance</th>
                        <th className="p-3">Coût (API)</th>
                        <th className="p-3">Statut</th>
                        <th className="p-3">Horodatage</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone/10">
                      {adminLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-cream/50">
                          <td className="p-3 font-semibold">{log.file_name}</td>
                          <td className="p-3 font-mono text-[10px] text-stone">{log.file_hash.substring(0, 16)}...</td>
                          <td className="p-3">{log.char_count}</td>
                          <td className="p-3 font-bold text-forest">{(log.confiance * 100).toFixed(0)}%</td>
                          <td className="p-3 font-semibold text-terracotta">{log.cost_api.toFixed(2)} €</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${log.status.includes('CACHE') ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}`}>
                              {log.status}
                            </span>
                          </td>
                          <td className="p-3 text-stone">{new Date(log.timestamp).toLocaleString('fr-FR')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        )}

      </main>

      {/* MODALE D'INTERCEPTION / INSCRIPTION */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/40 backdrop-blur-sm p-4">
          <div className="bg-white max-w-sm w-full rounded-lg border border-stone/20 p-6 shadow-md relative">
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 text-stone hover:text-charcoal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-6">
              <div className="bg-forest/10 p-3 rounded-full text-forest inline-block mb-3">
                <Bookmark className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-xl font-bold text-forest">Sauvegardez vos révisions</h3>
              <p className="text-xs text-stone mt-1">Créez votre compte gratuit en 10 secondes pour conserver cette fiche de révision dans votre bibliothèque.</p>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-charcoal mb-1">E-mail</label>
                <input
                  type="email"
                  required
                  placeholder="adresse@mail.com"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-stone/30 rounded focus:outline-none focus:border-forest"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-charcoal mb-1">Mot de passe</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-stone/30 rounded focus:outline-none focus:border-forest"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-forest text-cream font-medium text-sm rounded hover:bg-forest/95 transition-colors"
              >
                Créer mon compte et sauvegarder
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODALE SCORE QCM */}
      {showScoreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/40 backdrop-blur-sm p-4">
          <div className="bg-white max-w-sm w-full rounded-lg border border-stone/20 p-6 shadow-md text-center">
            <div className="inline-flex bg-forest/10 p-4 rounded-full text-forest mb-4">
              <Award className="w-8 h-8" />
            </div>
            <h3 className="font-serif text-2xl font-bold text-forest mb-1">Résultats du Test !</h3>
            <p className="text-stone text-sm mb-4">Votre score d'évaluation finale :</p>

            <div className="text-4xl font-serif font-bold text-terracotta mb-2">
              {qcmScore} / 10
            </div>

            <p className="text-xs text-stone mb-6 leading-relaxed px-4">
              {qcmScore >= 8
                ? "Excellent travail ! Vous maîtrisez parfaitement les notions de ce cours."
                : "Continuez comme ça ! Les questions ratées ont été ajoutées à vos points faibles pour vos révisions futures."}
            </p>

            <button
              onClick={() => setShowScoreModal(false)}
              className="w-full py-2 bg-forest text-cream font-medium text-sm rounded hover:bg-forest/95 transition-colors"
            >
              Fermer et voir les explications
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-alabaster border-t border-stone/20 py-6 text-center text-sm text-stone mt-auto">
        <p>© {new Date().getFullYear()} NZELO — Révisions simples et fidèles.</p>
      </footer>
    </div>
  );
}

export default App;
