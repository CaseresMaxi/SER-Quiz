# 🧠 Configuración de OpenAI para Preguntitas

Esta aplicación incluye integración completa con OpenAI para generar preguntas automáticamente desde tus archivos. Sigue estos pasos para configurarla:

## 📋 Requisitos Previos

1. **Cuenta de OpenAI**: Necesitas una cuenta en [OpenAI Platform](https://platform.openai.com)
2. **API Key**: Debes generar una API key con créditos disponibles
3. **Node.js**: La aplicación ya tiene instaladas las dependencias necesarias

## 🔑 Configuración de API Key

### Opción 1: Variable de Entorno (Recomendado)

1. Crea un archivo `.env` en la raíz del proyecto:
```bash
touch .env
```

2. Agrega tu API key al archivo `.env`:
```env
VITE_OPENAI_API_KEY=tu-api-key-aqui
```

### Opción 2: Editar Directamente el Código

Si prefieres no usar variables de entorno, puedes editar directamente:

1. Abre el archivo `src/config/openai.js`
2. Reemplaza `'tu-api-key-aqui'` con tu API key real:
```javascript
const OPENAI_API_KEY = 'sk-proj-tu-api-key-real-aqui';
```

## 🚀 Obtener tu API Key

1. Ve a [OpenAI Platform](https://platform.openai.com/api-keys)
2. Inicia sesión en tu cuenta
3. Haz clic en "Create new secret key"
4. Dale un nombre a tu key (ej: "Preguntitas App")
5. Copia la key generada (empieza con `sk-proj-` o `sk-`)
6. **⚠️ IMPORTANTE**: Guarda la key en un lugar seguro, no podrás verla de nuevo

## 💰 Costos Estimados

La aplicación usa el modelo `gpt-4-turbo-preview` con las siguientes configuraciones:
- **Tokens máximos**: 3,000 por solicitud
- **Costo aproximado**: $0.03 - $0.09 USD por generación de 5 preguntas
- **Archivos soportados**: Texto plano, PDFs, imágenes, Office

## 🎯 Cómo Funciona

1. **Sube tus archivos**: Arrastra o selecciona archivos desde el botón 🧠 AI
2. **Procesamiento**: La IA lee el contenido de tus archivos
3. **Generación**: OpenAI genera 5 preguntas personalizadas basadas en el contenido
4. **Formato automático**: Las preguntas se convierten al formato de la app automáticamente

## 📁 Tipos de Archivo Soportados

### ✅ Totalmente Soportados
- **Texto plano** (`.txt`, `.md`): Se lee el contenido completo
- **CSV**: Se procesa como texto estructurado

### 🔄 Parcialmente Soportados (en desarrollo)
- **PDF** (`.pdf`): Se incluye información del archivo
- **Imágenes** (`.jpg`, `.png`, `.jpeg`): Se podría usar GPT-4 Vision
- **Word** (`.doc`, `.docx`): Se incluye información del archivo
- **Excel** (`.xlsx`): Se incluye información del archivo
- **PowerPoint** (`.pptx`): Se incluye información del archivo

### ❌ No Soportados
- **Videos**: Cualquier formato de video se rechaza automáticamente

## 🔧 Configuraciones Avanzadas

Si quieres personalizar el comportamiento, puedes editar `src/config/openai.js`:

```javascript
// Cambiar el modelo (más opciones en OpenAI)
model: "gpt-4-turbo-preview", // o "gpt-3.5-turbo"

// Ajustar creatividad (0.0 = muy conservador, 1.0 = muy creativo)
temperature: 0.7,

// Cambiar número máximo de tokens
max_tokens: 3000,
```

## 🛡️ Seguridad

- **Nunca** compartas tu API key públicamente
- **Nunca** subas el archivo `.env` a repositorios públicos
- La app incluye `dangerouslyAllowBrowser: true` para uso en navegador
- Considera usar un proxy/backend para mayor seguridad en producción

## 🚨 Solución de Problemas

### Error: "Invalid API Key"
- Verifica que copiaste la API key completa
- Asegúrate de que la key no haya expirado
- Verifica que tienes créditos disponibles en tu cuenta

### Error: "Rate limit exceeded"
- Has excedido el límite de solicitudes por minuto
- Espera unos minutos e intenta de nuevo
- Considera actualizar tu plan de OpenAI

### Error: "Insufficient quota"
- No tienes créditos suficientes en tu cuenta
- Agrega fondos a tu cuenta de OpenAI
- Verifica tu límite de gasto mensual

### Las preguntas no se generan correctamente
- Verifica que tus archivos tengan contenido legible
- Archivos muy pequeños pueden no generar buenas preguntas
- Prueba con archivos de texto plano primero

## 📞 Soporte

Si tienes problemas con la configuración:
1. Verifica que seguiste todos los pasos
2. Revisa la consola del navegador para errores específicos
3. Asegúrate de que tu API key sea válida y tenga créditos

¡Listo! Ahora puedes generar preguntas personalizadas con IA 🎉 