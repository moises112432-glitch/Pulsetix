import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api import auth, events, orders, promos, tickets, users, webhooks
from app.core.config import settings

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")

app = FastAPI(title="PulseTix API", version="0.1.0", redirect_slashes=False)

origins = [settings.FRONTEND_URL]
if settings.FRONTEND_URL.startswith("https://"):
    www = settings.FRONTEND_URL.replace("https://", "https://www.", 1)
    if www not in origins:
        origins.append(www)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(events.router)
app.include_router(orders.router)
app.include_router(promos.router)
app.include_router(tickets.router)
app.include_router(users.router)
app.include_router(webhooks.router)


os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/api/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


@app.get("/api/health")
async def health():
    return {"status": "ok"}
