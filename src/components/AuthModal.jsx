import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import "./AuthModal.css";

export const AuthModal = ({ isOpen, onClose }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const { login, register, resetPassword, loginWithGoogle } = useAuth();

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    // Si es recuperar contraseña
    if (isForgotPassword) {
      if (!email) {
        setError("Por favor ingresa tu email");
        setLoading(false);
        return;
      }

      const result = await resetPassword(email);
      if (result.success) {
        setSuccess(
          "Se ha enviado un email con las instrucciones para recuperar tu contraseña"
        );
        setEmail("");
      } else {
        setError(result.error);
      }
      setLoading(false);
      return;
    }

    // Validaciones específicas para registro
    if (!isLogin) {
      // Validar que las contraseñas coincidan
      if (password !== confirmPassword) {
        setError("Las contraseñas no coinciden");
        setLoading(false);
        return;
      }

      // Validar que se acepten los términos
      if (!acceptTerms) {
        setError("Debes aceptar los términos y condiciones");
        setLoading(false);
        return;
      }

      // Validar longitud de contraseña
      if (password.length < 6) {
        setError("La contraseña debe tener al menos 6 caracteres");
        setLoading(false);
        return;
      }
    }

    const result = isLogin
      ? await login(email, password)
      : await register(email, password);

    if (result.success) {
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setAcceptTerms(false);
      onClose();
    } else {
      setError(result.error);
    }

    setLoading(false);
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setIsForgotPassword(false);
    setError("");
    setSuccess("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setAcceptTerms(false);
  };

  const toggleForgotPassword = () => {
    setIsForgotPassword(!isForgotPassword);
    setIsLogin(true);
    setError("");
    setSuccess("");
    setPassword("");
    setConfirmPassword("");
    setAcceptTerms(false);
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError("");
    setSuccess("");

    const result = await loginWithGoogle();

    if (result.success) {
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setAcceptTerms(false);
      onClose();
    } else {
      setError(result.error);
    }

    setLoading(false);
  };

  return (
    <div className="auth-modal-overlay" onClick={onClose}>
      <div className="auth-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="auth-modal-header">
          <h2 className="auth-modal-title">
            {isForgotPassword
              ? "🔑 Recuperar Contraseña"
              : isLogin
              ? "🔐 Iniciar Sesión"
              : "📝 Crear Cuenta"}
          </h2>
          <button className="auth-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label className="auth-label">Email:</label>
            <input
              type="email"
              className="auth-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="tu@email.com"
            />
          </div>

          {!isForgotPassword && (
            <div className="auth-field">
              <label className="auth-label">Contraseña:</label>
              <input
                type="password"
                className="auth-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                minLength="6"
              />
            </div>
          )}

          {!isLogin && !isForgotPassword && (
            <div className="auth-field">
              <label className="auth-label">Confirmar contraseña:</label>
              <input
                type="password"
                className={`auth-input ${
                  confirmPassword && password
                    ? password === confirmPassword
                      ? "password-match"
                      : "password-mismatch"
                    : ""
                }`}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="••••••••"
                minLength="6"
              />
              {confirmPassword && password && password !== confirmPassword && (
                <small className="password-hint error">
                  Las contraseñas no coinciden
                </small>
              )}
              {confirmPassword && password && password === confirmPassword && (
                <small className="password-hint success">
                  ✓ Las contraseñas coinciden
                </small>
              )}
            </div>
          )}

          {!isLogin && !isForgotPassword && (
            <div className="auth-field auth-checkbox-field">
              <label className="auth-checkbox-label">
                <input
                  type="checkbox"
                  className="auth-checkbox"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  required
                />
                <span className="auth-checkbox-text">
                  Acepto los{" "}
                  <a
                    href="#"
                    className="auth-terms-link"
                    onClick={(e) => e.preventDefault()}
                  >
                    términos y condiciones
                  </a>{" "}
                  del servicio
                </span>
              </label>
            </div>
          )}

          {isForgotPassword && (
            <div className="auth-info-text">
              Ingresa tu email y te enviaremos las instrucciones para recuperar
              tu contraseña.
            </div>
          )}

          {error && <div className="auth-error">{error}</div>}
          {success && <div className="auth-success">{success}</div>}

          <button type="submit" className="auth-submit-btn" disabled={loading}>
            {loading ? (
              <>
                <span className="spinner">⟳</span>
                {isForgotPassword
                  ? "Enviando email..."
                  : isLogin
                  ? "Iniciando sesión..."
                  : "Creando cuenta..."}
              </>
            ) : isForgotPassword ? (
              "Enviar Instrucciones"
            ) : isLogin ? (
              "Iniciar Sesión"
            ) : (
              "Crear Cuenta"
            )}
          </button>
        </form>

        {!isForgotPassword && (
          <div className="auth-divider">
            <span className="divider-text">o continúa con</span>
          </div>
        )}

        {!isForgotPassword && (
          <div className="auth-social">
            <button
              type="button"
              className="auth-google-btn"
              onClick={handleGoogleLogin}
              disabled={loading}
            >
              <svg
                className="google-icon"
                viewBox="0 0 24 24"
                width="20"
                height="20"
              >
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              {loading ? "Conectando..." : "Continuar con Google"}
            </button>
          </div>
        )}

        {!isForgotPassword && (
          <>
            <div className="auth-forgot-password">
              <button
                type="button"
                className="auth-forgot-btn"
                onClick={toggleForgotPassword}
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            <div className="auth-toggle">
              <span>
                {isLogin ? "¿No tienes cuenta?" : "¿Ya tienes cuenta?"}
              </span>
              <button
                type="button"
                className="auth-toggle-btn"
                onClick={toggleMode}
              >
                {isLogin ? "Crear cuenta" : "Iniciar sesión"}
              </button>
            </div>
          </>
        )}

        {isForgotPassword && (
          <div className="auth-toggle">
            <span>¿Recordaste tu contraseña?</span>
            <button
              type="button"
              className="auth-toggle-btn"
              onClick={toggleForgotPassword}
            >
              Volver al inicio de sesión
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
