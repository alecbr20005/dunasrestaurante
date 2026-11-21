# Configurar el recorrido panorámico

## Estado actual

El recorrido está activo en `data/panorama.json` y utiliza la panorámica real `assets/recorrido-360.png` (1024 × 506 px). Su proporción es 2.0237:1, dentro de la tolerancia relativa del 2 % admitida por la web.

La aplicación comprueba que cada archivo exista y que sus dimensiones sean compatibles antes de inicializar Pannellum. Si un recurso falta o no es una panorámica equirectangular compatible, se conserva la portada y se informa al usuario; una fotografía convencional no debe usarse como sustituto.

## Añadir escenas

1. Captura cada nueva escena como una panorámica equirectangular real, idealmente con proporción 2:1.
2. Guarda el archivo dentro de `assets/` y actualiza la ruta local en `data/panorama.json`.
3. Marca `available: true` solo cuando el recurso exista y haya sido comprobado.
4. Añade la escena a `scenes` con un `id` único y un título confirmado. `startScene` debe apuntar a una escena disponible.

La configuración define escenas y hotspots por separado, de modo que se pueden incorporar puntos de navegación cuando se conozcan sus posiciones reales. No inventes nombres de zonas ni coordenadas.

## Añadir hotspots

Para enlazar dos escenas, añade a `hotSpots` de la escena de origen un hotspot con:

- `type`: `"scene"`
- `sceneId`: el `id` de la escena de destino
- `pitch` y `yaw`: ángulos medidos en la panorámica de origen
- `text`: etiqueta confirmada para el punto de navegación

El destino debe existir y estar disponible. Los hotspots con destinos inválidos se descartan.
