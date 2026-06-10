# Generador de Control4 - Scenario experience button

Herramienta web para generar drivers `.c4z` personalizados de **scenario experience buttons** de Control4 a partir de un driver base y una imagen PNG. Funciona por completo en el navegador: no sube nada a ningún servidor.

🔗 **Úsalo online:** https://rafacarrascof.github.io/control4-button-generator/

## Uso rápido

1. Abre la web (enlace de arriba) o `index.html` en Chrome, Edge o Firefox.
2. En "Botones", rellena por cada botón:
   - Nombre del driver
   - Creador
   - Modo de imagen:
     - **Una imagen**: subes una imagen en color; el OFF se genera en blanco y negro automáticamente.
     - **Dos imágenes**: subes una imagen para el OFF (p. ej. puerta cerrada) y otra para el ON (p. ej. puerta abierta), ambas en color.
3. Pulsa "Generar".

Si generas un solo botón, descarga un `.c4z`.
Si generas varios, descarga un `.zip` que contiene varios `.c4z`.

## Qué modifica

En `driver.xml` cambia automáticamente:

- `<name>`
- `<creator>`
- `<created>`
- `<modified>`
- `<version>` (se pone como `1`)
- Rutas `controller://driver/.../icons/device/...`

Las fechas se ponen en formato `MM/DD/AAAA HH:mm` (hora local del equipo).

## Imágenes generadas

Crea automáticamente todos los iconos en `www/icons/` y `www/icons-old/`
(tamaños 70, 90, 300, 512, 1024 px, más `device_lg`/`device_sm`):

- `default_*` → versión **OFF**.
- `selected_*` → versión **ON**, en color.

Con **una imagen**, el OFF se genera en blanco y negro y el ON en color.
Con **dos imágenes**, cada estado usa su propia imagen (ambas en color).

## Tecnología

HTML/CSS/JS estático, sin build ni backend. El empaquetado del `.c4z` se hace
en el navegador con [JSZip](https://stuk.github.io/jszip/) (incluido en `vendor/`,
no requiere conexión).

## Licencia

[MIT](LICENSE) © Rafa Carrasco. Úsalo libremente; se agradece mantener el crédito.
