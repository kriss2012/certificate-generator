# Deploying to Railway (railway.com)

This guide walks you through deploying the **Certificate Generation & Verification System** to [Railway](https://railway.com) with production-grade persistence and security.

---

## Architecture Overview

- **Runtime**: Debian Bookworm Slim container (`node:20-bookworm-slim`) configured via [Dockerfile](file:///c:/Users/IMRD/Documents/GitHub/certificate-generator/Dockerfile).
- **Backend**: Node.js Express server listening on `0.0.0.0:${PORT}` with `trust proxy` enabled for Railway edge proxies.
- **Python Integration**: Python 3 with `pymupdf` installed automatically in the container to stamp official PDF certificates.
- **Database**: SQLite database stored in `/app/data/certificates.db`.
- **Health Check**: Automated health monitoring configured at `/health` via [railway.json](file:///c:/Users/IMRD/Documents/GitHub/certificate-generator/railway.json).

---

## Prerequisites

1. A [Railway Account](https://railway.com).
2. Your repository pushed to GitHub.

---

## Step-by-Step Deployment

### 1. Create a New Project on Railway
1. Go to [Railway Dashboard](https://railway.com/dashboard).
2. Click **"+ New Project"**.
3. Select **"Deploy from GitHub repo"**.
4. Choose this repository (`certificate-generator`).
5. Railway will automatically detect the [Dockerfile](file:///c:/Users/IMRD/Documents/GitHub/certificate-generator/Dockerfile) and [railway.json](file:///c:/Users/IMRD/Documents/GitHub/certificate-generator/railway.json).

---

### 2. Attach a Persistent Volume for SQLite Database
> [!IMPORTANT]
> Railway containers have an ephemeral filesystem by default. To ensure newly issued certificates, recipient records, and audit logs persist across code updates and restarts, you **must** attach a volume.

1. In your Railway service canvas, click your deployed service.
2. Go to the **"Volumes"** tab.
3. Click **"+ Add Volume"**.
4. Set the **Mount Path** to:
   ```text
   /app/data
   ```
5. Click **Add Volume**. Railway will remount the container with persistent storage at `/app/data`.

*(Optional)* If you also wish to persist uploaded assets, you can add another volume mounted at `/app/uploads`.

---

### 3. Configure Environment Variables
In the **"Variables"** tab of your service, add the following production variables:

| Variable | Value / Description | Required? |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | **Yes** |
| `JWT_SECRET` | A secure random string (at least 32 characters, e.g. generated via `openssl rand -hex 32`) | **Yes** |
| `DATABASE_PATH` | `/app/data/certificates.db` | **Yes** |
| `HOST` | `0.0.0.0` | Optional (default: `0.0.0.0`) |
| `PYTHON_PATH` | `python3` | Optional (default: `python3`) |
| `OFFICIAL_CLUB_WEBSITE_URL` | `https://rcpimrd.ac.in` (or your official club URL) | Recommended |
| `BASE_URL` | `https://your-domain.up.railway.app` (leave blank to auto-detect Railway domain) | Optional |

> [!NOTE]
> `PORT` is automatically injected by Railway. Do **not** hardcode `PORT=3000` in the Railway dashboard.

---

### 4. Generate Public Domain
1. In your service, go to **"Settings"** -> **"Networking"**.
2. Under **Public Networking**, click **"Generate Domain"** (or connect your custom domain).
3. Railway will provision an SSL-secured URL like:
   ```text
   https://certificate-generator-production.up.railway.app
   ```
4. If `BASE_URL` is left empty in your environment variables, the system automatically uses this Railway domain for generating QR codes and verification links.

---

### 5. Verify the Deployment
Once deployed:
1. **Health Check**: Open `https://your-domain.up.railway.app/health` in your browser. It should respond:
   ```json
   {
     "status": "ok",
     "timestamp": "2026-09-22T...",
     "service": "Certificate Generation and Verification System",
     "version": "2.0.0"
   }
   ```
2. **Public Verification**: Open `https://your-domain.up.railway.app/verify/CLUB-2024-LEAD-00001` to test optical verification and certificate details.
3. **Staff Login**: Click **Staff Portal Login** on the navbar:
   - Superadmin: `admin@club.org` / `admin123` *(change password in production)*
   - Approver: `approver@club.org` / `approver123`

---

## Database Backups on Railway

To backup your SQLite database:
1. In the Railway dashboard, open your service's **CLI** / **Terminal** or use the Railway CLI:
   ```bash
   railway run sqlite3 /app/data/certificates.db ".backup '/app/data/backup.db'"
   ```
2. Or use the Railway Volume file browser to download `certificates.db` directly to your local workstation.
