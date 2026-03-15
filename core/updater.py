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

    if sistema == "Darwin":
        cloud_pattern = os.path.join(home, "Library/CloudStorage/GoogleDrive-*")
        folders = glob.glob(cloud_pattern)

        uam_folders = [f for f in folders if UAM_DOMAIN in f]
        target_folder = uam_folders if uam_folders else folders

        for instance in target_folder:
            for root in ROOTS:
                path_uam = os.path.join(instance, root, "UAMOTORS", PROJECT_NAME_FOLDER)
                if os.path.exists(path_uam):
                    return path_uam

                path_directo = os.path.join(instance, root, PROJECT_NAME_FOLDER)
                if os.path.exists(path_directo):
                    return path_directo

    elif sistema == "Windows":
        import string
        from ctypes import windll

        bitmask = windll.kernel32.GetLogicalDrives()

        for i in range(26):
            if bitmask & (1 << i):
                letra = string.ascii_uppercase[i]
                for root in ROOTS:
                    path_uam = os.path.join(
                        f"{letra}:", root, "UAMOTORS", PROJECT_NAME_FOLDER
                    )
                    if os.path.exists(path_uam):
                        return path_uam

                    path_directo = os.path.join(f"{letra}:", root, PROJECT_NAME_FOLDER)
                    if os.path.exists(path_directo):
                        return path_directo

    return None


def check_update():
    drive_path = get_drive_path()

    if not drive_path:
        return None

    json_path = os.path.join(drive_path, "version.json")

    try:
        if os.path.exists(json_path):
            with open(json_path, "r", encoding="utf-8") as f:
                data = json.load(f)

            remote_version = data.get("version", "0.0.0")

            if remote_version > ACTUAL_VERSION:
                return True, data
    except Exception:
        pass

    return None
