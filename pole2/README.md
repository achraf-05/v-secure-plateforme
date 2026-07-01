# 🔐 VSecure – Pôle 2 : Zero-Trust Secure Streaming Infrastructure

This module provides the secure streaming infrastructure for the **VSecure Hackathon** project.

It is responsible for delivering **AES-128 encrypted HLS streams** while protecting the encryption key using **JWT authentication**.

---

# 🚀 Features

- 🔒 AES-128 encrypted HLS streaming
- 🔑 JWT-protected key server
- 🐳 Docker Compose deployment
- 🌐 Nginx HLS distribution
- ❤️ Docker Healthcheck
- 📋 Structured application logging
- ⚙️ Environment variable validation
- 🛡️ Zero-Trust inspired architecture

---

# 🏗 Architecture

```text
                     +----------------------------+
                     |        React Player        |
                     |          (Pole 1)          |
                     +-------------+--------------+
                                   |
                                   | JWT
                                   |
                      GET /key?token=<JWT>
                                   |
                     +-------------v--------------+
                     |     FastAPI Key Server     |
                     |     JWT Verification       |
                     +-------------+--------------+
                                   |
                              AES-128 Key
                                   |
                     +-------------v--------------+
                     |            Nginx           |
                     |      Secure HLS Server     |
                     +-------------+--------------+
                                   |
                           output.m3u8
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
│   └── *.ts
│
├── nginx/
│   └── nginx.conf
│
├── key-server/
│   ├── Dockerfile
│   ├── main.py
│   └── requirements.txt
│
└── scripts/
    ├── gen_key.sh
    └── encode_hls.sh
```

---

# 🛠 Requirements

- Docker Desktop
- Docker Compose
- FFmpeg
- OpenSSL

---

# ⚙️ Configuration

Generate an AES-128 key:

```bash
bash scripts/gen_key.sh
```

Create a `.env` file from the template:

```bash
cp .env.example .env
```

Example:

```env
JWT_SECRET=your_super_secret_jwt_key
AES_KEY=your_generated_aes_key
```

---

# ▶️ Start the Infrastructure

Build and start every service:

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
| HLS Stream | http://localhost:8082/hls/output.m3u8 |
| Key Server | http://localhost:8001 |
| Health Check | http://localhost:8001/health |

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

Save the key locally:

```bash
curl "http://localhost:8001/key?token=<JWT>" --output key.bin
```

---

# Health Check

```bash
curl http://localhost:8001/health
```

Example response:

```json
{
    "status": "ok",
    "service": "key-server",
    "version": "1.2.0",
    "timestamp": "2026-07-01T16:45:30Z"
}
```

---

# 📊 Docker Health

Check container status:

```bash
docker ps
```

Expected output:

```text
STATUS
Up 25 seconds (healthy)
```

---

# 📋 Application Logs

Display logs:

```bash
docker logs -f pole2-key-server-1
```

Example:

```text
2026-07-01 16:40:11 | INFO | GET /health | 200 | 1.24 ms

2026-07-01 16:40:18 | INFO | JWT generated | user=Junior | video=video1

2026-07-01 16:40:20 | INFO | AES key delivered | user=Junior | video=video1
```

---

# 🧪 Useful Tests

Health endpoint:

```bash
curl http://localhost:8001/health
```

Generate JWT:

```bash
curl -X POST http://localhost:8001/token \
-H "Content-Type: application/json" \
-d '{"user_id":"Junior","video_id":"video1"}'
```

Retrieve encryption key:

```bash
curl "http://localhost:8001/key?token=<JWT>"
```

Retrieve HLS playlist:

```bash
curl http://localhost:8082/hls/output.m3u8
```

---

# 🔒 Security Features

- AES-128 encrypted HLS streaming
- JWT authentication
- Temporary access tokens
- Environment variable validation
- Docker Healthcheck
- Structured logging
- Fail-fast configuration validation

---

# 🚧 Current Limitations

For development purposes, the special token `DEMO` is still accepted by the Key Server.

This bypass will be removed once the React player (Pole 1) retrieves a valid JWT automatically before requesting the encryption key.

---

# 🚀 Future Improvements

- Remove DEMO mode
- Prometheus metrics endpoint
- Grafana dashboard
- Rate limiting
- HTTPS support
- Kubernetes deployment
- CI/CD pipeline
- Secret management

---

# Contributors

**Hackathon VSecure — ESTIAM**

**Pole 2 – Secure Streaming Infrastructure**

- Docker Compose
- Nginx
- FastAPI
- JWT Authentication
- AES-128 Encryption
- HLS Streaming
- Zero-Trust Architecture
