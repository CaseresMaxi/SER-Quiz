# 📄 Guía de Solución de Problemas con PDFs

Esta guía te ayudará a resolver los problemas más comunes al procesar archivos PDF en **Preguntitas**.

## 🔍 Diagnóstico Automático

La aplicación incluye un sistema de diagnóstico automático que analiza tus PDFs y te mostrará información detallada en la **consola del navegador**.

### Cómo ver los logs de diagnóstico:

1. **Abre la consola del navegador:**
   - **Chrome/Edge**: `F12` o `Ctrl+Shift+I`
   - **Firefox**: `F12` o `Ctrl+Shift+K`
   - **Safari**: `Cmd+Option+I`

2. **Busca los logs con emojis:**
   - 🔍 = Diagnóstico
   - 📄 = Procesamiento PDF
   - ✅ = Éxito
   - ❌ = Error
   - ⚠️ = Advertencia

## 🚨 Problemas Comunes y Soluciones

### 1. 📁 **"Archivo demasiado grande"**

**Error:** `Archivo demasiado grande: XXX MB`

**Causas:**
- El PDF supera el límite configurado (default: 10MB)

**Soluciones:**
```bash
# Opción A: Aumentar límite en .env
VITE_MAX_FILE_SIZE=20  # Aumentar a 20MB

# Opción B: Reducir tamaño del PDF
```

**Herramientas para reducir tamaño:**
- [ILovePDF](https://www.ilovepdf.com/compress_pdf)
- [SmallPDF](https://smallpdf.com/compress-pdf)
- Adobe Acrobat (Guardar como → Reducir tamaño)

### 2. 🖼️ **"PDF escaneado sin texto extraíble"**

**Error:** `PDF procesado pero con muy poco texto extraíble`

**Diagnóstico:**
- El PDF contiene solo imágenes escaneadas
- No tiene texto seleccionable

**Soluciones:**

#### Opción A: Usar OCR online
- [ILovePDF OCR](https://www.ilovepdf.com/ocr-pdf)
- [Adobe Acrobat Online](https://www.adobe.com/acrobat/online/ocr-pdf.html)
- [Google Drive OCR](https://drive.google.com) (subir → abrir con Google Docs)

#### Opción B: Convertir localmente
```bash
# Con tesseract (Linux/Mac)
tesseract input.pdf output.pdf pdf

# Con OCRmyPDF
ocrmypdf input.pdf output.pdf
```

### 3. 🔒 **"PDF protegido con contraseña"**

**Error:** `PDF está protegido con contraseña`

**Soluciones:**

#### Opción A: Desbloquear PDF
- [ILovePDF Unlock](https://www.ilovepdf.com/unlock_pdf)
- [PDF24 Unlock](https://tools.pdf24.org/en/unlock-pdf)

#### Opción B: Usar contraseña conocida
```javascript
// Actualmente no soportado - próxima versión
```

### 4. 💾 **"PDF corrupto o dañado"**

**Error:** `Invalid PDF` o `Error al leer PDF`

**Diagnóstico:**
- Archivo PDF dañado
- Descarga incompleta
- Formato no estándar

**Soluciones:**

#### Reparar PDF:
- [ILovePDF Repair](https://www.ilovepdf.com/repair-pdf)
- [PDF24 Repair](https://tools.pdf24.org/en/repair-pdf)

#### Verificar archivo:
1. Abre el PDF en otro visor
2. Verifica que se vea correctamente
3. Re-descarga el archivo original

### 5. 🔤 **"Caracteres extraños en el texto"**

**Síntomas:** Aparecen caracteres como `�`, `□`, o texto ilegible

**Causas:**
- Fuentes no estándar
- Codificación de caracteres incompatible
- PDF con formato complejo

**Soluciones:**

#### Simplificar PDF:
1. **Exportar como PDF estándar:**
   - Abrir en Adobe Reader
   - Imprimir → Microsoft Print to PDF
   - Usar fuentes estándar

2. **Convertir con herramientas online:**
   - [ILovePDF Convert](https://www.ilovepdf.com/pdf_to_pdf)
   - [SmallPDF Convert](https://smallpdf.com/pdf-converter)

### 6. ⚡ **"Procesamiento muy lento"**

**Causas:**
- PDF muy grande
- Muchas páginas
- Conexión lenta

**Soluciones:**

#### Configurar límites:
```env
# En tu archivo .env
VITE_MAX_PDF_PAGES=5    # Reducir páginas procesadas
VITE_MAX_FILE_SIZE=5    # Reducir tamaño máximo
```

#### Optimizar PDF:
- Dividir en archivos más pequeños
- Usar solo las páginas necesarias
- Comprimir antes de subir

### 7. 🌐 **"Error de Worker PDF.js"**

**Error:** `Worker de PDF.js no configurado`

**Soluciones:**

1. **Recargar la página completamente**
2. **Verificar conexión a internet**
3. **Limpiar caché del navegador:**
   ```
   Chrome: Ctrl+Shift+Delete
   Firefox: Ctrl+Shift+Delete
   ```

## 📊 Formatos PDF Recomendados

### ✅ **PDFs que funcionan bien:**
- **PDF con texto seleccionable**
- **Fuentes estándar** (Arial, Times, Helvetica)
- **Tamaño moderado** (< 10MB)
- **Sin protección**
- **Formato estándar** (PDF 1.4+)

### ❌ **PDFs problemáticos:**
- **PDFs escaneados** sin OCR
- **PDFs protegidos** con contraseña
- **PDFs muy grandes** (> 50MB)
- **PDFs con fuentes personalizadas** complejas
- **PDFs corruptos** o dañados

## 🛠 Herramientas Útiles

### Conversión y Optimización:
- **[ILovePDF](https://www.ilovepdf.com)** - Suite completa
- **[SmallPDF](https://smallpdf.com)** - Herramientas variadas
- **[PDF24](https://tools.pdf24.org)** - Gratuito y sin límites

### OCR (Reconocimiento de texto):
- **[Adobe Acrobat](https://acrobat.adobe.com)** - Más preciso
- **[Google Drive](https://drive.google.com)** - Gratuito
- **[ABBYY FineReader](https://www.abbyy.com)** - Profesional

### Verificación y Reparación:
- **Adobe Reader** - Verificar PDF
- **PDF-XChange Viewer** - Alternativa gratuita
- **Foxit Reader** - Ligero y rápido

## 🔍 Comandos de Diagnóstico

### Verificar configuración:
```bash
npm run validate:env
```

### Ver logs detallados:
1. Abre consola del navegador
2. Sube tu PDF
3. Busca logs con 🔍 y 📄

### Generar reporte de compatibilidad:
```javascript
// En la consola del navegador
import('./src/utils/pdfDiagnostic.js').then(module => {
  module.generateCompatibilityReport();
});
```

## 📞 ¿Aún tienes problemas?

### Información útil para reportar:

1. **Información del PDF:**
   - Tamaño del archivo
   - Origen del PDF (escaneado, generado, etc.)
   - ¿Se abre en otros visores?

2. **Logs de la consola:**
   - Copia los mensajes con emojis
   - Incluye errores completos

3. **Configuración:**
   ```bash
   npm run validate:env
   ```

4. **Navegador:**
   - Nombre y versión
   - Sistema operativo

### Workarounds temporales:

1. **Convertir a texto:**
   - Copia el texto manualmente
   - Pégalo en un archivo .txt
   - Sube el archivo de texto

2. **Usar páginas específicas:**
   - Dividir PDF en secciones
   - Subir solo las páginas importantes

3. **Formato alternativo:**
   - Convertir a Word → PDF
   - Usar Google Docs → Exportar PDF

---

## 💡 Consejos Preventivos

### Antes de subir el PDF:

1. ✅ **Verificar que se abre correctamente**
2. ✅ **Comprobar que el texto es seleccionable**
3. ✅ **Verificar el tamaño (< 10MB recomendado)**
4. ✅ **Sin protecciones o contraseñas**
5. ✅ **Formato PDF estándar**

### Para mejores resultados:

- **Usa PDFs generados digitalmente** (no escaneados)
- **Prefiere fuentes estándar** (Arial, Times)
- **Mantén archivos pequeños** (< 5MB ideal)
- **Una materia por PDF** para mejor análisis
- **Texto claro y bien estructurado**

---

¡Con esta guía deberías poder resolver la mayoría de problemas con PDFs en Preguntitas! 🎉 