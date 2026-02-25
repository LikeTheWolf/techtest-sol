# File Upload + Async Email Validation Demo

This project is a small full-stack demo for uploading a CSV of users and validating emails asynchronously in the background.

It is built to show:
- file upload handling
- background job processing
- concurrency control
- progress tracking
- clear success/failure reporting

## How It Works

1. The frontend uploads a CSV file to the API.
2. The API stores a new `uploadId` and enqueues a BullMQ job.
3. A worker processes the file with `fast-csv` as a stream.
4. Each row is validated asynchronously (with timeout handling and concurrency limits).
5. Progress and counters are stored in Redis.
6. The frontend polls status and shows progress/results in real time.

## CSV Format

Expected columns:

```csv
name,email
John Doe,john@example.com
Jane Smith,invalid-email
```

## API Endpoints

- `POST /upload` (also available as `/api/upload`)
  - multipart upload (`file` field)
  - returns `uploadId`

- `GET /status/:uploadId` (also available as `/api/status/:uploadId`)
  - returns status, progress, totals, and failure details

## Local Run (without Docker)

### Backend

```bash
cd backend
npm install
npm run start-dev
npm run start-dev-worker
```

### Frontend

```bash
cd frontend
npm install
npm start
```

## Docker Run

From repo root:

```bash
docker compose -f backend/docker-compose.yaml up --build -d
docker compose -f frontend/docker-compose.yaml up --build -d
```

Redis health check:

```bash
docker compose -f backend/docker-compose.yaml ps
docker compose -f backend/docker-compose.yaml exec redis redis-cli ping
```

Expected Redis ping result: `PONG`.