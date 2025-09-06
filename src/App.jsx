import { useEffect, useState, useRef } from "react";
import { Card, CardContent } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Checkbox } from "./components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "./components/ui/radio-group";
import { cn } from "./lib/utils";
import {
  generateQuestionsFromFiles,
  generateQuestionsWithSmartDetection,
  evaluateAnswerWithAI,
} from "./config/openai";
import { AI_CONFIG } from "./config/aiSettings";
import { isAppReady, getConfigStatus } from "./utils/envValidator";
import { useAuth } from "./hooks/useAuth";
import { useSubscription } from "./hooks/useSubscription";
import { useFirebaseStorage } from "./hooks/useFirebaseStorage";
import { useQuizHistory } from "./hooks/useQuizHistory";
import { AuthModal } from "./components/AuthModal";
import PricingSection from "./components/PricingSection";
import SubscriptionDashboard from "./components/SubscriptionDashboard";
import UserMenu from "./components/UserMenu";
import "./App.css";

export default function App() {
  const { user, loading: authLoading, logout } = useAuth();
  const {
    subscription,
    hasActiveSubscription,
    getDaysRemaining,
    getSubscriptionStatus,
    isExpiringSoon,
  } = useSubscription();
  const {
    storage,
    isReady: storageReady,
    isLoading: storageLoading,
    resetHistoryFlag,
  } = useFirebaseStorage();
  const { getQuizHistory } = useQuizHistory();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSubscriptionDashboard, setShowSubscriptionDashboard] =
    useState(false);
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState({});
  const [showResult, setShowResult] = useState(false);
  const [isCustomQuiz, setIsCustomQuiz] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loadedFileName, setLoadedFileName] = useState("preguntitas.json");
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [showPremiumSection, setShowPremiumSection] = useState(true);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [customApiKey, setCustomApiKey] = useState("");
  const [showApiKeyField, setShowApiKeyField] = useState(false);
  const [questionType, setQuestionType] = useState("choice"); // "choice" or "development"
  const [developmentAnswers, setDevelopmentAnswers] = useState({});
  const [isEvaluating, setIsEvaluating] = useState(false); // Separate state for AI evaluation
  const [evaluatorPersonality, setEvaluatorPersonality] = useState("normal");
  const [difficultyLevel, setDifficultyLevel] = useState("normal");
  const [apiPreference, setApiPreference] = useState("responses"); // "responses", "assistants", or "traditional"
  const [showPricingSection, setShowPricingSection] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(""); // Add progress tracking
  const fileInputRef = useRef(null);
  const premiumFileInputRef = useRef(null);
  const generationAbortController = useRef(null); // Add abort controller for cancellation

  // Add new state for answer statistics
  const [answerStats, setAnswerStats] = useState({
    correct: 0,
    incorrect: 0,
    skipped: 0,
  });

  // Add state to control final results display
  const [showFinalResults, setShowFinalResults] = useState(false);

  // Add new state for initial question type selection
  const [showQuestionTypeSelection, setShowQuestionTypeSelection] =
    useState(false);
  const [selectionLoading, setSelectionLoading] = useState(false);

  useEffect(() => {
    // Wait for storage to be ready before loading
    if (!storageReady) return;

    const initializeApp = async () => {
      // Debug: Show what's in Firebase storage
      console.log("🔍 VERIFICACIÓN DE PERSISTENCIA AL INICIAR:");
      const choiceQuiz = storage.getItem("customQuizData_choice");
      const devQuiz = storage.getItem("customQuizData_development");
      const savedType = storage.getItem("questionType");

      console.log(
        "📝 Preguntas choice guardadas:",
        choiceQuiz ? `${JSON.parse(choiceQuiz).length} preguntas` : "❌ Ninguna"
      );
      console.log(
        "🧠 Preguntas desarrollo guardadas:",
        devQuiz ? `${JSON.parse(devQuiz).length} preguntas` : "❌ Ninguna"
      );
      console.log("🎯 Tipo guardado:", savedType || "❌ Ninguno");

      // Load saved question type from Firebase storage
      const savedQuestionType = storage.getItem("questionType");
      if (
        savedQuestionType &&
        (savedQuestionType === "choice" || savedQuestionType === "development")
      ) {
        setQuestionType(savedQuestionType);

        // Check if there are saved questions for this type
        const { customQuizKey } = getLocalStorageKeys(savedQuestionType);
        const savedQuestions = storage.getItem(customQuizKey);

        if (savedQuestions && savedQuestionType === "development") {
          console.log("🧠 Cargando preguntas de desarrollo guardadas...");
        }

        await loadQuestions(savedQuestionType);
      } else {
        // No saved preference - show question type selection
        setShowQuestionTypeSelection(true);
        setLoading(false);
      }
    };

    initializeApp();
  }, [storageReady]);

  // Effect to check if user lost premium access while in development mode
  useEffect(() => {
    if (questionType === "development" && !hasActiveSubscription()) {
      console.log(
        "🔄 Usuario perdió acceso premium, cambiando a modo opción múltiple"
      );
      setQuestionType("choice");
      storage.setItem("questionType", "choice");
      // Reload questions for choice mode
      const reloadQuestions = async () => {
        await loadQuestions("choice");
      };
      reloadQuestions();
    }
  }, [hasActiveSubscription, questionType]);

  const getLocalStorageKeys = (type = questionType) => {
    const customQuizKey =
      type === "development"
        ? "customQuizData_development"
        : "customQuizData_choice";
    const customFileNameKey =
      type === "development"
        ? "customQuizFileName_development"
        : "customQuizFileName_choice";

    return { customQuizKey, customFileNameKey };
  };

  // Function to load the last quiz from history for a specific type
  const loadLastQuizFromHistory = async (type) => {
    try {
      console.log(
        `🔍 Buscando última pregunta de tipo ${type} en el historial...`
      );
      const historyEntries = await getQuizHistory(type, 1);

      if (historyEntries.length > 0) {
        const lastEntry = historyEntries[0]; // First entry is the most recent due to desc order
        console.log(
          `📚 Encontrada última pregunta ${type} en historial:`,
          lastEntry.fileName
        );

        // Parse and validate quiz data
        const quizData = JSON.parse(lastEntry.quizData);
        const isValidStructure = quizData.every(
          (q) =>
            q.question &&
            Array.isArray(q.options) &&
            Array.isArray(q.correct) &&
            q.id !== undefined
        );

        if (isValidStructure) {
          // Save to current storage
          const { customQuizKey, customFileNameKey } =
            getLocalStorageKeys(type);
          storage.setItem(customQuizKey, lastEntry.quizData);
          storage.setItem(customFileNameKey, lastEntry.fileName);

          // Load the quiz
          const shuffled = quizData.sort(() => 0.5 - Math.random());
          setQuestions(shuffled);
          setIsCustomQuiz(true);
          setLoadedFileName(lastEntry.fileName);
          setLoading(false);

          console.log(
            `✅ Última pregunta ${type} cargada desde historial exitosamente`
          );
          return true;
        } else {
          console.warn(
            `⚠️ Estructura inválida en última pregunta ${type} del historial`
          );
        }
      } else {
        console.log(`📭 No hay preguntas de tipo ${type} en el historial`);
      }
    } catch (error) {
      console.error(
        `❌ Error cargando última pregunta ${type} del historial:`,
        error
      );
    }

    return false;
  };

  const loadQuestions = async (forceType = null) => {
    const currentType = forceType || questionType;

    // Use different localStorage keys for different question types
    const { customQuizKey, customFileNameKey } =
      getLocalStorageKeys(currentType);

    // Check if there's a custom quiz saved in Firebase storage for this type
    const savedCustomQuiz = storage.getItem(customQuizKey);
    const savedFileName = storage.getItem(customFileNameKey);

    if (savedCustomQuiz && savedFileName) {
      try {
        const jsonData = JSON.parse(savedCustomQuiz);
        // Validate structure before loading
        const isValidStructure = jsonData.every(
          (q) =>
            q.question &&
            Array.isArray(q.options) &&
            Array.isArray(q.correct) &&
            q.id !== undefined
        );

        if (isValidStructure) {
          // Load saved custom questions
          const shuffled = jsonData.sort(() => 0.5 - Math.random());
          setQuestions(shuffled);
          setIsCustomQuiz(true);
          setLoadedFileName(savedFileName);
          setLoading(false);
          return;
        } else {
          // Clear invalid data from Firebase storage
          storage.removeItem(customQuizKey);
          storage.removeItem(customFileNameKey);
        }
      } catch (err) {
        // Clear corrupted data from Firebase storage
        storage.removeItem(customQuizKey);
        storage.removeItem(customFileNameKey);
      }
    }

    // If no valid custom quiz found, try to load from history
    console.log(
      `📖 No hay preguntas guardadas para ${currentType}, buscando en historial...`
    );

    // Try to load the last quiz from history for this type
    const loadedFromHistory = await loadLastQuizFromHistory(currentType);

    if (!loadedFromHistory) {
      // If no history found either, show question type selection
      console.log(
        `📖 No hay preguntas en historial para ${currentType}, mostrando selección de modalidad`
      );
      setShowQuestionTypeSelection(true);
      setLoading(false);
    }
  };

  // Function to load questions or defaults when user actively selects a modality
  const loadQuestionsOrDefaults = (forceType = null) => {
    const currentType = forceType || questionType;

    // Use different localStorage keys for different question types
    const { customQuizKey, customFileNameKey } =
      getLocalStorageKeys(currentType);

    // Check if there's a custom quiz saved in Firebase storage for this type
    const savedCustomQuiz = storage.getItem(customQuizKey);
    const savedFileName = storage.getItem(customFileNameKey);

    if (savedCustomQuiz && savedFileName) {
      try {
        const jsonData = JSON.parse(savedCustomQuiz);
        // Validate structure before loading
        const isValidStructure = jsonData.every(
          (q) =>
            q.question &&
            Array.isArray(q.options) &&
            Array.isArray(q.correct) &&
            q.id !== undefined
        );

        if (isValidStructure) {
          // Load saved custom questions
          const shuffled = jsonData.sort(() => 0.5 - Math.random());
          setQuestions(shuffled);
          setIsCustomQuiz(true);
          setLoadedFileName(savedFileName);
          setLoading(false);
          return;
        } else {
          // Clear invalid data from Firebase storage
          storage.removeItem(customQuizKey);
          storage.removeItem(customFileNameKey);
        }
      } catch (err) {
        // Clear corrupted data from Firebase storage
        storage.removeItem(customQuizKey);
        storage.removeItem(customFileNameKey);
      }
    }

    // Load default questions if no valid custom quiz found
    loadDefaultQuestions();
  };

  const loadDefaultQuestions = () => {
    setLoading(true);
    setError(null);

    // Clear any saved custom quiz data for the current type when loading defaults
    const { customQuizKey, customFileNameKey } = getLocalStorageKeys();

    storage.removeItem(customQuizKey);
    storage.removeItem(customFileNameKey);

    fetch("preguntitas.json")
      .then((r) => r.json())
      .then((data) => {
        // shuffle and keep first 20 for the session
        const shuffled = data.sort(() => 0.5 - Math.random()).slice(0, 20);
        setQuestions(shuffled);
        setIsCustomQuiz(false);
        setLoadedFileName("preguntitas.json");
        setLoading(false);
      })
      .catch((err) => {
        setError("Error al cargar las preguntas por defecto");
        setLoading(false);
      });
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.type !== "application/json") {
      setError("Por favor selecciona un archivo JSON válido");
      return;
    }

    setLoading(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const jsonData = JSON.parse(e.target.result);

        // Validate JSON structure
        if (!Array.isArray(jsonData)) {
          throw new Error("El archivo debe contener un array de preguntas");
        }

        // Validate each question has required fields
        const isValidStructure = jsonData.every(
          (q) =>
            q.question &&
            Array.isArray(q.options) &&
            Array.isArray(q.correct) &&
            q.id !== undefined
        );

        if (!isValidStructure) {
          throw new Error(
            "Estructura de preguntas inválida. Cada pregunta debe tener: question, options, correct, id"
          );
        }

        // Reset quiz state
        setCurrentIdx(0);
        setSelected({});
        setShowResult(false);
        setAnswerStats({ correct: 0, incorrect: 0, skipped: 0 }); // Reset stats
        setShowFinalResults(false); // Reset final results display

        // Load custom questions
        const shuffled = jsonData.sort(() => 0.5 - Math.random());
        setQuestions(shuffled);
        setIsCustomQuiz(true);
        setLoadedFileName(file.name);
        setLoading(false);

        // Reset history flag since this is a new uploaded quiz
        await resetHistoryFlag();

        // Save original custom questions to Firebase storage (not shuffled)
        const { customQuizKey, customFileNameKey } = getLocalStorageKeys();

        storage.setItem(customQuizKey, JSON.stringify(jsonData));
        storage.setItem(customFileNameKey, file.name);

        // Verification logging
        console.log(`💾 Preguntas JSON ${questionType} guardadas:`, {
          type: questionType,
          count: jsonData.length,
          key: customQuizKey,
          filename: file.name,
        });

        // Double-check the save worked
        const verification = storage.getItem(customQuizKey);
        if (verification) {
          console.log(
            `✅ Verificación JSON exitosa: ${
              JSON.parse(verification).length
            } preguntas en Firebase storage`
          );
        } else {
          console.error(
            `❌ FALLO CRÍTICO JSON: No se pudieron guardar las preguntas ${questionType}`
          );
        }
      } catch (err) {
        setError(`Error al procesar el archivo: ${err.message}`);
        setLoading(false);
      }
    };

    reader.onerror = () => {
      setError("Error al leer el archivo");
      setLoading(false);
    };

    reader.readAsText(file);
  };

  const resetToDefault = () => {
    setCurrentIdx(0);
    setSelected({});
    setDevelopmentAnswers({});
    setShowResult(false);
    setError(null);
    setShowInfoModal(false);
    setAnswerStats({ correct: 0, incorrect: 0, skipped: 0 }); // Reset stats
    setShowFinalResults(false); // Reset final results display
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    // Clear custom quiz data from Firebase storage for current type only
    const { customQuizKey, customFileNameKey } = getLocalStorageKeys();

    storage.removeItem(customQuizKey);
    storage.removeItem(customFileNameKey);

    // Note: Don't remove questionType from Firebase storage - keep user preference
    loadDefaultQuestions();
  };

  const handlePremiumFileUpload = (event) => {
    const files = Array.from(event.target.files);
    const validFiles = files.filter((file) => {
      // Allow all file types except videos
      const isVideo = file.type.startsWith("video/");
      return !isVideo && file.size <= 10 * 1024 * 1024; // 10MB limit
    });

    setUploadedFiles((prev) => [...prev, ...validFiles]);
  };

  const removeFile = (indexToRemove) => {
    setUploadedFiles((prev) =>
      prev.filter((_, index) => index !== indexToRemove)
    );
  };

  const clearAllFiles = () => {
    setUploadedFiles([]);
    if (premiumFileInputRef.current) {
      premiumFileInputRef.current.value = "";
    }
  };

  const handleGenerateQuestions = async () => {
    if (uploadedFiles.length === 0) {
      setError("Por favor carga al menos un archivo para generar preguntas");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGenerationProgress("Iniciando generación...");

    // Create abort controller for cancellation
    generationAbortController.current = new AbortController();

    try {
      // Check if user wants to use Assistants API for PDFs
      const hasPdfFiles = uploadedFiles.some(
        (file) =>
          file.type === "application/pdf" ||
          file.name.toLowerCase().endsWith(".pdf")
      );

      // Set progress message based on API preference
      const progressMessage =
        apiPreference === "responses" && hasPdfFiles
          ? "Subiendo archivos PDF a OpenAI (Responses API)..."
          : apiPreference === "assistants" && hasPdfFiles
          ? "Subiendo archivos PDF a OpenAI (Assistants API)..."
          : "Procesando archivos...";

      setGenerationProgress(progressMessage);

      let generatedQuestions;
      if (
        (apiPreference === "responses" || apiPreference === "assistants") &&
        hasPdfFiles
      ) {
        // Use advanced API for PDFs
        const apiMethodMessage =
          apiPreference === "responses"
            ? "Usando Responses API para procesar PDFs..."
            : "Usando Assistants API para procesar PDFs...";

        setGenerationProgress(apiMethodMessage);

        generatedQuestions = await generateQuestionsWithSmartDetection(
          uploadedFiles,
          customApiKey || undefined,
          questionType,
          { evaluatorPersonality, difficultyLevel },
          apiPreference // Pass the API preference
        );
      } else {
        // Use traditional method
        setGenerationProgress("Generando preguntas con IA...");
        generatedQuestions = await generateQuestionsWithSmartDetection(
          uploadedFiles,
          customApiKey || undefined,
          questionType,
          { evaluatorPersonality, difficultyLevel },
          "traditional" // Use traditional method
        );
      }

      setGenerationProgress("Finalizando...");

      // Update state with generated questions
      setQuestions(generatedQuestions);
      setCurrentIdx(0);
      setSelected({});
      setShowResult(false);
      setIsCustomQuiz(true);
      const fileName =
        questionType === "development"
          ? `🧠 Preguntas de desarrollo IA (${uploadedFiles.length} archivo${
              uploadedFiles.length > 1 ? "s" : ""
            }) - ${new Date().toLocaleDateString()}`
          : `📝 Preguntas opción múltiple IA (${uploadedFiles.length} archivo${
              uploadedFiles.length > 1 ? "s" : ""
            }) - ${new Date().toLocaleDateString()}`;
      setLoadedFileName(fileName);

      // Reset history flag since this is a new AI-generated quiz
      await resetHistoryFlag();

      // CRITICAL: Save immediately to Firebase storage
      const { customQuizKey, customFileNameKey } = getLocalStorageKeys();

      storage.setItem(customQuizKey, JSON.stringify(generatedQuestions));
      storage.setItem(customFileNameKey, fileName);

      // Verification logging
      console.log(`💾 Preguntas ${questionType} guardadas INMEDIATAMENTE:`, {
        type: questionType,
        count: generatedQuestions.length,
        key: customQuizKey,
        filename: fileName,
      });

      // Double-check the save worked
      const verification = storage.getItem(customQuizKey);
      if (verification) {
        console.log(
          `✅ Verificación exitosa: ${
            JSON.parse(verification).length
          } preguntas en Firebase storage`
        );
      } else {
        console.error(
          `❌ FALLO CRÍTICO: No se pudieron guardar las preguntas ${questionType}`
        );
      }

      // Close modal and clear files
      setShowPremiumModal(false);
      setUploadedFiles([]);
      if (premiumFileInputRef.current) {
        premiumFileInputRef.current.value = "";
      }
    } catch (err) {
      console.error("Error generating questions:", err);

      // Check if it was cancelled
      if (err.name === "AbortError") {
        setError("Generación cancelada por el usuario");
      } else if (
        err.message.includes("🚫 No se puede generar el cuestionario")
      ) {
        setError(err.message);
      } else {
        // For other API errors, show standard message
        setError(`Error al generar preguntas: ${err.message}`);
      }
    } finally {
      setIsGenerating(false);
      setGenerationProgress("");
      generationAbortController.current = null;
    }
  };

  const handleCancelGeneration = () => {
    if (generationAbortController.current) {
      generationAbortController.current.abort();
      console.log("🛑 Generación cancelada por el usuario");
    }
  };

  const togglePremiumSection = () => {
    setShowPremiumSection(!showPremiumSection);
  };

  const handleDevelopmentAnswerChange = (questionId, answer) => {
    setDevelopmentAnswers((prev) => ({
      ...prev,
      [questionId]: answer,
    }));
  };

  const handleQuestionTypeChange = async (type) => {
    // Check if user is trying to access development mode without premium
    if (type === "development" && !hasActiveSubscription()) {
      console.log(
        "Acceso denegado: Modo desarrollo requiere suscripción premium"
      );
      return; // Don't allow the change
    }

    if (type === "development") {
      console.log(
        "Modo preguntas a desarrollar activado. Carga de JSON deshabilitada."
      );
    }

    setQuestionType(type);
    // Save question type preference
    storage.setItem("questionType", type);
    // Clear UI state when switching types
    setSelected({});
    setDevelopmentAnswers({});
    setShowResult(false);
    setCurrentIdx(0);
    setAnswerStats({ correct: 0, incorrect: 0, skipped: 0 }); // Reset stats
    setShowFinalResults(false); // Reset final results display

    // Simply READ questions for the new type from Firebase storage
    const { customQuizKey, customFileNameKey } = getLocalStorageKeys(type);
    const savedCustomQuiz = storage.getItem(customQuizKey);
    const savedFileName = storage.getItem(customFileNameKey);

    if (savedCustomQuiz && savedFileName) {
      try {
        const jsonData = JSON.parse(savedCustomQuiz);
        // Validate structure before loading
        const isValidStructure = jsonData.every(
          (q) =>
            q.question &&
            Array.isArray(q.options) &&
            Array.isArray(q.correct) &&
            q.id !== undefined
        );

        if (isValidStructure) {
          // Load saved custom questions for this type
          console.log(
            `📚 Cargando preguntas ${type} guardadas (${jsonData.length} preguntas)`
          );
          const shuffled = jsonData.sort(() => 0.5 - Math.random());
          setQuestions(shuffled);
          setIsCustomQuiz(true);
          setLoadedFileName(savedFileName);
          return; // Exit here - questions found and loaded
        } else {
          console.warn(`⚠️ Datos corruptos para ${type}, limpiando...`);
          storage.removeItem(customQuizKey);
          storage.removeItem(customFileNameKey);
        }
      } catch (err) {
        console.error(`❌ Error parseando preguntas ${type}:`, err);
        storage.removeItem(customQuizKey);
        storage.removeItem(customFileNameKey);
      }
    }

    // No saved questions for this type - try to load from history
    console.log(
      `📖 No hay preguntas guardadas para ${type}, buscando en historial...`
    );

    // Try to load the last quiz from history for this type
    const loadedFromHistory = await loadLastQuizFromHistory(type);

    if (!loadedFromHistory) {
      // If no history found either, show question type selection
      console.log(
        `📖 No hay preguntas en historial para ${type}, mostrando selección de modalidad`
      );
      setShowQuestionTypeSelection(true);
      setLoading(false);
    }
  };

  // New function to handle initial question type selection
  const handleInitialQuestionTypeSelection = (type) => {
    // Check if user is trying to access development mode without premium
    if (type === "development" && !hasActiveSubscription()) {
      console.log(
        "Acceso denegado: Modo desarrollo requiere suscripción premium"
      );
      return; // Don't allow the change
    }

    setSelectionLoading(true);
    setQuestionType(type);
    storage.setItem("questionType", type);

    // Small delay for UX feedback
    setTimeout(() => {
      setShowQuestionTypeSelection(false);
      setSelectionLoading(false);
      setLoading(true);
      // Load questions for the selected type, loading defaults if no saved questions
      loadQuestionsOrDefaults(type);
    }, 800);
  };

  // Function to show question type selection from menu
  const handleChangeQuestionTypeFromMenu = () => {
    setShowQuestionTypeSelection(true);
    setSelectionLoading(false); // Reset loading state
    // Reset current quiz state
    setCurrentIdx(0);
    setSelected({});
    setDevelopmentAnswers({});
    setShowResult(false);
    setAnswerStats({ correct: 0, incorrect: 0, skipped: 0 }); // Reset stats
    setShowFinalResults(false); // Reset final results display
  };

  // Function to load quiz directly from history without page reload
  const handleLoadQuizFromHistory = (entry) => {
    console.log("📚 Cargando cuestionario desde historial:", entry);

    try {
      // Parse and validate quiz data
      const quizData = JSON.parse(entry.quizData);

      // Validate structure
      const isValidStructure = quizData.every(
        (q) =>
          q.question &&
          Array.isArray(q.options) &&
          Array.isArray(q.correct) &&
          q.id !== undefined
      );

      if (!isValidStructure) {
        throw new Error("Estructura de cuestionario inválida");
      }

      // Set question type
      setQuestionType(entry.type);

      // Reset quiz state
      setCurrentIdx(0);
      setSelected({});
      setDevelopmentAnswers({});
      setShowResult(false);
      setAnswerStats({ correct: 0, incorrect: 0, skipped: 0 });
      setShowFinalResults(false);
      setShowQuestionTypeSelection(false);

      // Load questions directly
      const shuffled = quizData.sort(() => 0.5 - Math.random());
      setQuestions(shuffled);
      setIsCustomQuiz(true);
      setLoadedFileName(entry.fileName);
      setLoading(false);

      console.log("✅ Cuestionario cargado desde historial exitosamente");
    } catch (error) {
      console.error("❌ Error cargando cuestionario desde historial:", error);
      setError(`Error al cargar el cuestionario: ${error.message}`);
    }
  };

  const InfoModal = () => {
    const [activeTab, setActiveTab] = useState("general");

    if (!showInfoModal) return null;

    return (
      <div className="modal-overlay" onClick={() => setShowInfoModal(false)}>
        <div
          className="modal-content documentation-modal"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-header">
            <h3 className="modal-title">📚 Documentación - Preguntitas</h3>
            <button
              className="modal-close"
              onClick={() => setShowInfoModal(false)}
            >
              ✕
            </button>
          </div>

          <div className="modal-tabs">
            <button
              className={`tab-button ${
                activeTab === "general" ? "active" : ""
              }`}
              onClick={() => setActiveTab("general")}
            >
              🏠 General
            </button>
            <button
              className={`tab-button ${activeTab === "basic" ? "active" : ""}`}
              onClick={() => setActiveTab("basic")}
            >
              📝 Básico
            </button>
            <button
              className={`tab-button ${
                activeTab === "premium" ? "active" : ""
              }`}
              onClick={() => setActiveTab("premium")}
            >
              ✨ Premium
            </button>
            <button
              className={`tab-button ${activeTab === "json" ? "active" : ""}`}
              onClick={() => setActiveTab("json")}
            >
              📄 JSON
            </button>
          </div>

          <div className="modal-body documentation-body">
            {activeTab === "general" && (
              <div className="doc-section">
                <h4>🧠 ¿Qué es Preguntitas?</h4>
                <p>
                  Preguntitas es una aplicación de cuestionarios inteligente que
                  te permite:
                </p>
                <ul>
                  <li>🎯 Realizar cuestionarios de opción múltiple</li>
                  <li>✍️ Responder preguntas de desarrollo (Premium)</li>
                  <li>📁 Cargar tus propios cuestionarios en formato JSON</li>
                  <li>
                    🤖 Generar preguntas automáticamente desde documentos usando
                    IA
                  </li>
                  <li>
                    📊 Obtener evaluaciones detalladas con inteligencia
                    artificial
                  </li>
                </ul>

                <h4>🚀 Primeros pasos</h4>
                <ol>
                  <li>
                    <strong>Regístrate:</strong> Crea tu cuenta gratuita
                  </li>
                  <li>
                    <strong>Elige el modo:</strong> Opción múltiple (gratis) o
                    Desarrollo (premium)
                  </li>
                  <li>
                    <strong>Comienza:</strong> Usa las preguntas predeterminadas
                    o carga las tuyas
                  </li>
                  <li>
                    <strong>Evalúa:</strong> Recibe retroalimentación
                    instantánea
                  </li>
                </ol>

                <h4>🔐 Cuenta y Suscripciones</h4>
                <p>
                  <strong>Cuenta gratuita:</strong> Acceso completo a
                  cuestionarios de opción múltiple
                </p>
                <p>
                  <strong>Premium:</strong> Incluye preguntas de desarrollo,
                  generación con IA, y evaluación inteligente
                </p>
              </div>
            )}

            {activeTab === "basic" && (
              <div className="doc-section">
                <h4>📝 Modo Opción Múltiple (Gratis)</h4>

                <div className="feature-explanation">
                  <h5>🎯 Características:</h5>
                  <ul>
                    <li>Preguntas con múltiples opciones de respuesta</li>
                    <li>Validación automática e instantánea</li>
                    <li>Soporte para respuestas únicas y múltiples</li>
                    <li>Carga de cuestionarios personalizados (JSON)</li>
                  </ul>
                </div>

                <div className="feature-explanation">
                  <h5>🎮 Cómo usar:</h5>
                  <ol>
                    <li>
                      <strong>Selecciona "📝 Opción múltiple"</strong> en el
                      selector de tipo
                    </li>
                    <li>
                      <strong>Elige una opción:</strong>
                      <ul>
                        <li>Usar preguntas predeterminadas</li>
                        <li>Cargar tu archivo JSON personalizado</li>
                      </ul>
                    </li>
                    <li>
                      <strong>Responde:</strong> Selecciona la(s) opción(es)
                      correcta(s)
                    </li>
                    <li>
                      <strong>Envía:</strong> Haz clic en "Enviar" para ver el
                      resultado
                    </li>
                    <li>
                      <strong>Continúa:</strong> Pasa a la siguiente pregunta
                    </li>
                  </ol>
                </div>

                <div className="tip-box">
                  <strong>💡 Tip:</strong> Las preguntas con múltiples
                  respuestas correctas aparecen con casillas de verificación
                  (☑️), las de respuesta única con botones de radio (◉).
                </div>
              </div>
            )}

            {activeTab === "premium" && (
              <div className="doc-section">
                <h4>✨ Funciones Premium</h4>

                <div className="feature-explanation">
                  <h5>✍️ Preguntas de Desarrollo:</h5>
                  <ul>
                    <li>Preguntas abiertas para respuestas detalladas</li>
                    <li>Evaluación inteligente con IA</li>
                    <li>Feedback personalizado y constructivo</li>
                    <li>Análisis de calidad de respuesta</li>
                    <li>Sugerencias de mejora específicas</li>
                  </ul>
                </div>

                <div className="feature-explanation">
                  <h5>🤖 Generación de Preguntas con IA:</h5>
                  <ul>
                    <li>
                      Carga múltiples documentos (PDF, DOC, TXT, imágenes, etc.)
                    </li>
                    <li>Generación automática de preguntas relevantes</li>
                    <li>Configuración de personalidad del evaluador</li>
                    <li>Niveles de dificultad ajustables</li>
                    <li>Soporte para PDFs complejos con Assistants API</li>
                  </ul>
                </div>

                <div className="feature-explanation">
                  <h5>🎭 Personalidades de Evaluador:</h5>
                  <ul>
                    <li>
                      <strong>Normal:</strong> Evaluación equilibrada y
                      constructiva
                    </li>
                    <li>
                      <strong>Motivador:</strong> Enfoque positivo y alentador
                    </li>
                    <li>
                      <strong>Estricto:</strong> Evaluación rigurosa y detallada
                    </li>
                    <li>
                      <strong>Hater:</strong> Críticas variadas y creativas
                      (¡cada evaluación es única!)
                    </li>
                  </ul>
                </div>

                <div className="warning-box">
                  <strong>⚠️ Nota:</strong> Las funciones premium requieren
                  suscripción activa. En modo desarrollo, la carga de JSON está
                  deshabilitada.
                </div>
              </div>
            )}

            {activeTab === "json" && (
              <div className="doc-section">
                <h4>📄 Formato de Archivo JSON</h4>
                <p className="modal-description">
                  Para cargar tus propias preguntas, el archivo JSON debe seguir
                  esta estructura:
                </p>

                <pre className="modal-code-example">
                  {`[
  {
    "id": 1,
    "question": "¿Cuál es la capital de España?",
    "options": ["Madrid", "Barcelona", "Valencia", "Sevilla"],
    "correct": ["Madrid"],
    "source": "Geografía básica"
  },
  {
    "id": 2,
    "question": "¿Cuáles son lenguajes de programación?",
    "options": ["JavaScript", "Python", "HTML", "CSS"],
    "correct": ["JavaScript", "Python"],
    "source": "Programación"
  }
]`}
                </pre>

                <div className="json-fields">
                  <h5>📋 Campos obligatorios:</h5>
                  <ul>
                    <li>
                      <strong>id:</strong> Identificador único (número)
                    </li>
                    <li>
                      <strong>question:</strong> Texto de la pregunta
                    </li>
                    <li>
                      <strong>options:</strong> Array con las opciones de
                      respuesta
                    </li>
                    <li>
                      <strong>correct:</strong> Array con las respuestas
                      correctas
                    </li>
                  </ul>

                  <h5>📝 Campos opcionales:</h5>
                  <ul>
                    <li>
                      <strong>source:</strong> Fuente o referencia de la
                      pregunta
                    </li>
                  </ul>
                </div>

                <div className="modal-download">
                  <a
                    href="/ejemplo_preguntas.json"
                    download="ejemplo_preguntas.json"
                    className="modal-download-link"
                  >
                    📥 Descargar archivo de ejemplo
                  </a>
                </div>

                <div className="tip-box">
                  <strong>💡 Consejos:</strong>
                  <ul>
                    <li>
                      Para respuesta única: usa un solo elemento en "correct"
                    </li>
                    <li>
                      Para respuestas múltiples: incluye varios elementos en
                      "correct"
                    </li>
                    <li>Asegúrate de que el JSON sea válido antes de cargar</li>
                    <li>El archivo se guarda automáticamente en tu sesión</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const PremiumModal = () => {
    if (!showPremiumModal) return null;

    return (
      <div className="modal-overlay" onClick={() => setShowPremiumModal(false)}>
        <div
          id="generar-preguntas"
          className="modal-content premium-modal"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-header">
            <div className="premium-modal-title">
              <span className="premium-badge">PREMIUM</span>
              <h3 className="modal-title">🤖 Generador de Preguntas con IA</h3>
            </div>
            <button
              className="modal-close"
              onClick={() => setShowPremiumModal(false)}
            >
              ✕
            </button>
          </div>
          <div className="modal-body">
            <p className="premium-description">
              ✨ Carga tus documentos y genera preguntas personalizadas usando
              inteligencia artificial
            </p>

            {/* Configuración de Personalidad del Evaluador */}
            {questionType === "development" && (
              <div className="ai-config-section">
                <h4 className="config-section-title">
                  🎭 Personalidad del Evaluador
                </h4>
                <select
                  value={evaluatorPersonality}
                  onChange={(e) => setEvaluatorPersonality(e.target.value)}
                  className="personality-selector"
                >
                  {Object.entries(AI_CONFIG.evaluatorPersonalities).map(
                    ([key, personality]) => (
                      <option key={key} value={key}>
                        {personality.name} - {personality.description}
                      </option>
                    )
                  )}
                </select>
              </div>
            )}

            {/* Configuración de Dificultad */}
            {questionType === "development" && (
              <div className="ai-config-section">
                <h4 className="config-section-title">📊 Nivel de Exigencia</h4>
                <select
                  value={difficultyLevel}
                  onChange={(e) => setDifficultyLevel(e.target.value)}
                  className="difficulty-selector"
                >
                  {Object.entries(AI_CONFIG.difficultyLevels).map(
                    ([key, level]) => (
                      <option key={key} value={key}>
                        {level.name} - {level.description}
                      </option>
                    )
                  )}
                </select>
              </div>
            )}

            {/* Warning especial para modo hater */}
            {evaluatorPersonality === "hater" && (
              <div className="hater-warning">
                <div className="warning-content">
                  <span className="warning-icon">⚠️</span>
                  <div className="warning-text">
                    <strong>MODO HATER ACTIVADO</strong>
                    <p>
                      Este evaluador será extremadamente crítico con respuestas
                      variadas y creativas. Cada evaluación tendrá un estilo
                      único: desde furioso hasta sarcástico. Solo la excelencia
                      absoluta lo satisface. ¿Estás listo?
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* DEV Section for manual API key */}
            <div className="dev-section">
              <div
                className="dev-header"
                onClick={() => setShowApiKeyField(!showApiKeyField)}
              >
                <span className="dev-label">🔧 Configuración Avanzada</span>
                <span className="toggle-icon">
                  {showApiKeyField ? "▼" : "▶"}
                </span>
              </div>
              {showApiKeyField && (
                <div className="api-key-field">
                  <label className="api-key-label">
                    OpenAI API Key (opcional):
                  </label>
                  <input
                    type="password"
                    value={customApiKey}
                    onChange={(e) => setCustomApiKey(e.target.value)}
                    placeholder="sk-proj-..."
                    className="api-key-input"
                  />
                  <p className="api-key-hint">
                    💡 Si no tienes una, se usará la configurada por defecto
                  </p>

                  {/* API Processing Method Selection */}
                  <div className="pdf-method-config">
                    <label className="pdf-method-label">
                      🔧 Método de procesamiento de archivos:
                    </label>
                    <div className="pdf-method-options">
                      <label className="radio-option">
                        <input
                          type="radio"
                          name="apiMethod"
                          checked={apiPreference === "responses"}
                          onChange={() => setApiPreference("responses")}
                        />
                        <span className="radio-label">
                          🚀 Responses API (Nuevo - Recomendado)
                        </span>
                      </label>
                      <label className="radio-option">
                        <input
                          type="radio"
                          name="apiMethod"
                          checked={apiPreference === "assistants"}
                          onChange={() => setApiPreference("assistants")}
                        />
                        <span className="radio-label">
                          🤖 Assistants API (Legacy - Será depreciada)
                        </span>
                      </label>
                      <label className="radio-option">
                        <input
                          type="radio"
                          name="apiMethod"
                          checked={apiPreference === "traditional"}
                          onChange={() => setApiPreference("traditional")}
                        />
                        <span className="radio-label">
                          ⚡ Método tradicional (Más rápido)
                        </span>
                      </label>
                    </div>
                    <div className="pdf-method-info">
                      {apiPreference === "responses" ? (
                        <div className="method-description responses">
                          <strong>🚀 Enfoque Responses API (Híbrido):</strong>
                          <ul>
                            <li>
                              ✅ Intenta usar tecnología más moderna de OpenAI
                            </li>
                            <li>✅ Fallback automático a método tradicional</li>
                            <li>✅ Mejor compatibilidad y confiabilidad</li>
                            <li>
                              ✅ Futuro-proof (preparado para nuevas APIs)
                            </li>
                            <li>
                              ⚠️ Límite: 512MB por archivo (cuando sube
                              archivos)
                            </li>
                            <li>💰 Costo variable según método usado</li>
                          </ul>
                        </div>
                      ) : apiPreference === "assistants" ? (
                        <div className="method-description assistants">
                          <strong>🤖 Assistants API:</strong>
                          <ul>
                            <li>✅ Calidad probada de extracción</li>
                            <li>✅ Soporte nativo para PDFs complejos</li>
                            <li>✅ Maneja PDFs escaneados mejor</li>
                            <li>⚠️ Será depreciada en 2026</li>
                            <li>⚠️ Límite: 512MB por archivo</li>
                            <li>💰 Costo adicional por procesamiento</li>
                          </ul>
                        </div>
                      ) : (
                        <div className="method-description traditional">
                          <strong>⚡ Método tradicional:</strong>
                          <ul>
                            <li>⚡ Procesamiento local más rápido</li>
                            <li>💰 Solo costo de generación de preguntas</li>
                            <li>⚠️ Calidad variable según PDF</li>
                            <li>❌ Limitado con PDFs escaneados</li>
                            <li>❌ No usa búsqueda avanzada en archivos</li>
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="file-upload-zone">
              <input
                ref={premiumFileInputRef}
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.xlsx,.pptx"
                onChange={handlePremiumFileUpload}
                className="file-input"
                id="premium-file-upload-modal"
              />
              <label
                htmlFor="premium-file-upload-modal"
                className="upload-zone"
              >
                <div className="upload-icon">📎</div>
                <div className="upload-text">
                  <span className="upload-title">
                    Arrastra archivos aquí o haz clic
                  </span>
                  <span className="upload-subtitle">
                    PDF, DOC, TXT, imágenes, Excel, PowerPoint
                  </span>
                </div>
              </label>
            </div>

            {uploadedFiles.length > 0 && (
              <div className="uploaded-files">
                <div className="files-header">
                  <span className="files-count">
                    📁 {uploadedFiles.length} archivo(s) cargado(s)
                  </span>
                  <button onClick={clearAllFiles} className="clear-files-btn">
                    🗑️
                  </button>
                </div>
                <div className="files-list">
                  {uploadedFiles.map((file, index) => (
                    <div key={index} className="file-item">
                      <span className="file-name">{file.name}</span>
                      <span className="file-size">
                        {(file.size / 1024).toFixed(1)}KB
                      </span>
                      <button
                        onClick={() => removeFile(index)}
                        className="remove-file-btn"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isGenerating && generationProgress && (
              <div className="generation-progress">
                <div className="progress-text">{generationProgress}</div>
                <div className="progress-bar">
                  <div className="progress-fill"></div>
                </div>
              </div>
            )}

            <div className="generation-actions">
              <button
                onClick={handleGenerateQuestions}
                disabled={uploadedFiles.length === 0 || isGenerating}
                className="generate-questions-btn"
              >
                {isGenerating ? (
                  <>
                    <span className="spinner">⟳</span>
                    Generando preguntas...
                  </>
                ) : (
                  <>🧠 Generar Preguntitas con IA</>
                )}
              </button>

              {isGenerating && (
                <button
                  onClick={handleCancelGeneration}
                  className="cancel-generation-btn"
                  disabled={!generationAbortController.current}
                >
                  🛑 Cancelar
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Stats Counter Component
  const StatsCounter = () => {
    const total =
      answerStats.correct + answerStats.incorrect + answerStats.skipped;

    return (
      <div className="stats-counter">
        <div className="stats-item correct">
          <span className="stats-icon">✅</span>
          <span className="stats-number">{answerStats.correct}</span>
          <span className="stats-label">Correctas</span>
        </div>
        <div className="stats-item incorrect">
          <span className="stats-icon">❌</span>
          <span className="stats-number">{answerStats.incorrect}</span>
          <span className="stats-label">Erróneas</span>
        </div>
        <div className="stats-item skipped">
          <span className="stats-icon">⏭️</span>
          <span className="stats-number">{answerStats.skipped}</span>
          <span className="stats-label">Omitidas</span>
        </div>
      </div>
    );
  };

  // Final Results Component
  const FinalResults = () => {
    const total = questions.length;
    const answered = answerStats.correct + answerStats.incorrect;
    const correctPercentage =
      total > 0 ? Math.round((answerStats.correct / total) * 100) : 0;

    return (
      <div className="final-results">
        <div className="final-results-header">
          <h3 className="final-title">🎉 ¡Cuestionario Completado!</h3>
          <div className="final-score">
            <span className="score-percentage">{correctPercentage}%</span>
            <span className="score-label">de precisión</span>
          </div>
        </div>

        <div className="final-stats-grid">
          <div className="final-stat-card correct">
            <div className="stat-icon">✅</div>
            <div className="stat-content">
              <div className="stat-number">{answerStats.correct}</div>
              <div className="stat-label">Correctas</div>
            </div>
          </div>

          <div className="final-stat-card incorrect">
            <div className="stat-icon">❌</div>
            <div className="stat-content">
              <div className="stat-number">{answerStats.incorrect}</div>
              <div className="stat-label">Erróneas</div>
            </div>
          </div>

          <div className="final-stat-card skipped">
            <div className="stat-icon">⏭️</div>
            <div className="stat-content">
              <div className="stat-number">{answerStats.skipped}</div>
              <div className="stat-label">Omitidas</div>
            </div>
          </div>

          <div className="final-stat-card total">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <div className="stat-number">{total}</div>
              <div className="stat-label">Total</div>
            </div>
          </div>
        </div>

        <div className="final-actions">
          <Button onClick={resetToDefault} className="restart-button">
            🔄 Nuevo cuestionario
          </Button>
        </div>
      </div>
    );
  };

  // Question Type Selection Component
  const QuestionTypeSelection = () => {
    return (
      <div className="question-type-selection">
        <div className="selection-header">
          <h3 className="selection-title">Elige tu modalidad de quiz</h3>
          <p className="selection-subtitle">
            Selecciona el tipo de preguntas que prefieres responder
          </p>
        </div>

        {selectionLoading ? (
          <div className="selection-loading">
            <div className="loading-spinner"></div>
            <h3>Preparando tu modalidad...</h3>
            <p>Configurando el quiz para ti</p>
          </div>
        ) : (
          <>
            <div className="type-options">
              <div
                className="type-option choice-option"
                onClick={() => handleInitialQuestionTypeSelection("choice")}
              >
                <div className="option-icon">📝</div>
                <div className="option-content">
                  <h3 className="option-title">Opción Múltiple</h3>
                  <p className="option-description">
                    Responde preguntas seleccionando la opción correcta.
                    Validación instantánea y seguimiento de progreso.
                  </p>
                  <div className="option-features">
                    <span className="feature">✅ Respuestas rápidas</span>
                    <span className="feature">✅ Validación automática</span>
                    <span className="feature">✅ Carga archivos JSON</span>
                  </div>
                  <div className="option-badge free">GRATIS</div>
                </div>
                {/* <div className="option-arrow">→</div> */}
              </div>

              <div
                className={`type-option development-option ${
                  !hasActiveSubscription() ? "disabled" : ""
                }`}
                onClick={() =>
                  handleInitialQuestionTypeSelection("development")
                }
              >
                <div className="option-icon">✍️</div>
                <div className="option-content">
                  <h3 className="option-title">Preguntas a Desarrollar</h3>
                  <p className="option-description">
                    Responde preguntas abiertas con evaluación inteligente por
                    IA. Feedback detallado y sugerencias de mejora.
                  </p>
                  <div className="option-features">
                    <span className="feature">🤖 Evaluación con IA</span>
                    <span className="feature">📊 Análisis detallado</span>
                    <span className="feature">💡 Sugerencias de mejora</span>
                  </div>
                  <div className="option-badge premium">PREMIUM</div>
                </div>
                {/* <div className="option-arrow">→</div> */}
                {!hasActiveSubscription() && (
                  <div className="premium-overlay">
                    <div className="premium-lock">🔒</div>
                    <div className="upgrade-text">
                      <button
                        className="upgrade-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowPricingSection(true);
                        }}
                      >
                        Obtener Premium
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="selection-footer">
              <p className="footer-text">
                💡 Puedes cambiar de modalidad en cualquier momento desde el
                menú superior
              </p>
            </div>
          </>
        )}
      </div>
    );
  };

  const current = questions[currentIdx];

  const isMultiple = current?.correct?.length > 1;

  function toggleOption(opt) {
    if (isMultiple) {
      setSelected((prev) => {
        const cur = prev[current.id] || [];
        if (cur.includes(opt)) {
          return { ...prev, [current.id]: cur.filter((o) => o !== opt) };
        }
        return { ...prev, [current.id]: [...cur, opt] };
      });
    } else {
      setSelected((prev) => ({ ...prev, [current.id]: [opt] }));
    }
  }

  function evaluate() {
    if (!current) return false;
    const sel = selected[current.id] || [];
    const correctSet = new Set(current.correct);
    if (sel.length !== correctSet.size) return false;
    return sel.every((s) => correctSet.has(s));
  }

  function handleSubmit() {
    if (questionType === "development") {
      // For development questions, evaluate with AI
      handleDevelopmentEvaluation();
    } else {
      // For choice questions, show result immediately and update stats
      const isCorrect = evaluate();
      setAnswerStats((prev) => ({
        ...prev,
        correct: isCorrect ? prev.correct + 1 : prev.correct,
        incorrect: isCorrect ? prev.incorrect : prev.incorrect + 1,
      }));
      setShowResult(true);
    }
  }

  async function handleDevelopmentEvaluation() {
    if (!current) return;

    const userAnswer = developmentAnswers[current.id] || "";
    if (userAnswer.trim() === "") {
      setError("Por favor escribe una respuesta antes de enviar");
      return;
    }

    setIsEvaluating(true);
    setError(null);

    // Debug logging para confirmar configuraciones antes de enviar
    console.log("📤 Enviando configuraciones a evaluateAnswerWithAI:", {
      evaluatorPersonality,
      difficultyLevel,
      questionId: current.id,
    });

    try {
      // Evaluate the user's answer with AI
      const evaluation = await evaluateAnswerWithAI(
        current,
        userAnswer,
        questions,
        customApiKey || undefined,
        { evaluatorPersonality, difficultyLevel }
      );

      // Debug logging para verificar la evaluación recibida
      console.log("🔍 Evaluación recibida de la IA:", {
        isCorrect: evaluation.isCorrect,
        score: evaluation.score,
        questionId: current.id,
        evaluationObject: evaluation,
      });

      // Store the evaluation result
      setDevelopmentAnswers((prev) => ({
        ...prev,
        [`${current.id}_evaluation`]: evaluation,
      }));

      // Update stats for development questions
      console.log("📊 Actualizando estadísticas:", {
        evaluationIsCorrect: evaluation.isCorrect,
        willIncrementCorrect: evaluation.isCorrect,
        willIncrementIncorrect: !evaluation.isCorrect,
      });

      setAnswerStats((prev) => {
        const newStats = {
          ...prev,
          correct: evaluation.isCorrect ? prev.correct + 1 : prev.correct,
          incorrect: evaluation.isCorrect ? prev.incorrect : prev.incorrect + 1,
        };
        console.log("📈 Estadísticas actualizadas:", {
          antes: prev,
          despues: newStats,
        });
        return newStats;
      });

      setShowResult(true);
    } catch (err) {
      console.error("Error evaluating answer:", err);
      setError(`Error al evaluar la respuesta: ${err.message}`);
    } finally {
      setIsEvaluating(false);
    }
  }

  function handleNext() {
    setShowResult(false);
    setCurrentIdx((idx) => idx + 1);
  }

  function handleSkip() {
    // Skip current question without answering and update stats
    setAnswerStats((prev) => ({
      ...prev,
      skipped: prev.skipped + 1,
    }));

    if (currentIdx < questions.length - 1) {
      setCurrentIdx((idx) => idx + 1);
      setShowResult(false);
      // Clear any selected answers for current question
      setSelected((prev) => {
        const newSelected = { ...prev };
        delete newSelected[current.id];
        return newSelected;
      });
      // Clear development answer for current question
      if (questionType === "development") {
        setDevelopmentAnswers((prev) => {
          const newAnswers = { ...prev };
          delete newAnswers[current.id];
          return newAnswers;
        });
      }
    }
  }

  // Function to show final results
  const handleShowFinalResults = () => {
    setShowFinalResults(true);
  };

  // Show loading while checking auth or Firebase storage
  if (authLoading) return <p className="loading">Cargando…</p>;
  if (user && !storageReady)
    return <p className="loading">Sincronizando datos con Firebase…</p>;

  // Show question type selection screen for new users
  if (user && showQuestionTypeSelection) {
    return (
      <div className="quiz-container">
        <div className="quiz-header">
          <div className="quiz-header-top">
            <UserMenu
              user={user}
              subscription={subscription}
              showQuestionTypeSelection={showQuestionTypeSelection}
              hasActiveSubscription={hasActiveSubscription}
              getDaysRemaining={getDaysRemaining}
              isExpiringSoon={isExpiringSoon}
              logout={logout}
              setShowInfoModal={setShowInfoModal}
              onOpenInfoModal={() => setShowInfoModal(true)}
              onOpenSubscriptionDashboard={() =>
                setShowSubscriptionDashboard(true)
              }
              onOpenPremiumModal={() => setShowPremiumModal(true)}
              onOpenPricingSection={() => setShowPricingSection(true)}
              onChangeQuestionType={handleChangeQuestionTypeFromMenu}
              onLoadQuizFromHistory={handleLoadQuizFromHistory}
            />
            <h3 className="quiz-master-title">Preguntitas</h3>
          </div>
        </div>
        <QuestionTypeSelection />

        {/* Pricing Section Modal */}
        {showPricingSection && (
          <div
            className="modal-overlay pricing-modal-overlay"
            onClick={() => setShowPricingSection(false)}
          >
            <div
              className="modal-content pricing-modal-content"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="modal-close pricing-modal-close"
                onClick={() => setShowPricingSection(false)}
              >
                ✕
              </button>
              <PricingSection
                userEmail={user?.email}
                onClose={() => setShowPricingSection(false)}
              />
            </div>
          </div>
        )}

        {/* Subscription Dashboard Modal */}
        {showSubscriptionDashboard && (
          <div
            className="modal-overlay subscription-modal-overlay"
            onClick={() => setShowSubscriptionDashboard(false)}
          >
            <div
              className="modal-content subscription-modal-content"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="modal-close subscription-modal-close"
                onClick={() => setShowSubscriptionDashboard(false)}
              >
                ✕
              </button>
              <SubscriptionDashboard />
            </div>
          </div>
        )}
      </div>
    );
  }

  // Show auth modal if not authenticated
  if (!user) {
    return (
      <div className="auth-container">
        <div className="auth-top-header">
          <div className="auth-header-logo">
            <span className="logo-icon">🧠</span>
            <span className="logo-text">Preguntitas</span>
          </div>
          <div className="auth-header-actions">
            <button
              className="auth-landing-btn primary"
              onClick={() => setShowAuthModal(true)}
            >
              <span className="btn-icon">🎭</span>
              <span className="btn-text">Iniciar sesión</span>
            </button>
          </div>
        </div>
        <div className="auth-landing">
          <div className="auth-background">
            <div className="floating-shapes">
              <div className="shape shape-1"></div>
              <div className="shape shape-2"></div>
              <div className="shape shape-3"></div>
              <div className="shape shape-4"></div>
            </div>
          </div>

          <div className="auth-landing-content">
            <div className="auth-hero">
              <div className="auth-logo">
                <div className="logo-icon">🧠</div>
              </div>
              <h1 className="auth-landing-title">Preguntitas</h1>
              <p className="auth-landing-subtitle">Quiz inteligente</p>
              <p className="auth-landing-description">
                Pon a prueba tus conocimientos con cuestionarios personalizados
                y generados por inteligencia artificial
              </p>
            </div>

            <div className="auth-features-grid">
              <div className="feature-card">
                <div className="feature-icon-wrapper">
                  <span className="feature-icon">📝</span>
                </div>
                <h3 className="feature-title">Opción múltiple</h3>
                <p className="feature-description">
                  Preguntas interactivas con validación instantánea
                </p>
              </div>

              <div className="feature-card">
                <div className="feature-icon-wrapper">
                  <span className="feature-icon">🤖</span>
                </div>
                <h3 className="feature-title">Generación IA</h3>
                <p className="feature-description">
                  Crea cuestionarios desde tus documentos automáticamente
                </p>
              </div>

              <div className="feature-card">
                <div className="feature-icon-wrapper">
                  <span className="feature-icon">📊</span>
                </div>
                <h3 className="feature-title">Análisis detallado</h3>
                <p className="feature-description">
                  Seguimiento de progreso y estadísticas personales
                </p>
              </div>
            </div>

            <div className="auth-actions">
              <button
                className="auth-landing-btn primary"
                onClick={() => setShowAuthModal(true)}
              >
                <span className="btn-icon">🚀</span>
                <span className="btn-text">Comenzar ahora</span>
                <div className="btn-shine"></div>
              </button>

              <div className="auth-info">
                <span className="info-text">
                  Gratis • Sin límites • Datos seguros
                </span>
              </div>
            </div>
          </div>
        </div>
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
        />
      </div>
    );
  }

  if (loading)
    return (
      <div className="loading-container">
        <h3 className="sr-only">
          Quiz con Inteligencia Artificial - Preguntitas IA
        </h3>
        <p className="loading">Cargando preguntas…</p>
      </div>
    );

  if (error) {
    return (
      <div className="quiz-container">
        <h3 className="sr-only">
          Quiz con Inteligencia Artificial - Preguntitas IA
        </h3>
        <Card className="quiz-card">
          <CardContent className="quiz-content">
            <div className="error-container">
              <p className="error-text">{error}</p>
              <Button onClick={resetToDefault} className="retry-button">
                Cargar preguntas por defecto
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!current) {
    return (
      <div className="quiz-container">
        <h3 className="sr-only">
          Quiz con Inteligencia Artificial - Preguntitas IA
        </h3>
        <Card className="quiz-card">
          <CardContent className="quiz-content">
            <div className="file-upload-container">
              <h2 className="upload-title">
                Cargar Cuestionario Personalizado
              </h2>
              <p className="upload-description">
                Selecciona un archivo JSON con tus preguntas personalizadas o
                usa las preguntas por defecto.
              </p>

              <div className="upload-buttons">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="file-input"
                  id="json-upload"
                />
                <label htmlFor="json-upload" className="file-upload-button">
                  📁 Cargar JSON personalizado
                </label>

                <Button onClick={resetToDefault} className="default-button">
                  Usar preguntas por defecto
                </Button>
              </div>

              <div className="format-info">
                <h3 className="format-title">Formato esperado del JSON:</h3>
                <pre className="format-example">
                  {`[
  {
    "id": 1,
    "question": "¿Cuál es la respuesta?",
    "options": ["Opción A", "Opción B", "Opción C"],
    "correct": ["Opción A"],
    "source": "Fuente opcional"
  }
]`}
                </pre>
                <div className="example-download">
                  <a
                    href="/preguntitas.json"
                    download="preguntitas.json"
                    className="download-example-link"
                  >
                    📥 Descargar archivo de ejemplo
                  </a>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const correct = evaluate();

  return (
    <div className="quiz-container">
      {/* SEO Hidden Main Title */}
      <h3 className="sr-only">
        Quiz con Inteligencia Artificial - Preguntitas IA
      </h3>

      <InfoModal />
      <PremiumModal />

      {/* Header with quiz info and controls */}
      <header className="quiz-header">
        {/* SEO Internal Navigation */}
        <nav className="sr-only" aria-label="Navegación principal">
          <ul>
            <li>
              <a href="#inicio">Inicio</a>
            </li>
            <li>
              <a href="#quiz-activo">Quiz Activo</a>
            </li>
            <li>
              <a href="#generar-preguntas">Generar Preguntas</a>
            </li>
            <li>
              <a href="#configuracion">Configuración</a>
            </li>
          </ul>
        </nav>

        <div className="quiz-header-top">
          <UserMenu
            user={user}
            subscription={subscription}
            showQuestionTypeSelection={showQuestionTypeSelection}
            hasActiveSubscription={hasActiveSubscription}
            getDaysRemaining={getDaysRemaining}
            isExpiringSoon={isExpiringSoon}
            logout={logout}
            setShowInfoModal={setShowInfoModal}
            onOpenInfoModal={() => setShowInfoModal(true)}
            onOpenSubscriptionDashboard={() =>
              setShowSubscriptionDashboard(true)
            }
            onOpenPremiumModal={() => setShowPremiumModal(true)}
            onOpenPricingSection={() => setShowPricingSection(true)}
            onChangeQuestionType={handleChangeQuestionTypeFromMenu}
            onLoadQuizFromHistory={handleLoadQuizFromHistory}
          />
          <h2 className="quiz-master-title">
            <a href="#inicio" className="logo-link">
              Preguntitas
            </a>
          </h2>
          <div className="quiz-controls">
            {/* <button
              className={`control-button info-button ${
                questionType === "development" ? "disabled" : ""
              }`}
              onClick={() => setShowInfoModal(true)}
              title={
                questionType === "development"
                  ? "Información no disponible para preguntas a desarrollar"
                  : "Información sobre formato JSON"
              }
              disabled={questionType === "development"}
            >
              ℹ️
            </button> */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="file-input"
              id="json-upload-header"
              disabled={questionType === "development"}
            />
            <label
              htmlFor="json-upload-header"
              className={`control-button upload-button ${
                questionType === "development" ? "disabled" : ""
              }`}
              title={
                questionType === "development"
                  ? "Carga de JSON deshabilitada en modo preguntas a desarrollar"
                  : "Cargar archivo JSON"
              }
            >
              <span className="upload-emoji">📁</span>
              <span className="upload-text">Subir tus preguntas</span>
            </label>
          </div>
        </div>
        <div className="quiz-info-footer">
          <span className="loaded-file">
            {questionType === "development"
              ? "🧠 DESARROLLO"
              : "📝 OPCIÓN MÚLTIPLE"}
            {" • "}
            📄 {loadedFileName}
          </span>
          <StatsCounter />
          <div className="question-type-selector">
            <button
              className="change-mode-button"
              onClick={handleChangeQuestionTypeFromMenu}
              title="Cambiar modalidad de pregunta"
            >
              🔄 Cambiar modalidad
            </button>
          </div>
        </div>
      </header>

      <main id="inicio">
        <section id="quiz-activo">
          <Card className="quiz-card">
            <CardContent className="quiz-content">
              {!showFinalResults && (
                <div className="question-header">
                  <h3 className="question-title">
                    {currentIdx + 1}. {current.question}
                    {questionType === "development" && (
                      <span className="premium-indicator">
                        <span className="premium-badge-small">PREMIUM</span>
                      </span>
                    )}
                  </h3>
                  <span className="question-counter-badge">
                    {currentIdx + 1}/{questions.length}
                  </span>
                </div>
              )}

              {questionType === "choice" && !showFinalResults && (
                // Choice questions (existing functionality)
                <>
                  {isMultiple ? (
                    <div className="options-container">
                      {current.options.map((opt) => (
                        <label key={opt} className="option-label">
                          <Checkbox
                            checked={(selected[current.id] || []).includes(opt)}
                            onCheckedChange={
                              showResult ? undefined : () => toggleOption(opt)
                            }
                            disabled={showResult}
                          />
                          <span>{opt}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <RadioGroup
                      value={(selected[current.id] || [])[0] || ""}
                      onValueChange={
                        showResult ? undefined : (val) => toggleOption(val)
                      }
                      className="options-container"
                      disabled={showResult}
                    >
                      {current.options.map((opt) => (
                        <label key={opt} className="option-label">
                          <RadioGroupItem
                            value={opt}
                            name={`question-${current.id}`}
                            disabled={showResult}
                          />
                          <span>{opt}</span>
                        </label>
                      ))}
                    </RadioGroup>
                  )}
                </>
              )}
              {questionType === "development" && !showFinalResults && (
                // Development questions
                <div className="development-container">
                  {/* <div className="premium-notice">
                <span className="premium-icon">✨</span>
                <span>
                  Esta es una pregunta premium para desarrollar tu respuesta
                </span>
              </div> */}
                  <textarea
                    className="development-textarea"
                    placeholder="Escribe tu respuesta aquí..."
                    value={developmentAnswers[current.id] || ""}
                    onChange={
                      showResult
                        ? undefined
                        : (e) =>
                            handleDevelopmentAnswerChange(
                              current.id,
                              e.target.value
                            )
                    }
                    disabled={showResult}
                    readOnly={showResult}
                    rows={6}
                  />
                  <div className="development-help">
                    <span className="help-text">
                      💡 Desarrolla tu respuesta con detalle y ejemplos
                    </span>
                  </div>
                </div>
              )}

              {!showResult && (
                <div className="quiz-actions">
                  <Button
                    onClick={handleSubmit}
                    disabled={isEvaluating}
                    className={isEvaluating ? "loading-button" : ""}
                  >
                    {isEvaluating && questionType === "development" ? (
                      <>
                        <span className="spinner">⟳</span>
                        Evaluando con IA...
                      </>
                    ) : (
                      "Enviar"
                    )}
                  </Button>

                  {currentIdx < questions.length - 1 && (
                    <Button
                      onClick={handleSkip}
                      disabled={isEvaluating}
                      className="skip-button"
                      variant="outline"
                    >
                      ⏭️ Saltar pregunta
                    </Button>
                  )}

                  {isEvaluating && questionType === "development" && (
                    <div className="evaluation-progress">
                      <div className="progress-indicator">
                        <span className="progress-spinner">🤖</span>
                        <span className="progress-text">
                          La IA está analizando tu respuesta...
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {showResult && (
                <div className="result-container">
                  {questionType === "choice" && !showFinalResults && (
                    <>
                      <p
                        className={cn(
                          "result-text",
                          correct ? "correct" : "incorrect"
                        )}
                      >
                        {correct ? "¡Correcto!" : "Respuesta incorrecta."}
                      </p>
                      <div className="correct-answers">
                        <span className="correct-label">
                          Respuesta(s) correcta(s):
                        </span>
                        <div className="correct-options">
                          {current.correct.map((c) => (
                            <span key={c} className="correct-option">
                              {c}
                            </span>
                          ))}
                        </div>
                        {current.source && (
                          <div className="source-info">
                            <span className="source-label">Fuente:</span>
                            <span className="source-text">
                              {current.source}
                            </span>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                  {questionType === "development" && !showFinalResults && (
                    <div className="development-result">
                      <div className="ai-evaluation">
                        {developmentAnswers[`${current.id}_evaluation`] ? (
                          <>
                            <div className="evaluation-header">
                              <h3 className="evaluation-title">
                                🤖 Evaluación con IA
                              </h3>
                              <span
                                className={`evaluation-score ${
                                  developmentAnswers[`${current.id}_evaluation`]
                                    .isCorrect
                                    ? "correct"
                                    : developmentAnswers[
                                        `${current.id}_evaluation`
                                      ].score.includes("Parcialmente")
                                    ? "partial"
                                    : "incorrect"
                                }`}
                              >
                                {
                                  developmentAnswers[`${current.id}_evaluation`]
                                    .score
                                }
                              </span>
                            </div>

                            <div className="evaluation-content">
                              <div className="evaluation-section">
                                <h4>📝 Tu respuesta:</h4>
                                <div className="user-answer-box">
                                  {developmentAnswers[current.id] ||
                                    "No respondiste"}
                                </div>
                              </div>

                              <div className="evaluation-section">
                                <h4>🔍 Análisis:</h4>
                                <div className="analysis-text">
                                  {
                                    developmentAnswers[
                                      `${current.id}_evaluation`
                                    ].analysis
                                  }
                                </div>
                              </div>

                              <div className="evaluation-section">
                                <h4>💭 Feedback:</h4>
                                <div className="feedback-text">
                                  {
                                    developmentAnswers[
                                      `${current.id}_evaluation`
                                    ].feedback
                                  }
                                </div>
                              </div>

                              {developmentAnswers[`${current.id}_evaluation`]
                                .improvements && (
                                <div className="evaluation-section">
                                  <h4>💡 Sugerencias de mejora:</h4>
                                  <div className="improvements-text">
                                    {
                                      developmentAnswers[
                                        `${current.id}_evaluation`
                                      ].improvements
                                    }
                                  </div>
                                </div>
                              )}

                              <div className="evaluation-section">
                                <h4>✅ Respuesta ejemplar:</h4>
                                <div className="correct-answer-text">
                                  {
                                    developmentAnswers[
                                      `${current.id}_evaluation`
                                    ].correctAnswer
                                  }
                                </div>
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="evaluation-loading">
                            <p className="result-text development-submitted">
                              ✅ Respuesta enviada
                            </p>
                            <p>🤖 Evaluando respuesta con IA...</p>
                          </div>
                        )}
                      </div>

                      {current.source && (
                        <div className="source-info">
                          <span className="source-label">Fuente:</span>
                          <span className="source-text">{current.source}</span>
                        </div>
                      )}
                    </div>
                  )}
                  {currentIdx < questions.length - 1 ? (
                    <Button onClick={handleNext}>Siguiente pregunta</Button>
                  ) : showFinalResults ? (
                    <FinalResults />
                  ) : (
                    <div className="quiz-completed">
                      <p className="completion-message">
                        ¡Has completado el cuestionario!
                      </p>
                      <Button
                        onClick={handleShowFinalResults}
                        className="view-results-button"
                      >
                        📊 Ver resultado final
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        <section id="configuracion">
          {/* Pricing Section Modal */}
          {showPricingSection && (
            <div
              className="modal-overlay pricing-modal-overlay"
              onClick={() => setShowPricingSection(false)}
            >
              <div
                className="modal-content pricing-modal-content"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  className="modal-close pricing-modal-close"
                  onClick={() => setShowPricingSection(false)}
                >
                  ✕
                </button>
                <PricingSection
                  userEmail={user?.email}
                  onClose={() => setShowPricingSection(false)}
                />
              </div>
            </div>
          )}

          {/* Subscription Dashboard Modal */}
          {showSubscriptionDashboard && (
            <div
              className="modal-overlay subscription-modal-overlay"
              onClick={() => setShowSubscriptionDashboard(false)}
            >
              <div
                className="modal-content subscription-modal-content"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  className="modal-close subscription-modal-close"
                  onClick={() => setShowSubscriptionDashboard(false)}
                >
                  ✕
                </button>
                <SubscriptionDashboard />
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
