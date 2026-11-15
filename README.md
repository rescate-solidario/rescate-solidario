# 🌿 Rescate Solidario

App para rescatar alimentos que sobran en supermercados y minimarkets y entregarlos **gratis** a vecinos que los necesitan. Hecha con React, Vite, Tailwind y Capacitor (Android).

## 📲 Descargar la app

Ve a la sección **[Releases](https://github.com/rescate-solidario/rescate-solidario/releases/latest)** y descarga `rescate-solidario.apk`.
En el celular, permite instalar apps de "orígenes desconocidos" cuando Android lo pida.

## Funciones

- **Beneficiarios:** explorar alimentos disponibles (lista o mapa de Chile), reservar con código QR y ver "Mis Retiros".
- **Comercios:** publicar paquetes de alimentos, ver reservas y marcar retiros.
- Alertas de nuevos alimentos, modo claro/oscuro, ubicación y declaración de necesidad.
- Botón de descarga desde GitHub en la portada, el menú y la configuración.

## Ejecutar en el computador

Requisitos: Node.js 22+

```bash
npm install
npm run dev      # abre http://localhost:3000
npm run build    # genera la carpeta dist/
```

## Publicar una versión en GitHub (APK automático)

1. Edita `src/config.ts` y pon la URL de tu repositorio en `GITHUB_REPO_URL`.
2. Sube el proyecto a GitHub.
3. Crea una etiqueta de versión y súbela:
   ```bash
   git tag v1.1.0
   git push origin v1.1.0
   ```
4. GitHub Actions (`.github/workflows/build-apk.yml`) compila el APK y lo publica en **Releases**.
   El botón "Descargar APK" de la app apunta directamente a ese archivo.

También puedes ejecutar el workflow a mano desde la pestaña **Actions → Compilar APK → Run workflow** (en ese caso el APK queda como artefacto descargable, sin crear Release).

## Compilar el APK localmente (opcional)

Requiere Android Studio / JDK 21:

```bash
npm run build
npx cap sync android
cd android && ./gradlew assembleDebug
# APK en android/app/build/outputs/apk/debug/app-debug.apk
```

## Estructura

```
src/
  App.tsx                  Estado global y navegación
  config.ts                URL de GitHub y versión
  components/
    Hero.tsx               Portada (incluye tarjeta de descarga)
    GithubDownload.tsx     Botones de descarga / GitHub
    NeighborDashboard.tsx  Vista de beneficiarios
    StoreDashboard.tsx     Vista de comercios
    ChileMapView.tsx       Mapa (se carga solo cuando se usa)
    ...
```

> Proyecto académico. Los datos de comercios y alimentos son simulados.
