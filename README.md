# Hackathon Receipt Helper v2.0

Family expense tracker with AI receipt OCR, classification learning, email scanning, and Mapbox spending maps.

## Stack

- **Backend**: Python FastAPI + PostgreSQL + Alembic
- **Mobile**: React 19 + Vite + TailwindCSS 4
- **Dashboard**: React 19 + Recharts + Nivo + Mapbox GL JS

## Quick Start (Docker)

```bash
cp .env.example .env
# Edit .env with API keys

docker compose up -d --build
docker compose exec api alembic upgrade head
docker compose exec api python seed.py
```

| Service   | URL                        |
|-----------|----------------------------|
| Mobile    | http://localhost:4511      |
| Dashboard | http://localhost:4512      |
| API       | http://localhost:4510      |
| API Docs  | http://localhost:4510/docs |
| PostgreSQL (host) | localhost:4513     |
| Redis (host)      | localhost:4514     |

Default admin (change password after seed): `admin` / `CHANGE_THIS_PASSWORD`

## Production

```bash
cp .env.example .env.prod
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec api alembic upgrade head
docker compose -f docker-compose.prod.yml exec api python seed.py
```

See [docs/12-deployment.md](docs/12-deployment.md) for SSL and VPS setup.

## Documentation

Design docs live in `docs/` (01–13). Use `docs/13-design-alignment-checklist.md` for acceptance testing.
