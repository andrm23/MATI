import os
import platform
import subprocess
import json
import webview
from core.updater import check_update, get_drive_path


class MATIApi:
    def open_drive_folder(self):
        path = get_drive_path()
        if path and os.path.exists(path):

            if platform.system() == "Darwin":
                subprocess.run(["open", path])

            else:
                os.startfile(path)

    def open_external_link(self, url):
        if platform.system() == "Darwin":
            subprocess.run(["open", url])
        else:
            os.startfile(url)

    def handle_on_loaded(window):
        update_info = check_update()
        if update_info:
            data_json = json.dumps(update_info)
            window.evaluate_js(f"showUpdateNotification({data_json})")
