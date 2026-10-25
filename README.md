# Glove Travel · Landing (demo)

Concepto de landing para Glove Travel: un vuelo manejado por el scroll sobre **terreno real** de los lugares que vende Glove, con estilo de pintura, y después la web con los destinos y las fotos.

El vuelo es un recorrido de sur a norte en seis paradas:

1. **El Chaltén**, con el amanecer sobre el Fitz Roy. Es el hero: "All the way".
2. **Perito Moreno**: el frente del glaciar sobre el Lago Argentino.
3. **Torres del Paine**: el cruce de los Andes hacia Chile.
4. **Volcán Osorno**: la región de los lagos.
5. **Rapa Nui**: la isla entera sobre el Pacífico, con el cráter del Rano Kau.
6. **Atacama**: del atardecer a la noche, con la Vía Láctea sobre el Licancabur.

Entre parada y parada, las nubes cubren el cambio y muestran el tramo ("Next stop · 130 km south"). El mapa de abajo a la derecha dibuja la ruta a medida que se vuela.

La página está en inglés (por defecto) y en español: se cambia con el selector EN | ES, que queda guardado, o con `?lang=es`.

## Cómo verla

```bash
pnpm install
pnpm dev          # http://localhost:5180
pnpm build        # sitio estático en dist/, se sube a cualquier hosting (Vercel, Netlify)
```

Parámetros útiles en la URL:

- `?paint=0` apaga el filtro de pintura (Kuwahara); `?paint=2.5` lo hace más marcado.
- `?g=2.4` fija un punto del vuelo (de 0 a 6) para sacar capturas. Con ese parámetro, `window.setG(3.1)` lo mueve sin recargar.

## Cómo está hecha

Vite, TypeScript, Three.js y Lenis (scroll suave).

| Archivo | Qué hace |
|---|---|
| `src/config.ts` | Las paradas: ruta de cámara en coordenadas del mapa (u, v y altura en metros), atmósfera y textos en los dos idiomas |
| `src/terrain.ts` | Malla desde la elevación real, mapa de normales para el relieve fino y shader pintado: luz, roca en las paredes, nieve, mar y bruma |
| `src/i18n.ts` | Los textos de la página en inglés y español |
| `src/map.ts`, `src/map-data.ts` | El mapa del recorrido (contornos de Natural Earth, simplificados) |
| `src/flight.ts` | Cada capítulo: cámara que nunca toca el suelo, estela de luz, nubes y cóndores |
| `src/sky.ts` | Cielo, sol, cirros, estrellas y Vía Láctea |
| `src/post.ts` | Bloom, filtro de pintura, transición de nubes entre capítulos, viñeta y grano |
| `src/main.ts` | Scroll → cámara, cambio de capítulo, textos y coordenadas en vivo |

## Datos

- `scripts/fetch_terrain.py` baja, para cada parada, la elevación (AWS Terrain Tiles, zoom 13) y la imagen satelital (zoom 14, 4096 px y una versión de 2048 px para celulares). Calcula el mapa de normales, limpia los picos falsos de la elevación y deja todo en `public/terrain/`. En `meta.json` quedan las posiciones de los lugares de referencia, para escribir las rutas de cámara.
- El loader espera solo la primera parada; las demás se cargan mientras se vuela, y en la placa de video solo quedan las texturas de la parada actual y las vecinas.
- `scripts/fetch_photos.py` baja las fotos de glovetravel.com y fotos con licencia libre de Wikimedia Commons. Los créditos de cada foto quedan en `public/photos/credits.json` y se listan en el pie de la página.

## Antes de publicarla en serio

- **Imágenes satelitales:**
  - Esri World Imagery (Paine, Rapa Nui y Atacama) requiere licencia de ArcGIS para uso en producción.
  - Sentinel-2 cloudless 2021 de EOX (El Chaltén, Glaciar y Lagos) es CC BY-NC-SA, es decir, no comercial.

  Para producción hay que pasar todo a Sentinel-2 cloudless 2016 (CC BY 4.0) o licenciar las imágenes.
- **Fotos de Glove:** salieron de su web. Las de Commons llevan su atribución.
- **Celulares de gama baja:** conviene bajar la resolución de la malla y del filtro de pintura.
