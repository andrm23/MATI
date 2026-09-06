# Guía de Contribución - MATI

¡Bienvenidx al repositorio de **[MATI](https://github.com/andrm23/MATI)** (Measurement And Telemetry Insights) del equipo UAMOTORS! 🏎️

### Tecnologías Principales

Para trabajar en este proyecto, necesitas nociones básicas de:

- **[Python](https://www.python.org/):** El lenguaje principal del núcleo (_backend_). Maneja la lectura de datos, comunicaciones y lógica de la aplicación.
- **[pywebview](https://pywebview.flowrl.com/):** Librería utilizada para renderizar la aplicación web como una aplicación de escritorio multiplataforma.
- **[JavaScript](https://developer.mozilla.org/es/docs/Web/JavaScript) & [Chart.js](https://www.chartjs.org/):** Para la interfaz de usuario (_frontend_), manejo de eventos y renderizado de las gráficas de telemetría.
- **HTML & CSS:** Estructura y estilos para el _Dashboard_ y los distintos paneles de la aplicación.

### Instalación y Desarrollo Local

1. **Requisitos previos:** Asegúrate de tener instalado [Python](https://www.python.org/downloads/) (versión 3.10 o superior recomendada).

2. **Clonar el proyecto:**

   ```bash
   git clone https://github.com/andrm23/MATI.git
   cd MATI
   ```

3. **Crear entorno virtual e instalar dependencias:**

   Te recomendamos usar un entorno virtual para no afectar tus otras instalaciones de Python.

   ```bash
   python -m venv venv
   ```

   **En Windows:**

   ```
   venv\Scripts\activate

   pip install -r requirements.txt
   ```

   **En macOS/Linux:**

   ```
   source venv/bin/activate

   pip3 install -r requirements.txt
   ```

4. **Correr en modo desarrollo:**

   Dependiendo de tu sistema operativo, puedes ejecutar desde tu terminal los scripts preparados:
   - **Windows:** Ejecuta el archivo `run_dev.bat`
   - **macOS/Linux:** Ejecuta `./run_dev.sh`
   - O simplemente ejecuta Python manualmente:
     ```bash
     python main.py
     ```

### ¿Dónde encuentro cada cosa?

- **Núcleo (`core/`):** Contiene la lógica en Python (el _backend_). Aquí encontrarás la conexión a la base de datos local, la API de telemetría, puente de comunicación (`bridge.py`) y lectura de datos.
- **Interfaz Gráfica (`frontend/`):** Carpeta que contiene la aplicación web.
  - `css/`: Estilos de la aplicación organizados por módulos.
  - `javascript/`: Lógica del lado del cliente, dibujo de gráficas y parseo de CSVs.
  - `assets/`: Imágenes, iconos y logos.
  - `index.html`: La vista principal del Dashboard.
- **Entrada Principal (`main.py`):** Archivo raíz que inicializa la ventana de `pywebview` e integra el _core_ con el _frontend_.

### Plantillas de GitHub (Issues y Pull Requests)

Para mantener el orden en el proyecto, te pediremos que uses nuestros formatos predeterminados:

- **¿Encontraste un error de lectura o en la interfaz?** En GitHub Ve a la pestaña de _Issues_, dale a _New Issue_ y selecciona **Reporte de Bug**. Llenarás un formato con los pasos para reproducir el error en caso de ser replicable.
- **¿Tienes una idea para una nueva función (ej. nueva gráfica)?** Selecciona **Nueva Función / Mejora** para proponerla.
- **Pull Requests:** Al proponer tus cambios de código, asegúrate de describir qué partes del Dashboard o backend se modificaron y marca las casillas de revisión pertinentes.

### Flujo de Trabajo (Cómo subir tus cambios)

Para mantener el código limpio y estable en la rama principal (`main`), sigue este proceso:

#### Pasos a seguir:

1. **Nunca trabajes directamente en `main`.** Crea una rama nueva para la tarea que vayas a realizar usando uno de los prefijos de nomenclatura:

   ```bash
   git checkout -b feature/nueva-grafica-suspension
   # o si es para arreglar un error:
   git checkout -b fix/error-conexion-lora
   ```

   > [!WARNING]
   > Las versiones ejecutables se generan de manera automática mediante GitHub Actions al crear _Releases_ o actualizaciones en la rama principal. No es necesario compilar ni subir los ejecutables (`.exe`, `.app`) al repositorio de código fuente.

   > **Nomenclatura de Ramas y Commits**
   > Utilizamos los siguientes prefijos para estandarizar las ramas y los mensajes de los _commits_:
   >
   > | **Prefijo**        | **Uso**                                                 | **Ejemplo**                      |
   > | ------------------ | ------------------------------------------------------- | -------------------------------- |
   > | `feature/` `feat/` | Nueva funcionalidad                                     | `feature/dark-mode-toggle`       |
   > | `fix/`             | Solución de errores (_bugs_)                            | `fix/serial-port-error`          |
   > | `hotfix/`          | Soluciones críticas                                     | `hotfix/app-crash-on-start`      |
   > | `refactor/`        | Reestructuración de código (sin nuevas funciones)       | `refactor/db-manager`            |
   > | `docs/`            | Actualizaciones en documentación                        | `docs/api-v2-update`             |
   > | `test/`            | Cambios relacionados a pruebas                          | `test/unit-coverage-improvement` |
   > | `perf/`            | Optimizaciones de rendimiento                           | `perf/chart-render-optimization` |
   > | `chore/`           | Tareas de mantenimiento (dependencias, configuraciones) | `chore/update-requirements`      |
   > | `experiment/`      | Trabajo experimental o pruebas                          | `experiment/new-ui-layout`       |
   > | `release/`         | Preparación para lanzamiento                            | `release/v2.5.0`                 |
   >
   > <br>

2. **Haz tus cambios y guárdalos (commit):** Usa mensajes claros explicando qué hiciste. (En los commits suele usarse el prefijo sin la diagonal, ej: `feat:`, `fix:`, `chore:`).
   ```bash
   git add .
   git commit -m "feature: agregar nueva vista de telemetría"
   ```
3. **Sube tu rama a GitHub:**
   ```bash
   git push origin nombre-de-tu-rama
   ```
4. **Crea un Pull Request (PR):** Ve a GitHub y abre un Pull Request. Pídele a otro administrador o compañero del equipo que revise tu código antes de fusionarlo (_merge_) a `main`.
   <br>

   > **Alternativa: Usar la interfaz de VS Code (Source Control)**
   >
   > Si prefieres no usar la terminal, puedes hacer todo esto de forma visual usando la pestaña de **Source Control** integrada en VS Code (el ícono con tres ramitas en la barra lateral izquierda).
   >
   > _Para que esta herramienta funcione, debes tener **Git** instalado en tu sistema_:
   >
   > - **Windows:** Descarga e instala el instalador oficial desde [git-scm.com](https://git-scm.com/download/win).
   > - **Mac:** Abre la terminal y ejecuta `xcode-select --install` (o descárgalo en [git-scm.com](https://git-scm.com/download/mac)).
   >
   > <br>Pasos en VS Code:
   >
   > - **Crear rama:** Da clic en el nombre de la rama actual (`main`) en la barra azul de hasta abajo a la izquierda y selecciona _Create new branch_.
   > - **Hacer Commit:** Ve a la pestaña **Source Control**. Pasa el mouse sobre tus archivos modificados y dale al **`+`** para prepararlos. Luego, escribe tu mensaje (ej. `feat: agregar boton reconectar`) en la caja de texto y presiona el botón azul **Commit**.
   >   > [!WARNING]
   >   > No hagas commit sin agregar un mensaje, te dará error.
   > - **Subir cambios:** Una vez hecho el commit, el botón azul cambiará a **Publish Branch** (o Sync Changes). Dale clic para subir tu rama a GitHub.
   >   <br>

### Estilo de Código y Formato

Procura mantener el código limpio y ordenado:

- **Para Python:** Se sugiere seguir las convenciones de [PEP 8](https://peps.python.org/pep-0008/). Intenta utilizar _docstrings_ para explicar el propósito de nuevas funciones y clases en el núcleo del sistema.
- **Para Frontend (HTML, CSS, JS):** Mantén un indentado consistente. En Visual Studio Code, se recomienda usar formateadores como **Prettier** configurados para ejecutarse al guardar (_Format on Save_).

---
