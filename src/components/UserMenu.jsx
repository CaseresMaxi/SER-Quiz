import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import QuizHistoryModal from "./QuizHistoryModal";
import "./UserMenu.css";
import { useQuizHistory } from "../hooks/useQuizHistory";

const UserMenuDropdown = ({
  isOpen,
  onClose,
  user,
  subscription,
  hasActiveSubscription,
  getDaysRemaining,
  isExpiringSoon,
  showQuestionTypeSelection,
  logout,
  onOpenSubscriptionDashboard,
  onOpenPremiumModal,
  onOpenPricingSection,
  setShowInfoModal,
  triggerRef,
  onChangeQuestionType,
  onOpenQuizHistory,
}) => {
  const [position, setPosition] = useState({ top: 0, left: 0, right: "auto" });

  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const updatePosition = () => {
        const rect = triggerRef.current.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const isMobile = viewportWidth <= 768;
        const isVerySmall = viewportWidth <= 480;

        // Calculate dropdown width based on viewport
        let dropdownWidth;
        if (isVerySmall) {
          dropdownWidth = Math.min(200, viewportWidth - 16);
        } else if (isMobile) {
          dropdownWidth = Math.min(240, viewportWidth - 24);
        } else {
          dropdownWidth = Math.min(280, viewportWidth - 32);
        }

        let left = rect.left;
        let right = "auto";

        // Always check if dropdown would overflow regardless of screen size
        const rightEdgePosition = rect.left + dropdownWidth;
        const leftEdgePosition = rect.right - dropdownWidth;

        if (rightEdgePosition > viewportWidth - 16) {
          // Position from the right edge of the trigger
          right = Math.max(8, viewportWidth - rect.right);
          left = "auto";
        } else if (leftEdgePosition < 16) {
          // Position from the left edge of the trigger, but not too close to screen edge
          left = Math.max(8, rect.left);
          right = "auto";
        }

        // Ensure the dropdown doesn't go below the viewport
        let top = rect.bottom + 8;
        if (top + 300 > viewportHeight) {
          // Approximate dropdown height
          top = Math.max(8, rect.top - 308); // Position above the trigger
        }

        setPosition({
          top: top,
          left: left === "auto" ? "auto" : left,
          right: right === "auto" ? "auto" : right,
        });
      };

      updatePosition();
      window.addEventListener("resize", updatePosition);
      window.addEventListener("scroll", updatePosition);

      return () => {
        window.removeEventListener("resize", updatePosition);
        window.removeEventListener("scroll", updatePosition);
      };
    }
  }, [isOpen, triggerRef]);

  const getSubscriptionLabel = () => {
    if (!hasActiveSubscription()) return "Gratuito";

    if (isExpiringSoon()) {
      return `${subscription?.planName?.replace(
        "Plan ",
        ""
      )} (${getDaysRemaining()}d)`;
    }

    return subscription?.planName?.replace("Plan ", "") || "Premium";
  };

  const getSubscriptionColor = () => {
    if (!hasActiveSubscription()) return "free";
    if (isExpiringSoon()) return "expiring";
    return "active";
  };

  const getUserInitials = () => {
    if (!user?.email) return "👤";
    const email = user.email;
    const name = email.split("@")[0];
    return name.slice(0, 2).toUpperCase();
  };

  if (!isOpen) return null;

  return createPortal(
    <>
      {/* Backdrop overlay */}
      <div
        className="user-menu-backdrop"
        onClick={onClose}
        onTouchStart={onClose}
      />

      {/* Dropdown menu */}
      <div
        className="user-menu-dropdown"
        style={{
          position: "fixed",
          top: `${position.top}px`,
          left: position.left === "auto" ? "auto" : `${position.left}px`,
          right: position.right === "auto" ? "auto" : `${position.right}px`,
          zIndex: 999999,
        }}
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        <div className="menu-header">
          <div className="user-avatar-large">{getUserInitials()}</div>
          <div className="user-details">
            <h3 className="user-email">{user?.email}</h3>
            <span className={`plan-status ${getSubscriptionColor()}`}>
              {getSubscriptionLabel()}
            </span>
          </div>
        </div>

        <div className="menu-divider"></div>

        <div className="menu-items">
          <button
            disabled={showQuestionTypeSelection}
            className="menu-item"
            onClick={() => {
              if (hasActiveSubscription()) {
                onOpenPremiumModal();
              } else {
                onOpenPricingSection();
              }
              onClose();
            }}
          >
            <span className="menu-icon">🧠</span>
            <div className="menu-text">
              <span className="menu-label">Generar con IA</span>
              <span className="menu-description">
                {hasActiveSubscription()
                  ? "Crear preguntas inteligentes"
                  : "Requiere plan Premium"}
              </span>
            </div>
            <span className="menu-arrow">›</span>
          </button>

          {hasActiveSubscription() ? (
            <button
              className="menu-item"
              onClick={() => {
                onOpenSubscriptionDashboard();
                onClose();
              }}
            >
              <span className="menu-icon">👑</span>
              <div className="menu-text">
                <span className="menu-label">Mi Suscripción</span>
                <span className="menu-description">Gestionar plan y pagos</span>
              </div>
              <span className="menu-arrow">›</span>
            </button>
          ) : (
            <button
              className="menu-item"
              onClick={() => {
                onOpenPricingSection();
                onClose();
              }}
            >
              <span className="menu-icon">💰</span>
              <div className="menu-text">
                <span className="menu-label">Planes Premium</span>
                <span className="menu-description">
                  Ver precios y beneficios
                </span>
              </div>
              <span className="menu-arrow">›</span>
            </button>
          )}

          {/* <button
            className="menu-item"
            onClick={() => {
              onClose();
            }}
          >
            <span className="menu-icon">⚙️</span>
            <div className="menu-text">
              <span className="menu-label">Configuración</span>
              <span className="menu-description">Preferencias y ajustes</span>
            </div>
            <span className="menu-arrow">›</span>
          </button> */}

          <button
            className="menu-item"
            onClick={() => {
              onOpenQuizHistory();
              onClose();
            }}
          >
            <span className="menu-icon">📚</span>
            <div className="menu-text">
              <span className="menu-label">Historial de Cuestionarios</span>
              <span className="menu-description">
                Ver cuestionarios anteriores
              </span>
            </div>
            <span className="menu-arrow">›</span>
          </button>

          <button
            className="menu-item"
            onClick={() => {
              setShowInfoModal(true);
              onClose();
            }}
          >
            <span className="menu-icon">❓</span>
            <div className="menu-text">
              <span className="menu-label">Ayuda</span>
              <span className="menu-description">Soporte y documentación</span>
            </div>
            <span className="menu-arrow">›</span>
          </button>

          <button
            className="menu-item"
            onClick={() => {
              onChangeQuestionType();
              onClose();
            }}
          >
            <span className="menu-icon">🔄</span>
            <div className="menu-text">
              <span className="menu-label">Cambiar modalidad</span>
              <span className="menu-description">
                Opción múltiple o desarrollo
              </span>
            </div>
            <span className="menu-arrow">›</span>
          </button>
        </div>

        <div className="menu-divider"></div>

        <div className="menu-items">
          <button
            className="menu-item logout-item"
            onClick={() => {
              logout();
              onClose();
            }}
          >
            <span className="menu-icon">🚪</span>
            <div className="menu-text">
              <span className="menu-label">Cerrar Sesión</span>
              <span className="menu-description">Salir de tu cuenta</span>
            </div>
          </button>
        </div>
      </div>
    </>,
    document.body
  );
};

const UserMenu = ({
  user,
  subscription,
  showQuestionTypeSelection,
  hasActiveSubscription,
  getDaysRemaining,
  isExpiringSoon,
  setShowInfoModal,
  logout,
  onOpenSubscriptionDashboard,
  onOpenPremiumModal,
  onOpenPricingSection,
  onChangeQuestionType,
  onLoadQuizFromHistory,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showQuizHistory, setShowQuizHistory] = useState(false);
  const triggerRef = useRef(null);

  const [historyEntries, setHistoryEntries] = useState([]);
  const { getQuizHistory } = useQuizHistory();

  const loadHistory = async () => {
    try {
      const entries = await getQuizHistory("all", 50);
      setHistoryEntries(entries);
    } catch (error) {
      console.error("Error loading quiz history:", error);
    }
  };

  useEffect(() => {
    if (historyEntries.length <= 0) {
      loadHistory();
    }
  }, [historyEntries, isOpen]);

  // Close menu when clicking outside or pressing escape
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    const handleFocusChange = (event) => {
      // Close menu if focus moves outside the dropdown and trigger
      if (
        isOpen &&
        !triggerRef.current?.contains(event.target) &&
        !event.target.closest(".user-menu-dropdown")
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.addEventListener("focusin", handleFocusChange);

      return () => {
        document.removeEventListener("keydown", handleKeyDown);
        document.removeEventListener("focusin", handleFocusChange);
      };
    }
  }, [isOpen]);

  const getSubscriptionLabel = () => {
    if (!hasActiveSubscription()) return "Gratuito";

    if (isExpiringSoon()) {
      return `${subscription?.planName?.replace(
        "Plan ",
        ""
      )} (${getDaysRemaining()}d)`;
    }

    return subscription?.planName?.replace("Plan ", "") || "Premium";
  };

  const getSubscriptionColor = () => {
    if (!hasActiveSubscription()) return "free";
    if (isExpiringSoon()) return "expiring";
    return "active";
  };

  const getUserInitials = () => {
    if (!user?.email) return "👤";
    const email = user.email;
    const name = email.split("@")[0];
    return name.slice(0, 2).toUpperCase();
  };

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleOpenQuizHistory = () => {
    setShowQuizHistory(true);
  };

  const handleCloseQuizHistory = () => {
    setShowQuizHistory(false);
  };

  return (
    <>
      <div className="user-menu-container">
        <button
          ref={triggerRef}
          className={`user-menu-trigger ${isOpen ? "active" : ""}`}
          onClick={handleToggle}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleToggle();
            }
          }}
          aria-label="Menú de usuario"
          aria-expanded={isOpen}
          aria-haspopup="menu"
        >
          <div className="user-avatar">{getUserInitials()}</div>
          <div className="user-info">
            <span className="user-name">
              {user?.email?.split("@")[0] || "Usuario"}
            </span>
            <span className={`subscription-badge ${getSubscriptionColor()}`}>
              {getSubscriptionLabel()}
              {isExpiringSoon() && " ⚠️"}
            </span>
          </div>
          <div className={`dropdown-arrow ${isOpen ? "rotated" : ""}`}>▼</div>
        </button>
      </div>

      <UserMenuDropdown
        isOpen={isOpen}
        onClose={handleClose}
        historyEntries={historyEntries}
        user={user}
        showQuestionTypeSelection={showQuestionTypeSelection}
        setShowInfoModal={setShowInfoModal}
        subscription={subscription}
        hasActiveSubscription={hasActiveSubscription}
        getDaysRemaining={getDaysRemaining}
        isExpiringSoon={isExpiringSoon}
        logout={logout}
        onOpenSubscriptionDashboard={onOpenSubscriptionDashboard}
        onOpenPremiumModal={onOpenPremiumModal}
        onOpenPricingSection={onOpenPricingSection}
        triggerRef={triggerRef}
        onChangeQuestionType={onChangeQuestionType}
        onOpenQuizHistory={handleOpenQuizHistory}
      />

      <QuizHistoryModal
        isOpen={showQuizHistory}
        onClose={handleCloseQuizHistory}
        onQuizSelect={(quiz) => {
          console.log("Quiz selected from history:", quiz);
          // Close the quiz history modal
          setShowQuizHistory(false);
          // Load the quiz directly using the function from App.jsx
          if (onLoadQuizFromHistory) {
            onLoadQuizFromHistory(quiz);
          }
        }}
      />
    </>
  );
};

export default UserMenu;
