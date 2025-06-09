import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import "./UserMenu.css";

const UserMenuDropdown = ({
  isOpen,
  onClose,
  user,
  subscription,
  hasActiveSubscription,
  getDaysRemaining,
  isExpiringSoon,
  logout,
  onOpenSubscriptionDashboard,
  onOpenPremiumModal,
  onOpenPricingSection,
  triggerRef,
}) => {
  const [position, setPosition] = useState({ top: 0, left: 0, right: "auto" });

  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const updatePosition = () => {
        const rect = triggerRef.current.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const dropdownWidth = 320; // Min width from CSS

        let left = rect.left;
        let right = "auto";

        // Check if dropdown would overflow on the right
        if (left + dropdownWidth > viewportWidth - 20) {
          right = viewportWidth - rect.right;
          left = "auto";
        }

        setPosition({
          top: rect.bottom + 8,
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
            className="menu-item"
            onClick={() => {
              onOpenPremiumModal();
              onClose();
            }}
          >
            <span className="menu-icon">🧠</span>
            <div className="menu-text">
              <span className="menu-label">Generar con IA</span>
              <span className="menu-description">
                Crear preguntas inteligentes
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
  hasActiveSubscription,
  getDaysRemaining,
  isExpiringSoon,
  logout,
  onOpenSubscriptionDashboard,
  onOpenPremiumModal,
  onOpenPricingSection,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef(null);

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
        user={user}
        subscription={subscription}
        hasActiveSubscription={hasActiveSubscription}
        getDaysRemaining={getDaysRemaining}
        isExpiringSoon={isExpiringSoon}
        logout={logout}
        onOpenSubscriptionDashboard={onOpenSubscriptionDashboard}
        onOpenPremiumModal={onOpenPremiumModal}
        onOpenPricingSection={onOpenPricingSection}
        triggerRef={triggerRef}
      />
    </>
  );
};

export default UserMenu;
