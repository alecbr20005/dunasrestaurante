# Generar los modelos 3D de los platos

No hay modelos GLB ni USDZ en `assets/modelos/`. Las fotografías de la carta no son modelos 3D y no deben renombrarse ni usarse como sustitutos.

## Captura de cada plato

1. Sirve el plato con su presentación definitiva y mantenlo sin cambios durante toda la captura.
2. Toma entre 30 y 70 fotografías nítidas desde distintos ángulos, con buena iluminación difusa y solapamiento suficiente entre tomas.
3. Evita reflejos fuertes, movimiento, cambios de luz y fondos con muchos detalles. Mantén la cámara a una distancia y exposición constantes.
4. No incluyas manos, utensilios en movimiento ni objetos que tapen partes importantes del plato.

## Reconstrucción y exportación

1. Procesa las fotografías con una herramienta de fotogrametría, por ejemplo RealityScan, Polycam o una herramienta equivalente.
2. Revisa la malla reconstruida y elimina geometría flotante, ruido y partes del fondo que no pertenezcan al plato.
3. Corrige escala, orientación, normales, materiales y texturas. Conserva los detalles visibles del plato y no añadas ingredientes que no estén en la captura.
4. Optimiza la geometría y las texturas para web y móvil; evita resoluciones o polígonos innecesarios.
5. Exporta cada modelo como GLB con las texturas incluidas.

## Rutas esperadas

| Plato | Archivo |
| --- | --- |
| Tartar de atún con wakame | `assets/modelos/tartar-atun.glb` |
| Merluza con gulas al ajillo y alioli de tinta de calamar | `assets/modelos/merluza-gulas.glb` |
| Canelón de carrillada | `assets/modelos/canelon-carrillada.glb` |
| Carrillada ibérica al PX | `assets/modelos/carrillada-px.glb` |
| Tiras de pollo al curry rojo y mahonesa de soja | `assets/modelos/pollo-curry.glb` |

Después de añadir un archivo, actualiza el elemento correspondiente de `data/menu.json`: establece `model.available` en `true` y `model.provenance` en `scanned` solo si el modelo procede de una captura/fotogrametría real; usa `illustrative` si es una recreación ilustrativa. No marques un modelo como escaneado si no lo es.

## Validación antes de mostrarlo

1. Abre la ficha en la web y comprueba que `<model-viewer>` termina de cargar el GLB sin errores.
2. Comprueba giro con ratón, controles táctiles, zoom, escala, orientación, materiales y texturas.
3. Confirma que el modelo aparece completo y no queda recortado ni fuera de cámara.
4. Prueba la opción AR desde HTTPS o `localhost` en Android compatible y en iPhone compatible. En otros dispositivos debe seguir funcionando el visor 3D normal y mostrarse el aviso de compatibilidad.
5. Para Quick Look en iPhone, añade un USDZ real exportado por la herramienta y registra su ruta en `model.iosSrc`. No cambies la extensión de un GLB para simular una conversión.

La web solo muestra el botón 3D si el archivo existe, está habilitado en `data/menu.json` y su procedencia está indicada. La opción AR solo aparece si `<model-viewer>` confirma que puede activarla en ese dispositivo.
