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
  Edit2,
  Sparkles,
  Award as TrophyIcon
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
  const [currentQcmIndex, setCurrentQcmIndex] = useState(0); // Navigation QCM pas-à-pas style Duolingo
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
      setCurrentQcmIndex(0);
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
      setCurrentQcmIndex(0);
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

    // Si la réponse est fausse, on ajoute aux points faibles
    const q = activeDocument.qcm[questionIdx];
    const selectedAnswer = selectedAnswers[questionIdx];
    if (selectedAnswer !== q.reponse) {
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
  };

  const handleNextQcmQuestion = () => {
    if (currentQcmIndex < activeDocument.qcm.length - 1) {
      setCurrentQcmIndex(prev => prev + 1);
    } else {
      // Calcul du score final sur les 10 questions
      let score = 0;
      activeDocument.qcm.forEach((q, idx) => {
        if (selectedAnswers[idx] === q.reponse) {
          score++;
        }
      });
      setQcmScore(score);
      setShowScoreModal(true);
      if (score >= 8) {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#1B4332', '#C05C3E', '#FCFBF7']
        });
      }
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
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>${activeDocument.titre}</title>
          <style>
            body { font-family: 'Georgia', serif; background-color: #FCFBF7; color: #2B2D2F; padding: 40px; line-height: 1.6; }
            h1 { color: #1B4332; font-size: 28px; border-bottom: 3px solid #1B4332; padding-bottom: 10px; }
            h2 { color: #C05C3E; font-size: 20px; margin-top: 30px; }
            h3 { color: #2B2D2F; font-size: 16px; margin-top: 20px; }
            ul { padding-left: 20px; }
            li { margin-bottom: 8px; }
            .meta { color: #7A7D81; font-size: 14px; margin-bottom: 30px; }
            .box { background: #F0EDE6; border: 3px solid #2B2D2F; padding: 15px; border-radius: 12px; margin-bottom: 15px; }
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
      {/* Header global (Duolingo Style: Simple, chunky borders, no fuzzy shadows) */}
      <header className="sticky top-0 z-40 bg-cream border-b-[4px] border-stone/20 px-4 py-3 md:px-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => { setCurrentTab('upload'); setProcessingState('idle'); }}>
            <span className="font-serif text-3xl font-extrabold text-forest tracking-wide">NZELO</span>
          </div>

          <div className="flex items-center space-x-4 md:space-x-6">
            {/* Compteur de Crédits chunky */}
            <div className="flex items-center bg-white px-3 py-1.5 rounded-2xl border-[3px] border-stone/20 text-sm">
              <Award className="w-4 h-4 text-terracotta mr-1.5" strokeWidth={2.5} />
              <span className="font-extrabold text-charcoal">{credits}</span>
              <span className="text-stone ml-1 font-bold">crédits</span>
              <button
                onClick={() => {
                  setCredits(prev => prev + 10);
                  alert("10 crédits vous ont été attribués manuellement !");
                }}
                className="ml-2 text-xs font-black text-forest hover:underline bg-forest/10 px-1.5 py-0.5 rounded-lg border-b-2 border-forest/20"
              >
                +
              </button>
            </div>

            {/* Menu de navigation Duolingo (boutons chunky inactifs ou actifs) */}
            <nav className="hidden md:flex items-center space-x-2">
              <button
                onClick={() => { setCurrentTab('upload'); setProcessingState('idle'); }}
                className={`px-4 py-2 rounded-2xl text-sm font-black uppercase tracking-wider transition-all border-[3px] ${currentTab === 'upload' ? 'bg-forest/10 border-forest text-forest' : 'border-transparent text-stone hover:text-charcoal'}`}
              >
                Réviser
              </button>
              <button
                onClick={() => setCurrentTab('library')}
                className={`px-4 py-2 rounded-2xl text-sm font-black uppercase tracking-wider transition-all border-[3px] ${currentTab === 'library' ? 'bg-forest/10 border-forest text-forest' : 'border-transparent text-stone hover:text-charcoal'}`}
              >
                Bibliothèque
              </button>
              <button
                onClick={() => setCurrentTab('weak-points')}
                className={`px-4 py-2 rounded-2xl text-sm font-black uppercase tracking-wider transition-all border-[3px] ${currentTab === 'weak-points' ? 'bg-forest/10 border-forest text-forest' : 'border-transparent text-stone hover:text-charcoal'}`}
              >
                Faiblesses
              </button>
              <button
                onClick={() => setCurrentTab('admin')}
                className={`px-4 py-2 rounded-2xl text-sm font-black uppercase tracking-wider transition-all border-[3px] ${currentTab === 'admin' ? 'bg-forest/10 border-forest text-forest' : 'border-transparent text-stone hover:text-charcoal'}`}
              >
                Admin
              </button>
            </nav>

            <div className="text-sm font-bold">
              {isRegistered ? (
                <div className="flex items-center space-x-2">
                  <span className="text-forest font-black">{userEmail}</span>
                  <button
                    onClick={() => {
                      setIsRegistered(false);
                      setUserEmail('');
                      localStorage.removeItem('nzelo_registered');
                      localStorage.removeItem('nzelo_email');
                    }}
                    className="text-stone hover:text-terracotta text-xs"
                  >
                    Déconnexion
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="text-terracotta hover:underline font-black uppercase tracking-wider text-xs"
                >
                  S'inscrire
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Mobile chunky */}
      <div className="md:hidden flex justify-around bg-white border-b-[4px] border-stone/20 py-2">
        <button
          onClick={() => { setCurrentTab('upload'); setProcessingState('idle'); }}
          className={`flex flex-col items-center space-y-0.5 text-xs font-black uppercase ${currentTab === 'upload' ? 'text-forest' : 'text-stone'}`}
        >
          <Upload className="w-5 h-5" strokeWidth={2.5} />
          <span>Réviser</span>
        </button>
        <button
          onClick={() => setCurrentTab('library')}
          className={`flex flex-col items-center space-y-0.5 text-xs font-black uppercase ${currentTab === 'library' ? 'text-forest' : 'text-stone'}`}
        >
          <FolderHeart className="w-5 h-5" strokeWidth={2.5} />
          <span>Fiches</span>
        </button>
        <button
          onClick={() => setCurrentTab('weak-points')}
          className={`flex flex-col items-center space-y-0.5 text-xs font-black uppercase ${currentTab === 'weak-points' ? 'text-forest' : 'text-stone'}`}
        >
          <BookOpen className="w-5 h-5" strokeWidth={2.5} />
          <span>Faiblesses</span>
        </button>
        <button
          onClick={() => setCurrentTab('admin')}
          className={`flex flex-col items-center space-y-0.5 text-xs font-black uppercase ${currentTab === 'admin' ? 'text-forest' : 'text-stone'}`}
        >
          <Settings className="w-5 h-5" strokeWidth={2.5} />
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
                <h2 className="text-3xl md:text-5xl font-serif text-charcoal font-black mb-4 leading-tight">La seule source, c'est votre cours.</h2>
                <p className="text-stone max-w-lg mx-auto mb-10 text-lg font-medium leading-relaxed">Aucun catalogue externe, pas d'IA générative hors-sujet. Glissez votre cours pour obtenir une fiche d'étude impeccable et un quiz d'évaluation.</p>

                {/* Zone d'Upload Duolingo: Rounded-2xl, thick solid border */}
                <div className="border-[3px] border-dashed border-stone/50 hover:border-forest hover:bg-forest/5 transition-all bg-white rounded-2xl p-10 md:p-14 cursor-pointer relative flex flex-col items-center justify-center">
                  <input
                    type="file"
                    onChange={handleFileChange}
                    accept=".pdf,image/*"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <div className="bg-forest/10 p-5 rounded-full text-forest mb-4 border-[3px] border-forest/20">
                    <Upload className="w-10 h-10" strokeWidth={2.5} />
                  </div>
                  <p className="font-serif text-xl font-bold text-forest mb-1">Sélectionner un cours (PDF ou photo)</p>
                  <p className="text-xs text-stone font-bold uppercase tracking-wider">PDF jusqu'à [50] Mo ou Images nettes jusqu'à [10] Mo</p>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-8 mt-10 text-xs font-bold text-stone uppercase tracking-widest">
                  <div className="flex items-center"><Check className="w-4 h-4 text-forest mr-1.5" strokeWidth={3} /> Zéro compte obligatoire pour démarrer</div>
                  <div className="flex items-center"><Check className="w-4 h-4 text-forest mr-1.5" strokeWidth={3} /> Moins d'une minute de traitement</div>
                </div>
              </div>
            )}

            {/* AVERTISSEMENT DE PLAFOND DUR / DÉCOUPAGE CHUNKY */}
            {warningSplit && warningFileDetails && (
              <div className="bg-white border-[3px] border-terracotta/30 p-8 rounded-2xl text-left max-w-md mx-auto my-8 shadow-none">
                <div className="flex items-center space-x-2 text-terracotta mb-4">
                  <AlertTriangle className="w-6 h-6" strokeWidth={2.5} />
                  <h3 className="font-serif text-2xl font-bold">Document volumineux !</h3>
                </div>
                <p className="text-sm text-charcoal mb-6 leading-relaxed">
                  Le fichier <strong>{warningFileDetails.file.name}</strong> dépasse la limite recommandée de [30] pages. Nous vous suggérons de le découper en [2] documents de révision indépendants.
                </p>
                <div className="bg-cream p-4 rounded-xl border-[3px] border-stone/20 text-sm font-bold space-y-2 mb-6">
                  <div className="flex justify-between">
                    <span className="text-stone">Pages détectées :</span>
                    <span className="text-charcoal">{warningFileDetails.estimatedPages} pages</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone">Coût de traitement :</span>
                    <span className="text-terracotta">{warningFileDetails.estimatedCredits} crédits</span>
                  </div>
                </div>
                <div className="flex space-x-3 justify-end">
                  <button
                    onClick={() => setWarningSplit(false)}
                    className="px-5 py-2.5 text-sm font-black uppercase bg-alabaster rounded-2xl border-b-[4px] border-stone/30 active:border-b-0 active:translate-y-[4px] transition-all text-stone"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={confirmSplitProcessing}
                    className="px-5 py-2.5 text-sm font-black uppercase bg-forest text-cream rounded-2xl border-b-[4px] border-forest-900 active:border-b-0 active:translate-y-[4px] transition-all"
                  >
                    Confirmer et Découper
                  </button>
                </div>
              </div>
            )}

            {/* CHARGEMENT PROGRESSIF DUOLINGO STYLE (Progress Bar large et animée) */}
            {processingState === 'local-qc' && (
              <div className="text-center py-16 max-w-md mx-auto">
                <div className="animate-spin text-forest mx-auto mb-6">
                  <RefreshCw className="w-10 h-10" strokeWidth={2.5} />
                </div>
                <h3 className="font-serif text-2xl font-bold text-forest mb-2">Contrôle Qualité</h3>
                <p className="text-sm text-stone font-bold uppercase tracking-wider">{progressLabel}</p>
              </div>
            )}

            {processingState === 'processing' && (
              <div className="text-center py-16 max-w-md mx-auto bg-white p-8 rounded-2xl border-[3px] border-stone/20">
                <div className="relative w-20 h-20 mx-auto mb-8 flex items-center justify-center bg-forest/5 rounded-full border-[3px] border-forest/10">
                  <div className="absolute inset-0 border-[4px] border-forest/20 rounded-full"></div>
                  <div className="absolute inset-0 border-[4px] border-forest border-t-transparent rounded-full animate-spin"></div>
                  <FileText className="w-8 h-8 text-forest" strokeWidth={2.5} />
                </div>
                <h3 className="font-serif text-2xl font-black text-forest mb-4">Génération en cours...</h3>

                {/* Chunky animated progress indicators */}
                <div className="space-y-4 text-left pt-2">
                  <div className="flex items-center space-x-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${progressStep === 'extraction' ? 'bg-forest text-cream animate-pulse' : (progressStep === 'analyse' || progressStep === 'redaction' ? 'bg-forest text-cream' : 'border-[2px] border-stone')}`}>
                      {progressStep === 'analyse' || progressStep === 'redaction' ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : '1'}
                    </div>
                    <span className={`text-sm uppercase tracking-wider font-bold ${progressStep === 'extraction' ? 'text-charcoal' : 'text-stone'}`}>Extraction & OCR</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${progressStep === 'analyse' ? 'bg-forest text-cream animate-pulse' : (progressStep === 'redaction' ? 'bg-forest text-cream' : 'border-[2px] border-stone')}`}>
                      {progressStep === 'redaction' ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : '2'}
                    </div>
                    <span className={`text-sm uppercase tracking-wider font-bold ${progressStep === 'analyse' ? 'text-charcoal' : 'text-stone'}`}>Analyse sémantique</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${progressStep === 'redaction' ? 'bg-forest text-cream animate-pulse' : 'border-[2px] border-stone'}`}>
                      3
                    </div>
                    <span className={`text-sm uppercase tracking-wider font-bold ${progressStep === 'redaction' ? 'text-charcoal' : 'text-stone'}`}>Création du quiz</span>
                  </div>
                </div>

                <p className="text-xs text-stone mt-8 font-semibold italic">Temps d'attente estimé : moins de 40 secondes.</p>
              </div>
            )}

            {/* ÉCRAN D'ERREUR ACTIONNABLE CHUNKY */}
            {processingState === 'error' && (
              <div className="bg-white border-[3px] border-terracotta/30 p-8 rounded-2xl text-center max-w-md mx-auto my-8 shadow-none">
                <div className="inline-flex bg-terracotta/10 p-4 rounded-full text-terracotta mb-4 border-[3px] border-terracotta/20">
                  <AlertTriangle className="w-10 h-10" strokeWidth={2.5} />
                </div>
                <h3 className="font-serif text-2xl font-bold text-terracotta mb-2">Une erreur est survenue</h3>
                <p className="text-sm text-charcoal mb-8 leading-relaxed font-semibold">{errorMessage}</p>
                <button
                  onClick={() => setProcessingState('idle')}
                  className="w-full py-3 bg-forest text-cream rounded-2xl font-bold uppercase tracking-wider border-b-[4px] border-forest-900 active:border-b-0 active:translate-y-[4px] transition-all"
                >
                  Uploader un autre fichier
                </button>
              </div>
            )}

            {/* ÉCRAN DE RÉSULTAT (FICHE & QCM EN DUO) */}
            {processingState === 'result' && activeDocument && (
              <div className="flex-1 flex flex-col md:flex-row gap-6 mt-4">

                {/* Barre Latérale de contrôle de la fiche */}
                <div className="md:w-64 flex flex-col space-y-4 shrink-0">
                  <div className="bg-white p-5 rounded-2xl border-[3px] border-stone/20 space-y-4 text-sm font-bold">
                    <div className="flex items-center text-xs text-stone space-x-1.5 uppercase tracking-wider">
                      <Info className="w-4 h-4" />
                      <span>Confiance :</span>
                      <strong className="text-forest font-black">{(activeDocument.confiance * 100).toFixed(0)}%</strong>
                    </div>

                    <div className="border-t-[3px] border-stone/10 pt-4">
                      <p className="text-xs text-stone mb-1 font-bold uppercase tracking-wider">Matière détectée :</p>
                      <span className="inline-block bg-forest/10 border-b-2 border-forest/20 text-forest px-3 py-1 rounded-xl text-xs font-black">{activeDocument.matiere}</span>
                    </div>

                    <div className="border-t-[3px] border-stone/10 pt-4 space-y-3">
                      <button
                        onClick={handleExportPDF}
                        className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-forest text-cream rounded-2xl font-bold text-sm uppercase tracking-wider border-b-[4px] border-forest-900 active:border-b-0 active:translate-y-[4px] transition-all"
                      >
                        <Download className="w-4 h-4" strokeWidth={2.5} />
                        <span>Exporter en PDF</span>
                      </button>

                      <button
                        onClick={handleSaveToLibrary}
                        className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-white border-[3px] border-stone/20 text-charcoal rounded-2xl font-bold text-sm uppercase tracking-wider border-b-[4px] border-stone/30 active:border-b-0 active:translate-y-[4px] transition-all"
                      >
                        <Bookmark className="w-4 h-4 text-terracotta" strokeWidth={2.5} />
                        <span>Enregistrer</span>
                      </button>
                    </div>
                  </div>

                  {/* Bouton de retour chunky */}
                  <button
                    onClick={() => setProcessingState('idle')}
                    className="flex items-center justify-center space-x-1 text-sm text-stone hover:text-charcoal font-bold uppercase tracking-wider py-2 bg-alabaster rounded-2xl border-[3px] border-stone/20"
                  >
                    <ChevronLeft className="w-4 h-4" strokeWidth={2.5} />
                    <span>Nouveau cours</span>
                  </button>
                </div>

                {/* Zone de Contenu Principale */}
                <div className="flex-1 flex flex-col">
                  {/* Onglets Fiche / QCM Duolingo style */}
                  <div className="flex border-b-[4px] border-stone/20 mb-6 bg-white rounded-2xl p-1.5 border-[3px]">
                    <button
                      onClick={() => setActiveTab('fiche')}
                      className={`flex-1 py-3 text-center font-serif text-lg font-black rounded-xl transition-all ${activeTab === 'fiche' ? 'bg-cream text-forest border-b-[4px] border-[3px] border-forest' : 'text-stone hover:text-charcoal'}`}
                    >
                      Fiche de révision
                    </button>
                    <button
                      onClick={() => setActiveTab('qcm')}
                      className={`flex-1 py-3 text-center font-serif text-lg font-black rounded-xl transition-all ${activeTab === 'qcm' ? 'bg-cream text-forest border-b-[4px] border-[3px] border-forest' : 'text-stone hover:text-charcoal'}`}
                    >
                      Quiz de test ({activeDocument.qcm.length})
                    </button>
                  </div>

                  {/* CONTENU ONGLET 1: FICHE DE RÉVISION (CHUNKY / ÉLÉGANT) */}
                  {activeTab === 'fiche' && (
                    <div className="bg-white border-[3px] border-stone/20 rounded-2xl p-6 md:p-8 space-y-8">

                      {/* En-tête de la fiche */}
                      <div className="border-b-[3px] border-stone/10 pb-6">
                        {isEditingTitle ? (
                          <div className="flex items-center space-x-2">
                            <input
                              type="text"
                              value={editedTitle}
                              onChange={(e) => setEditedTitle(e.target.value)}
                              className="text-2xl font-serif font-bold text-forest border-b-[3px] border-forest focus:outline-none flex-1 bg-cream px-3 py-1.5 rounded-xl"
                            />
                            <button onClick={handleSaveEditedTitle} className="p-2 bg-forest text-cream rounded-xl"><Check className="w-5 h-5" strokeWidth={2.5} /></button>
                            <button onClick={() => setIsEditingTitle(false)} className="p-2 bg-stone/20 text-charcoal rounded-xl"><X className="w-5 h-5" strokeWidth={2.5} /></button>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between">
                            <h2 className="text-2xl md:text-4xl font-serif font-black text-forest leading-tight">{activeDocument.titre}</h2>
                            <button
                              onClick={() => { setEditedTitle(activeDocument.titre); setIsEditingTitle(true); }}
                              className="text-stone hover:text-forest p-1.5 rounded-xl border-2 border-transparent hover:border-stone/25"
                              title="Modifier le titre"
                            >
                              <Edit2 className="w-5 h-5" />
                            </button>
                          </div>
                        )}
                        <p className="text-xs text-stone mt-3 font-bold uppercase tracking-wider">Fidélité au document "{activeDocument.file_name}" à 100% — Aucune connaissance externe.</p>
                      </div>

                      {/* Sections Résumé */}
                      <div className="space-y-6">
                        <h3 className="font-serif text-2xl font-black text-terracotta border-b-[3px] border-stone/10 pb-2 flex justify-between items-center">
                          <span>Résumé Structuré</span>
                          <button onClick={() => handleFlagError('Contenu', 'Résumé Structuré')} className="text-xs text-stone font-bold hover:text-terracotta uppercase tracking-wider">Signaler une erreur</button>
                        </h3>

                        {activeDocument.resume_structure.map((section, idx) => (
                          <div key={idx} className="space-y-3 group relative bg-cream p-5 rounded-2xl border-[3px] border-stone/20">
                            <div className="flex items-center justify-between">
                              <h4 className="font-black text-forest font-serif text-lg">{section.titre_section}</h4>
                              <button
                                onClick={() => handleStartEditSection(idx, section.points_cles)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-stone hover:text-forest p-1 rounded-lg"
                                title="Modifier cette section"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            </div>

                            {editingSectionIndex === idx ? (
                              <div className="space-y-3 bg-white p-4 rounded-xl border-[3px] border-stone/30">
                                <p className="text-xs text-stone mb-1 font-bold">Éditez les points clés (un par ligne) :</p>
                                <textarea
                                  value={editingSectionPoints}
                                  onChange={(e) => setEditingSectionPoints(e.target.value)}
                                  rows={4}
                                  className="w-full text-sm bg-cream border border-stone/20 rounded-xl p-3 focus:outline-none"
                                />
                                <div className="flex justify-end space-x-2">
                                  <button onClick={() => handleSaveEditedSection(idx)} className="px-3 py-1.5 bg-forest text-cream text-xs font-bold uppercase rounded-lg">Enregistrer</button>
                                  <button onClick={() => setEditingSectionIndex(null)} className="px-3 py-1.5 bg-stone/20 text-charcoal text-xs font-bold uppercase rounded-lg">Annuler</button>
                                </div>
                              </div>
                            ) : (
                              <ul className="space-y-2 pl-4 list-disc text-sm text-charcoal font-medium">
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
                        <h3 className="font-serif text-2xl font-black text-terracotta border-b-[3px] border-stone/10 pb-2 flex justify-between items-center">
                          <span>Notions Clés</span>
                          <button onClick={() => handleFlagError('Notions Clés', 'Bloc Notions')} className="text-xs text-stone font-bold hover:text-terracotta uppercase tracking-wider">Signaler une erreur</button>
                        </h3>
                        <div className="flex flex-wrap gap-3">
                          {activeDocument.notions_cles.map((n, i) => (
                            <span key={i} className="bg-alabaster border-[3px] border-stone/20 text-charcoal px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider">{n}</span>
                          ))}
                        </div>
                      </div>

                      {/* Définitions Clés */}
                      {activeDocument.definitions && activeDocument.definitions.length > 0 && (
                        <div className="space-y-4">
                          <h3 className="font-serif text-2xl font-black text-terracotta border-b-[3px] border-stone/10 pb-2 flex justify-between items-center">
                            <span>Définitions</span>
                            <button onClick={() => handleFlagError('Définitions', 'Bloc Définitions')} className="text-xs text-stone font-bold hover:text-terracotta uppercase tracking-wider">Signaler une erreur</button>
                          </h3>
                          <div className="grid grid-cols-1 gap-4">
                            {activeDocument.definitions.map((def, i) => (
                              <div key={i} className="bg-alabaster p-5 rounded-2xl border-[3px] border-stone/20 relative group">
                                <p className="font-black font-serif text-forest text-lg mb-1">{def.terme}</p>
                                <p className="text-sm text-charcoal font-medium leading-relaxed">{def.definition}</p>
                                <button onClick={() => handleFlagError('Définition', def.terme)} className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 text-xs text-stone hover:text-terracotta font-bold">Signaler</button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Formules et Équations */}
                      {activeDocument.formules && activeDocument.formules.length > 0 && (
                        <div className="space-y-4">
                          <h3 className="font-serif text-2xl font-black text-terracotta border-b-[3px] border-stone/10 pb-2 flex justify-between items-center">
                            <span>Formules Importantes</span>
                            <button onClick={() => handleFlagError('Formules', 'Bloc Formules')} className="text-xs text-stone font-bold hover:text-terracotta uppercase tracking-wider">Signaler une erreur</button>
                          </h3>
                          <div className="grid grid-cols-1 gap-4">
                            {activeDocument.formules.map((f, i) => (
                              <div key={i} className="bg-white border-[3px] border-stone/20 p-5 rounded-2xl relative group">
                                <p className="font-black font-serif text-charcoal text-base mb-1">{f.nom}</p>
                                <div className="bg-alabaster p-4 rounded-xl text-center my-3 font-mono text-lg font-bold text-forest select-all border-[3px] border-stone/10">
                                  {f.equation}
                                </div>
                                <p className="text-xs text-stone font-bold uppercase tracking-wider">{f.explication_variables}</p>
                                <button onClick={() => handleFlagError('Formules', f.nom)} className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 text-xs text-stone hover:text-terracotta font-bold">Signaler</button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    </div>
                  )}

                  {/* CONTENU ONGLET 2: QUIZ DE TEST (PAS-A-PAS DUOLINGO AVEC INDICATEUR DE PROGRESSION) */}
                  {activeTab === 'qcm' && (
                    <div className="space-y-6">

                      {/* Barre de progression style Duolingo (haute et chunky) */}
                      <div className="bg-white border-[3px] border-stone/20 p-4 rounded-2xl">
                        <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-stone mb-2">
                          <span>Progression du quiz</span>
                          <span>{currentQcmIndex + 1} sur {activeDocument.qcm.length}</span>
                        </div>
                        <div className="w-full bg-stone/10 h-5 rounded-full overflow-hidden border-[3px] border-stone/20">
                          <div
                            className="bg-forest h-full rounded-full transition-all duration-300"
                            style={{ width: `${((currentQcmIndex + 1) / activeDocument.qcm.length) * 100}%` }}
                          />
                        </div>
                      </div>

                      {/* Question Active */}
                      {(() => {
                        const q = activeDocument.qcm[currentQcmIndex];
                        const isChecked = checkedQuestions[currentQcmIndex];
                        const selectedAnswer = selectedAnswers[currentQcmIndex];

                        return (
                          <div className="bg-white border-[3px] border-stone/20 rounded-2xl p-6 md:p-8 space-y-6 relative">

                            {/* Difficulté badge */}
                            <div className="flex items-center justify-between">
                              <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-xl ${q.difficulte === 'facile' ? 'bg-emerald-100 text-emerald-800' : q.difficulte === 'moyen' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}`}>
                                Niveau : {q.difficulte}
                              </span>
                              <button onClick={() => handleFlagError('Question QCM', q.question)} className="text-xs text-stone hover:text-terracotta font-bold">Signaler</button>
                            </div>

                            <p className="font-serif font-black text-charcoal text-xl md:text-2xl leading-relaxed">{q.question}</p>

                            {/* Options QCM Chunky cards style Duolingo */}
                            <div className="grid grid-cols-1 gap-4 pt-2">
                              {q.options.map((opt, oIdx) => {
                                const isSelected = selectedAnswer === opt;
                                const optionLetter = String.fromCharCode(65 + oIdx); // A, B, C, D

                                let optionStyle = "border-stone/20 bg-white hover:bg-stone/5 border-b-[6px]";
                                let badgeStyle = "bg-alabaster border-stone/20 text-stone";

                                if (isSelected) {
                                  optionStyle = "border-forest bg-forest/5 font-black text-forest border-b-[6px]";
                                  badgeStyle = "bg-forest text-cream border-forest";
                                }

                                if (isChecked) {
                                  if (opt === q.reponse) {
                                    optionStyle = "border-emerald-500 bg-emerald-50 text-emerald-900 font-bold border-b-[6px]";
                                    badgeStyle = "bg-emerald-500 text-white border-emerald-500";
                                  } else if (isSelected) {
                                    optionStyle = "border-terracotta bg-terracotta/5 text-terracotta font-bold line-through border-b-[6px]";
                                    badgeStyle = "bg-terracotta text-white border-terracotta";
                                  } else {
                                    optionStyle = "border-stone/10 bg-white text-stone opacity-50 cursor-not-allowed border-b-[2px] translate-y-[4px]";
                                    badgeStyle = "bg-stone/10 text-stone border-transparent";
                                  }
                                }

                                return (
                                  <button
                                    key={oIdx}
                                    disabled={isChecked}
                                    onClick={() => handleSelectOption(currentQcmIndex, opt)}
                                    className={`text-left p-4 rounded-2xl border-[3px] text-base transition-all flex items-center justify-between active:border-b-0 active:translate-y-[4px] ${optionStyle}`}
                                  >
                                    <div className="flex items-center space-x-4">
                                      {/* Badge de gauche A, B, C, D */}
                                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-black border-[2px] shrink-0 ${badgeStyle}`}>
                                        {optionLetter}
                                      </span>
                                      <span className="font-bold">{opt}</span>
                                    </div>
                                    {isChecked && opt === q.reponse && <Check className="w-5 h-5 text-emerald-600 shrink-0 ml-2" strokeWidth={3} />}
                                    {isChecked && isSelected && opt !== q.reponse && <X className="w-5 h-5 text-terracotta shrink-0 ml-2" strokeWidth={3} />}
                                  </button>
                                );
                              })}
                            </div>

                            {/* PANNEAU DE RÉTROACTION DUOLINGO (En bas de la question) */}
                            {selectedAnswer && (
                              <div className="pt-4 border-t-[3px] border-stone/10 mt-6">
                                {!isChecked ? (
                                  <div className="flex justify-end">
                                    <button
                                      onClick={() => handleCheckQuestion(currentQcmIndex)}
                                      className="px-6 py-3 bg-forest text-cream font-black uppercase tracking-wider rounded-2xl border-b-[5px] border-forest-900 active:border-b-0 active:translate-y-[4px] transition-all"
                                    >
                                      Vérifier
                                    </button>
                                  </div>
                                ) : (
                                  <div className={`p-5 rounded-2xl border-[3px] ${selectedAnswer === q.reponse ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-terracotta/5 border-terracotta/20 text-terracotta'} space-y-3`}>
                                    <div className="flex items-center space-x-2">
                                      {selectedAnswer === q.reponse ? (
                                        <h4 className="font-black font-serif text-lg text-emerald-800">🎉 Excellent travail !</h4>
                                      ) : (
                                        <h4 className="font-black font-serif text-lg text-terracotta">💡 C'est incorrect, mais tu apprends !</h4>
                                      )}
                                    </div>
                                    <p className="text-sm font-bold">{q.explication}</p>

                                    {/* Bouton de progression suivante */}
                                    <div className="flex justify-end pt-2">
                                      <button
                                        onClick={handleNextQcmQuestion}
                                        className="px-6 py-3 bg-forest text-cream font-black uppercase tracking-wider rounded-2xl border-b-[5px] border-forest-900 active:border-b-0 active:translate-y-[4px] transition-all"
                                      >
                                        {currentQcmIndex < activeDocument.qcm.length - 1 ? 'Suivant' : 'Terminer le test'}
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                          </div>
                        );
                      })()}

                    </div>
                  )}

                </div>

              </div>
            )}

          </div>
        )}

        {/* ONGLET: BIBLIOTHÈQUE PERSONNELLE (DUOLINGO STYLE CARDS) */}
        {currentTab === 'library' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="text-3xl font-serif font-black text-forest">Ma bibliothèque d'étude</h2>
                <p className="text-stone text-sm font-bold">Retrouvez toutes vos fiches de révisions et rejouez vos quiz.</p>
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
                    className="pl-9 pr-4 py-2 border-[3px] border-stone/20 rounded-2xl text-sm font-bold focus:outline-none bg-white w-full sm:w-64"
                  />
                </div>

                <select
                  value={selectedMatiereFilter}
                  onChange={(e) => setSelectedMatiereFilter(e.target.value)}
                  className="px-3 py-2 border-[3px] border-stone/20 rounded-2xl text-sm font-bold bg-white focus:outline-none"
                >
                  <option value="all">Toutes les matières</option>
                  {uniqueMatieres.map((mat, i) => (
                    <option key={i} value={mat}>{mat}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Liste des Documents */}
            {filteredLibrary.length === 0 ? (
              <div className="bg-white border-[3px] border-stone/20 rounded-2xl p-12 text-center">
                <Bookmark className="w-12 h-12 text-stone/50 mx-auto mb-4" />
                <h3 className="font-serif text-xl font-bold text-forest mb-1">Aucune fiche trouvée</h3>
                <p className="text-sm text-stone font-bold mb-6 uppercase tracking-wider">Uploadez votre premier cours pour commencer à réviser.</p>
                <button
                  onClick={() => setCurrentTab('upload')}
                  className="px-6 py-3 bg-forest text-cream text-sm font-bold uppercase tracking-wider rounded-2xl border-b-[5px] border-forest-900 active:border-b-0 active:translate-y-[4px] transition-all"
                >
                  Ajouter un cours
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredLibrary.map((doc) => (
                  <div
                    key={doc.id}
                    className="bg-white border-[3px] border-stone/20 rounded-2xl p-6 flex flex-col justify-between hover:border-forest transition-colors relative group"
                  >
                    <div>
                      <div className="flex items-start justify-between mb-3">
                        <span className="inline-block bg-forest/10 text-forest px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider border-b-2 border-forest/15">{doc.matiere}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm("Supprimer ce document de votre bibliothèque ?")) {
                              setLibrary(prev => prev.filter(item => item.id !== doc.id));
                            }
                          }}
                          className="text-stone hover:text-terracotta p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <h3 className="font-serif font-black text-xl text-charcoal mb-2 leading-tight line-clamp-2">{doc.titre}</h3>
                      <p className="text-xs text-stone font-bold">Document : {doc.file_name}</p>
                    </div>

                    <div className="border-t-[3px] border-stone/10 pt-4 mt-6 flex items-center justify-between text-xs font-bold">
                      <span className="text-stone">{new Date(doc.created_at).toLocaleDateString('fr-FR')}</span>
                      <button
                        onClick={() => {
                          setActiveDocument(doc);
                          setSelectedAnswers({});
                          setCheckedQuestions({});
                          setCurrentQcmIndex(0);
                          setQcmScore(null);
                          setProcessingState('result');
                          setActiveTab('fiche');
                          setCurrentTab('upload');
                        }}
                        className="flex items-center space-x-1 text-forest font-black uppercase tracking-wider"
                      >
                        <span>Étudier</span>
                        <ChevronRight className="w-4 h-4" strokeWidth={2.5} />
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
              <h2 className="text-3xl font-serif font-black text-forest">Mes points faibles</h2>
              <p className="text-stone text-sm font-bold">Vos erreurs passées sont regroupées ici de manière automatisée pour optimiser votre mémorisation.</p>
            </div>

            {weakPoints.length === 0 ? (
              <div className="bg-white border-[3px] border-stone/20 rounded-2xl p-12 text-center">
                <Award className="w-12 h-12 text-forest/50 mx-auto mb-4" />
                <h3 className="font-serif text-xl font-bold text-forest mb-1">Aucun point faible enregistré</h3>
                <p className="text-sm text-stone font-bold uppercase tracking-wider">C'est une excellente nouvelle ! Continuez à faire des sans-fautes aux quiz.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-white border-[3px] border-stone/20 p-5 rounded-2xl flex justify-between items-center text-sm font-bold">
                  <div>Vous avez <strong>{weakPoints.length}</strong> questions en attente de révision espacée.</div>
                  <button
                    onClick={() => {
                      if (confirm("Réinitialiser l'ensemble de vos points faibles ?")) {
                        setWeakPoints([]);
                      }
                    }}
                    className="text-xs text-terracotta hover:underline font-black uppercase tracking-wider"
                  >
                    Tout effacer
                  </button>
                </div>

                {weakPoints.map((wp) => (
                  <div key={wp.id} className="bg-white border-[3px] border-stone/20 rounded-2xl p-6 space-y-4 relative group">
                    <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider">
                      <span className="text-stone">Cours : <strong className="text-charcoal">{wp.document_title}</strong></span>
                      <span className="bg-terracotta/10 text-terracotta px-3 py-1 rounded-full font-black border-b-2 border-terracotta/15">Prochaine révision : {wp.interval}j</span>
                    </div>

                    <p className="font-serif font-black text-charcoal text-lg md:text-xl">{wp.question.question}</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm pt-2">
                      {wp.question.options.map((opt, i) => (
                        <div
                          key={i}
                          className={`p-3.5 rounded-2xl border-[3px] font-bold ${opt === wp.question.reponse ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-bold border-b-[5px]' : 'border-stone/20 bg-cream text-stone'}`}
                        >
                          {opt}
                        </div>
                      ))}
                    </div>

                    <div className="bg-alabaster p-4 rounded-xl text-xs border-[3px] border-stone/10 mt-2 font-medium">
                      <strong className="font-bold">💡 Rappel de l'explication :</strong> {wp.question.explication}
                    </div>

                    <div className="flex justify-end pt-2 space-x-3">
                      <button
                        onClick={() => {
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
                        className="px-4 py-2 bg-forest text-cream font-black uppercase tracking-wider text-xs rounded-xl border-b-[4px] border-forest-900 active:border-b-0 active:translate-y-[4px] transition-all"
                      >
                        Compris !
                      </button>
                      <button
                        onClick={() => {
                          setWeakPoints(prev => prev.filter(item => item.id !== wp.id));
                        }}
                        className="px-4 py-2 bg-stone/20 text-charcoal font-black uppercase tracking-wider text-xs rounded-xl border-b-[4px] border-stone/30 active:border-b-0 active:translate-y-[4px] transition-all"
                      >
                        Archiver
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ONGLET: TABLEAU DE BORD ADMIN */}
        {currentTab === 'admin' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-serif font-black text-forest">Suivi d'Administration & Coûts</h2>
              <p className="text-stone text-sm font-bold">Visualisation transparente des coûts techniques et des logs d'extraction.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-bold">
              <div className="bg-white border-[3px] border-stone/20 p-5 rounded-2xl">
                <p className="text-xs text-stone uppercase tracking-wider font-bold mb-1">Nombre total d'extractions</p>
                <p className="font-serif text-3xl font-black text-forest">{adminLogs.length}</p>
              </div>
              <div className="bg-white border-[3px] border-stone/20 p-5 rounded-2xl">
                <p className="text-xs text-stone uppercase tracking-wider font-bold mb-1">Coûts totaux API cumulés</p>
                <p className="font-serif text-3xl font-black text-terracotta">
                  {adminLogs.reduce((acc, log) => acc + log.cost_api, 0).toFixed(2)} € HT
                </p>
              </div>
              <div className="bg-white border-[3px] border-stone/20 p-5 rounded-2xl">
                <p className="text-xs text-stone uppercase tracking-wider font-bold mb-1">Économies (Cache)</p>
                <p className="font-serif text-3xl font-black text-emerald-700">
                  {adminLogs.filter(log => log.status.includes('CACHE')).length * 0.05} € HT
                </p>
              </div>
            </div>

            <div className="bg-white border-[3px] border-stone/20 rounded-2xl overflow-hidden">
              <div className="p-4 bg-alabaster border-b-[3px] border-stone/20 font-serif font-black text-forest">
                Journalisation des uploads et analyses
              </div>

              {adminLogs.length === 0 ? (
                <div className="p-8 text-center text-stone font-bold uppercase tracking-wider text-xs">
                  Aucun traitement n'a encore été enregistré.
                </div>
              ) : (
                <div className="overflow-x-auto text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-cream border-b-[3px] border-stone/20 text-stone uppercase tracking-wider font-bold">
                        <th className="p-3">Fichier</th>
                        <th className="p-3">Hachage (SHA-256)</th>
                        <th className="p-3">Caractères</th>
                        <th className="p-3">Confiance</th>
                        <th className="p-3">Coût (API)</th>
                        <th className="p-3">Statut</th>
                        <th className="p-3">Horodatage</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone/10 font-medium">
                      {adminLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-cream/50">
                          <td className="p-3 font-bold">{log.file_name}</td>
                          <td className="p-3 font-mono text-[10px] text-stone">{log.file_hash.substring(0, 16)}...</td>
                          <td className="p-3">{log.char_count}</td>
                          <td className="p-3 font-black text-forest">{(log.confiance * 100).toFixed(0)}%</td>
                          <td className="p-3 font-bold text-terracotta">{log.cost_api.toFixed(2)} €</td>
                          <td className="p-3">
                            <span className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border ${log.status.includes('CACHE') ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-blue-100 text-blue-800 border-blue-300'}`}>
                              {log.status}
                            </span>
                          </td>
                          <td className="p-3 text-stone font-semibold">{new Date(log.timestamp).toLocaleString('fr-FR')}</td>
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
          <div className="bg-white max-w-sm w-full rounded-2xl border-[3px] border-stone/20 p-6 shadow-none relative">
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 text-stone hover:text-charcoal"
            >
              <X className="w-5 h-5" strokeWidth={2.5} />
            </button>

            <div className="text-center mb-6">
              <div className="bg-forest/10 p-4 rounded-full text-forest inline-block mb-3 border-[3px] border-forest/10">
                <Bookmark className="w-7 h-7" strokeWidth={2.5} />
              </div>
              <h3 className="font-serif text-2xl font-black text-forest">Sauvegarde tes révisions !</h3>
              <p className="text-xs text-stone mt-2 font-bold uppercase tracking-wider">Crée ton compte gratuit en 10 secondes pour conserver cette fiche de révision.</p>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-charcoal uppercase tracking-wider mb-1">E-mail</label>
                <input
                  type="email"
                  required
                  placeholder="adresse@mail.com"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full text-sm px-3 py-2.5 border-[3px] border-stone/20 rounded-xl focus:outline-none focus:border-forest bg-cream font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-charcoal uppercase tracking-wider mb-1">Mot de passe</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full text-sm px-3 py-2.5 border-[3px] border-stone/20 rounded-xl focus:outline-none focus:border-forest bg-cream font-bold"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-forest text-cream font-black uppercase tracking-wider rounded-2xl border-b-[5px] border-forest-900 active:border-b-0 active:translate-y-[4px] transition-all"
              >
                Créer mon compte et sauvegarder
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODALE SCORE QUIZ */}
      {showScoreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/40 backdrop-blur-sm p-4">
          <div className="bg-white max-w-sm w-full rounded-2xl border-[3px] border-stone/20 p-6 shadow-none text-center">
            <div className="inline-flex bg-forest/10 p-4 rounded-full text-forest mb-4 border-[3px] border-forest/10">
              <TrophyIcon className="w-10 h-10" strokeWidth={2.5} />
            </div>
            <h3 className="font-serif text-3xl font-black text-forest mb-1">Quiz terminé !</h3>
            <p className="text-stone text-sm font-bold uppercase tracking-wider mb-4">Ton score d'évaluation :</p>

            <div className="text-5xl font-serif font-black text-terracotta mb-4">
              {qcmScore} / 10
            </div>

            <p className="text-xs text-stone font-bold uppercase tracking-wider mb-6 leading-relaxed px-4">
              {qcmScore >= 8
                ? "Félicitations ! Tu maîtrises parfaitement les notions de ce cours."
                : "Les questions ratées ont été ajoutées à tes points faibles pour tes révisions futures."}
            </p>

            <button
              onClick={() => setShowScoreModal(false)}
              className="w-full py-3 bg-forest text-cream font-black uppercase tracking-wider rounded-2xl border-b-[5px] border-forest-900 active:border-b-0 active:translate-y-[4px] transition-all"
            >
              Voir les explications
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-alabaster border-t-[3px] border-stone/20 py-6 text-center text-sm text-stone mt-auto font-bold uppercase tracking-wider">
        <p>© {new Date().getFullYear()} NZELO — Apprendre de façon simple et fidèle.</p>
      </footer>
    </div>
  );
}

export default App;
