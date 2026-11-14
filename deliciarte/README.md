# DeliciArte Pastelería · video spec de Elevate Negocios

Pieza de cortesía, no oficial: video de 16 s + 2 s de end card (9:16 y 1:1) hecho en código.
El prompt completo está en `prompt/index.html`.

## Estructura
- `assets/originales/` — los 8 assets tal como llegaron (capturas de Instagram).
- `assets/preparados/` — los que usa el video: recortes, logo en círculo con transparencia y zonas con texto desenfocadas. Sin recolorear ni rellenar.
- `assets/assets_report.json` — medidas, nitidez, tamaño máximo en pantalla y tratamiento de cada asset.
- `review/fase1/inventario_assets.jpg` — tablero de revisión (original marcado y preparado).
- `tools/preparar_assets.py` — genera `preparados/`, el reporte y el tablero.

## Comandos
```bash
python3 deliciarte/tools/preparar_assets.py
```

## Estado
- Fase 1 (revisión de assets): lista, en espera de aprobación.
