# Deploying Pic-Reader to Coolify using Nixpacks

This guide explains how to deploy the **Pic-Reader** monorepo (Next.js frontend + FastAPI backend) on **Coolify** using **Nixpacks**.

By separating the services, we can keep the Python FastAPI backend **internal-only** (secured within Coolify's private network) while exposing the Next.js frontend **publicly** to the internet. Next.js will reverse-proxy requests to the backend internally.

---

## Architecture Overview

```mermaid
flowchart LR
    User([User's Browser]) -- Public Domain --► Frontend[Next.js Frontend\nBase: /frontend]
    Frontend -- Internal Network\nhttp://backend-service:8000 --► Backend[FastAPI Backend\nBase: /backend]
    Backend -- AI Extraction --► Gemini[Google Gemini API]
```

1. **Frontend (Next.js)**: Built using Nixpacks, exposed publicly with your custom domain.
2. **Backend (FastAPI)**: Built using Nixpacks, runs internally on port `8000` with no public domain/IP.
3. **Communication**: Next.js proxies all `/api/*` traffic internally to the backend using the private Docker network URL.

---

## Prerequisites

Before starting, make sure you have:
1. A running **Coolify** instance.
2. Your repository pushed to GitHub or another git provider.
3. A **Google Gemini API Key** (configured as a secret).

---

## Step 1: Deploy the FastAPI Backend (Internal)

The backend must be deployed first so we can obtain its internal URL to configure the frontend.

1. **Create a New Resource** in Coolify:
   - Select **Git Repository** (GitHub, GitLab, or Self-hosted Git).
   - Select your project repository (`blakejjia/pic-reader`).
   - Select the branch (e.g., `main`).

2. **Configure General Settings**:
   - **Name**: `pic-reader-backend` (or a name of your choice).
   - **Build Pack**: `Nixpacks`.
   - **Base Directory**: `/backend` (This is critical: tells Nixpacks to only build and run code in the backend folder).
   - **Ports Excluded/Exposed**: Set the port to `8000`.

3. **Configure Domains**:
   - **Domains**: Leave this completely **empty**. This keeps the backend private, meaning it cannot be reached from the public internet.

4. **Add Environment Variables**:
   - `PORT`: `8000`
   - `GEMINI_API_KEY`: `your_actual_gemini_api_key`
   - `GEMINI_MODEL`: `gemini-2.0-flash-lite-preview-02-05` (Optional, defaults to this model).

5. **Deploy the Service**:
   - Click **Deploy**. Coolify will compile the Python backend environment, install dependencies from `/backend/requirements.txt`, and start the Uvicorn server.
   
6. **Get Internal URL**:
   - Once deployed, Coolify will assign a private internal URL to your service under the service settings (e.g., `http://<service-uuid>:8000` or `http://pic-reader-backend:8000`). Copy this URL.

---

## Step 2: Deploy the Next.js Frontend (Public)

1. **Create a New Resource** in Coolify:
   - Select the same Git repository (`blakejjia/pic-reader`) and branch.

2. **Configure General Settings**:
   - **Name**: `pic-reader-frontend`.
   - **Build Pack**: `Nixpacks`.
   - **Base Directory**: `/frontend` (Tells Nixpacks to only build and run code in the frontend folder).
   - **Ports Excluded/Exposed**: Set the port to `3000`.

3. **Configure Domains**:
   - **Domains**: Add your public URL (e.g., `https://reader.yourdomain.com`). Coolify will automatically configure SSL certificates (Let's Encrypt) and a reverse proxy.

4. **Add Environment Variables**:
   - `PORT`: `3000`
   - `BACKEND_URL`: Enter the **Internal URL** of the backend service copied in Step 1 (e.g., `http://pic-reader-backend:8000`).

5. **Deploy the Service**:
   - Click **Deploy**. Coolify will install Node.js dependencies, build the Next.js production bundle using `npm run build`, and run the production server.

---

## Technical Details

### 1. Nixpacks System Dependencies (`ffmpeg`)
The backend uses `pydub` to stitch audio files, which requires `ffmpeg` installed on the host system. 
In the project root, a `nixpacks.toml` file is configured:

```toml
[phases.setup]
nixPkgs = ["...", "ffmpeg"]
```

Coolify and Nixpacks will automatically scan the project directories and apply these package dependencies during backend deployment to make sure `ffmpeg` is present.

### 2. Next.js Internal Rewrites
The frontend Next.js server proxies `/api/:path*` to the private backend. The configuration is handled in `/frontend/next.config.js`:

```javascript
async rewrites() {
  return [
    {
      source: '/api/:path*',
      destination: `${process.env.BACKEND_URL || 'http://127.0.0.1:8000'}/api/:path*`,
    },
  ]
}
```

Since the Next.js node process executes inside Coolify's Docker network, it can resolve `BACKEND_URL` (e.g. `http://pic-reader-backend:8000`) internally, bypassing any public ports or firewalls completely.
