#!/usr/bin/env node

// ==================================================
// 🔍 Environment Validation Script (Node.js)
// ==================================================

import fs from "fs";
import path from "path";

// Función para leer variables de entorno desde .env
function loadEnvFile() {
  const envPath = ".env";

  if (!fs.existsSync(envPath)) {
    return {};
  }

  const envContent = fs.readFileSync(envPath, "utf8");
  const envVars = {};

  envContent.split("\n").forEach((line) => {
    line = line.trim();
    if (line && !line.startsWith("#")) {
      const [key, ...valueParts] = line.split("=");
      if (key && valueParts.length > 0) {
        envVars[key.trim()] = valueParts
          .join("=")
          .trim()
          .replace(/^["']|["']$/g, "");
      }
    }
  });

  return envVars;
}

// Función para obtener variable con valor por defecto
function getEnvVar(envVars, key, defaultValue = null) {
  const value = envVars[key];
  return value !== undefined && value !== "" ? value : defaultValue;
}

// Función para obtener variable booleana
function getBoolEnvVar(envVars, key, defaultValue = false) {
  const value = getEnvVar(envVars, key);
  if (value === null) return defaultValue;
  return value.toLowerCase() === "true";
}

// Función para obtener variable numérica
function getNumEnvVar(envVars, key, defaultValue = 0) {
  const value = getEnvVar(envVars, key);
  if (value === null) return defaultValue;
  const num = parseFloat(value);
  return isNaN(num) ? defaultValue : num;
}

// Función principal de validación
function validateEnvironment() {
  console.log("🔍 Validando configuración de variables de entorno...\n");

  const envVars = loadEnvFile();
  const errors = [];
  const warnings = [];

  // Configuración basada en variables de entorno
  const config = {
    APP_ENV: getEnvVar(envVars, "VITE_APP_ENV", "development"),
    APP_NAME: getEnvVar(envVars, "VITE_APP_NAME", "Preguntitas"),
    APP_VERSION: getEnvVar(envVars, "VITE_APP_VERSION", "1.0.0"),
    OPENAI_API_KEY: getEnvVar(envVars, "VITE_OPENAI_API_KEY", ""),
    AI_MODEL: getEnvVar(envVars, "VITE_AI_MODEL", "gpt-4o-mini"),
    AI_TEMPERATURE: getNumEnvVar(envVars, "VITE_AI_TEMPERATURE", 0.7),
    MAX_QUESTIONS: getNumEnvVar(envVars, "VITE_MAX_QUESTIONS", 15),
    MAX_FILE_SIZE: getNumEnvVar(envVars, "VITE_MAX_FILE_SIZE", 10),
    MAX_PDF_PAGES: getNumEnvVar(envVars, "VITE_MAX_PDF_PAGES", 10),
    DEBUG_MODE: getBoolEnvVar(envVars, "VITE_DEBUG_MODE", true),
    DEBUG_API: getBoolEnvVar(envVars, "VITE_DEBUG_API", false),
  };

  // Validaciones críticas
  if (!config.OPENAI_API_KEY) {
    warnings.push("⚠️  API Key de OpenAI no configurada");
  } else if (!config.OPENAI_API_KEY.startsWith("sk-")) {
    warnings.push(
      "⚠️  API Key de OpenAI no tiene el formato esperado (debe empezar con 'sk-')"
    );
  }

  if (!["development", "production", "testing"].includes(config.APP_ENV)) {
    errors.push("❌ APP_ENV debe ser 'development', 'production' o 'testing'");
  }

  if (config.AI_TEMPERATURE < 0 || config.AI_TEMPERATURE > 1) {
    warnings.push("⚠️  AI_TEMPERATURE debe estar entre 0 y 1");
  }

  if (config.MAX_QUESTIONS < 5) {
    warnings.push("⚠️  MAX_QUESTIONS parece muy bajo (mínimo recomendado: 5)");
  }

  if (config.MAX_FILE_SIZE > 50) {
    warnings.push(
      "⚠️  MAX_FILE_SIZE muy alto (puede causar problemas de memoria)"
    );
  }

  // Mostrar configuración actual
  console.log("📊 CONFIGURACIÓN ACTUAL:");
  console.log("========================");
  console.log(`🔧 Entorno: ${config.APP_ENV}`);
  console.log(`🎯 Aplicación: ${config.APP_NAME} v${config.APP_VERSION}`);
  console.log(
    `🔑 API Key: ${
      config.OPENAI_API_KEY ? "✅ Configurada" : "❌ No configurada"
    }`
  );
  console.log(`🧠 Modelo IA: ${config.AI_MODEL}`);
  console.log(`🎲 Temperatura: ${config.AI_TEMPERATURE}`);
  console.log(`📝 Máx. preguntas: ${config.MAX_QUESTIONS}`);
  console.log(`📁 Máx. archivo: ${config.MAX_FILE_SIZE}MB`);
  console.log(`📄 Máx. páginas PDF: ${config.MAX_PDF_PAGES}`);
  console.log(`🔍 Debug: ${config.DEBUG_MODE ? "Activado" : "Desactivado"}`);
  console.log(
    `🌐 Debug API: ${config.DEBUG_API ? "Activado" : "Desactivado"}\n`
  );

  // Mostrar errores
  if (errors.length > 0) {
    console.log("❌ ERRORES ENCONTRADOS:");
    console.log("=======================");
    errors.forEach((error) => console.log(error));
    console.log("");
  }

  // Mostrar advertencias
  if (warnings.length > 0) {
    console.log("🟡 ADVERTENCIAS:");
    console.log("================");
    warnings.forEach((warning) => console.log(warning));
    console.log("");
  }

  // Resultado final
  if (errors.length === 0 && warnings.length === 0) {
    console.log("✅ ¡CONFIGURACIÓN PERFECTA!");
    console.log("===========================");
    console.log(
      "Todas las variables de entorno están correctamente configuradas.\n"
    );
  } else if (errors.length === 0) {
    console.log("✅ CONFIGURACIÓN VÁLIDA");
    console.log("=======================");
    console.log(
      "La configuración es válida, pero hay algunas advertencias menores.\n"
    );
  } else {
    console.log("❌ CONFIGURACIÓN INVÁLIDA");
    console.log("=========================");
    console.log("Se encontraron errores que deben corregirse.\n");
  }

  // Sugerencias
  console.log("💡 SUGERENCIAS:");
  console.log("===============");

  if (!fs.existsSync(".env")) {
    console.log('📝 Ejecuta "npm run setup" para crear tu archivo .env');
  }

  if (config.APP_ENV === "development") {
    if (config.AI_MODEL !== "gpt-4o-mini") {
      console.log(
        "💰 Para desarrollo, considera usar gpt-4o-mini para reducir costos"
      );
    }
    if (config.MAX_QUESTIONS > 15) {
      console.log(
        "⚡ Para desarrollo, considera reducir MAX_QUESTIONS para pruebas más rápidas"
      );
    }
  }

  if (config.APP_ENV === "production") {
    if (config.DEBUG_MODE) {
      console.log("🔒 En producción, considera desactivar DEBUG_MODE");
    }
  }

  console.log("📖 Consulta ENVIRONMENT_SETUP.md para más información\n");

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    config,
  };
}

// Ejecutar validación
const result = validateEnvironment();

// Exit code basado en el resultado
process.exit(result.isValid ? 0 : 1);
