# 4XL — Privacy-First Image Upscaler

<p align="center">
  <a href="https://huggingface.co/spaces/mahinigam/4xl"><img src="https://img.shields.io/badge/Live%20Demo-4XL-yellow?style=flat-square" alt="Live Demo" /></a>
  <img src="https://img.shields.io/badge/React-18.3-61DAFB?style=flat-square&logo=react" alt="React" />
  <img src="https://img.shields.io/badge/Gradio-5.9.1-FF6F00?style=flat-square" alt="Gradio" />
  <img src="https://img.shields.io/badge/Real--ESRGAN-Powered-green?style=flat-square" alt="Real-ESRGAN" />
  <img src="https://img.shields.io/badge/ONNX%20Runtime-Web%201.21-purple?style=flat-square" alt="ONNX Runtime Web" />
  <img src="https://img.shields.io/badge/License-MIT-blue?style=flat-square" alt="MIT License" />
</p>

4× neural image upscaling with a **privacy-first**, **hybrid inference** approach. Runs directly on your device via WebGPU/WASM when possible, with automatic server fallback. Your images never leave your browser in local mode.

> **Live:** [mahinigam-4xl.hf.space](https://mahinigam-4xl.hf.space) (frontend) · [mahinigam-4xl-api.hf.space](https://mahinigam-4xl-api.hf.space) (backend API)

## Features

- **Hybrid Inference** — Runs on your device (WebGPU or WASM) with automatic server fallback
- **4× Upscaling** — Enhance images to 4x their original resolution using Real-ESRGAN
- **Privacy-First** — In local mode, images never leave your browser. Server mode auto-purges files hourly
- **Device Detection** — Auto-detects WebGPU (GPU badge), WASM (CPU badge), or server (Cloud badge)
- **Three Models** — General (best quality), Fast, and Anime-optimized
- **Multiple Formats** — Export as PNG, JPEG, or WebP
- **Model Caching** — ONNX models downloaded once and cached in the browser via Cache API
- **Free Hosting** — Deployed on HuggingFace Spaces (CPU Basic, free tier)

## Architecture

```
                    User's Browser
         ┌─────────────────────────────────┐
         │  React Frontend                 │
         │  ┌───────────┐  ┌────────────┐  │
         │  │ Mode      │  │ Provider   │  │
         │  │ Toggle    │  │ Detection  │  │
         │  └─────┬─────┘  │ GPU / CPU  │  │
         │        │        │ / Cloud    │  │
         │        ▼        └────────────┘  │
         │  ┌───────────────────────┐      │
         │  │  useUpscaler (hybrid) │      │
         │  └──┬──────────────┬─────┘      │
         │     │              │            │
         │  LOCAL           SERVER         │
         │  ┌──────┐      ┌──────┐         │
         │  │ ONNX │      │ Fetch│─────────┼──► nginx proxy ──► Backend Space
         │  │ Runt.│      │ API  │         │    /api/ ──►       (Gradio 5.9.1)
         │  │ Web  │      └──────┘         │    /gradio_api/    Real-ESRGAN CPU
         │  └──┬───┘                       │
         │     │ WebGPU or WASM            │
         └─────┼───────────────────────────┘
               │ fetches model once
               ▼
         HF Space /models/*.onnx
```

**Local path:** Image tiles through ONNX Runtime Web (WebGPU/WASM) entirely in-browser — zero server traffic after model cache.

**Server path:** nginx proxies `/api/*` to the backend's `/gradio_api/*` — Gradio queues the job, Real-ESRGAN processes on CPU, result returned via SSE.

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
| **Browser Model Cache** | ONNX models cached via Cache API — one-time ~64MB download |
| **WebGPU Acceleration** | Hardware GPU inference in supported browsers (Chrome 113+, Edge 113+) |
| **Tiled Inference** | 192px input tiles with 16px overlap prevent GPU OOM on large images |
| **Auto Fallback** | Local failure seamlessly retries via server — user sees no error |
| **Server Model Caching** | PyTorch models loaded once, reused across requests |
| **Lazy Loading** | Models loaded on first use, not at startup |
| **Inference Mode** | `torch.inference_mode()` for ~5-10% faster server processing |

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
│   │   ├── App.jsx         # Layout + mode toggle + provider badge
│   │   ├── components/     # UI components (OutputPanel w/ progress bar)
│   │   ├── hooks/
│   │   │   ├── useUpscaler.js    # Hybrid hook (local-first, server fallback)
│   │   │   └── localInference.js # ONNX Runtime Web engine (WebGPU/WASM, tiling)
│   │   └── styles/         # Peacock Watercolor Glass theme
│   ├── Dockerfile          # Multi-stage: node → nginx
│   ├── nginx.conf          # SPA routing + /api/ proxy + WASM caching
│   └── README.md           # HF Space config
│
├── scripts/
│   ├── export_onnx.py      # Export PyTorch Real-ESRGAN models to ONNX
│   └── test_e2e.py         # 11-test E2E suite for deployed stack
│
├── docker-compose.yml      # Local development
├── .github/workflows/      # CI/CD (deploy.yml)
└── README.md
```

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | React + Vite | 18.3 + 5.4 |
| Local Inference | ONNX Runtime Web | 1.21.0 |
| Execution | WebGPU (preferred) / WASM (fallback) | — |
| Styling | Tailwind CSS + custom CSS | 3.4 |
| Backend | Gradio | 5.9.1 |
| AI Model | Real-ESRGAN (ONNX + PyTorch) | latest |
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
| Models | RealESRGAN_x4plus (64MB), RealESRNet_x4plus (64MB), anime_6B (17MB) |
| ONNX Opset | 17 (dynamic axes) |
| Local Tile Size | 192px input / 768px output, 16px overlap |
| WASM Threading | Single-threaded (no SharedArrayBuffer in HF iframe) |
| API Prefix | `/gradio_api/` (Gradio 5.x) |
| Frontend Proxy | `/api/*` → `/gradio_api/*` via nginx |

## License

MIT License — See [LICENSE](LICENSE) for details.

---

<p align="center">
  Built by <a href="https://github.com/mahinigam">@mahinigam</a>
</p>
