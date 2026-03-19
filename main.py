import webview
import platform
from telemetry_api import TelemetryAPI
from core.bridge import handle_on_loaded
from core.utils import get_resource_path
from compat import apply_fixes

# parches de compatibilidad
apply_fixes()

# ruta del HTML
html_path = get_resource_path("frontend/DashboardAndGraphics_V1.html")
TITULO_APP = "MATI"


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
        )

        # arranque de motor de renderizado
        api.set_window(ventana)
        ventana.events.closed += api.on_closing
        webview.start(handle_on_loaded, ventana, debug=False)

    except Exception as e:
        print(f"Error al iniciar la app: {e}")


if __name__ == "__main__":
    app_inicializacion()
