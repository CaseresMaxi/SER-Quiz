import { useEffect, useState, useRef } from "react";
import { Card, CardContent } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Checkbox } from "./components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "./components/ui/radio-group";
import { cn } from "./lib/utils";
import { generateQuestionsFromFiles } from "./config/openai";
import "./App.css";

export default function App() {
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
  const fileInputRef = useRef(null);
  const premiumFileInputRef = useRef(null);

  useEffect(() => {
    loadDefaultQuestions();
  }, []);

  const loadDefaultQuestions = () => {
    setLoading(true);
    setError(null);
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
    setShowResult(false);
    setError(null);
    setShowInfoModal(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
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
      // Generar preguntas usando OpenAI
      const generatedQuestions = await generateQuestionsFromFiles(
        uploadedFiles
      );

      // Actualizar estado con las preguntas generadas
      setQuestions(generatedQuestions);
      setCurrentIdx(0);
      setSelected({});
      setShowResult(false);
      setIsCustomQuiz(true);
      setLoadedFileName(
        `Preguntas generadas por IA (${uploadedFiles.length} archivo${
          uploadedFiles.length > 1 ? "s" : ""
        })`
      );

      // Cerrar modal y limpiar archivos
      setShowPremiumModal(false);
      setUploadedFiles([]);
      if (premiumFileInputRef.current) {
        premiumFileInputRef.current.value = "";
      }
    } catch (err) {
      console.error("Error generating questions:", err);
      setError(`Error al generar preguntas: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const togglePremiumSection = () => {
    setShowPremiumSection(!showPremiumSection);
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
    setShowResult(true);
  }

  function handleNext() {
    setShowResult(false);
    setCurrentIdx((idx) => idx + 1);
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
          <button
            className="premium-btn"
            onClick={() => setShowPremiumModal(true)}
            title="Generar preguntas con IA"
          >
            <span className="premium-icon">🧠</span>
            <span className="premium-text">AI</span>
          </button>
          <h1 className="quiz-master-title">Preguntitas</h1>
          <div className="quiz-controls">
            <button
              className="control-button info-button"
              onClick={() => setShowInfoModal(true)}
              title="Información sobre formato JSON"
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
            />
            <label
              htmlFor="json-upload-header"
              className="control-button upload-button"
              title="Cargar archivo JSON"
            >
              📁
            </label>
            {isCustomQuiz && (
              <button
                onClick={resetToDefault}
                className="control-button reset-button"
                title="Volver a preguntas por defecto"
              >
                🔄
              </button>
            )}
          </div>
        </div>
        <div className="quiz-info-footer">
          <span className="loaded-file">📄 {loadedFileName}</span>
          <span className="question-counter">
            Pregunta {currentIdx + 1} de {questions.length}
          </span>
        </div>
      </div>

      <Card className="quiz-card">
        <CardContent className="quiz-content">
          <h2 className="question-title">
            {currentIdx + 1}. {current.question}
          </h2>

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
                  <RadioGroupItem value={opt} name={`question-${current.id}`} />
                  <span>{opt}</span>
                </label>
              ))}
            </RadioGroup>
          )}

          {!showResult && <Button onClick={handleSubmit}>Enviar</Button>}

          {showResult && (
            <div className="result-container">
              <p
                className={cn("result-text", correct ? "correct" : "incorrect")}
              >
                {correct ? "¡Correcto!" : "Respuesta incorrecta."}
              </p>
              <div className="correct-answers">
                <span className="correct-label">Respuesta(s) correcta(s):</span>
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
    </div>
  );
}
