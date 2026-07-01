import os
import time
import logging
import binascii
from datetime import datetime, timezone, timedelta

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from jose import JWTError, jwt
from pydantic import BaseModel

# =============================================================================
# Logging configuration
# =============================================================================

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
)

logger = logging.getLogger("vsecure-key-server")

# =============================================================================
# FastAPI application
# =============================================================================

app = FastAPI(
    title="VSecure Key Server",
    description="JWT-protected AES-128 key server for secure HLS streaming.",
    version="1.2.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# =============================================================================
# Request logging middleware
# =============================================================================

@app.middleware("http")
async def log_requests(request: Request, call_next):
    """
    Log every HTTP request with its execution time.
    """

    start_time = time.perf_counter()

    response = await call_next(request)

    duration_ms = (time.perf_counter() - start_time) * 1000

    logger.info(
        "%s %s | %s | %.2f ms",
        request.method,
        request.url.path,
        response.status_code,
        duration_ms,
    )

    return response


# =============================================================================
# Configuration
# =============================================================================

JWT_SECRET = os.getenv("JWT_SECRET")
AES_KEY_HEX = os.getenv("AES_KEY")
ALGORITHM = "HS256"

if not JWT_SECRET:
    raise RuntimeError(
        "JWT_SECRET environment variable is missing. "
        "Please create a .env file before starting the application."
    )

if not AES_KEY_HEX:
    raise RuntimeError(
        "AES_KEY environment variable is missing. "
        "Generate one using 'bash scripts/gen_key.sh'."
    )

try:
    AES_KEY_BYTES = binascii.unhexlify(AES_KEY_HEX)
except binascii.Error as exc:
    raise RuntimeError(
        "AES_KEY must be a valid hexadecimal string."
    ) from exc

if len(AES_KEY_BYTES) != 16:
    raise RuntimeError(
        "AES_KEY must contain exactly 32 hexadecimal characters (AES-128)."
    )


def get_aes_key() -> bytes:
    """
    Return the AES-128 encryption key.
    """
    return AES_KEY_BYTES


# =============================================================================
# Models
# =============================================================================

class TokenRequest(BaseModel):
    user_id: str
    video_id: str


# =============================================================================
# API Endpoints
# =============================================================================

@app.get("/health", tags=["Monitoring"])
def health():
    """
    Health check endpoint.
    """

    return {
        "status": "ok",
        "service": "key-server",
        "version": "1.2.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.post("/token", tags=["Authentication"])
def create_token(body: TokenRequest):
    """
    Generate a temporary JWT used to access the AES key.
    """

    now = datetime.now(timezone.utc)

    payload = {
        "sub": body.user_id,
        "video_id": body.video_id,
        "iat": now,
        "exp": now + timedelta(hours=1),
    }

    token = jwt.encode(
        payload,
        JWT_SECRET,
        algorithm=ALGORITHM,
    )

    logger.info(
        "JWT generated | user=%s | video=%s",
        body.user_id,
        body.video_id,
    )

    return {
        "access_token": token,
        "token_type": "bearer",
        "expires_in": 3600,
    }


@app.get("/key", tags=["Encryption"])
def get_key(token: str = Query(...)):
    """
    Return the AES-128 encryption key.

    During development the DEMO token is accepted.
    In production only valid JWT tokens should be accepted.
    """

    if token == "DEMO":
        logger.info("AES key delivered using DEMO token")

        return Response(
            content=get_aes_key(),
            media_type="application/octet-stream",
        )

    try:
        payload = jwt.decode(
            token,
            JWT_SECRET,
            algorithms=[ALGORITHM],
        )

    except JWTError:

        logger.warning("Access denied - invalid or expired JWT")

        raise HTTPException(
            status_code=403,
            detail="Invalid or expired token",
        )

    logger.info(
        "AES key delivered | user=%s | video=%s",
        payload.get("sub"),
        payload.get("video_id"),
    )

    return Response(
        content=get_aes_key(),
        media_type="application/octet-stream",
    )
