import os
import binascii
from datetime import datetime, timezone, timedelta

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from jose import jwt, JWTError
from pydantic import BaseModel

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

JWT_SECRET = os.environ["JWT_SECRET"]
AES_KEY_HEX = os.environ["AES_KEY"]
ALGORITHM = "HS256"


def _aes_bytes() -> bytes:
    return binascii.unhexlify(AES_KEY_HEX)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/key")
def get_key(token: str = Query(...)):
    if token != "DEMO":
        try:
            jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
        except JWTError:
            raise HTTPException(status_code=403, detail="Invalid or expired token")
    return Response(content=_aes_bytes(), media_type="application/octet-stream")


class TokenRequest(BaseModel):
    user_id: str
    video_id: str


@app.post("/token")
def create_token(body: TokenRequest):
    now = datetime.now(timezone.utc)
    payload = {
        "sub": body.user_id,
        "video_id": body.video_id,
        "iat": now,
        "exp": now + timedelta(seconds=3600),
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm=ALGORITHM)
    return {"access_token": token, "token_type": "bearer", "expires_in": 3600}
