<div align="center">
  <img src="frontend/assets/tira-uamotors.svg" width="600" alt="UAMOTORS Logo">
</div>

# MATI (Measurement And Telemetry Insights)

**MATI** (palabra que significa "saber/conocer" en Náhuatl) es una aplicación de escritorio diseñada como un **Dashboard de Telemetría** para los monoplaza **"OP"** del equipo **UAMOTORS** (Universidad Autónoma Metropolitana).

## 🏎️ Sobre el Proyecto

MATI permite visualizar, analizar y registrar datos en tiempo real provenientes del monoplaza. El objetivo principal de la aplicación es analizar estos datos tanto en tiempo real como de forma posterior a pruebas o competencias, permitiendo así **optimizar el rendimiento del vehículo, prevenir incidencias o corregir errores**.

El sistema se conecta a potenciómetros y diversos sensores distribuidos en el vehículo mediante **WLAN (Wi-Fi)**. La comunicación se realiza haciendo uso del protocolo **LoRa**, enviando la información a un microcontrolador **ESP32** que actúa como receptor y puente de los datos.

A nivel técnico, el proyecto consta de un núcleo (*backend*) desarrollado en Python y una interfaz gráfica (*frontend*) construida con tecnologías web (HTML, CSS, JavaScript y Chart.js). Todo el sistema se compila y renderiza como una aplicación de escritorio gracias a la librería `pywebview`.

### 📊 Datos Analizados
MATI es capaz de recibir y procesar diversos parámetros del monoplaza, incluyendo:
*   Suspensión
*   Temperaturas
*   Freno y acelerador
*   RPM
*   Posición de giro (volante)
*   Fuerzas G (Radar de puntos GG / Diagrama de fricción)

### ⚙️ Características Principales
*   **Pestaña de Telemetría:** Visualización en vivo de los datos arrojados por los sensores.
*   **Pestaña de Gráficas:** Representación visual de los datos donde se pueden comparar múltiples variables al mismo tiempo.
*   **Historial de Datos:** Opción para revisar y cargar registros guardados internamente.
*   **Carga de Archivos `.csv`:** Posibilidad de importar datos de otras competencias o pruebas pasadas para analizarlos detalladamente mediante las gráficas integradas de forma post-competencia.

## 📦 Descarga e Instalación

Para obtener la versión más reciente y lista para usarse, ve a la sección de **Releases** en nuestro repositorio oficial de distribución y descarga el archivo correspondiente a tu sistema operativo (`.exe` para Windows y `.zip` para macOS):

👉 **[MATI-Releases](https://github.com/lexrammart/MATI-Releases)**

> **Nota:** *El código fuente de MATI es gestionado internamente por el Departamento de Electrónica de UAMOTORS. Los archivos ejecutables en el repositorio de Releases son generados y empaquetados de forma automática mediante GitHub Actions, incluyendo todas las dependencias necesarias sin requerir instalación manual.*

## 🛠️ Estructura del Código

A continuación, se detalla la estructura del código fuente de MATI para fines de desarrollo:

```text
MATI
├─ core
│  ├─ __init__.py
│  ├─ bridge.py
│  ├─ compat.py
│  ├─ db_manager.py
│  ├─ env.py
│  ├─ telemetry_api.py
│  ├─ updater.py
│  └─ utils.py
├─ frontend
│  ├─ assets
│  │  ├─ csv-icon.svg
│  │  ├─ icon-github.png
│  │  ├─ icon-mati-name-tag.png
│  │  ├─ icon.icns
│  │  ├─ icon.ico
│  │  ├─ logo-uam.jpg
│  │  ├─ logo-uamotors-redondo.jpg
│  │  ├─ logo-uamotors-tira.png
│  │  ├─ tira-uamotors.svg
│  │  └─ menu-bar
│  │     ├─ analisys-icon.svg
│  │     ├─ charts-icon.svg
│  │     ├─ connect-icon.svg
│  │     ├─ connect-icon2.svg
│  │     ├─ history-icon.svg
│  │     ├─ info-icon.svg
│  │     ├─ start-icon.svg
│  │     ├─ stop-icon.svg
│  │     └─ trash-icon.svg
│  ├─ css
│  │  ├─ base.css
│  │  ├─ charts.css
│  │  ├─ components.css
│  │  ├─ fonts.css
│  │  ├─ layout.css
│  │  ├─ main.css
│  │  └─ variables.css
│  ├─ fonts
│  │  ├─ Roboto-VariableFont_wdth,wght.ttf
│  │  └─ RobotoMono-VariableFont_wght.ttf
│  ├─ index.html
│  └─ javascript
│     ├─ app.js
│     ├─ chart.min.js
│     ├─ chartjs-zoom.min.js
│     ├─ charts.js
│     ├─ comms.js
│     ├─ state.js
│     └─ ui.js
├─ main.py
└─ version.txt
```

## 👥 Créditos y Autores

El desarrollo y concepto de este software es propiedad de **UAMOTORS**, diseñado y desarrollado por el **Departamento de Electrónica**.

**Equipo de desarrollo**:
*   **Andrés Montiel** - [@andrm23](https://github.com/andrm23)
*   **Alejandro Ramírez** - [@lexrammart](https://github.com/lexrammart)
