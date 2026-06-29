import os

from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import PlainTextResponse
from pathlib import Path

app = FastAPI()
DATA_DIR = Path(os.environ.get("DATA_DIR", "./data"))
DATA_FILE = DATA_DIR / "note.md"


@app.get("/api/note")
async def get_note():
    if DATA_FILE.exists():
        return PlainTextResponse(DATA_FILE.read_text())
    return PlainTextResponse("")


@app.put("/api/note")
async def put_note(request: Request):
    body = await request.body()
    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    DATA_FILE.write_text(body.decode("utf-8"))
    return {"status": "ok"}


app.mount("/", StaticFiles(directory="static", html=True), name="static")
