# Pôle 2 — HLS AES-128 Streaming + Key Server JWT

## Prérequis

- Docker + Docker Compose
- FFmpeg (installé sur la machine hôte pour l'encodage)
- OpenSSL

## Démarrage rapide

### 1. Générer la clé AES et créer le fichier .env

```bash
bash scripts/gen_key.sh
```

Copier la valeur `AES_KEY=...` affichée, puis créer un fichier `.env` à la racine de `pole2/` :

```
AES_KEY=<valeur hex affichée>
JWT_SECRET=un_secret_jwt_fort_32_caracteres_min
```

### 2. Encoder une vidéo en HLS AES-128

```bash
bash scripts/encode_hls.sh video.mp4
```

Les segments `.ts` et le manifeste `output.m3u8` sont générés dans `hls/`.

### 3. Lancer les services

```bash
docker-compose up -d
```

### 4. Vérifier

```bash
# Santé du key-server
curl http://localhost:8001/health

# Obtenir un token JWT
curl -X POST http://localhost:8001/token \
  -H "Content-Type: application/json" \
  -d '{"user_id": "user1", "video_id": "video1"}'

# Accéder à la clé AES avec le token
curl "http://localhost:8001/key?token=<JWT>"

# Manifeste HLS (servi par Nginx)
curl http://localhost:8080/hls/output.m3u8
```

## Endpoints

| Service    | URL                                        | Description                     |
|------------|--------------------------------------------|---------------------------------|
| Nginx HLS  | `http://localhost:8080/hls/output.m3u8`    | Manifeste HLS                   |
| Key Server | `http://localhost:8001/key?token=<JWT>`    | Clé AES (requiert JWT valide)   |
| Token      | `POST http://localhost:8001/token`         | Génère un JWT (exp = 3600s)     |
| Health     | `http://localhost:8001/health`             | Santé du service                |

## Arrêter

```bash
docker-compose down
```
