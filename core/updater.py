import urllib.request
import json
import ssl

ACTUAL_VERSION = "1.1.6"


def check_update():
    """
    Consulta la API pública de GitHub para verificar si hay un nuevo Release.
    Retorna una tupla (True, dict_datos) si hay actualización, o None si estás al día.
    """
    # Esta es la API oficial de GitHub apuntando a tu repo público
    url = "https://api.github.com/repos/lexrammart/MATI-Releases/releases/latest"

    try:
        # 1. EL PARCHE SSL: Creamos un contexto que ignora la verificación del certificado
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE

        # Hacemos la petición (simulando ser un navegador básico para que GitHub no nos bloquee)
        req = urllib.request.Request(url, headers={"User-Agent": "MATI-Updater"})

        # Le pasamos el contexto SSL modificado a la petición
        with urllib.request.urlopen(req, timeout=5, context=ctx) as response:
            data = json.loads(response.read().decode())

        # GitHub guarda la versión en "tag_name" (ej. "v1.1.5")
        latest_version_tag = data.get("tag_name", "")

        # Le quitamos la 'v' y espacios fantasma
        latest_version = latest_version_tag.replace("v", "").strip()

        # 2. EL PARCHE MATEMÁTICO: Convertimos "1.1.5" a (1, 1, 5) para comparar exacto
        version_github = tuple(map(int, latest_version.split(".")))
        version_local = tuple(map(int, ACTUAL_VERSION.split(".")))

        # El cuerpo del Release en GitHub nos servirá como changelog
        changelog = data.get("body", "Mejoras de rendimiento y telemetría.")

        # Si la versión de GitHub es mayor a la tuya, disparamos la alerta
        if version_github > version_local:
            datos_reales = {"version": latest_version, "changelog": changelog}
            return (True, datos_reales)

    except Exception as e:
        print(f"Error al conectar con GitHub para buscar actualizaciones: {e}")

    return None
