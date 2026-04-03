from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from api.sessions import router as sessions_router
from api.results import router as results_router
from api.chat import router as chat_router
from api.live import router as live_router
from api.settings import router as settings_router
from api.export import router as export_router
from utils.config import Config

app = FastAPI(
    title="MentorMetrics API",
    description="AI-powered mentorship session analysis platform",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(sessions_router)
app.include_router(results_router)
app.include_router(chat_router)
app.include_router(live_router)
app.include_router(settings_router)
app.include_router(export_router)

# Serve local uploads directory for video playback
Config.ensure_upload_dir()
uploads_dir = Config.UPLOAD_DIR
if os.path.exists(uploads_dir):
    app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

@app.get("/")
async def root():
    return {"message": "MentorMetrics API", "version": "1.0.0"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
