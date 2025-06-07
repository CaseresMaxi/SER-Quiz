// ==================================================
// 🔍 Environment Validation Utilities
// ==================================================

import {
  ENV_CONFIG,
  validateEnvironment,
  debugLog,
  errorLog,
} from "../config/environment.js";

// Función para mostrar advertencias de configuración al usuario
export const showConfigWarnings = () => {
  const validation = validateEnvironment();

  if (validation.warnings.length > 0) {
    // Mostrar advertencias en la interfaz de usuario si es necesario
    return validation.warnings;
  }

  return [];
};

// Función para verificar si la aplicación está lista para usar
export const isAppReady = () => {
  const validation = validateEnvironment();

  // La aplicación está lista si no hay errores críticos
  const hasApiKey = !!ENV_CONFIG.OPENAI_API_KEY;
  const hasValidEnvironment = validation.isValid;

  return {
    ready: hasApiKey && hasValidEnvironment,
    hasApiKey,
    hasValidEnvironment,
    errors: validation.errors,
    warnings: validation.warnings,
  };
};

// Función para obtener información de estado de la configuración
export const getConfigStatus = () => {
  const appStatus = isAppReady();

  return {
    environment: ENV_CONFIG.APP_ENV,
    apiKeyConfigured: !!ENV_CONFIG.OPENAI_API_KEY,
    model: ENV_CONFIG.AI_MODEL,
    maxQuestions: ENV_CONFIG.MAX_QUESTIONS,
    debugMode: ENV_CONFIG.DEBUG_MODE,
    ready: appStatus.ready,
    issues: [...appStatus.errors, ...appStatus.warnings],
  };
};

// Función para validar API key format (básico)
export const validateApiKeyFormat = (apiKey) => {
  if (!apiKey) return { valid: false, message: "API key requerida" };

  // Validación básica de formato OpenAI
  if (!apiKey.startsWith("sk-")) {
    return { valid: false, message: "API key debe empezar con 'sk-'" };
  }

  if (apiKey.length < 20) {
    return { valid: false, message: "API key parece demasiado corta" };
  }

  return { valid: true, message: "Formato de API key válido" };
};

// Función para generar sugerencias de configuración
export const getConfigSuggestions = () => {
  const suggestions = [];

  // Sugerencias basadas en el entorno
  if (ENV_CONFIG.APP_ENV === "development") {
    if (ENV_CONFIG.AI_MODEL !== "gpt-4o-mini") {
      suggestions.push({
        type: "cost",
        message:
          "Para desarrollo, considera usar gpt-4o-mini para reducir costos",
      });
    }

    if (ENV_CONFIG.MAX_QUESTIONS > 15) {
      suggestions.push({
        type: "performance",
        message:
          "Para desarrollo, considera reducir MAX_QUESTIONS para pruebas más rápidas",
      });
    }
  }

  if (ENV_CONFIG.APP_ENV === "production") {
    if (ENV_CONFIG.DEBUG_MODE) {
      suggestions.push({
        type: "security",
        message: "En producción, considera desactivar DEBUG_MODE",
      });
    }

    if (!ENV_CONFIG.ENABLE_ANALYTICS) {
      suggestions.push({
        type: "analytics",
        message: "Considera activar analytics en producción",
      });
    }
  }

  return suggestions;
};

// Función para log de configuración al iniciar la app
export const logAppStartup = () => {
  const status = getConfigStatus();
  const suggestions = getConfigSuggestions();

  debugLog("🚀 Iniciando Preguntitas...");
  debugLog("📊 Estado de configuración:", status);

  if (suggestions.length > 0) {
    debugLog("💡 Sugerencias de configuración:", suggestions);
  }

  if (!status.ready) {
    errorLog("❌ La aplicación no está lista:", status.issues);
    console.warn(`
⚠️  CONFIGURACIÓN INCOMPLETA
==============================

${status.issues.join("\n")}

🔧 Para configurar la aplicación:
1. Ejecuta: npm run setup
2. O edita manualmente el archivo .env

📖 Más información: ENVIRONMENT_SETUP.md
    `);
  } else {
    debugLog("✅ Aplicación lista para usar");
  }

  return status;
};

// Auto-ejecutar validación al importar (solo en desarrollo)
if (ENV_CONFIG.APP_ENV === "development") {
  // Pequeño delay para que se cargue todo
  setTimeout(() => {
    logAppStartup();
  }, 100);
}
