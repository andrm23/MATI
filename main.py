import webview
import sys  # DO NOT DELETE THIS LINE/LIBRARY
from core.telemetry_api import TelemetryAPI
from core.bridge import handle_on_loaded
from core.utils import get_resource_path
from core.logger import exception_handler, check_send_crashes_async


def app_inicializacion():

    sys.excepthook = exception_handler
    check_send_crashes_async()

    try:
        # Se define la ruta para asegurar que el entorno esté listo
        html_path = get_resource_path("frontend/index.html")
        TITULO_APP = "MATI"

        # Instancia del API
        api = TelemetryAPI()

        screens = webview.screens
        if not screens:
            width, height = 1280, 800
        else:
            width, height = screens[0].width, screens[0].height

        ventana = webview.create_window(
            TITULO_APP,
            str(html_path),
            js_api=api,
            width=width,
            height=height,
            resizable=True,
        )

        # Arranque de motor
        api.set_window(ventana)
        ventana.events.closed += api.on_closing
        webview.start(handle_on_loaded, ventana, debug=False)

    except Exception as e:
        print(f"Error crítico en el arranque del MATI: {e}")


if __name__ == "__main__":
    app_inicializacion()
