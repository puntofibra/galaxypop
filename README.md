# GALAXYPOP

Juego tipo Bubble Bobble de FuturMovil · https://puntofibra.github.io/galaxypop/

- `index.html`: el juego (GitHub Pages). Se genera juntando los archivos de `src/` con `build.sh`.
- `Code.gs`: copia del backend de Apps Script (proyecto "galaxypop").
- `img/`: imágenes propias (PNG sin fondo). Si existen, sustituyen al dibujo básico:
  - `p1.png`, `p2.png`: robots jugadores (mirando a la DERECHA)
  - `e1.png` … `e6.png`: enemigos (1 Zúmbot · 2 Saltón · 3 Medusa · 4 Láser-ojo · 5 Ruedatrón · 6 Espectro), mirando a la DERECHA
  - `burbuja.png`: burbuja vacía · `boss.png`: jefe final · `fantasma.png`: agujero negro que persigue
  - `i1.png` … `i10.png`: premios (de menos a más puntos) · `bloque.png`: bloque de plataforma
  - `logo.png`: logo · `fondo.png`: fondo del escenario
- Al cambiar imágenes, pulsa "Recargar imágenes" en el panel admin (10 toques al título + llave NFC).
- Al publicar cambios, sube a la vez `version.json` y `APP_V` de `index.html` con el mismo número.
