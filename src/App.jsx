import { useEffect, useState, useRef } from "react";
import { Card, CardContent } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Checkbox } from "./components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "./components/ui/radio-group";
import { cn } from "./lib/utils";
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
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadQuestions();
  }, []);

  const loadQuestions = () => {
    // Check if there's a custom quiz saved in localStorage
    const savedCustomQuiz = localStorage.getItem("customQuizData");
    const savedFileName = localStorage.getItem("customQuizFileName");

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
          // Clear invalid data from localStorage
          localStorage.removeItem("customQuizData");
          localStorage.removeItem("customQuizFileName");
        }
      } catch (err) {
        // Clear corrupted data from localStorage
        localStorage.removeItem("customQuizData");
        localStorage.removeItem("customQuizFileName");
      }
    }

    // Load default questions if no valid custom quiz found
    loadDefaultQuestions();
  };

  const loadDefaultQuestions = () => {
    setLoading(true);
    setError(null);

    // Clear any saved custom quiz data when loading defaults
    localStorage.removeItem("customQuizData");
    localStorage.removeItem("customQuizFileName");

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

        // Save original custom questions to localStorage (not shuffled)
        localStorage.setItem("customQuizData", JSON.stringify(jsonData));
        localStorage.setItem("customQuizFileName", file.name);
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

    // Clear custom quiz data from localStorage
    localStorage.removeItem("customQuizData");
    localStorage.removeItem("customQuizFileName");

    loadDefaultQuestions();
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

      {/* Header with quiz info and controls */}
      <div className="quiz-header">
        <div className="quiz-header-top">
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
