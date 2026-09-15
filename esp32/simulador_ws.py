import asyncio
import json
import websockets
from core.logger import log


async def handler(websocket):
    client_ip = websocket.remote_address[0]
    log.info(f"[SIM]: Conectado a {client_ip}")

    # Definir valores constantes de prueba
    datos_prueba = {
        "g": 1.5, "x": 0.8, "y": -0.8, "phi": 15,
        "acel": 40, "fren": -10,
        "fi": 5, "fd": 5, "ti": -5, "td": -5,
        "tfi": 80, "tfd": 80, "tti": 80, "ttd": 80,
        "rpmFi": 3500, "rpmFd": 3500, "rpmTi": 3500, "rpmTd": 3500
    }

    # Convertir diccionario a formato JSON
    mensaje_json = json.dumps(datos_prueba)

    try:
        # Enviar datos en bucle a 10Hz
        while True:
            await websocket.send(mensaje_json)
            await asyncio.sleep(0.1)
    except websockets.exceptions.ConnectionClosed:
        pass
    except Exception as e:
        log.error(f"[SIM]: Error inesperado: {e}")

    log.info(f"[SIM]: Desconectado de {client_ip}")


async def main():
    host = "localhost"
    port = 8181
    log.info(f"[SIM]: Servidor simulador escuchando en ws://{host}:{port}")

    async with websockets.serve(handler, host, port):
        await asyncio.Future()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        log.info("[SIM]: Simulador detenido manualmente.")
