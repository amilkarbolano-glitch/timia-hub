// Configuración en runtime (se puede sobrescribir en el contenedor sin recompilar).
// Vacío = misma URL del front con prefijo /api (nginx hace proxy al backend).
// 'none' = sin API (modo local con db.json + localStorage).
window.TIMIA_API_URL = window.TIMIA_API_URL ?? '';
// Firebase (opcional en runtime; normalmente la API lo anuncia en /api/auth/config):
// window.TIMIA_FIREBASE = { apiKey: '', authDomain: 'xxx.firebaseapp.com', projectId: 'xxx', appId: '' };
