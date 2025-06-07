// ==================================================
// 🌍 Environment Configuration
// ==================================================

// Función para obtener variable de entorno con valor por defecto
const getEnvVar = (key, defaultValue = null) => {
  const value = import.meta.env[key];
  return value !== undefined && value !== "" ? value : defaultValue;
};

// Función para obtener variable booleana
const getBoolEnvVar = (key, defaultValue = false) => {
  const value = getEnvVar(key);
  if (value === null) return defaultValue;
  return value.toLowerCase() === "true";
};

// Función para obtener variable numérica
const getNumEnvVar = (key, defaultValue = 0) => {
  const value = getEnvVar(key);
  if (value === null) return defaultValue;
  const num = parseFloat(value);
  return isNaN(num) ? defaultValue : num;
};

// ==================================================
// 📋 Environment Configuration Object
// ==================================================

export const ENV_CONFIG = {
  // 🔧 App Environment
  APP_ENV: getEnvVar("VITE_APP_ENV", "development"),

  // 🎯 App Info
  APP_NAME: getEnvVar("VITE_APP_NAME", "Preguntitas"),
  APP_VERSION: getEnvVar("VITE_APP_VERSION", "1.0.0"),
  BASE_URL: getEnvVar("VITE_BASE_URL", "http://localhost:3000"),

  // 🔑 API Configuration
  OPENAI_API_KEY: getEnvVar("VITE_OPENAI_API_KEY", ""),

  // 🧠 AI Configuration
  AI_MODEL: getEnvVar("VITE_AI_MODEL", "gpt-4o-mini"),
  AI_TEMPERATURE: getNumEnvVar("VITE_AI_TEMPERATURE", 0.7),
  MAX_QUESTIONS: getNumEnvVar("VITE_MAX_QUESTIONS", 15),

  // 📁 File Configuration
  MAX_FILE_SIZE: getNumEnvVar("VITE_MAX_FILE_SIZE", 10) * 1024 * 1024, // Convert MB to bytes
  MAX_PDF_PAGES: getNumEnvVar("VITE_MAX_PDF_PAGES", 10),

  // 🔍 Debug Configuration
  DEBUG_MODE: getBoolEnvVar("VITE_DEBUG_MODE", true),
  DEBUG_API: getBoolEnvVar("VITE_DEBUG_API", false),

  // 🚀 Production Features
  ENABLE_ANALYTICS: getBoolEnvVar("VITE_ENABLE_ANALYTICS", false),
};

// ==================================================
// 🔍 Helper Functions
// ==================================================

export const isDevelopment = () => ENV_CONFIG.APP_ENV === "development";
export const isProduction = () => ENV_CONFIG.APP_ENV === "production";
export const isTesting = () => ENV_CONFIG.APP_ENV === "testing";

// Debug logger (solo activo en desarrollo o si DEBUG_MODE está activado)
export const debugLog = (...args) => {
  if (ENV_CONFIG.DEBUG_MODE || isDevelopment()) {
    console.log("🐛 [DEBUG]", ...args);
  }
};

// API debug logger
export const apiLog = (...args) => {
  if (ENV_CONFIG.DEBUG_API) {
    console.log("🌐 [API]", ...args);
  }
};

// Error logger
export const errorLog = (...args) => {
  console.error("❌ [ERROR]", ...args);
};

// Función para validar configuración crítica
export const validateEnvironment = () => {
  const errors = [];
  const warnings = [];

  // Validaciones críticas
  if (!ENV_CONFIG.OPENAI_API_KEY) {
    warnings.push("⚠️  API Key de OpenAI no configurada");
  }

  if (!["development", "production", "testing"].includes(ENV_CONFIG.APP_ENV)) {
    errors.push("❌ APP_ENV debe ser 'development', 'production' o 'testing'");
  }

  if (ENV_CONFIG.AI_TEMPERATURE < 0 || ENV_CONFIG.AI_TEMPERATURE > 1) {
    warnings.push("⚠️  AI_TEMPERATURE debe estar entre 0 y 1");
  }

  // Log de validación
  if (errors.length > 0) {
    errorLog("Errores de configuración encontrados:");
    errors.forEach((error) => console.error(error));
  }

  if (warnings.length > 0) {
    console.warn("🟡 Advertencias de configuración:");
    warnings.forEach((warning) => console.warn(warning));
  }

  if (errors.length === 0 && warnings.length === 0) {
    debugLog("✅ Configuración de entorno validada correctamente");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

// Auto-validar al importar (solo en desarrollo)
if (isDevelopment()) {
  validateEnvironment();
}

// ==================================================
// 📊 Configuration Summary (para debugging)
// ==================================================

export const getConfigSummary = () => {
  if (!ENV_CONFIG.DEBUG_MODE) return null;

  return {
    environment: ENV_CONFIG.APP_ENV,
    app: {
      name: ENV_CONFIG.APP_NAME,
      version: ENV_CONFIG.APP_VERSION,
      baseUrl: ENV_CONFIG.BASE_URL,
    },
    ai: {
      model: ENV_CONFIG.AI_MODEL,
      temperature: ENV_CONFIG.AI_TEMPERATURE,
      maxQuestions: ENV_CONFIG.MAX_QUESTIONS,
    },
    files: {
      maxFileSize: `${ENV_CONFIG.MAX_FILE_SIZE / 1024 / 1024}MB`,
      maxPdfPages: ENV_CONFIG.MAX_PDF_PAGES,
    },
    debug: {
      debugMode: ENV_CONFIG.DEBUG_MODE,
      debugApi: ENV_CONFIG.DEBUG_API,
    },
    features: {
      analytics: ENV_CONFIG.ENABLE_ANALYTICS,
    },
  };
};

// Log de configuración en desarrollo
if (isDevelopment()) {
  const summary = getConfigSummary();
  debugLog("🔧 Configuración cargada:", summary);
}
