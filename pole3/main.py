import asyncio
import os
import shutil
import tempfile
import urllib.request

from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from pipeline import analyze_video
from ingest import ingest_video

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

HLS_PLAYLIST = os.getenv(
    "HLS_PLAYLIST",
    r"C:\Users\ashra\Desktop\hackathon\pole2\hls\output.m3u8",
)
HLS_DIR = os.path.dirname(HLS_PLAYLIST)
POLE2_DIR = os.path.dirname(HLS_DIR)

_hls_cache: dict | None = None

app = FastAPI(
    title="V-Secure AI Pipeline",
    description="Pipeline IA : transcription vidéo → NLP → API REST",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DEMO_RESPONSE = {
    "transcript": [
        {"start": 0.0, "end": 5.2, "text": "Bienvenue dans cette présentation V-Secure."},
        {"start": 5.2, "end": 14.8, "text": "Nous allons découvrir les fonctionnalités de notre plateforme vidéo B2B."},
        {"start": 14.8, "end": 25.0, "text": "La solution garantit confidentialité et collaboration en temps réel."},
        {"start": 25.0, "end": 38.0, "text": "Les administrateurs contrôlent les accès et les droits de visionnage."},
        {"start": 38.0, "end": 52.0, "text": "L'intelligence artificielle génère automatiquement les résumés et chapitres."},
        {"start": 52.0, "end": 60.0, "text": "Merci pour votre attention."},
    ],
    "summary": (
        "V-Secure est une plateforme vidéo B2B sécurisée permettant la collaboration en entreprise. "
        "Elle intègre un pipeline IA pour la transcription automatique, la génération de chapitres et de résumés. "
        "Les fonctionnalités de gestion des droits d'accès garantissent la confidentialité des contenus."
    ),
    "chapters": [
        {
            "id": "ch1",
            "title": "Introduction",
            "start": 0.0,
            "end": 20.0,
            "description": "Présentation de la plateforme V-Secure et de ses objectifs.",
        },
        {
            "id": "ch2",
            "title": "Gestion des accès",
            "start": 20.0,
            "end": 45.0,
            "description": "Contrôle des droits utilisateurs et sécurité des contenus.",
        },
        {
            "id": "ch3",
            "title": "Pipeline IA",
            "start": 45.0,
            "end": 60.0,
            "description": "Présentation des fonctionnalités d'analyse automatique par IA.",
        },
    ],
    "keywords": ["collaboration", "sécurité", "vidéo", "B2B", "intelligence artificielle"],
    "language": "fr",
    "duration": 60.0,
}

ALLOWED_EXTENSIONS = {".mp4", ".webm", ".mkv", ".mov", ".avi"}


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/analyze/hls")
async def analyze_hls():
    """Analyse la vidéo HLS locale via Whisper + Groq (résultat mis en cache)."""
    global _hls_cache

    if _hls_cache is not None:
        return JSONResponse(content=_hls_cache)

    if not GROQ_API_KEY:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY non configurée")

    if not os.path.exists(HLS_PLAYLIST):
        raise HTTPException(
            status_code=404,
            detail=f"Playlist HLS introuvable: {HLS_PLAYLIST}",
        )

    try:
        result = await asyncio.to_thread(analyze_video, HLS_PLAYLIST, GROQ_API_KEY)
        _hls_cache = result
        return JSONResponse(content=result)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/analyze")
async def analyze(request: Request, demo: bool = Query(False)):
    if demo:
        return JSONResponse(content=DEMO_RESPONSE)

    if not GROQ_API_KEY:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY non configurée")

    content_type = request.headers.get("content-type", "")
    tmp_dir = tempfile.mkdtemp()

    try:
        if "multipart/form-data" in content_type:
            form = await request.form()
            uploaded = form.get("file")
            if not uploaded:
                raise HTTPException(status_code=400, detail="Champ 'file' manquant dans le formulaire")

            filename = getattr(uploaded, "filename", None) or "upload.mp4"
            ext = os.path.splitext(filename)[1].lower() or ".mp4"
            if ext not in ALLOWED_EXTENSIONS:
                raise HTTPException(
                    status_code=415,
                    detail=f"Format non supporté: {ext}. Formats acceptés: {', '.join(ALLOWED_EXTENSIONS)}",
                )

            video_path = os.path.join(tmp_dir, f"upload{ext}")
            with open(video_path, "wb") as fout:
                fout.write(await uploaded.read())

        elif "application/json" in content_type:
            body = await request.json()
            url = (body.get("url") or "").strip()
            if not url:
                raise HTTPException(status_code=400, detail="Champ 'url' manquant dans le corps JSON")

            video_path = os.path.join(tmp_dir, "video.mp4")
            try:
                urllib.request.urlretrieve(url, video_path)
            except Exception as exc:
                raise HTTPException(status_code=400, detail=f"Impossible de télécharger l'URL: {exc}")

        else:
            raise HTTPException(
                status_code=415,
                detail=(
                    "Content-Type non supporté. "
                    "Utilisez multipart/form-data avec le champ 'file' "
                    "ou application/json avec le champ 'url'."
                ),
            )

        result = await asyncio.to_thread(analyze_video, video_path, GROQ_API_KEY)
        return JSONResponse(content=result)

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)


@app.post("/ingest")
async def ingest(request: Request):
    """Ingère une nouvelle vidéo (upload ou URL) et remplace le flux HLS en cours."""
    global _hls_cache

    content_type = request.headers.get("content-type", "")
    tmp_dir = tempfile.mkdtemp()

    try:
        if "multipart/form-data" in content_type:
            form = await request.form()
            uploaded = form.get("file")
            if not uploaded:
                raise HTTPException(status_code=400, detail="Champ 'file' manquant dans le formulaire")

            filename = getattr(uploaded, "filename", None) or "upload.mp4"
            ext = os.path.splitext(filename)[1].lower() or ".mp4"
            if ext not in ALLOWED_EXTENSIONS:
                raise HTTPException(
                    status_code=415,
                    detail=f"Format non supporté: {ext}. Formats acceptés: {', '.join(ALLOWED_EXTENSIONS)}",
                )

            video_path = os.path.join(tmp_dir, f"upload{ext}")
            with open(video_path, "wb") as fout:
                fout.write(await uploaded.read())

            source: str = video_path
            is_url = False

        elif "application/json" in content_type:
            body = await request.json()
            url = (body.get("url") or "").strip()
            if not url:
                raise HTTPException(status_code=400, detail="Champ 'url' manquant dans le corps JSON")

            source = url
            is_url = True

        else:
            raise HTTPException(
                status_code=415,
                detail=(
                    "Content-Type non supporté. "
                    "Utilisez multipart/form-data avec le champ 'file' "
                    "ou application/json avec le champ 'url'."
                ),
            )

        try:
            await asyncio.to_thread(ingest_video, source, is_url, HLS_DIR, POLE2_DIR)
        except Exception as exc:
            raise HTTPException(status_code=500, detail=str(exc))

        _hls_cache = None
        return JSONResponse(content={"status": "ok"})

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)
