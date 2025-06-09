#!/usr/bin/env node

// ==================================================
// 🚀 Setup Script - Configuración de Variables de Entorno
// ==================================================

import fs from "fs";
import path from "path";
import readline from "readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

console.log(`
🚀 ¡Bienvenido al configurador de PREGUNTITAS! 
==================================================

Este asistente te ayudará a configurar las variables de entorno
necesarias para que la aplicación funcione correctamente.

📝 Se creará un archivo .env con tu configuración.

⚡ NUEVO: Ahora incluye configuración de MercadoPago para pagos!
💰 Podrás monetizar tu aplicación de quizzes.
`);

async function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

async function setupEnvironment() {
  try {
    console.log("\n🔑 CONFIGURACIÓN DE OpenAI API KEY");
    console.log("=======================================");

    const apiKey = await askQuestion(
      "1. Ingresa tu API Key de OpenAI (obtén una en https://platform.openai.com/api-keys): "
    );

    console.log("\n🔧 CONFIGURACIÓN DE ENTORNO");
    console.log("============================");

    const environment =
      (await askQuestion(
        "2. ¿Qué entorno estás configurando? [development/production] (default: development): "
      )) || "development";

    console.log("\n🧠 CONFIGURACIÓN DE IA");
    console.log("========================");

    const aiModel =
      (await askQuestion(
        "3. ¿Qué modelo de IA quieres usar? [gpt-4o-mini/gpt-4-turbo-preview/gpt-3.5-turbo] (default: gpt-4o-mini): "
      )) || "gpt-4o-mini";

    const maxQuestions =
      (await askQuestion(
        "4. ¿Máximo número de preguntas por quiz? (default: 15): "
      )) || "15";

    const temperature =
      (await askQuestion(
        "5. ¿Nivel de creatividad de la IA? (0.0 = conservador, 1.0 = creativo, default: 0.7): "
      )) || "0.7";

    console.log("\n📁 CONFIGURACIÓN DE ARCHIVOS");
    console.log("=============================");

    const maxFileSize =
      (await askQuestion(
        "6. ¿Tamaño máximo de archivo en MB? (default: 10): "
      )) || "10";

    const maxPdfPages =
      (await askQuestion(
        "7. ¿Máximo páginas de PDF a procesar? (default: 10): "
      )) || "10";

    console.log("\n💰 CONFIGURACIÓN DE MERCADOPAGO");
    console.log("================================");

    const mpPublicKey = await askQuestion(
      "8. Ingresa tu Public Key de MercadoPago (opcional, obtén una en https://www.mercadopago.com.ar/developers/panel): "
    );

    const mpAccessToken = await askQuestion(
      "9. Ingresa tu Access Token de MercadoPago (opcional, MANTENER SECRETO): "
    );

    const mpEnvironment =
      (await askQuestion(
        "10. ¿Entorno de MercadoPago? [sandbox/production] (default: sandbox): "
      )) || "sandbox";

    console.log("\n🔍 CONFIGURACIÓN DE DEBUG");
    console.log("==========================");

    const debugMode =
      (await askQuestion(
        "11. ¿Activar modo debug? [true/false] (default: true): "
      )) || "true";

    const debugApi =
      (await askQuestion(
        "12. ¿Mostrar logs de API? [true/false] (default: false): "
      )) || "false";

    // Crear contenido del archivo .env
    const envContent = `# ==================================================
# 🚀 PREGUNTITAS - Variables de Entorno
# Generado automáticamente por setup-env.js
# ==================================================

# 🔑 OpenAI Configuration
VITE_OPENAI_API_KEY=${apiKey}

# 🔧 Environment Configuration
VITE_APP_ENV=${environment}

# 🎯 App Configuration
VITE_APP_NAME="Preguntitas"
VITE_APP_VERSION="1.0.0"

# 🧠 AI Configuration
VITE_AI_MODEL=${aiModel}
VITE_MAX_QUESTIONS=${maxQuestions}
VITE_AI_TEMPERATURE=${temperature}

# 📁 File Configuration
VITE_MAX_FILE_SIZE=${maxFileSize}
VITE_MAX_PDF_PAGES=${maxPdfPages}

# 🔍 Debug Configuration
VITE_DEBUG_MODE=${debugMode}
VITE_DEBUG_API=${debugApi}

# 🚀 Production Configuration
VITE_BASE_URL=http://localhost:3000
VITE_ENABLE_ANALYTICS=false

# 💰 MercadoPago Configuration
# Obtén tu access token desde: https://www.mercadopago.com.ar/developers/panel
# Public Key (para el frontend)
VITE_MERCADOPAGO_PUBLIC_KEY=${mpPublicKey || "tu-public-key-de-mercadopago"}

# Access Token (para el backend - MANTENER SECRETO)
MERCADOPAGO_ACCESS_TOKEN=${mpAccessToken || "tu-access-token-de-mercadopago"}

# Configuración de pagos
VITE_MERCADOPAGO_ENVIRONMENT=${mpEnvironment}
# Valores posibles: "sandbox" (pruebas) o "production" (producción)

# ==================================================
# ✅ Configuración completada en: ${new Date().toISOString()}
# ==================================================
`;

    // Escribir archivo .env
    fs.writeFileSync(".env", envContent);

    console.log(`
✅ ¡CONFIGURACIÓN COMPLETADA!
===============================

📁 Se ha creado el archivo .env con tu configuración.

🚀 SIGUIENTES PASOS:
1. Ejecuta: npm run dev
2. Ve a http://localhost:3000
3. ¡Comienza a crear cuestionarios!

💰 MERCADOPAGO (OPCIONAL):
${mpPublicKey ? "✅ Public Key configurado" : "⚠️  Public Key no configurado"}
${
  mpAccessToken
    ? "✅ Access Token configurado"
    : "⚠️  Access Token no configurado"
}
- Para activar pagos, configura tus credenciales de MercadoPago
- Consulta MERCADOPAGO_SETUP.md para más información

⚠️  IMPORTANTE:
- El archivo .env NO se subirá a GitHub (está en .gitignore)
- Si necesitas cambiar algo, edita el archivo .env directamente
- Para recrear la configuración, ejecuta: npm run setup
- NUNCA compartas tu Access Token de MercadoPago

🎉 ¡Disfruta usando Preguntitas y empieza a generar ingresos!
`);
  } catch (error) {
    console.error("❌ Error durante la configuración:", error.message);
  } finally {
    rl.close();
  }
}

// Verificar si ya existe .env
if (fs.existsSync(".env")) {
  console.log(`
⚠️  ARCHIVO .env YA EXISTE
==========================

Ya tienes un archivo .env configurado.

🆕 NOVEDAD: Este script ahora incluye configuración de MercadoPago!
   Si quieres agregar pagos a tu app, considera sobrescribir.
`);

  rl.question(
    "¿Quieres sobrescribirlo para incluir MercadoPago? [y/N]: ",
    (answer) => {
      if (answer.toLowerCase() === "y" || answer.toLowerCase() === "yes") {
        setupEnvironment();
      } else {
        console.log("\n✅ Manteniendo configuración actual.");
        console.log("💡 Para configurar MercadoPago manualmente:");
        console.log("   1. Consulta el archivo env.example");
        console.log("   2. Lee MERCADOPAGO_SETUP.md");
        console.log(
          "   3. Agrega las variables VITE_MERCADOPAGO_* a tu .env\n"
        );
        rl.close();
      }
    }
  );
} else {
  setupEnvironment();
}
