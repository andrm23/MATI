import json
import time
from core.updater import check_update


def handle_on_loaded(window):
    time.sleep(2)

    update_info = check_update()

    if update_info:
        datos_reales = update_info[1]
        data_json = json.dumps(datos_reales)

        window.evaluate_js(f"showUpdateNotification({data_json})")
