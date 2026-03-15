import os
import json
import platform
import glob
import logging

logger = logging.getLogger("MATI_updater")
logger.addHandler(logging.NullHandler())

ACTUAL_VERSION = "1.0.1"
PROJECT_NAME_FOLDER = "MATI_updater"
UAM_DOMAIN = "@azc.uam.mx"


def get_drive_path():
    sistema = platform.system()
    home = os.path.expanduser("~")
    ROOTS = ["Mi unidad", "My Drive", "Unidades compartidas", "Shared Drives"]

    SUB_PATH = os.path.join(
        "UAMOTORS",
        "2026",
        "Design",
        "Electronics",
        "Data-Code telemetry",
        "MATI",
        PROJECT_NAME_FOLDER,
    )

    if sistema == "Darwin":
        cloud_pattern = os.path.join(home, "Library/CloudStorage/GoogleDrive-*")
        folders = glob.glob(cloud_pattern)

        uam_folders = [f for f in folders if UAM_DOMAIN in f]
        target_folder = uam_folders if uam_folders else folders

        for instance in target_folder:
            for root in ROOTS:

                path_uam = os.path.join(instance, root, SUB_PATH)
                if os.path.exists(path_uam):
                    return path_uam

    elif sistema == "Windows":
        import string
        from ctypes import windll

        bitmask = windll.kernel32.GetLogicalDrives()

        for i in range(26):
            if bitmask & (1 << i):
                letra = string.ascii_uppercase[i]
                for root in ROOTS:

                    path_uam = os.path.join(f"{letra}:", root, SUB_PATH)
                    if os.path.exists(path_uam):
                        return path_uam

    return None


def check_update():
    drive_path = get_drive_path()
    print(f"🔍 DEBUG: Ruta del Drive detectada -> {drive_path}")

    if not drive_path:
        print("🔍 DEBUG: ¡No se encontró la carpeta MATI_updater en el Drive!")
        return None

    json_path = os.path.join(drive_path, "version.json")
    print(f"🔍 DEBUG: Buscando el archivo en -> {json_path}")
    print(f"🔍 DEBUG: ¿El archivo existe físicamente? -> {os.path.exists(json_path)}")

    try:
        if os.path.exists(json_path):
            with open(json_path, "r", encoding="utf-8") as f:
                data = json.load(f)

            remote_version = data.get("version", "0.0.0")
            print(
                f"🔍 DEBUG: Versión remota (Drive) -> {remote_version} | Versión local (Código) -> {ACTUAL_VERSION}"
            )

            if remote_version > ACTUAL_VERSION:
                print("🔍 DEBUG: ¡Actualización detectada! Mandando señal al Bridge...")
                return True, data
            else:
                print("🔍 DEBUG: La versión local es igual o mayor. No hay update.")
    except Exception as e:
        print(f"🔍 DEBUG: ¡Error al leer el JSON! -> {e}")

    return None
