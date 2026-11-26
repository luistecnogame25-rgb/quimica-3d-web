# Sitio web de Química 3D

Página de presentación y donaciones de la app. Es un sitio estático: no necesita servidor ni base de datos.

## Ver la página
- Abre `index.html` con doble clic (funciona sin servidor), o
- en Visual Studio Code, con la extensión **Live Server**: clic derecho sobre `index.html` → *Open with Live Server*.

## Estructura
```
index.html          contenido y textos
styles.css          diseño
src/main.js         interacción (molécula 3D, carrusel, animaciones)
assets/app.js       src/main.js ya empaquetado con Three.js (lo que carga la página)
assets/moleculas.js moléculas reales (PubChem) extraídas de la app
assets/capturas/    capturas de la app
assets/paypal-qr.png
```

## Cambios habituales
- **Textos:** edita `index.html`.
- **Enlace directo de PayPal:** en `src/main.js` escribe tu enlace en `PAYPAL_LINK` (p. ej. `https://paypal.me/tuusuario`) y ejecuta `node build.mjs`. Aparecerá un botón «Donar en PayPal» bajo el QR.
- **Tras editar `src/main.js`:** ejecuta `node build.mjs` para regenerar `assets/app.js` (usa Vite y Three.js de `../laboratorio-3d`).

## Publicarla gratis
Sube la carpeta completa a GitHub Pages, Netlify o Cloudflare Pages (planes gratuitos). Después cambia `assets/og.png` en `<meta property="og:image">` por la URL absoluta para que la vista previa al compartir funcione en redes sociales.
