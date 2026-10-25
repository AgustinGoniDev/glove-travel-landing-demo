# Glove Travel · Landing (demo)

Landing concepto para Glove Travel: vuelo con el scroll sobre terreno real (Three.js) y después la web con destinos. Leer [`README.md`](README.md): qué es cada archivo, de dónde salen los datos y qué falta antes de publicarla.

## Comandos

```bash
pnpm dev          # http://localhost:5180
pnpm typecheck
pnpm build        # estático en dist/
pnpm terrain      # vuelve a bajar terreno e imágenes (python -I scripts/fetch_terrain.py [id])
pnpm photos       # vuelve a bajar las fotos y sus créditos
```

## Cómo se ajusta

- **Rutas de cámara, luz, bruma y textos** de cada capítulo: todo en `src/config.ts`. Las rutas están en coordenadas del mapa (u oeste→este, v norte→sur, de 0 a 1) y altura en metros sobre el nivel del mar.
- **Para ver un punto exacto del vuelo:** `?g=<0 a 5>`; con ese parámetro, `window.setG(n)` lo mueve sin recargar. Las capturas se sacan con Playwright desde Python (el único navegador automatizado), con `--use-angle=swiftshader` si no hay GPU, y esperando a que `#loader` tenga la clase `is-done`.
- **Mirar siempre las capturas:** el filtro de pintura, la bruma y el bloom se juegan entre sí, y el código no muestra cómo queda.
- En Git Bash, `MSYS_NO_PATHCONV=1` si se pasan rutas que empiezan con `/`.

## Reglas

- Textos visibles del sitio en inglés: el 90 % de los clientes de Glove son agencias de Estados Unidos.
- Identificadores y comentarios en inglés; TypeScript estricto.
- Colores de Glove: verde `#12442a`, arena `#a88a5c`, crema `#f4efe6`.
- Commits: conventional commits, sin atribución de IA.
