# Guía de OpenAI Assistants API para PDFs

Esta aplicación ahora soporta el uso de la **OpenAI Assistants API** para procesar PDFs directamente, lo que ofrece mejor calidad de extracción de texto y manejo nativo de documentos PDF.

## 🆕 Nueva Funcionalidad

### Procesamiento Automático Inteligente
- **Detección automática**: Si subes archivos PDF, la aplicación automáticamente usa Assistants API
- **Calidad superior**: Los PDFs se procesan directamente en OpenAI sin conversión local
- **Mejor compatibilidad**: Maneja PDFs complejos, escaneados y con múltiples formatos

### Métodos Disponibles

#### 1. Generación Automática (Recomendado)
```javascript
import { generateQuestionsWithSmartDetection } from './config/openai.js';

// Auto-detecta si usar Assistants para PDFs
const questions = await generateQuestionsWithSmartDetection(
  files,           // Array de archivos
  apiKey,          // API key opcional
  "choice",        // Tipo: "choice" o "development"
  aiConfig         // Configuración opcional
);
```

#### 2. Control Manual
```javascript
import { generateQuestionsFromFiles } from './config/openai.js';

// Control manual del método
const questions = await generateQuestionsFromFiles(
  files,
  apiKey,
  "choice",
  aiConfig,
  true  // useAssistants = true para forzar Assistants API
);
```

## 🔄 Flujo de Procesamiento con Assistants

### 1. Subida de Archivos
- Los PDFs se suben directamente a OpenAI usando `/v1/files`
- Límite máximo: **512 MB** por archivo
- Formatos soportados: PDF con texto seleccionable y escaneados

### 2. Creación del Assistant
- Se crea un Assistant especializado con `file_search` habilitado
- Instrucciones optimizadas para generación de preguntas educativas
- Modelo configurable (por defecto el definido en aiSettings)

### 3. Procesamiento
- Se crea un thread para la conversación
- Los PDFs se adjuntan al mensaje con herramientas de búsqueda
- El Assistant procesa los documentos y genera preguntas

### 4. Limpieza Automática
- Los archivos subidos se eliminan automáticamente después del procesamiento
- Los threads se limpian para evitar acumulación de recursos

## 🆚 Comparación: Método Tradicional vs Assistants

| Característica | Método Tradicional | Assistants API |
|---|---|---|
| **Extracción de PDF** | PDF.js local | OpenAI nativo |
| **Calidad de texto** | Variable | Superior |
| **PDFs escaneados** | Limitado | Mejor soporte |
| **Archivos grandes** | Problemas locales | Hasta 512MB |
| **Costo** | Solo tokens generación | Tokens + procesamiento |
| **Velocidad** | Más rápido | Más lento (subida) |
| **Offline** | Parcial | Requiere internet |

## ⚙️ Configuración

### Variables de Entorno
No se requieren cambios adicionales en `.env`. Usa las mismas variables:
```env
VITE_OPENAI_API_KEY=tu_api_key_aqui
```

### Límites y Consideraciones

#### Límites de OpenAI Assistants
- **Tamaño máximo de archivo**: 512 MB
- **Tokens por archivo**: 2M tokens de texto
- **Archivos por Assistant**: 20 archivos máximo
- **Almacenamiento**: 100 GB por organización

#### Costos Adicionales
- **Subida de archivos**: Gratis
- **Procesamiento**: Tokens de entrada normales
- **Vector store**: Costo adicional por embeddings si se usa
- **Almacenamiento**: Incluido en cuota hasta 100GB

## 🐛 Resolución de Problemas

### Errores Comunes

#### "Archivo demasiado grande"
```
Error: Archivo test.pdf es demasiado grande (600MB). Máximo permitido: 512MB
```
**Solución**: Reduce el tamaño del PDF o divídelo en partes más pequeñas.

#### "Error subiendo archivo"
```
Error: Error subiendo archivo: 400 - Invalid file format
```
**Solución**: Verifica que el archivo sea un PDF válido y no esté corrupto.

#### "Timeout: El Assistant tardó demasiado"
```
Error: Timeout: El Assistant tardó demasiado en responder
```
**Solución**: PDFs muy grandes pueden tardar más. Intenta con archivos más pequeños.

### Debugging

#### Habilitar Logs Detallados
```javascript
// En tu .env
VITE_DEBUG=true
```

Los logs mostrarán:
- ✅ Subida de archivos
- 🤖 Creación de Assistant
- 🧵 Progreso del thread
- 🔄 Estado del procesamiento

#### Verificar en Consola
Abre las herramientas de desarrollador (F12) para ver logs detallados:
```
📤 Subiendo archivos a OpenAI...
🔄 Subiendo PDF: documento.pdf
✅ Archivo subido: file-abc123
🤖 Creando Assistant para generación de preguntas...
✅ Assistant creado: asst-xyz789
🧵 Creando thread y procesando con Assistant...
```

## 🔧 Personalización Avanzada

### Configurar Tipo de Assistant
```javascript
const aiConfig = {
  evaluatorPersonality: "normal", // normal, hater, funny, motivator
  difficultyLevel: "advanced",    // basic, normal, advanced
  // otras configuraciones...
};

const questions = await generateQuestionsWithSmartDetection(
  files,
  apiKey,
  "development",
  aiConfig
);
```

### Manejo de Errores Personalizado
```javascript
try {
  const questions = await generateQuestionsWithSmartDetection(files);
} catch (error) {
  if (error.message.includes("API key")) {
    console.log("Configura tu API key de OpenAI");
  } else if (error.message.includes("quota")) {
    console.log("Has excedido tu cuota de OpenAI");
  } else if (error.message.includes("demasiado grande")) {
    console.log("Reduce el tamaño del archivo PDF");
  } else {
    console.log("Error procesando PDF:", error.message);
  }
}
```

## 🚀 Mejores Prácticas

### 1. Optimización de Archivos
- **Tamaño**: Mantén PDFs bajo 50MB para mejor rendimiento
- **Calidad**: PDFs con texto seleccionable funcionan mejor
- **Estructura**: PDFs bien estructurados generan mejores preguntas

### 2. Configuración de Preguntas
```javascript
// Para mayor calidad, usa configuración específica
const aiConfig = {
  difficultyLevel: "advanced",
  questionsCount: 15, // Número específico de preguntas
};
```

### 3. Manejo de Múltiples PDFs
```javascript
// La aplicación puede procesar múltiples PDFs simultáneamente
const multipleFiles = [pdf1, pdf2, pdf3];
const questions = await generateQuestionsWithSmartDetection(
  multipleFiles,
  apiKey,
  "choice"
);
```

### 4. Monitoreo de Costos
- Los PDFs grandes consumen más tokens
- Usa archivos optimizados para reducir costos
- Considera dividir documentos muy largos

## 📊 Métricas y Monitoreo

### Logs de Performance
La aplicación registra automáticamente:
- Tiempo de subida de archivos
- Tiempo de procesamiento del Assistant
- Número de tokens utilizados
- Éxito/fallo de operaciones

### Indicadores de Calidad
- ✅ **Éxito**: Questions generadas correctamente
- ⚠️ **Advertencia**: Procesamiento parcial
- ❌ **Error**: Fallo en el procesamiento

Consulta la consola del navegador para métricas detalladas durante el desarrollo.

---

## 📞 Soporte

Si encuentras problemas con la nueva funcionalidad de Assistants:

1. **Verifica los logs** en la consola del navegador
2. **Revisa tu cuota** de OpenAI en el dashboard
3. **Prueba con PDFs más pequeños** primero
4. **Consulta la documentación** de OpenAI Assistants

La funcionalidad de Assistants está en **beta** y puede tener cambios. La aplicación mantiene compatibilidad con el método tradicional como respaldo. 