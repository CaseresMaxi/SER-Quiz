# 🚀 Ejemplo de Configuración con MercadoPago

Este es un ejemplo de cómo funciona el script `setup-env.js` actualizado con las nuevas variables de MercadoPago.

## 📋 Proceso de Configuración

```bash
npm run setup
```

### 🎯 Pantalla de Inicio
```
🚀 ¡Bienvenido al configurador de PREGUNTITAS! 
==================================================

Este asistente te ayudará a configurar las variables de entorno
necesarias para que la aplicación funcione correctamente.

📝 Se creará un archivo .env con tu configuración.

⚡ NUEVO: Ahora incluye configuración de MercadoPago para pagos!
💰 Podrás monetizar tu aplicación de quizzes.
```

### 🔑 Configuración OpenAI
```
🔑 CONFIGURACIÓN DE OpenAI API KEY
=======================================
1. Ingresa tu API Key de OpenAI: sk-proj-xxxxxxxxxxxxx
```

### 🔧 Configuración de Entorno
```
🔧 CONFIGURACIÓN DE ENTORNO
============================
2. ¿Qué entorno estás configurando? [development/production]: development
```

### 🧠 Configuración de IA
```
🧠 CONFIGURACIÓN DE IA
========================
3. ¿Qué modelo de IA quieres usar? [gpt-4o-mini/gpt-4-turbo-preview/gpt-3.5-turbo]: gpt-4o-mini
4. ¿Máximo número de preguntas por quiz?: 15
5. ¿Nivel de creatividad de la IA? (0.0 = conservador, 1.0 = creativo): 0.7
```

### 📁 Configuración de Archivos
```
📁 CONFIGURACIÓN DE ARCHIVOS
=============================
6. ¿Tamaño máximo de archivo en MB?: 10
7. ¿Máximo páginas de PDF a procesar?: 10
```

### 💰 NUEVA: Configuración de MercadoPago
```
💰 CONFIGURACIÓN DE MERCADOPAGO
================================
8. Ingresa tu Public Key de MercadoPago (opcional): TEST-12345678-abcd-efgh-ijkl-123456789012
9. Ingresa tu Access Token de MercadoPago (opcional): TEST-1234567890123456-060123-abcdef1234567890123456789012345-123456789
10. ¿Entorno de MercadoPago? [sandbox/production]: sandbox
```

### 🔍 Configuración Debug
```
🔍 CONFIGURACIÓN DE DEBUG
==========================
11. ¿Activar modo debug? [true/false]: true
12. ¿Mostrar logs de API? [true/false]: false
```

### ✅ Resultado Final
```
✅ ¡CONFIGURACIÓN COMPLETADA!
===============================

📁 Se ha creado el archivo .env con tu configuración.

🚀 SIGUIENTES PASOS:
1. Ejecuta: npm run dev
2. Ve a http://localhost:3000
3. ¡Comienza a crear cuestionarios!

💰 MERCADOPAGO (OPCIONAL):
✅ Public Key configurado
✅ Access Token configurado
- Para activar pagos, configura tus credenciales de MercadoPago
- Consulta MERCADOPAGO_SETUP.md para más información

⚠️  IMPORTANTE:
- El archivo .env NO se subirá a GitHub (está en .gitignore)
- Si necesitas cambiar algo, edita el archivo .env directamente
- Para recrear la configuración, ejecuta: npm run setup
- NUNCA compartas tu Access Token de MercadoPago

🎉 ¡Disfruta usando Preguntitas y empieza a generar ingresos!
```

## 📄 Archivo .env Generado

```bash
# ==================================================
# 🚀 PREGUNTITAS - Variables de Entorno
# Generado automáticamente por setup-env.js
# ==================================================

# 🔑 OpenAI Configuration
VITE_OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx

# 🔧 Environment Configuration
VITE_APP_ENV=development

# 🎯 App Configuration
VITE_APP_NAME="Preguntitas"
VITE_APP_VERSION="1.0.0"

# 🧠 AI Configuration
VITE_AI_MODEL=gpt-4o-mini
VITE_MAX_QUESTIONS=15
VITE_AI_TEMPERATURE=0.7

# 📁 File Configuration
VITE_MAX_FILE_SIZE=10
VITE_MAX_PDF_PAGES=10

# 🔍 Debug Configuration
VITE_DEBUG_MODE=true
VITE_DEBUG_API=false

# 🚀 Production Configuration
VITE_BASE_URL=http://localhost:3000
VITE_ENABLE_ANALYTICS=false

# 💰 MercadoPago Configuration
# Obtén tu access token desde: https://www.mercadopago.com.ar/developers/panel
# Public Key (para el frontend)
VITE_MERCADOPAGO_PUBLIC_KEY=TEST-12345678-abcd-efgh-ijkl-123456789012

# Access Token (para el backend - MANTENER SECRETO)
MERCADOPAGO_ACCESS_TOKEN=TEST-1234567890123456-060123-abcdef1234567890123456789012345-123456789

# Configuración de pagos
VITE_MERCADOPAGO_ENVIRONMENT=sandbox
# Valores posibles: "sandbox" (pruebas) o "production" (producción)

# ==================================================
# ✅ Configuración completada en: 2024-01-20T20:45:30.123Z
# ==================================================
```

## 🔄 Si ya tienes un .env

Si ya tienes un archivo `.env`, el script te preguntará:

```
⚠️  ARCHIVO .env YA EXISTE
==========================

Ya tienes un archivo .env configurado.

🆕 NOVEDAD: Este script ahora incluye configuración de MercadoPago!
   Si quieres agregar pagos a tu app, considera sobrescribir.

¿Quieres sobrescribirlo para incluir MercadoPago? [y/N]:
```

### Opciones:
- **Y**: Sobrescribe y configura todo desde cero incluyendo MercadoPago
- **N**: Mantiene tu configuración actual y te da instrucciones manuales

## 💡 Tips de Configuración

### 🧪 Para Desarrollo (Sandbox)
```
VITE_MERCADOPAGO_ENVIRONMENT=sandbox
```
- Usa credenciales de prueba que empiecen con `TEST-`
- Los pagos no son reales
- Perfecto para probar la funcionalidad

### 🚀 Para Producción
```
VITE_MERCADOPAGO_ENVIRONMENT=production
```
- Usa credenciales reales que empiecen con `APP_USR-`
- Los pagos son reales
- Solo cuando tu app esté lista

### 🔒 Seguridad
- El `Access Token` NUNCA debe compartirse
- Solo la `Public Key` es visible en el frontend
- El `.env` está en `.gitignore` por seguridad

---

¡Ahora tu script de configuración incluye todo lo necesario para monetizar tu aplicación! 💰🚀 