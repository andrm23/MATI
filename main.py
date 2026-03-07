import webview
import sys
import os
import traceback
from db_manager import TelemetryDB
from pathlib import Path
from telemetry_api import TelemetryAPI

# --- PARCHE ANTI-CRASH PARA MACOS EN MODO WINDOWED ---
if sys.stdout is None:
    sys.stdout = open(os.devnull, "w")
if sys.stderr is None:
    sys.stderr = open(os.devnull, "w")
# ------------------------------------------------------


def obtencion_ruta_html(ruta_relativa):
    """Obtención de la ruta absoluta del archivo .html"""
    try:
        base_path = Path(sys._MEIPASS)
    except:
        base_path = Path(__file__).resolve().parent

    return base_path / ruta_relativa


html_path = obtencion_ruta_html("frontend/DashboardAndGraphics_V1.html")
TITULO_APP = "MATI v1.0.1"


def app_inicializacion():

    try:
        # instancia del API de telemetría
        api = TelemetryAPI()

        # creación de la ventana
        pantalla = webview.screens[0]

        ventana = webview.create_window(
            TITULO_APP,
            str(html_path),
            js_api=api,
            width=pantalla.width,
            height=pantalla.height,
            resizable=True,
            min_size=(800, 600),
        )

        # arranque de motor de renderizado
        api.set_window(ventana)
        ventana.events.closed += api.on_closing
        webview.start(debug=False)

    except Exception as e:
        print(f"Error al iniciar la app: {e}")


if __name__ == "__main__":
    app_inicializacion()
