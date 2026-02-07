# 4XL — Privacy-First Neural Image Upscaler

<p align="center">
  <a href="https://huggingface.co/spaces/mahinigam/4xl"><img src="https://img.shields.io/badge/Live%20Demo-4XL-yellow?style=flat-square" alt="Live Demo" /></a>
  <img src="https://img.shields.io/badge/React-18.3-61DAFB?style=flat-square&logo=react" alt="React" />
  <img src="https://img.shields.io/badge/Gradio-5.9.1-FF6F00?style=flat-square" alt="Gradio" />
  <img src="https://img.shields.io/badge/Real--ESRGAN-Powered-green?style=flat-square" alt="Real-ESRGAN" />
  <img src="https://img.shields.io/badge/License-MIT-blue?style=flat-square" alt="MIT License" />
</p>

4× neural image upscaling with a **privacy-first** approach. Your images are processed in memory and never stored.

> **Live:** [mahinigam-4xl.hf.space](https://mahinigam-4xl.hf.space) (frontend) · [mahinigam-4xl-api.hf.space](https://mahinigam-4xl-api.hf.space) (backend API)

## Features

- **4× Upscaling** — Enhance images to 4x their original resolution using Real-ESRGAN
- **Privacy-First** — No logging, no storage, automatic memory purge
- **Three Models** — General (best quality), Fast, and Anime-optimized
- **Multiple Formats** — Export as PNG, JPEG, or WebP
- **Free Hosting** — Deployed on HuggingFace Spaces (CPU Basic, free tier)

## Architecture

```
┌──────────────────────┐  nginx proxy  ┌──────────────────────┐
│   Frontend Space     │   /api/ ──►   │   Backend Space      │
│   (React + Vite)     │  /gradio_api/ │   (Gradio 5.9.1)     │
│                      │  ◄──────────  │                      │
│   Docker + nginx     │   Base64 SSE  │   Real-ESRGAN (CPU)  │
│   mahinigam/4xl      │               │   mahinigam/4xl-api  │
└──────────────────────┘               └──────────────────────┘
```

The frontend proxies all `/api/*` requests through nginx to the backend's `/gradio_api/*` endpoints — no CORS needed.

## Quick Start

### Local Development

```bash
# Clone the repository
git clone https://github.com/mahinigam/4xl.git
cd 4xl

# Option 1: Docker Compose (Recommended)
docker-compose up

# Option 2: Run separately

# Terminal 1 - Backend (requires Python 3.10)
cd backend
pip install -r requirements.txt
python app.py
# → Gradio API running at http://localhost:7860

# Terminal 2 - Frontend
cd frontend
npm install
cp .env.example .env
# .env should contain: VITE_API_URL=http://localhost:7860/gradio_api
npm run dev
# → Frontend running at http://localhost:3000
```

### Deploy to HuggingFace Spaces

Both Spaces are deployed via **direct git push** to their HF repos:

1. **Backend** (`mahinigam/4xl-api` — SDK: Gradio, Hardware: CPU Basic):
   ```bash
   cd 4xl-api
   git remote add hf https://huggingface.co/spaces/mahinigam/4xl-api
   git push hf main
   ```

2. **Frontend** (`mahinigam/4xl` — SDK: Docker, Hardware: CPU Basic):
   ```bash
   cd 4xl-frontend
   git remote add hf https://huggingface.co/spaces/mahinigam/4xl
   git push hf main
   ```

> **Note:** The CI/CD workflow in `.github/workflows/deploy.yml` can also deploy via `HF_TOKEN` secret on push to main.

## Performance Optimizations

| Optimization | Description |
|--------------|-------------|
| **Model Caching** | Models loaded once, reused across requests (~3-5s saved) |
| **Lazy Loading** | Models loaded on first use, not at startup |
| **Smart Tiling** | `tile=512` with `tile_pad=32` for memory efficiency |
| **Inference Mode** | `torch.inference_mode()` for ~5-10% faster processing |
| **FP16 on CUDA** | Half-precision on GPU for 2x memory savings |

## Privacy Features

| Feature | Implementation |
|---------|---------------|
| **No Persistence** | `delete_cache=(3600, 3600)` — Auto-wipes temp files hourly |
| **Memory Purge** | `gc.collect()` after every inference |
| **No Logging** | Logging disabled, no print statements for images |

## Design System

**Peacock Watercolor Glass** aesthetic:
- Peacock palette (teal, emerald, indigo, gold)
- Watercolor wash layers with plume watermark (7% opacity)
- Glassmorphism panels with animated gradient borders
- Sora headings + Manrope body text
- Micro‑refraction noise + slow sheen drift

## Project Structure

```
4xl/
├── backend/                 # Gradio API source
│   ├── app.py              # Real-ESRGAN inference + Gradio 5.9.1
│   ├── requirements.txt
│   └── README.md           # HF Space config
│
├── frontend/               # React App source
│   ├── src/
│   │   ├── App.jsx         # Watercolor/glass layout
│   │   ├── components/     # UI components
│   │   ├── hooks/          # useUpscaler (Gradio API client)
│   │   └── styles/         # Peacock theme CSS
│   ├── Dockerfile          # Multi-stage: node → nginx
│   ├── nginx.conf          # SPA routing + /api/ reverse proxy
│   └── README.md           # HF Space config
│
├── 4xl-api/                # HF Space clone (backend) — not in main repo
├── 4xl-frontend/           # HF Space clone (frontend) — not in main repo
│
├── docker-compose.yml      # Local development
├── .github/workflows/      # CI/CD (deploy.yml)
└── README.md
```

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | React + Vite | 18.3 |
| Styling | Tailwind CSS + custom CSS | 3.4 |
| Backend | Gradio | 5.9.1 |
| AI Model | Real-ESRGAN | latest |
| PyTorch | torch (CPU) | 2.0.1 |
| Python | | 3.10.13 |
| Proxy | nginx | alpine |
| Hosting | HuggingFace Spaces | CPU Basic (free) |

## Specifications

| Parameter | Value |
|-----------|-------|
| Max Input Resolution | 1024×1024px |
| Upscale Factor | 4× (fixed) |
| Output Formats | PNG, JPEG, WebP |
| Processing Timeout | 60 seconds |
| Models | RealESRGAN_x4plus, RealESRNet_x4plus, RealESRGAN_x4plus_anime_6B |
| API Prefix | `/gradio_api/` (Gradio 5.x) |
| Frontend Proxy | `/api/*` → `/gradio_api/*` via nginx |

## License

MIT License — See [LICENSE](LICENSE) for details.

---

<p align="center">
  Built by <a href="https://github.com/mahinigam">@mahinigam</a>
</p>
