import urllib.request
import json

# Aquí vas a controlar tu versión local (la que estás programando)
ACTUAL_VERSION = "1.1.4"


def check_update():
    """
    Consulta la API pública de GitHub para verificar si hay un nuevo Release.
    Retorna una tupla (True, dict_datos) si hay actualización, o None si estás al día.
    """
    # Esta es la API oficial de GitHub apuntando a tu repo público
    url = "https://api.github.com/repos/lexrammart/MATI-Releases/releases/latest"
    # url = "https://api.github.com/repos/microsoft/vscode/releases/latest"

    try:
        # Hacemos la petición (simulando ser un navegador básico para que GitHub no nos bloquee)
        req = urllib.request.Request(url, headers={"User-Agent": "MATI-Updater"})
        with urllib.request.urlopen(req, timeout=5) as response:
            data = json.loads(response.read().decode())

        # GitHub guarda la versión en "tag_name" (ej. "v1.1.1")
        latest_version_tag = data.get("tag_name", "")

        # Le quitamos la 'v' para poder comparar los puros números
        latest_version = latest_version_tag.replace("v", "")

        # El cuerpo del Release en GitHub nos servirá como changelog
        changelog = data.get("body", "Mejoras de rendimiento y telemetría.")

        # Si la versión de GitHub es mayor a la tuya, disparamos la alerta
        if latest_version > ACTUAL_VERSION:
            datos_reales = {"version": latest_version, "changelog": changelog}
            return (True, datos_reales)

    except Exception as e:
        print(f"Error al conectar con GitHub para buscar actualizaciones: {e}")

    return None
