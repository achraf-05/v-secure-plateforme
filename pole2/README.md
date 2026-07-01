# 🔐 VSecure – Pole 2: Zero-Trust Secure Streaming Infrastructure

Pole 2 is responsible for the secure video streaming infrastructure of the **VSecure Hackathon** project.

It provides an end-to-end encrypted **HLS (HTTP Live Streaming)** workflow using **AES-128 encryption** while protecting the encryption key through **JWT authentication**.

The objective is to ensure that video content remains inaccessible unless a client owns a valid authentication token, following a **Zero-Trust** approach.

---

# 🚀 Features

- 🔒 AES-128 encrypted HLS streaming
- 🔑 JWT-protected Key Server
- 🎬 Automatic HLS generation with FFmpeg
- 🌐 Nginx HLS distribution
- 🐳 Docker Compose deployment
- ❤️ Docker Healthcheck
- 📋 Structured application logging
- ⚙️ Environment variable validation
- 🛡️ Zero-Trust inspired architecture

---

# 🏗 Architecture

```text
                         +---------------------------+
                         |      React Player         |
                         |        (Pole 1)           |
                         +------------+--------------+
                                      |
                                      | POST /token
                                      |
                                      ▼
                         +---------------------------+
                         |    FastAPI Key Server     |
                         |      JWT Generator        |
                         +------------+--------------+
                                      |
                               JWT Access Token
                                      |
                                      ▼
                      GET /key?token=<JWT>
                                      |
                         +------------+--------------+
                         | JWT Verification (HS256) |
                         +------------+--------------+
                                      |
                               AES-128 Encryption Key
                                      |
                         +------------+--------------+
                         |           Nginx           |
                         |     Secure HLS Server     |
                         +------------+--------------+
                                      |
                              output.m3u8 playlist
                                      |
                           Encrypted .ts segments
```

---

# 📁 Project Structure

```text
pole2/

├── docker-compose.yml
├── README.md
├── .env.example
│
├── hls/
│   ├── output.m3u8
│   ├── enc.key
│   ├── enc.key.info
│   └── segment_XXX.ts
│
├── key-server/
│   ├── Dockerfile
│   ├── main.py
│   └── requirements.txt
│
├── nginx/
│   └── nginx.conf
│
└── scripts/
    ├── gen_key.sh
    └── encode_hls.sh
```

---

# 🛠 Requirements

Before starting the project, install:

- Docker Desktop
- Docker Compose
- FFmpeg
- OpenSSL

## Install FFmpeg

### macOS

```bash
brew install ffmpeg
```

### Ubuntu

```bash
sudo apt update
sudo apt install ffmpeg
```

---

# ⚙️ Configuration

## 1. Generate an AES-128 key

```bash
bash scripts/gen_key.sh
```

Example output:

```text
AES_KEY=1400dc0017c9fa74522d0af45af1964c
```

---

## 2. Create the environment file

```bash
cp .env.example .env
```

Example:

```env
JWT_SECRET=your_super_secret_jwt_key
AES_KEY=1400dc0017c9fa74522d0af45af1964c
```

---

# 🎬 Generate an Encrypted HLS Stream

The script:

- reads the source video;
- reuses the same AES key as the Key Server;
- encrypts every HLS segment;
- generates the HLS playlist.

Example:

```bash
bash scripts/encode_hls.sh video_source.mp4
```

Generated files:

```text
hls/

output.m3u8
segment_000.ts
segment_001.ts
...
segment_006.ts
enc.key
enc.key.info
```

---

# ▶️ Start the Infrastructure

Build every service:

```bash
docker compose up --build
```

Run in background:

```bash
docker compose up -d --build
```

Stop everything:

```bash
docker compose down
```

---

# 🌐 Available Services

| Service | URL |
|----------|-----|
| HLS Playlist | http://localhost:8082/hls/output.m3u8 |
| Key Server | http://localhost:8001 |
| Health Endpoint | http://localhost:8001/health |

---

# 🔑 Generate a JWT

```bash
curl -X POST http://localhost:8001/token \
-H "Content-Type: application/json" \
-d '{
"user_id":"Junior",
"video_id":"video1"
}'
```

Example response:

```json
{
  "access_token": "...",
  "token_type": "bearer",
  "expires_in": 3600
}
```

---

# 🔐 Retrieve the AES Encryption Key

Using a valid JWT:

```bash
curl "http://localhost:8001/key?token=<JWT>"
```

Save the key:

```bash
curl "http://localhost:8001/key?token=<JWT>" --output key.bin
```

---

# ❤️ Health Check

```bash
curl http://localhost:8001/health
```

Expected response:

```json
{
  "status": "ok"
}
```

---

# 📋 Application Logs

Display logs:

```bash
docker logs -f pole2-key-server-1
```

Example:

```text
INFO Health check requested

INFO JWT generated | user=Junior | video=video1

INFO AES key delivered | user=Junior | video=video1
```

---

# 🧪 Validation

## Verify generated HLS files

```bash
ls -lh hls
```

Expected:

```text
output.m3u8
segment_000.ts
segment_001.ts
...
segment_006.ts
```

---

## Verify playlist

```bash
curl http://localhost:8082/hls/output.m3u8
```

Expected:

```text
#EXT-X-KEY
segment_000.ts
segment_001.ts
...
```

---

## Verify HLS segment

```bash
curl -I http://localhost:8082/hls/segment_000.ts
```

Expected:

```text
HTTP/1.1 200 OK
```

---

## Verify DEMO key

```bash
curl "http://localhost:8001/key?token=DEMO" --output demo.key
```

Expected:

```text
16 bytes
```

---

## Verify JWT workflow

Generate a token:

```bash
curl -X POST http://localhost:8001/token \
-H "Content-Type: application/json" \
-d '{"user_id":"Junior","video_id":"video1"}'
```

Then:

```bash
curl "http://localhost:8001/key?token=<JWT>" --output jwt.key
```

Verify:

```bash
ls -lh jwt.key
```

Expected:

```text
16B
```

---

# 🔒 Security Features

- AES-128 encrypted HLS streaming
- JWT authentication
- Temporary access tokens
- Environment variable validation
- Docker Healthcheck
- Structured logging
- Fail-fast startup validation
- Zero-Trust architecture

---

# 🚧 Development Mode

For development and testing purposes, the generated HLS playlist currently references:

```text
http://localhost:8001/key?token=DEMO
```

The Key Server accepts this special token only to simplify local testing.

In production, the React Player (Pole 1) will:

1. request a JWT;
2. retrieve the AES key using this JWT;
3. decrypt the HLS stream.

The `DEMO` mode will then be removed.

---

# 🚀 Future Improvements

- Remove DEMO mode
- Automatic JWT integration with Pole 1
- Prometheus metrics
- Grafana dashboard
- HTTPS support
- Kubernetes deployment
- CI/CD pipeline
- Secret management (Vault / Kubernetes Secrets)
- Rate limiting

---

# 👥 Contributors

**Hackathon VSecure — ESTIAM**

**Pole 2 – Secure Streaming Infrastructure**

Technologies:

- Docker Compose
- FastAPI
- Nginx
- FFmpeg
- HLS
- AES-128 Encryption
- JWT Authentication
- Zero-Trust Architecture
