// ─────────────────────────────────────────────────────────────
// Configuración del enlace de descarga en GitHub
// Cambia GITHUB_REPO_URL por la URL de TU repositorio.
// Ejemplo: 'https://github.com/jorge-santana/rescate-solidario'
// ─────────────────────────────────────────────────────────────
export const GITHUB_REPO_URL = 'https://github.com/rescate-solidario/rescate-solidario';

// Página con la última versión publicada (Releases de GitHub)
export const GITHUB_RELEASES_URL = `${GITHUB_REPO_URL}/releases/latest`;

// Descarga directa del APK de la última versión.
// El workflow .github/workflows/build-apk.yml sube el archivo con este nombre.
export const APK_FILE_NAME = 'rescate-solidario.apk';
export const APK_DOWNLOAD_URL = `${GITHUB_REPO_URL}/releases/latest/download/${APK_FILE_NAME}`;

export const APP_VERSION = '1.1.0';
