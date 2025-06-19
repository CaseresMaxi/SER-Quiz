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
  } = useFirebaseStorage();
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
  const [loadedFileName, setLoadedFileName] = useState(
    "preguntas_seguridad_v3.json"
  );
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
  const [usePdfAssistants, setUsePdfAssistants] = useState(true); // Auto-detect by default
  const [showPricingSection, setShowPricingSection] = useState(false);
  const fileInputRef = useRef(null);
  const premiumFileInputRef = useRef(null);

  useEffect(() => {
    // Wait for storage to be ready before loading
    if (!storageReady) return;

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

      loadQuestions(savedQuestionType);
    } else {
      loadQuestions();
    }
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
      loadQuestions("choice");
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

  const loadQuestions = (forceType = null) => {
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

    fetch("preguntas_seguridad_v3.json")
      .then((r) => r.json())
      .then((data) => {
        // shuffle and keep first 20 for the session
        const shuffled = data.sort(() => 0.5 - Math.random()).slice(0, 20);
        setQuestions(shuffled);
        setIsCustomQuiz(false);
        setLoadedFileName("preguntas_seguridad_v3.json");
        setLoading(false);
      })
      .catch((err) => {
        setError("Error al cargar las preguntas por defecto");
        setLoading(false);
      });
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.type !== "application/json") {
      setError("Por favor selecciona un archivo JSON válido");
      return;
    }

    setLoading(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
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

        // Load custom questions
        const shuffled = jsonData.sort(() => 0.5 - Math.random());
        setQuestions(shuffled);
        setIsCustomQuiz(true);
        setLoadedFileName(file.name);
        setLoading(false);

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

    try {
      // Check if user wants to use Assistants API for PDFs
      const hasPdfFiles = uploadedFiles.some(
        (file) =>
          file.type === "application/pdf" ||
          file.name.toLowerCase().endsWith(".pdf")
      );

      let generatedQuestions;
      if (usePdfAssistants && hasPdfFiles) {
        // Use Assistants API for PDFs
        generatedQuestions = await generateQuestionsFromFiles(
          uploadedFiles,
          customApiKey || undefined,
          questionType,
          { evaluatorPersonality, difficultyLevel },
          true // useAssistants = true
        );
      } else {
        // Use traditional method or smart detection
        generatedQuestions = await generateQuestionsWithSmartDetection(
          uploadedFiles,
          customApiKey || undefined,
          questionType,
          { evaluatorPersonality, difficultyLevel }
        );
      }

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

      // Show user-friendly error message (already formatted by validation)
      if (err.message.includes("🚫 No se puede generar el cuestionario")) {
        setError(err.message);
      } else {
        // For other API errors, show standard message
        setError(`Error al generar preguntas: ${err.message}`);
      }
    } finally {
      setIsGenerating(false);
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

  const handleQuestionTypeChange = (type) => {
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

    // No saved questions for this type - load default questions WITHOUT modifying Firebase storage
    console.log(
      `📖 No hay preguntas guardadas para ${type}, cargando por defecto`
    );
    fetch("preguntas_seguridad_v3.json")
      .then((r) => r.json())
      .then((data) => {
        // shuffle and keep first 20 for the session
        const shuffled = data.sort(() => 0.5 - Math.random()).slice(0, 20);
        setQuestions(shuffled);
        setIsCustomQuiz(false);
        setLoadedFileName("preguntas_seguridad_v3.json");
        setLoading(false);
      })
      .catch((err) => {
        setError("Error al cargar las preguntas por defecto");
        setLoading(false);
      });
  };

  const InfoModal = () => {
    if (!showInfoModal) return null;

    return (
      <div className="modal-overlay" onClick={() => setShowInfoModal(false)}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3 className="modal-title">Formato de Archivo JSON</h3>
            <button
              className="modal-close"
              onClick={() => setShowInfoModal(false)}
            >
              ✕
            </button>
          </div>
          <div className="modal-body">
            <p className="modal-description">
              El archivo JSON debe tener la siguiente estructura:
            </p>
            <pre className="modal-code-example">
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
            <div className="modal-download">
              <a
                href="/ejemplo_preguntas.json"
                download="ejemplo_preguntas.json"
                className="modal-download-link"
              >
                📥 Descargar archivo de ejemplo
              </a>
            </div>
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
                      Este evaluador será extremadamente cruel y despiadado.
                      Solo la excelencia absoluta lo satisface. ¿Estás seguro?
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

                  {/* PDF Processing Method Selection */}
                  <div className="pdf-method-config">
                    <label className="pdf-method-label">
                      📄 Método de procesamiento de PDFs:
                    </label>
                    <div className="pdf-method-options">
                      <label className="radio-option">
                        <input
                          type="radio"
                          name="pdfMethod"
                          checked={usePdfAssistants === true}
                          onChange={() => setUsePdfAssistants(true)}
                        />
                        <span className="radio-label">
                          🤖 Assistants API (Recomendado para PDFs)
                        </span>
                      </label>
                      <label className="radio-option">
                        <input
                          type="radio"
                          name="pdfMethod"
                          checked={usePdfAssistants === false}
                          onChange={() => setUsePdfAssistants(false)}
                        />
                        <span className="radio-label">
                          🔧 Método tradicional (Más rápido)
                        </span>
                      </label>
                    </div>
                    <div className="pdf-method-info">
                      {usePdfAssistants ? (
                        <div className="method-description assistants">
                          <strong>🤖 Assistants API:</strong>
                          <ul>
                            <li>✅ Mejor calidad de extracción de texto</li>
                            <li>✅ Soporte nativo para PDFs complejos</li>
                            <li>✅ Maneja PDFs escaneados mejor</li>
                            <li>⚠️ Límite: 512MB por archivo</li>
                            <li>💰 Costo adicional por procesamiento</li>
                          </ul>
                        </div>
                      ) : (
                        <div className="method-description traditional">
                          <strong>🔧 Método tradicional:</strong>
                          <ul>
                            <li>⚡ Procesamiento local más rápido</li>
                            <li>💰 Solo costo de generación de preguntas</li>
                            <li>⚠️ Calidad variable según PDF</li>
                            <li>❌ Limitado con PDFs escaneados</li>
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
          </div>
        </div>
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
      // For choice questions, show result immediately
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

      // Store the evaluation result
      setDevelopmentAnswers((prev) => ({
        ...prev,
        [`${current.id}_evaluation`]: evaluation,
      }));

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

  // Show loading while checking auth or Firebase storage
  if (authLoading) return <p className="loading">Cargando…</p>;
  if (user && !storageReady)
    return <p className="loading">Sincronizando datos con Firebase…</p>;

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
              <span className="btn-text">Identificate</span>
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

  if (loading) return <p className="loading">Cargando preguntas…</p>;

  if (error) {
    return (
      <div className="quiz-container">
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
                    href="/preguntas_seguridad_v3.json"
                    download="preguntas_seguridad_v3.json"
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
      <InfoModal />
      <PremiumModal />

      {/* Header with quiz info and controls */}
      <div className="quiz-header">
        <div className="quiz-header-top">
          <UserMenu
            user={user}
            subscription={subscription}
            hasActiveSubscription={hasActiveSubscription}
            getDaysRemaining={getDaysRemaining}
            isExpiringSoon={isExpiringSoon}
            logout={logout}
            onOpenSubscriptionDashboard={() =>
              setShowSubscriptionDashboard(true)
            }
            onOpenPremiumModal={() => setShowPremiumModal(true)}
            onOpenPricingSection={() => setShowPricingSection(true)}
          />
          <h1 className="quiz-master-title">Preguntitas</h1>
          <div className="quiz-controls">
            <button
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
            </button>
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
              📁
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
          <div className="question-type-selector">
            <select
              value={questionType}
              onChange={(e) => handleQuestionTypeChange(e.target.value)}
              className="type-selector"
              title="Seleccionar tipo de pregunta"
            >
              <option value="choice">📝 Opción múltiple</option>
              <option value="development" disabled={!hasActiveSubscription()}>
                ✍️ A desarrollar (Premium)
              </option>
            </select>
            {/* {questionType === "development" && (
              <span
                className="development-mode-indicator"
                title="Carga de JSON deshabilitada en este modo"
              >
                🚫
              </span>
            )} */}
          </div>
        </div>
      </div>

      <Card className="quiz-card">
        <CardContent className="quiz-content">
          <div className="question-header">
            <h2 className="question-title">
              {currentIdx + 1}. {current.question}
              {questionType === "development" && (
                <span className="premium-indicator">
                  <span className="premium-badge-small">PREMIUM</span>
                </span>
              )}
            </h2>
            <span className="question-counter-badge">
              {currentIdx + 1}/{questions.length}
            </span>
          </div>

          {questionType === "choice" ? (
            // Choice questions (existing functionality)
            <>
              {isMultiple ? (
                <div className="options-container">
                  {current.options.map((opt) => (
                    <label key={opt} className="option-label">
                      <Checkbox
                        checked={(selected[current.id] || []).includes(opt)}
                        onCheckedChange={() => toggleOption(opt)}
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <RadioGroup
                  value={(selected[current.id] || [])[0] || ""}
                  onValueChange={(val) => toggleOption(val)}
                  className="options-container"
                >
                  {current.options.map((opt) => (
                    <label key={opt} className="option-label">
                      <RadioGroupItem
                        value={opt}
                        name={`question-${current.id}`}
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </RadioGroup>
              )}
            </>
          ) : (
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
                onChange={(e) =>
                  handleDevelopmentAnswerChange(current.id, e.target.value)
                }
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
            <>
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
            </>
          )}

          {showResult && (
            <div className="result-container">
              {questionType === "choice" ? (
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
                        <span className="source-text">{current.source}</span>
                      </div>
                    )}
                  </div>
                </>
              ) : (
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
                                developmentAnswers[`${current.id}_evaluation`]
                                  .analysis
                              }
                            </div>
                          </div>

                          <div className="evaluation-section">
                            <h4>💭 Feedback:</h4>
                            <div className="feedback-text">
                              {
                                developmentAnswers[`${current.id}_evaluation`]
                                  .feedback
                              }
                            </div>
                          </div>

                          {developmentAnswers[`${current.id}_evaluation`]
                            .improvements && (
                            <div className="evaluation-section">
                              <h4>💡 Sugerencias de mejora:</h4>
                              <div className="improvements-text">
                                {
                                  developmentAnswers[`${current.id}_evaluation`]
                                    .improvements
                                }
                              </div>
                            </div>
                          )}

                          <div className="evaluation-section">
                            <h4>✅ Respuesta ejemplar:</h4>
                            <div className="correct-answer-text">
                              {
                                developmentAnswers[`${current.id}_evaluation`]
                                  .correctAnswer
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
              ) : (
                <p className="completion-message">
                  ¡Has completado el cuestionario!
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

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
