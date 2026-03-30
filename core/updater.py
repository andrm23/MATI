import urllib.request
import json
import ssl
import os
import sys


def get_app_version():
    if getattr(sys, "frozen", False):
        base_path = (
            sys._MEIPASS
            if hasattr(sys, "_MEIPASS")
            else os.path.dirname(sys.executable)
        )
    else:
        base_path = os.path.dirname(os.path.abspath(__file__))

    posibles_rutas = [
        os.path.join(base_path, "version.txt"),
        os.path.join(base_path, "..", "version.txt"),
        os.path.join(os.getcwd(), "version.txt"),
    ]

    for ruta in posibles_rutas:
        if os.path.exists(ruta):
            try:
                with open(ruta, "r", encoding="utf-8") as f:
                    return f.read().strip()
            except Exception:
                continue

    return "1.0.0"


ACTUAL_VERSION = get_app_version()


def check_update():
    """
    Consulta la API pública de GitHub para verificar si hay un nuevo Release.
    Retorna una tupla (True, dict_datos) si hay actualización, o None si estás al día.
    """
    url = "https://api.github.com/repos/lexrammart/MATI-Releases/releases/latest"

    try:
        #  PARCHE SSL
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE

        req = urllib.request.Request(url, headers={"User-Agent": "MATI-Updater"})

        with urllib.request.urlopen(req, timeout=3, context=ctx) as response:
            data = json.loads(response.read().decode())

        latest_version_tag = data.get("tag_name", "")

        # INFO para consola
        print(f"[*] INFO: GitHub dice que la última versión es: '{latest_version_tag}'")

        latest_version = latest_version_tag.replace("v", "").strip(" .")

        if not latest_version:
            print("Advertencia: El tag llegó vacío.")
            return None

        try:
            version_github = tuple(map(int, latest_version.split(".")))
            version_local = tuple(map(int, ACTUAL_VERSION.split(".")))
        except ValueError:
            print(f"Error matemático: El tag '{latest_version_tag}' no es válido.")
            return None

        changelog = data.get("body", "Mejoras de rendimiento y telemetría.")

        # Comparación final
        if version_github > version_local:
            datos_reales = {"version": latest_version, "changelog": changelog}
            return (True, datos_reales)

    except urllib.error.HTTPError as e:
        print(f"[*] ERROR: GitHub respondió con código {e.code}")
    except urllib.error.URLError as e:
        print(f"[*] INFO: Sin conexión a internet o DNS fallido. Modo offline activo.")
    except Exception as e:
        print(f"[*] ERROR inesperado en updater: {e}")

    return None
