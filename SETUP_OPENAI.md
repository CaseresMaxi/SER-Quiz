# 🚀 Configuración Rápida de OpenAI

## Paso 1: Obtener API Key

1. Ve a [OpenAI Platform](https://platform.openai.com/api-keys)
2. Crea una cuenta o inicia sesión
3. Haz clic en "Create new secret key"
4. Copia la API key que comienza con `sk-`

## Paso 2: Configurar en la App

### Opción A: Variable de Entorno (Fácil)
1. Crea un archivo `.env` en la raíz del proyecto
2. Agrega esta línea:
```
VITE_OPENAI_API_KEY=tu-api-key-aqui
```

### Opción B: Editar Código Directamente
1. Abre `src/config/openai.js`
2. Cambia esta línea:
```javascript
const OPENAI_API_KEY = 'tu-api-key-aqui';
```

## Paso 3: ¡Listo!

1. Reinicia la aplicación si está corriendo
2. Haz clic en el botón 🧠 AI
3. Sube tus archivos (PDF, TXT, etc.)
4. Haz clic en "Generar Preguntitas con IA"

## 💡 Personalizar Configuración

Edita `src/config/aiSettings.js` para cambiar:
- Número de preguntas (default: 5)
- Modelo de IA (default: gpt-4-turbo-preview)
- Creatividad de respuestas (default: 0.7)

## 💰 Costos

- ~$0.03-0.09 USD por generación de 5 preguntas
- Solo pagas por lo que uses
- Se recomienda establecer límites en OpenAI

¡Ya puedes generar preguntas personalizadas con IA! 🎉 