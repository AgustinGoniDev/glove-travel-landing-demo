# Glove Travel · Landing (demo)

Concepto de landing para Glove Travel: un vuelo manejado por el scroll sobre **terreno real** de los lugares que vende Glove, con estilo de pintura, y después la web con los destinos y las fotos.

Los cinco capítulos del vuelo son estos:

1. **Torres del Paine**, el hero: "All the way".
2. **Perito Moreno**: el frente del glaciar sobre el Lago Argentino.
3. **Fitz Roy**: el amanecer sobre el granito.
4. **Volcán Osorno**: la región de los lagos.
5. **Atacama**: del atardecer a la noche, con la Vía Láctea sobre el Licancabur.

## Cómo verla

```bash
pnpm install
pnpm dev          # http://localhost:5180
pnpm build        # sitio estático en dist/, se sube a cualquier hosting (Vercel, Netlify)
```

Parámetros útiles en la URL:

- `?paint=0` apaga el filtro de pintura (Kuwahara); `?paint=2.5` lo hace más marcado.
- `?g=2.4` fija un punto del vuelo (de 0 a 5) para sacar capturas. Con ese parámetro, `window.setG(3.1)` lo mueve sin recargar.

## Cómo está hecha

Vite, TypeScript, Three.js y Lenis (scroll suave).

| Archivo | Qué hace |
|---|---|
| `src/config.ts` | Los capítulos: ruta de cámara en coordenadas del mapa (u, v y altura en metros), atmósfera y textos |
| `src/terrain.ts` | Malla desde la elevación real y shader pintado: luz, nieve, pinceladas y bruma |
| `src/flight.ts` | Cada capítulo: cámara que nunca toca el suelo, estela de luz, nubes y cóndores |
| `src/sky.ts` | Cielo, sol, cirros, estrellas y Vía Láctea |
| `src/post.ts` | Bloom, filtro de pintura, transición de nubes entre capítulos, viñeta y grano |
| `src/main.ts` | Scroll → cámara, cambio de capítulo, textos y coordenadas en vivo |

## Datos

- `scripts/fetch_terrain.py` baja la elevación (AWS Terrain Tiles: SRTM y GMTED) y la imagen satelital de cada capítulo, le aplica el estilo pintado y los deja en `public/terrain/`.
- `scripts/fetch_photos.py` baja las fotos de glovetravel.com y fotos con licencia libre de Wikimedia Commons. Los créditos de cada foto quedan en `public/photos/credits.json` y se listan en el pie de la página.

## Antes de publicarla en serio

- **Imágenes satelitales:**
  - Esri World Imagery (Paine y Atacama) requiere licencia de ArcGIS para uso en producción.
  - Sentinel-2 cloudless 2021 de EOX (Glaciar, Fitz Roy y Lagos) es CC BY-NC-SA, es decir, no comercial.

  Para producción hay que pasar todo a Sentinel-2 cloudless 2016 (CC BY 4.0) o licenciar las imágenes.
- **Fotos de Glove:** salieron de su web. Las de Commons llevan su atribución.
- **Celulares de gama baja:** conviene bajar la resolución de la malla y del filtro de pintura.
