import webview
import platform
import sys  # Agregamos sys para emergencias
from telemetry_api import TelemetryAPI
from core.bridge import handle_on_loaded
from core.utils import get_resource_path
from compat import apply_fixes

# 1. PARCHES DE COMPATIBILIDAD (Siempre al mero inicio)
apply_fixes()


def app_inicializacion():
    try:
        # 2. Definimos la ruta AQUÍ adentro para asegurar que el entorno esté listo
        html_path = get_resource_path("frontend/DashboardAndGraphics_V1.html")
        TITULO_APP = "MATI - UAMOTORS"

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
        # Esto te dirá el error real en la terminal si vuelve a fallar
        print(f"Error crítico en el arranque del MATI: {e}")


if __name__ == "__main__":
    app_inicializacion()
