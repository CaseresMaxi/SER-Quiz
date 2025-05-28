import { useEffect, useState } from "react";
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

  useEffect(() => {
    fetch("preguntas_seguridad_v3.json")
      .then((r) => r.json())
      .then((data) => {
        // shuffle and keep first 20 for the session
        const shuffled = data.sort(() => 0.5 - Math.random()).slice(0, 20);
        setQuestions(shuffled);
      });
  }, []);

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

  if (!current) return <p className="loading">Cargando preguntas…</p>;

  const correct = evaluate();

  return (
    <div className="quiz-container">
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
