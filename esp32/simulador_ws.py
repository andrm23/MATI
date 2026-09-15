import asyncio
import websockets
import logging

# Configuramos el log para que use el formato solicitado
logging.basicConfig(level=logging.INFO, format="[SIM]: %(message)s")


async def handler(websocket):
    # Extraemos la IP del cliente que se conectó
    client_ip = websocket.remote_address[0]
    logging.info(f"Conectado a {client_ip}")

    try:
        # Mantenemos la conexión viva
        await websocket.wait_closed()
    except Exception:
        pass

    logging.info(f"Desconectado de {client_ip}")


async def main():
    host = "0.0.0.0"
    port = 81
    logging.info(f"Servidor simulador conectado en ws://127.0.0.1:{port}")

    # Arrancamos el servidor falso
    async with websockets.serve(handler, host, port):
        await asyncio.Future()  # Mantiene el script corriendo


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logging.info("Simulador detenido manualmente (Ctrl+C).")
