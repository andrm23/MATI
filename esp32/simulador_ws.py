import asyncio
import websockets


async def handler():
    try:
        await websocket.await_closed()
    except websockets.exceptions.ConnectionClosedOK:
        pass


async def main():
    async with websockets.serve(handler, "0.0.0.0", 81)


if __name__ == "__main__":
    asyncio.run(main())
