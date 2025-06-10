# 🔥 Configuración de Reglas de Firestore

## ❌ Error: "Missing or insufficient permissions"

Si estás viendo este error, necesitas configurar las reglas de seguridad de Firestore.

## 📋 Pasos para Configurar las Reglas

### 1. Ir a Firebase Console
1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto: `preguntitas-d05dc`
3. En el menú lateral, ve a **Firestore Database**
4. Haz clic en la pestaña **Reglas** (Rules)

### 2. Reemplazar las Reglas Actuales

Borra todo el contenido actual y pega exactamente esto:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection - Users can only read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Subscriptions - Users can only read/write their own subscription
    match /subscriptions/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Payments - Users can only read their own payments
    match /payments/{paymentId} {
      allow read: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }
  }
}
```

### 3. Publicar las Reglas
1. Haz clic en **Publicar** (Publish)
2. Confirma la acción

### 4. Verificar la Configuración

Las reglas deben permitir:
- ✅ Usuarios autenticados pueden leer/escribir su propia información en `/users/{userId}`
- ✅ Usuarios autenticados pueden gestionar sus suscripciones en `/subscriptions/{userId}`
- ✅ Usuarios autenticados pueden ver sus pagos en `/payments/{paymentId}`

## 🔧 Estructura de Datos

### Colección `users/{userId}`
```javascript
{
  createdAt: timestamp,
  lastUpdated: timestamp,
  migrated: boolean,
  quizData: {
    customQuizData_choice: string,
    customQuizData_development: string,
    customQuizFileName_choice: string,
    customQuizFileName_development: string,
    questionType: string
  }
}
```

### Colección `subscriptions/{userId}`
```javascript
{
  userId: string,
  userEmail: string,
  planId: string,
  status: string,
  expiresAt: timestamp,
  createdAt: timestamp,
  // ... otros campos
}
```

## 🚨 Errores Comunes

### Error: "permission-denied"
- **Causa**: Las reglas de Firestore no permiten la operación
- **Solución**: Verificar que las reglas están configuradas correctamente

### Error: "Document doesn't exist"
- **Causa**: El documento del usuario no existe
- **Solución**: El sistema lo creará automáticamente en el primer uso

## ✅ Verificación Exitosa

Una vez configurado correctamente, deberías ver en la consola:
```
🔍 Checking user document for: [userId]
📦 Datos migrados de localStorage a Firebase
📡 Firebase data synced in real-time
✅ Firebase data saved: [key]
```

## 🆘 Si Sigues Teniendo Problemas

1. Verifica que estés autenticado (logueado) en la aplicación
2. Verifica que tu usuario tenga un `uid` válido
3. Revisa la consola del navegador para mensajes de error específicos
4. Asegúrate de que el proyecto Firebase esté activo y configurado correctamente 