import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useQuizHistory } from "../hooks/useQuizHistory";
import { useFirebaseStorage } from "../hooks/useFirebaseStorage";
import "./QuizHistoryModal.css";

const QuizHistoryModal = ({ isOpen, onClose, onQuizSelect }) => {
  const { getQuizHistory, deleteHistoryEntry, isLoading } = useQuizHistory();
  const { storage, markAsFromHistory } = useFirebaseStorage();
  const [historyEntries, setHistoryEntries] = useState([]);
  const [selectedType, setSelectedType] = useState("all");
  const [isDeleting, setIsDeleting] = useState(null);

  // Load quiz history when modal opens
  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen, selectedType]);

  const loadHistory = async () => {
    try {
      const type = selectedType === "all" ? null : selectedType;
      const entries = await getQuizHistory(type, 50);
      setHistoryEntries(entries);
    } catch (error) {
      console.error("Error loading quiz history:", error);
    }
  };

  const handleDeleteEntry = async (historyId, event) => {
    event.stopPropagation();

    if (
      !confirm(
        "¿Estás seguro de que quieres eliminar este cuestionario del historial?"
      )
    ) {
      return;
    }

    setIsDeleting(historyId);
    try {
      await deleteHistoryEntry(historyId);
      // Reload history after deletion
      await loadHistory();
    } catch (error) {
      console.error("Error deleting quiz entry:", error);
      alert("Error al eliminar el cuestionario. Inténtalo de nuevo.");
    } finally {
      setIsDeleting(null);
    }
  };

  const handleSelectQuiz = async (entry) => {
    try {
      // Save the selected quiz to current storage
      // Use skipHistorySave: true to prevent saving current quiz to history when loading from history
      const dataKey =
        entry.type === "choice"
          ? "customQuizData_choice"
          : "customQuizData_development";
      const fileNameKey =
        entry.type === "choice"
          ? "customQuizFileName_choice"
          : "customQuizFileName_development";

      await storage.setItem(dataKey, entry.quizData, { skipHistorySave: true });
      await storage.setItem(fileNameKey, entry.fileName, {
        skipHistorySave: true,
      });
      await storage.setItem("questionType", entry.type, {
        skipHistorySave: true,
      });

      // Mark this quiz as loaded from history
      await markAsFromHistory();

      // Notify parent component to load the quiz directly
      if (onQuizSelect) {
        onQuizSelect(entry);
      } else {
        // Fallback: close modal and reload if no callback provided
        onClose();
        window.location.reload();
      }
    } catch (error) {
      console.error("Error loading quiz:", error);
      alert("Error al cargar el cuestionario. Inténtalo de nuevo.");
    }
  };

  const formatDate = (date) => {
    if (!date) return "Fecha desconocida";

    try {
      const now = new Date();
      const diffTime = now - date;
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        return "Hoy";
      } else if (diffDays === 1) {
        return "Ayer";
      } else if (diffDays < 7) {
        return `Hace ${diffDays} días`;
      } else {
        return date.toLocaleDateString("es-ES", {
          day: "numeric",
          month: "short",
          year:
            date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
        });
      }
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Fecha inválida";
    }
  };

  const getQuestionCount = (quizData) => {
    try {
      const data = JSON.parse(quizData);
      return data.length || 0;
    } catch (error) {
      return 0;
    }
  };

  const getTypeIcon = (type) => {
    return type === "development" ? "🧠" : "📝";
  };

  const getTypeLabel = (type) => {
    return type === "development" ? "Desarrollo" : "Opción múltiple";
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="quiz-history-modal-overlay" onClick={onClose}>
      <div className="quiz-history-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            <span className="modal-icon">📚</span>
            Historial de Cuestionarios
          </h2>
          <button
            className="modal-close"
            onClick={onClose}
            aria-label="Cerrar modal"
          >
            ✕
          </button>
        </div>

        <div className="modal-filters">
          <div className="filter-tabs">
            <button
              className={`filter-tab ${selectedType === "all" ? "active" : ""}`}
              onClick={() => setSelectedType("all")}
            >
              Todos
            </button>
            <button
              className={`filter-tab ${
                selectedType === "choice" ? "active" : ""
              }`}
              onClick={() => setSelectedType("choice")}
            >
              📝 Opción múltiple
            </button>
            <button
              className={`filter-tab ${
                selectedType === "development" ? "active" : ""
              }`}
              onClick={() => setSelectedType("development")}
            >
              🧠 Desarrollo
            </button>
          </div>
        </div>

        <div className="modal-content" style={{ maxWidth: "100%" }}>
          {isLoading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Cargando historial...</p>
            </div>
          ) : historyEntries.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <h3>No hay cuestionarios en el historial</h3>
              <p>
                {selectedType === "all"
                  ? "Cuando subas cuestionarios, aparecerán aquí automáticamente."
                  : `No hay cuestionarios de tipo "${getTypeLabel(
                      selectedType
                    )}" en tu historial.`}
              </p>
            </div>
          ) : (
            <div className="history-list">
              {historyEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="history-item"
                  onClick={() => handleSelectQuiz(entry)}
                >
                  <div className="item-icon">{getTypeIcon(entry.type)}</div>

                  <div className="item-content">
                    <div className="item-header">
                      <h4 className="item-title">
                        {entry.name || entry.fileName}
                      </h4>
                      <div className="item-meta">
                        <span className={`item-type ${entry.type}`}>
                          {getTypeLabel(entry.type)}
                        </span>
                        <span className="item-date">
                          {formatDate(entry.createdAt)}
                        </span>
                      </div>
                    </div>

                    <div className="item-details">
                      <span className="item-filename">📄 {entry.fileName}</span>
                      <span className="item-questions">
                        {getQuestionCount(entry.quizData)} preguntas
                      </span>
                    </div>
                  </div>

                  <div className="item-actions">
                    <button
                      className="action-button load-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectQuiz(entry);
                      }}
                      title="Cargar cuestionario"
                    >
                      📥
                    </button>
                    <button
                      className="action-button delete-button"
                      onClick={(e) => handleDeleteEntry(entry.id, e)}
                      disabled={isDeleting === entry.id}
                      title="Eliminar del historial"
                    >
                      {isDeleting === entry.id ? "⏳" : "🗑️"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <p className="history-info">
            💡 <strong>Tip:</strong> Haz clic en cualquier cuestionario para
            cargarlo. Se guardará automáticamente el cuestionario actual antes
            de cargar el seleccionado.
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default QuizHistoryModal;
