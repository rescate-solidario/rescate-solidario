import React from 'react';
import { Capacitor } from '@capacitor/core';
import { Download, ExternalLink, Smartphone } from 'lucide-react';
import { APK_DOWNLOAD_URL, APP_VERSION, GITHUB_RELEASES_URL, GITHUB_REPO_URL } from '../config';

export const GithubIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 .5C5.65.5.5 5.65.5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56v-2c-3.2.7-3.87-1.37-3.87-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.41-2.69 5.38-5.25 5.67.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
  </svg>
);

/** true cuando la app corre dentro del APK (Capacitor), no en el navegador */
export const isNativeApp = (): boolean => {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
};

/**
 * Tarjeta destacada para descargar la app desde GitHub.
 * Dentro del APK no tiene sentido "descargar la app", así que solo muestra el enlace al repositorio.
 */
export const GithubDownloadCard: React.FC = () => {
  const native = isNativeApp();

  return (
    <div className="bg-stone-900 dark:bg-stone-900 rounded-3xl p-5 border border-stone-800 shadow-lg text-white animate-slide-up relative overflow-hidden">
      <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-brand-500/20" aria-hidden="true" />
      <div className="relative flex items-start gap-3">
        <div className="w-11 h-11 rounded-2xl bg-white text-stone-900 flex items-center justify-center shrink-0">
          <GithubIcon className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-2xs font-bold uppercase tracking-wider text-brand-300">
            {native ? 'Código abierto' : 'App para Android'}
          </p>
          <h2 className="text-base font-black leading-tight mt-0.5">
            {native ? 'Rescate Solidario en GitHub' : 'Descarga la app gratis'}
          </h2>
          <p className="text-xs text-stone-400 mt-1 leading-relaxed">
            {native
              ? 'Revisa el código, reporta problemas o descarga nuevas versiones.'
              : 'Instálala en tu celular desde GitHub. Versión ' + APP_VERSION + '.'}
          </p>
        </div>
      </div>

      <div className={`relative mt-4 grid gap-2 ${native ? 'grid-cols-1' : 'grid-cols-2'}`}>
        {!native && (
          <a
            href={APK_DOWNLOAD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-500 text-white font-bold py-3 rounded-2xl text-xs transition-all active:scale-[0.98]"
          >
            <Download className="w-4 h-4" />
            Descargar APK
          </a>
        )}
        <a
          href={native ? GITHUB_REPO_URL : GITHUB_RELEASES_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 border border-white/15 text-white font-bold py-3 rounded-2xl text-xs transition-all active:scale-[0.98]"
        >
          <GithubIcon className="w-4 h-4" />
          Ver en GitHub
          <ExternalLink className="w-3 h-3 opacity-60" />
        </a>
      </div>

      {!native && (
        <p className="relative mt-3 flex items-center gap-1.5 text-2xs text-stone-500">
          <Smartphone className="w-3 h-3" />
          Al instalar, permite "orígenes desconocidos" en tu Android.
        </p>
      )}
    </div>
  );
};

/** Fila compacta para menús y configuración */
export const GithubDownloadRow: React.FC = () => {
  const native = isNativeApp();
  return (
    <a
      href={native ? GITHUB_REPO_URL : GITHUB_RELEASES_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="w-full flex items-center gap-3 px-3 py-3 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800 transition-all text-left"
    >
      <div className="w-8 h-8 rounded-lg bg-stone-900 dark:bg-white text-white dark:text-stone-900 flex items-center justify-center shrink-0">
        <GithubIcon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-stone-800 dark:text-stone-200">
          {native ? 'Ver proyecto en GitHub' : 'Descargar app desde GitHub'}
        </p>
        <p className="text-2xs text-stone-400">Versión {APP_VERSION} · Android</p>
      </div>
      <ExternalLink className="w-3.5 h-3.5 text-stone-400" />
    </a>
  );
};
