import urllib.request
from core.logger import log
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
        os.path.join(base_path, "core", "version.txt"),
        os.path.join(os.getcwd(), "core", "version.txt"),
    ]

    for ruta in posibles_rutas:
        if os.path.exists(ruta):
            try:
                with open(ruta, "r", encoding="utf-8") as f:
                    return f.read().strip()
            except Exception:
                continue

    return "1.5.0"


ACTUAL_VERSION = get_app_version()


def check_update():
    """
    Consulta la API pública de GitHub para verificar si hay un nuevo Release.
    Retorna una tupla (True, dict_datos) si hay actualización, o None si estás al día.
    """
    url = "https://api.github.com/repos/lexrammart/MATI-Releases/releases/latest"

    try:
        #  PARCHE SSL
        ctx = ssl._create_unverified_context()

        req = urllib.request.Request(url, headers={"User-Agent": "MATI-Updater"})

        with urllib.request.urlopen(req, timeout=3, context=ctx) as response:
            data = json.loads(response.read().decode())

        latest_version_tag = data.get("tag_name", "")

        # INFO para consola
        log.info(f"La última versión en GitHub es: '{latest_version_tag}'")

        latest_version = latest_version_tag.replace("v", "").strip(" .")

        if not latest_version:
            log.warning("Advertencia: El tag llegó vacío.")
            return None

        try:
            # Limpiar sufijos (ej: "1.7.0-FSAE" -> "1.7.0") tomando solo la parte antes del guion o espacio
            clean_github = latest_version.split("-")[0].split(" ")[0]
            clean_local = ACTUAL_VERSION.split("-")[0].split(" ")[0]
            
            version_github = tuple(map(int, clean_github.split(".")))
            version_local = tuple(map(int, clean_local.split(".")))
        except ValueError:
            log.error(f"Error matemático evaluando versiones: github='{latest_version}', local='{ACTUAL_VERSION}'")
            return None

        changelog = data.get("body", "Mejoras de rendimiento y telemetría.")

        # Comparación final
        if version_github > version_local:
            datos_reales = {"version": latest_version, "changelog": changelog}
            return (True, datos_reales)

    except urllib.error.HTTPError as e:
        log.error(f"GitHub respondió con código {e.code}")
    except urllib.error.URLError as e:
        log.info("Sin conexión a internet o DNS fallido. Modo offline activo.")
    except Exception as e:
        log.error(f"Error inesperado en updater: {e}")

    return None
