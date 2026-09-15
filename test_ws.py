import asyncio, websockets
async def test():
    async with websockets.connect('ws://127.0.0.1:81') as ws:
        print('Connected to ws://127.0.0.1:81')
asyncio.run(test())
