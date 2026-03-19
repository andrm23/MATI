import json
import time
import threading
from core.updater import check_update


def run_update_logic(window):
    """Función interna para correr en un hilo secundario."""
    time.sleep(2)
    update_info = check_update()

    if update_info:
        datos_reales = update_info[1]
        data_json = json.dumps(datos_reales)
        window.evaluate_js(f"showUpdateNotification({data_json})")


def handle_on_loaded(window):
    """Se ejecuta al cargar la ventana"""
    t = threading.Thread(target=run_update_logic, args=(window,))
    t.daemon = True
    t.start()


# def handle_on_loaded(window):
#     time.sleep(2)

#     update_info = check_update()

#     if update_info:
#         datos_reales = update_info[1]
#         data_json = json.dumps(datos_reales)

#         window.evaluate_js(f"showUpdateNotification({data_json})")
